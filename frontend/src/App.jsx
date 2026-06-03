import React, { useState, useEffect, useCallback } from 'react';
import PayTable from './components/PayTable.jsx';
import YearTable from './components/YearTable.jsx';
import AIPanel from './components/AIPanel.jsx';
import HistoryPanel from './components/HistoryPanel.jsx';
import CommandBar from './components/CommandBar.jsx';
import ToastContainer from './components/Toast.jsx';
import { fetchPayments, upsertPayment } from './api.js';

export const MONTHS = [
  'январь','февраль','март','апрель','май','июнь',
  'июль','август','сентябрь','октябрь','ноябрь','декабрь'
];

export const PROPERTIES = [
  'Арнеево','Л25/28','Л45/190','С29/42',
  'О5.1/750','О5.1/888','Н510','НКл78','АлП/396','АлП/397'
];

export const SERVICES = [
  'Членский взнос','Коммунальный платеж','Гольфстрим',
  'Электроэнергия','Холодная вода, водоотведение',
  'ТКО','МОЭК','Капремонт','Интернет'
];

const API = import.meta.env.VITE_API_URL || '';


function App() {
  const [payments, setPayments]     = useState([]);   // [{id,month,service,property,amount}]
  const [loading, setLoading]       = useState(true);
  const [activeMonth, setActiveMonth] = useState('январь');
  const [viewMode, setViewMode]     = useState('month'); // 'month' | 'year'
  const [showAI, setShowAI]         = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toasts, setToasts]         = useState([]);
  const [saving, setSaving]         = useState(false);

  // ── Load all data once ─────────────────────────────────────────────────────
  const loadPayments = useCallback(async () => {
    try {
      const data = await fetchPayments();
      setPayments(data);
    } catch (e) {
      console.error('fetchPayments error:', e);
      addToast('Ошибка загрузки: ' + (e.message || String(e)), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  // ── Upsert single cell ─────────────────────────────────────────────────────
  const handleCellSave = useCallback(async (month, service, property, amount) => {
    setSaving(true);
    try {
      const saved = await upsertPayment(month, service, property, amount);
      // Обновляем локальный стейт напрямую — не доверяем ответу Supabase upsert,
      // который может вернуть пустой массив при обновлении существующей записи
      const normalized = {
        month,
        service,
        property,
        amount: amount === '' || amount === null ? null : Number(amount),
        ...(saved || {}),
      };
      setPayments(prev => {
        const idx = prev.findIndex(
          p => p.month === month && p.service === service && p.property === property
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = normalized;
          return next;
        }
        return [...prev, normalized];
      });
      addToast(`Сохранено: ${property} / ${service}`, 'success');
    } catch (e) {
      addToast('Ошибка сохранения: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }, []);

  // ── Apply AI result ────────────────────────────────────────────────────────
  const handleAIResult = useCallback(async (result) => {
    if (!result.month || !result.service || !result.property) return;
    await handleCellSave(result.month, result.service, result.property, result.amount);
    setActiveMonth(result.month);
    setViewMode('month');
    setShowAI(false);
  }, [handleCellSave]);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Месяц', 'Услуга', 'Объект', 'Сумма']];
    MONTHS.forEach(m =>
      SERVICES.forEach(s =>
        PROPERTIES.forEach(p => {
          const pay = payments.find(x => x.month === m && x.service === s && x.property === p);
          rows.push([m, s, p, pay?.amount ?? '']);
        })
      )
    );
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'zhkh_2026.csv'; a.click();
    URL.revokeObjectURL(url);
    addToast('CSV экспортирован', 'success');
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const getStats = () => {
    const monthPays = payments.filter(p => p.month === activeMonth);
    const total = monthPays.reduce((s, p) => s + (p.amount || 0), 0);
    const filled = SERVICES.length * PROPERTIES.length;
    const nullCount = filled - monthPays.filter(p => p.amount !== null).length;
    const yearTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
    return { total, nullCount, yearTotal };
  };

  const stats = getStats();
  const fmt = n => n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  // ── Lookup helper for tables ───────────────────────────────────────────────
  const getValue = useCallback((month, service, property) => {
    const p = payments.find(
      x => x.month === month && x.service === service && x.property === property
    );
    return p ? p.amount : null;
  }, [payments]);

  if (loading) return (
    <div className="app">
      <div className="loader">
        <div className="spinner" />
        <span>Загрузка данных…</span>
        <span style={{fontSize:'.7rem',opacity:.5,marginTop:8}}>Подключение к Supabase…</span>
      </div>
    </div>
  );

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-logo">
          <span className="icon">🏠</span>
          <h1>ЖКХ 2026</h1>
        </div>

        <div className="header-center">
          <div className="month-tabs">
            <button
              className={`month-tab ${viewMode === 'year' ? 'active all-mode' : ''}`}
              onClick={() => setViewMode('year')}
            >ВСЕ</button>
            {MONTHS.map(m => (
              <button
                key={m}
                className={`month-tab ${viewMode === 'month' && activeMonth === m ? 'active' : ''}`}
                onClick={() => { setActiveMonth(m); setViewMode('month'); }}
              >
                {m.slice(0,3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="header-right">
          {saving && <span className="text-dim" style={{ fontSize: '.75rem' }}>⏳</span>}
          <button className="btn btn-outline btn-icon" title="История" onClick={() => setShowHistory(true)}>📋</button>
          <button className="btn btn-outline btn-icon" title="AI-квитанция" onClick={() => setShowAI(true)}>🤖</button>
          <button className="btn btn-gold btn-icon" title="Экспорт CSV" onClick={exportCSV}>⬇ CSV</button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main">
        {/* Stats */}
        {viewMode === 'month' && (
          <div className="stats-bar">
            <div className="stat-card">
              <span className="stat-label">Месяц</span>
              <span className="stat-value" style={{ textTransform: 'capitalize' }}>{activeMonth}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Итого за месяц</span>
              <span className="stat-value">{fmt(stats.total)} ₽</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Итого за год</span>
              <span className="stat-value">{fmt(stats.yearTotal)} ₽</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Незаполнено</span>
              <span className={`stat-value ${stats.nullCount > 0 ? 'warn' : 'ok'}`}>
                {stats.nullCount} ячеек
              </span>
            </div>
          </div>
        )}

        {/* Command bar */}
        <CommandBar
          onResult={handleAIResult}
          addToast={addToast}
        />

        {/* Warning for empty cells */}
        {viewMode === 'month' && stats.nullCount > 0 && (
          <div className="null-bar">
            <span className="warn-icon">⚠️</span>
            <strong>{stats.nullCount} незаполненных ячеек</strong>
            <span>в {activeMonth}</span>
          </div>
        )}

        {/* Table */}
        <div className="table-wrapper">
          {viewMode === 'month' ? (
            <PayTable
              month={activeMonth}
              getValue={getValue}
              onSave={handleCellSave}
            />
          ) : (
            <YearTable
              payments={payments}
              getValue={getValue}
              onSave={handleCellSave}
            />
          )}
        </div>
      </main>

      {/* ── Panels ── */}
      {showAI && (
        <AIPanel
          onClose={() => setShowAI(false)}
          onApply={handleAIResult}
          addToast={addToast}
        />
      )}

      {showHistory && (
        <HistoryPanel
          onClose={() => setShowHistory(false)}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default App;
