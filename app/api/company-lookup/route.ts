import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lookup company data by BIN/IIN from open Kazakhstan sources
export async function GET(req: NextRequest) {
  const bin = req.nextUrl.searchParams.get('bin')?.trim();
  if (!bin || !/^\d{12}$/.test(bin)) {
    return NextResponse.json({ error: 'Введите корректный БИН/ИИН (12 цифр)' }, { status: 400 });
  }

  // Try the National Statistics Bureau open API (stat.gov.kz / pravstat juridical search)
  try {
    // Primary source: stat.gov.kz legal entity search API
    const statUrl = `https://stat.gov.kz/api/juridical/counter/api/?bin=${bin}&lang=ru`;
    const res = await fetch(statUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.obj || data.success)) {
        const obj = data.obj || data;
        return NextResponse.json({
          found: true,
          name: obj.name || obj.nameRu || '',
          bin,
          director: obj.fio || obj.director || '',
          address: obj.address || obj.legalAddress || '',
          oked: obj.okedName || obj.oked || '',
          registration_date: obj.registerDate || obj.registrationDate || '',
          status: obj.statusName || obj.status || 'Действующее',
        });
      }
    }
  } catch (e) {
    // fall through to fallback
  }

  // Fallback: pravstat.pk register (another open source)
  try {
    const pravUrl = `https://pravstat.pk.gov.kz/services/api/legal/${bin}`;
    const res2 = await fetch(pravUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (res2.ok) {
      const d = await res2.json();
      if (d && d.name) {
        return NextResponse.json({
          found: true, name: d.name, bin,
          director: d.director || '', address: d.address || '',
          oked: d.oked || '', registration_date: d.regDate || '', status: d.status || '',
        });
      }
    }
  } catch (e) {
    // fall through
  }

  // If no source worked, return not found (user fills manually)
  return NextResponse.json({
    found: false,
    message: 'Не удалось получить данные автоматически. Заполните вручную.',
    bin,
  });
}
