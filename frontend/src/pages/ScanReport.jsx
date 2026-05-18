import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Shield, Target, Calendar, Layers, 
  AlertTriangle, CheckCircle, ExternalLink,
  ChevronDown, ChevronUp, FileText, Download
} from 'lucide-react';
import api, { API_BASE_URL } from '../services/api';
import { Card, Badge, Button } from '../components/common';

export const ScanReport = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const getHostname = (url) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/scans/${id}`);
      setScan(response.data.scan);
      setVulnerabilities(response.data.vulnerabilities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (format) => {
    window.open(`${API_BASE_URL}/api/reports/${id}/${format}?token=${localStorage.getItem('websecure_token')}`, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ border: '3px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', width: '3rem', height: '3rem', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (!scan) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2 style={{ color: 'var(--text-main)' }}>Report Not Found</h2>
        <Button variant="secondary" onClick={() => navigate('/reports')} style={{ marginTop: '1rem' }} icon={ArrowLeft}>
          Back to Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button 
            onClick={() => navigate('/reports')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1rem', padding: 0 }}
          >
            <ArrowLeft size={16} /> Back to Reports
          </button>
          <h1 className="dashboard-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Shield style={{ color: 'var(--primary)' }} />
            Security Audit Report
          </h1>
          <p className="dashboard-subtitle">{scan.target_url}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => downloadReport('pdf')} icon={Download}>PDF</Button>
          <Button variant="secondary" onClick={() => downloadReport('csv')} icon={FileText}>CSV</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <Card style={{ gap: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scan Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><Target size={14} /> Target</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem' }}>{getHostname(scan.target_url)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><Calendar size={14} /> Completed</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem' }}>{new Date(scan.completed_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}><Layers size={14} /> Pages Scanned</span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: '0.875rem' }}>{scan.pages_scanned}</span>
            </div>
          </div>
        </Card>

        <Card style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--critical)' }} />
          <h3 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vulnerability Overview</h3>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{scan.total_vulnerabilities}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Total Issues Discovered</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--critical)', fontWeight: 800, fontSize: '1.25rem' }}>{scan.critical_count}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 700 }}>CRIT</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--high)', fontWeight: 800, fontSize: '1.25rem' }}>{scan.high_count}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 700 }}>HIGH</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--medium)', fontWeight: 800, fontSize: '1.25rem' }}>{scan.medium_count}</div>
                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 700 }}>MED</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Findings */}
      <div>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 600 }}>Detailed Findings</h2>
        
        {vulnerabilities.length === 0 ? (
          <Card style={{ textAlign: 'center', padding: '3rem' }}>
            <CheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '1rem', opacity: 0.8 }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No Security Issues Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>This application appears to be following security best practices for the modules scanned.</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {vulnerabilities.map(vuln => (
              <div 
                key={vuln.id}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden'
                }}
              >
                <div 
                  style={{ 
                    padding: '1rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: expandedId === vuln.id ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}
                  onClick={() => setExpandedId(expandedId === vuln.id ? null : vuln.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: `var(--${vuln.severity})`,
                      boxShadow: `0 0 10px var(--${vuln.severity})`
                    }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h4 style={{ fontWeight: 600, color: 'var(--text-main)' }}>{vuln.title}</h4>
                        <Badge severity={vuln.severity}>{vuln.severity}</Badge>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{vuln.url}</div>
                    </div>
                  </div>
                  {expandedId === vuln.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>

                {expandedId === vuln.id && (
                  <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div>
                      <section style={{ marginBottom: '1.5rem' }}>
                        <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>Description</h5>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{vuln.description}</p>
                      </section>

                      {vuln.evidence && (
                        <section>
                          <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 700 }}>Evidence</h5>
                          <pre style={{ 
                            padding: '1rem', 
                            background: '#000', 
                            borderRadius: 'var(--radius)', 
                            color: 'var(--info)', 
                            fontSize: '0.75rem',
                            overflowX: 'auto',
                            border: '1px solid var(--border)'
                          }}>
                            {vuln.evidence}
                          </pre>
                        </section>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <section style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius)' }}>
                        <h5 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--success)', marginBottom: '0.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <CheckCircle size={14} /> Remediation Guide
                        </h5>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', lineHeight: 1.6 }}>{vuln.remediation}</p>
                      </section>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius)' }}>
                          <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>CWE</span>
                          <a href={`https://cwe.mitre.org/data/definitions/${vuln.cwe_id?.replace('CWE-','')}.html`} target="_blank" rel="noreferrer" style={{ fontSize: '0.875rem', color: 'var(--primary)', textDecoration: 'none' }}>
                            {vuln.cwe_id || 'N/A'} <ExternalLink size={10} />
                          </a>
                        </div>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius)' }}>
                          <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>CVSS Score</span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 600 }}>{vuln.cvss_score || '0.0'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
