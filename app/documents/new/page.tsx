'use client';
import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import ToolsSidebar from '../../components/ToolsSidebar';
import { getActiveCompany } from '@/lib/activeCompany';
import { useI18n } from '@/lib/i18n';

interface Item { name: string; unit: string; qty: number; price: number; }

function NewDocInner() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const type = (sp.get('type') || 'invoice') as 'invoice' | 'avr' | 'sf';
  const parentId = sp.get('parent');

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [counterparties, setCounterparties] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState('');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [number, setNumber] = useState('');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [contract, setContract] = useState('');
  const [hasVat, setHasVat] = useState(false);
  const [items, setItems] = useState<Item[]>([{ name: '', unit: 'усл.', qty: 1, price: 0 }]);
  const [saving, setSaving] = useState(false);

  const TYPE_LABEL = { invoice: t('nd.typeInvoice'), avr: t('nd.typeAvr'), sf: t('nd.typeSf') }[type];

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);

    const [{ data: comp }, { data: cp }] = await Promise.all([
      supabase.from('companies').select('*').eq('owner_id', user.id),
      supabase.from('counterparties').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
    ]);
    setCompanies(comp || []);
    setCounterparties(cp || []);

    // активная компания как поставщик
    const active = getActiveCompany();
    if (active && active !== 'personal') setCompanyId(active);
    else if (comp && comp.length > 0) setCompanyId(comp[0].id);

    // авто-номер
    const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('owner_id', user.id).eq('type', type);
    setNumber(String((count || 0) + 1));

    // Если создаём на основании — наследуем данные
    if (parentId) {
      const { data: parent } = await supabase.from('documents').select('*').eq('id', parentId).maybeSingle();
      if (parent) {
        setCompanyId(parent.company_id || '');
        setCounterpartyId(parent.counterparty_id || '');
        setContract(parent.contract || '');
        setHasVat(parent.has_vat || false);
        if (parent.items && parent.items.length) setItems(parent.items);
      }
    }
    setLoading(false);
  };

  const addItem = () => setItems([...items, { name: '', unit: 'усл.', qty: 1, price: 0 }]);
  const updateItem = (i: number, field: keyof Item, val: any) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const total = items.reduce((s, it) => s + (it.qty * it.price), 0);
  const vatTotal = hasVat ? Math.round(total - total / 1.12) : 0;

  const save = async () => {
    if (!counterpartyId) { alert(t('nd.selectBuyer')); return; }
    if (!companyId) { alert(t('nd.selectSupplierAlert')); return; }
    if (items.every(it => !it.name.trim())) { alert(t('nd.addItemAlert')); return; }
    setSaving(true);
    const payload = {
      owner_id: userId, company_id: companyId, counterparty_id: counterpartyId,
      parent_id: parentId || null, type, number, doc_date: docDate, contract,
      items: items.filter(it => it.name.trim()), total, vat_total: vatTotal, has_vat: hasVat,
    };
    const { data, error } = await supabase.from('documents').insert(payload).select().single();
    setSaving(false);
    if (error) { alert('Ошибка: ' + error.message); return; }
    if (data) router.push(`/documents/${data.id}`);
  };

  const inp = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white";

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={TYPE_LABEL} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => router.push('/documents')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
            <ArrowLeft className="w-4 h-4" /> {t('nd.toDocuments')}
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-1">{t('nd.new')}: {TYPE_LABEL}</h1>
          {parentId && <p className="text-sm text-blue-600 mb-5">{t('nd.basedOnDoc')}</p>}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 mt-4">
            {/* Поставщик / покупатель */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nd.supplier')}</label>
                <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={inp}>
                  <option value="">{t('nd.selectCompany')}</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {companies.length === 0 && <p className="text-xs text-amber-600 mt-1">{t('nd.addCompanyFirst')}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nd.buyer')}</label>
                <select value={counterpartyId} onChange={e => setCounterpartyId(e.target.value)} className={inp}>
                  <option value="">{t('nd.selectCp')}</option>
                  {counterparties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {counterparties.length === 0 && <p className="text-xs text-amber-600 mt-1">{t('nd.addCpFirst')}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nd.number')}</label>
                <input value={number} onChange={e => setNumber(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nd.date')}</label>
                <input type="date" value={docDate} onChange={e => setDocDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('nd.contract')}</label>
                <input value={contract} onChange={e => setContract(e.target.value)} placeholder={t('nd.noContract')} className={inp} />
              </div>
            </div>

            {/* Позиции */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">{t('nd.itemsGoods')}</label>
                <button onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> {t('btn.add')}</button>
              </div>
              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{t('nd.position')} {i + 1}</span>
                      {items.length > 1 && <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                    <input value={it.name} onChange={e => updateItem(i, 'name', e.target.value)} placeholder={t('nd.itemNamePlaceholder')} className={inp} />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">{t('nd.unit')}</label>
                        <input value={it.unit} onChange={e => updateItem(i, 'unit', e.target.value)} className={inp} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">{t('nd.qty')}</label>
                        <input type="number" value={it.qty} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 0)} className={inp} />
                      </div>
                      <div>
                        <label className="block text-[11px] text-gray-400 mb-1">{t('nd.price')}</label>
                        <input type="number" value={it.price} onChange={e => updateItem(i, 'price', parseFloat(e.target.value) || 0)} className={inp} />
                      </div>
                    </div>
                    <p className="text-right text-sm text-gray-600">{t('nd.sum')}: <b>{(it.qty * it.price).toLocaleString('ru-RU')} ₸</b></p>
                  </div>
                ))}
              </div>
            </div>

            {/* НДС */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={hasVat} onChange={e => setHasVat(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-sm text-gray-700">{t('nd.includeVat')}</span>
            </label>

            {/* Итого */}
            <div className="bg-gray-50 rounded-xl p-4 text-right">
              {hasVat && <p className="text-sm text-gray-500">{t('nd.vatIncl')}: {vatTotal.toLocaleString('ru-RU')} ₸</p>}
              <p className="text-lg font-bold text-gray-900">{t('nd.total')}: {total.toLocaleString('ru-RU')} ₸</p>
            </div>

            <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
              <Save className="w-4 h-4" /> {saving ? t('doc.saving') : t('nd.createDoc')}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function NewDocPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}><NewDocInner /></Suspense>;
}
export const dynamic = 'force-dynamic';
