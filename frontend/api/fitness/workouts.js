// Vercel serverless function (CommonJS) — проксирует к Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';
const { evaluateWorkoutLog } = require('../_lib/fitnessLogic');

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { exerciseId, limit } = req.query;
      let url = `${SUPABASE_URL}/rest/v1/fitness_workout_logs?select=*&order=log_date.desc&limit=${Number(limit) || 100}`;
      if (exerciseId) url += `&exercise_id=eq.${encodeURIComponent(exerciseId)}`;
      const r = await fetch(url, { headers: sbHeaders });
      const data = await r.json();
      return res.status(r.status).json(data);
    }

    if (req.method === 'POST') {
      const {
        logDate, dayKey, exerciseId, exerciseName,
        setsTarget, repsTarget, setsDone, repsDone,
        weightKg, distanceKm, durationMin, durationSec, notes,
      } = req.body;

      if (!logDate || !exerciseId) {
        return res.status(400).json({ error: 'logDate и exerciseId обязательны' });
      }

      const prevStateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/fitness_exercise_state?select=*&exercise_id=eq.${encodeURIComponent(exerciseId)}`,
        { headers: sbHeaders }
      );
      const prevStateRows = await prevStateRes.json();
      const prevState = prevStateRows?.[0] || null;

      const { stateUpdate, message } = evaluateWorkoutLog(
        {
          exerciseId, logDate, setsDone, setsTarget,
          repsDone: Array.isArray(repsDone) ? repsDone.map(Number) : [],
          weightKg, distanceKm, durationSec,
        },
        prevState
      );

      const logRes = await fetch(
        `${SUPABASE_URL}/rest/v1/fitness_workout_logs`,
        {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'return=representation' },
          body: JSON.stringify({
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
          }),
        }
      );
      if (!logRes.ok) return res.status(logRes.status).json(await logRes.json());
      const logData = await logRes.json();
      const log = Array.isArray(logData) ? logData[0] : logData;

      const stateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/fitness_exercise_state?on_conflict=exercise_id`,
        {
          method: 'POST',
          headers: { ...sbHeaders, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(stateUpdate),
        }
      );
      if (!stateRes.ok) return res.status(stateRes.status).json(await stateRes.json());
      const stateData = await stateRes.json();
      const state = Array.isArray(stateData) ? stateData[0] : stateData;

      return res.status(200).json({ log, state, message });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
