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
              <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium">
                <Printer className="w-4 h-4" /> Печать / PDF
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
    <div className="text-[11px] text-gray-900 leading-snug">
      {/* Шапка формы */}
      <div className="flex justify-end mb-1">
        <div className="text-right text-[9px] leading-tight">
          <p>Приложение 50</p>
          <p>к приказу Министра финансов</p>
          <p>Республики Казахстан</p>
          <p>от 20 декабря 2012 года № 562</p>
          <p className="font-bold mt-1">Форма Р-1</p>
        </div>
      </div>

      {/* Заказчик / Исполнитель с ИИН/БИН в рамке справа */}
      <table className="w-full border-collapse mb-1 text-[10px]">
        <tbody>
          <tr>
            <td style={{ width: '70px' }}></td>
            <td></td>
            <td className="border border-gray-700 px-1 text-center text-[8px] font-medium" style={{ width: '120px' }}>ИИН/БИН</td>
          </tr>
          <tr>
            <td className="px-1 py-0.5 align-top font-medium whitespace-nowrap">Заказчик</td>
            <td className="px-1 py-0.5 border-b border-gray-700">
              {counterparty?.name}{counterparty?.address ? `, Адрес: ${counterparty.address}` : ''}
            </td>
            <td className="border border-gray-700 px-1 py-0.5 align-middle text-center whitespace-nowrap">{counterparty?.bin || ''}</td>
          </tr>
          <tr><td></td><td className="px-1 text-[7px] text-gray-400 text-center">полное наименование, адрес, данные о средствах связи</td><td></td></tr>
          <tr>
            <td className="px-1 py-0.5 align-top font-medium">Исполнитель</td>
            <td className="px-1 py-0.5 border-b border-gray-700">
              {company?.name}{company?.address ? `, Адрес: ${company.address}` : ''}
            </td>
            <td className="border border-gray-700 px-1 py-0.5 align-middle text-center whitespace-nowrap">{company?.bin || ''}</td>
          </tr>
          <tr><td></td><td className="px-1 text-[7px] text-gray-400 text-center">полное наименование, адрес, данные о средствах связи</td><td></td></tr>
        </tbody>
      </table>

      {/* Договор под исполнителем */}
      <p className="text-[10px] mb-2">Договор (контракт): {doc.contract || '—'}</p>

      {/* Номер / дата в таблице справа */}
      <div className="flex justify-end mb-3">
        <table className="border-collapse text-[10px]">
          <tbody>
            <tr>
              <td className="border border-gray-700 px-3 py-1 text-center font-medium">Номер документа</td>
              <td className="border border-gray-700 px-3 py-1 text-center font-medium">Дата составления</td>
            </tr>
            <tr>
              <td className="border border-gray-700 px-3 py-1 text-center">{doc.number}</td>
              <td className="border border-gray-700 px-3 py-1 text-center">{dateStr}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-center text-[13px] font-bold mb-3">АКТ ВЫПОЛНЕННЫХ РАБОТ (ОКАЗАННЫХ УСЛУГ)</h2>

      {/* Основная таблица — 8 колонок формы Р-1 */}
      <table className="w-full border-collapse text-[9px]">
        <thead>
          <tr>
            <th className="border border-gray-700 px-1 py-1 align-middle" rowSpan={2} style={{ width: '32px' }}>Номер по порядку</th>
            <th className="border border-gray-700 px-1 py-1 align-middle" rowSpan={2}>Наименование работ (услуг)</th>
            <th className="border border-gray-700 px-1 py-1 align-middle" rowSpan={2} style={{ width: '55px' }}>Дата выполнения работ (оказания услуг)</th>
            <th className="border border-gray-700 px-1 py-1 align-middle" rowSpan={2} style={{ width: '90px' }}>Сведения о наличии отчета о маркетинговых исследованиях, консультационных и прочих услуг (дата, номер, количество страниц)</th>
            <th className="border border-gray-700 px-1 py-1 align-middle" rowSpan={2} style={{ width: '40px' }}>Единица измерения</th>
            <th className="border border-gray-700 px-1 py-1 align-middle text-center" colSpan={3}>Выполнено работ (оказано услуг)</th>
          </tr>
          <tr>
            <th className="border border-gray-700 px-1 py-1 align-middle" style={{ width: '40px' }}>количество</th>
            <th className="border border-gray-700 px-1 py-1 align-middle" style={{ width: '55px' }}>цена за единицу</th>
            <th className="border border-gray-700 px-1 py-1 align-middle" style={{ width: '60px' }}>стоимость</th>
          </tr>
          <tr className="text-[8px] text-gray-500">
            {[1,2,3,4,5,6,7,8].map(n => <td key={n} className="border border-gray-700 px-1 text-center">{n}</td>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => (
            <tr key={i}>
              <td className="border border-gray-700 px-1 py-1 text-center">{i + 1}</td>
              <td className="border border-gray-700 px-1 py-1">{it.name}</td>
              <td className="border border-gray-700 px-1 py-1 text-center">{dateStr}</td>
              <td className="border border-gray-700 px-1 py-1"></td>
              <td className="border border-gray-700 px-1 py-1 text-center">{it.unit}</td>
              <td className="border border-gray-700 px-1 py-1 text-center">{it.qty}</td>
              <td className="border border-gray-700 px-1 py-1 text-right">{Number(it.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
              <td className="border border-gray-700 px-1 py-1 text-right">{(it.qty * it.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border border-gray-700 px-1 py-1 text-center" colSpan={5}>Итого</td>
            <td className="border border-gray-700 px-1 py-1 text-center">{items.reduce((s: number, it: any) => s + Number(it.qty), 0)}</td>
            <td className="border border-gray-700 px-1 py-1 text-center">х</td>
            <td className="border border-gray-700 px-1 py-1 text-right">{Number(doc.total).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>

      {/* Сведения о запасах */}
      <div className="mt-2 text-[9px]">
        <p>Сведения об использовании запасов, полученных от заказчика</p>
        <p className="border-b border-gray-700 h-4"></p>
        <p className="text-center text-gray-400 text-[8px]">наименование, количество, стоимость</p>
      </div>
      <p className="mt-2 text-[9px]">Приложение: Перечень документации</p>

      {/* Подписи */}
      <div className="grid grid-cols-2 gap-6 mt-5 text-[10px]">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-medium">Сдал (Исполнитель)</span>
            <span>Директор</span>
            <span className="flex-1 border-b border-gray-700"></span>
            <span>/ /</span>
            <span>{company?.director || ''}</span>
          </div>
          <div className="flex text-[7px] text-gray-400 mt-0.5"><span className="w-24">должность</span><span className="flex-1 text-center">подпись</span><span>расшифровка подписи</span></div>
          <p className="mt-3">М.П.</p>
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-medium">Принял (Заказчик)</span>
            <span>Директор</span>
            <span className="flex-1 border-b border-gray-700"></span>
            <span>/ /</span>
            <span>{counterparty?.director || ''}</span>
          </div>
          <div className="flex text-[7px] text-gray-400 mt-0.5"><span className="w-24">должность</span><span className="flex-1 text-center">подпись</span><span>расшифровка подписи</span></div>
          <p className="mt-3">М.П.</p>
        </div>
      </div>
      <p className="mt-2 text-[9px]">Дата подписания (принятия) работ (услуг) {dateStr}</p>
    </div>
  );
}

function SfView({ doc, company, counterparty, bankAcc, items, fmt }: any) {
  const dateStr = new Date(doc.doc_date).toLocaleDateString('ru-RU');
  const cpBank = counterparty?.bank ? `ИИК: ${counterparty.iban || ''}, БИК: ${counterparty.bik || ''}` : '';
  return (
    <div className="text-[10px] text-gray-900 leading-snug">
      {/* Номер бланка */}
      <p className="text-[9px] mb-1">{String(doc.number).padStart(7, '0')}</p>

      <h2 className="text-[14px] font-bold mb-3 text-center">Счет-фактура № {doc.number} от {dateStr} г.</h2>

      {/* Реквизиты поставщика */}
      <div className="space-y-0.5 mb-2">
        <p><b>Поставщик:</b> {company?.name || ''}</p>
        <p>ИИН/БИН и адрес местонахождения поставщика: {company?.bin || ''}{company?.address ? `, Адрес: ${company.address}` : ''}</p>
        {bankAcc && <p>ИИК: {bankAcc.iban || ''}, БИК: {bankAcc.bik || ''}</p>}
        <p>Договор(контракт) на поставку товаров(работ,услуг): {doc.contract || 'Без договора'}</p>
        <p>Условия оплаты по договору (контракту): Безналичный расчет</p>
        <p>Пункт назначения поставляемых товаров(работ,услуг): {counterparty?.address || ''}</p>
        <p className="text-[8px] text-gray-400 ml-2">государство, регион, область, город, район</p>
        <p>Поставка товаров(работ,услуг) осуществлена по доверенности: </p>
        <p>Способ отправления: </p>
        <p>Товарно-транспортная накладная: </p>
      </div>

      {/* Грузоотправитель / Получатель */}
      <div className="space-y-0.5 mb-3">
        <p><b>Грузоотправитель:</b> {company?.name || ''}{company?.address ? `, Адрес: ${company.address}` : ''}</p>
        <p className="text-[8px] text-gray-400 ml-2">(ИИН, наименование и адрес)</p>
        <p><b>Грузополучатель:</b> {counterparty?.name || ''}{counterparty?.address ? `, ${counterparty.address}` : ''}</p>
        <p className="text-[8px] text-gray-400 ml-2">(БИН, наименование и адрес)</p>
        <p><b>Получатель:</b> {counterparty?.name || ''}</p>
        <p>БИН/ИИН и адрес местонахождения получателя: {counterparty?.bin || ''}{counterparty?.address ? `, Адрес: ${counterparty.address}` : ''}</p>
        {cpBank && <p>{cpBank}</p>}
      </div>

      {/* Таблица 11 колонок */}
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2} style={{ width: '20px' }}>№ п/п</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2}>Наименование товаров (работ, услуг)</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2} style={{ width: '32px' }}>Ед. изм.</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2} style={{ width: '38px' }}>Кол-во (объем)</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2} style={{ width: '45px' }}>Цена (KZT)</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2} style={{ width: '50px' }}>Стоимость товаров (работ, услуг) без НДС</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle text-center" colSpan={2}>НДС</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle" rowSpan={2} style={{ width: '50px' }}>Всего стоимость реализации</th>
            <th className="border border-gray-700 px-0.5 py-1 align-middle text-center" colSpan={2}>Акциз</th>
          </tr>
          <tr>
            <th className="border border-gray-700 px-0.5 py-1" style={{ width: '32px' }}>Ставка</th>
            <th className="border border-gray-700 px-0.5 py-1" style={{ width: '40px' }}>Сумма</th>
            <th className="border border-gray-700 px-0.5 py-1" style={{ width: '32px' }}>Ставка</th>
            <th className="border border-gray-700 px-0.5 py-1" style={{ width: '40px' }}>Сумма</th>
          </tr>
          <tr className="text-[7px] text-gray-500">
            {[1,2,3,4,5,6,7,8,9,10,11].map(n => <td key={n} className="border border-gray-700 px-0.5 text-center">{n}</td>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any, i: number) => {
            const total = it.qty * it.price;
            const noVat = doc.has_vat ? Math.round(total / 1.12) : total;
            const vat = doc.has_vat ? total - noVat : 0;
            return (
              <tr key={i}>
                <td className="border border-gray-700 px-0.5 py-1 text-center">{i + 1}</td>
                <td className="border border-gray-700 px-0.5 py-1">{it.name}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-center">{it.unit}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-center">{Number(it.qty).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-right">{Number(it.price).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-right">{noVat.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-center">{doc.has_vat ? '12%' : 'Без НДС'}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-right">{doc.has_vat ? vat.toLocaleString('ru-RU', { minimumFractionDigits: 2 }) : 'Без НДС'}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-right">{total.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
                <td className="border border-gray-700 px-0.5 py-1 text-center"></td>
                <td className="border border-gray-700 px-0.5 py-1 text-center"></td>
              </tr>
            );
          })}
          <tr className="font-semibold">
            <td colSpan={8} className="border border-gray-700 px-1 py-1 text-right">Всего по счету:</td>
            <td className="border border-gray-700 px-1 py-1 text-right">{Number(doc.total).toLocaleString('ru-RU', { minimumFractionDigits: 2 })}</td>
            <td className="border border-gray-700" colSpan={2}></td>
          </tr>
        </tbody>
      </table>

      {/* Подписи */}
      <div className="grid grid-cols-2 gap-6 mt-5 text-[10px]">
        <div>
          <p className="mb-4">Руководитель: <span className="font-medium">{company?.director || ''}</span></p>
          <p className="text-[8px] text-gray-400">(Ф.И.О., подпись)  М.П.</p>
          <p className="mt-3 mb-4">Главный бухгалтер: </p>
          <p className="text-[8px] text-gray-400">(Ф.И.О., подпись)</p>
        </div>
        <div>
          <p className="mb-4">ВЫДАЛ (ответственное лицо поставщика)</p>
          <p className="text-[8px] text-gray-400">(должность)</p>
          <p className="mt-3 mb-4 border-b border-gray-700 h-4"></p>
          <p className="text-[8px] text-gray-400">(Ф.И.О., подпись)</p>
        </div>
      </div>
      <p className="text-[8px] text-gray-500 mt-4">Примечание: Без печати недействительно. Оригинал (первый экземпляр) - покупателю. Копия (второй экземпляр) - поставщику.</p>
    </div>
  );
}

export const dynamic = 'force-dynamic';
