'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Check, X, Calculator, Copy, FileSpreadsheet, ArrowLeft, AlertTriangle, TrendingUp } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import { useI18n } from '@/lib/i18n';

interface Tx { date: string; amount: number; description: string; counterparty?: string; purpose?: string; included: boolean; reason?: string; knp?: string; }

export default function Income910Page() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File | undefined | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setError(t('inc910.uploadHint'));
      return;
    }
    setLoading(true); setError(''); setTxs(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/income-910', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else if (!data.transactions || data.transactions.length === 0) { setError(t('inc910.noData')); }
      else { setTxs(data.transactions); }
    } catch {
      setError(t('inc910.noData'));
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => processFile(e.target.files?.[0]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const toggle = (i: number) => setTxs(prev => prev ? prev.map((t, idx) => idx === i ? { ...t, included: !t.included } : t) : prev);

  const incomeTotal = txs ? txs.filter(t => t.included).reduce((s, t) => s + t.amount, 0) : 0;
  const excludedTotal = txs ? txs.filter(t => !t.included).reduce((s, t) => s + t.amount, 0) : 0;
  const includedCount = txs ? txs.filter(t => t.included).length : 0;

  // Разбивка дохода по КНП (только включённые)
  const byKnp = (() => {
    if (!txs) return [] as { knp: string; sum: number; count: number }[];
    const map: Record<string, { sum: number; count: number }> = {};
    txs.filter(t => t.included).forEach(t => {
      const k = t.knp || '—';
      if (!map[k]) map[k] = { sum: 0, count: 0 };
      map[k].sum += t.amount; map[k].count += 1;
    });
    return Object.entries(map).map(([knp, v]) => ({ knp, ...v })).sort((a, b) => b.sum - a.sum);
  })();

  const copySum = () => {
    navigator.clipboard.writeText(String(Math.round(incomeTotal)));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title={t('inc910.title')} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
          <ArrowLeft className="w-4 h-4" /> {t('btn.back')}
        </button>

        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-600" /> {t('inc910.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('inc910.subtitle')}</p>
        </div>

        {!txs && (
          <>
            {/* Загрузка */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
              {loading ? (
                <div className="py-10 text-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t('inc910.processing')}</p>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`w-full border-2 border-dashed rounded-2xl py-10 transition-colors ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-300'}`} />
                  <p className="text-sm font-semibold text-gray-700">{dragOver ? t('inc910.dropHere') : t('inc910.upload')}</p>
                  <p className="text-xs text-gray-400 mt-1 px-6">{t('inc910.uploadHint')}</p>
                </button>
              )}
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              {error && <p className="text-sm text-red-500 mt-3 text-center">{error}</p>}
            </div>

            {/* Как работает */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 text-sm mb-3">{t('inc910.howTitle')}</h3>
              <div className="space-y-2.5">
                {[t('inc910.how1'), t('inc910.how2'), t('inc910.how3')].map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    {h}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {txs && (
          <>
            {/* Итоги */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-xs text-gray-500 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> {t('inc910.incomeTotal')}</p>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">{Math.round(incomeTotal).toLocaleString('ru-RU')} ₸</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{includedCount} {t('inc910.counted')}</p>
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-4">
                <p className="text-xs text-gray-500">{t('inc910.excludedTotal')}</p>
                <p className="text-2xl font-extrabold text-gray-400 mt-1">{Math.round(excludedTotal).toLocaleString('ru-RU')} ₸</p>
              </div>
            </div>

            <button onClick={copySum} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mb-2">
              {copied ? <><Check className="w-4 h-4" /> {t('inc910.copied')}</> : <><Copy className="w-4 h-4" /> {t('inc910.copySum')}: {Math.round(incomeTotal).toLocaleString('ru-RU')} ₸</>}
            </button>
            <p className="text-xs text-gray-400 text-center mb-2">{t('inc910.exportNote')}</p>
            <p className="text-xs text-gray-400 text-center mb-4">{t('inc910.toggleHint')}</p>

            {/* Разбивка по КНП */}
            {byKnp.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">{t('inc910.byKnp')}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                      <th className="px-4 py-2 font-medium">{t('inc910.knpCol')}</th>
                      <th className="px-2 py-2 font-medium">{t('inc910.knpName')}</th>
                      <th className="px-2 py-2 font-medium text-center">{t('inc910.opsCol')}</th>
                      <th className="px-4 py-2 font-medium text-right">{t('inc910.sumCol')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byKnp.map(g => (
                      <tr key={g.knp} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-xs">{g.knp}</span>
                        </td>
                        <td className="px-2 py-2.5 text-gray-600 text-xs">{t('knp.' + g.knp) !== 'knp.' + g.knp ? t('knp.' + g.knp) : '—'}</td>
                        <td className="px-2 py-2.5 text-center text-gray-400 text-xs">{g.count}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 whitespace-nowrap">{Math.round(g.sum).toLocaleString('ru-RU')} ₸</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-bold">
                      <td className="px-4 py-2.5 text-gray-900" colSpan={2}>{t('inc910.incomeTotal')}</td>
                      <td className="px-2 py-2.5 text-center text-gray-500 text-xs">{includedCount}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 whitespace-nowrap">{Math.round(incomeTotal).toLocaleString('ru-RU')} ₸</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Список операций */}
            <p className="text-xs font-semibold text-gray-500 mb-2 px-1">{t('inc910.allOps')}</p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 mb-4">
              {txs.map((tx, i) => (
                <div key={i} className={`flex items-center gap-3 px-4 py-3 ${!tx.included ? 'opacity-50' : ''}`}>
                  <button onClick={() => toggle(i)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.included ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                    {tx.included ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {tx.knp && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium flex-shrink-0">КНП {tx.knp}</span>}
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.counterparty || tx.description}</p>
                      {(tx.reason === 'unclear' || tx.reason === 'unknown_knp') && tx.included && (
                        <span title={t('inc910.check')} className="flex-shrink-0"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /></span>
                      )}
                    </div>
                    {tx.purpose && <p className="text-xs text-gray-500 truncate">{tx.purpose}</p>}
                    <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <p className={`text-sm font-semibold flex-shrink-0 ${tx.included ? 'text-emerald-600' : 'text-gray-400 line-through'}`}>
                    +{Math.round(tx.amount).toLocaleString('ru-RU')} ₸
                  </p>
                </div>
              ))}
            </div>

            <button onClick={() => { setTxs(null); setError(''); }} className="w-full text-blue-600 hover:underline text-sm py-2 flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> {t('inc910.reset')}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
