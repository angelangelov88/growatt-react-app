-- 0002_charge_limits: per-user charge power rate and stop SOC, in percent.
-- Null means the app's defaults (35% and 95%), like the charge window.
-- app_server's existing table grants already cover the new columns.

alter table private.user_settings
  add column power_rate smallint check (power_rate between 1 and 100),
  add column stop_soc smallint check (stop_soc between 1 and 100);
