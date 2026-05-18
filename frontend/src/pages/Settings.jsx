import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Card, Button } from '../components/common';
import { User, Lock, Bell, Zap, ArrowLeft, ChevronRight } from 'lucide-react';
import ProfileTab from '../components/settings/ProfileTab';
import SecurityTab from '../components/settings/SecurityTab';
import APITab from '../components/settings/APITab';
import NotificationsTab from '../components/settings/NotificationsTab';
import IntegrationsTab from '../components/settings/IntegrationsTab';

export const Settings = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState('forward'); // 'forward' | 'backward'
  
  useEffect(() => {
    if (location.state?.tab) {
      handleTabChange(location.state.tab);
    }
  }, [location.state]);

  const handleTabChange = (tabId) => {
    setDirection(tabId ? 'forward' : 'backward');
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveTab(tabId);
      setIsTransitioning(false);
    }, 250);
  };

  const categories = [
    { 
      id: 'profile', 
      label: 'Profile', 
      description: 'Manage your personal information and public identity',
      icon: User, 
      color: '#3b82f6',
      component: ProfileTab 
    },
    { 
      id: 'security', 
      label: 'Security', 
      description: 'Protect your account with passwords and 2FA',
      icon: Lock, 
      color: '#ef4444',
      component: SecurityTab 
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      description: 'Choose how and when you want to be alerted',
      icon: Bell, 
      color: '#f59e0b',
      component: NotificationsTab 
    },
    { 
      id: 'integrations', 
      label: 'Integrations', 
      description: 'Connect WebSecure with your favorite dev tools',
      icon: Zap, 
      color: '#8b5cf6',
      component: IntegrationsTab 
    },
  ];

  const ActiveComponent = categories.find(t => t.id === activeTab)?.component;

  const contentStyle = {
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning 
      ? (direction === 'forward' ? 'translateX(20px)' : 'translateX(-20px)') 
      : 'translateX(0)',
    pointerEvents: isTransitioning ? 'none' : 'auto'
  };

  if (!activeTab) {
    return (
      <div style={contentStyle} className="animate-fade-in">
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="dashboard-header" style={{ marginBottom: '4rem', textAlign: 'center' }}>
            <h1 className="dashboard-title" style={{ fontSize: '3rem' }}>Settings</h1>
            <p className="dashboard-subtitle" style={{ fontSize: '1.125rem' }}>Configure your WebSecure experience and account preferences</p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: '2rem' 
          }}>
            {categories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => handleTabChange(cat.id)}
                className="card-hover"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  padding: '2.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'var(--transition-smooth)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '16px', 
                  background: `${cat.color}15`, 
                  color: cat.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <cat.icon size={32} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{cat.label}</h3>
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{cat.description}</p>
                </div>
                <ChevronRight size={24} style={{ color: 'var(--border)', opacity: 0.5 }} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div style={contentStyle} className="animate-fade-in">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '3rem' }}>
          <button 
            onClick={() => handleTabChange(null)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              padding: '0.5rem 0',
              transition: 'var(--transition)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <ArrowLeft size={18} />
            Back to Settings
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h1 className="dashboard-title" style={{ fontSize: '2.5rem' }}>{categories.find(c => c.id === activeTab)?.label}</h1>
          </div>
        </div>

        <div className="settings-content">
          <ActiveComponent user={user} />
        </div>
      </div>
    </div>
  );
};
