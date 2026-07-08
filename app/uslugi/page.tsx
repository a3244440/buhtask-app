import type { Metadata } from 'next';
import Link from 'next/link';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';

export const metadata: Metadata = {
  title: 'Бухгалтерские услуги в Казахстане — сдача отчётов, открытие и закрытие ИП/ТОО',
  description:
    'Все бухгалтерские услуги для бизнеса Казахстана: поиск бухгалтера, сдача налоговой отчётности 910/200/300, открытие и закрытие ИП и ТОО, ведение учёта. Проверенные специалисты и бесплатные инструменты на BuhTask.',
  alternates: { canonical: 'https://buhtask.kz/uslugi' },
};

export default function UslugiIndexPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" /></Link>
          <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
            Разместить задачу
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Бухгалтерские услуги в Казахстане</h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          Разместите задачу бесплатно — проверенные бухгалтеры откликнутся с ценами. Сдача отчётности,
          открытие и закрытие бизнеса, ведение учёта для ИП и ТОО по всему Казахстану.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {SEO_PAGES.map(p => (
            <Link key={p.slug} href={`/uslugi/${p.slug}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <p className="font-bold text-gray-900 mb-1">{p.h1}</p>
              <p className="text-sm text-gray-500 line-clamp-2">{p.intro.slice(0, 120)}…</p>
              <p className="text-sm text-blue-600 font-semibold mt-3">Подробнее →</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">
          BuhTask — маркетплейс бухгалтерских услуг в Казахстане · info@buhtask.kz
        </div>
      </footer>
    </div>
  );
}
