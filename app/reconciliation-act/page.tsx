'use client';
import { useState, useEffect, useMemo } from 'react';
import { Scale, Printer, Plus, X, Info } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { supabase } from '@/lib/supabase';
import { useI18n } from '@/lib/i18n';

interface Row { date: string; doc: string; debit: number; credit: number; }

export default function ReconciliationActPage() {
  const { t } = useI18n();
  const [companies, setCompanies] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [cpId, setCpId] = useState('');
  const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [opening, setOpening] = useState(0); // сальдо на начало (+ долг контрагента нам)
  const [docs, setDocs] = useState<any[]>([]);
  const [payments, setPayments] = useState<{ date: string; amount: number; note: string }[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  const buildAct = async () => {
    if (!companyId || !cpId) return;
    const { data } = await supabase.from('documents')
      .select('id, type, number, doc_date, total')
      .eq('company_id', companyId).eq('counterparty_id', cpId)
      .eq('type', 'avr')
      .gte('doc_date', dateFrom).lte('doc_date', dateTo)
      .order('doc_date');
    setDocs(data || []);
    setLoaded(true);
  };

  const rows: Row[] = useMemo(() => {
    const r: Row[] = [
      ...docs.map(d => ({ date: d.doc_date, doc: `${t('act.avr')} №${d.number || '—'}`, debit: Number(d.total) || 0, credit: 0 })),
      ...payments.filter(p => p.amount > 0).map(p => ({ date: p.date, doc: p.note || t('act.payment'), debit: 0, credit: p.amount })),
    ];
    return r.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [docs, payments, t]);

  const totals = useMemo(() => {
    const debit = rows.reduce((s, r) => s + r.debit, 0);
    const credit = rows.reduce((s, r) => s + r.credit, 0);
    const closing = opening + debit - credit;
    return { debit, credit, closing };
  }, [rows, opening]);

  const company = companies.find(c => c.id === companyId);
  const cp = counterparties.find(c => c.id === cpId);
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

          {/* Параметры */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4 space-y-4 print:hidden">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.myCompany')}</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
                  <option value="">—</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('act.counterparty')}</label>
                <select value={cpId} onChange={e => setCpId(e.target.value)} className={inp}>
                  <option value="">—</option>
                  {counterparties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
            <button onClick={buildAct} disabled={!companyId || !cpId}
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

              {/* Сам акт (печатаемый) */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 print:border-0 print:shadow-none print:rounded-none" id="act-print">
                <h2 className="text-center font-bold text-gray-900 mb-1">{t('act.docTitle')}</h2>
                <p className="text-center text-sm text-gray-600 mb-4">{t('act.between')} {company?.name || '—'} {t('act.and')} {cp?.name || '—'}<br />
                  {t('act.forPeriod')} {fmtDate(dateFrom)} — {fmtDate(dateTo)}</p>

                <table className="w-full text-sm border border-gray-300 mb-4">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-600">
                      <th className="border border-gray-300 px-2 py-1.5 text-left">{t('act.colDate')}</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left">{t('act.colDoc')}</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right">{t('act.colDebit')}</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-right">{t('act.colCredit')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-medium">
                      <td className="border border-gray-300 px-2 py-1.5" colSpan={2}>{t('act.openingRow')} {fmtDate(dateFrom)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{opening > 0 ? fmt(opening) : ''}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{opening < 0 ? fmt(-opening) : ''}</td>
                    </tr>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="border border-gray-300 px-2 py-1.5 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="border border-gray-300 px-2 py-1.5">{r.doc}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right">{r.debit ? fmt(r.debit) : ''}</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-right">{r.credit ? fmt(r.credit) : ''}</td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="border border-gray-300 px-2 py-1.5" colSpan={2}>{t('act.turnover')}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{fmt(totals.debit)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{fmt(totals.credit)}</td>
                    </tr>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border border-gray-300 px-2 py-1.5" colSpan={2}>{t('act.closingRow')} {fmtDate(dateTo)}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{totals.closing > 0 ? fmt(totals.closing) : ''}</td>
                      <td className="border border-gray-300 px-2 py-1.5 text-right">{totals.closing < 0 ? fmt(-totals.closing) : ''}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="text-sm text-gray-700 mb-6">
                  {totals.closing === 0 ? t('act.balanced')
                    : totals.closing > 0
                      ? `${t('act.debtOf')} ${cp?.name || '—'} ${t('act.inFavor')} ${company?.name || '—'}: ${fmt(totals.closing)} ₸`
                      : `${t('act.debtOf')} ${company?.name || '—'} ${t('act.inFavor')} ${cp?.name || '—'}: ${fmt(-totals.closing)} ₸`}
                </p>

                <div className="grid grid-cols-2 gap-8 text-sm text-gray-700">
                  <div>
                    <p className="font-semibold mb-8">{company?.name || '—'}</p>
                    <p className="border-t border-gray-400 pt-1 text-xs text-gray-500">{t('act.sign')}</p>
                  </div>
                  <div>
                    <p className="font-semibold mb-8">{cp?.name || '—'}</p>
                    <p className="border-t border-gray-400 pt-1 text-xs text-gray-500">{t('act.sign')}</p>
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
