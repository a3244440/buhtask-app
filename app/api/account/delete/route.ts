import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();

    const { data: callerProfile } = await db.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const { requestId } = await req.json();
    if (!requestId) return NextResponse.json({ error: 'requestId обязателен' }, { status: 400 });

    const { data: request } = await db.from('account_deletion_requests').select('*').eq('id', requestId).maybeSingle();
    if (!request) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    if (request.status !== 'pending') return NextResponse.json({ error: 'Заявка уже обработана' }, { status: 409 });

    // Удаляем профиль явно (не полагаемся на каскад из auth.users — он может быть не настроен
    // в реальной базе), затем сам аккаунт через Admin API (обычный DB delete/RLS так не может —
    // удаление из auth.users доступно только через service_role Admin API).
    await db.from('profiles').delete().eq('id', request.user_id);
    const { error: authError } = await db.auth.admin.deleteUser(request.user_id);
    if (authError) {
      // Профиль уже мог быть удалён каскадом при первой попытке — не считаем это фатальным,
      // но если сам auth-аккаунт не удалился, сообщаем администратору явно.
      return NextResponse.json({ error: 'Профиль удалён, но не удалось удалить сам аккаунт: ' + authError.message }, { status: 500 });
    }

    await db.from('account_deletion_requests').update({
      status: 'approved', processed_at: new Date().toISOString(),
    }).eq('id', requestId);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('account/delete error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
