import axios from 'axios';
import * as cheerio from 'cheerio';

export class CSRFScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    // Check forms for CSRF tokens
    for (const form of this.forms) {
      this.checkFormCSRF(form);
    }

    // Check cookies for SameSite attribute
    await this.checkCookieFlags();

    // Check for custom headers requirement
    await this.checkCustomHeaders();

    return this.vulnerabilities;
  }

  checkFormCSRF(form) {
    if (form.method !== 'POST') return; // CSRF primarily concerns POST forms

    const csrfTokenNames = ['csrf', 'token', '_token', 'csrfmiddlewaretoken', 'csrf_token',
      '__requestverificationtoken', 'authenticity_token', '_csrf', 'xsrf'];

    const hasCSRFToken = form.inputs.some(input => 
      csrfTokenNames.some(name => 
        (input.name || '').toLowerCase().includes(name) ||
        (input.type === 'hidden' && input.value && input.value.length > 20)
      )
    );

    if (!hasCSRFToken) {
      this.vulnerabilities.push({
        type: 'CSRF',
        severity: 'medium',
        title: `Missing CSRF Token in POST form`,
        description: `A POST form on ${form.pageUrl} submitting to ${form.action} does not contain a CSRF token. This allows attackers to craft malicious pages that submit requests on behalf of authenticated users.`,
        url: form.pageUrl,
        parameter: 'CSRF Token',
        evidence: `Form action: ${form.action}, Method: ${form.method}, Inputs: ${form.inputs.map(i => i.name).join(', ')}`,
        remediation: 'Implement anti-CSRF tokens in all state-changing forms. Use the Synchronizer Token Pattern or Double Submit Cookie pattern. Set SameSite attribute on session cookies.',
        cvssScore: 5.4,
        cweId: 'CWE-352',
        owaspCategory: 'A01:2021 - Broken Access Control'
      });
    }
  }

  async checkCookieFlags() {
    try {
      const response = await axios.get(this.targetUrl, {
        timeout: 5000,
        validateStatus: () => true,
        maxRedirects: 0
      });

      const setCookieHeaders = response.headers['set-cookie'];
      if (!setCookieHeaders) return;

      const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

      for (const cookie of cookies) {
        const cookieName = cookie.split('=')[0].trim();
        const lowerCookie = cookie.toLowerCase();

        if (!lowerCookie.includes('samesite')) {
          this.vulnerabilities.push({
            type: 'CSRF',
            severity: 'low',
            title: `Cookie without SameSite attribute: ${cookieName}`,
            description: `The cookie "${cookieName}" does not have the SameSite attribute set, making it potentially vulnerable to CSRF attacks in older browsers.`,
            url: this.targetUrl,
            parameter: cookieName,
            evidence: `Set-Cookie: ${cookie.substring(0, 100)}...`,
            remediation: 'Set SameSite=Lax or SameSite=Strict on all cookies, especially session cookies.',
            cvssScore: 3.1,
            cweId: 'CWE-1275',
            owaspCategory: 'A01:2021 - Broken Access Control'
          });
        }
      }
    } catch {}
  }

  async checkCustomHeaders() {
    try {
      // Check if the application accepts requests without Origin/Referer
      const response = await axios.post(this.targetUrl, {}, {
        timeout: 5000,
        validateStatus: () => true,
        headers: { 'Origin': 'https://evil-site.com' }
      });

      // If a cross-origin POST is accepted without error, it might be vulnerable
      if (response.status < 400) {
        const corsHeader = response.headers['access-control-allow-origin'];
        if (corsHeader === '*' || corsHeader === 'https://evil-site.com') {
          this.vulnerabilities.push({
            type: 'CSRF',
            severity: 'medium',
            title: 'Permissive CORS policy may enable CSRF',
            description: `The application accepts cross-origin requests from arbitrary origins. The Access-Control-Allow-Origin header is set to "${corsHeader}".`,
            url: this.targetUrl,
            evidence: `Access-Control-Allow-Origin: ${corsHeader}`,
            remediation: 'Configure CORS to only allow trusted origins. Never use wildcard (*) with credentials. Validate the Origin header on the server.',
            cvssScore: 5.4,
            cweId: 'CWE-346',
            owaspCategory: 'A01:2021 - Broken Access Control'
          });
        }
      }
    } catch {}
  }
}
