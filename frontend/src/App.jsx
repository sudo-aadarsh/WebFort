import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout';
import { Login, Register } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Scanner } from './pages/Scanner';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { Reports } from './pages/Reports';
import { useAuthStore } from './store';

// Basic Settings placeholder
const Settings = () => <div className="p-6"><h1 className="text-2xl text-white font-bold mb-4">Settings</h1><p className="text-text-muted">Configuration options coming soon.</p></div>;
// Basic Admin placeholder
const AdminPanel = () => <div className="p-6"><h1 className="text-2xl text-white font-bold mb-4">Admin Panel</h1><p className="text-text-muted">User management coming soon.</p></div>;

const ProtectedRoute = ({ children, requireAdmin }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  
  return <Layout>{children}</Layout>;
};

const App = () => {
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
