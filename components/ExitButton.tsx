"use client";

import { useT } from "../lib/i18n/LocaleProvider";

/**
 * Always-available escape hatch from the reading flow. Fixed to the top-left
 * (mirroring the LanguageSwitcher at top-right) and rendered by app/page.tsx
 * on every in-flow screen (entry / casting / reading), never on the landing.
 * Calls the orchestrator's full reset, returning the person to the start
 * whenever they want, with no confirmation.
 */
export function ExitButton({ onExit }: { onExit: () => void }) {
  const t = useT();
  const label = t("nav.exit");

  return (
    <button
      type="button"
      onClick={onExit}
      aria-label={label}
      className="fixed left-4 top-4 z-50 flex min-h-11 items-center gap-2 rounded-full border border-hairline bg-surface/70 px-4 py-1.5 font-sans text-xs tracking-wider text-text-muted backdrop-blur-sm transition-colors duration-200 hover:text-text"
    >
      <span aria-hidden className="text-sm leading-none">✕</span>
      {label}
    </button>
  );
}
