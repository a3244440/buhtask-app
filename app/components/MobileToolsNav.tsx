'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Home, Wrench, Briefcase, MessageSquare } from 'lucide-react';

// Нижнее меню для страниц инструментов (мобильное)
export default function MobileToolsNav() {
  const router = useRouter();
  const [role, setRole] = useState('client');

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
      if (p) setRole(p.role || 'client');
    });
  }, []);

  const dash = role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';

  const items = [
    { icon: Home, label: 'Главная', onClick: () => router.push(dash) },
    { icon: Wrench, label: 'Инструменты', onClick: () => router.push('/tools') },
    { icon: Briefcase, label: 'Задачи', onClick: () => router.push(dash + '?tab=tasks') },
    { icon: MessageSquare, label: 'Чат', onClick: () => router.push(dash + '?tab=messages') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
      <div className="grid grid-cols-4">
        {items.map(item => (
          <button key={item.label} onClick={item.onClick}
            className="flex flex-col items-center gap-1 py-2.5 text-gray-500 hover:text-blue-600">
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
