import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const caller = await getAuthenticatedUser(req);
    if (!caller) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const db = supabaseAdmin();
    const { data: callerProfile, error: callerError } = await db.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (callerError) throw callerError;
    if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const body = await req.json().catch(() => null);
    const requestId = body?.requestId;
    if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      return NextResponse.json({ error: 'Укажите корректный requestId' }, { status: 400 });
    }
    const { data: request, error: requestError } = await db.from('account_deletion_requests').select('*').eq('id', requestId).maybeSingle();
    if (requestError) throw requestError;
    if (!request) return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    if (request.status === 'approved') return NextResponse.json({ ok: true });
    if (request.status !== 'pending') return NextResponse.json({ error: 'Заявка уже обработана' }, { status: 409 });

    // Null means the profile was already removed by the FK cascade.
    // A retry after an unsuccessful audit update can finish the request.
    if (request.user_id) {
      const { data: target, error: targetError } = await db.from('profiles').select('role').eq('id', request.user_id).maybeSingle();
      if (targetError) throw targetError;
      if (request.user_id === caller.id || target?.role === 'admin') {
        return NextResponse.json({ error: 'Нельзя удалить аккаунт администратора' }, { status: 403 });
      }
      const { data: files, error: filesError } = await db.rpc('account_storage_objects', { target_user_id: request.user_id });
      if (filesError) throw new Error('Не удалось получить файлы аккаунта. Проверьте миграцию базы: ' + filesError.message);
      const byBucket = new Map<string, string[]>();
      for (const file of (files || []) as { bucket_id: string; name: string }[]) {
        const paths = byBucket.get(file.bucket_id) || [];
        paths.push(file.name);
        byBucket.set(file.bucket_id, paths);
      }
      for (const [bucket, paths] of byBucket) {
        for (let i = 0; i < paths.length; i += 100) {
          const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + 100));
          if (error) throw new Error('Не удалось удалить файлы аккаунта: ' + error.message);
        }
      }
      // Auth deletion and its profile cascade run in one database transaction.
      // On failure the profile and pending request remain available for retry.
      const { error: authError } = await db.auth.admin.deleteUser(request.user_id);
      if (authError) throw new Error('Не удалось удалить аккаунт: ' + authError.message);
    }

    const { data: processed, error: processedError } = await db.from('account_deletion_requests').update({
      status: 'approved', processed_at: new Date().toISOString(),
    }).eq('id', requestId).eq('status', 'pending').select('id').maybeSingle();
    if (processedError) throw new Error('Аккаунт удалён, но не удалось обновить заявку. Повторите подтверждение: ' + processedError.message);
    if (!processed) throw new Error('Не удалось обновить заявку. Обновите список заявок.');
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('account/delete error', error);
    const message = error instanceof Error ? error.message : 'Внутренняя ошибка';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
