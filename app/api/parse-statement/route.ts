import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface ParsedTx { date: string; amount: number; type: 'income' | 'expense'; category: string; description: string; }

const CATEGORY_RULES: { cat: string; type: 'income' | 'expense'; keywords: string[] }[] = [
  { cat: 'Зарплата', type: 'expense', keywords: ['зарплат', 'оплата труда', 'жалақы', 'salary', 'заработн'] },
  { cat: 'Налоги', type: 'expense', keywords: ['налог', 'кгд', 'ипн', 'кпн', 'ндс', 'опв', 'осмс', 'соцналог', 'салық', 'бюджет', 'кбк', 'пенсионн', 'социальн отчисл'] },
  { cat: 'Аренда', type: 'expense', keywords: ['аренд', 'жалдау', 'rent', 'найм помещ'] },
  { cat: 'Закуп товара', type: 'expense', keywords: ['товар', 'поставк', 'закуп', 'оптов', 'материал', 'тауар'] },
  { cat: 'Реклама', type: 'expense', keywords: ['реклам', 'маркетинг', 'instagram', 'таргет', 'смм', 'жарнама'] },
  { cat: 'Коммунальные', type: 'expense', keywords: ['комму', 'электр', 'қазақгаз', 'qazaqgaz', 'отоплен', 'energo', 'теплоснаб', 'водоснаб'] },
  { cat: 'Транспорт', type: 'expense', keywords: ['такси', 'бензин', 'топлив', 'доставк', 'logist', 'indrive', 'жанармай'] },
  { cat: 'Связь/интернет', type: 'expense', keywords: ['интернет', 'связь', 'telecom', 'beeline', 'kcell', 'tele2', 'altel', 'байланыс'] },
  { cat: 'Банковские расходы', type: 'expense', keywords: ['комисс', 'обслужив', 'эквайр', 'рко', 'комиссия банк'] },
  { cat: 'Продажи', type: 'income', keywords: ['продаж', 'оплата за товар', 'выручк', 'сату', 'эквайринг', 'kaspi pay', 'kaspi pos'] },
  { cat: 'Услуги', type: 'income', keywords: ['услуг', 'қызмет', 'оплата за услуг', 'service', 'выполнен работ'] },
  { cat: 'Аванс от клиента', type: 'income', keywords: ['аванс', 'предоплат', 'депозит'] },
];

function categorize(description: string, type: 'income' | 'expense'): string {
  const lower = (description || '').toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.type !== type) continue;
    if (rule.keywords.some(k => lower.includes(k))) return rule.cat;
  }
  return type === 'income' ? 'Прочий доход' : 'Прочий расход';
}

// Парсинг суммы: "1 234,56" / "1,234.56" / "1234.56" / "1 234 567,89"
function parseAmount(raw: any): number {
  if (typeof raw === 'number') return Math.abs(raw);
  if (!raw) return 0;
  let s = String(raw).trim();
  // убираем валюту, пробелы (включая неразрывные), буквы
  s = s.replace(/[₸$€\s\u00A0\u202F]/g, '').replace(/[a-zA-Zа-яА-Я]/g, '');
  if (!s) return 0;
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    // последний разделитель — десятичный
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (hasComma) {
    // запятая десятичный только если 1-2 цифры после
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

// Поиск индексов колонок по заголовкам выписки
function findColumns(rows: any[][]): { dateCol: number; debitCol: number; creditCol: number; descCol: number; amountCol: number; senderCol: number; receiverCol: number; counterpartyCol: number; headerRow: number } | null {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    let dateCol = -1, debitCol = -1, creditCol = -1, descCol = -1, amountCol = -1, senderCol = -1, receiverCol = -1, counterpartyCol = -1;
    row.forEach((cell, idx) => {
      if (dateCol < 0 && /дата|күн|date/.test(cell)) dateCol = idx;
      if (debitCol < 0 && /дебет|debit|расход|списан|шығыс/.test(cell)) debitCol = idx;
      if (creditCol < 0 && /кредит|credit|приход|зачислен|поступлен|кіріс/.test(cell)) creditCol = idx;
      if (descCol < 0 && /назначен|описан|детал|операц|мақсат|purpose|details|основан/.test(cell)) descCol = idx;
      if (amountCol < 0 && /сумма|сома|amount/.test(cell)) amountCol = idx;
      // Отправитель / получатель / контрагент
      if (senderCol < 0 && /отправит|плательщик|жіберуш|sender|от кого/.test(cell)) senderCol = idx;
      if (receiverCol < 0 && /получател|бенефициар|алушы|receiver|кому|payee/.test(cell)) receiverCol = idx;
      if (counterpartyCol < 0 && /контрагент|корреспондент|наименование|atauы|counterparty/.test(cell)) counterpartyCol = idx;
    });
    if (dateCol >= 0 && (debitCol >= 0 || creditCol >= 0 || amountCol >= 0)) {
      return { dateCol, debitCol, creditCol, descCol, amountCol, senderCol, receiverCol, counterpartyCol, headerRow: i };
    }
  }
  return null;
}

// Извлечение контрагента из текста назначения платежа
function extractCounterpartyFromText(text: string, type: 'income' | 'expense'): string {
  if (!text) return '';
  // Ищем организации: ТОО "...", ИП ..., АО "...", и т.п.
  const orgMatch = text.match(/(ТОО|АО|ИП|ОАО|ЗАО|ГУ|ПК|КХ|ФИЛИАЛ)\s*["«»]?[А-ЯЁA-Zа-яёa-z0-9\s\-]{2,40}["«»]?/i);
  if (orgMatch) {
    const org = orgMatch[0].trim();
    return (type === 'income' ? 'От: ' : 'Кому: ') + org;
  }
  // Ищем ФИО (три слова с заглавной)
  const fioMatch = text.match(/[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(\s+[А-ЯЁ][а-яё]+)?/);
  if (fioMatch) {
    return (type === 'income' ? 'От: ' : 'Кому: ') + fioMatch[0].trim();
  }
  return '';
}

function extractFromSheet(rows: any[][]): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const cols = findColumns(rows);

  if (cols) {
    // Структурированный парсинг по колонкам
    for (let i = cols.headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const dateStr = parseDate(String(row[cols.dateCol] ?? ''));
      if (!dateStr) continue;

      const debit = cols.debitCol >= 0 ? parseAmount(row[cols.debitCol]) : 0;
      const credit = cols.creditCol >= 0 ? parseAmount(row[cols.creditCol]) : 0;
      let amount = 0;
      let type: 'income' | 'expense' = 'expense';

      if (credit > 0) { amount = credit; type = 'income'; }
      else if (debit > 0) { amount = debit; type = 'expense'; }
      else if (cols.amountCol >= 0) {
        const raw = row[cols.amountCol];
        amount = parseAmount(raw);
        type = (typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.,-]/g,''))) < 0 ? 'expense' : 'income';
      }
      if (amount < 1) continue;

      // Формируем описание: контрагент + назначение
      const purpose = cols.descCol >= 0 ? String(row[cols.descCol] || '').trim() : '';
      const sender = cols.senderCol >= 0 ? String(row[cols.senderCol] || '').trim() : '';
      const receiver = cols.receiverCol >= 0 ? String(row[cols.receiverCol] || '').trim() : '';
      const counterparty = cols.counterpartyCol >= 0 ? String(row[cols.counterpartyCol] || '').trim() : '';

      let description = '';
      if (type === 'income') {
        // Доход — от кого
        const from = sender || counterparty;
        if (from) description = `От: ${from}`;
        if (purpose) description += (description ? ' · ' : '') + purpose;
      } else {
        // Расход — кому
        const to = receiver || counterparty;
        if (to) description = `Кому: ${to}`;
        if (purpose) description += (description ? ' · ' : '') + purpose;
      }
      // Если ничего не нашли — пробуем извлечь контрагента из назначения платежа
      if (!description && purpose) description = purpose;
      if (!description) description = extractCounterpartyFromText(row.join(' '), type);
      description = description.replace(/\s+/g, ' ').trim().slice(0, 140);

      txs.push({ date: dateStr, amount, type, category: categorize(purpose + ' ' + counterparty + ' ' + sender + ' ' + receiver, type), description: description || 'Операция' });
    }
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
    let txs: ParsedTx[] = [];

    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];
      txs = extractFromSheet(rows);
    } else {
      return NextResponse.json({ error: 'Поддерживаются только Excel (.xlsx/.xls) и CSV. Скачайте выписку в формате Excel из приложения банка.' }, { status: 400 });
    }

    // Дедуп и сортировка
    const seen = new Set<string>();
    txs = txs.filter(t => {
      const key = `${t.date}_${t.amount}_${t.type}_${t.description.slice(0,20)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      success: true,
      count: txs.length,
      transactions: txs,
      message: txs.length === 0
        ? 'Не удалось распознать операции. Убедитесь что это выписка с колонками Дата/Дебет/Кредит, или добавьте операции вручную.'
        : `Распознано операций: ${txs.length}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Ошибка обработки файла: ' + (e?.message || 'неизвестно') }, { status: 500 });
  }
}
