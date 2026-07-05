// Простой парсер multipart/form-data без внешних зависимостей.
// Поддерживает несколько файлов с одинаковым или разными именами полей.
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function parseMultipart(buf, contentType) {
  const boundaryMatch = (contentType || '').match(/boundary=(.+)$/);
  if (!boundaryMatch) throw new Error('Нет boundary в Content-Type');
  const boundary = '--' + boundaryMatch[1].trim();
  const bodyStr = buf.toString('binary');
  const parts = bodyStr.split(boundary).slice(1, -1);

  const files = [];
  const fields = {};

  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const rawHeaders = part.slice(0, headerEnd);
    const raw = part.slice(headerEnd + 4).replace(/\r\n$/, '');

    const nameMatch = rawHeaders.match(/name="([^"]+)"/);
    const fileNameMatch = rawHeaders.match(/filename="([^"]*)"/);
    const name = nameMatch ? nameMatch[1] : null;
    if (!name) continue;

    if (fileNameMatch) {
      const mtMatch = rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i);
      files.push({
        field: name,
        filename: fileNameMatch[1],
        mediaType: mtMatch ? mtMatch[1].trim() : 'application/octet-stream',
        base64: Buffer.from(raw, 'binary').toString('base64'),
      });
    } else {
      // raw — «двоичная» (latin1) строка; текстовые поля почти всегда UTF-8
      // (кириллица и т.п.), поэтому перекодируем обратно через Buffer.
      fields[name] = Buffer.from(raw, 'binary').toString('utf8');
    }
  }

  return { fields, files };
}

module.exports = { readBody, parseMultipart };
