-- Админ видит ВСЕ задачи, документы, компании, контрагентов (для админ-панели)

-- Helper-условие: текущий пользователь — админ
-- (повторяется в каждой политике через подзапрос)

-- Задачи
drop policy if exists "admin_select_tasks" on tasks;
create policy "admin_select_tasks" on tasks
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Документы
drop policy if exists "admin_select_documents" on documents;
create policy "admin_select_documents" on documents
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Компании
drop policy if exists "admin_select_companies" on companies;
create policy "admin_select_companies" on companies
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Контрагенты
drop policy if exists "admin_select_counterparties" on counterparties;
create policy "admin_select_counterparties" on counterparties
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
