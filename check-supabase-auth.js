const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://mcfkrdmtsltjkthhxyvh.supabase.co',
  'sb_publishable_5r06phUPvbNmar5GA-hXUA_3rXt8rQ7'
);

async function testAuth() {
  console.log('Тестирую регистрацию...\n');
  
  const { data, error } = await supabase.auth.signUp({
    email: 'test@example.com',
    password: 'test123456',
  });

  if (error) {
    console.error('❌ Ошибка:', error.message);
    console.error('Код:', error.status);
    console.error('\nВозможные причины:');
    console.error('1. Email auth не включен в Supabase');
    console.error('2. Нужно включить: Authentication → Providers → Email');
    console.error('3. Отключить "Confirm email" если не настроен SMTP');
  } else {
    console.log('✅ Успех:', data);
  }
}

testAuth();
