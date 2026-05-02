import React, { useEffect, useRef } from 'react';
import { useScanStore } from '../store';

export const useWebSocket = () => {
  const ws = useRef(null);
  const { updateScanProgress, removeActiveScan } = useScanStore();

  useEffect(() => {
    // Only connect if there are active scans? For now, just connect globally
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const connect = (scanId = null) => {
    const url = scanId ? `ws://localhost:3001/ws?scanId=${scanId}` : 'ws://localhost:3001/ws';
    ws.current = new WebSocket(url);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'scan.progress':
          updateScanProgress(data.scanId, data.progress, data.message);
          break;
        case 'scan.completed':
        case 'scan.error':
          // Optionally refetch stats here or remove from active
          setTimeout(() => removeActiveScan(data.scanId), 2000);
          break;
        default:
          break;
      }
    };

    ws.current.onclose = () => {
      // Reconnect logic
      setTimeout(connect, 5000);
    };
  };

  return { ws: ws.current, connect };
};
