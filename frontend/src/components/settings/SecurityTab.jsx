import React, { useState } from 'react';
import { Card, Input, Button, Badge } from '../common';
import { Shield, Smartphone, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store';

const SettingSection = ({ title, description, children }) => (
  <div style={{ marginBottom: '3rem' }}>
    <div style={{ marginBottom: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{title}</h3>
      {description && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{description}</p>}
    </div>
    {children}
  </div>
);

const SecurityTab = () => {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // MFA State
  const [mfaStep, setMfaStep] = useState('initial'); // 'initial' | 'setup' | 'verify'
  const [mfaData, setMfaData] = useState(null);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState(null);

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      alert("New passwords don't match!");
      return;
    }
    
    setLoading(true);
    setStatus(null);
    try {
      await api.patch('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      setStatus('success');
      setPasswords({ current: '', new: '', confirm: '' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error('Password change failed:', err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const startMfaSetup = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      const { data } = await api.post('/auth/mfa/setup');
      setMfaData(data);
      setMfaStep('setup');
    } catch (err) {
      setMfaError('Failed to start MFA setup. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const verifyMfa = async () => {
    setMfaLoading(true);
    setMfaError(null);
    try {
      await api.post('/auth/mfa/verify', { token: mfaToken });
      setUser({ ...user, mfa_enabled: true });
      setMfaStep('initial');
      alert('Two-Factor Authentication enabled successfully!');
    } catch (err) {
      setMfaError('Invalid verification code. Please try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Card style={{ padding: '2.5rem' }}>
        <SettingSection title="Change Password" description="Ensure your account is using a long, random password to stay secure.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>
            <Input 
              label="Current Password" 
              type="password" 
              placeholder="Enter current password" 
              value={passwords.current}
              onChange={(e) => setPasswords({...passwords, current: e.target.value})}
            />
            <Input 
              label="New Password" 
              type="password" 
              placeholder="Enter new password" 
              value={passwords.new}
              onChange={(e) => setPasswords({...passwords, new: e.target.value})}
            />
            <Input 
              label="Confirm New Password" 
              type="password" 
              placeholder="Confirm new password" 
              value={passwords.confirm}
              onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
            />
          </div>
          <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Button 
              variant="primary" 
              onClick={handlePasswordChange}
              isLoading={loading}
            >
              Update Password
            </Button>
            {status === 'success' && (
              <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <CheckCircle size={16} /> Password updated!
              </div>
            )}
            {status === 'error' && (
              <div style={{ color: 'var(--critical)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                <AlertCircle size={16} /> Update failed. Check current password.
              </div>
            )}
          </div>
        </SettingSection>

        <SettingSection title="Two-Factor Authentication" description="Add an additional layer of security to your account by requiring more than just a password to log in.">
          {user?.mfa_enabled ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1.5rem', 
              background: 'rgba(var(--success-rgb), 0.05)', 
              borderRadius: '12px',
              border: '1px solid var(--success)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'var(--success)', 
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={20} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>2FA is Enabled</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Your account is protected with an extra layer of security.</p>
                </div>
              </div>
              <Button variant="danger" size="small" style={{ background: 'transparent', border: '1px solid var(--critical)', color: 'var(--critical)' }}>Disable</Button>
            </div>
          ) : mfaStep === 'initial' ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '1.5rem', 
              background: 'var(--md-sys-color-surface-container)', 
              borderRadius: '12px',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '10px', 
                  background: 'var(--md-sys-color-primary-container)', 
                  color: 'var(--md-sys-color-on-primary-container)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Smartphone size={20} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Authenticator App</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Use an app like Google Authenticator or 1Password.</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="small" 
                onClick={startMfaSetup}
                isLoading={mfaLoading}
              >
                Enable
              </Button>
            </div>
          ) : (
            <div style={{ padding: '1.5rem', background: 'var(--md-sys-color-surface-container)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '8px' }}>
                  <img src={mfaData?.qrCode} alt="QR Code" style={{ width: '150px', height: '150px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Scan the QR Code</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Scan this QR code with your authenticator app. If you can't scan it, enter this code manually: <br/>
                    <code style={{ background: 'var(--bg-hover)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontWeight: 'bold' }}>{mfaData?.secret}</code>
                  </p>
                  <div style={{ maxWidth: '200px', marginBottom: '1rem' }}>
                    <Input 
                      placeholder="Enter 6-digit code" 
                      value={mfaToken}
                      onChange={(e) => setMfaToken(e.target.value)}
                      maxLength={6}
                    />
                  </div>
                  {mfaError && <p style={{ color: 'var(--critical)', fontSize: '0.75rem', marginBottom: '1rem' }}>{mfaError}</p>}
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button variant="primary" size="small" onClick={verifyMfa} isLoading={mfaLoading}>Verify & Enable</Button>
                    <Button variant="secondary" size="small" onClick={() => setMfaStep('initial')}>Cancel</Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SettingSection>
      </Card>

      <Card style={{ padding: '2rem', background: 'transparent', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Active Sessions</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>You are currently logged in on these devices.</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Chrome on macOS</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Session • India</p>
          </div>
          <Badge severity="success">Active Now</Badge>
        </div>
      </Card>
    </div>
  );
};

export default SecurityTab;
