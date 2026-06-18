-- Add more high-demand services from Kaspi/Naimi listings
alter table tasks drop constraint if exists tasks_category_check;
alter table tasks add constraint tasks_category_check
  check (category in (
    'tax', 'salary', 'register', 'audit', 'report', 'other',
    'construction', 'maternity', 'kgd_notice', 'vat_return', 'closing', 'declaration_250',
    'unblock_account', 'restore_accounting', 'esf_snt', 'tax_inspection'
  ));
