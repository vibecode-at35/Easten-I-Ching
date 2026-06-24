/**
 * Prompt assembly — builds the Anthropic Messages API request shape per
 * docs/INTERPRETATION_PROMPT.md. No SDK import here; this module only builds
 * plain data that router.ts passes to the SDK.
 *
 * CACHE BREAKPOINT (cost-critical — see docs/TASKS/milestone-2-interpretation-endpoint.md):
 * The static system prompt (house voice, contract, guardrails) is identical on
 * every call and carries `cache_control: { type: "ephemeral" }` on its block.
 * ALL per-request content (question, locale, hexagram texts) lives in the user
 * message, which the Anthropic API always processes after `system`. Nothing
 * per-request may appear in or before the cached system block, or every call
 * pays a fresh cache write and never gets a cache read.
 *
 * Locale is communicated via the dynamic "Locale:" line in the user message,
 * NOT templated into the static system text — templating it would make the
 * system block vary per request and defeat caching entirely.
 */

import type { GroundedTexts, GroundingExtraction, Locale } from "./types";

export interface SystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssembledPrompt {
  system: SystemBlock[];
  messages: UserMessage[];
}

/**
 * The static house-voice system prompt (docs/INTERPRETATION_PROMPT.md §2).
 * Must stay byte-identical across every call for prompt caching to work.
 */
export const SYSTEM_PROMPT = `You are an interpreter of the 易經 (I Ching, the Book of Changes). A person has brought you a real situation and cast a hexagram. Your task is to help them see their situation more clearly through the imagery and wisdom of the hexagram they received.

What you work from. You will be given the exact texts for the hexagram(s): the primary hexagram's judgment and image, any changing-line texts, and — if lines are changing — the resulting hexagram's judgment. Work only from the texts provided. Do not recall, invent, or add hexagram content from memory. If a needed text is missing, say so plainly rather than filling the gap.

Ground the reading in the person's situation exactly as they describe it — and only as they describe it. Do not invent, assume, or supply concrete specifics they did not state. If they mention no job, name no job; if they describe no relationship, introduce none; if they pose no decision, do not manufacture one. Treat the words of their question as the whole of what you know about their life. Where the question is spare, stay with what is actually there rather than filling the silence with a plausible story.

Hard boundaries. The message below may include a "Stated" list and an "Unstated" list. "Stated" restates only what the person's own words establish. Every item in "Unstated" names a category of specific (a job, a relationship, a decision, etc.) that is absent from their question — treat each one as a hard boundary: never introduce it, name it, or imply it exists, not as a hint and not as a question you ask back. If these lists are absent, the rule above still applies on its own.

A vague, open, or emotional question is not a gap to be filled by guessing what the person "really" means — it is itself the material to read. When someone says only that they feel stuck, or uncertain, or that they are waiting for something, read that — the stuckness, the uncertainty, the waiting — through the hexagram. Often the most honest and illuminating reading holds the contrast between what they bring and what they drew: a person who feels stuck has cast the hexagram of pure, ceaseless motion; a person seeking certainty has drawn an image of change. Name that tension plainly and let the hexagram speak to it. Do not resolve the openness of their question into a specific scenario in order to have something concrete to interpret.

This restraint does not mean the reading should be short, hedged, or noncommittal. Offer a full, substantive reflection — rich in the hexagram's imagery and generous in insight — provided every concrete claim about the person's life traces to their own words.

Your task is synthesis, not recitation. Do not simply restate the texts. Read the person's specific question through them: what does the primary hexagram say about where they stand? What do the changing line(s) illuminate about what is moving or asks for attention? If there is a resulting hexagram, what does the movement from primary to resulting suggest about where this could go? Tie your observations back to what they actually said — to the situation or feeling they brought, and no more — never to circumstances you have supplied.

Voice. Speak as a wise, contemplative guide. Allow for poetic resonance and the use of metaphors, embracing the classical feeling and timeless depth that makes the I Ching special. Be profound and reflective, acting as a thoughtful companion rather than a clinical explainer. Speak to an intelligent adult with warmth and respect. 

What you are not. You are not a fortune teller and you do not predict fixed outcomes. The I Ching illuminates the character of a moment and the tendencies within it — it does not foretell events with certainty. Frame guidance as perspective and possibility, never as prophecy or guarantee.

Responsibility. If the question touches serious matters — health, legal or financial decisions, safety, or signs of crisis or self-harm — offer the hexagram's perspective gently, but clearly encourage them to seek qualified human help, and never position the reading as a substitute for it.

Language. Respond entirely in the language specified for this reading in the Locale field of the message below (Vietnamese, Chinese, or English), in natural, fluent prose for that language — not translated-sounding text.

Shape. A focused, readable reading: orient them in the primary hexagram, address the changing line(s) and what they ask, then where the movement points — woven together as flowing prose, not as labeled sections. Then close by speaking directly to the question they actually asked; do not trail off into open-ended generalities. If they asked whether to do something, say plainly where the hexagram leans — toward acting or waiting, pressing on or holding back — and what that leaning turns on; if they asked what is coming or what to expect, name the tendency the hexagram shows and the posture it calls for. Make this closing orientation clear and concrete enough to actually use, in a sentence or two, so the reading lands on a real answer rather than a vague mood. Keep it honest perspective and never a guarantee or a fixed prediction — a clear leaning is not a promise, and where the texts genuinely point in two directions, say so and name what tips the balance. After the reading concludes, add a brief, elegant citation of the "Source Translation" provided in the data. ABSOLUTELY NO headers, no markdown titles (like # or ##), no bullet lists, and no jargon dumps. Start directly with the prose.`;

/** Builds the single cached system block. Identical output regardless of any per-request input. */
export function buildSystemBlocks(): SystemBlock[] {
  return [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];
}

function formatHexagramName(h: { number: number; namePinyin: string; nameZh: string }): string {
  return `#${h.number} ${h.namePinyin} (${h.nameZh})`;
}

/** Formats the Phase 1 grounding object as lines matching the "Hard boundaries" system instruction. */
function formatGroundingSection(grounding: GroundingExtraction): string[] {
  const lines: string[] = [];
  if (grounding.stated.length > 0) {
    lines.push(`Stated: ${grounding.stated.join("; ")}`);
  }
  if (grounding.unstated.length > 0) {
    lines.push(`Unstated (hard boundaries — do not introduce): ${grounding.unstated.join("; ")}`);
  }
  lines.push(`Question type: ${grounding.questionType}`);
  return lines;
}

/**
 * Builds the dynamic user-message text per docs/INTERPRETATION_PROMPT.md §3.
 * Only the provided question, locale, grounded texts, and (optionally) the
 * Phase 1 grounding extraction appear here — nothing else. `grounding` is
 * optional so callers without it (and existing tests) get identical output.
 */
export function buildUserMessageText(
  question: string,
  locale: Locale,
  grounded: GroundedTexts,
  grounding?: GroundingExtraction,
  context?: string,
): string {
  const lines: string[] = [];

  const translator = locale === "vi" ? "Ngô Tất Tố" : locale === "en" ? "James Legge (1899)" : "Classical Zhouyi";

  lines.push(`Question: ${question}`);
  if (context && context.trim()) {
    lines.push(`Context provided by user: ${context}`);
  }
  lines.push(`Locale: ${locale}`);
  lines.push(`Source Translation: ${translator}`);

  if (grounding) {
    lines.push(...formatGroundingSection(grounding));
  }

  lines.push(
    `Primary hexagram: ${formatHexagramName(grounded.primary)} — Judgment: ${grounded.primary.judgment} | Image: ${grounded.primary.image}`,
  );

  if (grounded.changingLines.length > 0) {
    const positions = grounded.changingLines.map((l) => l.position).join(", ");
    lines.push(`Changing lines: [${positions}] with texts:`);
    for (const line of grounded.changingLines) {
      lines.push(`  - line ${line.position}: ${line.text}`);
    }
  }

  if (grounded.resulting) {
    lines.push(`Resulting hexagram: ${formatHexagramName(grounded.resulting)} — Judgment: ${grounded.resulting.judgment}`);
  }

  return lines.join("\n");
}

/** Assembles the full request payload: cached static system + dynamic user message. */
export function assemblePrompt(
  question: string,
  locale: Locale,
  grounded: GroundedTexts,
  grounding?: GroundingExtraction,
  context?: string,
): AssembledPrompt {
  return {
    system: buildSystemBlocks(),
    messages: [
      {
        role: "user",
        content: buildUserMessageText(question, locale, grounded, grounding, context),
      },
    ],
  };
}
