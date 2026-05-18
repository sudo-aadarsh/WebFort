import React, { useState } from 'react';
import { Card, Button, Input } from '../common';
import { Zap, Terminal, Plus, X, CheckCircle } from 'lucide-react';

const SettingSection = ({ title, description, children }) => (
  <div style={{ marginBottom: '3rem' }}>
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    {children}
  </div>
);

const IntegrationCard = ({ title, description, icon: Icon, connected: initialConnected = false }) => {
  const [connected, setConnected] = useState(initialConnected);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const handleAction = async () => {
    if (connected) {
      setShowConfig(true);
    } else {
      setLoading(true);
      await new Promise(r => setTimeout(r, 1200));
      setConnected(true);
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '1.5rem', 
      background: 'var(--bg-card)', 
      borderRadius: '16px', 
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      transition: 'var(--transition)',
      position: 'relative'
    }} className="hover-lift">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '12px', 
          background: 'var(--md-sys-color-surface-container-high)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--text-main)'
        }}>
          <Icon size={24} />
        </div>
        {connected ? (
          <span style={{ 
            fontSize: '0.7rem', 
            fontWeight: 700, 
            padding: '0.25rem 0.75rem', 
            background: 'rgba(var(--success-rgb), 0.1)', 
            color: 'var(--success)', 
            borderRadius: '20px',
            textTransform: 'uppercase'
          }}>Connected</span>
        ) : (
          <span style={{ 
            fontSize: '0.7rem', 
            fontWeight: 700, 
            padding: '0.25rem 0.75rem', 
            background: 'var(--md-sys-color-surface-container)', 
            color: 'var(--text-muted)', 
            borderRadius: '20px',
            textTransform: 'uppercase'
          }}>Not Connected</span>
        )}
      </div>
      <div>
        <h4 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>{title}</h4>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</p>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <Button 
          variant={connected ? "secondary" : "primary"} 
          style={{ width: '100%' }}
          onClick={handleAction}
          isLoading={loading}
        >
          {connected ? 'Configure' : 'Connect'}
        </Button>
      </div>

      {showConfig && (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--bg-card)', zIndex: 10, borderRadius: '16px',
          padding: '1.5rem', display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>Configure {title}</h4>
            <button onClick={() => setShowConfig(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16}/></button>
          </div>
          <Input label="Webhook URL" placeholder="https://api.github.com/..." defaultValue="https://hooks.websecure.io/gh/abc-123" />
          <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
            <Button variant="primary" size="small" style={{ flex: 1 }} onClick={() => setShowConfig(false)}>Save</Button>
            <Button variant="danger" size="small" onClick={() => { setConnected(false); setShowConfig(false); }}>Disconnect</Button>
          </div>
        </div>
      )}
    </div>
  );
};

const IntegrationsTab = () => {
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState(null);

  const handleAddWebhook = async () => {
    setWebhookStatus('loading');
    await new Promise(r => setTimeout(r, 1000));
    setWebhookStatus('success');
    setTimeout(() => {
      setWebhookStatus(null);
      setShowAddWebhook(false);
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Card style={{ padding: '2.5rem' }}>
        <SettingSection title="CI/CD Integrations" description="Automate security scans directly within your development pipeline.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <IntegrationCard 
              title="GitHub Actions" 
              description="Trigger scans on every pull request or push to your repository." 
              icon={Zap} 
              connected={true} 
            />
            <IntegrationCard 
              title="Jenkins" 
              description="Integrate security scanning into your build process using our custom plugin." 
              icon={Terminal} 
              connected={false} 
            />
          </div>
        </SettingSection>

        <SettingSection title="Webhooks" description="Get notified about scan events and vulnerabilities in real-time.">
          {!showAddWebhook ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1.5rem', 
              background: 'var(--md-sys-color-surface-container)', 
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Custom Webhooks</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Send JSON payloads to any URL on scan events.</p>
              </div>
              <Button variant="secondary" icon={Plus} onClick={() => setShowAddWebhook(true)}>Add Webhook</Button>
            </div>
          ) : (
            <div style={{ 
              padding: '1.5rem', 
              background: 'var(--md-sys-color-surface-container)', 
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Create New Webhook</h4>
                <button onClick={() => setShowAddWebhook(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18}/></button>
              </div>
              <div style={{ display: 'grid', gap: '1.5rem', maxWidth: '500px' }}>
                <Input label="Webhook Name" placeholder="e.g. Production Alerts" />
                <Input label="Payload URL" placeholder="https://your-domain.com/webhook" />
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Button variant="primary" onClick={handleAddWebhook} isLoading={webhookStatus === 'loading'}>Create Webhook</Button>
                {webhookStatus === 'success' && (
                  <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle size={16} /> Webhook created successfully!
                  </div>
                )}
              </div>
            </div>
          )}
        </SettingSection>
      </Card>
      
      <Card style={{ padding: '2rem', textAlign: 'center', border: '1px dashed var(--border)', background: 'transparent' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Don't see the integration you need? We're constantly adding new ones.
        </p>
        <Button variant="outline">Suggest an Integration</Button>
      </Card>
    </div>
  );
};

export default IntegrationsTab;
