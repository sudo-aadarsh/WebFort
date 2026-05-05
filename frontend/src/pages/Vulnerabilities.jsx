import React, { useState, useEffect } from 'react';
import { ShieldAlert, ExternalLink, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { Card, Badge, Button } from '../components/common';

export const Vulnerabilities = () => {
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState('');
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchScans();
  }, []);

  useEffect(() => {
    if (selectedScan) {
      fetchVulnerabilities(selectedScan);
    } else if (scans.length > 0) {
      // Default to most recent scan
      setSelectedScan(scans[0].id);
    } else {
      setLoading(false);
    }
  }, [selectedScan, scans]);

  const fetchScans = async () => {
    try {
      const response = await api.get('/scans?status=completed');
      setScans(response.data.scans);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVulnerabilities = async (scanId) => {
    setLoading(true);
    try {
      const response = await api.get(`/scans/${scanId}/vulnerabilities`);
      setVulnerabilities(response.data.vulnerabilities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="dashboard-title">Vulnerability Database</h1>
          <p className="dashboard-subtitle">Detailed findings and remediation guides</p>
        </div>
        
        {scans.length > 0 && (
          <div style={{ width: '100%', maxWidth: '256px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Select Scan</label>
            <select 
              className="form-input"
              value={selectedScan}
              onChange={(e) => setSelectedScan(e.target.value)}
            >
              {scans.map(scan => (
                <option key={scan.id} value={scan.id}>
                  {scan.target_url} ({new Date(scan.completed_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div style={{ border: '2px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', width: '2rem', height: '2rem', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : vulnerabilities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <ShieldCheck style={{ color: 'var(--success)' }} size={24} />
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 500, color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Vulnerabilities Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>This scan completed without finding any security issues.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {vulnerabilities.map((vuln) => (
              <div 
                key={vuln.id} 
                style={{
                  border: '1px solid',
                  borderRadius: 'var(--radius)',
                  transition: 'var(--transition)',
                  background: expandedId === vuln.id ? 'var(--bg-hover)' : 'transparent',
                  borderColor: expandedId === vuln.id ? `var(--${vuln.severity})` : 'var(--border)',
                  boxShadow: expandedId === vuln.id ? `0 0 15px rgba(var(--${vuln.severity}-rgb), 0.2)` : 'none'
                }}
              >
                {/* Header (Clickable) */}
                <div 
                  style={{ padding: '0.75rem 1rem', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}
                  onClick={() => setExpandedId(expandedId === vuln.id ? null : vuln.id)}
                >
                  <div style={{ padding: '0.375rem', borderRadius: '0.5rem', background: `rgba(var(--${vuln.severity}-rgb, 255, 255, 255), 0.1)`, color: `var(--${vuln.severity})` }}>
                    <ShieldAlert size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1rem' }}>{vuln.title}</h4>
                      <Badge severity={vuln.severity}>{vuln.severity}</Badge>
                      {vuln.cvss_score > 0 && (
                        <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', background: 'var(--bg-hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-main)' }}>
                          CVSS: {vuln.cvss_score}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span><span style={{ opacity: 0.7 }}>Type:</span> {vuln.type}</span>
                      {vuln.parameter && <span><span style={{ opacity: 0.7 }}>Parameter:</span> <code style={{ color: 'var(--primary)' }}>{vuln.parameter}</code></span>}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedId === vuln.id && (
                  <div className="animate-fade-in" style={{ padding: '0 1rem 1rem 1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                          <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Description</h5>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{vuln.description}</p>
                        </div>
                        
                        {vuln.url && (
                          <div>
                            <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Affected URL</h5>
                            <a href={vuln.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem', wordBreak: 'break-all', textDecoration: 'none' }}>
                              {vuln.url} <ExternalLink size={12} />
                            </a>
                          </div>
                        )}

                        {vuln.evidence && (
                          <div>
                            <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>Evidence</h5>
                            <div style={{ background: 'var(--bg-hover)', borderRadius: '0.375rem', padding: '0.75rem', border: '1px solid var(--border)' }}>
                              <code style={{ fontSize: '0.75rem', color: 'var(--info)', wordBreak: 'break-all' }}>{vuln.evidence}</code>
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '0.5rem', padding: '1rem' }}>
                          <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={14} /> Remediation
                          </h5>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{vuln.remediation}</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          {vuln.cwe_id && (
                            <div style={{ background: 'var(--bg-hover)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>CWE Reference</span>
                              <a href={`https://cwe.mitre.org/data/definitions/${vuln.cwe_id.replace('CWE-','')}.html`} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: 'var(--primary)', textDecoration: 'none' }}>
                                {vuln.cwe_id}
                              </a>
                            </div>
                          )}
                          {vuln.owasp_category && (
                            <div style={{ background: 'var(--bg-hover)', borderRadius: '0.5rem', padding: '0.75rem' }}>
                              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>OWASP Category</span>
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>{vuln.owasp_category}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
