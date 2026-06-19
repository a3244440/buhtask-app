import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CompanyData {
  found: boolean; name?: string; bin: string; director?: string; address?: string;
  oked?: string; registration_date?: string; status?: string; source?: string; message?: string;
}

const headers = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'Referer': 'https://stat.gov.kz/',
};

// stat.gov.kz — реальный API нового портала статистики (поиск юрлица по БИН)
async function tryStatGov(bin: string): Promise<CompanyData | null> {
  const endpoints = [
    `https://stat.gov.kz/api/juridical/counter/api/?bin=${bin}&lang=ru`,
    `https://stat.gov.kz/api/rbins/qp?bin=${bin}`,
    `https://stat.gov.kz/jur-search/filter?bin=${bin}`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await res.json();
      const obj = data?.obj || data?.elements?.[0] || data?.[0] || data;
      if (obj && (obj.name || obj.nameRu || obj.fullName)) {
        return {
          found: true, bin, source: 'stat.gov.kz',
          name: obj.name || obj.nameRu || obj.fullName || '',
          director: obj.fio || obj.director || obj.head || '',
          address: obj.address || obj.legalAddress || obj.addressRu || '',
          oked: obj.okedName || obj.oked || obj.okedNameRu || '',
          registration_date: obj.registerDate || obj.registrationDate || '',
          status: obj.statusName || obj.status || 'Действующее',
        };
      }
    } catch { /* next */ }
  }
  return null;
}

// goszakup.gov.kz — публичный REST API реестра участников (v3)
async function tryGoszakup(bin: string): Promise<CompanyData | null> {
  try {
    const url = `https://ows.goszakup.gov.kz/v3/subject/all?bin=${bin}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = data?.items?.[0] || data?.[0];
    if (item && (item.name_ru || item.name)) {
      return {
        found: true, bin, source: 'goszakup.gov.kz',
        name: item.name_ru || item.name || '',
        director: item.ceo || '',
        address: item.full_delivery_address || item.index_name || '',
        oked: item.oked || '', registration_date: item.regdate || '',
        status: 'Действующее',
      };
    }
  } catch { /* skip */ }
  return null;
}

// pravstat / adata fallback (открытый поиск)
async function tryAdata(bin: string): Promise<CompanyData | null> {
  try {
    const url = `https://pk.adata.kz/api/company?identifier=${bin}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const obj = data?.company || data?.data || data;
    if (obj && (obj.name || obj.nameRu)) {
      return {
        found: true, bin, source: 'adata.kz',
        name: obj.name || obj.nameRu || '',
        director: obj.director || obj.head || '',
        address: obj.address || '',
        oked: obj.oked || '', registration_date: obj.registrationDate || '',
        status: obj.status || '',
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

  const sources = [tryStatGov, tryGoszakup, tryAdata];
  for (const src of sources) {
    try {
      const result = await src(bin);
      if (result && result.found && result.name) {
        return NextResponse.json(result);
      }
    } catch { /* next source */ }
  }

  return NextResponse.json({
    found: false, bin,
    message: 'Автоматический поиск временно недоступен (госреестры требуют авторизации). Заполните данные вручную.',
  });
}
