import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SEO_PAGES } from '@/lib/seoPages';

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

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Простая шапка */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" /></Link>
          <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
            Разместить задачу
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600">Главная</Link> · <Link href="/uslugi" className="hover:text-blue-600">Услуги</Link> · <span className="text-gray-600">{page.h1}</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">{page.h1}</h1>
        <p className="text-gray-600 leading-relaxed mb-8">{page.intro}</p>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 mb-10 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-lg">Найдите проверенного бухгалтера за 1 день</p>
            <p className="text-blue-100 text-sm mt-1">Разместите задачу бесплатно — бухгалтеры откликнутся с ценами</p>
          </div>
          <Link href="/auth" className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-yellow-300 hover:text-blue-900 transition-colors whitespace-nowrap">
            Начать бесплатно
          </Link>
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
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">
          BuhTask — маркетплейс бухгалтерских услуг в Казахстане · info@buhtask.kz · Данные актуальны на 2026 год
        </div>
      </footer>
    </div>
  );
}
