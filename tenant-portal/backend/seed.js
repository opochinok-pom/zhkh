require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function seed() {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin2026';
  const hash = await bcrypt.hash(adminPassword, 10);

  const { error } = await supabase.from('users').upsert({
    name: 'Администратор',
    password_hash: hash,
    role: 'admin',
    property_id: null
  }, { onConflict: 'role' });

  if (error && !error.message.includes('unique')) {
    // insert if upsert failed
    await supabase.from('users').insert({ name: 'Администратор', password_hash: hash, role: 'admin' });
  }

  console.log('✅ Администратор создан. Пароль:', adminPassword);
  console.log('');
  console.log('Для добавления арендаторов войдите как admin и используйте раздел "Арендаторы".');
}

seed().catch(console.error);
