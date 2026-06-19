export type LineValue = 6 | 7 | 8 | 9;
export type LineType = "old_yin" | "young_yang" | "young_yin" | "old_yang";
export type CastMethod = "three_coin";
export type Position = 1 | 2 | 3 | 4 | 5 | 6;

export interface CastLine {
  position: Position;
  value: LineValue;
  type: LineType;
  changing: boolean;
}

/** Full auditable output of the deterministic casting engine (DATA_MODEL.md §3). */
export interface CastResult {
  lines: CastLine[];
  /** King Wen number 1–64 */
  primaryHexagram: number;
  /** Positions (1–6) whose value is 6 or 9 */
  changingLinePositions: number[];
  /** King Wen number of the transformed hexagram; null when no changing lines */
  resultingHexagram: number | null;
  method: CastMethod;
  /** Hex string; same seed always reproduces the same cast */
  seed: string;
}

/**
 * One line of the resulting hexagram's yin/yang pattern — display data only.
 * The resulting hexagram has no "value" or "changing" of its own; it is a
 * static end-state. See deriveResultingLines() in casting.ts.
 */
export interface ResultingLine {
  position: Position;
  isYang: boolean;
}
