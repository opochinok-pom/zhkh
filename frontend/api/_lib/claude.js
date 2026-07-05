const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude({ model, system, messages, tools, tool_choice, max_tokens = 1024 }) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY не задан');

  const headers = {
    'x-api-key': ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  };
  if (tools && tools.some(t => t.type === 'web_search_20250305')) {
    headers['anthropic-beta'] = 'web-search-2025-03-05';
  }

  const r = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model, max_tokens, system, messages,
      ...(tools ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
    }),
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
  // Аргументы tool_use уже провалидированы API по input_schema — валидный JS-объект,
  // без риска сломанного JSON, в отличие от текстового ответа модели.
  const toolUses = (data.content || []).filter(b => b.type === 'tool_use');
  return { text, toolUses, raw: data };
}

function findToolUse(toolUses, name) {
  return (toolUses || []).find(t => t.name === name)?.input || null;
}

// Модель часто кладёт "настоящие" переводы строк внутрь строковых значений JSON
// (вместо \n), из-за чего JSON.parse падает с "Bad control character". Эскейпим
// управляющие символы, но только когда мы внутри строкового литерала.
function escapeControlCharsInStrings(str) {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = str.charCodeAt(i);
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === '\\') { out += ch; escaped = true; continue; }
      if (ch === '"') { inString = false; out += ch; continue; }
      if (code === 10) { out += '\\n'; continue; }
      if (code === 13) { out += '\\r'; continue; }
      if (code === 9) { out += '\\t'; continue; }
      if (code < 0x20) continue; // остальные управляющие символы просто выкидываем
      out += ch;
    } else {
      if (ch === '"') { inString = true; }
      out += ch;
    }
  }
  return out;
}

// Достаёт JSON-объект из текста, даже если модель обернула его в markdown или добавила пояснения.
function extractJSON(text) {
  const cleaned = text.replace(/```json?|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Не удалось найти JSON в ответе модели');
  const jsonSlice = escapeControlCharsInStrings(cleaned.slice(start, end + 1));
  return JSON.parse(jsonSlice);
}

module.exports = { callClaude, extractJSON, findToolUse };
