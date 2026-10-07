"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";

export interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  resolvedTheme: string;
  systemTheme?: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  setTheme: () => {},
  resolvedTheme: "light",
});

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: string;
  attribute?: string;
  storageKey?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}

/**
 * ThemeProvider — Gestionnaire de thème natif OBASA (Clair / Sombre).
 * Zéro dépendance externe, 100% compatible React 19 et Next.js 15 App Router.
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  attribute = "data-theme",
  storageKey = "obasa_theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) return saved;
      } catch {}
    }
    return defaultTheme;
  });

  const setTheme = useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {}
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute(attribute, newTheme);
        if (newTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    },
    [attribute, storageKey]
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute(attribute, theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, attribute]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      setTheme,
      resolvedTheme: theme,
      systemTheme: "light",
    }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
