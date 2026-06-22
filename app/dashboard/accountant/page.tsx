'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Home, Briefcase, MessageSquare, User, MapPin, Clock, ChevronRight, TrendingUp, Settings, Send, ArrowLeft, Paperclip, Wallet, CheckCircle2, X, Copy, CalendarDays, Calculator, Building2, Wrench } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';

interface Task { id: string; title: string; description: string; status: string; category: string; city: string; budget?: number; deadline?: string; created_at: string; final_price?: number; commission_amount?: number; commission_paid?: boolean; paid_by_client?: boolean; company_id?: string; company_name?: string; }
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

const NAV = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'tools', icon: Wrench, label: 'Инструменты' },
  { id: 'tasks', icon: Briefcase, label: 'Задачи' },
  { id: 'messages', icon: MessageSquare, label: 'Чат' },
];

function AccountantDashboardInner() {
  const [tab, setTab] = useState('home');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myOrders, setMyOrders] = useState<Task[]>([]);
  const [myProposalPrices, setMyProposalPrices] = useState<Record<string, number>>({});
  const [platformKaspi, setPlatformKaspi] = useState({ number: '', name: 'BuhTask', percent: 10 });
  const [payModal, setPayModal] = useState<Task | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [chatError, setChatError] = useState('');
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
      supabase.from('proposals').select('task_id,proposed_price').eq('accountant_id', user.id),
    ]);

    // IDs задач на которые уже откликнулся + цены
    const respondedTaskIds = new Set((myProposals || []).map((p: any) => p.task_id));
    const priceMap: Record<string, number> = {};
    (myProposals || []).forEach((p: any) => { if (p.proposed_price) priceMap[p.task_id] = p.proposed_price; });
    setMyProposalPrices(priceMap);

    // Платформенные настройки (Kaspi номер для оплаты комиссии)
    const { data: settings } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
    if (settings) {
      setPlatformKaspi({
        number: settings.platform_kaspi_number || '',
        name: settings.platform_kaspi_name || 'BuhTask',
        percent: settings.commission_percent || 10,
      });
    }

    // Показываем только открытые задачи БЕЗ моего отклика
    const availableTasks = (openTasks || []).filter((t: any) => !respondedTaskIds.has(t.id));

    // Подгружаем названия компаний (только название, без реквизитов)
    const companyIds = [...new Set(availableTasks.map((t: any) => t.company_id).filter(Boolean))];
    if (companyIds.length > 0) {
      const { data: comps } = await supabase.from('companies').select('id,name').in('id', companyIds as string[]);
      const nameMap: Record<string, string> = {};
      (comps || []).forEach((c: any) => { nameMap[c.id] = c.name; });
      availableTasks.forEach((t: any) => { if (t.company_id) t.company_name = nameMap[t.company_id]; });
    }
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
        const { data: otherProfile } = await supabase.from('profiles').select('full_name').eq('id', otherId).single();
        let taskTitle = '';
        if (c.task_id) {
          const { data: t } = await supabase.from('tasks').select('title').eq('id', c.task_id).maybeSingle();
          taskTitle = t?.title || '';
        }
        convs.push({
          id: c.id, other_id: otherId,
          other_name: otherProfile?.full_name || 'Заказчик',
          last_message: c.last_message || '',
          updated_at: c.updated_at,
          task_title: taskTitle, task_id: c.task_id,
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
      if (file.size > 50 * 1024 * 1024) { alert('Файл слишком большой (макс 50MB)'); return; }
      setAttachedFile(file);
    }
  };

  // Бухгалтер отмечает что заказ выполнен и оплачен клиентом
  const markOrderPaid = async (task: Task) => {
    const price = myProposalPrices[task.id] || task.budget || 0;
    if (!price) {
      alert('Не указана цена заказа. Укажите цену в отклике.');
      return;
    }
    const commission = Math.round(price * (platformKaspi.percent / 100));
    // Обновляем задачу: оплачена клиентом, статус paid, рассчитана комиссия
    const { error } = await supabase.from('tasks').update({
      status: 'paid',
      final_price: price,
      paid_by_client: true,
      paid_at: new Date().toISOString(),
      commission_amount: commission,
    }).eq('id', task.id);
    if (error) { alert('Ошибка: ' + error.message); return; }

    // Создаём запись о комиссии к оплате
    await supabase.from('commission_payments').insert({
      accountant_id: userId,
      task_id: task.id,
      order_amount: price,
      commission_amount: commission,
      status: 'pending',
    });

    // Обновляем локально и открываем модалку оплаты комиссии
    setMyOrders(prev => prev.map(t => t.id === task.id ? { ...t, status: 'paid', final_price: price, commission_amount: commission } : t));
    setPayModal({ ...task, status: 'paid', final_price: price, commission_amount: commission });
  };

  // Бухгалтер подтверждает что оплатил комиссию платформе
  const confirmCommissionPaid = async (task: Task) => {
    const { error } = await supabase.from('tasks').update({
      commission_paid: true,
      commission_paid_at: new Date().toISOString(),
    }).eq('id', task.id);
    if (error) { alert('Ошибка: ' + error.message); return; }

    await supabase.from('commission_payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('task_id', task.id).eq('accountant_id', userId);

    setMyOrders(prev => prev.map(t => t.id === task.id ? { ...t, commission_paid: true } : t));
    setPayModal(null);
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
    const phonePatterns = [
      /(\+?7|8)[\s\-(]*\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/,
      /\d{10,}/,
      /\d{3}[\s\-]\d{3}[\s\-]\d{2}[\s\-]\d{2}/,
    ];
    const emailPattern = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
    const messengerPattern = /(whats\s?app|вотс\s?ап|ватсап|телеграм|telegram|@[a-zA-Z0-9_]{4,}|instagram|инстаграм|вайбер|viber)/i;
    const cleaned = text.replace(/\s+/g, ' ');
    return phonePatterns.some(p => p.test(cleaned)) || emailPattern.test(cleaned) || messengerPattern.test(cleaned);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || !userId) return;
    if (containsContact(newMsg)) {
      setChatError('⚠️ Запрещено передавать телефоны, email или контакты мессенджеров. Общение и оплата проходят через платформу для вашей безопасности.');
      return;
    }
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
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-gray-100 flex-col z-40">
        <div className="px-5 py-4 border-b border-gray-50">
          <img src="/images/logo-new.png" alt="BuhTask" className="h-9 w-auto" />
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {[
            { id: 'home', icon: Home, label: 'Главная' },
            { id: 'tasks', icon: Briefcase, label: 'Доступные задачи' },
            { id: 'my_orders', icon: TrendingUp, label: 'Мои заказы' },
            { id: 'balance', icon: Wallet, label: 'Баланс и комиссии' },
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
            <button onClick={() => router.push('/tax-calendar')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              <CalendarDays className="w-4 h-4 flex-shrink-0" /> Налоговый календарь
            </button>
            <button onClick={() => router.push('/salary-calculator')}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap">
              <Calculator className="w-4 h-4 flex-shrink-0" /> Калькулятор зарплаты
            </button>
          </div>
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={() => setTab('tasks')}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            <Briefcase className="w-4 h-4" /> Найти задачи
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
                          paid: { label: 'Оплачен', color: 'bg-blue-100 text-blue-700' },
                          cancelled: { label: 'Отменена', color: 'bg-red-100 text-red-500' },
                        };
                        const sl = statusLabels[task.status] || statusLabels.open;
                        const price = myProposalPrices[task.id] || task.budget || 0;
                        const commission = Math.round(price * (platformKaspi.percent / 100));
                        return (
                          <div key={task.id}
                            className="px-6 py-4 hover:bg-gray-50 group transition-colors">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/dashboard/accountant/tasks/${task.id}`)}>
                                <h3 className="font-medium text-gray-900 group-hover:text-blue-600 text-sm mb-1">{task.title}</h3>
                                <div className="flex gap-2 text-xs text-gray-400 flex-wrap">
                                  <span className="text-blue-600 font-medium">{CATS[task.category]}</span>
                                  {task.city && <span>📍 {task.city}</span>}
                                  {price > 0 && <span className="text-emerald-600 font-medium">💰 {price.toLocaleString()} ₸</span>}
                                </div>
                              </div>
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${sl.color}`}>{sl.label}</span>
                            </div>
                            {/* Кнопка "Заказ оплачен" для активных заказов */}
                            {task.status === 'in_progress' && (
                              <div className="mt-3 flex items-center gap-2">
                                <button onClick={() => markOrderPaid(task)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Заказ выполнен и оплачен
                                </button>
                                <span className="text-xs text-gray-400">Комиссия {platformKaspi.percent}%: {commission.toLocaleString()} ₸</span>
                              </div>
                            )}
                            {/* Статус комиссии для оплаченных */}
                            {task.status === 'paid' && !task.commission_paid && (
                              <div className="mt-3 flex items-center gap-2">
                                <button onClick={() => setPayModal(task)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors">
                                  <Wallet className="w-3.5 h-3.5" /> Оплатить комиссию {(task.commission_amount || commission).toLocaleString()} ₸
                                </button>
                              </div>
                            )}
                            {task.status === 'paid' && task.commission_paid && (
                              <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Комиссия оплачена ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {tab === 'balance' && (() => {
                const paidOrders = myOrders.filter(t => t.status === 'paid');
                const totalEarned = paidOrders.reduce((s, t) => s + (t.final_price || 0), 0);
                const owedCommission = paidOrders.filter(t => !t.commission_paid).reduce((s, t) => s + (t.commission_amount || 0), 0);
                const paidCommission = paidOrders.filter(t => t.commission_paid).reduce((s, t) => s + (t.commission_amount || 0), 0);
                return (
                  <div className="space-y-5">
                    {/* Stats cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs text-gray-500 mb-1">Заработано всего</p>
                        <p className="text-2xl font-extrabold text-emerald-600">{totalEarned.toLocaleString()} ₸</p>
                        <p className="text-xs text-gray-400 mt-1">{paidOrders.length} выполненных заказов</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs text-gray-500 mb-1">Долг по комиссии</p>
                        <p className="text-2xl font-extrabold text-amber-600">{owedCommission.toLocaleString()} ₸</p>
                        <p className="text-xs text-gray-400 mt-1">К оплате платформе</p>
                      </div>
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <p className="text-xs text-gray-500 mb-1">Оплачено комиссии</p>
                        <p className="text-2xl font-extrabold text-blue-600">{paidCommission.toLocaleString()} ₸</p>
                        <p className="text-xs text-gray-400 mt-1">Всего за период</p>
                      </div>
                    </div>

                    {/* How it works */}
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                      <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-600" /> Как работает оплата
                      </h3>
                      <ol className="text-xs text-gray-600 space-y-1.5 list-decimal list-inside">
                        <li>Клиент оплачивает вам напрямую за выполненный заказ (Kaspi/перевод)</li>
                        <li>Вы нажимаете «Заказ выполнен и оплачен» в разделе «Мои заказы»</li>
                        <li>Система рассчитывает комиссию платформы — {platformKaspi.percent}% от суммы заказа</li>
                        <li>Вы оплачиваете комиссию платформе через Kaspi QR</li>
                      </ol>
                    </div>

                    {/* Orders awaiting commission */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <div className="px-6 py-5 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Комиссии к оплате</h2>
                      </div>
                      {paidOrders.filter(t => !t.commission_paid).length === 0 ? (
                        <div className="py-12 text-center">
                          <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">Нет задолженности по комиссии</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {paidOrders.filter(t => !t.commission_paid).map(task => (
                            <div key={task.id} className="px-6 py-4 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
                                <p className="text-xs text-gray-400">Заказ: {(task.final_price || 0).toLocaleString()} ₸ · Комиссия {platformKaspi.percent}%</p>
                              </div>
                              <button onClick={() => setPayModal(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors flex-shrink-0">
                                <Wallet className="w-3.5 h-3.5" /> {(task.commission_amount || 0).toLocaleString()} ₸
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
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
                        {task.company_name && <span className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium"><Building2 className="w-3 h-3" />{task.company_name}</span>}
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
                        {conv.task_title && <p className="text-xs text-blue-600 truncate">📋 {conv.task_title}</p>}
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
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{activeConv.other_name}</p>
                      {activeConv.task_title ? (
                        <button onClick={() => router.push(`/dashboard/accountant/tasks/${activeConv.task_id}`)}
                          className="text-xs text-blue-600 hover:underline truncate block max-w-full text-left">📋 {activeConv.task_title}</button>
                      ) : (
                        <p className="text-xs text-gray-400">Заказчик</p>
                      )}
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
                          <p className={`text-[10px] mt-1 ${msg.sender_id === userId ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEnd} />
                  </div>
                  {/* Input */}
                  <div className="border-t border-gray-100 flex-shrink-0">
                    {chatError && (
                      <div className="mx-4 mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl text-xs flex items-start justify-between gap-2">
                        <span>{chatError}</span>
                        <button onClick={() => setChatError('')} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                      </div>
                    )}
                    <div className="px-4 py-3 flex gap-2">
                    <input type="text" value={newMsg} onChange={e => { setNewMsg(e.target.value); if (chatError) setChatError(''); }}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Напишите сообщение..." disabled={sending}
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                    <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
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

      {/* Mobile nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="grid grid-cols-4 h-16">
          {NAV.map(item => (
            <button key={item.id} onClick={() => item.id === 'tools' ? router.push('/tools') : setTab(item.id)}
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

      {/* Модалка оплаты комиссии через Kaspi QR */}
      {payModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setPayModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Оплата комиссии платформе</h3>
              <button onClick={() => setPayModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <div className="text-center mb-5">
                <p className="text-sm text-gray-500 mb-1">К оплате комиссия {platformKaspi.percent}%</p>
                <p className="text-4xl font-extrabold text-gray-900">{(payModal.commission_amount || 0).toLocaleString()} ₸</p>
                <p className="text-xs text-gray-400 mt-1">с заказа {(payModal.final_price || 0).toLocaleString()} ₸</p>
              </div>

              {/* Kaspi QR карточка платформы */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-5 flex flex-col items-center">
                <img src="/images/kaspi-qr.png" alt="Kaspi QR BuhTask" className="w-full max-w-[260px] rounded-xl" />
                <a href="/images/kaspi-qr.png" download="BuhTask-Kaspi-QR.png"
                  className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" /> Сохранить QR-код
                </a>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-amber-700">⚠️ Отсканируйте QR в приложении Kaspi, переведите сумму комиссии <b>{(payModal.commission_amount || 0).toLocaleString()} ₸</b>, затем нажмите кнопку ниже.</p>
              </div>

              <button onClick={() => confirmCommissionPaid(payModal)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                Я оплатил комиссию
              </button>
            </div>
          </div>
        </div>
      )}
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
