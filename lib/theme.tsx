'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const STORAGE_KEY = 'buhtask_theme';

// Автоматически предлагаем тёмную тему вечером/ночью по времени Астаны (UTC+5),
// но только пока пользователь сам не выбрал тему явно (см. localStorage ниже).
function getAstanaDarkMode(): boolean {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const astanaHour = new Date(utc + 5 * 3600000).getHours();
  return astanaHour >= 19 || astanaHour < 9;
}

interface ThemeContextValue {
  dark: boolean;
  toggle: () => void;
  setDark: (v: boolean) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  dark: false,
  toggle: () => {},
  setDark: () => {},
  mounted: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let initial: boolean;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      initial = saved ? saved === 'dark' : getAstanaDarkMode();
    } catch {
      initial = getAstanaDarkMode();
    }
    setDarkState(initial);
    document.documentElement.classList.toggle('dark', initial);
    setMounted(true);
  }, []);

  const setDark = useCallback((v: boolean) => {
    setDarkState(v);
    document.documentElement.classList.toggle('dark', v);
    try { localStorage.setItem(STORAGE_KEY, v ? 'dark' : 'light'); } catch {}
  }, []);

  const toggle = useCallback(() => setDark(!dark), [dark, setDark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle, setDark, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
