import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Tx { date: string; amount: number; type: 'income' | 'expense'; description: string; included: boolean; reason?: string; }

// Признаки, что приход — НЕ доход (исключаем из ФНО 910):
// собственные пополнения, переводы между своими счетами, возвраты, кредиты, ошибочные.
const EXCLUDE_KEYWORDS = [
  // пополнение / внесение собственных средств
  'пополнен', 'пополнение счет', 'внесение', 'внесён', 'внесен налич', 'взнос собствен',
  'собственны', 'свои средств', 'личные средств', 'пополнение карты', 'толықтыру', 'өз қаражат',
  // переводы между своими счетами
  'перевод между своими', 'между счетами', 'перевод со своего', 'на свой счет', 'свой счёт',
  'card2card', 'c2c', 'перевод с карты', 'перевод на карту',
  // возвраты / отмены
  'возврат', 'отмена', 'рефанд', 'refund', 'reversal', 'қайтару', 'сторно',
  // кредиты / займы / гранты
  'кредит', 'заём', 'займ', 'ссуда', 'овердрафт', 'транш', 'несие', 'кредитн средств',
  // проценты по вкладу / кэшбэк / бонусы
  'процент по', 'вознаграждение по вклад', 'кэшбэк', 'cashback', 'бонус', 'сыйақы',
  // прочее не-доход
  'депозит возврат', 'гарантийн', 'обеспечен', 'залог',
];

// Сильные признаки именно дохода (за товар/услугу)
const INCOME_KEYWORDS = [
  'оплата за товар', 'оплата за услуг', 'за товар', 'за услуг', 'за продукц', 'за работ',
  'выручк', 'продаж', 'эквайр', 'kaspi pay', 'kaspi pos', 'kaspi qr', 'qr оплата', 'pos оплата',
  'оплата по счет', 'оплата счет', 'оплата заказ', 'предоплат', 'аванс', 'за оказан',
  'қызмет', 'тауар', 'сату', 'төлем', 'выполнен работ', 'услуг', 'товар', 'реализац',
];

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

function parseDate(s: string): string | null {
  if (!s) return null;
  s = String(s).trim();
  let m = s.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return null;
}

function findColumns(rows: any[][]) {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    let dateCol = -1, debitCol = -1, creditCol = -1, descCol = -1, amountCol = -1, senderCol = -1, counterpartyCol = -1;
    row.forEach((cell, idx) => {
      if (dateCol < 0 && /дата|күн|date/.test(cell)) dateCol = idx;
      if (debitCol < 0 && /дебет|debit|расход|списан|шығыс/.test(cell)) debitCol = idx;
      if (creditCol < 0 && /кредит|credit|приход|зачислен|поступлен|кіріс/.test(cell)) creditCol = idx;
      if (descCol < 0 && /назначен|описан|детал|операц|мақсат|purpose|details|основан/.test(cell)) descCol = idx;
      if (amountCol < 0 && /сумма|сома|amount/.test(cell)) amountCol = idx;
      if (senderCol < 0 && /отправит|плательщик|жіберуш|sender|от кого/.test(cell)) senderCol = idx;
      if (counterpartyCol < 0 && /контрагент|корреспондент|наименование|counterparty/.test(cell)) counterpartyCol = idx;
    });
    if (dateCol >= 0 && (creditCol >= 0 || amountCol >= 0)) {
      return { dateCol, debitCol, creditCol, descCol, amountCol, senderCol, counterpartyCol, headerRow: i };
    }
  }
  return null;
}

function classify(text: string): { included: boolean; reason?: string } {
  const lower = text.toLowerCase();
  // 1. Явные исключения (собственные средства, переводы, возвраты, кредиты)
  for (const kw of EXCLUDE_KEYWORDS) {
    if (lower.includes(kw)) return { included: false, reason: 'excluded' };
  }
  // 2. Явный доход за товар/услугу
  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) return { included: true };
  }
  // 3. По умолчанию — приход без явных признаков: считаем доходом, но помечаем для проверки
  return { included: true, reason: 'unclear' };
}

function extractFromSheet(rows: any[][]): Tx[] {
  const cols = findColumns(rows);
  if (!cols) return [];
  const txs: Tx[] = [];
  for (let i = cols.headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => !c && c !== 0)) continue;
    const dateStr = cols.dateCol >= 0 ? parseDate(String(row[cols.dateCol] || '')) : null;
    if (!dateStr) continue;

    // Берём только ПРИХОД (кредит / положительная сумма)
    let amount = 0;
    const credit = cols.creditCol >= 0 ? parseAmount(row[cols.creditCol]) : 0;
    const debit = cols.debitCol >= 0 ? parseAmount(row[cols.debitCol]) : 0;
    if (credit > 0) amount = credit;
    else if (cols.amountCol >= 0 && debit === 0) {
      const raw = row[cols.amountCol];
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.,-]/g, '').replace(',', '.'));
      if (num > 0) amount = parseAmount(raw);
    }
    if (amount < 1) continue; // не приход — пропускаем (расходы для 910 не нужны)

    const purpose = cols.descCol >= 0 ? String(row[cols.descCol] || '').trim() : '';
    const sender = cols.senderCol >= 0 ? String(row[cols.senderCol] || '').trim() : '';
    const counterparty = cols.counterpartyCol >= 0 ? String(row[cols.counterpartyCol] || '').trim() : '';
    const fullText = `${purpose} ${sender} ${counterparty} ${row.join(' ')}`;

    const { included, reason } = classify(fullText);
    let description = '';
    const from = sender || counterparty;
    if (from) description = `От: ${from}`;
    if (purpose) description += (description ? ' · ' : '') + purpose;
    if (!description) description = purpose || 'Поступление';
    description = description.replace(/\s+/g, ' ').trim().slice(0, 140);

    txs.push({ date: dateStr, amount, type: 'income', description, included, reason });
  }
  return txs;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Файл не получен' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Поддерживаются только Excel (.xlsx/.xls) и CSV. Скачайте выписку в формате Excel из приложения банка.' }, { status: 400 });
    }

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];
    let txs = extractFromSheet(rows);

    // дедуп
    const seen = new Set<string>();
    txs = txs.filter(t => {
      const key = `${t.date}_${t.amount}_${t.description.slice(0, 20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const incomeTotal = txs.filter(t => t.included).reduce((s, t) => s + t.amount, 0);
    const excludedTotal = txs.filter(t => !t.included).reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      success: true,
      count: txs.length,
      transactions: txs,
      incomeTotal,
      excludedTotal,
      message: txs.length === 0
        ? 'Не удалось распознать поступления. Убедитесь что это выписка с колонками Дата/Кредит (приход).'
        : `Распознано поступлений: ${txs.length}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Ошибка обработки файла: ' + (e?.message || 'неизвестно') }, { status: 500 });
  }
}
