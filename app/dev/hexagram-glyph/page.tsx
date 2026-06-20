import { castFromLineValues } from "../../../lib/iching/casting";
import { HexagramGlyph } from "../../../components/HexagramGlyph";
import { Seal } from "../../../components/Seal";

/**
 * DEV-ONLY visual check for Tasks 2 (hexagram glyph) and 3 (the seal) — not
 * part of the real app flow, not linked from anywhere. Every cast below
 * comes from the actual engine (castFromLineValues), never hand-rolled, so
 * each case is exactly what lib/iching would really produce. The seal
 * labels below (乾, 坤) are the verified name_zh values already seeded in
 * data/hexagrams.seed.json for hexagrams 1 and 2 — not invented here.
 */
export default function HexagramGlyphDevPage() {
  const allSolid = castFromLineValues([7, 7, 7, 7, 7, 7]); // Hexagram 1, no changing lines
  const allBroken = castFromLineValues([8, 8, 8, 8, 8, 8]); // Hexagram 2, no changing lines
  const allChanging = castFromLineValues([9, 9, 9, 9, 9, 9]); // Hexagram 1 -> 2, all six changing

  return (
    <main className="flex min-h-screen flex-col items-center gap-16 px-6 py-16">
      <h1 className="font-serif text-2xl text-ink">HexagramGlyph &amp; Seal — dev check</h1>

      <section className="flex flex-col items-center gap-4">
        <p className="font-sans text-sm text-ink-muted">Seal (印章) — 乾 (Hexagram 1) and 坤 (Hexagram 2)</p>
        <div className="flex items-center gap-8">
          <Seal label="乾" />
          <Seal label="坤" />
        </div>
      </section>

      <section className="flex flex-col items-center gap-4">
        <p className="font-sans text-sm text-ink-muted">Hexagram 1 (Qián) — all solid, no changing lines</p>
        <HexagramGlyph cast={allSolid} />
      </section>

      <section className="flex flex-col items-center gap-4">
        <p className="font-sans text-sm text-ink-muted">Hexagram 2 (Kūn) — all broken, no changing lines</p>
        <HexagramGlyph cast={allBroken} />
      </section>

      <section className="flex flex-col items-center gap-4">
        <p className="font-sans text-sm text-ink-muted">
          Hexagram 1 → 2 — all six lines changing (cinnabar marks), resulting glyph below
        </p>
        <HexagramGlyph cast={allChanging} />
      </section>
    </main>
  );
}
