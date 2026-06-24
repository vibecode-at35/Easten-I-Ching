"use client";

import type { Locale } from "../lib/interpretation/types";
import { useLocale } from "../lib/i18n/LocaleProvider";
import { LOCALE_ORDER } from "../lib/i18n/messages";

/**
 * Compact vi/zh/en switcher (M4). Fixed to the top-right on every screen so
 * the choice is always reachable; the active locale is marked in gold. The
 * selected locale drives both the UI chrome and the reading language.
 */
const SHORT_LABEL: Record<Locale, string> = {
  vi: "VI",
  zh: "中",
  en: "EN",
};

const FULL_LABEL: Record<Locale, "lang.vi" | "lang.zh" | "lang.en"> = {
  vi: "lang.vi",
  zh: "lang.zh",
  en: "lang.en",
};

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-1 rounded-full border border-hairline bg-surface/70 px-1 py-1 backdrop-blur-sm">
      {LOCALE_ORDER.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-label={t(FULL_LABEL[code])}
            aria-pressed={active}
            className={`min-w-9 rounded-full px-3 py-1.5 font-sans text-xs tracking-wider transition-colors duration-200 ${
              active ? "bg-gold text-bg" : "text-text-muted hover:text-text"
            }`}
          >
            {SHORT_LABEL[code]}
          </button>
        );
      })}
    </div>
  );
}
