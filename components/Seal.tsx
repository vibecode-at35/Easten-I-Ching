/**
 * The seal (印章) — docs/TASKS/milestone-3-reading-experience.md §5.4.
 * A cinnabar square containing the hexagram's Chinese name (or number),
 * rendered like a carved stamp. The one moment of strong color on the
 * reading; everywhere else is paper and ink.
 *
 * Purely presentational — renders whatever label it's given. Sourcing a
 * verified label (e.g. the corpus's name_zh) is the caller's job; this
 * component never invents or looks up hexagram content itself.
 */
export interface SealProps {
  /** The carved content — typically the hexagram's Chinese name (e.g. "乾"), or its number. */
  label: string;
}

/**
 * A fixed, hand-tuned clip-path: a square with subtly uneven, chamfered
 * corners and edges — "a slightly irregular carved edge," not a perfect
 * machine rectangle. Deliberately NOT randomized per render; the
 * irregularity should read as hand-carved, not broken.
 */
const CARVED_EDGE =
  "polygon(3% 0%, 95% 1%, 100% 5%, 99% 60%, 100% 96%, 93% 100%, 40% 99%, 4% 100%, 0% 94%, 1% 45%, 0% 4%)";

export function Seal({ label }: SealProps) {
  const isMultiChar = label.length > 1;

  return (
    <div
      className="flex h-20 w-20 items-center justify-center bg-cinnabar shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]"
      style={{ clipPath: CARVED_EDGE }}
    >
      <span className={`font-serif text-paper-base ${isMultiChar ? "text-xl" : "text-3xl"}`}>
        {label}
      </span>
    </div>
  );
}
