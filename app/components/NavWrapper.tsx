"use client";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV_LINKS = [
  { key: "land.categories", href: "/#categories" },
  { key: "land.howItWorks", href: "/#how-it-works" },
  { key: "land.becomeAccountant", href: "/#for-accountants" },
];

interface Props { dark?: boolean; }

export default function NavWrapper({ dark = false }: Props) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState('client');
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = pathname === "/";

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        if (p?.role) setUserRole(p.role);
      }
    });
    if (!isLanding) return;
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [isLanding]);

  const dashHref = userRole === 'accountant' ? '/dashboard/accountant' : '/dashboard/client';

  const scrolledStyle = dark
    ? { background: "rgba(3,7,18,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }
    : { background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" };
  const transparentStyle = { background: "transparent", borderBottom: "1px solid transparent" };
  const fixedStyle = dark
    ? { background: "rgba(3,7,18,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }
    : { background: "#ffffff", borderBottom: "1px solid #E2E8F0" };

  const headerStyle = isLanding ? (scrolled ? scrolledStyle : transparentStyle) : fixedStyle;
  const textColor = isLanding && !scrolled ? "text-white/90 hover:text-white" : dark ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900";

  return (
    <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300" style={headerStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="/" className="flex items-center">
          {(isLanding && !scrolled) || dark ? (
            // На синем hero-фоне ИЛИ в тёмном режиме — белый логотип
            <img src="/images/logo-new.png" alt="BuhTask" className="h-14 w-auto transition-all brightness-0 invert" />
          ) : (
            // При скролле на светлом фоне — цветной логотип
            <img src="/images/logo-new.png" alt="BuhTask" className="h-14 w-auto transition-all" />
          )}
        </a>

        {isLanding && (
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} className={`text-sm font-medium transition-colors ${textColor}`}>{t(l.key)}</a>
            ))}
          </nav>
        )}

        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <button onClick={() => router.push(dashHref)}
              className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors">
              {t('menu.personal')}
            </button>
          ) : (
            <>
              <button onClick={() => router.push("/auth")}
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${isLanding && !scrolled ? 'text-white hover:bg-white/10' : dark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-600 hover:bg-gray-100'}`}>
                {t('land.login')}
              </button>
              <button onClick={() => router.push("/auth")}
                className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                {t('land.getStarted')}
              </button>
            </>
          )}
        </div>

        <button className={`md:hidden p-2 ${isLanding && !scrolled ? 'text-white' : dark ? 'text-gray-300' : 'text-gray-600'}`} onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className={`md:hidden border-t px-4 py-4 flex flex-col gap-2 ${dark ? 'bg-gray-950 border-gray-800' : 'bg-white border-gray-100'}`}>
          {isLanding && NAV_LINKS.map(l => (
            <a key={l.href} href={l.href} className={`text-sm py-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`} onClick={() => setMobileOpen(false)}>{t(l.key)}</a>
          ))}
          <button onClick={() => { setMobileOpen(false); router.push("/auth"); }}
            className="w-full text-sm font-semibold text-white py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors mt-2">
            {user ? t('menu.personal') : `${t('land.login')} / ${t('land.signup')}`}
          </button>
        </div>
      )}
    </header>
  );
}
