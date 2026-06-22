'use client';
import { useState, useMemo } from 'react';
import { Calculator, Info, ArrowRightLeft } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

// Параметры РК 2026
const MRP = 4325;
const MZP = 85000;
const VYCHET = 30 * MRP; // базовый вычет 30 МРП = 129 750

// Ставки 2026
const RATE = {
  opv: 0.10,    // ОПВ работник
  vosms: 0.02,  // ВОСМС работник
  ipn: 0.10,    // ИПН
  opvr: 0.035,  // ОПВР работодатель
  so: 0.05,     // СО работодатель
  sn: 0.06,     // СН работодатель
  oosms: 0.03,  // ОСМС работодатель
};

function calcFromGross(gross: number, opts: { disabled: boolean; manyChildren: boolean; pensioner: boolean }) {
  // Лимиты
  const opvBase = Math.min(gross, 50 * MZP);
  const vosmsBase = Math.min(gross, 20 * MZP);
  const oosmsBase = Math.min(gross, 40 * MZP);
  const soBase = Math.min(gross, 7 * MZP);

  // Удержания работника
  const opv = opts.pensioner ? 0 : Math.round(opvBase * RATE.opv);
  const vosms = opts.disabled ? 0 : Math.round(vosmsBase * RATE.vosms);

  // ИПН: база = доход - ОПВ - ВОСМС - вычет 30 МРП
  let ipnBase = gross - opv - vosms - VYCHET;
  if (ipnBase < 0) ipnBase = 0;
  let ipn = Math.round(ipnBase * RATE.ipn);
  if (opts.disabled || opts.manyChildren) ipn = 0; // льготы: освобождение от ИПН

  const net = gross - opv - vosms - ipn;

  // Налоги работодателя (сверх оклада)
  const opvr = Math.round(Math.min(gross, 50 * MZP) * RATE.opvr);
  const so = Math.round(soBase * RATE.so);
  const sn = Math.round(soBase * RATE.sn);
  const oosms = Math.round(oosmsBase * RATE.oosms);
  const employerTotal = opvr + so + sn + oosms;

  return { gross, opv, vosms, ipn, net, opvr, so, sn, oosms, employerTotal, totalCost: gross + employerTotal };
}

// Обратный расчёт: от net к gross (бинарный поиск)
function calcFromNet(net: number, opts: any) {
  let lo = net, hi = net * 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const r = calcFromGross(mid, opts);
    if (r.net < net) lo = mid; else hi = mid;
  }
  return calcFromGross(Math.round(hi), opts);
}

export default function SalaryCalculatorPage() {
  const [mode, setMode] = useState<'gross' | 'net'>('gross');
  const [showHint, setShowHint] = useState(false);
  const [amount, setAmount] = useState('300000');
  const [disabled, setDisabled] = useState(false);
  const [manyChildren, setManyChildren] = useState(false);
  const [pensioner, setPensioner] = useState(false);

  const result = useMemo(() => {
    const val = parseInt(amount) || 0;
    if (val <= 0) return null;
    const opts = { disabled, manyChildren, pensioner };
    return mode === 'gross' ? calcFromGross(val, opts) : calcFromNet(val, opts);
  }, [amount, mode, disabled, manyChildren, pensioner]);

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₸';
  const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-semibold bg-white";

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title="Калькулятор зарплаты" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-600" /> Калькулятор зарплаты 2026</h1>
          <p className="text-sm text-gray-500">Расчёт налогов и удержаний по ставкам Казахстана 2026 года</p>
        </div>

        {/* Input */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-700">Метод расчёта</span>
            <div className="relative">
              <button onClick={() => setShowHint(v => !v)} className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 text-xs font-bold flex items-center justify-center hover:bg-amber-200">?</button>
              {showHint && (
                <div className="absolute left-0 top-7 z-10 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-700">Метод расчёта налогов с зарплаты</span>
                    <button onClick={() => setShowHint(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <p className="text-gray-600 mb-1"><b className="text-gray-800">Прямой</b> — расчёт от оклада, указанного в трудовом договоре (gross).</p>
                  <p className="text-gray-600"><b className="text-gray-800">Обратный</b> — расчёт от суммы, полученной «на руки» (net).</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 mb-5">
            <button onClick={() => setMode('gross')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${mode === 'gross' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
              Прямой
            </button>
            <button onClick={() => setMode('net')} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${mode === 'net' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}>
              Обратный
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            {mode === 'gross' ? 'Оклад до налогов (начислено)' : 'Сумма на руки'}
          </label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="300000" className={inp} />

          {/* Options */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500">Льготы (опционально):</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={disabled} onChange={e => setDisabled(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Инвалид I, II, III группы (освобождение от ИПН и ВОСМС)</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={manyChildren} onChange={e => setManyChildren(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Многодетная мать (4+ детей) — освобождение от ИПН</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={pensioner} onChange={e => setPensioner(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">Пенсионер (без ОПВ)</span>
            </label>
          </div>
        </div>

        {result && (
          <>
            {/* Result summary */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-sm p-6 mb-5 text-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-100 mb-1">Оклад (gross)</p>
                  <p className="text-2xl font-extrabold">{fmt(result.gross)}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-100 mb-1">На руки (net)</p>
                  <p className="text-2xl font-extrabold">{fmt(result.net)}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs text-blue-100">Общие расходы работодателя</p>
                <p className="text-xl font-bold">{fmt(result.totalCost)}</p>
              </div>
            </div>

            {/* Employee deductions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <h3 className="font-semibold text-gray-900 mb-4">Удержания с работника</h3>
              <div className="space-y-3">
                {[
                  { label: 'ОПВ (пенсионные взносы)', value: result.opv, rate: '10%' },
                  { label: 'ВОСМС (медстрахование)', value: result.vosms, rate: '2%' },
                  { label: 'ИПН (подоходный налог)', value: result.ipn, rate: '10%' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{row.label} <span className="text-gray-400">({row.rate})</span></span>
                    <span className="font-semibold text-gray-900">−{fmt(row.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Итого удержано</span>
                  <span className="font-bold text-red-600">−{fmt(result.opv + result.vosms + result.ipn)}</span>
                </div>
              </div>
            </div>

            {/* Employer taxes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              <h3 className="font-semibold text-gray-900 mb-4">Налоги работодателя (сверх оклада)</h3>
              <div className="space-y-3">
                {[
                  { label: 'ОПВР (пенсионные работодателя)', value: result.opvr, rate: '3.5%' },
                  { label: 'СО (социальные отчисления)', value: result.so, rate: '5%' },
                  { label: 'СН (социальный налог)', value: result.sn, rate: '6%' },
                  { label: 'ОСМС (медстрахование работодателя)', value: result.oosms, rate: '3%' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{row.label} <span className="text-gray-400">({row.rate})</span></span>
                    <span className="font-semibold text-gray-900">{fmt(row.value)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-900">Итого работодатель</span>
                  <span className="font-bold text-blue-600">{fmt(result.employerTotal)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Parameters note */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="mb-1">Параметры 2026: МРП = {fmt(MRP)}, МЗП = {fmt(MZP)}, базовый вычет = 30 МРП ({fmt(VYCHET)}).</p>
            <p>Расчёт справочный, базовый сценарий. Дополнительные вычеты (ипотека, обучение) и прогрессивная ставка ИПН 15% для высоких доходов не учитываются. Уточняйте у бухгалтера.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
