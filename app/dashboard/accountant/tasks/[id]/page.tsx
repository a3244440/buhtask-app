'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Task, Proposal, TASK_CATEGORIES } from '@/types';
import { ArrowLeft, MapPin, Calendar } from 'lucide-react';

export default function TaskDetailAccountant({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [myProposal, setMyProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    proposed_price: '',
    description: '',
    estimated_days: '',
  });

  useEffect(() => {
    fetchTask();
    checkProposal();
  }, [params.id]);

  const fetchTask = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setTask(data);
    } catch (err) {
      console.error('Error fetching task:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkProposal = async () => {
    try {
      const { data } = await supabase
        .from('proposals')
        .select('*')
        .eq('task_id', params.id)
        .eq('accountant_id', user?.id)
        .single();

      if (data) setMyProposal(data);
    } catch (err) {
      // Нет отклика
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const { error } = await supabase.from('proposals').insert({
        task_id: params.id,
        accountant_id: user?.id,
        proposed_price: parseFloat(formData.proposed_price),
        description: formData.description,
        estimated_days: formData.estimated_days ? parseInt(formData.estimated_days) : null,
      });

      if (error) throw error;

      alert('Отклик отправлен!');
      router.push('/dashboard/accountant');
    } catch (err: any) {
      alert(err.message || 'Ошибка отправки отклика');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Загрузка...</div>;
  }

  if (!task) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Задача не найдена</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={20} />
            Назад
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Детали задачи</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            {task.budget && (
              <div className="text-2xl font-bold text-green-600">
                {task.budget.toLocaleString()} ₸
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {TASK_CATEGORIES[task.category]}
            </span>
            <span className="flex items-center gap-1 text-gray-600">
              <MapPin size={16} />
              {task.city}
            </span>
            {task.deadline && (
              <span className="flex items-center gap-1 text-gray-600">
                <Calendar size={16} />
                до {new Date(task.deadline).toLocaleDateString('ru-RU')}
              </span>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Описание</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
          </div>

          <div className="text-sm text-gray-500">
            Опубликовано: {new Date(task.created_at).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        {myProposal ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-4">
              ✓ Вы уже откликнулись на эту задачу
            </h3>
            <div className="space-y-2 text-gray-700">
              <div><strong>Ваша цена:</strong> {myProposal.proposed_price.toLocaleString()} ₸</div>
              <div><strong>Описание:</strong> {myProposal.description}</div>
              {myProposal.estimated_days && (
                <div><strong>Срок:</strong> {myProposal.estimated_days} дней</div>
              )}
              <div className="text-sm text-gray-500 mt-4">
                Отправлено: {new Date(myProposal.created_at).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Откликнуться на задачу</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваша цена (₸) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.proposed_price}
                  onChange={(e) => setFormData({ ...formData, proposed_price: e.target.value })}
                  placeholder="45000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Срок выполнения (дней)
                </label>
                <input
                  type="number"
                  value={formData.estimated_days}
                  onChange={(e) => setFormData({ ...formData, estimated_days: e.target.value })}
                  placeholder="7"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сопроводительное письмо *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Расскажите о своем опыте и подходе к выполнению задачи..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Отправка...' : 'Отправить отклик'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
