import React, { useMemo, useState } from 'react';
import Sparkline from './Sparkline.jsx';
import { saveBodyLog } from '../api.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

const FIELDS = [
  { key: 'weight_kg', label: 'Вес', unit: 'кг', step: '0.1' },
  { key: 'sleep_hours', label: 'Сон', unit: 'ч', step: '0.1' },
  { key: 'resting_hr', label: 'ЧСС покоя', unit: 'уд/мин', step: '1' },
  { key: 'spo2', label: 'SpO2', unit: '%', step: '0.1' },
  { key: 'vo2max', label: 'VO2max', unit: 'МПК', step: '0.1' },
  { key: 'chest_cm', label: 'Грудь', unit: 'см', step: '0.5' },
  { key: 'waist_cm', label: 'Талия', unit: 'см', step: '0.5' },
  { key: 'hips_cm', label: 'Таз', unit: 'см', step: '0.5' },
  { key: 'biceps_cm', label: 'Бицепс', unit: 'см', step: '0.5' },
  { key: 'thigh_cm', label: 'Бедро', unit: 'см', step: '0.5' },
];

function BodyLogPanel({ onClose, onSaved, bodyLogs, addToast }) {
  const latest = bodyLogs?.[0];
  const [date, setDate] = useState(todayISO());
  const [values, setValues] = useState(() => {
    const init = {};
    FIELDS.forEach(f => { init[f.key] = latest?.[f.key] ?? ''; });
    init.sleep_quality = latest?.sleep_quality ?? 'нормально';
    init.notes = '';
    return init;
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, v) => setValues(prev => ({ ...prev, [key]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { log_date: date, sleep_quality: values.sleep_quality, notes: values.notes || null };
      FIELDS.forEach(f => {
        payload[f.key] = values[f.key] === '' ? null : Number(values[f.key]);
      });
      await saveBodyLog(payload);
      addToast('Данные сохранены', 'success');
      onSaved?.();
      onClose();
    } catch (err) {
      addToast('Ошибка сохранения: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const chrono = useMemo(() => [...(bodyLogs || [])].reverse(), [bodyLogs]);
  const seriesFor = (key) => chrono.map(l => ({ value: l[key], label: fmtLabel(l.log_date) }));

  return (
    <div className="fmodal-backdrop" onClick={onClose}>
      <div className="fmodal" onClick={e => e.stopPropagation()}>
        <div className="fmodal-head">
          <h3>Дневник тела</h3>
          <button className="fbtn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="fmodal-body">
          <div className="ftrend-grid">
            <div className="ftrend-tile">
              <div className="ftrend-lbl">Вес, кг</div>
              <Sparkline points={seriesFor('weight_kg')} color="#10B981" unit=" кг" />
            </div>
            <div className="ftrend-tile">
              <div className="ftrend-lbl">ЧСС покоя</div>
              <Sparkline points={seriesFor('resting_hr')} color="#3B82F6" unit=" уд/мин" />
            </div>
            <div className="ftrend-tile">
              <div className="ftrend-lbl">VO2max</div>
              <Sparkline points={seriesFor('vo2max')} color="#F59E0B" unit=" МПК" />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="ffield-row">
              <label className="ffield">
                <span>Дата</span>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
              </label>
              <label className="ffield">
                <span>Качество сна</span>
                <select value={values.sleep_quality} onChange={e => setField('sleep_quality', e.target.value)}>
                  <option value="плохо">Плохо</option>
                  <option value="нормально">Нормально</option>
                  <option value="хорошо">Хорошо</option>
                </select>
              </label>
            </div>

            <div className="ffield-grid">
              {FIELDS.map(f => (
                <label className="ffield" key={f.key}>
                  <span>{f.label} ({f.unit})</span>
                  <input
                    type="number"
                    step={f.step}
                    value={values[f.key]}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder="—"
                  />
                </label>
              ))}
            </div>

            <label className="ffield ffield-notes">
              <span>Заметки</span>
              <textarea
                value={values.notes}
                onChange={e => setField('notes', e.target.value)}
                rows={2}
                placeholder="Самочувствие, травмы, факторы дня…"
              />
            </label>

            <button className="fbtn fbtn-primary" type="submit" disabled={saving}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default BodyLogPanel;
