"use client";

import { useState } from "react";
import { castFromLineValues, castHexagram } from "../lib/iching/casting";
import type { CastResult } from "../lib/iching/types";
import { QuestionEntry } from "../components/QuestionEntry";
import { CastingCeremony } from "../components/CastingCeremony";
import { HexagramGlyph } from "../components/HexagramGlyph";

/**
 * The core loop's orchestration (docs/TASKS/milestone-3-reading-experience.md
 * §4): question entry -> casting ceremony -> reading. The reading screen
 * itself is Task 6 — what's rendered here for "reading" is a placeholder
 * that only confirms the completed CastResult arrived, not the real screen.
 *
 * Dev toggle (§8): append ?devHexagram=1 or ?devHexagram=2 to force the cast
 * to a seeded hexagram for testing before the full corpus exists. Read only
 * at cast time (inside handleReady, after a user action), never during the
 * initial render, so there's no SSR/CSR markup mismatch.
 */
type Phase = "entry" | "casting" | "reading";

export default function HomePage() {
  const [phase, setPhase] = useState<Phase>("entry");
  const [question, setQuestion] = useState("");
  const [cast, setCast] = useState<CastResult | null>(null);

  function handleReady(submittedQuestion: string) {
    const forced = new URLSearchParams(window.location.search).get("devHexagram");
    const newCast =
      forced === "1"
        ? castFromLineValues([7, 7, 7, 7, 7, 7])
        : forced === "2"
          ? castFromLineValues([8, 8, 8, 8, 8, 8])
          : castHexagram();

    setQuestion(submittedQuestion);
    setCast(newCast);
    setPhase("casting");
  }

  if (phase === "casting" && cast) {
    return (
      <CastingCeremony
        question={question}
        cast={cast}
        onComplete={(completedCast) => {
          setCast(completedCast);
          setPhase("reading");
        }}
      />
    );
  }

  if (phase === "reading" && cast) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <HexagramGlyph cast={cast} />
        <p className="max-w-md font-serif text-base text-ink-muted">{question}</p>
        <p className="font-sans text-sm text-ink-muted">
          The reading screen is next (Task 6) — this only confirms the cast arrived.
        </p>
      </main>
    );
  }

  return <QuestionEntry onReady={handleReady} />;
}
