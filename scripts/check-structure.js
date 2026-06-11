// Проверка структуры таблицы profiles
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mcfkrdmtsltjkthhxyvh.supabase.co';
const supabaseKey = 'sb_publishable_5r06phUPvbNmar5GA-hXUA_3rXt8rQ7';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStructure() {
  console.log('Проверка структуры profiles...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Ошибка:', error);
  } else {
    console.log('Существующие поля в profiles:', data.length > 0 ? Object.keys(data[0]) : 'таблица пуста');
    if (data.length > 0) {
      console.log('\nПример записи:', data[0]);
    }
  }
}

checkStructure();
