'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Check, X, Calculator, Copy, FileSpreadsheet, ArrowLeft, AlertTriangle, TrendingUp, Home } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { supabase } from '@/lib/supabase';
import { activePlan } from '@/lib/plans';
import { useI18n } from '@/lib/i18n';

interface Tx { date: string; amount: number; description: string; counterparty?: string; bin?: string; purpose?: string; included: boolean; reason?: string; knp?: string; }

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
  // Лимиты проверок
  const [userId, setUserId] = useState<string | null>(null);
  const [used, setUsed] = useState(0);
  const [limit, setLimit] = useState(1);
  const [showPaywall, setShowPaywall] = useState(false);
  // Имя файла и история проверок
  const [fileName, setFileName] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [restored, setRestored] = useState(false);

  // Восстановление текущей сессии + история из localStorage
  useEffect(() => {
    try {
      const cur = localStorage.getItem('inc910_current');
      if (cur) {
        const p = JSON.parse(cur);
        if (p.txs) setTxs(p.txs);
        if (p.esfRows) setEsfRows(p.esfRows);
        if (p.fileName) setFileName(p.fileName);
      }
      const h = localStorage.getItem('inc910_history');
      if (h) setHistory(JSON.parse(h));
    } catch {}
    setRestored(true);
  }, []);

  // Сохранение текущей сессии в localStorage
  useEffect(() => {
    if (!restored) return;
    try {
      if (txs) localStorage.setItem('inc910_current', JSON.stringify({ txs, esfRows, fileName }));
      else localStorage.removeItem('inc910_current');
    } catch {}
  }, [txs, esfRows, fileName, restored]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace('/auth?redirect=/income-910');
      } else {
        setUserId(data.user.id);
        const { data: p } = await supabase.from('profiles').select('role, subscription_plan, subscription_until, income910_used').eq('id', data.user.id).maybeSingle();
        setDashHref(p?.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client');
        const plan = activePlan(p?.subscription_plan, p?.subscription_until);
        setLimit(plan === 'free' ? 1 : 100);
        setUsed(p?.income910_used || 0);
        setAuthChecking(false);
      }
    });
  }, []);

  const remaining = Math.max(0, limit - used);

  const processFile = async (file: File | undefined | null) => {
    if (!file) return;
    // Проверка лимита проверок
    if (remaining <= 0) { setShowPaywall(true); return; }
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
      else {
        setTxs(data.transactions);
        setFileName(file.name);
        // Засчитываем проверку
        const newUsed = used + 1;
        setUsed(newUsed);
        if (userId) supabase.from('profiles').update({ income910_used: newUsed }).eq('id', userId).then(() => {});
      }
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

  // Сохранить текущую проверку в историю и начать новую
  const saveAndNew = () => {
    if (txs && txs.length > 0) {
      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        fileName: fileName || '—',
        incomeTotal: Math.round(incomeTotal),
        excludedTotal: Math.round(excludedTotal),
        count: includedCount,
        esfTotal: esfRows ? Math.round(esfTotal) : null,
        esfDiff: esfRows ? Math.round(esfDiff) : null,
      };
      const newHistory = [entry, ...history].slice(0, 50);
      setHistory(newHistory);
      try { localStorage.setItem('inc910_history', JSON.stringify(newHistory)); } catch {}
    }
    setTxs(null); setEsfRows(null); setError(''); setEsfError(''); setFileName('');
    try { localStorage.removeItem('inc910_current'); } catch {}
  };

  const deleteHistory = (id: number) => {
    const nh = history.filter(h => h.id !== id);
    setHistory(nh);
    try { localStorage.setItem('inc910_history', JSON.stringify(nh)); } catch {}
  };

  // Сокращаем длинные организационно-правовые формы до аббревиатур
  const shortName = (s: string) => (s || '—')
    .replace(/товарищество с ограниченной ответственностью/gi, 'ТОО')
    .replace(/индивидуальный предприниматель/gi, 'ИП')
    .replace(/акционерное общество/gi, 'АО')
    .replace(/некоммерческое акционерное общество/gi, 'НАО')
    .replace(/государственное учреждение/gi, 'ГУ')
    .replace(/общественное объединение/gi, 'ОО')
    .replace(/производственный кооператив/gi, 'ПК')
    .replace(/крестьянское( \(фермерское\))? хозяйство/gi, 'КХ')
    .replace(/\s+/g, ' ').trim();

  // Сверка банк ↔ ЭСФ по компаниям (ключ — БИН; если нет БИН, по имени)
  const reconciliation = (() => {
    if (!esfRows) return [] as { key: string; name: string; bin: string; bank: number; esf: number; diff: number }[];
    const norm = (s: string) => (s || '').toLowerCase()
      .replace(/тоо|тов|ип|ао|товарищество с ограниченной ответственностью|индивидуальный предприниматель|«|»|"|'/g, '')
      .replace(/\s+/g, ' ').trim();

    const map: Record<string, { name: string; bin: string; bank: number; esf: number }> = {};

    // ЭСФ (только включённые: доставлен/просмотрен/не просмотрен)
    esfRows.filter(e => e.included).forEach(e => {
      const key = (e.bin && e.bin.length >= 5) ? e.bin : norm(e.counterparty);
      if (!key) return;
      if (!map[key]) map[key] = { name: e.counterparty || '', bin: e.bin || '', bank: 0, esf: 0 };
      map[key].esf += e.amount;
      if (!map[key].name && e.counterparty) map[key].name = e.counterparty;
      if (!map[key].bin && e.bin) map[key].bin = e.bin;
    });

    // Банк (только включённые доходные)
    if (txs) txs.filter(t => t.included).forEach(t => {
      const bin = (t as any).bin || '';
      const key = (bin && bin.length >= 5) ? bin : norm(t.counterparty || '');
      if (!key) return;
      if (!map[key]) map[key] = { name: t.counterparty || '', bin, bank: 0, esf: 0 };
      map[key].bank += t.amount;
      if (!map[key].name && t.counterparty) map[key].name = t.counterparty;
      if (!map[key].bin && bin) map[key].bin = bin;
    });

    return Object.entries(map)
      .map(([key, v]) => ({ key, name: v.name || v.bin || '—', bin: v.bin, bank: v.bank, esf: v.esf, diff: v.bank - v.esf }))
      .sort((a, b) => Math.max(b.bank, b.esf) - Math.max(a.bank, a.esf));
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
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold">
            {t('inc910.checksLeft')}: {remaining} {limit >= 100 ? '/ 100' : ''}
          </div>
        </div>

        {/* Кнопка "Загрузить новую выписку" — когда есть результат */}
        {txs && (
          <button onClick={saveAndNew} className="w-full mb-4 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> {t('inc910.newCheck')}
          </button>
        )}

        {/* История проверок */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-900 text-sm">{t('inc910.history')}</h3>
              <span className="text-xs text-gray-400">({history.length})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-50">
                    <th className="px-4 py-2 font-medium">{t('inc910.histDate')}</th>
                    <th className="px-2 py-2 font-medium">{t('inc910.histFile')}</th>
                    <th className="px-2 py-2 font-medium text-right">{t('inc910.byBank')}</th>
                    <th className="px-2 py-2 font-medium text-right">{t('inc910.byEsf')}</th>
                    <th className="px-2 py-2 font-medium text-center">{t('inc910.opsCol')}</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2.5 text-gray-600 text-xs whitespace-nowrap">{new Date(h.date).toLocaleDateString('ru-RU')} {new Date(h.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="px-2 py-2.5 text-gray-500 text-xs max-w-[120px] truncate" title={h.fileName}>{h.fileName}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-emerald-600 whitespace-nowrap">{h.incomeTotal.toLocaleString('ru-RU')} ₸</td>
                      <td className="px-2 py-2.5 text-right text-indigo-600 whitespace-nowrap text-xs">{h.esfTotal != null ? h.esfTotal.toLocaleString('ru-RU') + ' ₸' : '—'}</td>
                      <td className="px-2 py-2.5 text-center text-gray-400 text-xs">{h.count}</td>
                      <td className="px-2 py-2.5 text-right">
                        <button onClick={() => deleteHistory(h.id)} className="text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Paywall — лимит исчерпан */}
        {showPaywall && (
          <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-6 mb-5">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Calculator className="w-7 h-7 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t('inc910.paywallTitle')}</h2>
              <p className="text-sm text-gray-500 mt-1">{t('inc910.paywallDesc')}</p>
              <p className="text-3xl font-extrabold text-blue-600 mt-3">20 000 ₸</p>
              <p className="text-xs text-gray-400">{t('inc910.paywallPer')}</p>
            </div>

            {/* Kaspi QR */}
            <div className="bg-gray-50 rounded-xl p-4 mb-3 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('inc910.payKaspi')}</p>
              <img src="/images/kaspi-qr.png" alt="Kaspi QR" className="w-full max-w-[220px] rounded-xl mx-auto" />
            </div>

            {/* Реквизиты */}
            <div className="bg-gray-50 rounded-xl p-4 mb-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">{t('inc910.payDetails')}</p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between gap-2"><span className="text-gray-400">Компания</span><span className="font-medium text-right">ТОО "BUHTASK"</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400">БИН</span><span className="font-medium">260540009678</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400">Банк</span><span className="font-medium text-right">АО "Kaspi Bank"</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400">КБе</span><span className="font-medium">17</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400">БИК</span><span className="font-medium">CASPKZKA</span></div>
                <div className="flex justify-between gap-2"><span className="text-gray-400">Счёт (IBAN)</span><span className="font-medium">KZ45722S000054326792</span></div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center mb-3">{t('inc910.payAfter')} <a href="mailto:info@buhtask.kz" className="text-blue-600">info@buhtask.kz</a></p>
            <button onClick={() => setShowPaywall(false)} className="w-full text-gray-400 hover:text-gray-600 text-sm py-2">{t('btn.back')}</button>
          </div>
        )}

        {!txs && !showPaywall && (
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
                          <p className="text-sm font-medium text-gray-900 truncate">{shortName(tx.counterparty) || tx.description}</p>
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

                      {/* Сверка по компаниям (банк ↔ ЭСФ) */}
                      {reconciliation.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden mb-3">
                          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                            <h4 className="text-xs font-semibold text-gray-700">{t('inc910.reconcileTitle')}</h4>
                          </div>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-left text-[10px] text-gray-400 border-b border-gray-50">
                                <th className="px-3 py-1.5 font-medium">{t('inc910.company')}</th>
                                <th className="px-1 py-1.5 font-medium text-right">{t('inc910.byBank')}</th>
                                <th className="px-1 py-1.5 font-medium text-right">{t('inc910.byEsf')}</th>
                                <th className="px-3 py-1.5 font-medium text-right">±</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reconciliation.map((r, i) => {
                                const ok = Math.abs(r.diff) < 1;
                                return (
                                  <tr key={i} className="border-b border-gray-50 last:border-0">
                                    <td className="px-3 py-2 text-gray-700">
                                      <span className="block truncate max-w-[130px]">{shortName(r.name)}</span>
                                      {r.bin && <span className="text-[9px] text-gray-400">{r.bin}</span>}
                                    </td>
                                    <td className="px-1 py-2 text-right text-emerald-600 whitespace-nowrap">{r.bank ? Math.round(r.bank).toLocaleString('ru-RU') : '—'}</td>
                                    <td className="px-1 py-2 text-right text-indigo-600 whitespace-nowrap">{r.esf ? Math.round(r.esf).toLocaleString('ru-RU') : '—'}</td>
                                    <td className={`px-3 py-2 text-right whitespace-nowrap font-semibold ${ok ? 'text-emerald-500' : 'text-amber-600'}`}>
                                      {ok ? '✓' : (r.diff > 0 ? '+' : '') + Math.round(r.diff).toLocaleString('ru-RU')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <p className="text-[10px] text-gray-400 px-3 py-2 border-t border-gray-50">{t('inc910.reconcileHint')}</p>
                        </div>
                      )}

                      {/* Полный список ЭСФ */}
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">{t('inc910.esfAllInvoices')}</p>
                      <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                        {esfRows.map((e, i) => (
                          <div key={i} className={`flex items-center gap-2 py-2 ${!e.included ? 'opacity-40' : ''}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{shortName(e.counterparty)}</p>
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

            <button onClick={saveAndNew} className="w-full text-blue-600 hover:underline text-sm py-2 flex items-center justify-center gap-2 mt-5">
              <Upload className="w-4 h-4" /> {t('inc910.newCheck')}
            </button>
          </>
        )}
      </main>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
