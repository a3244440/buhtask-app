'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, ChevronRight, Home, Briefcase, MessageSquare, User, Settings } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; }

const CATS: Record<string, string> = {
  tax_report: 'Налоговая отчётность', accounting: 'Ведение бухгалтерии', salary: 'Расчёт зарплаты',
  ip_registration: 'Регистрация ИП', too_registration: 'Регистрация ТОО', consultation: 'Консультация', audit: 'Аудит', other: 'Прочее',
};

const STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Открыта', color: 'bg-emerald-100 text-emerald-700' },
  in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Завершена', color: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-500' },
};

const NAV = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'tasks', icon: Briefcase, label: 'Задачи' },
  { id: 'messages', icon: MessageSquare, label: 'Сообщения' },
  { id: 'profile', icon: User, label: 'Профиль' },
];

export default function ClientDashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('home');
  const router = useRouter();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    const { data } = await supabase.from('tasks').select('*').eq('client_id', user.id).order('created_at', { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  const stats = [
    { label: 'Всего задач', value: tasks.length, color: 'text-gray-900' },
    { label: 'Открытые', value: tasks.filter(t => t.status === 'open').length, color: 'text-emerald-600' },
    { label: 'В работе', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
    { label: 'Завершённые', value: tasks.filter(t => t.status === 'completed').length, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex-col z-40 pt-[65px]">
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tasks', icon: Briefcase, label: 'Мои задачи' },
            { id: 'messages', icon: MessageSquare, label: 'Сообщения' },
            { id: 'settings', icon: Settings, label: 'Настройки' },
          ].map(item => (
            <button key={item.id} onClick={() => item.id === 'settings' ? router.push('/profile') : setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon className="w-4 h-4" />{item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={() => router.push('/dashboard/client/create-task')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Новая задача
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <DashboardHeader title={tab === 'home' ? 'Главная' : tab === 'tasks' ? 'Мои задачи' : 'Кабинет заказчика'}
          right={
            <div className="flex justify-end">
              <button onClick={() => router.push('/dashboard/client/create-task')}
                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Задача
              </button>
            </div>
          }
        />

        <main className="p-4 sm:p-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map(s => (
              <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{tab === 'home' ? 'Последние задачи' : 'Все задачи'}</h2>
              <button onClick={() => router.push('/dashboard/client/create-task')}
                className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                <Plus className="w-4 h-4" /> Новая задача
              </button>
            </div>

            {tasks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-300" />
                </div>
                <p className="text-gray-400 mb-4">У вас пока нет задач</p>
                <button onClick={() => router.push('/dashboard/client/create-task')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                  Создать первую задачу
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {(tab === 'home' ? tasks.slice(0, 5) : tasks).map(task => {
                  const sc = STATUS[task.status] || STATUS.open;
                  return (
                    <div key={task.id} onClick={() => router.push(`/dashboard/client/tasks/${task.id}`)}
                      className="px-6 py-5 hover:bg-gray-50 cursor-pointer transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
                          </div>
                          <p className="text-sm text-gray-400 line-clamp-1 mb-2">{task.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                            <span className="px-2.5 py-1 bg-gray-100 rounded-full">{CATS[task.category] || task.category}</span>
                            {task.city && <span>📍 {task.city}</span>}
                            {task.budget && <span>💰 {task.budget.toLocaleString()} ₸</span>}
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
          {NAV.map(item => (
            <button key={item.id}
              onClick={() => item.id === 'profile' ? router.push('/profile') : setTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${tab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />{item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
