-- 0009_export_presets: each user's two Grid First presets (the dashboard's
-- export buttons): a name, times, discharge power and stop SOC.
-- Null means the app's defaults, like the charge window.
-- app_server's existing table grants already cover the new columns.

alter table private.user_settings
  add column high_export_name text
    check (char_length(high_export_name) between 1 and 20),
  add column high_export_start time,
  add column high_export_end time,
  add column high_export_power smallint
    check (high_export_power between 1 and 100),
  add column high_export_stop smallint
    check (high_export_stop between 1 and 100),
  add column low_export_name text
    check (char_length(low_export_name) between 1 and 20),
  add column low_export_start time,
  add column low_export_end time,
  add column low_export_power smallint
    check (low_export_power between 1 and 100),
  add column low_export_stop smallint
    check (low_export_stop between 1 and 100);
