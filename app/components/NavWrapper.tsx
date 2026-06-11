"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Возможности", href: "#features" },
  { label: "Категории", href: "#categories" },
  { label: "Как работает", href: "#how-it-works" },
  { label: "Для бухгалтеров", href: "#for-accountants" },
];

export default function NavWrapper() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(8,14,26,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="#" className="flex items-center">
          <img src="/images/logo.png" alt="BuhTask" className="h-10 w-auto" />
        </a>

        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-slate-400 hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button className="text-sm text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5">
            Войти
          </button>
          <button className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors">
            Начать бесплатно
          </button>
        </div>

        <button className="md:hidden p-2 text-slate-400 hover:text-white" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border px-4 py-4 flex flex-col gap-3">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-slate-300 py-2" onClick={() => setMobileOpen(false)}>
              {l.label}
            </a>
          ))}
          <button className="w-full text-sm font-semibold text-white py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors mt-2">
            Начать бесплатно
          </button>
        </div>
      )}
    </header>
  );
}
