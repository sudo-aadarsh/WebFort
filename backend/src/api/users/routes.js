import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { broadcast } from '../../services/websocket.js';

const router = Router();

// List all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    const users = await db.prepare(
      'SELECT id, email, name, role, company, created_at FROM users WHERE tenant_id IS NOT DISTINCT FROM ? ORDER BY created_at DESC'
    ).all(tenantId);
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    const tenantId = req.tenant?.id || null;
    if (!['admin', 'user', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    await db.prepare('UPDATE users SET role = ?, updated_at = NOW() WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(role, req.params.id, tenantId);
    res.json({ message: 'Role updated' });
  } catch (error) {
    next(error);
  }
});

// Update own profile
router.patch('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, company, job_title, avatar_url } = req.body;
    const tenantId = req.tenant?.id || null;
    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (company !== undefined) { updates.push('company = ?'); params.push(company); }
    if (job_title !== undefined) { updates.push('job_title = ?'); params.push(job_title); }
    if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }

    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

    updates.push('updated_at = NOW()');
    params.push(req.user.id);
    params.push(tenantId);

    await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?`).run(...params);
    const user = await db.prepare('SELECT id, email, name, role, company, job_title, avatar_url FROM users WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').get(req.user.id, tenantId);
    
    broadcast(null, { 
      type: 'user.profile_updated', 
      user: { id: user.id, name: user.name, email: user.email } 
    }, tenantId);

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    await db.prepare('DELETE FROM users WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(req.params.id, tenantId);
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

// Delete own account
router.delete('/me', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.tenant?.id || null;
    const userId = req.user.id;

    // 1. Delete all associated data first to satisfy foreign key constraints
    await db.prepare('DELETE FROM alert_configs WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(userId, tenantId);
    await db.prepare('DELETE FROM api_keys WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(userId, tenantId);
    
    // Scans are linked to vulnerabilities, delete those first
    await db.prepare(`
      DELETE FROM vulnerabilities 
      WHERE scan_id IN (SELECT id FROM scans WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?)
      AND tenant_id IS NOT DISTINCT FROM ?
    `).run(userId, tenantId, tenantId);
    
    await db.prepare('DELETE FROM scans WHERE user_id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(userId, tenantId);

    // 2. Finally delete the user
    await db.prepare('DELETE FROM users WHERE id = ? AND tenant_id IS NOT DISTINCT FROM ?').run(userId, tenantId);
    
    broadcast(null, { 
      type: 'user.account_deleted', 
      userId 
    }, tenantId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    next(error);
  }
});

export default router;
