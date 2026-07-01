import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface EsfRow { date: string; turnoverDate: string; number: string; counterparty: string; bin: string; amount: number; status: string; included: boolean; }

// Статусы ЭСФ, которые НЕ берём в доход
const EXCLUDE_STATUSES = ['отозван', 'аннулирован', 'отозванный', 'аннулированный', 'отзыв', 'аннулир', 'revoked', 'cancelled', 'canceled'];
// Статусы, которые остаются в доходе (доставлен, не просмотрен, просмотрен, выписан)
// всё, что не в EXCLUDE — берём

function parseAmount(raw: any): number {
  if (typeof raw === 'number') return Math.abs(raw);
  if (!raw) return 0;
  let s = String(raw).trim().replace(/[₸$€\s\u00A0\u202F]/g, '').replace(/[a-zA-Zа-яА-Я]/g, '');
  if (!s) return 0;
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    const after = s.split(',')[1] || '';
    s = after.length <= 2 ? s.replace(',', '.') : s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.abs(n);
}

function parseDate(s: string): string {
  if (!s) return '';
  s = String(s).trim();
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  return '';
}

function findColumns(rows: any[][]) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    let dateCol = -1, turnoverCol = -1, numCol = -1, cpCol = -1, amountCol = -1, statusCol = -1, reasonCol = -1, binCol = -1;
    row.forEach((cell, idx) => {
      if (statusCol < 0 && /статус сч[её]та|статус счет|^статус$|status/.test(cell)) statusCol = idx;
      if (dateCol < 0 && /дата выписк/.test(cell)) dateCol = idx;
      if (turnoverCol < 0 && /дата соверш|дата оборот/.test(cell)) turnoverCol = idx;
      if (numCol < 0 && /номер сч[её]та|номер счет|рег.*номер/.test(cell)) numCol = idx;
      // наименование получателя (строго "наименование ... получател")
      if (cpCol < 0 && /наименование получател/.test(cell)) cpCol = idx;
      // БИН получателя (иин/бин ... получател)
      if (binCol < 0 && /(иин|бин).*получател/.test(cell)) binCol = idx;
      if (amountCol < 0 && /стоимость.*с уч[её]т.*косвенн|стоимость.*с уч[её]т.*налог/.test(cell)) amountCol = idx;
      if (reasonCol < 0 && /причина аннул|причина отз/.test(cell)) reasonCol = idx;
    });
    // запасной поиск суммы — размер оборота по реализации
    if (amountCol < 0) {
      row.forEach((cell, idx) => {
        if (amountCol < 0 && /размер оборота|оборот по реализ/.test(cell)) amountCol = idx;
      });
    }
    if (statusCol >= 0 && amountCol >= 0) {
      return { dateCol, turnoverCol, numCol, cpCol, amountCol, statusCol, reasonCol, binCol, headerRow: i };
    }
  }
  return null;
}

function extractEsf(rows: any[][]): EsfRow[] {
  const cols = findColumns(rows);
  if (!cols) return [];
  const out: EsfRow[] = [];
  for (let i = cols.headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c && c !== 0)) continue;
    const amount = parseAmount(row[cols.amountCol]);
    if (amount < 1) continue;
    const status = cols.statusCol >= 0 ? String(row[cols.statusCol] || '').trim() : '';
    const statusLower = status.toLowerCase();
    const excluded = EXCLUDE_STATUSES.some(s => statusLower.includes(s));
    out.push({
      date: cols.dateCol >= 0 ? parseDate(String(row[cols.dateCol] || '')) : '',
      turnoverDate: cols.turnoverCol >= 0 ? parseDate(String(row[cols.turnoverCol] || '')) : '',
      number: cols.numCol >= 0 ? String(row[cols.numCol] || '').trim() : '',
      counterparty: cols.cpCol >= 0 ? String(row[cols.cpCol] || '').trim().slice(0, 80) : '',
      bin: cols.binCol >= 0 ? String(row[cols.binCol] || '').trim().replace(/\D/g, '') : '',
      amount,
      status,
      included: !excluded,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Файл не получен' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Поддерживаются только Excel (.xlsx/.xls) и CSV.' }, { status: 400 });
    }

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];
    const esf = extractEsf(rows);

    if (esf.length === 0) {
      return NextResponse.json({ error: 'Не удалось распознать ЭСФ. Убедитесь, что это выгрузка ЭСФ со столбцами Статус и Сумма.' }, { status: 200 });
    }

    const includedTotal = esf.filter(e => e.included).reduce((s, e) => s + e.amount, 0);
    const excludedTotal = esf.filter(e => !e.included).reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      success: true,
      count: esf.length,
      rows: esf,
      includedTotal,
      excludedTotal,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Ошибка обработки файла ЭСФ: ' + (e?.message || 'неизвестно') }, { status: 500 });
  }
}
