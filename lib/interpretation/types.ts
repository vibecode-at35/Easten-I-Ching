import type { CastResult } from "../iching/types";

export type Locale = "vi" | "zh" | "en";
export type ModelTier = "default" | "premium";

export interface InterpretParams {
  cast: CastResult;
  question: string;
  locale: Locale;
  /** Defaults to "default" (Sonnet). "premium" routes to the deep-reading model. */
  tier?: ModelTier;
}

/** A hexagram's verified texts, resolved to one locale. Never model-generated. */
export interface GroundedHexagram {
  number: number;
  namePinyin: string;
  nameZh: string;
  judgment: string;
  /** Present for the primary hexagram; the prompt format omits image for the resulting hexagram. */
  image?: string;
}

export interface GroundedChangingLine {
  position: number;
  text: string;
}

/**
 * The exact verified texts fetched for one reading, per ICHING_REFERENCE.md §5
 * emphasis rules. This is the only hexagram content the model ever receives.
 */
export interface GroundedTexts {
  primary: GroundedHexagram;
  changingLines: GroundedChangingLine[];
  /** null when there are no changing lines (no transformation occurred). */
  resulting: GroundedHexagram | null;
}
