// Vercel serverless function — распознаёт квитанцию через Claude Vision
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

  try {
    // Читаем multipart form-data
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    const bodyStr = buf.toString('binary');

    // Извлекаем boundary из Content-Type
    const ct = req.headers['content-type'] || '';
    const boundaryMatch = ct.match(/boundary=(.+)/);
    if (!boundaryMatch) return res.status(400).json({ error: 'Нет boundary' });
    const boundary = boundaryMatch[1];

    // Разбираем multipart
    const parts = bodyStr.split('--' + boundary);
    let imageBase64 = null;
    let mediaType = 'image/jpeg';

    for (const part of parts) {
      if (part.includes('name="image"')) {
        const mtMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
        if (mtMatch) mediaType = mtMatch[1].trim();
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const raw = part.slice(headerEnd + 4).replace(/\r\n$/, '');
          imageBase64 = Buffer.from(raw, 'binary').toString('base64');
        }
        break;
      }
    }

    if (!imageBase64) return res.status(400).json({ error: 'Изображение не найдено' });

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        system: `Ты помощник по ЖКХ. Распознай квитанцию на изображении и извлеки данные.
Доступные месяцы: ${MONTHS.join(', ')}.
Доступные объекты: ${PROPERTIES.join(', ')}.
Доступные услуги: ${SERVICES.join(', ')}.
Ответь ТОЛЬКО валидным JSON без markdown:
{"month":"...","property":"...","service":"...","amount":число или null,"confidence":"high"|"medium"|"low","comment":"..."}
Используй точные названия из списков. Если что-то не найдено — null.`,
        messages: [{
          role: 'user',
          content: [{
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          }, {
            type: 'text',
            text: 'Распознай эту квитанцию ЖКХ и верни JSON.',
          }],
        }],
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
