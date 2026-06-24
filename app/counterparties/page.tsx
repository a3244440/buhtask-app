'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, Plus, Pencil, Trash2, X, Search, Loader2, CreditCard, MapPin, User, Building2 } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';
import { getBik } from '@/lib/kzBanks';

interface Counterparty {
  id: string; name: string; bin?: string; director?: string; address?: string; bank?: string; iban?: string;
}

export default function CounterpartiesPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<Counterparty[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', bin: '', director: '', address: '', bank: '', iban: '' });
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const { data } = await supabase.from('counterparties').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', bin: '', director: '', address: '', bank: '', iban: '' });
    setLookupMsg('');
    setModalOpen(true);
  };

  const openEdit = (c: Counterparty) => {
    setEditingId(c.id);
    setForm({ name: c.name || '', bin: c.bin || '', director: c.director || '', address: c.address || '', bank: c.bank || '', iban: c.iban || '' });
    setLookupMsg('');
    setModalOpen(true);
  };

  const lookupBin = async () => {
    const bin = form.bin.trim();
    if (!/^\d{12}$/.test(bin)) { setLookupMsg(t('doc.cpBinInvalid')); return; }
    setLookupLoading(true); setLookupMsg('');
    try {
      const res = await fetch(`/api/company-lookup?bin=${bin}`);
      const data = await res.json();
      if (data.found) {
        setForm(f => ({ ...f, name: data.name || f.name, director: data.director || f.director, address: data.address || f.address }));
        setLookupMsg(t('doc.cpLoaded'));
      } else setLookupMsg(data.message || t('doc.cpNotFound'));
    } catch { setLookupMsg(t('doc.cpServiceUnavailable')); }
    finally { setLookupLoading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = { ...form, bank: form.bank, iban: form.iban };
    if (editingId) {
      const { error } = await supabase.from('counterparties').update(payload).eq('id', editingId);
      if (!error) setItems(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } : c));
    } else {
      const { data, error } = await supabase.from('counterparties').insert({ owner_id: userId, ...payload }).select().single();
      if (!error && data) setItems(prev => [data, ...prev]);
    }
    setSaving(false); setModalOpen(false);
  };

  const remove = async (id: string) => {
    await supabase.from('counterparties').delete().eq('id', id);
    setItems(prev => prev.filter(c => c.id !== id));
  };

  const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white";

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('cp.title')} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> {t('cp.title')}</h1>
              <p className="text-sm text-gray-500">{t('cp.subtitle')}</p>
            </div>
            <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> {t('doc.cpAdd')}
            </button>
          </div>

          {items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">{t('cp.empty')}</p>
              <button onClick={openAdd} className="text-blue-600 font-medium text-sm hover:underline">{t('cp.addFirst')}</button>
            </div>
          ) : (
            <div className="grid gap-4">
              {items.map(c => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        {c.bin && <p className="text-xs text-gray-400">{t('comp.binIin')}: {c.bin}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(c.id)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {c.director && <div className="flex items-center gap-2 text-gray-600"><User className="w-3.5 h-3.5 text-gray-400" /> {c.director}</div>}
                    {c.address && <div className="flex items-center gap-2 text-gray-600 sm:col-span-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {c.address}</div>}
                    {c.iban && <div className="flex items-center gap-2 text-gray-600 sm:col-span-2"><CreditCard className="w-3.5 h-3.5 text-gray-400" /> {c.bank ? c.bank + ': ' : ''}{c.iban}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      <MobileToolsNav />

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingId ? t('cp.editTitle') : t('doc.cpAdd')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('comp.binIin')}</label>
                <div className="flex gap-2">
                  <input value={form.bin} maxLength={12} onChange={e => setForm(f => ({ ...f, bin: e.target.value.replace(/\D/g, '') }))} placeholder="123456789012" className={inp} />
                  <button onClick={lookupBin} disabled={lookupLoading} className="flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium whitespace-nowrap">
                    {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} {t('doc.cpFind')}
                  </button>
                </div>
                {lookupMsg && <p className={`text-xs mt-1.5 ${lookupMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>{lookupMsg}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('doc.cpName')} *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ТОО «Компания»" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('doc.cpDirector')}</label>
                <input value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} placeholder={t('comp.fioPlaceholder')} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('doc.cpAddress')}</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('comp.bank')}</label>
                  <input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">IBAN</label>
                  <input value={form.iban} onChange={e => setForm(f => ({ ...f, iban: e.target.value.toUpperCase() }))} className={inp} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving || !form.name} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl text-sm font-semibold">{saving ? t('doc.saving') : t('btn.save')}</button>
                <button onClick={() => setModalOpen(false)} className="px-5 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold">{t('btn.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export const dynamic = 'force-dynamic';
