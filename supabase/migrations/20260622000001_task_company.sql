-- Привязка задачи к компании заказчика
alter table tasks add column if not exists company_id uuid references companies(id) on delete set null;
