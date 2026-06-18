-- Expand task categories to support market-demand services
alter table tasks drop constraint if exists tasks_category_check;
alter table tasks add constraint tasks_category_check
  check (category in (
    'tax', 'salary', 'register', 'audit', 'report', 'other',
    'construction', 'maternity', 'kgd_notice', 'vat_return', 'closing', 'declaration_250'
  ));
