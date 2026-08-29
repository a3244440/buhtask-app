import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { attemptId, questionId, selectedIndex } = await req.json();
    if (!attemptId || !questionId || typeof selectedIndex !== 'number') {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: attempt } = await db.from('quiz_attempts').select('*').eq('id', attemptId).maybeSingle();

    if (!attempt || attempt.accountant_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Попытка уже завершена' }, { status: 409 });
    }
    if (!attempt.question_ids.includes(questionId)) {
      return NextResponse.json({ error: 'Этот вопрос не входит в текущую попытку' }, { status: 400 });
    }

    const answers = { ...(attempt.answers || {}), [questionId]: selectedIndex };
    const { error } = await db.from('quiz_attempts').update({ answers }).eq('id', attemptId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('quiz/answer error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
