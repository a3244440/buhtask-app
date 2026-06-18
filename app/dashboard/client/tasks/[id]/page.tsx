'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Star, CheckCircle, Clock, User, Pencil, Trash2, CreditCard } from 'lucide-react';
import DashboardHeader from '../../../../components/DashboardHeader';

const CATS: Record<string, string> = {
  tax: 'Налоговая отчётность',
  construction: 'КС-2 / КС-3 (строительство)',
  maternity: 'Декретные и пособия',
  unblock_account: 'Снятие ареста со счёта',
  restore_accounting: 'Восстановление учёта',
  esf_snt: 'Выписка ЭСФ / СНТ',
  kgd_notice: 'Ответ на уведомление КГД',
  tax_inspection: 'Помощь с налоговой проверкой',
  vat_return: 'Возврат НДС',
  declaration_250: 'Декларация 250 / 270',
  salary: 'Расчёт зарплаты',
  register: 'Регистрация ИП/ТОО',
  closing: 'Закрытие ИП/ТОО',
  audit: 'Аудит',
  report: 'Отчётность',
  other: 'Прочее',
};

interface Task {
  id: string; title: string; description: string; status: string;
  category: string; city: string; budget?: number; deadline?: string; created_at: string; accountant_id?: string;
  completion_requested?: boolean; completion_approved?: boolean;
  final_price?: number;
}
interface Proposal {
  id: string; accountant_id: string; proposed_price: number;
  description: string; estimated_days?: number; created_at: string;
  accountant_name?: string; accountant_rating?: number; accountant_tasks?: number; accountant_verified?: boolean;
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
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCity, setEditCity] = useState('Астана');
  const [editCategory, setEditCategory] = useState('tax');
  const [assignedAccountant, setAssignedAccountant] = useState<{ name: string; kaspiQr: string; phone: string } | null>(null);

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

    // Если бухгалтер выбран — загрузим его Kaspi QR и имя для оплаты
    if (taskData.accountant_id) {
      const { data: acc } = await supabase.from('profiles')
        .select('full_name,kaspi_qr_url,phone').eq('id', taskData.accountant_id).maybeSingle();
      if (acc) setAssignedAccountant({ name: acc.full_name || 'Бухгалтер', kaspiQr: acc.kaspi_qr_url || '', phone: acc.phone || '' });
    }

    // Load proposals with accountant profile
    const { data: propData } = await supabase
      .from('proposals').select('*').eq('task_id', taskId).order('created_at', { ascending: false });

    if (propData && propData.length > 0) {
      const withProfiles = await Promise.all(propData.map(async (p: any) => {
        const { data: profile } = await supabase
          .from('profiles').select('full_name,rating,completed_tasks,verification_status').eq('id', p.accountant_id).single();
        return {
          ...p,
          accountant_name: profile?.full_name || 'Бухгалтер',
          accountant_rating: profile?.rating || 0,
          accountant_tasks: profile?.completed_tasks || 0,
          accountant_verified: profile?.verification_status === 'verified',
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

  const approveCompletion = async () => {
    const { error: e } = await supabase.from('tasks').update({
      completion_approved: true,
      completion_approved_at: new Date().toISOString(),
    }).eq('id', taskId);
    if (e) { setError('Ошибка: ' + e.message); return; }
    setTask(t => t ? { ...t, completion_approved: true } : t);
  };

  const cancelTask = async () => {
    if (!confirm('Отменить задачу?')) return;
    await supabase.from('tasks').update({ status: 'cancelled' }).eq('id', taskId);
    router.push('/dashboard/client');
  };

  const deleteTask = async () => {
    if (!confirm('Удалить задачу навсегда? Это действие необратимо.')) return;
    setError('');
    const { error: e } = await supabase.from('tasks').delete().eq('id', taskId);
    if (e) { setError('Ошибка удаления: ' + e.message); return; }
    router.push('/dashboard/client');
  };

  const startEdit = () => {
    setEditTitle(task?.title || '');
    setEditDescription(task?.description || '');
    setEditCity(task?.city || 'Астана');
    setEditCategory(task?.category || 'tax');
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!editTitle.trim()) { setError('Введите название'); return; }
    setError('');
    const { error: e } = await supabase.from('tasks').update({
      title: editTitle.trim(),
      description: editDescription.trim(),
      city: editCity,
      category: editCategory,
    }).eq('id', taskId);
    if (e) { setError('Ошибка сохранения: ' + e.message); return; }
    setTask(t => t ? { ...t, title: editTitle.trim(), description: editDescription.trim(), city: editCity, category: editCategory } : t);
    setEditing(false);
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
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-50">
              <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Pencil className="w-3.5 h-3.5" /> Редактировать
              </button>
              <button onClick={cancelTask} className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                Отменить задачу
              </button>
              <button onClick={deleteTask} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium ml-auto">
                <Trash2 className="w-3.5 h-3.5" /> Удалить
              </button>
            </div>
          )}
          {task.status !== 'open' && (
            <button onClick={deleteTask} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium mt-4 pt-4 border-t border-gray-50">
              <Trash2 className="w-3.5 h-3.5" /> Удалить задачу
            </button>
          )}
        </div>

        {/* Completion request: accountant asks to close, client approves */}
        {task.status === 'in_progress' && task.completion_requested && !task.completion_approved && (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-6 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Бухгалтер запросил закрытие задачи</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Бухгалтер отметил, что работа выполнена. Проверьте результат. Если всё устраивает — одобрите закрытие, после чего получите реквизиты для оплаты.</p>
            <div className="flex gap-3">
              <button onClick={approveCompletion}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                <CheckCircle className="w-4 h-4" /> Одобрить закрытие
              </button>
              <button onClick={() => router.push(`/dashboard/client?tab=messages&with=${task.accountant_id}`)}
                className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-semibold text-sm transition-colors">
                Обсудить в чате
              </button>
            </div>
          </div>
        )}

        {/* Approved — show payment (accountant Kaspi QR) */}
        {task.status === 'in_progress' && task.completion_approved && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-6 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Оплата бухгалтеру</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">Вы одобрили закрытие. Оплатите работу бухгалтеру{assignedAccountant?.name ? ` (${assignedAccountant.name})` : ''} через Kaspi.</p>
            {assignedAccountant?.kaspiQr ? (
              <div className="flex flex-col items-center bg-gray-50 rounded-2xl p-5">
                <img src={assignedAccountant.kaspiQr} alt="Kaspi QR бухгалтера" className="w-56 h-56 object-contain rounded-xl bg-white p-2" />
                <p className="text-xs text-gray-500 mt-3">Отсканируйте QR в приложении Kaspi для оплаты</p>
                {assignedAccountant.phone && <p className="text-sm text-gray-700 mt-1">Или по номеру: <b>{assignedAccountant.phone}</b></p>}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-sm text-amber-700">Бухгалтер ещё не загрузил Kaspi QR. Запросите реквизиты для оплаты в чате.</p>
                {assignedAccountant?.phone && <p className="text-sm text-gray-700 mt-2">Телефон бухгалтера: <b>{assignedAccountant.phone}</b></p>}
                <button onClick={() => router.push(`/dashboard/client?tab=messages&with=${task.accountant_id}`)}
                  className="mt-3 text-sm text-blue-600 hover:underline">Перейти в чат →</button>
              </div>
            )}
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(false)}>
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-900">Редактировать задачу</h3>
                <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Категория</label>
                  <select value={editCategory} onChange={e => setEditCategory(e.target.value)} className={inp}>
                    {Object.entries(CATS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Название</label>
                  <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Описание</label>
                  <textarea rows={5} value={editDescription} onChange={e => setEditDescription(e.target.value)} className={inp + ' resize-none'} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Город</label>
                  <select value={editCity} onChange={e => setEditCity(e.target.value)} className={inp}>
                    {['Астана','Алматы','Шымкент','Актобе','Тараз','Павлодар','Усть-Каменогорск','Семей','Атырау','Костанай','Кызылорда','Уральск','Петропавловск','Актау','Темиртау','Туркестан','Кокшетау','Талдыкорган'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={saveEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors">Сохранить</button>
                  <button onClick={() => setEditing(false)} className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-semibold text-sm transition-colors">Отмена</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-gray-900">{p.accountant_name}</p>
                          {p.accountant_verified && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                              Проверен
                            </span>
                          )}
                        </div>
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
                      <button onClick={() => router.push(`/dashboard/client?tab=messages&with=${p.accountant_id}`)}
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
