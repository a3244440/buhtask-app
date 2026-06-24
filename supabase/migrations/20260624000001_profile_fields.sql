-- Поля профиля бухгалтера для публичной страницы (если ещё не созданы)
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists specialization text[] default '{}';
alter table profiles add column if not exists experience_years integer default 0;
alter table profiles add column if not exists min_price numeric default 0;
alter table profiles add column if not exists rating numeric default 0;
alter table profiles add column if not exists completed_tasks integer default 0;
alter table profiles add column if not exists city text default 'Астана';

-- Чтение профилей доступно любому авторизованному (для просмотра бухгалтеров заказчиком)
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (auth.uid() is not null);
