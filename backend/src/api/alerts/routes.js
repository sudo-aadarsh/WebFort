import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Get alert configurations
router.get('/', authenticate, (req, res) => {
  const alerts = db.prepare('SELECT * FROM alert_configs WHERE user_id = ?').all(req.user.id);
  res.json({ alerts });
});

// Create alert config
router.post('/', authenticate, (req, res) => {
  const { channel, endpoint, minSeverity = 'high' } = req.body;

  if (!channel || !endpoint) {
    return res.status(400).json({ error: 'Channel and endpoint are required' });
  }

  const id = uuidv4();
  db.prepare(
    'INSERT INTO alert_configs (id, user_id, channel, endpoint, min_severity) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.user.id, channel, endpoint, minSeverity);

  const alert = db.prepare('SELECT * FROM alert_configs WHERE id = ?').get(id);
  res.status(201).json({ alert });
});

// Update alert config
router.patch('/:id', authenticate, (req, res) => {
  const { endpoint, minSeverity, enabled } = req.body;
  const alert = db.prepare('SELECT * FROM alert_configs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  
  if (!alert) return res.status(404).json({ error: 'Alert config not found' });

  const updates = [];
  const params = [];
  if (endpoint) { updates.push('endpoint = ?'); params.push(endpoint); }
  if (minSeverity) { updates.push('min_severity = ?'); params.push(minSeverity); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }

  if (updates.length > 0) {
    params.push(req.params.id);
    db.prepare(`UPDATE alert_configs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = db.prepare('SELECT * FROM alert_configs WHERE id = ?').get(req.params.id);
  res.json({ alert: updated });
});

// Delete alert config
router.delete('/:id', authenticate, (req, res) => {
  const alert = db.prepare('SELECT * FROM alert_configs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!alert) return res.status(404).json({ error: 'Alert config not found' });

  db.prepare('DELETE FROM alert_configs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Alert config deleted' });
});

export default router;
