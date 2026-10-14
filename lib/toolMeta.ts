import type { Metadata } from 'next';
import { SITE, OG_IMAGE } from './siteInfo';

// Бесплатные инструменты сайта. Страницы инструментов — клиентские компоненты и не могут
// экспортировать metadata сами, поэтому их метаданные задаются в layout.tsx рядом с каждой страницей.
// Формулировки взяты из текстов самих страниц (lib/i18n.tsx), чтобы не обещать лишнего.
export interface ToolInfo {
  path: string;
  name: string;
  title: string;
  description: string;
  free: boolean;
  // Страница открывается только после входа в аккаунт (анонимного посетителя перекидывает на /auth).
  requiresLogin?: boolean;
}

export const TOOLS: ToolInfo[] = [
  {
    path: '/income-910',
    name: 'Доход для упрощёнки (ФНО 910)',
    title: 'Доход для формы 910 из банковской выписки онлайн',
    description: 'Загрузите банковскую выписку — отберём только доход за товары и услуги для упрощённой декларации (ФНО 910) ИП и ТОО в Казахстане, со сверкой ЭСФ.',
    free: false,
    requiresLogin: true,
  },
  {
    path: '/tax-calendar',
    name: 'Налоговый календарь',
    title: 'Налоговый календарь 2026 для ИП и ТОО в РК',
    description: 'Сроки сдачи отчётности и уплаты налогов в Казахстане: формы 910, 200, 300, 100 и другие. Бесплатный налоговый календарь для ИП и ТОО.',
    free: true,
    requiresLogin: true,
  },
  {
    path: '/salary-calculator',
    name: 'Калькулятор зарплаты',
    title: 'Калькулятор зарплаты РК 2026 — ОПВ, ИПН, СО, ВОСМС',
    description: 'Расчёт налогов и удержаний с зарплаты по ставкам Казахстана 2026 года: ОПВ, ИПН, СО, ВОСМС. Бесплатный онлайн-калькулятор для бухгалтера и работодателя.',
    free: true,
  },
  {
    path: '/maternity-calculator',
    name: 'Декретный калькулятор',
    title: 'Декретный калькулятор 2026 — выплаты на ребёнка',
    description: 'Все выплаты при рождении ребёнка в Казахстане: единовременные и ежемесячные (2026). Бесплатный онлайн-калькулятор декретных выплат.',
    free: true,
  },
  {
    path: '/penalty-calculator',
    name: 'Пеня по налогам',
    title: 'Расчёт пени по налогам в Казахстане онлайн',
    description: 'Расчёт пени за просрочку уплаты налогов по Налоговому кодексу РК 2026 (ст. 121). Бесплатный онлайн-калькулятор для ИП и ТОО.',
    free: true,
  },
  {
    path: '/reference',
    name: 'Справочник',
    title: 'Справочник бухгалтера РК 2026: МРП, МЗП, ставки',
    description: 'Ключевые показатели, ставки и производственный календарь Казахстана: МРП, МЗП, ставки налогов. Справочник для бухгалтера и предпринимателя.',
    free: true,
  },
  {
    path: '/bin-check',
    name: 'Проверка по БИН/ИИН',
    title: 'Проверка контрагента по БИН/ИИН онлайн',
    description: 'Проверьте контрагента по БИН или ИИН: данные компании или ИП из официального бизнес-регистра Республики Казахстан.',
    free: false,
  },
  {
    path: '/reconciliation-act',
    name: 'Акт сверки',
    title: 'Акт сверки взаиморасчётов с контрагентом онлайн',
    description: 'Формирование акта сверки взаиморасчётов с контрагентом из ваших документов. Онлайн-сервис для бухгалтера и предпринимателя.',
    free: true,
  },
];

export function toolMetadata(path: string): Metadata {
  const tool = TOOLS.find(t => t.path === path);
  if (!tool) return {};
  const url = `${SITE.url}${tool.path}`;
  return {
    title: tool.title,
    description: tool.description,
    alternates: { canonical: url },
    openGraph: { type: 'website', url, siteName: SITE.name, locale: 'ru_KZ', title: tool.title, description: tool.description, images: [OG_IMAGE] },
    twitter: { card: 'summary_large_image', title: tool.title, description: tool.description, images: [OG_IMAGE.url] },
  };
}
