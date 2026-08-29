import type { Metadata } from 'next';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Trophy, MapPin, Building2, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Рейтинг лучших бухгалтеров Казахстана',
  description:
    'Конкурс BuhTask — рейтинг лучших бухгалтеров Казахстана. Топ-3 определяются по результатам квиза на знание бухгалтерского и налогового учёта, победители получают призы от партнёров конкурса.',
  alternates: { canonical: 'https://buhtask.kz/reyting' },
};

export const revalidate = 60;

export default async function ContestPage() {
  const { data: entries } = await supabase
    .from('contest_entries')
    .select('*')
    .eq('published', true)
    .eq('season', 'permanent')
    .order('rank_position', { ascending: true });

  const top3 = (entries || []).filter(e => e.rank_position <= 3);
  const rest = (entries || []).filter(e => e.rank_position > 3);

  const medal = (pos: number) => (pos === 1 ? '🥇' : pos === 2 ? '🥈' : '🥉');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Рейтинг лучших бухгалтеров Казахстана',
    itemListElement: (entries || []).map(e => ({
      '@type': 'ListItem',
      position: e.rank_position,
      name: e.full_name,
    })),
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/"><img src="/images/logo-new.png" alt="BuhTask" className="h-10 w-auto" /></Link>
          <Link href="/auth" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl">
            Разместить задачу
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px',
        }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs text-white/90 mb-5">
            <Trophy className="w-3.5 h-3.5" /> Конкурс BuhTask
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Рейтинг лучших бухгалтеров Казахстана</h1>
          <p className="text-blue-100 max-w-2xl mx-auto leading-relaxed">
            Топ-3 места нельзя купить — их нужно заслужить в квизе на знание бухгалтерского и налогового учёта.
            Победители получают призы от партнёров конкурса.
          </p>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Правила — коротко */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-2xl mb-2">🏆</p>
            <p className="font-bold text-gray-900 text-sm mb-1">Топ-3 — заслуженные места</p>
            <p className="text-xs text-gray-500 leading-relaxed">Определяются по результатам квиза на знание бухучёта и налогового законодательства РК. Купить эти места нельзя.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-2xl mb-2">🎁</p>
            <p className="font-bold text-gray-900 text-sm mb-1">Призы от партнёров</p>
            <p className="text-xs text-gray-500 leading-relaxed">Победители получают призы от компаний-партнёров конкурса — от профессиональных инструментов до курсов и сертификатов.</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <p className="text-2xl mb-2">📈</p>
            <p className="font-bold text-gray-900 text-sm mb-1">Остальные места — по заявке</p>
            <p className="text-xs text-gray-500 leading-relaxed">Места с 4-го можно занять как продвигаемое размещение — честно помечено, чтобы не путать с заслуженным топ-3.</p>
          </div>
        </div>

        {(!entries || entries.length === 0) ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
            Рейтинг ещё формируется — загляните позже.
          </div>
        ) : (
          <>
            {/* Топ-3 — подиум */}
            {top3.length > 0 && (
              <div className="grid sm:grid-cols-3 gap-4 mb-10">
                {top3.map(e => (
                  <div key={e.id} className={`bg-white rounded-2xl border-2 shadow-sm p-6 text-center ${e.rank_position === 1 ? 'border-amber-300 sm:-translate-y-3 sm:shadow-lg' : 'border-gray-100'}`}>
                    <p className="text-4xl mb-3">{medal(e.rank_position)}</p>
                    {e.avatar_url ? (
                      <img src={e.avatar_url} alt={e.full_name || ''} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-white shadow" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                        {(e.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <p className="font-bold text-gray-900">{e.full_name}</p>
                    {e.city && <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {e.city}</p>}
                    {e.company_name && <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-0.5"><Building2 className="w-3 h-3" /> {e.company_name}</p>}
                    {e.note && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{e.note}</p>}
                    <span className="inline-block mt-3 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">По результатам квиза</span>
                  </div>
                ))}
              </div>
            )}

            {/* Остальные места */}
            {rest.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {rest.map(e => (
                  <div key={e.id} className="px-5 py-4 flex items-center gap-4">
                    <span className="w-8 text-center font-bold text-gray-300 flex-shrink-0">{e.rank_position}</span>
                    {e.avatar_url ? (
                      <img src={e.avatar_url} alt={e.full_name || ''} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0 font-bold">
                        {(e.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{e.full_name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {e.city && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{e.city}</span>}
                        {e.company_name && ` · ${e.company_name}`}
                      </p>
                    </div>
                    {e.badge_type === 'promoted' && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-violet-50 text-violet-600 flex-shrink-0">Продвигается</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* CTA — участие */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 mt-10 text-white flex flex-col sm:flex-row items-center gap-5">
          <div className="flex-1 text-center sm:text-left">
            <p className="font-bold text-lg">Вы бухгалтер и хотите попасть в топ-3?</p>
            <p className="text-blue-100 text-sm mt-1">Пройдите квиз на знание бухучёта и налогов — займите место в рейтинге по-настоящему.</p>
          </div>
          <Link href="/quiz" className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-yellow-300 hover:text-blue-900 transition-colors whitespace-nowrap flex items-center gap-2 flex-shrink-0">
            Пройти квиз <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 bg-white mt-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-xs text-gray-400 text-center">
          BuhTask — маркетплейс бухгалтерских услуг в Казахстане · info@buhtask.kz · <Link href="/news" className="hover:text-blue-600">Новости и статьи</Link>
        </div>
      </footer>
    </div>
  );
}
