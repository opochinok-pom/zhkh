// Все запросы идут через Vercel serverless functions (/api/*)
// Браузер → vercel.app → Supabase (VPN не блокирует прямые запросы к supabase.co)

export async function fetchPayments() {
  const res = await fetch('/api/payments');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function upsertPayment(month, service, property, amount, oldAmount) {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month, service, property, amount, oldAmount }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch('/api/history');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function parseReceiptAI(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch('/api/ai/receipt', { method: 'POST', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function parseCommandAI(text) {
  const res = await fetch('/api/ai/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
