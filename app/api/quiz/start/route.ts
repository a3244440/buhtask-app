import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthenticatedUser } from '@/lib/supabaseServer';

const SEASON = 'permanent';
const QUIZ_LENGTH = 10;

// Перемешивает массив (Fisher–Yates) — чтобы порядок вопросов был разным у разных участников
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

    const db = supabaseAdmin();

    const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'accountant') {
      return NextResponse.json({ error: 'Квиз доступен только бухгалтерам' }, { status: 403 });
    }

    // Уже есть попытка в этом сезоне?
    const { data: existing } = await db.from('quiz_attempts').select('*').eq('accountant_id', user.id).eq('season', SEASON).maybeSingle();

    if (existing?.status === 'completed') {
      return NextResponse.json({
        status: 'completed', score: existing.score, total: existing.total_questions, completedAt: existing.completed_at,
      });
    }

    if (existing?.status === 'pending_review') {
      return NextResponse.json({
        status: 'pending_review', autoScore: existing.auto_score, total: existing.total_questions,
      });
    }

    if (existing?.status === 'in_progress') {
      // Возобновляем — отдаём ТЕ ЖЕ вопросы (без правильных ответов), плюс уже сохранённые ответы участника
      const { data: questions } = await db.from('quiz_questions').select('id, category, question, options, question_type').in('id', existing.question_ids);
      const ordered = existing.question_ids.map((id: string) => questions?.find(q => q.id === id)).filter(Boolean);
      // Уже отправленные text/voice-ответы — чтобы при возобновлении показать, что на этот вопрос уже отвечено
      const { data: manual } = await db.from('quiz_manual_answers').select('question_id, text_answer, voice_url').eq('attempt_id', existing.id);
      return NextResponse.json({
        status: 'in_progress', attemptId: existing.id, questions: ordered, answers: existing.answers || {},
        manualAnswers: manual || [],
      });
    }

    // Новая попытка — набираем случайные активные вопросы
    const { data: pool } = await db.from('quiz_questions').select('id, category, question, options, question_type').eq('is_active', true);
    if (!pool || pool.length === 0) {
      return NextResponse.json({ error: 'Квиз пока не готов — вопросы ещё не опубликованы. Попробуйте позже.' }, { status: 409 });
    }

    const selected = shuffle(pool).slice(0, Math.min(QUIZ_LENGTH, pool.length));
    const questionIds = selected.map(q => q.id);

    const { data: attempt, error } = await db.from('quiz_attempts').insert({
      accountant_id: user.id, season: SEASON, status: 'in_progress',
      question_ids: questionIds, total_questions: questionIds.length, answers: {},
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ status: 'in_progress', attemptId: attempt.id, questions: selected, answers: {}, manualAnswers: [] });
  } catch (e: any) {
    console.error('quiz/start error', e);
    return NextResponse.json({ error: 'Внутренняя ошибка: ' + (e?.message || String(e)) }, { status: 500 });
  }
}
