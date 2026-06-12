'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, FileText, ChevronRight, Home, Briefcase, MessageSquare, User, Settings, Send, ArrowLeft } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; }
interface Conversation { id: string; other_name: string; other_id: string; last_message: string; updated_at: string; }
interface Message { id: string; sender_id: string; content: string; created_at: string; }

const CATS: Record<string, string> = {
  tax_reporting: 'Налоговая отчётность', salary: 'Расчёт зарплаты', registration: 'Регистрация ИП/ТОО',
  audit: 'Аудит', consultation: 'Консультация', full_accounting: 'Ведение бухгалтерии', other: 'Прочее',
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
  { id: 'messages', icon: MessageSquare, label: 'Чат' },
  { id: 'profile', icon: User, label: 'Профиль' },
];

export default function ClientDashboard() {
  const [tab, setTab] = useState('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const router = useRouter();
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const [{ data: taskData }, { data: convData }] = await Promise.all([
      supabase.from('tasks').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`).order('updated_at', { ascending: false }),
    ]);
    setTasks(taskData || []);
    if (convData && convData.length > 0) {
      const convs: Conversation[] = [];
      for (const c of convData) {
        const otherId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
        const { data: p } = await supabase.from('profiles').select('full_name,email').eq('id', otherId).single();
        convs.push({ id: c.id, other_id: otherId, other_name: p?.full_name || p?.email || 'Бухгалтер', last_message: c.last_message || '', updated_at: c.updated_at });
      }
      setConversations(convs);
    }
    setLoading(false);
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    setMessages(data || []);
    supabase.channel(`conv-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        (payload) => setMessages(m => [...m, payload.new as Message]))
      .subscribe();
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || !userId) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');
    try {
      await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: userId, content });
      await supabase.from('conversations').update({ last_message: content, updated_at: new Date().toISOString() }).eq('id', activeConv.id);
    } catch { setNewMsg(content); }
    setSending(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  const stats = [
    { label: 'Всего задач', value: tasks.length, color: 'text-gray-900' },
    { label: 'Открытые', value: tasks.filter(t => t.status === 'open').length, color: 'text-emerald-600' },
    { label: 'В работе', value: tasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
    { label: 'Завершённые', value: tasks.filter(t => t.status === 'completed').length, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex-col z-40 pt-[57px]">
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tasks', icon: Briefcase, label: 'Мои задачи' },
            { id: 'messages', icon: MessageSquare, label: 'Сообщения' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === item.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <item.icon className="w-4 h-4" />{item.label}
              {item.id === 'messages' && conversations.length > 0 && (
                <span className="ml-auto bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{conversations.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-1">
          <button onClick={() => router.push('/profile')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Settings className="w-4 h-4" /> Настройки
          </button>
          <button onClick={() => router.push('/dashboard/client/create-task')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> Новая задача
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <DashboardHeader title={tab === 'home' ? 'Главная' : tab === 'tasks' ? 'Мои задачи' : 'Сообщения'} />

        <main className="p-4 sm:p-8 pb-24 lg:pb-8">

          {(tab === 'home' || tab === 'tasks') && (
            <>
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                    <Plus className="w-4 h-4" /> Новая задача
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <div className="py-16 text-center">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 mb-4">У вас пока нет задач</p>
                    <button onClick={() => router.push('/dashboard/client/create-task')}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                      Создать первую задачу
                    </button>
                  </div>
                ) : (tab === 'home' ? tasks.slice(0, 5) : tasks).map(task => {
                  const sc = STATUS[task.status] || STATUS.open;
                  return (
                    <div key={task.id} onClick={() => router.push(`/dashboard/client/tasks/${task.id}`)}
                      className="px-6 py-5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group last:border-0">
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
            </>
          )}

          {/* CHAT */}
          {tab === 'messages' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: 500 }}>
              {!activeConv ? (
                <>
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Сообщения</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{conversations.length} диалогов</p>
                  </div>
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                      <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
                      <p className="text-gray-400 text-sm">Нет активных диалогов</p>
                      <p className="text-gray-300 text-xs mt-1">Диалоги появятся после выбора бухгалтера</p>
                    </div>
                  ) : conversations.map(conv => (
                    <div key={conv.id} onClick={() => openConversation(conv)}
                      className="px-6 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        {conv.other_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{conv.other_name}</p>
                        <p className="text-xs text-gray-400 truncate">{conv.last_message || 'Нет сообщений'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => setActiveConv(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4 text-gray-500" /></button>
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">{activeConv.other_name[0]?.toUpperCase()}</div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{activeConv.other_name}</p>
                      <p className="text-xs text-gray-400">Бухгалтер</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && <div className="text-center text-gray-400 text-sm py-8">Начните диалог</div>}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === userId ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEnd} />
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
                    <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Напишите сообщение..." disabled={sending}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
                      className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl transition-colors">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-4 h-16">
          {NAV.map(item => (
            <button key={item.id} onClick={() => item.id === 'profile' ? router.push('/profile') : setTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium relative ${tab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />{item.label}
              {item.id === 'messages' && conversations.length > 0 && <span className="absolute top-2 right-6 bg-blue-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{conversations.length}</span>}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
export const dynamic = 'force-dynamic';
