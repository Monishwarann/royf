import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Scan, User, LayoutDashboard, Settings, Bell, Clock } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import Profile from './components/Profile';
import History from './components/History';
import Login from './components/Login';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  return children;
};

function AppContent() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';

  return (
    <div className={`app-container ${isAuthPage ? 'auth-layout' : ''}`}>
      {!isAuthPage && (
        <header>
          <div className="logo">
            <div style={{ 
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
              padding: '8px', 
              borderRadius: '12px', 
              color: 'white',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)'
            }}>
              <Scan size={24} />
            </div>
            <span>TrustBite</span>
          </div>
          <div style={{ background: 'var(--glass)', padding: '8px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
            <Bell className="text-muted" size={20} />
          </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/scan" element={
            <ProtectedRoute>
              <Scanner user={currentUser} />
            </ProtectedRoute>
          } />
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile user={currentUser} />
            </ProtectedRoute>
          } />
        </Routes>
      </main>

      {!isAuthPage && <Navigation />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function Navigation() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  return (
    <nav>
      <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <LayoutDashboard size={24} />
        <span>Home</span>
      </Link>
      <Link to="/history" className={`nav-item ${isActive('/history') ? 'active' : ''}`}>
        <Clock size={24} />
        <span>History</span>
      </Link>
      
      <Link to="/scan" className="nav-logo-btn">
        <Scan size={32} strokeWidth={2.5} />
        <span style={{ display: 'none' }}>Scanner</span>
      </Link>

      <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <User size={24} />
        <span>Profile</span>
      </Link>
      
      <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`} style={{ display: location.pathname === '/settings' ? 'flex' : 'none' }}>
        <Settings size={24} />
        <span>Settings</span>
      </Link>
    </nav>
  );
}

export default App;
