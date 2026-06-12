-- Enable RLS on tasks
alter table tasks enable row level security;

-- Tasks policies
drop policy if exists "tasks_select" on tasks;
create policy "tasks_select" on tasks
  for select using (auth.uid() is not null);

drop policy if exists "tasks_insert" on tasks;
create policy "tasks_insert" on tasks
  for insert with check (auth.uid() = client_id);

drop policy if exists "tasks_update" on tasks;
create policy "tasks_update" on tasks
  for update using (auth.uid() = client_id or auth.uid() = accountant_id);

drop policy if exists "tasks_delete" on tasks;
create policy "tasks_delete" on tasks
  for delete using (auth.uid() = client_id);

-- Enable RLS on profiles
alter table profiles enable row level security;

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (auth.uid() is not null);

drop policy if exists "profiles_insert" on profiles;
create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- Create proposals table if not exists
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  accountant_id uuid references profiles(id) on delete cascade,
  proposed_price decimal(10,2) not null,
  description text not null,
  estimated_days integer,
  status text default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

-- Enable RLS on proposals
alter table proposals enable row level security;

drop policy if exists "proposals_select" on proposals;
create policy "proposals_select" on proposals
  for select using (auth.uid() is not null);

drop policy if exists "proposals_insert" on proposals;
create policy "proposals_insert" on proposals
  for insert with check (auth.uid() = accountant_id);

drop policy if exists "proposals_update" on proposals;
create policy "proposals_update" on proposals
  for update using (auth.uid() = accountant_id);

-- Add budget and deadline columns to tasks if not exists
alter table tasks add column if not exists budget decimal(10,2);
alter table tasks add column if not exists deadline date;
alter table tasks add column if not exists accountant_id uuid references profiles(id);

-- Create conversations table if not exists
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  participant1_id uuid references profiles(id) on delete cascade,
  participant2_id uuid references profiles(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  last_message text,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table conversations enable row level security;

drop policy if exists "conversations_select" on conversations;
create policy "conversations_select" on conversations
  for select using (auth.uid() = participant1_id or auth.uid() = participant2_id);

drop policy if exists "conversations_insert" on conversations;
create policy "conversations_insert" on conversations
  for insert with check (auth.uid() = participant1_id or auth.uid() = participant2_id);

drop policy if exists "conversations_update" on conversations;
create policy "conversations_update" on conversations
  for update using (auth.uid() = participant1_id or auth.uid() = participant2_id);

-- Create messages table if not exists
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

drop policy if exists "messages_select" on messages;
create policy "messages_select" on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    )
  );

drop policy if exists "messages_insert" on messages;
create policy "messages_insert" on messages
  for insert with check (auth.uid() = sender_id);
