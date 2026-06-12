"use client";
import { useState, useEffect } from "react";
import { Menu, X, User, LogOut, Settings, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

const NAV_LINKS = [
  { label: "Возможности", href: "/#features" },
  { label: "Категории", href: "/#categories" },
  { label: "Как работает", href: "/#how-it-works" },
  { label: "Для бухгалтеров", href: "/#for-accountants" },
];

export default function NavWrapper() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = pathname === "/";

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        const { data: p } = await supabase.from('profiles').select('full_name, avatar_url, role').eq('id', data.user.id).single();
        setProfile(p);
      }
    });
  }, []);

  useEffect(() => {
    if (!isLanding) return;
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [isLanding]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null); setProfile(null);
    router.push('/');
  };

  const isDark = isLanding && !scrolled;
  const bgStyle = isLanding
    ? scrolled ? { background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }
               : { background: "transparent", borderBottom: "1px solid transparent" }
    : { background: "#ffffff", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };

  const textColor = isDark ? "text-white/90 hover:text-white" : "text-gray-600 hover:text-gray-900";

  const avatarLetter = (profile?.full_name || user?.email || 'U')[0].toUpperCase();
  const dashboardUrl = profile?.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';

  return (
    <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300" style={bgStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo — всегда ведёт на главную, но не выбрасывает из кабинета */}
        <a href="/" className="flex items-center flex-shrink-0">
          <img src="/images/logo.png" alt="BuhTask" className={`h-9 w-auto transition-all ${isDark ? 'brightness-0 invert' : ''}`} />
        </a>

        {/* Nav links — только на лендинге */}
        {isLanding && (
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors ${textColor}`}>{l.label}</a>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button onClick={() => setDropdownOpen(v => !v)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/20" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {avatarLetter}
                  </div>
                )}
                <div className="text-left">
                  <p className={`text-xs font-semibold leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {profile?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-white/60' : 'text-gray-400'}`}>
                    {profile?.role === 'accountant' ? 'Бухгалтер' : 'Заказчик'}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-white/60' : 'text-gray-400'}`} />
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name || 'Пользователь'}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <button onClick={() => { setDropdownOpen(false); router.push(dashboardUrl); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4 text-gray-400" /> Личный кабинет
                    </button>
                    <button onClick={() => { setDropdownOpen(false); router.push('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings className="w-4 h-4 text-gray-400" /> Настройки профиля
                    </button>
                    <div className="border-t border-gray-50 mt-1 pt-1">
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Выйти
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => router.push("/auth")}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${isDark ? 'text-white/90 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
                Войти
              </button>
              <button onClick={() => router.push("/auth")}
                className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                Начать бесплатно
              </button>
            </>
          )}
        </div>

        {/* Mobile menu btn */}
        <button className={`md:hidden p-2 ${isDark ? 'text-white' : 'text-gray-600'}`} onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2 shadow-lg">
          {isLanding && NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className="text-sm text-gray-700 py-2 font-medium" onClick={() => setMobileOpen(false)}>{l.label}</a>
          ))}
          {user ? (
            <>
              <div className="flex items-center gap-3 py-3 border-t border-gray-100 mt-2">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">{avatarLetter}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{profile?.full_name || user.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-400">{profile?.role === 'accountant' ? 'Бухгалтер' : 'Заказчик'}</p>
                </div>
              </div>
              <button onClick={() => { setMobileOpen(false); router.push(dashboardUrl); }}
                className="w-full text-sm font-semibold text-white py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors">
                Личный кабинет
              </button>
              <button onClick={() => { setMobileOpen(false); router.push('/profile'); }}
                className="w-full text-sm font-medium text-gray-700 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                Настройки профиля
              </button>
              <button onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="w-full text-sm text-red-500 py-2 text-center">Выйти</button>
            </>
          ) : (
            <button onClick={() => { setMobileOpen(false); router.push("/auth"); }}
              className="w-full text-sm font-semibold text-white py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors mt-2">
              Войти / Регистрация
            </button>
          )}
        </div>
      )}
    </header>
  );
}
