'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, LogOut, FileText, Clock, CheckCircle, AlertCircle, ChevronRight, Home, Briefcase, MessageSquare, Settings, User } from 'lucide-react';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; }

const CATEGORIES: Record<string, string> = {
  tax_report: 'Налоговая отчётность', accounting: 'Ведение бухгалтерии', salary: 'Расчёт зарплаты',
  ip_registration: 'Регистрация ИП', too_registration: 'Регистрация ТОО', consultation: 'Консультация', audit: 'Аудит', other: 'Прочее',
};

export default function ClientDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserEmail(user.email || '');
    const { data } = await supabase.from('tasks').select('*').eq('client_id', user.id).order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    open: { label: 'Открыта', color: 'bg-emerald-100 text-emerald-700', icon: AlertCircle },
    in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700', icon: Clock },
    completed: { label: 'Завершена', color: 'bg-gray-100 text-gray-600', icon: CheckCircle },
    cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-600', icon: AlertCircle },
  };

  const stats = [
    { label: 'Всего задач', value: tasks.length, color: 'text-gray-900', bg: 'bg-gray-50' },
    { label: 'Открытые', value: tasks.filter(t => t.status === 'open').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'В работе', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Завершённые', value: tasks.filter(t => t.status === 'completed').length, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

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
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-100 flex-col z-40">
        <div className="p-6 border-b border-gray-100">
          <a href="/"><img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto" /></a>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tasks', icon: Briefcase, label: 'Мои задачи' },
            { id: 'messages', icon: MessageSquare, label: 'Сообщения' },
            { id: 'settings', icon: Settings, label: 'Настройки' },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {userEmail[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{userEmail}</p>
              <p className="text-xs text-gray-400">Заказчик</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" /> Выйти
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
          <div className="px-4 sm:px-8 py-4 flex items-center justify-between">
            <div className="lg:hidden">
              <img src="/images/logo.png" alt="BuhTask" className="h-8 w-auto" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-lg font-semibold text-gray-900">
                {activeTab === 'home' && 'Главная'}
                {activeTab === 'tasks' && 'Мои задачи'}
                {activeTab === 'messages' && 'Сообщения'}
                {activeTab === 'settings' && 'Настройки'}
              </h1>
            </div>
            <button onClick={() => router.push('/dashboard/client/create-task')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> Новая задача
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-8 pb-24 lg:pb-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">
                {activeTab === 'home' ? 'Последние задачи' : 'Все задачи'}
              </h2>
              {activeTab === 'home' && tasks.length > 3 && (
                <button onClick={() => setActiveTab('tasks')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  Все задачи <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <p className="text-gray-500 mb-4">У вас пока нет задач</p>
                <button onClick={() => router.push('/dashboard/client/create-task')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  Создать первую задачу
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(activeTab === 'home' ? tasks.slice(0, 5) : tasks).map(task => {
                  const sc = statusConfig[task.status] || statusConfig.open;
                  return (
                    <div key={task.id} onClick={() => router.push(`/dashboard/client/tasks/${task.id}`)}
                      className="px-6 py-5 hover:bg-gray-50 cursor-pointer transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{task.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color} flex-shrink-0`}>{sc.label}</span>
                          </div>
                          <p className="text-sm text-gray-500 line-clamp-1 mb-3">{task.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                            <span className="px-2.5 py-1 bg-gray-100 rounded-full">{CATEGORIES[task.category] || task.category}</span>
                            {task.city && <span>📍 {task.city}</span>}
                            {task.budget && <span>💰 {task.budget.toLocaleString()} ₸</span>}
                            {task.deadline && <span>📅 {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-4 h-16">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
