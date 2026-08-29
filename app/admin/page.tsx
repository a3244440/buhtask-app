'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, BadgeCheck, Clock, X, Check, FileText, User, CreditCard, ExternalLink, Users, Briefcase, TrendingUp, AlertCircle, Headphones, Send, MessageSquare, Eye, Trash2, Building2, Calendar, Wallet, Radio, Newspaper, Plus, Pencil, Globe, Award, MapPin, GripVertical } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import { useI18n } from '@/lib/i18n';
import { attributionLabel } from '@/lib/attribution';

const CONTEST_CATEGORY_LABEL: Record<string, string> = {
  nds: 'НДС', kpn_ipn: 'КПН/ИПН', form910: 'Форма 910', trud: 'Трудовое право', obshee: 'Общий бухучёт',
};

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
  const [view, setView] = useState<'verify' | 'users' | 'activity' | 'support' | 'blog' | 'contest'>('verify');
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [ticketMsgs, setTicketMsgs] = useState<any[]>([]);
  const [supReply, setSupReply] = useState('');
  const [adminId, setAdminId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allCompanies, setAllCompanies] = useState<any[]>([]);
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

  // ===== Блог / SEO-статьи =====
  const [articles, setArticles] = useState<any[]>([]);
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [articleForm, setArticleForm] = useState({
    slug: '', title: '', meta_description: '', excerpt: '', content: '',
    category: 'news', source_name: '', source_url: '', cover_emoji: '📰', published: false,
  });
  const [savingArticle, setSavingArticle] = useState(false);
  const [articleError, setArticleError] = useState('');

  // ===== Рейтинг бухгалтеров (конкурс) =====
  const [contestEntries, setContestEntries] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [entryForm, setEntryForm] = useState({
    accountant_id: '', rank_position: 1, city: '', company_name: '', badge_type: '', note: '', published: false,
  });
  const [accountantSearch, setAccountantSearch] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [entryError, setEntryError] = useState('');

  // ===== Квиз конкурса =====
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [questionForm, setQuestionForm] = useState({
    category: 'obshee', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', is_active: false,
  });
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [contestSubTab, setContestSubTab] = useState<'entries' | 'questions' | 'results'>('entries');

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

    // Статьи блога (для SEO) — все, включая черновики
    try {
      const { data: arts } = await supabase.from('articles').select('*').order('created_at', { ascending: false });
      setArticles(arts || []);
    } catch { setArticles([]); }

    // Рейтинг бухгалтеров — все записи, включая неопубликованные
    try {
      const { data: entries } = await supabase.from('contest_entries').select('*').order('rank_position', { ascending: true });
      setContestEntries(entries || []);
    } catch { setContestEntries([]); }

    // Квиз конкурса — банк вопросов и результаты попыток
    try {
      const { data: qs } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: false });
      setQuizQuestions(qs || []);
    } catch { setQuizQuestions([]); }
    try {
      const { data: att } = await supabase.from('quiz_attempts').select('*').eq('status', 'completed').order('score', { ascending: false }).order('time_taken_seconds', { ascending: true });
      setQuizAttempts(att || []);
    } catch { setQuizAttempts([]); }

    // Компании по пользователям
    const { data: comps } = await supabase.from('companies').select('id,owner_id,name,bin');
    setAllCompanies(comps || []);
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

  // ===== Блог / SEO =====
  const slugify = (s: string) => s.toLowerCase().trim()
    .replace(/[а-яё]/g, (c) => ({ а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' } as Record<string, string>)[c] || c)
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const openNewArticle = () => {
    setEditingArticle('new');
    setArticleForm({ slug: '', title: '', meta_description: '', excerpt: '', content: '', category: 'news', source_name: '', source_url: '', cover_emoji: '📰', published: false });
    setArticleError('');
  };

  const openEditArticle = (a: any) => {
    setEditingArticle(a);
    setArticleForm({
      slug: a.slug, title: a.title, meta_description: a.meta_description || '', excerpt: a.excerpt || '',
      content: a.content || '', category: a.category || 'news', source_name: a.source_name || '',
      source_url: a.source_url || '', cover_emoji: a.cover_emoji || '📰', published: a.published,
    });
    setArticleError('');
  };

  const saveArticle = async () => {
    if (!articleForm.title.trim()) { setArticleError('Укажите заголовок'); return; }
    if (!articleForm.content.trim()) { setArticleError('Добавьте текст статьи'); return; }
    const slug = articleForm.slug.trim() || slugify(articleForm.title);
    if (!slug) { setArticleError('Не удалось сформировать slug — укажите его вручную'); return; }
    setSavingArticle(true);
    setArticleError('');

    const payload = {
      slug,
      title: articleForm.title.trim(),
      meta_description: articleForm.meta_description.trim() || articleForm.excerpt.trim().slice(0, 160) || null,
      excerpt: articleForm.excerpt.trim() || null,
      content: articleForm.content,
      category: articleForm.category,
      source_name: articleForm.source_name.trim() || null,
      source_url: articleForm.source_url.trim() || null,
      cover_emoji: articleForm.cover_emoji || '📰',
      published: articleForm.published,
      published_at: articleForm.published ? (editingArticle?.published_at || new Date().toISOString()) : null,
      author_id: adminId || null,
    };

    if (editingArticle === 'new') {
      const { data, error } = await supabase.from('articles').insert(payload).select().single();
      setSavingArticle(false);
      if (error) { setArticleError(error.message.includes('duplicate') ? 'Такой slug уже используется — измените его' : error.message); return; }
      setArticles(prev => [data, ...prev]);
      setEditingArticle(null);
    } else {
      const { data, error } = await supabase.from('articles').update(payload).eq('id', editingArticle.id).select().single();
      setSavingArticle(false);
      if (error) { setArticleError(error.message.includes('duplicate') ? 'Такой slug уже используется — измените его' : error.message); return; }
      setArticles(prev => prev.map(a => a.id === data.id ? data : a));
      setEditingArticle(null);
    }
  };

  const deleteArticle = async (a: any) => {
    if (!window.confirm(`Удалить статью «${a.title}»?`)) return;
    const { error } = await supabase.from('articles').delete().eq('id', a.id);
    if (error) { alert('Ошибка удаления: ' + error.message); return; }
    setArticles(prev => prev.filter(x => x.id !== a.id));
  };

  const togglePublish = async (a: any) => {
    const published = !a.published;
    const { data, error } = await supabase.from('articles')
      .update({ published, published_at: published ? (a.published_at || new Date().toISOString()) : a.published_at })
      .eq('id', a.id).select().single();
    if (error) { alert('Ошибка: ' + error.message); return; }
    setArticles(prev => prev.map(x => x.id === data.id ? data : x));
  };

  // ===== Рейтинг бухгалтеров =====
  const openNewEntry = () => {
    const nextRank = contestEntries.length > 0 ? Math.max(...contestEntries.map(e => e.rank_position)) + 1 : 4;
    setEditingEntry('new');
    setEntryForm({ accountant_id: '', rank_position: nextRank, city: '', company_name: '', badge_type: '', note: '', published: false });
    setAccountantSearch('');
    setEntryError('');
  };

  const openEditEntry = (e: any) => {
    setEditingEntry(e);
    const acc = accountants.find(a => a.id === e.accountant_id);
    setEntryForm({
      accountant_id: e.accountant_id || '', rank_position: e.rank_position, city: e.city || acc?.city || '',
      company_name: e.company_name || '', badge_type: e.badge_type || '', note: e.note || '', published: e.published,
    });
    setAccountantSearch(acc?.full_name || '');
    setEntryError('');
  };

  const saveEntry = async () => {
    if (!entryForm.accountant_id) { setEntryError('Выберите бухгалтера'); return; }
    if (!entryForm.rank_position || entryForm.rank_position < 1) { setEntryError('Укажите место (число от 1)'); return; }
    setSavingEntry(true);
    setEntryError('');

    const acc = accountants.find(a => a.id === entryForm.accountant_id);
    const payload = {
      accountant_id: entryForm.accountant_id,
      rank_position: entryForm.rank_position,
      full_name: acc?.full_name || acc?.email || null,
      avatar_url: (acc as any)?.avatar_url || null,
      city: entryForm.city.trim() || acc?.city || null,
      company_name: entryForm.company_name.trim() || null,
      badge_type: entryForm.rank_position <= 3 ? 'quiz_winner' : (entryForm.badge_type || null),
      note: entryForm.note.trim() || null,
      published: entryForm.published,
    };

    if (editingEntry === 'new') {
      const { data, error } = await supabase.from('contest_entries').insert(payload).select().single();
      setSavingEntry(false);
      if (error) { setEntryError(error.message.includes('duplicate') ? 'Это место в сезоне уже занято другим участником' : error.message); return; }
      setContestEntries(prev => [...prev, data].sort((a, b) => a.rank_position - b.rank_position));
      setEditingEntry(null);
    } else {
      const { data, error } = await supabase.from('contest_entries').update(payload).eq('id', editingEntry.id).select().single();
      setSavingEntry(false);
      if (error) { setEntryError(error.message.includes('duplicate') ? 'Это место в сезоне уже занято другим участником' : error.message); return; }
      setContestEntries(prev => prev.map(e => e.id === data.id ? data : e).sort((a, b) => a.rank_position - b.rank_position));
      setEditingEntry(null);
    }
  };

  const deleteEntry = async (e: any) => {
    if (!window.confirm('Убрать участника из рейтинга?')) return;
    const { error } = await supabase.from('contest_entries').delete().eq('id', e.id);
    if (error) { alert('Ошибка удаления: ' + error.message); return; }
    setContestEntries(prev => prev.filter(x => x.id !== e.id));
  };

  const toggleEntryPublish = async (e: any) => {
    const published = !e.published;
    const { data, error } = await supabase.from('contest_entries').update({ published }).eq('id', e.id).select().single();
    if (error) { alert('Ошибка: ' + error.message + (error.message.includes('duplicate') ? ' — это место уже занято другим опубликованным участником' : '')); return; }
    setContestEntries(prev => prev.map(x => x.id === data.id ? data : x));
  };

  const filteredAccountantsForContest = accountants.filter(a =>
    !accountantSearch.trim() || `${a.full_name} ${a.email} ${a.city}`.toLowerCase().includes(accountantSearch.toLowerCase())
  );

  // ===== Квиз конкурса =====
  const openNewQuestion = () => {
    setEditingQuestion('new');
    setQuestionForm({ category: 'obshee', question: '', options: ['', '', '', ''], correct_index: 0, explanation: '', is_active: false });
    setQuestionError('');
  };

  const openEditQuestion = (q: any) => {
    setEditingQuestion(q);
    setQuestionForm({
      category: q.category, question: q.question, options: [...q.options], correct_index: q.correct_index,
      explanation: q.explanation || '', is_active: q.is_active,
    });
    setQuestionError('');
  };

  const saveQuestion = async () => {
    if (!questionForm.question.trim()) { setQuestionError('Укажите текст вопроса'); return; }
    if (questionForm.options.some(o => !o.trim())) { setQuestionError('Заполните все 4 варианта ответа'); return; }
    setSavingQuestion(true);
    setQuestionError('');

    const payload = {
      category: questionForm.category, question: questionForm.question.trim(),
      options: questionForm.options.map(o => o.trim()), correct_index: questionForm.correct_index,
      explanation: questionForm.explanation.trim() || null, is_active: questionForm.is_active,
    };

    if (editingQuestion === 'new') {
      const { data, error } = await supabase.from('quiz_questions').insert(payload).select().single();
      setSavingQuestion(false);
      if (error) { setQuestionError(error.message); return; }
      setQuizQuestions(prev => [data, ...prev]);
      setEditingQuestion(null);
    } else {
      const { data, error } = await supabase.from('quiz_questions').update(payload).eq('id', editingQuestion.id).select().single();
      setSavingQuestion(false);
      if (error) { setQuestionError(error.message); return; }
      setQuizQuestions(prev => prev.map(q => q.id === data.id ? data : q));
      setEditingQuestion(null);
    }
  };

  const deleteQuestion = async (q: any) => {
    if (!window.confirm('Удалить вопрос из банка квиза?')) return;
    const { error } = await supabase.from('quiz_questions').delete().eq('id', q.id);
    if (error) { alert('Ошибка удаления: ' + error.message + (error.message.includes('foreign key') ? ' — вопрос уже использован в чьей-то попытке, удалить нельзя, можно только деактивировать' : '')); return; }
    setQuizQuestions(prev => prev.filter(x => x.id !== q.id));
  };

  const toggleQuestionActive = async (q: any) => {
    const is_active = !q.is_active;
    const { data, error } = await supabase.from('quiz_questions').update({ is_active }).eq('id', q.id).select().single();
    if (error) { alert('Ошибка: ' + error.message); return; }
    setQuizQuestions(prev => prev.map(x => x.id === data.id ? data : x));
  };

  // Одним кликом переносит результат квиза бухгалтера в топ-N рейтинга (contest_entries)
  const promoteAttemptToRank = async (attempt: any, rank: 1 | 2 | 3) => {
    const existingAtRank = contestEntries.find(e => e.rank_position === rank && e.published);
    if (existingAtRank && !window.confirm(`Место ${rank} сейчас занято другим участником — заменить?`)) return;

    const acc = accountants.find(a => a.id === attempt.accountant_id);
    if (!acc) { alert('Профиль бухгалтера не найден'); return; }

    if (existingAtRank) {
      await supabase.from('contest_entries').update({ published: false }).eq('id', existingAtRank.id);
    }

    const payload = {
      accountant_id: acc.id, rank_position: rank, full_name: acc.full_name || acc.email,
      avatar_url: (acc as any).avatar_url || null, city: acc.city || null, badge_type: 'quiz_winner',
      note: `Результат квиза: ${attempt.score}/${attempt.total_questions}`, published: true,
    };

    const already = contestEntries.find(e => e.accountant_id === acc.id);
    let error;
    if (already) {
      ({ error } = await supabase.from('contest_entries').update(payload).eq('id', already.id));
    } else {
      ({ error } = await supabase.from('contest_entries').insert(payload));
    }
    if (error) { alert('Ошибка: ' + error.message); return; }

    const { data: entries } = await supabase.from('contest_entries').select('*').order('rank_position', { ascending: true });
    setContestEntries(entries || []);
    alert(`${acc.full_name || acc.email} назначен(а) на место ${rank}`);
  };

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
            { id: 'blog', label: 'Блог / SEO', icon: Newspaper },
            { id: 'contest', label: 'Рейтинг', icon: Award },
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
          <div className="space-y-5">
            {/* Сводка по источникам переходов — откуда приходят регистрации */}
            {(() => {
              const bySource: Record<string, number> = {};
              allUsers.forEach(u => {
                const label = attributionLabel(u);
                bySource[label] = (bySource[label] || 0) + 1;
              });
              const rows = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 8);
              if (rows.length === 0) return null;
              const max = Math.max(...rows.map(r => r[1]));
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Radio className="w-5 h-5 text-blue-600" />
                    <h2 className="font-semibold text-gray-900">Источники регистраций</h2>
                  </div>
                  <div className="space-y-2">
                    {rows.map(([label, count]) => (
                      <div key={label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-40 flex-shrink-0 truncate">{label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8 text-right flex-shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Radio className="w-3 h-3" /> {attributionLabel(u)}
                          {u.utm_campaign && <span className="text-gray-400">· {u.utm_campaign}</span>}
                        </p>
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
                  const comp = allCompanies.find(c => c.id === tk.company_id);
                  return (
                    <div key={tk.id} className="px-6 py-3 hover:bg-gray-50 flex items-center gap-3">
                      <button onClick={() => setSelectedTask(tk)} className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">{tk.title}</p>
                        <p className="text-xs text-gray-400 truncate">
                          👤 {owner?.full_name || owner?.email || '—'} · {tk.city} · {tk.category}
                          {comp && <span className="text-blue-500"> · 🏢 {comp.name}</span>}
                        </p>
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

        {/* ===== BLOG TAB (SEO) ===== */}
        {view === 'blog' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <Newspaper className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Блог / Новости</h2>
              <span className="text-xs text-gray-400">({articles.length})</span>
              <a href="/news" target="_blank" rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Globe className="w-3 h-3" /> Открыть страницу /news
              </a>
              <button onClick={openNewArticle}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Новая статья
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {articles.length === 0 ? (
                <p className="py-10 text-center text-gray-400 text-sm">
                  Пока нет статей. Добавьте первую — например, новость по мотивам изменений от salyk.gov.kz,
                  инструкцию или разбор сроков отчётности.
                </p>
              ) : articles.map(a => (
                <div key={a.id} className="px-6 py-3.5 hover:bg-gray-50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg flex-shrink-0">{a.cover_emoji || '📰'}</div>
                  <button onClick={() => openEditArticle(a)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 truncate">/news/{a.slug} {a.source_name ? `· по мотивам: ${a.source_name}` : ''}</p>
                  </button>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${a.published ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {a.published ? 'Опубликовано' : 'Черновик'}
                  </span>
                  <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">{new Date(a.created_at).toLocaleDateString('ru-RU')}</p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => togglePublish(a)} title={a.published ? 'Снять с публикации' : 'Опубликовать'}
                      className={`p-2 rounded-lg transition-colors ${a.published ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                      {a.published ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditArticle(a)} title="Редактировать" className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteArticle(a)} title="Удалить" className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CONTEST TAB (Рейтинг бухгалтеров) ===== */}
        {view === 'contest' && (
          <div>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'entries', label: 'Участники рейтинга' },
                { id: 'questions', label: `Вопросы квиза (${quizQuestions.filter(q => q.is_active).length}/${quizQuestions.length} активно)` },
                { id: 'results', label: `Результаты квиза (${quizAttempts.length})` },
              ].map(t => (
                <button key={t.id} onClick={() => setContestSubTab(t.id as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${contestSubTab === t.id ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                  {t.label}
                </button>
              ))}
            </div>

          {contestSubTab === 'entries' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <Award className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Участники рейтинга</h2>
              <span className="text-xs text-gray-400">({contestEntries.length})</span>
              <a href="/reyting" target="_blank" rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Globe className="w-3 h-3" /> Открыть страницу /reyting
              </a>
              <button onClick={openNewEntry}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Добавить участника
              </button>
            </div>
            <p className="px-6 pt-3 text-xs text-gray-400">
              Места 1–3 лучше назначать через вкладку «Результаты квиза» (кнопка «В топ-N») — так они действительно отражают
              квиз, а не ручной выбор. С 4-го места — обычный список/продвижение. Место в рамках сезона уникально среди опубликованных.
            </p>

            <div className="divide-y divide-gray-50 mt-2">
              {contestEntries.length === 0 ? (
                <p className="py-10 text-center text-gray-400 text-sm">Пока никого нет в рейтинге. Добавьте первого участника.</p>
              ) : contestEntries.map(e => {
                const acc = accountants.find(a => a.id === e.accountant_id);
                return (
                  <div key={e.id} className="px-6 py-3.5 hover:bg-gray-50 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${e.rank_position <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {e.rank_position}
                    </div>
                    <button onClick={() => openEditEntry(e)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">{acc?.full_name || acc?.email || e.full_name || 'Профиль не найден'}</p>
                      <p className="text-xs text-gray-400 truncate">{e.city || acc?.city || '—'}{e.company_name ? ` · ${e.company_name}` : ''}</p>
                    </button>
                    {e.badge_type === 'quiz_winner' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600 flex-shrink-0">По квизу</span>}
                    {e.badge_type === 'promoted' && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-violet-50 text-violet-600 flex-shrink-0">Продвигается</span>}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${e.published ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {e.published ? 'Опубликовано' : 'Черновик'}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => toggleEntryPublish(e)} title={e.published ? 'Снять с публикации' : 'Опубликовать'}
                        className={`p-2 rounded-lg transition-colors ${e.published ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                        {e.published ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEditEntry(e)} title="Редактировать" className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteEntry(e)} title="Убрать" className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {contestSubTab === 'questions' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Банк вопросов квиза</h2>
              <span className="text-xs text-gray-400">({quizQuestions.length})</span>
              <button onClick={openNewQuestion}
                className="ml-auto inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold">
                <Plus className="w-4 h-4" /> Добавить вопрос
              </button>
            </div>
            <p className="px-6 pt-3 text-xs text-gray-400">
              Только вопросы со статусом «Активен» реально попадают участникам в квиз. Черновики (в т.ч. посеянные автоматически)
              стоит вычитать перед активацией — часть формулировок/цифр могла устареть из-за изменений в законодательстве.
            </p>
            <div className="divide-y divide-gray-50 mt-2">
              {quizQuestions.length === 0 ? (
                <p className="py-10 text-center text-gray-400 text-sm">Вопросов пока нет.</p>
              ) : quizQuestions.map(q => (
                <div key={q.id} className="px-6 py-3.5 hover:bg-gray-50 flex items-center gap-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 flex-shrink-0">{CONTEST_CATEGORY_LABEL[q.category] || q.category}</span>
                  <button onClick={() => openEditQuestion(q)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">{q.question}</p>
                  </button>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${q.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {q.is_active ? 'Активен' : 'Черновик'}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleQuestionActive(q)} title={q.is_active ? 'Деактивировать' : 'Активировать'}
                      className={`p-2 rounded-lg transition-colors ${q.is_active ? 'hover:bg-amber-50 text-gray-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-gray-400 hover:text-emerald-600'}`}>
                      {q.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEditQuestion(q)} title="Редактировать" className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteQuestion(q)} title="Удалить" className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {contestSubTab === 'results' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-gray-900">Результаты квиза</h2>
              <span className="text-xs text-gray-400">({quizAttempts.length})</span>
            </div>
            <p className="px-6 pt-3 text-xs text-gray-400">Отсортировано по результату (лучший — сверху), при равном счёте — по скорости прохождения.</p>
            <div className="divide-y divide-gray-50 mt-2">
              {quizAttempts.length === 0 ? (
                <p className="py-10 text-center text-gray-400 text-sm">Пока никто не завершил квиз.</p>
              ) : quizAttempts.map((a, i) => {
                const acc = accountants.find(x => x.id === a.accountant_id);
                return (
                  <div key={a.id} className="px-6 py-3.5 hover:bg-gray-50 flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-gray-300 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{acc?.full_name || acc?.email || 'Профиль не найден'}</p>
                      <p className="text-xs text-gray-400 truncate">{acc?.city || '—'} · {a.time_taken_seconds ? `${Math.round(a.time_taken_seconds / 60)} мин` : '—'}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 flex-shrink-0">{a.score}/{a.total_questions}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {[1, 2, 3].map(rank => (
                        <button key={rank} onClick={() => promoteAttemptToRank(a, rank as 1 | 2 | 3)}
                          className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium">
                          В топ-{rank}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
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
                    {allUsers.find(u => u.id === selectedTask.client_id)?.full_name || '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {allUsers.find(u => u.id === selectedTask.client_id)?.email || ''}
                    {allUsers.find(u => u.id === selectedTask.client_id)?.phone ? ` · ${allUsers.find(u => u.id === selectedTask.client_id)?.phone}` : ''}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" /> Компания</p>
                  <p className="font-medium text-gray-900">
                    {allCompanies.find(c => c.id === selectedTask.company_id)?.name || 'Не указана'}
                  </p>
                  {allCompanies.find(c => c.id === selectedTask.company_id)?.bin && (
                    <p className="text-xs text-gray-400 mt-0.5">БИН: {allCompanies.find(c => c.id === selectedTask.company_id)?.bin}</p>
                  )}
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

      {/* Article editor modal */}
      {editingArticle && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingArticle(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-900">{editingArticle === 'new' ? 'Новая статья' : 'Редактирование статьи'}</h3>
              <button onClick={() => setEditingArticle(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              {articleError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{articleError}</div>
              )}

              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Иконка</label>
                  <input value={articleForm.cover_emoji} onChange={e => setArticleForm(f => ({ ...f, cover_emoji: e.target.value }))}
                    maxLength={4} className="w-16 px-3 py-2.5 border border-gray-200 rounded-xl text-center text-lg outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Заголовок</label>
                  <input value={articleForm.title} onChange={e => setArticleForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Например: Изменения по форме 910 с 1 июля 2026"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ссылка (slug) — оставьте пустым, сформируется автоматически</label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 flex-shrink-0">buhtask.kz/news/</span>
                  <input value={articleForm.slug} onChange={e => setArticleForm(f => ({ ...f, slug: e.target.value }))}
                    placeholder={slugify(articleForm.title) || 'izmeneniya-po-forme-910'}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Категория</label>
                  <select value={articleForm.category} onChange={e => setArticleForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="news">Новость</option>
                    <option value="guide">Руководство</option>
                    <option value="update">Обновление платформы</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Источник (если по мотивам)</label>
                  <input value={articleForm.source_name} onChange={e => setArticleForm(f => ({ ...f, source_name: e.target.value }))}
                    placeholder="Например: salyk.gov.kz" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {articleForm.source_name && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Ссылка на источник</label>
                  <input value={articleForm.source_url} onChange={e => setArticleForm(f => ({ ...f, source_url: e.target.value }))}
                    placeholder="https://kgd.gov.kz/..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Краткое описание (для карточки и превью в соцсетях)</label>
                <textarea value={articleForm.excerpt} onChange={e => setArticleForm(f => ({ ...f, excerpt: e.target.value }))}
                  rows={2} placeholder="1-2 предложения — что нового и кого касается"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Meta description (для Google, до ~160 символов; если пусто — возьмётся краткое описание)</label>
                <input value={articleForm.meta_description} onChange={e => setArticleForm(f => ({ ...f, meta_description: e.target.value }))}
                  maxLength={200} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-[11px] text-gray-400 mt-1">{articleForm.meta_description.length}/160</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Текст статьи (Markdown: **жирный**, ## заголовок, - список)</label>
                <textarea value={articleForm.content} onChange={e => setArticleForm(f => ({ ...f, content: e.target.value }))}
                  rows={12} placeholder={'## Что изменилось\n\nОписание изменений...\n\n## Что нужно сделать\n\n- Пункт первый\n- Пункт второй'}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={articleForm.published} onChange={e => setArticleForm(f => ({ ...f, published: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Опубликовать сразу (иначе сохранится как черновик)</span>
              </label>

              <div className="flex gap-3 pt-2">
                {editingArticle !== 'new' && (
                  <button onClick={() => deleteArticle(editingArticle)}
                    className="px-4 flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 py-3 rounded-xl font-semibold text-sm transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={saveArticle} disabled={savingArticle}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {savingArticle ? 'Сохранение…' : (editingArticle === 'new' ? 'Создать статью' : 'Сохранить изменения')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contest entry editor modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingEntry(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-900">{editingEntry === 'new' ? 'Добавить в рейтинг' : 'Редактирование места'}</h3>
              <button onClick={() => setEditingEntry(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              {entryError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{entryError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Бухгалтер</label>
                <input value={accountantSearch} onChange={e => setAccountantSearch(e.target.value)}
                  placeholder="Поиск по имени, email, городу…"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
                <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
                  {filteredAccountantsForContest.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Никто не найден</p>
                  ) : filteredAccountantsForContest.slice(0, 30).map(a => (
                    <button key={a.id} onClick={() => { setEntryForm(f => ({ ...f, accountant_id: a.id, city: f.city || a.city || '' })); setAccountantSearch(a.full_name || a.email); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between ${entryForm.accountant_id === a.id ? 'bg-blue-50' : ''}`}>
                      <span className="truncate">{a.full_name || a.email}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{a.city}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Место</label>
                  <input type="number" min={1} value={entryForm.rank_position}
                    onChange={e => setEntryForm(f => ({ ...f, rank_position: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-[11px] text-gray-400 mt-1">{entryForm.rank_position <= 3 ? 'Заслуженное место — бейдж «По квизу» проставится автоматически' : 'Обычное место'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Город</label>
                  <input value={entryForm.city} onChange={e => setEntryForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Если пусто — возьмём из профиля"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Компания / бренд (необязательно)</label>
                <input value={entryForm.company_name} onChange={e => setEntryForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Например: ТОО «Ваш Бухгалтер»"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {entryForm.rank_position > 3 && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Бейдж</label>
                  <select value={entryForm.badge_type} onChange={e => setEntryForm(f => ({ ...f, badge_type: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Без бейджа</option>
                    <option value="promoted">Продвигается (партнёрское размещение)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Подпись под карточкой (необязательно)</label>
                <input value={entryForm.note} onChange={e => setEntryForm(f => ({ ...f, note: e.target.value }))}
                  placeholder="Например: «10 лет опыта, специализация — НДС»"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={entryForm.published} onChange={e => setEntryForm(f => ({ ...f, published: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Опубликовать сразу на странице /reyting</span>
              </label>

              <div className="flex gap-3 pt-2">
                {editingEntry !== 'new' && (
                  <button onClick={() => deleteEntry(editingEntry)}
                    className="px-4 flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 py-3 rounded-xl font-semibold text-sm transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={saveEntry} disabled={savingEntry}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {savingEntry ? 'Сохранение…' : (editingEntry === 'new' ? 'Добавить' : 'Сохранить изменения')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quiz question editor modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingQuestion(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-bold text-gray-900">{editingQuestion === 'new' ? 'Новый вопрос' : 'Редактирование вопроса'}</h3>
              <button onClick={() => setEditingQuestion(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="p-6 space-y-4">
              {questionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-2.5">{questionError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Категория</label>
                <select value={questionForm.category} onChange={e => setQuestionForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(CONTEST_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Текст вопроса</label>
                <textarea value={questionForm.question} onChange={e => setQuestionForm(f => ({ ...f, question: e.target.value }))}
                  rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Варианты ответа — отметьте кружком правильный</label>
                <div className="space-y-2">
                  {questionForm.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button type="button" onClick={() => setQuestionForm(f => ({ ...f, correct_index: i }))}
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${questionForm.correct_index === i ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                        {questionForm.correct_index === i && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <input value={opt} onChange={e => setQuestionForm(f => ({ ...f, options: f.options.map((o, oi) => oi === i ? e.target.value : o) }))}
                        placeholder={`Вариант ${i + 1}`} className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Пояснение (покажется участнику после ответа)</label>
                <textarea value={questionForm.explanation} onChange={e => setQuestionForm(f => ({ ...f, explanation: e.target.value }))}
                  rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={questionForm.is_active} onChange={e => setQuestionForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                <span className="text-sm text-gray-700">Активен (попадёт в квиз участникам)</span>
              </label>
              <p className="text-xs text-amber-600 -mt-2">Включайте только после проверки актуальности вопроса живым бухгалтером/налоговым консультантом.</p>

              <div className="flex gap-3 pt-2">
                {editingQuestion !== 'new' && (
                  <button onClick={() => deleteQuestion(editingQuestion)}
                    className="px-4 flex items-center justify-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 py-3 rounded-xl font-semibold text-sm transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={saveQuestion} disabled={savingQuestion}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 rounded-xl font-semibold text-sm transition-colors">
                  {savingQuestion ? 'Сохранение…' : (editingQuestion === 'new' ? 'Создать вопрос' : 'Сохранить изменения')}
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
