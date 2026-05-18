import redis from '../config/redis.js';

const scanClients = new Map(); // scanId -> Set of ws clients
const tenantClients = new Map(); // tenantId -> Set of ws clients

const REDIS_CHANNEL = 'websecure.ws.broadcast';
let subscriber;

export async function setupWebSocket(wss) {
  try {
    // Create a dedicated Redis subscriber client
    subscriber = redis.duplicate();
    
    subscriber.on('error', (err) => console.error('[WS-Redis] Subscriber error:', err.message));
    subscriber.on('connect', () => console.log('[WS-Redis] Subscriber connected'));

    await subscriber.connect().catch(() => {});
    await subscriber.subscribe(REDIS_CHANNEL);

    subscriber.on('message', (channel, message) => {
      if (channel === REDIS_CHANNEL) {
        try {
          const { scanId, data, tenantId } = JSON.parse(message);
          localBroadcast(scanId, data, tenantId);
        } catch (err) {
          console.error('[WS-Redis] Parse error:', err.message);
        }
      }
    });

    console.log('✓ WebSocket server initialized (Redis Pub/Sub active)');
  } catch (err) {
    console.error('❌ WebSocket Redis setup failed:', err.message);
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const scanId = url.searchParams.get('scanId');
    const tenantId = url.searchParams.get('tenantId') || 'GLOBAL';

    if (scanId) {
      if (!scanClients.has(scanId)) scanClients.set(scanId, new Set());
      scanClients.get(scanId).add(ws);
    }

    if (!tenantClients.has(tenantId)) tenantClients.set(tenantId, new Set());
    tenantClients.get(tenantId).add(ws);

    ws.on('close', () => {
      if (scanId) {
        const set = scanClients.get(scanId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) scanClients.delete(scanId);
        }
      }
      const set = tenantClients.get(tenantId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) tenantClients.delete(tenantId);
      }
    });

    ws.on('error', () => {});
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSecure WebSocket connected' }));
  });
}

function localBroadcast(scanId, data, tenantId = null) {
  const msg = JSON.stringify(data);
  const targetTenant = tenantId || 'GLOBAL';

  // Send to scan-specific listeners
  const sSet = scanClients.get(scanId);
  if (sSet) {
    for (const ws of sSet) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }

  // Send to global tenant listeners
  const tSet = tenantClients.get(targetTenant);
  if (tSet) {
    for (const ws of tSet) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }
}

export function broadcast(scanId, data, tenantId = null) {
  try {
    // Publish to Redis so all API nodes can broadcast to their connected clients
    redis.publish(REDIS_CHANNEL, JSON.stringify({ scanId, data, tenantId }));
  } catch (err) {
    console.error('[WS] Redis publish failed:', err.message);
  }
}
