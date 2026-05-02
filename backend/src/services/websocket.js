const clients = new Map(); // scanId -> Set of ws clients

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const scanId = url.searchParams.get('scanId');

    if (scanId) {
      if (!clients.has(scanId)) clients.set(scanId, new Set());
      clients.get(scanId).add(ws);

      ws.on('close', () => {
        const set = clients.get(scanId);
        if (set) {
          set.delete(ws);
          if (set.size === 0) clients.delete(scanId);
        }
      });
    }

    ws.on('error', () => {});
    ws.send(JSON.stringify({ type: 'connected', message: 'WebFort WebSocket connected' }));
  });

  console.log('✓ WebSocket server initialized');
}

export function broadcast(scanId, data) {
  const set = clients.get(scanId);
  if (!set) return;
  const msg = JSON.stringify(data);
  for (const ws of set) {
    if (ws.readyState === 1) ws.send(msg);
  }
}
