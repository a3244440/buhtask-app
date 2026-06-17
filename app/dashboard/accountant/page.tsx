'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Home, Briefcase, MessageSquare, User, MapPin, Clock, ChevronRight, TrendingUp, Settings, Send, ArrowLeft, Paperclip } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; }
interface Conversation { id: string; other_name: string; other_email: string; other_id: string; last_message: string; updated_at: string; }
interface Message { id: string; sender_id: string; content: string; created_at: string; }

const CATS: Record<string, string> = {
  tax: 'Налоги и НДС',
  salary: 'Расчёт зарплаты',
  register: 'Регистрация ИП/ТОО',
  audit: 'Аудит',
  report: 'Отчётность (910, 700 ФНО)',
  other: 'Прочее',
};

const NAV = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'tasks', icon: Briefcase, label: 'Задачи' },
  { id: 'messages', icon: MessageSquare, label: 'Чат' },
  { id: 'profile', icon: User, label: 'Профиль' },
];

function AccountantDashboardInner() {
  const [tab, setTab] = useState('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myOrders, setMyOrders] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEnd = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);
    const [{ data: openTasks }, { data: convData }, { data: myProposals }] = await Promise.all([
      supabase.from('tasks').select('*').eq('status', 'open').order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`).order('updated_at', { ascending: false }),
      supabase.from('proposals').select('task_id').eq('accountant_id', user.id),
    ]);

    // IDs задач на которые уже откликнулся
    const respondedTaskIds = new Set((myProposals || []).map((p: any) => p.task_id));

    // Показываем только открытые задачи БЕЗ моего отклика
    const availableTasks = (openTasks || []).filter((t: any) => !respondedTaskIds.has(t.id));
    setTasks(availableTasks);

    // Загружаем мои заказы (задачи где я откликнулся)
    if (respondedTaskIds.size > 0) {
      const { data: allMyTasks } = await supabase
        .from('tasks')
        .select('*')
        .in('id', Array.from(respondedTaskIds))
        .order('created_at', { ascending: false });
      setMyOrders(allMyTasks || []);
    }

    // Build conversations with other user info
    if (convData && convData.length > 0) {
      const convs: Conversation[] = [];
      for (const c of convData) {
        const otherId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
        const { data: otherProfile } = await supabase.from('profiles').select('full_name,email').eq('id', otherId).single();
        convs.push({
          id: c.id, other_id: otherId,
          other_name: otherProfile?.full_name || otherProfile?.email || 'Пользователь',
          other_email: otherProfile?.email || '',
          last_message: c.last_message || '',
          updated_at: c.updated_at,
        });
      }
      setConversations(convs);
    }
    setLoading(false);
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    setMessages(data || []);
    // Subscribe to new messages
    supabase.channel(`conv-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        (payload) => setMessages(m => [...m, payload.new as Message]))
      .subscribe();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { alert('Файл слишком большой (макс 10MB)'); return; }
      setAttachedFile(file);
    }
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || !userId) return;
    setSending(true);
    const content = newMsg.trim();
    setNewMsg('');
    try {
      await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: userId, content });
      await supabase.from('conversations').update({ last_message: content, updated_at: new Date().toISOString() }).eq('id', activeConv.id);
    } catch (e) { setNewMsg(content); }
    setSending(false);
  };

  const filtered = tasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.city?.toLowerCase().includes(search.toLowerCase()) || CATS[t.category]?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex-col z-40 pt-[57px]">
        <nav className="flex-1 p-3 space-y-0.5">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tasks', icon: Briefcase, label: 'Доступные задачи' },
            { id: 'my_orders', icon: TrendingUp, label: 'Мои заказы' },
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
        <div className="p-3 border-t border-gray-100">
          <button onClick={() => router.push('/profile')}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Settings className="w-4 h-4" /> Настройки профиля
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        <DashboardHeader title="Кабинет бухгалтера"
          right={tab === 'tasks' ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Поиск задач..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
            </div>
          ) : undefined}
        />

        <main className="p-4 sm:p-8 pb-24 lg:pb-8">

          {/* HOME */}
          {(tab === 'home' || tab === 'my_orders') && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Открытых задач', value: tasks.length, color: 'text-blue-600' },
                  { label: 'Мои заказы', value: myOrders.length, color: 'text-emerald-600' },
                  { label: 'Диалогов', value: conversations.length, color: 'text-purple-600' },
                  { label: 'Рейтинг', value: '—', color: 'text-amber-500' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                    <p className="text-xs text-gray-500 mb-2">{s.label}</p>
                    <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {tab === 'my_orders' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Мои заказы</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Задачи, на которые вы откликнулись</p>
                  </div>
                  {myOrders.length === 0 ? (
                    <div className="py-16 text-center">
                      <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400">У вас пока нет откликов</p>
                      <button onClick={() => setTab('tasks')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                        Найти задачи
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {myOrders.map(task => {
                        const statusLabels: Record<string, {label: string; color: string}> = {
                          open: { label: 'Ожидает ответа', color: 'bg-amber-100 text-amber-700' },
                          in_progress: { label: '✓ Вы выбраны!', color: 'bg-emerald-100 text-emerald-700' },
                          completed: { label: 'Завершена', color: 'bg-gray-100 text-gray-500' },
                          cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-500' },
                        };
                        const sl = statusLabels[task.status] || statusLabels.open;
                        return (
                          <div key={task.id} onClick={() => router.push(`/dashboard/accountant/tasks/${task.id}`)}
                            className="px-6 py-4 hover:bg-gray-50 cursor-pointer group transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 text-sm mb-1">{task.title}</h3>
                                <div className="flex gap-2 text-xs text-gray-400 flex-wrap">
                                  <span className="text-blue-600 font-medium">{CATS[task.category]}</span>
                                  {task.city && <span>📍 {task.city}</span>}
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sl.color}`}>{sl.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {tab === 'home' && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900">Новые задачи</h2>
                    <button onClick={() => setTab('tasks')} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                      Все задачи <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  {tasks.slice(0, 4).map(task => (
                    <div key={task.id} onClick={() => router.push(`/dashboard/accountant/tasks/${task.id}`)}
                      className="px-6 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group transition-colors last:border-0">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 text-sm mb-1">{task.title}</h3>
                      <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
                        <span className="text-blue-600 font-medium">{CATS[task.category]}</span>
                        {task.city && <span>📍 {task.city}</span>}
                        {task.budget && <span className="text-emerald-600">💰 {task.budget.toLocaleString()} ₸</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TASKS */}
          {tab === 'tasks' && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Доступные задачи</h2>
                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} задач открыто для откликов</p>
              </div>
              {filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400">Задачи не найдены</p>
                </div>
              ) : filtered.map(task => (
                <div key={task.id} onClick={() => router.push(`/dashboard/accountant/tasks/${task.id}`)}
                  className="px-6 py-5 border-b border-gray-50 hover:bg-gray-50 cursor-pointer group last:border-0">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-1">{task.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{task.description}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">{CATS[task.category]}</span>
                        {task.city && <span className="flex items-center gap-1 text-gray-400"><MapPin className="w-3 h-3" />{task.city}</span>}
                        {task.budget && <span className="text-emerald-600 font-medium">💰 {task.budget.toLocaleString()} ₸</span>}
                        {task.deadline && <span className="flex items-center gap-1 text-gray-400"><Clock className="w-3 h-3" />{new Date(task.deadline).toLocaleDateString('ru-RU')}</span>}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); router.push(`/dashboard/accountant/tasks/${task.id}`); }}
                      className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap">
                      Откликнуться
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MESSAGES / CHAT */}
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
                      <p className="text-gray-300 text-xs mt-1">Заказчики смогут написать вам после выбора</p>
                    </div>
                  ) : conversations.map(conv => (
                    <div key={conv.id} onClick={() => openConversation(conv)}
                      className="px-6 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                        {conv.other_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{conv.other_name}</p>
                        <p className="text-xs text-gray-400 truncate">{conv.last_message || 'Нет сообщений'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col h-full relative"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={handleDrop}>
                  {isDragging && (
                    <div className="absolute inset-0 z-20 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-2xl flex items-center justify-center pointer-events-none">
                      <div className="bg-white rounded-2xl px-6 py-4 shadow-lg flex items-center gap-3">
                        <Paperclip className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-700">Отпустите файл, чтобы прикрепить</span>
                      </div>
                    </div>
                  )}
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => setActiveConv(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                      {activeConv.other_name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{activeConv.other_name}</p>
                      <p className="text-xs text-gray-400">Заказчик</p>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-400 text-sm py-8">Начните диалог</div>
                    )}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === userId ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEnd} />
                  </div>
                  {/* Input */}
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2 flex-shrink-0">
                    <input type="text" value={newMsg} onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Напишите сообщение..." disabled={sending}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                    <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
                      className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl transition-colors flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-4 h-16">
          {NAV.map(item => (
            <button key={item.id} onClick={() => item.id === 'profile' ? router.push('/profile') : setTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium relative ${tab === item.id ? 'text-blue-600' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.id === 'messages' && conversations.length > 0 && (
                <span className="absolute top-2 right-6 bg-blue-600 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">{conversations.length}</span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function AccountantDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <AccountantDashboardInner />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
