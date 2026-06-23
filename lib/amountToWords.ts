// Сумма прописью на русском (тенге)
const ONES = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEENS = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

function triadToWords(num: number, female: boolean): string {
  const parts: string[] = [];
  const h = Math.floor(num / 100);
  const t = Math.floor((num % 100) / 10);
  const o = num % 10;
  if (h > 0) parts.push(HUNDREDS[h]);
  if (t === 1) { parts.push(TEENS[o]); }
  else {
    if (t > 0) parts.push(TENS[t]);
    if (o > 0) parts.push(female ? ONES_F[o] : ONES[o]);
  }
  return parts.join(' ');
}

function plural(num: number, forms: [string, string, string]): string {
  const n = num % 100;
  if (n >= 11 && n <= 19) return forms[2];
  const n1 = num % 10;
  if (n1 === 1) return forms[0];
  if (n1 >= 2 && n1 <= 4) return forms[1];
  return forms[2];
}

export function amountToWords(amount: number): string {
  const tenge = Math.floor(amount);
  const tiyn = Math.round((amount - tenge) * 100);

  if (tenge === 0) return 'Ноль тенге ' + String(tiyn).padStart(2, '0') + ' тиын';

  const parts: string[] = [];
  const billions = Math.floor(tenge / 1_000_000_000);
  const millions = Math.floor((tenge % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((tenge % 1_000_000) / 1000);
  const rest = tenge % 1000;

  if (billions > 0) parts.push(triadToWords(billions, false) + ' ' + plural(billions, ['миллиард', 'миллиарда', 'миллиардов']));
  if (millions > 0) parts.push(triadToWords(millions, false) + ' ' + plural(millions, ['миллион', 'миллиона', 'миллионов']));
  if (thousands > 0) parts.push(triadToWords(thousands, true) + ' ' + plural(thousands, ['тысяча', 'тысячи', 'тысяч']));
  if (rest > 0) parts.push(triadToWords(rest, false));

  let words = parts.join(' ').trim();
  words = words.charAt(0).toUpperCase() + words.slice(1);
  return `${words} ${plural(tenge, ['тенге', 'тенге', 'тенге'])} ${String(tiyn).padStart(2, '0')} тиын`;
}
