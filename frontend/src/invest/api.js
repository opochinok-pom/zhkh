// Запускает анализ и сразу возвращает {id, status:'pending'} — сама обработка
// (30-90+ сек) идёт в фоне на сервере, чтобы не держать клиента на одном долгом
// запросе (мобильные сети часто рвут соединение без данных дольше 30-60 сек).
export async function analyzePortfolio(files, instructions) {
  const form = new FormData();
  files.forEach(f => form.append('screenshots', f, f.name));
  if (instructions && instructions.trim()) form.append('instructions', instructions.trim());
  const res = await fetch('/api/invest/analyze', { method: 'POST', body: form });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Не удалось запустить анализ');
  return data;
}

// Опрашивает статус анализа, пока он не станет 'done' или 'error'.
export async function pollAnalysis(id, { intervalMs = 3000, timeoutMs = 5 * 60 * 1000, onTick } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await fetchHistoryItem(id);
    if (onTick) onTick(data);
    if (data.status !== 'pending') return data;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error('Анализ выполняется слишком долго — попробуйте открыть его позже в истории');
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
