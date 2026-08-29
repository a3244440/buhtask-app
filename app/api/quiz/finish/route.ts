import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const { attemptId } = await req.json();
    if (!attemptId) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

    const db = supabaseAdmin();
    const { data: attempt } = await db.from('quiz_attempts').select('*').eq('id', attemptId).maybeSingle();

    if (!attempt || attempt.accountant_id !== user.id) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (attempt.status !== 'in_progress') {
      // Уже завершена — просто отдаём сохранённый результат ещё раз, а не пересчитываем
      return NextResponse.json({ score: attempt.score, total: attempt.total_questions });
    }

    // Правильные ответы запрашиваем только здесь, на сервере, и никогда не отдаём их клиенту напрямую
    const { data: questions } = await db.from('quiz_questions')
      .select('id, category, question, options, correct_index, explanation')
      .in('id', attempt.question_ids);

    const answers: Record<string, number> = attempt.answers || {};
    let score = 0;
    const results = attempt.question_ids.map((qid: string) => {
      const q = questions?.find(x => x.id === qid);
      const selectedIndex = answers[qid];
      const correct = q ? selectedIndex === q.correct_index : false;
      if (correct) score++;
      return {
        questionId: qid, category: q?.category, question: q?.question, options: q?.options,
        selectedIndex: selectedIndex ?? null, correctIndex: q?.correct_index, correct, explanation: q?.explanation,
      };
    });

    const startedAt = new Date(attempt.started_at).getTime();
    const timeTakenSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    const { error } = await db.from('quiz_attempts').update({
      status: 'completed', score, completed_at: new Date().toISOString(), time_taken_seconds: timeTakenSeconds,
    }).eq('id', attemptId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ score, total: attempt.total_questions, timeTakenSeconds, results });
  } catch (e: any) {
    console.error('quiz/finish error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
