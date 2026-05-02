import axios from 'axios';

const RCE_PAYLOADS = [
  { payload: '; echo WEBFORT_RCE_TEST', marker: 'WEBFORT_RCE_TEST' },
  { payload: '| echo WEBFORT_RCE_TEST', marker: 'WEBFORT_RCE_TEST' },
  { payload: '`echo WEBFORT_RCE_TEST`', marker: 'WEBFORT_RCE_TEST' },
  { payload: '$(echo WEBFORT_RCE_TEST)', marker: 'WEBFORT_RCE_TEST' },
];

const SSTI_PAYLOADS = [
  { payload: '{{7*7}}', marker: '49' },
  { payload: '${7*7}', marker: '49' },
  { payload: '<%= 7*7 %>', marker: '49' },
];

export class RCEScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    for (const url of this.urls.slice(0, 10)) {
      await this.testUrlParams(url);
    }
    for (const form of this.forms.slice(0, 5)) {
      await this.testFormInputs(form);
    }
    for (const url of this.urls.slice(0, 5)) {
      await this.testSSTI(url);
    }
    return this.vulnerabilities;
  }

  async testUrlParams(url) {
    try {
      const parsed = new URL(url);
      for (const [param] of parsed.searchParams.entries()) {
        for (const { payload, marker } of RCE_PAYLOADS.slice(0, 2)) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          try {
            const r = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
            if (typeof r.data === 'string' && r.data.includes(marker)) {
              this.vulnerabilities.push({
                type: 'RCE', severity: 'critical',
                title: `Remote Code Execution via ${param}`,
                description: `Parameter "${param}" is vulnerable to OS command injection. Injected commands are executed on the server.`,
                url, parameter: param, evidence: `Marker "${marker}" found in response after injecting: ${payload}`,
                remediation: 'Never pass user input to system commands. Use parameterized APIs. Implement input validation with allowlists.',
                cvssScore: 10.0, cweId: 'CWE-78', owaspCategory: 'A03:2021 - Injection'
              });
              return;
            }
          } catch {}
        }
      }
    } catch {}
  }

  async testFormInputs(form) {
    for (const input of form.inputs) {
      if (!input.name || input.type === 'hidden') continue;
      for (const { payload, marker } of RCE_PAYLOADS.slice(0, 2)) {
        const data = {};
        form.inputs.forEach(i => { data[i.name] = i.value || 'test'; });
        data[input.name] = payload;
        try {
          const r = form.method === 'POST'
            ? await axios.post(form.action, data, { timeout: 5000, validateStatus: () => true })
            : await axios.get(form.action, { params: data, timeout: 5000, validateStatus: () => true });
          if (typeof r.data === 'string' && r.data.includes(marker)) {
            this.vulnerabilities.push({
              type: 'RCE', severity: 'critical',
              title: `RCE in form field: ${input.name}`,
              description: `Form field "${input.name}" allows command injection.`,
              url: form.pageUrl, parameter: input.name, evidence: `Command output detected in response`,
              remediation: 'Sanitize all inputs. Avoid system command execution with user data.',
              cvssScore: 10.0, cweId: 'CWE-78', owaspCategory: 'A03:2021 - Injection'
            });
            return;
          }
        } catch {}
      }
    }
  }

  async testSSTI(url) {
    try {
      const parsed = new URL(url);
      for (const [param] of parsed.searchParams.entries()) {
        for (const { payload, marker } of SSTI_PAYLOADS) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          try {
            const r = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
            if (typeof r.data === 'string' && r.data.includes(marker) && !r.data.includes(payload)) {
              this.vulnerabilities.push({
                type: 'RCE', severity: 'critical',
                title: `Server-Side Template Injection (SSTI) via ${param}`,
                description: `Parameter "${param}" is vulnerable to SSTI. Template expressions are evaluated server-side.`,
                url, parameter: param, evidence: `Payload "${payload}" evaluated to "${marker}"`,
                remediation: 'Use a sandboxed template engine. Never render user input as template code.',
                cvssScore: 9.8, cweId: 'CWE-1336', owaspCategory: 'A03:2021 - Injection'
              });
              return;
            }
          } catch {}
        }
      }
    } catch {}
  }
}
