-- 0007_automation: automatic charging checks each user every 5 minutes.
--
-- Supabase's own timer (pg_cron) replaces the GitHub schedule. Every 5
-- minutes it sends one request per user with automation on to
-- /api/cron/user (with pg_net), so each user gets their own function run.
-- automation_state remembers what each user's inverter was last set to, so
-- most checks only ask Octopus and never touch Growatt.
--
-- Before running this, add the cron secret to Vault (see the README):
--   select vault.create_secret('<CRON_SECRET>', 'cron_secret');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Off: no overnight window of the user's own; all 6 inverter slots are for
-- Octopus slots. The window times stay saved for when it's turned back on.
alter table private.user_settings
  add column window_enabled boolean not null default true;

-- One row per user, written only by the automation check.
create table private.automation_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Set while a check runs, so two can't talk to the inverter at once. It
  -- runs out by itself if a check dies.
  busy_until timestamptz,
  -- When the last check finished, whatever happened.
  checked_at timestamptz,
  -- What the inverter was last set to, or found to have: the plan the next
  -- check compares against. Null until the first check reaches the inverter.
  plan_power smallint,
  plan_stop smallint,
  plan_slots text,
  -- When the inverter was last read or written. Null means "read it next time".
  inverter_checked_at timestamptz,
  -- When the automation last changed the inverter.
  applied_at timestamptz,
  -- Why the last check failed (safe to show the user), or null if it worked.
  last_code text,
  last_message text,
  -- A saved login was refused: no scheduled checks until the user saves new
  -- details or presses Check now.
  paused boolean not null default false
);

alter table private.automation_state enable row level security;
alter table private.automation_state force row level security;
revoke all on private.automation_state from public, anon, authenticated;
grant select, insert, update, delete on private.automation_state to app_server;
create policy own_rows on private.automation_state to app_server
  using (user_id = private.current_user_id())
  with check (user_id = private.current_user_id());

-- Sends one check request per user with automation on, skipping paused ones.
-- Run by the timer below as postgres, which can read the secret from Vault.
-- Returns how many requests it queued.
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
    where s.automation_enabled
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

-- cron.schedule replaces a job with the same name, so this file can be run again.
select cron.schedule(
  'automation-check',
  '*/5 * * * *',
  'select private.schedule_automation()'
);
-- Once a day: the audit log keeps 12 months (0006), and the timer's own
-- history keeps a week.
select cron.schedule(
  'housekeeping',
  '17 3 * * *',
  $$
    select private.prune_audit_log();
    delete from cron.job_run_details where end_time < now() - interval '7 days';
  $$
);
