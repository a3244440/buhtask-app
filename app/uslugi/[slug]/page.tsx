import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';

const WHATSAPP_NUMBER = '77783244440'; // +7 778 324 4440
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
const COMPANY_ADDRESS = 'г. Астана, проспект Абая, 80';
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />

      {/* Плавающая кнопка WhatsApp — всегда на виду, даже при прокрутке */}
      <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#1ebe57] text-white pl-4 pr-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5">
        <svg viewBox="0 0 32 32" className="w-6 h-6 flex-shrink-0" fill="currentColor"><path d="M16.001 3C9.107 3 3.5 8.607 3.5 15.5c0 2.29.617 4.435 1.694 6.284L3 29l7.397-2.157A12.44 12.44 0 0016 28c6.894 0 12.5-5.607 12.5-12.5S22.895 3 16.001 3zm0 22.75a10.2 10.2 0 01-5.204-1.42l-.373-.222-4.39 1.28 1.303-4.28-.243-.39a10.22 10.22 0 01-1.594-5.418c0-5.653 4.598-10.25 10.25-10.25 5.653 0 10.25 4.597 10.25 10.25 0 5.652-4.597 10.25-10.25 10.25zm5.62-7.665c-.308-.154-1.82-.898-2.102-1-.282-.103-.487-.154-.692.154-.205.308-.795 1-.975 1.205-.18.205-.36.23-.667.077-.308-.154-1.3-.479-2.475-1.527-.915-.816-1.533-1.823-1.712-2.131-.18-.308-.019-.474.135-.628.138-.138.308-.36.462-.54.154-.18.205-.308.308-.513.103-.205.051-.385-.026-.539-.077-.154-.692-1.667-.949-2.283-.25-.6-.504-.519-.692-.529-.18-.009-.385-.011-.59-.011-.205 0-.539.077-.821.385-.282.308-1.077 1.052-1.077 2.565 0 1.513 1.102 2.975 1.256 3.18.154.205 2.17 3.313 5.257 4.646.735.317 1.309.507 1.756.649.738.235 1.41.202 1.94.122.592-.088 1.82-.744 2.077-1.462.256-.718.256-1.333.18-1.462-.077-.128-.282-.205-.59-.36z"/></svg>
        <span className="font-semibold text-sm hidden sm:inline">Написать в WhatsApp</span>
      </a>

      {/* Простая шапка */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <Link href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" /></Link>
          <div className="flex items-center gap-2">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 border border-[#25D366] text-[#1ebe57] text-sm font-semibold rounded-xl hover:bg-[#25D366]/5">
              WhatsApp
            </a>
            <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
              Разместить задачу
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600">Главная</Link> · <Link href="/uslugi" className="hover:text-blue-600">Услуги</Link> · <span className="text-gray-600">{page.h1}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{page.h1}</h1>
        <p className="text-gray-600 leading-relaxed mb-8">{page.intro}</p>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-lg">Найдите проверенного бухгалтера за 1 день</p>
            <p className="text-blue-100 text-sm mt-1">Разместите задачу бесплатно — бухгалтеры откликнутся с ценами</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold rounded-xl transition-colors whitespace-nowrap">
              <svg viewBox="0 0 32 32" className="w-4 h-4" fill="currentColor"><path d="M16.001 3C9.107 3 3.5 8.607 3.5 15.5c0 2.29.617 4.435 1.694 6.284L3 29l7.397-2.157A12.44 12.44 0 0016 28c6.894 0 12.5-5.607 12.5-12.5S22.895 3 16.001 3z"/></svg>
              Написать
            </a>
            <Link href="/auth" className="px-5 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-yellow-300 hover:text-blue-900 transition-colors whitespace-nowrap">
              Начать бесплатно
            </Link>
          </div>
        </div>

        {/* Основатель / руководитель компании — реальный человек за брендом, для доверия */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <img src="/images/founder-alikhan.jpg" alt={FOUNDER_NAME}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover flex-shrink-0 border-2 border-gray-100" />
          <div className="flex-1">
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-1">Кто отвечает за качество</p>
            <p className="font-bold text-gray-900 text-lg">{FOUNDER_NAME}</p>
            <p className="text-sm text-gray-500 mb-3">{FOUNDER_TITLE}</p>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1ebe57] hover:underline">
              Написать напрямую в WhatsApp →
            </a>
          </div>
        </div>

        {page.sections.map((s, i) => (
          <section key={i} className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">{s.h2}</h2>
            <p className="text-gray-600 leading-relaxed">{s.text}</p>
          </section>
        ))}

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Частые вопросы</h2>
          <div className="space-y-3">
            {page.faq.map((f, i) => (
              <details key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 group">
                <summary className="font-semibold text-gray-900 text-sm cursor-pointer list-none flex items-center justify-between">
                  {f.q}
                  <span className="text-gray-300 group-open:rotate-45 transition-transform text-lg leading-none">+</span>
                </summary>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Полезные инструменты */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Бесплатные инструменты BuhTask</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Link href="/income-910" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow transition-all font-medium text-gray-800">📊 Доход для формы 910 из выписки</Link>
            <Link href="/tax-calendar" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow transition-all font-medium text-gray-800">📅 Налоговый календарь 2026</Link>
            <Link href="/salary-calculator" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow transition-all font-medium text-gray-800">💰 Калькулятор зарплаты и налогов</Link>
            <Link href="/reference" className="bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:shadow transition-all font-medium text-gray-800">📖 МРП, МЗП и ставки 2026</Link>
          </div>
        </section>

        {/* Другие услуги */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Другие услуги</h2>
          <div className="flex flex-wrap gap-2">
            {SEO_PAGES.filter(p => p.slug !== page.slug).map(p => (
              <Link key={p.slug} href={`/uslugi/${p.slug}`} className="px-3 py-2 bg-white border border-gray-100 rounded-xl text-sm text-gray-700 hover:border-blue-200 hover:text-blue-700 transition-colors">
                {p.h1}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-sm text-gray-500">
          <div className="grid sm:grid-cols-3 gap-6 mb-6">
            <div>
              <img src="/images/logo-new.png" alt="BuhTask" className="h-8 w-auto mb-2" />
              <p className="text-xs text-gray-400">Бухгалтерские услуги в Казахстане</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1.5">Контакты</p>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="block text-sm text-gray-600 hover:text-[#1ebe57] mb-1">WhatsApp: +7 778 324 4440</a>
              <a href="mailto:info@buhtask.kz" className="block text-sm text-gray-600 hover:text-blue-600">info@buhtask.kz</a>
            </div>
            <div>
              <p className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-1.5">Адрес</p>
              <p className="text-sm text-gray-600">{COMPANY_ADDRESS}</p>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-400 text-center">
            BuhTask — маркетплейс бухгалтерских услуг в Казахстане · Данные актуальны на 2026 год
          </div>
        </div>
      </footer>
    </div>
  );
}
