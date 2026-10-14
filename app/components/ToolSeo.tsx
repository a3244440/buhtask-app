import { SITE } from '@/lib/siteInfo';
import { TOOLS } from '@/lib/toolMeta';

/** JSON-LD для страницы бесплатного инструмента: WebApplication + хлебные крошки. Серверный компонент. */
export default function ToolSeo({ path }: { path: string }) {
  const tool = TOOLS.find(t => t.path === path);
  if (!tool) return null;
  const url = `${SITE.url}${tool.path}`;
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${url}#app`,
        name: tool.name,
        url,
        description: tool.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        inLanguage: 'ru',
        ...(tool.free ? { isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'KZT' } } : {}),
        publisher: { '@id': `${SITE.url}/#org` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'BuhTask', item: SITE.url },
          { '@type': 'ListItem', position: 2, name: tool.name, item: url },
        ],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}
