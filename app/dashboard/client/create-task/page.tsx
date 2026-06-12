'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import DashboardHeader from '../../../components/DashboardHeader';

const CATEGORIES = [
  { value: 'tax_reporting', label: 'Налоговая отчётность' },
  { value: 'salary', label: 'Расчёт зарплаты' },
  { value: 'registration', label: 'Регистрация ИП / ТОО' },
  { value: 'audit', label: 'Аудит' },
  { value: 'consultation', label: 'Консультация' },
  { value: 'full_accounting', label: 'Ведение бухгалтерии' },
  { value: 'other', label: 'Прочее' },
];

const CITIES = ['Астана','Алматы','Шымкент','Актобе','Тараз','Павлодар','Усть-Каменогорск','Семей','Атырау','Костанай','Кызылорда','Уральск','Петропавловск','Актау','Темиртау','Туркестан','Кокшетау','Талдыкорган'];
const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all";

export default function CreateTask() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', category: 'tax_reporting', description: '', budget: '', deadline: '', city: 'Астана' });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUserId(data.user.id);
    });
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.title.trim()) { setError('Введите название задачи'); return; }
    if (!form.description.trim()) { setError('Добавьте описание'); return; }
    if (!userId) { setError('Ошибка авторизации'); return; }
    setLoading(true);
    try {
      const payload: any = { client_id: userId, title: form.title.trim(), description: form.description.trim(), category: form.category, city: form.city, status: 'open' };
      if (form.budget) payload.budget = parseFloat(form.budget);
      if (form.deadline) payload.deadline = form.deadline;
      const { error: e } = await supabase.from('tasks').insert(payload);
      if (e) throw e;
      router.push('/dashboard/client');
    } catch (err: any) {
      setError(err.message || 'Ошибка создания задачи');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Создать новую задачу</h1>
            <p className="text-sm text-gray-500">Бухгалтеры получат уведомление и смогут откликнуться</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Категория *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название задачи *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Например: Сдача налоговой отчётности за 2 квартал 2026" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Описание *</label>
            <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Опишите задачу: тип компании, налоговый режим, детали..." className={inp + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Бюджет (₸)</label>
              <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="15000" className={inp} min="0" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Срок выполнения</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={inp} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Город *</label>
            <select value={form.city} onChange={e => set('city', e.target.value)} className={inp}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
          <button onClick={handleSubmit} disabled={loading || !userId} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold transition-colors text-sm">
            {loading ? 'Публикуем...' : 'Опубликовать задачу'}
          </button>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
