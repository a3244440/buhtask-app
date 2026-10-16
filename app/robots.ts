import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/siteInfo';

// Закрытые разделы кабинета и служебные страницы — не для поиска и не для ИИ-ответов.
const DISALLOW = ['/dashboard/', '/admin/', '/api/', '/auth', '/onboarding/', '/support', '/profile'];

// Поисковые и ИИ-краулеры, которым мы явно разрешаем доступ, чтобы сайт мог попадать в ответы
// ChatGPT, Claude, Perplexity, Gemini, Apple Intelligence, Яндекса и Bing.
// Для именованной группы правила из блока "*" не наследуются, поэтому disallow повторяем.
const SEARCH_AND_AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'PerplexityBot', 'Perplexity-User',
  'Google-Extended', 'Applebot-Extended',
  'YandexBot', 'Bingbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      { userAgent: SEARCH_AND_AI_BOTS, allow: '/', disallow: DISALLOW },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
