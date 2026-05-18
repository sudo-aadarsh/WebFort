/**
 * cache.js — Redis-backed response cache helper.
 * Used to cache scan stats, reports and other heavy read queries.
 */
import redis from '../config/redis.js';

const DEFAULT_TTL = 60; // seconds

export async function getCached(key) {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function setCached(key, value, ttl = DEFAULT_TTL) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
  } catch {
    // fail silently — cache is optional
  }
}

export async function invalidateCache(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // fail silently
  }
}

/**
 * Express middleware factory for caching GET responses.
 * Usage: router.get('/stats', cacheMiddleware('stats:${userId}', 30), handler)
 */
export function cacheMiddleware(keyFn, ttl = DEFAULT_TTL) {
  return async (req, res, next) => {
    const key = typeof keyFn === 'function' ? keyFn(req) : keyFn;
    const cached = await getCached(key);
    if (cached) {
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode === 200) {
        setCached(key, body, ttl);
      }
      return originalJson(body);
    };
    next();
  };
}
