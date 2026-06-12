'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type UserRole = 'client' | 'accountant';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleAuth = async () => {
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Заполните email и пароль');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setError('Этот email уже зарегистрирован. Войдите в аккаунт.');
          } else {
            setError(signUpError.message);
          }
          return;
        }

        if (data.user) {
          // Создаём профиль
          await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            phone: '',
            role: role,
            rating: 0,
            is_banned: false,
            completed_tasks: 0,
            verification_status: 'not_verified',
            availability: 'free',
          });

          if (role === 'client') {
            router.push('/onboarding/client');
          } else {
            router.push('/dashboard/accountant');
          }
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

        if (signInError) {
          if (signInError.message.includes('Invalid login')) {
            setError('Неверный email или пароль');
          } else {
            setError(signInError.message);
          }
          return;
        }

        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (profile?.role === 'accountant') {
            router.push('/dashboard/accountant');
          } else {
            router.push('/dashboard/client');
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Произошла ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10">
          <a href="/">
            <img src="/images/logo.png" alt="BuhTask" className="h-10 w-auto brightness-0 invert" />
          </a>
        </div>
        <div className="relative z-10 text-white">
          <h1 className="text-4xl font-bold mb-4 leading-tight">Упростите бухгалтерию вашего бизнеса</h1>
          <p className="text-blue-100 text-lg mb-8">Ведущий маркетплейс бухгалтерских услуг Казахстана</p>
          <div className="space-y-4">
            {['Проверенные специалисты', 'Безопасные платежи', 'Поддержка 24/7'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-lg">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6 flex justify-center">
            <a href="/"><img src="/images/logo.png" alt="BuhTask" className="h-9 w-auto" /></a>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {isSignUp ? 'Добро пожаловать в BuhTask' : 'Вход в аккаунт'}
              </h2>
              <p className="text-sm text-gray-500">
                {isSignUp ? 'Создайте аккаунт и начните работу' : 'Введите ваши данные для входа'}
              </p>
            </div>

            <div className="space-y-5">
              {/* Role selector */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Тип аккаунта</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { value: 'client', icon: '🏢', label: 'Заказчик', sub: 'ИП / ТОО' },
                      { value: 'accountant', icon: '👨‍💼', label: 'Бухгалтер', sub: 'Специалист' },
                    ] as const).map((r) => (
                      <button key={r.value} type="button" onClick={() => setRole(r.value)}
                        className={`p-4 border-2 rounded-xl transition-all ${role === r.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className="text-2xl mb-1">{r.icon}</div>
                        <div className={`font-semibold text-sm ${role === r.value ? 'text-blue-700' : 'text-gray-800'}`}>{r.label}</div>
                        <div className="text-xs text-gray-400">{r.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input type="email" placeholder="example@email.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Пароль</label>
                <input type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" />
              </div>

              {/* Confirm password */}
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Подтвердите пароль</label>
                  <input type="password" placeholder="••••••••" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" />
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button onClick={handleAuth} disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3.5 rounded-xl font-semibold transition-colors text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Загрузка...
                  </span>
                ) : isSignUp ? 'Создать аккаунт' : 'Войти'}
              </button>

              {/* Toggle */}
              <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccess(''); }}
                className="w-full text-sm text-gray-500 hover:text-blue-600 py-2 transition-colors">
                {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться бесплатно'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Регистрируясь, вы соглашаетесь с{' '}
            <a href="#" className="text-blue-500 hover:underline">Условиями использования</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
