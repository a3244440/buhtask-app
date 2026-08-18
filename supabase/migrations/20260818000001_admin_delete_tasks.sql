-- Админ должен иметь возможность удалять любые задачи (старые и новые) из админ-панели.
-- Ранее для tasks не было ни одной DELETE-политики вообще (даже для владельца-клиента),
-- поэтому удаление молча блокировалось RLS.

drop policy if exists "admin_delete_tasks" on tasks;
create policy "admin_delete_tasks" on tasks
  for delete using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Заодно даём клиенту возможность удалить собственную ещё не начатую задачу
-- (полезно и не связано с RLS-дырой для админа, но того же рода упущение).
drop policy if exists "clients_delete_own_open_tasks" on tasks;
create policy "clients_delete_own_open_tasks" on tasks
  for delete using (
    auth.uid() = client_id and status = 'open'
  );
