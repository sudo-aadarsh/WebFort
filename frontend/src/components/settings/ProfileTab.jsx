import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button } from '../common';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
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

const ProfileTab = ({ user }) => {
  const { setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    company: user?.company || '',
    job_title: user?.job_title || (user?.role === 'admin' ? 'Security Administrator' : 'Developer'),
    avatar_url: user?.avatar_url || null
  });

  const fileInputRef = React.useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (status) setStatus(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('File is too large. Max 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const response = await api.patch('/users/profile', {
        name: formData.name,
        company: formData.company,
        job_title: formData.job_title,
        avatar_url: formData.avatar_url
      });
      
      setUser(response.data.user);
      setStatus('success');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you ABSOLUTELY sure? This will permanently delete your account and all associated data. This action CANNOT be undone.")) {
      try {
        await api.delete('/users/me');
        logout();
        navigate('/login');
      } catch (err) {
        console.error('Deletion failed:', err);
        alert('Failed to delete account. Please try again.');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Card style={{ padding: '2.5rem' }}>
        <SettingSection title="Public Profile" description="This information will be displayed on your profile and across the platform.">
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2.5rem' }}>
            <div style={{ 
              width: '96px', 
              height: '96px', 
              borderRadius: 'var(--radius-full)', 
              background: formData.avatar_url ? `url(${formData.avatar_url})` : 'linear-gradient(135deg, var(--primary), var(--accent))', 
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: '#fff',
              boxShadow: 'var(--shadow-2)',
              overflow: 'hidden'
            }}>
              {!formData.avatar_url && (user?.name?.charAt(0) || 'U')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
              <Button 
                variant="secondary" 
                size="small" 
                onClick={() => fileInputRef.current.click()}
              >
                Change Avatar
              </Button>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPG, GIF or PNG. Max size of 2MB.</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '800px' }}>
            <Input 
              label="Full Name" 
              name="name"
              value={formData.name} 
              onChange={handleChange}
              placeholder="Your full name" 
            />
            <Input 
              label="Email Address" 
              name="email"
              value={formData.email} 
              disabled
              placeholder="your.email@example.com" 
              type="email" 
            />
          </div>
        </SettingSection>

        <SettingSection title="Professional Details" description="Information about your role and organization.">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '800px' }}>
            <Input 
              label="Company" 
              name="company"
              value={formData.company} 
              onChange={handleChange}
              placeholder="Company Name" 
            />
            <Input 
              label="Job Title" 
              name="job_title"
              value={formData.job_title} 
              onChange={handleChange}
              placeholder="Your job title" 
            />
          </div>
        </SettingSection>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          {status === 'success' && (
            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <CheckCircle size={16} /> Changes saved successfully!
            </div>
          )}
          {status === 'error' && (
            <div style={{ color: 'var(--critical)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <AlertCircle size={16} /> Failed to save changes.
            </div>
          )}
          <Button 
            icon={Save} 
            variant="primary" 
            onClick={handleSave}
            isLoading={loading}
          >
            Save Profile Changes
          </Button>
        </div>
      </Card>

      <Card style={{ padding: '2rem', border: '1px solid var(--md-sys-color-error)', background: 'rgba(var(--critical-rgb), 0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--critical)', marginBottom: '0.25rem' }}>Danger Zone</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Once you delete your account, there is no going back. Please be certain.</p>
          </div>
          <Button 
            variant="danger" 
            style={{ background: 'var(--critical)', color: '#fff' }}
            onClick={handleDeleteAccount}
          >
            Delete Account
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ProfileTab;
