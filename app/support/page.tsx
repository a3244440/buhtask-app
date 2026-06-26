'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Send, Headphones } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import { useI18n } from '@/lib/i18n';

interface Msg { id: string; sender_id: string; is_admin: boolean; content: string; created_at: string; }

export default function SupportPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }
    setUserId(user.id);

    // найти/создать тикет пользователя
    let { data: ticket } = await supabase.from('support_tickets').select('*').eq('user_id', user.id).maybeSingle();
    if (!ticket) {
      const { data: created } = await supabase.from('support_tickets')
        .insert({ user_id: user.id, status: 'open' }).select().maybeSingle();
      ticket = created;
    }
    if (ticket) {
      setTicketId(ticket.id);
      // сбросить непрочитанные для пользователя
      await supabase.from('support_tickets').update({ unread_user: 0 }).eq('id', ticket.id);
      const { data: msgs } = await supabase.from('support_messages')
        .select('*').eq('ticket_id', ticket.id).order('created_at', { ascending: true });
      setMessages(msgs || []);

      // realtime
      supabase.channel(`support:${ticket.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticket.id}` },
          (payload) => {
            const m = payload.new as Msg;
            setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          })
        .subscribe();
    }
    setLoading(false);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || !ticketId || sending) return;
    setSending(true);
    setInput('');
    const tempId = 'temp-' + Date.now();
    setMessages(prev => [...prev, { id: tempId, sender_id: userId, is_admin: false, content, created_at: new Date().toISOString() }]);

    const { data } = await supabase.from('support_messages')
      .insert({ ticket_id: ticketId, sender_id: userId, is_admin: false, content }).select().maybeSingle();
    if (data) setMessages(prev => prev.map(m => m.id === tempId ? data : m));

    await supabase.from('support_tickets').update({
      last_message: content, last_from: 'user', status: 'open',
      updated_at: new Date().toISOString(),
    }).eq('id', ticketId);
    // увеличить непрочитанные для админа
    const { data: tk } = await supabase.from('support_tickets').select('unread_admin').eq('id', ticketId).maybeSingle();
    await supabase.from('support_tickets').update({ unread_admin: (tk?.unread_admin || 0) + 1 }).eq('id', ticketId);

    setSending(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader title={t('sup.title')} />
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden" style={{ minHeight: '70vh' }}>
          {/* Шапка */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{t('sup.support')}</p>
              <p className="text-xs text-gray-400">{t('sup.subtitle')}</p>
            </div>
          </div>

          {/* Сообщения */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {/* Приветствие от поддержки */}
            <div className="flex justify-start">
              <div className="max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl rounded-bl-sm bg-gray-100 text-gray-900 text-sm">
                {t('sup.greeting')}
              </div>
            </div>
            {messages.map(m => (
              <div key={m.id} className={`flex ${!m.is_admin && m.sender_id === userId ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${!m.is_admin && m.sender_id === userId ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}>
                  {m.is_admin && <p className="text-[10px] font-semibold text-blue-600 mb-0.5">{t('sup.support')}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${!m.is_admin && m.sender_id === userId ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(m.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Ввод */}
          <div className="border-t border-gray-100 p-3 flex items-center gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={t('sup.placeholder')}
              className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={send} disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
export const dynamic = 'force-dynamic';
