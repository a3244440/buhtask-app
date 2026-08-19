import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { markdownToHtml, stripMarkdown, readingTime } from '@/lib/markdown';

export const revalidate = 300;

const CATEGORY_LABEL: Record<string, string> = {
  news: 'Новость', guide: 'Руководство', update: 'Обновление платформы',
};

async function getArticle(slug: string) {
  const { data } = await supabase.from('articles').select('*').eq('slug', slug).eq('published', true).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  const description = article.meta_description || article.excerpt || stripMarkdown(article.content, 160);
  return {
    title: article.title,
    description,
    alternates: { canonical: `https://buhtask.kz/news/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      url: `https://buhtask.kz/news/${article.slug}`,
      type: 'article',
      publishedTime: article.published_at,
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const html = markdownToHtml(article.content);
  const minutes = readingTime(article.content);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description || article.excerpt || stripMarkdown(article.content, 160),
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { '@type': 'Organization', name: 'BuhTask' },
    publisher: { '@type': 'Organization', name: 'BuhTask', logo: { '@type': 'ImageObject', url: 'https://buhtask.kz/icon.png' } },
    mainEntityOfPage: `https://buhtask.kz/news/${article.slug}`,
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BuhTask', item: 'https://buhtask.kz' },
      { '@type': 'ListItem', position: 2, name: 'Новости', item: 'https://buhtask.kz/news' },
      { '@type': 'ListItem', position: 3, name: article.title, item: `https://buhtask.kz/news/${article.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" /></Link>
          <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
            Разместить задачу
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600">Главная</Link> · <Link href="/news" className="hover:text-blue-600">Новости</Link> · <span className="text-gray-600 line-clamp-1">{article.title}</span>
        </nav>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{CATEGORY_LABEL[article.category] || 'Новость'}</span>
          {article.published_at && (
            <span className="text-xs text-gray-400">{new Date(article.published_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          )}
          <span className="text-xs text-gray-400">· {minutes} мин чтения</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 leading-tight">{article.title}</h1>

        <article
          className="prose prose-sm sm:prose-base max-w-none text-gray-700 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-4 [&_ul]:space-y-1 [&_a]:text-blue-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {article.source_name && (
          <p className="text-xs text-gray-400 mt-6 pt-6 border-t border-gray-100">
            По мотивам: {article.source_url ? (
              <a href={article.source_url} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-600 hover:underline">{article.source_name}</a>
            ) : article.source_name}
          </p>
        )}

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 mt-10 text-white flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <p className="font-bold text-lg">Нужен бухгалтер для вашей ситуации?</p>
            <p className="text-blue-100 text-sm mt-1">Разместите задачу бесплатно — проверенные бухгалтеры откликнутся с ценами</p>
          </div>
          <Link href="/auth" className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-yellow-300 hover:text-blue-900 transition-colors whitespace-nowrap">
            Начать бесплатно
          </Link>
        </div>

        <Link href="/news" className="inline-block mt-8 text-sm text-blue-600 hover:underline">← Все новости</Link>
      </main>

      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">
          BuhTask — маркетплейс бухгалтерских услуг в Казахстане · info@buhtask.kz
        </div>
      </footer>
    </div>
  );
}
