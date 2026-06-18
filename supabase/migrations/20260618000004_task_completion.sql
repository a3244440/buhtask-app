-- Task completion flow + accountant Kaspi QR

-- Accountant's own Kaspi QR for receiving client payment
alter table profiles add column if not exists kaspi_qr_url text;

-- Task completion request flow
alter table tasks add column if not exists completion_requested boolean default false;
alter table tasks add column if not exists completion_requested_at timestamptz;
alter table tasks add column if not exists completion_approved boolean default false;
alter table tasks add column if not exists completion_approved_at timestamptz;

-- conversations already linked to tasks via task_id
