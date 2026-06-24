/**
 * CloudScroll — a 祥雲 (auspicious-cloud) scrollwork divider, replacing the
 * plain `h-px` gold rules in the imperial-lacquer redesign. A symmetrical
 * ribbon of cloud curls flanking a small central gem/dot. Presentational;
 * sized by `width` (px), gold strokes on transparent.
 */
export interface CloudScrollProps {
  width?: number;
  className?: string;
}

export function CloudScroll({ width = 200, className = "" }: CloudScrollProps) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 24"
      width={width}
      height={(width * 24) / 200}
      className={`text-gold ${className}`}
      fill="none"
      stroke="currentColor"
    >
      {/* central gem */}
      <circle cx="100" cy="12" r="2.4" fill="var(--color-gold)" stroke="none" />
      <path d="M100 4 L103 12 L100 20 L97 12 Z" stroke="var(--color-gold-dim)" strokeWidth="0.8" />
      {/* left cloud curls + tapering rule */}
      <path
        d="M92 12 H40 M40 12 q-6 0 -6 -5 q0 -6 7 -6 q6 0 6 7 M34 12 q-8 0 -10 -4 M24 12 H6"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* right cloud curls + tapering rule (mirror) */}
      <path
        d="M108 12 H160 M160 12 q6 0 6 -5 q0 -6 -7 -6 q-6 0 -6 7 M166 12 q8 0 10 -4 M176 12 H194"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
