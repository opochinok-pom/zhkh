// Vercel serverless function — распознаёт скриншоты портфеля, ищет новости
// через встроенный веб-поиск Claude и формирует полный анализ из 10 разделов.
// Итоговый JSON приходит через tool-use (аргументы валидируются Anthropic API
// по input_schema), а не парсится из свободного текста — так надёжнее.
const { readBody, parseMultipart } = require('../_lib/multipart');
const { callClaude, extractJSON, findToolUse, coerceJSON } = require('../_lib/claude');
const { SECTION_KEYS, SECTION_TITLES, PORTFOLIO_TOOL, ANALYSIS_TOOL } = require('../_lib/investSchemas');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
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
      max_tokens: 4096,
      system: `Ты финансовый аналитик. Тебе показаны один или несколько скриншотов инвестиционного портфеля (брокерское приложение, терминал, таблица). Извлеки все позиции портфеля, объединяя данные со всех скриншотов — если одна и та же позиция встречается на нескольких скриншотах, не дублируй её, возьми наиболее полные данные. Если что-то не видно на скриншотах — используй null. Тикеры указывай в стандартном биржевом формате (например SBER, AAPL, TMOS). Обязательно вызови extract_portfolio с результатом.`,
      messages: [{
        role: 'user',
        content: [
          ...images.map(img => ({
            type: 'image',
            source: { type: 'base64', media_type: img.mediaType, data: img.base64 },
          })),
          { type: 'text', text: 'Распознай портфель на этих скриншотах и передай результат в extract_portfolio.' },
        ],
      }],
      tools: [PORTFOLIO_TOOL],
      tool_choice: { type: 'tool', name: 'extract_portfolio' },
    });

    const portfolio = findToolUse(extraction.toolUses, 'extract_portfolio');
    if (!portfolio) return res.status(502).json({ error: 'Claude не распознал портфель' });

    // ── 2. Ищем новости и строим полный анализ по 10 разделам ──────────────
    const analysisSystem = `Ты профессиональный инвестиционный аналитик. У тебя есть данные портфеля клиента и доступ к инструменту веб-поиска. Используй веб-поиск, чтобы найти актуальные новости (последние 1-2 недели) по основным позициям портфеля, ключевым секторам и общему рынку, которые могут повлиять на портфель.
Затем составь полный анализ портфеля из 10 разделов на русском языке. Каждый раздел — содержательный текст (2-4 предложения или список пунктов через " • "), с конкретикой и ссылками на цифры из портфеля.
Когда исследование закончено, ОБЯЗАТЕЛЬНО вызови submit_analysis ровно один раз с итоговым результатом — это единственный способ вернуть ответ, не пиши финальный вывод обычным текстом. Поле sections — это настоящий вложенный JSON-объект с 10 ключами (каждый — объект {title, text}), а не строка с текстом JSON внутри.`;

    const analysisUser = `Данные портфеля:\n${JSON.stringify(portfolio)}\n\nНайди актуальные новости и составь полный анализ по всем 10 разделам, затем вызови submit_analysis.`;

    let analysis = null;
    try {
      const withSearch = await callClaude({
        model: 'claude-sonnet-5',
        max_tokens: 8192,
        system: analysisSystem,
        messages: [{ role: 'user', content: analysisUser }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }, ANALYSIS_TOOL],
      });
      analysis = findToolUse(withSearch.toolUses, 'submit_analysis');
      if (!analysis && withSearch.text) analysis = extractJSON(withSearch.text);
    } catch (e) {
      analysis = null;
    }

    if (!analysis) {
      // Веб-поиск может быть недоступен для аккаунта, либо модель не вызвала tool —
      // повторяем запрос без поиска, но с жёстко зафиксированным tool_choice.
      const withoutSearch = await callClaude({
        model: 'claude-sonnet-5',
        max_tokens: 8192,
        system: analysisSystem + '\nЕсли у тебя нет доступа к свежим новостям, честно укажи это в разделе "news_impact" и оставь news пустым массивом.',
        messages: [{ role: 'user', content: analysisUser }],
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: 'tool', name: 'submit_analysis' },
      });
      analysis = findToolUse(withoutSearch.toolUses, 'submit_analysis');
      if (!analysis) return res.status(502).json({ error: 'Claude не смог сформировать анализ' });
    }

    // Даже при tool-use модель иногда кладёт sections/news как строку с сырым JSON
    // вместо настоящей структуры — пытаемся распарсить перед проверками ниже.
    const coercedSections = coerceJSON(analysis.sections);
    const sections = (coercedSections && typeof coercedSections === 'object' && !Array.isArray(coercedSections))
      ? coercedSections : {};
    // Гарантируем присутствие всех 10 разделов даже если модель что-то упустила
    SECTION_KEYS.forEach(k => {
      if (!sections[k]) sections[k] = { title: SECTION_TITLES[k], text: 'Нет данных.' };
    });
    const coercedNews = coerceJSON(analysis.news);
    const news = Array.isArray(coercedNews) ? coercedNews : [];

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
