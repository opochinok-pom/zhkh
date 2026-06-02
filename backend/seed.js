/**
 * Seed script — загружает данные из ЖКХ_backup.json в Supabase
 * Запуск: node seed.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { realtime: { transport: ws } }
);

async function seed() {
  const backupPath = path.join(process.env.HOME || '/root', 'Downloads', 'ЖКХ_backup.json');

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Файл не найден:', backupPath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const rows = [];

  for (const [month, services] of Object.entries(raw)) {
    for (const [service, properties] of Object.entries(services)) {
      for (const [property, amount] of Object.entries(properties)) {
        rows.push({
          month,
          service,
          property,
          amount: amount === null ? null : Number(amount),
          updated_at: new Date().toISOString()
        });
      }
    }
  }

  console.log(`📦 Импортирую ${rows.length} записей…`);

  // Batch upsert in chunks of 500
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('payments')
      .upsert(chunk, { onConflict: 'month,service,property' });

    if (error) {
      console.error('❌ Ошибка на чанке', i, ':', error.message);
      process.exit(1);
    }
    console.log(`  ✅ ${Math.min(i + chunkSize, rows.length)} / ${rows.length}`);
  }

  console.log('🎉 Данные успешно загружены!');
}

seed().catch(e => { console.error(e); process.exit(1); });
