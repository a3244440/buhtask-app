'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Check, X, Calculator, Copy, FileSpreadsheet, ArrowLeft, AlertTriangle, TrendingUp, Home } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface Tx { date: string; amount: number; description: string; counterparty?: string; purpose?: string; included: boolean; reason?: string; knp?: string; }

export default function Income910Page() {
  const { t } = useI18n();
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dashHref, setDashHref] = useState('/dashboard/client');
  // ЭСФ
  const [esfRows, setEsfRows] = useState<any[] | null>(null);
  const [esfLoading, setEsfLoading] = useState(false);
  const [esfError, setEsfError] = useState('');
  const esfFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        // не авторизован — отправляем на регистрацию с возвратом сюда
        router.replace('/auth?redirect=/income-910');
      } else {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
        setDashHref(p?.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client');
        setAuthChecking(false);
      }
    });
  }, []);

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

  const processEsf = async (file: File | undefined | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) { setEsfError(t('inc910.uploadHint')); return; }
    setEsfLoading(true); setEsfError(''); setEsfRows(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/esf-check', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) setEsfError(data.error);
      else if (!data.rows || data.rows.length === 0) setEsfError(t('inc910.esfNoData'));
      else setEsfRows(data.rows);
    } catch { setEsfError(t('inc910.esfNoData')); }
    finally { setEsfLoading(false); if (esfFileRef.current) esfFileRef.current.value = ''; }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  };

  const toggle = (i: number) => setTxs(prev => prev ? prev.map((t, idx) => idx === i ? { ...t, included: !t.included } : t) : prev);

  const incomeTotal = txs ? txs.filter(t => t.included).reduce((s, t) => s + t.amount, 0) : 0;
  const excludedTotal = txs ? txs.filter(t => !t.included).reduce((s, t) => s + t.amount, 0) : 0;
  const includedCount = txs ? txs.filter(t => t.included).length : 0;

  // ЭСФ итоги
  const esfTotal = esfRows ? esfRows.filter(e => e.included).reduce((s, e) => s + e.amount, 0) : 0;
  const esfExcluded = esfRows ? esfRows.filter(e => !e.included).reduce((s, e) => s + e.amount, 0) : 0;
  const esfDiff = incomeTotal - esfTotal; // банк минус ЭСФ

  // ЭСФ по компаниям (только включённые)
  const esfByCompany = (() => {
    if (!esfRows) return [] as { name: string; sum: number; count: number }[];
    const map: Record<string, { sum: number; count: number }> = {};
    esfRows.filter(e => e.included).forEach(e => {
      const n = (e.counterparty || '—').trim();
      if (!map[n]) map[n] = { sum: 0, count: 0 };
      map[n].sum += e.amount; map[n].count += 1;
    });
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.sum - a.sum);
  })();

  // Компании из ЭСФ, которых нет среди контрагентов банка (по совпадению имени)
  const esfNotInBank = (() => {
    if (!esfRows || !txs) return [] as { name: string; sum: number }[];
    const bankNames = txs.filter(t => t.included).map(t => (t.counterparty || '').toLowerCase());
    const norm = (s: string) => s.toLowerCase().replace(/[«»"'тоо|ип|ао|тов|товарищество|с ограниченной ответственностью]/g, '').replace(/\s+/g, ' ').trim();
    return esfByCompany.filter(c => {
      const cn = norm(c.name);
      if (!cn) return false;
      // есть ли в банке контрагент, чьё имя содержит/пересекается
      return !bankNames.some(bn => { const b = norm(bn); return b && (b.includes(cn) || cn.includes(b)); });
    }).map(c => ({ name: c.name, sum: c.sum }));
  })();

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

  if (authChecking) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('inc910.title')} />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
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
            <div className="grid lg:grid-cols-2 gap-5">
              {/* ===== ЛЕВАЯ КОЛОНКА: БАНК ===== */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> {t('inc910.byBank')}</p>
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
                <p className="text-xs text-gray-400 text-center mb-4">{t('inc910.exportNote')}</p>

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
                            <td className="px-4 py-2.5"><span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold text-xs">{g.knp}</span></td>
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
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {txs.map((tx, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 ${!tx.included ? 'opacity-50' : ''}`}>
                      <button onClick={() => toggle(i)} className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.included ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
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
                      <p className={`text-sm font-semibold flex-shrink-0 ${tx.included ? 'text-emerald-600' : 'text-gray-400 line-through'}`}>+{Math.round(tx.amount).toLocaleString('ru-RU')} ₸</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== ПРАВАЯ КОЛОНКА: ЭСФ ===== */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-indigo-600" /> {t('inc910.byEsf')}</p>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs text-gray-500 mb-4">{t('inc910.esfDesc')}</p>

                  {!esfRows ? (
                    <>
                      {esfLoading ? (
                        <div className="py-6 text-center"><Loader2 className="w-7 h-7 text-indigo-600 animate-spin mx-auto" /></div>
                      ) : (
                        <button onClick={() => esfFileRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                          <Upload className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700">{t('inc910.esfUpload')}</p>
                        </button>
                      )}
                      <input ref={esfFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => processEsf(e.target.files?.[0])} className="hidden" />
                      {esfError && <p className="text-sm text-red-500 mt-2 text-center">{esfError}</p>}
                    </>
                  ) : (
                    <>
                      {/* Сравнение банк ↔ ЭСФ */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                          <p className="text-[11px] text-gray-500">{t('inc910.byBank')}</p>
                          <p className="text-lg font-bold text-emerald-600">{Math.round(incomeTotal).toLocaleString('ru-RU')} ₸</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                          <p className="text-[11px] text-gray-500">{t('inc910.byEsf')}</p>
                          <p className="text-lg font-bold text-indigo-600">{Math.round(esfTotal).toLocaleString('ru-RU')} ₸</p>
                        </div>
                      </div>
                      <div className={`rounded-xl p-3 mb-3 text-center ${Math.abs(esfDiff) < 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {Math.abs(esfDiff) < 1 ? (
                          <p className="text-sm font-semibold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> {t('inc910.esfMatch')}</p>
                        ) : (
                          <p className="text-sm font-semibold">{t('inc910.esfDiff')}: {Math.abs(Math.round(esfDiff)).toLocaleString('ru-RU')} ₸</p>
                        )}
                      </div>
                      {esfExcluded > 0 && (
                        <p className="text-xs text-gray-400 mb-3">{t('inc910.esfExcludedNote')}: {Math.round(esfExcluded).toLocaleString('ru-RU')} ₸</p>
                      )}

                      {/* Разбивка ЭСФ по компаниям */}
                      {esfByCompany.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
                          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                            <h4 className="text-xs font-semibold text-gray-700">{t('inc910.esfByCompany')}</h4>
                          </div>
                          <table className="w-full text-sm">
                            <tbody>
                              {esfByCompany.map((c, i) => (
                                <tr key={i} className="border-b border-gray-50 last:border-0">
                                  <td className="px-3 py-2 text-gray-700 text-xs">{c.name}</td>
                                  <td className="px-2 py-2 text-center text-gray-400 text-[11px]">{c.count}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-indigo-600 whitespace-nowrap text-xs">{Math.round(c.sum).toLocaleString('ru-RU')} ₸</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Чего нет в банке */}
                      {esfNotInBank.length > 0 && (
                        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 mb-3">
                          <p className="text-xs font-semibold text-amber-700 mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> {t('inc910.esfNotInBank')}</p>
                          {esfNotInBank.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-1">
                              <span className="text-gray-700 truncate pr-2">{c.name}</span>
                              <span className="font-semibold text-amber-700 whitespace-nowrap">{Math.round(c.sum).toLocaleString('ru-RU')} ₸</span>
                            </div>
                          ))}
                          <p className="text-[11px] text-amber-600 mt-1.5">{t('inc910.esfNotInBankHint')}</p>
                        </div>
                      )}

                      {/* Полный список ЭСФ */}
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('inc910.esfAllInvoices')}</p>
                      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                        {esfRows.map((e, i) => (
                          <div key={i} className={`flex items-center gap-2 py-2 ${!e.included ? 'opacity-40' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{e.counterparty || '—'}</p>
                              <p className="text-[11px] text-gray-400">{e.date} · {e.status}</p>
                            </div>
                            <p className={`text-sm font-medium flex-shrink-0 ${e.included ? 'text-gray-700' : 'text-gray-400 line-through'}`}>{Math.round(e.amount).toLocaleString('ru-RU')} ₸</p>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => { setEsfRows(null); setEsfError(''); }} className="w-full text-indigo-600 hover:underline text-xs py-2 mt-2">{t('inc910.esfReset')}</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button onClick={() => { setTxs(null); setError(''); }} className="w-full text-blue-600 hover:underline text-sm py-2 flex items-center justify-center gap-2 mt-5">
              <Upload className="w-4 h-4" /> {t('inc910.reset')}
            </button>
          </>
        )}
      </main>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
