"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import NavWrapper from "./components/NavWrapper";
import {
  Calculator, FileText, Users, Building2, Search, Star,
  CheckCircle, ArrowRight, ChevronRight, Briefcase, TrendingUp,
  Shield, Clock, MapPin, Zap, DollarSign, BarChart2,
} from "lucide-react";

const STATS = [
  { value: "500+", label: "Проверенных бухгалтеров" },
  { value: "2 000+", label: "Выполненных задач" },
  { value: "20+", label: "Видов услуг" },
  { value: "17", label: "Регионов Казахстана" },
];

const CATEGORIES = [
  { icon: FileText, title: "Налоговая отчётность", desc: "Декларации, НДС, КПН, ИПН — сдача отчётности в срок", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: DollarSign, title: "Расчёт зарплаты", desc: "Расчёт ЗП, социальных отчислений и налогов", color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Building2, title: "Регистрация ИП/ТОО", desc: "Открытие бизнеса под ключ: документы, постановка на учёт", color: "text-violet-600", bg: "bg-violet-50" },
  { icon: BarChart2, title: "Аудит", desc: "Проверка финансовой отчётности, выявление ошибок", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: Users, title: "Консультация", desc: "Разовый вопрос или регулярное налоговое сопровождение", color: "text-cyan-600", bg: "bg-cyan-50" },
  { icon: Calculator, title: "Ведение бухгалтерии", desc: "Полное ведение учёта: первичка, проводки, отчётность", color: "text-rose-600", bg: "bg-rose-50" },
];

const STEPS = [
  { num: "01", title: "Зарегистрируйтесь", desc: "Создайте аккаунт как заказчик или бухгалтер-специалист" },
  { num: "02", title: "Создайте задачу", desc: "Опишите задачу, укажите бюджет и желаемые сроки" },
  { num: "03", title: "Получите отклики", desc: "Проверенные бухгалтеры пришлют предложения со своей ценой" },
  { num: "04", title: "Выберите исполнителя", desc: "Изучите профили, рейтинги и отзывы" },
  { num: "05", title: "Работайте онлайн", desc: "Общайтесь в чате, отслеживайте статус задачи" },
  { num: "06", title: "Оплатите результат", desc: "Быстрая и безопасная оплата через Kaspi Pay" },
];

const CLIENT_FEATURES = [
  { icon: Search, text: "Регистрация с указанием типа компании (ИП/ТОО) и БИН" },
  { icon: FileText, text: "Создание задач с описанием, бюджетом и сроками" },
  { icon: Users, text: "Просмотр откликов от бухгалтеров" },
  { icon: CheckCircle, text: "Выбор исполнителя из проверенных специалистов" },
  { icon: Clock, text: "Чат с бухгалтером" },
  { icon: Shield, text: "Оплата через Kaspi Pay" },
];

const ACCOUNTANT_FEATURES = [
  { icon: Briefcase, text: "Регистрация с указанием специализации и опыта" },
  { icon: Search, text: "Просмотр доступных задач по всему Казахстану" },
  { icon: FileText, text: "Фильтрация по категориям услуг" },
  { icon: TrendingUp, text: "Отправка откликов с ценой и описанием" },
  { icon: Star, text: "Система рейтингов и отзывов" },
  { icon: Shield, text: "Портфолио и верификация (скоро)" },
];

export default function HomePage() {
  const { user, loading, fetchUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => { fetchUser(); }, []);
  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === "accountant" ? "/dashboard/accountant" : "/dashboard/client");
    }
  }, [user, loading]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <NavWrapper />
      {/* HERO */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }} />
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white/90 mb-6">
            <MapPin className="w-3.5 h-3.5" /> Маркетплейс бухгалтерских услуг Казахстана
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            Найдите бухгалтера{" "}
            <span className="text-yellow-300">онлайн</span>
            <br />за минуты
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.16 }}
            className="text-lg text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            BuhTask — цифровая платформа, где предприниматели находят проверенных бухгалтеров и получают бухгалтерские услуги из любой точки Казахстана.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5">
              Разместить задачу <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={() => router.push("/auth")}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-all">
              Я бухгалтер — найти заказы
            </button>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-100">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex flex-col items-center gap-1 py-8 px-4">
                <span className="text-4xl md:text-5xl font-extrabold text-blue-600">{s.value}</span>
                <span className="text-sm text-gray-500 text-center">{s.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — for clients */}
      <section id="features" className="py-24 px-4 sm:px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-xs text-emerald-700 mb-5">
                <Building2 className="w-3.5 h-3.5" /> Для заказчиков — ИП и ТОО
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-5 leading-tight">
                Ваш бухгалтер — в одном <span className="text-blue-600">клике</span>
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Опишите задачу, укажите бюджет — и получайте отклики от проверенных специалистов. Никаких долгих поисков.
              </p>
              <ul className="flex flex-col gap-4">
                {CLIENT_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-sm text-gray-600">
                    <f.icon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push("/auth")}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-sm">
                Разместить задачу <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col gap-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs text-gray-400 font-mono">Новая задача</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Тип компании", value: "ТОО", color: "text-blue-600" },
                  { label: "Категория", value: "Налоговая отчётность", color: "text-emerald-600" },
                  { label: "Бюджет", value: "5 000 — 15 000 тг", color: "text-amber-600" },
                  { label: "Срок", value: "до 20 июня 2026", color: "text-gray-700" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center text-sm border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={`font-medium ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-xs text-gray-400 mb-2">Описание задачи</p>
                <p className="text-sm text-gray-700 leading-relaxed">Нужно сдать квартальный отчет 200 ФНО и 300 ФНО по НДС. Опыт работы обязателен.</p>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-400">Откликов: <span className="text-emerald-600 font-semibold">7</span></span>
                <button className="text-xs font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors">
                  Просмотреть отклики →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="py-24 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Категории услуг</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Найдите нужного специалиста — от регистрации бизнеса до полного аудита</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat, i) => (
              <motion.div key={cat.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                onClick={() => router.push("/auth")}
                className="group rounded-2xl border border-gray-200 bg-white p-6 flex flex-col gap-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.bg}`}>
                  <cat.icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{cat.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{cat.desc}</p>
                </div>
                <div className="mt-auto flex items-center gap-1 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Найти специалиста <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 bg-[#F8FAFC] border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Как это работает</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Шесть простых шагов от регистрации до выполненной задачи</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <motion.div key={step.num} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="flex gap-5 items-start">
                <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border border-blue-200 bg-blue-50">
                  <span className="text-blue-600 font-bold text-sm font-mono">{step.num}</span>
                </div>
                <div className="pt-1">
                  <p className="font-semibold text-gray-900 mb-1">{step.title}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR ACCOUNTANTS */}
      <section id="for-accountants" className="py-24 px-4 sm:px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm order-2 md:order-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Айгерим Сейткали</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map((s) => <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />)}
                    <span className="text-xs text-gray-400 ml-1">5.0 · 48 задач</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {["НДС","КПН","Зарплата","1С","ТОО","ИП"].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-xs border border-gray-200 text-gray-600 bg-gray-50">{tag}</span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[{ label: "Задач", value: "48" },{ label: "Отзывов", value: "41" },{ label: "Рейтинг", value: "5.0" }].map((m) => (
                  <div key={m.label} className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-xl font-extrabold text-blue-600">{m.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3">
                <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-700">3 новых задачи доступны в вашем регионе прямо сейчас</p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-xs text-blue-700 mb-5">
                <Briefcase className="w-3.5 h-3.5" /> Для бухгалтеров и специалистов
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-5 leading-tight">
                Найдите клиентов <span className="text-emerald-600">без посредников</span>
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Создайте профиль специалиста, получайте заявки от реальных предпринимателей по всему Казахстану.
              </p>
              <ul className="flex flex-col gap-4">
                {ACCOUNTANT_FEATURES.map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-sm text-gray-600">
                    <f.icon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => router.push("/auth")}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors shadow-sm">
                Зарегистрироваться как бухгалтер <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-br from-blue-700 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5">Начните прямо сейчас</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto leading-relaxed">
            Разместите первую задачу бесплатно или создайте профиль бухгалтера — это займёт не больше трёх минут.
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
      <footer className="bg-gray-900 py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto brightness-0 invert" />
          <p className="text-xs text-gray-400">© 2026 BuhTask. Маркетплейс бухгалтерских услуг Казахстана.</p>
          <div className="flex gap-5">
            {["Условия","Конфиденциальность","Контакты"].map((l) => (
              <a key={l} href="#" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
