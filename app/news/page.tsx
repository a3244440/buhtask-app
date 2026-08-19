import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { stripMarkdown } from '@/lib/markdown';

export const metadata: Metadata = {
  title: 'Новости и статьи для бухгалтера и бизнеса РК',
  description:
    'Изменения в налоговом законодательстве Казахстана, разборы форм отчётности (910, 200, 300), сроки и полезные материалы для ИП и ТОО от BuhTask.',
  alternates: { canonical: 'https://buhtask.kz/news' },
};

export const revalidate = 300; // обновляем список раз в 5 минут

const CATEGORY_LABEL: Record<string, string> = {
  news: 'Новость', guide: 'Руководство', update: 'Обновление платформы',
};

export default async function NewsIndexPage() {
  const { data: articles } = await supabase
    .from('articles')
    .select('slug,title,excerpt,content,category,cover_emoji,published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

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
        <nav className="text-xs text-gray-400 mb-4">
          <Link href="/" className="hover:text-blue-600">Главная</Link> · <span className="text-gray-600">Новости</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">Новости и статьи</h1>
        <p className="text-gray-600 leading-relaxed mb-8">
          Изменения в налогах и отчётности, разборы форм 910/200/300, сроки и практические советы для ИП и ТОО в Казахстане.
        </p>

        {!articles || articles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
            Пока нет опубликованных статей — загляните позже.
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map(a => (
              <Link key={a.slug} href={`/news/${a.slug}`}
                className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">{a.cover_emoji || '📰'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{CATEGORY_LABEL[a.category] || 'Новость'}</span>
                    {a.published_at && <span className="text-xs text-gray-400">{new Date(a.published_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}</span>}
                  </div>
                  <p className="font-bold text-gray-900 mb-1">{a.title}</p>
                  <p className="text-sm text-gray-500 line-clamp-2">{a.excerpt || stripMarkdown(a.content, 160)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">
          BuhTask — маркетплейс бухгалтерских услуг в Казахстане · info@buhtask.kz
        </div>
      </footer>
    </div>
  );
}
