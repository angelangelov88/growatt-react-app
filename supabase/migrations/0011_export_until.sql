-- 0011_export_until: the dashboard's one-off Export until battery % button.
--
-- It works out when the battery will reach the chosen level from the battery
-- details the user saves in Settings (Growatt doesn't give them), and sets one
-- export slot that ends then. The 5-minute check turns it off afterwards.
-- app_server's existing table grants already cover the new columns.

-- Battery size and the most it can discharge at a 100% rate.
alter table private.user_settings
  add column battery_kwh numeric(4, 1)
    check (battery_kwh between 0.5 and 100),
  add column battery_max_kw numeric(4, 2)
    check (battery_max_kw between 0.1 and 30);

-- The one-off export waiting to be turned off: when it ends, and its slot as
-- written (e.g. '16:05-17:27'), so only that slot is ever turned off.
-- one_off_failed: turning it off failed and was logged, so the retries every
-- 5 minutes aren't logged too.
alter table private.automation_state
  add column one_off_until timestamptz,
  add column one_off_slot text check (char_length(one_off_slot) <= 20),
  add column one_off_failed boolean not null default false;

-- Now also users with a one-off export to turn off.
create or replace function private.automation_user_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id from private.user_settings s
  where s.automation_enabled or s.keep_export
    or exists (
      select from private.automation_state a
      where a.user_id = s.user_id and a.one_off_until is not null
    )
$$;
revoke all on function private.automation_user_ids() from public;
grant execute on function private.automation_user_ids() to app_server;

-- As in 0010, now also for users with a one-off export to turn off.
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
    where (
        s.automation_enabled or s.keep_export
        or exists (
          select from private.automation_state a
          where a.user_id = s.user_id and a.one_off_until is not null
        )
      )
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
