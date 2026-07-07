import { supabase } from '@/lib/supabase';

// Логирует использование инструмента пользователем (upsert — храним последнее использование)
export async function logToolUsage(tool: string) {
  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from('tool_usage').insert({ user_id: data.user.id, tool });
  } catch {
    // молча — логирование не должно ломать инструмент
  }
}
