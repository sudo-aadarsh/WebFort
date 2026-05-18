import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Get alert configurations
router.get('/', authenticate, async (req, res) => {
  const tenantId = req.tenant?.id || null;
  const alerts = await db.prepare('SELECT * FROM alert_configs WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?').all(req.user.id, tenantId);
  res.json({ alerts });
});

// Create alert config
router.post('/', authenticate, async (req, res) => {
  const { channel, endpoint, minSeverity = 'high' } = req.body;
  const tenantId = req.tenant?.id || null;

  if (!channel || !endpoint) {
    return res.status(400).json({ error: 'Channel and endpoint are required' });
  }

  const id = uuidv4();
  await db.prepare(
    'INSERT INTO alert_configs (id, tenant_id, user_id, channel, endpoint, min_severity) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, tenantId, req.user.id, channel, endpoint, minSeverity);

  const alert = await db.prepare('SELECT * FROM alert_configs WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(id, tenantId);
  res.status(201).json({ alert });
});

// Update alert config
router.patch('/:id', authenticate, async (req, res) => {
  const { endpoint, minSeverity, enabled } = req.body;
  const tenantId = req.tenant?.id || null;
  const alert = await db.prepare('SELECT * FROM alert_configs WHERE id = ? AND user_id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(req.params.id, req.user.id, tenantId);
  
  if (!alert) return res.status(404).json({ error: 'Alert config not found' });

  const updates = [];
  const params = [];
  if (endpoint) { updates.push('endpoint = ?'); params.push(endpoint); }
  if (minSeverity) { updates.push('min_severity = ?'); params.push(minSeverity); }
  if (enabled !== undefined) { updates.push('enabled = ?'); params.push(enabled ? 1 : 0); }

  if (updates.length > 0) {
    params.push(req.params.id);
    await db.prepare(`UPDATE alert_configs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  const updated = await db.prepare('SELECT * FROM alert_configs WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(req.params.id, tenantId);
  res.json({ alert: updated });
});

// Delete alert config
router.delete('/:id', authenticate, async (req, res) => {
  const tenantId = req.tenant?.id || null;
  const alert = await db.prepare('SELECT * FROM alert_configs WHERE id = ? AND user_id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(req.params.id, req.user.id, tenantId);
  if (!alert) return res.status(404).json({ error: 'Alert config not found' });

  await db.prepare('DELETE FROM alert_configs WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(req.params.id, tenantId);
  res.json({ message: 'Alert config deleted' });
});

export default router;
