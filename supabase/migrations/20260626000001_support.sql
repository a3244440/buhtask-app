-- Чат поддержки (тикеты) между пользователем и админом

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  status text default 'open',
  last_message text,
  last_from text,
  unread_admin integer default 0,
  unread_user integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

create table if not exists support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references support_tickets(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  is_admin boolean default false,
  content text not null,
  created_at timestamptz default now()
);

alter table support_tickets enable row level security;
alter table support_messages enable row level security;

drop policy if exists "tickets_select" on support_tickets;
create policy "tickets_select" on support_tickets for select using (
  auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "tickets_insert" on support_tickets;
create policy "tickets_insert" on support_tickets for insert with check (auth.uid() = user_id);
drop policy if exists "tickets_update" on support_tickets;
create policy "tickets_update" on support_tickets for update using (
  auth.uid() = user_id or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "smsg_select" on support_messages;
create policy "smsg_select" on support_messages for select using (
  exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
drop policy if exists "smsg_insert" on support_messages;
create policy "smsg_insert" on support_messages for insert with check (
  auth.uid() = sender_id and (
    exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  )
);

create index if not exists idx_smsg_ticket on support_messages(ticket_id, created_at);
create index if not exists idx_tickets_updated on support_tickets(updated_at desc);
