// Vercel serverless function — проксирует запросы к Supabase
// Браузер → vercel.app/api/payments → Supabase (VPN не блокирует)

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // order=id.desc — при дубликатах find() найдёт самую свежую запись первой
      const r = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=id.desc`, { headers: sbHeaders });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === 'POST') {
      const { month, service, property, amount, oldAmount } = req.body;

      // Upsert платежа
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/payments?on_conflict=month,service,property`,
        {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            month, service, property,
            amount: amount === '' || amount === null ? null : Number(amount),
            updated_at: new Date().toISOString(),
          }),
        }
      );
      const data = await r.json();

      // История
      await fetch(`${SUPABASE_URL}/rest/v1/history`, {
        method: 'POST',
        headers: { ...sbHeaders, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          month, service, property,
          old_amount: oldAmount ?? null,
          new_amount: amount === '' || amount === null ? null : Number(amount),
        }),
      });

      const row = Array.isArray(data) ? data[0] : data;
      return res.status(r.ok ? 200 : r.status).json(row || {});
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
