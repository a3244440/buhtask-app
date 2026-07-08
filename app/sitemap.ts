import type { MetadataRoute } from 'next';
import { ALL_SEO_PAGES as SEO_PAGES } from '@/lib/seoPages';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://buhtask.kz';
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/uslugi`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/income-910`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/tax-calendar`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/salary-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/maternity-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/penalty-calculator`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/reference`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/reconciliation-act`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
  ];
  const seoPages: MetadataRoute.Sitemap = SEO_PAGES.map(p => ({
    url: `${base}/uslugi/${p.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));
  return [...staticPages, ...seoPages];
}
