// Определение контактов в сообщениях чата (телефон, email, мессенджеры),
// включая номера, продиктованные словами (рус/каз/eng).

// Числительные 0-9 словами
const DIGIT_WORDS: Record<string, string> = {
  // Русский
  'ноль': '0', 'нуль': '0', 'один': '1', 'одын': '1', 'два': '2', 'три': '3',
  'четыре': '4', 'пять': '5', 'шесть': '6', 'семь': '7', 'восемь': '8', 'девять': '9',
  // Казахский
  'нөл': '0', 'нол': '0', 'бір': '1', 'бир': '1', 'екі': '2', 'еки': '2', 'үш': '3', 'уш': '3',
  'төрт': '4', 'торт': '4', 'бес': '5', 'алты': '6', 'жеті': '7', 'жети': '7',
  'сегіз': '8', 'сегиз': '8', 'тоғыз': '9', 'тогыз': '9',
  // Английский
  'zero': '0', 'oh': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
  'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
};

// Слова-десятки/сотни, которые часто используют при диктовке номера
const TEEN_WORDS: Record<string, string> = {
  // десятки/сотни рус
  'десять': '10', 'двадцать': '20', 'тридцать': '30', 'сорок': '40', 'пятьдесят': '50',
  'шестьдесят': '60', 'семьдесят': '70', 'восемьдесят': '80', 'девяносто': '90', 'сто': '100',
  // каз
  'он': '10', 'жиырма': '20', 'отыз': '30', 'қырық': '40', 'елу': '50',
  'алпыс': '60', 'жетпіс': '70', 'сексен': '80', 'тоқсан': '90', 'жүз': '100',
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[.,!?;:()«»"'\-—–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Считает максимальную длину подряд идущей цепочки числительных-слов
function maxConsecutiveNumberWords(text: string): number {
  const words = normalize(text).split(' ');
  let max = 0, cur = 0;
  for (const w of words) {
    if (DIGIT_WORDS[w] !== undefined || TEEN_WORDS[w] !== undefined) {
      cur++;
      if (cur > max) max = cur;
    } else {
      cur = 0;
    }
  }
  return max;
}

export function containsContact(text: string): boolean {
  if (!text) return false;
  const cleaned = text.replace(/\s+/g, ' ');

  // 1. Телефоны цифрами
  const phonePatterns = [
    /(\+?7|8)[\s\-(]*\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/, // +7/8 XXX XXX XX XX
    /\d{10,}/,                                                     // 10+ цифр подряд
    /\d{3}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,                       // XXX-XXX-XX-XX
    /(\d[\s\-.]*){9,}/,                                            // 9+ цифр с любыми разделителями (8 7 7 8 ...)
  ];
  if (phonePatterns.some(p => p.test(cleaned))) return true;

  // 2. Email
  if (/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(cleaned)) return true;

  // 3. Мессенджеры / соцсети
  if (/(whats\s?app|вотс\s?ап|ватсап|телеграм|telegram|@[a-zA-Z0-9_]{4,}|instagram|инстаграм|вайбер|viber|тг|вотсап|ko4uji|нөмір|номер|телефон|связь|свяжитесь|позвоните|whatsapp)/i.test(cleaned)) {
    // Слова-намёки сами по себе не блокируют, но в связке с числами — да.
    // Однако явные мессенджеры блокируем сразу:
    if (/(whats\s?app|вотс\s?ап|ватсап|телеграм|telegram|instagram|инстаграм|вайбер|viber|whatsapp)/i.test(cleaned)) return true;
  }

  // 4. Номер словами: 4+ числительных подряд — это продиктованный номер
  //    («восемь семь семь восемь...», «жеті жеті сегіз тоғыз...»)
  if (maxConsecutiveNumberWords(text) >= 4) return true;

  // 5. Смешанный формат: «номер/телефон/нөмір» + хотя бы 2 числительных словами рядом
  if (/(номер|телефон|нөмір|нөмер|whatsapp|ватсап)/i.test(normalize(text)) && maxConsecutiveNumberWords(text) >= 2) return true;

  return false;
}
