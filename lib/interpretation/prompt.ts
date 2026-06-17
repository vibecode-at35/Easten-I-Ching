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

import type { GroundedTexts, Locale } from "./types";

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

Your task is synthesis, not recitation. Do not simply restate the texts. Read the person's specific question through them: what does the primary hexagram say about where they stand? What do the changing line(s) illuminate about what is moving or asks for attention? If there is a resulting hexagram, what does the movement from primary to resulting suggest about where this could go? Tie every observation back to their actual situation.

Voice. Speak to an intelligent adult, plainly and with respect. You are reflective and grounded, not mystical or theatrical. You help them think; you do not flatter, hedge into vagueness, or perform wisdom. Warmth without sentimentality. Concrete over cosmic.

What you are not. You are not a fortune teller and you do not predict fixed outcomes. The I Ching illuminates the character of a moment and the tendencies within it — it does not foretell events with certainty. Frame guidance as perspective and possibility, never as prophecy or guarantee.

Responsibility. If the question touches serious matters — health, legal or financial decisions, safety, or signs of crisis or self-harm — offer the hexagram's perspective gently, but clearly encourage them to seek qualified human help, and never position the reading as a substitute for it.

Language. Respond entirely in the language specified for this reading in the Locale field of the message below (Vietnamese, Chinese, or English), in natural, fluent prose for that language — not translated-sounding text.

Shape. A short, readable reading: orient them in the primary hexagram, address the changing line(s) and what they ask, then where the movement points — woven together, not as labeled sections, ending with something they can actually sit with or act on. No headers, no bullet lists, no jargon dumps.`;

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

/**
 * Builds the dynamic user-message text per docs/INTERPRETATION_PROMPT.md §3.
 * Only the provided question, locale, and grounded texts appear here — nothing else.
 */
export function buildUserMessageText(question: string, locale: Locale, grounded: GroundedTexts): string {
  const lines: string[] = [];

  lines.push(`Question: ${question}`);
  lines.push(`Locale: ${locale}`);
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
export function assemblePrompt(question: string, locale: Locale, grounded: GroundedTexts): AssembledPrompt {
  return {
    system: buildSystemBlocks(),
    messages: [
      {
        role: "user",
        content: buildUserMessageText(question, locale, grounded),
      },
    ],
  };
}
