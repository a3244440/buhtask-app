import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyTelegram } from '@/lib/telegramNotify';

// Сервисный клиент — обходит RLS, чтобы гарантированно подтянуть данные пользователя/компании для уведомления
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = admin();

    if (body.type === 'registration') {
      const { userId } = body;
      const { data: p } = await db.from('profiles').select('full_name, email, role, city').eq('id', userId).maybeSingle();
      const roleLabel = p?.role === 'accountant' ? '🧮 Бухгалтер' : '👤 Заказчик';
      const text =
        `🆕 <b>Новая регистрация на BuhTask</b>\n\n` +
        `${roleLabel}\n` +
        `Имя: ${esc(p?.full_name || '—')}\n` +
        `Email: ${esc(p?.email || '—')}\n` +
        (p?.city ? `Город: ${esc(p.city)}\n` : '');
      await notifyTelegram(text);
      return NextResponse.json({ ok: true });
    }

    if (body.type === 'task') {
      const { taskId } = body;
      const { data: task } = await db.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task) return NextResponse.json({ ok: false });
      const { data: client } = await db.from('profiles').select('full_name, email, phone').eq('id', task.client_id).maybeSingle();
      let companyName = '';
      if (task.company_id) {
        const { data: comp } = await db.from('companies').select('name').eq('id', task.company_id).maybeSingle();
        companyName = comp?.name || '';
      }
      const text =
        `📋 <b>Новая задача на BuhTask</b>\n\n` +
        `«${esc(task.title)}»\n` +
        (task.category ? `Категория: ${esc(task.category)}\n` : '') +
        (task.city ? `Город: ${esc(task.city)}\n` : '') +
        (companyName ? `Компания: ${esc(companyName)}\n` : '') +
        `\n👤 Заказчик: ${esc(client?.full_name || '—')}\n` +
        `Email: ${esc(client?.email || '—')}` +
        (client?.phone ? `\nТелефон: ${esc(client.phone)}` : '');
      await notifyTelegram(text);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'unknown type' }, { status: 400 });
  } catch (e: any) {
    console.error('notify error', e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
