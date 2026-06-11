'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Task, Proposal, TASK_CATEGORIES } from '@/types';
import { ArrowLeft, MapPin, Calendar, User } from 'lucide-react';

interface ProposalWithAccountant extends Proposal {
  accountant: {
    full_name: string;
    rating: number;
    completed_tasks: number;
    verified: boolean;
  };
}

export default function TaskDetailClient({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [proposals, setProposals] = useState<ProposalWithAccountant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTask();
    fetchProposals();
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

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          accountants!inner(
            id,
            rating,
            completed_tasks,
            verified,
            profiles!inner(full_name)
          )
        `)
        .eq('task_id', params.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedProposals = data?.map((p: any) => ({
        ...p,
        accountant: {
          full_name: p.accountants.profiles.full_name || 'Бухгалтер',
          rating: p.accountants.rating,
          completed_tasks: p.accountants.completed_tasks,
          verified: p.accountants.verified,
        },
      })) || [];

      setProposals(formattedProposals);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    }
  };

  const acceptProposal = async (proposalId: string, accountantId: string, price: number) => {
    if (!confirm('Принять этот отклик?')) return;

    try {
      const commission = price * 0.1;

      // Создаем заказ
      const { error: orderError } = await supabase.from('orders').insert({
        task_id: params.id,
        client_id: user?.id,
        accountant_id: accountantId,
        proposal_id: proposalId,
        price: price,
        commission: commission,
        status: 'in_progress',
      });

      if (orderError) throw orderError;

      // Обновляем статус задачи
      const { error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', params.id);

      if (taskError) throw taskError;

      alert('Отклик принят! Задача передана в работу.');
      router.push('/dashboard/client');
    } catch (err: any) {
      alert(err.message || 'Ошибка принятия отклика');
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              task.status === 'open' ? 'bg-green-100 text-green-800' :
              task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              task.status === 'completed' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {task.status === 'open' ? 'Открыта' :
               task.status === 'in_progress' ? 'В работе' :
               task.status === 'completed' ? 'Завершена' : 'Отменена'}
            </span>
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
            {task.budget && (
              <span className="text-green-600 font-semibold">
                💰 {task.budget.toLocaleString()} ₸
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

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Отклики бухгалтеров ({proposals.length})
          </h3>

          {proposals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Пока нет откликов на эту задачу
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="border rounded-lg p-5 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-lg">
                        {proposal.accountant.full_name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          {proposal.accountant.full_name}
                          {proposal.accountant.verified && (
                            <span className="text-blue-500" title="Верифицирован">✓</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          ⭐ {proposal.accountant.rating.toFixed(1)} · {proposal.accountant.completed_tasks} задач
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {proposal.proposed_price.toLocaleString()} ₸
                      </div>
                      {proposal.estimated_days && (
                        <div className="text-sm text-gray-600">{proposal.estimated_days} дней</div>
                      )}
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{proposal.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {new Date(proposal.created_at).toLocaleDateString('ru-RU')}
                    </div>
                    {task.status === 'open' && (
                      <button
                        onClick={() => acceptProposal(proposal.id, proposal.accountant_id, proposal.proposed_price)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Принять отклик
                      </button>
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
