// Vercel serverless function (CommonJS) — проксирует к Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const limit = Number(req.query.limit) || 180;
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/fitness_body_logs?select=*&order=log_date.desc&limit=${limit}`,
        { headers: sbHeaders }
      );
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === 'PUT') {
      const { log_date, ...fields } = req.body;
      if (!log_date) return res.status(400).json({ error: 'log_date обязателен' });

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/fitness_body_logs?on_conflict=log_date`,
        {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ log_date, ...fields }),
        }
      );
      const data = await r.json();
      const row = Array.isArray(data) ? data[0] : data;
      return res.status(r.ok ? 200 : r.status).json(row || {});
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
