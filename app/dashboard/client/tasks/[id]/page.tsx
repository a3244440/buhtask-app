'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Star, CheckCircle, Clock, User } from 'lucide-react';
import DashboardHeader from '../../../../components/DashboardHeader';

const CATS: Record<string, string> = {
  tax: 'Налоги и НДС', salary: 'Расчёт зарплаты', register: 'Регистрация ИП/ТОО',
  audit: 'Аудит', report: 'Отчётность', other: 'Прочее',
};

interface Task {
  id: string; title: string; description: string; status: string;
  category: string; city: string; budget?: number; deadline?: string; created_at: string; accountant_id?: string;
}
interface Proposal {
  id: string; accountant_id: string; proposed_price: number;
  description: string; estimated_days?: number; created_at: string;
  accountant_name?: string; accountant_rating?: number; accountant_tasks?: number;
}

export default function ClientTaskDetail() {
  const routeParams = useParams();
  const taskId = routeParams?.id as string;
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [accepting, setAccepting] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    init();
  }, [taskId]);

  const init = async () => {
    if (!taskId) { return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);

    const { data: taskData, error: taskErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (taskErr) {
      setDebugInfo(`Ошибка БД: ${taskErr.message} (код: ${taskErr.code})`);
      setLoading(false);
      return;
    }
    if (!taskData) {
      setDebugInfo(`Задача ${taskId} не найдена в базе или RLS блокирует доступ.`);
      setLoading(false);
      return;
    }
    setTask(taskData);

    // Load proposals with accountant profile
    const { data: propData } = await supabase
      .from('proposals').select('*').eq('task_id', taskId).order('created_at', { ascending: false });

    if (propData && propData.length > 0) {
      const withProfiles = await Promise.all(propData.map(async (p: any) => {
        const { data: profile } = await supabase
          .from('profiles').select('full_name,rating,completed_tasks').eq('id', p.accountant_id).single();
        return {
          ...p,
          accountant_name: profile?.full_name || 'Бухгалтер',
          accountant_rating: profile?.rating || 0,
          accountant_tasks: profile?.completed_tasks || 0,
        };
      }));
      setProposals(withProfiles);
    }
    setLoading(false);
  };

  const acceptProposal = async (proposal: Proposal) => {
    if (!confirm('Принять отклик этого бухгалтера?')) return;
    setAccepting(proposal.id);
    setError('');
    try {
      // Try different status values to match DB constraint
      const statusOptions = ['in_progress', 'in progress', 'inprogress', 'active', 'working', 'taken'];
      let taskUpdated = false;
      let lastErr: any = null;

      for (const st of statusOptions) {
        const { error: taskErr } = await supabase
          .from('tasks')
          .update({ status: st, accountant_id: proposal.accountant_id })
          .eq('id', taskId);
        if (!taskErr) { taskUpdated = true; break; }
        lastErr = taskErr;
        // If error is not about status constraint, stop trying
        if (!taskErr.message?.includes('status')) break;
      }

      if (!taskUpdated) {
        // Last resort: just set accountant_id without changing status
        const { error: e2 } = await supabase
          .from('tasks')
          .update({ accountant_id: proposal.accountant_id })
          .eq('id', taskId);
        if (e2) throw lastErr || e2;
      }

      // Update proposal status
      await supabase.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);

      // Create conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant1_id.eq.${userId},participant2_id.eq.${proposal.accountant_id}),and(participant1_id.eq.${proposal.accountant_id},participant2_id.eq.${userId})`)
        .maybeSingle();

      if (!existingConv) {
        await supabase.from('conversations').insert({
          participant1_id: userId,
          participant2_id: proposal.accountant_id,
          task_id: taskId,
          last_message: 'Задача принята в работу',
        });
      }

      // Reload task
      const { data: updated } = await supabase.from('tasks').select('*').eq('id', taskId).maybeSingle();
      if (updated) setTask(updated);
    } catch (err: any) {
      setError(err.message || 'Ошибка принятия отклика');
    } finally {
      setAccepting('');
    }
  };

  const cancelTask = async () => {
    if (!confirm('Отменить задачу?')) return;
    await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
    router.push('/dashboard/client');
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/></div>;
  if (!task) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Задача не найдена</h2>
          <p className="text-sm text-gray-500 mb-4">Возможно, нет доступа к задаче.</p>
          {debugInfo && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-3 mb-4 break-words">{debugInfo}</p>}
          <pre className="bg-gray-50 rounded-xl p-4 text-xs text-left text-gray-600 mb-6 overflow-x-auto">{`ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_select" ON tasks;
CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);`}</pre>
          <button onClick={() => router.push('/dashboard/client')}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
            ← Назад в кабинет
          </button>
        </div>
      </div>
    </div>
  );

  const statusConfig: Record<string, {label: string; color: string}> = {
    open: { label: 'Открыта', color: 'bg-emerald-100 text-emerald-700' },
    in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Завершена', color: 'bg-gray-100 text-gray-500' },
    cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-500' },
  };
  const sc = statusConfig[task.status] || statusConfig.open;
  const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white";

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.push('/dashboard/client')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4"/> Назад к задачам
        </button>

        {/* Task card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sc.color}`}>{sc.label}</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-5 text-xs">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">{CATS[task.category] || task.category}</span>
            {task.city && <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full"><MapPin className="w-3 h-3"/>{task.city}</span>}
            {task.budget && <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">💰 {task.budget.toLocaleString()} ₸</span>}
            {task.deadline && <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full"><Calendar className="w-3 h-3"/>до {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
          </div>
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Описание</p>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
          <p className="text-xs text-gray-400">Опубликовано: {new Date(task.created_at).toLocaleDateString('ru-RU', { year:'numeric',month:'long',day:'numeric' })}</p>

          {task.status === 'open' && (
            <button onClick={cancelTask} className="mt-4 text-xs text-red-500 hover:underline">Отменить задачу</button>
          )}
        </div>

        {/* Proposals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Отклики бухгалтеров</h2>
            <p className="text-xs text-gray-400 mt-0.5">{proposals.length} откликов</p>
          </div>

          {proposals.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3"/>
              <p className="text-gray-400 text-sm">Пока нет откликов</p>
              <p className="text-gray-300 text-xs mt-1">Бухгалтеры увидят вашу задачу и откликнутся</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {proposals.map(p => (
                <div key={p.id} className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        {p.accountant_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{p.accountant_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400"/>{(p.accountant_rating||0).toFixed(1)}</span>
                          <span>·</span>
                          <span>{p.accountant_tasks || 0} задач</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-extrabold text-emerald-600">{p.proposed_price.toLocaleString()} ₸</p>
                      {p.estimated_days && <p className="text-xs text-gray-400">{p.estimated_days} дней</p>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-4">{p.description}</p>
                  {task.status === 'open' && (
                    <button onClick={() => acceptProposal(p)} disabled={accepting === p.id}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold rounded-xl transition-colors">
                      {accepting === p.id ? 'Принимаем...' : '✓ Принять отклик'}
                    </button>
                  )}
                  {task.status !== 'open' && task.accountant_id === p.accountant_id && (
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-xl">
                        <CheckCircle className="w-4 h-4" /> Исполнитель выбран
                      </span>
                      <button onClick={() => router.push('/dashboard/client')}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                        Перейти в чат →
                      </button>
                    </div>
                  )}
                  {task.status !== 'open' && task.accountant_id !== p.accountant_id && (
                    <span className="text-xs text-gray-400">Выбран другой исполнитель</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
