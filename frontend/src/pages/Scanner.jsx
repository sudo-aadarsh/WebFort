import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Search, Shield, AlertTriangle, ShieldCheck, Server } from 'lucide-react';
import api from '../services/api';
import { useScanStore } from '../store';
import { Card, Button, Input, Badge } from '../components/common';

export const Scanner = () => {
  const [targetUrl, setTargetUrl] = useState('');
  const [scanType, setScanType] = useState('full');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const { scans, setScans, activeScans, setActiveScans, addScan } = useScanStore();

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const response = await api.get('/scans');
      const allScans = response.data.scans;
      setScans(allScans);
      
      // Update active scans in store (include running and queued)
      const active = allScans.filter(s => ['running', 'queued'].includes(s.status));
      setActiveScans(active);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch scan history');
    }
  };

  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!targetUrl) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/scans', { targetUrl, scanType, scanDepth: 3 });
      const newScan = response.data.scan;
      setTargetUrl('');
      addScan(newScan);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start scan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScan = async (id) => {
    try {
      await api.delete(`/scans/${id}`);
      fetchScans();
    } catch (err) {
      console.error(err);
    }
  };

  const scanTypes = [
    { id: 'full', title: 'Full Scan', desc: 'Comprehensive scan including all vulnerability modules and deep crawling', icon: Shield },
    { id: 'quick', title: 'Quick Scan', desc: 'Fast scan focusing on high-severity issues (XSS, SQLi) and missing headers', icon: Play },
    { id: 'api', title: 'API Scan', desc: 'Targeted scan for API endpoints focusing on IDOR, Injection, and Auth bypass', icon: Server },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Vulnerability Scanner</h1>
        <p className="dashboard-subtitle">Initiate and monitor security scans for your applications</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">New Scan</h3>
          
          <form onSubmit={handleStartScan} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {error && (
              <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--critical)', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}>
                {error}
              </div>
            )}
            
            <div>
              <label className="form-label">Target URL</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
                <div style={{ flex: 1 }}>
                  <Input 
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                    required
                  />
                </div>
                <Button type="submit" isLoading={loading} icon={Search} style={{ padding: '0 2rem' }}>
                  Scan Now
                </Button>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ marginBottom: '1rem' }}>Scan Profile</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {scanTypes.map(type => (
                  <div 
                    key={type.id}
                    onClick={() => setScanType(type.id)}
                    style={{
                      padding: '1.25rem',
                      borderRadius: 'var(--radius)',
                      border: '1px solid',
                      borderColor: scanType === type.id ? 'var(--primary)' : 'var(--border)',
                      background: scanType === type.id ? 'var(--md-sys-color-primary-container)' : 'var(--bg-card)',
                      boxShadow: scanType === type.id ? 'var(--shadow-2)' : 'none',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      color: scanType === type.id ? 'var(--md-sys-color-on-primary-container)' : 'inherit'
                    }}
                  >
                    <type.icon style={{ marginBottom: '0.75rem', color: scanType === type.id ? 'var(--md-sys-color-on-primary-container)' : 'var(--text-muted)' }} size={24} />
                    <h4 style={{ fontWeight: 600, color: 'inherit', marginBottom: '0.25rem' }}>{type.title}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'inherit', opacity: 0.8, lineHeight: 1.5 }}>{type.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </Card>

        <Card>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Active Scans
            <Badge severity="info">{activeScans.length}</Badge>
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {activeScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ShieldCheck size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No active scans</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Start a scan to see progress here</p>
              </div>
            ) : (
              activeScans.map(scan => (
                <div key={scan.id} style={{ padding: '1rem', borderRadius: 'var(--radius)', background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '1rem' }}>{scan.target_url}</div>
                    <button onClick={() => handleCancelScan(scan.id)} style={{ fontSize: '0.75rem', color: 'var(--critical)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{scan.status}</span>
                    <span>{scan.progress || 0}%</span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
                    <div 
                      style={{ background: 'var(--primary)', height: '100%', borderRadius: '99px', transition: 'width 0.4s ease-out', width: `${scan.progress || 0}%` }}
                    ></div>
                  </div>
                  {scan.message && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{scan.message}</div>}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="table-card">
        <h3 className="chart-title">Scan History</h3>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Target URL</th>
                <th>Type</th>
                <th>Status</th>
                <th>Progress</th>
                <th>Vulnerabilities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No scan history available</td>
                </tr>
              ) : (
                scans.map(scan => (
                  <tr 
                    key={scan.id}
                    onClick={() => scan.status === 'completed' && navigate(`/reports/${scan.id}`)}
                    style={{ 
                      cursor: scan.status === 'completed' ? 'pointer' : 'default',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{scan.target_url}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{scan.scan_type}</td>
                    <td>
                      <Badge severity={
                        scan.status === 'completed' ? 'success' : 
                        scan.status === 'running' ? 'info' : 
                        scan.status === 'failed' ? 'critical' : 'medium'
                      }>
                        {scan.status}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--text-muted)', width: '120px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--primary)', width: `${scan.progress || 0}%` }}></div>
                        </div>
                        <span style={{ fontSize: '0.75rem' }}>{scan.progress || 0}%</span>
                      </div>
                    </td>
                    <td>
                      {scan.status === 'completed' ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {scan.critical_count > 0 && <Badge severity="critical">{scan.critical_count}</Badge>}
                          {scan.high_count > 0 && <Badge severity="high">{scan.high_count}</Badge>}
                          {scan.medium_count > 0 && <Badge severity="medium">{scan.medium_count}</Badge>}
                          {scan.total_vulnerabilities === 0 && <Badge severity="success">Safe</Badge>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {scan.status === 'completed' && (
                          <Button 
                            variant="secondary" 
                            onClick={(e) => { e.stopPropagation(); navigate(`/reports/${scan.id}`); }} 
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            View Report
                          </Button>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCancelScan(scan.id); }} 
                          style={{ color: 'var(--critical)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
