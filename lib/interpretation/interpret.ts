/**
 * Interpretation service — fetches verified texts, assembles the prompt,
 * calls the router, and streams the reading. The model never recalls or
 * generates hexagram content; everything in the prompt is fetched here.
 *
 * Text emphasis follows ICHING_REFERENCE.md §5:
 *   0 changing lines  -> primary judgment + image only.
 *   1-5 changing lines -> primary judgment + image, the changing line(s)' texts,
 *                          and the resulting hexagram's judgment.
 *   6 changing lines  -> same as above (this corpus has no dedicated "all lines
 *                          change" texts for Hex 1/2; inventing one is forbidden).
 */

import { getHexagramRecord, getLineRecord, resolveLocaleText } from "../db/hexagrams";
import { assemblePrompt } from "./prompt";
import { interpret as callModel } from "./router";
import type { ModelClient } from "./router";
import type { GroundedChangingLine, GroundedHexagram, GroundedTexts, InterpretParams } from "./types";

/** Fetches and resolves the exact texts needed for this cast, per the §5 emphasis rules. */
export function gatherGroundedTexts(
  cast: InterpretParams["cast"],
  locale: InterpretParams["locale"],
): GroundedTexts {
  const primaryRecord = getHexagramRecord(cast.primaryHexagram);
  const primary: GroundedHexagram = {
    number: primaryRecord.number,
    namePinyin: primaryRecord.name_pinyin,
    nameZh: primaryRecord.name_zh,
    judgment: resolveLocaleText(primaryRecord.judgment, locale, `hexagram ${primaryRecord.number} judgment`),
    image: resolveLocaleText(primaryRecord.image, locale, `hexagram ${primaryRecord.number} image`),
  };

  const changingLines: GroundedChangingLine[] = cast.changingLinePositions.map((position) => {
    const lineRecord = getLineRecord(primaryRecord, position);
    return {
      position,
      text: resolveLocaleText(
        lineRecord.text,
        locale,
        `hexagram ${primaryRecord.number} line ${position}`,
      ),
    };
  });

  let resulting: GroundedHexagram | null = null;
  if (cast.resultingHexagram !== null) {
    const resultingRecord = getHexagramRecord(cast.resultingHexagram);
    resulting = {
      number: resultingRecord.number,
      namePinyin: resultingRecord.name_pinyin,
      nameZh: resultingRecord.name_zh,
      judgment: resolveLocaleText(
        resultingRecord.judgment,
        locale,
        `hexagram ${resultingRecord.number} judgment`,
      ),
    };
  }

  return { primary, changingLines, resulting };
}

/**
 * Runs the full pipeline for one reading: fetch -> assemble -> call -> stream.
 * `client` is for test injection only; production callers omit it.
 */
export async function* runInterpretation(
  params: InterpretParams,
  client?: ModelClient,
): AsyncGenerator<string, void, unknown> {
  const grounded = gatherGroundedTexts(params.cast, params.locale);
  const assembled = assemblePrompt(params.question, params.locale, grounded);
  yield* callModel(assembled, params.tier ?? "default", client);
}
