import { createClient } from '@supabase/supabase-js';

/** Клиент с service_role — обходит RLS. Использовать ТОЛЬКО после проверки подлинности вызывающего. */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/** Клиент от имени вызывающего (по его access_token) — только чтобы узнать, кто это, без обхода RLS. */
export function supabaseCaller(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
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
