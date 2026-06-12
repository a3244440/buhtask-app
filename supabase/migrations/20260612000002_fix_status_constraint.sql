-- Fix status check constraint to allow all needed statuses
alter table tasks drop constraint if exists tasks_status_check;
alter table tasks add constraint tasks_status_check
  check (status in ('open', 'in_progress', 'completed', 'cancelled', 'closed', 'done'));
