require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const ws = require('ws');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { realtime: { transport: ws } }
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Payments ──────────────────────────────────────────────────────────────────

app.get('/api/payments', async (req, res) => {
  const { data, error } = await supabase.from('payments').select('*').order('month');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/payments/:month', async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('month', decodeURIComponent(req.params.month));
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/payments', async (req, res) => {
  const { month, service, property, amount } = req.body;

  const { data: existing } = await supabase
    .from('payments')
    .select('amount')
    .eq('month', month)
    .eq('service', service)
    .eq('property', property)
    .maybeSingle();

  const { data, error } = await supabase
    .from('payments')
    .upsert(
      { month, service, property, amount: amount === '' ? null : Number(amount), updated_at: new Date().toISOString() },
      { onConflict: 'month,service,property' }
    )
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('history').insert({
    month, service, property,
    old_amount: existing?.amount ?? null,
    new_amount: amount === '' ? null : Number(amount)
  });

  res.json(data);
});

// Массовый импорт начальных данных
app.post('/api/payments/bulk', async (req, res) => {
  const { rows } = req.body; // [{month, service, property, amount}]
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows must be array' });

  const clean = rows.map(r => ({
    month: r.month,
    service: r.service,
    property: r.property,
    amount: r.amount === null ? null : Number(r.amount),
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('payments')
    .upsert(clean, { onConflict: 'month,service,property' });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, count: clean.length });
});

// ── History ───────────────────────────────────────────────────────────────────

app.get('/api/history', async (req, res) => {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(200);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── AI: разбор фото квитанции ─────────────────────────────────────────────────

app.post('/api/ai/receipt', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Нет файла' });
  try {
    const b64 = req.file.buffer.toString('base64');
    const mime = req.file.mimetype;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } },
          {
            type: 'text',
            text: `Разбери эту квитанцию ЖКХ и извлеки данные.
Объекты недвижимости: Арнеево, Л25/28, Л45/190, С29/42, О5.1/750, О5.1/888, Н510, НКл78, АлП/396, АлП/397.
Категории услуг: Членский взнос, Коммунальный платеж, Гольфстрим, Электроэнергия, Холодная вода/водоотведение, ТКО, МОЭК, Капремонт, Интернет.
Месяцы по-русски: январь, февраль, март, апрель, май, июнь, июль, август, сентябрь, октябрь, ноябрь, декабрь.

Ответь ТОЛЬКО JSON без markdown:
{"month":"...","service":"...","property":"...","amount":0,"confidence":"high|medium|low","comment":"..."}`
          }
        ]
      }]
    });

    const raw = response.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Не удалось распознать квитанцию', raw });
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI: голосовая/текстовая команда ──────────────────────────────────────────

app.post('/api/ai/command', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Нет текста' });
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Пользователь управляет таблицей учёта ЖКХ голосом или текстом.

Команда: "${text}"

Объекты: Арнеево, Л25/28, Л45/190, С29/42, О5.1/750, О5.1/888, Н510, НКл78, АлП/396, АлП/397.
Услуги: Членский взнос, Коммунальный платеж, Гольфстрим, Электроэнергия, Холодная вода/водоотведение, ТКО, МОЭК, Капремонт, Интернет.
Месяцы: январь, февраль, март, апрель, май, июнь, июль, август, сентябрь, октябрь, ноябрь, декабрь.

Извлеки данные и ответь ТОЛЬКО JSON:
{"month":"...","service":"...","property":"...","amount":0,"action":"set|clear","comment":"..."}`
      }]
    });

    const raw = response.content[0].text.trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(422).json({ error: 'Не понял команду', raw });
    res.json(JSON.parse(match[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Раздаём собранный frontend (для production на Render)
const path = require('path');
const frontendDist = path.join(__dirname, '../frontend/dist');
if (require('fs').existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ ZHKH backend running on :${PORT}`));
