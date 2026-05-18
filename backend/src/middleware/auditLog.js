/**
 * auditLog.js — Audit logging middleware.
 * Records security-sensitive actions to the audit_logs table for GDPR/SOC2 compliance.
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

// Actions to always audit
const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUDITED_PATHS = ['/api/auth', '/api/scans', '/api/users', '/api/alerts'];

export function auditLog(req, res, next) {
  const shouldAudit =
    AUDITED_METHODS.has(req.method) &&
    AUDITED_PATHS.some((p) => req.path.startsWith(p));

  if (!shouldAudit) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    // Log after response is determined
    setImmediate(async () => {
      try {
        await db.prepare(`
          INSERT INTO audit_logs
            (id, user_id, tenant_id, action, resource, status_code, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `).run(
          uuidv4(),
          req.user?.id || null,
          req.tenant?.id || null,
          `${req.method} ${req.path}`,
          req.params?.id || null,
          res.statusCode,
          req.ip,
          req.headers['user-agent'] || null
        );
      } catch (err) {
        // Audit logging must never crash the app
        console.error('Audit log error:', err.message);
      }
    });
    return originalJson(body);
  };

  next();
}
