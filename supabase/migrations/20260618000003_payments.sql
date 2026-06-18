-- Payment & commission system
-- Platform takes 10% commission from each completed order

-- Add price field to proposals (final agreed price comes from accepted proposal)
-- proposals already has proposed_price

-- Add payment tracking to tasks
alter table tasks add column if not exists final_price numeric;
alter table tasks add column if not exists paid_by_client boolean default false;
alter table tasks add column if not exists paid_at timestamptz;
alter table tasks add column if not exists commission_amount numeric;
alter table tasks add column if not exists commission_paid boolean default false;
alter table tasks add column if not exists commission_paid_at timestamptz;

-- Allow 'paid' status for completed+paid orders
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'completed', 'cancelled', 'paid'));

-- Commission payments table (when accountant pays platform)
create table if not exists commission_payments (
  id uuid primary key default gen_random_uuid(),
  accountant_id uuid references profiles(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  order_amount numeric not null,
  commission_amount numeric not null,
  status text default 'pending' check (status in ('pending', 'paid', 'confirmed')),
  created_at timestamptz default now(),
  paid_at timestamptz
);

alter table commission_payments enable row level security;

drop policy if exists "commission_select" on commission_payments;
create policy "commission_select" on commission_payments
  for select using (
    auth.uid() = accountant_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "commission_insert" on commission_payments;
create policy "commission_insert" on commission_payments
  for insert with check (auth.uid() = accountant_id);

drop policy if exists "commission_update" on commission_payments;
create policy "commission_update" on commission_payments
  for update using (
    auth.uid() = accountant_id
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Add Kaspi/bank details to accountant profile for receiving payment
alter table profiles add column if not exists kaspi_number text;
alter table profiles add column if not exists bank_name text;
alter table profiles add column if not exists total_earned numeric default 0;
alter table profiles add column if not exists commission_owed numeric default 0;

-- Platform Kaspi number stored in a settings table
create table if not exists platform_settings (
  id int primary key default 1,
  commission_percent numeric default 10,
  platform_kaspi_number text default '',
  platform_kaspi_name text default 'BuhTask',
  single_row boolean default true unique
);
insert into platform_settings (id, commission_percent, platform_kaspi_name)
values (1, 10, 'BuhTask')
on conflict (id) do nothing;

alter table platform_settings enable row level security;
drop policy if exists "settings_read" on platform_settings;
create policy "settings_read" on platform_settings for select using (true);
drop policy if exists "settings_admin" on platform_settings;
create policy "settings_admin" on platform_settings for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
