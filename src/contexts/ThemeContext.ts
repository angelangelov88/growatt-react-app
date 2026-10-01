import { createContext } from "react";
import type { ThemeContextValue } from "../types/Theme";

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolved: "dark",
  setPreference: () => undefined,
});

export default ThemeContext;
