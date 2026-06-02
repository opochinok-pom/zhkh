import React, { useState, useEffect } from 'react';
import { fetchHistory } from '../api.js';

function HistoryPanel({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchHistory()
      .then(data => setHistory(data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const fmt = v =>
    v === null || v === undefined ? 'пусто'
    : Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽';

  const fmtDate = s => {
    const d = new Date(s);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const filtered = filter
    ? history.filter(h =>
        [h.month, h.service, h.property].some(v => v?.toLowerCase().includes(filter.toLowerCase()))
      )
    : history;

  return (
    <div className="panel-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="panel" style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-header">
          <h2>📋 История изменений</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)' }}>
          <input
            className="command-input"
            placeholder="Поиск по месяцу, услуге, объекту…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div className="panel-body" style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="loader"><div className="spinner" /><span>Загрузка…</span></div>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>История пуста</p>
          ) : (
            <div className="history-list">
              {filtered.map(h => (
                <div key={h.id} className="history-item">
                  <div className="history-item-top">
                    <span className="history-badge" style={{ textTransform: 'capitalize' }}>{h.month}</span>
                    <span className="history-time">{fmtDate(h.changed_at)}</span>
                  </div>
                  <div className="history-item-mid">
                    <strong>{h.property}</strong> · {h.service}
                  </div>
                  <div className="history-change">
                    <span className="history-old">{fmt(h.old_amount)}</span>
                    <span className="history-arrow">→</span>
                    <span className="history-new">{fmt(h.new_amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', fontSize: '.75rem', color: 'var(--text-dim)' }}>
          Показано {filtered.length} из {history.length} записей
        </div>
      </div>
    </div>
  );
}

export default HistoryPanel;
