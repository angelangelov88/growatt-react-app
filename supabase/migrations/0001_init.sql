-- 0001_init: per-user credentials, settings and audit log.
--
-- Security model:
-- - Tables live in the "private" schema, which the Data API never exposes.
-- - anon/authenticated (the browser roles) get no access at all.
-- - Only the app_server role (used by our Vercel functions) can read or write.
-- - RLS limits app_server to the rows of the user set in app.user_id for the
--   current transaction, so a query that forgets "where user_id = ..." still
--   can't touch another user's rows.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- The user id the server set for this transaction, or null.
create or replace function private.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Growatt / Octopus credentials, encrypted in the app with AES-256-GCM.
-- The database never sees the key, so a copy of it alone reveals nothing.
create table private.user_credentials (
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('growatt', 'octopus')),
  ciphertext bytea not null,
  iv bytea not null check (octet_length(iv) = 12),
  auth_tag bytea not null check (octet_length(auth_tag) = 16),
  key_version smallint not null,
  -- Not secret, shown in the UI: Growatt serial or Octopus account number.
  identifier text not null,
  verified_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);

create table private.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  charge_start time,
  charge_end time,
  automation_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  -- Never put secrets here.
  details jsonb,
  ip inet,
  created_at timestamptz not null default now()
);
create index audit_log_user_created_idx
  on private.audit_log (user_id, created_at desc);

create trigger user_credentials_updated_at
  before update on private.user_credentials
  for each row execute function private.set_updated_at();
create trigger user_settings_updated_at
  before update on private.user_settings
  for each row execute function private.set_updated_at();

-- RLS on and forced; the only policies are for app_server, scoped to one user.
alter table private.user_credentials enable row level security;
alter table private.user_credentials force row level security;
alter table private.user_settings enable row level security;
alter table private.user_settings force row level security;
alter table private.audit_log enable row level security;
alter table private.audit_log force row level security;

-- The server's database role. Its password is set separately (never in git).
do $$
begin
  if not exists (select from pg_roles where rolname = 'app_server') then
    create role app_server login noinherit;
  end if;
end
$$;
alter role app_server set statement_timeout = '10s';

grant usage on schema private to app_server;
grant execute on function private.current_user_id() to app_server;
grant select, insert, update, delete on private.user_credentials to app_server;
grant select, insert, update, delete on private.user_settings to app_server;
-- The audit log is append-only for the server.
grant select, insert on private.audit_log to app_server;

create policy own_rows on private.user_credentials to app_server
  using (user_id = private.current_user_id())
  with check (user_id = private.current_user_id());
create policy own_rows on private.user_settings to app_server
  using (user_id = private.current_user_id())
  with check (user_id = private.current_user_id());
create policy own_rows on private.audit_log to app_server
  using (user_id = private.current_user_id())
  with check (user_id = private.current_user_id());

-- The cron job needs the list of users to run for, before it has a user id.
-- This returns only ids, nothing else.
create or replace function private.automation_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from private.user_settings where automation_enabled
$$;
revoke all on function private.automation_user_ids() from public;
grant execute on function private.automation_user_ids() to app_server;

-- Belt and braces: nothing in private is ever reachable by the browser roles.
revoke all on all tables in schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.current_user_id() to app_server;
grant execute on function private.set_updated_at() to app_server;
grant execute on function private.automation_user_ids() to app_server;
