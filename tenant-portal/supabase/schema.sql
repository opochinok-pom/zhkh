CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT DEFAULT ''
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  property_id TEXT REFERENCES properties(id),
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE utility_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT DEFAULT '',
  has_meter BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE utility_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT NOT NULL REFERENCES properties(id),
  utility_type_id TEXT NOT NULL REFERENCES utility_types(id),
  period TEXT NOT NULL,
  reading_value NUMERIC,
  photo_url TEXT,
  note TEXT,
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT NOT NULL REFERENCES properties(id),
  doc_type TEXT NOT NULL DEFAULT 'other',
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT NOT NULL REFERENCES properties(id),
  title TEXT NOT NULL,
  description TEXT,
  photo_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'new',
  submitted_by UUID REFERENCES users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  admin_comment TEXT,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT REFERENCES properties(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  send_sms BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE TABLE notification_reads (
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id TEXT,
  user_id UUID REFERENCES users(id),
  action_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO properties (id, name) VALUES
  ('29/42', 'Объект 29/42'),
  ('750',   'Объект 750'),
  ('888',   'Объект 888'),
  ('510',   'Объект 510');

INSERT INTO utility_types (id, name, unit, has_meter, sort_order) VALUES
  ('electricity', 'Электроэнергия',          'кВт·ч', true,  1),
  ('cold_water',  'Холодная вода',            'м³',    true,  2),
  ('hot_water',   'Горячая вода',             'м³',    true,  3),
  ('gas',         'Газ',                      'м³',    true,  4),
  ('heating',     'Отопление',                'Гкал',  false, 5),
  ('garbage',     'Вывоз мусора',             '',      false, 6),
  ('internet',    'Интернет',                 '',      false, 7),
  ('rent',        'Аренда',                   'руб',   false, 8);

ALTER TABLE properties          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE utility_readings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_reads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log        ENABLE ROW LEVEL SECURITY;

-- Storage buckets (run in Supabase dashboard):
-- CREATE BUCKET tenant-docs  (public: true)
-- CREATE BUCKET tenant-photos (public: true)
