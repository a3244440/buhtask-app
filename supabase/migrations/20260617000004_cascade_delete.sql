-- Fix foreign keys to cascade delete when user is removed from auth.users

-- profiles -> auth.users
alter table profiles drop constraint if exists profiles_id_fkey;
alter table profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- tasks -> profiles (client)
alter table tasks drop constraint if exists tasks_client_id_fkey;
alter table tasks add constraint tasks_client_id_fkey
  foreign key (client_id) references profiles(id) on delete cascade;

-- tasks -> profiles (accountant)
alter table tasks drop constraint if exists tasks_accountant_id_fkey;
alter table tasks add constraint tasks_accountant_id_fkey
  foreign key (accountant_id) references profiles(id) on delete set null;

-- proposals -> tasks
alter table proposals drop constraint if exists proposals_task_id_fkey;
alter table proposals add constraint proposals_task_id_fkey
  foreign key (task_id) references tasks(id) on delete cascade;

-- proposals -> profiles
alter table proposals drop constraint if exists proposals_accountant_id_fkey;
alter table proposals add constraint proposals_accountant_id_fkey
  foreign key (accountant_id) references profiles(id) on delete cascade;

-- conversations -> profiles
alter table conversations drop constraint if exists conversations_participant1_id_fkey;
alter table conversations add constraint conversations_participant1_id_fkey
  foreign key (participant1_id) references profiles(id) on delete cascade;

alter table conversations drop constraint if exists conversations_participant2_id_fkey;
alter table conversations add constraint conversations_participant2_id_fkey
  foreign key (participant2_id) references profiles(id) on delete cascade;

-- conversations -> tasks
alter table conversations drop constraint if exists conversations_task_id_fkey;
alter table conversations add constraint conversations_task_id_fkey
  foreign key (task_id) references tasks(id) on delete set null;

-- messages -> conversations
alter table messages drop constraint if exists messages_conversation_id_fkey;
alter table messages add constraint messages_conversation_id_fkey
  foreign key (conversation_id) references conversations(id) on delete cascade;

-- messages -> profiles
alter table messages drop constraint if exists messages_sender_id_fkey;
alter table messages add constraint messages_sender_id_fkey
  foreign key (sender_id) references profiles(id) on delete cascade;
