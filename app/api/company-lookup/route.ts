import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CompanyData {
  found: boolean; name?: string; bin: string; director?: string; address?: string;
  oked?: string; registration_date?: string; status?: string; source?: string; message?: string;
}

const browserHeaders = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
};

// === ПЛАТНЫЙ API: ADATA.KZ ===
// Подключается когда задана переменная окружения ADATA_API_TOKEN в Vercel
async function tryAdataPaid(bin: string): Promise<CompanyData | null> {
  const token = process.env.ADATA_API_TOKEN;
  if (!token) return null;
  try {
    // Формат запроса Adata API (см. adata.kz/api-description)
    const url = `https://api.adata.kz/api/v1/company/${bin}`;
    const res = await fetch(url, {
      headers: { ...browserHeaders, 'Authorization': `Bearer ${token}`, 'X-API-KEY': token },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const obj = data?.data || data?.company || data;
    if (obj && (obj.name || obj.nameRu || obj.full_name)) {
      return {
        found: true, bin, source: 'adata.kz',
        name: obj.name || obj.nameRu || obj.full_name || '',
        director: obj.director || obj.head || obj.ceo || '',
        address: obj.address || obj.legal_address || '',
        oked: obj.oked_name || obj.oked || '',
        registration_date: obj.registration_date || obj.reg_date || '',
        status: obj.status || 'Действующее',
      };
    }
  } catch { /* skip */ }
  return null;
}

// === ПЛАТНЫЙ API: KOMPRA.KZ ===
// Подключается когда задана переменная окружения KOMPRA_API_TOKEN в Vercel
async function tryKompraPaid(bin: string): Promise<CompanyData | null> {
  const token = process.env.KOMPRA_API_TOKEN;
  if (!token) return null;
  try {
    const url = `https://api.kompra.kz/api/v2/company?bin=${bin}`;
    const res = await fetch(url, {
      headers: { ...browserHeaders, 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const obj = data?.data || data?.result || data;
    if (obj && (obj.name || obj.nameRu)) {
      return {
        found: true, bin, source: 'kompra.kz',
        name: obj.name || obj.nameRu || '',
        director: obj.director || obj.head || '',
        address: obj.address || obj.legalAddress || '',
        oked: obj.okedName || obj.oked || '',
        registration_date: obj.registrationDate || '',
        status: obj.status || 'Действующее',
      };
    }
  } catch { /* skip */ }
  return null;
}

// === БЕСПЛАТНЫЙ: goszakup.gov.kz (только участники госзакупок) ===
async function tryGoszakup(bin: string): Promise<CompanyData | null> {
  const token = process.env.GOSZAKUP_API_TOKEN; // опциональный токен goszakup
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

  // Приоритет: платные API (если настроены) -> бесплатные
  const sources = [tryAdataPaid, tryKompraPaid, tryGoszakup];
  for (const src of sources) {
    try {
      const result = await src(bin);
      if (result && result.found && result.name) {
        return NextResponse.json(result);
      }
    } catch { /* next */ }
  }

  const hasPaidKey = !!(process.env.ADATA_API_TOKEN || process.env.KOMPRA_API_TOKEN);
  return NextResponse.json({
    found: false, bin,
    message: hasPaidKey
      ? 'Компания не найдена в реестрах. Проверьте БИН или заполните вручную.'
      : 'Автозаполнение требует подключения платного API. Заполните данные вручную.',
  });
}
