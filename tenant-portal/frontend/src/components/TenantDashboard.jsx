import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import UtilityReadings from './UtilityReadings.jsx';
import Documents from './Documents.jsx';
import Requests from './Requests.jsx';
import Notifications from './Notifications.jsx';

const TABS = [
  { id: 'home',      label: 'Главная',   icon: '🏠' },
  { id: 'readings',  label: 'Показания', icon: '📊' },
  { id: 'docs',      label: 'Документы', icon: '📄' },
  { id: 'requests',  label: 'Заявки',    icon: '🔧' },
  { id: 'notifs',    label: 'Уведомления', icon: '🔔' },
];

export default function TenantDashboard({ user, onLogout, addToast }) {
  const [tab, setTab] = useState('home');
  const [unreadCount, setUnreadCount] = useState(0);
  const [property, setProperty] = useState(null);
  const [newRequests, setNewRequests] = useState(0);

  useEffect(() => {
    api.notifications().then(data => setUnreadCount(data.filter(n => !n.is_read).length)).catch(() => {});
    api.properties().then(data => setProperty(data[0])).catch(() => {});
    api.requests().then(data => setNewRequests(data.filter(r => r.status === 'done').length)).catch(() => {});
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span>🏠</span>
          <span>Арендатор</span>
        </div>
        <div className="header-center">
          {property && (
            <span className="prop-badge">📍 {property.name}</span>
          )}
        </div>
        <div className="header-right">
          <span className="text-sm text-muted">{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Выйти">Выйти</button>
        </div>
      </header>

      <nav className="nav-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`nav-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.id === 'notifs' && unreadCount > 0 && (
              <span className="badge">{unreadCount}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'home' && (
          <TenantHome user={user} property={property} onTabChange={setTab} unreadCount={unreadCount} />
        )}
        {tab === 'readings' && (
          <UtilityReadings
            propertyId={user.property_id}
            isAdmin={false}
            addToast={addToast}
          />
        )}
        {tab === 'docs' && (
          <Documents
            propertyId={user.property_id}
            isAdmin={false}
            addToast={addToast}
          />
        )}
        {tab === 'requests' && (
          <Requests
            propertyId={user.property_id}
            isAdmin={false}
            addToast={addToast}
          />
        )}
        {tab === 'notifs' && (
          <Notifications
            isAdmin={false}
            addToast={addToast}
            onRead={() => setUnreadCount(c => Math.max(0, c - 1))}
          />
        )}
      </main>
    </div>
  );
}

function TenantHome({ user, property, onTabChange, unreadCount }) {
  const [stats, setStats] = useState({ readings: 0, requests: 0, docs: 0 });

  useEffect(() => {
    Promise.all([
      api.readings().catch(() => []),
      api.requests().catch(() => []),
      api.documents().catch(() => []),
    ]).then(([readings, requests, docs]) => {
      setStats({ readings: readings.length, requests: requests.length, docs: docs.length });
    });
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h2 className="section-title">Добро пожаловать, {user.name}!</h2>
        {property && (
          <p className="text-muted text-sm">Ваш объект: <strong>{property.name}</strong>
            {property.address ? ` — ${property.address}` : ''}
          </p>
        )}
      </div>

      <div className="overview-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('readings')}>
          <div className="stat-label">Показания</div>
          <div className="stat-value blue">{stats.readings}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('requests')}>
          <div className="stat-label">Заявки</div>
          <div className="stat-value amber">{stats.requests}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('docs')}>
          <div className="stat-label">Документы</div>
          <div className="stat-value green">{stats.docs}</div>
        </div>
        {unreadCount > 0 && (
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('notifs')}>
            <div className="stat-label">Новых уведомлений</div>
            <div className="stat-value red">{unreadCount}</div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">📋 Быстрые действия</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => onTabChange('readings')} style={{ justifyContent: 'flex-start' }}>
            📊 Внести показания счётчиков
          </button>
          <button className="btn btn-outline" onClick={() => onTabChange('requests')} style={{ justifyContent: 'flex-start' }}>
            🔧 Подать заявку на ремонт
          </button>
          <button className="btn btn-outline" onClick={() => onTabChange('docs')} style={{ justifyContent: 'flex-start' }}>
            📄 Посмотреть документы
          </button>
        </div>
      </div>
    </div>
  );
}
