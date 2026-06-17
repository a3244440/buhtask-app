'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

type Mode = 'login' | 'register' | 'forgot';
type UserRole = 'client' | 'accountant';

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [role, setRole] = useState<UserRole>('client');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const reset = () => { setError(''); setSuccess(''); };

  const handleGoogleAuth = async () => {
    reset();
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      });
      if (e) { setError('Ошибка входа через Google: ' + e.message); setLoading(false); }
      // При успехе произойдёт редирект на Google
    } catch (err: any) {
      setError('Ошибка входа через Google');
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    reset();
    if (!email || !password) { setError('Введите email и пароль'); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) { setError('Неверный email или пароль'); return; }
      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
        router.push(profile?.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client');
      }
    } catch { setError('Ошибка входа. Попробуйте снова.'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    reset();
    if (!email || !password) { setError('Заполните все поля'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    if (password !== confirmPassword) { setError('Пароли не совпадают'); return; }
    if (role === 'accountant' && !termsAccepted) { setError('Подтвердите согласие с условиями ответственности'); return; }
    setLoading(true);
    try {
      const { data, error: e } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { role },
        },
      });
      if (e) {
        if (e.message.includes('already')) setError('Email уже зарегистрирован. Войдите в аккаунт.');
        else setError(e.message);
        return;
      }
      if (data.user) {
        // Создаём профиль
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          phone: '',
          role,
          rating: 0,
          is_banned: false,
          completed_tasks: 0,
          verification_status: 'not_verified',
          availability: 'free',
        });
        // Supabase автоматически отправляет письмо подтверждения
        // Перенаправляем сразу
        router.push(role === 'client' ? '/onboarding/client' : '/dashboard/accountant');
      }
    } catch { setError('Ошибка регистрации. Попробуйте снова.'); }
    finally { setLoading(false); }
  };

  const handleForgot = async () => {
    reset();
    if (!email) { setError('Введите email'); return; }
    setLoading(true);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://buhtask.kz/auth/reset`,
      });
      if (e) { setError(e.message); return; }
      setSuccess('Письмо со ссылкой для сброса пароля отправлено на ' + email);
    } catch { setError('Ошибка. Попробуйте снова.'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white";

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <a href="/" className="relative z-10">
          <img src="/images/logo.png" alt="BuhTask" className="h-9 w-auto brightness-0 invert" />
        </a>
        <div className="relative z-10 text-white">
          <h1 className="text-3xl font-bold mb-3 leading-snug">Маркетплейс бухгалтерских услуг Казахстана</h1>
          <p className="text-blue-100 text-base mb-8">Найдите профессионального бухгалтера или получайте заказы онлайн</p>
          <div className="space-y-3">
            {['500+ проверенных бухгалтеров', 'Безопасные онлайн-платежи', '17 регионов Казахстана'].map(f => (
              <div key={f} className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-white/25 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-blue-50">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 text-center">
            <a href="/"><img src="/images/logo.png" alt="BuhTask" className="h-9 w-auto mx-auto" /></a>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

            {/* FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <>
                <button onClick={() => { setMode('login'); reset(); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Назад к входу
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Забыли пароль?</h2>
                <p className="text-sm text-gray-500 mb-6">Введите email — мы пришлём ссылку для сброса пароля</p>
                <div className="space-y-4">
                  <input type="email" placeholder="Ваш email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{success}</div>}
                  {!success && (
                    <button onClick={handleForgot} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                      {loading ? 'Отправляем...' : 'Отправить ссылку'}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* LOGIN */}
            {mode === 'login' && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Вход в BuhTask</h2>
                <p className="text-sm text-gray-500 mb-6">Войдите в свой аккаунт</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className={inputClass + ' pr-11'} />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button onClick={() => { setMode('forgot'); reset(); }} className="text-xs text-blue-600 hover:underline mt-1.5 block text-right">
                      Забыли пароль?
                    </button>
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button onClick={handleLogin} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                    {loading ? 'Входим...' : 'Войти'}
                  </button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">или</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <button onClick={handleGoogleAuth} disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 py-3 rounded-xl font-semibold text-sm text-gray-700 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Войти через Google
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Нет аккаунта?{' '}
                    <button onClick={() => { setMode('register'); reset(); }} className="text-blue-600 hover:underline font-medium">Зарегистрироваться</button>
                  </p>
                </div>
              </>
            )}

            {/* REGISTER */}
            {mode === 'register' && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Добро пожаловать!</h2>
                <p className="text-sm text-gray-500 mb-6">Создайте аккаунт — это бесплатно</p>
                <div className="space-y-4">
                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Я регистрируюсь как:</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([{ v: 'client', icon: '🏢', label: 'Заказчик', sub: 'ИП / ТОО' }, { v: 'accountant', icon: '👨‍💼', label: 'Бухгалтер', sub: 'Специалист' }] as const).map(r => (
                        <button key={r.v} type="button" onClick={() => setRole(r.v as UserRole)}
                          className={`p-4 border-2 rounded-xl text-left transition-all ${role === r.v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="text-2xl mb-1">{r.icon}</div>
                          <div className={`font-semibold text-sm ${role === r.v ? 'text-blue-700' : 'text-gray-800'}`}>{r.label}</div>
                          <div className="text-xs text-gray-400">{r.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input type="email" placeholder="example@email.com" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} placeholder="Минимум 6 символов" value={password} onChange={e => setPassword(e.target.value)} className={inputClass + ' pr-11'} />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Подтвердите пароль</label>
                    <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

                  {role === 'accountant' && (
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0" />
                      <span className="text-xs text-gray-500 leading-relaxed">
                        Я подтверждаю, что предоставляю достоверную информацию о квалификации и опыте работы. Я самостоятельно несу ответственность за качество оказанных услуг и соблюдение требований законодательства Республики Казахстан.
                      </span>
                    </label>
                  )}
                  {role === 'client' && (
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Регистрируясь, я понимаю, что выбираю независимого специалиста через платформу BuhTask и самостоятельно принимаю решение о выборе исполнителя.
                    </p>
                  )}

                  <button onClick={handleRegister} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                    {loading ? 'Создаём аккаунт...' : 'Создать аккаунт'}
                  </button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">или</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  <button onClick={handleGoogleAuth} disabled={loading}
                    className="w-full flex items-center justify-center gap-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 py-3 rounded-xl font-semibold text-sm text-gray-700 transition-colors">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Регистрация через Google
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Уже есть аккаунт?{' '}
                    <button onClick={() => { setMode('login'); reset(); }} className="text-blue-600 hover:underline font-medium">Войти</button>
                  </p>
                </div>
              </>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">
            Регистрируясь, вы соглашаетесь с <a href="#" className="text-blue-500 hover:underline">условиями использования</a>
          </p>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
