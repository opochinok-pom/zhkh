// Vercel serverless function — парсит текстовую команду через Claude
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const MONTHS = [
  'январь','февраль','март','апрель','май','июнь',
  'июль','август','сентябрь','октябрь','ноябрь','декабрь'
];
const PROPERTIES = [
  'Арнеево','Л25/28','Л45/190','С29/42',
  'О5.1/750','О5.1/888','Н510','НКл78','АлП/396','АлП/397',
  'Моравия','Горького 66'
];
const SERVICES = [
  'Членский взнос','Коммунальный платеж','Гольфстрим',
  'Электроэнергия','Холодная вода, водоотведение',
  'ТКО','МОЭК','Капремонт','Интернет'
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY не задан' });
  }

  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Нет текста команды' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 256,
        system: `Ты помощник по ЖКХ. Извлеки из команды пользователя: месяц, объект, услугу и сумму.
Доступные месяцы: ${MONTHS.join(', ')}.
Доступные объекты: ${PROPERTIES.join(', ')}.
Доступные услуги: ${SERVICES.join(', ')}.
Ответь ТОЛЬКО валидным JSON без markdown: {"month":"...","property":"...","service":"...","amount":число или null}.
Используй точные названия из списков. Если что-то не найдено — null.`,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: 'Anthropic error: ' + err });
    }

    const data = await r.json();
    const raw = data.content?.[0]?.text || '{}';
    const parsed = JSON.parse(raw.replace(/```json?|```/g, '').trim());
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
