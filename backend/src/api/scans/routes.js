import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { ScanEngine } from '../../core/engine.js';

const router = Router();

// Create a new scan
router.post('/', authenticate, (req, res, next) => {
  try {
    const { targetUrl, scanType = 'full', scanDepth = 3 } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    // Validate URL
    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const id = uuidv4();
    db.prepare(
      'INSERT INTO scans (id, user_id, target_url, scan_type, scan_depth) VALUES (?, ?, ?, ?, ?)'
    ).run(id, req.user.id, targetUrl, scanType, scanDepth);

    const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(id);

    // Start the scan asynchronously
    ScanEngine.startScan(id, targetUrl, scanType, scanDepth);

    res.status(201).json({ scan });
  } catch (error) {
    next(error);
  }
});

// List user's scans
router.get('/', authenticate, (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM scans WHERE user_id = ?';
  const params = [req.user.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const scans = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM scans WHERE user_id = ?').get(req.user.id).count;

  res.json({
    scans,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get scan details
router.get('/:id', authenticate, (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  const vulnerabilities = db.prepare('SELECT * FROM vulnerabilities WHERE scan_id = ? ORDER BY CASE severity WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 WHEN "low" THEN 4 WHEN "info" THEN 5 END').all(req.params.id);

  res.json({ scan, vulnerabilities });
});

// Get scan vulnerabilities
router.get('/:id/vulnerabilities', authenticate, (req, res) => {
  const scan = db.prepare('SELECT id FROM scans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  const { severity, type } = req.query;
  let query = 'SELECT * FROM vulnerabilities WHERE scan_id = ?';
  const params = [req.params.id];

  if (severity) {
    query += ' AND severity = ?';
    params.push(severity);
  }
  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY cvss_score DESC';
  const vulnerabilities = db.prepare(query).all(...params);

  res.json({ vulnerabilities });
});

// Cancel/delete scan
router.delete('/:id', authenticate, (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }

  if (scan.status === 'running') {
    ScanEngine.cancelScan(req.params.id);
    db.prepare('UPDATE scans SET status = "cancelled" WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('DELETE FROM vulnerabilities WHERE scan_id = ?').run(req.params.id);
    db.prepare('DELETE FROM scans WHERE id = ?').run(req.params.id);
  }

  res.json({ message: 'Scan deleted' });
});

// Dashboard stats
router.get('/stats/overview', authenticate, (req, res) => {
  const totalScans = db.prepare('SELECT COUNT(*) as count FROM scans WHERE user_id = ?').get(req.user.id).count;
  const activeScans = db.prepare('SELECT COUNT(*) as count FROM scans WHERE user_id = ? AND status = "running"').get(req.user.id).count;
  const totalVulns = db.prepare('SELECT COUNT(*) as count FROM vulnerabilities v JOIN scans s ON v.scan_id = s.id WHERE s.user_id = ?').get(req.user.id).count;
  const criticalVulns = db.prepare('SELECT COUNT(*) as count FROM vulnerabilities v JOIN scans s ON v.scan_id = s.id WHERE s.user_id = ? AND v.severity = "critical"').get(req.user.id).count;

  const recentScans = db.prepare('SELECT * FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(req.user.id);

  const severityDistribution = db.prepare(`
    SELECT v.severity, COUNT(*) as count 
    FROM vulnerabilities v 
    JOIN scans s ON v.scan_id = s.id 
    WHERE s.user_id = ? 
    GROUP BY v.severity
  `).all(req.user.id);

  const vulnTypes = db.prepare(`
    SELECT v.type, COUNT(*) as count 
    FROM vulnerabilities v 
    JOIN scans s ON v.scan_id = s.id 
    WHERE s.user_id = ? 
    GROUP BY v.type
    ORDER BY count DESC
    LIMIT 10
  `).all(req.user.id);

  res.json({
    totalScans,
    activeScans,
    totalVulnerabilities: totalVulns,
    criticalVulnerabilities: criticalVulns,
    recentScans,
    severityDistribution,
    vulnerabilityTypes: vulnTypes
  });
});

export default router;
