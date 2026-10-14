import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_SEO_PAGES as SEO_PAGES, CITY_BY_PAGE_SLUG } from '@/lib/seoPages';
import { SITE, OG_IMAGE, CONTENT_UPDATED, formatContentDate } from '@/lib/siteInfo';
import { ServiceHeader, ServiceFooter, HeroSection, ServiceCards, TooServices, HowItWorks, CompanyBlock, ToolsBlock, ContactBanner, TrustStrip, WhatsAppFloat } from '../ServiceSite';
import styles from '../services.module.css';

export function generateStaticParams() {
  return SEO_PAGES.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGES.find(p => p.slug === slug);
  if (!page) return {};
  const url = `${SITE.url}/uslugi/${page.slug}`;
  // openGraph/twitter в странице полностью заменяют корневые (Next объединяет метаданные поверхностно),
  // поэтому картинку и остальные поля задаём здесь явно — иначе превью ссылки будет без изображения.
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, siteName: SITE.name, locale: 'ru_KZ', title: page.metaTitle, description: page.metaDescription, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: page.metaTitle, description: page.metaDescription, images: [OG_IMAGE.url] },
  };
}

export default async function SeoServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SEO_PAGES.find(p => p.slug === slug);
  if (!page) notFound();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faq.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const url = `${SITE.url}/uslugi/${page.slug}`;
  const city = CITY_BY_PAGE_SLUG[page.slug];
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BuhTask', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Услуги', item: `${SITE.url}/uslugi` },
      { '@type': 'ListItem', position: 3, name: page.h1, item: url },
    ],
  };
  // Связный граф сущностей: страница → услуга → компания (с адресом и телефоном) → организация и основатель
  // из корневого layout (#org, #founder). Так поисковики и ИИ видят одну и ту же компанию на всех страницах,
  // а для городских страниц — ещё и город, в котором оказывается услуга.
  const pageJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: page.metaTitle,
        description: page.metaDescription,
        inLanguage: 'ru',
        isPartOf: { '@id': `${SITE.url}/#website` },
        about: { '@id': `${url}#service` },
        primaryImageOfPage: { '@type': 'ImageObject', url: `${SITE.url}${OG_IMAGE.url}`, width: OG_IMAGE.width, height: OG_IMAGE.height },
        dateModified: CONTENT_UPDATED,
      },
      {
        '@type': 'Service',
        '@id': `${url}#service`,
        name: page.h1,
        serviceType: page.h1,
        description: page.intro,
        url,
        provider: { '@id': `${SITE.url}/#business` },
        areaServed: city
          ? { '@type': 'City', name: city.name, containedInPlace: { '@type': 'Country', name: 'Kazakhstan' } }
          : { '@type': 'Country', name: 'Kazakhstan' },
      },
      {
        '@type': 'ProfessionalService',
        '@id': `${SITE.url}/#business`,
        name: SITE.name,
        url: SITE.url,
        image: `${SITE.url}/images/founder-alikhan.jpg`,
        telephone: SITE.phone,
        email: SITE.email,
        address: { '@type': 'PostalAddress', ...SITE.address },
        founder: { '@id': `${SITE.url}/#founder` },
        parentOrganization: { '@id': `${SITE.url}/#org` },
        areaServed: { '@type': 'Country', name: 'Kazakhstan' },
      },
    ],
  };

  const cityPage = page.slug.startsWith('buhgalter-');
  const heading = cityPage ? page.sections[0].h2 : page.h1;
  const description = cityPage
    ? 'Найдите бухгалтера для своего ИП или ТОО. Отчётность, зарплата, документы и учёт — со специалистом, который понимает ваш бизнес.'
    : page.intro;
  return (
    <div className={styles.site}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, '\u003c') }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd).replace(/</g, '\u003c') }} />
      <ServiceHeader />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><Link href="/uslugi">Услуги</Link><span aria-hidden="true">/</span><span aria-current="page">{heading}</span></nav>
        <HeroSection heading={heading} description={description} badgeText="BuhTask, Казахстан" primaryCtaLabel="Найти бухгалтера" secondaryCtaLabel="Посмотреть услуги" accent={city?.loc} />
        <TrustStrip />
        {cityPage && city && <section className={styles.answerBlock} aria-labelledby="answer-title">
          <h2 id="answer-title">Бухгалтер {city.loc}: коротко</h2>
          <p>{page.intro}</p>
        </section>}
        <ServiceCards />
        <TooServices currentSlug={page.slug} />
        <section className={styles.detailsSection}>
          <div className={styles.sectionHeading}><h2>{cityPage ? 'Что важно знать' : 'Подробнее об услуге'}</h2><p>Задачи, условия и стоимость — чтобы выбрать подходящий формат работы.</p></div>
          <div className={styles.detailsGrid}>{page.sections.map(section => <article key={section.h2} className={styles.detail}><h3>{section.h2}</h3><p>{section.text}</p></article>)}</div>
          <p className={styles.updated}>Страница обновлена: <time dateTime={CONTENT_UPDATED}>{formatContentDate()}</time></p>
        </section>
        <HowItWorks />
        <CompanyBlock />
        <ToolsBlock />
        <section className={styles.faq}><h2>Ответы на<br />ваши вопросы</h2><div>{page.faq.map(f => <details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p></details>)}</div></section>
        <ContactBanner />
        <section className={styles.related}><h2>Другие услуги и города</h2><div>{SEO_PAGES.filter(p => p.slug !== page.slug).map(p => <Link key={p.slug} href={'/uslugi/' + p.slug}>{p.slug.startsWith('buhgalter-') ? p.sections[0].h2 : p.h1}</Link>)}</div></section>
      </main>
      <ServiceFooter />
      <WhatsAppFloat />
    </div>
  );
}
