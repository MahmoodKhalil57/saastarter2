import { useEffect, useState } from "react";

/** Dark-mode toggle over the theme tokens' `.dark` variant. The stored
 *  preference wins; absent, the OS preference does (applied pre-paint by
 *  the inline script in index.html). */
const KEY = "theme";

export const isDark = (): boolean => document.documentElement.classList.contains("dark");

export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(isDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(KEY, dark ? "dark" : "light");
  }, [dark]);
  return { dark, toggle: () => setDark((d) => !d) };
}
