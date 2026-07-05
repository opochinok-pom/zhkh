export async function analyzePortfolio(files) {
  const form = new FormData();
  files.forEach(f => form.append('screenshots', f, f.name));
  const res = await fetch('/api/invest/analyze', { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchHistory(limit = 20) {
  const res = await fetch(`/api/invest/history?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchHistoryItem(id) {
  const res = await fetch(`/api/invest/history?id=${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteHistoryItem(id) {
  const res = await fetch(`/api/invest/history?id=${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
