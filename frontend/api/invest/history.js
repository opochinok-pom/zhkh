// Vercel serverless function (CommonJS) — проксирует историю анализов к Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

// Если фоновая функция анализа была убита платформой по лимиту времени
// выполнения, запись останется в 'pending' навечно, а клиент будет опрашивать
// её впустую. Считаем анализ провалившимся, если он висит в pending дольше
// разумного времени, — и помечаем это в БД, чтобы не пересчитывать при каждом опросе.
const STALE_PENDING_MS = 4 * 60 * 1000;

async function markStaleIfNeeded(row) {
  if (row.status !== 'pending') return row;
  if (Date.now() - new Date(row.created_at).getTime() < STALE_PENDING_MS) return row;

  const errorMessage = 'Анализ прервался на сервере (превышено время выполнения). Попробуйте с меньшим числом скриншотов или повторите попытку.';
  await fetch(`${SUPABASE_URL}/rest/v1/invest_analyses?id=eq.${row.id}`, {
    method: 'PATCH',
    headers: sbHeaders,
    body: JSON.stringify({ status: 'error', error_message: errorMessage }),
  });
  return { ...row, status: 'error', error_message: errorMessage };
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Данные меняются в фоне (опрос статуса анализа) — запрещаем кэширование на всех
  // уровнях (CDN/Vercel Edge, мобильные операторские прокси, браузер), иначе клиент
  // может бесконечно видеть устаревший "pending".
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { id, limit } = req.query;

      if (id) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/invest_analyses?id=eq.${encodeURIComponent(id)}&select=*`,
          { headers: sbHeaders }
        );
        const data = await r.json();
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return res.status(404).json({ error: 'Анализ не найден' });
        return res.status(200).json(await markStaleIfNeeded(row));
      }

      const lim = Number(limit) || 20;
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/invest_analyses?select=id,created_at,broker,currency,total_value,screenshot_count&order=created_at.desc&limit=${lim}`,
        { headers: sbHeaders }
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id обязателен' });
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/invest_analyses?id=eq.${encodeURIComponent(id)}`,
        { method: 'DELETE', headers: sbHeaders }
      );
      if (!r.ok) return res.status(r.status).json(await r.json());
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
