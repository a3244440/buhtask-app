-- Add verification fields to profiles
alter table profiles add column if not exists iin text;
alter table profiles add column if not exists id_card_url text;
alter table profiles add column if not exists diploma_urls text[];
alter table profiles add column if not exists certificate_urls text[];
alter table profiles add column if not exists selfie_url text;
alter table profiles add column if not exists identity_verified boolean default false;
alter table profiles add column if not exists documents_verified boolean default false;
alter table profiles add column if not exists experience_verified boolean default false;
alter table profiles add column if not exists terms_accepted boolean default false;
alter table profiles add column if not exists terms_accepted_at timestamptz;

-- verification_status already exists but ensure correct values
-- not_verified -> pending -> documents_uploaded -> verified

-- Create verification-documents bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('verification-docs', 'verification-docs', false, 10485760)
on conflict (id) do update set file_size_limit = 10485760;

drop policy if exists "verification_upload" on storage.objects;
create policy "verification_upload" on storage.objects
  for insert with check (bucket_id = 'verification-docs' and auth.uid() is not null);

drop policy if exists "verification_read_own" on storage.objects;
create policy "verification_read_own" on storage.objects
  for select using (bucket_id = 'verification-docs' and auth.uid() is not null);
