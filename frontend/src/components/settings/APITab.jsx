import React from 'react';
import { Card, Button } from '../common';
import { Key, Globe, Plus } from 'lucide-react';

const SettingSection = ({ title, description, children }) => (
  <div style={{ marginBottom: '3rem' }}>
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    {children}
  </div>
);

const APITab = ({ user }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Card style={{ padding: '2.5rem' }}>
        <SettingSection title="Personal Access Tokens" description="Tokens you have generated that can be used to access the WebSecure API.">
          <div style={{ 
            padding: '1.5rem', 
            background: 'var(--md-sys-color-surface-container)', 
            borderRadius: '12px', 
            border: '1px solid var(--border)', 
            marginBottom: '1.5rem' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Default Token</label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last used: 2 hours ago</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                value={user?.api_key || "wf_********************************"} 
                readOnly 
                className="form-input" 
                style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.875rem' }} 
              />
              <Button variant="secondary">Copy</Button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.75rem', lineHeight: 1.5 }}>
              Treat your tokens like passwords. Keep them secret and never share them.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <Button variant="primary" icon={Plus}>Generate New Token</Button>
            <Button variant="danger" style={{ background: 'transparent', border: '1px solid rgba(var(--critical-rgb), 0.2)', color: 'var(--critical)' }}>Revoke All</Button>
          </div>
        </SettingSection>

        <SettingSection title="IP Whitelisting" description="Restrict API access to specific IP addresses for enhanced security.">
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1.25rem 1.5rem', 
            background: 'var(--md-sys-color-surface-container)', 
            borderRadius: '12px',
            border: '1px solid var(--border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Globe size={20} className="text-muted" />
              <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>No IP restrictions configured.</p>
            </div>
            <Button variant="secondary" size="small">Add IP Address</Button>
          </div>
        </SettingSection>
      </Card>
    </div>
  );
};

export default APITab;
