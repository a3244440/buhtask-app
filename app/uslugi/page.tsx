import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';
import { ServiceHeader, ServiceFooter, FounderPhoto, ServiceCards, HowItWorks, CompanyBlock, ToolsBlock, ContactBanner, TrustStrip } from './ServiceSite';
import styles from './services.module.css';

export const metadata: Metadata = {
  title: 'Бухгалтерские услуги в Казахстане — сдача отчётов, открытие и закрытие ИП/ТОО',
  description: 'Все бухгалтерские услуги для бизнеса Казахстана: поиск бухгалтера, сдача налоговой отчётности, открытие и закрытие ИП и ТОО, ведение учёта. Специалисты и бесплатные инструменты на BuhTask.',
  alternates: { canonical: 'https://buhtask.kz/uslugi' },
};

export default function UslugiIndexPage() {
  const cityPages = SEO_PAGES.filter(p => p.slug.startsWith('buhgalter-'));
  const otherServices = SEO_PAGES.filter(p => !p.slug.startsWith('buhgalter-'));
  return <div className={styles.site}>
    <ServiceHeader />
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><span aria-current="page">Услуги</span></nav>
      <section className={styles.companyPanel}><div className={styles.companyCopy}><span className={styles.pill}><MapPin size={15} />Для ИП и ТОО в Казахстане</span><h1>Ваше дело — бизнес.<br />С бухгалтерией поможем.</h1><p>Найдите специалиста для отчёта, расчёта зарплаты или ведения учёта. BuhTask помогает встретиться предпринимателям и бухгалтерам.</p><div className={styles.heroActions}><Link href="/auth" className={styles.whiteButton}>Найти бухгалтера</Link><a href="#services" className={styles.textLink}>Выбрать услугу <ArrowUpRight size={18} /></a></div></div><FounderPhoto /></section>
      <TrustStrip />
      <ServiceCards />
      <section className={styles.related}><h2>Все направления</h2><div>{otherServices.map(page => <Link key={page.slug} href={`/uslugi/${page.slug}`}>{page.h1}</Link>)}</div></section>
      <HowItWorks />
      <CompanyBlock />
      <ToolsBlock />
      <section className={styles.section}><div className={styles.sectionHeading}><h2>Рядом с вами.<br />И всегда онлайн.</h2><p>Выберите свой город или работайте удалённо со специалистом из другого региона.</p></div><div className={styles.cityLinks}>{cityPages.map(page => <Link key={page.slug} href={`/uslugi/${page.slug}`}>{page.sections[0].h2.replace('Бухгалтерские услуги ', '')}<ArrowUpRight size={18} /></Link>)}</div></section>
      <ContactBanner />
      <div className={styles.related} />
    </main>
    <ServiceFooter />
  </div>;
}
