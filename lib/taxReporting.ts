// Расчёт периодов приёма основной налоговой отчётности РК (2026).
// Показывает, когда ОТКРЫВАЕТСЯ приём отчёта (заранее), а не только дедлайн.

const HOLIDAYS_2026 = new Set([
  '2026-01-01','2026-01-02','2026-01-07','2026-03-08','2026-03-21','2026-03-22','2026-03-23',
  '2026-03-24','2026-03-25','2026-05-01','2026-05-07','2026-05-09','2026-07-06','2026-08-30',
  '2026-12-01','2026-12-16','2026-12-17',
]);

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function adjustForWeekend(year: number, month: number, day: number): Date {
  const d = new Date(year, month - 1, day);
  while (d.getDay() === 0 || d.getDay() === 6 || HOLIDAYS_2026.has(toISO(d))) d.setDate(d.getDate() + 1);
  return d;
}

export interface ReportForm {
  key: string;
  title: string;            // официальное название (не переводится)
  titleKey: string;         // ключ описания (переводится)
  months: number[];         // месяцы дедлайнов (1-based)
  day: number;              // день дедлайна
  startMonthOffset: number; // за сколько месяцев до месяца дедлайна открывается приём
  startDay: number;         // день открытия приёма
}

// Основные отчётные формы, по которым важно знать о начале приёма
export const REPORT_FORMS: ReportForm[] = [
  { key: 'fno_910', title: 'ФНО 910.00', titleKey: 'tax.rep.910', months: [2, 8], day: 15, startMonthOffset: 1, startDay: 1 },
  { key: 'fno_200', title: 'ФНО 200.00', titleKey: 'tax.rep.200', months: [2, 5, 8, 11], day: 15, startMonthOffset: 1, startDay: 1 },
  { key: 'fno_300', title: 'ФНО 300.00', titleKey: 'tax.rep.300', months: [2, 5, 8, 11], day: 15, startMonthOffset: 1, startDay: 15 },
  { key: 'fno_101_04', title: 'ФНО 101.04', titleKey: 'tax.rep.101', months: [2, 5, 8, 11], day: 15, startMonthOffset: 1, startDay: 1 },
  { key: 'fno_100', title: 'ФНО 100.00', titleKey: 'tax.rep.100', months: [3], day: 31, startMonthOffset: 2, startDay: 1 },
  { key: 'fno_220', title: 'ФНО 220.00', titleKey: 'tax.rep.220', months: [3], day: 31, startMonthOffset: 2, startDay: 1 },
];

export interface ReportWindow {
  key: string;
  title: string;
  titleKey: string;
  start: Date;     // когда открывается приём
  deadline: Date;  // крайний срок
}

// Все окна приёма за год
export function computeReportingWindows(year: number): ReportWindow[] {
  const out: ReportWindow[] = [];
  for (const f of REPORT_FORMS) {
    for (const m of f.months) {
      const deadline = adjustForWeekend(year, m, f.day);
      // начало приёма: за startMonthOffset месяцев до месяца дедлайна
      const start = new Date(year, m - 1 - f.startMonthOffset, f.startDay);
      out.push({ key: `${f.key}_${m}`, title: f.title, titleKey: f.titleKey, start, deadline });
    }
  }
  return out;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export interface ReportingStatus {
  active: ReportWindow[]; // приём идёт сейчас
  soon: ReportWindow[];   // приём откроется в ближайшие N дней
}

// Статус на конкретную дату: что принимается сейчас и что скоро откроется
export function getReportingStatus(today: Date, year: number, soonDays = 10): ReportingStatus {
  const windows = computeReportingWindows(year);
  const active: ReportWindow[] = [];
  const soon: ReportWindow[] = [];
  for (const w of windows) {
    if (today >= w.start && today <= w.deadline) active.push(w);
    else if (today < w.start && daysBetween(today, w.start) <= soonDays) soon.push(w);
  }
  active.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  soon.sort((a, b) => a.start.getTime() - b.start.getTime());
  return { active, soon };
}
