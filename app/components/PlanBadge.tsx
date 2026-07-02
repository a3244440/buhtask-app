'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Crown, Zap, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { activePlan } from '@/lib/plans';
import PricingModal from './PricingModal';

export default function PlanBadge() {
  const { t } = useI18n();
  const [rawPlan, setRawPlan] = useState<string>('free');
  const [until, setUntil] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('subscription_plan,subscription_until').eq('id', data.user.id).maybeSingle();
      setRawPlan(p?.subscription_plan || 'free');
      setUntil(p?.subscription_until || null);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  const plan = activePlan(rawPlan, until); // free | business | pro (с учётом срока)
  // Платный тариф был выбран, но срок истёк
  const expired = (rawPlan === 'business' || rawPlan === 'pro') && plan === 'free';
  // Дней до окончания
  const daysLeft = until ? Math.ceil((new Date(until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const expiringSoon = plan !== 'free' && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  const styles = {
    free:     { bg: 'from-gray-100 to-gray-50 border-gray-200', icon: Sparkles, iconColor: 'text-gray-400', name: t('plan.freeActive'), text: 'text-gray-700' },
    business: { bg: 'from-blue-50 to-indigo-50 border-blue-200', icon: Zap, iconColor: 'text-blue-600', name: 'BuhTask Business', text: 'text-blue-900' },
    pro:      { bg: 'from-violet-50 to-fuchsia-50 border-violet-200', icon: Crown, iconColor: 'text-violet-600', name: 'BuhTask Pro', text: 'text-violet-900' },
  }[plan];
  const Icon = styles.icon;
  const planName = rawPlan === 'pro' ? 'Pro' : rawPlan === 'business' ? 'Business' : 'Free';

  // Жёлтая плашка для PRO (в фирменном жёлтом акценте сайта)
  if (plan === 'pro') {
    return (
      <>
        <div className="relative overflow-hidden rounded-2xl p-4 mb-5 shadow-md bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400">
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/50 backdrop-blur flex items-center justify-center flex-shrink-0">
              <Crown className="w-6 h-6 text-amber-700" fill="currentColor" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-amber-900/70 uppercase tracking-wide">{t('plan.yourPlan')}</p>
              <p className="font-extrabold text-lg text-amber-950">BuhTask Pro</p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-[10px] px-2 py-1 bg-white/50 text-amber-900 rounded-full font-bold">✨ {t('plan.fullAccess')}</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Уведомление об истечении подписки */}
      {expired && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">{t('plan.expiredTitle')}</p>
            <p className="text-xs text-red-600 mt-0.5">{t('plan.expiredDesc')}</p>
            <button onClick={() => setShowPricing(true)} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white">
              {t('plan.renew')}
            </button>
          </div>
        </div>
      )}

      {/* Предупреждение за 3 дня */}
      {expiringSoon && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-3 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">{t('plan.expiringSoon')}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {t('plan.expiresIn').replace('{plan}', planName).replace('{days}', String(daysLeft))}
            </p>
            <button onClick={() => setShowPricing(true)} className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white">
              {t('plan.renew')}
            </button>
          </div>
        </div>
      )}

      {/* Бейдж текущего тарифа */}
      <div className={`bg-gradient-to-r ${styles.bg} border rounded-2xl p-4 mb-5 flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center flex-shrink-0">
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400">{t('plan.yourPlan')}</p>
          <p className={`font-bold text-sm ${styles.text}`}>{styles.name}</p>
          {plan !== 'free' && until && (
            <p className="text-[11px] text-gray-400 mt-0.5">{t('plan.activeUntil')} {new Date(until).toLocaleDateString('ru-RU')}</p>
          )}
        </div>
        {plan !== 'pro' && (
          <button onClick={() => setShowPricing(true)}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 flex-shrink-0">
            {t('plan.upgrade')}
          </button>
        )}
      </div>
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </>
  );
}
