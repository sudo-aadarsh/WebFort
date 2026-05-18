/**
 * tenant.js — Multi-tenant middleware.
 * Reads tenant_id from JWT/header and attaches it to req.tenant.
 * All DB queries in tenant-aware routes should filter by tenant_id.
 */
import db from '../config/database.js';

export async function resolveTenant(req, res, next) {
  // Tenant can be identified via:
  // 1. Subdomain (e.g., acme.websecure.io)
  // 2. X-Tenant-ID header (for API key usage)
  // 3. tenant_id embedded in the JWT (set on req.user by authenticate middleware)

  // Option 1: X-Tenant-ID header (CI/CD, API key flows)
  const headerTenantId = req.headers['x-tenant-id'];
  if (headerTenantId) {
    const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(headerTenantId);
    if (tenant) {
      req.tenant = tenant;
      return next();
    }
    return res.status(400).json({ error: 'Invalid tenant ID' });
  }

  // Option 2: Subdomain detection
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
    const tenant = await db.prepare('SELECT * FROM tenants WHERE domain = ?').get(subdomain);
    if (tenant) {
      req.tenant = tenant;
      return next();
    }
  }

  // Option 3: Derive from authenticated user
  if (req.user?.id) {
    const user = await db.prepare('SELECT tenant_id FROM users WHERE id = ?').get(req.user.id);
    if (user?.tenant_id) {
      const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id);
      if (tenant) {
        req.tenant = tenant;
        return next();
      }
    }
  }

  // No tenant found — operate in single-tenant / default mode
  req.tenant = null;
  next();
}

export function requireTenant(req, res, next) {
  if (!req.tenant) {
    return res.status(400).json({ error: 'Tenant context required' });
  }
  next();
}
