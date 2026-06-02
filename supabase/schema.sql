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
