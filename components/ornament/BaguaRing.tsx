/**
 * BaguaRing — a concentric, slowly-rotating 八卦 centerpiece for the
 * imperial-lacquer redesign. Three rings:
 *   - an outer band of all 64 hexagram glyphs (Unicode U+4DC0–U+4DFF, whose
 *     natural order is King Wen — ䷀ is Hexagram 1), counter-rotating;
 *   - a mid hairline ring;
 *   - an inner ring of the eight trigram symbols, rotating the other way.
 *
 * Purely decorative (AGENTS.md golden rules): these are fixed Unicode symbols
 * rendered as ornament, never an identification or transformation of the cast
 * hexagram — that lives only in lib/iching. No state, no hooks; motion is the
 * CSS `animate-bagua` / `animate-bagua-reverse` classes (paused under
 * prefers-reduced-motion via globals.css). Sized by the `size` prop (px).
 */
const TRIGRAMS = ["☰", "☱", "☲", "☳", "☴", "☵", "☶", "☷"];
const HEXAGRAMS = Array.from({ length: 64 }, (_, i) => String.fromCodePoint(0x4dc0 + i));

export interface BaguaRingProps {
  /** Outer diameter in px (capped to the viewport so it never overflows). */
  size?: number;
  className?: string;
}

export function BaguaRing({ size = 320, className = "" }: BaguaRingProps) {
  // Cap the diameter to the smaller viewport edge so the ring stays a centered
  // circle that never overflows a narrow (mobile) screen.
  const dimension = `min(${size}px, 86vmin)`;
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative ${className}`}
      style={{ width: dimension, height: dimension }}
    >
      {/* Outer 64-hexagram band — counter-rotating. */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-bagua-reverse">
        <circle cx="100" cy="100" r="97" fill="none" stroke="var(--color-gold-dim)" strokeWidth="0.4" />
        <circle cx="100" cy="100" r="84" fill="none" stroke="var(--color-gold-dim)" strokeWidth="0.4" />
        {HEXAGRAMS.map((ch, i) => (
          <text
            key={i}
            transform={`rotate(${(i / 64) * 360} 100 100)`}
            x="100"
            y="12.5"
            textAnchor="middle"
            fontSize="6.4"
            fill="var(--color-gold)"
            opacity="0.5"
          >
            {ch}
          </text>
        ))}
      </svg>

      {/* Mid hairline + tick ring. */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-bagua">
        <circle cx="100" cy="100" r="68" fill="none" stroke="var(--color-gold-dim)" strokeWidth="0.5" />
        {Array.from({ length: 24 }, (_, i) => (
          <line
            key={i}
            transform={`rotate(${(i / 24) * 360} 100 100)`}
            x1="100"
            y1="26"
            x2="100"
            y2="30"
            stroke="var(--color-gold)"
            strokeWidth="0.5"
            opacity="0.45"
          />
        ))}
      </svg>

      {/* Inner trigram ring — rotating. */}
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-bagua">
        <circle cx="100" cy="100" r="52" fill="none" stroke="var(--color-gold-dim)" strokeWidth="0.5" />
        {TRIGRAMS.map((ch, i) => (
          <text
            key={i}
            transform={`rotate(${(i / 8) * 360} 100 100)`}
            x="100"
            y="55"
            textAnchor="middle"
            fontSize="13"
            fill="var(--color-gold-bright)"
            opacity="0.62"
          >
            {ch}
          </text>
        ))}
      </svg>
    </div>
  );
}
