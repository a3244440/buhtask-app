'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';

interface Props { title?: string; right?: React.ReactNode; }

export default function DashboardHeader({ title, right }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('client');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email || '');
      const { data: p } = await supabase.from('profiles').select('full_name,avatar_url,role').eq('id', data.user.id).single();
      if (p) { setFullName(p.full_name || ''); setAvatarUrl(p.avatar_url || ''); setRole(p.role || 'client'); }
    });
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };
  const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : (email[0]?.toUpperCase() || '?');
  const dashHref = role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href={dashHref} className="flex items-center flex-shrink-0">
          <img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" />
        </a>

        {title && <h1 className="hidden lg:block text-sm font-semibold text-gray-700 flex-shrink-0">{title}</h1>}
        {right && <div className="flex-1 max-w-md">{right}</div>}

        {/* Profile dropdown */}
        <div className="relative flex-shrink-0 ml-auto" ref={ref}>
          <button onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
            )}
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[120px]">{fullName || (role === 'accountant' ? 'Бухгалтер' : role === 'admin' ? 'Админ' : 'Заказчик')}</p>
              <p className="text-[10px] text-gray-400">{role === 'accountant' ? 'Бухгалтер' : 'Заказчик'}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-xl py-2 z-50">
              <div className="px-4 py-3 border-b border-gray-100">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover mb-2" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mb-2">{initials}</div>
                )}
                <p className="text-sm font-semibold text-gray-900 truncate">{fullName || '—'}</p>
                <p className="text-xs text-gray-400 truncate">{email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">
                  {role === 'accountant' ? 'Бухгалтер' : 'Заказчик'}
                </span>
              </div>
              <button onClick={() => { setOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User className="w-4 h-4 text-gray-400" /> Мой профиль
              </button>
              {role !== 'accountant' && (
                <button onClick={() => { setOpen(false); router.push('/companies'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  Мои компании
                </button>
              )}
              <button onClick={() => { setOpen(false); router.push('/tax-calendar'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                Налоговый календарь
              </button>
              <button onClick={() => { setOpen(false); router.push('/salary-calculator'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                Калькулятор зарплаты
              </button>
              {role !== 'accountant' && (
                <button onClick={() => { setOpen(false); router.push('/finance'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                  Финансовая аналитика
                </button>
              )}
              {role === 'admin' && (
                <button onClick={() => { setOpen(false); router.push('/admin'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  Админ-панель
                </button>
              )}
              <button onClick={() => { setOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Settings className="w-4 h-4 text-gray-400" /> Настройки
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
