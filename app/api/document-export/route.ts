import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import path from 'path';
import { amountToWords } from '@/lib/amountToWords';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TEMPLATE_FILE: Record<string, string> = {
  invoice: 'invoice_template.xlsx',
  avr: 'avr_template.xlsx',
  sf: 'sf_template.xlsx',
};

// Данные приходят с клиента (он авторизован, RLS пройден на клиенте)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { doc, company, counterparty } = body;
    if (!doc) return NextResponse.json({ error: 'no doc' }, { status: 400 });

    const items: any[] = doc.items || [];
    const bankAcc = company?.bank_accounts?.[0];
    const dateStr = new Date(doc.doc_date).toLocaleDateString('ru-RU');

    const wb = new ExcelJS.Workbook();
    const tplPath = path.join(process.cwd(), 'templates', TEMPLATE_FILE[doc.type]);
    await wb.xlsx.readFile(tplPath);
    const ws = wb.worksheets[0];

    const supplierLine = `${company?.name || ''}${company?.bin ? ', БИН ' + company.bin : ''}${company?.address ? ', Адрес: ' + company.address : ''}`;
    const buyerLine = `${counterparty?.name || ''}${counterparty?.bin ? ', БИН ' + counterparty.bin : ''}${counterparty?.address ? ', Адрес: ' + counterparty.address : ''}`;

    if (doc.type === 'invoice') {
      ws.getCell('B9').value = 'Бенефициар:';
      ws.getCell('B10').value = company?.name || '';
      ws.getCell('B11').value = company?.bin ? 'БИН: ' + company.bin : '';
      ws.getCell('B12').value = 'Банк бенефициара:';
      ws.getCell('B13').value = bankAcc ? `${bankAcc.bank}` : '';
      ws.getCell('B16').value = `Счет на оплату №${doc.number} от ${dateStr} года`;
      ws.getCell('F20').value = supplierLine;
      ws.getCell('F22').value = buyerLine;
      ws.getCell('B24').value = doc.contract ? `Договор: ${doc.contract}` : 'Договор:';
      // позиции начинаются с 27 строки
      let r = 27;
      items.forEach((it, i) => {
        ws.getCell(`B${r}`).value = i + 1;
        ws.getCell(`D${r}`).value = i + 1;
        ws.getCell(`I${r}`).value = it.name;
        r++;
      });
      ws.getCell(`B${r + 2}`).value = `Всего наименований ${items.length}, на сумму ${Number(doc.total).toLocaleString('ru-RU')}`;
      ws.getCell(`B${r + 3}`).value = `Всего к оплате: ${amountToWords(Number(doc.total))}`;
    } else if (doc.type === 'avr') {
      ws.getCell('E9').value = buyerLine;
      ws.getCell('E12').value = supplierLine;
      ws.getCell('A15').value = `Договор (контракт) ${doc.contract || ''}`;
      ws.getCell('A17').value = `АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ) №${doc.number} от ${dateStr}`;
      let r = 22;
      items.forEach((it, i) => {
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`C${r}`).value = `${it.name} — ${it.qty} ${it.unit} x ${Number(it.price).toLocaleString('ru-RU')} = ${(it.qty*it.price).toLocaleString('ru-RU')} ₸`;
        r++;
      });
      ws.getCell('F30').value = company?.director || 'Директор';
    } else if (doc.type === 'sf') {
      ws.getCell('A1').value = `Счет-фактура № ${doc.number} от ${dateStr} г.`;
      ws.getCell('A5').value = `Поставщик: ${company?.name || ''}`;
      ws.getCell('A6').value = `ИИН/БИН и адрес поставщика: ${company?.bin || ''}, ${company?.address || ''}`;
      ws.getCell('A7').value = bankAcc ? `ИИК: ${bankAcc.iban}, Банк: ${bankAcc.bank}` : '';
      ws.getCell('A8').value = `Договор(контракт): ${doc.contract || ''}`;
      ws.getCell('A15').value = `Грузоотправитель: ${supplierLine}`;
      ws.getCell('A17').value = `Грузополучатель: ${buyerLine}`;
      ws.getCell('A19').value = `Получатель: ${counterparty?.name || ''}`;
      ws.getCell('A20').value = `БИН/ИИН и адрес получателя: ${counterparty?.bin || ''}, ${counterparty?.address || ''}`;
      let r = 26;
      items.forEach((it, i) => {
        const sumNoVat = doc.has_vat ? Math.round((it.qty*it.price)/1.12) : it.qty*it.price;
        const vatSum = doc.has_vat ? (it.qty*it.price) - sumNoVat : 0;
        ws.getCell(`A${r}`).value = i + 1;
        ws.getCell(`B${r}`).value = it.name;
        ws.getCell(`C${r}`).value = it.unit;
        ws.getCell(`D${r}`).value = it.qty;
        ws.getCell(`E${r}`).value = it.price;
        ws.getCell(`F${r}`).value = sumNoVat;
        ws.getCell(`G${r}`).value = doc.has_vat ? '12%' : 'Без НДС';
        ws.getCell(`H${r}`).value = doc.has_vat ? vatSum : 'Без НДС';
        ws.getCell(`I${r}`).value = it.qty*it.price;
        r++;
      });
      ws.getCell(`I${r}`).value = doc.total;
      ws.getCell('A29').value = `Руководитель: ${company?.director || ''}`;
    }

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
