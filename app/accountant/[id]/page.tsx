'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Star, MapPin, Briefcase, ShieldCheck, Clock, Award, CheckCircle2 } from 'lucide-react';
import DashboardHeader from '../../components/DashboardHeader';
import { useI18n } from '@/lib/i18n';

interface AccProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  rating?: number;
  completed_tasks?: number;
  experience_years?: number;
  min_price?: number;
  specialization?: string[];
  verification_status?: string;
  identity_verified?: boolean;
  documents_verified?: boolean;
  experience_verified?: boolean;
  created_at?: string;
}

export default function AccountantProfilePage() {
  const { t } = useI18n();
  const router = useRouter();
  const routeParams = useParams();
  const id = routeParams?.id as string;
  const [loading, setLoading] = useState(true);
  const [acc, setAcc] = useState<AccProfile | null>(null);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from('profiles')
      .select('*')
      .eq('id', id).maybeSingle();
    setAcc(data);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  if (!acc) return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 mb-4">{t('accp.notFound')}</p>
        <button onClick={() => router.back()} className="text-blue-600 hover:underline text-sm">{t('btn.back')}</button>
      </div>
    </div>
  );

  const verified = acc.verification_status === 'verified';
  const rating = acc.rating || 0;
  const memberSince = acc.created_at ? new Date(acc.created_at).getFullYear() : null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <DashboardHeader />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> {t('btn.back')}
        </button>

        {/* Шапка профиля */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-5">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 h-24" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              {acc.avatar_url ? (
                <img src={acc.avatar_url} alt={acc.full_name} className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md bg-white" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-100 border-4 border-white shadow-md flex items-center justify-center text-blue-600 text-2xl font-bold">
                  {(acc.full_name || '?')[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-gray-900">{acc.full_name || t('accp.accountant')}</h1>
              {verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> {t('accp.verified')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {rating > 0 ? rating.toFixed(1) : t('accp.noRating')}</span>
              {acc.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {acc.city}</span>}
              {memberSince && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {t('accp.since')} {memberSince}</span>}
            </div>
          </div>
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-blue-600">{acc.completed_tasks || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('accp.tasksDone')}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-amber-500">{rating > 0 ? rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('accp.rating')}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-extrabold text-emerald-600">{acc.experience_years || 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('accp.yearsExp')}</p>
          </div>
        </div>

        {/* Верификация */}
        {verified && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-blue-600" /> {t('accp.verificationTitle')}</h3>
            <div className="space-y-2">
              {[
                { ok: acc.identity_verified, label: t('accp.identityVerified') },
                { ok: acc.documents_verified, label: t('accp.docsVerified') },
                { ok: acc.experience_verified, label: t('accp.expVerified') },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`w-4 h-4 ${v.ok ? 'text-emerald-500' : 'text-gray-200'}`} />
                  <span className={v.ok ? 'text-gray-700' : 'text-gray-300'}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Специализация */}
        {acc.specialization && acc.specialization.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2"><Briefcase className="w-4 h-4 text-gray-400" /> {t('accp.specialization')}</h3>
            <div className="flex flex-wrap gap-2">
              {acc.specialization.map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* О себе */}
        {acc.bio && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-2">{t('accp.about')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{acc.bio}</p>
          </div>
        )}

        {/* Минимальная цена */}
        {acc.min_price ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('accp.minPrice')}</span>
              <span className="text-lg font-bold text-emerald-600">{acc.min_price.toLocaleString()} ₸</span>
            </div>
          </div>
        ) : null}
        {/* Отзывы заказчиков */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {t('rev.clientReviews')}</h3>
            {reviews.length > 0 && <span className="text-xs text-gray-400">{reviews.length} {t('rev.reviews')}</span>}
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">{t('rev.noReviews')}</p>
          ) : (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="border border-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-bold">
                        {(r.client_name || '?')[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-700">{r.client_name || '—'}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                    </div>
                  </div>
                  {r.comment && <p className="text-sm text-gray-600 mt-1.5">{r.comment}</p>}
                  <p className="text-[11px] text-gray-300 mt-1">{new Date(r.created_at).toLocaleDateString('ru-RU')}</p>
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
