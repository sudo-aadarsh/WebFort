import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initializeDatabase } from './database.js';
import db from './database.js';

initializeDatabase();

console.log('🌱 Seeding database...\n');

// Create admin user
const adminId = uuidv4();
const adminPass = await bcrypt.hash('admin123', 12);
db.prepare('INSERT OR IGNORE INTO users (id, email, password, name, role, company, api_key) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
  adminId, 'admin@webfort.io', adminPass, 'Admin User', 'admin', 'WebFort Inc', `wf_${uuidv4().replace(/-/g, '')}`
);

// Create demo user
const userId = uuidv4();
const userPass = await bcrypt.hash('demo1234', 12);
db.prepare('INSERT OR IGNORE INTO users (id, email, password, name, role, company, api_key) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
  userId, 'demo@webfort.io', userPass, 'Demo User', 'user', 'Acme Corp', `wf_${uuidv4().replace(/-/g, '')}`
);

// Create demo scans
const scanData = [
  { url: 'https://example.com', type: 'full', status: 'completed', progress: 100, total: 12, crit: 2, high: 3, med: 4, low: 2, info: 1, pages: 24 },
  { url: 'https://api.example.com', type: 'api', status: 'completed', progress: 100, total: 8, crit: 1, high: 2, med: 3, low: 1, info: 1, pages: 15 },
  { url: 'https://staging.example.com', type: 'quick', status: 'completed', progress: 100, total: 5, crit: 0, high: 1, med: 2, low: 1, info: 1, pages: 10 },
  { url: 'https://shop.example.com', type: 'full', status: 'completed', progress: 100, total: 18, crit: 3, high: 5, med: 6, low: 3, info: 1, pages: 42 },
  { url: 'https://blog.example.com', type: 'quick', status: 'completed', progress: 100, total: 3, crit: 0, high: 0, med: 1, low: 1, info: 1, pages: 8 },
];

const scanIds = [];
for (const s of scanData) {
  const id = uuidv4();
  scanIds.push(id);
  const daysAgo = Math.floor(Math.random() * 30);
  db.prepare(`INSERT INTO scans (id, user_id, target_url, scan_type, status, progress, total_vulnerabilities, critical_count, high_count, medium_count, low_count, info_count, pages_scanned, started_at, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-${daysAgo} days', '-1 hours'), datetime('now', '-${daysAgo} days'), datetime('now', '-${daysAgo} days', '-1 hours'))`).run(
    id, userId, s.url, s.type, s.status, s.progress, s.total, s.crit, s.high, s.med, s.low, s.info, s.pages
  );
}

// Create demo vulnerabilities
const vulnTemplates = [
  { type: 'XSS', severity: 'high', title: 'Reflected XSS in search parameter', desc: 'The search parameter reflects user input without encoding.', rem: 'Implement output encoding.', cvss: 6.1, cwe: 'CWE-79' },
  { type: 'SQL Injection', severity: 'critical', title: 'SQL Injection in login form', desc: 'The login form is vulnerable to SQL injection via the username field.', rem: 'Use parameterized queries.', cvss: 9.8, cwe: 'CWE-89' },
  { type: 'CSRF', severity: 'medium', title: 'Missing CSRF token in profile form', desc: 'The profile update form lacks CSRF protection.', rem: 'Add anti-CSRF tokens.', cvss: 5.4, cwe: 'CWE-352' },
  { type: 'Security Headers', severity: 'medium', title: 'Missing Content-Security-Policy', desc: 'No CSP header is configured.', rem: 'Add a strict CSP header.', cvss: 5.4, cwe: 'CWE-693' },
  { type: 'Security Headers', severity: 'low', title: 'Server version disclosed', desc: 'The Server header reveals technology details.', rem: 'Remove the Server header.', cvss: 2.6, cwe: 'CWE-200' },
  { type: 'IDOR', severity: 'high', title: 'Sequential user IDs allow enumeration', desc: 'User profiles use sequential IDs without access control.', rem: 'Use UUIDs and add authorization checks.', cvss: 7.5, cwe: 'CWE-639' },
  { type: 'RCE', severity: 'critical', title: 'Command injection in file upload', desc: 'Filenames are passed to system commands without sanitization.', rem: 'Never use user input in system commands.', cvss: 10.0, cwe: 'CWE-78' },
  { type: 'File Inclusion', severity: 'critical', title: 'Local File Inclusion via template parameter', desc: 'The template parameter allows reading arbitrary files.', rem: 'Use allowlists for file paths.', cvss: 9.1, cwe: 'CWE-98' },
  { type: 'XSS', severity: 'medium', title: 'DOM-based XSS via document.write', desc: 'JavaScript uses document.write with user-controlled data.', rem: 'Use textContent instead of innerHTML/document.write.', cvss: 4.7, cwe: 'CWE-79' },
  { type: 'Security Headers', severity: 'medium', title: 'Missing HSTS header', desc: 'No Strict-Transport-Security header configured.', rem: 'Add HSTS header with long max-age.', cvss: 4.3, cwe: 'CWE-319' },
  { type: 'Security Headers', severity: 'info', title: 'X-XSS-Protection not set', desc: 'Legacy XSS protection header missing.', rem: 'Add X-XSS-Protection: 0 (rely on CSP instead).', cvss: 1.0, cwe: 'CWE-79' },
  { type: 'CSRF', severity: 'low', title: 'Cookie without SameSite attribute', desc: 'Session cookie lacks SameSite attribute.', rem: 'Set SameSite=Lax on all cookies.', cvss: 3.1, cwe: 'CWE-1275' },
];

const insert = db.prepare('INSERT INTO vulnerabilities (id, scan_id, type, severity, title, description, url, remediation, cvss_score, cwe_id, owasp_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

for (let i = 0; i < scanIds.length; i++) {
  const numVulns = scanData[i].total;
  for (let j = 0; j < numVulns && j < vulnTemplates.length; j++) {
    const v = vulnTemplates[j];
    insert.run(uuidv4(), scanIds[i], v.type, v.severity, v.title, v.desc, scanData[i].url + '/page' + j, v.rem, v.cvss, v.cwe, 'A03:2021 - Injection');
  }
}

console.log('✅ Seed data created successfully!');
console.log(`   Admin: admin@webfort.io / admin123`);
console.log(`   Demo:  demo@webfort.io / demo1234`);
console.log(`   Scans: ${scanIds.length} demo scans with vulnerabilities`);
process.exit(0);
