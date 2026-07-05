// Vercel serverless function — распознаёт скриншоты портфеля, ищет новости
// через встроенный веб-поиск Claude и формирует полный анализ из 10 разделов.
const { readBody, parseMultipart } = require('../_lib/multipart');
const { callClaude, extractJSON } = require('../_lib/claude');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const SECTION_KEYS = [
  'summary', 'composition', 'allocation', 'sector', 'geography',
  'risk', 'diversification', 'performance', 'news_impact', 'recommendations',
];

const SECTION_TITLES = {
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const buf = await readBody(req);
    const { files } = parseMultipart(buf, req.headers['content-type']);
    const images = files.filter(f => f.mediaType.startsWith('image/'));
    if (!images.length) return res.status(400).json({ error: 'Скриншоты не найдены' });

    // ── 1. Распознаём позиции портфеля со всех скриншотов ──────────────────
    const extraction = await callClaude({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: `Ты финансовый аналитик. Тебе показаны один или несколько скриншотов инвестиционного портфеля (брокерское приложение, терминал, таблица). Извлеки все позиции портфеля, объединяя данные со всех скриншотов — если одна и та же позиция встречается на нескольких скриншотах, не дублируй её, возьми наиболее полные данные.
Ответь ТОЛЬКО валидным JSON без markdown в формате:
{"broker":"название брокера/платформы или null","currency":"валюта портфеля (RUB/USD/EUR/...) или null","total_value":число или null,"positions":[{"ticker":"...","name":"...","quantity":число или null,"avg_price":число или null,"current_price":число или null,"value":число или null,"weight_pct":число или null,"asset_class":"акции|облигации|фонды|денежные средства|крипто|прочее","sector":"... или null","country":"... или null"}]}
Если что-то не видно на скриншотах — используй null. Тикеры указывай в стандартном биржевом формате (например SBER, AAPL, TMOS).`,
      messages: [{
        role: 'user',
        content: [
          ...images.map(img => ({
            type: 'image',
            source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
          })),
          { type: 'text', text: 'Распознай портфель на этих скриншотах и верни JSON.' },
        ],
      }],
    });

    const portfolio = extractJSON(extraction.text);

    // ── 2. Ищем новости и строим полный анализ по 10 разделам ──────────────
    const analysisSystem = `Ты профессиональный инвестиционный аналитик. У тебя есть данные портфеля клиента и доступ к инструменту веб-поиска. Используй веб-поиск, чтобы найти актуальные новости (последние 1-2 недели) по основным позициям портфеля, ключевым секторам и общему рынку, которые могут повлиять на портфель.
Затем составь полный анализ портфеля из 10 разделов на русском языке. Каждый раздел — содержательный текст (3-6 предложений или список пунктов через " • "), с конкретикой и ссылками на цифры из портфеля.
Ответь ТОЛЬКО валидным JSON без markdown в формате:
{"sections":{${SECTION_KEYS.map(k => `"${k}":{"title":"${SECTION_TITLES[k]}","text":"..."}`).join(',')}},"news":[{"ticker":"...","title":"...","url":"...","date":"...","sentiment":"positive|negative|neutral","summary":"..."}]}`;

    const analysisUser = `Данные портфеля:\n${JSON.stringify(portfolio)}\n\nНайди актуальные новости и составь полный анализ по всем 10 разделам.`;

    let analysisText;
    try {
      const withSearch = await callClaude({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: analysisSystem,
        messages: [{ role: 'user', content: analysisUser }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
      });
      analysisText = withSearch.text;
    } catch (e) {
      // Веб-поиск может быть недоступен для аккаунта — считаем анализ без свежих новостей
      const withoutSearch = await callClaude({
        model: 'claude-sonnet-5',
        max_tokens: 4096,
        system: analysisSystem + '\nЕсли веб-поиск недоступен, честно укажи это в разделе "news_impact" и оставь news пустым массивом.',
        messages: [{ role: 'user', content: analysisUser }],
      });
      analysisText = withoutSearch.text;
    }

    const analysis = extractJSON(analysisText);
    const sections = analysis.sections || {};
    // Гарантируем присутствие всех 10 разделов даже если модель что-то упустила
    SECTION_KEYS.forEach(k => {
      if (!sections[k]) sections[k] = { title: SECTION_TITLES[k], text: 'Нет данных.' };
    });
    const news = Array.isArray(analysis.news) ? analysis.news : [];

    // ── 3. Сохраняем результат ──────────────────────────────────────────────
    const record = {
      broker: portfolio.broker || null,
      currency: portfolio.currency || null,
      total_value: portfolio.total_value ?? null,
      screenshot_count: images.length,
      positions: portfolio.positions || [],
      sections,
      news,
    };

    const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/invest_analyses`, {
      method: 'POST',
      headers: { ...sbHeaders, 'Prefer': 'return=representation' },
      body: JSON.stringify(record),
    });
    const saved = await saveRes.json();
    const row = Array.isArray(saved) ? saved[0] : saved;

    return res.status(200).json(row || { ...record, id: null, created_at: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
