import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CompanyData {
  found: boolean;
  name?: string;
  bin: string;
  director?: string;
  address?: string;
  oked?: string;
  registration_date?: string;
  status?: string;
  source?: string;
  message?: string;
}

const headers = { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; BuhTask/1.0)' };

// 1. Бюро национальной статистики (stat.gov.kz) — основной реестр юрлиц
async function tryStatGov(bin: string): Promise<CompanyData | null> {
  try {
    const url = `https://stat.gov.kz/api/juridical/counter/api/?bin=${bin}&lang=ru`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const obj = data?.obj || data;
    if (obj && (obj.name || obj.nameRu)) {
      return {
        found: true, bin, source: 'stat.gov.kz',
        name: obj.name || obj.nameRu || '',
        director: obj.fio || obj.director || '',
        address: obj.address || obj.legalAddress || '',
        oked: obj.okedName || obj.oked || '',
        registration_date: obj.registerDate || obj.registrationDate || '',
        status: obj.statusName || obj.status || 'Действующее',
      };
    }
  } catch { /* skip */ }
  return null;
}

// 2. Госзакупки (goszakup.gov.kz) — реестр участников госзакупок (GraphQL/REST)
async function tryGoszakup(bin: string): Promise<CompanyData | null> {
  try {
    const url = `https://ows.goszakup.gov.kz/v3/subject/search?bin=${bin}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = Array.isArray(data?.items) ? data.items[0] : (data?.items || data);
    if (item && (item.name_ru || item.name)) {
      return {
        found: true, bin, source: 'goszakup.gov.kz',
        name: item.name_ru || item.name || '',
        director: item.ceo || item.director_fio || '',
        address: item.full_delivery_address || item.address || '',
        oked: item.oked || '',
        registration_date: item.regdate || '',
        status: item.system_id ? 'Действующее' : '',
      };
    }
  } catch { /* skip */ }
  return null;
}

// 3. Самрук-Казына закупки (zakup.sk.kz) — реестр поставщиков
async function trySkZakup(bin: string): Promise<CompanyData | null> {
  try {
    const url = `https://zakup.sk.kz/api/usersystem/api/v1/suppliers?bin=${bin}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = Array.isArray(data?.content) ? data.content[0] : (Array.isArray(data) ? data[0] : data);
    if (item && (item.nameRu || item.name)) {
      return {
        found: true, bin, source: 'zakup.sk.kz',
        name: item.nameRu || item.name || '',
        director: item.headFio || item.director || '',
        address: item.addressRu || item.address || '',
        oked: item.oked || '',
        registration_date: item.registrationDate || '',
        status: item.status || '',
      };
    }
  } catch { /* skip */ }
  return null;
}

// 4. Mitwork (mitwork.kz) — гос-маркетплейс, реестр поставщиков
async function tryMitwork(bin: string): Promise<CompanyData | null> {
  try {
    const url = `https://mitwork.kz/api/v1/companies?bin=${bin}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const item = Array.isArray(data?.data) ? data.data[0] : (Array.isArray(data) ? data[0] : data?.data || data);
    if (item && (item.name || item.nameRu || item.company_name)) {
      return {
        found: true, bin, source: 'mitwork.kz',
        name: item.name || item.nameRu || item.company_name || '',
        director: item.director || item.ceo || '',
        address: item.address || '',
        oked: item.oked || '',
        registration_date: item.created_at || item.registration_date || '',
        status: item.status || '',
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

  // Пробуем источники по очереди, возвращаем первый успешный
  const sources = [tryStatGov, tryGoszakup, trySkZakup, tryMitwork];
  for (const src of sources) {
    const result = await src(bin);
    if (result && result.found && result.name) {
      return NextResponse.json(result);
    }
  }

  return NextResponse.json({
    found: false, bin,
    message: 'Не удалось получить данные автоматически из реестров. Заполните вручную.',
  });
}
