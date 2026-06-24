/**
 * Corpus access — exact lookup only, no generation (ARCHITECTURE.md §3, AGENTS.md #2).
 *
 * Reads from /data/hexagrams.demo.json for now (a small human-populated placeholder).
 * In production this becomes a Postgres lookup against the `hexagrams` table
 * (DATA_MODEL.md §1); the function signatures here are deliberately DB-shaped
 * so swapping the backing store later does not change callers.
 */

import demoCorpus from "../../data/hexagrams.demo.json";
import seedCorpus from "../../data/hexagrams.seed.json";
import type { Locale } from "../interpretation/types";
import type { TrigramKey } from "../iching/trigrams";

export interface LocalizedText {
  vi: string | null;
  zh: string | null;
  en: string | null;
}

export interface HexagramLine {
  position: number;
  text: LocalizedText;
}

export interface HexagramRecord {
  number: number;
  name_pinyin: string;
  name_zh: string;
  judgment: LocalizedText;
  image: LocalizedText;
  lines: HexagramLine[];
}

/** Thrown when a King Wen number has no corpus entry at all. */
export class HexagramTextNotFoundError extends Error {
  constructor(public readonly hexagramNumber: number) {
    super(
      `No corpus entry for hexagram ${hexagramNumber}. ` +
        `Populate data/hexagrams.demo.json (or the Postgres hexagrams table) — never invent this content.`,
    );
    this.name = "HexagramTextNotFoundError";
  }
}

/** Thrown when a corpus entry exists but the requested field/locale is missing (still a placeholder). */
export class MissingHexagramTextError extends Error {
  constructor(public readonly context: string, public readonly locale: Locale) {
    super(
      `Missing verified text for ${context} in locale "${locale}". ` +
        `This is a human content gap, not something the model may fill from memory.`,
    );
    this.name = "MissingHexagramTextError";
  }
}

const corpus = demoCorpus as unknown as { hexagrams: HexagramRecord[] };

/** Look up the exact corpus record for a King Wen number. Throws if absent. */
export function getHexagramRecord(number: number): HexagramRecord {
  const record = corpus.hexagrams.find((h) => h.number === number);
  if (!record) {
    throw new HexagramTextNotFoundError(number);
  }
  return record;
}

/**
 * Resolve a localized text field to a non-null string. Throws
 * MissingHexagramTextError if the field is missing for this locale — including
 * when the whole text object is absent (a corpus entry whose line records were
 * populated with judgment/image but no per-line `text`, as happens for a
 * partially-seeded hexagram). That is a content gap (→ 422), never a crash.
 */
export function resolveLocaleText(
  text: LocalizedText | null | undefined,
  locale: Locale,
  context: string,
): string {
  const value = text?.[locale];
  if (value === null || value === undefined || value === "") {
    throw new MissingHexagramTextError(context, locale);
  }
  return value;
}

/**
 * Find one line's record within a hexagram by position (1–6).
 * Throws RangeError if the position is structurally absent from the corpus record
 * (a malformed-data defect, distinct from a missing-locale-text content gap).
 */
export function getLineRecord(record: HexagramRecord, position: number): HexagramLine {
  const line = record.lines.find((l) => l.position === position);
  if (!line) {
    throw new RangeError(
      `Hexagram ${record.number} corpus entry has no line at position ${position} — malformed corpus data.`,
    );
  }
  return line;
}

/** Minimal identity (number + Chinese name) for one of the 64 hexagrams — no judgment/image/line text. */
export interface HexagramIdentity {
  number: number;
  nameZh: string;
}

interface SeedEntry {
  number: number;
  name_zh: string;
  name_pinyin: string;
  upper_trigram: TrigramKey;
  lower_trigram: TrigramKey;
}

const seedIdentities = seedCorpus as unknown as SeedEntry[];

/** Structural facts for one hexagram — name + trigrams, no judgment/line text. */
export interface HexagramStructure {
  number: number;
  nameZh: string;
  namePinyin: string;
  upperTrigram: TrigramKey;
  lowerTrigram: TrigramKey;
}

/**
 * Returns a hexagram's structural identity (name + trigrams) from the tiny M1
 * seed (data/hexagrams.seed.json) — safe to call from client components, since
 * it never touches the 250KB demo corpus (which stays in the server bundle).
 * Used by the reading screen's structural summary.
 */
export function getHexagramStructure(number: number): HexagramStructure {
  const entry = seedIdentities.find((h) => h.number === number);
  if (!entry) {
    throw new HexagramTextNotFoundError(number);
  }
  return {
    number: entry.number,
    nameZh: entry.name_zh,
    namePinyin: entry.name_pinyin,
    upperTrigram: entry.upper_trigram,
    lowerTrigram: entry.lower_trigram,
  };
}

/**
 * Returns the number + Chinese name for all 64 hexagrams, from the M1 structural
 * seed (data/hexagrams.seed.json) — used by the hexagram-fabrication guard
 * (lib/interpretation/hexagram-guard.ts) to know every hexagram identity that
 * could appear, not just the 3 with real judgment/image/line text.
 */
export function getAllHexagramIdentities(): HexagramIdentity[] {
  return seedIdentities.map((h) => ({ number: h.number, nameZh: h.name_zh }));
}
