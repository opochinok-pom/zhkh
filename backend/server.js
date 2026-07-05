require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const ws = require('ws');
const { evaluateWorkoutLog, getSleepWarning } = require('./fitnessLogic');

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

// Достаёт JSON-объект из текста, даже если модель обернула его в markdown или добавила пояснения.
function extractJson(text) {
  const cleaned = String(text || '').replace(/```json?|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Не удалось найти JSON в ответе модели');
  return JSON.parse(cleaned.slice(start, end + 1));
}

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

// ── Фитнес: дневник тела (вес/сон/замеры) ────────────────────────────────────

app.get('/api/fitness/body', async (req, res) => {
  const limit = Number(req.query.limit) || 180;
  const { data, error } = await supabase
    .from('fitness_body_logs')
    .select('*')
    .order('log_date', { ascending: false })
    .limit(limit);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/fitness/body', async (req, res) => {
  const { log_date, ...fields } = req.body;
  if (!log_date) return res.status(400).json({ error: 'log_date обязателен' });

  const { data, error } = await supabase
    .from('fitness_body_logs')
    .upsert({ log_date, ...fields }, { onConflict: 'log_date' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Фитнес: журнал тренировок + адаптация программы ─────────────────────────

app.get('/api/fitness/workouts', async (req, res) => {
  const { exerciseId, limit } = req.query;
  let query = supabase.from('fitness_workout_logs').select('*').order('log_date', { ascending: false });
  if (exerciseId) query = query.eq('exercise_id', exerciseId);
  query = query.limit(Number(limit) || 100);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/fitness/workouts', async (req, res) => {
  const {
    logDate, dayKey, exerciseId, exerciseName,
    setsTarget, repsTarget, setsDone, repsDone,
    weightKg, distanceKm, durationMin, durationSec, notes,
  } = req.body;

  if (!logDate || !exerciseId) {
    return res.status(400).json({ error: 'logDate и exerciseId обязательны' });
  }

  const { data: prevState } = await supabase
    .from('fitness_exercise_state')
    .select('*')
    .eq('exercise_id', exerciseId)
    .maybeSingle();

  const { stateUpdate, message } = evaluateWorkoutLog(
    {
      exerciseId, logDate, setsDone, setsTarget,
      repsDone: Array.isArray(repsDone) ? repsDone.map(Number) : [],
      weightKg, distanceKm, durationSec,
    },
    prevState
  );

  const { data: log, error: logError } = await supabase
    .from('fitness_workout_logs')
    .insert({
      log_date: logDate,
      day_key: dayKey || null,
      exercise_id: exerciseId,
      exercise_name: exerciseName || null,
      sets_target: setsTarget ?? null,
      reps_target: repsTarget ?? null,
      sets_done: setsDone ?? null,
      reps_done: Array.isArray(repsDone) ? repsDone.join(',') : (repsDone ?? null),
      weight_kg: weightKg ?? null,
      distance_km: distanceKm ?? null,
      duration_min: durationMin ?? (durationSec ? durationSec / 60 : null),
      notes: notes || null,
    })
    .select()
    .single();

  if (logError) return res.status(500).json({ error: logError.message });

  const { data: state, error: stateError } = await supabase
    .from('fitness_exercise_state')
    .upsert(stateUpdate, { onConflict: 'exercise_id' })
    .select()
    .single();

  if (stateError) return res.status(500).json({ error: stateError.message });

  res.json({ log, state, message });
});

// ── Фитнес: текущее состояние программы (адаптивные targets) ────────────────

app.get('/api/fitness/state', async (req, res) => {
  const [{ data: states, error: statesError }, { data: bodyLogs, error: bodyError }] = await Promise.all([
    supabase.from('fitness_exercise_state').select('*'),
    supabase.from('fitness_body_logs').select('*').order('log_date', { ascending: false }).limit(1),
  ]);

  if (statesError) return res.status(500).json({ error: statesError.message });
  if (bodyError) return res.status(500).json({ error: bodyError.message });

  const latestBodyLog = bodyLogs?.[0] || null;
  res.json({
    states: states || [],
    latestBodyLog,
    sleepWarning: getSleepWarning(latestBodyLog),
  });
});

// ── Инвестиции: анализ портфеля по скриншотам ────────────────────────────────

const INVEST_SECTION_KEYS = [
  'summary', 'composition', 'allocation', 'sector', 'geography',
  'risk', 'diversification', 'performance', 'news_impact', 'recommendations',
];

const INVEST_SECTION_TITLES = {
  summary: 'Сводка по портфелю',
  composition: 'Состав активов',
  allocation: 'Аллокация по классам активов',
  sector: 'Отраслевая структура',
  geography: 'Географическая структура',
  risk: 'Риск и волатильность',
  diversification: 'Диверсификация',
  performance: 'Доходность и динамика',
  news_impact: 'Влияние новостей на позиции',
  recommendations: 'Рекомендации по ребалансировке',
};

app.post('/api/invest/analyze', upload.array('screenshots', 10), async (req, res) => {
  const images = (req.files || []).filter(f => f.mimetype.startsWith('image/'));
  if (!images.length) return res.status(400).json({ error: 'Скриншоты не найдены' });

  try {
    const extraction = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: `Ты финансовый аналитик. Тебе показаны один или несколько скриншотов инвестиционного портфеля (брокерское приложение, терминал, таблица). Извлеки все позиции портфеля, объединяя данные со всех скриншотов — если одна и та же позиция встречается на нескольких скриншотах, не дублируй её, возьми наиболее полные данные.
Ответь ТОЛЬКО валидным JSON без markdown в формате:
{"broker":"название брокера/платформы или null","currency":"валюта портфеля (RUB/USD/EUR/...) или null","total_value":число или null,"positions":[{"ticker":"...","name":"...","quantity":число или null,"avg_price":число или null,"current_price":число или null,"value":число или null,"weight_pct":число или null,"asset_class":"акции|облигации|фонды|денежные средства|крипто|прочее","sector":"... или null","country":"... или null"}]}
Если что-то не видно на скриншотах — используй null. Тикеры указывай в стандартном биржевом формате (например SBER, AAPL, TMOS).`,
      messages: [{
        role: 'user',
        content: [
          ...images.map(f => ({ type: 'image', source: { type: 'base64', media_type: f.mimetype, data: f.buffer.toString('base64') } })),
          { type: 'text', text: 'Распознай портфель на этих скриншотах и верни JSON.' },
        ],
      }],
    });

    const extractionText = extraction.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    const portfolio = extractJson(extractionText);

    const analysisSystem = `Ты профессиональный инвестиционный аналитик. У тебя есть данные портфеля клиента и доступ к инструменту веб-поиска. Используй веб-поиск, чтобы найти актуальные новости (последние 1-2 недели) по основным позициям портфеля, ключевым секторам и общему рынку, которые могут повлиять на портфель.
Затем составь полный анализ портфеля из 10 разделов на русском языке. Каждый раздел — содержательный текст (3-6 предложений или список пунктов через " • "), с конкретикой и ссылками на цифры из портфеля.
Ответь ТОЛЬКО валидным JSON без markdown в формате:
{"sections":{${INVEST_SECTION_KEYS.map(k => `"${k}":{"title":"${INVEST_SECTION_TITLES[k]}","text":"..."}`).join(',')}},"news":[{"ticker":"...","title":"...","url":"...","date":"...","sentiment":"positive|negative|neutral","summary":"..."}]}`;

    const analysisUser = `Данные портфеля:\n${JSON.stringify(portfolio)}\n\nНайди актуальные новости и составь полный анализ по всем 10 разделам.`;

    let analysisText;
    try {
      const withSearch = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: analysisSystem,
        messages: [{ role: 'user', content: analysisUser }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
      }, { headers: { 'anthropic-beta': 'web-search-2025-03-05' } });
      analysisText = withSearch.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    } catch (e) {
      // Веб-поиск может быть недоступен для аккаунта — считаем анализ без свежих новостей
      const withoutSearch = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: analysisSystem + '\nЕсли веб-поиск недоступен, честно укажи это в разделе "news_impact" и оставь news пустым массивом.',
        messages: [{ role: 'user', content: analysisUser }],
      });
      analysisText = withoutSearch.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    }

    const analysis = extractJson(analysisText);
    const sections = analysis.sections || {};
    INVEST_SECTION_KEYS.forEach(k => {
      if (!sections[k]) sections[k] = { title: INVEST_SECTION_TITLES[k], text: 'Нет данных.' };
    });
    const news = Array.isArray(analysis.news) ? analysis.news : [];

    const record = {
      broker: portfolio.broker || null,
      currency: portfolio.currency || null,
      total_value: portfolio.total_value ?? null,
      screenshot_count: images.length,
      positions: portfolio.positions || [],
      sections,
      news,
    };

    const { data: saved, error } = await supabase.from('invest_analyses').insert(record).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invest/history', async (req, res) => {
  const { id, limit } = req.query;

  if (id) {
    const { data, error } = await supabase.from('invest_analyses').select('*').eq('id', id).maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Анализ не найден' });
    return res.json(data);
  }

  const { data, error } = await supabase
    .from('invest_analyses')
    .select('id,created_at,broker,currency,total_value,screenshot_count')
    .order('created_at', { ascending: false })
    .limit(Number(limit) || 20);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/invest/history', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id обязателен' });
  const { error } = await supabase.from('invest_analyses').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
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
