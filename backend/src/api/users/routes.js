import { Router } from 'express';
import db from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();

// List all users (admin only)
router.get('/', authenticate, authorize('admin'), (req, res) => {
  const users = db.prepare(
    'SELECT id, email, name, role, company, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

// Update user role (admin only)
router.patch('/:id/role', authenticate, authorize('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'user', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  db.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated' });
});

// Update profile
router.patch('/profile', authenticate, (req, res) => {
  const { name, company } = req.body;
  const updates = [];
  const params = [];

  if (name) { updates.push('name = ?'); params.push(name); }
  if (company !== undefined) { updates.push('company = ?'); params.push(company); }

  if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

  updates.push('updated_at = datetime("now")');
  params.push(req.user.id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const user = db.prepare('SELECT id, email, name, role, company FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

// Delete user (admin only)
router.delete('/:id', authenticate, authorize('admin'), (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

export default router;
