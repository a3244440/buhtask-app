'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { TrendingUp, CheckCircle2, Clock, Loader2, ArrowLeft } from 'lucide-react';

const PLANS = [
  { months: 1, price: 10000, label: '1 месяц' },
  { months: 3, price: 25000, label: '3 месяца', badge: 'Выгоднее на 17%' },
];

export default function PromotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/auth?redirect=/promote'); return; }
      const user = session.user;
      setUserId(user.id);

      const { data: p } = await supabase.from('profiles').select('role, full_name, avatar_url, city').eq('id', user.id).maybeSingle();
      if (p?.role !== 'accountant') { setError('Продвижение в рейтинге доступно только бухгалтерам'); setLoading(false); return; }
      setProfile(p);

      const [{ data: entry }, { data: req }] = await Promise.all([
        supabase.from('contest_entries').select('*').eq('accountant_id', user.id).eq('badge_type', 'promoted').maybeSingle(),
        supabase.from('promotion_requests').select('*').eq('accountant_id', user.id).eq('status', 'pending').order('requested_at', { ascending: false }).maybeSingle(),
      ]);

      if (entry && entry.paid_until && new Date(entry.paid_until) > new Date()) setActiveEntry(entry);
      setPendingRequest(req || null);
      setLoading(false);
    })();
  }, [router]);

  const submit = async () => {
    setError('');
    setSubmitting(true);
    const plan = PLANS[selectedPlan];
    const { error: e } = await supabase.from('promotion_requests').insert({
      accountant_id: userId, full_name: profile?.full_name || null, avatar_url: profile?.avatar_url || null,
      city: profile?.city || null, period_months: plan.months, amount: plan.price, status: 'pending',
    });
    setSubmitting(false);
    if (e) { setError('Не удалось отправить заявку: ' + e.message); return; }
    setSubmitted(true);
  };

  if (loading) return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title="Продвижение в рейтинге" />
        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8">
          <button onClick={() => router.push('/reyting')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5">
            <ArrowLeft className="w-4 h-4" /> К рейтингу
          </button>

          {error ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-600">{error}</div>
          ) : activeEntry ? (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Вы продвигаетесь на месте №{activeEntry.rank_position}</h1>
              <p className="text-sm text-gray-500">Размещение активно до {new Date(activeEntry.paid_until).toLocaleDateString('ru-RU')}</p>
              <p className="text-xs text-gray-400 mt-2">Чтобы продлить после этой даты, вернитесь на эту страницу ближе к сроку.</p>
            </div>
          ) : pendingRequest ? (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
              <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Заявка на рассмотрении</h1>
              <p className="text-sm text-gray-500">
                Тариф: {pendingRequest.period_months} мес · {Number(pendingRequest.amount).toLocaleString('ru-RU')} ₸.
                Мы активируем место после проверки оплаты.
              </p>
            </div>
          ) : submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Заявка отправлена</h1>
              <p className="text-sm text-gray-500">После оплаты и проверки мы разместим вас в рейтинге с пометкой «Продвигается».</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-7 h-7 text-violet-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Продвижение в рейтинге</h1>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Место с 4-го — видно на публичной странице /reyting, честно помечено «Продвигается» (не выдаётся за заслуженное топ-3).
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {PLANS.map((plan, i) => (
                  <button key={i} onClick={() => setSelectedPlan(i)}
                    className={`relative text-left p-4 rounded-2xl border-2 transition-all ${selectedPlan === i ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    {plan.badge && <span className="absolute -top-2 right-3 text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold">{plan.badge}</span>}
                    <p className="text-sm text-gray-500">{plan.label}</p>
                    <p className="text-2xl font-extrabold text-gray-900">{plan.price.toLocaleString('ru-RU')} ₸</p>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm p-6">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

                <div className="bg-gray-50 rounded-xl p-4 mb-3 text-center">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Оплата через Kaspi QR</p>
                  <img src="/images/kaspi-qr.png" alt="Kaspi QR" className="w-full max-w-[200px] rounded-xl mx-auto" />
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Или по реквизитам</p>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Компания</span><span className="font-medium text-right">ТОО "BUHTASK"</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">БИН</span><span className="font-medium">260540009678</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Банк</span><span className="font-medium text-right">АО "Kaspi Bank"</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">КБе</span><span className="font-medium">17</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">БИК</span><span className="font-medium">CASPKZKA</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Счёт (IBAN)</span><span className="font-medium">KZ45722S000054326792</span></div>
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Сумма</span><span className="font-bold">{PLANS[selectedPlan].price.toLocaleString('ru-RU')} ₸</span></div>
                  </div>
                </div>

                <button onClick={submit} disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Отправка…' : 'Я оплатил — отправить заявку'}
                </button>
                <p className="text-xs text-gray-400 text-center mt-3">Место появится на /reyting после проверки поступления администратором.</p>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
