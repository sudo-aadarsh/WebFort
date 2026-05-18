import React, { useState } from 'react';
import { Card, Button } from '../common';
import { Save, Bell, Mail, ShieldAlert, CheckCircle } from 'lucide-react';

const SettingSection = ({ title, description, children }) => (
  <div style={{ marginBottom: '3rem' }}>
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    {children}
  </div>
);

const NotificationRow = ({ title, description, icon: Icon, checked, onChange }) => (
  <div 
    onClick={onChange}
    style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '1.25rem 1.5rem', 
      background: 'var(--bg-card)', 
      borderRadius: '12px', 
      border: '1px solid var(--border)',
      cursor: 'pointer',
      transition: 'var(--transition)'
    }} className="hover-lift"
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '10px', 
        background: 'var(--md-sys-color-secondary-container)', 
        color: 'var(--md-sys-color-on-secondary-container)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={20} />
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.125rem' }}>{title}</p>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</p>
      </div>
    </div>
    <div style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
      <div style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, bottom: 0, 
        backgroundColor: checked ? 'var(--primary)' : '#ccc', 
        transition: '0.4s', 
        borderRadius: '24px' 
      }}>
        <div style={{ 
          position: 'absolute', 
          height: '18px', width: '18px', 
          left: checked ? '22px' : '4px', 
          bottom: '3px', 
          backgroundColor: 'white', 
          transition: '0.4s', 
          borderRadius: '50%' 
        }}></div>
      </div>
    </div>
  </div>
);

const NotificationsTab = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [prefs, setPrefs] = useState({
    scanCompletions: true,
    criticalVulns: true,
    weeklySummary: false,
    systemAnnouncements: true
  });

  const togglePref = (key) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
    if (status) setStatus(null);
  };

  const handleSave = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 800));
    setLoading(false);
    setStatus('success');
    setTimeout(() => setStatus(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Card style={{ padding: '2.5rem' }}>
        <SettingSection title="Scan Notifications" description="Configure how you receive updates about your security scans.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <NotificationRow 
              title="Scan Completions" 
              description="Receive a notification when a scan finishes successfully." 
              icon={Bell} 
              checked={prefs.scanCompletions} 
              onChange={() => togglePref('scanCompletions')}
            />
            <NotificationRow 
              title="Critical Vulnerabilities" 
              description="Get alerted immediately when high-risk issues are detected." 
              icon={ShieldAlert} 
              checked={prefs.criticalVulns} 
              onChange={() => togglePref('criticalVulns')}
            />
          </div>
        </SettingSection>

        <SettingSection title="Reports & Updates" description="Stay informed with scheduled reports and system news.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <NotificationRow 
              title="Weekly Security Summary" 
              description="A consolidated report of all activities and findings for the week." 
              icon={Mail} 
              checked={prefs.weeklySummary} 
              onChange={() => togglePref('weeklySummary')}
            />
            <NotificationRow 
              title="System Announcements" 
              description="News about new features, maintenance, and platform updates." 
              icon={Bell} 
              checked={prefs.systemAnnouncements} 
              onChange={() => togglePref('systemAnnouncements')}
            />
          </div>
        </SettingSection>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          {status === 'success' && (
            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <CheckCircle size={16} /> Preferences saved!
            </div>
          )}
          <Button 
            icon={Save} 
            variant="primary" 
            onClick={handleSave}
            isLoading={loading}
          >
            Save Preferences
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default NotificationsTab;
