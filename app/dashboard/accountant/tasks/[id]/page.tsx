'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { ArrowLeft, MapPin, Calendar, Send, CheckCircle, Clock, Building2, CreditCard } from 'lucide-react';
import DashboardHeader from '../../../../components/DashboardHeader';
import { shortCompanyName } from '@/lib/companyName';

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
  category: string; city: string; budget?: number; deadline?: string; created_at: string;
  accountant_id?: string; completion_requested?: boolean; completion_approved?: boolean;
  final_price?: number; commission_amount?: number; commission_paid?: boolean;
  company_id?: string;
}
interface CompanyInfo {
  name: string; bin: string; director: string; address: string;
  tax_regime: string; oked: string; bank_accounts: { bank: string; iban: string }[];
}

export default function AccountantTaskDetail() {
  const { t } = useI18n();
  const routeParams = useParams();
  const taskId = routeParams?.id as string;
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const [userId, setUserId] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [letter, setLetter] = useState('');
  const [myPrice, setMyPrice] = useState(0);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [companyName, setCompanyName] = useState('');

  useEffect(() => { init(); }, [taskId]);

  const init = async () => {
    if (!taskId) { return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);

    const { data: taskData, error: taskErr } = await supabase
      .from('tasks').select('*').eq('id', taskId).maybeSingle();

    if (taskErr) {
      setDebugInfo(`Ошибка БД: ${taskErr.message} (код: ${taskErr.code})`);
    } else if (!taskData) {
      setDebugInfo(`Задача с ID ${taskId} не существует в базе или RLS блокирует доступ.`);
    } else {
      setTask(taskData);
      // Загружаем данные компании если задача к ней привязана
      if (taskData.company_id) {
        const assigned = taskData.accountant_id === user.id;
        // Название — всегда; полные реквизиты — только назначенному бухгалтеру
        const fields = assigned ? 'name,bin,director,address,tax_regime,oked,bank_accounts' : 'name';
        const { data: comp } = await supabase.from('companies').select(fields).eq('id', taskData.company_id).maybeSingle();
        if (comp) {
          setCompanyName(shortCompanyName((comp as any).name || ''));
          if (assigned) setCompanyInfo(comp as CompanyInfo);
        }
      }
    }

    const { data: existing } = await supabase.from('proposals').select('id,proposed_price').eq('task_id', taskId).eq('accountant_id', user.id).maybeSingle();
    if (existing) {
      setAlreadyApplied(true);
      if (existing.proposed_price) setMyPrice(existing.proposed_price);
    }
    setLoading(false);
  };

  const requestCompletion = async () => {
    const { error: e } = await supabase.from('tasks').update({
      completion_requested: true,
      completion_requested_at: new Date().toISOString(),
    }).eq('id', taskId);
    if (e) { setError('Ошибка: ' + e.message); return; }
    setTask(t => t ? { ...t, completion_requested: true } : t);
  };

  const handleSubmit = async () => {
    setError('');
    if (!price || isNaN(parseFloat(price))) { setError('Укажите вашу цену'); return; }
    if (!letter.trim()) { setError('Напишите сопроводительное письмо'); return; }
    setSubmitting(true);
    try {
      const { error: e } = await supabase.from('proposals').insert({
        task_id: taskId, accountant_id: userId,
        proposed_price: parseFloat(price), description: letter.trim(),
        estimated_days: days ? parseInt(days) : null, status: 'pending',
      });
      if (e) throw e;
      setSuccess(true);
      setTimeout(() => router.push('/dashboard/accountant'), 2000);
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки отклика');
    } finally { setSubmitting(false); }
  };

  const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white transition-all";

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/></div>;

  if (!task) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('atd.notFound')}</h2>
          {debugInfo && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-3 mb-4 break-words">{debugInfo}</p>}
          <button onClick={() => router.push('/dashboard/accountant')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">← {t('atd.backToCabinet')}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.push('/dashboard/accountant')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4"/> {t('atd.backToTasks')}
        </button>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900">{task.title}</h1>
            {task.budget && <span className="text-xl font-extrabold text-emerald-600 flex-shrink-0">💰 {task.budget.toLocaleString()} ₸</span>}
          </div>
          <div className="flex flex-wrap gap-2 mb-5 text-xs">
            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">{t('taskcat.' + task.category)}</span>
            {companyName && <span className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full font-medium"><Building2 className="w-3 h-3"/>{companyName}</span>}
            {task.city && <span className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full"><MapPin className="w-3 h-3"/>{task.city}</span>}
            {task.deadline && <span className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full"><Calendar className="w-3 h-3"/>{t('td.until')} {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-2">{t('atd.taskDesc')}</p>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-4">{task.description}</p>
          <p className="text-xs text-gray-400">{t('atd.published')}: {new Date(task.created_at).toLocaleDateString('ru-RU', { year:'numeric', month:'long', day:'numeric' })}</p>
        </div>

        {success ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-emerald-600"/></div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">{t('atd.proposalSent')}</h2>
            <p className="text-sm text-gray-500">{t('atd.redirecting')}</p>
          </div>
        ) : (task.status === 'in_progress' || task.status === 'paid') && task.accountant_id === userId ? (
          <>
            {/* Реквизиты компании заказчика для документов */}
            {companyInfo && (
              <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-6 mb-5">
                <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-600"/> {t('atd.companyDetails')}</h2>
                <p className="text-xs text-gray-500 mb-4">{t('atd.useForDocs')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-gray-400">{t('atd.name')}</p><p className="text-gray-800 font-medium">{companyInfo.name}</p></div>
                  {companyInfo.bin && <div><p className="text-xs text-gray-400">БИН</p><p className="text-gray-800">{companyInfo.bin}</p></div>}
                  {companyInfo.director && <div><p className="text-xs text-gray-400">{t('atd.director')}</p><p className="text-gray-800">{companyInfo.director}</p></div>}
                  {companyInfo.tax_regime && <div><p className="text-xs text-gray-400">{t('atd.taxRegime')}</p><p className="text-gray-800">{companyInfo.tax_regime}</p></div>}
                  {companyInfo.oked && <div className="sm:col-span-2"><p className="text-xs text-gray-400">{t('atd.activity')}</p><p className="text-gray-800">{companyInfo.oked}</p></div>}
                  {companyInfo.address && <div className="sm:col-span-2"><p className="text-xs text-gray-400">{t('atd.address')}</p><p className="text-gray-800">{companyInfo.address}</p></div>}
                </div>
                {companyInfo.bank_accounts && companyInfo.bank_accounts.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mb-2">{t('atd.bankAccounts')}</p>
                    <div className="space-y-1.5">
                      {companyInfo.bank_accounts.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{b.bank}:</span>
                          <span className="text-gray-900 font-medium">{b.iban}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-600"/> {t('atd.orderManagement')}</h2>

            {/* Этап 1: работа идёт, запросить закрытие */}
            {task.status === 'in_progress' && !task.completion_requested && (
              <div>
                <p className="text-sm text-gray-600 mb-4">{t('atd.requestCloseDesc')}</p>
                <button onClick={requestCompletion}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  <CheckCircle className="w-4 h-4"/> {t('atd.requestClose')}
                </button>
              </div>
            )}

            {/* Этап 2: ждём одобрения заказчика */}
            {task.status === 'in_progress' && task.completion_requested && !task.completion_approved && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <Clock className="w-8 h-8 text-amber-500 mx-auto mb-2"/>
                <p className="font-semibold text-amber-800 text-sm">{t('atd.waitingApproval')}</p>
                <p className="text-xs text-amber-600 mt-1">{t('atd.waitingApprovalDesc')}</p>
              </div>
            )}

            {/* Этап 3: заказчик одобрил — показать оплату */}
            {task.status === 'in_progress' && task.completion_approved && (
              <div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2"/>
                  <p className="font-semibold text-emerald-800 text-sm">{t('atd.clientApproved')}</p>
                  <p className="text-xs text-emerald-600 mt-1">{t('atd.clientApprovedDesc')}</p>
                </div>
                <p className="text-sm text-gray-600 mb-2">{t('atd.orderAmount')}: <b>{(myPrice || task.budget || 0).toLocaleString()} ₸</b></p>
                <p className="text-xs text-gray-400 mb-4">{t('atd.kaspiDirectHint')}</p>
                <button onClick={() => router.push('/dashboard/accountant?tab=my_orders')}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {t('atd.goToOrder')}
                </button>
              </div>
            )}

            {/* Оплачено */}
            {task.status === 'paid' && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2"/>
                <p className="font-semibold text-blue-800 text-sm">{t('atd.orderPaidClosed')}</p>
                {!task.commission_paid && <p className="text-xs text-blue-600 mt-1">{t('atd.dontForgetCommission')}</p>}
              </div>
            )}
          </div>
          </>
        ) : alreadyApplied ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3"/>
            <p className="font-semibold text-emerald-800">{t('atd.alreadyApplied')}</p>
            <p className="text-xs text-emerald-600 mt-1">{t('atd.waitClientChoice')}</p>
          </div>
        ) : task.status !== 'open' ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-center"><p className="text-gray-500">{t('atd.noLongerAccepts')}</p></div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2"><Send className="w-4 h-4 text-blue-600"/> {t('atd.sendResponse')}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('atd.yourPrice')} *</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="15000" className={inp} min="0"/>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('atd.daysLabel')}</label>
                  <input type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="3" className={inp} min="1"/>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('atd.coverLetter')} *</label>
                <textarea rows={5} value={letter} onChange={e => setLetter(e.target.value)} placeholder={t('atd.coverPlaceholder')} className={inp + ' resize-none'}/>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
              <button onClick={handleSubmit} disabled={submitting} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors">
                <Send className="w-4 h-4"/> {submitting ? t('atd.sending') : t('atd.sendResponse')}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
