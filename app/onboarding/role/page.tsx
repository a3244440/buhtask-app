'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Briefcase, User, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { getAttribution } from '@/lib/attribution';

export default function RoleSelectPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [selected, setSelected] = useState<'client' | 'accountant' | null>(null);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/auth'); return; }
      setUser(data.user);
      // если профиль уже есть — пропускаем
      supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle().then(({ data: p }) => {
        if (p) router.push(p.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client');
      });
    });
  }, []);

  const submit = async () => {
    if (!selected || !user || saving) return;
    setSaving(true);
    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
      phone: '',
      role: selected,
      rating: 0,
      is_banned: false,
      completed_tasks: 0,
      verification_status: 'not_verified',
      availability: 'free',
      ...getAttribution(),
    });
    if (selected === 'client') router.push('/onboarding/client');
    else router.push('/dashboard/accountant');
  };

  const cards = [
    { key: 'client' as const, icon: User, title: t('role.clientTitle'), desc: t('role.clientDesc'), color: 'emerald' },
    { key: 'accountant' as const, icon: Briefcase, title: t('role.accountantTitle'), desc: t('role.accountantDesc'), color: 'blue' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-gray-900">{t('role.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('role.subtitle')}</p>
        </div>

        <div className="space-y-3 mb-6">
          {cards.map(c => {
            const Icon = c.icon;
            const active = selected === c.key;
            return (
              <button key={c.key} onClick={() => setSelected(c.key)}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all ${active ? (c.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-emerald-500 bg-emerald-50') : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{c.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{c.desc}</p>
                </div>
                {active && <div className={`w-6 h-6 rounded-full flex items-center justify-center ${c.color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`}><Check className="w-4 h-4 text-white" /></div>}
              </button>
            );
          })}
        </div>

        <button onClick={submit} disabled={!selected || saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold transition-colors">
          {saving ? t('role.saving') : t('role.continue')}
        </button>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
