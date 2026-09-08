-- Исправляет рассинхронизацию схемы profiles: защитный триггер
-- protect_profile_privileged_fields() сохраняет финансовые поля неизменными,
-- но в части развёртываний эти колонки не были созданы предыдущей миграцией.
-- Из-за этого любой UPDATE профиля падал на NEW.total_earned.
alter table profiles add column if not exists total_earned numeric not null default 0;
alter table profiles add column if not exists commission_owed numeric not null default 0;
