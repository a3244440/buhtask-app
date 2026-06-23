import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { amountToWords } from '@/lib/amountToWords';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TYPE_LABEL: Record<string, string> = {
  invoice: 'Счёт на оплату', avr: 'Акт выполненных работ', sf: 'Счёт-фактура',
};

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'no id' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: doc } = await supabase.from('documents').select('*').eq('id', id).maybeSingle();
    if (!doc) return NextResponse.json({ error: 'not found' }, { status: 404 });
    const { data: company } = doc.company_id ? await supabase.from('companies').select('*').eq('id', doc.company_id).maybeSingle() : { data: null };
    const { data: cp } = doc.counterparty_id ? await supabase.from('counterparties').select('*').eq('id', doc.counterparty_id).maybeSingle() : { data: null };

    const items = doc.items || [];
    const bankAcc = company?.bank_accounts?.[0];

    // Строим лист как массив строк
    const rows: any[][] = [];
    rows.push([`${TYPE_LABEL[doc.type]} №${doc.number} от ${new Date(doc.doc_date).toLocaleDateString('ru-RU')} г.`]);
    rows.push([]);
    if (company) {
      rows.push(['Поставщик:', `${company.name}${company.bin ? ', БИН ' + company.bin : ''}`]);
      if (company.address) rows.push(['Адрес:', company.address]);
      if (bankAcc) rows.push(['Банк:', `${bankAcc.bank}, IBAN: ${bankAcc.iban}`]);
    }
    if (cp) {
      rows.push([doc.type === 'avr' ? 'Заказчик:' : 'Покупатель:', `${cp.name}${cp.bin ? ', БИН ' + cp.bin : ''}`]);
      if (cp.address) rows.push(['Адрес:', cp.address]);
    }
    if (doc.contract) rows.push(['Договор:', doc.contract]);
    rows.push([]);

    // Шапка таблицы
    rows.push(['№', 'Наименование', 'Ед.изм', 'Кол-во', 'Цена', 'Сумма']);
    items.forEach((it: any, i: number) => {
      rows.push([i + 1, it.name, it.unit, it.qty, it.price, it.qty * it.price]);
    });
    rows.push([]);
    if (doc.has_vat) rows.push(['', '', '', '', 'в т.ч. НДС 12%:', doc.vat_total]);
    rows.push(['', '', '', '', 'Всего к оплате:', doc.total]);
    rows.push([`Всего наименований ${items.length}, на сумму ${amountToWords(Number(doc.total))}`]);
    rows.push([]);
    rows.push([doc.type === 'avr' ? 'Сдал (Исполнитель):' : 'Исполнитель:', company?.director || '', '', '', doc.type === 'avr' ? 'Принял (Заказчик):' : 'Покупатель:', cp?.director || '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 6 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, TYPE_LABEL[doc.type].slice(0, 28));

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
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
