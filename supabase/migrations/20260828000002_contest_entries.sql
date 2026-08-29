-- ============================================================================
-- Конкурс "Рейтинг бухгалтеров Казахстана" — этап 1: страница + список.
-- Квиз и оплата мест будут отдельными этапами позже (см. поле badge_type,
-- уже готовое под оба варианта, но пока управляется вручную админом).
-- ============================================================================
create table if not exists contest_entries (
  id uuid primary key default gen_random_uuid(),
  accountant_id uuid references profiles(id) on delete set null,
  season text not null default 'permanent',   -- напр. '2026-Q4', пока один общий сезон 'permanent'
  rank_position integer not null,             -- 1,2,3 — заслуженные места; 4+ — обычный список/продвижение
  full_name text,                             -- снимок имени на момент добавления — страница /reyting публичная,
  avatar_url text,                            -- анонимному посетителю нельзя читать profiles напрямую (RLS),
  city text,                                  -- поэтому не полагаемся на live-JOIN, а храним нужное для показа здесь
  company_name text,                          -- название компании/бренда бухгалтера, если есть
  badge_type text default null,               -- 'quiz_winner' | 'promoted' | null
  quiz_score integer,                         -- заполнится, когда появится квиз
  note text,                                  -- короткая подпись под карточкой (за что попал в топ и т.п.)
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_contest_season_rank on contest_entries(season, rank_position) where published = true;
create index if not exists idx_contest_published on contest_entries(season, published, rank_position);

create trigger update_contest_entries_updated_at before update on contest_entries
  for each row execute function update_updated_at_column();

alter table contest_entries enable row level security;

drop policy if exists "public_read_published_contest" on contest_entries;
create policy "public_read_published_contest" on contest_entries
  for select using (published = true);

drop policy if exists "admin_all_contest_entries" on contest_entries;
create policy "admin_all_contest_entries" on contest_entries
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
