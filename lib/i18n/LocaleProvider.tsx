"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Locale } from "../interpretation/types";
import { DEFAULT_LOCALE, messages, type MessageKey } from "./messages";

/**
 * App-wide UI locale (M4). Holds the single locale that drives both the chrome
 * (via `useT`) and the reading language sent to /api/interpret. Default is
 * Vietnamese (the primary audience), persisted to localStorage so a returning
 * visitor keeps their choice.
 *
 * SSR note: the server has no localStorage, so it renders with DEFAULT_LOCALE;
 * the stored choice is applied in an effect after mount. This keeps the
 * server/client first paint identical (no hydration mismatch).
 */
interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "yijing.locale";

function isLocale(value: unknown): value is Locale {
  return value === "vi" || value === "zh" || value === "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // Apply any stored choice after mount (client only).
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored) && stored !== locale) {
      setLocaleState(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in sync for accessibility / correct font shaping.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled — the choice still applies for this session.
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => {
      let text = messages[locale][key];
      if (params) {
        for (const [name, value] of Object.entries(params)) {
          text = text.replace(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [locale],
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return ctx;
}

/** Convenience hook returning just the translation function. */
export function useT(): LocaleContextValue["t"] {
  return useLocale().t;
}
