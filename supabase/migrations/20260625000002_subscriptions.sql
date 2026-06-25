-- Подписки (тарифы) пользователей

-- План: 'free' | 'business' | 'pro'
alter table profiles add column if not exists subscription_plan text default 'free';
-- До какой даты активна подписка
alter table profiles add column if not exists subscription_until timestamptz;

-- Админ может обновлять подписки (уже есть admin_update_profiles, но на всякий случай)
drop policy if exists "admin_update_profiles" on profiles;
create policy "admin_update_profiles" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
