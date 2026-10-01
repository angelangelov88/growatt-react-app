// Sets the theme before the page first paints, so a light-theme user never
// sees a flash of the dark one. A file, not inline, as the CSP blocks inline
// scripts. Keep in step with src/features/theme/theme.ts.
(function () {
  var preference = "system";
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") preference = stored;
  } catch (e) {
    // Storage blocked: follow the device.
  }
  var theme =
    preference === "system"
      ? matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : preference;
  document.documentElement.dataset.theme = theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "light" ? "#f9fafb" : "#030712";
})();
