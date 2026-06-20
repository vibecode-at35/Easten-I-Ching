"use client";

import { useState, type FormEvent } from "react";

/**
 * Question entry screen — docs/TASKS/milestone-3-reading-experience.md §6.1.
 * A calm, single screen: the 易經 mark, a free-text question, a quiet
 * cinnabar "Cast" affordance. Wired to nothing yet (the casting ceremony is
 * Task 5) — this component only captures the question and signals
 * readiness via onReady, so the next task can wire it to the real ceremony
 * without changing this screen.
 */
export interface QuestionEntryProps {
  /** Called with the trimmed question when the person submits. No-op by default until Task 5 wires the casting ceremony. */
  onReady?: (question: string) => void;
}

export function QuestionEntry({ onReady }: QuestionEntryProps) {
  const [question, setQuestion] = useState("");
  const isReady = question.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady) return;
    onReady?.(question.trim());
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 px-6 py-16">
      <span className="font-serif text-hexagram-name text-ink">易經</span>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col items-center gap-8">
        <label htmlFor="question" className="font-serif text-2xl text-ink">
          What&apos;s on your mind?
        </label>

        <textarea
          id="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={5}
          placeholder="Ask what you came here to ask."
          className="w-full resize-none rounded-md border border-hairline bg-paper-raised px-5 py-4 text-center font-serif text-reading-body text-ink placeholder:text-ink-muted focus:outline-none"
        />

        <button
          type="submit"
          disabled={!isReady}
          className="rounded-full border border-cinnabar px-8 py-2 font-sans text-sm tracking-wide text-cinnabar transition-colors enabled:hover:bg-cinnabar enabled:hover:text-paper-base disabled:border-hairline disabled:text-ink-muted"
        >
          占卜
        </button>
      </form>
    </main>
  );
}
