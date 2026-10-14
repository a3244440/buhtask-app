import { SEO_PAGES, ALL_SEO_PAGES, CITY_BY_PAGE_SLUG } from './seoPages';
import { SITE, CONTENT_UPDATED } from './siteInfo';
import { TOOLS } from './toolMeta';

// Текстовые версии сайта для ИИ-ассистентов и поисковых ИИ (формат llmstxt.org).
// Всё собирается из тех же данных, что и страницы, поэтому тексты не расходятся с сайтом.

const abs = (path: string) => `${SITE.url}${path}`;
const cityPages = () => ALL_SEO_PAGES.filter(p => p.slug in CITY_BY_PAGE_SLUG);

const HEADER = `# ${SITE.name}

> ${SITE.name} (buhtask.kz) — маркетплейс бухгалтерских услуг в Казахстане. Предприниматель бесплатно размещает задачу, проверенные бухгалтеры откликаются, а он выбирает специалиста по опыту, отзывам и цене и платит ему напрямую, без комиссии платформы. Также на сайте есть бесплатные налоговые инструменты.

Для кого: ИП и ТОО в Казахстане. Работа удалённо по всему Казахстану или с бухгалтером в своём городе. Язык сайта: русский. Последнее обновление материалов: ${CONTENT_UPDATED}.

## Контакты

- Сайт: ${SITE.url}
- Телефон и WhatsApp: ${SITE.phoneDisplay}
- Email: ${SITE.email}
- Адрес: ${SITE.addressDisplay}
- Основатель и руководитель: ${SITE.founder.name}
`;

export function buildLlmsTxt(): string {
  const services = SEO_PAGES.map(p => `- [${p.h1}](${abs(`/uslugi/${p.slug}`)}): ${p.metaDescription}`).join('\n');
  const cities = cityPages().map(p => `- [${p.h1}](${abs(`/uslugi/${p.slug}`)})`).join('\n');
  const tools = TOOLS.map(t => `- [${t.name}](${abs(t.path)}): ${t.description}`).join('\n');
  return `${HEADER}
## Бухгалтерские услуги

${services}

## Бухгалтерские услуги по городам

${cities}

## Бесплатные инструменты

${tools}

## Optional

- [Каталог всех услуг](${abs('/uslugi')})
- [Новости и статьи для бухгалтера и бизнеса РК](${abs('/news')}): изменения налогового законодательства Казахстана, разборы форм отчётности 910, 200, 300, сроки.
- [Подробная версия этого файла](${abs('/llms-full.txt')}): полные тексты страниц услуг с вопросами и ответами.
- [Политика конфиденциальности](${abs('/privacy')})
`;
}

export function buildLlmsFullTxt(): string {
  const blocks = SEO_PAGES.map(p => {
    const sections = p.sections.map(s => `### ${s.h2}\n\n${s.text}`).join('\n\n');
    const faq = p.faq.map(f => `**${f.q}**\n${f.a}`).join('\n\n');
    return `## ${p.h1}\n\nСтраница: ${abs(`/uslugi/${p.slug}`)}\n\n${p.intro}\n\n${sections}\n\n### Частые вопросы\n\n${faq}`;
  }).join('\n\n---\n\n');
  const cities = cityPages().map(p => `- ${p.h1}: ${abs(`/uslugi/${p.slug}`)}`).join('\n');
  return `${HEADER}
Ниже — полные тексты страниц услуг ${SITE.name}. Цены ориентировочные и зависят от задачи и специалиста.

${blocks}

---

## Бухгалтерские услуги по городам

Для каждого города есть отдельная страница с ценами, ответами на частые вопросы и откликами бухгалтеров:

${cities}
`;
}
