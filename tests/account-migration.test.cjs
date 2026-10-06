const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

const client = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const admin = '00000000-0000-0000-0000-000000000003';
const migration = readFileSync('supabase/migrations/20261005093834_fix_account_deletion_and_role_switch.sql', 'utf8');

test('migration: role protection, deletion cascade, recovery, Storage permissions', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create schema auth; create schema storage;
      create role anon; create role authenticated; create role service_role;
      create function auth.uid() returns uuid language sql as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      create table auth.users (id uuid primary key);
      create table public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        role text not null, is_banned boolean default false,
        verification_status text default 'not_verified',
        identity_verified boolean default false, documents_verified boolean default false,
        experience_verified boolean default false, rating numeric default 0,
        completed_tasks integer default 0, subscription_plan text default 'free',
        subscription_until timestamptz, total_earned numeric default 0, commission_owed numeric default 0
      );
      create table account_deletion_requests (
        id integer primary key, user_id uuid not null references profiles(id) on delete set null,
        status text default 'pending', processed_at timestamptz, reason text
      );
      create table storage.objects (bucket_id text, name text, owner_id text);
      insert into auth.users values ('${client}'), ('${other}'), ('${admin}');
      insert into profiles (id, role) values ('${client}', 'client'), ('${other}', 'client'), ('${admin}', 'admin');
      insert into account_deletion_requests values (1, '${client}', 'pending', null, 'audit'), (2, '${other}', 'approved', now(), 'retry');
    `);
    await assert.rejects(db.exec(`delete from auth.users where id = '${client}'`), { code: '23502' });
    await db.exec(readFileSync('supabase/migrations/20260823000001_critical_security_fixes.sql', 'utf8').split('-- 2)')[0]);
    await db.exec(`select set_config('request.jwt.claim.sub', '${client}', false);
      update profiles set role = 'accountant' where id = '${client}';`);
    assert.equal((await db.query('select role from profiles where id = $1', [client])).rows[0].role, 'client');
    await db.exec(migration);
    const profile = async id => (await db.query('select * from profiles where id = $1', [id])).rows[0];
    await db.exec(`update profiles set role = 'accountant', rating = 5, subscription_plan = 'pro', identity_verified = true where id = '${client}'`);
    assert.equal((await profile(client)).role, 'accountant');
    assert.equal(Number((await profile(client)).rating), 0);
    assert.equal((await profile(client)).subscription_plan, 'free');
    assert.equal((await profile(client)).identity_verified, false);
    await db.exec(`update profiles set role = 'client' where id = '${client}'`);
    assert.equal((await profile(client)).role, 'client');
    await db.exec(`update profiles set role = 'admin' where id = '${client}';
      update profiles set role = 'accountant' where id = '${other}';
      update profiles set role = 'client' where id = '${admin}';`);
    assert.equal((await profile(client)).role, 'client');
    assert.equal((await profile(other)).role, 'client');
    assert.equal((await profile(admin)).role, 'admin');
    await db.exec(`select set_config('request.jwt.claim.sub', '', false);
      update profiles set role = 'accountant' where id = '${client}'`);
    assert.equal((await profile(client)).role, 'client');
    await db.exec(`select set_config('request.jwt.claim.sub', '${admin}', false);
      update profiles set role = 'accountant', is_banned = true where id = '${other}';
      select set_config('request.jwt.claim.sub', '${other}', false);
      update profiles set role = 'client', is_banned = false where id = '${other}';`);
    assert.equal((await profile(other)).role, 'accountant');
    assert.equal((await profile(other)).is_banned, true);
    assert.equal((await db.query('select status from account_deletion_requests where id = 2')).rows[0].status, 'pending');
    await db.exec(`insert into storage.objects values
      ('avatars', '${client}/avatar.png', null),
      ('chat-files', 'conversation/file.pdf', '${client}'),
      ('avatars', '${other}/avatar.png', '${other}');`);
    const files = (await db.query('select account_storage_objects($1) as files', [client])).rows[0].files;
    assert.equal(files.length, 2);
    assert.equal((await db.query("select has_function_privilege('authenticated', 'account_storage_objects(uuid)', 'execute') as allowed")).rows[0].allowed, false);
    assert.equal((await db.query("select has_function_privilege('service_role', 'account_storage_objects(uuid)', 'execute') as allowed")).rows[0].allowed, true);
    await db.exec(`delete from auth.users where id = '${client}'`);
    assert.equal(await profile(client), undefined);
    const request = (await db.query('select * from account_deletion_requests where id = 1')).rows[0];
    assert.equal(request.user_id, null);
    assert.equal(request.reason, 'audit');
    assert.equal(request.status, 'pending');
    await db.exec(migration); // idempotent rerun
  } finally { await db.close(); }
});
