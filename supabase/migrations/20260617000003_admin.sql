-- Allow admins to read all profiles and verification docs
-- Admin is identified by role = 'admin' in profiles

-- Admins can update any profile (for verification)
drop policy if exists "admin_update_profiles" on profiles;
create policy "admin_update_profiles" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admins can read verification docs
drop policy if exists "admin_read_verification" on storage.objects;
create policy "admin_read_verification" on storage.objects
  for select using (
    bucket_id = 'verification-docs' and
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
