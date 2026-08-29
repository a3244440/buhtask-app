-- ============================================================================
-- Конкурс "Рейтинг бухгалтеров Казахстана" — этап 2: квиз для топ-3.
--
-- Правильные ответы НИКОГДА не должны быть доступны клиенту напрямую —
-- поэтому quiz_questions читается только админом через RLS; сами вопросы
-- участнику отдаются через серверный API-роут (app/api/quiz/start), который
-- явно вырезает correct_index/explanation перед отправкой в браузер, а не
-- через прямой supabase.from('quiz_questions').select() с клиента.
-- ============================================================================

create table if not exists quiz_questions (
  id uuid primary key default gen_random_uuid(),
  category text not null,             -- 'nds' | 'kpn_ipn' | 'form910' | 'trud' | 'obshee'
  question text not null,
  options jsonb not null,             -- ["вариант А", "вариант Б", "вариант В", "вариант Г"]
  correct_index integer not null,     -- 0..3
  explanation text,                   -- показывается участнику после ответа, для обучающего эффекта
  is_active boolean not null default false,  -- по умолчанию выключен — включает админ после проверки
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quiz_questions_active on quiz_questions(is_active, category);

create trigger update_quiz_questions_updated_at before update on quiz_questions
  for each row execute function update_updated_at_column();

alter table quiz_questions enable row level security;

drop policy if exists "admin_all_quiz_questions" on quiz_questions;
create policy "admin_all_quiz_questions" on quiz_questions
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
-- Намеренно НЕТ политики для select обычным пользователям — вопросы (с correct_index)
-- отдаются только через серверный роут с service_role, который сам решает, что показать.

-- ============================================================================
-- Попытки прохождения квиза
-- ============================================================================
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  accountant_id uuid not null references profiles(id) on delete cascade,
  season text not null default 'permanent',
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  question_ids uuid[] not null,       -- зафиксированный набор вопросов для этой попытки (не меняется при возобновлении)
  answers jsonb default '{}'::jsonb,  -- { "<question_id>": <selected_index> }
  score integer,                      -- заполняется при завершении
  total_questions integer not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  time_taken_seconds integer
);

-- Один участник — не больше одной попытки за сезон (в работе ИЛИ завершённой).
-- Незавершённую попытку можно и нужно доигрывать, а не начинать заново с новыми вопросами —
-- иначе можно было бы "спамить" попытками, чтобы увидеть больше вопросов из банка.
create unique index if not exists idx_quiz_one_attempt_per_season on quiz_attempts(accountant_id, season);

alter table quiz_attempts enable row level security;

drop policy if exists "accountant_select_own_attempts" on quiz_attempts;
create policy "accountant_select_own_attempts" on quiz_attempts
  for select using (auth.uid() = accountant_id);

drop policy if exists "admin_select_all_attempts" on quiz_attempts;
create policy "admin_select_all_attempts" on quiz_attempts
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
-- INSERT/UPDATE в quiz_attempts делаются только через серверные роуты (service_role),
-- поэтому отдельных клиентских insert/update-политик для участников нет: иначе участник
-- мог бы сам записать себе score напрямую, в обход реальной проверки ответов.
