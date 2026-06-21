import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';

const DOC_TYPES = [
  { id: 'contract',  label: 'Договор аренды',         icon: '📋' },
  { id: 'inventory', label: 'Перечень имущества',      icon: '📝' },
  { id: 'other',     label: 'Прочие документы',        icon: '📎' },
];

const PROPERTIES = ['29/42', '750', '888', '510'];

function getIcon(url, name) {
  const ext = (url || name || '').split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📄';
  if (['doc','docx'].includes(ext)) return '📝';
  return '📎';
}

export default function Documents({ propertyId, isAdmin, addToast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [filterProp, setFilterProp] = useState(propertyId || '');

  const load = () => {
    const params = {};
    if (filterProp) params.property_id = filterProp;
    setLoading(true);
    api.documents(params)
      .then(setDocs)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProp]);

  const handleDelete = async (id) => {
    if (!confirm('Удалить документ?')) return;
    try {
      await api.deleteDocument(id);
      addToast('Документ удалён', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const grouped = DOC_TYPES.map(type => ({
    ...type,
    items: docs.filter(d => d.doc_type === type.id)
  }));

  return (
    <div>
      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>📄 Документы</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            + Загрузить документ
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="period-selector">
          <label className="form-label" style={{ marginBottom: 0 }}>Объект:</label>
          <select className="form-select" style={{ width: 'auto' }} value={filterProp} onChange={e => setFilterProp(e.target.value)}>
            <option value="">Все</option>
            {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {loading && <div className="spinner" />}

      {!loading && docs.length === 0 && (
        <div className="empty">
          <span className="icon">📭</span>
          <p>Документов пока нет</p>
          {isAdmin && <p style={{ marginTop: 8 }}>Нажмите «Загрузить документ» для добавления</p>}
        </div>
      )}

      {!loading && grouped.map(group => {
        if (group.items.length === 0 && !isAdmin) return null;
        return (
          <div key={group.id} className="card mb-2">
            <div className="doc-type-section" style={{ marginBottom: 0 }}>
              <h3>{group.icon} {group.label}</h3>
              {group.items.length === 0 ? (
                <p style={{ color: 'var(--text-xs)', fontSize: 13 }}>Нет документов</p>
              ) : (
                <div className="doc-list">
                  {group.items.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-item"
                        style={{ flex: 1 }}
                      >
                        <span className="doc-icon">{getIcon(doc.url, doc.name)}</span>
                        <div className="doc-info">
                          <div className="doc-name">{doc.name}</div>
                          <div className="doc-type">
                            {isAdmin && doc.property_id && `Объект ${doc.property_id} · `}
                            {new Date(doc.uploaded_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <span style={{ color: 'var(--text-xs)' }}>↗</span>
                      </a>
                      {isAdmin && (
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(doc.id)} title="Удалить">✕</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSaved={() => { setShowUpload(false); load(); addToast('Документ загружен', 'success'); }}
          addToast={addToast}
          defaultPropId={filterProp}
        />
      )}
    </div>
  );
}

function UploadModal({ onClose, onSaved, addToast, defaultPropId }) {
  const [propId, setPropId] = useState(defaultPropId || '');
  const [docType, setDocType] = useState('contract');
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propId) return addToast('Выберите объект', 'error');
    if (!file) return addToast('Выберите файл', 'error');
    if (!name.trim()) return addToast('Введите название', 'error');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('property_id', propId);
      fd.append('doc_type', docType);
      fd.append('name', name.trim());
      fd.append('file', file);
      await api.uploadDocument(fd);
      onSaved();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      title="📤 Загрузить документ"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Загрузка…' : 'Загрузить'}
          </button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Объект</label>
        <select className="form-select" value={propId} onChange={e => setPropId(e.target.value)} required>
          <option value="">Выберите объект</option>
          {['29/42','750','888','510'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Тип документа</label>
        <select className="form-select" value={docType} onChange={e => setDocType(e.target.value)}>
          {DOC_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Название документа</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Напр.: Договор аренды от 01.01.2026" required />
      </div>
      <div className="form-group">
        <label className="form-label">Файл</label>
        <input type="file" ref={fileRef} style={{ display: 'none' }} onChange={handleFile}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp" />
        <div className="file-drop" onClick={() => fileRef.current?.click()}>
          {file ? (
            <div>📎 {file.name} <span style={{ color: 'var(--text-xs)' }}>({(file.size / 1024).toFixed(0)} КБ)</span></div>
          ) : (
            <>📂 Нажмите для выбора файла<br /><span style={{ fontSize: 11, color: 'var(--text-xs)' }}>PDF, Word, изображения · до 15 МБ</span></>
          )}
        </div>
      </div>
    </Modal>
  );
}
