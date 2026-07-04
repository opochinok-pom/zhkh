import React, { useState } from 'react';
import { saveWorkoutLog } from '../api.js';
import { PULLUP_STAGES, RUN_STAGES } from '../data/plan.js';

const LOGGABLE_TYPES = ['strength', 'bodyweight_reps', 'hold_time', 'interval'];

function fmtRange(min, max, unit) {
  if (min == null) return null;
  return min === max ? `${min} ${unit}` : `${min}–${max} ${unit}`;
}

function ExerciseCard({ exercise, state, dayKey, logDate, color, onLogged, addToast }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reps, setReps] = useState('');
  const [setsDone, setSetsDone] = useState(exercise.sets || '');
  const [weight, setWeight] = useState(state?.current_weight_kg ?? exercise.weightMin ?? '');
  const [durationSec, setDurationSec] = useState(
    state?.current_reps_target ? Number(state.current_reps_target) : exercise.durationSec ?? ''
  );
  const [distanceKm, setDistanceKm] = useState('');
  const [durationMin, setDurationMin] = useState('');

  const stages = exercise.progressionKey === 'pullups' ? PULLUP_STAGES
    : exercise.progressionKey === 'running' ? RUN_STAGES : null;
  const stage = stages ? (stages[state?.stage_index || 0] || stages[stages.length - 1]) : null;

  const weightBadge = exercise.type === 'strength'
    ? (state?.current_weight_kg != null ? `${state.current_weight_kg} кг` : fmtRange(exercise.weightMin, exercise.weightMax, 'кг'))
    : null;

  const repsBadge = exercise.type === 'hold_time'
    ? `${exercise.sets} x ${state?.current_reps_target || exercise.durationSec} сек`
    : exercise.type === 'interval'
      ? `${exercise.rounds} x ${exercise.runMin} мин бег / ${exercise.walkMin} мин ходьба`
      : exercise.type === 'cardio_time'
        ? `${exercise.durationMin} мин`
        : `${exercise.sets} x ${exercise.reps}`;

  const canLog = LOGGABLE_TYPES.includes(exercise.type);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const entry = {
        logDate, dayKey, exerciseId: exercise.id, exerciseName: exercise.name,
        setsTarget: exercise.sets ?? null,
        repsTarget: exercise.reps != null ? String(exercise.reps) : null,
      };
      if (exercise.type === 'strength' || exercise.type === 'bodyweight_reps') {
        entry.setsDone = setsDone === '' ? null : Number(setsDone);
        entry.repsDone = reps.split(',').map(s => Number(s.trim())).filter(n => !Number.isNaN(n));
        if (exercise.type === 'strength') entry.weightKg = weight === '' ? null : Number(weight);
      } else if (exercise.type === 'hold_time') {
        entry.durationSec = durationSec === '' ? null : Number(durationSec);
        entry.setsDone = setsDone === '' ? null : Number(setsDone);
      } else if (exercise.type === 'interval') {
        entry.distanceKm = distanceKm === '' ? null : Number(distanceKm);
        entry.durationMin = durationMin === '' ? null : Number(durationMin);
      }

      const result = await saveWorkoutLog(entry);
      addToast(result.message, 'success');
      onLogged?.(exercise.id, result.state);
    } catch (err) {
      addToast('Ошибка сохранения: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`f-card ${open ? 'f-open' : ''}`}>
      <div className="f-card-head" onClick={() => setOpen(o => !o)}>
        <div className="f-card-ib" style={{ background: color + '15', borderColor: color + '25' }}>
          <span style={{ fontSize: 22 }}>{exercise.type === 'hold_time' ? '⏱️' : exercise.type.includes('cardio') || exercise.type === 'interval' ? '🏃' : '🏋️'}</span>
        </div>
        <div className="f-card-info">
          <div className="f-card-name">{exercise.name}</div>
          <div className="f-card-badges">
            <span className="f-badge" style={{ color, background: color + '20' }}>{repsBadge}</span>
            {weightBadge && <span className="f-badge-w">{weightBadge}</span>}
            {exercise.superset && <span className="f-badge-sup">СУПЕРСЕТ {exercise.superset}</span>}
            {stage && <span className="f-badge-stage">ЭТАП: {stage.name}</span>}
          </div>
        </div>
        <div className="f-chevron">▾</div>
      </div>

      {open && (
        <div className="f-card-body" style={{ borderTopColor: color + '22', background: color + '08' }}>
          <div className="f-detail-grid">
            <div className="f-detail-box">
              <div className="f-detail-lbl">Отдых</div>
              <div className="f-detail-val">{exercise.rest || '—'}</div>
            </div>
            <div className="f-detail-box">
              <div className="f-detail-lbl">Калории</div>
              <div className="f-detail-val">~{exercise.calories} ккал</div>
            </div>
          </div>

          <div className="f-muscle-lbl">Мышцы</div>
          <div className="f-muscle-val" style={{ color }}>{exercise.muscles}</div>

          <div className="f-tip" style={{ borderLeftColor: color }}>
            <div className="f-tip-lbl">💡 Техника</div>
            <div className="f-tip-txt">{exercise.technique}</div>
          </div>

          {stage && (
            <div className="f-stage-box" style={{ borderLeftColor: color }}>
              <div className="f-tip-lbl">📈 Текущий этап прогрессии</div>
              <div className="f-tip-txt">{stage.description}</div>
              {state?.last_adjustment && <div className="f-stage-note">{state.last_adjustment}</div>}
            </div>
          )}

          {canLog && (
            <form className="f-log-form" onSubmit={handleSave}>
              <div className="f-log-title">Записать тренировку — {logDate}</div>
              <div className="f-log-fields">
                {(exercise.type === 'strength' || exercise.type === 'bodyweight_reps') && (
                  <>
                    <label className="ffield">
                      <span>Подходы выполнено</span>
                      <input type="number" value={setsDone} onChange={e => setSetsDone(e.target.value)} min="0" />
                    </label>
                    <label className="ffield">
                      <span>Повторы по подходам (через запятую)</span>
                      <input type="text" value={reps} onChange={e => setReps(e.target.value)} placeholder="12,12,10" />
                    </label>
                  </>
                )}
                {exercise.type === 'strength' && (
                  <label className="ffield">
                    <span>Рабочий вес, кг</span>
                    <input type="number" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} />
                  </label>
                )}
                {exercise.type === 'hold_time' && (
                  <>
                    <label className="ffield">
                      <span>Подходы выполнено</span>
                      <input type="number" value={setsDone} onChange={e => setSetsDone(e.target.value)} min="0" />
                    </label>
                    <label className="ffield">
                      <span>Лучший подход, сек</span>
                      <input type="number" value={durationSec} onChange={e => setDurationSec(e.target.value)} />
                    </label>
                  </>
                )}
                {exercise.type === 'interval' && (
                  <>
                    <label className="ffield">
                      <span>Дистанция, км</span>
                      <input type="number" step="0.1" value={distanceKm} onChange={e => setDistanceKm(e.target.value)} />
                    </label>
                    <label className="ffield">
                      <span>Время, мин</span>
                      <input type="number" step="1" value={durationMin} onChange={e => setDurationMin(e.target.value)} />
                    </label>
                  </>
                )}
              </div>
              <button className="fbtn fbtn-primary" type="submit" disabled={saving}>
                {saving ? 'Сохранение…' : 'Сохранить тренировку'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default ExerciseCard;
