import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Scanner } from './pages/Scanner';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { Reports } from './pages/Reports';
import { ScanReport } from './pages/ScanReport';
import { useAuthStore, useThemeStore } from './store';
import api from './services/api';

import { Settings } from './pages/Settings';
import { Education } from './pages/Education';
import { useWebSocket } from './hooks/useWebSocket';

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  
  return <Layout>{children}</Layout>;
};

const App = () => {
  const { theme } = useThemeStore();
  const { token, isAuthenticated, setUser, logout } = useAuthStore();
  
  // Initialize global websocket for real-time updates
  useWebSocket();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchUser();
    }
  }, [isAuthenticated, token]);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
    }
  };

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
        <Route path="/reports/:id" element={<ProtectedRoute><ScanReport /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
