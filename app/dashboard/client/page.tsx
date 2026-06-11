'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Task, TASK_CATEGORIES, TaskCategory } from '@/types';
import { Plus, Search, Filter } from 'lucide-react';

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const labels = {
      open: 'Открыта',
      in_progress: 'В работе',
      completed: 'Завершена',
      cancelled: 'Отменена',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BuhTask</h1>
              <p className="text-sm text-gray-600">Личный кабинет заказчика</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/client/create-task')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Создать задачу
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Всего задач</div>
            <div className="text-3xl font-bold text-gray-900">{tasks.length}</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Открытые</div>
            <div className="text-3xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'open').length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">В работе</div>
            <div className="text-3xl font-bold text-blue-600">
              {tasks.filter(t => t.status === 'in_progress').length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Завершённые</div>
            <div className="text-3xl font-bold text-gray-600">
              {tasks.filter(t => t.status === 'completed').length}
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Мои задачи</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Загрузка...</div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-500 mb-4">У вас пока нет задач</p>
              <button
                onClick={() => router.push('/dashboard/client/create-task')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Создать первую задачу
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/client/tasks/${task.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">
                      {TASK_CATEGORIES[task.category]}
                    </span>
                    <span>📍 {task.city}</span>
                    {task.budget && <span>💰 {task.budget.toLocaleString()} ₸</span>}
                    {task.deadline && (
                      <span>📅 {new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
