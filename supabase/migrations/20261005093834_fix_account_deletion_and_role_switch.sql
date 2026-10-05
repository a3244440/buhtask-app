begin;

-- The API deletes Auth first; explicitly ensure the profile follows it.
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles add constraint profiles_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- SET NULL needs a nullable column; retain the request and its audit snapshot.
alter table public.account_deletion_requests alter column user_id drop not null;
alter table public.account_deletion_requests drop constraint if exists account_deletion_requests_user_id_fkey;
alter table public.account_deletion_requests add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete set null;

-- Recover requests that the old API approved before an unsuccessful deletion.
update public.account_deletion_requests r
set status = 'pending', processed_at = null
where r.status = 'approved'
  and exists (select 1 from public.profiles p where p.id = r.user_id)
  and exists (select 1 from auth.users u where u.id = r.user_id);

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acting_is_admin boolean;
begin
  select (role = 'admin') into acting_is_admin from profiles where id = auth.uid();
  if not coalesce(acting_is_admin, false) then
    -- Only an unbanned owner may switch between ordinary roles.
    -- Retain the existing protection for admin and all privileged fields.
    if not (coalesce(auth.uid() = old.id, false) and not coalesce(old.is_banned, false)
      and old.role in ('client', 'accountant')
      and new.role in ('client', 'accountant')) then
      new.role := old.role;
    end if;
    new.is_banned := old.is_banned;
    new.verification_status := old.verification_status;
    new.identity_verified := old.identity_verified;
    new.documents_verified := old.documents_verified;
    new.experience_verified := old.experience_verified;
    new.rating := old.rating;
    new.completed_tasks := old.completed_tasks;
    new.subscription_plan := old.subscription_plan;
    new.subscription_until := old.subscription_until;
    new.total_earned := old.total_earned;
    new.commission_owed := old.commission_owed;
  end if;
  return new;
end;
$$;

-- Auth refuses deletion while the user owns Storage files. Return the paths
-- for removal through the Storage API, never delete storage.objects with SQL.
-- A JSON aggregate avoids PostgREST's row limit truncating the result.
create or replace function public.account_storage_objects(target_user_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('bucket_id', bucket_id, 'name', name)), '[]'::jsonb)
  from storage.objects
  where owner_id = target_user_id::text
    or (bucket_id in ('avatars', 'verification-docs')
      and split_part(name, '/', 1) = target_user_id::text);
$$;
revoke all on function public.account_storage_objects(uuid) from public, anon, authenticated;
grant execute on function public.account_storage_objects(uuid) to service_role;

commit;
