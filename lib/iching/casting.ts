/**
 * Deterministic I Ching casting engine — three-coin method.
 *
 * Pure module: no I/O, no LLM calls, no framework imports.
 * All randomness is seeded and reproducible. The model NEVER calls this;
 * it is called by the API layer and the result passed to the interpretation service.
 *
 * Source of truth for probabilities and line encoding: ICHING_REFERENCE.md §3, §4.
 */

import type {
  CastLine,
  CastMethod,
  CastResult,
  LineType,
  LineValue,
  Position,
  ResultingLine,
} from "./types";
import { lookupKingWen } from "./kingwen";

// ─── Constants ────────────────────────────────────────────────────────────────

const LINE_TYPES: Record<LineValue, LineType> = {
  6: "old_yin",
  7: "young_yang",
  8: "young_yin",
  9: "old_yang",
};

// ─── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

/**
 * Map an arbitrary string seed to a uint32 via a fast non-cryptographic hash.
 * Determinism matters here, not security.
 */
function seedToUint32(seed: string): number {
  let h = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x517cc1b7);
    h ^= h >>> 16;
  }
  return h >>> 0;
}

/** mulberry32 — fast, seedable, passes statistical tests for this use case. */
function makePrng(seed: number): () => number {
  let s = seed;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// ─── Three-coin method ────────────────────────────────────────────────────────

/**
 * Cast one line value using three coins.
 * Coin: tails=2 (p=0.5), heads=3 (p=0.5). Sum → 6/7/8/9.
 * Probabilities: 6=1/8, 7=3/8, 8=3/8, 9=1/8 (ICHING_REFERENCE.md §3.1).
 */
function castOneLine(rand: () => number): LineValue {
  const sum =
    (rand() < 0.5 ? 2 : 3) +
    (rand() < 0.5 ? 2 : 3) +
    (rand() < 0.5 ? 2 : 3);
  // sum is provably one of {6,7,8,9}; the cast is safe.
  return sum as LineValue;
}

// ─── Core computation (exported for testing) ──────────────────────────────────

/**
 * Build a complete CastResult from six explicit line values.
 * Use this for testing and for reconstructing a cast from stored data.
 * Values must be in bottom-to-top order (position 1 first).
 */
export function castFromLineValues(
  values: [LineValue, LineValue, LineValue, LineValue, LineValue, LineValue],
  method: CastMethod = "three_coin",
  seed = "explicit",
): CastResult {
  const lines: CastLine[] = values.map((v, i) => ({
    position: (i + 1) as Position,
    value: v,
    type: LINE_TYPES[v],
    changing: v === 6 || v === 9,
  }));

  // 6-bit value: each line contributes bit (position-1). Yang=1, yin=0.
  // Odd line values (7, 9) are yang; even (6, 8) are yin. Hence: bit = v & 1.
  let primaryValue = 0;
  for (let i = 0; i < 6; i++) {
    primaryValue |= (values[i] & 1) << i;
  }

  const primaryHexagram = lookupKingWen(primaryValue);
  const changingLinePositions = lines
    .filter((l) => l.changing)
    .map((l) => l.position);

  let resultingHexagram: number | null = null;
  if (changingLinePositions.length > 0) {
    let resultValue = primaryValue;
    for (const pos of changingLinePositions) {
      resultValue ^= 1 << (pos - 1); // flip the bit for this position
    }
    resultingHexagram = lookupKingWen(resultValue);
  }

  return { lines, primaryHexagram, changingLinePositions, resultingHexagram, method, seed };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Cast a hexagram using the three-coin method with a seeded PRNG.
 *
 * @param seed - Hex string seed for reproducibility. Omit to generate randomly.
 *               The same seed always returns the same CastResult.
 */
export function castHexagram(seed?: string): CastResult {
  const resolvedSeed = seed ?? generateSeed();
  const rand = makePrng(seedToUint32(resolvedSeed));
  const values = Array.from({ length: 6 }, () => castOneLine(rand)) as [
    LineValue,
    LineValue,
    LineValue,
    LineValue,
    LineValue,
    LineValue,
  ];
  return castFromLineValues(values, "three_coin", resolvedSeed);
}

/**
 * Derives the resulting hexagram's per-line yin/yang pattern for display —
 * UI components (e.g. the hexagram glyph) must never compute this themselves
 * (AGENTS.md golden rule #1). Flips yin/yang on every changing line in the
 * primary; unchanged lines keep the primary's yin/yang.
 *
 * Returns null when there are no changing lines (no resulting hexagram).
 *
 * Self-check: the derived pattern's 6-bit value is looked up via the SAME
 * lookupKingWen() the engine itself uses, and asserted to match
 * `cast.resultingHexagram` exactly. If it doesn't, the engine's own two
 * computations of this transformation have diverged — that must never be
 * silently rendered, so this throws rather than returning a mismatched glyph.
 */
export function deriveResultingLines(cast: CastResult): ResultingLine[] | null {
  if (cast.resultingHexagram === null) {
    return null;
  }

  const changingSet = new Set(cast.changingLinePositions);
  let derivedValue = 0;
  const resultLines: ResultingLine[] = cast.lines.map((line) => {
    const primaryIsYang = (line.value & 1) === 1; // odd values (7, 9) are yang
    const isYang = changingSet.has(line.position) ? !primaryIsYang : primaryIsYang;
    if (isYang) {
      derivedValue |= 1 << (line.position - 1);
    }
    return { position: line.position, isYang };
  });

  const derivedKingWen = lookupKingWen(derivedValue);
  if (derivedKingWen !== cast.resultingHexagram) {
    throw new Error(
      `Resulting hexagram pattern derivation mismatch: derived King Wen #${derivedKingWen} ` +
        `but cast.resultingHexagram is #${cast.resultingHexagram}. This indicates an engine-internal ` +
        `inconsistency and must not be silently rendered.`,
    );
  }

  return resultLines;
}

function generateSeed(): string {
  // Not crypto-sensitive — this is a divination tool, not an auth system.
  return (Math.random() * 0xffffffff).toString(16).padStart(8, "0") +
         (Math.random() * 0xffffffff).toString(16).padStart(8, "0");
}
