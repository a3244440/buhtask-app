'use client';
import { logToolUsage } from '@/lib/logTool';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Wallet, Plus, X, Trash2, ArrowUpRight, ArrowDownRight, Calendar, ChevronLeft, ChevronRight, PieChart, Upload, ArrowRightLeft } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';
import { getActiveCompany } from '@/lib/activeCompany';

interface FinRecord {
  id: string; type: 'income' | 'expense'; category: string; amount: number;
  description: string; record_date: string; company_id?: string | null;
}
interface ParsedTx { date: string; amount: number; type: 'income' | 'expense'; category: string; description: string; include?: boolean; }

const INCOME_CATS = ['Продажи', 'Услуги', 'Аванс от клиента', 'Возврат', 'Прочий доход', 'Продажа оборудования/ОС', 'Получение займа/кредита', 'Взнос учредителя'];
const EXPENSE_CATS = ['Зарплата', 'Налоги', 'Аренда', 'Закуп товара', 'Реклама', 'Коммунальные', 'Транспорт', 'Связь/интернет', 'Банковские расходы', 'Прочий расход', 'Покупка оборудования/ОС', 'Погашение займа/кредита', 'Выплата дивидендов/личные средства'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

// Классификация категорий по видам деятельности для отчёта ДДС (МСФО/НСФО-подобная разбивка).
// Всё, что не инвестиционное и не финансовое, считается операционной деятельностью.
const INVESTING_CATS = ['Продажа оборудования/ОС', 'Покупка оборудования/ОС'];
const FINANCING_CATS = ['Получение займа/кредита', 'Взнос учредителя', 'Погашение займа/кредита', 'Выплата дивидендов/личные средства'];
type Activity = 'operating' | 'investing' | 'financing';
const activityOf = (cat: string): Activity =>
  INVESTING_CATS.includes(cat) ? 'investing' : FINANCING_CATS.includes(cat) ? 'financing' : 'operating';

export default function FinancePage() {
  useEffect(() => { logToolUsage('Финансовая аналитика'); }, []);
  const { t } = useI18n();
  const router = useRouter();
  const CAT_KEY: Record<string, string> = {
    'Продажи': 'fincat.sales', 'Услуги': 'fincat.services', 'Аванс от клиента': 'fincat.advance', 'Возврат': 'fincat.refund', 'Прочий доход': 'fincat.otherIncome',
    'Зарплата': 'fincat.salary', 'Налоги': 'fincat.taxes', 'Аренда': 'fincat.rent', 'Закуп товара': 'fincat.goods', 'Реклама': 'fincat.ads', 'Коммунальные': 'fincat.utilities', 'Транспорт': 'fincat.transport', 'Связь/интернет': 'fincat.internet', 'Банковские расходы': 'fincat.bank', 'Прочий расход': 'fincat.otherExpense',
  };
  const tCat = (c: string) => CAT_KEY[c] ? t(CAT_KEY[c]) : c;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [records, setRecords] = useState<FinRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [periodMode, setPeriodMode] = useState<'month' | 'all' | 'range'>('month');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [parsedTxs, setParsedTxs] = useState<ParsedTx[]>([]);
  const [importSaving, setImportSaving] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('personal');

  const [form, setForm] = useState({ amount: '', category: INCOME_CATS[0], description: '', record_date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    init();
    setSelectedCompany(getActiveCompany());
    const handler = (e: any) => setSelectedCompany(e.detail);
    window.addEventListener('active-company-changed', handler);
    return () => window.removeEventListener('active-company-changed', handler);
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const [{ data: recs }, { data: comps }] = await Promise.all([
      supabase.from('finance_records').select('*').eq('user_id', user.id).order('record_date', { ascending: false }),
      supabase.from('companies').select('id,name').eq('owner_id', user.id),
    ]);
    setRecords((recs as FinRecord[]) || []);
    setCompanies((comps as { id: string; name: string }[]) || []);
    setLoading(false);
  };

  const openModal = (type: 'income' | 'expense') => {
    setModalType(type);
    setForm({ amount: '', category: type === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0], description: '', record_date: new Date().toISOString().split('T')[0] });
    setModalOpen(true);
  };

  const save = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) return;
    setSaving(true);
    const payload = { user_id: userId, type: modalType, category: form.category, amount, description: form.description.trim(), record_date: form.record_date, company_id: selectedCompany === 'personal' ? null : selectedCompany };
    const { data, error } = await supabase.from('finance_records').insert(payload).select().single();
    if (!error && data) setRecords(prev => [data as FinRecord, ...prev]);
    setSaving(false);
    setModalOpen(false);
  };

  const handleStatementUpload = async (file: File) => {
    setImporting(true);
    setImportMsg('');
    setParsedTxs([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/parse-statement', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) { setImportMsg(data.error); }
      else {
        setParsedTxs((data.transactions || []).map((t: ParsedTx) => ({ ...t, include: true })));
        setImportMsg(data.message || '');
      }
    } catch (e: any) {
      setImportMsg('Ошибка загрузки: ' + (e?.message || 'попробуйте снова'));
    } finally {
      setImporting(false);
    }
  };

  const toggleTx = (i: number) => setParsedTxs(prev => prev.map((t, idx) => idx === i ? { ...t, include: !t.include } : t));
  const changeTxCat = (i: number, cat: string) => setParsedTxs(prev => prev.map((t, idx) => idx === i ? { ...t, category: cat } : t));
  const toggleTxType = (i: number) => setParsedTxs(prev => prev.map((t, idx) => {
    if (idx !== i) return t;
    const newType: 'income' | 'expense' = t.type === 'income' ? 'expense' : 'income';
    // Сбросим категорию на дефолт нового типа
    return { ...t, type: newType, category: newType === 'income' ? INCOME_CATS[0] : EXPENSE_CATS[0] };
  }));

  const saveImported = async () => {
    const toSave = parsedTxs.filter(t => t.include);
    if (toSave.length === 0) return;
    setImportSaving(true);
    const payload = toSave.map(t => ({
      user_id: userId, type: t.type, category: t.category,
      amount: t.amount, description: t.description, record_date: t.date,
      company_id: selectedCompany === 'personal' ? null : selectedCompany,
    }));
    const { data, error } = await supabase.from('finance_records').insert(payload).select();
    if (!error && data) setRecords(prev => [...(data as FinRecord[]), ...prev]);
    setImportSaving(false);
    setImportOpen(false);
    setParsedTxs([]);
  };

  const remove = async (id: string) => {
    await supabase.from('finance_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const toggleRecordType = async (rec: FinRecord) => {
    const newType: 'income' | 'expense' = rec.type === 'income' ? 'expense' : 'income';
    await supabase.from('finance_records').update({ type: newType }).eq('id', rec.id);
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, type: newType } : r));
  };

  // Записи текущего месяца и выбранной компании (или личные)
  const monthRecords = useMemo(() => records.filter(r => {
    const d = new Date(r.record_date);
    const companyMatch = selectedCompany === 'personal' ? !r.company_id : r.company_id === selectedCompany;
    if (!companyMatch) return false;
    if (periodMode === 'all') return true;
    if (periodMode === 'range') {
      if (rangeFrom && r.record_date < rangeFrom) return false;
      if (rangeTo && r.record_date > rangeTo) return false;
      return true;
    }
    // month
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  }), [records, viewMonth, viewYear, selectedCompany, periodMode, rangeFrom, rangeTo]);

  const income = monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const profit = income - expense;

  // Расходы по категориям
  const expenseByCat = useMemo(() => {
    const map: { [k: string]: number } = {};
    monthRecords.filter(r => r.type === 'expense').forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);

  // Доходы по категориям
  const incomeByCat = useMemo(() => {
    const map: { [k: string]: number } = {};
    monthRecords.filter(r => r.type === 'income').forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₸';
  const inp = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white";

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('fin.title')} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /> {t('fin.title')}</h1>
            <p className="text-sm text-gray-500">{t('fin.subtitle')}</p>
          </div>
        </div>

        {/* Active company indicator */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5 flex items-center gap-2">
          <span className="text-xs text-gray-400">{t('fin.organization')}</span>
          <span className="text-sm font-semibold text-gray-700">{selectedCompany === 'personal' ? t('fin.personalCab') : '🏢 ' + (companies.find(c => c.id === selectedCompany)?.name || t('fin.company'))}</span>
          <span className="text-xs text-gray-400 ml-auto">{t('fin.switchTop')}</span>
        </div>

        {/* Period selector */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <div className="flex gap-2 mb-3">
            <button onClick={() => setPeriodMode('month')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${periodMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}>{t('fin.month')}</button>
            <button onClick={() => setPeriodMode('all')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${periodMode === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}>{t('fin.allTime')}</button>
            <button onClick={() => setPeriodMode('range')} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${periodMode === 'range' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'}`}>{t('fin.period')}</button>
          </div>

          {periodMode === 'month' && (
            <div className="flex items-center justify-between">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
              <h2 className="font-bold text-lg text-gray-900">{t('month.' + viewMonth)} {viewYear}</h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
            </div>
          )}
          {periodMode === 'all' && (
            <p className="text-center text-sm text-gray-500 py-1">{t('fin.allTimeShown')}</p>
          )}
          {periodMode === 'range' && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">{t('fin.from')}</label>
                <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">{t('fin.to')}</label>
                <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-emerald-600" /></div><span className="text-xs text-gray-500">{t('fin.income')}</span></div>
            <p className="text-xl font-extrabold text-emerald-600">{fmt(income)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-red-600" /></div><span className="text-xs text-gray-500">{t('fin.expense')}</span></div>
            <p className="text-xl font-extrabold text-red-600">{fmt(expense)}</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-5 ${profit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-2 mb-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profit >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>{profit >= 0 ? <TrendingUp className="w-4 h-4 text-blue-600" /> : <TrendingDown className="w-4 h-4 text-amber-600" />}</div><span className="text-xs text-gray-500">{t('fin.netProfit')}</span></div>
            <p className={`text-xl font-extrabold ${profit >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(profit)}</p>
          </div>
        </div>

        {/* Add buttons */}
        <div className="flex gap-3 mb-3">
          <button onClick={() => openModal('income')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> {t('fin.addIncome')}
          </button>
          <button onClick={() => openModal('expense')} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> {t('fin.addExpense')}
          </button>
        </div>
        <button onClick={() => { setImportOpen(true); setParsedTxs([]); setImportMsg(''); }}
          className="w-full flex items-center justify-center gap-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 py-3 rounded-xl text-sm font-semibold transition-colors mb-5">
          <Upload className="w-4 h-4" /> {t('fin.importStatement')}
        </button>

        {/* Expense breakdown - donut chart */}
        {expenseByCat.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-sm"><PieChart className="w-4 h-4 text-gray-400" /> {t('fin.expenseByCat')}</h3>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut SVG */}
              <div className="relative flex-shrink-0">
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {(() => {
                    const cx = 90, cy = 90, r = 70, sw = 28;
                    const circumference = 2 * Math.PI * r;
                    let offset = 0;
                    const colors = ['#EF4444','#F59E0B','#3B82F6','#8B5CF6','#10B981','#EC4899','#06B6D4','#F97316','#6366F1','#84CC16'];
                    return expenseByCat.map(([cat, amt], i) => {
                      const pct = expense > 0 ? amt / expense : 0;
                      const dash = pct * circumference;
                      const seg = (
                        <circle key={cat} cx={cx} cy={cy} r={r} fill="none"
                          stroke={colors[i % colors.length]} strokeWidth={sw}
                          strokeDasharray={`${dash} ${circumference - dash}`}
                          strokeDashoffset={-offset}
                          transform={`rotate(-90 ${cx} ${cy})`} />
                      );
                      offset += dash;
                      return seg;
                    });
                  })()}
                  <text x="90" y="84" textAnchor="middle" className="fill-gray-400" style={{ fontSize: '11px' }}>{t('fin.expense')}</text>
                  <text x="90" y="104" textAnchor="middle" className="fill-gray-900 font-bold" style={{ fontSize: '15px' }}>{expense >= 1000000 ? (expense/1000000).toFixed(1)+'М' : expense >= 1000 ? Math.round(expense/1000)+'К' : expense} ₸</text>
                </svg>
              </div>
              {/* Legend */}
              <div className="flex-1 w-full space-y-2">
                {expenseByCat.map(([cat, amt], i) => {
                  const colors = ['#EF4444','#F59E0B','#3B82F6','#8B5CF6','#10B981','#EC4899','#06B6D4','#F97316','#6366F1','#84CC16'];
                  const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                      <span className="text-sm text-gray-600 flex-1 truncate">{tCat(cat)}</span>
                      <span className="text-sm text-gray-900 font-medium">{fmt(amt)}</span>
                      <span className="text-xs text-gray-400 w-9 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Records list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">{t('fin.operations')} ({monthRecords.length})</h3>
          </div>
          {monthRecords.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t('fin.noOperations')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {monthRecords.map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-3 group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {r.type === 'income' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{tCat(r.category)}</p>
                    {r.description && <p className="text-xs text-gray-400 truncate">{r.description}</p>}
                    <p className="text-xs text-gray-400">{new Date(r.record_date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleRecordType(r)}
                      className={`font-semibold text-sm px-2 py-1 rounded-lg transition-colors ${r.type === 'income' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}
                      title={t('fin.toggleType')}>
                      {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
                      <ArrowRightLeft className="w-3 h-3 inline ml-1 opacity-40" />
                    </button>
                    <button onClick={() => remove(r.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{modalType === 'income' ? t('fin.newIncome') : t('fin.newExpense')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('fin.amount')}</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="100000" className={inp + ' text-lg font-semibold'} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('fin.category')}</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  {(modalType === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{tCat(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('fin.date')}</label>
                <input type="date" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('fin.comment')}</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('fin.commentPlaceholder')} className={inp} />
              </div>
              <button onClick={save} disabled={saving || !form.amount} className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:bg-gray-300 ${modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {saving ? t('doc.saving') : t('fin.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import statement modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !importing && setImportOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{t('fin.importTitle')}</h3>
              <button onClick={() => setImportOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              {parsedTxs.length === 0 ? (
                <>
                  <label className="block">
                    <div className="border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-2xl p-8 text-center cursor-pointer transition-colors">
                      {importing ? (
                        <><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" /><p className="text-sm text-gray-500">{t('fin.recognizing')}</p></>
                      ) : (
                        <><Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-sm font-medium text-gray-700 mb-1">{t('fin.selectFile')}</p><p className="text-xs text-gray-400">{t('fin.excelOrCsv')}</p></>
                      )}
                    </div>
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={importing}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleStatementUpload(f); }} />
                  </label>
                  {importMsg && <p className="text-sm text-amber-600 mt-3 text-center">{importMsg}</p>}
                  <div className="mt-4 bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-gray-600">{t('fin.importHint')}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-600">{importMsg}</p>
                    <button onClick={() => { setParsedTxs([]); setImportMsg(''); }} className="text-xs text-blue-600 hover:underline">{t('fin.loadAnother')}</button>
                  </div>
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto mb-4">
                    {parsedTxs.map((t, i) => (
                      <div key={i} className={`border rounded-xl p-3 ${t.include ? 'border-gray-200' : 'border-gray-100 opacity-50'}`}>
                        <div className="flex items-start gap-2">
                          <input type="checkbox" checked={t.include} onChange={() => toggleTx(i)} className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <button onClick={() => toggleTxType(i)}
                                className={`text-sm font-semibold px-2 py-0.5 rounded-lg transition-colors ${t.type === 'income' ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}
                                title="Нажмите чтобы переключить доход/расход">
                                {t.type === 'income' ? '+' : '−'}{t.amount.toLocaleString('ru-RU')} ₸
                                <ArrowRightLeft className="w-3 h-3 inline ml-1.5 opacity-50" />
                              </button>
                              <span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString('ru-RU')}</span>
                            </div>
                            {t.description && <p className="text-xs text-gray-500 truncate mt-0.5">{t.description}</p>}
                            <select value={t.category} onChange={e => changeTxCat(i, e.target.value)}
                              className="mt-1.5 text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white">
                              {(t.type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{tCat(c)}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={saveImported} disabled={importSaving || parsedTxs.filter(t => t.include).length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                    {importSaving ? t('doc.saving') : `${t('fin.add')} ${parsedTxs.filter(t => t.include).length} ${t('fin.operationsWord')}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
      <MobileToolsNav />
    </div>
  );
}

export const dynamic = 'force-dynamic';
