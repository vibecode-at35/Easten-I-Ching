"use client";

import { useT } from "../lib/i18n/LocaleProvider";

/**
 * The landing screen (M4 redesign — feedback #1: "you open it and don't even
 * know what app this is; it's monotonous").
 *
 * A distinct identity moment before question entry: the 易經 / KINH DỊCH
 * wordmark with a slow gold shimmer, a one-line description of what this is,
 * a faint, slowly-drifting yin-yang motif behind it, and a single primary
 * call to action. Purely presentational — it owns no app state; it just
 * tells the orchestrator (app/page.tsx) the person is ready to begin.
 *
 * Strings are Vietnamese literals here (the default audience); T2 lifts them
 * into the vi/zh/en i18n dictionary.
 */
export interface LandingProps {
  onBegin: () => void;
}

/** A faint, classic taijitu drawn in gold — decorative watermark only. */
function YinYangMark() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className="animate-slow-spin h-[min(70vw,22rem)] w-[min(70vw,22rem)] text-gold"
    >
      <g opacity="0.07" fill="currentColor">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M50 2 A48 48 0 0 0 50 98 A24 24 0 0 0 50 50 A24 24 0 0 1 50 2 Z" />
        <circle cx="50" cy="26" r="6.5" fill="var(--color-bg)" />
        <circle cx="50" cy="74" r="6.5" />
      </g>
    </svg>
  );
}

export function Landing({ onBegin }: LandingProps) {
  const t = useT();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Yin-yang watermark, centered behind everything */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <YinYangMark />
      </div>

      {/* Soft vignette so the watermark melts into the canvas edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(circle at center, transparent 40%, var(--color-bg) 95%)" }}
      />

      <div className="animate-pop-in relative flex flex-col items-center gap-8 text-center">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-4">
          <h1
            className="gold-shimmer font-serif font-semibold leading-none"
            style={{ fontSize: "clamp(3.5rem, 18vw, 5.5rem)", letterSpacing: "0.12em" }}
          >
            易經
          </h1>
          <p className="font-sans text-sm tracking-[0.5em] text-text" style={{ paddingLeft: "0.5em" }}>
            {t("landing.subtitle")}
          </p>
          <span aria-hidden className="mt-2 block h-px w-16 bg-gold-dim" />
        </div>

        {/* What this is */}
        <div className="flex flex-col gap-1">
          <p className="font-serif text-base text-text-muted">{t("landing.tagline1")}</p>
          <p className="font-serif text-base text-text-muted">{t("landing.tagline2")}</p>
        </div>
      </div>

      {/* Primary action — large, thumb-reachable */}
      <div className="animate-fade-up relative mt-16 flex w-full max-w-sm flex-col items-center gap-4" style={{ animationDelay: "200ms" }}>
        <button
          type="button"
          onClick={onBegin}
          className="group flex w-full items-center justify-center gap-3 rounded-full border border-gold bg-gold/5 px-10 py-4 font-sans text-base tracking-[0.2em] uppercase text-gold transition-colors duration-200 hover:bg-gold hover:text-bg"
        >
          <span
            aria-hidden
            className="inline-block h-4 w-4 rounded-full border-2 border-current"
          />
          {t("landing.begin")}
        </button>
        <p className="font-sans text-xs tracking-wide text-text-muted">
          {t("landing.beginHint")}
        </p>
      </div>
    </main>
  );
}
