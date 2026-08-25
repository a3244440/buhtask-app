-- ============================================================================
-- КРИТИЧНЫЕ ИСПРАВЛЕНИЯ БЕЗОПАСНОСТИ (аудит от 23.08.2026)
-- Применить как можно скорее через Supabase Dashboard → SQL Editor.
-- Это чистые SQL-изменения, не зависят от деплоя приложения.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) КРИТИЧНО: эскалация привилегий через profiles.
-- Политика "Users can update own profile" / "profiles_update" разрешает
-- пользователю обновлять ЛЮБОЕ поле своей же строки — в том числе role,
-- verification_status, subscription_plan, income910_used, total_earned,
-- commission_owed. Любой залогиненный пользователь мог одним вызовом
-- supabase.from('profiles').update({role:'admin'}) выдать себе права админа,
-- либо самостоятельно "верифицироваться", обнулить долг по комиссии,
-- включить себе безлимитный тариф и т.д.
--
-- Fix: триггер, который откатывает изменения защищённых полей к старому
-- значению, если обновление выполняет не админ. Обновления от лица админа
-- (через отдельную admin_update_profiles политику) проходят как есть —
-- функционал бана/верификации/выдачи тарифа в админке не ломается.
-- ----------------------------------------------------------------------------
create or replace function protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  select (role = 'admin') into acting_is_admin from profiles where id = auth.uid();

  if not coalesce(acting_is_admin, false) then
    new.role := old.role;
    new.is_banned := old.is_banned;
    new.verification_status := old.verification_status;
    new.identity_verified := old.identity_verified;
    new.documents_verified := old.documents_verified;
    new.experience_verified := old.experience_verified;
    new.rating := old.rating;
    new.completed_tasks := old.completed_tasks;
    new.subscription_plan := old.subscription_plan;
    new.subscription_until := old.subscription_until;
    new.total_earned := old.total_earned;
    new.commission_owed := old.commission_owed;
    -- income910_used НЕ включён сюда: он легитимно инкрементируется прямо
    -- с клиента на странице /income-910 (see app/income-910/page.tsx).
    -- Блокировка здесь молча заморозила бы счётчик бесплатных проверок —
    -- то есть тоже сняла бы лимит, только по-другому. Правильный фикс —
    -- перенести этот инкремент на серверный маршрут (см. отчёт), это
    -- отдельная задача, не годится под откат "к старому значению".
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields on profiles;
create trigger trg_protect_profile_fields
  before update on profiles
  for each row execute function protect_profile_privileged_fields();

-- ----------------------------------------------------------------------------
-- 2) КРИТИЧНО: утечка документов верификации (PII).
-- Политика "verification_read_own" по названию подразумевает доступ только
-- к своим файлам, но фактическое условие — `auth.uid() is not null`, то есть
-- ЛЮБОЙ залогиненный пользователь мог читать чужие сканы удостоверений,
-- селфи и дипломы бухгалтеров из приватного бакета verification-docs.
--
-- Fix: доступ только владельцу файла (путь начинается с его user id,
-- как и грузится сейчас — см. владелец пишет в свою "папку") либо админу.
-- Если в проде уже есть файлы, загруженные НЕ по пути "{user_id}/...",
-- их нужно будет переименовать/перезалить — иначе они станут недоступны
-- даже владельцу.
-- ----------------------------------------------------------------------------
drop policy if exists "verification_read_own" on storage.objects;
create policy "verification_read_own" on storage.objects
  for select using (
    bucket_id = 'verification-docs'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists "verification_upload" on storage.objects;
create policy "verification_upload" on storage.objects
  for insert with check (
    bucket_id = 'verification-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ----------------------------------------------------------------------------
-- 3) Файлы чата: удалить чужой файл мог кто угодно залогиненный
-- (`chat_files_delete` проверяла только auth.uid() is not null, без владельца).
-- Путь к файлу в этом бакете строится как "{conversation_id}/файл" (не по
-- user id, см. app/dashboard/client/page.tsx), поэтому владельца определяем
-- через участие в переписке, а не через прямое сравнение с auth.uid().
-- ----------------------------------------------------------------------------
drop policy if exists "chat_files_delete" on storage.objects;
create policy "chat_files_delete" on storage.objects
  for delete using (
    bucket_id = 'chat-files'
    and exists (
      select 1 from conversations c
      where c.id::text = (storage.foldername(name))[1]
      and (c.participant1_id = auth.uid() or c.participant2_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 4) Аватары: любой залогиненный пользователь мог перезаписать чужой аватар
-- (upload/update без проверки владельца пути).
-- ----------------------------------------------------------------------------
drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_upload" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ----------------------------------------------------------------------------
-- О задачах (tasks) и финансовых полях (final_price, paid_by_client,
-- commission_paid, completion_approved) — СОЗНАТЕЛЬНО НЕ ТРОГАЮ ЗДЕСЬ.
--
-- Формально это тот же класс проблемы: tasks_update разрешает менять любое
-- поле своей задачи, и бухгалтер технически может сам проставить
-- commission_paid=true, не заплатив комиссию площадке. НО, в отличие от
-- profiles, это ТЕКУЩИЙ РАБОЧИЙ ФЛОУ: оплата идёт вручную через Kaspi мимо
-- платформы, и бухгалтер/клиент сами отмечают факт оплаты/подтверждения
-- (см. app/dashboard/accountant/page.tsx и app/dashboard/client/tasks/[id]).
-- Блокировка этих полей триггером сломает существующую функциональность
-- оплаты и подтверждения завершения, а не только "дыру".
--
-- Правильное решение — не патч, а отдельная фича: подтверждение оплаты
-- комиссии должно проверяться админом (например, по загруженному чеку)
-- или через реальный платёжный шлюз, а не приниматься "на слово" от
-- стороны, которой это финансово выгодно. Это отдельная задача продукта,
-- не разовая миграция — вынесено в отчёт отдельным пунктом.
-- ----------------------------------------------------------------------------
