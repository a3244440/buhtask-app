'use client';

// First-touch атрибуция: запоминаем ПЕРВЫЙ визит пользователя (UTM-метки,
// реферер, страницу входа) в localStorage и используем эти данные при
// регистрации, чтобы в CRM админ видел, откуда на самом деле пришёл клиент —
// а не то, с какой страницы он в итоге нажал «Зарегистрироваться».

const STORAGE_KEY = 'buhtask_attribution';

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
}

/** Вызывается один раз при первой загрузке любой страницы сайта (см. AttributionCapture). */
export function captureAttribution() {
  try {
    // Уже сохранено — это не первый визит, атрибуцию не перезаписываем.
    if (localStorage.getItem(STORAGE_KEY)) return;

    const params = new URLSearchParams(window.location.search);
    const data: Attribution = {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
      utm_term: params.get('utm_term') || undefined,
      utm_content: params.get('utm_content') || undefined,
      referrer: document.referrer || undefined,
      landing_page: window.location.pathname,
    };

    // Если нет ни UTM, ни реферера — это прямой заход, тоже фиксируем как факт.
    const hasAnyData = Object.values(data).some(Boolean);
    if (hasAnyData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // localStorage может быть недоступен (приватный режим и т.п.) — не критично
  }
}

/** Читает сохранённую атрибуцию (используется при регистрации). */
export function getAttribution(): Attribution {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Человекочитаемая метка источника — для отображения в CRM без расшифровки UTM вручную. */
export function attributionLabel(a: { utm_source?: string | null; referrer?: string | null }): string {
  if (a.utm_source) {
    const map: Record<string, string> = {
      google: 'Google Ads', yandex: 'Яндекс.Директ', instagram: 'Instagram',
      facebook: 'Facebook', telegram: 'Telegram', vk: 'VK', tiktok: 'TikTok',
    };
    return map[a.utm_source.toLowerCase()] || a.utm_source;
  }
  if (a.referrer) {
    try {
      const host = new URL(a.referrer).hostname.replace('www.', '');
      if (host.includes('google')) return 'Google (органика)';
      if (host.includes('yandex')) return 'Яндекс (органика)';
      if (host.includes('instagram')) return 'Instagram';
      if (host.includes('facebook')) return 'Facebook';
      if (host.includes('t.me') || host.includes('telegram')) return 'Telegram';
      if (host === 'buhtask.kz') return 'Внутренний переход';
      return host;
    } catch {
      return 'Переход по ссылке';
    }
  }
  return 'Прямой заход';
}
