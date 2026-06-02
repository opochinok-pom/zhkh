import React, { useState, useRef, useEffect } from 'react';
import { MONTHS, PROPERTIES, SERVICES } from '../App.jsx';

function EditableCell({ month, service, property, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const fmt = v =>
    v === null || v === undefined ? null
    : Number(v).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const startEdit = () => {
    setDraft(value !== null && value !== undefined ? String(value) : '');
    setEditing(true);
  };

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = draft.trim().replace(',', '.');
    const parsed = num === '' ? null : parseFloat(num);
    if (isNaN(parsed) && num !== '') return;
    const next = num === '' ? null : parsed;
    if (value !== next) onSave(month, service, property, next);
  };

  const onKey = e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  const isEmpty = value === null || value === undefined;

  return (
    <td className={`cell-value ${editing ? 'editing' : ''} ${isEmpty ? 'cell-null-warn' : ''}`}
      style={{ minWidth: 72 }}>
      {editing ? (
        <input
          ref={inputRef}
          className="cell-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKey}
          placeholder="0"
          inputMode="decimal"
        />
      ) : (
        <div
          className={`cell-inner ${isEmpty ? 'empty' : ''}`}
          onClick={startEdit}
          style={{ fontSize: '.78rem', minHeight: 28 }}
        >
          <span>{isEmpty ? '—' : fmt(value)}</span>
        </div>
      )}
    </td>
  );
}

function YearTable({ getValue, onSave }) {
  const [groupBy, setGroupBy] = useState('month'); // 'month' | 'service'

  const fmt = v =>
    !v ? '—'
    : v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // Totals
  const propYearTotal = p =>
    MONTHS.reduce((s, m) =>
      SERVICES.reduce((ss, svc) => ss + (getValue(m, svc, p) || 0), s), 0);

  const monthTotal = m =>
    SERVICES.reduce((s, svc) =>
      PROPERTIES.reduce((ss, p) => ss + (getValue(m, svc, p) || 0), s), 0);

  const grandTotal = PROPERTIES.reduce((s, p) => s + propYearTotal(p), 0);

  // ── View: grouped by month ─────────────────────────────────────────────────
  if (groupBy === 'month') {
    return (
      <div>
        <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '.78rem' }}>Группировка:</span>
          <button
            className={`btn btn-icon ${groupBy === 'month' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setGroupBy('month')}
            style={{ fontSize: '.75rem', padding: '4px 10px' }}
          >По месяцам</button>
          <button
            className={`btn btn-icon ${groupBy === 'service' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => setGroupBy('service')}
            style={{ fontSize: '.75rem', padding: '4px 10px' }}
          >По услугам</button>
        </div>
        <table className="pay-table" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th className="col-service" style={{ minWidth: 160 }}>Услуга</th>
              {PROPERTIES.map(p => <th key={p} style={{ fontSize: '.72rem' }}>{p}</th>)}
              <th style={{ minWidth: 90 }}>ИТОГО</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map(month => {
              const mTotal = monthTotal(month);
              const mPropTotal = p => SERVICES.reduce((s, svc) => s + (getValue(month, svc, p) || 0), 0);

              return (
                <React.Fragment key={month}>
                  {/* Month header row */}
                  <tr className="month-header">
                    <td colSpan={PROPERTIES.length + 2} style={{ fontWeight: 700, textTransform: 'capitalize', paddingLeft: 12 }}>
                      📅 {month} — {mTotal > 0 ? mTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽' : 'нет данных'}
                    </td>
                  </tr>
                  {/* Service rows */}
                  {SERVICES.map(s => {
                    const rowT = PROPERTIES.reduce((sum, p) => sum + (getValue(month, s, p) || 0), 0);
                    return (
                      <tr key={s}>
                        <td className="cell-service" style={{ paddingLeft: 20, fontSize: '.78rem', fontWeight: 500 }}>{s}</td>
                        {PROPERTIES.map(p => (
                          <EditableCell
                            key={p}
                            month={month}
                            service={s}
                            property={p}
                            value={getValue(month, s, p)}
                            onSave={onSave}
                          />
                        ))}
                        <td style={{ textAlign: 'right', padding: '4px 8px', fontSize: '.78rem', color: 'var(--gold-lt)', fontWeight: 600 }}>
                          {fmt(rowT)}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Month totals row */}
                  <tr className="row-total" style={{ opacity: .9 }}>
                    <td className="cell-service" style={{ fontSize: '.78rem', textTransform: 'capitalize' }}>
                      Итого {month}
                    </td>
                    {PROPERTIES.map(p => (
                      <td key={p} className="cell-col-total" style={{ fontSize: '.78rem' }}>{fmt(mPropTotal(p))}</td>
                    ))}
                    <td className="cell-col-total" style={{ color: 'var(--gold-lt)' }}>{fmt(mTotal)}</td>
                  </tr>
                </React.Fragment>
              );
            })}
            {/* Year grand total */}
            <tr className="row-year-total">
              <td className="cell-service" style={{ fontSize: '.88rem' }}>🏆 ИТОГО ЗА ГОД</td>
              {PROPERTIES.map(p => (
                <td key={p} className="cell-col-total" style={{ fontSize: '.82rem' }}>{fmt(propYearTotal(p))}</td>
              ))}
              <td className="cell-col-total" style={{ fontSize: '.95rem', color: 'var(--gold-lt)' }}>
                {grandTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  // ── View: grouped by service ───────────────────────────────────────────────
  return (
    <div>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--text-dim)', fontSize: '.78rem' }}>Группировка:</span>
        <button
          className={`btn ${groupBy === 'month' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setGroupBy('month')}
          style={{ fontSize: '.75rem', padding: '4px 10px' }}
        >По месяцам</button>
        <button
          className={`btn ${groupBy === 'service' ? 'btn-gold' : 'btn-ghost'}`}
          onClick={() => setGroupBy('service')}
          style={{ fontSize: '.75rem', padding: '4px 10px' }}
        >По услугам</button>
      </div>
      <table className="pay-table" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th className="col-service" style={{ minWidth: 160 }}>Месяц</th>
            {PROPERTIES.map(p => <th key={p} style={{ fontSize: '.72rem' }}>{p}</th>)}
            <th>ИТОГО</th>
          </tr>
        </thead>
        <tbody>
          {SERVICES.map(svc => {
            const svcPropTotal = p => MONTHS.reduce((s, m) => s + (getValue(m, svc, p) || 0), 0);
            const svcTotal = PROPERTIES.reduce((s, p) => s + svcPropTotal(p), 0);

            return (
              <React.Fragment key={svc}>
                <tr className="month-header">
                  <td colSpan={PROPERTIES.length + 2} style={{ fontWeight: 700, paddingLeft: 12 }}>
                    💡 {svc} — {svcTotal > 0 ? svcTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 }) + ' ₽' : 'нет данных'}
                  </td>
                </tr>
                {MONTHS.map(m => {
                  const rowT = PROPERTIES.reduce((s, p) => s + (getValue(m, svc, p) || 0), 0);
                  return (
                    <tr key={m}>
                      <td className="cell-service" style={{ paddingLeft: 20, fontSize: '.78rem', fontWeight: 500, textTransform: 'capitalize' }}>{m}</td>
                      {PROPERTIES.map(p => (
                        <EditableCell
                          key={p}
                          month={m}
                          service={svc}
                          property={p}
                          value={getValue(m, svc, p)}
                          onSave={onSave}
                        />
                      ))}
                      <td style={{ textAlign: 'right', padding: '4px 8px', fontSize: '.78rem', color: 'var(--gold-lt)', fontWeight: 600 }}>
                        {fmt(rowT)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="row-total" style={{ opacity: .9 }}>
                  <td className="cell-service" style={{ fontSize: '.78rem' }}>Итого {svc}</td>
                  {PROPERTIES.map(p => (
                    <td key={p} className="cell-col-total" style={{ fontSize: '.78rem' }}>{fmt(svcPropTotal(p))}</td>
                  ))}
                  <td className="cell-col-total">{fmt(svcTotal)}</td>
                </tr>
              </React.Fragment>
            );
          })}
          <tr className="row-year-total">
            <td className="cell-service">🏆 ИТОГО ЗА ГОД</td>
            {PROPERTIES.map(p => (
              <td key={p} className="cell-col-total" style={{ fontSize: '.82rem' }}>{fmt(propYearTotal(p))}</td>
            ))}
            <td className="cell-col-total" style={{ fontSize: '.95rem', color: 'var(--gold-lt)' }}>
              {grandTotal.toLocaleString('ru-RU', { maximumFractionDigits: 0 })}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default YearTable;
