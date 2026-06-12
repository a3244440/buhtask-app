"use client";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
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
  const router = useRouter();
  const pathname = usePathname();
  const isLanding = pathname === "/";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!isLanding) return;
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, [isLanding]);

  const bgStyle = isLanding
    ? scrolled
      ? { background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }
      : { background: "transparent", borderBottom: "1px solid transparent" }
    : { background: "#ffffff", borderBottom: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" };

  const textColor = isLanding && !scrolled ? "text-white" : "text-gray-700";
  const logoFilter = isLanding && !scrolled ? "brightness-0 invert" : "";

  return (
    <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300" style={bgStyle}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="/" className="flex items-center">
          <img src="/images/logo.png" alt="BuhTask" className={`h-9 w-auto ${logoFilter}`} />
        </a>

        {isLanding && (
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className={`text-sm font-medium hover:text-blue-600 transition-colors ${isLanding && !scrolled ? "text-white/90 hover:text-white" : "text-gray-600"}`}>
                {l.label}
              </a>
            ))}
          </nav>
        )}

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <button
              onClick={() => router.push("/dashboard/client")}
              className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Личный кабинет
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push("/auth")}
                className={`text-sm font-medium px-4 py-2 rounded-xl hover:bg-black/5 transition-colors ${textColor}`}
              >
                Войти
              </button>
              <button
                onClick={() => router.push("/auth")}
                className="text-sm font-semibold text-white px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
              >
                Начать бесплатно
              </button>
            </>
          )}
        </div>

        <button className={`md:hidden p-2 ${textColor}`} onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 flex flex-col gap-2">
          {isLanding && NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-gray-700 py-2" onClick={() => setMobileOpen(false)}>
              {l.label}
            </a>
          ))}
          <button
            onClick={() => { setMobileOpen(false); router.push("/auth"); }}
            className="w-full text-sm font-semibold text-white py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition-colors mt-2"
          >
            {user ? "Личный кабинет" : "Войти / Регистрация"}
          </button>
        </div>
      )}
    </header>
  );
}
