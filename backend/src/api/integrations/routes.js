import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { ScanEngine } from '../../core/engine.js';

const router = Router();

// Trigger scan from CI/CD (uses API key auth)
router.post('/cicd/trigger', authenticate, (req, res) => {
  const { targetUrl, scanType = 'quick', scanDepth = 2, waitForResults = false } = req.body;

  if (!targetUrl) {
    return res.status(400).json({ error: 'Target URL is required' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO scans (id, user_id, target_url, scan_type, scan_depth) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.user.id, targetUrl, scanType, scanDepth);

  ScanEngine.startScan(id, targetUrl, scanType, scanDepth);

  res.status(201).json({
    scanId: id,
    statusUrl: `/api/integrations/cicd/status/${id}`,
    message: 'Scan started successfully'
  });
});

// Check scan status (for CI/CD polling)
router.get('/cicd/status/:scanId', authenticate, (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ? AND user_id = ?').get(req.params.scanId, req.user.id);
  
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  const response = {
    scanId: scan.id,
    status: scan.status,
    progress: scan.progress,
    vulnerabilities: {
      total: scan.total_vulnerabilities,
      critical: scan.critical_count,
      high: scan.high_count,
      medium: scan.medium_count,
      low: scan.low_count
    }
  };

  // For CI/CD: return non-zero exit code indication for critical/high vulns
  if (scan.status === 'completed') {
    response.passed = scan.critical_count === 0 && scan.high_count === 0;
    response.reportUrl = `/api/reports/${scan.id}/sarif`;
  }

  res.json(response);
});

// GitHub webhook handler
router.post('/webhooks/github', (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`GitHub webhook: ${event}`);

  // Handle push events for automatic scanning
  if (event === 'push' || event === 'pull_request') {
    // In production, this would extract the deployment URL and trigger a scan
    console.log(`Received ${event} event for repo: ${payload.repository?.full_name}`);
  }

  res.json({ received: true });
});

export default router;
