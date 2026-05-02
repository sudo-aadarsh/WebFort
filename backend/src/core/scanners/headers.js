import axios from 'axios';

const SECURITY_HEADERS = [
  { header: 'strict-transport-security', name: 'HSTS', severity: 'medium', cvss: 4.3, cwe: 'CWE-319' },
  { header: 'content-security-policy', name: 'CSP', severity: 'medium', cvss: 5.4, cwe: 'CWE-693' },
  { header: 'x-frame-options', name: 'X-Frame-Options', severity: 'medium', cvss: 4.3, cwe: 'CWE-1021' },
  { header: 'x-content-type-options', name: 'X-Content-Type-Options', severity: 'low', cvss: 3.1, cwe: 'CWE-16' },
  { header: 'x-xss-protection', name: 'X-XSS-Protection', severity: 'info', cvss: 1.0, cwe: 'CWE-79' },
  { header: 'referrer-policy', name: 'Referrer-Policy', severity: 'low', cvss: 2.4, cwe: 'CWE-200' },
  { header: 'permissions-policy', name: 'Permissions-Policy', severity: 'low', cvss: 2.1, cwe: 'CWE-693' },
];

const DISCLOSURE_HEADERS = ['server', 'x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version'];

export class HeadersScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.vulnerabilities = [];
  }

  async scan() {
    try {
      const r = await axios.get(this.targetUrl, { timeout: 10000, validateStatus: () => true });
      const headers = r.headers;

      // Check missing security headers
      for (const { header, name, severity, cvss, cwe } of SECURITY_HEADERS) {
        if (!headers[header]) {
          this.vulnerabilities.push({
            type: 'Security Headers', severity, title: `Missing ${name} header`,
            description: `The ${name} (${header}) header is not set. This header helps protect against various attacks.`,
            url: this.targetUrl, evidence: `Header "${header}" not present in response`,
            remediation: `Add the ${header} header to your server configuration.`,
            cvssScore: cvss, cweId: cwe, owaspCategory: 'A05:2021 - Security Misconfiguration'
          });
        }
      }

      // Check information disclosure
      for (const header of DISCLOSURE_HEADERS) {
        if (headers[header]) {
          this.vulnerabilities.push({
            type: 'Security Headers', severity: 'low',
            title: `Information disclosure: ${header}`,
            description: `The "${header}" header reveals server technology: "${headers[header]}". This helps attackers fingerprint the application.`,
            url: this.targetUrl, evidence: `${header}: ${headers[header]}`,
            remediation: `Remove or obfuscate the "${header}" header.`,
            cvssScore: 2.6, cweId: 'CWE-200', owaspCategory: 'A05:2021 - Security Misconfiguration'
          });
        }
      }

      // Check cookie security
      const cookies = headers['set-cookie'];
      if (cookies) {
        const cookieList = Array.isArray(cookies) ? cookies : [cookies];
        for (const cookie of cookieList) {
          const name = cookie.split('=')[0].trim();
          const lower = cookie.toLowerCase();
          if (!lower.includes('httponly')) {
            this.vulnerabilities.push({
              type: 'Security Headers', severity: 'medium',
              title: `Cookie missing HttpOnly: ${name}`,
              description: `Cookie "${name}" is accessible to JavaScript, enabling theft via XSS.`,
              url: this.targetUrl, evidence: cookie.substring(0, 80),
              remediation: 'Add HttpOnly flag to all sensitive cookies.',
              cvssScore: 4.3, cweId: 'CWE-1004', owaspCategory: 'A05:2021 - Security Misconfiguration'
            });
          }
          if (!lower.includes('secure')) {
            this.vulnerabilities.push({
              type: 'Security Headers', severity: 'medium',
              title: `Cookie missing Secure flag: ${name}`,
              description: `Cookie "${name}" can be sent over unencrypted HTTP connections.`,
              url: this.targetUrl, evidence: cookie.substring(0, 80),
              remediation: 'Add Secure flag to all cookies.',
              cvssScore: 4.3, cweId: 'CWE-614', owaspCategory: 'A05:2021 - Security Misconfiguration'
            });
          }
        }
      }
    } catch (e) {
      console.error('Headers scan error:', e.message);
    }
    return this.vulnerabilities;
  }
}
