import React, { useCallback, useRef, useState } from 'react';
import UploadZone from './components/UploadZone.jsx';
import PositionsTable from './components/PositionsTable.jsx';
import SectionsGrid from './components/SectionsGrid.jsx';
import NewsList from './components/NewsList.jsx';
import HistoryDrawer from './components/HistoryDrawer.jsx';
import ToastContainer from '../components/Toast.jsx';
import { analyzePortfolio, fetchHistoryItem } from './api.js';
import { compressImage } from './utils.js';

const STAGES = [
  'Распознаём скриншоты портфеля…',
  'Ищем свежие новости по позициям…',
  'Собираем анализ по 10 разделам…',
];

function InvestApp() {
  const [shots, setShots] = useState([]); // [{id, file, preview}]
  const [instructions, setInstructions] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [toasts, setToasts] = useState([]);
  const stageTimer = useRef(null);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  const handleAdd = useCallback(async files => {
    for (const file of files) {
      try {
        const compressed = await compressImage(file);
        const id = Date.now() + Math.random();
        const preview = URL.createObjectURL(compressed);
        setShots(prev => [...prev, { id, file: compressed, preview }]);
      } catch (e) {
        addToast('Не удалось обработать изображение: ' + e.message, 'error');
      }
    }
  }, [addToast]);

  const handleRemove = useCallback(id => {
    setShots(prev => {
      const found = prev.find(s => s.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const handleAnalyze = async () => {
    if (shots.length === 0) return;
    setAnalyzing(true);
    setStage(0);
    let step = 0;
    stageTimer.current = setInterval(() => {
      step = Math.min(step + 1, STAGES.length - 1);
      setStage(step);
    }, 4000);

    try {
      const data = await analyzePortfolio(shots.map(s => s.file), instructions);
      setResult(data);
      addToast('Анализ портфеля готов', 'success');
    } catch (e) {
      addToast('Ошибка анализа: ' + e.message, 'error');
    } finally {
      clearInterval(stageTimer.current);
      setAnalyzing(false);
    }
  };

  const handleSelectHistory = async id => {
    try {
      const data = await fetchHistoryItem(id);
      setResult(data);
      setShowHistory(false);
    } catch (e) {
      addToast('Ошибка загрузки отчёта: ' + e.message, 'error');
    }
  };

  const fmt = n => n === null || n === undefined ? '—' : Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 0 });

  return (
    <div className="i-app">
      <header className="i-hdr">
        <div className="i-hdr-top">
          <div>
            <div className="i-hdr-lbl">Личные финансы</div>
            <div className="i-hdr-ttl">Инвестиции — анализ портфеля</div>
          </div>
          <button className="i-btn i-btn-outline" onClick={() => setShowHistory(true)}>📋 История</button>
        </div>

        {result && (
          <div className="i-stat-row">
            <div className="i-stat">
              <div className="i-stat-v">{fmt(result.total_value)}<span className="i-stat-u"> {result.currency || ''}</span></div>
              <div className="i-stat-l">Стоимость портфеля</div>
            </div>
            <div className="i-stat">
              <div className="i-stat-v">{result.positions?.length ?? '—'}</div>
              <div className="i-stat-l">Позиций</div>
            </div>
            <div className="i-stat">
              <div className="i-stat-v">{result.broker || '—'}</div>
              <div className="i-stat-l">Брокер</div>
            </div>
          </div>
        )}
      </header>

      <main className="i-main">
        <div className="i-card">
          <div className="i-card-head"><span className="i-card-title">📎 Скриншоты портфеля</span></div>
          <UploadZone shots={shots} onAdd={handleAdd} onRemove={handleRemove} disabled={analyzing} />

          <label className="i-instructions-label" htmlFor="i-instructions">Поручение для анализа (необязательно)</label>
          <textarea
            id="i-instructions"
            className="i-instructions-input"
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            disabled={analyzing}
            placeholder="Например: брокер — Сбер, не учитывай облигации, планирую докупить акции IT-сектора…"
            rows={2}
          />

          <button
            className="i-btn i-btn-primary i-analyze-btn"
            onClick={handleAnalyze}
            disabled={shots.length === 0 || analyzing}
          >
            {analyzing ? (
              <><span className="i-spinner" /> {STAGES[stage]}</>
            ) : (
              <>🔍 Анализ</>
            )}
          </button>
        </div>

        {result && (
          <>
            {result.instructions && (
              <div className="i-card i-instructions-note">
                <span className="i-card-title">📝 Поручение к этому анализу</span>
                <p>{result.instructions}</p>
              </div>
            )}
            <PositionsTable portfolio={result} />
            <SectionsGrid sections={result.sections} />
            <NewsList news={result.news} />
          </>
        )}

        {!result && !analyzing && (
          <div className="i-hint-block">
            Прикрепите один или несколько скриншотов вашего портфеля (брокерское приложение, терминал, таблица)
            и нажмите «Анализ» — ИИ распознает позиции, найдёт актуальные новости и подготовит полный отчёт из 10 разделов.
          </div>
        )}
      </main>

      {showHistory && (
        <HistoryDrawer onClose={() => setShowHistory(false)} onSelect={handleSelectHistory} addToast={addToast} />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default InvestApp;
