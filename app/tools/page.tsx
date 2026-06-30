'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Building2, CalendarDays, Calculator, BarChart3, ChevronRight, ArrowLeft, FileText, Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import DashboardHeader from '../components/DashboardHeader';
import MobileToolsNav from '../components/MobileToolsNav';

export default function ToolsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [role, setRole] = useState('client');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (p) setRole(p.role || 'client');
    });
  }, []);

  const isAccountant = role === 'accountant';
  const dash = isAccountant ? '/dashboard/accountant' : '/dashboard/client';

  const tools = [
    { href: '/income-910', icon: Calculator, label: t('inc910.title'), desc: t('inc910.toolsDesc'), hide: false, color: 'bg-blue-600 text-white', highlight: true },
    { href: '/companies', icon: Building2, label: t('tools.companies'), desc: t('tools.companiesDesc'), hide: isAccountant, color: 'bg-blue-50 text-blue-600' },
    { href: '/counterparties', icon: Users, label: t('tools.counterparties'), desc: t('tools.counterpartiesDesc'), hide: isAccountant, color: 'bg-indigo-50 text-indigo-600' },
    { href: '/documents', icon: FileText, label: t('tools.documents'), desc: t('tools.documentsDesc'), hide: isAccountant, color: 'bg-sky-50 text-sky-600' },
    { href: '/tax-calendar', icon: CalendarDays, label: t('tools.taxCalendar'), desc: t('tools.taxCalendarDesc'), hide: false, color: 'bg-violet-50 text-violet-600' },
    { href: '/salary-calculator', icon: Calculator, label: t('tools.salaryCalc'), desc: t('tools.salaryCalcDesc'), hide: false, color: 'bg-emerald-50 text-emerald-600' },
    { href: '/finance', icon: BarChart3, label: t('tools.finance'), desc: t('tools.financeDesc'), hide: isAccountant, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title={t('tools.title')} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.push(dash)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
          <ArrowLeft className="w-4 h-4" /> На главную
        </button>
        <h1 className="text-xl font-bold text-gray-900 mb-5">{t('tools.title')}</h1>
        <div className="space-y-3">
          {tools.filter(t => !t.hide).map(t => (
            <button key={t.href} onClick={() => router.push(t.href)}
              className={`w-full bg-white rounded-2xl border shadow-sm p-4 flex items-center gap-4 transition-colors ${(t as any).highlight ? 'border-blue-300 ring-1 ring-blue-100 hover:border-blue-400' : 'border-gray-100 hover:border-blue-200'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${t.color}`}>
                <t.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{t.label}</p>
                  {(t as any).highlight && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-300 text-blue-900 rounded font-bold">NEW</span>}
                </div>
                <p className="text-xs text-gray-400">{t.desc}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300" />
            </button>
          ))}
        </div>
      </main>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
