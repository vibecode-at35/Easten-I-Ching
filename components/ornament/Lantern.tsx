/**
 * Lantern — a hanging palace lantern (宮燈) for screen corners in the
 * imperial-lacquer redesign: a cord, a cinnabar lantern body with gold caps
 * and a tassel, and a warm glow behind it that flickers via the CSS
 * `animate-lantern` class (paused under prefers-reduced-motion).
 * Presentational; `size` sets the lantern body width in px.
 */
export interface LanternProps {
  size?: number;
  className?: string;
}

export function Lantern({ size = 56, className = "" }: LanternProps) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative ${className}`}
      style={{ width: size }}
    >
      {/* warm flickering glow */}
      <div
        className="animate-lantern absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: size * 2.4,
          height: size * 2.4,
          background:
            "radial-gradient(circle, rgba(244,170,90,0.35) 0%, rgba(200,65,42,0.16) 40%, transparent 70%)",
        }}
      />
      <svg viewBox="0 0 60 110" width={size} height={(size * 110) / 60} className="relative">
        {/* cord */}
        <line x1="30" y1="0" x2="30" y2="14" stroke="var(--color-gold-leaf)" strokeWidth="1.4" />
        {/* top cap */}
        <rect x="22" y="14" width="16" height="5" rx="1.5" fill="var(--color-gold)" />
        {/* body */}
        <ellipse cx="30" cy="46" rx="22" ry="26" fill="var(--color-cinnabar)" stroke="var(--color-gold)" strokeWidth="1.6" />
        {/* ribs */}
        <line x1="30" y1="21" x2="30" y2="71" stroke="var(--color-gold-dim)" strokeWidth="0.8" />
        <path d="M12 46 Q30 38 48 46" stroke="var(--color-gold-dim)" strokeWidth="0.8" fill="none" />
        <path d="M12 46 Q30 54 48 46" stroke="var(--color-gold-dim)" strokeWidth="0.8" fill="none" />
        {/* bottom cap */}
        <rect x="22" y="71" width="16" height="5" rx="1.5" fill="var(--color-gold)" />
        {/* tassel */}
        <line x1="30" y1="76" x2="30" y2="90" stroke="var(--color-cinnabar-deep)" strokeWidth="1.6" />
        <path d="M26 90 L30 104 L34 90 Z" fill="var(--color-cinnabar)" />
      </svg>
    </div>
  );
}
