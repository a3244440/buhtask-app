import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { amountToWords } from '@/lib/amountToWords';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const thin: ExcelJS.Borders = {
  top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
  diagonal: { style: 'thin' },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doc, company, counterparty } = body;
    if (!doc) return NextResponse.json({ error: 'no doc' }, { status: 400 });

    const items: any[] = doc.items || [];
    const bankAcc = company?.bank_accounts?.[0];
    const dateStr = new Date(doc.doc_date).toLocaleDateString('ru-RU');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'BuhTask';

    if (doc.type === 'invoice') buildInvoice(wb, doc, company, counterparty, bankAcc, items, dateStr);
    else if (doc.type === 'avr') buildAvr(wb, doc, company, counterparty, items, dateStr);
    else buildSf(wb, doc, company, counterparty, bankAcc, items, dateStr);

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="document_${doc.number}.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}

// ===== СЧЁТ НА ОПЛАТУ =====
function buildInvoice(wb: ExcelJS.Workbook, doc: any, company: any, cp: any, bankAcc: any, items: any[], dateStr: string) {
  const ws = wb.addWorksheet('Счёт на оплату');
  // Пропорциональные колонки как в PDF
  ws.columns = [
    { width: 5 }, { width: 8 }, { width: 32 }, { width: 10 }, { width: 8 },
    { width: 16 }, { width: 18 },
  ];

  // Блок "Внимание"
  ws.mergeCells('A1:G3');
  const warn = ws.getCell('A1');
  warn.value = 'Внимание! Оплата данного счета означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом, при наличии доверенности и документов удостоверяющих личность.';
  warn.alignment = { wrapText: true, vertical: 'top' };
  warn.font = { size: 9 };
  warn.border = thin;

  // Образец платёжного поручения
  ws.getCell('A5').value = 'Образец платежного поручения';
  ws.getCell('A5').font = { bold: true };

  // Таблица платёжки: Бенефициар | ИИК | Кбе
  ws.mergeCells('A6:C6'); ws.getCell('A6').value = 'Бенефициар:'; ws.getCell('A6').font = { bold: true };
  ws.mergeCells('D6:E6'); ws.getCell('D6').value = 'ИИК'; ws.getCell('D6').font = { bold: true }; ws.getCell('D6').alignment = { horizontal: 'center' };
  ws.getCell('F6').value = 'Кбе'; ws.getCell('F6').font = { bold: true }; ws.getCell('F6').alignment = { horizontal: 'center' };
  ws.mergeCells('A7:C7'); ws.getCell('A7').value = company?.name || '';
  ws.mergeCells('D7:E7'); ws.getCell('D7').value = bankAcc?.iban || ''; ws.getCell('D7').alignment = { horizontal: 'center' };
  ws.getCell('F7').value = '17'; ws.getCell('F7').alignment = { horizontal: 'center' };
  ws.mergeCells('A8:C8'); ws.getCell('A8').value = company?.bin ? 'БИН: ' + company.bin : '';
  ws.mergeCells('A9:C9'); ws.getCell('A9').value = 'Банк бенефициара:'; ws.getCell('A9').font = { bold: true };
  ws.mergeCells('D9:E9'); ws.getCell('D9').value = 'БИК'; ws.getCell('D9').font = { bold: true }; ws.getCell('D9').alignment = { horizontal: 'center' };
  ws.getCell('F9').value = 'Код назначения платежа'; ws.getCell('F9').font = { bold: true, size: 8 }; ws.getCell('F9').alignment = { wrapText: true, horizontal: 'center' };
  ws.mergeCells('A10:C10'); ws.getCell('A10').value = bankAcc?.bank || '';
  ws.mergeCells('D10:E10'); ws.getCell('D10').value = bankAcc?.bik || ''; ws.getCell('D10').alignment = { horizontal: 'center' };
  ws.getCell('F10').value = '859'; ws.getCell('F10').alignment = { horizontal: 'center' };
  // рамки для платёжки
  for (let r = 6; r <= 10; r++) for (const c of ['A','B','C','D','E','F']) ws.getCell(`${c}${r}`).border = thin;

  // Заголовок счёта
  ws.mergeCells('A12:G12');
  const title = ws.getCell('A12');
  title.value = `Счет на оплату №${doc.number} от ${dateStr} года`;
  title.font = { bold: true, size: 14 };

  // Поставщик / Покупатель
  ws.getCell('A14').value = 'Поставщик:'; ws.getCell('A14').font = { bold: true };
  ws.mergeCells('B14:G15');
  const sup = ws.getCell('B14');
  sup.value = `${company?.bin ? 'БИН: ' + company.bin + ' ' : ''}${company?.name || ''}${company?.address ? ', Адрес: ' + company.address : ''}`;
  sup.alignment = { wrapText: true, vertical: 'top' };

  ws.getCell('A16').value = 'Покупатель:'; ws.getCell('A16').font = { bold: true };
  ws.mergeCells('B16:G17');
  const buy = ws.getCell('B16');
  buy.value = `${cp?.bin ? 'БИН: ' + cp.bin + ', ' : ''}${cp?.name || ''}${cp?.address ? ', Адрес: ' + cp.address : ''}`;
  buy.alignment = { wrapText: true, vertical: 'top' };

  ws.getCell('A19').value = 'Договор:'; ws.getCell('A19').font = { bold: true };
  ws.getCell('B19').value = doc.contract || '';

  // Таблица позиций
  const headerRow = 21;
  const headers = ['№', 'Код', 'Наименование', 'Кол-во', 'Ед.', 'Цена', 'Сумма'];
  const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  headers.forEach((h, i) => {
    const cell = ws.getCell(`${cols[i]}${headerRow}`);
    cell.value = h; cell.font = { bold: true }; cell.alignment = { horizontal: 'center' };
    cell.border = thin; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });

  let r = headerRow + 1;
  items.forEach((it, i) => {
    const sum = it.qty * it.price;
    ws.getCell(`A${r}`).value = i + 1; ws.getCell(`A${r}`).alignment = { horizontal: 'center' };
    ws.getCell(`B${r}`).value = i + 1; ws.getCell(`B${r}`).alignment = { horizontal: 'center' };
    ws.getCell(`C${r}`).value = it.name;
    ws.getCell(`D${r}`).value = it.qty; ws.getCell(`D${r}`).alignment = { horizontal: 'center' };
    ws.getCell(`E${r}`).value = it.unit; ws.getCell(`E${r}`).alignment = { horizontal: 'center' };
    ws.getCell(`F${r}`).value = it.price; ws.getCell(`F${r}`).numFmt = '#,##0.00'; ws.getCell(`F${r}`).alignment = { horizontal: 'right' };
    ws.getCell(`G${r}`).value = sum; ws.getCell(`G${r}`).numFmt = '#,##0.00'; ws.getCell(`G${r}`).alignment = { horizontal: 'right' };
    for (const c of ['A','B','C','D','E','F','G']) ws.getCell(`${c}${r}`).border = thin;
    r++;
  });

  // Итого
  r += 1;
  ws.getCell(`F${r}`).value = 'Итого:'; ws.getCell(`F${r}`).font = { bold: true }; ws.getCell(`F${r}`).alignment = { horizontal: 'right' };
  ws.getCell(`G${r}`).value = doc.total; ws.getCell(`G${r}`).numFmt = '#,##0.00'; ws.getCell(`G${r}`).alignment = { horizontal: 'right' };
  r++;
  ws.getCell(`F${r}`).value = 'В том числе НДС:'; ws.getCell(`F${r}`).alignment = { horizontal: 'right' };
  ws.getCell(`G${r}`).value = doc.vat_total || 0; ws.getCell(`G${r}`).numFmt = '#,##0.00'; ws.getCell(`G${r}`).alignment = { horizontal: 'right' };
  r += 2;
  ws.mergeCells(`A${r}:G${r}`);
  ws.getCell(`A${r}`).value = `Всего наименований ${items.length}, на сумму ${Number(doc.total).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} KZT`;
  r++;
  ws.mergeCells(`A${r}:G${r}`);
  ws.getCell(`A${r}`).value = `Всего к оплате: ${amountToWords(Number(doc.total))}`; ws.getCell(`A${r}`).font = { bold: true };
  r += 3;
  ws.getCell(`A${r}`).value = 'Исполнитель'; ws.getCell(`A${r}`).font = { bold: true };
  ws.getCell(`D${r}`).value = company?.director || '';
}

// ===== АВР (Форма Р-1) =====
function buildAvr(wb: ExcelJS.Workbook, doc: any, company: any, cp: any, items: any[], dateStr: string) {
  const ws = wb.addWorksheet('АВР Р-1');
  ws.columns = [{ width: 6 }, { width: 30 }, { width: 12 }, { width: 18 }, { width: 10 }, { width: 10 }, { width: 14 }, { width: 16 }];

  ws.getCell('F1').value = 'Приложение 50 к приказу Министра финансов РК от 20.12.2012 № 562';
  ws.getCell('F1').font = { size: 8 }; ws.getCell('F1').alignment = { wrapText: true, horizontal: 'right' };
  ws.getCell('H3').value = 'Форма Р-1'; ws.getCell('H3').font = { bold: true };

  ws.getCell('A5').value = 'Заказчик'; ws.getCell('A5').font = { bold: true };
  ws.mergeCells('B5:G5'); ws.getCell('B5').value = `${cp?.name || ''}${cp?.address ? ', Адрес: ' + cp.address : ''}`;
  ws.getCell('H5').value = cp?.bin || '';
  ws.getCell('A7').value = 'Исполнитель'; ws.getCell('A7').font = { bold: true };
  ws.mergeCells('B7:G7'); ws.getCell('B7').value = `${company?.name || ''}${company?.address ? ', Адрес: ' + company.address : ''}`;
  ws.getCell('H7').value = company?.bin || '';

  ws.getCell('A9').value = 'Договор (контракт)'; ws.getCell('A9').border = thin; ws.getCell('A9').font = { bold: true, size: 9 };
  ws.getCell('B9').value = 'Номер документа'; ws.getCell('B9').border = thin; ws.getCell('B9').font = { bold: true, size: 9 };
  ws.getCell('C9').value = 'Дата составления'; ws.getCell('C9').border = thin; ws.getCell('C9').font = { bold: true, size: 9 };
  ws.getCell('A10').value = doc.contract || ''; ws.getCell('A10').border = thin;
  ws.getCell('B10').value = doc.number; ws.getCell('B10').border = thin; ws.getCell('B10').alignment = { horizontal: 'center' };
  ws.getCell('C10').value = dateStr; ws.getCell('C10').border = thin; ws.getCell('C10').alignment = { horizontal: 'center' };

  ws.mergeCells('A12:H12');
  ws.getCell('A12').value = 'АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ)';
  ws.getCell('A12').font = { bold: true, size: 12 }; ws.getCell('A12').alignment = { horizontal: 'center' };

  const hr = 14;
  const heads = ['Номер по порядку', 'Наименование работ (услуг)', 'Дата выполнения', 'Сведения об отчёте', 'Ед. изм.', 'Количество', 'Цена за единицу', 'Стоимость'];
  heads.forEach((h, i) => {
    const cell = ws.getCell(hr, i + 1);
    cell.value = h; cell.font = { bold: true, size: 8 }; cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
    cell.border = thin; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });
  ws.getRow(hr).height = 40;
  for (let c = 1; c <= 8; c++) { const cell = ws.getCell(hr + 1, c); cell.value = c; cell.border = thin; cell.alignment = { horizontal: 'center' }; cell.font = { size: 8, color: { argb: 'FF999999' } }; }

  let r = hr + 2;
  items.forEach((it, i) => {
    ws.getCell(r, 1).value = i + 1;
    ws.getCell(r, 2).value = it.name;
    ws.getCell(r, 3).value = dateStr;
    ws.getCell(r, 4).value = '';
    ws.getCell(r, 5).value = it.unit;
    ws.getCell(r, 6).value = it.qty;
    ws.getCell(r, 7).value = it.price; ws.getCell(r, 7).numFmt = '#,##0.00';
    ws.getCell(r, 8).value = it.qty * it.price; ws.getCell(r, 8).numFmt = '#,##0.00';
    for (let c = 1; c <= 8; c++) { ws.getCell(r, c).border = thin; if (c !== 2) ws.getCell(r, c).alignment = { horizontal: 'center' }; }
    r++;
  });
  ws.mergeCells(`A${r}:E${r}`);
  ws.getCell(`A${r}`).value = 'Итого'; ws.getCell(`A${r}`).font = { bold: true }; ws.getCell(`A${r}`).alignment = { horizontal: 'center' };
  ws.getCell(r, 6).value = items.reduce((s, it) => s + Number(it.qty), 0); ws.getCell(r, 6).alignment = { horizontal: 'center' };
  ws.getCell(r, 7).value = 'х'; ws.getCell(r, 7).alignment = { horizontal: 'center' };
  ws.getCell(r, 8).value = doc.total; ws.getCell(r, 8).numFmt = '#,##0.00';
  for (let c = 1; c <= 8; c++) ws.getCell(r, c).border = thin;
  r += 2;

  ws.getCell(`A${r}`).value = 'Сведения об использовании запасов, полученных от заказчика'; r += 2;
  ws.getCell(`A${r}`).value = 'Приложение: Перечень документации'; r += 2;

  ws.getCell(`A${r}`).value = `Сдал (Исполнитель)  Директор ______________ ${company?.director || ''}`; ws.getCell(`A${r}`).font = { size: 9 };
  ws.getCell(`E${r}`).value = `Принял (Заказчик)  Директор ______________ ${cp?.director || ''}`; ws.getCell(`E${r}`).font = { size: 9 };
  r += 2;
  ws.getCell(`A${r}`).value = 'М.П.';
  ws.getCell(`E${r}`).value = 'М.П.';
  r++;
  ws.getCell(`A${r}`).value = `Дата подписания (принятия) работ (услуг) ${dateStr}`; ws.getCell(`A${r}`).font = { size: 9 };
}

// ===== СЧЁТ-ФАКТУРА =====
function buildSf(wb: ExcelJS.Workbook, doc: any, company: any, cp: any, bankAcc: any, items: any[], dateStr: string) {
  const ws = wb.addWorksheet('Счёт-фактура');
  ws.columns = [{ width: 5 }, { width: 28 }, { width: 8 }, { width: 8 }, { width: 12 }, { width: 14 }, { width: 8 }, { width: 12 }, { width: 14 }];

  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = `Счет-фактура № ${doc.number} от ${dateStr} г.`;
  ws.getCell('A1').font = { bold: true, size: 12 };

  let row = 3;
  const addLine = (text: string) => { ws.mergeCells(`A${row}:I${row}`); ws.getCell(`A${row}`).value = text; ws.getCell(`A${row}`).font = { size: 9 }; row++; };
  addLine(`Поставщик: ${company?.name || ''}`);
  addLine(`ИИН/БИН и адрес поставщика: ${company?.bin || ''}${company?.address ? ', ' + company.address : ''}`);
  if (bankAcc) addLine(`ИИК: ${bankAcc.iban}, Банк: ${bankAcc.bank}`);
  addLine(`Договор(контракт): ${doc.contract || ''}`);
  addLine(`Условия оплаты: Безналичный расчёт`);
  addLine(`Грузоотправитель: ${company?.name || ''}${company?.address ? ', Адрес: ' + company.address : ''}`);
  addLine(`Грузополучатель: ${cp?.name || ''}${cp?.address ? ', Адрес: ' + cp.address : ''}`);
  addLine(`Получатель: ${cp?.name || ''}`);
  addLine(`БИН/ИИН и адрес получателя: ${cp?.bin || ''}${cp?.address ? ', ' + cp.address : ''}`);
  row++;

  const hr = row;
  const heads = ['№ п/п', 'Наименование товаров (работ, услуг)', 'Ед. изм.', 'Кол-во', 'Цена (KZT)', 'Стоимость без НДС', 'Ставка НДС', 'Сумма НДС', 'Всего'];
  heads.forEach((h, i) => {
    const cell = ws.getCell(hr, i + 1);
    cell.value = h; cell.font = { bold: true, size: 9 }; cell.alignment = { horizontal: 'center', wrapText: true, vertical: 'middle' };
    cell.border = thin; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
  });
  ws.getRow(hr).height = 36;
  row++;
  items.forEach((it, i) => {
    const total = it.qty * it.price;
    const noVat = doc.has_vat ? Math.round(total / 1.12) : total;
    const vat = doc.has_vat ? total - noVat : 0;
    const vals = [i + 1, it.name, it.unit, it.qty, it.price, noVat, doc.has_vat ? '12%' : 'Без НДС', doc.has_vat ? vat : 'Без НДС', total];
    vals.forEach((v, c) => {
      const cell = ws.getCell(row, c + 1);
      cell.value = v as any;
      if ([5, 6, 8, 9].includes(c + 1) && typeof v === 'number') cell.numFmt = '#,##0.00';
      cell.border = thin; cell.font = { size: 9 };
      cell.alignment = { horizontal: c === 1 ? 'left' : 'center' };
    });
    row++;
  });
  // Всего по счёту
  ws.mergeCells(`A${row}:H${row}`);
  ws.getCell(`A${row}`).value = 'Всего по счету:'; ws.getCell(`A${row}`).font = { bold: true }; ws.getCell(`A${row}`).alignment = { horizontal: 'right' };
  ws.getCell(`I${row}`).value = doc.total; ws.getCell(`I${row}`).numFmt = '#,##0.00'; ws.getCell(`I${row}`).font = { bold: true };
  for (let c = 1; c <= 9; c++) ws.getCell(row, c).border = thin;
  row += 2;
  ws.getCell(`A${row}`).value = `Всего на сумму: ${amountToWords(Number(doc.total))}`;
  row += 2;
  ws.getCell(`A${row}`).value = `Руководитель: ${company?.director || ''}`;
  ws.getCell(`F${row}`).value = 'Главный бухгалтер: ___________';
  row += 2;
  ws.getCell(`A${row}`).value = 'Примечание: Без печати недействительно. М.П.'; ws.getCell(`A${row}`).font = { size: 8, italic: true };
}
