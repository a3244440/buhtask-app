-- История проверок инструмента "Доход 910"
create table if not exists income910_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  company text,
  file_name text,
  income_total bigint default 0,
  excluded_total bigint default 0,
  ops_count integer default 0,
  esf_total bigint,
  esf_diff bigint,
  created_at timestamptz default now()
);

create index if not exists income910_history_user_idx on income910_history(user_id, created_at desc);

alter table income910_history enable row level security;

drop policy if exists "i910h_select" on income910_history;
create policy "i910h_select" on income910_history for select using (auth.uid() = user_id);

drop policy if exists "i910h_insert" on income910_history;
create policy "i910h_insert" on income910_history for insert with check (auth.uid() = user_id);

drop policy if exists "i910h_delete" on income910_history;
create policy "i910h_delete" on income910_history for delete using (auth.uid() = user_id);

-- Счётчик проверок (если ещё не создан)
alter table profiles add column if not exists income910_used integer default 0;
