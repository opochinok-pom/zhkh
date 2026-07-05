import React, { useEffect, useState } from 'react';
import { fetchHistory, deleteHistoryItem } from '../api.js';

const fmtDate = iso => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const fmt = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

function HistoryDrawer({ onClose, onSelect, addToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await fetchHistory(30));
    } catch (e) {
      addToast('Ошибка загрузки истории: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteHistoryItem(id);
      setItems(prev => prev.filter(x => x.id !== id));
    } catch (err) {
      addToast('Ошибка удаления: ' + err.message, 'error');
    }
  };

  return (
    <div className="i-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="i-panel">
        <div className="i-panel-head">
          <h2>📋 История анализов</h2>
          <button className="i-btn i-btn-ghost i-btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="i-panel-body">
          {loading && <div className="i-dim">Загрузка…</div>}
          {!loading && items.length === 0 && <div className="i-dim">Пока нет сохранённых анализов</div>}
          <div className="i-history-list">
            {items.map(it => (
              <div className="i-history-item" key={it.id} onClick={() => onSelect(it.id)}>
                <div className="i-history-top">
                  <span className="i-history-date">{fmtDate(it.created_at)}</span>
                  <button className="i-btn i-btn-ghost i-btn-icon i-history-del" onClick={e => handleDelete(e, it.id)}>🗑</button>
                </div>
                <div className="i-history-mid">
                  {it.broker && <strong>{it.broker}</strong>}{' '}
                  {it.total_value != null && <span>{fmt(it.total_value)} {it.currency}</span>}
                </div>
                <div className="i-history-sub">{it.screenshot_count} скрин(ов)</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoryDrawer;
