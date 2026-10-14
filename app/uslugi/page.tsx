import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';
import { SITE, OG_IMAGE, CONTENT_UPDATED } from '@/lib/siteInfo';
import { ServiceHeader, ServiceFooter, HeroSection, ServiceCards, HowItWorks, CompanyBlock, ToolsBlock, ContactBanner, TrustStrip, WhatsAppFloat } from './ServiceSite';
import styles from './services.module.css';

const PAGE_URL = `${SITE.url}/uslugi`;
// Заголовок вместе с суффиксом « | BuhTask» и описание держим в пределах ~60 и ~160 символов.
const TITLE = 'Бухгалтерские услуги в Казахстане для ИП и ТОО';
const DESCRIPTION = 'Все бухгалтерские услуги для бизнеса в Казахстане: поиск бухгалтера, сдача отчётности, открытие и закрытие ИП и ТОО, ведение учёта. Бесплатные инструменты.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  // Без собственного openGraph страница унаследовала бы og:url главной — задаём явно.
  openGraph: { type: 'website', url: PAGE_URL, siteName: SITE.name, locale: 'ru_KZ', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [OG_IMAGE.url] },
};

export default function UslugiIndexPage() {
  const cityPages = SEO_PAGES.filter(p => p.slug.startsWith('buhgalter-'));
  const otherServices = SEO_PAGES.filter(p => !p.slug.startsWith('buhgalter-'));
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${PAGE_URL}#webpage`,
        url: PAGE_URL,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: 'ru',
        isPartOf: { '@id': `${SITE.url}/#website` },
        dateModified: CONTENT_UPDATED,
        mainEntity: { '@id': `${PAGE_URL}#list` },
      },
      {
        '@type': 'ItemList',
        '@id': `${PAGE_URL}#list`,
        itemListElement: SEO_PAGES.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.h1, url: `${PAGE_URL}/${p.slug}` })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'BuhTask', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: 'Услуги', item: PAGE_URL },
        ],
      },
    ],
  };
  return <div className={styles.site}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '<') }} />
    <ServiceHeader />
    <main className={styles.main}>
      <nav className={styles.breadcrumb} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><span aria-current="page">Услуги</span></nav>
      <HeroSection
        heading={<>Бухгалтерские услуги<br />для ИП и ТОО</>}
        description="Ваше дело — бизнес, с бухгалтерией поможем. Найдите специалиста для отчёта, расчёта зарплаты, ведения учёта или регистрации ТОО."
        badgeText="Для ИП и ТОО в Казахстане"
        primaryCtaLabel="Найти бухгалтера"
        secondaryCtaLabel="Выбрать услугу"
      />
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
    <WhatsAppFloat />
  </div>;
}
