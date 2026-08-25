'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import DashboardHeader from '../../../components/DashboardHeader';
import { getActiveCompany } from '@/lib/activeCompany';
import { shortCompanyName } from '@/lib/companyName';
import { useI18n } from '@/lib/i18n';

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
  const { t } = useI18n();
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

      const { data: inserted, error: e } = await supabase
        .from('tasks')
        .insert(payload)
        .select('id')
        .single();

      if (e) {
        const errMsg = e.message || e.details || e.hint || JSON.stringify(e);
        console.error('Supabase error:', e);
        setError(`Ошибка: ${errMsg}`);
        return;
      }

      if (inserted?.id) {
        const { data: sess } = await supabase.auth.getSession();
        fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token || ''}` }, body: JSON.stringify({ type: 'task', taskId: inserted.id }) }).catch(() => {});
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
          <ArrowLeft className="w-4 h-4" /> {t('btn.back')}
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('ct.title')}</h1>
            <p className="text-sm text-gray-500">{t('ct.subtitle')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ct.forCompany')}</label>
            <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
              <option value="personal">{t('ct.personalTask')}</option>
              {companies.map(c => <option key={c.id} value={c.id}>🏢 {shortCompanyName(c.name)}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1.5">
              {companies.length === 0
                ? t('ct.noCompanyHint')
                : t('ct.companyHint')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ct.category')} *</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{t('taskcat.' + c.value)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ct.taskTitle')} *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t('ct.titlePlaceholder')} className={inp} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ct.description')} *</label>
            <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)}
              placeholder={t('ct.descPlaceholder')}
              className={inp + ' resize-none'} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ct.deadline')}</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className={inp} min={new Date().toISOString().split('T')[0]} />
            <p className="text-xs text-gray-400 mt-1.5">{t('ct.priceHint')}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('ct.city')} *</label>
            <select value={city} onChange={e => setCity(e.target.value)} className={inp}>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              <p className="font-medium mb-1">{t('ct.error')}</p>
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
            {loading ? t('ct.publishing') : t('ct.publish')}
          </button>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
