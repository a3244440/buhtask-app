'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { CheckCircle2, XCircle, Trophy, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';

interface Question { id: string; category: string; question: string; options: string[]; }
interface Result { questionId: string; question: string; options: string[]; selectedIndex: number | null; correctIndex: number; correct: boolean; explanation: string; }

const CATEGORY_LABEL: Record<string, string> = {
  nds: 'НДС', kpn_ipn: 'КПН/ИПН', form910: 'Форма 910', trud: 'Трудовое право', obshee: 'Общий бухучёт',
};

async function authedFetch(url: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Ошибка');
  return json;
}

export default function QuizPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'in_progress' | 'completed' | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?redirect=/quiz'); return; }
      try {
        const data = await authedFetch('/api/quiz/start');
        setStatus(data.status);
        if (data.status === 'in_progress') {
          setAttemptId(data.attemptId);
          setQuestions(data.questions);
          setAnswers(data.answers || {});
          // встаём на первый вопрос без ответа
          const firstUnanswered = data.questions.findIndex((q: Question) => data.answers?.[q.id] === undefined);
          setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered);
        } else {
          setFinalScore({ score: data.score, total: data.total });
        }
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить квиз');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const selectAnswer = useCallback(async (questionId: string, idx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: idx }));
    try { await authedFetch('/api/quiz/answer', { attemptId, questionId, selectedIndex: idx }); } catch { /* сохранится при следующей попытке ответить */ }
  }, [attemptId]);

  const finish = async () => {
    setSubmitting(true);
    try {
      const data = await authedFetch('/api/quiz/finish', { attemptId });
      setFinalScore({ score: data.score, total: data.total });
      setResults(data.results);
      setStatus('completed');
    } catch (e: any) {
      setError(e.message || 'Не удалось завершить квиз');
    } finally {
      setSubmitting(false);
    }
  };

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title="Квиз конкурса" />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {error && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-1">{error}</p>
              <button onClick={() => router.push('/reyting')} className="text-sm text-blue-600 hover:underline mt-2">← К рейтингу</button>
            </div>
          )}

          {/* Результат — уже пройден или только что завершён */}
          {!error && status === 'completed' && finalScore && (
            <div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center mb-5">
                <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Квиз завершён</h1>
                <p className="text-4xl font-extrabold text-blue-600 my-3">{finalScore.score} / {finalScore.total}</p>
                <p className="text-sm text-gray-500">
                  Результат учитывается при определении топ-3 в <button onClick={() => router.push('/reyting')} className="text-blue-600 hover:underline">рейтинге бухгалтеров</button>.
                  Повторное прохождение недоступно — так рейтинг остаётся честным для всех участников.
                </p>
              </div>

              {results && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 px-1">Разбор вопросов</p>
                  {results.map((r, i) => (
                    <div key={r.questionId} className={`bg-white rounded-2xl border shadow-sm p-4 ${r.correct ? 'border-emerald-100' : 'border-red-100'}`}>
                      <div className="flex items-start gap-2">
                        {r.correct ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-2">{i + 1}. {r.question}</p>
                          <div className="space-y-1 mb-2">
                            {r.options.map((opt, oi) => (
                              <p key={oi} className={`text-xs px-2.5 py-1.5 rounded-lg ${oi === r.correctIndex ? 'bg-emerald-50 text-emerald-700 font-medium' : oi === r.selectedIndex ? 'bg-red-50 text-red-600' : 'text-gray-500'}`}>
                                {opt}
                              </p>
                            ))}
                          </div>
                          {r.explanation && <p className="text-xs text-gray-400 leading-relaxed">{r.explanation}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Прохождение квиза */}
          {!error && status === 'in_progress' && q && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Вопрос {current + 1} из {questions.length}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{CATEGORY_LABEL[q.category] || q.category}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5 leading-snug">{q.question}</h2>
                <div className="space-y-2.5">
                  {q.options.map((opt, idx) => {
                    const selected = answers[q.id] === idx;
                    return (
                      <button key={idx} onClick={() => selectAnswer(q.id, idx)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${selected ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between mt-5">
                <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                  className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  ← Назад
                </button>

                {current < questions.length - 1 ? (
                  <button onClick={() => setCurrent(c => c + 1)} disabled={answers[q.id] === undefined}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    Далее <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={finish} disabled={!allAnswered || submitting}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Завершить квиз
                  </button>
                )}
              </div>
              {!allAnswered && current === questions.length - 1 && (
                <p className="text-xs text-amber-600 mt-2 text-right">Ответьте на все вопросы, чтобы завершить квиз</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
