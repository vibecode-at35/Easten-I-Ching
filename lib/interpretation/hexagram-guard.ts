/**
 * Hexagram-fabrication guard — golden rule #1 (AGENTS.md): the model never
 * computes the hexagram. Prompt wording alone is not a sufficient guarantee
 * for this rule (unlike the situational-grounding issue, where wording held
 * 5/6 — see 5c76a60 / d051533): a single fabricated hexagram silently
 * corrupts a reading, so this is enforced structurally, every time.
 *
 * Detection matches precise tokens only — exact Chinese hexagram names and
 * "#NN" King Wen number forms — deliberately avoiding English hexagram
 * glosses ("The Creative", "Return", "Splitting Apart", etc.), which are
 * common words/phrases with a real false-positive rate in ordinary prose.
 */

import { getAllHexagramIdentities } from "../db/hexagrams";

/** The only hexagram(s) a reading may legitimately reference for one cast. */
export interface AllowedHexagrams {
  primaryNumber: number;
  /** null when the cast had no changing lines — no resulting hexagram exists. */
  resultingNumber: number | null;
}

/** Thrown when generated text references a hexagram outside the actual cast, even after one retry. */
export class HexagramFabricationError extends Error {
  constructor(public readonly foundReferences: string[]) {
    super("The interpretation referenced a hexagram outside the actual cast.");
    this.name = "HexagramFabricationError";
  }
}

/** The 64 hexagram identities not allowed for a given cast — i.e. everything but primary/resulting. */
export function buildForbiddenIdentities(
  allowed: AllowedHexagrams,
): Array<{ number: number; nameZh: string }> {
  const allowedNumbers = new Set<number>([allowed.primaryNumber]);
  if (allowed.resultingNumber !== null) {
    allowedNumbers.add(allowed.resultingNumber);
  }
  return getAllHexagramIdentities()
    .filter((h) => !allowedNumbers.has(h.number))
    .map((h) => ({ number: h.number, nameZh: h.nameZh }));
}

/** Matches "#NN" as a complete number — "#43" does not match inside "#430" or "1#43". */
function containsNumberToken(text: string, number: number): boolean {
  const pattern = new RegExp(`(?<![\\d#])#${number}(?!\\d)`);
  return pattern.test(text);
}

/**
 * Scans generated reading text for references to any hexagram not in the
 * allowed set for this cast. Returns a human-readable description of each
 * forbidden hexagram found (empty array = clean).
 */
export function findFabricatedHexagramReferences(text: string, allowed: AllowedHexagrams): string[] {
  const forbidden = buildForbiddenIdentities(allowed);
  const found: string[] = [];

  for (const h of forbidden) {
    const zhMatch = h.nameZh.length > 0 && text.includes(h.nameZh);
    const numberMatch = containsNumberToken(text, h.number);
    if (zhMatch || numberMatch) {
      found.push(`#${h.number} (${h.nameZh})`);
    }
  }

  return found;
}
