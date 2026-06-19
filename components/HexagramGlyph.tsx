import { deriveResultingLines } from "../lib/iching/casting";
import type { CastResult, ResultingLine } from "../lib/iching/types";

/**
 * Renders a CastResult as a hexagram glyph (docs/TASKS/milestone-3-reading-experience.md §5.5).
 *
 * Purely presentational — every line, changing mark, and the resulting
 * hexagram's pattern come from the deterministic engine (lib/iching). This
 * component performs no hexagram computation of its own (AGENTS.md golden
 * rule #1): the resulting pattern is derived once, in casting.ts, with a
 * self-check against the engine's own resultingHexagram number.
 */
export interface HexagramGlyphProps {
  cast: CastResult;
}

interface LineRowProps {
  isYang: boolean;
  isChanging: boolean;
  size: "default" | "small";
}

const BAR_SIZES = {
  default: { width: "w-28", height: "h-3" },
  small: { width: "w-16", height: "h-2" },
} as const;

/** One brush-weighted line: yang is a single bar, yin is two segments with a center gap. */
function LineRow({ isYang, isChanging, size }: LineRowProps) {
  const { width, height } = BAR_SIZES[size];
  return (
    <div className="flex items-center gap-2">
      <div className={`flex ${height} ${width} justify-between`}>
        {isYang ? (
          <span className={`${height} w-full rounded-full bg-ink shadow-[inset_0_1px_1px_rgba(0,0,0,0.18)]`} />
        ) : (
          <>
            <span className={`${height} w-[44%] rounded-full bg-ink shadow-[inset_0_1px_1px_rgba(0,0,0,0.18)]`} />
            <span className={`${height} w-[44%] rounded-full bg-ink shadow-[inset_0_1px_1px_rgba(0,0,0,0.18)]`} />
          </>
        )}
      </div>
      <span
        aria-hidden
        className={`h-2 w-2 rounded-full ${isChanging ? "bg-cinnabar" : "bg-transparent"}`}
      />
    </div>
  );
}

interface LineStackProps {
  lines: Array<{ position: number; isYang: boolean }>;
  changingPositions: ReadonlySet<number>;
  size: "default" | "small";
}

/** Stacks six LineRows bottom-to-top: position 1 at the bottom, position 6 at the top. */
function LineStack({ lines, changingPositions, size }: LineStackProps) {
  const topToBottom = [...lines].sort((a, b) => b.position - a.position);
  return (
    <div className="flex flex-col items-center gap-2">
      {topToBottom.map((line) => (
        <LineRow
          key={line.position}
          isYang={line.isYang}
          isChanging={changingPositions.has(line.position)}
          size={size}
        />
      ))}
    </div>
  );
}

export function HexagramGlyph({ cast }: HexagramGlyphProps) {
  const primaryLines = cast.lines.map((line) => ({
    position: line.position,
    isYang: (line.value & 1) === 1, // odd values (7, 9) are yang — same convention as lib/iching/casting.ts
  }));
  const changingPositions = new Set(cast.changingLinePositions);
  const resultingLines: ResultingLine[] | null = deriveResultingLines(cast);

  return (
    <div className="flex flex-col items-center gap-6">
      <LineStack lines={primaryLines} changingPositions={changingPositions} size="default" />

      {resultingLines && (
        <div className="flex flex-col items-center gap-3">
          <span aria-hidden className="text-ink-muted">
            ↓
          </span>
          <LineStack lines={resultingLines} changingPositions={new Set()} size="small" />
        </div>
      )}
    </div>
  );
}
