'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n, Lang } from '@/lib/i18n';
import { Globe, Check } from 'lucide-react';

const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'ru', label: 'Русский', short: 'RU' },
  { code: 'kz', label: 'Қазақша', short: 'KZ' },
  { code: 'en', label: 'English', short: 'EN' },
];

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = LANGS.find(l => l.code === lang) || LANGS[0];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors">
        <Globe className="w-4 h-4 text-gray-500" />
        <span>{current.short}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 text-gray-700">
              <span>{l.label}</span>
              {lang === l.code && <Check className="w-4 h-4 text-blue-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
