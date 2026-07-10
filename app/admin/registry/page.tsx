'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Upload, Loader2, Check, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

// Импорт официального реестра БНС (ЮЛ/ИП) в собственную базу.
// Файлы: XLSX/CSV выгрузки stat.gov.kz (по регионам). Парсинг в браузере, upsert батчами.

interface Row { bin: string; name: string; oked: string; address: string; reg_date: string | null; krp: string; type: string; }

const findCol = (headers: string[], keys: string[]) =>
  headers.findIndex(h => keys.some(k => h.includes(k)));

export default function RegistryImportPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [entType, setEntType] = useState<'ИП' | 'ЮЛ'>('ИП');
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [total, setTotal] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      setAllowed(p?.role === 'admin');
      refreshCount();
    });
  }, []);

  const refreshCount = async () => {
    const { count } = await supabase.from('business_register').select('bin', { count: 'exact', head: true });
    setTotal(count ?? 0);
  };

  const addLog = (m: string) => setLog(l => [m, ...l].slice(0, 40));

  const parseSheet = (ws: XLSX.WorkSheet): Row[] => {
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    // ищем строку заголовков (содержит бин/иин)
    let hIdx = raw.findIndex(r => r.some((c: any) => /бин|иин|bin|iin/i.test(String(c))));
    if (hIdx < 0) hIdx = 0;
    const headers = raw[hIdx].map((h: any) => String(h).toLowerCase());
    const cBin = findCol(headers, ['бин', 'иин', 'bin', 'iin']);
    const cName = findCol(headers, ['наименование', 'фио', 'name', 'атауы', 'аты']);
    const cOkedName = findCol(headers, ['наименование окэд', 'окэд (наименование', 'вид деятельности']);
    const cOked = findCol(headers, ['окэд', 'oked']);
    const cAddr = findCol(headers, ['населен', 'като', 'адрес', 'мекен', 'локалитет']);
    const cDate = findCol(headers, ['дата регистрации', 'дата рег', 'тіркел']);
    const cKrp = findCol(headers, ['крп', 'размерность']);
    if (cBin < 0 || cName < 0) return [];
    const rows: Row[] = [];
    for (let i = hIdx + 1; i < raw.length; i++) {
      const r = raw[i];
      const bin = String(r[cBin] || '').replace(/\D/g, '');
      const name = String(r[cName] || '').trim();
      if (bin.length !== 12 || !name) continue;
      let reg: string | null = null;
      if (cDate >= 0 && r[cDate]) {
        const d = String(r[cDate]).trim();
        const m = d.match(/(\d{2})\.(\d{2})\.(\d{4})/);
        reg = m ? `${m[3]}-${m[2]}-${m[1]}` : (d.match(/^\d{4}-\d{2}-\d{2}/) ? d.slice(0, 10) : null);
      }
      const okedCode = cOked >= 0 ? String(r[cOked] || '').trim() : '';
      const okedName = cOkedName >= 0 && cOkedName !== cOked ? String(r[cOkedName] || '').trim() : '';
      rows.push({
        bin, name,
        oked: [okedCode, okedName].filter(Boolean).join(' — ').slice(0, 300),
        address: cAddr >= 0 ? String(r[cAddr] || '').trim().slice(0, 300) : '',
        reg_date: reg,
        krp: cKrp >= 0 ? String(r[cKrp] || '').trim().slice(0, 120) : '',
        type: entType,
      });
    }
    return rows;
  };

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true); stopRef.current = false;
    let grandTotal = 0;
    try {
      for (const file of Array.from(files)) {
        addLog(`📄 ${file.name}: читаю...`);
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        let rows: Row[] = [];
        wb.SheetNames.forEach(sn => { rows = rows.concat(parseSheet(wb.Sheets[sn])); });
        if (rows.length === 0) { addLog(`⚠️ ${file.name}: не нашёл колонки БИН/наименование`); continue; }
        addLog(`${file.name}: ${rows.length.toLocaleString('ru-RU')} записей, загружаю...`);
        setProgress({ done: 0, total: rows.length });
        const BATCH = 2000;
        for (let i = 0; i < rows.length; i += BATCH) {
          if (stopRef.current) { addLog('⏹ Остановлено'); setBusy(false); return; }
          const chunk = rows.slice(i, i + BATCH);
          const { error } = await supabase.from('business_register').upsert(chunk, { onConflict: 'bin' });
          if (error) { addLog(`❌ Ошибка: ${error.message}`); setBusy(false); return; }
          setProgress({ done: Math.min(i + BATCH, rows.length), total: rows.length });
        }
        grandTotal += rows.length;
        addLog(`✅ ${file.name}: готово`);
      }
      addLog(`🎉 Импорт завершён: ${grandTotal.toLocaleString('ru-RU')} записей`);
      refreshCount();
    } catch (e: any) {
      addLog(`❌ ${e?.message || 'Ошибка обработки'}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (allowed === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!allowed) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Доступ только для администратора</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-8" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Админ-панель</button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1"><Database className="w-5 h-5 text-blue-600" /> Импорт бизнес-регистра БНС</h1>
        <p className="text-sm text-gray-500 mb-1">Загрузите официальные XLSX-выгрузки реестра (stat.gov.kz) — данные попадут в нашу базу и будут искаться мгновенно.</p>
        <p className="text-sm font-semibold text-gray-700 mb-5">Сейчас в базе: {total === null ? '…' : total.toLocaleString('ru-RU')} записей</p>

        {/* Тип загружаемого реестра */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setEntType('ИП')} className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 ${entType === 'ИП' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-white text-gray-500'}`}>Реестр ИП</button>
          <button onClick={() => setEntType('ЮЛ')} className={`px-4 py-3 rounded-xl text-sm font-semibold border-2 ${entType === 'ЮЛ' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500'}`}>Реестр юрлиц</button>
        </div>

        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 bg-white rounded-2xl p-8 text-center mb-4">
          {busy ? (
            <>
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">Загружено {progress.done.toLocaleString('ru-RU')} / {progress.total.toLocaleString('ru-RU')}</p>
              <div className="w-full bg-gray-100 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-blue-600 h-2 transition-all" style={{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }} />
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Не закрывайте вкладку</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-800">Выбрать файлы реестра ({entType})</p>
              <p className="text-xs text-gray-400 mt-1">XLSX / XLS / CSV, можно несколько сразу. Из ZIP-архива сначала извлеките файлы.</p>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" multiple onChange={e => processFiles(e.target.files)} className="hidden" />
        {busy && <button onClick={() => { stopRef.current = true; }} className="w-full mb-4 py-2 text-xs text-red-500 hover:underline">Остановить</button>}

        {/* Лог */}
        {log.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-xs text-gray-600 space-y-1 max-h-64 overflow-y-auto font-mono">
            {log.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-600 leading-relaxed">
            <p className="font-semibold text-amber-800 mb-1">Где взять файлы</p>
            <p>stat.gov.kz → войдите в «Кабинет пользователя» (бесплатная регистрация) → раздел «Реестры» → скачайте «Реестр действующих ИП» (и при желании ЮЛ) по регионам. Распакуйте ZIP и загрузите XLSX сюда. Повторяйте раз в месяц для актуальности — повторная загрузка просто обновит записи.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
