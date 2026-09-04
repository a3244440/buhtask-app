import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const body = await req.json();
    const { attemptId, questionId, selectedIndex, textAnswer, voiceUrl } = body;
    if (!attemptId || !questionId) {
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

    const { data: question } = await db.from('quiz_questions').select('question_type').eq('id', questionId).maybeSingle();
    const type = question?.question_type || 'multiple_choice';

    if (type === 'multiple_choice') {
      if (typeof selectedIndex !== 'number') return NextResponse.json({ error: 'Некорректный ответ' }, { status: 400 });
      const answers = { ...(attempt.answers || {}), [questionId]: selectedIndex };
      const { error } = await db.from('quiz_attempts').update({ answers }).eq('id', attemptId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (type === 'text') {
      if (!textAnswer || !String(textAnswer).trim()) return NextResponse.json({ error: 'Ответ не может быть пустым' }, { status: 400 });
      const { error } = await db.from('quiz_manual_answers').upsert({
        attempt_id: attemptId, question_id: questionId, text_answer: String(textAnswer).trim(),
      }, { onConflict: 'attempt_id,question_id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (type === 'voice') {
      if (!voiceUrl) return NextResponse.json({ error: 'Голосовая запись не получена' }, { status: 400 });
      // Ожидаем путь строго внутри папки самого пользователя — на случай если кто-то
      // попробует подставить чужую запись в API напрямую, минуя загрузку через Storage.
      if (!String(voiceUrl).startsWith(`${user.id}/`)) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      const { error } = await db.from('quiz_manual_answers').upsert({
        attempt_id: attemptId, question_id: questionId, voice_url: voiceUrl,
      }, { onConflict: 'attempt_id,question_id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Неизвестный тип вопроса' }, { status: 400 });
  } catch (e: any) {
    console.error('quiz/answer error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка: ' + (e?.message || String(e)) }, { status: 500 });
  }
}
