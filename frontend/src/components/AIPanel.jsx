import React, { useState, useRef } from 'react';
import { parseReceiptAI } from '../api.js';
import { MONTHS, SERVICES, PROPERTIES } from '../App.jsx';

function AIPanel({ onClose, onApply, addToast }) {
  const [tab, setTab] = useState('receipt'); // 'receipt' | 'edit'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef(null);

  // Editable result fields
  const [editResult, setEditResult] = useState(null);

  const handleFile = async file => {
    if (!file || !file.type.startsWith('image/')) {
      addToast('Только изображения', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = e => setImgSrc(e.target.result);
    reader.readAsDataURL(file);

    setLoading(true); setResult(null);
    try {
      const data = await parseReceiptAI(file);
      setResult(data);
      setEditResult({ ...data });
      addToast('Квитанция распознана!', 'success');
    } catch (e) {
      addToast('Ошибка AI: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = e => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleApply = () => {
    if (!editResult) return;
    onApply(editResult);
  };

  const confClass = c => c === 'high' ? 'conf-high' : c === 'medium' ? 'conf-medium' : 'conf-low';

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel">
        <div className="panel-header">
          <h2>🤖 AI-помощник</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[['receipt','📷 Квитанция'], ['edit','✏️ Ручной ввод']].map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', border: 'none', cursor: 'pointer',
                background: tab === t ? 'var(--gold-glow)' : 'transparent',
                color: tab === t ? 'var(--gold-lt)' : 'var(--text-dim)',
                borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent',
                fontWeight: tab === t ? 700 : 400, fontSize: '.82rem', transition: 'all .15s'
              }}
            >{label}</button>
          ))}
        </div>

        <div className="panel-body">
          {tab === 'receipt' && (
            <>
              {/* Upload zone */}
              <div
                className={`upload-zone ${drag ? 'drag-over' : ''}`}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="upload-icon">📄</div>
                <p>Перетащите фото квитанции</p>
                <p style={{ marginTop: 4, fontSize: '.75rem', color: 'var(--text-dim)' }}>
                  или нажмите для выбора файла
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>

              {/* Camera button on mobile */}
              <button
                className="btn btn-outline"
                onClick={() => {
                  const inp = document.createElement('input');
                  inp.type = 'file'; inp.accept = 'image/*'; inp.capture = 'environment';
                  inp.onchange = e => handleFile(e.target.files[0]);
                  inp.click();
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >📸 Сфотографировать квитанцию</button>

              {/* Loading */}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gold)' }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  <span>AI анализирует квитанцию…</span>
                </div>
              )}

              {/* Image preview */}
              {imgSrc && !loading && (
                <img src={imgSrc} className="img-preview" alt="Квитанция" />
              )}

              {/* Result */}
              {editResult && !loading && (
                <>
                  <div className="ai-result">
                    <div className="ai-result-field">
                      <span className="ai-result-label">Месяц</span>
                      <select
                        value={editResult.month || ''}
                        onChange={e => setEditResult(r => ({ ...r, month: e.target.value }))}
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--gold-lt)', padding: '4px 8px', borderRadius: 4 }}
                      >
                        <option value="">—</option>
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div className="ai-result-field">
                      <span className="ai-result-label">
                        Уверенность: <span className={confClass(result?.confidence)}>{result?.confidence}</span>
                      </span>
                      <select
                        value={editResult.property || ''}
                        onChange={e => setEditResult(r => ({ ...r, property: e.target.value }))}
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--gold-lt)', padding: '4px 8px', borderRadius: 4 }}
                      >
                        <option value="">— объект —</option>
                        {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="ai-result-field" style={{ gridColumn: 'span 2' }}>
                      <span className="ai-result-label">Услуга</span>
                      <select
                        value={editResult.service || ''}
                        onChange={e => setEditResult(r => ({ ...r, service: e.target.value }))}
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--gold-lt)', padding: '4px 8px', borderRadius: 4, width: '100%' }}
                      >
                        <option value="">— услуга —</option>
                        {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="ai-result-field ai-result-amount">
                      <span className="ai-result-label">Сумма, ₽</span>
                      <input
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--green)', padding: '4px 8px', borderRadius: 4, fontSize: '1.2rem', fontWeight: 700, width: '100%' }}
                        value={editResult.amount ?? ''}
                        onChange={e => setEditResult(r => ({ ...r, amount: e.target.value }))}
                        inputMode="decimal"
                      />
                    </div>
                    {result?.comment && (
                      <div style={{ gridColumn: 'span 2', fontSize: '.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        💬 {result.comment}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-gold"
                    onClick={handleApply}
                    style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    disabled={!editResult.month || !editResult.service || !editResult.property}
                  >
                    ✅ Применить в таблицу
                  </button>
                </>
              )}
            </>
          )}

          {tab === 'edit' && (
            <ManualEntry onApply={onApply} onClose={onClose} addToast={addToast} />
          )}
        </div>
      </div>
    </div>
  );
}

function ManualEntry({ onApply }) {
  const [form, setForm] = useState({ month: '', service: '', property: '', amount: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const valid = form.month && form.service && form.property && form.amount !== '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>Месяц</label>
          <select value={form.month} onChange={set('month')} style={{ width: '100%' }}>
            <option value="">— выберите —</option>
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>Объект</label>
          <select value={form.property} onChange={set('property')} style={{ width: '100%' }}>
            <option value="">— выберите —</option>
            {PROPERTIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>Услуга</label>
          <select value={form.service} onChange={set('service')} style={{ width: '100%' }}>
            <option value="">— выберите —</option>
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '.72rem', color: 'var(--text-dim)', marginBottom: 4 }}>Сумма, ₽</label>
          <input
            className="command-input"
            type="number"
            step="0.01"
            value={form.amount}
            onChange={set('amount')}
            placeholder="0.00"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <button
        className="btn btn-gold"
        onClick={() => onApply(form)}
        disabled={!valid}
        style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
      >✅ Сохранить</button>
    </div>
  );
}

export default AIPanel;
