/**
 * Placeholder shell — Task 1 of M3 (design tokens + app shell) only.
 * The question entry, casting ceremony, and reading screens are later
 * tasks (docs/TASKS/milestone-3-reading-experience.md §11, tasks 4-6).
 * This page exists only to confirm the tokens and layout render correctly.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-serif text-hexagram-name text-ink">易經</h1>
      <p className="max-w-md font-sans text-base text-ink-muted">
        Design tokens and app shell for the reading experience. The question,
        casting ceremony, and reading screens come next.
      </p>
    </main>
  );
}
