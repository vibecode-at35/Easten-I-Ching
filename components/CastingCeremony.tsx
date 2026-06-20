"use client";

import { useState } from "react";
import type { CastResult } from "../lib/iching/types";
import { LineRow } from "./HexagramGlyph";
import { Seal } from "./Seal";
import { getAllHexagramIdentities } from "../lib/db/hexagrams";

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

/** Matches the coin-toss keyframes' total duration in globals.css (spin + settle). */
const FLIP_DURATION_MS = 1400;
/** The still beat after the coins land, before the line is drawn. */
const PAUSE_AFTER_LANDING_MS = 400;

const hexagramIdentities = getAllHexagramIdentities();

/** A traditional round coin with a square center hole — ink-colored, evenodd cutout. */
function Coin({ tossId }: { tossId: number }) {
  return (
    <svg viewBox="0 0 40 40" className={`h-9 w-9 ${tossId > 0 ? "animate-coin-toss" : ""}`}>
      <path
        d="M 20 2 A 18 18 0 1 1 20 38 A 18 18 0 1 1 20 2 Z M 15 15 L 25 15 L 25 25 L 15 25 Z"
        fillRule="evenodd"
        className="fill-ink"
      />
    </svg>
  );
}

export function CastingCeremony({ question, cast, onComplete }: CastingCeremonyProps) {
  const [revealed, setRevealed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [tossId, setTossId] = useState(0);
  const isComplete = revealed >= 6;

  function handleToss() {
    if (busy || isComplete) return;
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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-20 px-6 py-20">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: "radial-gradient(circle, transparent 55%, rgba(58, 46, 28, 0.15) 100%)",
        }}
      />

      <p className="max-w-md text-center font-serif text-base text-ink-muted">{question}</p>

      <div className="flex items-center gap-10">
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
          <div className="flex flex-col items-center gap-2 [animation:seal-fade-in_400ms_ease-out_both]">
            <Seal label={identity.nameZh} />
            <span className="font-sans text-sm text-ink-muted">#{identity.number}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-4" style={{ perspective: "400px" }} aria-hidden>
          {[0, 1, 2].map((i) => (
            <Coin key={`${i}-${tossId}`} tossId={tossId} />
          ))}
        </div>

        {!isComplete ? (
          <button
            type="button"
            onClick={handleToss}
            disabled={busy}
            className="rounded-full border border-cinnabar px-8 py-2 font-sans text-sm tracking-wide text-cinnabar transition-colors enabled:hover:bg-cinnabar enabled:hover:text-paper-base disabled:border-hairline disabled:text-ink-muted"
          >
            {revealed === 0 ? "Cast the first line" : `Cast line ${revealed + 1} of 6`}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onComplete(cast)}
            className="rounded-full border border-cinnabar px-8 py-2 font-sans text-sm tracking-wide text-cinnabar transition-colors hover:bg-cinnabar hover:text-paper-base"
          >
            Continue to the reading
          </button>
        )}
      </div>
    </main>
  );
}
