"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import NavWrapper from "./components/NavWrapper";
import { useI18n } from "@/lib/i18n";
import {
  Calculator, FileText, Users, Building2, Search, Star,
  ArrowRight, ChevronRight, Briefcase, TrendingUp, Shield,
  Clock, MapPin, Zap, DollarSign, BarChart2, Moon, Sun, Mail,
  CalendarDays, Baby, AlertTriangle, BookOpen, Scale, BarChart3, SearchCheck,
} from "lucide-react";
import Reveal from "./components/Reveal";
import KazakhstanRankingMap from "./components/KazakhstanRankingMap";

const TYPING_WORDS: Record<string, string[]> = {
  ru: ["Открыть ТОО", "Закрыть ТОО", "Сдать отчёт 910 ФНО", "Расчёт зарплаты сотрудника", "Ведение бухгалтерии", "Консультация по НДС", "Регистрация ИП", "Налоговый аудит"],
  kz: ["ЖШС ашу", "ЖШС жабу", "910 ФНО есебін тапсыру", "Қызметкер жалақысын есептеу", "Бухгалтерлік есеп жүргізу", "ҚҚС бойынша кеңес", "ЖК тіркеу", "Салықтық аудит"],
  en: ["Open an LLP", "Close an LLP", "File 910 tax report", "Employee payroll calculation", "Bookkeeping", "VAT consultation", "Register sole prop", "Tax audit"],
};
const STATS = [
  { value: "500+", key: "land.statAccountants" },
  { value: "2 000+", key: "land.statTasks" },
  { value: "20+", key: "land.statServices" },
  { value: "17", key: "land.statRegions" },
];
const TOOLS = [
  { href: '/income-910', icon: Calculator, title: 'inc910.shortTitle', desc: 'inc910.toolsDesc', color: 'bg-blue-100 text-blue-600', badge: true },
  { href: '/tax-calendar', icon: CalendarDays, title: 'tools.taxCalendar', desc: 'tax.subtitle', color: 'bg-indigo-100 text-indigo-600', badge: false },
  { href: '/salary-calculator', icon: Calculator, title: 'tools.salaryCalc', desc: 'tools.salaryCalcDesc', color: 'bg-emerald-100 text-emerald-600', badge: false },
  { href: '/maternity-calculator', icon: Baby, title: 'mat.title', desc: 'mat.toolsDesc', color: 'bg-pink-100 text-pink-600', badge: true },
  { href: '/penalty-calculator', icon: AlertTriangle, title: 'pen.title', desc: 'pen.toolsDesc', color: 'bg-amber-100 text-amber-600', badge: true },
  { href: '/reference', icon: BookOpen, title: 'ref.title', desc: 'ref.toolsDesc', color: 'bg-sky-100 text-sky-600', badge: true },
  { href: '/bin-check', icon: SearchCheck, title: 'bin.title', desc: 'bin.toolsDesc', color: 'bg-blue-100 text-blue-600', badge: true },
  { href: '/reconciliation-act', icon: Scale, title: 'act.title', desc: 'act.toolsDesc', color: 'bg-violet-100 text-violet-600', badge: true },
  { href: '/documents', icon: FileText, title: 'tools.documents', desc: 'tools.documentsDesc', color: 'bg-blue-100 text-blue-600', badge: false },
  { href: '/counterparties', icon: Users, title: 'tools.counterparties', desc: 'tools.counterpartiesDesc', color: 'bg-teal-100 text-teal-600', badge: false },
  { href: '/companies', icon: Building2, title: 'tools.companies', desc: 'tools.companiesDesc', color: 'bg-cyan-100 text-cyan-600', badge: false },
  { href: '/finance', icon: BarChart3, title: 'tools.finance', desc: 'tools.financeDesc', color: 'bg-emerald-100 text-emerald-600', badge: false },
];

const CATEGORIES = [
  { icon: FileText, key: "cat.taxReport", color: "text-blue-600", bg: "bg-blue-50", darkBg: "dark:bg-blue-900/30", hot: false },
  { icon: Building2, key: "cat.construction", color: "text-orange-600", bg: "bg-orange-50", darkBg: "dark:bg-orange-900/30", hot: true },
  { icon: DollarSign, key: "cat.maternity", color: "text-pink-600", bg: "bg-pink-50", darkBg: "dark:bg-pink-900/30", hot: true },
  { icon: DollarSign, key: "cat.salary", color: "text-emerald-600", bg: "bg-emerald-50", darkBg: "dark:bg-emerald-900/30", hot: false },
  { icon: Building2, key: "cat.register", color: "text-violet-600", bg: "bg-violet-50", darkBg: "dark:bg-violet-900/30", hot: false },
  { icon: BarChart2, key: "cat.audit", color: "text-amber-600", bg: "bg-amber-50", darkBg: "dark:bg-amber-900/30", hot: false },
  { icon: FileText, key: "cat.kgdNotice", color: "text-red-600", bg: "bg-red-50", darkBg: "dark:bg-red-900/30", hot: true },
  { icon: DollarSign, key: "cat.unblock", color: "text-rose-600", bg: "bg-rose-50", darkBg: "dark:bg-rose-900/30", hot: true },
  { icon: Calculator, key: "cat.restore", color: "text-cyan-600", bg: "bg-cyan-50", darkBg: "dark:bg-cyan-900/30", hot: true },
  { icon: FileText, key: "cat.esf", color: "text-blue-600", bg: "bg-blue-50", darkBg: "dark:bg-blue-900/30", hot: true },
  { icon: BarChart2, key: "cat.taxInspection", color: "text-amber-600", bg: "bg-amber-50", darkBg: "dark:bg-amber-900/30", hot: true },
  { icon: BarChart2, key: "cat.vatReturn", color: "text-teal-600", bg: "bg-teal-50", darkBg: "dark:bg-teal-900/30", hot: true },
  { icon: Building2, key: "cat.closing", color: "text-slate-600", bg: "bg-slate-50", darkBg: "dark:bg-slate-900/30", hot: false },
  { icon: FileText, key: "cat.declaration", color: "text-indigo-600", bg: "bg-indigo-50", darkBg: "dark:bg-indigo-900/30", hot: true },
  { icon: Users, key: "cat.consult", color: "text-cyan-600", bg: "bg-cyan-50", darkBg: "dark:bg-cyan-900/30", hot: false },
  { icon: Calculator, key: "cat.bookkeeping", color: "text-rose-600", bg: "bg-rose-50", darkBg: "dark:bg-rose-900/30", hot: false },
];
const STEPS = [
  { num: "01", key: "step.1" },
  { num: "02", key: "step.2" },
  { num: "03", key: "step.3" },
  { num: "04", key: "step.4" },
  { num: "05", key: "step.5" },
  { num: "06", key: "step.6" },
];

// Typing animation hook
function useTypingAnimation(words: string[], typingSpeed = 100, deletingSpeed = 60, pauseTime = 1800) {
  const [displayed, setDisplayed] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(v => !v), 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const current = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting && displayed === current) {
      timeout = setTimeout(() => setIsDeleting(true), pauseTime);
    } else if (isDeleting && displayed === '') {
      setIsDeleting(false);
      setWordIdx(i => (i + 1) % words.length);
    } else {
      timeout = setTimeout(() => {
        setDisplayed(isDeleting ? current.slice(0, displayed.length - 1) : current.slice(0, displayed.length + 1));
      }, isDeleting ? deletingSpeed : typingSpeed);
    }
    return () => clearTimeout(timeout);
  }, [displayed, isDeleting, wordIdx, words]);

  return { displayed, showCursor };
}

export default function HomePage() {
  const { user, loading, fetchUser } = useAuthStore();
  const router = useRouter();
  const { t, lang } = useI18n();
  const { dark, toggle: toggleDark, mounted } = useTheme();
  const { displayed, showCursor } = useTypingAnimation(TYPING_WORDS[lang] || TYPING_WORDS.ru);
  const [contestTop3, setContestTop3] = useState<any[]>([]);

  useEffect(() => {
    fetchUser();
    supabase.from('contest_entries').select('*').eq('published', true).eq('season', 'permanent')
      .lte('rank_position', 3).order('rank_position', { ascending: true })
      .then(({ data }) => setContestTop3(data || []));
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === "accountant" ? "/dashboard/accountant" : "/dashboard/client");
    }
  }, [user, loading]);

  if (loading || !mounted) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const D = dark;

  const bg = D ? "bg-gray-950 text-white" : "bg-[#F8FAFC] text-gray-900";
  const cardBg = D ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200";
  const mutedText = D ? "text-gray-400" : "text-gray-500";
  const sectionBg = D ? "bg-gray-900 border-transparent" : "bg-white border-gray-100";

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-500`} style={{ fontFamily: "Inter, sans-serif" }}>
      <NavWrapper dark={D} />

      {/* Dark mode toggle */}
      <button onClick={toggleDark}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border"
        style={{ background: D ? '#1e293b' : '#fff', borderColor: D ? '#334155' : '#e2e8f0' }}
        title={D ? "Светлая тема" : "Тёмная тема"}>
        {D ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-500" />}
      </button>

      {/* HERO + Инструмент ФНО 910 — единый блок на общем синем фоне, без белой полосы между ними */}
      <section className={`relative pt-32 pb-16 px-4 sm:px-6 overflow-hidden ${D ? 'bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950' : 'bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700'}`}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl animate-blob" />
          <div className={`absolute -bottom-24 -right-16 w-[28rem] h-[28rem] rounded-full blur-3xl animate-blob ${D ? 'bg-violet-500/15' : 'bg-emerald-400/15'}`} style={{ animationDelay: '5s' }} />
        </div>
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white/90 mb-6">
            <MapPin className="w-3.5 h-3.5" /> {t('land.badge')}
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-5">
            {t('land.hero1')} <span className="text-yellow-300">{t('land.hero2')}</span><br />{t('land.hero3')}
          </h1>

          <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('land.heroDesc')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-0.5">
              {t('land.postTask')} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all">
              {t('land.imAccountant')}
            </button>
          </div>

          {/* Typing animation between buttons */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-white/50 text-sm">{t('land.forExample')}</span>
            <div className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm min-w-[260px] justify-start">
              <span className="text-yellow-300 text-sm font-medium">{displayed}</span>
              <span className={`inline-block w-0.5 h-4 bg-yellow-300 ml-0.5 align-middle transition-opacity ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>

          {/* Инструмент ФНО 910 — «стеклянная» карточка на том же синем фоне, без разрыва */}
          <div className="relative mt-14 rounded-3xl bg-white/10 backdrop-blur border border-white/15 p-8 sm:p-10 shadow-xl overflow-hidden text-left">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 pointer-events-none" />
            <div className="absolute -bottom-16 -left-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
            <div className="relative flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0">
                <Calculator className="w-9 h-9 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">{t('inc910.title')}</h2>
                <p className="text-blue-100 mt-2 text-sm sm:text-base">{t('inc910.bannerDesc')}</p>
              </div>
              <button onClick={() => router.push('/income-910')}
                className="px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-yellow-300 hover:text-blue-900 transition-colors whitespace-nowrap flex-shrink-0 shadow-lg">
                {t('inc910.open')} →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* КОНКУРС — интерактивная карта лидеров по городам */}
      <section className="py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <KazakhstanRankingMap entries={contestTop3} onViewRating={() => router.push('/reyting')} />
          </Reveal>
        </div>
      </section>

      {/* ВСЕ ИНСТРУМЕНТЫ */}
      <section className={`py-16 px-4 sm:px-6 ${bg}`}>
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">{t('land.toolsTitle')}</h2>
            <p className={mutedText}>{t('land.toolsSub')}</p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <Reveal key={tool.href} delay={(i % 3) * 70}>
                  <button onClick={() => router.push(tool.href)}
                    className={`group w-full h-full text-left rounded-2xl border shadow-sm p-5 flex items-start gap-4 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg ${D ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${tool.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-bold ${D ? 'text-white' : 'text-gray-900'}`}>{t(tool.title)}</p>
                        {tool.badge && <span className="text-[9px] px-1.5 py-0.5 bg-yellow-300 text-blue-900 rounded font-bold">NEW</span>}
                      </div>
                      <p className={`text-sm mt-0.5 ${mutedText}`}>{t(tool.desc)}</p>
                    </div>
                    <ArrowRight className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1 ${D ? 'text-gray-500' : 'text-gray-300'}`} />
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className={`py-24 px-4 sm:px-6 ${bg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{t('land.categories')}</h2>
            <p className={mutedText}>{t('land.categoriesSub')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map(cat => (
              <div key={cat.title} onClick={() => router.push("/auth")}
                className={`group relative rounded-2xl border p-6 flex flex-col gap-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer ${cardBg}`}>
                {cat.hot && (
                  <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px] font-bold">
                    {t('land.highDemand')}
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${D ? 'bg-white/10' : cat.bg}`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div>
                  <p className="font-semibold mb-1">{t(cat.key)}</p>
                  <p className={`text-sm leading-relaxed ${mutedText}`}>{t(cat.key + 'Desc')}</p>
                </div>
                <div className="mt-auto flex items-center gap-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {t('land.findSpecialist')} <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className={`py-24 px-4 sm:px-6 border-t ${sectionBg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">{t('land.howItWorks')}</h2>
            <p className={mutedText}>{t('land.howSub')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex gap-5 items-start">
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${D ? 'border-blue-800 bg-blue-900/30' : 'border-blue-200 bg-blue-50'}`}>
                  <span className="text-blue-500 font-bold text-sm font-mono">{step.num}</span>
                </div>
                <div className="pt-1">
                  <p className="font-semibold mb-1">{t(step.key)}</p>
                  <p className={`text-sm leading-relaxed ${mutedText}`}>{t(step.key + 'desc')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR ACCOUNTANTS */}
      <section id="for-accountants" className={`py-24 px-4 sm:px-6 ${D ? '' : 'border-t border-gray-100'} ${bg}`}>
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-2xl border p-8 md:p-12 ${cardBg}`}>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-400 mb-5">
                  <Briefcase className="w-3.5 h-3.5" /> {t('land.forAccountants')}
                </div>
                <h2 className="text-3xl font-extrabold mb-4 leading-tight">
                  {t('land.findClients1')} <span className="text-emerald-500">{t('land.findClients2')}</span>
                </h2>
                <p className={`mb-6 leading-relaxed ${mutedText}`}>
                  {t('land.forAccDesc')}
                </p>
                <ul className="space-y-3 mb-8">
                  {[t('land.accFeat1'), t('land.accFeat2'), t('land.accFeat3'), t('land.accFeat4')].map(f => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className={mutedText}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => router.push("/auth")}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors">
                  {t('land.registerAccountant')} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {/* Accountant profile card */}
              <div className={`rounded-2xl border overflow-hidden shadow-lg ${D ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Header with photo */}
                <div className={`relative p-6 pb-5 ${D ? 'bg-gradient-to-br from-blue-900/40 to-gray-800' : 'bg-gradient-to-br from-blue-50 to-white'}`}>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <img src="/images/accountant-avatar.jpg" alt="Сейілбек Әлихан"
                        className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-base truncate">Сейілбек Әлихан</p>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                        <span className={`text-xs ml-1 ${mutedText}`}>5.0 · 48 {t('land.tasksLabel')}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-semibold">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        {t('land.verifiedBadge')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {["НДС","КПН","Зарплата","1С","ТОО","ИП"].map(tag => (
                      <span key={tag} className={`px-2.5 py-1 rounded-full text-xs border ${D ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>{tag}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: t('land.tasksCount'), value: "48" }, { label: t('land.reviewsCount'), value: "41" }, { label: t('land.ratingCount'), value: "5.0" }].map(m => (
                      <div key={m.label} className={`rounded-xl p-3 text-center ${D ? 'bg-gray-900' : 'bg-gray-50'}`}>
                        <p className="text-xl font-extrabold text-blue-500">{m.value}</p>
                        <p className={`text-xs mt-0.5 ${mutedText}`}>{m.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 rounded-xl px-4 py-3 flex items-center gap-3 ${D ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <Zap className={`w-4 h-4 shrink-0 ${D ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    <p className={`text-sm ${D ? 'text-emerald-400' : 'text-emerald-500'}`}>{t('land.newTasksAvailable')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-24 px-4 sm:px-6 ${D ? 'bg-gradient-to-br from-blue-950 to-gray-950' : 'bg-gradient-to-br from-blue-700 to-indigo-700'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5">{t('land.startNow')}</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            {t('land.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-all shadow-xl">
              {t('land.postTask')} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all">
              {t('land.registerAccountant')}
            </button>
          </div>
        </div>
      </section>

      {/* Инструмент ФНО 910 перенесён наверх */}

      {/* FOOTER */}
      <footer className={`py-10 px-4 sm:px-6 ${D ? 'bg-gray-950 border-t border-gray-800' : 'bg-gray-900'}`}>
        <div className="max-w-6xl mx-auto">
          {/* SEO-ссылки на услуги */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-8 mb-8 border-b border-gray-800">
            <a href="/uslugi/najti-buhgaltera" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Найти бухгалтера в Казахстане</a>
            <a href="/uslugi/sdacha-otchetov" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Сдача налоговой отчётности</a>
            <a href="/uslugi/otkrytie-ip" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Открыть ИП в Казахстане</a>
            <a href="/uslugi/zakrytie-ip" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Закрыть ИП</a>
            <a href="/uslugi/otkrytie-too" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Открыть ТОО</a>
            <a href="/uslugi/zakrytie-too" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Ликвидация ТОО</a>
            <a href="/income-910" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Расчёт дохода для формы 910</a>
            <a href="/tax-calendar" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Налоговый календарь 2026</a>
            <a href="/salary-calculator" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Калькулятор зарплаты РК</a>
            <a href="/uslugi/buhgalterskie-uslugi" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Бухгалтерские услуги — цены</a>
            <a href="/uslugi/vosstanovlenie-ucheta" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Восстановление учёта</a>
            <a href="/uslugi/nds" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">НДС: постановка и форма 300</a>
            <a href="/uslugi/zarplata-i-kadry" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Зарплата и кадровый учёт</a>
            <a href="/uslugi/konsultaciya-buhgaltera" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Консультация бухгалтера</a>
            <a href="/uslugi/buhgalter-astana" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Бухгалтер Астана</a>
            <a href="/uslugi/buhgalter-almaty" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Бухгалтер Алматы</a>
            <a href="/uslugi/buhgalter-shymkent" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Бухгалтер Шымкент</a>
            <a href="/news" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Новости и статьи</a>
            <a href="/reyting" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Рейтинг бухгалтеров</a>
            <a href="/partners" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Партнёрам конкурса</a>
            <a href="/uslugi" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Все услуги →</a>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/images/logo-new.png" alt="BuhTask" className="h-9 w-auto" />
          <div className="text-center">
            <p className="text-xs text-gray-400">{t('land.footerRights')}</p>
            <a href="mailto:info@buhtask.kz" className="text-xs text-blue-300 hover:text-blue-200 transition-colors inline-flex items-center gap-1 mt-1">
              <Mail className="w-3 h-3" /> info@buhtask.kz
            </a>
          </div>
          <div className="flex gap-5">
            <a href="/#categories" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{t('land.footerTerms')}</a>
            <a href="/privacy" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{t('land.footerPrivacy')}</a>
            <a href="mailto:info@buhtask.kz" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{t('land.footerContacts')}</a>
          </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
