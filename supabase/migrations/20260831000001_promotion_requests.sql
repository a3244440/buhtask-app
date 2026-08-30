-- ============================================================================
-- Конкурс "Рейтинг бухгалтеров Казахстана" — этап 4: покупка мест (с 4-го).
-- Оплата, как и везде в проекте (см. ФНО 910), идёт вручную через Kaspi —
-- реального платёжного шлюза в проекте нет. Бухгалтер отправляет заявку,
-- переводит деньги, админ вручную сверяет поступление и активирует место.
-- ============================================================================

-- Срок действия платного размещения — по истечении место должно перестать
-- показываться на публичной странице (проверяется при выборке, без крон-джобы).
alter table contest_entries add column if not exists paid_until timestamptz;

create table if not exists promotion_requests (
  id uuid primary key default gen_random_uuid(),
  accountant_id uuid references profiles(id) on delete cascade,
  full_name text,                 -- снимок данных на момент заявки — та же причина, что и у contest_entries/documents:
  avatar_url text,                -- избегаем live-JOIN к profiles там, где это не обязательно
  city text,
  company_name text,
  period_months integer not null default 1,
  amount numeric not null,
  status text not null default 'pending',   -- 'pending' | 'approved' | 'rejected'
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_promotion_status on promotion_requests(status, requested_at desc);

alter table promotion_requests enable row level security;

-- Бухгалтер может подать заявку только от своего имени и только со статусом pending —
-- иначе можно было бы вставить сразу "approved" и получить место без реальной оплаты/проверки.
drop policy if exists "accountant_insert_own_promotion" on promotion_requests;
create policy "accountant_insert_own_promotion" on promotion_requests
  for insert with check (auth.uid() = accountant_id and status = 'pending');

-- Видит только свои заявки (и их статус)
drop policy if exists "accountant_read_own_promotion" on promotion_requests;
create policy "accountant_read_own_promotion" on promotion_requests
  for select using (auth.uid() = accountant_id);

drop policy if exists "admin_all_promotion_requests" on promotion_requests;
create policy "admin_all_promotion_requests" on promotion_requests
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
