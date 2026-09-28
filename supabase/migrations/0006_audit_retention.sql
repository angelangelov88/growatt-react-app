-- 0006_audit_retention: the audit log keeps 12 months, as the privacy notice
-- (/privacy) says. The server can still only add rows; this function is the
-- only way anything is removed, apart from deleting the account.

create or replace function private.prune_audit_log()
returns bigint
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from private.audit_log
    where created_at < now() - interval '12 months'
    returning 1
  )
  select count(*) from deleted
$$;
revoke all on function private.prune_audit_log() from public, anon, authenticated;
grant execute on function private.prune_audit_log() to app_server;
