-- ============================================================================
-- Фикс: account_deletion_requests.user_id ссылался на profiles с ON DELETE
-- CASCADE — значит при реальном удалении профиля запись самой заявки тоже
-- удалялась каскадом, ещё до того как API успевал пометить её "approved".
-- Это ломало и аудит (кто и почему удалил аккаунт — исчезало вместе с ним),
-- и сам порядок операций в /api/account/delete. Меняем на SET NULL — история
-- заявок (со снимком full_name/email/role/reason) переживает удаление аккаунта.
-- ============================================================================
alter table account_deletion_requests drop constraint if exists account_deletion_requests_user_id_fkey;
alter table account_deletion_requests add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id) references profiles(id) on delete set null;

-- ============================================================================
-- Бакет для логотипов партнёров. Публичный read (логотипы показываются на
-- открытой странице /partners всем), но writeтолько админ — форма заявки
-- партнёра публичная и анонимная, поэтому публичную загрузку файлов туда не
-- делаем (тот же принцип, что и раньше: анонимный write в Storage — реальный
-- вектор для спама/абьюза). Админ загружает логотип сам при модерации заявки.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('partner-logos', 'partner-logos', true)
on conflict (id) do nothing;

drop policy if exists "partner_logos_public_read" on storage.objects;
create policy "partner_logos_public_read" on storage.objects
  for select using (bucket_id = 'partner-logos');

drop policy if exists "partner_logos_admin_write" on storage.objects;
create policy "partner_logos_admin_write" on storage.objects
  for insert with check (
    bucket_id = 'partner-logos'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "partner_logos_admin_update" on storage.objects;
create policy "partner_logos_admin_update" on storage.objects
  for update using (
    bucket_id = 'partner-logos'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

