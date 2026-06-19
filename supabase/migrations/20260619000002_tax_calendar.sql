-- User reminders for tax calendar events
create table if not exists tax_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_key text not null,
  event_title text,
  event_date date,
  enabled boolean default true,
  created_at timestamptz default now()
);

alter table tax_reminders enable row level security;

drop policy if exists "tax_reminders_select" on tax_reminders;
create policy "tax_reminders_select" on tax_reminders for select using (auth.uid() = user_id);
drop policy if exists "tax_reminders_insert" on tax_reminders;
create policy "tax_reminders_insert" on tax_reminders for insert with check (auth.uid() = user_id);
drop policy if exists "tax_reminders_update" on tax_reminders;
create policy "tax_reminders_update" on tax_reminders for update using (auth.uid() = user_id);
drop policy if exists "tax_reminders_delete" on tax_reminders;
create policy "tax_reminders_delete" on tax_reminders for delete using (auth.uid() = user_id);
