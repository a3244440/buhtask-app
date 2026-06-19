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
  const apiKey = process.env.EGOV_API_KEY;
  // Правильный набор данных Минюста: gbd_ul (проверено)
  const datasets = [process.env.EGOV_DATASET || 'gbd_ul'];

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
      const arr = Array.isArray(data) ? data : (data?.data || data?.elements || []);
      const obj = Array.isArray(arr) ? arr[0] : arr;
      // Реальные поля gbd_ul: nameru, namekz, bin, director, addressru, addresskz, okedru, datereg
      if (obj && (obj.nameru || obj.namekz)) {
        return {
          found: true, bin, source: 'data.egov.kz (ГБД ЮЛ)',
          name: obj.nameru || obj.namekz || '',
          director: obj.director || '',
          address: obj.addressru || obj.addresskz || '',
          oked: obj.okedru || obj.okedkz || '',
          registration_date: (obj.datereg || '').split('+')[0].split('T')[0] || '',
          status: 'Действующее',
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

  if (!bin || !/^\d{12}$/.test(bin)) {
    return NextResponse.json({ error: 'Введите корректный БИН/ИИН (12 цифр)' }, { status: 400 });
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

  // Определяем тип по 5-й цифре: БИН юрлица (4,5,6), ИИН физлица/ИП (0-3 = век/пол)
  const fifthDigit = parseInt(bin[4], 10);
  const isLikelyIndividual = fifthDigit >= 0 && fifthDigit <= 3;

  const configured = !!process.env.EGOV_API_KEY;
  return NextResponse.json({
    found: false, bin,
    isIndividual: isLikelyIndividual,
    message: !configured
      ? 'Автозаполнение настраивается. Пока заполните вручную.'
      : isLikelyIndividual
        ? 'Это ИИН индивидуального предпринимателя. По закону РК данные ИП не публикуются в открытом реестре — заполните вручную.'
        : 'Компания не найдена в реестре юрлиц. Проверьте БИН или заполните вручную.',
  });
}
