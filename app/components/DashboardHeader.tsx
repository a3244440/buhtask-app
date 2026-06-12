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
        {/* Logo with dark background pill */}
        <a href={dashHref} className="flex items-center flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-900 rounded-xl px-3 py-1.5">
            <img src="/images/logo.png" alt="BuhTask" className="h-7 w-auto brightness-0 invert" />
          </div>
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
              <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[120px]">{fullName || email.split('@')[0]}</p>
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
