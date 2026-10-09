import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';
import { ServiceHeader, ServiceFooter, HeroSection, ServiceCards, HowItWorks, CompanyBlock, ToolsBlock, ContactBanner, TrustStrip } from '../ServiceSite';
import styles from '../services.module.css';

const WHATSAPP_NUMBER = '77783244440'; // +7 778 324 4440
const FOUNDER_NAME = 'Сейілбек Әлихан Ғалымұлы';
const FOUNDER_TITLE = 'Основатель и руководитель BuhTask';

export function generateStaticParams() {
  return SEO_PAGES.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGES.find(p => p.slug === slug);
  if (!page) return {};
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `https://buhtask.kz/uslugi/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `https://buhtask.kz/uslugi/${page.slug}`,
      type: 'article',
    },
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
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BuhTask', item: 'https://buhtask.kz' },
      { '@type': 'ListItem', position: 2, name: 'Услуги', item: 'https://buhtask.kz/uslugi' },
      { '@type': 'ListItem', position: 3, name: page.h1, item: `https://buhtask.kz/uslugi/${page.slug}` },
    ],
  };
  // LocalBusiness — реальные контакты компании помогают Google понимать, что это
  // не абстрактная страница, а действующая организация с адресом и телефоном.
  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'BuhTask',
    image: 'https://buhtask.kz/images/founder-alikhan.jpg',
    telephone: `+${WHATSAPP_NUMBER}`,
    address: { '@type': 'PostalAddress', streetAddress: 'проспект Абая, 80', addressLocality: 'Астана', addressCountry: 'KZ' },
    founder: { '@type': 'Person', name: FOUNDER_NAME, jobTitle: FOUNDER_TITLE },
    url: `https://buhtask.kz/uslugi/${page.slug}`,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd).replace(/</g, '\u003c') }} />
      <ServiceHeader />
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true">/</span><Link href="/uslugi">Услуги</Link><span aria-hidden="true">/</span><span aria-current="page">{heading}</span></nav>
        <HeroSection heading={heading} description={description} badgeText="BuhTask · Казахстан" primaryCtaLabel="Найти бухгалтера" secondaryCtaLabel="Посмотреть услуги" />
        <TrustStrip />
        <ServiceCards />
        <section className={styles.detailsSection}>
          <div className={styles.sectionHeading}><h2>{cityPage ? 'Что важно знать' : 'Подробнее об услуге'}</h2><p>Задачи, условия и стоимость — чтобы выбрать подходящий формат работы.</p></div>
          <div className={styles.detailsGrid}>{page.sections.map(section => <article key={section.h2} className={styles.detail}><h3>{section.h2}</h3><p>{section.text}</p></article>)}</div>
        </section>
        <HowItWorks />
        <CompanyBlock />
        <ToolsBlock />
        <section className={styles.faq}><h2>Ответы на<br />ваши вопросы</h2><div>{page.faq.map(f => <details key={f.q}><summary>{f.q}<span aria-hidden="true">+</span></summary><p>{f.a}</p></details>)}</div></section>
        <ContactBanner />
        <section className={styles.related}><h2>Другие услуги и города</h2><div>{SEO_PAGES.filter(p => p.slug !== page.slug).map(p => <Link key={p.slug} href={'/uslugi/' + p.slug}>{p.slug.startsWith('buhgalter-') ? p.sections[0].h2 : p.h1}</Link>)}</div></section>
      </main>
      <ServiceFooter />
    </div>
  );
}
