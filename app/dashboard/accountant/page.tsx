'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, Search, Home, Briefcase, MessageSquare, User, Star, MapPin, Clock, ChevronRight, TrendingUp } from 'lucide-react';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; }

const CATEGORIES: Record<string, string> = {
  tax_report: 'Налоговая отчётность', accounting: 'Ведение бухгалтерии', salary: 'Расчёт зарплаты',
  ip_registration: 'Регистрация ИП', too_registration: 'Регистрация ТОО', consultation: 'Консультация', audit: 'Аудит', other: 'Прочее',
};

export default function AccountantDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserEmail(user.email || '');
    // Бухгалтер видит все открытые задачи
    const { data } = await supabase.from('tasks').select('*').eq('status', 'open').order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const filtered = tasks.filter(t =>
    !searchQuery ||
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    CATEGORIES[t.category]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems = [
    { id: 'home', icon: Home, label: 'Главная' },
    { id: 'tasks', icon: Briefcase, label: 'Задачи' },
    { id: 'messages', icon: MessageSquare, label: 'Сообщения' },
    { id: 'profile', icon: User, label: 'Профиль' },
  ];

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex-col z-40">
        <div className="p-6 border-b border-gray-100">
          <a href="/"><img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto" /></a>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tasks', icon: Briefcase, label: 'Доступные задачи' },
            { id: 'my_tasks', icon: TrendingUp, label: 'Мои заказы' },
            { id: 'messages', icon: MessageSquare, label: 'Сообщения' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
              {userEmail[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{userEmail}</p>
              <p className="text-xs text-gray-400">Бухгалтер</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-64">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
            <div className="lg:hidden">
              <img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-gray-900">Кабинет бухгалтера</h1>
            </div>
            <div className="flex-1 max-w-sm lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Поиск задач..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white" />
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-8 pb-24 lg:pb-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Доступных задач', value: tasks.length, color: 'text-blue-600' },
              { label: 'Найдено по фильтру', value: filtered.length, color: 'text-emerald-600' },
              { label: 'Мои заказы', value: 0, color: 'text-purple-600' },
              { label: 'Мой рейтинг', value: '—', color: 'text-amber-500' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Available tasks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Доступные задачи</h2>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} задач открыто для откликов</p>
            </div>

            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-400">Задачи не найдены</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map(task => (
                  <div key={task.id} onClick={() => router.push(`/dashboard/accountant/tasks/${task.id}`)}
                    className="px-6 py-5 hover:bg-gray-50 cursor-pointer transition-colors group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{task.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{CATEGORIES[task.category] || task.category}</span>
                          {task.city && <span className="flex items-center gap-1 text-gray-400"><MapPin className="w-3 h-3" />{task.city}</span>}
                          {task.budget && <span className="flex items-center gap-1 text-emerald-600 font-medium">💰 {task.budget.toLocaleString()} ₸</span>}
                          {task.deadline && <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3 h-3" />{new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors">
                          Откликнуться
                        </button>
                        <ChevronRight className="w-4 h-4 text-gray-300 mx-auto mt-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-4 h-16">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />{item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
