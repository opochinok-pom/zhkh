import React, { useState, useEffect } from 'react';
import Login from './components/Login.jsx';
import TenantDashboard from './components/TenantDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import { ToastContainer, useToast } from './components/Toast.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toasts, addToast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem('tp_token');
    const stored = localStorage.getItem('tp_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    localStorage.setItem('tp_token', data.token);
    localStorage.setItem('tp_user', JSON.stringify(data.user));
    setUser(data.user);
  };

  const handleLogout = () => {
    localStorage.removeItem('tp_token');
    localStorage.removeItem('tp_user');
    setUser(null);
  };

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;

  return (
    <>
      {!user && <Login onLogin={handleLogin} addToast={addToast} />}
      {user && user.role === 'tenant' && (
        <TenantDashboard user={user} onLogout={handleLogout} addToast={addToast} />
      )}
      {user && user.role === 'admin' && (
        <AdminDashboard user={user} onLogout={handleLogout} addToast={addToast} />
      )}
      <ToastContainer toasts={toasts} />
    </>
  );
}

export default App;
