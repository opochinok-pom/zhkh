// Прямое подключение к Supabase из браузера (без backend-прокси)
const SUPABASE_URL = 'https://pyabrzbllszumqfuibtl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWJyemJsbHN6dW1xZnVpYnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzk1MzgsImV4cCI6MjA5NTkxNTUzOH0.FHIi4V0x_K4dXx1OIeDH2MS09bSOI9E4FAPwfFEqc78';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

export async function fetchPayments() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/payments?select=*&order=month`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function upsertPayment(month, service, property, amount) {
  // Сначала читаем старое значение для истории
  const oldRes = await fetch(
    `${SUPABASE_URL}/rest/v1/payments?month=eq.${encodeURIComponent(month)}&service=eq.${encodeURIComponent(service)}&property=eq.${encodeURIComponent(property)}&select=amount`,
    { headers }
  );
  const oldRows = await oldRes.json();
  const oldAmount = oldRows[0]?.amount ?? null;

  // Upsert платежа
  const body = JSON.stringify({
    month, service, property,
    amount: amount === '' || amount === null ? null : Number(amount),
    updated_at: new Date().toISOString()
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
    body,
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();

  // Пишем в историю
  await fetch(`${SUPABASE_URL}/rest/v1/history`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      month, service, property,
      old_amount: oldAmount,
      new_amount: amount === '' || amount === null ? null : Number(amount),
    }),
  });

  return Array.isArray(data) ? data[0] : data;
}

export async function fetchHistory() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/history?select=*&order=changed_at.desc&limit=200`,
    { headers }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function parseReceiptAI(file) {
  // Через backend (если доступен), иначе сообщение
  const form = new FormData();
  form.append('image', file);
  const res = await fetch('/api/ai/receipt', { method: 'POST', body: form });
  if (!res.ok) throw new Error('AI недоступен локально. Задеплойте backend на Render.');
  return res.json();
}

export async function parseCommandAI(text) {
  const res = await fetch('/api/ai/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('AI недоступен локально. Задеплойте backend на Render.');
  return res.json();
}
