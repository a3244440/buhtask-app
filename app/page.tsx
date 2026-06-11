"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import Link from 'next/link';

// Import necessary icons and motion for the landing page content
import { motion } from "framer-motion";
import {
  Calculator,
  FileText,
  Users,
  Building2,
  Search,
  Star,
  CheckCircle,
  ArrowRight,
  ChevronRight,
  Briefcase,
  TrendingUp,
  Shield,
  Clock,
  MapPin,
  Zap,
  DollarSign,
  BarChart2,
} from "lucide-react";

// Helper components and data from the design files
const STATS = [
  { value: "500+", label: "Проверенных бухгалтеров" },
  { value: "2 000+", label: "Выполненных задач" },
  { value: "20+", label: "Видов бухгалтерских услуг" },
  { value: "17", label: "Регионов Казахстана" },
];

const CATEGORIES = [
  {
    icon: FileText,
    title: "Налоговая отчётность",
    desc: "Декларации, НДС, КПН, ИПН — сдача отчётности в срок",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: DollarSign,
    title: "Расчёт зарплаты",
    desc: "Расчёт ЗП, социальных отчислений и налогов с зарплаты",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Building2,
    title: "Регистрация ИП/ТОО",
    desc: "Открытие бизнеса под ключ: документы, постановка на учёт",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: BarChart2,
    title: "Аудит",
    desc: "Проверка финансовой отчётности, выявление ошибок",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Консультация",
    desc: "Разовый вопрос или регулярное налоговое сопровождение",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Calculator,
    title: "Ведение бухгалтерии",
    desc: "Полное ведение учёта: первичка, проводки, отчётность",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
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

const STEPS = [
  {
    num: "01",
    title: "Зарегистрируйтесь",
    desc: "Создайте аккаунт как заказчик (ИП/ТОО) или как бухгалтер-специалист",
  },
  {
    num: "02",
    title: "Создайте задачу",
    desc: "Опишите задачу, укажите бюджет и желаемые сроки выполнения",
  },
  {
    num: "03",
    title: "Получите отклики",
    desc: "Проверенные бухгалтеры пришлют предложения со своей ценой",
  },
  {
    num: "04",
    title: "Выберите исполнителя",
    desc: "Изучите профили, рейтинги и отзывы. Выберите лучшего специалиста",
  },
  {
    num: "05",
    title: "Работайте онлайн",
    desc: "Общайтесь в чате, отслеживайте статус задачи в одном месте",
  },
  {
    num: "06",
    title: "Оплатите результат",
    desc: "Быстрая и безопасная оплата через Kaspi Pay после приёмки",
  },
];

function TerminalTyping() {
  const phrases = [
    "Найти бухгалтера для ТОО",
    "Сдать налоговую отчётность",
    "Зарегистрировать ИП онлайн",
    "Рассчитать зарплату сотрудников",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const blinkInterval = setInterval(() => setBlink((b) => !b), 530);
    return () => clearInterval(blinkInterval);
  }, []);

  useEffect(() => {
    const current = phrases[phraseIdx];
    if (!deleting && text.length < current.length) {
      const t = setTimeout(() => setText(current.slice(0, text.length + 1)), 60);
      return () => clearTimeout(t);
    }
    if (!deleting && text.length === current.length) {
      const t = setTimeout(() => setDeleting(true), 1800);
      return () => clearTimeout(t);
    }
    if (deleting && text.length > 0) {
      const t = setTimeout(() => setText(text.slice(0, -1)), 30);
      return () => clearTimeout(t);
    }
    if (deleting && text.length === 0) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, deleting, phraseIdx]);

  return (
    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 font-mono text-sm md:text-base">
      <span className="text-emerald-400">$</span>
      <span className="text-slate-200">{text}</span>
      <span
        className="inline-block w-[2px] h-[1.1em] bg-emerald-400"
        style={{ opacity: blink ? 1 : 0, transition: "opacity 0.1s" }}
      />
    </div>
  );
}

function StatCard({ value, label, idx }: { value: string; label: string; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1 }}
      className="flex flex-col items-center gap-1 py-8 px-4"
    >
      <span
        className="text-4xl md:text-5xl font-extrabold tracking-tight text-blue-400"
        style={{ fontFamily: "Manrope, sans-serif" }}
      >
        {value}
      </span>
      <span className="text-sm text-muted-foreground text-center">{label}</span>
    </motion.div>
  );
}

function CategoryCard({ cat, idx }: { cat: (typeof CATEGORIES)[0]; idx: number }) {
  const Icon = cat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.07 }}
      className="group rounded-xl border border-border bg-card p-6 flex flex-col gap-4 hover:border-blue-500/40 transition-colors duration-200 cursor-pointer"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cat.bg}`}>
        <Icon className={`w-5 h-5 ${cat.color}`} />
      </div>
      <div>
        <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
          {cat.title}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{cat.desc}</p>
      </div>
      <div className="mt-auto flex items-center gap-1 text-xs text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
        Найти специалиста <ChevronRight className="w-3.5 h-3.5" />
      </div>
    </motion.div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-slate-300">
      <Icon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function StepCard({ step, idx }: { step: (typeof STEPS)[0]; idx: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.08 }}
      className="flex gap-5 items-start"
    >
      <div
        className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border border-blue-500/30 bg-blue-500/10"
      >
        <span className="text-blue-400 font-bold text-sm" style={{ fontFamily: "JetBrains Mono, monospace" }}>
          {step.num}
        </span>
      </div>
      <div className="pt-1">
        <p className="font-semibold text-foreground mb-1" style={{ fontFamily: "Manrope, sans-serif" }}>
          {step.title}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
      </div>
    </motion.div>
  );
}

function LandingContent() {
  return (
    <>
      {/* HERO */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(37,99,235,0.15) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 mb-6"
          >
            <MapPin className="w-3.5 h-3.5" />
            Маркетплейс бухгалтерских услуг Казахстана
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6"
            style={{ fontFamily: "Manrope, sans-serif" }}
          >
            Найдите бухгалтера{" "}
            <span style={{ background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              онлайн
            </span>
            <br />
            за минуты
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            BuhTask — цифровая платформа, где предприниматели находят проверенных бухгалтеров,
            ставят задачи онлайн и получают доступные бухгалтерские услуги из любой точки Казахстана.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mb-10"
          >
            <TerminalTyping />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors">
              Разместить задачу <ArrowRight className="w-4 h-4" />
            </button>
            <button className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-border hover:border-blue-500/40 hover:bg-white/5 text-slate-300 font-semibold text-sm transition-all">
              Я бухгалтер — найти заказы
            </button>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-border">
            {STATS.map((s, i) => (
              <StatCard key={s.label} value={s.value} label={s.label} idx={i} />
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES — for clients */}
      <section id="features" className="py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400 mb-5">
                <Building2 className="w-3.5 h-3.5" /> Для заказчиков — ИП и ТОО
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                Ваш бухгалтер — в одном <span className="text-blue-400">клике</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Опишите задачу, укажите бюджет — и получайте отклики от проверенных специалистов.
                Никаких долгих поисков и звонков вслепую.
              </p>
              <ul className="flex flex-col gap-4">
                {CLIENT_FEATURES.map((f) => (
                  <FeatureItem key={f.text} icon={f.icon} text={f.text} />
                ))}
              </ul>
              <button className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors">
                Разместить задачу <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-muted-foreground" style={{ fontFamily: "JetBrains Mono, monospace" }}>
                  Новая задача
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Тип компании", value: "ТОО", color: "text-blue-400" },
                  { label: "Категория", value: "Налоговая отчётность", color: "text-emerald-400" },
                  { label: "Бюджет", value: "5 000 — 15 000 тг", color: "text-amber-400" },
                  { label: "Срок", value: "до 20 июня 2026", color: "text-slate-300" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                    <span className="text-muted-foreground">{row.label}</span>
                    <span className={`font-medium ${row.color}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-xs text-muted-foreground mb-2">Описание задачи</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Нужно сдать квартальный отчет 200 ФНО и 300 ФНО по НДС за 2-й квартал 2026 года.
                  Опыт работы обязателен.
                </p>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  Откликов: <span className="text-emerald-400 font-semibold">7</span>
                </span>
                <button className="text-xs font-semibold text-white px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">
                  Просмотреть отклики →
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="py-24 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-extrabold text-white mb-4"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Категории услуг
            </motion.h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Найдите нужного специалиста по направлению — от регистрации бизнеса до полного аудита
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORIES.map((cat, i) => (
              <CategoryCard key={cat.title} cat={cat} idx={i} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-extrabold text-white mb-4"
              style={{ fontFamily: "Manrope, sans-serif" }}
            >
              Как это работает
            </motion.h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Шесть простых шагов от регистрации до выполненной задачи
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <StepCard key={step.num} step={step} idx={i} />
            ))}
          </div>
        </div>
      </section>

      {/* FOR ACCOUNTANTS */}
      <section id="for-accountants" className="py-24 px-4 sm:px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-border bg-card p-6 order-2 md:order-1"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm" style={{ fontFamily: "Manrope, sans-serif" }}>
                    Айгерим Сейткали
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">5.0 · 48 задач</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                {["НДС", "КПН", "Зарплата", "1С", "ТОО", "ИП"].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full text-xs border border-border text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Задач", value: "48" },
                  { label: "Отзывов", value: "41" },
                  { label: "Рейтинг", value: "5.0" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-secondary p-3 text-center">
                    <p className="text-xl font-extrabold text-blue-400" style={{ fontFamily: "Manrope, sans-serif" }}>
                      {m.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 flex items-center gap-3">
                <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">3 новых задачи доступны в вашем регионе прямо сейчас</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="order-1 md:order-2"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs text-blue-300 mb-5">
                <Briefcase className="w-3.5 h-3.5" /> Для бухгалтеров и специалистов
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-5 leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
                Найдите клиентов{" "}
                <span className="text-emerald-400">без посредников</span>
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Создайте профиль специалиста, получайте заявки от реальных предпринимателей по всему
                Казахстану и развивайте свою практику онлайн.
              </p>
              <ul className="flex flex-col gap-4">
                {ACCOUNTANT_FEATURES.map((f) => (
                  <FeatureItem key={f.text} icon={f.icon} text={f.text} />
                ))}
              </ul>
              <button className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors">
                Зарегистрироваться как бухгалтер <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 border-t border-border">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-blue-500/20 p-12"
            style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(6,182,212,0.05) 100%)" }}
          >
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 leading-tight" style={{ fontFamily: "Manrope, sans-serif" }}>
              Начните прямо сейчас
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto leading-relaxed">
              Разместите первую задачу бесплатно или создайте профиль бухгалтера — это займёт не больше трёх минут.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
                Разместить задачу <ArrowRight className="w-4 h-4" />
              </button>
              <button className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 text-slate-300 font-semibold transition-all">
                Зарегистрироваться как бухгалтер
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}

export default function HomePage() {
  const { user, loading, fetchUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'client') {
        router.push('/dashboard/client');
      } else if (user.role === 'accountant') {
        router.push('/dashboard/accountant');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in and not loading, show the landing page content
  if (!user && !loading) {
    return <LandingContent />;
  }

  // Default return if something goes wrong or for other cases (should be redirected)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting...</p>
    </div>
  );
}
