'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Supabase автоматически обрабатывает OAuth callback из URL
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();

      if (sessErr || !session) {
        // Попробуем получить из URL hash
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError('Не удалось войти. Попробуйте снова.');
          setTimeout(() => router.push('/auth'), 2000);
          return;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      // Проверяем есть ли профиль
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        // Новый пользователь через Google — создаём профиль
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || '',
          phone: '',
          role: 'client',
          rating: 0,
          is_banned: false,
          completed_tasks: 0,
          verification_status: 'not_verified',
          availability: 'free',
        });
        router.push('/onboarding/client');
      } else {
        // Существующий пользователь — в кабинет по роли
        router.push(profile.role === 'accountant' ? '/dashboard/accountant' : '/dashboard/client');
      }
    } catch (err: any) {
      setError('Ошибка обработки входа');
      setTimeout(() => router.push('/auth'), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="text-center">
        {error ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-sm">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <p className="text-gray-400 text-xs">Перенаправляем...</p>
          </div>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Входим в систему...</p>
          </>
        )}
      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
