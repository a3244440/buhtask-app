'use client';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Clock, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getReportingStatus } from '@/lib/taxReporting';

interface Props { compact?: boolean }

export default function ReportingBanner({ compact = false }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const today = new Date();
  const year = today.getFullYear();

  const status = useMemo(() => getReportingStatus(today, year), [year]);
  if (status.active.length === 0 && status.soon.length === 0) return null;

  const fmtDate = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  const daysTo = (d: Date) => Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-3 mb-5">
      {/* Активный приём */}
      {status.active.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{t('tax.reportingOpen')}</h3>
          </div>
          <div className="space-y-1.5">
            {status.active.map(w => {
              const d = daysTo(w.deadline);
              return (
                <div key={w.key} className="flex items-center gap-2 text-sm">
                  <div className="flex items-baseline gap-1.5 flex-wrap min-w-0 flex-1">
                    <span className="font-semibold text-gray-900">{w.title}</span>
                    <span className="text-gray-500 text-xs">{t(w.titleKey)}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${d <= 5 ? 'bg-amber-100 text-amber-700' : 'bg-white text-gray-500 border border-gray-200'}`}>
                    {t('tax.acceptUntil')} {fmtDate(w.deadline)} · {d} {t('tax.daysShort2')}
                  </span>
                </div>
              );
            })}
          </div>
          <button onClick={() => router.push('/tax-calendar')}
            className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
            {t('tax.viewCalendar')} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Скоро откроется */}
      {status.soon.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-sm">{t('tax.reportingSoon')}</h3>
          </div>
          <div className="space-y-1.5">
            {status.soon.map(w => (
              <div key={w.key} className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-semibold text-gray-900">{w.title}</span>
                <span className="text-gray-500 text-xs">{t(w.titleKey)}</span>
                <span className="ml-auto text-xs font-medium text-amber-700">
                  {t('tax.openFrom')} {fmtDate(w.start)} ({t('tax.opensIn')} {daysTo(w.start)} {t('tax.daysShort2')})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
