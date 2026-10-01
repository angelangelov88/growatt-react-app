-- 0012_theme: the light or dark theme (Settings → Appearance, or the header
-- button). system follows the device. Also returned by /api/auth/me, so every
-- page opens in it. app_server's existing table grants already cover the new
-- column.
alter table private.user_settings
  add column theme text not null default 'system'
    check (theme in ('system', 'light', 'dark'));
