'use client';
import { logToolUsage } from '@/lib/logTool';
import { useState, useEffect } from 'react';
import { SearchCheck, Loader2, Building2, User, Copy, Check, Info } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ToolsSidebar from '../components/ToolsSidebar';
import MobileToolsNav from '../components/MobileToolsNav';
import { useI18n } from '@/lib/i18n';

interface Result {
  found: boolean; name?: string; bin: string; director?: string; address?: string;
  oked?: string; registration_date?: string; status?: string; source?: string;
  krp?: string; type?: string; message?: string;
}

export default function BinCheckPage() {
  useEffect(() => { logToolUsage('Проверка БИН/ИИН'); }, []);
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [debug, setDebug] = useState('');

  // Прямой запрос из браузера к бизнес-регистру (фолбэк, как делают SPA-сервисы)
  const directStatGov = async (bin: string): Promise<Result | null> => {
    const dbg: string[] = [];
    for (const host of ['https://old.stat.gov.kz', 'https://stat.gov.kz']) {
      try {
        const res = await fetch(`${host}/api/juridical/counter/api/?bin=${bin}&lang=ru`, { signal: AbortSignal.timeout(9000) });
        if (!res.ok) { dbg.push(`${host}: HTTP ${res.status}`); continue; }
        const data = await res.json();
        const obj = Array.isArray(data?.obj) ? data.obj[0] : data?.obj;
        if (!obj) continue;
        const name = obj.name || obj.fullName || '';
        const fio = obj.fio || '';
        if (!name && !fio) continue;
        const isIp = !!fio && (!name || /индивидуальный предприниматель|^ип\b/i.test(name));
        return {
          found: true, bin,
          source: 'stat.gov.kz (бизнес-регистр)',
          name: name || `ИП ${fio}`,
          director: fio || '',
          address: obj.katoAddress || '',
          oked: obj.okedName ? `${obj.okedCode ? obj.okedCode + ' — ' : ''}${obj.okedName}` : '',
          registration_date: (obj.registerDate || obj.dateReg || '').toString().split('T')[0],
          status: obj.statusName || (isIp ? 'Действующий ИП' : 'Действующее'),
          krp: obj.krpName || '',
          type: isIp || /^[0-3]/.test(bin[4]) ? 'ИП' : 'Юридическое лицо',
        };
      } catch (e: any) { dbg.push(`${host}: ${e?.message || e?.name || 'fetch failed (возможно CORS)'}`); }
    }
    setDebug(dbg.join(' · '));
    return null;
  };

  const search = async (bin: string) => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`/api/company-lookup?bin=${bin}`);
      const data = await res.json();
      if (data.found) { setResult(data); return; }
      // Фолбэк: браузер напрямую спрашивает реестр (гос-API иногда блокирует сервера)
      const direct = await directStatGov(bin);
      if (direct) { setResult(direct); return; }
      setError(data.error || t('bin.notFound'));
    } catch {
      const direct = await directStatGov(bin).catch(() => null);
      if (direct) setResult(direct);
      else setError(t('bin.notFound'));
    }
    finally { setLoading(false); }
  };

  const onChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 12);
    setValue(digits);
    setResult(null); setError('');
    if (digits.length === 12) search(digits);
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key); setTimeout(() => setCopied(''), 1200);
  };

  const isIp = result?.type === 'ИП';

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 lg:pb-0" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToolsSidebar />
      <div className="lg:pl-60">
        <DashboardHeader title={t('bin.title')} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2"><SearchCheck className="w-5 h-5 text-blue-600" /> {t('bin.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('bin.subtitle')}</p>
          </div>

          {/* Поле ввода 12 цифр */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">{t('bin.inputLabel')}</label>
            <div className="flex items-center gap-3">
              <input
                type="text" inputMode="numeric" maxLength={12} placeholder="000000000000"
                value={value} onChange={e => onChange(e.target.value)}
                className="w-full h-12 px-4 text-left text-xl font-semibold tracking-[0.12em] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-300"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              />
              {loading && <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />}
            </div>
            <div className="flex justify-between mt-2">
              <p className="text-[11px] text-gray-400">{t('bin.autoHint')}</p>
              <p className="text-[11px] text-gray-400 tabular-nums">{value.length}/12</p>
            </div>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <p className="text-sm text-amber-700">{error}</p>
              {debug && <p className="text-[10px] text-gray-400 mt-2 break-all">tech: {debug}</p>}
            </div>
          )}

          {/* Карточка результата */}
          {result && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
              <div className="p-5 border-b border-gray-50 flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isIp ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                  {isIp ? <User className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isIp ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{result.type || 'Юридическое лицо'}</span>
                    {result.status && <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{result.status}</span>}
                  </div>
                  <p className="font-bold text-gray-900 mt-1.5 leading-snug">{result.name}</p>
                  <button onClick={() => copy(result.bin, 'bin')} className="text-xs text-gray-400 mt-1 flex items-center gap-1 hover:text-blue-600">
                    {t('bin.binIin')}: <span className="font-semibold tabular-nums">{result.bin}</span>
                    {copied === 'bin' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-50 text-sm">
                {result.director && !isIp && (
                  <div className="px-5 py-3 flex justify-between gap-3"><span className="text-gray-400 flex-shrink-0">{t('bin.director')}</span><span className="text-gray-800 font-medium text-right">{result.director}</span></div>
                )}
                {result.registration_date && (
                  <div className="px-5 py-3 flex justify-between gap-3"><span className="text-gray-400 flex-shrink-0">{t('bin.regDate')}</span><span className="text-gray-800 font-medium">{result.registration_date}</span></div>
                )}
                {result.oked && (
                  <div className="px-5 py-3 flex justify-between gap-3"><span className="text-gray-400 flex-shrink-0">{t('bin.oked')}</span><span className="text-gray-800 font-medium text-right">{result.oked}</span></div>
                )}
                {(result as any).krp && (
                  <div className="px-5 py-3 flex justify-between gap-3"><span className="text-gray-400 flex-shrink-0">{t('bin.krp')}</span><span className="text-gray-800 font-medium text-right">{(result as any).krp}</span></div>
                )}
                {result.address && (
                  <div className="px-5 py-3 flex justify-between gap-3"><span className="text-gray-400 flex-shrink-0">{t('bin.address')}</span><span className="text-gray-800 font-medium text-right">{result.address}</span></div>
                )}
                <div className="px-5 py-3 flex justify-between gap-3"><span className="text-gray-400">{t('bin.source')}</span><span className="text-gray-500 text-xs">{result.source}</span></div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">{t('bin.note')}</p>
          </div>
        </main>
      </div>
      <MobileToolsNav />
    </div>
  );
}
export const dynamic = 'force-dynamic';
