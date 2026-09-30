-- 0010_keep_export: Export every day (Settings → Export to grid settings).
--
-- Growatt clears the inverter's Grid First (export) times every night at
-- 23:30. With keep_export on, the 5-minute check reads them after the reset
-- and writes the kept ones (last applied on the dashboard) back if they've
-- gone. This also runs for users
-- without automatic charging (or Octopus).
-- app_server's existing table grants already cover the new columns.

-- The export times to put back, cleared when keep_export is turned off.
-- slots: e.g. '18:00-19:00, 20:00-22:15'.
alter table private.user_settings
  add column keep_export boolean not null default false,
  add column keep_export_power smallint
    check (keep_export_power between 1 and 100),
  add column keep_export_stop smallint
    check (keep_export_stop between 1 and 100),
  add column keep_export_slots text
    check (char_length(keep_export_slots) <= 100);

-- UK dates: the reset the export times were last checked after, and the last
-- day a failure to put them back was logged (once a day, not every 5 minutes).
alter table private.automation_state
  add column export_restored_on date,
  add column export_failed_on date;

-- Now also users with keep_export on.
create or replace function private.automation_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select user_id from private.user_settings
  where automation_enabled or keep_export
$$;
revoke all on function private.automation_user_ids() from public;
grant execute on function private.automation_user_ids() to app_server;

-- As in 0007, now also for users with keep_export on.
create or replace function private.schedule_automation()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_secret text;
  v_user uuid;
  v_count integer := 0;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'cron_secret';
  if v_secret is null then
    raise exception 'cron_secret is missing from Vault';
  end if;

  for v_user in
    select s.user_id from private.user_settings s
    where (s.automation_enabled or s.keep_export)
      and not exists (
        select from private.automation_state a
        where a.user_id = s.user_id and a.paused
      )
  loop
    -- Queued, then sent in the background. A check can take up to a minute
    -- (pg_net gives up after 5 seconds by default).
    perform net.http_post(
      url := 'https://kelpwatt.angelov.uk/api/cron/user',
      body := jsonb_build_object('userId', v_user),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_secret
      ),
      timeout_milliseconds := 60000
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function private.schedule_automation()
  from public, anon, authenticated;
