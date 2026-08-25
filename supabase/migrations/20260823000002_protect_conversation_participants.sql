-- ============================================================================
-- Продолжение аудита безопасности (тот же день) — ещё одна находка того же
-- класса проблем: "UPDATE-политика разрешает менять ЛЮБОЕ поле своей строки".
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ВЫСОКИЙ РИСК: утечка чужой переписки через conversations.
-- Политика "conversations_update" разрешает участнику менять любое поле
-- своей переписки — включая participant1_id / participant2_id. Участник A
-- мог подменить участника B на постороннего пользователя C: после этого
-- пользователь C получал бы доступ на чтение ВСЕЙ истории переписки (все
-- прежние сообщения остаются в messages, а messages_select проверяет
-- участие в conversations НА МОМЕНТ ЧТЕНИЯ, а не на момент отправки) —
-- то есть чужие переговоры между клиентом и бухгалтером могли утечь
-- постороннему человеку одним UPDATE-запросом.
--
-- В коде приложения participant1_id/participant2_id НИГДЕ не изменяются
-- после создания переписки (grep по app/ подтверждает — обновляется только
-- last_message/updated_at при отправке сообщения), поэтому блокировка этих
-- полей ничего не сломает.
-- ----------------------------------------------------------------------------
create or replace function protect_conversation_participants()
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
    new.participant1_id := old.participant1_id;
    new.participant2_id := old.participant2_id;
    new.task_id := old.task_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_conversation_participants on conversations;
create trigger trg_protect_conversation_participants
  before update on conversations
  for each row execute function protect_conversation_participants();
