// Единый источник фактов о компании для структурированных данных (JSON-LD), llms.txt и метатегов.
// Важно держать эти данные одинаковыми на всех страницах — поисковые и AI-системы сверяют
// название, адрес и телефон между страницами и внешними источниками.

export const SITE = {
  url: 'https://buhtask.kz',
  name: 'BuhTask',
  email: 'info@buhtask.kz',
  phone: '+77783244440',
  phoneDisplay: '+7 778 324 4440',
  whatsappNumber: '77783244440',
  founder: { name: 'Сейілбек Әлихан Ғалымұлы', jobTitle: 'Основатель и руководитель BuhTask' },
  address: { streetAddress: 'проспект Абая, 80', addressLocality: 'Астана', addressCountry: 'KZ' },
  addressDisplay: 'г. Астана, проспект Абая, 80',
  tagline: 'Маркетплейс бухгалтерских услуг и бесплатные налоговые инструменты для бизнеса Казахстана',
} as const;

// Дата последнего реального изменения текстов на страницах услуг (ГГГГ-ММ-ДД).
// Обновляйте её только когда действительно меняете содержимое: она попадает в sitemap,
// в JSON-LD (dateModified) и в строку «Обновлено» на странице.
export const CONTENT_UPDATED = '2026-10-14';

export function formatContentDate(iso: string = CONTENT_UPDATED): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

// Картинка для превью ссылок (WhatsApp, Telegram, соцсети) и Open Graph / Twitter-карточек.
export const OG_IMAGE = {
  url: '/images/og-buhtask.jpg',
  width: 1200,
  height: 630,
  alt: 'BuhTask — бухгалтерские услуги и поиск бухгалтера в Казахстане',
};
