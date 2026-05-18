import React, { useState } from 'react';
import { BookOpen, Shield, Code2, Lock, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, Terminal, Zap, Globe, Cpu, FolderOpen, Key, ArrowRightLeft } from 'lucide-react';
import { Card, Badge } from '../components/common';

const TOPICS = [
  {
    id: 'sqli',
    icon: Terminal,
    color: '#ef4444',
    tag: 'OWASP A03',
    title: 'SQL Injection',
    severity: 'critical',
    summary: 'Attackers inject malicious SQL code into input fields to manipulate database queries.',
    detail: `SQL Injection occurs when user-supplied input is not properly sanitized before being included in SQL queries. An attacker can manipulate the query logic to bypass authentication, retrieve sensitive data, modify records, or even execute OS commands.`,
    badCode: `// ❌ Vulnerable — direct string concatenation
const user = await db.query("SELECT * FROM users WHERE email = '" + email + "'");`,
    goodCode: `// ✅ Safe — parameterized query
const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);`,
    tips: [
      'Always use parameterized queries or prepared statements.',
      'Use an ORM (Sequelize, Prisma) which escapes automatically.',
      'Apply principle of least privilege to DB accounts.',
      'Validate and whitelist all input before use.',
    ],
    refs: [
      { label: 'OWASP SQL Injection', url: 'https://owasp.org/www-community/attacks/SQL_Injection' },
      { label: 'CWE-89', url: 'https://cwe.mitre.org/data/definitions/89.html' },
    ],
  },
  {
    id: 'xss',
    icon: Code2,
    color: '#f97316',
    tag: 'OWASP A03',
    title: 'Cross-Site Scripting (XSS)',
    severity: 'high',
    summary: 'Attackers inject malicious scripts that execute in other users\' browsers.',
    detail: `XSS attacks occur when user-supplied data is included in a web page without proper escaping. The three main types are: Reflected (in URL params), Stored (persisted to DB), and DOM-based (manipulating the DOM directly). It enables session hijacking, phishing, and account takeover.`,
    badCode: `// ❌ Vulnerable — raw innerHTML
document.getElementById('output').innerHTML = req.query.message;`,
    goodCode: `// ✅ Safe — text content only
document.getElementById('output').textContent = req.query.message;
// Or in React — JSX auto-escapes by default:
const Output = ({ msg }) => <div>{msg}</div>;`,
    tips: [
      'Use textContent instead of innerHTML where possible.',
      'In React, never use dangerouslySetInnerHTML with user input.',
      'Implement a strict Content-Security-Policy (CSP) header.',
      'Sanitize with DOMPurify if HTML rendering is necessary.',
    ],
    refs: [
      { label: 'OWASP XSS', url: 'https://owasp.org/www-community/attacks/xss/' },
      { label: 'CWE-79', url: 'https://cwe.mitre.org/data/definitions/79.html' },
    ],
  },
  {
    id: 'ssrf',
    icon: Globe,
    color: '#ef4444',
    tag: 'OWASP A10',
    title: 'Server-Side Request Forgery (SSRF)',
    severity: 'critical',
    summary: 'Attackers force the server to make unintended HTTP requests to internal or external systems.',
    detail: `SSRF occurs when a web application fetches a remote resource without validating the user-supplied URL. Attackers can use this to scan internal networks, bypass firewalls, or access sensitive cloud metadata (e.g., AWS IAM credentials at 169.254.169.254).`,
    badCode: `// ❌ Vulnerable — fetches user-provided URL directly
app.get('/fetch-image', async (req, res) => {
  const response = await axios.get(req.query.url);
  res.send(response.data);
});`,
    goodCode: `// ✅ Safe — validates against an allowlist
const ALLOWED_HOSTS = ['images.example.com', 'cdn.example.com'];
app.get('/fetch-image', async (req, res) => {
  const targetUrl = new URL(req.query.url);
  if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
    return res.status(403).send('Host not allowed');
  }
  const response = await axios.get(targetUrl.href);
  res.send(response.data);
});`,
    tips: [
      'Never trust user-supplied URLs without validation.',
      'Implement a strict allowlist of permitted domains or IP addresses.',
      'Disable access to internal IP ranges (127.0.0.1, 10.0.0.0/8, etc.) and cloud metadata endpoints.',
      'Consider using a dedicated proxy service for outbound requests.',
    ],
    refs: [
      { label: 'OWASP SSRF', url: 'https://owasp.org/www-community/attacks/Server_Side_Request_Forgery' },
      { label: 'CWE-918', url: 'https://cwe.mitre.org/data/definitions/918.html' },
    ],
  },
  {
    id: 'rce',
    icon: Cpu,
    color: '#ef4444',
    tag: 'OWASP A03',
    title: 'Remote Code Execution (RCE)',
    severity: 'critical',
    summary: 'Attackers execute arbitrary operating system commands on the server.',
    detail: `Command Injection or RCE happens when user input is passed directly to system shells (like bash or cmd) without sanitization. This allows an attacker to take complete control over the application server, read files, or pivot into the internal network.`,
    badCode: `// ❌ Vulnerable — uses shell execution with user input
const { exec } = require('child_process');
app.get('/ping', (req, res) => {
  exec('ping -c 4 ' + req.query.ip, (err, stdout) => {
    res.send(stdout);
  }); // Attacker sends: 127.0.0.1; cat /etc/passwd
});`,
    goodCode: `// ✅ Safe — uses execFile without shell evaluation
const { execFile } = require('child_process');
app.get('/ping', (req, res) => {
  // Validate input first (e.g., regex for IP address)
  if (!/^[\d.]+$/.test(req.query.ip)) return res.status(400).send('Invalid IP');
  
  execFile('ping', ['-c', '4', req.query.ip], (err, stdout) => {
    res.send(stdout);
  });
});`,
    tips: [
      'Avoid calling OS commands directly from the application if a native library exists.',
      'If you must execute commands, never use shell wrappers (e.g., avoid Node.js \`exec\` in favor of \`execFile\`).',
      'Strictly validate and sanitize all input (e.g., using regex allowlists).',
      'Run the application process with the lowest possible privileges.',
    ],
    refs: [
      { label: 'OWASP Command Injection', url: 'https://owasp.org/www-community/attacks/Command_Injection' },
      { label: 'CWE-78', url: 'https://cwe.mitre.org/data/definitions/78.html' },
    ],
  },
  {
    id: 'lfi',
    icon: FolderOpen,
    color: '#f97316',
    tag: 'OWASP A01',
    title: 'File Inclusion (LFI / RFI)',
    severity: 'high',
    summary: 'Attackers manipulate file paths to read sensitive server files or execute remote scripts.',
    detail: `Local File Inclusion (LFI) allows an attacker to read files on the server (like /etc/passwd) by using path traversal characters (../). Remote File Inclusion (RFI) occurs when an application dynamically includes external files, leading to remote code execution.`,
    badCode: `// ❌ Vulnerable — directly uses input for file path
app.get('/download', (req, res) => {
  const filePath = path.join('/var/www/uploads', req.query.file);
  res.sendFile(filePath); // Attacker sends: ../../../etc/passwd
});`,
    goodCode: `// ✅ Safe — resolves path and verifies directory
app.get('/download', (req, res) => {
  const baseDir = '/var/www/uploads';
  // path.basename ensures only the filename is used, stripping paths
  const safeFilename = path.basename(req.query.file);
  const filePath = path.join(baseDir, safeFilename);
  res.sendFile(filePath);
});`,
    tips: [
      'Never pass user input directly into file system APIs.',
      'Use functions like \`path.basename()\` to strip traversal characters.',
      'Maintain an allowlist or database mapping of allowed files (e.g., id=1 maps to "report.pdf").',
      'Ensure the web server runs with restricted file system permissions.',
    ],
    refs: [
      { label: 'OWASP Path Traversal', url: 'https://owasp.org/www-community/attacks/Path_Traversal' },
      { label: 'CWE-22', url: 'https://cwe.mitre.org/data/definitions/22.html' },
    ],
  },
  {
    id: 'csrf',
    icon: Shield,
    color: '#eab308',
    tag: 'OWASP A01',
    title: 'Cross-Site Request Forgery (CSRF)',
    severity: 'medium',
    summary: 'Forces authenticated users to unknowingly submit requests to a trusted site.',
    detail: `CSRF tricks a victim's browser into sending authenticated requests to a target site. If a user is logged in to their bank and visits a malicious page, that page can trigger fund transfers without the user's knowledge.`,
    badCode: `// ❌ No CSRF protection on state-changing endpoint
router.post('/transfer-funds', authenticate, async (req, res) => {
  await transfer(req.user.id, req.body.to, req.body.amount);
});`,
    goodCode: `// ✅ CSRF token validation
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });
router.post('/transfer-funds', authenticate, csrfProtection, async (req, res) => {
  await transfer(req.user.id, req.body.to, req.body.amount);
});`,
    tips: [
      'Use SameSite=Lax or Strict on session cookies.',
      'Implement CSRF tokens on all state-changing forms.',
      'Use the Synchronizer Token Pattern or Double Submit Cookie.',
      'Modern SPAs using Bearer tokens in Authorization header are naturally CSRF-resistant.',
    ],
    refs: [
      { label: 'OWASP CSRF', url: 'https://owasp.org/www-community/attacks/csrf' },
      { label: 'CWE-352', url: 'https://cwe.mitre.org/data/definitions/352.html' },
    ],
  },
  {
    id: 'idor',
    icon: Lock,
    color: '#3b82f6',
    tag: 'OWASP A01',
    title: 'Insecure Direct Object Reference (IDOR)',
    severity: 'high',
    summary: 'Access control failures that allow users to access other users\' data.',
    detail: `IDOR occurs when an application exposes an internal implementation object (like a database key) directly to users, and doesn't verify the user is authorized to access it. This is the most common API authorization flaw.`,
    badCode: `// ❌ Vulnerable — trusts user-supplied ID without ownership check
router.get('/documents/:id', authenticate, async (req, res) => {
  const doc = await db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  res.json(doc); // Returns ANY document regardless of owner!
});`,
    goodCode: `// ✅ Safe — always scope queries to the authenticated user
router.get('/documents/:id', authenticate, async (req, res) => {
  const doc = await db.prepare(
    'SELECT * FROM documents WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id); // Enforces ownership
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});`,
    tips: [
      'Never trust client-supplied IDs without ownership verification.',
      'Use UUIDs instead of sequential integer IDs (harder to enumerate).',
      'Implement centralized authorization checks (RBAC/ABAC).',
      'Log and alert on repeated 403/404 errors per user — possible enumeration attack.',
    ],
    refs: [
      { label: 'OWASP IDOR', url: 'https://owasp.org/www-community/attacks/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet' },
      { label: 'CWE-639', url: 'https://cwe.mitre.org/data/definitions/639.html' },
    ],
  },
  {
    id: 'secrets',
    icon: Key,
    color: '#ef4444',
    tag: 'OWASP A07',
    title: 'Sensitive Data Exposure (Secrets in Code)',
    severity: 'high',
    summary: 'Hardcoding API keys, passwords, or tokens in source code exposes them to attackers.',
    detail: `Developers sometimes accidentally commit sensitive credentials (like AWS keys or Stripe tokens) into source control or include them in client-side JavaScript bundles. Attackers actively scan public repositories and web applications for these secrets to gain unauthorized access to third-party services or infrastructure.`,
    badCode: `// Vulnerable - hardcoded API key in client-side code
const stripe = Stripe('HARDCODED_STRIPE_SECRET_KEY');
const awsConfig = {
  accessKeyId: "HARDCODED_AWS_ACCESS_KEY_ID",
  secretAccessKey: "HARDCODED_AWS_SECRET_ACCESS_KEY"
};`,
    goodCode: `// Safe - secrets remain on the backend
// In your backend code (.env file):
// STRIPE_SECRET_KEY=loaded_from_secret_manager

// In your frontend code (using publishable keys only):
const stripe = Stripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY);

// For AWS, use IAM Roles or fetch temporary STS tokens from your backend.`,
    tips: [
      'Never commit \`.env\` files or hardcode secrets in source code.',
      'Use secret management tools like AWS Secrets Manager or HashiCorp Vault.',
      'Never expose private keys (e.g., Stripe secret keys) to the frontend/browser.',
      'Use tools like \`git-secrets\` or \`trufflehog\` in your CI/CD pipeline to prevent secret leaks.',
    ],
    refs: [
      { label: 'OWASP Sensitive Data Exposure', url: 'https://owasp.org/www-project-top-ten/2017/A3_2017-Sensitive_Data_Exposure' },
      { label: 'CWE-798', url: 'https://cwe.mitre.org/data/definitions/798.html' },
    ],
  },
  {
    id: 'openredirect',
    icon: ArrowRightLeft,
    color: '#eab308',
    tag: 'OWASP A01',
    title: 'Open Redirects',
    severity: 'medium',
    summary: 'Attackers manipulate redirect URLs to send users to malicious phishing sites.',
    detail: `An Open Redirect occurs when an application takes a parameter and redirects the user to that URL without validation. This is frequently used in phishing campaigns; a user trusts the base domain (e.g., \`example.com?redirect=http://evil.com\`) but is silently forwarded to an attacker-controlled site to steal credentials.`,
    badCode: `// ❌ Vulnerable — trusts redirect parameter blindly
app.get('/login', (req, res) => {
  // After successful login
  const returnTo = req.query.returnTo;
  res.redirect(returnTo); // Attacker controls this!
});`,
    goodCode: `// ✅ Safe — validates redirect destination
app.get('/login', (req, res) => {
  const returnTo = req.query.returnTo;
  
  // Only allow relative paths (start with / and not //)
  if (returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    res.redirect(returnTo);
  } else {
    // Fallback to default safe page
    res.redirect('/dashboard');
  }
});`,
    tips: [
      'Avoid using user input to determine the redirect destination.',
      'If necessary, implement an allowlist of fully qualified domain names.',
      'Prefer redirecting only to relative paths within your own application.',
      'Be aware of bypasses like \`//evil.com\` or \`\\\\evil.com\` when checking for relative paths.',
    ],
    refs: [
      { label: 'OWASP Unvalidated Redirects', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html' },
      { label: 'CWE-601', url: 'https://cwe.mitre.org/data/definitions/601.html' },
    ],
  },
  {
    id: 'headers',
    icon: Zap,
    color: '#a855f7',
    tag: 'OWASP A05',
    title: 'Security Misconfigurations',
    severity: 'medium',
    summary: 'Missing or incorrect security headers expose the app to a wide range of attacks.',
    detail: `Security headers are a critical first line of defense. Missing headers like CSP, HSTS, and X-Frame-Options leave your application exposed to clickjacking, protocol downgrade attacks, and XSS.`,
    badCode: `// ❌ No security headers — default Express setup
const app = express();`,
    goodCode: `// ✅ Hardened with Helmet.js
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));`,
    tips: [
      'Use Helmet.js (Node.js) or equivalent for your framework.',
      'Set Strict-Transport-Security (HSTS) with a long max-age.',
      'Use a strict Content-Security-Policy to prevent XSS.',
      'Set X-Frame-Options: DENY to prevent clickjacking.',
      'Remove the X-Powered-By header to reduce information disclosure.',
    ],
    refs: [
      { label: 'OWASP Secure Headers Project', url: 'https://owasp.org/www-project-secure-headers/' },
      { label: 'securityheaders.com', url: 'https://securityheaders.com' },
    ],
  },
];

const SEVERITY_STYLE = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  high:     { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  medium:   { bg: 'rgba(234,179,8,0.12)',  color: '#eab308' },
  low:      { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
};

function TopicCard({ topic }) {
  const [open, setOpen] = useState(false);
  const Icon = topic.icon;
  const sev = SEVERITY_STYLE[topic.severity];

  return (
    <Card style={{ marginBottom: '1rem', padding: 0 }} className={!open ? 'card-hover' : ''}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '1.25rem',
          background: 'none', border: 'none', cursor: 'pointer', padding: '1.5rem',
          textAlign: 'left',
        }}
      >
        <div style={{ padding: '0.75rem', borderRadius: '12px', background: `${topic.color}15`, flexShrink: 0 }}>
          <Icon size={22} color={topic.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-main)' }}>{topic.title}</span>
            <Badge severity={topic.severity}>{topic.severity}</Badge>
            <span style={{ fontSize: '0.75rem', padding: '2px 10px', borderRadius: '20px', background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 600 }}>
              {topic.tag}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>{topic.summary}</p>
        </div>
        {open ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
      </button>

      {open && (
        <div style={{ padding: '0 1.5rem 1.5rem', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-main)', lineHeight: 1.8, marginTop: '1.25rem', fontSize: '0.9375rem' }}>{topic.detail}</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem', marginTop: '1.5rem' }}>
            <div>
              <h4 style={{ color: 'var(--critical)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>❌ Vulnerable Pattern</h4>
              <pre style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '12px', padding: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-main)', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {topic.badCode}
              </pre>
            </div>
            <div>
              <h4 style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>✅ Secure Pattern</h4>
              <pre style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '12px', padding: '1.25rem', fontSize: '0.8125rem', color: 'var(--text-main)', overflowX: 'auto', whiteSpace: 'pre-wrap', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {topic.goodCode}
              </pre>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>🛡️ Best Practices</h4>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {topic.tips.map((tip, i) => (
                <li key={i} style={{ color: 'var(--text-main)', fontSize: '0.875rem', lineHeight: 1.5 }}>{tip}</li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {topic.refs.map((ref, i) => (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--primary)', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <ExternalLink size={12} /> {ref.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export const Education = () => {
  const [search, setSearch] = useState('');
  const filtered = TOPICS.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.tag.toLowerCase().includes(search.toLowerCase()) ||
    t.severity.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BookOpen size={28} color="var(--primary)" /> Security Education Hub
        </h1>
        <p className="dashboard-subtitle">
          Learn to identify and fix the most common web vulnerabilities with real code examples
        </p>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Vulnerabilities Covered', value: TOPICS.length, color: 'var(--primary)' },
          { label: 'OWASP Top 10 Coverage', value: '80%', color: '#10b981' },
          { label: 'Code Examples', value: TOPICS.length * 2, color: '#f97316' },
        ].map(stat => (
          <Card key={stat.label} style={{ padding: '1rem 1.5rem', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem', fontWeight: 800, color: stat.color }}>{stat.value}</span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</span>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="Search by vulnerability, OWASP tag, or severity..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '12px', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <span style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>🔍</span>
      </div>

      {/* Topic Cards */}
      {filtered.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No topics match your search.
        </Card>
      ) : (
        filtered.map(topic => <TopicCard key={topic.id} topic={topic} />)
      )}
    </div>
  );
};
