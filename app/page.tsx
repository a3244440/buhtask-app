"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import NavWrapper from "./components/NavWrapper";
import {
  Calculator, FileText, Users, Building2, Search, Star,
  ArrowRight, ChevronRight, Briefcase, TrendingUp, Shield,
  Clock, MapPin, Zap, DollarSign, BarChart2, Moon, Sun,
} from "lucide-react";

const TYPING_WORDS = [
  "Открыть ТОО",
  "Закрыть ТОО",
  "Сдать отчёт 910 ФНО",
  "Расчёт зарплаты сотрудника",
  "Ведение бухгалтерии",
  "Консультация по НДС",
  "Регистрация ИП",
  "Налоговый аудит",
];
const STATS = [
  { value: "500+", label: "Проверенных бухгалтеров" },
  { value: "2 000+", label: "Выполненных задач" },
  { value: "20+", label: "Видов услуг" },
  { value: "17", label: "Регионов Казахстана" },
];
const CATEGORIES = [
  { icon: FileText, title: "Налоговая отчётность", desc: "Декларации, НДС, КПН, ИПН — сдача отчётности в срок", color: "text-blue-600", bg: "bg-blue-50", darkBg: "dark:bg-blue-900/30" },
  { icon: DollarSign, title: "Расчёт зарплаты", desc: "Расчёт ЗП, социальных отчислений и налогов", color: "text-emerald-600", bg: "bg-emerald-50", darkBg: "dark:bg-emerald-900/30" },
  { icon: Building2, title: "Регистрация ИП/ТОО", desc: "Открытие бизнеса под ключ: документы, постановка на учёт", color: "text-violet-600", bg: "bg-violet-50", darkBg: "dark:bg-violet-900/30" },
  { icon: BarChart2, title: "Аудит", desc: "Проверка финансовой отчётности, выявление ошибок", color: "text-amber-600", bg: "bg-amber-50", darkBg: "dark:bg-amber-900/30" },
  { icon: Users, title: "Консультация", desc: "Разовый вопрос или регулярное налоговое сопровождение", color: "text-cyan-600", bg: "bg-cyan-50", darkBg: "dark:bg-cyan-900/30" },
  { icon: Calculator, title: "Ведение бухгалтерии", desc: "Полное ведение учёта: первичка, проводки, отчётность", color: "text-rose-600", bg: "bg-rose-50", darkBg: "dark:bg-rose-900/30" },
];
const STEPS = [
  { num: "01", title: "Зарегистрируйтесь", desc: "Создайте аккаунт как заказчик или бухгалтер" },
  { num: "02", title: "Создайте задачу", desc: "Опишите задачу, укажите бюджет и сроки" },
  { num: "03", title: "Получите отклики", desc: "Проверенные бухгалтеры пришлют предложения" },
  { num: "04", title: "Выберите исполнителя", desc: "Изучите профили, рейтинги и отзывы" },
  { num: "05", title: "Работайте онлайн", desc: "Общайтесь в чате, отслеживайте статус" },
  { num: "06", title: "Оплатите результат", desc: "Быстрая и безопасная оплата через Kaspi" },
];

// Detect Astana time and set dark mode accordingly
function getAstanaDarkMode(): boolean {
  const now = new Date();
  // Astana is UTC+5
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const astanaHour = new Date(utc + 5 * 3600000).getHours();
  return astanaHour >= 19 || astanaHour < 9;
}

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
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { displayed, showCursor } = useTypingAnimation(TYPING_WORDS);

  useEffect(() => {
    fetchUser();
    const isDark = getAstanaDarkMode();
    setDark(isDark);
    setMounted(true);
    // Check every minute
    const interval = setInterval(() => setDark(getAstanaDarkMode()), 60000);
    return () => clearInterval(interval);
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
  const sectionBg = D ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100";

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-500`} style={{ fontFamily: "Inter, sans-serif" }}>
      <NavWrapper dark={D} />

      {/* Dark mode toggle */}
      <button onClick={() => setDark(v => !v)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 border"
        style={{ background: D ? '#1e293b' : '#fff', borderColor: D ? '#334155' : '#e2e8f0' }}
        title={D ? "Светлая тема" : "Тёмная тема"}>
        {D ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-500" />}
      </button>

      {/* HERO */}
      <section className={`relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden ${D ? 'bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950' : 'bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700'}`}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white/90 mb-6">
            <MapPin className="w-3.5 h-3.5" /> Маркетплейс бухгалтерских услуг Казахстана
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-5">
            Найти бухгалтера<br />просто и быстро
          </h1>

          <p className="text-lg text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
            BuhTask — цифровая платформа, где предприниматели находят проверенных бухгалтеров и получают бухгалтерские услуги из любой точки Казахстана.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 transition-all shadow-xl hover:-translate-y-0.5">
              Разместить задачу <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all">
              Я бухгалтер — найти заказы
            </button>
          </div>

          {/* Typing animation between buttons */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="text-white/50 text-sm">Например:</span>
            <div className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-white/10 border border-white/20 backdrop-blur-sm min-w-[260px] justify-start">
              <span className="text-yellow-300 text-sm font-medium">{displayed}</span>
              <span className={`inline-block w-0.5 h-4 bg-yellow-300 ml-0.5 align-middle transition-opacity ${showCursor ? 'opacity-100' : 'opacity-0'}`} />
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className={`border-b ${sectionBg}`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0" style={{ borderColor: D ? '#1f2937' : '#f1f5f9' }}>
            {STATS.map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1 py-8 px-4">
                <span className="text-4xl md:text-5xl font-extrabold text-blue-500">{s.value}</span>
                <span className={`text-sm text-center ${mutedText}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className={`py-24 px-4 sm:px-6 ${bg}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Категории услуг</h2>
            <p className={mutedText}>Найдите нужного специалиста — от регистрации бизнеса до полного аудита</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map(cat => (
              <div key={cat.title} onClick={() => router.push("/auth")}
                className={`group rounded-2xl border p-6 flex flex-col gap-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer ${cardBg}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${D ? 'bg-white/10' : cat.bg}`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div>
                  <p className="font-semibold mb-1">{cat.title}</p>
                  <p className={`text-sm leading-relaxed ${mutedText}`}>{cat.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  Найти специалиста <ChevronRight className="w-3.5 h-3.5" />
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
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Как это работает</h2>
            <p className={mutedText}>Шесть простых шагов от регистрации до выполненной задачи</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.num} className="flex gap-5 items-start">
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${D ? 'border-blue-800 bg-blue-900/30' : 'border-blue-200 bg-blue-50'}`}>
                  <span className="text-blue-500 font-bold text-sm font-mono">{step.num}</span>
                </div>
                <div className="pt-1">
                  <p className="font-semibold mb-1">{step.title}</p>
                  <p className={`text-sm leading-relaxed ${mutedText}`}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR ACCOUNTANTS */}
      <section id="for-accountants" className={`py-24 px-4 sm:px-6 border-t ${bg}`}>
        <div className="max-w-5xl mx-auto">
          <div className={`rounded-2xl border p-8 md:p-12 ${cardBg}`}>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-400 mb-5">
                  <Briefcase className="w-3.5 h-3.5" /> Для бухгалтеров
                </div>
                <h2 className="text-3xl font-extrabold mb-4 leading-tight">
                  Найдите клиентов <span className="text-emerald-500">без посредников</span>
                </h2>
                <p className={`mb-6 leading-relaxed ${mutedText}`}>
                  Создайте профиль, получайте заявки от реальных предпринимателей по всему Казахстану.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Регистрация с указанием специализации', 'Просмотр задач по всему Казахстану', 'Система рейтингов и отзывов', 'Чат с заказчиками'].map(f => (
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
                  Зарегистрироваться как бухгалтер <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              {/* Mock profile card */}
              <div className={`rounded-2xl border p-6 ${D ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-lg">А</div>
                  <div>
                    <p className="font-semibold text-sm">Айгерим Сейткали</p>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                      <span className={`text-xs ml-1 ${mutedText}`}>5.0 · 48 задач</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["НДС","КПН","Зарплата","1С","ТОО","ИП"].map(tag => (
                    <span key={tag} className={`px-2.5 py-1 rounded-full text-xs border ${D ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-600'}`}>{tag}</span>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[{ label: "Задач", value: "48" }, { label: "Отзывов", value: "41" }, { label: "Рейтинг", value: "5.0" }].map(m => (
                    <div key={m.label} className={`rounded-xl p-3 text-center ${D ? 'bg-gray-900' : 'bg-white'}`}>
                      <p className="text-xl font-extrabold text-blue-500">{m.value}</p>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>{m.label}</p>
                    </div>
                  ))}
                </div>
                <div className={`mt-4 rounded-xl px-4 py-3 flex items-center gap-3 ${D ? 'bg-emerald-900/30 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-500">3 новых задачи доступны прямо сейчас</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-24 px-4 sm:px-6 ${D ? 'bg-gradient-to-br from-blue-950 to-gray-950' : 'bg-gradient-to-br from-blue-700 to-indigo-700'}`}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5">Начните прямо сейчас</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Разместите первую задачу бесплатно или создайте профиль бухгалтера за 3 минуты.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition-all shadow-xl">
              Разместить задачу <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold hover:bg-white/10 transition-all">
              Зарегистрироваться как бухгалтер
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={`py-10 px-4 sm:px-6 ${D ? 'bg-gray-950 border-t border-gray-800' : 'bg-gray-900'}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto brightness-0 invert" />
          <p className="text-xs text-gray-400">© 2026 BuhTask. Маркетплейс бухгалтерских услуг Казахстана.</p>
          <div className="flex gap-5">
            {["Условия","Конфиденциальность","Контакты"].map(l => (
              <a key={l} href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
