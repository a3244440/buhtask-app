'use client';
import { useMemo, useState } from 'react';
import { ArrowRight, MapPin, Trophy } from 'lucide-react';

type Entry = { id: string; city?: string | null; full_name?: string | null; rank_position?: number | null };

const CITIES = [
  { name: 'Астана', x: 468, y: 125 }, { name: 'Алматы', x: 592, y: 296 },
  { name: 'Шымкент', x: 508, y: 296 }, { name: 'Актобе', x: 254, y: 185 },
  { name: 'Тараз', x: 543, y: 280 }, { name: 'Павлодар', x: 536, y: 155 },
  { name: 'Усть-Каменогорск', x: 651, y: 185 }, { name: 'Семей', x: 606, y: 168 },
  { name: 'Атырау', x: 145, y: 226 }, { name: 'Костанай', x: 330, y: 120 },
  { name: 'Кызылорда', x: 398, y: 276 }, { name: 'Уральск', x: 100, y: 167 },
  { name: 'Петропавловск', x: 414, y: 90 }, { name: 'Актау', x: 115, y: 305 },
  { name: 'Темиртау', x: 449, y: 186 }, { name: 'Туркестан', x: 480, y: 282 },
  { name: 'Кокшетау', x: 408, y: 130 }, { name: 'Талдыкорган', x: 614, y: 269 },
];

const key = (city?: string | null) => (city || '').toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim();

export default function KazakhstanRankingMap({ entries, onViewRating }: { entries: Entry[]; onViewRating: () => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byCity = useMemo(() => new Map(entries.filter(e => e.city).map(e => [key(e.city), e])), [entries]);
  const active = CITIES.find(city => city.name === hovered);
  const leader = active ? byCity.get(key(active.name)) : undefined;

  return <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 p-6 sm:p-9 shadow-xl">
    <div className="absolute -top-28 -right-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
    <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
    <div className="relative grid gap-5 lg:grid-cols-[1fr_1.35fr] lg:items-center">
      <div className="text-center lg:text-left">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-200"><Trophy className="h-3.5 w-3.5" /> Рейтинг по городам</div>
        <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Лучшие бухгалтеры Казахстана</h2>
        <p className="mt-3 text-sm leading-relaxed text-blue-100">Наведите на город, чтобы увидеть его лидера. После квиза бухгалтер указывает город, и его результат появляется на карте после подтверждения администратором.</p>
        <button onClick={onViewRating} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-white"><MapPin className="h-4 w-4" /> Смотреть рейтинг <ArrowRight className="h-4 w-4" /></button>
      </div>
      <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 sm:p-4">
        <svg viewBox="40 55 670 290" className="h-auto w-full" role="img" aria-label="Интерактивная карта Казахстана">
          <path d="M75 178 L116 145 L179 151 L216 119 L282 128 L322 101 L389 108 L425 75 L482 97 L527 91 L560 119 L621 108 L682 140 L691 185 L660 209 L677 247 L630 270 L620 306 L564 313 L530 287 L475 303 L444 284 L392 306 L358 282 L304 288 L263 265 L215 275 L176 252 L128 259 L97 234 L74 209 Z" fill="#123c70" stroke="#67e8f9" strokeWidth="2.5" />
          <path d="M119 184 C249 150 370 199 491 158 S620 181 668 159" fill="none" stroke="#7dd3fc" strokeOpacity=".25" strokeWidth="1.5" strokeDasharray="5 6" />
          {CITIES.map(city => {
            const entry = byCity.get(key(city.name)); const selected = hovered === city.name;
            return <g key={city.name} role="button" tabIndex={0} aria-label={city.name} onMouseEnter={() => setHovered(city.name)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(city.name)} onBlur={() => setHovered(null)} onClick={onViewRating} className="cursor-pointer">
              {selected && <circle cx={city.x} cy={city.y} r="18" fill="#22d3ee" fillOpacity=".22" />}
              <circle cx={city.x} cy={city.y} r={entry ? 8 : 4.5} fill={entry ? '#fbbf24' : '#67e8f9'} stroke="#082f49" strokeWidth="2" />
              {entry && <text x={city.x} y={city.y + 3.5} textAnchor="middle" fill="#082f49" fontSize="8" fontWeight="800">{entry.rank_position}</text>}
              <text x={city.x} y={city.y - 11} textAnchor="middle" fill={selected ? '#fff' : '#bae6fd'} fontSize="9" fontWeight={selected ? '700' : '500'}>{city.name}</text>
            </g>;
          })}
        </svg>
        <div className="min-h-12 px-2 text-center text-xs text-cyan-50">{active ? (leader ? <><b>Топ-{leader.rank_position}:</b> {leader.full_name}</> : <>В городе <b>{active.name}</b> пока нет участника в топе</>) : 'Выберите город на карте'}</div>
      </div>
    </div>
  </div>;
}