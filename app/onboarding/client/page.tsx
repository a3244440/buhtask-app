'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';

const CITIES = ['Астана','Алматы','Шымкент','Актобе','Тараз','Павлодар','Усть-Каменогорск','Семей','Атырау','Костанай','Кызылорда','Уральск','Петропавловск','Актау','Темиртау','Туркестан','Кокшетау','Талдыкорган'];
const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white transition-all";

export default function ClientOnboarding() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  const [form, setForm] = useState({
    full_name: '', company_type: 'IP', bin: '', phone: '', city: 'Астана',
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUserId(data.user.id);
    });
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError('');
    if (!form.full_name.trim()) { setError('Введите имя или название компании'); return; }
    setLoading(true);
    try {
      const { error: e } = await supabase.from('profiles').update({
        full_name: form.full_name.trim(),
        phone: form.phone,
        city: form.city,
        bin: form.bin,
      }).eq('id', userId);
      if (e) throw e;
      router.push('/dashboard/client');
    } catch (err: any) {
      // Если ошибка из-за bin колонки - сохраняем без неё
      try {
        await supabase.from('profiles').update({
          full_name: form.full_name.trim(),
          phone: form.phone,
          city: form.city,
        }).eq('id', userId);
        router.push('/dashboard/client');
      } catch {
        setError(err.message || 'Ошибка сохранения');
        setLoading(false);
      }
    }
  };

  const skip = () => router.push('/dashboard/client');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <a href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-12 w-auto mx-auto" /></a>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Расскажите о вашем бизнесе</h1>
              <p className="text-sm text-gray-500">Эти данные помогут бухгалтерам</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Имя / Название компании *</label>
              <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
                placeholder="ИП Иванов или ТОО «Ромашка»" className={inp} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Тип компании</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ v: 'IP', label: 'ИП', sub: 'Индивидуальный предприниматель' }, { v: 'TOO', label: 'ТОО', sub: 'Товарищество' }].map(t => (
                  <button key={t.v} type="button" onClick={() => set('company_type', t.v)}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${form.company_type === t.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`font-bold ${form.company_type === t.v ? 'text-blue-700' : 'text-gray-800'}`}>{t.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">БИН / ИИН</label>
              <input type="text" value={form.bin} onChange={e => set('bin', e.target.value)}
                placeholder="123456789012" className={inp} maxLength={12} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Телефон</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="+7 777 000 00 00" className={inp} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Город</label>
              <select value={form.city} onChange={e => set('city', e.target.value)} className={inp}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold text-sm transition-colors">
              {loading ? 'Сохраняем...' : 'Продолжить'} <ArrowRight className="w-4 h-4" />
            </button>

            <button onClick={skip} className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors">
              Пропустить и заполнить позже
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
