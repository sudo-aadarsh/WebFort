import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Scanner } from './pages/Scanner';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { Reports } from './pages/Reports';
import { useAuthStore, useThemeStore } from './store';

import { Settings } from './pages/Settings';

// Basic Admin placeholder
const AdminPanel = () => <div className="p-6"><h1 className="text-2xl text-white font-bold mb-4">Admin Panel</h1><p className="text-text-muted">User management coming soon.</p></div>;

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  
  return <Layout>{children}</Layout>;
};

const App = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <div className="min-h-screen flex items-center justify-center p-4"><Login /></div>
        } />
        <Route path="/register" element={
          <div className="min-h-screen flex items-center justify-center p-4"><Register /></div>
        } />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/scans" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
        <Route path="/vulnerabilities" element={<ProtectedRoute><Vulnerabilities /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPanel /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
