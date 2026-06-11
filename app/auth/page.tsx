'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

type UserRole = 'client' | 'accountant';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { fetchUser } = useAuthStore();

  const handleAuth = async () => {
    try {
      setLoading(true);
      setError('');

      if (isSignUp) {
        // Регистрация
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          // Создаем профиль
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: email,
              phone: '',
              role: role,
              rating: 0,
              is_banned: false,
              completed_tasks: 0,
              verification_status: 'not_verified',
              availability: 'free'
            });

          if (profileError) throw profileError;

          // Для клиентов перенаправляем на заполнение профиля
          if (role === 'client') {
            router.push('/onboarding/client');
            return;
          }

          await fetchUser();
          router.push(role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client');
        }
      } else {
        // Вход
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          await fetchUser();

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
        <div className="relative z-10">
          <Image src="/logo.jpg" alt="BuhTask" width={180} height={60} className="brightness-0 invert" />
        </div>
        <div className="relative z-10 text-white">
          <h1 className="text-4xl font-bold mb-4">Упростите бухгалтерию вашего бизнеса</h1>
          <p className="text-blue-100 text-lg">Найдите профессионального бухгалтера или предложите свои услуги на ведущей платформе Казахстана</p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-lg">Проверенные специалисты</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-lg">Безопасные платежи</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-lg">Поддержка 24/7</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <Image src="/logo.jpg" alt="BuhTask" width={160} height={50} />
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isSignUp ? 'Создать аккаунт' : 'Добро пожаловать'}
              </h2>
              <p className="text-gray-600">
                {isSignUp ? 'Присоединяйтесь к профессиональному сообществу' : 'Войдите в свой аккаунт'}
              </p>
            </div>

            <div className="space-y-5">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Выберите тип аккаунта
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`group relative p-5 border-2 rounded-xl transition-all duration-200 ${
                        role === 'client'
                          ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-3xl mb-2 transition-transform group-hover:scale-110 ${role === 'client' ? 'scale-110' : ''}`}>👔</div>
                      <div className={`font-semibold text-base ${role === 'client' ? 'text-blue-700' : 'text-gray-900'}`}>Заказчик</div>
                      <div className="text-xs text-gray-500 mt-1">ИП / ТОО</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('accountant')}
                      className={`group relative p-5 border-2 rounded-xl transition-all duration-200 ${
                        role === 'accountant'
                          ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`text-3xl mb-2 transition-transform group-hover:scale-110 ${role === 'accountant' ? 'scale-110' : ''}`}>💼</div>
                      <div className={`font-semibold text-base ${role === 'accountant' ? 'text-blue-700' : 'text-gray-900'}`}>Бухгалтер</div>
                      <div className="text-xs text-gray-500 mt-1">Специалист</div>
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Пароль
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                  </svg>
                  <div className="text-sm">{error}</div>
                </div>
              )}

              <button
                onClick={handleAuth}
                disabled={loading || !email || !password}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Загрузка...
                  </span>
                ) : isSignUp ? 'Создать аккаунт' : 'Войти'}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">или</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="w-full text-gray-700 hover:text-blue-600 text-sm font-medium py-2 transition-colors"
              >
                {isSignUp ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать бесплатно'}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6">
            Регистрируясь, вы соглашаетесь с нашими{' '}
            <a href="#" className="text-blue-600 hover:underline">Условиями использования</a>
            {' '}и{' '}
            <a href="#" className="text-blue-600 hover:underline">Политикой конфиденциальности</a>
          </p>
        </div>
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
