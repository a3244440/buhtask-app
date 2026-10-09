import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Check, FileText, Calculator, Building2, Users, MessageCircle, CalendarDays, Mail, MapPin, Phone, ShieldCheck, ReceiptText, Award } from 'lucide-react';
import styles from './services.module.css';

export const CONTACT = {
  whatsapp: 'https://wa.me/77783244440',
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

/** Original vector scene: accounting documents, a laptop and Astana's skyline. */
export function AccountingScene() {
  return <div className={styles.scene}>
    <svg viewBox="0 0 600 460" role="img" aria-label="Бухгалтерия онлайн: документы, расчёты и задачи в одном месте">
      <path d="M45 244C19 151 107 58 236 62c127 4 139-47 247 19s126 198 54 278-168 33-274 49S69 337 45 244Z" fill="#e4edff" />
      <g fill="none" stroke="#b6c9eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M370 217v-87h40v87m-30-87v-16h20v16m35 87v-59h45v59m-33-59v-25h20v25m30 59V89h24v128m-12-128V69m-5 18a14 14 0 1 1 10 0M349 217h196" />
        <path d="M66 96h45m-22-22v45M537 257h25m-13-13v26" />
      </g>
      <g transform="rotate(-9 126 262)">
        <rect x="55" y="193" width="140" height="182" rx="13" fill="white" stroke="#25497c" strokeWidth="3" />
        <rect x="73" y="211" width="62" height="13" rx="4" fill="#2f80ed" />
        <path d="M75 249h98M75 265h69M75 281h89" stroke="#c2cde0" strokeWidth="5" strokeLinecap="round" />
        <circle cx="149" cy="332" r="21" fill="#def5e8" /><path d="m139 332 7 7 13-15" stroke="#27ae60" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <path d="M169 190h244a13 13 0 0 1 13 13v156H156V203a13 13 0 0 1 13-13Z" fill="#17345b" stroke="#17345b" strokeWidth="3" />
      <rect x="169" y="204" width="244" height="141" rx="5" fill="white" />
      <rect x="169" y="204" width="54" height="141" fill="#f1f5fc" />
      <rect x="181" y="216" width="29" height="23" rx="6" fill="#2f80ed" /><text x="190" y="233" fill="white" fontSize="16" fontWeight="700">B</text>
      <path d="M181 254h29m-29 16h22m-22 16h26m-26 16h18" stroke="#aabbd4" strokeWidth="4" strokeLinecap="round" />
      <text x="237" y="233" fill="#17345b" fontSize="12" fontWeight="700">Мои задачи</text>
      <rect x="237" y="248" width="162" height="34" rx="6" fill="#eaf2ff" /><path d="M249 260h78m-78 11h51" stroke="#83a9e3" strokeWidth="4" strokeLinecap="round" /><circle cx="383" cy="265" r="7" fill="#2f80ed" />
      <rect x="237" y="291" width="162" height="34" rx="6" fill="#f0f7f3" /><path d="M249 303h93m-93 11h63" stroke="#8abea1" strokeWidth="4" strokeLinecap="round" /><path d="m378 308 4 4 7-9" stroke="#27ae60" strokeWidth="3" fill="none" />
      <path d="M156 359h270l31 21a6 6 0 0 1-4 11H129a6 6 0 0 1-4-11Z" fill="#abc3ea" stroke="#17345b" strokeWidth="3" strokeLinejoin="round" /><path d="M261 363h60l10 13h-80Z" fill="#769cd1" />
      <g transform="rotate(9 457 327)"><rect x="422" y="263" width="77" height="125" rx="13" fill="#2f80ed" stroke="#17345b" strokeWidth="3" /><rect x="431" y="281" width="59" height="89" rx="5" fill="white" /><path d="M444 303h31m-31 13h22" stroke="#aabbd4" strokeWidth="4" strokeLinecap="round" /><circle cx="460" cy="344" r="14" fill="#def5e8" /><path d="m453 345 5 5 10-11" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" /></g>
      <path d="M73 398h451" stroke="#17345b" strokeWidth="3" strokeLinecap="round" />
      <g transform="rotate(7 296 104)"><rect x="212" y="79" width="187" height="54" rx="15" fill="white" stroke="#b6c9eb" strokeWidth="2" /><circle cx="240" cy="106" r="14" fill="#def5e8" /><path d="m233 106 5 5 9-10" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" /><text x="263" y="111" fill="#17345b" fontSize="13" fontWeight="600">Всё по порядку</text></g>
    </svg>
    <div className={styles.sceneCaption}><span className={styles.onlineDot} />Для бизнеса в Казахстане</div>
  </div>;
}

const SERVICES = [
  { slug: 'buhgalterskie-uslugi', title: 'Бухгалтерия без лишних забот', text: 'Ведение учёта ИП и ТОО: от первичных документов до отчётности.', icon: Calculator, tone: 'blue', note: 'Учёт в порядке' },
  { slug: 'sdacha-otchetov', title: 'Отчётность и налоги', text: 'Подготовка деклараций и помощь со сдачей отчётов.', icon: FileText, tone: 'sky', note: 'ФНО 910 · 200 · 300' },
  { slug: 'zarplata-i-kadry', title: 'Зарплата и сотрудники', text: 'Расчёты, начисления и кадровые документы для вашей команды.', icon: Users, tone: 'mint', note: 'Забота о команде' },
  { slug: 'otkrytie-ip', title: 'Начать своё дело', text: 'Помощь с регистрацией ИП и ТОО и постановкой учёта.', icon: Building2, tone: 'lavender', note: 'От идеи к бизнесу' },
  { slug: 'vosstanovlenie-ucheta', title: 'Восстановить учёт', text: 'Разобраться в документах и привести бухгалтерию в порядок.', icon: ReceiptText, tone: 'sky', note: 'Без хаоса в документах' },
  { slug: 'konsultaciya-buhgaltera', title: 'Разобраться в вопросе', text: 'Консультация по учёту, документам и вашей ситуации.', icon: MessageCircle, tone: 'mint', note: 'Понятным языком' },
];

export function ServiceCards() {
  return <section id="services" className={styles.section}>
    <div className={styles.sectionHeading}><h2>Вы занимаетесь бизнесом.<br />Бухгалтерию найдёте здесь.</h2><p>Разовая задача или регулярное сопровождение — выберите, какая помощь нужна сейчас.</p></div>
    <div className={styles.serviceGrid}>{SERVICES.map(({ slug, title, text, icon: Icon, tone, note }) => <Link href={`/uslugi/${slug}`} key={slug} className={`${styles.serviceCard} ${styles[tone]}`}>
      <div className={styles.cardTop}><span className={styles.cardIcon}><Icon size={22} strokeWidth={1.8} /></span><span className={styles.cardArrow}><ArrowUpRight size={18} aria-hidden="true" /></span></div><h3>{title}</h3><p>{text}</p><span className={styles.cardNote}>{note}</span>
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
    </ol><Link href="/auth" className={styles.button}>Разместить задачу бесплатно</Link>
  </section>;
}

/** Taxtory-style hero visual: cutout photo, decorative ring and floating stat badges. Used in the page hero (first block). */
export function FounderPhoto() {
  return <div className={styles.companyPhotoWrap}>
    <svg className={styles.photoRing} viewBox="0 0 520 560" aria-hidden="true">
      <circle cx="330" cy="230" r="210" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" strokeDasharray="2 11" strokeLinecap="round" />
      <circle cx="330" cy="230" r="172" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
    </svg>
    <Image src="/images/founder-alikhan-cutout.webp" alt={CONTACT.founder} width={621} height={1173} sizes="(max-width: 700px) 260px, 420px" className={styles.companyPhotoImg} priority />
    <div className={`${styles.badge} ${styles.badgeTop}`}><span className={styles.badgeIcon}><Award size={18} /></span><div><strong>10 лет</strong><span>опыта в бухгалтерии</span></div></div>
    <div className={`${styles.badge} ${styles.badgeBottom}`}><span className={styles.badgeIcon}><Users size={18} /></span><div><strong>2000+</strong><span>довольных клиентов</span></div></div>
    <div className={styles.photoCaption}><strong>{CONTACT.founder}</strong><span>Основатель и руководитель BuhTask</span></div>
  </div>;
}

export function CompanyBlock() {
  return <section id="company" className={styles.company}>
    <div className={styles.companyCard}>
      <span className={styles.pill}><ShieldCheck size={17} />Люди за сервисом</span>
      <div className={styles.companyAvatarRow}>
        <Image src="/images/founder-alikhan.jpg" alt={CONTACT.founder} width={60} height={60} className={styles.companyAvatar} />
        <div><strong>{CONTACT.founder}</strong><span>Основатель и руководитель BuhTask</span></div>
      </div>
      <h2>Опыт, который экономит вам время</h2>
      <p>Алихан Сейілбек руководит BuhTask и лично знает, как устроен учёт в малом бизнесе — от первой задачи до постоянной команды бухгалтеров.</p>
      <p>Есть вопрос о BuhTask или нужна помощь с первым шагом? Свяжитесь с нами напрямую.</p>
      <a href={CONTACT.whatsapp} className={styles.button} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} />Написать в WhatsApp</a>
      <div className={styles.companyContacts}><span><MapPin size={18} />{CONTACT.address}</span><a href="tel:+77783244440"><Phone size={18} />{CONTACT.phone}</a><a href="mailto:info@buhtask.kz"><Mail size={18} />info@buhtask.kz</a></div>
    </div>
  </section>;
}

export function ToolsBlock() {
  const tools = [{ href: '/income-910', icon: FileText, title: 'Доход для формы 910', text: 'Разберите поступления из банковской выписки.' }, { href: '/tax-calendar', icon: CalendarDays, title: 'Налоговый календарь', text: 'Посмотрите сроки отчётности и платежей.' }, { href: '/salary-calculator', icon: Calculator, title: 'Калькулятор зарплаты', text: 'Рассчитайте начисления и удержания.' }];
  return <section className={`${styles.section} ${styles.tools}`}><div className={styles.sectionHeading}><h2>Полезное уже<br />под рукой</h2><p>Бесплатные инструменты BuhTask для повседневных задач бухгалтера и предпринимателя.</p></div><div className={styles.toolGrid}>{tools.map(({ href, icon: Icon, title, text }) => <Link href={href} key={href}><Icon size={26} /><h3>{title}</h3><p>{text}</p><span>Открыть инструмент <ArrowUpRight size={17} /></span></Link>)}</div></section>;
}

export function ContactBanner() {
  return <section className={styles.contactBanner}><div><h2>Давайте начнём<br />с вашей задачи</h2><p>Напишите нам или разместите задачу на платформе.<br />Выберите удобный способ начать.</p></div><div className={styles.bannerActions}><a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className={styles.whiteButton}><MessageCircle size={20} />Обсудить в WhatsApp</a><Link href="/auth" className={styles.outlineButton}>Разместить задачу</Link></div></section>;
}

export function ServiceFooter() {
  return <footer className={styles.footer}><div className={styles.footerTop}><div><Link href="/" className={styles.brand}><Image src="/images/logo-new.png" width={44} height={44} alt="" /><span>BuhTask</span></Link><p>Бухгалтерские услуги и инструменты<br />для бизнеса в Казахстане.</p></div><div><h3>Свяжитесь с нами</h3><a href="tel:+77783244440">{CONTACT.phone}</a><a href="mailto:info@buhtask.kz">info@buhtask.kz</a><p>{CONTACT.address}</p></div><div><h3>Полезные страницы</h3><Link href="/uslugi">Все услуги</Link><Link href="/news">Новости и статьи</Link><Link href="/privacy">Конфиденциальность</Link></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} BuhTask</span><span>Предпринимателям — время. Бухгалтерам — возможности.</span><Link href="/">На главную</Link></div></footer>;
}

export function TrustStrip() {
  return <div className={styles.trustStrip}><span><Check size={18} />Бесплатное размещение задачи</span><span><Check size={18} />Выбор по опыту и отзывам</span><span><Check size={18} />Работа онлайн по всему Казахстану</span></div>;
}
