/**
 * Corpus access — exact lookup only, no generation (ARCHITECTURE.md §3, AGENTS.md #2).
 *
 * Reads from /data/hexagrams.demo.json for now (a small human-populated placeholder).
 * In production this becomes a Postgres lookup against the `hexagrams` table
 * (DATA_MODEL.md §1); the function signatures here are deliberately DB-shaped
 * so swapping the backing store later does not change callers.
 */

import demoCorpus from "../../data/hexagrams.demo.json";
import type { Locale } from "../interpretation/types";

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

/** Resolve a localized text field to a non-null string. Throws if the field is missing for this locale. */
export function resolveLocaleText(text: LocalizedText, locale: Locale, context: string): string {
  const value = text[locale];
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
