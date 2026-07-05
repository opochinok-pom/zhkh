const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude({ model, system, messages, tools, max_tokens = 1024 }) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY не задан');

  const headers = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  if (tools && tools.length) headers['anthropic-beta'] = 'web-search-2025-03-05';

  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model, max_tokens, system, messages, ...(tools ? { tools } : {}) }),
  });

  if (!r.ok) {
    const err = await r.text();
    const e = new Error('Anthropic error: ' + err);
    e.status = r.status;
    throw e;
  }

  const data = await r.json();
  const text = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');
  return { text, raw: data };
}

// Достаёт JSON-объект из текста, даже если модель обернула его в markdown или добавила пояснения.
function extractJSON(text) {
  const cleaned = text.replace(/```json?|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Не удалось найти JSON в ответе модели');
  return JSON.parse(cleaned.slice(start, end + 1));
}

module.exports = { callClaude, extractJSON };
