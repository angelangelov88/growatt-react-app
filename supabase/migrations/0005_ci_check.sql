-- 0005_ci_check: a login for the CI database check (scripts/database-check.mts).
--
-- It gets no access to any schema, table or function of ours. It can still read
-- Postgres's catalog (every role can), which is all the check needs: whether
-- each table has RLS, and what anon and authenticated are allowed to do. So its
-- password, kept in GitHub's secrets, can't reach any user's data.

-- Its password is set separately (never in git).
do $$
begin
  if not exists (select from pg_roles where rolname = 'ci_check') then
    create role ci_check login noinherit;
  end if;
end
$$;
alter role ci_check set statement_timeout = '10s';
alter role ci_check connection limit 2;
