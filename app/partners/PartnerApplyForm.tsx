'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  bank: 'Банк / финансы', software: 'Софт для бизнеса', education: 'Обучение', office: 'Офис и товары', other: 'Другое',
};

export default function PartnerApplyForm() {
  const [form, setForm] = useState({
    name: '', category: 'other', description: '', website_url: '', logo_url: '',
    prize_offer: '', contact_name: '', contact_email: '', contact_phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!form.name.trim()) { setError('Укажите название компании'); return; }
    if (!form.contact_email.trim()) { setError('Укажите email для связи'); return; }
    setSubmitting(true);
    const { error: e } = await supabase.from('partners').insert({
      name: form.name.trim(), category: form.category, description: form.description.trim() || null,
      website_url: form.website_url.trim() || null, logo_url: form.logo_url.trim() || null,
      prize_offer: form.prize_offer.trim() || null, contact_name: form.contact_name.trim() || null,
      contact_email: form.contact_email.trim(), contact_phone: form.contact_phone.trim() || null,
      status: 'pending',
    });
    setSubmitting(false);
    if (e) { setError('Не удалось отправить заявку: ' + e.message); return; }
    setSubmitted(true);
  };

  const inp = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500";

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 text-center py-10">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <p className="font-bold text-gray-900 text-lg mb-1">Заявка отправлена</p>
        <p className="text-sm text-gray-500">Мы свяжемся с вами по указанному email после модерации.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Подать заявку</h2>
      <p className="text-sm text-gray-500 mb-5">Заявка проходит модерацию — на сайт она попадёт не сразу.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

      <div className="space-y-3.5">
        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Название компании *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Категория</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
              {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Кратко о компании</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + ' resize-none'} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Что предлагаете в качестве приза победителям (необязательно)</label>
          <input value={form.prize_offer} onChange={e => setForm(f => ({ ...f, prize_offer: e.target.value }))} placeholder="Например: годовая подписка, сертификат на курс, консультация" className={inp} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Сайт (необязательно)</label>
            <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))} placeholder="https://" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ссылка на логотип (необязательно)</label>
            <input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://" className={inp} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Контактное лицо</label>
            <input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email *</label>
            <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">Телефон</label>
            <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} className={inp} />
          </div>
        </div>

        <button onClick={submit} disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors mt-2">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {submitting ? 'Отправка…' : 'Отправить заявку'}
        </button>
      </div>
    </div>
  );
}
