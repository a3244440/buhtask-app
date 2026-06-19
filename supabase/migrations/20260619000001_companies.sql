-- User companies (заказчик может добавить несколько компаний)
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  bin text,
  director text,
  address text,
  tax_regime text,
  oked text,
  registration_date text,
  status text,
  bank_accounts jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

alter table companies enable row level security;

drop policy if exists "companies_select" on companies;
create policy "companies_select" on companies
  for select using (auth.uid() = owner_id);

drop policy if exists "companies_insert" on companies;
create policy "companies_insert" on companies
  for insert with check (auth.uid() = owner_id);

drop policy if exists "companies_update" on companies;
create policy "companies_update" on companies
  for update using (auth.uid() = owner_id);

drop policy if exists "companies_delete" on companies;
create policy "companies_delete" on companies
  for delete using (auth.uid() = owner_id);
