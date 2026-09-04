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
    if (attempt.status === 'completed') {
      return NextResponse.json({ status: 'completed', score: attempt.score, total: attempt.total_questions });
    }
    if (attempt.status === 'pending_review') {
      return NextResponse.json({ status: 'pending_review', autoScore: attempt.auto_score, total: attempt.total_questions });
    }

    // Правильные ответы запрашиваем только здесь, на сервере, и никогда не отдаём их клиенту напрямую
    const { data: questions } = await db.from('quiz_questions')
      .select('id, category, question, options, correct_index, explanation, question_type')
      .in('id', attempt.question_ids);

    const { data: manualAnswers } = await db.from('quiz_manual_answers').select('*').eq('attempt_id', attemptId);
    const manualByQid = new Map((manualAnswers || []).map(m => [m.question_id, m]));

    const answers: Record<string, number> = attempt.answers || {};
    let autoScore = 0;
    let hasManual = false;

    const results = attempt.question_ids.map((qid: string) => {
      const q = questions?.find(x => x.id === qid);
      const type = q?.question_type || 'multiple_choice';

      if (type === 'multiple_choice') {
        const selectedIndex = answers[qid];
        const correct = q ? selectedIndex === q.correct_index : false;
        if (correct) autoScore++;
        return {
          questionId: qid, type, category: q?.category, question: q?.question, options: q?.options,
          selectedIndex: selectedIndex ?? null, correctIndex: q?.correct_index, correct, explanation: q?.explanation,
        };
      }

      // text / voice — ждут ручной проверки, баллов пока нет
      hasManual = true;
      const manual = manualByQid.get(qid);
      return {
        questionId: qid, type, category: q?.category, question: q?.question,
        textAnswer: manual?.text_answer || null, voiceUrl: manual?.voice_url ? true : false,
        pendingReview: true,
      };
    });

    const startedAt = new Date(attempt.started_at).getTime();
    const timeTakenSeconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));

    const newStatus = hasManual ? 'pending_review' : 'completed';
    const updatePayload: any = {
      status: newStatus, auto_score: autoScore, completed_at: new Date().toISOString(), time_taken_seconds: timeTakenSeconds,
    };
    if (!hasManual) updatePayload.score = autoScore; // нечего ждать от ручной проверки — итог известен сразу

    const { error } = await db.from('quiz_attempts').update(updatePayload).eq('id', attemptId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      status: newStatus, score: hasManual ? undefined : autoScore, autoScore, total: attempt.total_questions,
      timeTakenSeconds, results,
    });
  } catch (e: any) {
    console.error('quiz/finish error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка: ' + (e?.message || String(e)) }, { status: 500 });
  }
}
