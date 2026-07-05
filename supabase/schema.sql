-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  service TEXT NOT NULL,
  property TEXT NOT NULL,
  amount NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, service, property)
);

-- Таблица истории изменений
CREATE TABLE IF NOT EXISTS history (
  id BIGSERIAL PRIMARY KEY,
  month TEXT NOT NULL,
  service TEXT NOT NULL,
  property TEXT NOT NULL,
  old_amount NUMERIC,
  new_amount NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by TEXT DEFAULT 'user'
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month);
CREATE INDEX IF NOT EXISTS idx_history_changed_at ON history(changed_at DESC);

-- Разрешения для anon
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON history FOR ALL USING (true) WITH CHECK (true);

-- ── Фитнес-план — Зал ───────────────────────────────────────────────────────

-- Дневник тела: вес, сон, самочувствие, замеры
CREATE TABLE IF NOT EXISTS fitness_body_logs (
  id BIGSERIAL PRIMARY KEY,
  log_date DATE NOT NULL UNIQUE,
  weight_kg NUMERIC,
  sleep_hours NUMERIC,
  sleep_quality TEXT,
  resting_hr NUMERIC,
  spo2 NUMERIC,
  vo2max NUMERIC,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hips_cm NUMERIC,
  biceps_cm NUMERIC,
  thigh_cm NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Журнал тренировок: факт выполнения по каждому упражнению
CREATE TABLE IF NOT EXISTS fitness_workout_logs (
  id BIGSERIAL PRIMARY KEY,
  log_date DATE NOT NULL,
  day_key TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT,
  sets_target INT,
  reps_target TEXT,
  sets_done INT,
  reps_done TEXT,
  weight_kg NUMERIC,
  distance_km NUMERIC,
  duration_min NUMERIC,
  success BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Текущее состояние программы по каждому упражнению (то, что подстраивается)
CREATE TABLE IF NOT EXISTS fitness_exercise_state (
  exercise_id TEXT PRIMARY KEY,
  current_weight_kg NUMERIC,
  current_reps_target TEXT,
  current_sets_target INT,
  stage_index INT DEFAULT 0,
  consecutive_success INT DEFAULT 0,
  consecutive_fail INT DEFAULT 0,
  last_log_date DATE,
  last_adjustment TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_body_logs_date ON fitness_body_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_workout_logs_date ON fitness_workout_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_workout_logs_exercise ON fitness_workout_logs(exercise_id, log_date DESC);

ALTER TABLE fitness_body_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_exercise_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON fitness_body_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON fitness_workout_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON fitness_exercise_state FOR ALL USING (true) WITH CHECK (true);

-- ── Инвестиции — анализ портфеля ────────────────────────────────────────────

-- Один запуск анализа: распознанный портфель + отчёт по 10 разделам + новости
CREATE TABLE IF NOT EXISTS invest_analyses (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  broker TEXT,
  currency TEXT,
  total_value NUMERIC,
  screenshot_count INT,
  positions JSONB,      -- [{ticker, name, quantity, value, weight_pct, asset_class, sector, country, ...}]
  sections JSONB,       -- {summary:{title,text}, composition:{...}, ... , recommendations:{...}}
  news JSONB,           -- [{ticker, title, url, date, sentiment, summary}]
  instructions TEXT     -- поручение/уточнение пользователя к этому анализу (например: "брокер — Сбер")
);

-- На случай, если таблица уже была создана предыдущей версией схемы без этой колонки
ALTER TABLE invest_analyses ADD COLUMN IF NOT EXISTS instructions TEXT;

CREATE INDEX IF NOT EXISTS idx_invest_analyses_created_at ON invest_analyses(created_at DESC);

ALTER TABLE invest_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for anon" ON invest_analyses FOR ALL USING (true) WITH CHECK (true);
