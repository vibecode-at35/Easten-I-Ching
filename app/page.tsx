"use client";

import { useState } from "react";
import { castFromLineValues, castHexagram } from "../lib/iching/casting";
import type { CastResult } from "../lib/iching/types";
import { Landing } from "../components/Landing";
import { QuestionEntry } from "../components/QuestionEntry";
import { CastingCeremony } from "../components/CastingCeremony";
import { ReadingScreen } from "../components/ReadingScreen";
import { ExitButton } from "../components/ExitButton";
import { useLocale } from "../lib/i18n/LocaleProvider";

/**
 * The core loop's orchestration: landing -> question entry -> casting
 * ceremony -> reading.
 *
 * The AI clarification step is no longer a screen of its own (M4 — feedback
 * #3): QuestionEntry consults /api/clarify and shows any suggestion inline,
 * then hands back the question plus whatever context the person added.
 *
 * Dev toggle: append ?devHexagram=1 or ?devHexagram=2 to force the cast to a
 * seeded hexagram and skip the ceremony (straight to the reading) for fast
 * iteration. Read only at cast time (inside handleReady, after a user
 * action), never during the initial render, so there's no SSR/CSR mismatch.
 */
type Phase = "landing" | "entry" | "casting" | "reading";

export default function HomePage() {
  const { locale } = useLocale();
  const [phase, setPhase] = useState<Phase>("landing");
  const [question, setQuestion] = useState("");
  const [cast, setCast] = useState<CastResult | null>(null);
  const [context, setContext] = useState("");

  function goHome() {
    setPhase("landing");
    setQuestion("");
    setCast(null);
    setContext("");
  }

  function castAnother() {
    setQuestion("");
    setCast(null);
    setContext("");
    setPhase("entry");
  }

  function handleReady(submittedQuestion: string, addedContext?: string) {
    const forced = new URLSearchParams(window.location.search).get("devHexagram");

    setQuestion(submittedQuestion);
    setContext(addedContext ?? "");

    if (forced === "1" || forced === "2") {
      setCast(forced === "1" ? castFromLineValues([7, 7, 7, 7, 7, 7]) : castFromLineValues([8, 8, 8, 8, 8, 8]));
      setPhase("reading");
      return;
    }

    setCast(castHexagram());
    setPhase("casting");
  }

  if (phase === "landing") {
    return <Landing onBegin={() => setPhase("entry")} />;
  }

  const screen =
    phase === "casting" && cast ? (
      <CastingCeremony
        question={question}
        cast={cast}
        onComplete={(completedCast) => {
          setCast(completedCast);
          setPhase("reading");
        }}
      />
    ) : phase === "reading" && cast ? (
      <ReadingScreen
        question={question}
        context={context}
        cast={cast}
        locale={locale}
        onCastAnother={castAnother}
        onHome={goHome}
      />
    ) : (
      <QuestionEntry onReady={handleReady} />
    );

  // Every in-flow screen (entry / casting / reading) gets the always-available
  // exit back to the landing screen; the landing itself returned above.
  return (
    <>
      <ExitButton onExit={goHome} />
      {screen}
    </>
  );
}
