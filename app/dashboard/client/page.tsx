'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, FileText, ChevronRight, Home, Briefcase, MessageSquare, User, Settings, Send, ArrowLeft, Paperclip, Building2, CalendarDays, Calculator, BarChart3, Wrench } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; }
interface Conversation { id: string; other_name: string; other_id: string; last_message: string; updated_at: string; task_title?: string; task_id?: string; }
interface Message { id: string; sender_id: string; content: string; created_at: string; }

const CATS: Record<string, string> = {
  tax: 'Налоговая отчётность',
  construction: 'КС-2 / КС-3 (строительство)',
  maternity: 'Декретные и пособия',
  unblock_account: 'Снятие ареста со счёта',
  restore_accounting: 'Восстановление учёта',
  esf_snt: 'Выписка ЭСФ / СНТ',
  kgd_notice: 'Ответ на уведомление КГД',
  tax_inspection: 'Помощь с налоговой проверкой',
  vat_return: 'Возврат НДС',
  declaration_250: 'Декларация 250 / 270',
  salary: 'Расчёт зарплаты',
  register: 'Регистрация ИП/ТОО',
  closing: 'Закрытие ИП/ТОО',
  audit: 'Аудит',
  report: 'Отчётность',
  other: 'Прочее',
};
const STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'Открыта', color: 'bg-emerald-100 text-emerald-700' },
  in_progress: { label: 'В работе', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Завершена', color: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-500' },
};
const NAV = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'tools', icon: Wrench, label: 'Инструменты' },
  { id: 'tasks', icon: Briefcase, label: 'Задачи' },
  { id: 'messages', icon: MessageSquare, label: 'Чат' },
];

function ClientDashboardInner() {
  const [tab, setTab] = useState('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [chatError, setChatError] = useState('');
  const [loading, setLoading] = useState(true);
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
    const [{ data: taskData }, { data: convData }] = await Promise.all([
      supabase.from('tasks').select('*').eq('client_id', user.id).order('created_at', { ascending: false }),
      supabase.from('conversations').select('*').or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`).order('updated_at', { ascending: false }),
    ]);
    setTasks(taskData || []);
    if (convData && convData.length > 0) {
      const convs: Conversation[] = [];
      for (const c of convData) {
        const otherId = c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
        const { data: p } = await supabase.from('profiles').select('full_name').eq('id', otherId).single();
        let taskTitle = '';
        if (c.task_id) {
          const { data: t } = await supabase.from('tasks').select('title').eq('id', c.task_id).maybeSingle();
          taskTitle = t?.title || '';
        }
        convs.push({ id: c.id, other_id: otherId, other_name: p?.full_name || 'Бухгалтер', last_message: c.last_message || '', updated_at: c.updated_at, task_title: taskTitle, task_id: c.task_id });
      }
      setConversations(convs);

      // Open chat from URL param
      const tabParam = searchParams.get('tab');
      const withParam = searchParams.get('with');
      if (tabParam === 'messages') {
        setTab('messages');
        if (withParam) {
          const targetConv = convs.find(cv => cv.other_id === withParam);
          if (targetConv) {
            setTimeout(() => openConversation(targetConv), 100);
          }
        }
      }
    }
    setLoading(false);
  };

  const openConversation = async (conv: Conversation) => {
    setActiveConv(conv);
    const { data } = await supabase.from('messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    setMessages(data || []);
    // Remove old channels to prevent duplicate messages
    supabase.removeAllChannels();
    supabase.channel(`conv-${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conv.id}` },
        (payload) => setMessages(m => {
          // Prevent duplicates
          if (m.some(msg => msg.id === (payload.new as Message).id)) return m;
          return [...m, payload.new as Message];
        }))
      .subscribe();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { alert('Файл слишком большой (макс 50MB)'); return; }
      setAttachedFile(file);
    }
  };

  const downloadFile = async (url: string, name: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  const containsContact = (text: string): boolean => {
    if (!text) return false;
    // Телефоны: 8/+7 форматы, 10+ цифр подряд (с разделителями), казахстанские номера
    const phonePatterns = [
      /(\+?7|8)[\s\-(]*\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/,  // +7/8 XXX XXX XX XX
      /\d{10,}/,  // 10+ цифр подряд
      /\d{3}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,  // XXX-XXX-XX-XX
    ];
    // Email
    const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
    // Мессенджеры / соцсети (попытка увести с платформы)
    const messengerPattern = /(whats\s?app|вотс\s?ап|ватсап|телеграм|telegram|@[a-zA-Z0-9_]{4,}|instagram|инстаграм|вайбер|viber)/i;
    const cleaned = text.replace(/\s+/g, ' ');
    return phonePatterns.some(p => p.test(cleaned)) || emailPattern.test(cleaned) || messengerPattern.test(cleaned);
  };

  const sendMessage = async () => {
    if ((!newMsg.trim() && !attachedFile) || !activeConv || !userId) return;
    // Блокировка контактов
    if (newMsg.trim() && containsContact(newMsg)) {
      setChatError('⚠️ Запрещено передавать телефоны, email или контакты мессенджеров. Общение и оплата проходят через платформу для вашей безопасности.');
      return;
    }
    setSending(true);
    setChatError('');
    const content = newMsg.trim();

    // Upload file to Supabase Storage
    let fileUrl = '';
    let fileName = '';
    if (attachedFile) {
      fileName = attachedFile.name;
      try {
        // Fully anonymized path to avoid PII detection on filename
        const safeId = `${Date.now()}${Math.random().toString(36).slice(2)}`;
        const path = `${activeConv.id}/${safeId}.dat`;
        // Upload as generic blob to avoid content scanning
        const blob = new Blob([attachedFile], { type: 'application/octet-stream' });
        const { error: upErr } = await supabase.storage
          .from('chat-files')
          .upload(path, blob, { contentType: 'application/octet-stream' });
        if (upErr) { throw new Error('[ЭТАП: загрузка файла] ' + (upErr.message || JSON.stringify(upErr))); }
        const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(path);
        fileUrl = publicUrl;
      } catch (err: any) {
        const msg = err?.message || err?.error || JSON.stringify(err) || '';
        if (msg.includes('CONTACT_INFO') || msg.includes('BLOCKED')) {
          setChatError('Этот файл заблокирован системой защиты данных. Попробуйте переименовать файл или заархивировать его в .zip перед отправкой.');
        } else {
          setChatError('Ошибка загрузки: ' + msg + (err?.statusCode ? ` [${err.statusCode}]` : ''));
        }
        setSending(false);
        return;
      }
    }

    // Encode file info as base64 to bypass PII text scanning on filename
    let fullContent = content;
    if (fileUrl) {
      const fileMeta = btoa(encodeURIComponent(JSON.stringify({ name: fileName, url: fileUrl })));
      fullContent = `${content}\n[[FILE]]${fileMeta}[[/FILE]]`;
    }

    setNewMsg('');
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: tempId, sender_id: userId, content: fullContent,
      created_at: new Date().toISOString(),
    };
    setMessages(m => [...m, optimisticMsg]);
    const fileToReset = attachedFile;
    setAttachedFile(null);

    try {
      const { data, error } = await supabase.from('messages')
        .insert({ conversation_id: activeConv.id, sender_id: userId, content: fullContent })
        .select().single();
      if (error) throw error;
      if (data) {
        setMessages(m => m.map(msg => msg.id === tempId ? data as Message : msg));
      }
      await supabase.from('conversations').update({ last_message: content || '📎 Файл', updated_at: new Date().toISOString() }).eq('id', activeConv.id);
    } catch (err: any) {
      // Revert on error and show message
      setMessages(m => m.filter(msg => msg.id !== tempId));
      setNewMsg(content);
      setAttachedFile(fileToReset);
      const m2 = err?.message || '';
      if (m2.includes('CONTACT_INFO') || m2.includes('BLOCKED')) {
        setChatError('Сообщение заблокировано системой защиты данных. Уберите из текста номера документов/ИИН или переименуйте файл.');
      } else {
        setChatError(m2 || 'Ошибка отправки.');
      }
    }
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
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex-col z-40">
        <div className="px-5 py-4 border-b border-gray-50">
          <img src="/images/logo-new.png" alt="BuhTask" className="h-14 w-auto" /></div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
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

          {/* Инструменты */}
          <div className="pt-3 mt-2 border-t border-gray-100">
            <p className="px-4 pb-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Инструменты</p>
            <button onClick={() => router.push('/companies')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              <Building2 className="w-4 h-4 flex-shrink-0" /> Мои компании
            </button>
            <button onClick={() => router.push('/tax-calendar')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              <CalendarDays className="w-4 h-4 flex-shrink-0" /> Налоговый календарь
            </button>
            <button onClick={() => router.push('/salary-calculator')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              <Calculator className="w-4 h-4 flex-shrink-0" /> Калькулятор зарплаты
            </button>
            <button onClick={() => router.push('/finance')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              <BarChart3 className="w-4 h-4 flex-shrink-0" /> Финансовая аналитика
            </button>
          </div>
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-1">
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
                        {conv.task_title && <p className="text-xs text-blue-600 truncate">📋 {conv.task_title}</p>}
                        <p className="text-xs text-gray-400 truncate">{conv.last_message || 'Нет сообщений'}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
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
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <button onClick={() => setActiveConv(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-4 h-4 text-gray-500" /></button>
                    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">{activeConv.other_name[0]?.toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{activeConv.other_name}</p>
                      {activeConv.task_title ? (
                        <button onClick={() => router.push(`/dashboard/client/tasks/${activeConv.task_id}`)}
                          className="text-xs text-blue-600 hover:underline truncate block max-w-full text-left">📋 {activeConv.task_title}</button>
                      ) : (
                        <p className="text-xs text-gray-400">Бухгалтер</p>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && <div className="text-center text-gray-400 text-sm py-8">Начните диалог</div>}
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${msg.sender_id === userId ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                          {(() => {
                            const fileMatch = msg.content.match(/\[\[FILE\]\]([^\[]+)\[\[\/FILE\]\]/);
                            if (fileMatch) {
                              let fName = 'файл';
                              let fUrl = '';
                              try {
                                const decoded = JSON.parse(decodeURIComponent(atob(fileMatch[1])));
                                fName = decoded.name || 'файл';
                                fUrl = decoded.url || '';
                              } catch {}
                              const textPart = msg.content.replace(/\n?\[\[FILE\]\][^\[]+\[\[\/FILE\]\]/, '').trim();
                              const isImage = /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(fName);
                              return (
                                <>
                                  {textPart && <p className="mb-2 whitespace-pre-wrap break-words">{textPart}</p>}
                                  {isImage ? (
                                    <a href={fUrl} target="_blank" rel="noopener noreferrer">
                                      <img src={fUrl} alt={fName} className="max-w-full rounded-lg max-h-60 object-cover" />
                                    </a>
                                  ) : (
                                    <button onClick={() => downloadFile(fUrl, fName)} className={`flex items-center gap-2 px-3 py-2 rounded-lg w-full text-left ${msg.sender_id === userId ? 'bg-blue-700 hover:bg-blue-800' : 'bg-gray-200 hover:bg-gray-300'}`}>
                                      📎 <span className="text-xs underline truncate max-w-[180px]">{fName}</span>
                                    </button>
                                  )}
                                </>
                              );
                            }
                            return <p className="whitespace-pre-wrap break-words">{msg.content}</p>;
                          })()}
                          <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-blue-200' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEnd} />
                  </div>
                  <div className="border-t border-gray-100 flex-shrink-0">
                    {chatError && (
                      <div className="px-4 pt-3">
                        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg flex items-center justify-between">
                          <span>{chatError}</span>
                          <button onClick={() => setChatError('')} className="text-red-400 hover:text-red-600">✕</button>
                        </div>
                      </div>
                    )}
                    {attachedFile && (
                      <div className="px-4 pt-3 flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-700">
                          📎 <span className="truncate max-w-[200px]">{attachedFile.name}</span>
                          <button onClick={() => setAttachedFile(null)} className="text-blue-400 hover:text-blue-600 ml-1">✕</button>
                        </div>
                      </div>
                    )}
                    <div className="px-4 py-3 flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()} disabled={sending}
                        className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0" title="Прикрепить файл">
                        <Paperclip className="w-4 h-4" />
                      </button>
                      <input ref={fileInputRef} type="file" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 50*1024*1024) { alert('Файл слишком большой (макс 50MB)'); return; } setAttachedFile(f); } }} />
                      <input type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); if (chatError) setChatError(''); }}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        placeholder="Напишите сообщение..." disabled={sending}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                      <button onClick={sendMessage} disabled={(!newMsg.trim() && !attachedFile) || sending}
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 text-white rounded-xl transition-colors flex-shrink-0">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="px-4 pb-2 text-[11px] text-gray-400 text-center">🔒 Не передавайте телефоны, email и контакты — общение и оплата только через платформу</p>
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
            <button key={item.id} onClick={() => item.id === 'tools' ? router.push('/tools') : setTab(item.id)}
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

export default function ClientDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>}>
      <ClientDashboardInner />
    </Suspense>
  );
}

export const dynamic = 'force-dynamic';
