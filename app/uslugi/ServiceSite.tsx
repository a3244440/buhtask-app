import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Check, FileText, Calculator, Building2, Users, MessageCircle, CalendarDays, Mail, MapPin, Phone, ShieldCheck, ReceiptText, Star, Clock, TrendingUp } from 'lucide-react';
import { WHATSAPP_URL } from '@/lib/siteInfo';
import styles from './services.module.css';

export const CONTACT = {
  whatsapp: WHATSAPP_URL,
  phone: '+7 778 324 4440',
  address: 'г. Астана, проспект Абая, 80',
  founder: 'Сейілбек Әлихан Ғалымұлы',
};

export function ServiceHeader() {
  return <header className={styles.header}>
    <div className={styles.headerInner}>
      <Link href="/" className={styles.brand} aria-label="BuhTask — главная"><Image src="/images/logo-new.png" width={54} height={54} alt="" /><span>BuhTask</span></Link>
      <nav className={styles.nav} aria-label="Навигация по услугам"><Link href="/uslugi">Услуги</Link><a href="#how-it-works">Как это работает</a><a href="#company">О компании</a><Link href="/income-910">Доход 910</Link></nav>
      <div className={styles.headerActions}><Link href="/auth" className={styles.login}>Войти</Link><a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.button}>Обсудить задачу</a></div>
    </div>
  </header>;
}

const SERVICES = [
  { slug: 'buhgalterskie-uslugi', title: 'Бухгалтерия без лишних забот', text: 'Ведение учёта ИП и ТОО: от первичных документов до отчётности.', icon: Calculator, tone: 'toneInk', note: 'Учёт в порядке' },
  { slug: 'sdacha-otchetov', title: 'Отчётность и налоги', text: 'Подготовка деклараций и помощь со сдачей отчётов.', icon: FileText, tone: 'toneSky', note: 'ФНО 910, 200, 300' },
  { slug: 'zarplata-i-kadry', title: 'Зарплата и сотрудники', text: 'Расчёты, начисления и кадровые документы для вашей команды.', icon: Users, tone: 'toneLime', note: 'Забота о команде' },
  { slug: 'otkrytie-ip', title: 'Начать своё дело', text: 'Помощь с регистрацией ИП и ТОО и постановкой учёта.', icon: Building2, tone: 'toneWhite', note: 'От идеи к бизнесу' },
  { slug: 'vosstanovlenie-ucheta', title: 'Восстановить учёт', text: 'Разобраться в документах и привести бухгалтерию в порядок.', icon: ReceiptText, tone: 'toneSky', note: 'Без хаоса в документах' },
  { slug: 'konsultaciya-buhgaltera', title: 'Разобраться в вопросе', text: 'Консультация по учёту, документам и вашей ситуации.', icon: MessageCircle, tone: 'toneBlue', note: 'Понятным языком' },
];

export function ServiceCards() {
  return <section id="services" className={styles.section}>
    <div className={styles.sectionHeading}><h2>Вы занимаетесь бизнесом.<br />Бухгалтерию найдёте здесь.</h2><p>Разовая задача или регулярное сопровождение — выберите, какая помощь нужна сейчас.</p></div>
    <div className={styles.serviceGrid}>{SERVICES.map(({ slug, title, text, icon: Icon, tone, note }) => <Link href={`/uslugi/${slug}`} key={slug} className={`${styles.serviceCard} ${styles[tone]}`}>
      <div className={styles.cardTop}><span className={styles.cardIcon}><Icon size={22} strokeWidth={1.8} /></span><span className={styles.cardArrow}><ArrowUpRight size={18} aria-hidden="true" /></span></div><h3>{title}</h3><p>{text}</p><span className={styles.cardNote}>{note}</span>
    </Link>)}</div>
  </section>;
}

// Страницы про ТОО: открыть, зарегистрировать, закрыть. Сроки и цены — те же, что в текстах самих страниц.
const TOO_LINKS = [
  { slug: 'otkrytie-too', title: 'Открыть ТОО', note: 'Под ключ от 20 000 ₸, за 1-3 рабочих дня' },
  { slug: 'registraciya-too', title: 'Регистрация ТОО', note: 'Госрегистрация малого бизнеса бесплатна, около 1 дня' },
  { slug: 'otkrytie-too-astana', title: 'Открыть ТОО в Астане', note: 'Онлайн, без визита в госорган' },
  { slug: 'registraciya-too-astana', title: 'Регистрация ТОО в Астане', note: 'Порядок действий, сроки и стоимость' },
  { slug: 'zakrytie-too', title: 'Закрыть ТОО: ликвидация', note: 'Пошагово, сроки 3-6 месяцев' },
];

export function TooServices({ currentSlug }: { currentSlug?: string }) {
  return <section className={styles.tooPanel} aria-labelledby="too-title">
    <div className={styles.tooIntro}>
      <h2 id="too-title">ТОО под ключ: от регистрации до закрытия</h2>
      <p>Открытие, регистрация и ликвидация ТОО с бухгалтером с платформы: документы, заявка, налоговый режим и учёт.</p>
      <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.button}><MessageCircle size={19} />Обсудить в WhatsApp</a>
    </div>
    <div className={styles.tooList}>{TOO_LINKS.filter(l => l.slug !== currentSlug).map(({ slug, title, note }) => <Link href={`/uslugi/${slug}`} key={slug}>
      <span><strong>{title}</strong><small>{note}</small></span><span className={styles.tooArrow}><ArrowUpRight size={20} aria-hidden="true" /></span>
    </Link>)}</div>
  </section>;
}

export function HowItWorks() {
  return <section id="how-it-works" className={`${styles.section} ${styles.process}`}>
    <div className={styles.sectionHeading}><h2>Начать проще,<br />чем кажется</h2><p>BuhTask соединяет предпринимателей и бухгалтеров. Вы выбираете специалиста и договариваетесь об условиях работы.</p></div>
    <ol className={styles.steps}>
      <li><span>1</span><h3>Расскажите о задаче</h3><p>Укажите, что нужно сделать, сроки и особенности вашего бизнеса.</p></li>
      <li><span>2</span><h3>Выберите бухгалтера</h3><p>Сравните предложения, опыт, отзывы и стоимость работы.</p></li>
      <li><span>3</span><h3>Работайте в одном месте</h3><p>Общайтесь в чате и следите за задачей в личном кабинете.</p></li>
    </ol><Link href="/auth" className={styles.buttonInk}>Разместить задачу бесплатно</Link>
  </section>;
}

const STATS = [
  { icon: Clock, value: '10 лет', label: 'опыта в бухгалтерии' },
  { icon: Users, value: '2000+', label: 'довольных клиентов' },
  { icon: TrendingUp, value: '98%', label: 'продлевают работу с нами' },
  { icon: ShieldCheck, value: '100%', label: 'официально, с ЭЦП' },
];

// Бегущая строка под hero: направления работы компании.
const MARQUEE = ['Открыть ТОО', 'Регистрация ТОО', 'Закрыть ТОО', 'Ликвидация ТОО', 'Бухгалтерские услуги', 'Сдача отчётности', 'НДС', 'Зарплата и кадры', 'Открыть ИП', 'Восстановление учёта'];

/** Выделяет в заголовке фразу `accent` (например, город) цветом — только если заголовок передан строкой. */
function renderHeading(heading: ReactNode, accent?: string) {
  if (typeof heading === 'string' && accent) {
    const i = heading.indexOf(accent);
    if (i >= 0) return <>{heading.slice(0, i)}<mark>{accent.replace(/ /g, ' ')}</mark>{heading.slice(i + accent.length)}</>;
  }
  return heading;
}

/** Hero: слева заголовок и призыв, справа основатель на салатовой арке; ниже бегущая строка и плашка с цифрами.
 * Один и тот же блок используется в каталоге и на страницах услуг. */
export function HeroSection({ heading, description, badgeText, primaryCtaLabel, secondaryCtaLabel, accent }: {
  heading: ReactNode;
  description: string;
  badgeText: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  accent?: string;
}) {
  return <>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.heroBadge}><ShieldCheck size={15} />{badgeText}</span>
        <h1>{renderHeading(heading, accent)}</h1>
        <p>{description}</p>
        <div className={styles.heroActions}>
          <Link href="/auth" className={styles.button}>{primaryCtaLabel}</Link>
          <a href="#services" className={styles.textLink}>{secondaryCtaLabel} <ArrowUpRight size={18} /></a>
        </div>
      </div>
      <div className={styles.heroVisual}>
        <div className={styles.arch} aria-hidden="true" />
        <Image src="/images/founder-alikhan-cutout.webp" alt={CONTACT.founder} width={871} height={1304} sizes="(max-width: 900px) 62vw, 460px" className={styles.heroPhoto} priority />
        <div className={styles.reviewCard}>
          <div className={styles.reviewStars}>{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={13} fill="#f5b544" stroke="#f5b544" />)}<strong>4.9</strong></div>
          <p>2000+ довольных клиентов доверяют нам свою бухгалтерию</p>
          <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.reviewBtn}>Написать <ArrowUpRight size={14} /></a>
        </div>
        <span className={styles.heroChip}>Отклики обычно в течение часа</span>
      </div>
    </section>
    <div className={styles.marquee} aria-hidden="true">
      <div className={styles.marqueeTrack}>{[0, 1].map(g => <div className={styles.marqueeGroup} key={g}>{MARQUEE.map(t => <span key={t}>{t}</span>)}</div>)}</div>
    </div>
    <div className={styles.statsBar}>{STATS.map(({ icon: Icon, value, label }) => <div key={label}><Icon size={22} /><strong>{value}</strong><span>{label}</span></div>)}</div>
  </>;
}

export function CompanyBlock() {
  return <section id="company" className={styles.company}>
    <div className={styles.companyCard}>
      <div className={styles.companyPhoto}>
        <Image src="/images/founder-alikhan.jpg" alt={CONTACT.founder} fill sizes="(max-width: 900px) 100vw, 480px" />
        <div className={styles.companyName}><strong>{CONTACT.founder}</strong><span>Основатель и руководитель BuhTask</span></div>
      </div>
      <div className={styles.companyBody}>
        <h2>Опыт, который экономит вам время</h2>
        <p>Алихан Сейілбек руководит BuhTask и лично знает, как устроен учёт в малом бизнесе — от первой задачи до постоянной команды бухгалтеров.</p>
        <p>Есть вопрос о BuhTask или нужна помощь с первым шагом? Свяжитесь с нами напрямую.</p>
        <a href={CONTACT.whatsapp} className={styles.buttonInk} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} />Написать в WhatsApp</a>
        <div className={styles.companyContacts}><span><MapPin size={18} />{CONTACT.address}</span><a href="tel:+77783244440"><Phone size={18} />{CONTACT.phone}</a><a href="mailto:info@buhtask.kz"><Mail size={18} />info@buhtask.kz</a></div>
      </div>
    </div>
  </section>;
}

export function ToolsBlock() {
  const tools = [{ href: '/income-910', icon: FileText, title: 'Доход для формы 910', text: 'Разберите поступления из банковской выписки.' }, { href: '/tax-calendar', icon: CalendarDays, title: 'Налоговый календарь', text: 'Посмотрите сроки отчётности и платежей.' }, { href: '/salary-calculator', icon: Calculator, title: 'Калькулятор зарплаты', text: 'Рассчитайте начисления и удержания.' }];
  return <section className={styles.section}><div className={styles.sectionHeading}><h2>Полезное уже<br />под рукой</h2><p>Бесплатные инструменты BuhTask для повседневных задач бухгалтера и предпринимателя.</p></div><div className={styles.toolGrid}>{tools.map(({ href, icon: Icon, title, text }) => <Link href={href} key={href}><Icon size={26} /><h3>{title}</h3><p>{text}</p><span>Открыть инструмент <ArrowUpRight size={17} /></span></Link>)}</div></section>;
}

export function ContactBanner() {
  return <section className={styles.contactBanner}><div><h2>Давайте начнём<br />с вашей задачи</h2><p>Напишите нам или разместите задачу на платформе.<br />Выберите удобный способ начать.</p></div><div className={styles.bannerActions}><a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.button}><MessageCircle size={20} />Обсудить в WhatsApp</a><Link href="/auth" className={styles.outlineButton}>Разместить задачу</Link></div></section>;
}

export function ServiceFooter() {
  return <footer className={styles.footer}><div className={styles.footerTop}><div><Link href="/" className={styles.brand}><Image src="/images/logo-new.png" width={44} height={44} alt="" /><span>BuhTask</span></Link><p>Бухгалтерские услуги и инструменты<br />для бизнеса в Казахстане.</p></div><div><h3>Свяжитесь с нами</h3><a href="tel:+77783244440">{CONTACT.phone}</a><a href="mailto:info@buhtask.kz">info@buhtask.kz</a><p>{CONTACT.address}</p></div><div><h3>Полезные страницы</h3><Link href="/uslugi">Все услуги</Link><Link href="/news">Новости и статьи</Link><Link href="/privacy">Конфиденциальность</Link></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} BuhTask</span><span>Предпринимателям — время. Бухгалтерам — возможности.</span><Link href="/">На главную</Link></div></footer>;
}

export function TrustStrip() {
  return <div className={styles.trustStrip}><span><Check size={18} />Бесплатное размещение задачи</span><span><Check size={18} />Выбор по опыту и отзывам</span><span><Check size={18} />Работа онлайн по всему Казахстану</span></div>;
}

/** Fixed bottom-right WhatsApp button with a pulsing ring, always visible while scrolling, on desktop and mobile alike. */
export function WhatsAppFloat() {
  return <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.waFloat} aria-label="Написать в WhatsApp">
    <span className={styles.waPulse} aria-hidden="true" />
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor"><path d="M16.004 3C9.04 3 3.4 8.64 3.4 15.604c0 2.59.73 5.01 2 7.07L3 29l6.5-2.35a12.56 12.56 0 0 0 6.5 1.8h.005c6.963 0 12.6-5.64 12.6-12.604C28.61 8.64 22.967 3 16.004 3Zm0 23.02a10.4 10.4 0 0 1-5.31-1.45l-.38-.226-3.86 1.396 1.33-3.76-.246-.386a10.39 10.39 0 0 1-1.59-5.49c0-5.76 4.69-10.45 10.45-10.45 2.79 0 5.42 1.09 7.39 3.06a10.38 10.38 0 0 1 3.06 7.39c0 5.76-4.69 10.45-10.45 10.45Zm5.73-7.82c-.314-.158-1.86-.918-2.148-1.023-.288-.105-.497-.158-.706.158-.21.316-.808 1.023-.99 1.233-.182.21-.365.236-.68.08-.314-.158-1.326-.489-2.527-1.56-.934-.833-1.565-1.862-1.748-2.177-.183-.316-.02-.486.138-.643.142-.14.316-.367.474-.55.158-.184.21-.316.315-.526.105-.21.053-.395-.026-.553-.08-.158-.706-1.7-.967-2.33-.254-.61-.512-.527-.706-.537l-.6-.01c-.21 0-.552.079-.84.395-.288.316-1.1 1.075-1.1 2.622 0 1.547 1.126 3.042 1.283 3.252.158.21 2.216 3.38 5.37 4.74.75.323 1.335.516 1.79.66.752.24 1.436.206 1.977.125.603-.09 1.86-.76 2.122-1.494.263-.734.263-1.363.184-1.494-.079-.132-.288-.21-.6-.368Z"/></svg>
  </a>;
}
