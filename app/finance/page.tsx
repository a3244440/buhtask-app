'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Wallet, Plus, X, Trash2, ArrowUpRight, ArrowDownRight, Calendar, ChevronLeft, ChevronRight, PieChart } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

interface FinRecord {
  id: string; type: 'income' | 'expense'; category: string; amount: number;
  description: string; record_date: string;
}

const INCOME_CATS = ['Продажи', 'Услуги', 'Аванс от клиента', 'Возврат', 'Прочий доход'];
const EXPENSE_CATS = ['Зарплата', 'Налоги', 'Аренда', 'Закуп товара', 'Реклама', 'Коммунальные', 'Транспорт', 'Связь/интернет', 'Банковские расходы', 'Прочий расход'];
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

export default function FinancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [records, setRecords] = useState<FinRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'income' | 'expense'>('income');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ amount: '', category: INCOME_CATS[0], description: '', record_date: new Date().toISOString().split('T')[0] });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const { data } = await supabase.from('finance_records').select('*').eq('user_id', user.id).order('record_date', { ascending: false });
    setRecords((data as FinRecord[]) || []);
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
    const payload = { user_id: userId, type: modalType, category: form.category, amount, description: form.description.trim(), record_date: form.record_date };
    const { data, error } = await supabase.from('finance_records').insert(payload).select().single();
    if (!error && data) setRecords(prev => [data as FinRecord, ...prev]);
    setSaving(false);
    setModalOpen(false);
  };

  const remove = async (id: string) => {
    await supabase.from('finance_records').delete().eq('id', id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  // Записи текущего месяца
  const monthRecords = useMemo(() => records.filter(r => {
    const d = new Date(r.record_date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  }), [records, viewMonth, viewYear]);

  const income = monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const profit = income - expense;

  // Расходы по категориям
  const expenseByCat = useMemo(() => {
    const map: { [k: string]: number } = {};
    monthRecords.filter(r => r.type === 'expense').forEach(r => { map[r.category] = (map[r.category] || 0) + r.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthRecords]);

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₸';
  const inp = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white";

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title="Финансы" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Wallet className="w-5 h-5 text-blue-600" /> Финансовая аналитика</h1>
            <p className="text-sm text-gray-500">Доходы, расходы и чистая прибыль</p>
          </div>
        </div>

        {/* Month nav */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
          <h2 className="font-bold text-lg text-gray-900">{MONTHS_RU[viewMonth]} {viewYear}</h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowUpRight className="w-4 h-4 text-emerald-600" /></div><span className="text-xs text-gray-500">Доходы</span></div>
            <p className="text-xl font-extrabold text-emerald-600">{fmt(income)}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><ArrowDownRight className="w-4 h-4 text-red-600" /></div><span className="text-xs text-gray-500">Расходы</span></div>
            <p className="text-xl font-extrabold text-red-600">{fmt(expense)}</p>
          </div>
          <div className={`rounded-2xl border shadow-sm p-5 ${profit >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
            <div className="flex items-center gap-2 mb-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${profit >= 0 ? 'bg-blue-100' : 'bg-amber-100'}`}>{profit >= 0 ? <TrendingUp className="w-4 h-4 text-blue-600" /> : <TrendingDown className="w-4 h-4 text-amber-600" />}</div><span className="text-xs text-gray-500">Чистая прибыль</span></div>
            <p className={`text-xl font-extrabold ${profit >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>{fmt(profit)}</p>
          </div>
        </div>

        {/* Add buttons */}
        <div className="flex gap-3 mb-5">
          <button onClick={() => openModal('income')} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Добавить доход
          </button>
          <button onClick={() => openModal('expense')} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Добавить расход
          </button>
        </div>

        {/* Expense breakdown */}
        {expenseByCat.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm"><PieChart className="w-4 h-4 text-gray-400" /> Структура расходов</h3>
            <div className="space-y-2.5">
              {expenseByCat.map(([cat, amt]) => {
                const pct = expense > 0 ? Math.round((amt / expense) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{cat}</span>
                      <span className="text-gray-900 font-medium">{fmt(amt)} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Records list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Операции за месяц ({monthRecords.length})</h3>
          </div>
          {monthRecords.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Нет операций за этот месяц</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {monthRecords.map(r => (
                <div key={r.id} className="px-5 py-3.5 flex items-center gap-3 group">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.type === 'income' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {r.type === 'income' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{r.category}</p>
                    {r.description && <p className="text-xs text-gray-400 truncate">{r.description}</p>}
                    <p className="text-xs text-gray-400">{new Date(r.record_date).toLocaleDateString('ru-RU')}</p>
                  </div>
                  <span className={`font-semibold text-sm ${r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.type === 'income' ? '+' : '−'}{fmt(r.amount)}
                  </span>
                  <button onClick={() => remove(r.id)} className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
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
              <h3 className="font-bold text-gray-900">{modalType === 'income' ? 'Новый доход' : 'Новый расход'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Сумма</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="100000" className={inp + ' text-lg font-semibold'} autoFocus />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Категория</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
                  {(modalType === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Дата</label>
                <input type="date" value={form.record_date} onChange={e => setForm(f => ({ ...f, record_date: e.target.value }))} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Комментарий (необязательно)</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Например: оплата за услуги" className={inp} />
              </div>
              <button onClick={save} disabled={saving || !form.amount} className={`w-full py-3 rounded-xl font-semibold text-sm text-white transition-colors disabled:bg-gray-300 ${modalType === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {saving ? 'Сохраняем...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
