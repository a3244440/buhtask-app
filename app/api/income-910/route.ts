import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface Tx { date: string; amount: number; type: 'income'; description: string; counterparty: string; purpose: string; included: boolean; reason?: string; knp?: string; }

// Коды назначения платежа (КНП), являющиеся ДОХОДОМ за товары/услуги для ФНО 910.
// На основе официального классификатора КНП РК (Правила №203, разделы 7 "Товары" и 8 "Услуги").
const INCOME_KNP = new Set([
  // Раздел 7 — Товары и нематериальные активы
  '710', // Платежи за товары
  '711', // Приобретение/продажа товаров за рубежом
  '712', '713',
  '719', // Прочие платежи за товары
  // Раздел 8 — Услуги
  '841', // За работы/услуги (часть банков-эквайеров, напр. Kaspi)
  '851', // За товары и услуги
  '852', '853', '854',
  '855', // Лизинг / аренда
  '856', // Коммунальные услуги
  '857', // Услуги связи
  '858', // Услуги (реклама и пр.)
  '859', // Профессиональные, научные и технические услуги (вкл. бух/юр/консалт)
  '860', '861', '862', '863', '864', '865', '866', '867', '868', '869',
  '890', // Прочие платежи по разделу "Услуги"
  // Эквайринг розничных продаж
  '190',
]);

// Коды, которые ТОЧНО не доход
const EXCLUDE_KNP = new Set([
  '342', '343',            // перевод собственных средств / между своими счетами
  '780', '880', '881',     // возвраты за товары/услуги
  '331', '332', '333',     // переводы физлиц
  '010', '011', '012', '017', '019', // пенсионные, соц, пеня по ним
  '121', '122', '123', '124', // ОСМС и пеня
  '911', '912', '913', '914', '915', '916', '917', '918', '919', // налоги/бюджет/пеня/штрафы
]);

const EXCLUDE_KEYWORDS = [
  'перевод собствен', 'собственных средств', 'со своего', 'на свой счет', 'свой счёт',
  'пополнен', 'внесение', 'возврат', 'отмена', 'сторно', 'рефанд', 'refund',
  'кредит', 'заём', 'займ', 'овердрафт', 'кэшбэк', 'cashback', 'бонус',
  'процент по', 'вознаграждение по вклад', 'между своими', 'card2card', 'c2c',
  'налог', 'опв', 'осмс', 'ипн', 'возмещение',
];
const INCOME_KEYWORDS = [
  'продаж', 'оплата за товар', 'за товар', 'оплата за услуг', 'за услуг', 'выручк',
  'эквайр', 'kaspi.kz', 'kaspi pay', 'kaspi pos', 'за реализ', 'за продукц', 'за работ',
  'қызмет', 'тауар', 'сату', 'за оказан',
];

function classify(knp: string, text: string): { included: boolean; reason?: string } {
  const code = (knp || '').trim();
  if (code) {
    if (INCOME_KNP.has(code)) return { included: true };
    if (EXCLUDE_KNP.has(code)) return { included: false, reason: 'excluded' };
    // неизвестный код — по умолчанию НЕ включаем, помечаем на проверку
    return { included: false, reason: 'unknown_knp' };
  }
  const lower = text.toLowerCase();
  for (const kw of EXCLUDE_KEYWORDS) if (lower.includes(kw)) return { included: false, reason: 'excluded' };
  for (const kw of INCOME_KEYWORDS) if (lower.includes(kw)) return { included: true };
  return { included: false, reason: 'unclear' };
}

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
  // ISO: 2026-02-25 или 2026-02-25T15:02:07 — проверяем ПЕРВЫМ
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  // ДД.ММ.ГГГГ
  m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  return null;
}

function findColumns(rows: any[][]) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    let dateCol = -1, dateColFallback = -1, debitCol = -1, creditCol = -1, descCol = -1, amountCol = -1, senderCol = -1, knpCol = -1, indicatorCol = -1, counterpartyCol = -1;
    row.forEach((cell, idx) => {
      // Дата операции/документа важнее "даты выписки" (она у всех одинаковая)
      if (dateCol < 0 && /дата документ|дата опер|дата провод|дата валют/.test(cell)) dateCol = idx;
      if (dateColFallback < 0 && /дата выписк|дата|күн|date/.test(cell)) dateColFallback = idx;
      // индикатор дебет/кредит (Jusan): "индикатор дебета/кредита"
      if (indicatorCol < 0 && /индикатор/.test(cell) && /дебет|кредит/.test(cell)) indicatorCol = idx;
      // суммы — "сумма по кредиту"/"сумма по дебету" (не путать с индикатором)
      if (creditCol < 0 && /сумма по кредит|приход|зачислен|поступлен|кіріс/.test(cell)) creditCol = idx;
      if (creditCol < 0 && /\bкредит\b/.test(cell) && !/индикатор/.test(cell)) creditCol = idx;
      if (debitCol < 0 && /сумма по дебет|расход|списан|шығыс/.test(cell)) debitCol = idx;
      if (debitCol < 0 && /\bдебет\b/.test(cell) && !/индикатор/.test(cell)) debitCol = idx;
      if (amountCol < 0 && /сумма в нац|сумма опер|^сумма$|сома|amount/.test(cell)) amountCol = idx;
      // назначение
      if (descCol < 0 && /назначен|описан|детал|мақсат|purpose|details|основан/.test(cell)) descCol = idx;
      // контрагент: Jusan "наименование контрагента" приоритетнее "наименование клиента"
      if (counterpartyCol < 0 && /наименование контраген|контрагент|корреспондент|counterparty/.test(cell)) counterpartyCol = idx;
      if (senderCol < 0 && /бенефициар|отправит|плательщик|жіберуш|sender|наименование клиент|наименование/.test(cell)) senderCol = idx;
      // КНП
      if (knpCol < 0 && /\bкнп\b|кно|код назнач|кпн платеж/.test(cell)) knpCol = idx;
    });
    // контрагент важнее «наименования клиента» (это сам владелец счёта)
    const cpCol = counterpartyCol >= 0 ? counterpartyCol : senderCol;
    const finalDateCol = dateCol >= 0 ? dateCol : dateColFallback;
    if (finalDateCol >= 0 && (creditCol >= 0 || amountCol >= 0 || indicatorCol >= 0)) {
      return { dateCol: finalDateCol, debitCol, creditCol, descCol, amountCol, senderCol: cpCol, knpCol, indicatorCol, headerRow: i };
    }
  }
  return null;
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

    // Определяем приход. Jusan: индикатор "CREDIT"/"DEBIT" в отдельной колонке.
    let amount = 0;
    const indicator = cols.indicatorCol >= 0 ? String(row[cols.indicatorCol] || '').trim().toUpperCase() : '';
    const credit = cols.creditCol >= 0 ? parseAmount(row[cols.creditCol]) : 0;
    const debit = cols.debitCol >= 0 ? parseAmount(row[cols.debitCol]) : 0;

    if (cols.indicatorCol >= 0) {
      // Формат с индикатором: берём только CREDIT (приход)
      if (indicator.includes('CREDIT') || indicator.includes('КРЕДИТ') || indicator.includes('КІРІС')) {
        amount = credit > 0 ? credit : (cols.amountCol >= 0 ? parseAmount(row[cols.amountCol]) : 0);
      } else {
        continue; // DEBIT — расход, пропускаем
      }
    } else if (credit > 0) {
      amount = credit;
    } else if (cols.amountCol >= 0 && cols.creditCol < 0 && debit === 0) {
      const raw = row[cols.amountCol];
      const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.,-]/g, '').replace(',', '.'));
      if (num > 0) amount = parseAmount(raw);
    }
    if (amount < 1) continue;

    const purpose = cols.descCol >= 0 ? String(row[cols.descCol] || '').trim() : '';
    const sender = cols.senderCol >= 0 ? String(row[cols.senderCol] || '').trim() : '';
    const knp = cols.knpCol >= 0 ? String(row[cols.knpCol] || '').trim() : '';
    const fullText = `${purpose} ${sender}`;

    const { included, reason } = classify(knp, fullText);

    // Чистим имя контрагента: убираем ИИН/БИН, БИК-коды, лишние реквизиты
    let cp = sender
      .replace(/\n/g, ' ')
      .replace(/ИИН\/?БИН\s*\d+/gi, '')
      .replace(/БИК\s*[A-Z0-9]+/gi, '')
      .replace(/\b[A-Z]{4}KZ[A-Z0-9]{2}\b/g, '')   // SWIFT/БИК вида CASPKZKA
      .replace(/KZ\d{2}[A-Z0-9]{16}/g, '')          // IBAN
      .replace(/["«»]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    let description = cp || 'Поступление';
    if (knp) description = `[КНП ${knp}] ` + description;
    description = description.slice(0, 120);

    // короткое назначение платежа (без реквизитов)
    const purposeClean = purpose
      .replace(/\n/g, ' ')
      .replace(/ИИН\/?БИН\s*\d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100);

    txs.push({ date: dateStr, amount, type: 'income', description, counterparty: cp || '', purpose: purposeClean, included, reason, knp });
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
      return NextResponse.json({ error: 'Поддерживаются только Excel (.xlsx/.xls) и CSV.' }, { status: 400 });
    }

    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];
    let txs = extractFromSheet(rows);

    // Без дедупликации: каждая строка выписки — отдельная операция.
    // Одинаковые суммы в один день от одного контрагента — это РАЗНЫЕ платежи.
    txs.sort((a, b) => a.date.localeCompare(b.date));

    const incomeTotal = txs.filter(t => t.included).reduce((s, t) => s + t.amount, 0);
    const excludedTotal = txs.filter(t => !t.included).reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      success: true,
      count: txs.length,
      transactions: txs,
      incomeTotal,
      excludedTotal,
      message: txs.length === 0 ? 'Не удалось распознать поступления.' : `Распознано поступлений: ${txs.length}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Ошибка обработки файла: ' + (e?.message || 'неизвестно') }, { status: 500 });
  }
}
