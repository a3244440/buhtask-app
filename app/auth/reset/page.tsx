'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase sends token in URL hash: #access_token=...&type=recovery
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      // Parse the hash and set session
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') || '';
      if (accessToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(() => setReady(true));
      }
    } else {
      // Check if already has session
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) setReady(true);
        else setError('Ссылка недействительна или истекла. Запросите сброс пароля заново.');
      });
    }
  }, []);

  const handleReset = async () => {
    setError('');
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    if (password !== confirm) { setError('Пароли не совпадают'); return; }
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) { setError(e.message); return; }
      setSuccess(true);
      setTimeout(() => router.push('/auth'), 2500);
    } catch { setError('Ошибка. Попробуйте снова.'); }
    finally { setLoading(false); }
  };

  const inp = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <a href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto mx-auto" /></a>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Пароль изменён!</h2>
              <p className="text-sm text-gray-500">Перенаправляем на страницу входа...</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Новый пароль</h2>
              <p className="text-sm text-gray-500 mb-6">Введите новый пароль для вашего аккаунта</p>
              {error && !ready && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                  {error}
                  <div className="mt-3">
                    <a href="/auth" className="text-blue-600 hover:underline font-medium">← Вернуться к форме входа</a>
                  </div>
                </div>
              )}
              {ready && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Новый пароль</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="Минимум 6 символов" value={password} onChange={e => setPassword(e.target.value)} className={inp + ' pr-11'} />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Подтвердите пароль</label>
                    <input type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} className={inp} />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button onClick={handleReset} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                    {loading ? 'Сохраняем...' : 'Сохранить новый пароль'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
