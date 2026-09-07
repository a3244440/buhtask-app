import { NextRequest, NextResponse } from 'next/server';
import { notifyTelegram } from '@/lib/telegramNotify';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Кто вызывает — обязателен валидный токен сессии Supabase. Без этого раньше
    // кто угодно мог подставить чужой userId/taskId и заставить сервер (через
    // service_role, в обход RLS) вытащить чужие email/телефон/имя и отправить
    // их в Telegram-чат владельца — без всякой проверки и без лимитов.
    const caller = await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();

    if (body.type === 'registration') {
      const { userId } = body;
      // Уведомление о регистрации можно триггерить только про самого себя — сразу после signUp
      if (userId !== caller.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

      const { data: p } = await db.from('profiles').select('full_name, email, role, city').eq('id', userId).maybeSingle();
      const roleLabel = p?.role === 'accountant' ? '🧮 Бухгалтер' : '👤 Заказчик';
      const text =
        `🆕 <b>Новая регистрация на BuhTask</b>\n\n` +
        `${roleLabel}\n` +
        `Имя: ${esc(p?.full_name || '—')}\n` +
        `Email: ${esc(p?.email || '—')}\n` +
        (p?.city ? `Город: ${esc(p.city)}\n` : '');
      const result = await notifyTelegram(text);
      if (!result.ok) console.error('notify: registration Telegram send failed:', result.error);
      return NextResponse.json({ ok: result.ok, telegramError: result.error });
    }

    if (body.type === 'task') {
      const { taskId } = body;
      const { data: task } = await db.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (!task) return NextResponse.json({ ok: false });
      // Уведомление о задаче может запросить только её реальный создатель
      if (task.client_id !== caller.id) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });

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
      const result = await notifyTelegram(text);
      if (!result.ok) console.error('notify: task Telegram send failed:', result.error);
      return NextResponse.json({ ok: result.ok, telegramError: result.error });
    }

    return NextResponse.json({ ok: false, error: 'unknown type' }, { status: 400 });
  } catch (e: any) {
    console.error('notify error', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
