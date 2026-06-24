"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { useLocale, useT } from "../lib/i18n/LocaleProvider";
import { BaguaRing } from "./ornament/BaguaRing";
import { CarvedFrame } from "./ornament/CarvedFrame";
import { CloudScroll } from "./ornament/CloudScroll";
import { riseFromAsh, staggerContainer } from "../lib/motion";

export interface QuestionEntryProps {
  /**
   * Called when the person is ready to cast. `context` is any extra detail
   * they added inline after the AI's gentle suggestion (omitted if none).
   */
  onReady?: (question: string, context?: string) => void;
}

type ClarifyState = "idle" | "loading" | "shown";

/**
 * Question entry with the AI suggestion folded in *at the box* (M4 — feedback
 * #3: hints must appear right here, not on a separate screen the flow jumps
 * to). The first time the person tries to cast — or when they tap "ask AI to
 * refine" — we consult /api/clarify. If the question is too sparse to read
 * well, the oracle's gentle nudge appears inline beneath the textarea with a
 * place to add a line of context; they refine and cast without ever leaving
 * this screen. If the question is already clear (or the call fails), we just
 * proceed. The clarify step is advisory only and never blocks casting.
 */
export function QuestionEntry({ onReady }: QuestionEntryProps) {
  const t = useT();
  const { locale } = useLocale();
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [clarifyState, setClarifyState] = useState<ClarifyState>("idle");
  const [consulted, setConsulted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isReady = question.trim().length > 0;
  const isLoading = clarifyState === "loading";

  // Auto-expand the question textarea to fit its content.
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [question]);

  function handleQuestionChange(value: string) {
    setQuestion(value);
    // Editing the question invalidates any prior suggestion.
    if (consulted) {
      setConsulted(false);
      setSuggestion(null);
      setClarifyState("idle");
    }
  }

  function proceed() {
    onReady?.(question.trim(), context.trim() || undefined);
  }

  /**
   * Consult the oracle's gatekeeper. Returns true if the caller should proceed
   * straight to casting, false if a suggestion is now shown for refinement.
   * Fails open: any error means proceed.
   */
  async function runClarify(): Promise<boolean> {
    setClarifyState("loading");
    try {
      const res = await fetch("/api/clarify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), locale }),
      });
      const data = await res.json();
      setConsulted(true);

      if (data.action === "ask" && data.clarificationQuestion) {
        setSuggestion(data.clarificationQuestion);
        setClarifyState("shown");
        return false;
      }
      setClarifyState("idle");
      return true;
    } catch {
      // Network/parse failure — never block the reading.
      setConsulted(true);
      setClarifyState("idle");
      return true;
    }
  }

  async function handleCast() {
    if (!isReady || isLoading) return;
    if (consulted) {
      proceed();
      return;
    }
    const goAhead = await runClarify();
    if (goAhead) proceed();
  }

  async function handleSuggestClick() {
    if (!isReady || isLoading) return;
    await runClarify();
  }

  function handleQuestionKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleCast();
    }
  }

  function handleContextKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      proceed();
    }
  }

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="enter"
      className="relative flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-20"
    >
      {/* Faint bagua centerpiece behind the altar. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <BaguaRing size={460} className="opacity-35" />
      </div>

      {/* 易經 brush mark + cloud-scroll. */}
      <motion.div variants={riseFromAsh} className="relative flex flex-col items-center gap-4">
        <span
          className="gold-foil font-brush leading-none"
          style={{ fontSize: "3.4rem", letterSpacing: "0.06em" }}
        >
          易經
        </span>
        <CloudScroll width={180} />
      </motion.div>

      {/* The question altar. */}
      <motion.div variants={riseFromAsh} className="relative flex w-full max-w-2xl flex-col items-center gap-8">
        <CarvedFrame glow corner="cloud" className="w-full">
          <div className="rounded-2xl bg-bg/80 px-6 py-8 backdrop-blur-md sm:px-10 sm:py-10">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(event) => handleQuestionChange(event.target.value)}
              onKeyDown={handleQuestionKeyDown}
              rows={1}
              placeholder={t("entry.placeholder")}
              disabled={isLoading}
              className="w-full resize-none bg-transparent text-center font-serif text-2xl leading-relaxed text-text placeholder:text-text-muted/70 transition-colors focus:outline-none disabled:opacity-50 sm:text-3xl"
              style={{ overflow: "hidden" }}
            />

            {/* Inline AI suggestion — appears right here, never on another screen */}
            {clarifyState === "shown" && suggestion && (
              <div className="animate-pop-in mt-6 w-full rounded-lg border border-gold-dim bg-bg/40 p-5 text-left">
                <div className="mb-3 flex items-center gap-2">
                  <span aria-hidden className="text-gold-bright">✦</span>
                  <p className="font-serif text-base italic leading-relaxed text-text">{suggestion}</p>
                </div>
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  onKeyDown={handleContextKeyDown}
                  rows={2}
                  placeholder={t("clarify.placeholder")}
                  className="w-full resize-none rounded-md border border-hairline bg-bg/50 px-3 py-2 font-serif text-base leading-relaxed text-text placeholder:text-text-muted/40 focus:border-gold-dim focus:outline-none"
                />
              </div>
            )}
          </div>
        </CarvedFrame>

        {/* Controls */}
        <div className="flex min-h-12 flex-col items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="oracle-dot" />
                <span className="oracle-dot" />
                <span className="oracle-dot" />
              </span>
              <span className="font-sans text-xs tracking-wide text-text-muted">{t("entry.thinking")}</span>
            </div>
          ) : (
            isReady && (
              <>
                <motion.button
                  type="button"
                  onClick={handleCast}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full border border-gold bg-gold/5 px-10 py-3 font-sans text-sm tracking-widest uppercase text-gold shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-colors duration-300 hover:bg-gold hover:text-bg"
                >
                  {t("entry.submit")}
                </motion.button>

                {/* Ask-AI affordance (before consulting) / skip-context link (after) */}
                {clarifyState === "shown" ? (
                  <button
                    type="button"
                    onClick={proceed}
                    className="font-sans text-xs tracking-wide text-text-muted underline-offset-4 transition-colors hover:text-text hover:underline"
                  >
                    {t("clarify.askAsIs")}
                  </button>
                ) : (
                  !consulted && (
                    <button
                      type="button"
                      onClick={handleSuggestClick}
                      className="flex items-center gap-1.5 font-sans text-xs tracking-wide text-text-muted transition-colors hover:text-gold"
                    >
                      <span aria-hidden>✦</span>
                      {t("entry.suggest")}
                    </button>
                  )
                )}
              </>
            )
          )}
        </div>
      </motion.div>
    </motion.main>
  );
}
