import { createClient } from '@supabase/supabase-js';

/** Клиент с service_role — обходит RLS. Использовать ТОЛЬКО после проверки подлинности вызывающего. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // supabase-js сам бросает лишь общее "supabaseKey is required" без указания, какой именно
  // переменной не хватает — этого достаточно, чтобы часами гадать, что не так. Частая причина:
  // переменную добавили в Vercel, но забыли отметить окружение Production, либо не сделали
  // Redeploy после добавления (новые env-переменные не подхватываются уже запущенным деплоем).
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL не задан в окружении сервера');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY не задан в окружении сервера — проверьте, что переменная отмечена для Production в Vercel, и сделайте Redeploy после сохранения');
  return createClient(url, key);
}

/** Клиент от имени вызывающего (по его access_token) — только чтобы узнать, кто это, без обхода RLS. */
export function supabaseCaller(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL не задан в окружении сервера');
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY не задан в окружении сервера');
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
}

/** Достаёт и проверяет Bearer-токен из запроса, возвращает аутентифицированного пользователя или null. */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data: { user } } = await supabaseCaller(token).auth.getUser();
  return user;
}
