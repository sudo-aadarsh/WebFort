import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { 
  ShieldAlert, LayoutDashboard, Search, FileText, 
  AlertTriangle, Settings, LogOut, Bell
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/scans', icon: Search, label: 'Scans' },
    { to: '/vulnerabilities', icon: AlertTriangle, label: 'Vulnerabilities' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: ShieldAlert, label: 'Admin Panel' });
  }

  return (
    <aside className="sidebar glass-card">
      <div className="sidebar-header">
        <div className="logo-icon">
          <ShieldAlert color="white" size={24} />
        </div>
        <span className="logo-text">WebFort</span>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <div className="sidebar-footer">
        <div className="glass-panel user-profile">
          <div className="user-avatar">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export const Navbar = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
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
        <button className="icon-btn">
          <Bell size={20} />
          <span style={{ position: 'absolute', top: '4px', right: '4px', width: '8px', height: '8px', background: 'var(--critical)', borderRadius: '50%' }}></span>
        </button>
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

  if (!isAuthenticated) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>{children}</div>;
  }

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content-wrapper">
        <Navbar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};
