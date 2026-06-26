'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Crown, Zap, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { activePlan } from '@/lib/plans';
import PricingModal from './PricingModal';

export default function PlanBadge() {
  const { t } = useI18n();
  const [plan, setPlan] = useState<'free' | 'business' | 'pro'>('free');
  const [until, setUntil] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('subscription_plan,subscription_until').eq('id', data.user.id).maybeSingle();
      const active = activePlan(p?.subscription_plan, p?.subscription_until);
      setPlan(active);
      setUntil(p?.subscription_until || null);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return null;

  const styles = {
    free:     { bg: 'from-gray-100 to-gray-50 border-gray-200', icon: Sparkles, iconColor: 'text-gray-400', name: t('plan.freeActive'), text: 'text-gray-700' },
    business: { bg: 'from-blue-50 to-indigo-50 border-blue-200', icon: Zap, iconColor: 'text-blue-600', name: 'BuhTask Business', text: 'text-blue-900' },
    pro:      { bg: 'from-violet-50 to-fuchsia-50 border-violet-200', icon: Crown, iconColor: 'text-violet-600', name: 'BuhTask Pro', text: 'text-violet-900' },
  }[plan];
  const Icon = styles.icon;

  return (
    <>
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
