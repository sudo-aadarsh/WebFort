import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { ScanEngine } from '../../core/engine.js';
import { broadcast } from '../../services/websocket.js';

const router = Router();

// Create a new scan
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { targetUrl, scanType = 'full', scanDepth = 3, authConfig = null } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    try {
      new URL(targetUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const id = uuidv4();
    const tenantId = req.tenant?.id || null;

    await db.prepare(
      'INSERT INTO scans (id, tenant_id, user_id, target_url, scan_type, scan_depth) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, tenantId, req.user.id, targetUrl, scanType, scanDepth);

    const scan = await db.prepare('SELECT * FROM scans WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(id, tenantId);

    broadcast(id, { type: 'scan.created', scan }, tenantId);

    ScanEngine.startScan(id, targetUrl, scanType, scanDepth, tenantId, authConfig);

    res.status(201).json({ scan });
  } catch (error) {
    next(error);
  }
});

// List user's scans
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    const tenantId = req.tenant?.id || null;

    let query = 'SELECT * FROM scans WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?';
    const params = [req.user.id, tenantId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const scans = await db.prepare(query).all(...params);
    
    let countQuery = 'SELECT COUNT(*) as count FROM scans WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?';
    const countParams = [req.user.id, tenantId];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const totalRow = await db.prepare(countQuery).get(...countParams);
    const total = totalRow?.count ?? 0;

    res.json({
      scans,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Dashboard stats — must be before /:id to avoid route conflict
router.get('/stats/overview', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    const params = [req.user.id, tenantId];

    const totalRow = await db.prepare(`SELECT COUNT(*) as count FROM scans WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?`).get(...params);
    const activeRow = await db.prepare(`SELECT COUNT(*) as count FROM scans WHERE user_id = ? AND status = 'running' AND tenant_id IS NOT DISTINCT FROM ?`).get(...params);
    const vulnsRow = await db.prepare(`SELECT COUNT(*) as count FROM vulnerabilities v JOIN scans s ON v.scan_id = s.id WHERE s.user_id = ? AND s.tenant_id IS NOT DISTINCT FROM ?`).get(...params);
    const criticalRow = await db.prepare(`SELECT COUNT(*) as count FROM vulnerabilities v JOIN scans s ON v.scan_id = s.id WHERE s.user_id = ? AND v.severity = 'critical' AND s.tenant_id IS NOT DISTINCT FROM ?`).get(...params);

    const recentScans = await db.prepare(`SELECT * FROM scans WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ? ORDER BY created_at DESC LIMIT 5`).all(...params);

    const severityDistribution = await db.prepare(`
      SELECT v.severity, COUNT(*) as count
      FROM vulnerabilities v
      JOIN scans s ON v.scan_id = s.id
      WHERE s.user_id = ? AND s.tenant_id IS NOT DISTINCT FROM ?
      GROUP BY v.severity
    `).all(...params);

    const vulnTypes = await db.prepare(`
      SELECT v.type, COUNT(*) as count
      FROM vulnerabilities v
      JOIN scans s ON v.scan_id = s.id
      WHERE s.user_id = ? AND s.tenant_id IS NOT DISTINCT FROM ?
      GROUP BY v.type
      ORDER BY count DESC
      LIMIT 10
    `).all(...params);

    res.json({
      totalScans: totalRow?.count ?? 0,
      activeScans: activeRow?.count ?? 0,
      totalVulnerabilities: vulnsRow?.count ?? 0,
      criticalVulnerabilities: criticalRow?.count ?? 0,
      recentScans,
      severityDistribution,
      vulnerabilityTypes: vulnTypes
    });
  } catch (error) {
    next(error);
  }
});

// Get scan details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    const scan = await db.prepare(`SELECT * FROM scans WHERE id = ? AND user_id = ? AND tenant_id IS NOT DISTINCT FROM ?`).get(req.params.id, req.user.id, tenantId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const vulnerabilities = await db.prepare(`
      SELECT * FROM vulnerabilities WHERE scan_id = ? AND tenant_id IS NOT DISTINCT FROM ?
      ORDER BY CASE severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        WHEN 'info' THEN 5
      END
    `).all(req.params.id, tenantId);

    res.json({ scan, vulnerabilities });
  } catch (error) {
    next(error);
  }
});

// Get scan vulnerabilities with filters
router.get('/:id/vulnerabilities', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    const scan = await db.prepare(`SELECT id FROM scans WHERE id = ? AND user_id = ? AND tenant_id IS NOT DISTINCT FROM ?`).get(req.params.id, req.user.id, tenantId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    const { severity, type } = req.query;
    let query = 'SELECT * FROM vulnerabilities WHERE scan_id = ? AND tenant_id IS NOT DISTINCT FROM ?';
    const params = [req.params.id, tenantId];

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }
    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY cvss_score DESC';
    const vulnerabilities = await db.prepare(query).all(...params);

    res.json({ vulnerabilities });
  } catch (error) {
    next(error);
  }
});

// Flag vulnerability as false positive (AI Feedback Loop)
router.patch('/:id/vulnerabilities/:vulnId', authenticate, async (req, res, next) => {
  try {
    const { isFalsePositive } = req.body;
    const tenantId = req.tenant?.id || null;

    // Ensure user owns the scan
    const scan = await db.prepare(`SELECT id FROM scans WHERE id = ? AND user_id = ? AND tenant_id IS NOT DISTINCT FROM ?`).get(req.params.id, req.user.id, tenantId);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    await db.prepare('UPDATE vulnerabilities SET is_false_positive = ? WHERE id = ? AND scan_id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(
      isFalsePositive ? 1 : 0, req.params.vulnId, req.params.id, tenantId
    );

    res.json({ message: 'Vulnerability updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Cancel/delete scan
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    const scanId = req.params.id;
    const scan = await db.prepare(`SELECT * FROM scans WHERE id = ? AND user_id = ? AND tenant_id IS NOT DISTINCT FROM ?`).get(scanId, req.user.id, tenantId);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    if (scan.status === 'running') {
      ScanEngine.cancelScan(scanId);
      await db.prepare('UPDATE scans SET status = \'cancelled\' WHERE id = ?').run(scanId);
      broadcast(scanId, { type: 'scan.cancelled', scanId }, tenantId);
    } else {
      await db.prepare('DELETE FROM vulnerabilities WHERE scan_id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(scanId, tenantId);
      await db.prepare('DELETE FROM scans WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(scanId, tenantId);
      broadcast(scanId, { type: 'scan.deleted', scanId }, tenantId);
    }

    res.json({ message: 'Scan deleted' });
  } catch (error) {
    next(error);
  }
});

export default router;
