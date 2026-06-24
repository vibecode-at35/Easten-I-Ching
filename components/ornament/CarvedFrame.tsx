import type { ReactNode } from "react";

/**
 * CarvedFrame — a gilded, carved border that wraps content blocks in the
 * imperial-lacquer redesign (question card, casting stage, every reading
 * card). A double gold hairline with a faint inner glow, plus a cloud-scroll
 * (祥雲) or dragon flourish carved into each corner. Presentational only.
 *
 * The corner ornament is one SVG path placed four times, rotated 0/90/180/270,
 * so the carving wraps the box symmetrically. `corner` selects the motif;
 * `glow` adds the lit inner vignette for "altar" moments. Entrance uses the
 * CSS `animate-frame-carve-in` (paused under prefers-reduced-motion).
 */
export interface CarvedFrameProps {
  children: ReactNode;
  className?: string;
  /** Corner flourish motif. */
  corner?: "cloud" | "dragon";
  /** Add a lit inner glow (altar/ceremonial blocks). */
  glow?: boolean;
}

/**
 * A single corner flourish — a 祥雲 cloud-scroll hugging the TOP-LEFT corner:
 * one smooth quarter-arc with a small spiral curl tucked at each end (symmetric
 * about the diagonal), plus a gem at the very tip. The other three corners use
 * the exact same shape mirrored (`flip` = scaleX/scaleY/both) rather than
 * rotated, so all four stay perfectly balanced regardless of where the drawn
 * content sits in the viewBox. The `dragon` variant adds a second inner arc.
 */
function Corner({ motif, flip }: { motif: "cloud" | "dragon"; flip: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className="h-9 w-9 text-gold"
      style={{ transform: flip, transformOrigin: "center" }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {/* main quarter-arc bracket */}
      <path d="M4 23 C4 12 12 4 23 4" />
      {/* cloud curl at the top end */}
      <path d="M23 4 c5 0 8 3 8 7 c0 3 -2 5 -5 5 c-2 0 -3 -1.4 -3 -3.2" />
      {/* cloud curl at the left end (mirror) */}
      <path d="M4 23 c0 5 3 8 7 8 c3 0 5 -2 5 -5 c0 -2 -1.4 -3 -3.2 -3" />
      {/* inner echo arc for the dragon variant */}
      {motif === "dragon" && <path d="M10 23 C10 16 16 10 23 10" strokeWidth="1" opacity="0.7" />}
      {/* gem at the corner tip */}
      <circle cx="5" cy="5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CarvedFrame({ children, className = "", corner = "cloud", glow = false }: CarvedFrameProps) {
  return (
    <div className={`relative ${className}`}>
      {/* Carved double-border + inner glow, behind the content. */}
      <div className="animate-frame-carve-in pointer-events-none absolute inset-0">
        <div className="absolute inset-0 rounded-2xl border border-gold-dim" />
        <div className="absolute inset-[5px] rounded-xl border border-gold/25" />
        {glow && (
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(212,175,55,0.10) 0%, transparent 70%)",
            }}
          />
        )}
        {/* Four carved corners — one drawn shape, mirrored per corner, each
            inset the same 2px so they sit symmetrically on the rounded edges. */}
        <span className="absolute left-0.5 top-0.5">
          <Corner motif={corner} flip="none" />
        </span>
        <span className="absolute right-0.5 top-0.5">
          <Corner motif={corner} flip="scaleX(-1)" />
        </span>
        <span className="absolute bottom-0.5 right-0.5">
          <Corner motif={corner} flip="scale(-1, -1)" />
        </span>
        <span className="absolute bottom-0.5 left-0.5">
          <Corner motif={corner} flip="scaleY(-1)" />
        </span>
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
