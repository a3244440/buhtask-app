'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, User, MapPin, FileText, CreditCard, Calendar, Hash, Briefcase, TrendingUp, CalendarDays, Calculator, BarChart3, Check } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import ToolsSidebar from '../../components/ToolsSidebar';
import MobileToolsNav from '../../components/MobileToolsNav';
import { setActiveCompany } from '@/lib/activeCompany';

interface BankAccount { bank: string; iban: string; }
interface Company {
  id: string; name: string; bin: string; director: string; address: string;
  tax_regime: string; oked: string; registration_date: string; status: string;
  bank_accounts: BankAccount[];
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState({ income: 0, expense: 0, tasks: 0 });

  useEffect(() => { init(); }, [companyId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    const { data } = await supabase.from('companies').select('*').eq('id', companyId).eq('owner_id', user.id).maybeSingle();
    if (!data) { router.push('/companies'); return; }
    setCompany(data as Company);

    // Финансовая статистика по компании
    const { data: fin } = await supabase.from('finance_records').select('type,amount').eq('company_id', companyId);
    const income = (fin || []).filter((r: any) => r.type === 'income').reduce((s: number, r: any) => s + Number(r.amount), 0);
    const expense = (fin || []).filter((r: any) => r.type === 'expense').reduce((s: number, r: any) => s + Number(r.amount), 0);
    setStats({ income, expense, tasks: 0 });
    setLoading(false);
  };

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₸';

  const openTool = (path: string) => {
    setActiveCompany(companyId); // делаем компанию активной
    router.push(path);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!company) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title="Компания" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.push('/companies')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
          <ArrowLeft className="w-4 h-4" /> К списку компаний
        </button>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-7 h-7 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900">{company.name}</h1>
              {company.status && <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">{company.status}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
            {company.bin && <InfoRow icon={Hash} label="БИН" value={company.bin} />}
            {company.director && <InfoRow icon={User} label="Директор" value={company.director} />}
            {company.tax_regime && <InfoRow icon={FileText} label="Налоговый режим" value={company.tax_regime} />}
            {company.registration_date && <InfoRow icon={Calendar} label="Дата регистрации" value={company.registration_date} />}
            {company.oked && <InfoRow icon={Briefcase} label="Вид деятельности" value={company.oked} full />}
            {company.address && <InfoRow icon={MapPin} label="Адрес" value={company.address} full />}
          </div>

          {company.bank_accounts && company.bank_accounts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-medium text-gray-400 mb-2">Банковские счета</p>
              <div className="space-y-2">
                {company.bank_accounts.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{b.bank}</span>
                    <span className="text-sm font-medium text-gray-900 ml-auto">{b.iban}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Finance summary */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Доходы</p>
            <p className="text-base font-bold text-emerald-600">{fmt(stats.income)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Расходы</p>
            <p className="text-base font-bold text-red-600">{fmt(stats.expense)}</p>
          </div>
          <div className="bg-blue-50 rounded-2xl border border-blue-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 mb-1">Прибыль</p>
            <p className="text-base font-bold text-blue-600">{fmt(stats.income - stats.expense)}</p>
          </div>
        </div>

        {/* Tools for this company */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Инструменты компании</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToolButton icon={BarChart3} label="Финансовая аналитика" desc="Доходы, расходы, прибыль" onClick={() => openTool('/finance')} />
            <ToolButton icon={CalendarDays} label="Налоговый календарь" desc="Сроки и напоминания" onClick={() => openTool('/tax-calendar')} />
            <ToolButton icon={Calculator} label="Калькулятор зарплаты" desc="Расчёт налогов с ЗП" onClick={() => openTool('/salary-calculator')} />
            <ToolButton icon={Building2} label="Редактировать данные" desc="Изменить реквизиты" onClick={() => router.push('/companies?edit=' + companyId)} />
          </div>
        </div>
      </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, full }: { icon: any; label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-sm text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors text-left">
      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-blue-600" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{desc}</p>
      </div>
    </button>
  );
}
export const dynamic = 'force-dynamic';
