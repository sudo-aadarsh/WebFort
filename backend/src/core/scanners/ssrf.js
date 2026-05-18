import axios from 'axios';
import { oobService } from '../../services/oob.js';

const SSRF_PAYLOADS = [
  'http://169.254.169.254/latest/meta-data/', // AWS/EC2
  'http://metadata.google.internal/computeMetadata/v1/', // GCP
  'http://127.0.0.1:22', // Local Port Probing
  'http://localhost:80',
];

export class SSRFScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    for (const url of this.urls.slice(0, 15)) {
      await this.testUrlParams(url);
    }
    return this.vulnerabilities;
  }

  async testUrlParams(url) {
    try {
      const parsed = new URL(url);
      const params = [...parsed.searchParams.keys()];
      
      const ssrfParams = ['url', 'target', 'dest', 'redirect', 'uri', 'path', 'continue', 'file', 'img', 'src'];

      for (const param of params) {
        // Only test parameters that look like URLs or paths
        const isLikelySSRF = ssrfParams.some(p => param.toLowerCase().includes(p));
        if (!isLikelySSRF) continue;

        // 1. Test Out-of-Band (OOB) - Best for Blind SSRF
        const { token, callbackUrl } = oobService.generateToken();
        const testUrlOOB = new URL(url);
        testUrlOOB.searchParams.set(param, callbackUrl);

        try {
          await axios.get(testUrlOOB.href, { timeout: 4000, validateStatus: () => true });
          
          // Small delay for OOB interaction
          await new Promise(r => setTimeout(r, 1500));

          if (oobService.hasInteraction(token)) {
            this.vulnerabilities.push({
              type: 'SSRF',
              severity: 'critical',
              title: `Server-Side Request Forgery (SSRF) via ${param}`,
              description: `The parameter "${param}" allows the server to make arbitrary HTTP requests. An out-of-band interaction was detected, confirming the server reached out to an external URL.`,
              url: url,
              parameter: param,
              evidence: `OOB interaction detected at ${callbackUrl}`,
              remediation: 'Implement a strict allowlist of permitted domains/IPs. Use a proxy service for external requests. Avoid processing user-supplied URLs directly on the server.',
              cvssScore: 9.8,
              cweId: 'CWE-918',
              owaspCategory: 'A10:2021 - Server-Side Request Forgery'
            });
            continue; // Found SSRF for this param
          }
        } catch {}

        // 2. Test for Cloud Metadata / Localhost (Response-based)
        for (const payload of SSRF_PAYLOADS.slice(0, 2)) {
          const testUrlPayload = new URL(url);
          testUrlPayload.searchParams.set(param, payload);
          
          try {
            const r = await axios.get(testUrlPayload.href, { timeout: 4000, validateStatus: () => true });
            const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
            
            // AWS / GCP Metadata indicators
            if (body.includes('ami-id') || body.includes('instance-id') || body.includes('computeMetadata')) {
              this.vulnerabilities.push({
                type: 'SSRF',
                severity: 'critical',
                title: `Cloud Metadata SSRF via ${param}`,
                description: `The parameter "${param}" can be used to access cloud instance metadata (AWS/GCP), which may contain sensitive credentials.`,
                url: url,
                parameter: param,
                evidence: `Metadata marker found in response from: ${payload}`,
                remediation: 'Disable access to the metadata service from the application server. Validate and sanitize all URLs.',
                cvssScore: 9.8,
                cweId: 'CWE-918',
                owaspCategory: 'A10:2021 - Server-Side Request Forgery'
              });
              break;
            }
          } catch {}
        }
      }
    } catch {}
  }
}
