'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { CheckCircle2, Clock, Loader2, ArrowLeft, TrendingUp, ArrowUp } from 'lucide-react';

const BASE_PRICE = 20000;   // цена занять свободное место с нуля
const INCREMENT = 10000;    // на столько дороже стоит перебить текущего занимающего место
const DURATIONS = [
  { months: 1, label: '1 месяц' },
  { months: 3, label: '3 месяца' },
];

interface Slot { rank: number; price: number; holderName: string | null; }

export default function PromotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [occupied, setOccupied] = useState<{ rank_position: number; paid_amount: number; full_name: string | null }[]>([]);
  const [periodMonths, setPeriodMonths] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
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

      const [{ data: entry }, { data: req }, { data: bids }] = await Promise.all([
        supabase.from('contest_entries').select('*').eq('accountant_id', user.id).eq('badge_type', 'promoted').maybeSingle(),
        supabase.from('promotion_requests').select('*').eq('accountant_id', user.id).eq('status', 'pending').order('requested_at', { ascending: false }).maybeSingle(),
        supabase.from('contest_entries').select('rank_position, paid_amount, paid_until, full_name').eq('badge_type', 'promoted').eq('published', true).order('rank_position', { ascending: true }),
      ]);

      if (entry && entry.paid_until && new Date(entry.paid_until) > new Date()) setActiveEntry(entry);
      setPendingRequest(req || null);

      const now = new Date();
      const active = (bids || []).filter(b => b.paid_amount != null && b.paid_until && new Date(b.paid_until) > now);
      setOccupied(active as any);

      setLoading(false);
    })();
  }, [router]);

  // Лестница мест: каждое занятое место стоит (текущая ставка + 10 000 ₸), чтобы перебить;
  // первое свободное место после занятых стоит базовую цену 20 000 ₸.
  const ladder: Slot[] = useMemo(() => {
    const slots: Slot[] = occupied.map(e => ({
      rank: e.rank_position, price: Number(e.paid_amount) + INCREMENT, holderName: e.full_name,
    }));
    const nextRank = occupied.length ? Math.max(...occupied.map(e => e.rank_position)) + 1 : 4;
    slots.push({ rank: nextRank, price: BASE_PRICE, holderName: null });
    return slots;
  }, [occupied]);

  const submit = async () => {
    if (!selectedSlot) { setError('Выберите место'); return; }
    setError('');
    setSubmitting(true);
    const { error: e } = await supabase.from('promotion_requests').insert({
      accountant_id: userId, full_name: profile?.full_name || null, avatar_url: profile?.avatar_url || null,
      city: profile?.city || null, period_months: periodMonths, amount: selectedSlot.price, status: 'pending',
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

          {error && !selectedSlot ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-600">{error}</div>
          ) : activeEntry ? (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Вы продвигаетесь на месте №{activeEntry.rank_position}</h1>
              <p className="text-sm text-gray-500">
                Ваша ставка: {Number(activeEntry.paid_amount || 0).toLocaleString('ru-RU')} ₸ · активна до {new Date(activeEntry.paid_until).toLocaleDateString('ru-RU')}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Если кто-то перебьёт вашу ставку — вы автоматически опуститесь на следующее место, но останетесь в списке до конца срока.
              </p>
            </div>
          ) : pendingRequest ? (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
              <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Заявка на рассмотрении</h1>
              <p className="text-sm text-gray-500">
                Сумма: {Number(pendingRequest.amount).toLocaleString('ru-RU')} ₸ · {pendingRequest.period_months} мес.
                Мы разместим вас после проверки оплаты.
              </p>
            </div>
          ) : submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Заявка отправлена</h1>
              <p className="text-sm text-gray-500">После оплаты и проверки мы разместим вас в рейтинге с пометкой «Продвигается».</p>
            </div>
          ) : !selectedSlot ? (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-7 h-7 text-violet-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Купить место в рейтинге</h1>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Выберите место — цена растёт на {INCREMENT.toLocaleString('ru-RU')} ₸ каждый раз, когда его перекупают.
                  Если вашу ставку перебьют, вы опуститесь на следующее место, но останетесь в списке до конца срока.
                </p>
              </div>

              <div className="space-y-2.5">
                {ladder.map(slot => (
                  <button key={slot.rank} onClick={() => setSelectedSlot(slot)}
                    className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl border-2 border-gray-100 hover:border-violet-300 shadow-sm p-4 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold flex-shrink-0">
                        {slot.rank}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {slot.holderName ? `Перебить ${slot.holderName}` : 'Свободное место'}
                        </p>
                        <p className="text-xs text-gray-400">Место №{slot.rank}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-lg font-extrabold text-violet-700">{slot.price.toLocaleString('ru-RU')} ₸</p>
                      <ArrowUp className="w-4 h-4 text-violet-400" />
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center mt-4">Честно помечено «Продвигается» на публичной странице — не выдаётся за заслуженное топ-3.</p>
            </>
          ) : (
            <>
              <button onClick={() => setSelectedSlot(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-3">← Выбрать другое место</button>

              <div className="bg-violet-50 rounded-2xl p-4 mb-4 text-center">
                <p className="text-xs text-violet-600">Место №{selectedSlot.rank}{selectedSlot.holderName ? ` — перебить ${selectedSlot.holderName}` : ' — свободно'}</p>
                <p className="text-3xl font-extrabold text-violet-700 mt-1">{selectedSlot.price.toLocaleString('ru-RU')} ₸</p>
              </div>

              <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm p-6">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Срок размещения</label>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {DURATIONS.map(d => (
                    <button key={d.months} onClick={() => setPeriodMonths(d.months)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${periodMonths === d.months ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>

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
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Сумма</span><span className="font-bold">{selectedSlot.price.toLocaleString('ru-RU')} ₸</span></div>
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
