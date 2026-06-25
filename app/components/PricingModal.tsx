'use client';
import { X, Check, Crown, Zap } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface Props { onClose: () => void; reason?: string }

export default function PricingModal({ onClose, reason }: Props) {
  const { t } = useI18n();

  const plans = [
    {
      key: 'free', name: t('plan.free'), price: '0 ₸', accent: 'gray',
      features: [t('plan.free.f1'), t('plan.free.f2'), t('plan.free.f3')],
      current: true,
    },
    {
      key: 'business', name: t('plan.biz.name'), price: '4 990 ₸', accent: 'blue', icon: Zap,
      features: [t('plan.biz.f1'), t('plan.biz.f2'), t('plan.biz.f3')],
      popular: true,
    },
    {
      key: 'pro', name: t('plan.pro.name'), price: '9 990 ₸', accent: 'violet', icon: Crown,
      features: [t('plan.pro.f1'), t('plan.pro.f2'), t('plan.pro.f3')],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-bold text-gray-900">{t('plan.choosePlan')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {reason && <div className="mb-5 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">{reason}</div>}

          <div className="grid md:grid-cols-3 gap-4">
            {plans.map(p => {
              const Icon = p.icon;
              const border = p.popular ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200';
              return (
                <div key={p.key} className={`relative rounded-2xl border ${border} p-5 flex flex-col`}>
                  {p.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full">{t('plan.popular')}</span>
                  )}
                  <div className="flex items-center gap-2 mb-1">
                    {Icon && <Icon className={`w-4 h-4 ${p.accent === 'violet' ? 'text-violet-600' : 'text-blue-600'}`} />}
                    <h4 className="font-bold text-gray-900">{p.name}</h4>
                  </div>
                  <div className="mb-4">
                    <span className="text-2xl font-extrabold text-gray-900">{p.price}</span>
                    {p.key !== 'free' && <span className="text-sm text-gray-400">{t('plan.perMonth')}</span>}
                  </div>
                  <ul className="space-y-2 mb-5 flex-1">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${p.accent === 'violet' ? 'text-violet-500' : p.accent === 'blue' ? 'text-blue-500' : 'text-gray-400'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {p.current ? (
                    <div className="text-center py-2.5 rounded-xl bg-gray-50 text-gray-400 text-sm font-medium">{t('plan.current')}</div>
                  ) : (
                    <button onClick={() => alert(t('plan.soon'))}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${p.accent === 'violet' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {t('plan.subscribe')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={onClose} className="w-full text-gray-400 py-3 mt-4 text-sm hover:text-gray-600">{t('plan.later')}</button>
        </div>
      </div>
    </div>
  );
}
