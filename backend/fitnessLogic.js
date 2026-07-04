// Простые правила адаптации программы под факт тренировок и сон.
// Держим метаданные упражнений в этом файле (не импортируем frontend ESM
// из CommonJS-бэкенда), поэтому пороги/шаги веса должны совпадать с
// frontend/src/fitness/data/plan.js при ручных правках плана.

const PULLUP_STAGES = [
  { name: 'Негативные подтягивания', exitReps: 5, description: 'Техника + тяга блока + негативы. Вес без изменений.' },
  { name: 'Подтягивания с резиновой петлёй', exitReps: 5, description: 'Подтягивания с резиновой петлёй (3–5 повт).' },
  { name: 'Первые чистые подтягивания', exitReps: 5, description: 'Первые чистые подтягивания 3–5 раз.' },
  { name: 'Подтягивания на результат', exitReps: 10, description: 'Цель: 8–10 подтягиваний. Руки заметно выросли.' },
];

const RUN_STAGES = [
  { name: 'Интервалы 1:2', exitDistanceKm: 3, description: 'Интервалы 1:2 (1 мин бег / 2 мин ходьба). 8 раундов.' },
  { name: 'Интервалы 2:1', exitDistanceKm: 5, description: 'Интервалы 2:1. Пробегаем 3 км.' },
  { name: 'Бег без остановки', exitDistanceKm: 6, description: 'Первые 5 км без остановки. Темп ~7:30/км.' },
  { name: 'Длинный бег', exitDistanceKm: 8, description: 'Длинный бег: 6 → 7 → 8 км.' },
  { name: 'Гонка на 10 км', exitDistanceKm: 10, description: '🎯 Первый старт на 10 км! Ожидаемое время ~75–85 мин.' },
];

// kind: weighted | hold | ladder_pullup | ladder_run | none
const EXERCISE_META = {
  's-lat-pulldown':    { kind: 'weighted', repsMin: 12, repsMax: 12, weightStep: 2,   weightMin: 40 },
  's-negative-pullups':{ kind: 'ladder_pullup' },
  's-hyperextension':  { kind: 'none' },
  's-plank':           { kind: 'hold', targetSec: 40, stepSec: 5 },
  's-crunches':        { kind: 'none' },
  's-leg-raises':      { kind: 'none' },
  's-bird-dog':        { kind: 'none' },
  's-db-curl':         { kind: 'weighted', repsMin: 10, repsMax: 12, weightStep: 2,   weightMin: 10 },
  's-rope-pushdown':   { kind: 'weighted', repsMin: 12, repsMax: 12, weightStep: 2.5, weightMin: 20 },
  's-hammer-curl':     { kind: 'weighted', repsMin: 10, repsMax: 12, weightStep: 2,   weightMin: 10 },
  's-french-press':    { kind: 'weighted', repsMin: 12, repsMax: 12, weightStep: 2,   weightMin: 8 },
  's-treadmill-walk':  { kind: 'none' },
  'c-warmup-walk':     { kind: 'none' },
  'c-run-walk-intervals': { kind: 'ladder_run' },
  'c-cooldown-walk':   { kind: 'none' },
  'c-plank':           { kind: 'hold', targetSec: 45, stepSec: 5 },
  'c-leg-raises':      { kind: 'none' },
  'c-bird-dog':        { kind: 'none' },
};

function round(n) {
  return Math.round(n * 100) / 100;
}

// entry: { exerciseId, logDate, setsDone, setsTarget, repsDone: number[], weightKg, durationSec, distanceKm }
// state: текущая строка fitness_exercise_state (или null, если ещё нет записи)
function evaluateWorkoutLog(entry, state) {
  const meta = EXERCISE_META[entry.exerciseId] || { kind: 'none' };
  const prevWeight = state?.current_weight_kg ?? meta.weightMin ?? null;
  const stageIndex = state?.stage_index ?? 0;
  let consecutiveSuccess = state?.consecutive_success ?? 0;
  let consecutiveFail = state?.consecutive_fail ?? 0;

  let weightOut = prevWeight;
  let stageOut = stageIndex;
  let repsTargetOut = state?.current_reps_target ?? null;
  let message = 'Сессия зафиксирована.';

  if (meta.kind === 'weighted') {
    const reps = entry.repsDone || [];
    const minRep = reps.length ? Math.min(...reps) : null;
    const success = minRep !== null && minRep >= meta.repsMax;
    const fail = minRep !== null && minRep < meta.repsMin;

    if (success) {
      consecutiveFail = 0;
      consecutiveSuccess += 1;
      if (consecutiveSuccess >= 2) {
        weightOut = round(prevWeight + meta.weightStep);
        consecutiveSuccess = 0;
        message = `Вес увеличен до ${weightOut} кг — 2 сессии подряд на потолке диапазона повторов.`;
      } else {
        message = `Все повторы выполнены (${consecutiveSuccess}/2 до увеличения веса).`;
      }
    } else if (fail) {
      consecutiveSuccess = 0;
      consecutiveFail += 1;
      if (consecutiveFail >= 2) {
        const floor = Math.max(2, (meta.weightMin || meta.weightStep * 2) - 4);
        weightOut = Math.max(floor, round(prevWeight - meta.weightStep));
        consecutiveFail = 0;
        message = `Вес снижен до ${weightOut} кг — недобор повторов 2 сессии подряд. Приоритет — техника.`;
      } else {
        message = `Недобор повторов (${consecutiveFail}/2 до снижения веса).`;
      }
    } else {
      consecutiveSuccess = 0;
      consecutiveFail = 0;
      message = 'Сессия зафиксирована, нагрузка без изменений.';
    }
  } else if (meta.kind === 'hold') {
    const targetSec = repsTargetOut ? Number(repsTargetOut) : meta.targetSec;
    const dur = entry.durationSec;
    const success = dur !== undefined && dur !== null && dur >= targetSec;
    if (success) {
      consecutiveFail = 0;
      consecutiveSuccess += 1;
      if (consecutiveSuccess >= 2) {
        repsTargetOut = String(targetSec + meta.stepSec);
        consecutiveSuccess = 0;
        message = `Целевое время удержания увеличено до ${repsTargetOut} сек.`;
      } else {
        message = `Норматив времени выполнен (${consecutiveSuccess}/2 до увеличения времени).`;
      }
    } else {
      consecutiveSuccess = 0;
      consecutiveFail = 0;
      message = 'Сессия зафиксирована.';
    }
  } else if (meta.kind === 'ladder_pullup' || meta.kind === 'ladder_run') {
    const stages = meta.kind === 'ladder_pullup' ? PULLUP_STAGES : RUN_STAGES;
    const stage = stages[stageIndex] || stages[stages.length - 1];
    const metric = meta.kind === 'ladder_pullup'
      ? (entry.repsDone && entry.repsDone.length ? Math.max(...entry.repsDone) : 0)
      : (entry.distanceKm || 0);
    const threshold = meta.kind === 'ladder_pullup' ? stage.exitReps : stage.exitDistanceKm;
    const metStandard = metric >= threshold;

    if (metStandard) {
      consecutiveFail = 0;
      consecutiveSuccess += 1;
      if (consecutiveSuccess >= 2 && stageIndex < stages.length - 1) {
        stageOut = stageIndex + 1;
        consecutiveSuccess = 0;
        message = `🎉 Новый этап: ${stages[stageOut].name} — ${stages[stageOut].description}`;
      } else {
        message = `Норматив выполнен (${consecutiveSuccess}/2 до перехода на следующий этап).`;
      }
    } else {
      consecutiveSuccess = 0;
      message = 'Сессия зафиксирована, продолжаем текущий этап.';
    }
  }

  return {
    stateUpdate: {
      exercise_id: entry.exerciseId,
      current_weight_kg: weightOut,
      current_reps_target: repsTargetOut,
      current_sets_target: entry.setsTarget ?? state?.current_sets_target ?? null,
      stage_index: stageOut,
      consecutive_success: consecutiveSuccess,
      consecutive_fail: consecutiveFail,
      last_log_date: entry.logDate,
      last_adjustment: message,
      updated_at: new Date().toISOString(),
    },
    message,
  };
}

// Приоритет №1 из плана: сон < 6ч — снижаем интенсивность на сегодня.
function getSleepWarning(bodyLog) {
  if (!bodyLog || bodyLog.sleep_hours === null || bodyLog.sleep_hours === undefined) return null;
  const hours = Number(bodyLog.sleep_hours);
  if (!Number.isFinite(hours) || hours >= 6) return null;
  return {
    hours,
    level: hours < 5 ? 'high' : 'medium',
    message: hours < 5
      ? `Сон ${hours}ч — критично мало. Снизьте вес на ~10–15% и уберите 1 подход в каждом упражнении сегодня.`
      : `Сон ${hours}ч — ниже нормы. Снизьте вес на ~10% сегодня, приоритет — техника, не рекорд.`,
  };
}

module.exports = { evaluateWorkoutLog, getSleepWarning, PULLUP_STAGES, RUN_STAGES, EXERCISE_META };
