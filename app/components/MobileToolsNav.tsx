'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Home, Wrench, Briefcase, MessageSquare } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// Нижнее меню для страниц инструментов (мобильное)
export default function MobileToolsNav() {
  const router = useRouter();
  const { t } = useI18n();
  // Роль берём из общего стора (кэшируется между переходами — без повторных запросов и мигания)
  const user = useAuthStore(s => s.user);
  const fetchUser = useAuthStore(s => s.fetchUser);

  useEffect(() => {
    if (!user) fetchUser();
  }, [user, fetchUser]);

  const role = user?.role || 'client';
  const dash = role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';

  const items = [
    { icon: Home, label: t('nav.home'), onClick: () => router.push(dash) },
    { icon: Wrench, label: t('nav.tools'), onClick: () => router.push('/tools') },
    { icon: Briefcase, label: t('nav.tasks'), onClick: () => router.push(dash + '?tab=tasks') },
    { icon: MessageSquare, label: t('nav.messages'), onClick: () => router.push(dash + '?tab=messages') },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 z-40">
      <div className="grid grid-cols-4">
        {items.map(item => (
          <button key={item.label} onClick={item.onClick}
            className="flex flex-col items-center gap-1 py-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
