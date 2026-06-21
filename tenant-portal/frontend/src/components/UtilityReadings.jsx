import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import Modal from './Modal.jsx';

const MONTHS = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const PROPERTIES = ['29/42', '750', '888', '510'];

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function periodLabel(p) {
  if (!p) return '';
  const [y, m] = p.split('-');
  return `${MONTHS[parseInt(m) - 1]} ${y}`;
}

export default function UtilityReadings({ propertyId, isAdmin, addToast }) {
  const [types, setTypes] = useState([]);
  const [readings, setReadings] = useState([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [filterProp, setFilterProp] = useState(propertyId || '');
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const load = () => {
    const params = {};
    if (filterProp) params.property_id = filterProp;
    if (period) params.period = period;
    setLoading(true);
    Promise.all([
      api.utilityTypes(),
      api.readings(params)
    ]).then(([t, r]) => {
      setTypes(t);
      setReadings(r);
    }).catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterProp, period]);

  const getReading = (typeId, prop) => {
    return readings.find(r =>
      r.utility_type_id === typeId &&
      (!prop || r.property_id === prop) &&
      (!period || r.period === period)
    );
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить запись?')) return;
    try {
      await api.deleteReading(id);
      addToast('Удалено', 'success');
      load();
    } catch (e) { addToast(e.message, 'error'); }
  };

  const displayProp = filterProp || propertyId;

  return (
    <div>
      <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>📊 Показания коммунальных приборов</h2>
        <button className="btn btn-primary" onClick={() => { setSelectedType(null); setShowModal(true); }}>
          + Внести показания
        </button>
      </div>

      <div className="period-selector">
        <label className="form-label" style={{ marginBottom: 0 }}>Период:</label>
        <input
          type="month"
          className="form-input"
          style={{ width: 'auto' }}
          value={period}
          onChange={e => setPeriod(e.target.value)}
        />
        {isAdmin && (
          <>
            <label className="form-label" style={{ marginBottom: 0 }}>Объект:</label>
            <select className="form-select" style={{ width: 'auto' }} value={filterProp} onChange={e => setFilterProp(e.target.value)}>
              <option value="">Все</option>
              {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </>
        )}
      </div>

      {loading && <div className="spinner" />}

      {!loading && (
        <div className="util-grid">
          {types.map(type => {
            const r = getReading(type.id, displayProp);
            return (
              <div key={type.id} className="util-card">
                <div className="util-card-name">{type.name}</div>
                <div className="util-card-unit">{type.has_meter ? `Счётчик · ${type.unit}` : 'Фиксированный'}</div>
                {r ? (
                  <>
                    {r.reading_value !== null && (
                      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                        {r.reading_value} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-xs)' }}>{type.unit}</span>
                      </div>
                    )}
                    {r.photo_url && (
                      <img
                        src={r.photo_url}
                        alt="фото"
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, cursor: 'zoom-in', border: '1px solid var(--border)', marginBottom: 4 }}
                        onClick={() => setZoomPhoto(r.photo_url)}
                      />
                    )}
                    {r.note && <div className="util-last" style={{ fontStyle: 'italic' }}>{r.note}</div>}
                    <div className="util-last">
                      {isAdmin && r.property_id && <><span>{r.property_id}</span> · </>}
                      {r.users?.name && <><span>{r.users.name}</span> · </>}
                      {new Date(r.submitted_at).toLocaleDateString('ru-RU')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => { setSelectedType(type); setShowModal(true); }}>
                        Обновить
                      </button>
                      {isAdmin && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r.id)}>✕</button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ color: 'var(--text-xs)', fontSize: 13, marginBottom: 8 }}>Нет данных за {periodLabel(period)}</div>
                    <button className="btn btn-primary btn-sm" onClick={() => { setSelectedType(type); setShowModal(true); }}>
                      Внести
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && readings.length > 0 && isAdmin && (
        <div className="card mt-3">
          <div className="card-title">История за {periodLabel(period)}</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Объект</th><th>Услуга</th><th>Значение</th><th>Фото</th><th>Кем</th><th>Дата</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {readings.map(r => (
                  <tr key={r.id}>
                    <td>{r.property_id}</td>
                    <td>{r.utility_types?.name}</td>
                    <td>{r.reading_value !== null ? `${r.reading_value} ${r.utility_types?.unit || ''}` : '—'}</td>
                    <td>
                      {r.photo_url && (
                        <img src={r.photo_url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, cursor: 'zoom-in' }}
                          onClick={() => setZoomPhoto(r.photo_url)} />
                      )}
                    </td>
                    <td>{r.users?.name || '—'}</td>
                    <td>{new Date(r.submitted_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddReadingModal
          types={types}
          selectedType={selectedType}
          period={period}
          propertyId={displayProp}
          isAdmin={isAdmin}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); addToast('Показания сохранены', 'success'); }}
          addToast={addToast}
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

function AddReadingModal({ types, selectedType, period, propertyId, isAdmin, onClose, onSaved, addToast }) {
  const [typeId, setTypeId] = useState(selectedType?.id || types[0]?.id || '');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [propId, setPropId] = useState(propertyId || '');
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!propId) return addToast('Выберите объект', 'error');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('property_id', propId);
      fd.append('utility_type_id', typeId);
      fd.append('period', period);
      if (value) fd.append('reading_value', value);
      if (note) fd.append('note', note);
      if (photo) fd.append('photo', photo);
      await api.addReading(fd);
      onSaved();
    } catch (e) { addToast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const selectedTypeMeta = types.find(t => t.id === typeId);

  return (
    <Modal
      title="📊 Внести показания"
      onClose={onClose}
      actions={
        <>
          <button className="btn btn-outline" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
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
          <label className="form-label">Вид услуги</label>
          <select className="form-select" value={typeId} onChange={e => setTypeId(e.target.value)}>
            {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {selectedTypeMeta?.has_meter && (
          <div className="form-group">
            <label className="form-label">Показание {selectedTypeMeta?.unit ? `(${selectedTypeMeta.unit})` : ''}</label>
            <input
              type="number"
              className="form-input"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Введите значение с счётчика"
              step="0.001"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Фото счётчика (необязательно)</label>
          <input type="file" accept="image/*" capture="environment" ref={fileRef} style={{ display: 'none' }} onChange={handleFile} />
          <div className="file-drop" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <div className="file-preview"><img src={preview} alt="" /></div>
            ) : (
              <>📷 Нажмите для фото или выберите файл</>
            )}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Примечание</label>
          <textarea className="form-textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="Необязательно" rows={2} />
        </div>
      </form>
    </Modal>
  );
}
