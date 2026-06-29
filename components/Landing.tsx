"use client";

import { motion } from "framer-motion";
import { useT } from "../lib/i18n/LocaleProvider";
import { BaguaRing } from "./ornament/BaguaRing";
import { CloudScroll } from "./ornament/CloudScroll";
import { Lantern } from "./ornament/Lantern";
import { riseFromAsh, staggerContainer } from "../lib/motion";

/**
 * The landing screen — the temple gateway of the imperial-lacquer redesign.
 *
 * The 易經 wordmark in brush calligraphy, layered with a gold-foil glint and a
 * drop-glow, stands inside a slowly-turning multi-ring bagua centerpiece, with
 * hanging palace lanterns in the upper corners and a cloud-scroll dividing the
 * wordmark from the taglines. Everything rises into place in a staggered
 * sequence. Purely presentational — it owns no app state; it just tells the
 * orchestrator (app/page.tsx) the person is ready to begin.
 */
export interface LandingProps {
  onBegin: () => void;
}

export function Landing({ onBegin }: LandingProps) {
  const t = useT();

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="enter"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20"
    >
      {/* Hanging lanterns — one full-width row so they always frame the two
          top corners symmetrically, clear of the wordmark and ring. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-3 flex justify-between px-6 sm:px-12">
        <Lantern size={44} />
        <Lantern size={44} />
      </div>

      <div className="relative flex flex-col items-center gap-7 text-center">
        {/* Emblem — the ring is a halo around the wordmark only. The block
            reserves the ring's full size so the text below starts clear of it. */}
        <motion.div
          variants={riseFromAsh}
          className="relative flex items-center justify-center"
          style={{ width: "min(360px, 86vmin)", height: "min(360px, 86vmin)" }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <BaguaRing size={360} className="opacity-80" />
          </div>
          {/* Wordmark — brush calligraphy, gold-foil glint over a drop-glow. */}
          <div className="relative leading-none">
            <span
              aria-hidden
              className="absolute inset-0 select-none font-brush text-gold blur-2xl"
              style={{ fontSize: "clamp(4.5rem, 24vw, 8rem)", letterSpacing: "0.06em", opacity: 0.55 }}
            >
              易經
            </span>
            <h1
              className="gold-foil animate-gold-glint relative font-brush leading-none"
              style={{ fontSize: "clamp(4.5rem, 24vw, 8rem)", letterSpacing: "0.06em" }}
            >
              易經
            </h1>
          </div>
        </motion.div>

        {/* Subtitle + cloud-scroll — below the ring, in clear lacquer. */}
        <motion.div variants={riseFromAsh} className="flex flex-col items-center gap-4">
          <p
            className="font-sans text-sm tracking-[0.55em] text-gold-bright"
            style={{ paddingLeft: "0.55em" }}
          >
            {t("landing.subtitle")}
          </p>
          <CloudScroll width={240} />
        </motion.div>

        {/* What this is. */}
        <motion.div variants={riseFromAsh} className="flex flex-col gap-1.5">
          <p className="font-serif text-base text-text-muted sm:text-lg">{t("landing.tagline1")}</p>
          <p className="font-serif text-base text-text-muted sm:text-lg">{t("landing.tagline2")}</p>
        </motion.div>

        {/* Primary action — the ornate gate. */}
        <motion.div
          variants={riseFromAsh}
          className="mt-6 flex w-full max-w-sm flex-col items-center gap-4"
        >
          <motion.button
            type="button"
            onClick={onBegin}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border-2 border-gold bg-bg/70 px-10 py-4 font-sans text-base font-medium tracking-[0.25em] uppercase text-gold-bright shadow-[0_0_28px_rgba(212,175,55,0.28)] backdrop-blur-md transition-colors duration-300 hover:bg-gold hover:text-bg"
          >
            <span aria-hidden className="text-lg leading-none">☯</span>
            {t("landing.begin")}
          </motion.button>
          <p className="font-sans text-xs tracking-wide text-text-muted">{t("landing.beginHint")}</p>
        </motion.div>
      </div>
    </motion.main>
  );
}
