import axios from 'axios';

const REDIRECT_PAYLOADS = [
  'https://evil-site.com',
  '//evil-site.com',
  '\\/evil-site.com',
  '/%09/evil-site.com',
  '/%0a/evil-site.com',
];

export class OpenRedirectScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    for (const url of this.urls.slice(0, 20)) {
      await this.testUrlParams(url);
    }
    return this.vulnerabilities;
  }

  async testUrlParams(url) {
    try {
      const parsed = new URL(url);
      const params = [...parsed.searchParams.keys()];
      
      const redirectParams = ['next', 'url', 'target', 'dest', 'redirect', 'return', 'forward', 'u', 'goto'];

      for (const param of params) {
        const isLikelyRedirect = redirectParams.some(p => param.toLowerCase().includes(p));
        if (!isLikelyRedirect) continue;

        for (const payload of REDIRECT_PAYLOADS) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          
          try {
            const response = await axios.get(testUrl.href, { 
              timeout: 4000, 
              maxRedirects: 0, // We want to catch the redirect ourselves
              validateStatus: (status) => status >= 300 && status < 400 
            });

            const location = response.headers['location'];
            if (location && (location.includes('evil-site.com') || location.startsWith('//evil-site.com'))) {
              this.vulnerabilities.push({
                type: 'Open Redirect',
                severity: 'medium',
                title: `Open Redirect via ${param}`,
                description: `The parameter "${param}" allows unvalidated redirects to arbitrary external URLs. This can be used in phishing attacks to trick users into visiting malicious websites.`,
                url: url,
                parameter: param,
                evidence: `Redirected to: ${location} (Payload: ${payload})`,
                remediation: 'Implement an allowlist of permitted redirect destinations. Use relative paths for redirects. Always validate the "Location" header destination on the server.',
                cvssScore: 5.4,
                cweId: 'CWE-601',
                owaspCategory: 'A01:2021 - Broken Access Control'
              });
              break; 
            }
          } catch (err) {
            // Some libraries throw on 3xx even with validateStatus
            if (err.response && err.response.headers['location']) {
               const location = err.response.headers['location'];
               if (location.includes('evil-site.com')) {
                  this.vulnerabilities.push({
                    type: 'Open Redirect',
                    severity: 'medium',
                    title: `Open Redirect via ${param}`,
                    description: `The parameter "${param}" allows unvalidated redirects to arbitrary external URLs.`,
                    url: url,
                    parameter: param,
                    evidence: `Redirected to: ${location}`,
                    remediation: 'Implement an allowlist of permitted redirect destinations.',
                    cvssScore: 5.4,
                    cweId: 'CWE-601',
                    owaspCategory: 'A01:2021 - Broken Access Control'
                  });
                  break;
               }
            }
          }
        }
      }
    } catch {}
  }
}
