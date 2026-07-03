'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Scale, Printer, Plus, X, Info, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface Row { date: string; doc: string; debit: number; credit: number; }

// Сокращение длинных организационно-правовых форм
const shortName = (s: string) => (s || '—')
  .replace(/товарищество с ограниченной ответственностью/gi, 'ТОО')
  .replace(/индивидуальный предприниматель/gi, 'ИП')
  .replace(/некоммерческое акционерное общество/gi, 'НАО')
  .replace(/акционерное общество/gi, 'АО')
  .replace(/государственное учреждение/gi, 'ГУ')
  .replace(/общественное объединение/gi, 'ОО')
  .replace(/производственный кооператив/gi, 'ПК')
  .replace(/крестьянское( \(фермерское\))? хозяйство/gi, 'КХ')
  .replace(/\s+/g, ' ').trim();

const norm = (s: string) => (s || '').toLowerCase()
  .replace(/товарищество с ограниченной ответственностью|индивидуальный предприниматель|акционерное общество|тоо|ип|ао|нао|"|«|»|'/g, '')
  .replace(/\s+/g, ' ').trim();

export default function ReconciliationActPage() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [cpKey, setCpKey] = useState(''); // dir:<id> | file:<key>
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [opening, setOpening] = useState(0);
  const [docs, setDocs] = useState<any[]>([]);
  const [payments, setPayments] = useState<{ date: string; amount: number; note: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Файлы
  const [bankTxs, setBankTxs] = useState<any[] | null>(null);
  const [esfRows, setEsfRows] = useState<any[] | null>(null);
  const [bankLoading, setBankLoading] = useState(false);
  const [esfLoading, setEsfLoading] = useState(false);
  const [fileErr, setFileErr] = useState('');
  const bankRef = useRef<HTMLInputElement>(null);
  const esfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const [{ data: cs }, { data: cps }] = await Promise.all([
        supabase.from('companies').select('id, name, bin').eq('owner_id', data.user.id).order('name'),
        supabase.from('counterparties').select('id, name, bin').eq('owner_id', data.user.id).order('name'),
      ]);
      setCompanies(cs || []); setCounterparties(cps || []);
      if (cs && cs.length === 1) setCompanyId(cs[0].id);
    });
  }, []);

  const processBank = async (file?: File | null) => {
    if (!file) return;
    setBankLoading(true); setFileErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/income-910', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) setFileErr(data.error);
      else setBankTxs(data.transactions || []);
    } catch { setFileErr('Ошибка обработки выписки'); }
    finally { setBankLoading(false); if (bankRef.current) bankRef.current.value = ''; }
  };

  const processEsf = async (file?: File | null) => {
    if (!file) return;
    setEsfLoading(true); setFileErr('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/esf-check', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) setFileErr(data.error);
      else setEsfRows(data.rows || []);
    } catch { setFileErr('Ошибка обработки ЭСФ'); }
    finally { setEsfLoading(false); if (esfRef.current) esfRef.current.value = ''; }
  };

  // Контрагенты, найденные в файлах (по БИН, иначе по имени)
  const fileCps = useMemo(() => {
    const map: Record<string, { key: string; name: string; bin: string }> = {};
    (esfRows || []).filter(e => e.included).forEach(e => {
      const key = e.bin && e.bin.length >= 5 ? e.bin : norm(e.counterparty);
      if (!key) return;
      if (!map[key]) map[key] = { key, name: e.counterparty || '', bin: e.bin || '' };
    });
    (bankTxs || []).filter(tx => tx.included).forEach(tx => {
      const key = tx.bin && tx.bin.length >= 5 ? tx.bin : norm(tx.counterparty);
      if (!key) return;
      if (!map[key]) map[key] = { key, name: tx.counterparty || '', bin: tx.bin || '' };
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [esfRows, bankTxs]);

  // Выбранный контрагент (имя + бин + сопоставитель)
  const selCp = useMemo(() => {
    if (cpKey.startsWith('dir:')) {
      const c = counterparties.find(x => x.id === cpKey.slice(4));
      return c ? { name: c.name, bin: (c.bin || '').replace(/\D/g, ''), id: c.id } : null;
    }
    if (cpKey.startsWith('file:')) {
      const c = fileCps.find(x => x.key === cpKey.slice(5));
      return c ? { name: c.name, bin: (c.bin || '').replace(/\D/g, ''), id: null } : null;
    }
    return null;
  }, [cpKey, counterparties, fileCps]);

  const matchCp = (name: string, bin: string) => {
    if (!selCp) return false;
    const b = (bin || '').replace(/\D/g, '');
    if (selCp.bin && b) return selCp.bin === b;
    const n1 = norm(selCp.name), n2 = norm(name);
    return !!n1 && !!n2 && (n1.includes(n2) || n2.includes(n1));
  };

  const inPeriod = (d: string) => d >= dateFrom && d <= dateTo;

  const buildAct = async () => {
    setDocs([]);
    if (selCp?.id && companyId) {
      const { data } = await supabase.from('documents')
        .select('id, type, number, doc_date, total')
        .eq('company_id', companyId).eq('counterparty_id', selCp.id)
        .eq('type', 'avr')
        .gte('doc_date', dateFrom).lte('doc_date', dateTo)
        .order('doc_date');
      setDocs(data || []);
    }
    setLoaded(true);
  };

  const rows: Row[] = useMemo(() => {
    const r: Row[] = [];
    // ДЕБЕТ: ЭСФ приоритетнее АВР (чтобы не задвоить)
    const esfMatched = (esfRows || []).filter(e => e.included && matchCp(e.counterparty, e.bin) && inPeriod(e.date || e.turnoverDate || ''));
    if (esfMatched.length > 0) {
      esfMatched.forEach(e => r.push({ date: e.date || e.turnoverDate, doc: `${t('act.sale')} №${e.number || '—'}`, debit: e.amount, credit: 0 }));
    } else {
      docs.forEach(d => r.push({ date: d.doc_date, doc: `${t('act.sale')} (${t('act.avr')}) №${d.number || '—'}`, debit: Number(d.total) || 0, credit: 0 }));
    }
    // КРЕДИТ: оплаты из банка + ручные
    (bankTxs || []).filter(tx => tx.included && matchCp(tx.counterparty, tx.bin) && inPeriod(tx.date?.slice(0, 10) || '')).forEach(tx => {
      r.push({ date: tx.date?.slice(0, 10), doc: t('act.paymentIn') + (tx.knp ? ` (КНП ${tx.knp})` : ''), debit: 0, credit: tx.amount });
    });
    payments.filter(p => p.amount > 0).forEach(p => r.push({ date: p.date, doc: p.note || t('act.payment'), debit: 0, credit: p.amount }));
    return r.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [docs, payments, esfRows, bankTxs, selCp, dateFrom, dateTo, t]);

  const totals = useMemo(() => {
    const debit = rows.reduce((s, r) => s + r.debit, 0);
    const credit = rows.reduce((s, r) => s + r.credit, 0);
    return { debit, credit, closing: opening + debit - credit };
  }, [rows, opening]);

  const company = companies.find(c => c.id === companyId);
  const myName = shortName(company?.name || '—');
  const cpName = shortName(selCp?.name || '—');
  const fmt = (n: number) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('ru-RU') : '';
  const inp = 'w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="print:hidden"><ToolsSidebar /></div>
      <div className="lg:pl-60 print:pl-0">
        <div className="print:hidden"><DashboardHeader title={t('act.title')} /></div>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 print:py-2 print:max-w-none">
          <div className="mb-6 print:hidden">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Scale className="w-5 h-5 text-blue-600" /> {t('act.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('act.subtitle')}</p>
          </div>

          {/* Загрузка файлов */}
          <div className="grid sm:grid-cols-2 gap-3 mb-4 print:hidden">
            <button onClick={() => bankRef.current?.click()} disabled={bankLoading}
              className={`border-2 border-dashed rounded-2xl p-4 text-center transition-colors ${bankTxs ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white hover:border-emerald-400'}`}>
              {bankLoading ? <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto" /> : (
                <>
                  <Upload className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-gray-800">{t('act.uploadBank')}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{bankTxs ? `✓ ${bankTxs.filter((x: any) => x.included).length} ${t('act.bankOps')}` : 'Excel / CSV'}</p>
                </>
              )}
            </button>
            <button onClick={() => esfRef.current?.click()} disabled={esfLoading}
              className={`border-2 border-dashed rounded-2xl p-4 text-center transition-colors ${esfRows ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-400'}`}>
              {esfLoading ? <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" /> : (
                <>
                  <FileSpreadsheet className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-gray-800">{t('act.uploadEsf')}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{esfRows ? `✓ ${esfRows.filter((x: any) => x.included).length} ${t('act.esfDocs')}` : 'Excel'}</p>
                </>
              )}
            </button>
            <input ref={bankRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => processBank(e.target.files?.[0])} className="hidden" />
            <input ref={esfRef} type="file" accept=".xlsx,.xls,.csv" onChange={e => processEsf(e.target.files?.[0])} className="hidden" />
          </div>
          {fileErr && <p className="text-sm text-red-500 mb-3 print:hidden">{fileErr}</p>}

          {/* Параметры */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4 print:hidden">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.myCompany')}</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
                  <option value="">—</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{shortName(c.name)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.counterparty')}</label>
                <select value={cpKey} onChange={e => setCpKey(e.target.value)} className={inp}>
                  <option value="">—</option>
                  {fileCps.length > 0 && (
                    <optgroup label={t('act.fromFiles')}>
                      {fileCps.map(c => <option key={c.key} value={'file:' + c.key}>{shortName(c.name)}{c.bin ? ` (${c.bin})` : ''}</option>)}
                    </optgroup>
                  )}
                  {counterparties.length > 0 && (
                    <optgroup label={t('act.fromDir')}>
                      {counterparties.map(c => <option key={c.id} value={'dir:' + c.id}>{shortName(c.name)}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.from')}</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.to')}</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inp} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.opening')}</label>
                <input type="number" value={opening} onChange={e => setOpening(Number(e.target.value) || 0)} className={inp} />
              </div>
            </div>
            <button onClick={buildAct} disabled={!cpKey}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-sm font-semibold">
              {t('act.build')}
            </button>
          </div>

          {loaded && (
            <>
              {/* Оплаты вручную */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 print:hidden">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{t('act.payments')}</h3>
                  <button onClick={() => setPayments(p => [...p, { date: dateTo, amount: 0, note: '' }])}
                    className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:underline"><Plus className="w-4 h-4" /> {t('act.addPayment')}</button>
                </div>
                <p className="text-xs text-gray-400 mb-3">{t('act.paymentsHint')}</p>
                {payments.map((p, i) => (
                  <div key={i} className="flex gap-2 mb-2 items-center">
                    <input type="date" value={p.date} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, date: e.target.value } : x))} className="px-2 py-2 text-sm border border-gray-200 rounded-lg w-36" />
                    <input type="number" placeholder="0" value={p.amount || ''} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) || 0 } : x))} className="px-2 py-2 text-sm border border-gray-200 rounded-lg w-32 text-right" />
                    <input type="text" placeholder={t('act.paymentNote')} value={p.note} onChange={e => setPayments(ps => ps.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} className="px-2 py-2 text-sm border border-gray-200 rounded-lg flex-1 min-w-0" />
                    <button onClick={() => setPayments(ps => ps.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>

              {/* Сам акт — двусторонний шаблон 1С */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 print:border-0 print:shadow-none print:rounded-none overflow-x-auto" id="act-print">
                <h2 className="text-center font-bold text-gray-900 mb-1">{t('act.docTitle')}</h2>
                <p className="text-center text-sm text-gray-600 mb-3">
                  {t('act.mutualPeriod')} {fmtDate(dateFrom)} {t('act.po')} {fmtDate(dateTo)}<br />
                  {t('act.between')} {myName} {t('act.and')} {cpName}
                </p>
                <p className="text-xs text-gray-700 mb-4 leading-relaxed">
                  {t('act.weSigned1')} <b>{myName}</b>, {t('act.oneSide')}, {t('act.and')} <b>{cpName}</b>, {t('act.otherSide')}, {t('act.weSigned2')}
                </p>

                <table className="w-full text-xs border border-gray-400 mb-4 min-w-[640px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      <th className="border border-gray-400 px-2 py-1.5 text-left" colSpan={2}>{t('act.recText')}</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-center" colSpan={2}>{t('act.byData')} {myName}, KZT</th>
                      <th className="border border-gray-400 px-2 py-1.5 text-center" colSpan={2}>{t('act.byData')} {cpName}, KZT</th>
                    </tr>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="border border-gray-400 px-2 py-1 text-left w-20">{t('act.colDate')}</th>
                      <th className="border border-gray-400 px-2 py-1 text-left">{t('act.colDoc')}</th>
                      <th className="border border-gray-400 px-2 py-1 text-right">{t('act.debit')}</th>
                      <th className="border border-gray-400 px-2 py-1 text-right">{t('act.credit')}</th>
                      <th className="border border-gray-400 px-2 py-1 text-right">{t('act.debit')}</th>
                      <th className="border border-gray-400 px-2 py-1 text-right">{t('act.credit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-medium">
                      <td className="border border-gray-400 px-2 py-1.5" colSpan={2}>{t('act.openingRow')} {fmtDate(dateFrom)}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{opening > 0 ? fmt(opening) : ''}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{opening < 0 ? fmt(-opening) : ''}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{opening < 0 ? fmt(-opening) : ''}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{opening > 0 ? fmt(opening) : ''}</td>
                    </tr>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-gray-400 px-2 py-1.5 whitespace-nowrap align-top">{fmtDate(r.date)}</td>
                        <td className="border border-gray-400 px-2 py-1.5">{r.doc}</td>
                        <td className="border border-gray-400 px-2 py-1.5 text-right">{r.debit ? fmt(r.debit) : ''}</td>
                        <td className="border border-gray-400 px-2 py-1.5 text-right">{r.credit ? fmt(r.credit) : ''}</td>
                        <td className="border border-gray-400 px-2 py-1.5 text-right">{r.credit ? fmt(r.credit) : ''}</td>
                        <td className="border border-gray-400 px-2 py-1.5 text-right">{r.debit ? fmt(r.debit) : ''}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="border border-gray-400 px-2 py-1.5" colSpan={2}>{t('act.turnover')}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{fmt(totals.debit)}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{fmt(totals.credit)}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{fmt(totals.credit)}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{fmt(totals.debit)}</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-400 px-2 py-1.5" colSpan={2}>{t('act.closingRow')} {fmtDate(dateTo)}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{totals.closing > 0 ? fmt(totals.closing) : ''}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{totals.closing < 0 ? fmt(-totals.closing) : ''}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{totals.closing < 0 ? fmt(-totals.closing) : ''}</td>
                      <td className="border border-gray-400 px-2 py-1.5 text-right">{totals.closing > 0 ? fmt(totals.closing) : ''}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-sm text-gray-700 mb-6">
                  {t('act.byData')} {myName} {t('act.onDate')} {fmtDate(dateTo)}{' '}
                  {totals.closing === 0 ? t('act.balanced')
                    : totals.closing > 0
                      ? `${t('act.debtInFavor')} ${myName}: ${fmt(totals.closing)} KZT`
                      : `${t('act.debtInFavor')} ${cpName}: ${fmt(-totals.closing)} KZT`}
                </p>

                <div className="grid grid-cols-2 gap-8 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold">{t('act.fromSide')} {myName}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('act.binIin')}: {company?.bin || '____________'}</p>
                    <p className="mt-6 text-xs text-gray-600">{t('act.director')} (___________________)</p>
                    <p className="mt-4 text-xs text-gray-500">{t('act.mp')} ______________ {t('act.signWord')}</p>
                  </div>
                  <div>
                    <p className="font-semibold">{t('act.fromSide')} {cpName}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('act.binIin')}: {selCp?.bin || '____________'}</p>
                    <p className="mt-6 text-xs text-gray-600">{t('act.director')} (___________________)</p>
                    <p className="mt-4 text-xs text-gray-500">{t('act.mp')} ______________ {t('act.signWord')}</p>
                  </div>
                </div>
              </div>

              <button onClick={() => window.print()} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 print:hidden">
                <Printer className="w-4 h-4" /> {t('act.print')}
              </button>
            </>
          )}

          {!loaded && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 print:hidden">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 leading-relaxed">{t('act.note')}</p>
            </div>
          )}
        </main>
      </div>
      <div className="print:hidden"><MobileToolsNav /></div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
