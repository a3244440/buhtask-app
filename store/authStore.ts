import { create } from 'zustand';
import { supabase, UserProfile } from '@/lib/supabase';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  setUser: (user: UserProfile | null) => void;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user, loading: false }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  fetchUser: async () => {
    try {
      // getSession() читает сессию из локального хранилища мгновенно, без сетевого запроса
      // к серверу авторизации. getUser() всегда делает round-trip к Auth-серверу для
      // ревалидации токена — именно это и было причиной задержки в несколько секунд
      // на каждой странице, использующей эту проверку. Реальная защита данных всё равно
      // обеспечивается RLS-политиками на стороне Supabase по JWT, так что для простого
      // определения текущего пользователя на клиенте getSession() полностью безопасен.
      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user;

      if (!authUser) {
        set({ user: null, loading: false });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      set({ user: profile, loading: false });
    } catch (error) {
      console.error('Error fetching user:', error);
      set({ user: null, loading: false });
    }
  }
}));
