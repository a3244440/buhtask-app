-- Позволяет администратору завершать попытку после ручной оценки text/voice ответов.
drop policy if exists "admin_update_quiz_attempts" on quiz_attempts;
create policy "admin_update_quiz_attempts" on quiz_attempts
  for update
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Исправляет уже проверенные, но зависшие попытки: раньше у админа была политика SELECT,
-- но не UPDATE, поэтому итоговый status не мог смениться на completed.
update quiz_attempts qa
set
  manual_score = coalesce((select sum(ma.points_awarded) from quiz_manual_answers ma where ma.attempt_id = qa.id), 0),
  score = coalesce(qa.auto_score, 0) + coalesce((select sum(ma.points_awarded) from quiz_manual_answers ma where ma.attempt_id = qa.id), 0),
  status = 'completed',
  manual_reviewed_at = coalesce(qa.manual_reviewed_at, now())
where qa.status = 'pending_review'
  and not exists (
    select 1 from quiz_manual_answers ma
    where ma.attempt_id = qa.id and ma.points_awarded is null
  );
