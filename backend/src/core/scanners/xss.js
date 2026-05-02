import axios from 'axios';

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '"><script>alert("XSS")</script>',
  "'><script>alert('XSS')</script>",
  '<img src=x onerror=alert("XSS")>',
  '<svg/onload=alert("XSS")>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('XSS')",
  '<body onload=alert("XSS")>',
  '{{constructor.constructor("alert(1)")()}}',
  '${alert(1)}',
  '<iframe src="javascript:alert(1)">',
  '<details open ontoggle=alert(1)>',
];

const REFLECTED_MARKER = 'WEBFORT_XSS_PROBE_';

export class XSSScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    // Test URL parameters for reflected XSS
    for (const url of this.urls.slice(0, 20)) {
      await this.testReflectedXSS(url);
    }

    // Test forms for stored/reflected XSS
    for (const form of this.forms.slice(0, 10)) {
      await this.testFormXSS(form);
    }

    // Check for DOM-based XSS indicators
    for (const url of this.urls.slice(0, 10)) {
      await this.testDOMBasedXSS(url);
    }

    return this.vulnerabilities;
  }

  async testReflectedXSS(url) {
    try {
      const parsed = new URL(url);
      const params = [...parsed.searchParams.keys()];
      
      if (params.length === 0) {
        // Try adding common parameter names
        const commonParams = ['q', 'search', 'query', 'id', 'name', 'input', 'redirect', 'url', 'page'];
        for (const param of commonParams.slice(0, 3)) {
          const testUrl = new URL(url);
          const marker = REFLECTED_MARKER + Math.random().toString(36).slice(2, 8);
          testUrl.searchParams.set(param, marker);
          
          try {
            const response = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
            if (typeof response.data === 'string' && response.data.includes(marker)) {
              // Parameter is reflected, now test with XSS payloads
              await this.testPayloads(url, param, 'url');
            }
          } catch {}
        }
      }

      for (const param of params) {
        const marker = REFLECTED_MARKER + Math.random().toString(36).slice(2, 8);
        const testUrl = new URL(url);
        testUrl.searchParams.set(param, marker);

        try {
          const response = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
          if (typeof response.data === 'string' && response.data.includes(marker)) {
            await this.testPayloads(url, param, 'url');
          }
        } catch {}
      }
    } catch {}
  }

  async testPayloads(url, param, context) {
    for (const payload of XSS_PAYLOADS.slice(0, 5)) {
      try {
        const testUrl = new URL(url);
        testUrl.searchParams.set(param, payload);
        
        const response = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
        
        if (typeof response.data === 'string') {
          // Check if payload is reflected without encoding
          if (response.data.includes(payload)) {
            this.vulnerabilities.push({
              type: 'XSS',
              severity: 'high',
              title: `Reflected Cross-Site Scripting (XSS) via ${param}`,
              description: `The parameter "${param}" is vulnerable to reflected XSS. User input is reflected in the response without proper encoding or sanitization, allowing execution of arbitrary JavaScript code.`,
              url: url,
              parameter: param,
              evidence: `Payload: ${payload} was reflected unencoded in the response`,
              remediation: 'Implement proper output encoding/escaping for all user-supplied data. Use Content-Security-Policy headers. Consider using a template engine with auto-escaping enabled.',
              cvssScore: 6.1,
              cweId: 'CWE-79',
              owaspCategory: 'A03:2021 - Injection'
            });
            return; // One finding per parameter is enough
          }

          // Check for partial reflection (some encoding but not complete)
          const partialPayloads = ['<script>', 'onerror=', 'javascript:'];
          for (const partial of partialPayloads) {
            if (payload.includes(partial) && response.data.includes(partial)) {
              this.vulnerabilities.push({
                type: 'XSS',
                severity: 'medium',
                title: `Potential XSS via insufficient encoding in ${param}`,
                description: `The parameter "${param}" reflects user input with incomplete encoding. Some HTML/JavaScript elements pass through the filter.`,
                url: url,
                parameter: param,
                evidence: `Partial payload reflection detected: ${partial}`,
                remediation: 'Review and strengthen input validation and output encoding. Ensure all special characters are properly escaped.',
                cvssScore: 4.3,
                cweId: 'CWE-79',
                owaspCategory: 'A03:2021 - Injection'
              });
              return;
            }
          }
        }
      } catch {}
    }
  }

  async testFormXSS(form) {
    try {
      for (const input of form.inputs) {
        if (!input.name || ['submit', 'button', 'hidden', 'csrf', 'token'].some(t => 
          input.name.toLowerCase().includes(t) || input.type === t)) continue;

        const marker = REFLECTED_MARKER + Math.random().toString(36).slice(2, 8);
        const data = {};
        form.inputs.forEach(i => { data[i.name] = i.value || 'test'; });
        data[input.name] = marker;

        try {
          const response = form.method === 'POST'
            ? await axios.post(form.action, data, { timeout: 5000, validateStatus: () => true })
            : await axios.get(form.action, { params: data, timeout: 5000, validateStatus: () => true });

          if (typeof response.data === 'string' && response.data.includes(marker)) {
            this.vulnerabilities.push({
              type: 'XSS',
              severity: 'high',
              title: `Form-based XSS vulnerability in ${input.name}`,
              description: `The form input "${input.name}" on ${form.pageUrl} reflects user input without sanitization, making it vulnerable to XSS attacks.`,
              url: form.pageUrl,
              parameter: input.name,
              evidence: `Input reflected in ${form.method} form to ${form.action}`,
              remediation: 'Sanitize all form inputs server-side. Implement Content-Security-Policy headers. Use HTML entity encoding for output.',
              cvssScore: 6.1,
              cweId: 'CWE-79',
              owaspCategory: 'A03:2021 - Injection'
            });
          }
        } catch {}
      }
    } catch {}
  }

  async testDOMBasedXSS(url) {
    try {
      const response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      if (typeof response.data !== 'string') return;

      const dangerousPatterns = [
        { pattern: /document\.write\s*\(/gi, desc: 'document.write()' },
        { pattern: /\.innerHTML\s*=/gi, desc: 'innerHTML assignment' },
        { pattern: /eval\s*\(/gi, desc: 'eval()' },
        { pattern: /document\.location\s*=/gi, desc: 'document.location assignment' },
        { pattern: /window\.location\.hash/gi, desc: 'window.location.hash usage' },
        { pattern: /\.outerHTML\s*=/gi, desc: 'outerHTML assignment' },
        { pattern: /document\.URL/gi, desc: 'document.URL usage' },
      ];

      for (const { pattern, desc } of dangerousPatterns) {
        if (pattern.test(response.data)) {
          this.vulnerabilities.push({
            type: 'XSS',
            severity: 'medium',
            title: `Potential DOM-based XSS: ${desc}`,
            description: `The page uses ${desc} which can lead to DOM-based XSS if user-controlled data flows into this sink without sanitization.`,
            url: url,
            evidence: `Detected usage of ${desc} in page source`,
            remediation: `Avoid using ${desc} with user-controlled input. Use textContent instead of innerHTML. Implement a strict Content-Security-Policy.`,
            cvssScore: 4.7,
            cweId: 'CWE-79',
            owaspCategory: 'A03:2021 - Injection'
          });
        }
      }
    } catch {}
  }
}
