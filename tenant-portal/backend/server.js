require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '20mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'tenant-portal-jwt-secret';
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// ── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Недействительный токен' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Только для администратора' });
  next();
}

function canAccessProperty(userRole, userPropertyId, propertyId) {
  return userRole === 'admin' || userPropertyId === propertyId;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Введите пароль' });

  const { data: users, error } = await supabase.from('users').select('*');
  if (error) return res.status(500).json({ error: error.message });

  for (const user of users || []) {
    if (await bcrypt.compare(password, user.password_hash)) {
      const token = jwt.sign(
        { id: user.id, role: user.role, property_id: user.property_id, name: user.name },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
      return res.json({
        token,
        user: { id: user.id, name: user.name, role: user.role, property_id: user.property_id }
      });
    }
  }
  res.status(401).json({ error: 'Неверный пароль' });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('users').select('id,name,phone,property_id,role').eq('id', req.user.id).single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Properties ────────────────────────────────────────────────────────────────

app.get('/api/properties', requireAuth, async (req, res) => {
  let q = supabase.from('properties').select('*').order('id');
  if (req.user.role !== 'admin') q = q.eq('id', req.user.property_id);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Users ─────────────────────────────────────────────────────────────────────

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users').select('id,name,phone,property_id,role,created_at').order('role').order('name');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { name, phone, property_id, password, role } = req.body;
  if (!name || !password) return res.status(400).json({ error: 'Имя и пароль обязательны' });
  const hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase.from('users').insert({
    name, phone: phone || null, property_id: property_id || null,
    password_hash: hash, role: role || 'tenant'
  }).select('id,name,phone,property_id,role').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.patch('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { name, phone, password, property_id } = req.body;
  const upd = {};
  if (name !== undefined) upd.name = name;
  if (phone !== undefined) upd.phone = phone || null;
  if (property_id !== undefined) upd.property_id = property_id || null;
  if (password) upd.password_hash = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users').update(upd).eq('id', req.params.id)
    .select('id,name,phone,property_id,role').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('users').delete()
    .eq('id', req.params.id).neq('role', 'admin');
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Utility Types ─────────────────────────────────────────────────────────────

app.get('/api/utility-types', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('utility_types').select('*').order('sort_order');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Utility Readings ──────────────────────────────────────────────────────────

app.get('/api/readings', requireAuth, async (req, res) => {
  const { property_id, period } = req.query;
  const target = req.user.role !== 'admin' ? req.user.property_id : property_id;
  let q = supabase
    .from('utility_readings')
    .select('*, utility_types(id,name,unit), users(name)')
    .order('submitted_at', { ascending: false });
  if (target) q = q.eq('property_id', target);
  if (period) q = q.eq('period', period);
  const { data, error } = await q.limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/readings', requireAuth, upload.single('photo'), async (req, res) => {
  const { property_id, utility_type_id, period, reading_value, note } = req.body;
  if (!canAccessProperty(req.user.role, req.user.property_id, property_id))
    return res.status(403).json({ error: 'Нет доступа к этому объекту' });

  let photo_url = null;
  if (req.file) {
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const name = `readings/${property_id}/${Date.now()}.${ext}`;
    const { error: e } = await supabase.storage
      .from('tenant-photos').upload(name, req.file.buffer, { contentType: req.file.mimetype });
    if (!e) {
      const { data: u } = supabase.storage.from('tenant-photos').getPublicUrl(name);
      photo_url = u.publicUrl;
    }
  }

  const { data, error } = await supabase.from('utility_readings').insert({
    property_id, utility_type_id, period,
    reading_value: reading_value !== '' && reading_value != null ? Number(reading_value) : null,
    photo_url, note: note || null, submitted_by: req.user.id
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logActivity(property_id, req.user.id, 'reading_submitted', { utility_type_id, period, reading_value });
  if (req.user.role === 'tenant')
    await notifyAdmin(`Показания от ${req.user.name} (${property_id})`, `Период: ${period}, счётчик: ${utility_type_id}`);

  res.json(data);
});

app.delete('/api/readings/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('utility_readings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Documents ─────────────────────────────────────────────────────────────────

app.get('/api/documents', requireAuth, async (req, res) => {
  const { property_id } = req.query;
  const target = req.user.role !== 'admin' ? req.user.property_id : property_id;
  let q = supabase.from('documents').select('*').order('uploaded_at', { ascending: false });
  if (target) q = q.eq('property_id', target);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/documents', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл обязателен' });
  const { property_id, doc_type, name } = req.body;
  if (!property_id || !name) return res.status(400).json({ error: 'Объект и название обязательны' });

  const ext = req.file.originalname.split('.').pop().toLowerCase();
  const fileName = `docs/${property_id}/${doc_type || 'other'}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('tenant-docs').upload(fileName, req.file.buffer, { contentType: req.file.mimetype });
  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: urlData } = supabase.storage.from('tenant-docs').getPublicUrl(fileName);
  const { data, error } = await supabase.from('documents').insert({
    property_id, doc_type: doc_type || 'other', name, url: urlData.publicUrl
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/documents/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('documents').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Maintenance Requests ──────────────────────────────────────────────────────

app.get('/api/requests', requireAuth, async (req, res) => {
  const { property_id } = req.query;
  const target = req.user.role !== 'admin' ? req.user.property_id : property_id;
  let q = supabase.from('maintenance_requests')
    .select('*, users(name)').order('submitted_at', { ascending: false });
  if (target) q = q.eq('property_id', target);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/requests', requireAuth, upload.array('photos', 5), async (req, res) => {
  const { property_id, title, description } = req.body;
  if (!canAccessProperty(req.user.role, req.user.property_id, property_id))
    return res.status(403).json({ error: 'Нет доступа к этому объекту' });

  const photo_urls = [];
  for (const file of req.files || []) {
    const ext = file.originalname.split('.').pop().toLowerCase();
    const name = `requests/${property_id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: e } = await supabase.storage
      .from('tenant-photos').upload(name, file.buffer, { contentType: file.mimetype });
    if (!e) {
      const { data: u } = supabase.storage.from('tenant-photos').getPublicUrl(name);
      photo_urls.push(u.publicUrl);
    }
  }

  const { data, error } = await supabase.from('maintenance_requests').insert({
    property_id, title, description: description || null, photo_urls, submitted_by: req.user.id
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await logActivity(property_id, req.user.id, 'request_submitted', { title });
  if (req.user.role === 'tenant')
    await notifyAdmin(`Заявка от ${req.user.name} (${property_id})`, title);

  res.json(data);
});

app.patch('/api/requests/:id', requireAuth, requireAdmin, async (req, res) => {
  const { status, admin_comment } = req.body;
  const upd = {};
  if (status) upd.status = status;
  if (admin_comment !== undefined) upd.admin_comment = admin_comment;
  if (status === 'done') upd.resolved_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('maintenance_requests').update(upd).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Notifications ─────────────────────────────────────────────────────────────

app.get('/api/notifications', requireAuth, async (req, res) => {
  let q = supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (req.user.role !== 'admin')
    q = q.or(`property_id.is.null,property_id.eq.${req.user.property_id}`);

  const { data: notifs, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const { data: reads } = await supabase
    .from('notification_reads').select('notification_id').eq('user_id', req.user.id);
  const readSet = new Set((reads || []).map(r => r.notification_id));

  res.json((notifs || []).map(n => ({ ...n, is_read: readSet.has(n.id) })));
});

app.post('/api/notifications', requireAuth, requireAdmin, async (req, res) => {
  const { property_id, title, body, send_sms } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'Заголовок и текст обязательны' });

  const { data, error } = await supabase.from('notifications').insert({
    property_id: property_id || null, title, body, send_sms: !!send_sms, created_by: req.user.id
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (send_sms) {
    const targets = property_id ? [property_id]
      : (await supabase.from('properties').select('id')).data?.map(p => p.id) || [];
    for (const pid of targets) await sendSmsToProperty(pid, `${title}\n${body}`);
  }

  res.json(data);
});

app.post('/api/notifications/:id/read', requireAuth, async (req, res) => {
  await supabase.from('notification_reads').upsert(
    { notification_id: req.params.id, user_id: req.user.id },
    { onConflict: 'notification_id,user_id' }
  );
  res.json({ ok: true });
});

app.delete('/api/notifications/:id', requireAuth, requireAdmin, async (req, res) => {
  const { error } = await supabase.from('notifications').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── Activity Log ──────────────────────────────────────────────────────────────

app.get('/api/activity', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('activity_log').select('*, users(name, property_id)')
    .order('created_at', { ascending: false }).limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function logActivity(property_id, user_id, action_type, details = {}) {
  await supabase.from('activity_log').insert({ property_id, user_id, action_type, details });
}

async function notifyAdmin(title, message) {
  if (!process.env.SMSC_LOGIN || !process.env.ADMIN_PHONE) return;
  try {
    await axios.get('https://smsc.ru/sys/send.php', {
      params: { login: process.env.SMSC_LOGIN, psw: process.env.SMSC_PASSWORD,
        phones: process.env.ADMIN_PHONE, mes: `${title}: ${message}`, charset: 'utf-8' }
    });
  } catch (e) { console.error('SMS to admin failed:', e.message); }
}

async function sendSmsToProperty(property_id, message) {
  if (!process.env.SMSC_LOGIN) return;
  const { data: users } = await supabase
    .from('users').select('phone').eq('property_id', property_id).eq('role', 'tenant');
  for (const u of users || []) {
    if (!u.phone) continue;
    try {
      await axios.get('https://smsc.ru/sys/send.php', {
        params: { login: process.env.SMSC_LOGIN, psw: process.env.SMSC_PASSWORD,
          phones: u.phone, mes: message, charset: 'utf-8' }
      });
    } catch (e) { console.error('SMS error:', e.message); }
  }
}

// ── Static frontend ───────────────────────────────────────────────────────────

const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api'))
      res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`✅ Tenant Portal on :${PORT}`));
