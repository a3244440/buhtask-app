'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Task, TASK_CATEGORIES, TaskCategory } from '@/types';
import { Star, MapPin } from 'lucide-react';

interface AccountantProfile {
  id: string;
  full_name: string;
  specialization: string[];
  experience_years: number;
  rating: number;
  completed_tasks: number;
  description: string;
  verified: boolean;
  cities_served: string[];
}

export default function AccountantDashboard() {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<AccountantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TaskCategory | 'all'>('all');
  const router = useRouter();

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('accountants')
        .select(`
          *,
          profiles!inner(full_name)
        `)
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setProfile({
        ...data,
        full_name: data.profiles?.full_name || 'Бухгалтер',
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchProfile();
    fetchTasks();
  }, [user, router, fetchProfile, fetchTasks]);

  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter(task => task.category === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">BuhTask</h1>
              <p className="text-sm text-gray-600">Личный кабинет бухгалтера</p>
            </div>
            {profile && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{profile.full_name}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    <Star size={14} className="text-yellow-500 fill-current" />
                    {profile.rating.toFixed(1)} · {profile.completed_tasks} задач
                  </div>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  {profile.full_name[0]}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Рейтинг</div>
            <div className="text-3xl font-bold text-yellow-600 flex items-center gap-2">
              <Star size={32} className="fill-current" />
              {profile?.rating.toFixed(1) || '0.0'}
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Выполнено задач</div>
            <div className="text-3xl font-bold text-gray-900">
              {profile?.completed_tasks || 0}
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Опыт</div>
            <div className="text-3xl font-bold text-blue-600">
              {profile?.experience_years || 0} лет
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">Статус</div>
            <div className="text-lg font-semibold text-green-600">
              {profile?.verified ? '✓ Верифицирован' : 'На проверке'}
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все задачи
            </button>
            {Object.entries(TASK_CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key as TaskCategory)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  filter === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Доступные задачи ({filteredTasks.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-500">Загрузка...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              Нет доступных задач
            </div>
          ) : (
            <div className="divide-y">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/dashboard/accountant/tasks/${task.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                    {task.budget && (
                      <div className="text-xl font-bold text-green-600">
                        {task.budget.toLocaleString()} ₸
                      </div>
                    )}
                  </div>
                  <p className="text-gray-600 mb-3 line-clamp-2">{task.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      {TASK_CATEGORIES[task.category]}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {task.city}
                    </span>
                    {task.deadline && (
                      <span>
                        📅 до {new Date(task.deadline).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(task.created_at).toLocaleDateString('ru-RU')}
                    </span>
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
