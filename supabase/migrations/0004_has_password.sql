-- 0004_has_password: whether the current user can log in with a password.
--
-- Google users have none until they add one in Settings. Supabase's API doesn't
-- say, and adding a password doesn't add an "email" identity, so this reads
-- auth.users. It answers only for the user set in app.user_id, and only yes or
-- no: never the hash.

create or replace function private.has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select u.encrypted_password is not null and u.encrypted_password <> ''
      from auth.users u
      where u.id = private.current_user_id()
    ),
    false
  )
$$;
revoke all on function private.has_password() from public, anon, authenticated;
grant execute on function private.has_password() to app_server;
