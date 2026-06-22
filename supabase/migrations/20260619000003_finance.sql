-- Финансовые операции пользователя (доходы/расходы)
create table if not exists finance_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  category text,
  amount numeric not null,
  description text,
  record_date date not null default current_date,
  created_at timestamptz default now()
);

alter table finance_records enable row level security;

drop policy if exists "finance_select" on finance_records;
create policy "finance_select" on finance_records for select using (auth.uid() = user_id);
drop policy if exists "finance_insert" on finance_records;
create policy "finance_insert" on finance_records for insert with check (auth.uid() = user_id);
drop policy if exists "finance_update" on finance_records;
create policy "finance_update" on finance_records for update using (auth.uid() = user_id);
drop policy if exists "finance_delete" on finance_records;
create policy "finance_delete" on finance_records for delete using (auth.uid() = user_id);

create index if not exists idx_finance_user_date on finance_records(user_id, record_date desc);
