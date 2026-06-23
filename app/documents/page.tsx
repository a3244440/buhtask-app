'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FileText, Plus, Trash2, FileSpreadsheet, Receipt, FileCheck, ChevronRight, X, Search, Loader2, Users } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { getActiveCompany } from '@/lib/activeCompany';

interface Doc {
  id: string; type: 'invoice' | 'avr' | 'sf'; number: string; doc_date: string;
  total: number; counterparty_id: string; company_id: string; parent_id: string | null;
  counterparty_name?: string;
}

const TYPE_INFO: Record<string, { label: string; short: string; icon: any; color: string }> = {
  invoice: { label: 'Счёт на оплату', short: 'Счёт', icon: Receipt, color: 'bg-blue-50 text-blue-600' },
  avr: { label: 'Акт выполненных работ', short: 'АВР', icon: FileCheck, color: 'bg-emerald-50 text-emerald-600' },
  sf: { label: 'Счёт-фактура', short: 'СФ', icon: FileSpreadsheet, color: 'bg-violet-50 text-violet-600' },
};

export default function DocumentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [docs, setDocs] = useState<Doc[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompanyState] = useState('personal');
  const [filter, setFilter] = useState<'all' | 'invoice' | 'avr' | 'sf'>('all');
  const [showCp, setShowCp] = useState(false);

  useEffect(() => {
    init();
    setActiveCompanyState(getActiveCompany());
    const handler = (e: any) => setActiveCompanyState(e.detail);
    window.addEventListener('active-company-changed', handler);
    return () => window.removeEventListener('active-company-changed', handler);
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const [{ data: d }, { data: cp }, { data: comp }] = await Promise.all([
      supabase.from('documents').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('counterparties').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('companies').select('id,name,bin').eq('owner_id', user.id),
    ]);
    const cpMap: Record<string, string> = {};
    (cp || []).forEach((c: any) => { cpMap[c.id] = c.name; });
    setDocs(((d as Doc[]) || []).map(doc => ({ ...doc, counterparty_name: cpMap[doc.counterparty_id] || '—' })));
    setCounterparties(cp || []);
    setCompanies(comp || []);
    setLoading(false);
  };

  const removeDoc = async (id: string) => {
    if (!confirm('Удалить документ?')) return;
    await supabase.from('documents').delete().eq('id', id);
    setDocs(prev => prev.filter(d => d.id !== id));
  };

  const filtered = filter === 'all' ? docs : docs.filter(d => d.type === filter);
  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₸';

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title="Документы" />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Документы</h1>
              <p className="text-sm text-gray-500">Счета, акты и счета-фактуры</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowCp(true)} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <Users className="w-4 h-4" /> Контрагенты
              </button>
              <button onClick={() => router.push('/documents/new?type=invoice')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Создать счёт
              </button>
            </div>
          </div>

          {/* Active company notice */}
          {activeCompany === 'personal' && companies.length > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 text-sm text-amber-700">
              Выберите компанию вверху — её реквизиты будут поставщиком в документах
            </div>
          )}

          {/* Filter tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {[
              { id: 'all', label: 'Все' },
              { id: 'invoice', label: 'Счета' },
              { id: 'avr', label: 'АВР' },
              { id: 'sf', label: 'Счета-фактуры' },
            ].map(t => (
              <button key={t.id} onClick={() => setFilter(t.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === t.id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Documents list */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Нет документов</p>
              <button onClick={() => router.push('/documents/new?type=invoice')} className="text-blue-600 font-medium text-sm hover:underline">+ Создать первый счёт</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(doc => {
                const info = TYPE_INFO[doc.type];
                return (
                  <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <button onClick={() => router.push(`/documents/${doc.id}`)} className="flex items-center gap-4 flex-1 min-w-0 text-left">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${info.color}`}>
                        <info.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{info.short} №{doc.number}</p>
                          {doc.parent_id && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">на основании</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{doc.counterparty_name} · {new Date(doc.doc_date).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900">{fmt(doc.total)}</p>
                      </div>
                    </button>
                    <button onClick={() => removeDoc(doc.id)} className="p-2 text-gray-300 hover:text-red-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
      <MobileToolsNav />

      {showCp && <CounterpartiesModal userId={userId} counterparties={counterparties} setCounterparties={setCounterparties} onClose={() => setShowCp(false)} />}
    </div>
  );
}

// ===== Counterparties modal =====
function CounterpartiesModal({ userId, counterparties, setCounterparties, onClose }: any) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', bin: '', director: '', address: '', bank: '', iban: '' });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const lookupBin = async () => {
    const bin = form.bin.trim();
    if (!/^\d{12}$/.test(bin)) { setLookupMsg('БИН должен содержать 12 цифр'); return; }
    setLookupLoading(true); setLookupMsg('');
    try {
      const res = await fetch(`/api/company-lookup?bin=${bin}`);
      const data = await res.json();
      if (data.found) {
        setForm(f => ({ ...f, name: data.name || f.name, director: data.director || f.director, address: data.address || f.address }));
        setLookupMsg('✓ Данные загружены');
      } else setLookupMsg(data.message || 'Не найдено');
    } catch { setLookupMsg('Сервис недоступен'); }
    finally { setLookupLoading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('counterparties').insert({ owner_id: userId, ...form }).select().single();
    if (!error && data) setCounterparties((prev: any) => [data, ...prev]);
    setSaving(false); setAdding(false);
    setForm({ name: '', bin: '', director: '', address: '', bank: '', iban: '' });
  };

  const remove = async (id: string) => {
    await supabase.from('counterparties').delete().eq('id', id);
    setCounterparties((prev: any) => prev.filter((c: any) => c.id !== id));
  };

  const inp = "w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Контрагенты</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {!adding ? (
            <>
              <button onClick={() => setAdding(true)} className="w-full mb-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Добавить контрагента
              </button>
              {counterparties.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Нет контрагентов</p>
              ) : (
                <div className="space-y-2">
                  {counterparties.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{c.name}</p>
                        {c.bin && <p className="text-xs text-gray-400">БИН: {c.bin}</p>}
                      </div>
                      <button onClick={() => remove(c.id)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">БИН / ИИН</label>
                <div className="flex gap-2">
                  <input value={form.bin} maxLength={12} onChange={e => setForm(f => ({ ...f, bin: e.target.value.replace(/\D/g, '') }))} placeholder="123456789012" className={inp} />
                  <button onClick={lookupBin} disabled={lookupLoading} className="flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium whitespace-nowrap">
                    {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Найти
                  </button>
                </div>
                {lookupMsg && <p className={`text-xs mt-1 ${lookupMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>{lookupMsg}</p>}
              </div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Наименование *</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ТОО «Компания»" className={inp} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Директор</label><input value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} className={inp} /></div>
              <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Адрес</label><input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inp} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">Банк</label><input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className={inp} /></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1.5">IBAN</label><input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))} className={inp} /></div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={save} disabled={saving || !form.name} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-2.5 rounded-xl text-sm font-semibold">{saving ? 'Сохраняем...' : 'Сохранить'}</button>
                <button onClick={() => setAdding(false)} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold">Отмена</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
