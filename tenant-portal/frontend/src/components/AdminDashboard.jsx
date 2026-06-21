import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import UtilityReadings from './UtilityReadings.jsx';
import Documents from './Documents.jsx';
import Requests from './Requests.jsx';
import Notifications from './Notifications.jsx';
import UserManagement from './UserManagement.jsx';
import ActivityLog from './ActivityLog.jsx';

const TABS = [
  { id: 'home',      label: 'Обзор',       icon: '📊' },
  { id: 'readings',  label: 'Показания',    icon: '📈' },
  { id: 'docs',      label: 'Документы',    icon: '📄' },
  { id: 'requests',  label: 'Заявки',       icon: '🔧' },
  { id: 'notifs',    label: 'Уведомления',  icon: '🔔' },
  { id: 'tenants',   label: 'Арендаторы',   icon: '👥' },
  { id: 'activity',  label: 'Активность',   icon: '📋' },
];

const PROPERTIES = ['', '29/42', '750', '888', '510'];

export default function AdminDashboard({ user, onLogout, addToast }) {
  const [tab, setTab] = useState('home');
  const [selectedProp, setSelectedProp] = useState('');
  const [newRequests, setNewRequests] = useState(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.requests().then(d => setNewRequests(d.filter(r => r.status === 'new').length)).catch(() => {});
    api.notifications().then(d => setUnread(d.filter(n => !n.is_read).length)).catch(() => {});
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">
          <span>🏢</span>
          <span>Управление арендой</span>
        </div>
        <div className="header-center">
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: 140, fontSize: 13 }}
            value={selectedProp}
            onChange={e => setSelectedProp(e.target.value)}
          >
            <option value="">Все объекты</option>
            {PROPERTIES.slice(1).map(p => (
              <option key={p} value={p}>Объект {p}</option>
            ))}
          </select>
        </div>
        <div className="header-right">
          <span className="text-sm text-muted">{user.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Выйти</button>
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
            {t.id === 'requests' && newRequests > 0 && (
              <span className="badge">{newRequests}</span>
            )}
            {t.id === 'notifs' && unread > 0 && (
              <span className="badge">{unread}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'home' && (
          <AdminHome selectedProp={selectedProp} onTabChange={setTab} addToast={addToast} />
        )}
        {tab === 'readings' && (
          <UtilityReadings
            propertyId={selectedProp}
            isAdmin={true}
            addToast={addToast}
          />
        )}
        {tab === 'docs' && (
          <Documents
            propertyId={selectedProp}
            isAdmin={true}
            addToast={addToast}
          />
        )}
        {tab === 'requests' && (
          <Requests
            propertyId={selectedProp}
            isAdmin={true}
            addToast={addToast}
            onUpdate={() => api.requests().then(d => setNewRequests(d.filter(r => r.status === 'new').length)).catch(() => {})}
          />
        )}
        {tab === 'notifs' && (
          <Notifications
            isAdmin={true}
            addToast={addToast}
            onRead={() => setUnread(c => Math.max(0, c - 1))}
          />
        )}
        {tab === 'tenants' && (
          <UserManagement addToast={addToast} />
        )}
        {tab === 'activity' && (
          <ActivityLog addToast={addToast} />
        )}
      </main>
    </div>
  );
}

function AdminHome({ selectedProp, onTabChange }) {
  const [stats, setStats] = useState({ readings: 0, docs: 0, requests: { new: 0, progress: 0, done: 0 }, tenants: 0 });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    const params = selectedProp ? { property_id: selectedProp } : {};
    Promise.all([
      api.readings(params).catch(() => []),
      api.documents(params).catch(() => []),
      api.requests(params).catch(() => []),
      api.users().catch(() => []),
      api.activity().catch(() => []),
    ]).then(([readings, docs, reqs, users, acts]) => {
      setStats({
        readings: readings.length,
        docs: docs.length,
        requests: {
          new: reqs.filter(r => r.status === 'new').length,
          progress: reqs.filter(r => r.status === 'in_progress').length,
          done: reqs.filter(r => r.status === 'done').length,
        },
        tenants: users.filter(u => u.role === 'tenant').length,
      });
      setActivity(acts.slice(0, 10));
    });
  }, [selectedProp]);

  const actionMap = {
    reading_submitted: { icon: '📊', text: 'Внёс показания' },
    request_submitted: { icon: '🔧', text: 'Подал заявку' },
  };

  return (
    <div>
      <h2 className="section-title mb-3">
        {selectedProp ? `Объект ${selectedProp}` : 'Все объекты'} — Обзор
      </h2>

      <div className="overview-grid mb-4">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('readings')}>
          <div className="stat-label">Показаний</div>
          <div className="stat-value blue">{stats.readings}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('docs')}>
          <div className="stat-label">Документов</div>
          <div className="stat-value green">{stats.docs}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('requests')}>
          <div className="stat-label">Новых заявок</div>
          <div className={`stat-value ${stats.requests.new > 0 ? 'red' : ''}`}>{stats.requests.new}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('requests')}>
          <div className="stat-label">В работе</div>
          <div className="stat-value amber">{stats.requests.progress}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('requests')}>
          <div className="stat-label">Выполнено</div>
          <div className="stat-value green">{stats.requests.done}</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onTabChange('tenants')}>
          <div className="stat-label">Арендаторов</div>
          <div className="stat-value">{stats.tenants}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📋 Последняя активность</div>
        {activity.length === 0 && <div className="empty"><p>Нет активности</p></div>}
        {activity.map(a => {
          const info = actionMap[a.action_type] || { icon: '•', text: a.action_type };
          return (
            <div key={a.id} className="activity-item">
              <div className="activity-icon">{info.icon}</div>
              <div className="activity-body">
                <div className="activity-text">
                  <strong>{a.users?.name || 'Неизвестно'}</strong> ({a.property_id}) — {info.text}
                  {a.details?.title ? `: «${a.details.title}»` : ''}
                  {a.details?.period ? ` за ${a.details.period}` : ''}
                </div>
                <div className="activity-time">{formatTime(a.created_at)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
