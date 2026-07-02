'use client';
import { useMemo, useState } from 'react';
import { BookOpen, Info } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';

// === Показатели РК 2026 ===
const MRP = 4325;
const MZP = 85000;
const BASE_RATE = 18.0; // базовая ставка НБ РК

// Нерабочие дни 2026 (праздники + переносы + Рождество + Курбан-айт), сверено с балансом Минтруда: 246 дн / 1968 ч
const OFF_2026: Record<string, string> = {
  '2026-01-01': 'Новый год', '2026-01-02': 'Новый год',
  '2026-01-07': 'Рождество Христово',
  '2026-03-08': 'Международный женский день', '2026-03-09': 'Перенос (8 марта — вс)',
  '2026-03-21': 'Наурыз мейрамы', '2026-03-22': 'Наурыз мейрамы', '2026-03-23': 'Наурыз мейрамы',
  '2026-03-24': 'Перенос (21 марта — сб)', '2026-03-25': 'Перенос (22 марта — вс)',
  '2026-05-01': 'Праздник единства народа Казахстана',
  '2026-05-07': 'День защитника Отечества',
  '2026-05-09': 'День Победы', '2026-05-11': 'Перенос (9 мая — сб)',
  '2026-05-27': 'Курбан-айт (первый день)',
  '2026-07-06': 'День столицы',
  '2026-08-30': 'День Конституции', '2026-08-31': 'Перенос (30 августа — вс)',
  '2026-10-25': 'День Республики', '2026-10-26': 'Перенос (25 октября — вс)',
  '2026-12-16': 'День Независимости',
};

const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ReferencePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'indicators' | 'calendar' | 'holidays'>('indicators');

  // Производственный календарь: рабочие дни по месяцам (5-дневка)
  const prod = useMemo(() => {
    const rows = [];
    let totalDays = 0;
    for (let m = 0; m < 12; m++) {
      const dim = new Date(2026, m + 1, 0).getDate();
      let wd = 0;
      for (let d = 1; d <= dim; d++) {
        const dt = new Date(2026, m, d);
        const dow = dt.getDay();
        if (dow >= 1 && dow <= 5 && !OFF_2026[toISO(dt)]) wd++;
      }
      rows.push({ m, cal: dim, work: wd, h40: wd * 8, h36: Math.round(wd * 7.2 * 10) / 10 });
      totalDays += wd;
    }
    return { rows, totalDays, totalH40: totalDays * 8, totalH36: Math.round(totalDays * 7.2 * 10) / 10 };
  }, []);

  const fmt = (n: number) => n.toLocaleString('ru-RU');

  const indicators = [
    { name: t('ref.mrp'), value: `${fmt(MRP)} ₸` },
    { name: t('ref.mzp'), value: `${fmt(MZP)} ₸` },
    { name: t('ref.baseRate'), value: `${BASE_RATE}%` },
    { name: `7 ${t('ref.mzpShort')} (${t('ref.socCap')})`, value: `${fmt(7 * MZP)} ₸` },
    { name: `30 ${t('ref.mrpShort')} (${t('ref.deduction')})`, value: `${fmt(30 * MRP)} ₸` },
  ];

  const rates = [
    { name: 'ОПВ', desc: t('ref.opv'), value: '10%' },
    { name: 'ОПВР', desc: t('ref.opvr'), value: '3,5%' },
    { name: 'СО', desc: t('ref.so'), value: '5%' },
    { name: 'СН', desc: t('ref.sn'), value: '6%' },
    { name: 'ОСМС', desc: t('ref.oosms'), value: '3%' },
    { name: 'ВОСМС', desc: t('ref.vosms'), value: '2%' },
    { name: 'ИПН', desc: t('ref.ipn'), value: '10%' },
    { name: 'НДС', desc: t('ref.nds'), value: '16%' },
    { name: t('ref.simplified'), desc: t('ref.simplifiedDesc'), value: '4%' },
  ];

  const holidays = Object.entries(OFF_2026).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('ref.title')} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> {t('ref.title')} 2026</h1>
            <p className="text-sm text-gray-500 mt-1">{t('ref.subtitle')}</p>
          </div>

          {/* Табы */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {([['indicators', t('ref.tabIndicators')], ['calendar', t('ref.tabCalendar')], ['holidays', t('ref.tabHolidays')]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === k ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{l}</button>
            ))}
          </div>

          {tab === 'indicators' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">{t('ref.keyIndicators')}</h3></div>
                {indicators.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{r.name}</span>
                    <span className="text-sm font-bold text-gray-900">{r.value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">{t('ref.rates')}</h3></div>
                {rates.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 gap-3">
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-900">{r.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{r.desc}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 flex-shrink-0">{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === 'calendar' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">{t('ref.prodCalendar')} — {t('ref.fiveDay')}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                      <th className="px-4 py-2 font-medium">{t('ref.month')}</th>
                      <th className="px-2 py-2 font-medium text-center">{t('ref.calDays')}</th>
                      <th className="px-2 py-2 font-medium text-center">{t('ref.workDays')}</th>
                      <th className="px-2 py-2 font-medium text-center">40 {t('ref.hours')}</th>
                      <th className="px-4 py-2 font-medium text-center">36 {t('ref.hours')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prod.rows.map(r => (
                      <tr key={r.m} className={`border-b border-gray-50 last:border-0 ${r.m === new Date().getMonth() ? 'bg-blue-50/50' : ''}`}>
                        <td className="px-4 py-2 text-gray-700">{t('month.' + r.m)}</td>
                        <td className="px-2 py-2 text-center text-gray-400">{r.cal}</td>
                        <td className="px-2 py-2 text-center font-semibold text-gray-900">{r.work}</td>
                        <td className="px-2 py-2 text-center text-gray-600">{r.h40}</td>
                        <td className="px-4 py-2 text-center text-gray-600">{r.h36}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-2.5 text-gray-900">2026</td>
                      <td className="px-2 py-2.5 text-center text-gray-500">365</td>
                      <td className="px-2 py-2.5 text-center text-gray-900">{prod.totalDays}</td>
                      <td className="px-2 py-2.5 text-center text-gray-900">{prod.totalH40}</td>
                      <td className="px-4 py-2.5 text-center text-gray-900">{fmt(prod.totalH36)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <p className="px-4 py-3 text-[11px] text-gray-400 border-t border-gray-50">{t('ref.sixDayNote')}</p>
            </div>
          )}

          {tab === 'holidays' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
              <div className="px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">{t('ref.holidays2026')}</h3></div>
              {holidays.map(([iso, name]) => {
                const d = new Date(iso);
                const isTransfer = name.startsWith('Перенос');
                return (
                  <div key={iso} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                    <span className={`text-sm ${isTransfer ? 'text-gray-400' : 'text-gray-700'}`}>{name}</span>
                    <span className={`text-sm font-semibold whitespace-nowrap ${isTransfer ? 'text-gray-400' : 'text-red-500'}`}>
                      {d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">{t('ref.note')}</p>
          </div>
        </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
