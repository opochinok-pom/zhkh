import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';

const PROPERTIES = ['29/42', '750', '888', '510'];

export default function UserManagement({ addToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const load = () => {
    setLoading(true);
    api.users().then(setUsers).catch(e => addToast(e.message, 'error')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Удалить арендатора? Это действие нельзя отменить.')) return;
    try {
      await api.deleteUser(id);
      addToast('Арендатор удалён', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const tenants = users.filter(u => u.role === 'tenant');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div>
      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>👥 Арендаторы</h2>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setShowModal(true); }}>
          + Добавить арендатора
        </button>
      </div>

      {loading && <div className="spinner" />}

      {!loading && (
        <>
          <div className="card mb-2">
            <div className="card-title">Арендаторы ({tenants.length})</div>
            {tenants.length === 0 ? (
              <div className="empty" style={{ padding: '20px 0' }}>
                <p>Арендаторов нет. Нажмите «+ Добавить» для создания.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Имя</th><th>Объект</th><th>Телефон</th><th>Добавлен</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong></td>
                        <td>
                          {u.property_id
                            ? <span className="prop-badge" style={{ fontSize: 12 }}>Объект {u.property_id}</span>
                            : <span style={{ color: 'var(--text-xs)' }}>Не назначен</span>
                          }
                        </td>
                        <td>{u.phone || <span style={{ color: 'var(--text-xs)' }}>—</span>}</td>
                        <td>{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-outline btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }}>
                              ✏ Изменить
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u.id)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {admins.length > 0 && (
            <div className="card">
              <div className="card-title">Администраторы</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Имя</th><th>Телефон (SMS-уведомления)</th><th></th></tr>
                  </thead>
                  <tbody>
                    {admins.map(u => (
                      <tr key={u.id}>
                        <td><strong>{u.name}</strong> <span style={{ background: 'var(--blue-light)', color: 'var(--blue)', fontSize: 11, padding: '1px 6px', borderRadius: 4 }}>admin</span></td>
                        <td>{u.phone || <span style={{ color: 'var(--text-xs)' }}>—</span>}</td>
                        <td>
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditUser(u); setShowModal(true); }}>
                            ✏ Изменить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); addToast(editUser ? 'Данные обновлены' : 'Арендатор добавлен', 'success'); }}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSaved, addToast }) {
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [propId, setPropId] = useState(user?.property_id || '');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!user;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return addToast('Введите имя', 'error');
    if (!isEdit && !password) return addToast('Введите пароль', 'error');
    setSaving(true);
    try {
      const body = { name: name.trim(), phone: phone.trim() || null, property_id: propId || null };
      if (password) body.password = password;
      if (isEdit) {
        await api.updateUser(user.id, body);
      } else {
        body.role = 'tenant';
        await api.addUser(body);
      }
      onSaved();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title={isEdit ? '✏ Изменить данные' : '+ Новый арендатор'}
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Добавить'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Имя / ФИО *</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} autoFocus required />
      </div>
      {user?.role !== 'admin' && (
        <div className="form-group">
          <label className="form-label">Объект</label>
          <select className="form-select" value={propId} onChange={e => setPropId(e.target.value)}>
            <option value="">Не назначен</option>
            {PROPERTIES.map(p => <option key={p} value={p}>Объект {p}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Телефон (для SMS)</label>
        <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="+7 900 000 00 00" type="tel" />
      </div>
      <div className="form-group">
        <label className="form-label">{isEdit ? 'Новый пароль (оставьте пустым для сохранения)' : 'Пароль для входа *'}</label>
        <div style={{ position: 'relative' }}>
          <input
            className="form-input"
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={isEdit ? 'Введите новый пароль...' : 'Придумайте пароль...'}
            style={{ paddingRight: 40 }}
          />
          <button type="button" onClick={() => setShowPwd(!showPwd)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-xs)', fontSize: 16 }}>
            {showPwd ? '🙈' : '👁'}
          </button>
        </div>
        {!isEdit && (
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-xs)' }}>
            Этот пароль арендатор будет использовать для входа в портал
          </div>
        )}
      </div>
    </Modal>
  );
}
