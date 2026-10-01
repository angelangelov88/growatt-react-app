import type { Theme } from "../../types/Api";
import type { ResolvedTheme, ThemeOption } from "../../types/Theme";

// The browser's copy of the theme, which public/theme.js reads before the
// page first paints. Keep the key and colours in step with that file.
const STORAGE_KEY = "theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";
// The browser bar: the page background (gray-950 in each theme).
const BAR_COLOR: Record<ResolvedTheme, string> = {
  dark: "#030712",
  light: "#f9fafb",
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const isTheme = (value: unknown): value is Theme =>
  THEME_OPTIONS.some((o) => o.value === value);

// Storage can be blocked (private modes, site settings): then it's System.
const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    return "system";
  }
};

const storeTheme = (theme: Theme) => {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Not kept on this browser; the account still has it.
  }
};

const prefersLight = () => matchMedia(LIGHT_QUERY).matches;

const resolveTheme = (theme: Theme, deviceLight: boolean): ResolvedTheme =>
  theme === "system" ? (deviceLight ? "light" : "dark") : theme;

const applyTheme = (theme: ResolvedTheme) => {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", BAR_COLOR[theme]);
};

export {
  LIGHT_QUERY,
  THEME_OPTIONS,
  readStoredTheme,
  storeTheme,
  prefersLight,
  resolveTheme,
  applyTheme,
};
