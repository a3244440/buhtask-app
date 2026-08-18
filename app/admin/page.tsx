'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, BadgeCheck, Clock, X, Check, FileText, User, CreditCard, ExternalLink, Users, Briefcase, TrendingUp, AlertCircle, Headphones, Send, MessageSquare, Eye, Trash2, Building2, Calendar, Wallet } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import { useI18n } from '@/lib/i18n';

interface Accountant {
  id: string; email: string; full_name: string; phone: string; city: string;
  iin: string; bio: string; experience_years: number; specialization: string[];
  id_card_url: string; selfie_url: string; diploma_urls: string[]; certificate_urls: string[];
  identity_verified: boolean; documents_verified: boolean; experience_verified: boolean;
  verification_status: string; rating: number; completed_tasks: number; created_at: string;
}

export default function AdminPanel() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [selected, setSelected] = useState<Accountant | null>(null);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [view, setView] = useState<'verify' | 'users' | 'activity' | 'support'>('verify');
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [ticketMsgs, setTicketMsgs] = useState<any[]>([]);
  const [supReply, setSupReply] = useState('');
  const [adminId, setAdminId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [toolUsage, setToolUsage] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [allDocs, setAllDocs] = useState<any[]>([]);
  const [companiesByUser, setCompaniesByUser] = useState<Record<string, string[]>>({});
  const [companiesById, setCompaniesById] = useState<Record<string, string>>({});
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'completed' | 'paid' | 'cancelled'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, accountants: 0, clients: 0, tasks: 0 });
  const [saving, setSaving] = useState(false);
  const [platformKaspi, setPlatformKaspi] = useState({ number: '', name: 'BuhTask', percent: 10 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => { init(); }, []);

  // Realtime: новые тикеты и новые сообщения (только для админа)
  useEffect(() => {
    if (!isAdmin) return;
    let ch: any;
    try {
      ch = supabase
        .channel('admin-support')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
          supabase.from('support_tickets').select('*').order('updated_at', { ascending: false }).then(({ data }) => { if (data) setTickets(data); });
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload: any) => {
          const m = payload.new;
          setActiveTicket((cur: any) => {
            if (cur && m.ticket_id === cur.id) {
              setTicketMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
            }
            return cur;
          });
        })
        .subscribe();
    } catch (e) { console.error('realtime error', e); }
    return () => { if (ch) { try { supabase.removeChannel(ch); } catch {} } };
  }, [isAdmin]);

  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (me?.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      await loadAdminData(user);
    } catch (e) {
      console.error('admin init error', e);
      setLoading(false);
    }
  };

  const loadAdminData = async (user: any) => {
    // Load all accountants
    const { data: accs } = await supabase.from('profiles').select('*').eq('role', 'accountant').order('created_at', { ascending: false });
    setAccountants(accs || []);

    // Stats
    const [{ count: total }, { count: accCount }, { count: clientCount }, { count: taskCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'accountant'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'client'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }),
    ]);
    setStats({ total: total || 0, accountants: accCount || 0, clients: clientCount || 0, tasks: taskCount || 0 });

    // Все пользователи (регистрации)
    const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setAllUsers(users || []);

    // Все задачи (и новые, и старые — без ограничения по количеству)
    const { data: tasks } = await supabase.from('tasks')
      .select('id,title,description,category,status,city,budget,deadline,created_at,updated_at,client_id,company_id,accountant_id,final_price,paid_by_client')
      .order('created_at', { ascending: false });
    setAllTasks(tasks || []);
    // Активность инструментов (последние 200 использований)
    try {
      const { data: tu } = await supabase.from('tool_usage').select('*').order('created_at', { ascending: false }).limit(200);
      setToolUsage(tu || []);
    } catch { setToolUsage([]); }

    // Все документы
    const { data: docs } = await supabase.from('documents').select('id,type,number,total,doc_date,owner_id,created_at').order('created_at', { ascending: false }).limit(500);
    setAllDocs(docs || []);

    // Компании по пользователям
    const { data: comps } = await supabase.from('companies').select('id,owner_id,name');
    const cmap: Record<string, string[]> = {};
    const cById: Record<string, string> = {};
    (comps || []).forEach((c: any) => {
      (cmap[c.owner_id] = cmap[c.owner_id] || []).push(c.name);
      cById[c.id] = c.name;
    });
    setCompaniesByUser(cmap);
    setCompaniesById(cById);

    setAdminId(user.id);
    // Тикеты поддержки (не ломаем админку, если таблицы нет)
    try {
      const { data: tk } = await supabase.from('support_tickets').select('*').order('updated_at', { ascending: false });
      setTickets(tk || []);
    } catch (e) { console.error('support load error', e); setTickets([]); }

    // Платформенные настройки
    const { data: settings } = await supabase.from('platform_settings').select('*').eq('id', 1).maybeSingle();
    if (settings) {
      setPlatformKaspi({
        number: settings.platform_kaspi_number || '',
        name: settings.platform_kaspi_name || 'BuhTask',
        percent: settings.commission_percent || 10,
      });
    }

    setLoading(false);
  };

  const openTicket = async (ticket: any) => {
    setActiveTicket(ticket);
    const { data: msgs } = await supabase.from('support_messages')
      .select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
    setTicketMsgs(msgs || []);
    await supabase.from('support_tickets').update({ unread_admin: 0 }).eq('id', ticket.id);
    setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, unread_admin: 0 } : t));
  };

  // Админ начинает чат с пользователем (создаёт тикет, если его нет)
  const writeToUser = async (userId: string) => {
    let ticket = tickets.find(tk => tk.user_id === userId);
    if (!ticket) {
      const { data } = await supabase.from('support_tickets')
        .insert({ user_id: userId, status: 'open', last_message: '', last_from: 'admin' })
        .select().maybeSingle();
      if (data) { ticket = data; setTickets(prev => [data, ...prev]); }
      else {
        // возможно тикет уже есть, но не в списке — перечитаем
        const { data: existing } = await supabase.from('support_tickets').select('*').eq('user_id', userId).maybeSingle();
        if (existing) { ticket = existing; setTickets(prev => prev.some(x => x.id === existing.id) ? prev : [existing, ...prev]); }
      }
    }
    if (ticket) { setView('support'); openTicket(ticket); }
  };

  const replyTicket = async () => {
    const content = supReply.trim();
    if (!content || !activeTicket) return;
    setSupReply('');
    const { data } = await supabase.from('support_messages')
      .insert({ ticket_id: activeTicket.id, sender_id: adminId, is_admin: true, content }).select().maybeSingle();
    if (data) setTicketMsgs(prev => [...prev, data]);
    const { data: tk } = await supabase.from('support_tickets').select('unread_user').eq('id', activeTicket.id).maybeSingle();
    await supabase.from('support_tickets').update({
      last_message: content, last_from: 'admin', updated_at: new Date().toISOString(),
      unread_user: (tk?.unread_user || 0) + 1,
    }).eq('id', activeTicket.id);
  };

  const setUserPlan = async (userId: string, plan: 'free' | 'business' | 'pro') => {
    // активируем на 30 дней (free — без срока)
    const until = plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('profiles').update({ subscription_plan: plan, subscription_until: until }).eq('id', userId);
    if (error) { alert('Ошибка: ' + error.message); return; }
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, subscription_plan: plan, subscription_until: until } : u));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    const { error } = await supabase.from('platform_settings').update({
      platform_kaspi_number: platformKaspi.number,
      platform_kaspi_name: platformKaspi.name,
      commission_percent: platformKaspi.percent,
    }).eq('id', 1);
    if (error) {
      alert('Ошибка сохранения: ' + error.message);
    } else {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    }
    setSavingSettings(false);
  };

  const updateVerification = async (acc: Accountant, updates: Partial<Accountant>) => {
    setSaving(true);
    try {
      const merged = { ...acc, ...updates };
      // Auto-set status based on checks
      let status = merged.verification_status;
      const allChecked = merged.identity_verified && merged.documents_verified && merged.experience_verified;
      if (allChecked) {
        status = 'verified';
      } else if (merged.identity_verified || merged.documents_verified || merged.experience_verified) {
        status = 'pending';
      } else {
        status = 'not_verified';
      }
      const finalUpdates = { ...updates, verification_status: status };
      const { error } = await supabase.from('profiles').update(finalUpdates).eq('id', acc.id);
      if (error) {
        alert('Ошибка сохранения: ' + error.message + '\n\nВозможно нужна RLS политика для админа.');
        setSaving(false);
        return;
      }
      setAccountants(prev => prev.map(a => a.id === acc.id ? { ...a, ...finalUpdates } : a));
      setSelected(prev => prev && prev.id === acc.id ? { ...prev, ...finalUpdates } : prev);
    } catch (e: any) {
      alert('Ошибка: ' + (e?.message || 'неизвестно'));
    }
    setSaving(false);
  };

  const verifyAll = async (acc: Accountant) => {
    await updateVerification(acc, {
      identity_verified: true, documents_verified: true, experience_verified: true,
      verification_status: 'verified',
    });
    setSelected(null);
  };

  const rejectAll = async (acc: Accountant) => {
    await updateVerification(acc, {
      identity_verified: false, documents_verified: false, experience_verified: false,
      verification_status: 'not_verified',
    });
    setSelected(null);
  };

  const deleteTask = async (task: any) => {
    if (!window.confirm(`Удалить задачу «${task.title}»?\n\nЭто действие необратимо — вместе с задачей удалятся все отклики и заказы по ней.`)) return;
    setDeletingTaskId(task.id);
    const { error } = await supabase.from('tasks').delete().eq('id', task.id);
    setDeletingTaskId(null);
    if (error) {
      alert('Ошибка удаления: ' + error.message + '\n\nВозможно нужна RLS-политика для админа.');
      return;
    }
    setAllTasks(prev => prev.filter(t => t.id !== task.id));
    setStats(prev => ({ ...prev, tasks: Math.max(0, prev.tasks - 1) }));
    if (selectedTask?.id === task.id) setSelectedTask(null);
  };

  const taskStatusLabel = (s: string) => ({
    open: 'Открыта', in_progress: 'В работе', completed: 'Завершена', paid: 'Оплачена', cancelled: 'Отменена',
  } as Record<string, string>)[s] || s;

  const filteredTasks = allTasks.filter(tk => {
    if (taskStatusFilter !== 'all' && tk.status !== taskStatusFilter) return false;
    if (taskSearch.trim()) {
      const q = taskSearch.trim().toLowerCase();
      const owner = allUsers.find(u => u.id === tk.client_id);
      const hay = `${tk.title} ${tk.description || ''} ${tk.city || ''} ${tk.category || ''} ${owner?.full_name || ''} ${owner?.email || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filtered = accountants.filter(a => {
    if (filter === 'pending') return a.verification_status === 'pending' || (a.iin && a.verification_status !== 'verified');
    if (filter === 'verified') return a.verification_status === 'verified';
    return true;
  });

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"/></div>;

  if (!isAdmin) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-10 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Доступ запрещён</h2>
          <p className="text-sm text-gray-500 mb-6">Эта страница доступна только администраторам</p>
          <button onClick={() => router.push('/')} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">На главную</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title="Админ-панель" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Всего пользователей', value: stats.total, icon: Users, color: 'text-gray-900' },
            { label: 'Бухгалтеров', value: stats.accountants, icon: Briefcase, color: 'text-blue-600' },
            { label: 'Заказчиков', value: stats.clients, icon: User, color: 'text-emerald-600' },
            { label: 'Задач', value: stats.tasks, icon: TrendingUp, color: 'text-purple-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{s.label}</p>
                <s.icon className="w-4 h-4 text-gray-300" />
              </div>
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div className="flex gap-2 mb-5 overflow-x-auto">
          {([
            { id: 'verify', label: 'Проверка бухгалтеров', icon: ShieldCheck },
            { id: 'users', label: 'Все регистрации', icon: Users },
            { id: 'activity', label: 'Активность', icon: TrendingUp },
            { id: 'support', label: 'Поддержка', icon: Headphones },
            { id: 'registry', label: 'Реестр БИН', icon: ShieldCheck, external: '/admin/registry' } as any,
          ] as const).map(v => (
            <button key={v.id} onClick={() => (v as any).external ? router.push((v as any).external) : setView(v.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${view === v.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              <v.icon className="w-4 h-4" /> {v.label}
            </button>
          ))}
        </div>

        {/* ===== VERIFY TAB ===== */}
        {view === 'verify' && (<>
        {/* Filters */}
        <div className="flex gap-2 mb-5">
          {([
            { id: 'pending', label: 'На проверке' },
            { id: 'verified', label: 'Верифицированные' },
            { id: 'all', label: 'Все' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === f.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Accountants list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Проверка бухгалтеров</h2>
            <span className="text-xs text-gray-400">({filtered.length})</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <BadgeCheck className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">Нет бухгалтеров в этой категории</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(acc => (
                <div key={acc.id} onClick={() => setSelected(acc)}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                    {(acc.full_name || acc.email)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{acc.full_name || 'Без имени'}</p>
                      {acc.verification_status === 'verified' && <BadgeCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{acc.email} · {acc.city}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    acc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                    acc.verification_status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {acc.verification_status === 'verified' ? 'Проверен' : acc.verification_status === 'pending' ? 'На проверке' : 'Новый'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        </>)}

        {/* ===== USERS TAB ===== */}
        {view === 'users' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Все регистрации</h2>
              <span className="text-xs text-gray-400">({allUsers.length})</span>
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Поиск по почте, имени, компании..."
                className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-full sm:w-64 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="divide-y divide-gray-50">
              {allUsers.filter(u => {
                if (!userSearch.trim()) return true;
                const q = userSearch.toLowerCase();
                const comps = (companiesByUser[u.id] || []).join(' ').toLowerCase();
                return (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q) || comps.includes(q);
              }).map(u => {
                const userTasks = allTasks.filter(t => t.client_id === u.id).length;
                const userDocs = allDocs.filter(d => d.owner_id === u.id).length;
                const comps = companiesByUser[u.id] || [];
                return (
                  <div key={u.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${u.role === 'accountant' ? 'bg-blue-100 text-blue-700' : u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {(u.full_name || u.email || '?')[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 text-sm">{u.full_name || 'Без имени'}</p>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${u.role === 'accountant' ? 'bg-blue-50 text-blue-600' : u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {u.role === 'accountant' ? 'Бухгалтер' : u.role === 'admin' ? 'Админ' : 'Заказчик'}
                          </span>
                          {u.verification_status === 'verified' && <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />}
                          {u.subscription_plan && u.subscription_plan !== 'free' && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.subscription_plan === 'pro' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.subscription_plan === 'pro' ? '👑 Pro' : '⚡ Business'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u.email}{u.phone ? ` · ${u.phone}` : ''}{u.city ? ` · ${u.city}` : ''}</p>
                        {comps.length > 0 && <p className="text-xs text-gray-500 mt-0.5">🏢 {comps.join(', ')}</p>}
                      </div>
                      <div className="text-right flex-shrink-0 text-xs text-gray-400">
                        <p>{new Date(u.created_at).toLocaleDateString('ru-RU')}</p>
                        <p className="mt-0.5">{userTasks} задач · {userDocs} док.</p>
                        {u.role !== 'admin' && (
                          <button onClick={() => writeToUser(u.id)}
                            className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-semibold hover:bg-blue-100">
                            <MessageSquare className="w-3 h-3" /> Написать
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Управление тарифом (заказчики и бухгалтеры) */}
                    {u.role !== 'admin' && (
                      <div className="flex items-center gap-1.5 mt-2 ml-13 pl-13 flex-wrap">
                        <span className="text-[10px] text-gray-400 mr-1">Тариф{u.role === 'accountant' ? ' (бухгалтер)' : ''}:</span>
                        {(['free', 'business', 'pro'] as const).map(pl => (
                          <button key={pl} onClick={() => setUserPlan(u.id, pl)}
                            className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors ${(u.subscription_plan || 'free') === pl ? (pl === 'pro' ? 'bg-violet-600 text-white' : pl === 'business' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-white') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            {pl === 'free' ? 'Free' : pl === 'business' ? 'Business' : 'Pro'}
                          </button>
                        ))}
                        {u.subscription_until && u.subscription_plan !== 'free' && (
                          <span className="text-[10px] text-gray-400">до {new Date(u.subscription_until).toLocaleDateString('ru-RU')}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== ACTIVITY TAB ===== */}
        {view === 'activity' && (
          <div className="space-y-5">
            {/* Активность инструментов — по пользователям */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-violet-600" />
                <h2 className="font-semibold text-gray-900">Инструменты — последняя активность</h2>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {toolUsage.length === 0 ? <p className="py-10 text-center text-gray-400 text-sm">Пока нет активности</p> : (() => {
                  // группируем по пользователю: последний инструмент + список последних
                  const byUser: Record<string, any[]> = {};
                  toolUsage.forEach(r => { (byUser[r.user_id] = byUser[r.user_id] || []).push(r); });
                  const rows = Object.entries(byUser).map(([uid, list]) => ({ uid, last: list[0], tools: list }));
                  rows.sort((a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime());
                  return rows.map(({ uid, last, tools }) => {
                    const u = allUsers.find(x => x.id === uid);
                    const uniqueTools = Array.from(new Set(tools.map(t => t.tool)));
                    return (
                      <div key={uid} className="px-6 py-3 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {(u?.full_name || u?.email || '?')[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u?.full_name || u?.email || '—'}</p>
                            <p className="text-xs text-gray-400">последний: <span className="text-violet-600 font-medium">{last.tool}</span></p>
                          </div>
                          <p className="text-xs text-gray-400 flex-shrink-0">{new Date(last.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2 ml-11">
                          {uniqueTools.slice(0, 8).map((tn, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{tn}</span>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Лента использования (все подряд) */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Лента открытий инструментов</h2>
                <span className="text-xs text-gray-400">({toolUsage.length})</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {toolUsage.slice(0, 60).map((r, i) => {
                  const u = allUsers.find(x => x.id === r.user_id);
                  return (
                    <div key={i} className="px-6 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm">
                      <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-full font-medium flex-shrink-0">{r.tool}</span>
                      <span className="flex-1 min-w-0 truncate text-gray-600">{u?.full_name || u?.email || '—'}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{new Date(r.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <Briefcase className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h2 className="font-semibold text-gray-900">Созданные задачи</h2>
                <span className="text-xs text-gray-400">({filteredTasks.length}{filteredTasks.length !== allTasks.length ? ` из ${allTasks.length}` : ''})</span>
                <div className="flex-1 min-w-[160px] flex flex-wrap gap-2 justify-end">
                  <input value={taskSearch} onChange={e => setTaskSearch(e.target.value)} placeholder="Поиск по названию, заказчику…"
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 w-48" />
                  <select value={taskStatusFilter} onChange={e => setTaskStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">Все статусы</option>
                    <option value="open">Открыта</option>
                    <option value="in_progress">В работе</option>
                    <option value="completed">Завершена</option>
                    <option value="paid">Оплачена</option>
                    <option value="cancelled">Отменена</option>
                  </select>
                </div>
              </div>
              <div className="divide-y divide-gray-50 max-h-[32rem] overflow-y-auto">
                {filteredTasks.length === 0 ? <p className="py-10 text-center text-gray-400 text-sm">{allTasks.length === 0 ? 'Нет задач' : 'Ничего не найдено по фильтру'}</p> :
                filteredTasks.map(tk => {
                  const owner = allUsers.find(u => u.id === tk.client_id);
                  return (
                    <div key={tk.id} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                      <button onClick={() => setSelectedTask(tk)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">{tk.title}</p>
                        <p className="text-xs text-gray-400">{owner?.full_name || owner?.email || '—'} · {tk.city} · {tk.category}</p>
                      </button>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tk.status === 'open' ? 'bg-emerald-50 text-emerald-600' : tk.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : tk.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>{taskStatusLabel(tk.status)}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(tk.created_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setSelectedTask(tk)} title="Посмотреть содержимое"
                          className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteTask(tk)} disabled={deletingTaskId === tk.id} title="Удалить задачу"
                          className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 disabled:opacity-40 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Созданные документы</h2>
                <span className="text-xs text-gray-400">({allDocs.length})</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
                {allDocs.length === 0 ? <p className="py-10 text-center text-gray-400 text-sm">Нет документов</p> :
                allDocs.map(d => {
                  const owner = allUsers.find(u => u.id === d.owner_id);
                  const typeLabel = d.type === 'invoice' ? 'Счёт' : d.type === 'avr' ? 'АВР' : 'Счёт-фактура';
                  return (
                    <div key={d.id} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{typeLabel} №{d.number}</p>
                        <p className="text-xs text-gray-400">{owner?.full_name || owner?.email || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-gray-700">{Number(d.total).toLocaleString()} ₸</p>
                        <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString('ru-RU')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== SUPPORT TAB ===== */}
        {view === 'support' && (
          <div className="grid md:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
            {/* Список тикетов */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 text-sm">{t('sup.adminTitle')}</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                {tickets.length === 0 ? (
                  <p className="py-8 text-center text-gray-400 text-sm">{t('sup.noTickets')}</p>
                ) : tickets.map(tk => {
                  const u = allUsers.find(x => x.id === tk.user_id);
                  return (
                    <button key={tk.id} onClick={() => openTicket(tk)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${activeTicket?.id === tk.id ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-gray-900 text-sm truncate">{u?.full_name || u?.email || '—'}</p>
                        {tk.unread_admin > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">{tk.unread_admin}</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{tk.last_message || '—'}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Чат */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
              {!activeTicket ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">{t('sup.selectTicket')}</div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-gray-900 text-sm">
                      {(allUsers.find(x => x.id === activeTicket.user_id)?.full_name) || (allUsers.find(x => x.id === activeTicket.user_id)?.email) || '—'}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
                    {ticketMsgs.map(m => (
                      <div key={m.id} className={`flex ${m.is_admin ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md px-4 py-2.5 rounded-2xl text-sm ${m.is_admin ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                          <p className="whitespace-pre-wrap break-words">{m.content}</p>
                          <p className={`text-[10px] mt-1 ${m.is_admin ? 'text-blue-200' : 'text-gray-400'}`}>
                            {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 p-3 flex items-center gap-2">
                    <input value={supReply} onChange={e => setSupReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); replyTicket(); } }}
                      placeholder={t('sup.reply')}
                      className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    <button onClick={replyTicket} disabled={!supReply.trim()}
                      className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white flex items-center justify-center">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Task detail modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Задача</h3>
              <button onClick={() => setSelectedTask(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900">{selectedTask.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${selectedTask.status === 'open' ? 'bg-emerald-50 text-emerald-600' : selectedTask.status === 'in_progress' ? 'bg-blue-50 text-blue-600' : selectedTask.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                    {taskStatusLabel(selectedTask.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">ID: {selectedTask.id}</p>
              </div>

              {selectedTask.description && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Описание</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Заказчик</p>
                  <p className="font-medium text-gray-900">
                    {allUsers.find(u => u.id === selectedTask.client_id)?.full_name || allUsers.find(u => u.id === selectedTask.client_id)?.email || '—'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Бухгалтер</p>
                  <p className="font-medium text-gray-900">
                    {selectedTask.accountant_id ? (allUsers.find(u => u.id === selectedTask.accountant_id)?.full_name || allUsers.find(u => u.id === selectedTask.accountant_id)?.email || '—') : 'Не назначен'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Категория</p>
                  <p className="font-medium text-gray-900">{selectedTask.category || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Город</p>
                  <p className="font-medium text-gray-900">{selectedTask.city || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> Бюджет</p>
                  <p className="font-medium text-gray-900">{selectedTask.budget ? Number(selectedTask.budget).toLocaleString('ru-RU') + ' ₸' : '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Итоговая цена</p>
                  <p className="font-medium text-gray-900">{selectedTask.final_price ? Number(selectedTask.final_price).toLocaleString('ru-RU') + ' ₸' : '—'}</p>
                </div>
                {selectedTask.deadline && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Срок</p>
                    <p className="font-medium text-gray-900">{new Date(selectedTask.deadline).toLocaleDateString('ru-RU')}</p>
                  </div>
                )}
                {selectedTask.company_id && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Компания</p>
                    <p className="font-medium text-gray-900">{companiesById[selectedTask.company_id] || '—'}</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Создана</p>
                  <p className="font-medium text-gray-900">{new Date(selectedTask.created_at).toLocaleString('ru-RU')}</p>
                </div>
                {selectedTask.paid_by_client && (
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-xs text-emerald-600 mb-1">Оплата</p>
                    <p className="font-medium text-emerald-700">Оплачено заказчиком</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => deleteTask(selectedTask)} disabled={deletingTaskId === selectedTask.id}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 disabled:opacity-50 py-3 rounded-xl font-semibold text-sm transition-colors">
                  <Trash2 className="w-4 h-4" /> {deletingTaskId === selectedTask.id ? 'Удаление…' : 'Удалить задачу'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Проверка бухгалтера</h3>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {(selected.full_name || selected.email)[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selected.full_name || 'Без имени'}</p>
                  <p className="text-sm text-gray-400">{selected.email}</p>
                  <p className="text-xs text-gray-400">{selected.city} · {selected.phone || 'нет телефона'}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">ИИН</p>
                  <p className="font-medium text-gray-900">{selected.iin || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">Опыт работы</p>
                  <p className="font-medium text-gray-900">{selected.experience_years || 0} лет</p>
                </div>
              </div>

              {selected.bio && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">О себе</p>
                  <p className="text-sm text-gray-700">{selected.bio}</p>
                </div>
              )}

              {selected.specialization?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selected.specialization.map(s => <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{s}</span>)}
                </div>
              )}

              {/* Documents */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Документы</p>
                <div className="grid grid-cols-2 gap-2">
                  <DocLink label="Удостоверение" url={selected.id_card_url} />
                  <DocLink label="Селфи" url={selected.selfie_url} />
                  {selected.diploma_urls?.map((u, i) => <DocLink key={i} label={`Диплом ${i+1}`} url={u} />)}
                  {selected.certificate_urls?.map((u, i) => <DocLink key={i} label={`Сертификат ${i+1}`} url={u} />)}
                </div>
              </div>

              {/* Verification toggles */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Проверка</p>
                <div className="space-y-2">
                  {([
                    { key: 'identity_verified', label: 'Личность подтверждена (ИИН + удостоверение)' },
                    { key: 'documents_verified', label: 'Документы проверены (дипломы, сертификаты)' },
                    { key: 'experience_verified', label: 'Опыт работы подтверждён' },
                  ] as const).map(item => (
                    <label key={item.key} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" checked={!!selected[item.key]}
                        onChange={e => updateVerification(selected, { [item.key]: e.target.checked } as any)}
                        disabled={saving}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => verifyAll(selected)} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  <Check className="w-4 h-4" /> Верифицировать
                </button>
                <button onClick={() => rejectAll(selected)} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 py-3 rounded-xl font-semibold text-sm transition-colors">
                  <X className="w-4 h-4" /> Отклонить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string }) {
  const [loading, setLoading] = useState(false);

  const openDoc = async () => {
    if (!url) return;
    setLoading(true);
    try {
      // url format: "path::base64name" or just "path"
      const [path, encodedName] = url.split('::');
      let fileName = label;
      if (encodedName) {
        try { fileName = decodeURIComponent(atob(encodedName)); } catch {}
      }
      const { data, error } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(path, 300);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Нет ссылки');

      // Download with original filename and extension
      const res = await fetch(data.signedUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert('Не удалось открыть документ: ' + (err?.message || 'нет доступа. Проверьте политики Storage в Supabase'));
    } finally {
      setLoading(false);
    }
  };

  if (!url) return (
    <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-xl text-gray-300 text-xs">
      <FileText className="w-4 h-4" /> {label}: не загружен
    </div>
  );
  return (
    <button onClick={openDoc} disabled={loading}
      className="flex items-center justify-between gap-2 p-3 border border-blue-200 bg-blue-50 rounded-xl text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors w-full text-left">
      <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {loading ? 'Открываем...' : label}</span>
      <ExternalLink className="w-3.5 h-3.5" />
    </button>
  );
}
export const dynamic = 'force-dynamic';
