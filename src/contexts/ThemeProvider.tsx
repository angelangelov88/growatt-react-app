import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ThemeContext from "./ThemeContext";
import useToast from "./useToast";
import useAuth, { ME_KEY } from "../features/auth/useAuth";
import { SETTINGS_KEY } from "../features/settings/useSettings";
import {
  LIGHT_QUERY,
  applyTheme,
  prefersLight,
  readStoredTheme,
  resolveTheme,
  storeTheme,
} from "../features/theme/theme";
import { apiRequest } from "../lib/apiClient";
import type { Me, Settings, Theme, ThemeSetting } from "../types/Api";
import type { ThemeProviderProps } from "../types/Theme";

// Light, dark or the device's setting. Starts from this browser's copy (which
// public/theme.js has already applied), then the account's once signed in,
// as that follows the user between devices. A change shows straight away and
// is saved to both.
const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { me, status } = useAuth();
  const [preference, setLocalPreference] = useState(readStoredTheme);
  const [deviceLight, setDeviceLight] = useState(prefersLight);
  // The account's theme last taken, so a newly loaded one replaces this
  // browser's choice once, without undoing changes made since.
  const [accountTheme, setAccountTheme] = useState<Theme | undefined>();
  // The latest choice, so an earlier save finishing late doesn't win.
  const latestChoice = useRef<Theme | null>(null);

  const savedTheme = me?.theme;
  if (savedTheme !== accountTheme) {
    setAccountTheme(savedTheme);
    if (savedTheme) setLocalPreference(savedTheme);
  }

  useEffect(() => {
    const query = matchMedia(LIGHT_QUERY);
    const handleChange = (e: MediaQueryListEvent) => {
      setDeviceLight(e.matches);
    };
    query.addEventListener("change", handleChange);
    return () => {
      query.removeEventListener("change", handleChange);
    };
  }, []);

  const resolved = resolveTheme(preference, deviceLight);
  useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);
  useEffect(() => {
    storeTheme(preference);
  }, [preference]);

  const { mutate: save } = useMutation({
    mutationFn: (theme: Theme) =>
      apiRequest<Settings>("settings?part=theme", {
        method: "PUT",
        body: { theme } satisfies ThemeSetting,
      }),
    onSuccess: (settings) => {
      if (settings.theme !== latestChoice.current) return;
      queryClient.setQueryData(SETTINGS_KEY, settings);
      queryClient.setQueryData<Me | null>(
        ME_KEY,
        (old) => old && { ...old, theme: settings.theme },
      );
    },
    onError: () => {
      showToast(
        "Couldn't save the theme to your account, so it's only set on this browser",
        "error",
      );
    },
  });

  const setPreference = useCallback(
    (theme: Theme) => {
      setLocalPreference(theme);
      latestChoice.current = theme;
      if (status === "signedIn") save(theme);
    },
    [status, save],
  );

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export default ThemeProvider;
