// Vercel serverless function (CommonJS) — проксирует к Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';
const { getSleepWarning } = require('../_lib/fitnessLogic');

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [statesRes, bodyRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/fitness_exercise_state?select=*`, { headers: sbHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/fitness_body_logs?select=*&order=log_date.desc&limit=1`, { headers: sbHeaders }),
    ]);

    if (!statesRes.ok) return res.status(statesRes.status).json(await statesRes.json());
    if (!bodyRes.ok) return res.status(bodyRes.status).json(await bodyRes.json());

    const states = await statesRes.json();
    const bodyLogs = await bodyRes.json();
    const latestBodyLog = bodyLogs?.[0] || null;

    return res.status(200).json({
      states: states || [],
      latestBodyLog,
      sleepWarning: getSleepWarning(latestBodyLog),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
