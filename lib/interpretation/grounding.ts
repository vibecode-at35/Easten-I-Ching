/**
 * Phase 1 grounding extraction — a cheap call (claude-haiku-4-5, via the
 * router's extract()) that reads the user's raw question and extracts what
 * they actually stated vs. categories of specifics they left unstated, before
 * Phase 2 generates anything. Phase 2's system prompt (lib/interpretation/
 * prompt.ts) treats every `unstated` item as a hard boundary it must never
 * introduce.
 *
 * Context: 5c76a60 fixed a situational-hallucination bug by prompt wording
 * alone (a vague question repeatedly produced a fabricated job-decision
 * narrative). That held for 5/6 live samples but not 6/6. This phase adds a
 * structural check ahead of generation rather than relying on wording alone.
 *
 * No SDK import here — only ./router.
 */

import { extract as callExtractionModel } from "./router";
import type { ModelClient } from "./router";
import type { AssembledPrompt } from "./prompt";
import type { GroundingExtraction, QuestionType } from "./types";

const QUESTION_TYPES: readonly QuestionType[] = [
  "decision",
  "emotional_state",
  "open_reflection",
  "relationship",
  "other",
];

/** Thrown when the extraction model's output can't be parsed into a valid GroundingExtraction. */
export class GroundingExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroundingExtractionError";
  }
}

const EXTRACTION_SYSTEM_PROMPT = `You read a single question someone wrote for an I Ching reading and extract, in JSON only, exactly what they stated versus what they left unstated.

Output strictly one JSON object - no prose, no markdown fences - with exactly these keys:
{
  "stated": ["short phrases restating only what the person's own words establish"],
  "unstated": ["categories of concrete specifics the person did NOT mention, e.g. \\"no job or career decision\\", \\"no relationship\\", \\"no specific choice between options\\", \\"no health, legal, or financial detail\\""],
  "questionType": "decision" | "emotional_state" | "open_reflection" | "relationship" | "other"
}

Be conservative in "stated": only include something if the words actually say it. Use "unstated" to flag the absence of concrete specifics that a careless reading might invent - a job, a relationship, a named decision, a deadline, other people. If the question is vague, open, or only describes a feeling, questionType is "emotional_state" or "open_reflection", never "decision".`;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Parses and validates the extraction model's raw text output. Throws GroundingExtractionError on any defect. */
export function parseGroundingExtraction(raw: string): GroundingExtraction {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new GroundingExtractionError(`No JSON object found in extraction response: ${raw.slice(0, 200)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch (err) {
    throw new GroundingExtractionError(`Extraction response was not valid JSON: ${(err as Error).message}`);
  }

  if (!isPlainObject(parsed)) {
    throw new GroundingExtractionError("Extraction response was not a JSON object.");
  }

  const { stated, unstated, questionType } = parsed;

  if (!isStringArray(stated)) {
    throw new GroundingExtractionError("`stated` must be an array of strings.");
  }
  if (!isStringArray(unstated)) {
    throw new GroundingExtractionError("`unstated` must be an array of strings.");
  }
  if (typeof questionType !== "string" || !QUESTION_TYPES.includes(questionType as QuestionType)) {
    throw new GroundingExtractionError(`Invalid questionType: ${JSON.stringify(questionType)}`);
  }

  return { stated, unstated, questionType: questionType as QuestionType };
}

/** Builds the Phase 1 extraction prompt for a given question. No SDK import here. */
export function buildExtractionPrompt(question: string): AssembledPrompt {
  return {
    system: [{ type: "text", text: EXTRACTION_SYSTEM_PROMPT }],
    messages: [{ role: "user", content: question }],
  };
}

/**
 * Runs Phase 1: extracts a structured grounding object from the raw question.
 * `client` is for test injection only; production callers omit it.
 */
export async function extractGrounding(
  question: string,
  client?: ModelClient,
): Promise<GroundingExtraction> {
  const prompt = buildExtractionPrompt(question);
  let raw = "";
  for await (const chunk of callExtractionModel(prompt, client)) {
    raw += chunk;
  }
  return parseGroundingExtraction(raw);
}
