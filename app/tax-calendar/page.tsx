'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Calendar, Bell, BellOff, ChevronLeft, ChevronRight, Info, CheckCircle2 } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';
import ReportingBanner from '../components/ReportingBanner';

interface TaxEvent { key: string; title: string; desc: string; type: 'monthly' | 'quarterly' | 'yearly' | 'halfyear'; day: number; months: number[]; who: string; }

const TAX_EVENTS: TaxEvent[] = [
  { key: 'ipn_son', title: 'ИПН, СН, ОПВ, СО, ОСМС', desc: 'Уплата индивидуального подоходного налога, социального налога, пенсионных и социальных отчислений за сотрудников', type: 'monthly', day: 25, months: [1,2,3,4,5,6,7,8,9,10,11,12], who: 'tax.who.employers' },
  { key: 'nds_import', title: 'НДС по импорту ЕАЭС (ФНО 320.00)', desc: 'Декларация и уплата косвенных налогов при импорте из ЕАЭС', type: 'monthly', day: 20, months: [1,2,3,4,5,6,7,8,9,10,11,12], who: 'tax.who.importers' },
  { key: 'fno_200', title: 'ФНО 200.00 (ИПН и соцналог)', desc: 'Квартальная декларация по ИПН и социальному налогу', type: 'quarterly', day: 15, months: [2,5,8,11], who: 'tax.who.ipOurToo' },
  { key: 'fno_300', title: 'ФНО 300.00 (НДС)', desc: 'Квартальная декларация по НДС. Подаётся не раньше 15 числа месяца после квартала', type: 'quarterly', day: 15, months: [2,5,8,11], who: 'tax.who.vatPayers' },
  { key: 'fno_101_04', title: 'ФНО 101.04 (КПН у источника)', desc: 'Расчёт по КПН, удержанному у источника выплаты', type: 'quarterly', day: 15, months: [2,5,8,11], who: 'tax.who.too' },
  { key: 'fno_910', title: 'ФНО 910.00 (упрощёнка)', desc: 'Упрощённая декларация для малого бизнеса на СНР. Сдаётся за полугодие', type: 'halfyear', day: 15, months: [2,8], who: 'tax.who.simplified' },
  { key: 'fno_100', title: 'ФНО 100.00 (КПН годовая)', desc: 'Годовая декларация по корпоративному подоходному налогу', type: 'yearly', day: 31, months: [3], who: 'tax.who.tooOur' },
  { key: 'fno_220', title: 'ФНО 220.00 (ИПН годовая)', desc: 'Годовая декларация по индивидуальному подоходному налогу', type: 'yearly', day: 31, months: [3], who: 'tax.who.ipOur' },
  { key: 'fno_250', title: 'ФНО 250.00 (декларация об активах)', desc: 'Декларация об активах и обязательствах физического лица', type: 'yearly', day: 15, months: [9], who: 'tax.who.universal' },
];

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const HOLIDAYS_2026 = new Set(['2026-01-01','2026-01-02','2026-01-07','2026-03-08','2026-03-09','2026-03-21','2026-03-22','2026-03-23','2026-03-24','2026-03-25','2026-05-01','2026-05-07','2026-05-09','2026-05-11','2026-05-27','2026-07-06','2026-08-30','2026-08-31','2026-10-25','2026-10-26','2026-12-16']);

// Названия праздников РК 2026
const HOLIDAY_NAMES: Record<string, string> = {
  '2026-01-01': 'Новый год', '2026-01-02': 'Новый год', '2026-01-07': 'Рождество Христово',
  '2026-03-08': 'Международный женский день', '2026-03-09': 'Перенос (8 марта)',
  '2026-03-21': 'Наурыз', '2026-03-22': 'Наурыз', '2026-03-23': 'Наурыз', '2026-03-24': 'Перенос (Наурыз)', '2026-03-25': 'Перенос (Наурыз)',
  '2026-05-01': 'Праздник единства народа', '2026-05-07': 'День защитника Отечества',
  '2026-05-09': 'День Победы', '2026-05-11': 'Перенос (9 мая)', '2026-05-27': 'Курбан-айт',
  '2026-07-06': 'День столицы',
  '2026-08-30': 'День Конституции', '2026-08-31': 'Перенос (30 августа)',
  '2026-10-25': 'День Республики', '2026-10-26': 'Перенос (25 октября)',
  '2026-12-16': 'День Независимости',
};

function toISO(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function adjustForWeekend(year: number, month: number, day: number): Date {
  let d = new Date(year, month - 1, day);
  while (d.getDay() === 0 || d.getDay() === 6 || HOLIDAYS_2026.has(toISO(d))) d.setDate(d.getDate() + 1);
  return d;
}

export default function TaxCalendarPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [reminders, setReminders] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedISO, setSelectedISO] = useState<string | null>(null);
  const [yearView, setYearView] = useState(true); // показывать весь год
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

  // Карта: iso-дата → события (дедлайны), для подсветки в сетке
  const eventsByDate: Record<string, typeof monthEvents> = {};
  monthEvents.forEach(e => { (eventsByDate[e.iso] = eventsByDate[e.iso] || []).push(e); });

  // Построение сетки месяца (недели по 7 дней, понедельник первый)
  const buildGrid = () => {
    const first = new Date(year, currentMonth, 1);
    const startDow = (first.getDay() + 6) % 7; // 0=Пн
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const cells: ({ day: number; iso: string } | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, iso: toISO(new Date(year, currentMonth, d)) });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };
  const grid = buildGrid();
  const selectedEvents = selectedISO ? (eventsByDate[selectedISO] || []) : [];
  const isHoliday = (iso: string) => HOLIDAYS_2026.has(iso);
  const isWeekend = (iso: string) => { const d = new Date(iso); return d.getDay() === 0 || d.getDay() === 6; };

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
  const typeLabels: Record<string, string> = { monthly: t('tax.monthly'), quarterly: t('tax.quarterly'), halfyear: t('tax.halfyear'), yearly: t('tax.yearly') };

  // Даты дедлайнов для любого месяца (для годового вида)
  const eventsForMonth = (m: number) => {
    const evs = TAX_EVENTS.filter(e => e.months.includes(m + 1))
      .map(e => { const date = adjustForWeekend(year, m + 1, e.day); return { ...e, date, iso: toISO(date) }; })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const byDate: Record<string, boolean> = {};
    evs.forEach(e => { byDate[e.iso] = true; });
    return { evs, byDate };
  };

  // Мини-сетка месяца для годового вида
  const buildMiniGrid = (m: number) => {
    const first = new Date(year, m, 1);
    const startDow = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('tax.title')} />
        <main className={`${yearView ? 'max-w-6xl' : 'max-w-3xl'} mx-auto px-4 sm:px-6 py-8`}>
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> {t('tax.title')} {year}</h1>
          <p className="text-sm text-gray-500">{t('tax.subtitle')}</p>
        </div>

        <ReportingBanner />

        {/* Переключатель Год / Месяц */}
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setYearView(true)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${yearView ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t('tax.yearView')}</button>
          <button onClick={() => setYearView(false)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!yearView ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{t('tax.monthView')}</button>
        </div>

        {/* ГОДОВОЙ ВИД */}
        {yearView && (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {MONTHS_RU.map((_, m) => {
                const { evs, byDate } = eventsForMonth(m);
                const mini = buildMiniGrid(m);
                const isCurrentMonth = m === new Date().getMonth();
                return (
                  <div key={m} className={`bg-white rounded-2xl border shadow-sm p-3 ${isCurrentMonth ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-100'}`}>
                    <h3 className="font-bold text-sm text-gray-900 mb-2 text-center">{t('month.' + m)}</h3>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {['tax.wd.mon','tax.wd.tue','tax.wd.wed','tax.wd.thu','tax.wd.fri','tax.wd.sat','tax.wd.sun'].map((k, i) => (
                        <div key={k} className={`text-center text-[8px] font-semibold ${i >= 5 ? 'text-red-400' : 'text-gray-300'}`}>{t(k)}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {mini.map((d, i) => {
                        if (!d) return <div key={i} />;
                        const iso = toISO(new Date(year, m, d));
                        const hasEvents = byDate[iso];
                        const holiday = HOLIDAYS_2026.has(iso);
                        const dow = new Date(year, m, d).getDay();
                        const weekend = dow === 0 || dow === 6;
                        const today = iso === toISO(new Date());
                        return (
                          <div key={i} title={HOLIDAY_NAMES[iso] || ''}
                            className={`relative h-6 rounded flex items-center justify-center text-[10px]
                              ${hasEvents ? 'bg-blue-600 text-white font-bold' :
                                today ? 'bg-gray-200 text-gray-900 font-bold' :
                                (holiday || weekend) ? 'text-red-400' : 'text-gray-600'}`}>
                            {d}
                            {holiday && !hasEvents && <span className="absolute bottom-0 right-0.5 w-1 h-1 bg-red-400 rounded-full" />}
                          </div>
                        );
                      })}
                    </div>
                    {/* Дедлайны месяца */}
                    {evs.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                        {evs.map((e, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                            <span className="text-gray-500">{e.date.getDate()} — {e.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Легенда */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 bg-white rounded-2xl border border-gray-100 p-3 mb-4">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-600 rounded" /> {t('tax.legendDeadline')}</span>
              <span className="flex items-center gap-1.5"><span className="text-red-400 font-bold">##</span> {t('tax.legendHoliday')}</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-200 rounded" /> {t('tax.legendToday')}</span>
            </div>
          </>
        )}

        {!yearView && (
        <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-3 max-w-sm mx-auto">
          <button onClick={() => { setCurrentMonth(m => (m + 11) % 12); setSelectedISO(null); }} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
          <h2 className="font-bold text-lg text-gray-900">{t('month.' + currentMonth)} {year}</h2>
          <button onClick={() => { setCurrentMonth(m => (m + 1) % 12); setSelectedISO(null); }} className="p-2 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
        </div>
        )}

        {!yearView && (<>
        {/* Сетка-календарь */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 mb-3 max-w-sm mx-auto">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['tax.wd.mon','tax.wd.tue','tax.wd.wed','tax.wd.thu','tax.wd.fri','tax.wd.sat','tax.wd.sun'].map((k, i) => (
              <div key={k} className={`text-center text-[10px] font-semibold py-0.5 ${i >= 5 ? 'text-red-400' : 'text-gray-400'}`}>{t(k)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell, i) => {
              if (!cell) return <div key={i} />;
              const evs = eventsByDate[cell.iso] || [];
              const hasEvents = evs.length > 0;
              const today = isToday(new Date(cell.iso));
              const selected = selectedISO === cell.iso;
              const weekend = isWeekend(cell.iso);
              const holiday = isHoliday(cell.iso);
              return (
                <button key={i} onClick={() => setSelectedISO(cell.iso)}
                  className={`relative h-9 rounded-lg flex items-center justify-center text-xs transition-all
                    ${selected ? 'bg-blue-600 text-white font-bold shadow-md' :
                      hasEvents ? 'bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100' :
                      today ? 'bg-gray-100 text-gray-900 font-semibold' :
                      'hover:bg-gray-50 ' + (holiday || weekend ? 'text-red-400' : 'text-gray-600')}`}>
                  <span>{cell.day}</span>
                  {today && !selected && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />}
                  {hasEvents && (
                    <span className="absolute top-1 right-1 flex gap-0.5">
                      {evs.slice(0, 3).map((e, j) => (
                        <span key={j} className={`w-1 h-1 rounded-full ${selected ? 'bg-white' : (e.type === 'monthly' ? 'bg-blue-400' : e.type === 'quarterly' ? 'bg-violet-400' : e.type === 'halfyear' ? 'bg-amber-400' : 'bg-rose-400')}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Панель выбранной даты */}
        {selectedISO && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 mb-3">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">
                {t('tax.eventsOn')} {new Date(selectedISO).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                {isToday(new Date(selectedISO)) && <span className="ml-2 text-[10px] px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">{t('tax.todayLabel')}</span>}
              </h3>
            </div>
            {selectedEvents.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">{t('tax.noEventsOnDate')}</p>
                {(isHoliday(selectedISO) || isWeekend(selectedISO)) && <p className="text-xs text-red-300 mt-1">{t('tax.holiday')}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map(e => {
                  const reminderKey = `${e.key}_${e.iso}`;
                  const hasReminder = reminders.has(reminderKey);
                  return (
                    <div key={e.key} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full font-medium">⏰ {t('tax.deadline')}</span>
                            <h4 className="font-semibold text-gray-900 text-sm">{e.title}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeColors[e.type]}`}>{typeLabels[e.type]}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('tax.d.' + e.key)}</p>
                          <p className="text-xs text-gray-400 mt-1">👤 {t(e.who)}</p>
                        </div>
                        <button onClick={() => toggleReminder(e.key, e.title, e.iso)}
                          className={`p-2 rounded-xl flex-shrink-0 transition-colors ${hasReminder ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>
                          {hasReminder ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Список всех событий месяца */}
        {monthEvents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
            <p className="text-gray-400">{t('tax.noEvents')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monthEvents.map(e => {
              const reminderKey = `${e.key}_${e.iso}`;
              const hasReminder = reminders.has(reminderKey);
              const days = daysUntil(e.date);
              const urgent = days >= 0 && days <= 5;
              return (
                <div key={e.key} onClick={() => setSelectedISO(e.iso)} className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow ${isToday(e.date) ? 'border-blue-400 ring-1 ring-blue-100' : urgent ? 'border-amber-200' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 ${urgent ? 'bg-amber-100' : 'bg-gray-50'}`}>
                        <span className={`text-lg font-extrabold ${urgent ? 'text-amber-700' : 'text-gray-700'}`}>{e.date.getDate()}</span>
                        <span className="text-[10px] text-gray-400 uppercase">{t('month.' + e.date.getMonth()).slice(0,3)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 text-sm">{e.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeColors[e.type]}`}>{typeLabels[e.type]}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t('tax.d.' + e.key)}</p>
                        <p className="text-xs text-gray-400 mt-1.5">👤 {t(e.who)}</p>
                        {days >= 0 && (
                          <p className={`text-xs mt-1.5 font-medium ${urgent ? 'text-amber-600' : 'text-gray-400'}`}>
                            {days === 0 ? t('tax.todayDeadline') : days === 1 ? t('tax.tomorrow') : `${t('tax.inDays')} ${days} ${t('tax.daysShort')}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={(ev) => { ev.stopPropagation(); toggleReminder(e.key, e.title, e.iso); }}
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
            <p className="mb-1">{t('tax.infoWeekend')}</p>
            <p>{t('tax.infoReminder')}</p>
          </div>
        </div>
        </>)}
      </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
