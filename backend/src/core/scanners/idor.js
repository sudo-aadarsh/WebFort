import axios from 'axios';

export class IDORScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.forms = forms;
    this.vulnerabilities = [];
  }

  async scan() {
    for (const url of this.urls.slice(0, 20)) {
      await this.testSequentialIDs(url);
    }
    await this.testPredictablePaths();
    return this.vulnerabilities;
  }

  async testSequentialIDs(url) {
    try {
      const parsed = new URL(url);
      for (const [param, value] of parsed.searchParams.entries()) {
        if (/^\d+$/.test(value)) {
          const numValue = parseInt(value);
          const testIds = [numValue - 1, numValue + 1];
          let accessible = 0;
          for (const testId of testIds) {
            if (testId < 1) continue;
            const testUrl = new URL(url);
            testUrl.searchParams.set(param, testId.toString());
            try {
              const r = await axios.get(testUrl.href, { timeout: 5000, validateStatus: () => true });
              if (r.status === 200) accessible++;
            } catch {}
          }
          if (accessible >= 2) {
            this.vulnerabilities.push({
              type: 'IDOR', severity: 'high',
              title: `Potential IDOR via sequential ID: ${param}`,
              description: `Parameter "${param}" uses sequential IDs. Adjacent IDs return valid responses.`,
              url, parameter: param,
              evidence: `${accessible} adjacent IDs returned 200 OK`,
              remediation: 'Use UUIDs instead of sequential IDs. Implement authorization checks.',
              cvssScore: 7.5, cweId: 'CWE-639', owaspCategory: 'A01:2021 - Broken Access Control'
            });
          }
        }
      }
    } catch {}
  }

  async testPredictablePaths() {
    const paths = ['/admin', '/.env', '/config.json', '/api/users/1', '/backup'];
    const baseUrl = new URL(this.targetUrl).origin;
    for (const path of paths) {
      try {
        const r = await axios.get(`${baseUrl}${path}`, { timeout: 5000, validateStatus: () => true, maxRedirects: 0 });
        if (r.status === 200) {
          this.vulnerabilities.push({
            type: 'IDOR', severity: path.includes('.env') ? 'critical' : 'medium',
            title: `Accessible sensitive path: ${path}`,
            description: `Path "${path}" returns 200 OK, may expose sensitive data.`,
            url: `${baseUrl}${path}`,
            evidence: `HTTP ${r.status}`,
            remediation: 'Restrict access with authentication. Remove config files from web root.',
            cvssScore: path.includes('.env') ? 9.1 : 5.3, cweId: 'CWE-284', owaspCategory: 'A01:2021 - Broken Access Control'
          });
        }
      } catch {}
    }
  }
}
