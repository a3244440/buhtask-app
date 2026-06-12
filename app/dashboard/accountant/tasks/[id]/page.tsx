'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Send, CheckCircle } from 'lucide-react';
import DashboardHeader from '../../../../components/DashboardHeader';

const CATS: Record<string, string> = {
  tax: 'Налоги и НДС', salary: 'Расчёт зарплаты', register: 'Регистрация ИП/ТОО',
  audit: 'Аудит', report: 'Отчётность', other: 'Прочее',
};

interface Task {
  id: string; title: string; description: string; status: string;
  category: string; city: string; budget?: number; deadline?: string; created_at: string;
}

export default function AccountantTaskDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [letter, setLetter] = useState('');

  useEffect(() => {
    init();
  }, [params.id]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);

    const { data: taskData } = await supabase.from('tasks').select('*').eq('id', params.id).maybeSingle();
    setTask(taskData || null);

    // Check if already applied
    const { data: existing } = await supabase.from('proposals').select('id').eq('task_id', params.id).eq('accountant_id', user.id).single();
    if (existing) setAlreadyApplied(true);

    setLoading(false);
  };

  const handleSubmit = async () => {
    setError('');
    if (!price || isNaN(parseFloat(price))) { setError('Укажите вашу цену'); return; }
    if (!letter.trim()) { setError('Напишите сопроводительное письмо'); return; }
    setSubmitting(true);
    try {
      const { error: e } = await supabase.from('proposals').insert({
        task_id: params.id,
        accountant_id: userId,
        proposed_price: parseFloat(price),
        description: letter.trim(),
        estimated_days: days ? parseInt(days) : null,
        status: 'pending',
      });
      if (e) throw e;
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/accountant'), 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки отклика');
    } finally {
      setSubmitting(false);
    }
  };

  const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white transition-all";

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/></div>;
  if (!task) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">Задача не найдена</p></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.push('/dashboard/accountant')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4"/> Назад к задачам
        </button>

        {/* Task info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            {task.budget && <span className="text-xl font-extrabold text-emerald-600 flex-shrink-0">💰 {task.budget.toLocaleString()} ₸</span>}
          </div>
          <div className="flex flex-wrap gap-2 mb-5 text-xs">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">{CATS[task.category] || task.category}</span>
            {task.city && <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full"><MapPin className="w-3 h-3"/>{task.city}</span>}
            {task.deadline && <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full"><Calendar className="w-3 h-3"/>до {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Описание задачи</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-4">{task.description}</p>
          <p className="text-xs text-gray-400">Опубликовано: {new Date(task.created_at).toLocaleDateString('ru-RU', { year:'numeric', month:'long', day:'numeric' })}</p>
        </div>

        {/* Proposal form */}
        {success ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600"/>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Отклик отправлен!</h2>
            <p className="text-sm text-gray-500">Заказчик рассмотрит вашу заявку. Перенаправляем...</p>
          </div>
        ) : alreadyApplied ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3"/>
            <p className="font-semibold text-emerald-800">Вы уже откликнулись на эту задачу</p>
            <p className="text-sm text-emerald-600 mt-1">Ожидайте ответа заказчика</p>
          </div>
        ) : task.status !== 'open' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-gray-500">Задача больше не принимает отклики</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-600"/> Отправить отклик
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ваша цена (₸) *</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="15000" className={inp} min="0"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Срок (дней)</label>
                  <input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="3" className={inp} min="1"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Сопроводительное письмо *</label>
                <textarea rows={5} value={letter} onChange={e => setLetter(e.target.value)}
                  placeholder="Расскажите о своём опыте, почему подходите для этой задачи..."
                  className={inp + ' resize-none'}/>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors">
                <Send className="w-4 h-4"/> {submitting ? 'Отправляем...' : 'Отправить отклик'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
