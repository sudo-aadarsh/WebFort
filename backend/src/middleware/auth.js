import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  const queryToken = req.query.token;

  if (apiKey) {
    try {
      const user = await db.prepare(
        'SELECT u.* FROM users u JOIN api_keys ak ON u.id = ak.user_id WHERE ak.key_hash = ?'
      ).get(apiKey);
      if (user) {
        req.user = { id: user.id, email: user.email, role: user.role, name: user.name, tenant_id: user.tenant_id };
        await db.prepare('UPDATE api_keys SET last_used = NOW() WHERE key_hash = ?').run(apiKey);
        return next();
      }
    } catch (err) {
      console.error('API key lookup error:', err.message);
    }
    return res.status(401).json({ error: 'Invalid API key' });
  }

  let token;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (queryToken) {
    token = queryToken;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.prepare(
      'SELECT id, email, role, name, company FROM users WHERE id = ?'
    ).get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
