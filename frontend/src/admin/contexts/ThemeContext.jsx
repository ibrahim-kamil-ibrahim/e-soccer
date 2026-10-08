import { createContext, useCallback, useContext, useEffect, useState } from "react";

export const THEME_LIGHT_CLASS = "es-admin-light";

function getStored() {
  try {
    const t = localStorage.getItem("es-admin-theme");
    return t === "light" ? t : "dark";
  } catch {
    return "dark";
  }
}

/**
 * Light mode uses the classic CSS color-inversion technique on the admin
 * root wrapper (#es-admin-root, id rendered by AdminApp.jsx):
 *
 *   #es-admin-root.es-admin-light { filter: invert(1) hue-rotate(180deg); }
 *
 * invert() + hue-rotate(180deg) turns the dark-navy, white-text, green-brand
 * scheme into a light scheme while keeping hue relationships intact. Every
 * <img>/<video> child gets the SAME filter re-applied (counter-filter), which
 * composes to identity — so team logos, photos and uploaded media stay in
 * their natural colors.
 *
 * The actual CSS is in admin/styles/theme.css (imported once by AdminApp).
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStored);

  useEffect(() => {
    try {
      localStorage.setItem("es-admin-theme", theme);
    } catch {}
    const root = document.getElementById("es-admin-root");
    if (root) root.classList.toggle(THEME_LIGHT_CLASS, theme === "light");
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>;
}

const ThemeContext = createContext(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
