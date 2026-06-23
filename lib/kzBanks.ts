// Справочник банков Казахстана: название → БИК (SWIFT/BIC)
export const KZ_BANKS: { name: string; bik: string }[] = [
  { name: 'Kaspi Bank', bik: 'CASPKZKA' },
  { name: 'Halyk Bank', bik: 'HSBKKZKX' },
  { name: 'Банк ЦентрКредит (БЦК)', bik: 'KCJBKZKX' },
  { name: 'ForteBank', bik: 'IRTYKZKA' },
  { name: 'Jusan Bank', bik: 'TSESKZKA' },
  { name: 'Bereke Bank', bik: 'BRKEKZKA' },
  { name: 'Freedom Bank', bik: 'FFINKZK2' },
  { name: 'Altyn Bank', bik: 'ATYNKZKA' },
  { name: 'Bank RBK', bik: 'KINCKZKA' },
  { name: 'Евразийский банк', bik: 'EURIKZKA' },
  { name: 'Нурбанк', bik: 'NURSKZKX' },
  { name: 'Home Credit Bank', bik: 'INLMKZKA' },
  { name: 'ВТБ Банк (Казахстан)', bik: 'VTBAKZKZ' },
  { name: 'Citibank Kazakhstan', bik: 'CITIKZKA' },
  { name: 'Шинхан Банк', bik: 'SHBKKZKA' },
];

// Получить БИК по названию банка
export function getBik(bankName: string): string {
  if (!bankName) return '';
  const found = KZ_BANKS.find(b => b.name === bankName || bankName.includes(b.name) || b.name.includes(bankName));
  return found?.bik || '';
}
