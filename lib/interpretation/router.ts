/**
 * Model router — THE ONLY module in this codebase that imports @anthropic-ai/sdk
 * (AGENTS.md §3: "Model access is behind an interface"). Swapping models, tiers,
 * or even providers should only ever require changes here.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { AssembledPrompt } from "./prompt";
import type { ModelTier } from "./types";

const MAX_TOKENS = 1024;

const MODEL_BY_TIER: Record<ModelTier, string> = {
  default: "claude-sonnet-4-6",
  premium: "claude-opus-4-8",
};

/** Resolves a tier to its concrete model id. Defaults to the "default" (Sonnet) tier. */
export function resolveModel(tier: ModelTier = "default"): string {
  return MODEL_BY_TIER[tier];
}

/** Cheap model for Phase 1 grounding extraction (lib/interpretation/grounding.ts). Not a user-selectable tier. */
export const EXTRACTION_MODEL = "claude-haiku-4-5";

/**
 * A streamed event from the model. Typed `unknown` deliberately: the real SDK's
 * `RawMessageStreamEvent` union has per-variant `delta` shapes that don't share
 * a common structural type (e.g. `message_delta`'s delta has no `type` field).
 * `extractTextDelta` below narrows safely at runtime instead.
 */
export type ModelStream = AsyncIterable<unknown>;

export interface ModelClient {
  messages: {
    stream(params: {
      model: string;
      max_tokens: number;
      system: AssembledPrompt["system"];
      messages: AssembledPrompt["messages"];
    }): ModelStream;
  };
}

/** Extracts the text of a `content_block_delta` / `text_delta` event, or null for any other event. */
function extractTextDelta(event: unknown): string | null {
  if (typeof event !== "object" || event === null) return null;
  if ((event as { type?: unknown }).type !== "content_block_delta") return null;

  const delta = (event as { delta?: unknown }).delta;
  if (typeof delta !== "object" || delta === null) return null;
  if ((delta as { type?: unknown }).type !== "text_delta") return null;

  const text = (delta as { text?: unknown }).text;
  return typeof text === "string" ? text : null;
}

/** Thrown for any API/network/timeout failure. Message is sanitized — never includes secrets. */
export class ModelRequestError extends Error {
  constructor(public readonly cause: unknown) {
    super("The interpretation model request failed.");
    this.name = "ModelRequestError";
  }
}

let defaultClient: Anthropic | null = null;

function getDefaultClient(): ModelClient {
  if (!defaultClient) {
    // Reads ANTHROPIC_API_KEY from the environment; never hardcoded, never logged.
    defaultClient = new Anthropic();
  }
  return defaultClient;
}

/**
 * Streams text chunks from a given model id for an already-assembled prompt.
 * Shared by interpret() (Phase 2 reading) and extract() (Phase 1 grounding) —
 * the only difference between them is which model id gets passed in.
 */
async function* streamFromModel(
  model: string,
  prompt: AssembledPrompt,
  client?: ModelClient,
): AsyncGenerator<string, void, unknown> {
  const activeClient = client ?? getDefaultClient();

  let stream: ModelStream;
  try {
    stream = activeClient.messages.stream({
      model,
      max_tokens: MAX_TOKENS,
      system: prompt.system,
      messages: prompt.messages,
    });
  } catch (err) {
    throw new ModelRequestError(err);
  }

  try {
    for await (const event of stream) {
      const text = extractTextDelta(event);
      if (text !== null) {
        yield text;
      }
    }
  } catch (err) {
    throw new ModelRequestError(err);
  }
}

/**
 * Calls the reading model (Phase 2) with an already-assembled prompt and
 * streams back text chunks. Tests always inject `client` so no real network
 * call is ever made in CI.
 */
export async function* interpret(
  prompt: AssembledPrompt,
  tier: ModelTier = "default",
  client?: ModelClient,
): AsyncGenerator<string, void, unknown> {
  yield* streamFromModel(resolveModel(tier), prompt, client);
}

/**
 * Calls the cheap extraction model (Phase 1, claude-haiku-4-5) with an
 * already-assembled prompt and streams back text chunks — typically a small
 * JSON object; see grounding.ts for parsing. Same client/error/event handling
 * as interpret(); only the model id differs.
 */
export async function* extract(
  prompt: AssembledPrompt,
  client?: ModelClient,
): AsyncGenerator<string, void, unknown> {
  yield* streamFromModel(EXTRACTION_MODEL, prompt, client);
}
