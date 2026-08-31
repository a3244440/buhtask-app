-- ============================================================================
-- Удаление аккаунта пользователем — с подтверждением админом, не мгновенно.
-- Пользователь указывает причину, заявка попадает в админку, только после
-- одобрения аккаунт реально удаляется (через серверный роут с service_role,
-- поскольку удаление из auth.users возможно только через Admin API).
-- ============================================================================
create table if not exists account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  full_name text,       -- снимок на момент заявки — после удаления смотреть уже будет не на что
  email text,
  role text,
  reason text not null,
  status text not null default 'pending',  -- 'pending' | 'approved' | 'rejected'
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_account_deletion_status on account_deletion_requests(status, requested_at desc);

alter table account_deletion_requests enable row level security;

-- Подать заявку можно только от своего имени и только со статусом pending —
-- тот же принцип, что и у partners/promotion_requests: нельзя вставить сразу "approved".
drop policy if exists "user_insert_own_deletion_request" on account_deletion_requests;
create policy "user_insert_own_deletion_request" on account_deletion_requests
  for insert with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "user_read_own_deletion_request" on account_deletion_requests;
create policy "user_read_own_deletion_request" on account_deletion_requests
  for select using (auth.uid() = user_id);

drop policy if exists "admin_all_deletion_requests" on account_deletion_requests;
create policy "admin_all_deletion_requests" on account_deletion_requests
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
