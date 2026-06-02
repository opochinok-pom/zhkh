import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PROPERTIES, SERVICES } from '../App.jsx';

function EditableCell({ month, service, property, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const fmt = v =>
    v === null || v === undefined
      ? null
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
    if (isNaN(parsed) && num !== '') return;   // invalid — ignore
    const old = value;
    const next = num === '' ? null : parsed;
    if (old !== next) onSave(month, service, property, next);
  };

  const onKey = e => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(false);
  };

  const isEmpty = value === null || value === undefined;

  return (
    <td
      className={`cell-value ${editing ? 'editing' : ''} ${isEmpty ? 'cell-null-warn' : ''}`}
    >
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
          title={isEmpty ? 'Нажмите для ввода' : `${service} / ${property}: ${fmt(value)} ₽`}
        >
          <span>{isEmpty ? '—' : fmt(value)}</span>
        </div>
      )}
    </td>
  );
}

function PayTable({ month, getValue, onSave }) {
  // Row totals
  const rowTotal = s => PROPERTIES.reduce((sum, p) => sum + (getValue(month, s, p) || 0), 0);
  // Col totals
  const colTotal = p => SERVICES.reduce((sum, s) => sum + (getValue(month, s, p) || 0), 0);
  const grandTotal = SERVICES.reduce((s, svc) => s + rowTotal(svc), 0);

  const fmt = v => v === 0 ? '—' : v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <table className="pay-table">
      <thead>
        <tr>
          <th className="col-service" style={{ textTransform: 'capitalize' }}>
            {month}
          </th>
          {PROPERTIES.map(p => (
            <th key={p}>{p}</th>
          ))}
          <th style={{ minWidth: 90 }}>ИТОГО</th>
        </tr>
      </thead>
      <tbody>
        {SERVICES.map(s => (
          <tr key={s}>
            <td className="cell-service">{s}</td>
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
            <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 700, color: 'var(--gold-lt)', whiteSpace: 'nowrap' }}>
              {fmt(rowTotal(s))}
            </td>
          </tr>
        ))}
        {/* Column totals */}
        <tr className="row-total">
          <td className="cell-service">ИТОГО</td>
          {PROPERTIES.map(p => (
            <td key={p} className="cell-col-total">{fmt(colTotal(p))}</td>
          ))}
          <td className="cell-col-total" style={{ color: 'var(--gold-lt)', fontSize: '.88rem' }}>
            {grandTotal.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default PayTable;
