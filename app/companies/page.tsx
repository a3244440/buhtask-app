'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Trash2, Pencil, X, Search, CreditCard, MapPin, User, FileText, Loader2 } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

interface BankAccount { bank: string; iban: string; }
interface Company {
  id: string; name: string; bin: string; director: string; address: string;
  tax_regime: string; oked: string; registration_date: string; status: string;
  bank_accounts: BankAccount[];
}

const TAX_REGIMES = [
  'СНР на основе упрощённой декларации',
  'Общеустановленный режим',
  'Розничный налог',
  'Патент',
  'СНР с использованием фиксированного вычета',
  'СНР для крестьянских хозяйств',
];
const BANKS = ['Kaspi Bank', 'Halyk Bank', 'Народный банк', 'БЦК (CenterCredit)', 'ForteBank', 'Jusan Bank', 'Bereke Bank', 'Freedom Bank', 'Altyn Bank', 'RBK Bank', 'Другой'];

export default function CompaniesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupMsg, setLookupMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const emptyForm: Company = { id: '', name: '', bin: '', director: '', address: '', tax_regime: TAX_REGIMES[0], oked: '', registration_date: '', status: '', bank_accounts: [] };
  const [form, setForm] = useState<Company>(emptyForm);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const { data } = await supabase.from('companies').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    setCompanies((data as Company[]) || []);
    setLoading(false);
  };

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setLookupMsg(''); setError(''); setModalOpen(true); };
  const openEdit = (c: Company) => { setForm({ ...c, bank_accounts: c.bank_accounts || [] }); setEditingId(c.id); setLookupMsg(''); setError(''); setModalOpen(true); };

  const lookupBin = async () => {
    const bin = form.bin.trim();
    if (!/^\d{12}$/.test(bin)) { setLookupMsg('БИН должен содержать 12 цифр'); return; }
    setLookupLoading(true); setLookupMsg('');
    try {
      const res = await fetch(`/api/company-lookup?bin=${bin}`);
      const data = await res.json();
      if (data.found) {
        setForm(f => ({
          ...f,
          name: data.name || f.name,
          director: data.director || f.director,
          address: data.address || f.address,
          oked: data.oked || f.oked,
          registration_date: data.registration_date || f.registration_date,
          status: data.status || f.status,
        }));
        setLookupMsg('✓ Данные загружены из реестра');
      } else {
        setLookupMsg(data.message || 'Не найдено. Заполните вручную.');
      }
    } catch {
      setLookupMsg('Сервис недоступен. Заполните вручную.');
    } finally {
      setLookupLoading(false);
    }
  };

  const addBankAccount = () => setForm(f => ({ ...f, bank_accounts: [...f.bank_accounts, { bank: BANKS[0], iban: '' }] }));
  const updateBankAccount = (i: number, field: keyof BankAccount, val: string) =>
    setForm(f => ({ ...f, bank_accounts: f.bank_accounts.map((b, idx) => idx === i ? { ...b, [field]: val } : b) }));
  const removeBankAccount = (i: number) => setForm(f => ({ ...f, bank_accounts: f.bank_accounts.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name.trim()) { setError('Введите наименование компании'); return; }
    setSaving(true); setError('');
    const payload = {
      owner_id: userId, name: form.name.trim(), bin: form.bin.trim(), director: form.director.trim(),
      address: form.address.trim(), tax_regime: form.tax_regime, oked: form.oked,
      registration_date: form.registration_date, status: form.status,
      bank_accounts: form.bank_accounts.filter(b => b.iban.trim()),
    };
    try {
      if (editingId) {
        const { error: e } = await supabase.from('companies').update(payload).eq('id', editingId);
        if (e) throw e;
        setCompanies(prev => prev.map(c => c.id === editingId ? { ...c, ...payload } as Company : c));
      } else {
        const { data, error: e } = await supabase.from('companies').insert(payload).select().single();
        if (e) throw e;
        if (data) setCompanies(prev => [data as Company, ...prev]);
      }
      setModalOpen(false);
    } catch (e: any) {
      setError('Ошибка сохранения: ' + (e?.message || 'попробуйте снова'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить компанию?')) return;
    await supabase.from('companies').delete().eq('id', id);
    setCompanies(prev => prev.filter(c => c.id !== id));
  };

  const inp = "w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white";

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title="Мои компании" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Мои компании</h1>
            <p className="text-sm text-gray-500">Данные компаний для задач и документов</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Добавить компанию
          </button>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
            <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 mb-4">У вас пока нет добавленных компаний</p>
            <button onClick={openAdd} className="text-blue-600 font-medium text-sm hover:underline">+ Добавить первую компанию</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {companies.map(c => (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.bin && <p className="text-xs text-gray-400">БИН: {c.bin}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(c)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(c.id)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {c.director && <div className="flex items-center gap-2 text-gray-600"><User className="w-3.5 h-3.5 text-gray-400" /> {c.director}</div>}
                  {c.tax_regime && <div className="flex items-center gap-2 text-gray-600"><FileText className="w-3.5 h-3.5 text-gray-400" /> {c.tax_regime}</div>}
                  {c.address && <div className="flex items-center gap-2 text-gray-600 sm:col-span-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {c.address}</div>}
                </div>
                {c.bank_accounts && c.bank_accounts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400 mb-1.5">Счета:</p>
                    <div className="flex flex-wrap gap-2">
                      {c.bank_accounts.map((b, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-lg text-xs text-gray-600">
                          <CreditCard className="w-3 h-3" /> {b.bank}: {b.iban}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{editingId ? 'Редактировать компанию' : 'Новая компания'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* BIN with autofill */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">БИН / ИИН</label>
                <div className="flex gap-2">
                  <input type="text" value={form.bin} maxLength={12}
                    onChange={e => setForm(f => ({ ...f, bin: e.target.value.replace(/\D/g, '') }))}
                    placeholder="123456789012" className={inp} />
                  <button onClick={lookupBin} disabled={lookupLoading}
                    className="flex items-center gap-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium whitespace-nowrap transition-colors">
                    {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    Найти
                  </button>
                </div>
                {lookupMsg && <p className={`text-xs mt-1.5 ${lookupMsg.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>{lookupMsg}</p>}
                <p className="text-xs text-gray-400 mt-1">Введите БИН и нажмите «Найти» — данные подтянутся автоматически</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Наименование *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ТОО «Компания»" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Директор</label>
                <input type="text" value={form.director} onChange={e => setForm(f => ({ ...f, director: e.target.value }))} placeholder="Фамилия Имя Отчество" className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Юридический адрес</label>
                <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="г. Астана, ул. ..." className={inp} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Налоговый режим</label>
                <select value={form.tax_regime} onChange={e => setForm(f => ({ ...f, tax_regime: e.target.value }))} className={inp}>
                  {TAX_REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Bank accounts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Банковские счета</label>
                  <button onClick={addBankAccount} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Добавить счёт</button>
                </div>
                <div className="space-y-3">
                  {form.bank_accounts.map((b, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Счёт {i + 1}</span>
                        <button onClick={() => removeBankAccount(i)} className="p-1 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                      <select value={b.bank} onChange={e => updateBankAccount(i, 'bank', e.target.value)} className={inp}>
                        {BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                      </select>
                      <input type="text" value={b.iban} onChange={e => updateBankAccount(i, 'iban', e.target.value.toUpperCase())} placeholder="KZ00 0000 0000 0000 0000" className={inp} />
                    </div>
                  ))}
                  {form.bank_accounts.length === 0 && <p className="text-xs text-gray-400">Нет добавленных счетов</p>}
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

              <div className="flex gap-3 pt-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {saving ? 'Сохраняем...' : 'Сохранить'}
                </button>
                <button onClick={() => setModalOpen(false)} className="px-5 py-3 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl font-semibold text-sm transition-colors">Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export const dynamic = 'force-dynamic';
