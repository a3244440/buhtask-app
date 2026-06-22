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
function findColumns(rows: any[][]): { dateCol: number; debitCol: number; creditCol: number; descCol: number; amountCol: number; headerRow: number } | null {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i].map(c => String(c || '').toLowerCase());
    let dateCol = -1, debitCol = -1, creditCol = -1, descCol = -1, amountCol = -1;
    row.forEach((cell, idx) => {
      if (dateCol < 0 && /дата|күн|date/.test(cell)) dateCol = idx;
      if (debitCol < 0 && /дебет|debit|расход|списан|шығыс/.test(cell)) debitCol = idx;
      if (creditCol < 0 && /кредит|credit|приход|зачислен|поступлен|кіріс/.test(cell)) creditCol = idx;
      if (descCol < 0 && /назначен|описан|детал|контрагент|операц|мақсат|purpose|details/.test(cell)) descCol = idx;
      if (amountCol < 0 && /сумма|сома|amount/.test(cell)) amountCol = idx;
    });
    // нашли заголовок если есть дата и (дебет/кредит или сумма)
    if (dateCol >= 0 && (debitCol >= 0 || creditCol >= 0 || amountCol >= 0)) {
      return { dateCol, debitCol, creditCol, descCol, amountCol, headerRow: i };
    }
  }
  return null;
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

      const description = cols.descCol >= 0 ? String(row[cols.descCol] || '').trim().slice(0, 120) : 'Операция';
      txs.push({ date: dateStr, amount, type, category: categorize(description, type), description: description || 'Операция' });
    }
  }

  return txs;
}

// PDF: извлечение текста через pdfjs-dist (серверный legacy build)
async function extractFromPdf(buffer: Buffer): Promise<ParsedTx[]> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // Отключаем воркер в серверной среде
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true, isEvalSupported: false });
  const pdf = await loadingTask.promise;
  const lines: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Группируем элементы по Y-координате (строки)
    const rowsMap: { [y: string]: { x: number; str: string }[] } = {};
    for (const item of content.items as any[]) {
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const key = String(y);
      if (!rowsMap[key]) rowsMap[key] = [];
      rowsMap[key].push({ x, str: item.str });
    }
    // Сортируем строки сверху вниз, элементы в строке слева направо
    const ys = Object.keys(rowsMap).map(Number).sort((a, b) => b - a);
    for (const y of ys) {
      const line = rowsMap[String(y)].sort((a, b) => a.x - b.x).map(i => i.str).join(' ').trim();
      if (line) lines.push(line);
    }
  }

  // Парсим строки: дата + суммы
  const txs: ParsedTx[] = [];
  for (const line of lines) {
    const dateStr = parseDate(line);
    if (!dateStr) continue;
    // Находим денежные значения (с разделителями тысяч и копейками)
    const moneyMatches = line.match(/\d[\d\s\u00A0]*[.,]\d{2}(?!\d)/g) || [];
    if (moneyMatches.length === 0) continue;
    const amounts = moneyMatches.map(parseAmount).filter(a => a >= 1);
    if (amounts.length === 0) continue;

    // В строке выписки обычно: сумма операции и остаток. Остаток обычно последний и больше.
    // Берём наименьшую сумму как операцию (остаток ≥ сумма операции), но если одна — её.
    let amount: number;
    if (amounts.length === 1) amount = amounts[0];
    else { amounts.sort((a, b) => a - b); amount = amounts[0]; }

    const isExpense = /списан|расход|дебет|debit|оплата|перевод исходящ|комисс|снятие/i.test(line)
      && !/зачислен|пополнен|поступлен|кредит/i.test(line);
    const type: 'income' | 'expense' = isExpense ? 'expense' : 'income';
    const description = line.replace(/\d[\d\s\u00A0]*[.,]\d{2}/g, '').replace(dateStr, '')
      .replace(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
    txs.push({ date: dateStr, amount, type, category: categorize(description, type), description: description || 'Операция' });
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

    if (name.endsWith('.pdf')) {
      txs = await extractFromPdf(buffer);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as any[][];
      txs = extractFromSheet(rows);
    } else {
      return NextResponse.json({ error: 'Поддерживаются только PDF, Excel (.xlsx/.xls) и CSV' }, { status: 400 });
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
