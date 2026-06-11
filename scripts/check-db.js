// Проверка существующих таблиц в Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mcfkrdmtsltjkthhxyvh.supabase.co';
const supabaseKey = 'sb_publishable_5r06phUPvbNmar5GA-hXUA_3rXt8rQ7';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Проверка существующих таблиц...\n');

  const tables = ['profiles', 'clients', 'accountants', 'tasks', 'task_proposals'];

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: не существует или нет доступа`);
      } else {
        console.log(`✅ ${table}: существует (записей: ${count || 0})`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ошибка - ${err.message}`);
    }
  }
}

checkTables();
