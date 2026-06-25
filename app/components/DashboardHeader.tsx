'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, User, Settings, ChevronDown, Building2, Check, Plus, Mail } from 'lucide-react';
import { getActiveCompany, setActiveCompany } from '@/lib/activeCompany';
import { shortCompanyName } from '@/lib/companyName';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

interface Props { title?: string; right?: React.ReactNode; }

export default function DashboardHeader({ title, right }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [role, setRole] = useState('client');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [activeCompany, setActiveCompanyState] = useState('personal');
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email || '');
      const { data: p } = await supabase.from('profiles').select('full_name,avatar_url,role').eq('id', data.user.id).single();
      if (p) {
        setFullName(p.full_name || ''); setAvatarUrl(p.avatar_url || ''); setRole(p.role || 'client');
        if (p.role !== 'accountant') {
          const { data: comps } = await supabase.from('companies').select('id,name').eq('owner_id', data.user.id);
          setCompanies((comps as { id: string; name: string }[]) || []);
        }
      }
    });
    setActiveCompanyState(getActiveCompany());
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const chooseCompany = (id: string) => {
    setActiveCompany(id);
    setActiveCompanyState(id);
    setCompanyMenuOpen(false);
  };
  const activeCompanyName = activeCompany === 'personal' ? t('menu.personal') : shortCompanyName(companies.find(c => c.id === activeCompany)?.name || t('menu.personal'));

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push('/'); };
  const initials = fullName ? fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : (email[0]?.toUpperCase() || '?');
  const dashHref = role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Logo only on mobile (sidebar has it on desktop) */}
        <a href={dashHref} className="flex items-center flex-shrink-0 lg:hidden">
          <img src="/images/logo-new.png" alt="BuhTask" className="h-9 w-auto" />
        </a>

        {title && <h1 className="hidden lg:block text-sm font-semibold text-gray-700 flex-shrink-0">{title}</h1>}
        {right && <div className="flex-1 max-w-md">{right}</div>}

        {/* Company switcher (1С-style) — only for clients */}
        {role !== 'accountant' && (
          <div className="relative flex-shrink-0 ml-auto mr-2" ref={companyRef}>
            <button onClick={() => setCompanyMenuOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors max-w-[200px]">
              <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700 truncate">{activeCompanyName}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
            {companyMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50">
                <p className="px-4 py-1.5 text-[11px] font-semibold text-gray-400 uppercase">{t('menu.selectOrg')}</p>
                <button onClick={() => chooseCompany('personal')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="flex-1 text-left text-gray-700">{t('menu.personal')}</span>
                  {activeCompany === 'personal' && <Check className="w-4 h-4 text-blue-600" />}
                </button>
                {companies.map(c => (
                  <button key={c.id} onClick={() => chooseCompany(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 text-left text-gray-700 truncate">{shortCompanyName(c.name)}</span>
                    {activeCompany === c.id && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button onClick={() => { setCompanyMenuOpen(false); router.push('/companies'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50">
                    <Plus className="w-4 h-4" /> {t('menu.manageCompanies')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Language switcher */}
        <div className={`flex-shrink-0 ${role === 'accountant' ? 'ml-auto' : ''}`}>
          <LanguageSwitcher />
        </div>

        {/* Profile dropdown */}
        <div className="relative flex-shrink-0" ref={ref}>
          <button onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
            )}
            <div className="hidden sm:block text-left min-w-0">
              <p className="text-xs font-semibold text-gray-900 leading-tight truncate max-w-[120px]">{fullName || (role === 'accountant' ? t('role.accountant') : role === 'admin' ? t('menu.admin') : t('role.client'))}</p>
              <p className="text-[10px] text-gray-400">{role === 'accountant' ? t('role.accountant') : t('role.client')}</p>
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
                  {role === 'accountant' ? t('role.accountant') : t('role.client')}
                </span>
              </div>
              <button onClick={() => { setOpen(false); router.push('/profile'); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <User className="w-4 h-4 text-gray-400" /> {t('menu.profile')}
              </button>
              {role === 'admin' && (
                <button onClick={() => { setOpen(false); router.push('/admin'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-700 hover:bg-blue-50 font-medium">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  Админ-панель
                </button>
              )}
              {role !== 'accountant' && (
                <button onClick={() => { setOpen(false); router.push('/profile'); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                  <Settings className="w-4 h-4 text-gray-400" /> {t('menu.settings')}
                </button>
              )}
              <a href="mailto:info@buhtask.kz" onClick={() => setOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <Mail className="w-4 h-4 text-gray-400" /> {t('menu.support')}
              </a>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> {t('menu.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
