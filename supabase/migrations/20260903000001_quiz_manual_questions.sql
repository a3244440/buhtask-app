-- ============================================================================
-- Квиз: добавляем вопросы со свободным ответом (текст или голосовая запись)
-- в дополнение к вопросам с вариантами. Такие ответы нельзя проверить
-- автоматически (в отличие от multiple_choice, где сверяем correct_index) —
-- их проверяет вручную админ, как и почти всё остальное в этом проекте
-- (оплаты, партнёры и т.д.). Голосовой ответ дополнительно усложняет
-- прохождение квиза "чужими руками"/чистым ИИ — нужно реально наговорить
-- ответ своим голосом, это не просто скопировать текст.
-- ============================================================================

-- 1) Тип вопроса. Для 'text'/'voice' поля options/correct_index не нужны —
-- снимаем NOT NULL, чтобы можно было создавать такие вопросы без фиктивных значений.
alter table quiz_questions add column if not exists question_type text not null default 'multiple_choice';
alter table quiz_questions drop constraint if exists quiz_questions_type_check;
alter table quiz_questions add constraint quiz_questions_type_check
  check (question_type in ('multiple_choice', 'text', 'voice'));

alter table quiz_questions alter column options drop not null;
alter table quiz_questions alter column correct_index drop not null;

-- 2) У quiz_attempts: новый промежуточный статус — попытка завершена (все ответы даны),
-- но если среди вопросов были text/voice, итоговый балл неизвестен, пока админ их не оценит.
alter table quiz_attempts drop constraint if exists quiz_attempts_status_check;
alter table quiz_attempts add constraint quiz_attempts_status_check
  check (status in ('in_progress', 'pending_review', 'completed'));

-- auto_score — сумма баллов по автоматически проверяемым (multiple_choice) вопросам,
-- считается сразу при завершении. manual_score — баллы за text/voice, проставляет админ.
-- score (итоговый, уже существует) = auto_score + manual_score, выставляется когда
-- админ закончил проверку всех ручных вопросов попытки.
alter table quiz_attempts add column if not exists auto_score integer default 0;
alter table quiz_attempts add column if not exists manual_score integer default 0;
alter table quiz_attempts add column if not exists manual_reviewed_at timestamptz;

-- 3) Ответы участника на text/voice вопросы — отдельная таблица, а не просто jsonb в answers,
-- чтобы явно связать с админской проверкой (оценка, комментарий, кто и когда проверил)
-- и чтобы голосовые записи можно было спокойно хранить как ссылку на файл в Storage.
create table if not exists quiz_manual_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid not null references quiz_questions(id) on delete cascade,
  text_answer text,          -- для question_type = 'text'
  voice_url text,            -- для question_type = 'voice' — путь в Storage (бакет quiz-voice-answers)
  points_awarded integer,    -- null = ещё не проверено; после проверки — 0 или сколько баллов дал админ
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  admin_comment text,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

alter table quiz_manual_answers enable row level security;

-- Ни один обычный пользователь не должен читать/писать эту таблицу напрямую —
-- запись и чтение идут только через серверные API-роуты (service_role), как и
-- с самими quiz_attempts/quiz_questions. Только админ может читать/проверять напрямую.
drop policy if exists "admin_all_quiz_manual_answers" on quiz_manual_answers;
create policy "admin_all_quiz_manual_answers" on quiz_manual_answers
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- 4) Бакет для голосовых ответов квиза. Приватный — читать может только сам
-- отвечавший (по пути {user_id}/...) или админ, писать — тоже только владелец пути.
insert into storage.buckets (id, name, public)
values ('quiz-voice-answers', 'quiz-voice-answers', false)
on conflict (id) do nothing;

drop policy if exists "quiz_voice_upload" on storage.objects;
create policy "quiz_voice_upload" on storage.objects
  for insert with check (
    bucket_id = 'quiz-voice-answers'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "quiz_voice_read" on storage.objects;
create policy "quiz_voice_read" on storage.objects
  for select using (
    bucket_id = 'quiz-voice-answers'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );
