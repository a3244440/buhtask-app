import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Building2, Globe, Gift } from 'lucide-react';
import PartnerApplyForm from './PartnerApplyForm';

export const metadata: Metadata = {
  title: 'Партнёры конкурса «Рейтинг лучших бухгалтеров Казахстана»',
  description:
    'Станьте партнёром конкурса BuhTask — дайте приз победителям топ-3 рейтинга бухгалтеров Казахстана или разместите свою компанию перед аудиторией бухгалтеров и предпринимателей.',
  alternates: { canonical: 'https://buhtask.kz/partners' },
};

export const revalidate = 60;

const CATEGORY_LABEL: Record<string, string> = {
  bank: 'Банк / финансы', software: 'Софт для бизнеса', education: 'Обучение', office: 'Офис и товары', other: 'Другое',
};

export default async function PartnersPage() {
  const { data: partners } = await supabase.from('partners').select('*').eq('status', 'approved').order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" /></Link>
          <Link href="/reyting" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
            Рейтинг бухгалтеров
          </Link>
        </div>
      </header>

      <div className="bg-gradient-to-br from-violet-700 via-purple-600 to-indigo-700 relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white/90 mb-5">
            <Gift className="w-3.5 h-3.5" /> Партнёры конкурса BuhTask
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Станьте партнёром рейтинга лучших бухгалтеров</h1>
          <p className="text-purple-100 max-w-2xl mx-auto leading-relaxed">
            Дайте приз победителям топ-3 или разместите свою компанию перед тысячами бухгалтеров и предпринимателей Казахстана.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Витрина партнёров */}
        <h2 className="text-xl font-bold text-gray-900 mb-4">Наши партнёры</h2>
        {!partners || partners.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm mb-12">
            Пока здесь пусто — станьте первым партнёром конкурса!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {partners.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex gap-4">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="w-14 h-14 rounded-xl object-contain border border-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400 mb-1">{CATEGORY_LABEL[p.category] || 'Партнёр'}</p>
                  {p.description && <p className="text-xs text-gray-500 leading-relaxed mb-1">{p.description}</p>}
                  {p.prize_offer && <p className="text-xs text-emerald-600 font-medium mb-1">🎁 {p.prize_offer}</p>}
                  {p.website_url && (
                    <a href={p.website_url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
                      <Globe className="w-3 h-3" /> Сайт
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <PartnerApplyForm />
      </main>

      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">
          BuhTask — маркетплейс бухгалтерских услуг в Казахстане · info@buhtask.kz
        </div>
      </footer>
    </div>
  );
}

