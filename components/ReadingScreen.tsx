"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { CastResult } from "../lib/iching/types";
import type { Locale } from "../lib/interpretation/types";
import { getHexagramStructure } from "../lib/db/hexagrams";
import { trigramImage, trigramName } from "../lib/i18n/trigrams";
import { HexagramGlyph } from "./HexagramGlyph";
import { useT } from "../lib/i18n/LocaleProvider";
import type { MessageKey } from "../lib/i18n/messages";
import { BaguaRing } from "./ornament/BaguaRing";
import { CarvedFrame } from "./ornament/CarvedFrame";
import { CloudScroll } from "./ornament/CloudScroll";
import { riseFromAsh, staggerContainer } from "../lib/motion";

/**
 * The reading screen (M4 redesign).
 *
 * Leads with a structural summary the moment the cast lands — hexagram glyph,
 * name, trigrams, and verified corpus cards (Quẻ Từ = judgment, Ý Nghĩa = the
 * 象/image text) — then the full, question-specific AI reading streams in
 * eagerly and lives behind a "Xem chi tiết" toggle. The Lời Khuyên card shows
 * the reading's decisive closing once it finishes.
 *
 * Sourcing discipline: the glyph/name/trigrams come from the M1 seed
 * (getHexagramStructure) and fixed trigram labels; the judgment/image cards
 * come from verified corpus text via /api/hexagram (server-side, so the 250KB
 * corpus never reaches the client). Nothing here invents hexagram content —
 * a field with no verified text is simply omitted. The reading itself is the
 * already-fabrication-guarded /api/interpret stream.
 */
export interface ReadingScreenProps {
  question: string;
  context?: string;
  cast: CastResult;
  locale?: Locale;
  /** Cast a new question (back to entry). */
  onCastAnother: () => void;
  /** Back to the landing screen. */
  onHome: () => void;
}

type Status = "loading" | "streaming" | "done" | "error";

/** Paragraphs that read like the trailing source citation, not the guidance. */
const CITATION_RE =
  /(—|bản dịch|dịch giả|theo bản|nguồn|source|translation|legge|ngô tất tố|译自|译本|出自|《)/i;

/**
 * Pulls the reading's decisive closing out of the finished stream for the
 * "Lời Khuyên" card: the last paragraph that isn't the source citation,
 * trimmed to its closing sentence(s) if it's a long block.
 */
function extractBottomLine(text: string): string | null {
  const cleaned = text.trim();
  if (!cleaned) return null;

  const paras = cleaned.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  while (paras.length > 1) {
    const last = paras[paras.length - 1]!;
    if (last.length <= 180 && CITATION_RE.test(last)) paras.pop();
    else break;
  }

  let candidate = paras[paras.length - 1] ?? cleaned;
  if (candidate.length > 260) {
    const sentences = candidate.split(/(?<=[.!?。！？…])\s+/).filter(Boolean);
    candidate = sentences.slice(-2).join(" ");
  }
  return candidate.trim() || null;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-3 py-4 text-center">
      <span className="font-sans text-[0.62rem] tracking-[0.18em] uppercase text-gold/70">{label}</span>
      <span className="font-serif text-base text-text">{value}</span>
    </div>
  );
}

function Card({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <CarvedFrame corner="cloud" className="w-full">
      <div className="rounded-2xl bg-surface/55 px-6 py-5">
        <div className="mb-2 flex items-center gap-2">
          <span aria-hidden className="text-gold-bright">{icon}</span>
          <span className="font-sans text-xs tracking-[0.18em] uppercase text-gold/80">{label}</span>
        </div>
        <div className="font-serif text-base leading-relaxed text-text">{children}</div>
      </div>
    </CarvedFrame>
  );
}

export function ReadingScreen({ question, context, cast, locale = "en", onCastAnother, onHome }: ReadingScreenProps) {
  const t = useT();
  const [status, setStatus] = useState<Status>("loading");
  const [text, setText] = useState("");
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Verified corpus text for the cards (server-side fetch — no corpus in the client bundle).
  const [judgment, setJudgment] = useState<string | null>(null);
  const [imageText, setImageText] = useState<string | null>(null);

  const structure = getHexagramStructure(cast.primaryHexagram);

  // ── Card text (verified corpus) ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setJudgment(null);
    setImageText(null);
    fetch(`/api/hexagram?n=${cast.primaryHexagram}&locale=${locale}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setJudgment(data.judgment ?? null);
        setImageText(data.image ?? null);
      })
      .catch(() => {
        /* cards simply stay absent — never invented */
      });
    return () => {
      cancelled = true;
    };
  }, [cast.primaryHexagram, locale]);

  // ── The reading (eager stream) ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      setStatus("loading");
      setText("");
      setErrorKey(null);

      try {
        const res = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cast, question, context, locale }),
          signal: controller.signal,
        });

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 422) setErrorKey("reading.error.422");
          else if (res.status === 502) setErrorKey("reading.error.502");
          else setErrorKey("reading.error.other");
          setStatus("error");
          return;
        }

        if (!res.body) {
          setErrorKey("reading.error.other");
          setStatus("error");
          return;
        }

        setStatus("streaming");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (cancelled) return;
          setText((current) => current + decoder.decode(value, { stream: true }));
        }

        if (cancelled) return;
        setStatus("done");
      } catch {
        if (cancelled) return;
        setErrorKey("reading.error.other");
        setStatus("error");
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cast, question, context, locale, retryCount]);

  const isStreaming = status === "streaming";
  const hasPartialText = text.length > 0;
  const bottomLine = status === "done" ? extractBottomLine(text) : null;

  return (
    <motion.main
      variants={staggerContainer}
      initial="initial"
      animate="enter"
      className="relative flex min-h-screen flex-col items-center px-6 py-16"
    >
      <div className="flex w-full max-w-2xl flex-col items-center gap-8">
        {/* ── Glyph framed by a turning bagua ring ── */}
        <motion.div variants={riseFromAsh} className="relative flex items-center justify-center py-4">
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <BaguaRing size={300} className="opacity-45" />
          </div>
          <div className="relative">
            <HexagramGlyph cast={cast} size="large" />
          </div>
        </motion.div>

        {/* ── Name ── */}
        <motion.div variants={riseFromAsh} className="flex flex-col items-center gap-1 text-center">
          <h1
            className="gold-foil font-brush leading-none"
            style={{ fontSize: "clamp(3rem, 13vw, 4.5rem)", letterSpacing: "0.08em" }}
          >
            {structure.nameZh}
          </h1>
          <p className="font-serif text-xl italic text-text-muted">{structure.namePinyin}</p>
          <span className="mt-1 font-sans text-xs tracking-[0.18em] uppercase text-gold/70">
            #{structure.number}
          </span>
          <CloudScroll width={170} className="mt-3" />
        </motion.div>

        {/* ── Trigram stats ── */}
        <motion.div variants={riseFromAsh} className="w-full">
          <CarvedFrame corner="cloud">
            <div className="grid w-full grid-cols-3 divide-x divide-hairline rounded-2xl bg-surface/40">
              <StatCell label={t("reading.upperTrigram")} value={trigramName(locale, structure.upperTrigram)} />
              <StatCell label={t("reading.lowerTrigram")} value={trigramName(locale, structure.lowerTrigram)} />
              <StatCell
                label={t("reading.image")}
                value={trigramImage(locale, structure.upperTrigram, structure.lowerTrigram)}
              />
            </div>
          </CarvedFrame>
        </motion.div>

        {/* ── Cards ── */}
        <motion.div variants={riseFromAsh} className="flex w-full flex-col gap-5">
          {judgment && (
            <Card icon="☰" label={t("reading.cardJudgment")}>
              {judgment}
            </Card>
          )}
          {imageText && (
            <Card icon="☷" label={t("reading.cardMeaning")}>
              {imageText}
            </Card>
          )}
          <Card icon="✦" label={t("reading.cardAdvice")}>
            {bottomLine ? (
              bottomLine
            ) : status === "error" ? (
              <span className="text-text-muted">{errorKey && t(errorKey)}</span>
            ) : (
              <span className="flex items-center gap-2 text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="oracle-dot" />
                  <span className="oracle-dot" />
                  <span className="oracle-dot" />
                </span>
                <span className="font-sans text-sm italic">{t("reading.advicePending")}</span>
              </span>
            )}
          </Card>
        </motion.div>

        {/* ── Full reading toggle ── */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="font-sans text-sm tracking-wide text-text-muted transition-colors hover:text-gold"
        >
          {expanded ? `▲ ${t("reading.collapse")}` : `▼ ${t("reading.expand")}`}
        </button>

        {expanded && (
          <div className="w-full border-t border-hairline pt-8">
            {/* Question echoed above the full reading */}
            <div className="mb-8 flex flex-col gap-2">
              <span className="font-sans text-[0.7rem] tracking-[0.22em] uppercase text-gold/80">
                {t("reading.yourQuestion")}
              </span>
              <p className="max-w-prose border-l-2 border-gold-dim pl-4 font-serif text-base italic leading-relaxed text-text">
                {question}
              </p>
              {context && context.trim().length > 0 && (
                <p className="max-w-prose border-l-2 border-hairline/40 pl-4 font-serif text-sm leading-relaxed text-text-muted">
                  {context}
                </p>
              )}
            </div>

            {status === "loading" ? (
              <div className="flex flex-col gap-5 pt-1">
                <div className="flex items-center gap-2.5">
                  <span className="oracle-dot" />
                  <span className="oracle-dot" />
                  <span className="oracle-dot" />
                </div>
                <p className="font-serif text-sm italic text-text-muted">{t("reading.consulting")}</p>
              </div>
            ) : status === "error" ? (
              <div className="flex flex-col items-start gap-6">
                {hasPartialText && (
                  <p className="max-w-prose whitespace-pre-wrap font-serif text-reading-body leading-[1.85] text-text">
                    {text}
                  </p>
                )}
                <div className="rounded-md border border-hairline bg-surface px-6 py-5">
                  <p className="font-serif text-base text-text-muted">{errorKey && t(errorKey)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="rounded-full border border-hairline px-8 py-2.5 font-sans text-sm tracking-widest uppercase text-text-muted transition-colors hover:border-text hover:text-text"
                >
                  {t("reading.retry")}
                </button>
              </div>
            ) : (
              <p
                className={`max-w-prose whitespace-pre-wrap font-serif text-reading-body leading-[1.85] text-text${
                  isStreaming ? " reading-cursor" : ""
                }`}
              >
                {text}
              </p>
            )}
          </div>
        )}

        {/* ── Actions ── */}
        <motion.div variants={riseFromAsh} className="mt-4 flex w-full flex-col items-center gap-4">
          <motion.button
            type="button"
            onClick={onCastAnother}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="w-full max-w-sm rounded-full border border-gold bg-gold/5 px-10 py-3.5 font-sans text-sm tracking-widest uppercase text-gold shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-colors duration-300 hover:bg-gold hover:text-bg"
          >
            {t("reading.castAnother")}
          </motion.button>
          <button
            type="button"
            onClick={onHome}
            className="font-sans text-xs tracking-wide text-text-muted transition-colors hover:text-text"
          >
            {t("reading.home")}
          </button>
        </motion.div>
      </div>
    </motion.main>
  );
}
