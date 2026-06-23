'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, FileSpreadsheet, Printer, FileCheck, Receipt, Plus, Link2 } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import ToolsSidebar from '../../components/ToolsSidebar';
import { amountToWords } from '@/lib/amountToWords';

interface Item { name: string; unit: string; qty: number; price: number; }

const TYPE_INFO: Record<string, { label: string; short: string }> = {
  invoice: { label: 'Счёт на оплату', short: 'Счёт' },
  avr: { label: 'Акт выполненных работ', short: 'АВР' },
  sf: { label: 'Счёт-фактура', short: 'СФ' },
};

export default function DocViewPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [counterparty, setCounterparty] = useState<any>(null);
  const [children, setChildren] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { init(); }, [docId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    const { data: d } = await supabase.from('documents').select('*').eq('id', docId).eq('owner_id', user.id).maybeSingle();
    if (!d) { router.push('/documents'); return; }
    setDoc(d);

    const [{ data: comp }, { data: cp }, { data: kids }] = await Promise.all([
      d.company_id ? supabase.from('companies').select('*').eq('id', d.company_id).maybeSingle() : Promise.resolve({ data: null }),
      d.counterparty_id ? supabase.from('counterparties').select('*').eq('id', d.counterparty_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('documents').select('id,type,number,doc_date').eq('parent_id', docId),
    ]);
    setCompany(comp);
    setCounterparty(cp);
    setChildren(kids || []);
    setLoading(false);
  };

  const fmt = (n: number) => Number(n).toLocaleString('ru-RU') + ' ₸';
  const items: Item[] = doc?.items || [];

  const exportExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/document-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc, company, counterparty }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'export failed');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${TYPE_INFO[doc.type].short}_${doc.number}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { alert('Ошибка экспорта: ' + (e?.message || '')); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!doc) return null;

  const info = TYPE_INFO[doc.type];
  const bankAcc = company?.bank_accounts?.[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="print:hidden"><ToolsSidebar /></div>
      <div className="lg:pl-60 print:pl-0">
        <div className="print:hidden"><DashboardHeader title={info.label} /></div>
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Toolbar */}
          <div className="print:hidden flex items-center justify-between mb-5 flex-wrap gap-3">
            <button onClick={() => router.push('/documents')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="w-4 h-4" /> К документам
            </button>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium">
                <Printer className="w-4 h-4" /> Печать / PDF
              </button>
              <button onClick={exportExcel} disabled={exporting} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <FileSpreadsheet className="w-4 h-4" /> {exporting ? '...' : 'Excel'}
              </button>
            </div>
          </div>

          {/* Создать на основании (только для счёта) */}
          {doc.type === 'invoice' && (
            <div className="print:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><Link2 className="w-4 h-4 text-gray-400" /> Создать на основании этого счёта</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => router.push(`/documents/new?type=avr&parent=${docId}`)} className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-sm font-medium">
                  <FileCheck className="w-4 h-4" /> Акт выполненных работ
                </button>
                <button onClick={() => router.push(`/documents/new?type=sf&parent=${docId}`)} className="flex items-center gap-2 bg-violet-50 hover:bg-violet-100 text-violet-700 px-4 py-2 rounded-xl text-sm font-medium">
                  <FileSpreadsheet className="w-4 h-4" /> Счёт-фактура
                </button>
              </div>
              {children.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-50">
                  <p className="text-xs text-gray-400 mb-2">Созданные документы:</p>
                  <div className="flex gap-2 flex-wrap">
                    {children.map(c => (
                      <button key={c.id} onClick={() => router.push(`/documents/${c.id}`)} className="text-xs px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-600">
                        {TYPE_INFO[c.type].short} №{c.number}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Document body (printable) — формат РК */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 print:shadow-none print:border-0 print:rounded-none print:p-0" id="doc-print">
            {doc.type === 'invoice' && (
              <InvoiceView doc={doc} company={company} counterparty={counterparty} bankAcc={bankAcc} items={items} fmt={fmt} />
            )}
            {doc.type === 'avr' && (
              <AvrView doc={doc} company={company} counterparty={counterparty} items={items} fmt={fmt} />
            )}
            {doc.type === 'sf' && (
              <SfView doc={doc} company={company} counterparty={counterparty} bankAcc={bankAcc} items={items} fmt={fmt} />
            )}
          </div>
        </main>
      </div>
      <style jsx global>{`
        @media print {
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 1cm; size: A4; }
          #doc-print { font-size: 11px !important; }
          #doc-print table { page-break-inside: auto; }
          #doc-print tr { page-break-inside: avoid; }
          #doc-print td, #doc-print th { word-wrap: break-word; overflow-wrap: break-word; }
        }
        #doc-print table { table-layout: auto; }
      `}</style>
    </div>
  );
}
// ===== Виды документов в формате РК =====
function InvoiceView({ doc, company, counterparty, bankAcc, items, fmt }: any) {
  const dateStr = new Date(doc.doc_date).toLocaleDateString('ru-RU');
  return (
    <div className="text-[13px] text-gray-900 leading-relaxed">
      {/* Внимание */}
      <div className="border border-gray-700 p-2 mb-4 text-[10px] leading-snug">
        Внимание! Оплата данного счёта означает согласие с условиями поставки товара. Уведомление об оплате обязательно, в противном случае не гарантируется наличие товара на складе. Товар отпускается по факту прихода денег на р/с Поставщика, самовывозом, при наличии доверенности и документов удостоверяющих личность.
      </div>

      {/* Образец платёжного поручения */}
      <p className="font-bold mb-1">Образец платёжного поручения</p>
      <table className="w-full border-collapse mb-4 text-[11px]">
        <tbody>
          <tr>
            <td className="border border-gray-700 px-2 py-1 font-medium align-top" rowSpan={2} style={{ width: '40%' }}>
              Бенефициар:<br /><b>{company?.name || ''}</b><br />{company?.bin ? 'БИН: ' + company.bin : ''}
            </td>
            <td className="border border-gray-700 px-2 py-1 text-center font-bold w-1/3">ИИК</td>
            <td className="border border-gray-700 px-2 py-1 text-center font-bold">Кбе</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-2 py-1 text-center">{bankAcc?.iban || ''}</td>
            <td className="border border-gray-700 px-2 py-1 text-center">17</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-2 py-1 font-medium align-top" rowSpan={2}>
              Банк бенефициара:<br />{bankAcc?.bank || ''}
            </td>
            <td className="border border-gray-700 px-2 py-1 text-center font-bold">БИК</td>
            <td className="border border-gray-700 px-2 py-1 text-center font-bold text-[10px]">Код назначения платежа</td>
          </tr>
          <tr>
            <td className="border border-gray-700 px-2 py-1 text-center">{bankAcc?.bik || ''}</td>
            <td className="border border-gray-700 px-2 py-1 text-center">859</td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-base font-bold my-4">Счёт на оплату №{doc.number} от {dateStr} года</h2>

      <table className="w-full border-collapse mb-1">
        <tbody>
          <tr><td className="border border-gray-700 px-2 py-1 align-top w-28 font-medium">Поставщик:</td><td className="border border-gray-700 px-2 py-1">{company?.bin ? `БИН: ${company.bin} ` : ''}{company?.name}{company?.address ? `, Адрес: ${company.address}` : ''}</td></tr>
          <tr><td className="border border-gray-700 px-2 py-1 align-top font-medium">Покупатель:</td><td className="border border-gray-700 px-2 py-1">{counterparty?.bin ? `БИН: ${counterparty.bin}, ` : ''}{counterparty?.name}{counterparty?.address ? `, Адрес: ${counterparty.address}` : ''}</td></tr>
          <tr><td className="border border-gray-700 px-2 py-1 font-medium">Договор:</td><td className="border border-gray-700 px-2 py-1">{doc.contract || ''}</td></tr>
        </tbody>
      </table>

      <table className="w-full border-collapse my-3">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-700 px-2 py-1 w-8">№</th>
            <th className="border border-gray-700 px-2 py-1 w-12">Код</th>
            <th className="border border-gray-700 px-2 py-1 text-left">Наименование</th>
            <th className="border border-gray-700 px-2 py-1 w-14">Кол-во</th>
            <th className="border border-gray-700 px-2 py-1 w-12">Ед.</th>
            <th className="border border-gray-700 px-2 py-1 w-24">Цена</th>
            <th className="border border-gray-700 px-2 py-1 w-28">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i}>
              <td className="border border-gray-700 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-700 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-700 px-2 py-1">{it.name}</td>
              <td className="border border-gray-700 px-2 py-1 text-center">{it.qty}</td>
              <td className="border border-gray-700 px-2 py-1 text-center">{it.unit}</td>
              <td className="border border-gray-700 px-2 py-1 text-right">{Number(it.price).toLocaleString('ru-RU')}</td>
              <td className="border border-gray-700 px-2 py-1 text-right">{(it.qty * it.price).toLocaleString('ru-RU')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right space-y-0.5 mb-2">
        <p>Итого: <b>{Number(doc.total).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</b></p>
        <p>В том числе НДС: <b>{(doc.has_vat ? Number(doc.vat_total) : 0).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</b></p>
      </div>
      <p className="mb-1">Всего наименований {items.length}, на сумму {Number(doc.total).toLocaleString('ru-RU', { minimumFractionDigits: 2 })} KZT</p>
      <p className="font-medium mb-8">Всего к оплате: {amountToWords(Number(doc.total))}</p>

      <div className="mt-10 border-t border-gray-300 pt-3">
        <p>Исполнитель _______________________ {company?.director || ''}</p>
        <p className="text-xs text-gray-400 mt-4">М.П.</p>
      </div>
    </div>
  );
}

function AvrView({ doc, company, counterparty, items, fmt }: any) {
  const dateStr = new Date(doc.doc_date).toLocaleDateString('ru-RU');
  return (
    <div className="text-[13px] text-gray-900 leading-relaxed">
      <table className="w-full border-collapse mb-3">
        <tbody>
          <tr><td className="border border-gray-400 px-2 py-1 w-28 font-medium align-top">Заказчик</td><td className="border border-gray-400 px-2 py-1">{counterparty?.name}{counterparty?.bin ? `, БИН ${counterparty.bin}` : ''}{counterparty?.address ? `, Адрес: ${counterparty.address}` : ''}</td></tr>
          <tr><td className="border border-gray-400 px-2 py-1 font-medium align-top">Исполнитель</td><td className="border border-gray-400 px-2 py-1">{company?.name}{company?.bin ? `, БИН ${company.bin}` : ''}{company?.address ? `, Адрес: ${company.address}` : ''}</td></tr>
          <tr><td className="border border-gray-400 px-2 py-1 font-medium">Договор (контракт)</td><td className="border border-gray-400 px-2 py-1">{doc.contract || '—'}</td></tr>
        </tbody>
      </table>

      <h2 className="text-center text-base font-bold my-4">АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ)<br />№{doc.number} от {dateStr}</h2>

      <table className="w-full border-collapse my-3">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-2 py-1 w-12">№</th>
            <th className="border border-gray-400 px-2 py-1 text-left">Наименование работ (услуг)</th>
            <th className="border border-gray-400 px-2 py-1 w-16">Кол-во</th>
            <th className="border border-gray-400 px-2 py-1 w-24">Цена</th>
            <th className="border border-gray-400 px-2 py-1 w-28">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i}>
              <td className="border border-gray-400 px-2 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-400 px-2 py-1">{it.name}</td>
              <td className="border border-gray-400 px-2 py-1 text-center">{it.qty} {it.unit}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{Number(it.price).toLocaleString('ru-RU')}</td>
              <td className="border border-gray-400 px-2 py-1 text-right">{(it.qty * it.price).toLocaleString('ru-RU')}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right mb-2">
        {doc.has_vat && <p>в т.ч. НДС 12%: <b>{fmt(doc.vat_total)}</b></p>}
        <p className="text-sm">Итого: <b>{fmt(doc.total)}</b></p>
      </div>
      <p className="mb-6">Всего на сумму: {amountToWords(Number(doc.total))}</p>

      <div className="grid grid-cols-2 gap-8 mt-10">
        <div>
          <p className="mb-8 font-medium">Сдал (Исполнитель)</p>
          <p className="border-t border-gray-400 pt-1">{company?.director || ''}</p>
          <p className="text-xs text-gray-400 mt-1">должность, подпись</p>
          <p className="text-xs text-gray-400 mt-3">М.П.</p>
        </div>
        <div>
          <p className="mb-8 font-medium">Принял (Заказчик)</p>
          <p className="border-t border-gray-400 pt-1">{counterparty?.director || ''}</p>
          <p className="text-xs text-gray-400 mt-1">должность, подпись</p>
          <p className="text-xs text-gray-400 mt-3">М.П.</p>
        </div>
      </div>
    </div>
  );
}

function SfView({ doc, company, counterparty, bankAcc, items, fmt }: any) {
  const dateStr = new Date(doc.doc_date).toLocaleDateString('ru-RU');
  return (
    <div className="text-[12px] text-gray-900 leading-relaxed">
      <h2 className="text-base font-bold mb-3">Счёт-фактура № {doc.number} от {dateStr} г.</h2>
      <div className="space-y-0.5 mb-3">
        <p><b>Поставщик:</b> {company?.name}</p>
        <p>ИИН/БИН и адрес поставщика: {company?.bin || ''}{company?.address ? `, ${company.address}` : ''}</p>
        {bankAcc && <p>ИИК: {bankAcc.iban}, Банк: {bankAcc.bank}</p>}
        <p>Договор (контракт): {doc.contract || '—'}</p>
        <p>Условия оплаты: Безналичный расчёт</p>
        <p className="pt-1"><b>Грузоотправитель:</b> {company?.name}{company?.address ? `, Адрес: ${company.address}` : ''}</p>
        <p><b>Грузополучатель:</b> {counterparty?.name}{counterparty?.address ? `, Адрес: ${counterparty.address}` : ''}</p>
        <p><b>Получатель:</b> {counterparty?.name}</p>
        <p>БИН/ИИН и адрес получателя: {counterparty?.bin || ''}{counterparty?.address ? `, ${counterparty.address}` : ''}</p>
      </div>

      <table className="w-full border-collapse my-3 text-[11px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-1 py-1 w-6">№</th>
            <th className="border border-gray-400 px-1 py-1 text-left">Наименование товаров (работ, услуг)</th>
            <th className="border border-gray-400 px-1 py-1 w-12">Ед.изм</th>
            <th className="border border-gray-400 px-1 py-1 w-12">Кол-во</th>
            <th className="border border-gray-400 px-1 py-1 w-16">Цена</th>
            <th className="border border-gray-400 px-1 py-1 w-20">Стоимость без НДС</th>
            <th className="border border-gray-400 px-1 py-1 w-12">Ставка НДС</th>
            <th className="border border-gray-400 px-1 py-1 w-16">Сумма НДС</th>
            <th className="border border-gray-400 px-1 py-1 w-20">Всего</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => {
            const total = it.qty * it.price;
            const noVat = doc.has_vat ? Math.round(total / 1.12) : total;
            const vat = doc.has_vat ? total - noVat : 0;
            return (
              <tr key={i}>
                <td className="border border-gray-400 px-1 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-400 px-1 py-1">{it.name}</td>
                <td className="border border-gray-400 px-1 py-1 text-center">{it.unit}</td>
                <td className="border border-gray-400 px-1 py-1 text-center">{it.qty}</td>
                <td className="border border-gray-400 px-1 py-1 text-right">{Number(it.price).toLocaleString('ru-RU')}</td>
                <td className="border border-gray-400 px-1 py-1 text-right">{noVat.toLocaleString('ru-RU')}</td>
                <td className="border border-gray-400 px-1 py-1 text-center">{doc.has_vat ? '12%' : 'Без НДС'}</td>
                <td className="border border-gray-400 px-1 py-1 text-right">{doc.has_vat ? vat.toLocaleString('ru-RU') : '—'}</td>
                <td className="border border-gray-400 px-1 py-1 text-right">{total.toLocaleString('ru-RU')}</td>
              </tr>
            );
          })}
          <tr className="font-semibold bg-gray-50">
            <td colSpan={8} className="border border-gray-400 px-1 py-1 text-right">Всего по счёту:</td>
            <td className="border border-gray-400 px-1 py-1 text-right">{Number(doc.total).toLocaleString('ru-RU')}</td>
          </tr>
        </tbody>
      </table>

      <p className="mb-4">Всего на сумму: {amountToWords(Number(doc.total))}</p>

      <div className="grid grid-cols-2 gap-8 mt-8">
        <div>
          <p className="mb-6">Руководитель: {company?.director || ''}</p>
          <p className="text-xs text-gray-400">(Ф.И.О., подпись)</p>
        </div>
        <div>
          <p className="mb-6">Главный бухгалтер: ___________</p>
          <p className="text-xs text-gray-400">(Ф.И.О., подпись)</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4">Примечание: Без печати недействительно. М.П.</p>
    </div>
  );
}

export const dynamic = 'force-dynamic';
