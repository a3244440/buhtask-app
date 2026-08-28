-- ============================================================================
-- 1) company_type на companies — колонка отсутствовала физически (была только
-- в старой legacy-схеме database/schema.sql для другой таблицы), поэтому КБЕ
-- 19/17 в счетах никогда реально не работал: company?.company_type всегда
-- было undefined. Добавляем на актуальную таблицу companies (используется
-- разделом документов/финансов), с дефолтом 'TOO', чтобы не сломать
-- уже существующие компании (обновить тип можно вручную в форме компании).
-- ============================================================================
alter table companies add column if not exists company_type text default 'TOO';
alter table companies drop constraint if exists companies_type_check;
alter table companies add constraint companies_type_check
  check (company_type in ('IP', 'TOO'));

-- ============================================================================
-- 2) Снимок реквизитов компании/контрагента прямо в документе.
--
-- company_id/counterparty_id в documents — это ON DELETE SET NULL: при
-- удалении компании или контрагента ссылка в уже созданных документах
-- обнуляется, а сами реквизиты (название, БИН, адрес, банк) нигде больше не
-- хранились — документ рендерился через живой JOIN, поэтому после удаления
-- компании она "пропадала" из уже выставленных счетов/актов/накладных.
-- Это неправильно и для бухгалтерии: исторический документ должен навсегда
-- сохранять те реквизиты, что были на момент его создания, даже если
-- компанию потом переименовали или удалили вовсе.
--
-- Добавляем company_snapshot/counterparty_snapshot (jsonb) — заполняются
-- при создании/редактировании документа и используются для отображения
-- в приоритете перед live-join. Существующие документы, у которых компания/
-- контрагент ещё не удалены, бэкафилим прямо сейчас, пока данные ещё живы —
-- для уже осиротевших (company_id уже null) восстановить нечего, это
-- ограничение только для документов, созданных ДО этого фикса.
-- ============================================================================
alter table documents add column if not exists company_snapshot jsonb;
alter table documents add column if not exists counterparty_snapshot jsonb;

update documents d
set company_snapshot = jsonb_build_object(
  'name', c.name, 'bin', c.bin, 'director', c.director, 'address', c.address,
  'company_type', c.company_type, 'bank_accounts', c.bank_accounts
)
from companies c
where d.company_id = c.id and d.company_snapshot is null;

update documents d
set counterparty_snapshot = jsonb_build_object(
  'name', cp.name, 'bin', cp.bin, 'director', cp.director, 'address', cp.address,
  'bank', cp.bank, 'iban', cp.iban
)
from counterparties cp
where d.counterparty_id = cp.id and d.counterparty_snapshot is null;
