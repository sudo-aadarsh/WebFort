import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, useThemeStore, useNotificationStore } from '../../store';
import { 
  AlertTriangle, Settings, LogOut, Bell, Sun, Moon, BookOpen,
  LayoutDashboard, Search, FileText, ShieldAlert, CheckCircle2, AlertCircle, Info, X,
  ChevronLeft, ChevronRight, Menu
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const { isSidebarCollapsed, toggleSidebar } = useThemeStore();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/scans', icon: Search, label: 'Scans' },
    { to: '/vulnerabilities', icon: AlertTriangle, label: 'Vulnerabilities' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/education', icon: BookOpen, label: 'Education' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar animate-fade-in ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ width: isSidebarCollapsed ? '80px' : '280px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
      <div className="sidebar-header" style={{ padding: isSidebarCollapsed ? '1.5rem 0' : '2rem 1.5rem', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start' }}>
        <div className="logo-icon">
          <ShieldAlert color="white" size={24} />
        </div>
        {!isSidebarCollapsed && <span className="logo-text">WebSecure</span>}
      </div>

      <div className="sidebar-nav" style={{ padding: isSidebarCollapsed ? '0.5rem' : '1rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
            style={{ 
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              padding: isSidebarCollapsed ? '1rem 0' : '1rem 1.5rem',
              borderRadius: isSidebarCollapsed ? '12px' : 'var(--radius-full)',
              gap: isSidebarCollapsed ? '0' : '1rem'
            }}
            title={isSidebarCollapsed ? item.label : ''}
          >
            <item.icon size={20} />
            {!isSidebarCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer" style={{ padding: isSidebarCollapsed ? '0.5rem' : '1rem' }}>
        <div 
          className="panel user-profile"
          onClick={() => navigate('/settings', { state: { tab: 'profile' } })}
          style={{ 
            cursor: 'pointer',
            padding: isSidebarCollapsed ? '0.5rem' : '0.75rem',
            justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
            gap: isSidebarCollapsed ? '0' : '0.75rem'
          }}
        >
          <div 
            className="user-avatar"
            style={{ 
              width: isSidebarCollapsed ? '32px' : '40px',
              height: isSidebarCollapsed ? '32px' : '40px',
              background: user?.avatar_url ? `url(${user.avatar_url})` : 'var(--md-sys-color-secondary-container)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              overflow: 'hidden'
            }}
          >
            {!user?.avatar_url && (user?.name?.charAt(0) || 'U')}
          </div>
          {!isSidebarCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 500, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
            </div>
          )}
        </div>

        <button 
          onClick={toggleSidebar}
          className="icon-btn"
          style={{ 
            width: '100%', 
            height: '40px', 
            marginTop: '1rem', 
            borderRadius: '12px',
            background: 'var(--bg-hover)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};

export const Navbar = () => {
  const { logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} color="var(--success)" />;
      case 'error': return <AlertCircle size={16} color="var(--critical)" />;
      default: return <Info size={16} color="var(--info)" />;
    }
  };

  return (
    <header className="navbar">
      <div className="search-bar">
        <Search className="search-icon" size={18} />
        <input 
          type="text" 
          placeholder="Search scans, vulnerabilities..." 
          className="search-input"
        />
      </div>

      <div className="nav-actions">
        <button 
          onClick={toggleTheme}
          className="icon-btn"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button 
            className="icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span style={{ 
                position: 'absolute', top: '2px', right: '4px', width: '16px', height: '16px', 
                background: 'var(--critical)', borderRadius: '50%', color: 'white', 
                fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', border: '2px solid var(--bg-card)'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="card animate-fade-in" style={{ 
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: '-0.5rem', width: '320px', 
              maxHeight: '400px', display: 'flex', flexDirection: 'column', zIndex: 50, padding: 0 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>Notifications</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={markAllAsRead} style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>
                  <button onClick={clearAll} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
                </div>
              </div>
              
              <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    <Bell size={24} style={{ opacity: 0.2, margin: '0 auto 0.5rem' }} />
                    No recent notifications
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => markAsRead(notif.id)}
                        className="hover-lift"
                        style={{ 
                          padding: '0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                          background: notif.read ? 'transparent' : 'var(--bg-hover)',
                          borderLeft: notif.read ? '2px solid transparent' : `2px solid var(--${notif.type === 'error' ? 'critical' : notif.type === 'success' ? 'success' : 'info'})`,
                          display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                        }}
                      >
                        <div style={{ marginTop: '0.125rem' }}>{getNotificationIcon(notif.type)}</div>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 0.25rem 0' }}>{notif.title}</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{notif.message}</p>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.7, marginTop: '0.25rem', display: 'block' }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {!notif.read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', flexShrink: 0, marginTop: '0.25rem' }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={handleLogout}
          className="icon-btn"
          style={{ color: 'var(--text-muted)' }}
          title="Logout"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export const Layout = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  const { isSidebarCollapsed } = useThemeStore();

  if (!isAuthenticated) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>{children}</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-wrapper" style={{ marginLeft: isSidebarCollapsed ? '80px' : '280px', transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
        <Navbar />
        <main className="main-content animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};
