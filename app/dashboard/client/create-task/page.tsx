'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';

const CATEGORIES = [
  { value: 'tax_report', label: 'Налоговая отчётность' },
  { value: 'accounting', label: 'Ведение бухгалтерии' },
  { value: 'salary', label: 'Расчёт зарплаты' },
  { value: 'ip_registration', label: 'Регистрация ИП' },
  { value: 'too_registration', label: 'Регистрация ТОО' },
  { value: 'consultation', label: 'Консультация' },
  { value: 'audit', label: 'Аудит' },
  { value: 'other', label: 'Прочее' },
];

const CITIES = ['Астана','Алматы','Шымкент','Актобе','Тараз','Павлодар','Усть-Каменогорск','Семей','Атырау','Костанай','Кызылорда','Уральск','Петропавловск','Актау','Темиртау','Туркестан','Кокшетау','Талдыкорган','Экибастуз','Рудный'];

const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white";

export default function CreateTask() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', category: 'tax_report', description: '',
    budget: '', deadline: '', city: 'Астана',
  });

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
      // Базовые поля которые точно есть в таблице
      const payload: any = {
        client_id: userId,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        city: form.city,
        status: 'open',
      };

      // Пробуем добавить опциональные поля
      if (form.budget) payload.budget = parseFloat(form.budget);
      if (form.deadline) payload.deadline = form.deadline;

      const { error: e } = await supabase.from('tasks').insert(payload);

      if (e) {
        // Если ошибка из-за budget/deadline - пробуем без них
        if (e.message.includes('budget') || e.message.includes('deadline') || e.message.includes('column')) {
          const safePayload = {
            client_id: userId,
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            city: form.city,
            status: 'open',
          };
          const { error: e2 } = await supabase.from('tasks').insert(safePayload);
          if (e2) throw e2;
        } else {
          throw e;
        }
      }

      router.push('/dashboard/client');
    } catch (err: any) {
      setError(err.message || 'Ошибка создания задачи');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm">
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          <a href="/dashboard/client">
            <img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto" />
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Создать новую задачу</h1>
            <p className="text-sm text-gray-500">Бухгалтеры получат уведомление и смогут откликнуться</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Категория *</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название задачи *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Например: Сдача налоговой отчётности за 2 квартал 2026" className={inp} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Описание *</label>
            <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Опишите задачу подробно: тип компании, налоговый режим, детали..." className={inp + ' resize-none'} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Бюджет (₸)</label>
              <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)}
                placeholder="15000" className={inp} min="0" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Срок выполнения</label>
              <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                className={inp} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Город *</label>
            <select value={form.city} onChange={e => set('city', e.target.value)} className={inp}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

          <button onClick={handleSubmit} disabled={loading || !userId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold transition-colors text-sm">
            {loading ? 'Публикуем...' : 'Опубликовать задачу'}
          </button>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
