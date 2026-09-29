-- 0008_user_limit: the beta takes at most 20 accounts.
--
-- Checked in the database, so it covers every way an account is made: email
-- sign-up, Google sign-in and anything else. The API also asks first, to show
-- a friendly "full" message instead of an error.
--
-- A seat is taken by a confirmed account, or by a sign-up from the last day
-- that's still waiting for its email to be confirmed. Unconfirmed sign-ups
-- older than that stop counting, so junk sign-ups can't fill the beta.
--
-- To change the limit, edit the number below and run this file again.

create or replace function private.signups_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) < 20
  from auth.users
  where email_confirmed_at is not null
    or created_at > now() - interval '1 day'
$$;
revoke all on function private.signups_open() from public, anon, authenticated;
grant execute on function private.signups_open() to app_server;

-- Runs before Supabase Auth adds a user. The lock makes sign-ups at the same
-- moment wait for each other, so two can't both take the last seat.
create or replace function private.enforce_user_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext('private.user_limit'));
  if not private.signups_open() then
    raise exception 'The beta is full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_user_limit()
  from public, anon, authenticated;

drop trigger if exists enforce_user_limit on auth.users;
create trigger enforce_user_limit
  before insert on auth.users
  for each row execute function private.enforce_user_limit();
