-- ============================================================================
-- Конкурс "Рейтинг бухгалтеров Казахстана" — этап 3: партнёры.
-- Партнёры дают призы победителям топ-3 и/или размещаются на публичной
-- странице /partners. Заявку может подать кто угодно (форма на сайте, без
-- регистрации), но публикуется она только после модерации админом —
-- анонимные заявки не должны попадать на сайт напрямую (спам/неадекват).
-- ============================================================================
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text default 'other',           -- 'bank' | 'software' | 'education' | 'office' | 'other'
  description text,
  website_url text,
  logo_url text,                           -- на этапе заявки — необязательная ссылка; чаще добавляется/правится админом при модерации
  prize_offer text,                        -- что партнёр предлагает в качестве приза победителям
  contact_name text,
  contact_email text not null,
  contact_phone text,
  status text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  admin_note text,                         -- внутренняя заметка админа (не показывается публично)
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_partners_status on partners(status, created_at desc);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_partners_updated_at on partners;
create trigger update_partners_updated_at before update on partners
  for each row execute function update_updated_at_column();

alter table partners enable row level security;

-- Публично видны только одобренные партнёры
drop policy if exists "public_read_approved_partners" on partners;
create policy "public_read_approved_partners" on partners
  for select using (status = 'approved');

-- Подать заявку может кто угодно, включая анонимного посетителя (форма без регистрации).
-- Важно: INSERT-политика не даёт вставить status != 'pending' — иначе можно было бы
-- отправить заявку сразу как "approved" и обойти модерацию.
drop policy if exists "public_apply_as_partner" on partners;
create policy "public_apply_as_partner" on partners
  for insert with check (status = 'pending');

drop policy if exists "admin_all_partners" on partners;
create policy "admin_all_partners" on partners
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
