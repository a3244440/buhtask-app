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
      const res = await fetch(`/api/document-export?id=${docId}`);
      if (!res.ok) throw new Error('export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${TYPE_INFO[doc.type].short}_${doc.number}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Ошибка экспорта'); }
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

          {/* Document body (printable) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 print:shadow-none print:border-0 print:rounded-none">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">{info.label} №{doc.number}</h2>
              <p className="text-sm text-gray-500">от {new Date(doc.doc_date).toLocaleDateString('ru-RU')} г.</p>
            </div>

            {/* Поставщик и банк (для счёта) */}
            {company && (
              <div className="mb-4 text-sm">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-medium w-1/3">Поставщик</td><td className="border border-gray-200 px-3 py-1.5">{company.name}{company.bin ? `, БИН ${company.bin}` : ''}</td></tr>
                    {company.address && <tr><td className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-medium">Адрес</td><td className="border border-gray-200 px-3 py-1.5">{company.address}</td></tr>}
                    {bankAcc && <tr><td className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-medium">Банк / IBAN</td><td className="border border-gray-200 px-3 py-1.5">{bankAcc.bank}: {bankAcc.iban}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Покупатель */}
            {counterparty && (
              <div className="mb-4 text-sm">
                <table className="w-full border-collapse">
                  <tbody>
                    <tr><td className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-medium w-1/3">{doc.type === 'avr' ? 'Заказчик' : 'Покупатель'}</td><td className="border border-gray-200 px-3 py-1.5">{counterparty.name}{counterparty.bin ? `, БИН ${counterparty.bin}` : ''}</td></tr>
                    {counterparty.address && <tr><td className="border border-gray-200 px-3 py-1.5 bg-gray-50 font-medium">Адрес</td><td className="border border-gray-200 px-3 py-1.5">{counterparty.address}</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {doc.contract && <p className="text-sm text-gray-600 mb-4">Договор: {doc.contract}</p>}

            {/* Позиции */}
            <table className="w-full border-collapse text-sm mb-4">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-2 py-1.5 text-left w-8">№</th>
                  <th className="border border-gray-200 px-2 py-1.5 text-left">Наименование</th>
                  <th className="border border-gray-200 px-2 py-1.5 w-16">Ед.</th>
                  <th className="border border-gray-200 px-2 py-1.5 w-16">Кол-во</th>
                  <th className="border border-gray-200 px-2 py-1.5 w-24">Цена</th>
                  <th className="border border-gray-200 px-2 py-1.5 w-28">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td className="border border-gray-200 px-2 py-1.5 text-center">{i + 1}</td>
                    <td className="border border-gray-200 px-2 py-1.5">{it.name}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center">{it.unit}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-center">{it.qty}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{Number(it.price).toLocaleString('ru-RU')}</td>
                    <td className="border border-gray-200 px-2 py-1.5 text-right">{(it.qty * it.price).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Итого */}
            <div className="text-right text-sm space-y-1 mb-4">
              {doc.has_vat && <p>в т.ч. НДС 12%: <b>{fmt(doc.vat_total)}</b></p>}
              <p className="text-base">Всего к оплате: <b>{fmt(doc.total)}</b></p>
            </div>
            <p className="text-sm text-gray-600 mb-6">Всего наименований {items.length}, на сумму {amountToWords(Number(doc.total))}</p>

            {/* Подписи */}
            <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
              <div>
                <p className="text-gray-500 mb-6">{doc.type === 'avr' ? 'Сдал (Исполнитель)' : 'Исполнитель'}</p>
                <div className="border-t border-gray-300 pt-1 text-xs text-gray-400">{company?.director || 'подпись'}</div>
              </div>
              <div>
                <p className="text-gray-500 mb-6">{doc.type === 'avr' ? 'Принял (Заказчик)' : 'Покупатель'}</p>
                <div className="border-t border-gray-300 pt-1 text-xs text-gray-400">{counterparty?.director || 'подпись'}</div>
              </div>
            </div>
            {doc.type !== 'invoice' && <p className="text-xs text-gray-400 mt-6">М.П.</p>}
          </div>
        </main>
      </div>
      <style jsx global>{`
        @media print {
          body { background: white; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  );
}
export const dynamic = 'force-dynamic';
