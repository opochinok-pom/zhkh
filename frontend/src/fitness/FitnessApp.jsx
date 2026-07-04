import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ExerciseCard from './components/ExerciseCard.jsx';
import BodyLogPanel from './components/BodyLogPanel.jsx';
import AdaptiveBanner from './components/AdaptiveBanner.jsx';
import ToastContainer from '../components/Toast.jsx';
import { fetchFitnessState, fetchBodyLogs } from './api.js';
import {
  DAY_ORDER, DAY_NAMES, DAY_TYPES, blocksForDay,
  PULLUP_STAGES, RUN_STAGES,
} from './data/plan.js';

const DAY_TIME = { strength: '43–47 мин', cardio: '38–42 мин' };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function ProgressionRail({ title, color, stages, stageIndex }) {
  return (
    <div className="f-rail">
      <div className="f-rail-title" style={{ color }}>{title}</div>
      {stages.map((s, i) => (
        <div className={`f-rail-row ${i === stageIndex ? 'f-rail-active' : i < stageIndex ? 'f-rail-done' : ''}`} key={s.name}>
          <span className="f-rail-mark">{i < stageIndex ? '✓' : i === stageIndex ? '●' : '○'}</span>
          <div className="f-rail-body">
            <div className="f-rail-name">{s.name}</div>
            <div className="f-rail-desc">{s.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FitnessApp({ onNavigate }) {
  const [activeDay, setActiveDay] = useState('mon');
  const [states, setStates] = useState({});
  const [latestBodyLog, setLatestBodyLog] = useState(null);
  const [sleepWarning, setSleepWarning] = useState(null);
  const [bodyLogs, setBodyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBodyPanel, setShowBodyPanel] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500);
  }, []);

  const loadState = useCallback(async () => {
    try {
      const [stateRes, logs] = await Promise.all([fetchFitnessState(), fetchBodyLogs()]);
      const map = {};
      (stateRes.states || []).forEach(s => { map[s.exercise_id] = s; });
      setStates(map);
      setLatestBodyLog(stateRes.latestBodyLog);
      setSleepWarning(stateRes.sleepWarning);
      setBodyLogs(logs);
    } catch (e) {
      addToast('Ошибка загрузки: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadState(); }, [loadState]);

  const handleLogged = useCallback((exerciseId, state) => {
    setStates(prev => ({ ...prev, [exerciseId]: state }));
  }, []);

  const blocks = blocksForDay(activeDay);
  const dayType = DAY_TYPES[activeDay];
  const totalCalories = useMemo(
    () => blocks.flatMap(b => b.exercises).reduce((s, e) => s + (e.calories || 0), 0),
    [blocks]
  );

  const pullupState = states['s-negative-pullups'];
  const runState = states['c-run-walk-intervals'];

  if (loading) {
    return (
      <div className="f-app">
        <div className="f-loader">Загрузка фитнес-плана…</div>
      </div>
    );
  }

  return (
    <div className="f-app">
      <header className="f-hdr">
        <div className="f-hdr-top">
          <div>
            <div className="f-hdr-lbl">Персональная программа</div>
            <div className="f-hdr-ttl">Фитнес-план — Зал</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="f-badge-gym">СПОРТЗАЛ</span>
            <div className="f-prf">
              {latestBodyLog?.weight_kg ?? '—'} кг · 184 см
            </div>
            <div className="f-hdr-actions">
              <button className="f-link" onClick={() => onNavigate?.('zhkh')}>← ЖКХ</button>
              <button className="fbtn fbtn-outline" onClick={() => setShowBodyPanel(true)}>📋 Дневник тела</button>
            </div>
          </div>
        </div>

        <div className="f-stat-row">
          <div className="f-stat" style={{ borderColor: '#1E2A1A' }}>
            <div className="f-stat-v f-good">{latestBodyLog?.resting_hr ?? '—'}<span className="f-stat-u"> уд/мин</span></div>
            <div className="f-stat-l">ЧСС покоя</div>
          </div>
          <div className="f-stat" style={{ borderColor: '#2A1E0E' }}>
            <div className="f-stat-v f-amber">{latestBodyLog?.vo2max ?? '—'}<span className="f-stat-u"> МПК</span></div>
            <div className="f-stat-l">VO2max</div>
          </div>
          <div className="f-stat" style={{ borderColor: '#1E2A1A' }}>
            <div className="f-stat-v f-good">{latestBodyLog?.spo2 ?? '—'}<span className="f-stat-u"> %</span></div>
            <div className="f-stat-l">SpO2</div>
          </div>
        </div>

        <div className="f-tabs">
          {DAY_ORDER.map(d => {
            const isStrength = DAY_TYPES[d] === 'strength';
            const cls = d === activeDay ? (isStrength ? 'f-tab-s' : 'f-tab-c') : '';
            return (
              <button key={d} className={`f-tab ${cls}`} onClick={() => setActiveDay(d)}>
                <div className="f-tab-l">{DAY_NAMES[d].slice(0, 2)}</div>
                <div className="f-tab-t">{isStrength ? 'СИЛА' : 'КАРДИО'}</div>
              </button>
            );
          })}
        </div>
      </header>

      <AdaptiveBanner sleepWarning={sleepWarning} latestBodyLog={latestBodyLog} />

      <main className="f-main">
        <div className="f-day-head">
          <div>
            <span className="f-day-type" style={{ color: dayType === 'strength' ? '#F97316' : '#6366F1' }}>
              {dayType === 'strength' ? 'СИЛА' : 'КАРДИО'} ·{' '}
            </span>
            <span className="f-day-name">{DAY_NAMES[activeDay]}</span>
          </div>
          <div className="f-day-meta">
            <div className="f-day-mi">
              <div className="f-day-mv" style={{ color: dayType === 'strength' ? '#F97316' : '#6366F1' }}>{DAY_TIME[dayType]}</div>
              <div className="f-day-ml">время</div>
            </div>
            <div className="f-day-mi">
              <div className="f-day-mv f-amber">~{totalCalories} ккал</div>
              <div className="f-day-ml">калории</div>
            </div>
          </div>
        </div>

        {blocks.map(block => (
          <div className="f-block" key={block.key}>
            <div className="f-block-head">
              <div className="f-block-bar" style={{ background: block.color }} />
              <span className="f-block-title" style={{ color: block.color }}>{block.title}</span>
              {block.goal && (
                <span className="f-block-goal" style={{ color: block.color, background: block.color + '22', borderColor: block.color + '44' }}>
                  ЦЕЛЬ: {block.goal}
                </span>
              )}
            </div>
            {block.exercises.map(ex => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                state={states[ex.id]}
                dayKey={activeDay}
                logDate={todayISO()}
                color={block.color}
                onLogged={handleLogged}
                addToast={addToast}
              />
            ))}
          </div>
        ))}

        <ProgressionRail title="💪 ПРОГРЕССИЯ — ПОДТЯГИВАНИЯ" color="#3B82F6" stages={PULLUP_STAGES} stageIndex={pullupState?.stage_index || 0} />
        <ProgressionRail title="🏃 ПРОГРЕССИЯ — БЕГ 10 КМ" color="#6366F1" stages={RUN_STAGES} stageIndex={runState?.stage_index || 0} />
      </main>

      {showBodyPanel && (
        <BodyLogPanel
          onClose={() => setShowBodyPanel(false)}
          onSaved={loadState}
          bodyLogs={bodyLogs}
          addToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default FitnessApp;
