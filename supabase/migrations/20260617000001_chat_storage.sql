-- Create storage bucket for chat files
insert into storage.buckets (id, name, public, file_size_limit)
values ('chat-files', 'chat-files', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

-- Allow authenticated users to upload
drop policy if exists "chat_files_upload" on storage.objects;
create policy "chat_files_upload" on storage.objects
  for insert with check (bucket_id = 'chat-files' and auth.uid() is not null);

-- Allow anyone to read (public bucket)
drop policy if exists "chat_files_read" on storage.objects;
create policy "chat_files_read" on storage.objects
  for select using (bucket_id = 'chat-files');

-- Allow users to delete their own files
drop policy if exists "chat_files_delete" on storage.objects;
create policy "chat_files_delete" on storage.objects
  for delete using (bucket_id = 'chat-files' and auth.uid() is not null);

-- Also create avatars bucket while we're at it
insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 5242880)
on conflict (id) do update set public = true;

drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_upload" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid() is not null);
