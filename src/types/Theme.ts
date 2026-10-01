import type { ReactNode } from "react";
import type { Theme } from "./Api";

// What the page is actually showing: system worked out from the device.
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  // What the user chose.
  preference: Theme;
  resolved: ResolvedTheme;
  // Applies it straight away, and saves it to the account when signed in.
  setPreference: (theme: Theme) => void;
};

type ThemeProviderProps = { children: ReactNode };

type ThemeOption = { value: Theme; label: string };

export type {
  ResolvedTheme,
  ThemeContextValue,
  ThemeProviderProps,
  ThemeOption,
};
