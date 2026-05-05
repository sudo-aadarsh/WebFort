import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, FileSpreadsheet, FileJson } from 'lucide-react';
import api from '../services/api';
import { Card, Button, Badge } from '../components/common';

export const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  const filterScanId = location.state?.scanId;
  const displayedReports = filterScanId 
    ? reports.filter(report => report.id === filterScanId)
    : reports;

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports');
      setReports(response.data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (scanId, format) => {
    window.open(`http://localhost:3001/api/reports/${scanId}/${format}?token=${localStorage.getItem('webfort_token')}`, '_blank');
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="dashboard-title">Scan Reports</h1>
          <p className="dashboard-subtitle">Download comprehensive vulnerability reports in multiple formats</p>
        </div>
        {filterScanId && (
          <Button variant="secondary" onClick={() => navigate('/reports', { replace: true })} icon={ArrowLeft}>
            View All Reports
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div style={{ border: '2px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', width: '2rem', height: '2rem', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : displayedReports.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            {filterScanId ? 'No report found for this specific scan.' : 'No completed scans available for reporting'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {displayedReports.map((report) => (
              <div key={report.id} className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <h3 style={{ fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={report.target_url}>
                      {report.target_url.replace(/^https?:\/\//, '')}
                    </h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(report.completed_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge severity={report.critical_count > 0 ? 'critical' : report.high_count > 0 ? 'high' : report.medium_count > 0 ? 'medium' : 'success'}>
                    {report.total_vulnerabilities} issues
                  </Badge>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem', marginBottom: '1.5rem', marginTop: '0.5rem' }}>
                  <div style={{ textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--critical)', fontWeight: 700 }}>{report.critical_count}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(249, 115, 22, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--high)', fontWeight: 700 }}>{report.high_count}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(234, 179, 8, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--medium)', fontWeight: 700 }}>{report.medium_count}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--low)', fontWeight: 700 }}>{report.low_count}</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'rgba(139, 92, 246, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--info)', fontWeight: 700 }}>{report.info_count}</div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <Button variant="secondary" style={{ padding: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }} onClick={() => downloadReport(report.id, 'pdf')}>
                    <FileText size={16} style={{ color: 'var(--primary)' }} />
                    <span>PDF</span>
                  </Button>
                  <Button variant="secondary" style={{ padding: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }} onClick={() => downloadReport(report.id, 'csv')}>
                    <FileSpreadsheet size={16} style={{ color: 'var(--success)' }} />
                    <span>CSV</span>
                  </Button>
                  <Button variant="secondary" style={{ padding: '0.5rem', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }} onClick={() => downloadReport(report.id, 'sarif')}>
                    <FileJson size={16} style={{ color: 'var(--medium)' }} />
                    <span>SARIF</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
