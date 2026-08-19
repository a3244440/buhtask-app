import type { MetadataRoute } from 'next';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';
import { supabase } from '@/lib/supabase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://buhtask.kz';
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/uslugi`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/news`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/income-910`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/tax-calendar`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/salary-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/maternity-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/penalty-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/reference`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/bin-check`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/reconciliation-act`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.map(p => ({
    url: `${base}/uslugi/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  let articlePages: MetadataRoute.Sitemap = [];
  try {
    const { data } = await supabase.from('articles').select('slug,updated_at,published_at').eq('published', true);
    articlePages = (data || []).map(a => ({
      url: `${base}/news/${a.slug}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : (a.published_at ? new Date(a.published_at) : now),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));
  } catch {
    // если таблица ещё не существует (миграция не применена) — просто пропускаем статьи в sitemap
  }

  return [...staticPages, ...seoPages, ...articlePages];
}

