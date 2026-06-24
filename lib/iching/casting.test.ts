/**
 * Acceptance tests for the deterministic casting engine.
 * Covers all criteria from docs/TASK/milestone-1-casting-engine.md.
 */

import { VALUE_TO_KW, lookupKingWen } from "./kingwen";
import { TRIGRAMS, hexagramValue } from "./trigrams";
import { castFromLineValues, castHexagram, coinFacesForLine, deriveResultingLines } from "./casting";
import type { CastResult, LineValue } from "./types";
import {
  AUTHORITATIVE_KING_WEN,
  valueToKingWen,
  assertAuthoritativeIntegrity,
} from "./kingwen.authoritative";

// ─── 1. Bijection test ────────────────────────────────────────────────────────

describe("King Wen table — bijection", () => {
  it("contains exactly 64 entries", () => {
    expect(VALUE_TO_KW.length).toBe(64);
  });

  it("every value 0–63 appears exactly once as an index (complete domain)", () => {
    const indices = VALUE_TO_KW.map((_, i) => i);
    expect(indices).toEqual(expect.arrayContaining(Array.from({ length: 64 }, (_, i) => i)));
  });

  it("every King Wen number 1–64 appears exactly once (no gaps, no duplicates)", () => {
    const sorted = [...VALUE_TO_KW].sort((a, b) => a - b);
    expect(sorted).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
  });
});

// ─── 2. Trigram encoding ──────────────────────────────────────────────────────

describe("trigram values", () => {
  it("all-yang trigram (Qián) has value 7", () => {
    expect(TRIGRAMS.qian.value).toBe(7);
  });

  it("all-yin trigram (Kūn) has value 0", () => {
    expect(TRIGRAMS.kun.value).toBe(0);
  });

  it("hexagramValue(lower, upper) = lower + upper * 8", () => {
    // Hex 11 (Tài): lower Qián(7) + upper Kūn(0)*8 = 7
    expect(hexagramValue(TRIGRAMS.qian.value, TRIGRAMS.kun.value)).toBe(7);
    // Hex 12 (Pǐ): lower Kūn(0) + upper Qián(7)*8 = 56
    expect(hexagramValue(TRIGRAMS.kun.value, TRIGRAMS.qian.value)).toBe(56);
    // Hex 63 (Jì Jì): lower Lí(5) + upper Kǎn(2)*8 = 21
    expect(hexagramValue(TRIGRAMS.li.value, TRIGRAMS.kan.value)).toBe(21);
  });
});

// ─── 3. Reference cases (ICHING_REFERENCE.md §7) ─────────────────────────────

describe("reference cases — hexagram identification", () => {
  it("all-yang lines → Hexagram 1 (Qián), value 63", () => {
    const result = castFromLineValues([9, 9, 9, 9, 9, 9]);
    expect(result.primaryHexagram).toBe(1);
    // all yang → value 63
    const expectedValue = 0b111111;
    expect(lookupKingWen(expectedValue)).toBe(1);
  });

  it("all-yin lines → Hexagram 2 (Kūn), value 0", () => {
    const result = castFromLineValues([6, 6, 6, 6, 6, 6]);
    expect(result.primaryHexagram).toBe(2);
    expect(lookupKingWen(0)).toBe(2);
  });

  it("lower Qián / upper Kūn → Hexagram 11 (Tài), value 7", () => {
    // lower trigram = positions 1-3 yang; upper = positions 4-6 yin
    const result = castFromLineValues([7, 7, 7, 8, 8, 8]);
    expect(result.primaryHexagram).toBe(11);
    expect(lookupKingWen(hexagramValue(TRIGRAMS.qian.value, TRIGRAMS.kun.value))).toBe(11);
  });

  it("lower Kūn / upper Qián → Hexagram 12 (Pǐ), value 56", () => {
    const result = castFromLineValues([8, 8, 8, 7, 7, 7]);
    expect(result.primaryHexagram).toBe(12);
    expect(lookupKingWen(hexagramValue(TRIGRAMS.kun.value, TRIGRAMS.qian.value))).toBe(12);
  });

  it("lower Lí / upper Kǎn → Hexagram 63 (Jì Jì), value 21", () => {
    // Lí = 101 (yang,yin,yang); Kǎn = 010 (yin,yang,yin)
    // lines bottom-to-top: yang(1),yin(0),yang(1) / yin(0),yang(1),yin(0)
    const result = castFromLineValues([7, 8, 7, 8, 7, 8]);
    expect(result.primaryHexagram).toBe(63);
    expect(lookupKingWen(hexagramValue(TRIGRAMS.li.value, TRIGRAMS.kan.value))).toBe(63);
  });
});

// ─── 4. Changing lines & resulting hexagram ───────────────────────────────────

describe("reference case — changing lines and resulting hexagram", () => {
  /**
   * ICHING_REFERENCE.md §7: Hexagram 11 with old-yang (9) at position 2
   * → primary 11, changing [2], resulting hexagram.
   *
   * §7 stated the resulting hexagram should be Hex 46 (Shēng), but the math gives:
   *   Primary value = 7 (0b000111); flip bit 1 (position 2): 7 XOR 2 = 5
   *   Value 5 → Hexagram 36 (Míng Yí, upper Kūn / lower Lí)
   *
   * The authoritative fixture (kingwen.authoritative.ts, verified 2026-06-17)
   * confirms value 5 = Hex 36 (Míng Yí). The §7 example contained an error.
   * This test asserts the mathematically and authoritatively correct result.
   */
  it("Hex 11 + old-yang at position 2 → primary 11, changing [2], resulting Hex 36 (Míng Yí)", () => {
    // [7,9,7,8,8,8]: positions 1-3 are yang (lower Qián), positions 4-6 are yin (upper Kūn).
    // Position 2 is old-yang (9) → changing.
    const result = castFromLineValues([7, 9, 7, 8, 8, 8]);

    expect(result.primaryHexagram).toBe(11);
    expect(result.changingLinePositions).toEqual([2]);

    // value 7 XOR 2 = 5 → KW 36 (confirmed by authoritative fixture).
    expect(result.resultingHexagram).toBe(36);
  });

  it("no changing lines → resultingHexagram is null", () => {
    const result = castFromLineValues([7, 7, 7, 8, 8, 8]);
    expect(result.changingLinePositions).toEqual([]);
    expect(result.resultingHexagram).toBeNull();
  });

  it("old-yin (6) also triggers a changing line", () => {
    // Position 1 old-yin → yang bit flips to 1 for resulting hexagram
    const result = castFromLineValues([6, 8, 8, 8, 8, 8]);
    expect(result.changingLinePositions).toEqual([1]);
    expect(result.resultingHexagram).not.toBeNull();
    // value 0 XOR bit0 = 1; VALUE_TO_KW[1] = 24
    expect(result.resultingHexagram).toBe(24);
  });

  it("all-yang old lines → all-yin resulting hexagram (Hex 2)", () => {
    const result = castFromLineValues([9, 9, 9, 9, 9, 9]);
    expect(result.primaryHexagram).toBe(1);
    expect(result.changingLinePositions).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.resultingHexagram).toBe(2);
  });

  it("all-yin old lines → all-yang resulting hexagram (Hex 1)", () => {
    const result = castFromLineValues([6, 6, 6, 6, 6, 6]);
    expect(result.primaryHexagram).toBe(2);
    expect(result.changingLinePositions).toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.resultingHexagram).toBe(1);
  });
});

// ─── 5. CastLine structure ────────────────────────────────────────────────────

describe("CastLine structure", () => {
  it("line types map correctly from values 6/7/8/9", () => {
    const result = castFromLineValues([6, 7, 8, 9, 7, 8]);
    expect(result.lines[0]).toMatchObject({ position: 1, value: 6, type: "old_yin",    changing: true  });
    expect(result.lines[1]).toMatchObject({ position: 2, value: 7, type: "young_yang", changing: false });
    expect(result.lines[2]).toMatchObject({ position: 3, value: 8, type: "young_yin",  changing: false });
    expect(result.lines[3]).toMatchObject({ position: 4, value: 9, type: "old_yang",   changing: true  });
  });

  it("positions are 1-indexed bottom-to-top", () => {
    const result = castFromLineValues([7, 7, 7, 8, 8, 8]);
    expect(result.lines.map((l) => l.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// ─── 6. Determinism test ──────────────────────────────────────────────────────

describe("determinism", () => {
  it("same seed always produces the same CastResult", () => {
    const seed = "determinism-test-seed";
    const a = castHexagram(seed);
    const b = castHexagram(seed);
    expect(a).toEqual(b);
  });

  it("different seeds produce different results (with overwhelming probability)", () => {
    const a = castHexagram("seed-alpha-001");
    const b = castHexagram("seed-beta-002");
    // 1/64^6 chance of a false failure — negligible
    expect(a.lines.map((l) => l.value)).not.toEqual(b.lines.map((l) => l.value));
  });

  it("seed is stored in the CastResult for later reproduction", () => {
    const seed = "stored-seed-xyz";
    const result = castHexagram(seed);
    expect(result.seed).toBe(seed);
  });

  it("method field is 'three_coin'", () => {
    expect(castHexagram("any").method).toBe("three_coin");
  });
});

// ─── 7. Three-coin distribution test ─────────────────────────────────────────

describe("3-coin distribution", () => {
  it("line values 6/7/8/9 approximate probabilities 1/8, 3/8, 3/8, 1/8 within ±2%", () => {
    const N = 8000; // 8000 casts × 6 lines = 48000 samples
    const counts: Record<number, number> = { 6: 0, 7: 0, 8: 0, 9: 0 };
    for (let i = 0; i < N; i++) {
      for (const line of castHexagram().lines) {
        counts[line.value]++;
      }
    }
    const total = N * 6;
    const tol = 0.02;

    expect(counts[6]! / total).toBeGreaterThan(1 / 8 - tol);
    expect(counts[6]! / total).toBeLessThan(1 / 8 + tol);

    expect(counts[7]! / total).toBeGreaterThan(3 / 8 - tol);
    expect(counts[7]! / total).toBeLessThan(3 / 8 + tol);

    expect(counts[8]! / total).toBeGreaterThan(3 / 8 - tol);
    expect(counts[8]! / total).toBeLessThan(3 / 8 + tol);

    expect(counts[9]! / total).toBeGreaterThan(1 / 8 - tol);
    expect(counts[9]! / total).toBeLessThan(1 / 8 + tol);
  });
});

// ─── 8. Authoritative source verification ────────────────────────────────────

describe("authoritative source verification", () => {
  it("fixture is internally consistent (bijection, values match trigram math)", () => {
    // assertAuthoritativeIntegrity() throws on any defect in the fixture itself.
    expect(() => assertAuthoritativeIntegrity()).not.toThrow();
  });

  it("fixture contains exactly 64 hexagrams", () => {
    expect(AUTHORITATIVE_KING_WEN).toHaveLength(64);
  });

  it("every 6-bit value in VALUE_TO_KW matches the authoritative source", () => {
    // Compare each index in the engine's table against the independently-derived fixture.
    // A mismatch here means VALUE_TO_KW has a typo for that hexagram.
    for (let value = 0; value < 64; value++) {
      const engineKw = lookupKingWen(value);
      const authKw = valueToKingWen[value];
      expect(engineKw).toBe(authKw);
    }
  });

  it("every entry in the authoritative fixture round-trips through the engine", () => {
    for (const entry of AUTHORITATIVE_KING_WEN) {
      const computedValue = hexagramValue(
        TRIGRAMS[entry.lower].value,
        TRIGRAMS[entry.upper].value,
      );
      expect(computedValue).toBe(entry.value);
      expect(lookupKingWen(computedValue)).toBe(entry.number);
    }
  });
});

// ─── deriveResultingLines (M3 Task 2 prerequisite — UI never computes a hexagram) ──

describe("deriveResultingLines", () => {
  it("returns null when there are no changing lines", () => {
    const cast = castFromLineValues([7, 7, 7, 8, 8, 8]); // Hexagram 11, no changing lines
    expect(cast.resultingHexagram).toBeNull();
    expect(deriveResultingLines(cast)).toBeNull();
  });

  it("all-changing Hexagram 1 -> all-broken Hexagram 2: every line flips yang to yin", () => {
    const cast = castFromLineValues([9, 9, 9, 9, 9, 9]);
    expect(cast.primaryHexagram).toBe(1);
    expect(cast.resultingHexagram).toBe(2);

    const resulting = deriveResultingLines(cast);
    expect(resulting).not.toBeNull();
    expect(resulting).toHaveLength(6);
    for (const line of resulting!) {
      expect(line.isYang).toBe(false);
    }
    // Positions are present 1-6, in order, matching the primary cast's lines.
    expect(resulting!.map((l) => l.position)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("all-changing Hexagram 2 -> all-solid Hexagram 1: every line flips yin to yang", () => {
    const cast = castFromLineValues([6, 6, 6, 6, 6, 6]);
    expect(cast.primaryHexagram).toBe(2);
    expect(cast.resultingHexagram).toBe(1);

    const resulting = deriveResultingLines(cast);
    expect(resulting).not.toBeNull();
    for (const line of resulting!) {
      expect(line.isYang).toBe(true);
    }
  });

  it("mixed changing-line case: only the changing position flips, others keep the primary's yin/yang", () => {
    // Hex 11 (lower Qian/yang, upper Kun/yin) with old-yang (9) at position 2.
    // Reference case from ICHING_REFERENCE.md, verified in the existing
    // "reference case — changing lines and resulting hexagram" suite above:
    // primary 11, changing [2], resulting Hex 36 (Ming Yi).
    const cast = castFromLineValues([7, 9, 7, 8, 8, 8]);
    expect(cast.primaryHexagram).toBe(11);
    expect(cast.changingLinePositions).toEqual([2]);
    expect(cast.resultingHexagram).toBe(36);

    const resulting = deriveResultingLines(cast);
    expect(resulting).toEqual([
      { position: 1, isYang: true }, // unchanged (was yang/7)
      { position: 2, isYang: false }, // changing: flipped from yang/9 to yin
      { position: 3, isYang: true }, // unchanged (was yang/7)
      { position: 4, isYang: false }, // unchanged (was yin/8)
      { position: 5, isYang: false }, // unchanged (was yin/8)
      { position: 6, isYang: false }, // unchanged (was yin/8)
    ]);
  });

  it("throws rather than silently rendering a mismatched glyph if resultingHexagram disagrees with the derived pattern", () => {
    const validCast = castFromLineValues([9, 9, 9, 9, 9, 9]); // resultingHexagram really is 2
    const corrupted: CastResult = { ...validCast, resultingHexagram: 45 }; // deliberately wrong
    expect(() => deriveResultingLines(corrupted)).toThrow(/mismatch/i);
  });
});

// ─── Coin faces for the casting ceremony ───────────────────────────────────────

describe("coinFacesForLine", () => {
  const yangValue = (face: string) => (face === "yang" ? 3 : 2);

  it("returns three faces that sum to the line value (the honesty invariant)", () => {
    const cases: Array<[LineValue, number]> = [
      [6, 0], // old yin — three tails
      [7, 1], // young yang — one head
      [8, 2], // young yin — two heads
      [9, 3], // old yang — three heads
    ];
    for (const [value, expectedYang] of cases) {
      const faces = coinFacesForLine(value);
      expect(faces).toHaveLength(3);
      expect(faces.filter((f) => f === "yang")).toHaveLength(expectedYang);
      expect(faces.reduce((sum, f) => sum + yangValue(f), 0)).toBe(value);
    }
  });

  it("is consistent with the line's yin/yang parity for every cast line", () => {
    // Whatever the cast, the faces' sum parity must match the line value's,
    // so a glyph drawn from value and coins drawn from faces never disagree.
    const cast = castHexagram("face-consistency-seed");
    for (const line of cast.lines) {
      const faces = coinFacesForLine(line.value);
      expect(faces.reduce((sum, f) => sum + yangValue(f), 0)).toBe(line.value);
    }
  });
});
