-- Тип документа "накладная" (Форма З-2) был добавлен в код, но constraint
-- documents_type_check в базе всё ещё разрешал только ('invoice', 'avr', 'sf'),
-- поэтому создание накладной падало с ошибкой на уровне БД.

alter table documents drop constraint if exists documents_type_check;
alter table documents add constraint documents_type_check
  check (type in ('invoice', 'avr', 'sf', 'nakladnaya'));
