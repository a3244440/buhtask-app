'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, BadgeCheck, Clock, X, Check, FileText, User, CreditCard, ExternalLink, Users, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';

interface Accountant {
  id: string; email: string; full_name: string; phone: string; city: string;
  iin: string; bio: string; experience_years: number; specialization: string[];
  id_card_url: string; selfie_url: string; diploma_urls: string[]; certificate_urls: string[];
  identity_verified: boolean; documents_verified: boolean; experience_verified: boolean;
  verification_status: string; rating: number; completed_tasks: number; created_at: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountants, setAccountants] = useState<Accountant[]>([]);
  const [selected, setSelected] = useState<Accountant | null>(null);
  const [filter, setFilter] = useState<'pending' | 'verified' | 'all'>('pending');
  const [stats, setStats] = useState({ total: 0, accountants: 0, clients: 0, tasks: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth'); return; }

    const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (me?.role !== 'admin') {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    setIsAdmin(true);

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

    setLoading(false);
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
      </main>

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
