import React, { useEffect, useRef } from 'react';
import { useScanStore, useAuthStore, useNotificationStore } from '../store';
import { WS_BASE_URL } from '../services/api';

export const useWebSocket = () => {
  const ws = useRef(null);
  const { updateScanProgress, removeActiveScan } = useScanStore();
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user]);

  const connect = (scanId = null) => {
    let url = `${WS_BASE_URL}/ws`;
    const params = [];
    
    if (scanId) params.push(`scanId=${scanId}`);
    if (user?.tenant_id) params.push(`tenantId=${user.tenant_id}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    console.log(`[WS] Connecting to ${url}...`);
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('[WS] Connected successfully');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[WS] Received:', data);
      
      switch (data.type) {
        case 'user.profile_updated':
          addNotification({
            type: 'success',
            title: 'Profile Updated',
            message: 'Your profile information has been successfully updated.'
          });
          break;
        case 'user.account_deleted':
          addNotification({
            type: 'info',
            title: 'Account Deleted',
            message: 'An account has been removed from the platform.'
          });
          break;
        case 'scan.created':
          addNotification({
            type: 'info',
            title: 'Scan Queued',
            message: `New scan for ${data.scan.target_url} has been queued.`
          });
          break;
        case 'scan.deleted':
          addNotification({
            type: 'info',
            title: 'Scan Deleted',
            message: 'A scan record has been permanently removed.'
          });
          break;
        case 'scan.cancelled':
          addNotification({
            type: 'warning',
            title: 'Scan Cancelled',
            message: 'The active scan has been stopped.'
          });
          break;
        case 'scan.started':
          addNotification({
            type: 'info',
            title: 'Scan Started',
            message: `A scan has started for ${data.scanId.slice(0, 8)}...`
          });
          break;
        case 'scan.progress':
          updateScanProgress(data.scanId, data.progress, data.message);
          break;
        case 'scan.completed':
          addNotification({
            type: 'success',
            title: 'Scan Completed',
            message: `Found ${data.results.total} issues (${data.results.critical} critical).`
          });
          console.log(`[WS] Scan finished:`, data.scanId);
          setTimeout(() => removeActiveScan(data.scanId), 3000);
          break;
        case 'scan.error':
          addNotification({
            type: 'error',
            title: 'Scan Failed',
            message: data.error || 'An unexpected error occurred during the scan.'
          });
          console.log(`[WS] Scan failed:`, data.scanId);
          setTimeout(() => removeActiveScan(data.scanId), 3000);
          break;
        default:
          break;
      }
    };

    ws.current.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    ws.current.onclose = (e) => {
      console.log('[WS] Closed:', e.code, e.reason);
      // Reconnect logic
      setTimeout(() => {
        if (user) connect();
      }, 5000);
    };
  };

  return { ws: ws.current, connect };
};
