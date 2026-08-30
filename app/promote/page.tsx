'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import { CheckCircle2, Clock, Loader2, ArrowLeft, Gavel } from 'lucide-react';

const MIN_BID = 5000;
const DURATIONS = [
  { months: 1, label: '1 месяц' },
  { months: 3, label: '3 месяца' },
];

export default function PromotePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [activeBids, setActiveBids] = useState<{ paid_amount: number }[]>([]);
  const [periodMonths, setPeriodMonths] = useState(1);
  const [amount, setAmount] = useState(MIN_BID);
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
        supabase.from('contest_entries').select('paid_amount, paid_until').eq('badge_type', 'promoted').eq('published', true),
      ]);

      if (entry && entry.paid_until && new Date(entry.paid_until) > new Date()) setActiveEntry(entry);
      setPendingRequest(req || null);

      const now = new Date();
      const active = (bids || []).filter(b => b.paid_amount != null && b.paid_until && new Date(b.paid_until) > now);
      setActiveBids(active as any);
      // По умолчанию предлагаем сумму чуть выше текущего лидера — чтобы одним кликом претендовать на 4-е место
      const leader = active.length ? Math.max(...active.map(b => Number(b.paid_amount))) : 0;
      setAmount(Math.max(MIN_BID, leader + 1000));

      setLoading(false);
    })();
  }, [router]);

  const sortedAmounts = useMemo(() => activeBids.map(b => Number(b.paid_amount)).sort((a, b) => b - a), [activeBids]);
  const estimatedRank = useMemo(() => 4 + sortedAmounts.filter(a => a >= amount).length, [sortedAmounts, amount]);
  const leaderAmount = sortedAmounts[0] || 0;
  const lowestAmount = sortedAmounts[sortedAmounts.length - 1] || 0;

  const submit = async () => {
    setError('');
    if (amount < MIN_BID) { setError(`Минимальная ставка — ${MIN_BID.toLocaleString('ru-RU')} ₸`); return; }
    setSubmitting(true);
    const { error: e } = await supabase.from('promotion_requests').insert({
      accountant_id: userId, full_name: profile?.full_name || null, avatar_url: profile?.avatar_url || null,
      city: profile?.city || null, period_months: periodMonths, amount, status: 'pending',
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
              <p className="text-sm text-gray-500">
                Ваша ставка: {Number(activeEntry.paid_amount || 0).toLocaleString('ru-RU')} ₸ · активна до {new Date(activeEntry.paid_until).toLocaleDateString('ru-RU')}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Если кто-то предложит больше — вы автоматически опуститесь на следующее место, но останетесь в списке до конца срока.
                Чтобы поднять ставку прямо сейчас, подайте новую заявку с суммой выше текущей.
              </p>
            </div>
          ) : pendingRequest ? (
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center">
              <Clock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h1 className="text-xl font-bold text-gray-900 mb-1">Заявка на рассмотрении</h1>
              <p className="text-sm text-gray-500">
                Ставка: {Number(pendingRequest.amount).toLocaleString('ru-RU')} ₸ · {pendingRequest.period_months} мес.
                Мы разместим вас после проверки оплаты.
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
                  <Gavel className="w-7 h-7 text-violet-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Аукцион на повышение</h1>
                <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  Место с 4-го определяется суммой ставки: кто предложил больше — тот выше. Если вашу ставку
                  перебьют, вы автоматически опуститесь на следующее место, но останетесь в списке до конца
                  оплаченного периода. Честно помечено «Продвигается» — не выдаётся за заслуженное топ-3.
                </p>
              </div>

              {sortedAmounts.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 flex items-center justify-around text-center">
                  <div>
                    <p className="text-xs text-gray-400">Текущий лидер (место 4)</p>
                    <p className="text-lg font-bold text-gray-900">{leaderAmount.toLocaleString('ru-RU')} ₸</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100" />
                  <div>
                    <p className="text-xs text-gray-400">Минимальная активная ставка</p>
                    <p className="text-lg font-bold text-gray-900">{lowestAmount.toLocaleString('ru-RU')} ₸</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border-2 border-violet-200 shadow-sm p-6">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ваша ставка, ₸</label>
                <input type="number" min={MIN_BID} step={500} value={amount} onChange={e => setAmount(Number(e.target.value) || 0)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-xl font-bold outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 mb-1" />
                <p className="text-xs text-gray-400 mb-4">Минимум {MIN_BID.toLocaleString('ru-RU')} ₸</p>

                <div className="bg-violet-50 rounded-xl p-3 mb-4 text-center">
                  <p className="text-xs text-violet-600">При такой ставке вы предположительно займёте место</p>
                  <p className="text-2xl font-extrabold text-violet-700">№{estimatedRank}</p>
                  <p className="text-[11px] text-violet-400 mt-0.5">Ориентировочно — точное место определится после одобрения заявки администратором</p>
                </div>

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
                    <div className="flex justify-between gap-2"><span className="text-gray-400">Сумма</span><span className="font-bold">{amount.toLocaleString('ru-RU')} ₸</span></div>
                  </div>
                </div>

                <button onClick={submit} disabled={submitting || amount < MIN_BID}
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
