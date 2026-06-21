import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

const ACTION_MAP = {
  reading_submitted: { icon: '📊', label: 'Внёс показания' },
  request_submitted: { icon: '🔧', label: 'Подал заявку' },
};

export default function ActivityLog({ addToast }) {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.activity()
      .then(setLog)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="section-title mb-3">📋 Журнал активности</h2>

      {loading && <div className="spinner" />}

      {!loading && log.length === 0 && (
        <div className="empty">
          <span className="icon">📋</span>
          <p>Активности пока нет</p>
        </div>
      )}

      {!loading && log.length > 0 && (
        <div className="card">
          {log.map(entry => {
            const info = ACTION_MAP[entry.action_type] || { icon: '•', label: entry.action_type };
            const details = entry.details || {};
            return (
              <div key={entry.id} className="activity-item">
                <div className="activity-icon">{info.icon}</div>
                <div className="activity-body">
                  <div className="activity-text">
                    <strong>{entry.users?.name || 'Неизвестно'}</strong>
                    {entry.property_id && (
                      <span style={{ margin: '0 6px', background: 'var(--blue-light)', color: 'var(--blue)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>
                        Объект {entry.property_id}
                      </span>
                    )}
                    {info.label}
                    {details.title && `: «${details.title}»`}
                    {details.period && ` за ${details.period}`}
                    {details.utility_type_id && ` (${details.utility_type_id})`}
                    {details.reading_value != null && ` = ${details.reading_value}`}
                  </div>
                  <div className="activity-time">
                    {new Date(entry.created_at).toLocaleString('ru-RU', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
