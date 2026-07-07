'use client';
import { logToolUsage } from '@/lib/logTool';
import { useState, useMemo, useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';

// Пеня (НК РК 2026, ст. 121): недоимка × 1.25 × базовая ставка / 100 / 365 × дни
// Базовая ставка НБ РК: 18.0% (редактируемая — может меняться)

export default function PenaltyCalculatorPage() {
  useEffect(() => { logToolUsage('Пеня по налогам'); }, []);
  const { t } = useI18n();
  const [amount, setAmount] = useState(1000000);
  const [baseRate, setBaseRate] = useState(18);
  const [dateFrom, setDateFrom] = useState(''); // срок уплаты (дедлайн)
  const [dateTo, setDateTo] = useState('');     // дата фактической оплаты

  const r = useMemo(() => {
    let days = 0;
    if (dateFrom && dateTo) {
      const d1 = new Date(dateFrom), d2 = new Date(dateTo);
      // пеня со дня, следующего за сроком уплаты, включая день оплаты
      days = Math.max(0, Math.round((d2.getTime() - d1.getTime()) / 86400000));
    }
    const perDay = amount * 1.25 * (baseRate / 100) / 365;
    const total = Math.round(perDay * days);
    return { days, perDay: Math.round(perDay * 100) / 100, total };
  }, [amount, baseRate, dateFrom, dateTo]);

  const fmt = (n: number) => n.toLocaleString('ru-RU');
  const inp = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 bg-white';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('pen.title')} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> {t('pen.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('pen.subtitle')}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('pen.amount')}</label>
              <input type="number" value={amount} min={0} onChange={e => setAmount(Math.max(0, Number(e.target.value) || 0))} className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('pen.dateFrom')}</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('pen.dateTo')}</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inp} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('pen.baseRate')} (%)</label>
              <input type="number" value={baseRate} min={0} step={0.25} onChange={e => setBaseRate(Math.max(0, Number(e.target.value) || 0))} className={inp} />
              <p className="text-[11px] text-gray-400 mt-1">{t('pen.baseRateNote')}</p>
            </div>
          </div>

          {/* Результат */}
          <div className="space-y-3 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400">{t('pen.days')}</p>
                <p className="text-lg font-bold text-gray-900">{r.days}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">{t('pen.perDay')}</p>
                <p className="text-lg font-bold text-gray-900">{fmt(r.perDay)} ₸</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('pen.total')}</p>
                <p className="text-[11px] text-amber-100">{t('pen.formula')}</p>
              </div>
              <p className="text-2xl font-extrabold">{fmt(r.total)} ₸</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">{t('pen.note')}</p>
          </div>
        </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
