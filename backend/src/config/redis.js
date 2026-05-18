/**
 * redis.js — Shared Redis client using ioredis.
 * Used for: rate-limit store, session caching, scan result caching.
 */
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6380,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 5) return null; // stop retrying
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on('connect', () => console.log('✓ Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err.message));

await redis.connect().catch((err) => {
  console.warn('⚠️  Redis unavailable — rate limiting will use memory store:', err.message);
});

export default redis;
