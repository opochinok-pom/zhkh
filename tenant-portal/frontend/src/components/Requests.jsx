import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';

const STATUS_LABELS = {
  new:         { label: 'Новая',      css: 'badge-new' },
  in_progress: { label: 'В работе',   css: 'badge-progress' },
  done:        { label: 'Выполнено',  css: 'badge-done' },
  rejected:    { label: 'Отклонено',  css: 'badge-rejected' },
};

const PROPERTIES = ['29/42', '750', '888', '510'];

export default function Requests({ propertyId, isAdmin, addToast, onUpdate }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editReq, setEditReq] = useState(null);
  const [filterProp, setFilterProp] = useState(propertyId || '');
  const [filterStatus, setFilterStatus] = useState('');
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const load = () => {
    const params = {};
    if (filterProp) params.property_id = filterProp;
    setLoading(true);
    api.requests(params)
      .then(data => {
        setRequests(data);
        onUpdate?.();
      })
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProp]);

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;

  const handleStatusChange = async (id, status, comment) => {
    try {
      await api.updateRequest(id, { status, admin_comment: comment });
      addToast('Заявка обновлена', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>🔧 Заявки на обслуживание</h2>
        <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Новая заявка</button>
      </div>

      <div className="period-selector">
        {isAdmin && (
          <>
            <label className="form-label" style={{ marginBottom: 0 }}>Объект:</label>
            <select className="form-select" style={{ width: 'auto' }} value={filterProp} onChange={e => setFilterProp(e.target.value)}>
              <option value="">Все</option>
              {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </>
        )}
        <label className="form-label" style={{ marginBottom: 0 }}>Статус:</label>
        <select className="form-select" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Все</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {loading && <div className="spinner" />}

      {!loading && filtered.length === 0 && (
        <div className="empty">
          <span className="icon">🔧</span>
          <p>Заявок нет</p>
        </div>
      )}

      {!loading && filtered.map(req => (
        <RequestCard
          key={req.id}
          req={req}
          isAdmin={isAdmin}
          onStatusChange={handleStatusChange}
          onZoom={setZoomPhoto}
          onEdit={() => setEditReq(req)}
        />
      ))}

      {showNew && (
        <NewRequestModal
          propertyId={propertyId}
          isAdmin={isAdmin}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load(); addToast('Заявка подана', 'success'); }}
          addToast={addToast}
        />
      )}

      {editReq && isAdmin && (
        <EditRequestModal
          req={editReq}
          onClose={() => setEditReq(null)}
          onSaved={(status, comment) => {
            handleStatusChange(editReq.id, status, comment);
            setEditReq(null);
          }}
        />
      )}

      {zoomPhoto && (
        <div className="photo-zoom" onClick={() => setZoomPhoto(null)}>
          <img src={zoomPhoto} alt="фото" />
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, isAdmin, onStatusChange, onZoom, onEdit }) {
  const st = STATUS_LABELS[req.status] || STATUS_LABELS.new;
  const photos = req.photo_urls || [];

  return (
    <div className="request-card">
      <div className="request-header">
        <div className="request-title">{req.title}</div>
        <span className={`badge ${st.css}`}>{st.label}</span>
      </div>
      <div className="request-meta">
        {isAdmin && req.property_id && <><strong>Объект {req.property_id}</strong> · </>}
        {req.users?.name && <>{req.users.name} · </>}
        {new Date(req.submitted_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        {req.resolved_at && <> · Закрыта: {new Date(req.resolved_at).toLocaleDateString('ru-RU')}</>}
      </div>
      {req.description && <div className="request-desc">{req.description}</div>}
      {photos.length > 0 && (
        <div className="request-photos">
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" onClick={() => onZoom(url)} />
          ))}
        </div>
      )}
      {req.admin_comment && (
        <div className="admin-comment">
          <strong>Комментарий:</strong> {req.admin_comment}
        </div>
      )}
      {isAdmin && (
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {req.status === 'new' && (
            <button className="btn btn-outline btn-sm" onClick={() => onStatusChange(req.id, 'in_progress', req.admin_comment)}>
              ▶ Взять в работу
            </button>
          )}
          {req.status === 'in_progress' && (
            <button className="btn btn-outline btn-sm" style={{ color: 'var(--green)', borderColor: 'var(--green)' }}
              onClick={() => onStatusChange(req.id, 'done', req.admin_comment)}>
              ✓ Выполнено
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏ Изменить</button>
          {req.status !== 'rejected' && (
            <button className="btn btn-danger btn-sm" onClick={() => onStatusChange(req.id, 'rejected', req.admin_comment)}>
              ✕ Отклонить
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NewRequestModal({ propertyId, isAdmin, onClose, onSaved, addToast }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [propId, setPropId] = useState(propertyId || '');
  const fileRef = useRef();

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setPhotos(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return addToast('Введите тему заявки', 'error');
    if (!propId) return addToast('Выберите объект', 'error');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('property_id', propId);
      fd.append('title', title.trim());
      fd.append('description', description);
      photos.forEach(f => fd.append('photos', f));
      await api.addRequest(fd);
      onSaved();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title="🔧 Новая заявка"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !title.trim()}>
            {saving ? 'Отправка…' : 'Отправить'}
          </button>
        </>
      }
    >
      {isAdmin && (
        <div className="form-group">
          <label className="form-label">Объект</label>
          <select className="form-select" value={propId} onChange={e => setPropId(e.target.value)} required>
            <option value="">Выберите объект</option>
            {['29/42','750','888','510'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}
      <div className="form-group">
        <label className="form-label">Тема заявки *</label>
        <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="Напр.: Сломан кран в ванной" required autoFocus />
      </div>
      <div className="form-group">
        <label className="form-label">Описание</label>
        <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Подробно опишите проблему" rows={3} />
      </div>
      <div className="form-group">
        <label className="form-label">Фотографии (до 5 шт.)</label>
        <input type="file" accept="image/*" multiple ref={fileRef} style={{ display: 'none' }} onChange={handleFiles} />
        <div className="file-drop" onClick={() => fileRef.current?.click()}>
          {previews.length > 0 ? (
            <div className="file-preview">
              {previews.map((url, i) => <img key={i} src={url} alt="" />)}
            </div>
          ) : (
            <>📷 Приложите фото неисправности<br /><span style={{ fontSize: 11, color: 'var(--text-xs)' }}>До 5 фотографий</span></>
          )}
        </div>
      </div>
    </Modal>
  );
}

function EditRequestModal({ req, onClose, onSaved }) {
  const [status, setStatus] = useState(req.status);
  const [comment, setComment] = useState(req.admin_comment || '');

  return (
    <Modal
      title="✏ Изменить заявку"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={() => onSaved(status, comment)}>Сохранить</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Статус</label>
        <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Комментарий администратора</label>
        <textarea className="form-textarea" value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Ответ арендатору..." rows={3} />
      </div>
    </Modal>
  );
}
