'use client';
import { logToolUsage } from '@/lib/logTool';
import { useState, useMemo, useEffect } from 'react';
import { Baby, Info } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';

// Параметры РК 2026
const MRP = 4325;
const MZP = 85000;

// Дни больничного → коэффициент (дни/30)
const LEAVE_OPTIONS = [
  { days: 126, coef: 4.2, key: 'mat.normal' },     // обычные роды
  { days: 140, coef: 140 / 30, key: 'mat.complicated' }, // осложнённые / двойня
  { days: 170, coef: 170 / 30, key: 'mat.nuclear' },     // ядерные территории
  { days: 184, coef: 184 / 30, key: 'mat.nuclearComp' }, // ядерные + осложнённые
];

// Фикс по уходу для неработающих (МРП/мес по очерёдности ребёнка)
const CARE_FIXED_MRP = [5.76, 6.81, 7.85, 8.90];

export default function MaternityCalculatorPage() {
  useEffect(() => { logToolUsage('Декретный калькулятор'); }, []);
  const { t } = useI18n();
  const [working, setWorking] = useState(true);
  const [income12, setIncome12] = useState(300000);  // среднемесячный доход за 12 мес
  const [income24, setIncome24] = useState(300000);  // среднемесячный доход за 24 мес
  const [childNum, setChildNum] = useState(1);       // какой по счёту ребёнок
  const [leaveIdx, setLeaveIdx] = useState(0);

  const r = useMemo(() => {
    const cap = 7 * MZP; // максимум дохода для расчёта (595 000)
    // 1) Единовременное пособие на рождение (всем)
    const birthMrp = childNum >= 4 ? 63 : 38;
    const birth = Math.round(birthMrp * MRP);

    // 2) Соцвыплата по беременности и родам (работающим): СМД(12, cap 7МЗП) × коэф − 10% ОПВ
    const leave = LEAVE_OPTIONS[leaveIdx];
    const smd12 = Math.min(income12, cap);
    const bir = working ? Math.round(smd12 * leave.coef * 0.9) : 0;

    // 3) Ежемесячно по уходу до 1.5 лет
    const fixedCare = Math.round(CARE_FIXED_MRP[Math.min(childNum, 4) - 1] * MRP);
    let care = fixedCare;
    if (working) {
      const smd24 = Math.min(income24, cap);
      care = Math.max(Math.round(smd24 * 0.4 * 0.9), fixedCare); // не ниже фикса
    }
    const careTotal = care * 18; // 18 месяцев (до 1.5 лет)

    const total = birth + bir + careTotal;
    return { birth, birthMrp, bir, care, careTotal, total, capApplied12: income12 > cap, capApplied24: income24 > cap };
  }, [working, income12, income24, childNum, leaveIdx]);

  const fmt = (n: number) => n.toLocaleString('ru-RU');
  const inp = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-400 bg-white';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('mat.title')} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Baby className="w-5 h-5 text-pink-500" /> {t('mat.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('mat.subtitle')}</p>
          </div>

          {/* Статус */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button onClick={() => setWorking(true)} className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${working ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white text-gray-500'}`}>{t('mat.working')}</button>
            <button onClick={() => setWorking(false)} className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${!working ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 bg-white text-gray-500'}`}>{t('mat.notWorking')}</button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4">
            {/* Какой ребёнок */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('mat.childNum')}</label>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setChildNum(n)} className={`flex-1 py-2 rounded-lg text-sm font-semibold ${childNum === n ? 'bg-pink-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>{n === 4 ? '4+' : n}</button>
                ))}
              </div>
            </div>

            {working && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('mat.income12')}</label>
                  <input type="number" value={income12} min={0} onChange={e => setIncome12(Math.max(0, Number(e.target.value) || 0))} className={inp} />
                  {r.capApplied12 && <p className="text-[11px] text-amber-600 mt-1">{t('mat.capNote')} (7 МЗП = {fmt(7 * MZP)} ₸)</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('mat.income24')}</label>
                  <input type="number" value={income24} min={0} onChange={e => setIncome24(Math.max(0, Number(e.target.value) || 0))} className={inp} />
                  {r.capApplied24 && <p className="text-[11px] text-amber-600 mt-1">{t('mat.capNote')} (7 МЗП = {fmt(7 * MZP)} ₸)</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('mat.leaveType')}</label>
                  <select value={leaveIdx} onChange={e => setLeaveIdx(Number(e.target.value))} className={inp}>
                    {LEAVE_OPTIONS.map((o, i) => (<option key={i} value={i}>{t(o.key)} — {o.days} {t('mat.days')}</option>))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Результаты */}
          <div className="space-y-3 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('mat.birthGrant')}</p>
                <p className="text-[11px] text-gray-400">{r.birthMrp} МРП · {t('mat.once')}</p>
              </div>
              <p className="text-lg font-extrabold text-pink-600">{fmt(r.birth)} ₸</p>
            </div>

            {working && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t('mat.birGrant')}</p>
                  <p className="text-[11px] text-gray-400">{t('mat.birFormula')}</p>
                </div>
                <p className="text-lg font-extrabold text-pink-600">{fmt(r.bir)} ₸</p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{t('mat.careGrant')}</p>
                <p className="text-[11px] text-gray-400">{t('mat.perMonth18')} · {t('mat.total18')}: {fmt(r.careTotal)} ₸</p>
              </div>
              <p className="text-lg font-extrabold text-pink-600">{fmt(r.care)} ₸/{t('mat.mo')}</p>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl p-5 text-white flex items-center justify-between">
              <p className="font-semibold">{t('mat.grandTotal')}</p>
              <p className="text-2xl font-extrabold">{fmt(r.total)} ₸</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">{t('mat.note')}</p>
          </div>
        </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
