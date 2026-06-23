-- Контрагенты (покупатели/заказчики) заказчика
create table if not exists counterparties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  bin text,
  director text,
  address text,
  bank text,
  iban text,
  created_at timestamptz default now()
);

alter table counterparties enable row level security;
drop policy if exists "cp_select" on counterparties;
create policy "cp_select" on counterparties for select using (auth.uid() = owner_id);
drop policy if exists "cp_insert" on counterparties;
create policy "cp_insert" on counterparties for insert with check (auth.uid() = owner_id);
drop policy if exists "cp_update" on counterparties;
create policy "cp_update" on counterparties for update using (auth.uid() = owner_id);
drop policy if exists "cp_delete" on counterparties;
create policy "cp_delete" on counterparties for delete using (auth.uid() = owner_id);

-- Документы: счёт на оплату, АВР, счёт-фактура
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  company_id uuid references companies(id) on delete set null,  -- поставщик (наша компания)
  counterparty_id uuid references counterparties(id) on delete set null,  -- покупатель
  parent_id uuid references documents(id) on delete set null,  -- документ-основание
  type text not null check (type in ('invoice', 'avr', 'sf')),  -- счёт / АВР / счёт-фактура
  number text,
  doc_date date default current_date,
  contract text,
  items jsonb default '[]'::jsonb,
  total numeric default 0,
  vat_total numeric default 0,
  has_vat boolean default false,
  notes text,
  created_at timestamptz default now()
);

alter table documents enable row level security;
drop policy if exists "doc_select" on documents;
create policy "doc_select" on documents for select using (auth.uid() = owner_id);
drop policy if exists "doc_insert" on documents;
create policy "doc_insert" on documents for insert with check (auth.uid() = owner_id);
drop policy if exists "doc_update" on documents;
create policy "doc_update" on documents for update using (auth.uid() = owner_id);
drop policy if exists "doc_delete" on documents;
create policy "doc_delete" on documents for delete using (auth.uid() = owner_id);

create index if not exists idx_documents_owner on documents(owner_id, created_at desc);
create index if not exists idx_documents_parent on documents(parent_id);
