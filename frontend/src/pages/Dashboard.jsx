import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Activity, AlertTriangle, Search, 
  ArrowUpRight, ArrowDownRight, Clock, Eye
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import { Card, StatsCard, Badge } from '../components/common';
import { useScanStore } from '../store';

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#a855f7'
};

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/scans/stats/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Sync with real-time updates from WebSocket (via ScanStore)
  const { activeScans } = useScanStore();
  
  useEffect(() => {
    if (stats) {
      // If an active scan matches a recent scan, update its progress in the local dashboard state
      const updatedRecentScans = stats.recentScans.map(recent => {
        const active = activeScans.find(a => a.id === recent.id);
        return active ? { ...recent, progress: active.progress, status: active.status } : recent;
      });
      
      if (JSON.stringify(updatedRecentScans) !== JSON.stringify(stats.recentScans)) {
        setStats({ ...stats, recentScans: updatedRecentScans });
      }
    }
  }, [activeScans, stats]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ border: '2px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', width: '3rem', height: '3rem', animation: 'spin 1s linear infinite' }}></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
        <div style={{ color: 'var(--critical)', fontWeight: 600 }}>{error || 'No stats data available'}</div>
        <button className="btn btn-secondary" onClick={fetchStats}>Retry</button>
      </div>
    );
  }

  const pieData = stats.severityDistribution.map(item => ({
    name: item.severity.charAt(0).toUpperCase() + item.severity.slice(1),
    value: item.count,
    color: SEVERITY_COLORS[item.severity]
  }));

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard Overview</h1>
        <p className="dashboard-subtitle">Real-time security posture of your applications</p>
      </div>

      {/* Top Stats Row */}
      <div className="stats-grid">
        <StatsCard 
          title="Total Scans" 
          value={stats.totalScans} 
          icon={Search} 
          trend={12} 
          colorClass="text-primary"
        />
        <StatsCard 
          title="Active Scans" 
          value={stats.activeScans} 
          icon={Activity} 
          colorClass="text-success"
        />
        <StatsCard 
          title="Total Vulnerabilities" 
          value={stats.totalVulnerabilities} 
          icon={AlertTriangle} 
          trend={-5} 
          colorClass="text-medium"
        />
        <StatsCard 
          title="Critical Issues" 
          value={stats.criticalVulnerabilities} 
          icon={ShieldAlert} 
          trend={2} 
          colorClass="text-critical"
        />
      </div>

      <div className="charts-grid">
        {/* Main Chart */}
        <div className="card chart-card animate-fade-in" style={{ padding: '1.25rem' }}>
          <h3 className="chart-title" style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Top Vulnerability Types</h3>
          <div className="chart-container" style={{ minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.vulnerabilityTypes} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis dataKey="type" type="category" width={120} stroke="var(--border)" tick={{ fill: 'var(--text-main)', fontSize: 11, fontWeight: 500 }} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-base)', border: 'none', borderRadius: '12px', boxShadow: 'var(--shadow-2)', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[0, 16, 16, 0]} barSize={16}>
                  {stats.vulnerabilityTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--accent)'} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--primary)" />
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="card chart-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem' }}>
          <h3 className="chart-title" style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Severity Distribution</h3>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.75rem' }}>
            {/* Chart Area */}
            <div className="chart-container" style={{ minHeight: '160px', position: 'relative' }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius="70%"
                      outerRadius="95%"
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-base)', border: 'none', borderRadius: '12px', boxShadow: 'var(--shadow-3)', color: 'var(--text-main)' }}
                      itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No vulnerabilities found
                </div>
              )}
              {/* Center Text Overlay */}
              {pieData.length > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  textAlign: 'center', 
                  pointerEvents: 'none' 
                }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>{stats.totalVulnerabilities}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.125rem' }}>Total</div>
                </div>
              )}
            </div>
            
            {/* Integrated Legend & Metrics */}
            <div style={{ 
              padding: '0.75rem', 
              background: 'var(--bg-hover)', 
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem 1rem' }}>
                {pieData.map(item => {
                  const percentage = ((item.value / stats.totalVulnerabilities) * 100).toFixed(0);
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: item.color }}></div>
                      <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>{item.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6 }}>{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="card table-card animate-fade-in">
        <div className="table-header">
          <h3 className="chart-title" style={{ marginBottom: 0 }}>Recent Scans</h3>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Target URL</th>
                <th>Status</th>
                <th>Type</th>
                <th>Vulnerabilities</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentScans.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No recent scans found</td>
                </tr>
              ) : (
                stats.recentScans.map(scan => (
                  <tr 
                    key={scan.id}
                    onClick={() => scan.status === 'completed' && navigate(`/reports/${scan.id}`)}
                    style={{ 
                      cursor: scan.status === 'completed' ? 'pointer' : 'default',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{scan.target_url}</td>
                    <td>
                      <Badge severity={
                        scan.status === 'completed' ? 'success' : 
                        scan.status === 'running' ? 'info' : 
                        scan.status === 'failed' ? 'critical' : 'medium'
                      }>
                        {scan.status}
                      </Badge>
                    </td>
                    <td style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{scan.scan_type}</td>
                    <td>
                      {scan.status === 'completed' ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {scan.critical_count > 0 && <Badge severity="critical">{scan.critical_count}</Badge>}
                          {scan.high_count > 0 && <Badge severity="high">{scan.high_count}</Badge>}
                          {scan.medium_count > 0 && <Badge severity="medium">{scan.medium_count}</Badge>}
                          {scan.total_vulnerabilities === 0 && <Badge severity="success">0</Badge>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Clock size={14} />
                      {new Date(scan.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {scan.status === 'completed' && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); navigate(`/reports/${scan.id}`); }}
                          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}
                        >
                          <Eye size={14} /> View
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
