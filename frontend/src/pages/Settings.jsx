import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Card, Input, Button } from '../components/common';
import { User, Lock, Key, Bell, Shield, Save } from 'lucide-react';

export const Settings = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'profile');
  
  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);
  
  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Settings</h1>
        <p className="dashboard-subtitle">Manage your account preferences and configurations</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sidebar Navigation */}
        <Card className="settings-nav" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveTab('profile')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'profile' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: activeTab === 'profile' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
            >
              <User size={18} />
              <span style={{ fontWeight: 500 }}>Profile</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'security' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: activeTab === 'security' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
            >
              <Lock size={18} />
              <span style={{ fontWeight: 500 }}>Security</span>
            </button>
            <button 
              onClick={() => setActiveTab('api')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'api' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: activeTab === 'api' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
            >
              <Key size={18} />
              <span style={{ fontWeight: 500 }}>API Keys</span>
            </button>
            <button 
              onClick={() => setActiveTab('notifications')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', background: activeTab === 'notifications' ? 'var(--bg-hover)' : 'transparent', border: 'none', color: activeTab === 'notifications' ? 'var(--text-main)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
            >
              <Bell size={18} />
              <span style={{ fontWeight: 500 }}>Notifications</span>
            </button>
          </div>
        </Card>

        {/* Content Area */}
        <div className="settings-content">
          {activeTab === 'profile' && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', margin: 0, fontWeight: 600 }}>{user?.name}</h2>
                  <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{user?.role === 'admin' ? 'Administrator' : 'Standard User'}</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <Input label="Full Name" defaultValue={user?.name} placeholder="Your full name" />
                <Input label="Email Address" defaultValue={user?.email} placeholder="your.email@example.com" type="email" />
                <Input label="Company" defaultValue={user?.company} placeholder="Company Name" />
                <Input label="Role" defaultValue={user?.role} disabled />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <Button icon={Save}>Save Changes</Button>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={20} className="text-primary" />
                Password & Security
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Update your password to keep your account secure.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
                <Input label="Current Password" type="password" placeholder="Enter current password" />
                <Input label="New Password" type="password" placeholder="Enter new password" />
                <Input label="Confirm New Password" type="password" placeholder="Confirm new password" />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2rem' }}>
                <Button variant="primary">Update Password</Button>
              </div>
            </Card>
          )}

          {activeTab === 'api' && (
            <Card>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} className="text-primary" />
                API Configuration
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Manage your API keys for programmatic access to WebFort.</p>
              
              <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                <label className="form-label">Personal Access Token</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <input type="text" value={user?.api_key || "wf_********************************"} readOnly className="form-input" style={{ fontFamily: 'monospace', opacity: 0.8 }} />
                  <Button variant="secondary">Copy</Button>
                </div>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', fontSize: '0.75rem' }}>Keep this token secret. It carries the same privileges as your user account.</p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <Button variant="danger" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Revoke Token & Generate New</Button>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bell size={20} className="text-primary" />
                Notification Preferences
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.875rem' }}>Choose how you want to be notified about scans and vulnerabilities.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { id: 'n1', title: 'Scan Completions', desc: 'Notify me when a scan finishes', checked: true },
                  { id: 'n2', title: 'Critical Vulnerabilities', desc: 'Alert me immediately when critical issues are found', checked: true },
                  { id: 'n3', title: 'Weekly Reports', desc: 'Send me a weekly summary report', checked: false },
                  { id: 'n4', title: 'System Updates', desc: 'News about WebFort features and maintenance', checked: true }
                ].map((item) => (
                  <label key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <input type="checkbox" defaultChecked={item.checked} style={{ marginTop: '0.25rem', width: '1.125rem', height: '1.125rem', accentColor: 'var(--primary)' }} />
                    <div>
                      <div style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.title}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{item.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <Button icon={Save}>Save Preferences</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
