import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Простой in-memory кеш (соблюдаем лимит 40 запросов/мин портала)
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 часа — данные компаний меняются редко

interface CompanyData {
  found: boolean; name?: string; bin: string; director?: string; address?: string;
  oked?: string; registration_date?: string; status?: string; source?: string; message?: string;
}

const browserHeaders = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

// ===== data.egov.kz — официальный портал открытых данных =====
// Набор Минюста: "Регистрационные данные юридических лиц"
// API v4 формат: /api/v4/{dataset}/{version}?source={ES query}&apiKey={key}
async function tryEgovData(bin: string): Promise<CompanyData | null> {
  const apiKey = process.env.EGOV_API_KEY || 'REVOKED_KEY_USE_ENV';
  // Возможные имена наборов данных с юрлицами (Минюст публикует под разными uri)
  const datasets = [
    process.env.EGOV_DATASET || 'legal_entities',
    'gbd_ul',
    'jur_persons',
    'registration_legal',
  ];

  for (const ds of datasets) {
    try {
      const query = {
        size: 1,
        query: { bool: { must: [{ match: { bin: bin } }] } },
      };
      let url = `https://data.egov.kz/api/v4/${ds}/v1?source=${encodeURIComponent(JSON.stringify(query))}`;
      if (apiKey) url += `&apiKey=${apiKey}`;

      const res = await fetch(url, { headers: browserHeaders, signal: AbortSignal.timeout(9000) });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;

      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data?.data || []);
      const obj = arr[0];
      if (obj && (obj.name || obj.nameRu || obj.full_name || obj.fullname)) {
        return {
          found: true, bin, source: 'data.egov.kz',
          name: obj.name || obj.nameRu || obj.full_name || obj.fullname || '',
          director: obj.fio || obj.director || obj.head || obj.rukovoditel || '',
          address: obj.address || obj.legal_address || obj.adres || '',
          oked: obj.oked || obj.activity || obj.vid_deyat || '',
          registration_date: obj.reg_date || obj.registration_date || obj.data_reg || '',
          status: obj.status || 'Действующее',
        };
      }
    } catch { /* next dataset */ }
  }
  return null;
}

// ===== goszakup.gov.kz — открытый API (участники госзакупок) =====
async function tryGoszakup(bin: string): Promise<CompanyData | null> {
  const token = process.env.GOSZAKUP_API_TOKEN;
  try {
    const url = `https://ows.goszakup.gov.kz/v3/subject/all?bin=${bin}`;
    const h: any = { ...browserHeaders };
    if (token) h['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers: h, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0] || data?.[0];
    if (item && (item.name_ru || item.name)) {
      return {
        found: true, bin, source: 'goszakup.gov.kz',
        name: item.name_ru || item.name || '',
        director: item.ceo || '',
        address: item.full_delivery_address || '',
        oked: item.oked || '', registration_date: item.regdate || '',
        status: 'Действующее',
      };
    }
  } catch { /* skip */ }
  return null;
}

export async function GET(req: NextRequest) {
  const bin = req.nextUrl.searchParams.get('bin')?.trim();
  const debug = req.nextUrl.searchParams.get('debug') === '1';

  if (!bin || !/^\d{12}$/.test(bin)) {
    return NextResponse.json({ error: 'Введите корректный БИН/ИИН (12 цифр)' }, { status: 400 });
  }

  // Режим отладки: показать сырой ответ портала и какие наборы пробуем
  if (debug) {
    const apiKey = process.env.EGOV_API_KEY || 'REVOKED_KEY_USE_ENV';
    const datasets = [process.env.EGOV_DATASET || 'gov3_legal_entities', 'legal_entities', 'jur_persons', 'gbd_ul'];
    const results: any = {};
    for (const ds of datasets) {
      try {
        const query = { size: 1, query: { bool: { must: [{ match: { bin } }] } } };
        const url = `https://data.egov.kz/api/v4/${ds}/v1?source=${encodeURIComponent(JSON.stringify(query))}&apiKey=${apiKey}`;
        const res = await fetch(url, { headers: browserHeaders, signal: AbortSignal.timeout(9000) });
        results[ds] = { status: res.status, contentType: res.headers.get('content-type'), body: (await res.text()).slice(0, 500) };
      } catch (e: any) {
        results[ds] = { error: e?.message || 'failed' };
      }
    }
    return NextResponse.json({ debug: true, bin, datasets: results });
  }

  // Проверяем кеш (соблюдаем лимит портала 40 запросов/мин)
  const cached = cache.get(bin);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  const sources = [tryEgovData, tryGoszakup];
  for (const src of sources) {
    try {
      const result = await src(bin);
      if (result && result.found && result.name) {
        // Обязательная ссылка на источник (п.8 соглашения)
        const withAttribution = { ...result, attribution: 'Источник: data.egov.kz — Открытые данные РК' };
        cache.set(bin, { data: withAttribution, ts: Date.now() });
        return NextResponse.json(withAttribution);
      }
    } catch { /* next */ }
  }

  const configured = !!process.env.EGOV_API_KEY;
  return NextResponse.json({
    found: false, bin,
    message: configured
      ? 'Компания не найдена в реестре. Проверьте БИН или заполните вручную.'
      : 'Автозаполнение настраивается (нужен API-ключ data.egov.kz). Пока заполните вручную.',
  });
}
