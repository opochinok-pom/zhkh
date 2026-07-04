// Статическая база программы. Числовые targets (вес/повторы) — это ТОЛЬКО
// стартовые значения. Реальные текущие targets приходят с бэкенда
// (/api/fitness/state) и подстраиваются по факту тренировок и сну.

export const DAY_TYPES = { mon: 'strength', tue: 'cardio', wed: 'strength', thu: 'cardio', fri: 'strength' };
export const DAY_NAMES = { mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг', fri: 'Пятница' };
export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri'];

// ── Силовой день (пн/ср/пт) ──────────────────────────────────────────────────
export const STRENGTH_BLOCKS = [
  {
    key: 'warmup', title: '⚡ Разминка', color: '#94A3B8',
    exercises: [
      { id: 's-warmup-elliptical', name: 'Эллипсоид — разминка', type: 'cardio_time',
        durationMin: 5, note: 'Лёгкое сопротивление', rest: null, calories: 30,
        muscles: 'Сердце · Суставы',
        technique: 'Пульс 80–90 уд/мин. Подготовка суставов и сердца.' },
    ],
  },
  {
    key: 'back', title: '🏋️ Блок 1 — Спина и подтягивания', color: '#3B82F6', goal: 'Подтягивания',
    exercises: [
      { id: 's-lat-pulldown', name: 'Тяга верхнего блока к груди', type: 'strength',
        sets: 3, reps: 12, weightMin: 40, weightMax: 45, rest: '60 сек', calories: 25,
        muscles: 'Широчайшие · Бицепс · Ромбовидные',
        technique: 'Тяните к груди широким хватом. Сводите лопатки в нижней точке 1 сек.' },
      { id: 's-negative-pullups', name: 'Негативные подтягивания', type: 'bodyweight_reps',
        sets: 3, reps: '4–5', rest: '90 сек', calories: 20,
        muscles: 'Широчайшие · Бицепс · Кор',
        technique: 'Встаньте на скамью, возьмитесь за перекладину — медленно опускайтесь 6–8 секунд.',
        progressionKey: 'pullups' },
      { id: 's-hyperextension', name: 'Гиперэкстензия', type: 'bodyweight_reps',
        sets: 3, reps: 15, rest: '60 сек', calories: 15,
        muscles: 'Поясница · Ягодицы · Разгибатели спины',
        technique: 'Подъём только до линии тела — не переразгибайтесь.' },
    ],
  },
  {
    key: 'core', title: '🎯 Блок 2 — Пресс и корсет', color: '#10B981', goal: 'Пресс + Кор',
    exercises: [
      { id: 's-plank', name: 'Планка на локтях', type: 'hold_time',
        sets: 3, durationSec: 40, rest: '45 сек', calories: 12,
        muscles: 'Поперечная мышца · Прямая мышца · Стабилизаторы',
        technique: 'Тело — прямая доска. Не поднимайте таз. Дышите равномерно.' },
      { id: 's-crunches', name: 'Скручивания на пресс', type: 'bodyweight_reps',
        sets: 3, reps: '15–20', rest: '45 сек', calories: 10,
        muscles: 'Прямая мышца (верх) · Косые',
        technique: 'Поднимайте только лопатки — поясница на полу.' },
      { id: 's-leg-raises', name: 'Подъём ног лёжа', type: 'bodyweight_reps',
        sets: 3, reps: 12, rest: '45 сек', calories: 12,
        muscles: 'Прямая мышца (низ) · Подвздошно-поясничная',
        technique: 'Поясница прижата. Ноги не опускайте до касания.' },
      { id: 's-bird-dog', name: 'Птица-собака', type: 'bodyweight_reps',
        sets: 2, reps: '10 x 2 стороны', rest: '30 сек', calories: 8,
        muscles: 'Стабилизаторы позвоночника · Кор · Ягодицы',
        technique: 'Рука и противоположная нога одновременно. Удержите 2–3 сек.' },
    ],
  },
  {
    key: 'arms', title: '💪 Блок 3 — Руки (Бицепс + Трицепс)', color: '#F97316', goal: 'Эстетика рук',
    exercises: [
      { id: 's-db-curl', name: 'Сгибания с гантелями', type: 'strength',
        sets: 3, reps: '10–12', weightMin: 10, weightMax: 12, rest: '→ сразу трицепс', calories: 15,
        muscles: 'Бицепс (пик) · Брахиалис', superset: 'А',
        technique: 'СУПЕРСЕТ А: сразу после — разгибания на блоке. 3 сек вниз. Локти прижаты.' },
      { id: 's-rope-pushdown', name: 'Разгибания с канатом на блоке', type: 'strength',
        sets: 3, reps: 12, weightMin: 20, weightMax: 25, rest: '90 сек после пары А', calories: 15,
        muscles: 'Трицепс (все 3 головки) — 2/3 объёма руки!', superset: 'А',
        technique: 'Локти прижаты к корпусу. В нижней точке — полное разгибание, задержите 1 сек.' },
      { id: 's-hammer-curl', name: 'Молотковые сгибания', type: 'strength',
        sets: 2, reps: '10–12', weightMin: 10, weightMax: 12, rest: '→ сразу трицепс', calories: 12,
        muscles: 'Брахиалис · Брахиорадиалис · Ширина руки', superset: 'Б',
        technique: 'СУПЕРСЕТ Б: сразу после — французский жим. Нейтральный хват (большой палец вверх).' },
      { id: 's-french-press', name: 'Французский жим с гантелей', type: 'strength',
        sets: 2, reps: 12, weightMin: 8, weightMax: 10, rest: '90 сек после пары Б', calories: 12,
        muscles: 'Длинная головка трицепса · Объём задней части руки', superset: 'Б',
        technique: 'Сидя, обе руки держат гантель. Опускайте за голову, локти смотрят в потолок.' },
    ],
  },
  {
    key: 'cardio-finish', title: '🏃 Кардио-финиш', color: '#8B5CF6',
    exercises: [
      { id: 's-treadmill-walk', name: 'Беговая дорожка — ходьба', type: 'cardio_time',
        durationMin: 5, note: 'Уклон 5–7°', calories: 45,
        muscles: 'Сердечно-сосудистая · Икры · Бёдра',
        technique: '5 км/ч, уклон 5–7°. Пульс 105–115 уд/мин. Поднимает VO2max.' },
    ],
  },
];

// ── Кардио-день (вт/чт) ──────────────────────────────────────────────────────
export const CARDIO_BLOCKS = [
  {
    key: 'run', title: '🏃 Кардио — бег (цель 10 км)', color: '#6366F1', goal: '10 км · VO2max',
    exercises: [
      { id: 'c-warmup-walk', name: 'Разминка — ходьба', type: 'cardio_time',
        durationMin: 5, note: '5 км/ч · плоско', calories: 30,
        muscles: 'Суставы · Сердце',
        technique: 'Обязательно! Пульс 85–95. Готовит колени и голеностоп к бегу.' },
      { id: 'c-run-walk-intervals', name: 'Бег + Ходьба — интервалы', type: 'interval',
        rounds: 8, runMin: 1, walkMin: 2, runSpeed: 7, walkSpeed: 5, calories: 150,
        muscles: 'Сердце · Лёгкие · Икры · Бёдра',
        technique: '8 раундов: 1 мин бег (7 км/ч) → 2 мин ходьба (5 км/ч). ЧСС при беге: 110–125 уд/мин.',
        progressionKey: 'running' },
      { id: 'c-cooldown-walk', name: 'Заминка — ходьба', type: 'cardio_time',
        durationMin: 3, note: '4.5 км/ч · плоско', calories: 15,
        muscles: 'Восстановление',
        technique: 'Обязательно! Пульс должен опуститься ниже 100 уд/мин до остановки.' },
    ],
  },
  {
    key: 'core', title: '🎯 Кор — после кардио', color: '#10B981', goal: 'Кор',
    exercises: [
      { id: 'c-plank', name: 'Планка на локтях', type: 'hold_time',
        sets: 3, durationSec: 45, rest: '30 сек', calories: 15,
        muscles: 'Кор · Поперечная мышца',
        technique: 'В кардио-день держим дольше — прогрессируем выносливость кора.' },
      { id: 'c-leg-raises', name: 'Подъём ног лёжа', type: 'bodyweight_reps',
        sets: 3, reps: '12–15', rest: '30 сек', calories: 12,
        muscles: 'Нижний пресс',
        technique: 'Поясница к полу, темп медленный, без рывков.' },
      { id: 'c-bird-dog', name: 'Птица-собака', type: 'bodyweight_reps',
        sets: 2, reps: '10 x 2 стороны', rest: '20 сек', calories: 8,
        muscles: 'Спина · Кор · Баланс',
        technique: 'Акцент на контроле. Профилактика болей в спине.' },
    ],
  },
];

export function blocksForDay(day) {
  return DAY_TYPES[day] === 'strength' ? STRENGTH_BLOCKS : CARDIO_BLOCKS;
}

export function allExercises() {
  return [...STRENGTH_BLOCKS, ...CARDIO_BLOCKS].flatMap(b => b.exercises);
}

// ── Лестницы прогрессии (для s-negative-pullups и c-run-walk-intervals) ─────
// exitReps / exitDistanceKm — порог, который нужно выполнить 2 сессии подряд,
// чтобы бэкенд перевёл упражнение на следующую ступень.
export const PULLUP_STAGES = [
  { label: 'Мес 1', name: 'Негативные подтягивания', exitReps: 5,
    description: 'Техника + тяга блока + негативы. Вес без изменений.' },
  { label: 'Мес 2', name: 'Подтягивания с резиновой петлёй', exitReps: 5,
    description: 'Подтягивания с резиновой петлёй (3–5 повт).' },
  { label: 'Мес 3', name: 'Первые чистые подтягивания', exitReps: 5,
    description: 'Первые чистые подтягивания 3–5 раз.' },
  { label: 'Мес 4–5', name: 'Подтягивания на результат', exitReps: 10,
    description: 'Цель: 8–10 подтягиваний. Руки заметно выросли.' },
];

export const RUN_STAGES = [
  { label: 'Мес 1–2', name: 'Интервалы 1:2', exitDistanceKm: 3,
    description: 'Интервалы 1:2 (1 мин бег / 2 мин ходьба). 8 раундов.' },
  { label: 'Мес 3–4', name: 'Интервалы 2:1', exitDistanceKm: 5,
    description: 'Интервалы 2:1. Пробегаем 3 км.' },
  { label: 'Мес 5–6', name: 'Бег без остановки', exitDistanceKm: 6,
    description: 'Первые 5 км без остановки. Темп ~7:30/км.' },
  { label: 'Мес 7–9', name: 'Длинный бег', exitDistanceKm: 8,
    description: 'Длинный бег: 6 → 7 → 8 км.' },
  { label: 'Мес 10–12', name: 'Гонка на 10 км', exitDistanceKm: 10,
    description: '🎯 Первый старт на 10 км! Ожидаемое время ~75–85 мин.' },
];
