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
  { name: 'Кокшетау', x: 408, y: 130 }, { name: 'Караганда', x: 462, y: 205 },
  { name: 'Талдыкорган', x: 614, y: 269 },
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
          {/* Контур Казахстана: западный выступ, Мангистауский полуостров и длинная восточная граница */}
          <path d="M55 181 L71 165 L101 161 L110 145 L132 151 L145 139 L163 149 L175 171 L199 174 L214 162 L234 172 L252 164 L270 177 L289 167 L306 147 L296 134 L314 121 L344 126 L360 111 L392 104 L411 88 L446 80 L458 67 L481 73 L487 91 L511 94 L520 112 L542 105 L553 119 L575 108 L570 128 L599 139 L619 131 L638 148 L651 169 L674 174 L688 191 L712 194 L723 210 L711 223 L691 224 L684 239 L662 239 L650 257 L629 265 L630 284 L608 289 L596 307 L571 303 L558 319 L535 307 L521 317 L499 309 L485 323 L463 316 L451 331 L432 323 L420 338 L401 327 L386 334 L374 315 L354 309 L337 295 L317 302 L294 284 L277 288 L261 273 L242 277 L222 264 L207 277 L190 265 L179 281 L159 268 L147 252 L128 257 L116 244 L103 250 L91 237 L76 234 L67 216 L50 205 Z" fill="#14588a" stroke="#67e8f9" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Границы областей: декоративно повторяют административное деление, не интерактивные */}
          <g fill="none" stroke="#93e8f7" strokeOpacity=".38" strokeWidth="1.4">
            <path d="M175 171 L186 201 L172 229 L190 265" />
            <path d="M252 164 L259 202 L242 277" />
            <path d="M306 147 L326 183 L317 238 L337 295" />
            <path d="M392 104 L390 151 L411 188 L401 249 L420 338" />
            <path d="M481 73 L472 132 L499 174 L485 323" />
            <path d="M542 105 L536 157 L566 206 L558 319" />
            <path d="M599 139 L598 188 L630 218 L608 289" />
            <path d="M651 169 L637 205 L650 257" />
            <path d="M116 244 L137 218 L159 268" />
            <path d="M207 277 L221 225 L259 202" />
            <path d="M277 288 L286 245 L317 238" />
            <path d="M354 309 L361 258 L401 249" />
            <path d="M451 331 L452 278 L485 268" />
            <path d="M521 317 L520 267 L558 250" />
          </g>
          <path d="M73 192 C178 174 239 205 331 192 S473 177 565 196 S654 196 706 209" fill="none" stroke="#d6f6fb" strokeOpacity=".2" strokeWidth="1.2" strokeDasharray="5 6" />
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