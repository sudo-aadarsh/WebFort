import React, { useEffect, useState } from 'react';
import { 
  ShieldAlert, Activity, AlertTriangle, Search, 
  ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../services/api';
import { Card, StatsCard, Badge } from '../components/common';
import { useWebSocket } from '../hooks/useWebSocket';

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
  useWebSocket(); // Initialize websocket for real-time updates

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/scans/stats/overview');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ border: '2px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', width: '3rem', height: '3rem', animation: 'spin 1s linear infinite' }}></div>
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
        <div className="glass-card chart-card">
          <h3 className="chart-title">Top Vulnerability Types</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.vulnerabilityTypes} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="var(--border)" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis dataKey="type" type="category" width={150} stroke="var(--border)" tick={{ fill: 'var(--text-main)', fontSize: 12, fontWeight: 500 }} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--bg-hover)' }}
                  contentStyle={{ backgroundColor: 'var(--bg-base)', border: 'none', borderRadius: '16px', boxShadow: 'var(--shadow-2)', color: 'var(--text-main)' }}
                  itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[0, 16, 16, 0]} barSize={24}>
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
        <div className="glass-card chart-card">
          <h3 className="chart-title">Severity Distribution</h3>
          <div className="chart-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="var(--bg-card)"
                    strokeWidth={4}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-base)', border: 'none', borderRadius: '16px', boxShadow: 'var(--shadow-2)', color: 'var(--text-main)' }}
                    itemStyle={{ color: 'var(--text-main)', fontWeight: 600 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No vulnerabilities found</div>
            )}
            {/* Center Text */}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{stats.totalVulnerabilities}</span>
              <span style={{ fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>Total</span>
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {pieData.map(item => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', marginRight: '0.5rem', backgroundColor: item.color }}></span>
                <span style={{ color: 'var(--text-muted)', flex: 1 }}>{item.name}</span>
                <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="glass-card table-card">
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
              </tr>
            </thead>
            <tbody>
              {stats.recentScans.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No recent scans found</td>
                </tr>
              ) : (
                stats.recentScans.map(scan => (
                  <tr key={scan.id}>
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
