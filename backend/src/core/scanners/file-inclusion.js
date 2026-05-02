import axios from 'axios';

const LFI_PAYLOADS = [
  '../../../../etc/passwd',
  '....//....//....//etc/passwd',
  '/etc/passwd',
  '..\\..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
  '....\\....\\....\\windows\\win.ini',
];

const LFI_MARKERS = ['root:', '[fonts]', '[extensions]', 'localhost'];

const RFI_PAYLOADS = [
  'https://httpbin.org/robots.txt',
  'http://example.com',
];

export class FileInclusionScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    for (const url of this.urls.slice(0, 15)) {
      await this.testLFI(url);
      await this.testRFI(url);
    }
    await this.testPathTraversal();
    return this.vulnerabilities;
  }

  async testLFI(url) {
    try {
      const parsed = new URL(url);
      const fileParams = ['file', 'page', 'path', 'template', 'include', 'doc', 'lang', 'view'];
      const params = [...parsed.searchParams.keys()].filter(p =>
        fileParams.some(fp => p.toLowerCase().includes(fp)) || parsed.searchParams.keys().next().value === p
      );

      for (const param of params.slice(0, 3)) {
        for (const payload of LFI_PAYLOADS.slice(0, 3)) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          try {
            const r = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
            if (typeof r.data === 'string' && LFI_MARKERS.some(m => r.data.includes(m))) {
              this.vulnerabilities.push({
                type: 'File Inclusion', severity: 'critical',
                title: `Local File Inclusion (LFI) via ${param}`,
                description: `Parameter "${param}" allows reading server files via path traversal.`,
                url, parameter: param, evidence: `Payload: ${payload} - system file contents in response`,
                remediation: 'Use allowlists for file paths. Never use user input directly in file operations.',
                cvssScore: 9.1, cweId: 'CWE-98', owaspCategory: 'A03:2021 - Injection'
              });
              return;
            }
          } catch {}
        }
      }
    } catch {}
  }

  async testRFI(url) {
    try {
      const parsed = new URL(url);
      for (const [param] of parsed.searchParams.entries()) {
        for (const payload of RFI_PAYLOADS) {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          try {
            const r = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
            if (typeof r.data === 'string' && (r.data.includes('httpbin') || r.data.includes('Example Domain'))) {
              this.vulnerabilities.push({
                type: 'File Inclusion', severity: 'critical',
                title: `Remote File Inclusion (RFI) via ${param}`,
                description: `Parameter "${param}" allows including remote files/URLs.`,
                url, parameter: param, evidence: `External URL content loaded: ${payload}`,
                remediation: 'Disable remote file inclusion. Validate and sanitize all file paths.',
                cvssScore: 9.8, cweId: 'CWE-98', owaspCategory: 'A03:2021 - Injection'
              });
              return;
            }
          } catch {}
        }
      }
    } catch {}
  }

  async testPathTraversal() {
    const baseUrl = new URL(this.targetUrl).origin;
    const paths = ['/..%2f..%2f..%2fetc/passwd', '/%2e%2e/%2e%2e/etc/passwd'];
    for (const path of paths) {
      try {
        const r = await axios.get(`${baseUrl}${path}`, { timeout: 5000, validateStatus: () => true });
        if (typeof r.data === 'string' && r.data.includes('root:')) {
          this.vulnerabilities.push({
            type: 'File Inclusion', severity: 'critical',
            title: 'Path Traversal via URL encoding bypass',
            description: 'The server is vulnerable to path traversal using URL-encoded sequences.',
            url: `${baseUrl}${path}`, evidence: 'System file contents accessible',
            remediation: 'Normalize and validate all file paths. Use chroot or containerization.',
            cvssScore: 9.1, cweId: 'CWE-22', owaspCategory: 'A01:2021 - Broken Access Control'
          });
          return;
        }
      } catch {}
    }
  }
}
