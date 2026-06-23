'use client';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Building2, CalendarDays, Calculator, BarChart3 } from 'lucide-react';

export default function ToolsSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState('client');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (p) setRole(p.role || 'client');
    });
  }, []);

  const dashHref = role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';
  const isAccountant = role === 'accountant';

  const tools = [
    { href: '/companies', icon: Building2, label: 'Мои компании', hide: isAccountant },
    { href: '/tax-calendar', icon: CalendarDays, label: 'Налоговый календарь', hide: false },
    { href: '/salary-calculator', icon: Calculator, label: 'Калькулятор зарплаты', hide: false },
    { href: '/finance', icon: BarChart3, label: 'Финансовая аналитика', hide: isAccountant },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex-col z-40">
      <div className="px-5 py-4 border-b border-gray-50">
        <button onClick={() => router.push(dashHref)}>
          <img src="/images/logo-new.png" alt="BuhTask" className="h-14 w-auto" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <button onClick={() => router.push(dashHref)}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
          <Home className="w-4 h-4 flex-shrink-0" /> Главная
        </button>
        <div className="pt-3 mt-2 border-t border-gray-100">
          <p className="px-4 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Инструменты</p>
          {tools.filter(t => !t.hide).map(t => {
            const active = pathname === t.href || pathname.startsWith(t.href + '/');
            return (
              <button key={t.href} onClick={() => router.push(t.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <t.icon className="w-4 h-4 flex-shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
