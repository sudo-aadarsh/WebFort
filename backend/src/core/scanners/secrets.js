import axios from 'axios';

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g, severity: 'high', cwe: 'CWE-798' },
  { name: 'Firebase URL', regex: /[a-z0-9.-]+\.firebaseio\.com/g, severity: 'medium', cwe: 'CWE-200' },
  { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}/g, severity: 'high', cwe: 'CWE-798' },
  { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g, severity: 'high', cwe: 'CWE-798' },
  { name: 'Slack Webhook', regex: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Z0-9]+/g, severity: 'high', cwe: 'CWE-798' },
  { name: 'Stripe API Key', regex: /[rs]k_(test|live)_[0-9a-zA-Z]{24}/g, severity: 'high', cwe: 'CWE-798' },
  { name: 'Private Key', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, severity: 'critical', cwe: 'CWE-312' },
  { name: 'Password in URL', regex: /[a-zA-Z0-9]+:\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9.-]+/g, severity: 'high', cwe: 'CWE-255' },
];

export class SecretsScanner {
  constructor(targetUrl, urls, forms) {
    this.targetUrl = targetUrl;
    this.urls = urls;
    this.vulnerabilities = [];
  }

  async scan() {
    // Find all JS files
    const jsFiles = this.urls.filter(url => url.endsWith('.js') || url.includes('.js?'));
    
    // Also include the target URL itself (it might be a script or contain inline scripts)
    const filesToScan = [...new Set([this.targetUrl, ...jsFiles])].slice(0, 15);

    for (const fileUrl of filesToScan) {
      await this.scanFile(fileUrl);
    }

    return this.vulnerabilities;
  }

  async scanFile(url) {
    try {
      const response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
      if (typeof response.data !== 'string') return;

      const content = response.data;

      for (const pattern of SECRET_PATTERNS) {
        const matches = content.match(pattern.regex);
        if (matches) {
          // Remove duplicates
          const uniqueMatches = [...new Set(matches)];
          
          uniqueMatches.forEach(match => {
            // Obfuscate the secret in the report
            const obfuscated = match.length > 8 
              ? `${match.substring(0, 4)}...${match.substring(match.length - 4)}`
              : '********';

            this.vulnerabilities.push({
              type: 'Sensitive Data Exposure',
              severity: pattern.severity,
              title: `Hardcoded ${pattern.name} found in JS`,
              description: `A hardcoded ${pattern.name} was discovered in the client-side JavaScript file. This could allow attackers to gain unauthorized access to third-party services or internal systems.`,
              url: url,
              evidence: `Found secret: ${obfuscated}`,
              remediation: 'Remove all hardcoded secrets from client-side code. Use environment variables and inject them during the build process if necessary, but never expose sensitive keys (like private/secret keys) to the frontend.',
              cvssScore: pattern.severity === 'critical' ? 9.1 : (pattern.severity === 'high' ? 7.5 : 5.3),
              cweId: pattern.cwe,
              owaspCategory: 'A07:2021 - Identification and Authentication Failures'
            });
          });
        }
      }
    } catch {}
  }
}
