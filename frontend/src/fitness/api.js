export async function fetchBodyLogs(limit = 180) {
  const res = await fetch(`/api/fitness/body?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveBodyLog(fields) {
  const res = await fetch('/api/fitness/body', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchFitnessState() {
  const res = await fetch('/api/fitness/state');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchWorkoutLogs(exerciseId, limit = 20) {
  const params = new URLSearchParams({ limit });
  if (exerciseId) params.set('exerciseId', exerciseId);
  const res = await fetch(`/api/fitness/workouts?${params}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveWorkoutLog(entry) {
  const res = await fetch('/api/fitness/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
