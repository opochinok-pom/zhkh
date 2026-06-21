import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';

const PROPERTIES = ['29/42', '750', '888', '510'];

export default function Notifications({ isAdmin, addToast, onRead }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    setLoading(true);
    api.notifications()
      .then(setNotifs)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRead = async (id) => {
    await api.markRead(id).catch(() => {});
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x));
    onRead?.();
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить уведомление?')) return;
    try {
      await api.deleteNotification(id);
      setNotifs(n => n.filter(x => x.id !== id));
      addToast('Удалено', 'success');
    } catch (e) { addToast(e.message, 'error'); }
  };

  const unread = notifs.filter(n => !n.is_read);
  const read = notifs.filter(n => n.is_read);

  return (
    <div>
      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          🔔 Уведомления {unread.length > 0 && <span className="badge" style={{ background: 'var(--red)', color: '#fff' }}>{unread.length}</span>}
        </h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Отправить уведомление</button>
        )}
      </div>

      {loading && <div className="spinner" />}

      {!loading && notifs.length === 0 && (
        <div className="empty">
          <span className="icon">🔔</span>
          <p>Уведомлений нет</p>
        </div>
      )}

      {!loading && unread.length > 0 && (
        <div className="card mb-2">
          <div className="card-title" style={{ color: 'var(--blue)' }}>Новые ({unread.length})</div>
          <div>
            {unread.map(n => (
              <NotifItem key={n.id} notif={n} isAdmin={isAdmin} onRead={handleRead} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {!loading && read.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ color: 'var(--text-xs)' }}>Прочитанные ({read.length})</div>
          <div>
            {read.map(n => (
              <NotifItem key={n.id} notif={n} isAdmin={isAdmin} onRead={handleRead} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <NewNotifModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); addToast('Уведомление отправлено', 'success'); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function NotifItem({ notif, isAdmin, onRead, onDelete }) {
  return (
    <div className="notif-item" style={{ cursor: !notif.is_read ? 'pointer' : 'default' }}
      onClick={() => !notif.is_read && onRead(notif.id)}>
      <div className={`notif-dot ${notif.is_read ? 'read' : ''}`} />
      <div className="notif-body">
        <div className="notif-title">
          {notif.title}
          {notif.property_id
            ? <span className="notif-for">Объект {notif.property_id}</span>
            : <span className="notif-for" style={{ background: 'var(--surface2)', color: 'var(--text-sm)' }}>Всем</span>
          }
        </div>
        <div className="notif-text">{notif.body}</div>
        <div className="notif-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {new Date(notif.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {notif.send_sms && <span style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '1px 6px', borderRadius: 4, fontSize: 11 }}>SMS</span>}
          {isAdmin && (
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '2px 6px' }} onClick={e => { e.stopPropagation(); onDelete(notif.id); }}>✕</button>
          )}
        </div>
      </div>
    </div>
  );
}

function NewNotifModal({ onClose, onSaved, addToast }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [propId, setPropId] = useState('');
  const [sendSms, setSendSms] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return addToast('Заполните заголовок и текст', 'error');
    setSaving(true);
    try {
      await api.sendNotification({ property_id: propId || null, title, body, send_sms: sendSms });
      onSaved();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title="🔔 Новое уведомление"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !title.trim() || !body.trim()}>
            {saving ? 'Отправка…' : 'Отправить'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Кому</label>
        <select className="form-select" value={propId} onChange={e => setPropId(e.target.value)}>
          <option value="">Всем арендаторам</option>
          {PROPERTIES.map(p => <option key={p} value={p}>Объект {p}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Заголовок *</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Напр.: Плановое отключение воды" autoFocus required />
      </div>
      <div className="form-group">
        <label className="form-label">Текст уведомления *</label>
        <textarea className="form-textarea" value={body} onChange={e => setBody(e.target.value)}
          placeholder="Введите текст уведомления..." rows={4} required />
      </div>
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input type="checkbox" checked={sendSms} onChange={e => setSendSms(e.target.checked)}
            style={{ width: 16, height: 16 }} />
          <span>Отправить SMS арендатору{!propId ? '(ам)' : ''}</span>
        </label>
        {sendSms && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--amber)', background: 'var(--amber-light)', padding: '6px 10px', borderRadius: 6 }}>
            ⚠ SMS будет отправлено по номерам телефонов арендаторов (при наличии)
          </div>
        )}
      </div>
    </Modal>
  );
}
