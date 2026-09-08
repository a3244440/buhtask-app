'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { CheckCircle2, XCircle, Trophy, ArrowRight, Loader2, AlertTriangle, Mic, Square, Play, Clock3, Type } from 'lucide-react';

type QType = 'multiple_choice' | 'text' | 'voice';
interface Question { id: string; category: string; question: string; options: string[] | null; question_type: QType; }
interface Result {
  questionId: string; type: QType; question: string; category?: string;
  options?: string[]; selectedIndex?: number | null; correctIndex?: number; correct?: boolean; explanation?: string;
  textAnswer?: string | null; voiceUrl?: boolean; pendingReview?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  nds: 'НДС', kpn_ipn: 'КПН/ИПН', form910: 'Форма 910', trud: 'Трудовое право', obshee: 'Общий бухучёт', msfo: 'МСФО',
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
  const [status, setStatus] = useState<'ready' | 'in_progress' | 'completed' | 'pending_review' | null>(null);
  const [attemptId, setAttemptId] = useState('');
  const [userId, setUserId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [manualAnswered, setManualAnswered] = useState<Record<string, boolean>>({}); // questionId -> уже отправлен text/voice ответ
  const [textDraft, setTextDraft] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savingManual, setSavingManual] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score?: number; autoScore?: number; total: number } | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [timedOut, setTimedOut] = useState<Record<string, boolean>>({});
  const [questionCount, setQuestionCount] = useState(0);

  // Запись голоса
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  const applyQuizData = useCallback((data: any) => {
    setStatus(data.status);
    if (data.status === 'ready') {
      setQuestionCount(data.questionCount || 0);
      return;
    }
    if (data.status === 'in_progress') {
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setQuestionCount(data.questions.length);
      setAnswers(data.answers || {});
      const manualDone: Record<string, boolean> = {};
      (data.manualAnswers || []).forEach((m: any) => { manualDone[m.question_id] = true; });
      setManualAnswered(manualDone);
      const firstUnanswered = data.questions.findIndex((q: Question) =>
        q.question_type === 'multiple_choice' ? data.answers?.[q.id] === undefined : !manualDone[q.id]
      );
      setCurrent(firstUnanswered === -1 ? 0 : firstUnanswered);
    } else if (data.status === 'pending_review') {
      setFinalScore({ autoScore: data.autoScore, total: data.total });
    } else {
      setFinalScore({ score: data.score, total: data.total });
    }
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?redirect=/quiz'); return; }
      setUserId(session.user.id);
      try {
        applyQuizData(await authedFetch('/api/quiz/start', { preview: true }));
      } catch (e: any) {
        setError(e.message || 'Не удалось загрузить квиз');
      } finally {
        setLoading(false);
      }
    })();
  }, [applyQuizData, router]);

  const beginQuiz = async () => {
    setError('');
    setSubmitting(true);
    try {
      applyQuizData(await authedFetch('/api/quiz/start', { preview: false }));
    } catch (e: any) {
      setError(e.message || 'Не удалось начать квиз');
    } finally {
      setSubmitting(false);
    }
  };

  const selectAnswer = useCallback(async (questionId: string, idx: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: idx }));
    try { await authedFetch('/api/quiz/answer', { attemptId, questionId, selectedIndex: idx }); } catch { /* сохранится при следующей попытке ответить */ }
  }, [attemptId]);

  const submitTextAnswer = async (questionId: string) => {
    const text = (textDraft[questionId] || '').trim();
    if (!text) return;
    setSavingManual(true);
    try {
      await authedFetch('/api/quiz/answer', { attemptId, questionId, textAnswer: text });
      setManualAnswered(prev => ({ ...prev, [questionId]: true }));
    } catch (e: any) {
      setError(e.message || 'Не удалось сохранить ответ');
    } finally {
      setSavingManual(false);
    }
  };

  const startRecording = async () => {
    setRecordedBlob(null);
    setRecordSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch {
      setError('Не удалось получить доступ к микрофону — разрешите доступ в браузере');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const submitVoiceAnswer = async (questionId: string) => {
    if (!recordedBlob) return;
    setUploadingVoice(true);
    try {
      const path = `${userId}/${attemptId}_${questionId}.webm`;
      const { error: upErr } = await supabase.storage.from('quiz-voice-answers').upload(path, recordedBlob, { upsert: true });
      if (upErr) throw upErr;
      await authedFetch('/api/quiz/answer', { attemptId, questionId, voiceUrl: path });
      setManualAnswered(prev => ({ ...prev, [questionId]: true }));
      setRecordedBlob(null);
      setRecordSeconds(0);
    } catch (e: any) {
      setError(e.message || 'Не удалось отправить голосовой ответ');
    } finally {
      setUploadingVoice(false);
    }
  };

  const finish = useCallback(async () => {
    setSubmitting(true);
    try {
      const data = await authedFetch('/api/quiz/finish', { attemptId });
      setFinalScore({ score: data.score, autoScore: data.autoScore, total: data.total });
      setResults(data.results);
      setStatus(data.status);
    } catch (e: any) {
      setError(e.message || 'Не удалось завершить квиз');
    } finally {
      setSubmitting(false);
    }
  }, [attemptId]);

  const q = questions[current];
  const isAnswered = useCallback((qq: Question) => qq.question_type === 'multiple_choice' ? answers[qq.id] !== undefined : !!manualAnswered[qq.id], [answers, manualAnswered]);
  const isResolved = (qq: Question) => isAnswered(qq) || !!timedOut[qq.id];
  const allResolved = questions.length > 0 && questions.every(isResolved);
  const secondsPerQuestion = questions.length ? Math.max(1, Math.floor(60 * 60 / questions.length)) : 60;

  // На каждый вопрос отводится ровно минута. Пропущенный по таймеру вопрос
  // остаётся без ответа и не приносит баллов даже при возвращении назад.
  useEffect(() => {
    if (loading || status !== 'in_progress' || !q || isAnswered(q) || timedOut[q.id]) return;

    setSecondsLeft(secondsPerQuestion);
    const timer = window.setInterval(() => {
      setSecondsLeft(previous => {
        if (previous > 1) return previous - 1;

        window.clearInterval(timer);
        setTimedOut(prev => ({ ...prev, [q.id]: true }));
        window.setTimeout(() => {
          if (current < questions.length - 1) {
            setCurrent(index => index === current ? index + 1 : index);
          } else {
            void finish();
          }
        }, 0);
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [current, finish, isAnswered, loading, q?.id, questions.length, secondsPerQuestion, status, timedOut]);

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title="Квиз конкурса" />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {error && !questions.length && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-1">{error}</p>
              <button onClick={() => router.push('/reyting')} className="text-sm text-blue-600 hover:underline mt-2">← К рейтингу</button>
            </div>
          )}

          {status === 'ready' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Квиз для рейтинга бухгалтеров</h1>
              <p className="text-sm text-gray-600 leading-relaxed max-w-lg mx-auto">
                Вам предстоит ответить на все <b>{questionCount}</b> активных вопросов. На прохождение отведён <b>1 час</b>
                — это примерно {Math.floor(60 * 60 / Math.max(questionCount, 1))} секунд на вопрос. Если время вопроса истечёт,
                он будет пропущен и принесёт 0 баллов. Текстовые и голосовые ответы проверяются администратором вручную.
              </p>
              <button onClick={beginQuiz} disabled={submitting}
                className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-xl text-sm font-semibold">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Начать квиз
              </button>
            </div>
          )}

          {/* Ждём ручной проверки текстовых/голосовых вопросов */}
          {status === 'pending_review' && finalScore && (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
              <Clock3 className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Ответы на проверке</h1>
              <p className="text-sm text-gray-500 mb-2">
                Вопросы с вариантами уже проверены автоматически: <b>{finalScore.autoScore} баллов</b> из них.
                Часть вопросов требует ручной проверки — итоговый результат появится после того, как администратор их оценит.
              </p>
              <button onClick={() => router.push('/reyting')} className="text-sm text-blue-600 hover:underline mt-2">← К рейтингу</button>
            </div>
          )}

          {/* Результат — полностью автопроверяемый квиз уже пройден */}
          {status === 'completed' && finalScore && (
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
                            {(r.options || []).map((opt, oi) => (
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
          {status === 'in_progress' && q && (
            <div>
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Вопрос {current + 1} из {questions.length}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{CATEGORY_LABEL[q.category] || q.category}</span>
                    <span className={`font-semibold ${secondsLeft <= 10 ? 'text-red-500' : 'text-gray-500'}`}>⏱ {secondsLeft}с</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-3">{error}</div>}

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5 leading-snug">{q.question}</h2>
                {timedOut[q.id] && (
                  <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
                    Время на этот вопрос истекло. Он пропущен и не будет засчитан.
                  </div>
                )}

                {/* Вариант ответа */}
                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-2.5">
                    {(q.options || []).map((opt, idx) => {
                      const selected = answers[q.id] === idx;
                      return (
                        <button key={idx} onClick={() => selectAnswer(q.id, idx)} disabled={timedOut[q.id]}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${selected ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Свободный текстовый ответ */}
                {q.question_type === 'text' && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2"><Type className="w-3.5 h-3.5" /> Напишите ответ своими словами</div>
                    {manualAnswered[q.id] ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Ответ отправлен, будет проверен вручную
                      </div>
                    ) : (
                      <>
                        <textarea value={textDraft[q.id] || ''} onChange={e => setTextDraft(prev => ({ ...prev, [q.id]: e.target.value }))} disabled={timedOut[q.id]}
                          rows={4} placeholder="Ваш ответ..."
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-3" />
                        <button onClick={() => submitTextAnswer(q.id)} disabled={timedOut[q.id] || savingManual || !(textDraft[q.id] || '').trim()}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 rounded-xl text-sm font-semibold">
                          {savingManual ? 'Отправка…' : 'Отправить ответ'}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Голосовой ответ */}
                {q.question_type === 'voice' && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3"><Mic className="w-3.5 h-3.5" /> Наговорите ответ своим голосом</div>
                    {manualAnswered[q.id] ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Голосовой ответ отправлен, будет проверен вручную
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-5 text-center">
                        {!recording && !recordedBlob && (
                          <button onClick={startRecording} disabled={timedOut[q.id]} className="w-16 h-16 disabled:opacity-50 disabled:cursor-not-allowed rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center mx-auto mb-2">
                            <Mic className="w-7 h-7" />
                          </button>
                        )}
                        {recording && (
                          <button onClick={stopRecording} className="w-16 h-16 rounded-full bg-gray-800 hover:bg-gray-900 text-white flex items-center justify-center mx-auto mb-2 animate-pulse">
                            <Square className="w-6 h-6" />
                          </button>
                        )}
                        {recording && <p className="text-sm text-gray-500 mb-1">Запись… {recordSeconds}с</p>}
                        {!recording && !recordedBlob && <p className="text-xs text-gray-400">Нажмите, чтобы начать запись</p>}
                        {recordedBlob && !recording && (
                          <div className="mt-2 space-y-3">
                            <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
                            <div className="flex gap-2">
                              <button onClick={startRecording} disabled={timedOut[q.id]} className="flex-1 text-xs text-gray-500 hover:text-gray-700 py-2 disabled:opacity-50">Перезаписать</button>
                              <button onClick={() => submitVoiceAnswer(q.id)} disabled={timedOut[q.id] || uploadingVoice}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5">
                                {uploadingVoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                {uploadingVoice ? 'Отправка…' : 'Отправить ответ'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-5">
                <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}
                  className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                  ← Назад
                </button>

                {current < questions.length - 1 ? (
                  <button onClick={() => setCurrent(c => c + 1)} disabled={!isResolved(q)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    Далее <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={finish} disabled={!allResolved || submitting}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Завершить квиз
                  </button>
                )}
              </div>
              {!allResolved && current === questions.length - 1 && (
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
