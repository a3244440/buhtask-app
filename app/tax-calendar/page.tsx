'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Calendar, Bell, BellOff, ChevronLeft, ChevronRight, Info, CheckCircle2 } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';

interface TaxEvent { key: string; title: string; desc: string; type: 'monthly' | 'quarterly' | 'yearly' | 'halfyear'; day: number; months: number[]; who: string; }

const TAX_EVENTS: TaxEvent[] = [
  { key: 'ipn_son', title: 'ИПН, СН, ОПВ, СО, ОСМС', desc: 'Уплата индивидуального подоходного налога, социального налога, пенсионных и социальных отчислений за сотрудников', type: 'monthly', day: 25, months: [1,2,3,4,5,6,7,8,9,10,11,12], who: 'Работодатели' },
  { key: 'nds_import', title: 'НДС по импорту ЕАЭС (ФНО 320.00)', desc: 'Декларация и уплата косвенных налогов при импорте из ЕАЭС', type: 'monthly', day: 20, months: [1,2,3,4,5,6,7,8,9,10,11,12], who: 'Импортёры из ЕАЭС' },
  { key: 'fno_200', title: 'ФНО 200.00 (ИПН и соцналог)', desc: 'Квартальная декларация по ИПН и социальному налогу', type: 'quarterly', day: 15, months: [2,5,8,11], who: 'ИП на ОУР, ТОО' },
  { key: 'fno_300', title: 'ФНО 300.00 (НДС)', desc: 'Квартальная декларация по НДС. Подаётся не раньше 15 числа месяца после квартала', type: 'quarterly', day: 15, months: [2,5,8,11], who: 'Плательщики НДС' },
  { key: 'fno_101_04', title: 'ФНО 101.04 (КПН у источника)', desc: 'Расчёт по КПН, удержанному у источника выплаты', type: 'quarterly', day: 15, months: [2,5,8,11], who: 'ТОО' },
  { key: 'fno_910', title: 'ФНО 910.00 (упрощёнка)', desc: 'Упрощённая декларация для малого бизнеса на СНР. Сдаётся за полугодие', type: 'halfyear', day: 15, months: [2,8], who: 'ИП и ТОО на упрощёнке' },
  { key: 'fno_100', title: 'ФНО 100.00 (КПН годовая)', desc: 'Годовая декларация по корпоративному подоходному налогу', type: 'yearly', day: 31, months: [3], who: 'ТОО на ОУР' },
  { key: 'fno_220', title: 'ФНО 220.00 (ИПН годовая)', desc: 'Годовая декларация по индивидуальному подоходному налогу', type: 'yearly', day: 31, months: [3], who: 'ИП на ОУР' },
  { key: 'fno_250', title: 'ФНО 250.00 (декларация об активах)', desc: 'Декларация об активах и обязательствах физического лица', type: 'yearly', day: 15, months: [9], who: 'Всеобщее декларирование' },
];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const HOLIDAYS_2026 = new Set(['2026-01-01','2026-01-02','2026-01-07','2026-03-08','2026-03-21','2026-03-22','2026-03-23','2026-03-24','2026-03-25','2026-05-01','2026-05-07','2026-05-09','2026-07-06','2026-08-30','2026-12-01','2026-12-16','2026-12-17']);

function toISO(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function adjustForWeekend(year: number, month: number, day: number): Date {
  let d = new Date(year, month - 1, day);
  while (d.getDay() === 0 || d.getDay() === 6 || HOLIDAYS_2026.has(toISO(d))) d.setDate(d.getDate() + 1);
  return d;
}

export default function TaxCalendarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const year = 2026;

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const { data } = await supabase.from('tax_reminders').select('event_key').eq('user_id', user.id).eq('enabled', true);
    setReminders(new Set((data || []).map((r: any) => r.event_key)));
    setLoading(false);
  };

  const monthEvents = TAX_EVENTS
    .filter(e => e.months.includes(currentMonth + 1))
    .map(e => { const date = adjustForWeekend(year, currentMonth + 1, e.day); return { ...e, date, iso: toISO(date) }; })
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const toggleReminder = async (eventKey: string, title: string, iso: string) => {
    const reminderKey = `${eventKey}_${iso}`;
    if (reminders.has(reminderKey)) {
      await supabase.from('tax_reminders').delete().eq('user_id', userId).eq('event_key', reminderKey);
      setReminders(prev => { const n = new Set(prev); n.delete(reminderKey); return n; });
    } else {
      await supabase.from('tax_reminders').insert({ user_id: userId, event_key: reminderKey, event_title: title, event_date: iso, enabled: true });
      setReminders(prev => new Set(prev).add(reminderKey));
    }
  };

  const today = new Date();
  const isToday = (d: Date) => toISO(d) === toISO(today);
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const typeColors: Record<string, string> = { monthly: 'bg-blue-50 text-blue-700 border-blue-200', quarterly: 'bg-violet-50 text-violet-700 border-violet-200', halfyear: 'bg-amber-50 text-amber-700 border-amber-200', yearly: 'bg-rose-50 text-rose-700 border-rose-200' };
  const typeLabels: Record<string, string> = { monthly: 'Ежемесячно', quarterly: 'Квартал', halfyear: 'Полугодие', yearly: 'Год' };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title="Налоговый календарь" />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Налоговый календарь {year}</h1>
          <p className="text-sm text-gray-500">Сроки сдачи отчётности и уплаты налогов в Казахстане</p>
        </div>

        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
          <button onClick={() => setCurrentMonth(m => (m + 11) % 12)} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
          <h2 className="font-bold text-lg text-gray-900">{MONTHS_RU[currentMonth]} {year}</h2>
          <button onClick={() => setCurrentMonth(m => (m + 1) % 12)} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
        </div>

        {monthEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
            <p className="text-gray-400">В этом месяце нет налоговых событий</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthEvents.map(e => {
              const reminderKey = `${e.key}_${e.iso}`;
              const hasReminder = reminders.has(reminderKey);
              const days = daysUntil(e.date);
              const urgent = days >= 0 && days <= 5;
              return (
                <div key={e.key} className={`bg-white rounded-2xl border shadow-sm p-5 ${isToday(e.date) ? 'border-blue-400 ring-1 ring-blue-100' : urgent ? 'border-amber-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${urgent ? 'bg-amber-100' : 'bg-gray-50'}`}>
                        <span className={`text-lg font-extrabold ${urgent ? 'text-amber-700' : 'text-gray-700'}`}>{e.date.getDate()}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{MONTHS_RU[e.date.getMonth()].slice(0,3)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{e.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeColors[e.type]}`}>{typeLabels[e.type]}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{e.desc}</p>
                        <p className="text-xs text-gray-400 mt-1.5">👤 {e.who}</p>
                        {days >= 0 && (
                          <p className={`text-xs mt-1.5 font-medium ${urgent ? 'text-amber-600' : 'text-gray-400'}`}>
                            {days === 0 ? '⚠️ Сегодня крайний срок!' : days === 1 ? 'Завтра' : `Через ${days} дн.`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => toggleReminder(e.key, e.title, e.iso)}
                      className={`p-2.5 rounded-xl flex-shrink-0 transition-colors ${hasReminder ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                      {hasReminder ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="mb-1">Если крайний срок выпадает на выходной или праздник — он переносится на следующий рабочий день (уже учтено в датах).</p>
            <p>Включите 🔔 напоминание, чтобы не пропустить срок. Календарь справочный — уточняйте сроки у вашего бухгалтера.</p>
          </div>
        </div>
      </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
