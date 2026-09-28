-- 0003_rate_limits: request counters for api/_lib/rateLimit.ts.
--
-- The server can't read or change the table, only call rate_limit_hit(). Keys
-- are a limit name plus a hash of the IP address or user id, never the raw value.

create table private.rate_limits (
  key text primary key check (length(key) <= 100),
  window_start timestamptz not null,
  hits integer not null
);
alter table private.rate_limits enable row level security;
alter table private.rate_limits force row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- Counts one hit for key in a fixed window of window_seconds. Returns 0 if the
-- request may go ahead, otherwise the seconds until the window resets.
create or replace function private.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window interval := make_interval(secs => p_window_seconds);
  v_hits integer;
  v_start timestamptz;
begin
  if p_max < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit';
  end if;

  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start <= now() - v_window
      then now() else r.window_start end,
    hits = case when r.window_start <= now() - v_window
      then 1 else r.hits + 1 end
  returning hits, window_start into v_hits, v_start;

  -- Now and then, drop counters whose window ended long ago.
  if random() < 0.01 then
    delete from private.rate_limits where window_start < now() - interval '1 day';
  end if;

  if v_hits <= p_max then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from v_start + v_window - now())))::integer;
end;
$$;
revoke all on function private.rate_limit_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function private.rate_limit_hit(text, integer, integer)
  to app_server;
