import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface ParsedTx { date: string; amount: number; type: 'income' | 'expense'; category: string; description: string; }

// Категоризация по ключевым словам (рус/каз/банковские термины)
const CATEGORY_RULES: { cat: string; type: 'income' | 'expense'; keywords: string[] }[] = [
  // Расходы
  { cat: 'Зарплата', type: 'expense', keywords: ['зарплат', 'зп ', 'оплата труда', 'жалақы', 'salary', 'аванс сотр'] },
  { cat: 'Налоги', type: 'expense', keywords: ['налог', 'кгд', 'ипн', 'кпн', 'ндс', 'опв', 'осмс', 'соцналог', 'салық', 'бюджет', 'кбк'] },
  { cat: 'Аренда', type: 'expense', keywords: ['аренд', 'жалдау', 'rent', 'найм помещ'] },
  { cat: 'Закуп товара', type: 'expense', keywords: ['товар', 'поставк', 'закуп', 'оптов', 'материал'] },
  { cat: 'Реклама', type: 'expense', keywords: ['реклам', 'маркетинг', 'instagram', 'google', 'facebook', 'таргет', 'смм'] },
  { cat: 'Коммунальные', type: 'expense', keywords: ['комму', 'электр', 'газ', 'вода', 'отоплен', 'energo', 'qazaqgaz'] },
  { cat: 'Транспорт', type: 'expense', keywords: ['транспорт', 'такси', 'gsm', 'бензин', 'топлив', 'доставк', 'logist', 'indrive', 'yandex'] },
  { cat: 'Связь/интернет', type: 'expense', keywords: ['интернет', 'связь', 'telecom', 'beeline', 'kcell', 'activ', 'tele2', 'altel', 'байланыс'] },
  { cat: 'Банковские расходы', type: 'expense', keywords: ['комисс', 'обслужив', 'банк', 'эквайр', 'рко', 'перевод комис'] },
  // Доходы
  { cat: 'Продажи', type: 'income', keywords: ['продаж', 'оплата за товар', 'выручк', 'сату', 'эквайринг', 'kaspi pay', 'pos '] },
  { cat: 'Услуги', type: 'income', keywords: ['услуг', 'қызмет', 'оплата за услуг', 'service', 'работ'] },
  { cat: 'Аванс от клиента', type: 'income', keywords: ['аванс', 'предоплат', 'depozit'] },
];

function categorize(description: string, type: 'income' | 'expense'): string {
  const lower = description.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.type !== type) continue;
    if (rule.keywords.some(k => lower.includes(k))) return rule.cat;
  }
  return type === 'income' ? 'Прочий доход' : 'Прочий расход';
}

// Нормализация суммы из строки "1 234,56" / "1,234.56" / "-1234.56"
function parseAmount(s: string): number {
  const cleaned = s.replace(/[^\d.,\-]/g, '').replace(/\s/g, '');
  // Если есть и точка и запятая — запятая разделитель тысяч
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    // запятая как десятичный
    normalized = cleaned.replace(',', '.');
  }
  return Math.abs(parseFloat(normalized) || 0);
}

// Парсинг даты из разных форматов
function parseDate(s: string): string | null {
  s = s.trim();
  // DD.MM.YYYY или DD/MM/YYYY
  let m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }
  // YYYY-MM-DD
  m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return null;
}

// Извлечение транзакций из текста (PDF)
function extractFromText(text: string): ParsedTx[] {
  const txs: ParsedTx[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const dateStr = parseDate(line);
    if (!dateStr) continue;
    // Ищем сумму в строке (число с разделителями)
    const amountMatches = line.match(/[-−]?\d[\d\s.,]{2,}/g);
    if (!amountMatches) continue;
    // Берём последнее крупное число как сумму операции
    let amount = 0;
    for (const am of amountMatches) {
      const v = parseAmount(am);
      if (v > amount) amount = v;
    }
    if (amount < 1) continue;
    // Определяем доход/расход по знаку минус или ключевым словам
    const isExpense = /[-−]/.test(line) || /списан|расход|оплата|перевод исходящ|debit/i.test(line);
    const type: 'income' | 'expense' = isExpense ? 'expense' : 'income';
    const description = line.replace(/[-−]?\d[\d\s.,]{2,}/g, '').replace(dateStr, '').replace(/\s+/g, ' ').trim().slice(0, 100);
    txs.push({ date: dateStr, amount, type, category: categorize(description, type), description: description || 'Операция' });
  }
  return txs;
}

// Извлечение из Excel/CSV
function extractFromSheet(rows: any[][]): ParsedTx[] {
  const txs: ParsedTx[] = [];
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const rowStr = row.join(' ');
    const dateStr = parseDate(rowStr);
    if (!dateStr) continue;
    // Ищем числовые ячейки
    let amount = 0;
    let isExpense = false;
    for (const cell of row) {
      if (typeof cell === 'number' && Math.abs(cell) > amount) {
        amount = Math.abs(cell);
        isExpense = cell < 0;
      } else if (typeof cell === 'string') {
        const v = parseAmount(cell);
        if (v > amount) { amount = v; isExpense = /[-−]/.test(cell); }
      }
    }
    if (amount < 1) continue;
    if (/списан|расход|debit/i.test(rowStr)) isExpense = true;
    const type: 'income' | 'expense' = isExpense ? 'expense' : 'income';
    const description = row.filter(c => typeof c === 'string' && !parseDate(c) && parseAmount(c) === 0).join(' ').slice(0, 100);
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
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      txs = extractFromText(data.text);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      txs = extractFromSheet(rows);
    } else {
      return NextResponse.json({ error: 'Поддерживаются только PDF, Excel (.xlsx/.xls) и CSV' }, { status: 400 });
    }

    // Дедупликация и сортировка
    const seen = new Set<string>();
    txs = txs.filter(t => {
      const key = `${t.date}_${t.amount}_${t.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      success: true,
      count: txs.length,
      transactions: txs,
      message: txs.length === 0 ? 'Не удалось распознать операции. Формат выписки может отличаться — добавьте операции вручную.' : `Распознано операций: ${txs.length}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Ошибка обработки файла: ' + (e?.message || 'неизвестно') }, { status: 500 });
  }
}
