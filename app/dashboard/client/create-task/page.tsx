'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import DashboardHeader from '../../../components/DashboardHeader';
import { getActiveCompany } from '@/lib/activeCompany';

const CATEGORIES = [
  { value: 'tax', label: 'Налоговая отчётность' },
  { value: 'construction', label: 'КС-2 / КС-3 (строительство)' },
  { value: 'maternity', label: 'Декретные и пособия' },
  { value: 'unblock_account', label: 'Снятие ареста со счёта' },
  { value: 'restore_accounting', label: 'Восстановление учёта' },
  { value: 'esf_snt', label: 'Выписка ЭСФ / СНТ' },
  { value: 'kgd_notice', label: 'Ответ на уведомление КГД' },
  { value: 'tax_inspection', label: 'Помощь с налоговой проверкой' },
  { value: 'vat_return', label: 'Возврат НДС' },
  { value: 'declaration_250', label: 'Декларация 250 / 270' },
  { value: 'salary', label: 'Расчёт зарплаты' },
  { value: 'register', label: 'Регистрация ИП / ТОО' },
  { value: 'closing', label: 'Закрытие ИП / ТОО' },
  { value: 'audit', label: 'Аудит' },
  { value: 'report', label: 'Отчётность' },
  { value: 'other', label: 'Прочее' },
];
const CITIES = ['Астана','Алматы','Шымкент','Актобе','Тараз','Павлодар','Усть-Каменогорск','Семей','Атырау','Костанай','Кызылорда','Уральск','Петропавловск','Актау','Темиртау','Туркестан','Кокшетау','Талдыкорган'];
const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all";

export default function CreateTask() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('tax');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Астана');
  const [deadline, setDeadline] = useState('');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState<string>('personal');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUserId(data.user.id);

      // Загружаем компании заказчика
      const { data: comps } = await supabase.from('companies').select('id,name').eq('owner_id', data.user.id);
      setCompanies((comps as { id: string; name: string }[]) || []);
      // Предвыбираем активную компанию
      const active = getActiveCompany();
      if (active && active !== 'personal') setCompanyId(active);

      // Убеждаемся что профиль существует (создаём если нет)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email,
          phone: '',
          role: 'client',
          rating: 0,
          is_banned: false,
          completed_tasks: 0,
          verification_status: 'not_verified',
          availability: 'free',
        });
      }
    });
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) { setError('Введите название задачи'); return; }
    if (!description.trim()) { setError('Добавьте описание'); return; }
    if (!userId) { setError('Ошибка авторизации — войдите заново'); return; }

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        client_id: userId,
        title: title.trim(),
        description: description.trim(),
        category,
        city,
        status: 'open',
      };
      if (deadline) payload.deadline = deadline;
      if (companyId && companyId !== 'personal') payload.company_id = companyId;

      const { error: e } = await supabase
        .from('tasks')
        .insert(payload);

      if (e) {
        const errMsg = e.message || e.details || e.hint || JSON.stringify(e);
        console.error('Supabase error:', e);
        setError(`Ошибка: ${errMsg}`);
        return;
      }

      router.push('/dashboard/client');
    } catch (err: any) {
      setError(err?.message || 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">Для какой компании?</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
              <option value="personal">👤 Личная задача (без компании)</option>
              {companies.map(c => <option key={c.id} value={c.id}>🏢 {c.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              {companies.length === 0
                ? 'Добавьте компанию в «Мои компании» — бухгалтер будет видеть её реквизиты для документов'
                : 'Бухгалтер увидит реквизиты компании после одобрения заказа — для подготовки документов'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Категория *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Название задачи *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Например: Сдача отчёта 910 ФНО за 2 квартал" className={inp} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Описание *</label>
            <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Опишите задачу: тип компании (ИП/ТОО), налоговый режим, детали..."
              className={inp + ' resize-none'} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Желаемый срок выполнения</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className={inp} min={new Date().toISOString().split('T')[0]} />
            <p className="text-xs text-gray-400 mt-1.5">💡 Цену предложат бухгалтеры в своих откликах</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Город *</label>
            <select value={city} onChange={e => setCity(e.target.value)} className={inp}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <p className="font-medium mb-1">Не удалось создать задачу</p>
              <p className="text-xs opacity-80">{error}</p>
              {error.includes('row-level security') || error.includes('policy') ? (
                <p className="text-xs mt-2 text-red-500">
                  💡 Нужно настроить RLS в Supabase. Обратитесь к разработчику.
                </p>
              ) : null}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading || !userId}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold transition-colors text-sm">
            {loading ? 'Публикуем задачу...' : 'Опубликовать задачу'}
          </button>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
