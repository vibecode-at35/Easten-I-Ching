"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { CastResult, CoinFace } from "../lib/iching/types";
import { coinFacesForLine } from "../lib/iching/casting";
import { LineRow } from "./HexagramGlyph";
import { Seal } from "./Seal";
import { getAllHexagramIdentities } from "../lib/db/hexagrams";
import { useT } from "../lib/i18n/LocaleProvider";
import { BaguaRing } from "./ornament/BaguaRing";
import { riseFromAsh, staggerContainer } from "../lib/motion";

/**
 * The casting ceremony — docs/TASKS/milestone-3-reading-experience.md §6.2.
 *
 * The full CastResult is computed once, up front, entirely by lib/iching
 * (golden rule #1 — this component never calls the engine's PRNG or touches
 * coin/hexagram logic). What the ceremony controls is only the *reveal*:
 * the person taps to toss each of the six lines in turn, bottom-to-top.
 * Tapping tosses the coins straight away — a fast continuous spin while
 * "in the air," then a smooth deceleration into a still landing — then,
 * after a beat, the next line the engine already determined is drawn in
 * like a brush stroke. The coins are a decorative flip only — they never
 * display a fabricated heads/tails outcome the engine didn't actually
 * produce.
 *
 * The hexagram's name shown on the seal once complete comes only from the
 * M1 structural seed (getAllHexagramIdentities — number + Chinese name for
 * all 64), never from the demo corpus's judgment/image text, which only
 * covers Hexagrams 1-2 and would throw for any other cast.
 */
export interface CastingCeremonyProps {
  question: string;
  cast: CastResult;
  onComplete: (cast: CastResult) => void;
}

/** Per-coin spin start offset, for a little life (see FLIP_DURATION_MS note). */
const COIN_STAGGER_MS = 90;
/**
 * Time to wait after a toss before drawing the line. Must cover the coin-toss
 * keyframe (1400ms in globals.css) plus the last coin's stagger.
 */
const FLIP_DURATION_MS = 1400 + COIN_STAGGER_MS * 2;
/** The still beat after the coins land, before the line is drawn. */
const PAUSE_AFTER_LANDING_MS = 400;

const hexagramIdentities = getAllHexagramIdentities();

/**
 * A casting coin drawn as a real 方孔錢 — a round Chinese cash coin with a
 * square hole and the 乾隆通寶 reign inscription around it, the kind diviners
 * actually toss. The face is the engine-derived one (coinFacesForLine), never
 * invented here: bright gold = yang, aged bronze = yin, and a neutral muted
 * coin at rest (face === null) before the first toss. The tone keeps yin/yang
 * legible at a glance (M4 feedback #5) while looking like a genuine coin.
 */
type CoinPalette = { disc: string; rim: string; inner: string; char: string; sheen: string };

const COIN_PALETTE: Record<"yang" | "yin" | "rest", CoinPalette> = {
  yang: { disc: "#cda64d", rim: "#866627", inner: "#a9842f", char: "#2f240c", sheen: "rgba(255,248,225,0.55)" },
  yin: { disc: "#6e5d3c", rim: "#42361f", inner: "#564629", char: "#d7b76a", sheen: "rgba(255,240,200,0.16)" },
  rest: { disc: "#4b4736", rim: "#2b2920", inner: "#3a382b", char: "#9a927e", sheen: "rgba(255,255,255,0.08)" },
};

/** 乾隆通寶, placed top–bottom–right–left in the conventional reading order. */
const COIN_INSCRIPTION = [
  { ch: "乾", x: 32, y: 14 },
  { ch: "隆", x: 32, y: 50 },
  { ch: "通", x: 50, y: 32 },
  { ch: "寶", x: 14, y: 32 },
];

function Coin({ face, tossId, index }: { face: CoinFace | null; tossId: number; index: number }) {
  const p = COIN_PALETTE[face ?? "rest"];

  return (
    <div
      key={`${index}-${tossId}`}
      className={`h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] ${tossId > 0 ? "animate-coin-toss" : ""}`}
      style={{ animationDelay: tossId > 0 ? `${index * COIN_STAGGER_MS}ms` : undefined }}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]">
        {/* disc + raised outer rim */}
        <circle cx="32" cy="32" r="31" fill={p.disc} stroke={p.rim} strokeWidth="1.6" />
        <circle cx="32" cy="32" r="27" fill="none" stroke={p.inner} strokeWidth="1" opacity="0.85" />
        {/* metallic sheen */}
        <ellipse cx="24" cy="21" rx="15" ry="9" fill={p.sheen} />
        {/* square hole — raised inner border (內郭) then the cutout to the page bg */}
        <rect x="22" y="22" width="20" height="20" rx="1.5" fill={p.inner} />
        <rect x="24.5" y="24.5" width="15" height="15" rx="1" fill="var(--color-bg)" />
        {/* 乾隆通寶 */}
        {COIN_INSCRIPTION.map(({ ch, x, y }) => (
          <text
            key={ch}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-serif)"
            fontSize="11"
            fontWeight="600"
            fill={p.char}
          >
            {ch}
          </text>
        ))}
      </svg>
    </div>
  );
}

export function CastingCeremony({ question, cast, onComplete }: CastingCeremonyProps) {
  const t = useT();
  const [revealed, setRevealed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tossId, setTossId] = useState(0);
  const [faces, setFaces] = useState<[CoinFace, CoinFace, CoinFace] | null>(null);
  const isComplete = revealed >= 6;

  function handleToss() {
    if (busy || isComplete) return;
    // Faces for the line being cast now (position revealed+1) — derived by the
    // engine so the coins always sum to the actual cast line (golden rule #1).
    const castingLine = cast.lines.find((l) => l.position === revealed + 1);
    if (castingLine) setFaces(coinFacesForLine(castingLine.value));

    setBusy(true);
    setTossId((id) => id + 1);
    setTimeout(() => {
      setTimeout(() => {
        setRevealed((count) => count + 1);
        setBusy(false);
      }, PAUSE_AFTER_LANDING_MS);
    }, FLIP_DURATION_MS);
  }

  const topToBottom = [...cast.lines].sort((a, b) => b.position - a.position);
  const changingPositions = new Set(cast.changingLinePositions);
  const identity = hexagramIdentities.find((h) => h.number === cast.primaryHexagram);

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="enter"
      className="relative flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-16 sm:gap-14 sm:py-20"
    >
      <motion.p
        variants={riseFromAsh}
        className="max-w-md text-center font-serif text-base italic text-text-muted"
      >
        {question}
      </motion.p>

      {/* The casting altar: the hexagram forms at the center of a turning bagua
          ring; the seal stamps in beside it on completion with an ember flare. */}
      <motion.div variants={riseFromAsh} className="relative flex items-center justify-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <BaguaRing size={440} className="opacity-55" />
        </div>

        <div className="relative flex items-center gap-8 sm:gap-12">
          <div className="flex flex-col items-center gap-3" aria-live="polite">
            {topToBottom.map((line) =>
              line.position <= revealed ? (
                <div key={line.position} className="brush-reveal">
                  <LineRow
                    isYang={(line.value & 1) === 1}
                    isChanging={changingPositions.has(line.position)}
                    size="large"
                  />
                </div>
              ) : (
                <div key={line.position} className="flex h-4 w-44 items-center gap-2" aria-hidden />
              ),
            )}
          </div>

          {isComplete && identity && (
            <div className="relative flex flex-col items-center gap-2">
              {/* ember flare igniting behind the seal as it stamps */}
              <div
                aria-hidden
                className="animate-pop-in pointer-events-none absolute -inset-6 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(244,170,90,0.35) 0%, rgba(200,65,42,0.18) 45%, transparent 72%)",
                }}
              />
              <div className="animate-seal-stamp relative flex flex-col items-center gap-2">
                <Seal label={identity.nameZh} />
                <span className="font-sans text-sm text-text-muted">#{identity.number}</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={riseFromAsh} className="flex flex-col items-center gap-6">
        <div className="flex gap-5 sm:gap-6" style={{ perspective: "800px" }} aria-hidden>
          {[0, 1, 2].map((i) => (
            <Coin key={`${i}-${tossId}`} index={i} tossId={tossId} face={faces ? faces[i] : null} />
          ))}
        </div>

        {!isComplete ? (
          <motion.button
            type="button"
            onClick={handleToss}
            disabled={busy}
            whileHover={!busy ? { scale: 1.04 } : undefined}
            whileTap={!busy ? { scale: 0.97 } : undefined}
            className="rounded-full border border-gold bg-gold/5 px-10 py-2.5 font-sans text-sm tracking-widest uppercase text-gold shadow-[0_0_18px_rgba(212,175,55,0.14)] transition-colors duration-300 enabled:hover:bg-gold enabled:hover:text-bg disabled:border-hairline disabled:text-text-muted disabled:shadow-none"
          >
            {revealed === 0 ? t("cast.first") : t("cast.line", { n: revealed + 1 })}
          </motion.button>
        ) : (
          <motion.button
            type="button"
            onClick={() => onComplete(cast)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-full border border-gold bg-gold/5 px-10 py-2.5 font-sans text-sm tracking-widest uppercase text-gold shadow-[0_0_18px_rgba(212,175,55,0.14)] transition-colors duration-300 hover:bg-gold hover:text-bg"
          >
            {t("cast.continue")}
          </motion.button>
        )}
      </motion.div>
    </motion.main>
  );
}
