/**
 * POST /api/interpret — validates input, runs the interpretation service,
 * and streams the reading back to the client as plain text chunks.
 *
 * No persistence here (out of scope for this milestone); no auth/payments.
 */

import { NextRequest } from "next/server";
import { runInterpretation } from "../../../lib/interpretation/interpret";
import { HexagramTextNotFoundError, MissingHexagramTextError } from "../../../lib/db/hexagrams";
import { ModelRequestError } from "../../../lib/interpretation/router";
import type { InterpretParams, Locale, ModelTier } from "../../../lib/interpretation/types";
import type { CastResult } from "../../../lib/iching/types";

const VALID_LOCALES: readonly Locale[] = ["vi", "zh", "en"];
const VALID_TIERS: readonly ModelTier[] = ["default", "premium"];

type ValidationResult =
  | { ok: true; params: InterpretParams }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCast(value: unknown): value is CastResult {
  if (!isPlainObject(value)) return false;
  const { primaryHexagram, changingLinePositions, resultingHexagram } = value;
  if (typeof primaryHexagram !== "number") return false;
  if (!Array.isArray(changingLinePositions) || !changingLinePositions.every((p) => typeof p === "number")) {
    return false;
  }
  if (resultingHexagram !== null && typeof resultingHexagram !== "number") return false;
  return true;
}

function validateInterpretRequest(body: unknown): ValidationResult {
  if (!isPlainObject(body)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const { cast, question, locale, tier } = body;

  if (typeof question !== "string" || question.trim().length === 0) {
    return { ok: false, error: "`question` is required and must be a non-empty string." };
  }

  if (typeof locale !== "string" || !VALID_LOCALES.includes(locale as Locale)) {
    return { ok: false, error: `\`locale\` must be one of: ${VALID_LOCALES.join(", ")}.` };
  }

  if (tier !== undefined && (typeof tier !== "string" || !VALID_TIERS.includes(tier as ModelTier))) {
    return { ok: false, error: `\`tier\` must be one of: ${VALID_TIERS.join(", ")}.` };
  }

  if (!validateCast(cast)) {
    return {
      ok: false,
      error: "`cast` must include numeric `primaryHexagram`, numeric[] `changingLinePositions`, and `resultingHexagram` (number or null).",
    };
  }

  return {
    ok: true,
    params: {
      cast: cast as CastResult,
      question,
      locale: locale as Locale,
      tier: tier as ModelTier | undefined,
    },
  };
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const validation = validateInterpretRequest(body);
  if (!validation.ok) {
    return jsonError(validation.error, 400);
  }

  // `runInterpretation` is an async generator: calling it does NOT execute its
  // body (grounding fetch, prompt assembly) — that only happens once iteration
  // starts. We "prime" it with one `.next()` here, before committing to a
  // Response, so grounding failures (missing texts) and even a first-chunk
  // model failure get a proper error status instead of a broken 200 stream.
  const iterator = runInterpretation(validation.params);
  let first: IteratorResult<string, void>;
  try {
    first = await iterator.next();
  } catch (err) {
    return mapPipelineError(err);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!first.done) {
          controller.enqueue(encoder.encode(first.value));
          for await (const chunk of iterator) {
            controller.enqueue(encoder.encode(chunk));
          }
        }
        controller.close();
      } catch (err) {
        // Errors raised after the first chunk can't change the HTTP status
        // (headers are already sent); abort the stream so the client sees a
        // clean cutoff rather than silently-truncated text. Full detail is
        // logged server-side only.
        console.error("Interpretation stream failed:", err);
        controller.error(new Error("Interpretation failed"));
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function mapPipelineError(err: unknown): Response {
  if (err instanceof HexagramTextNotFoundError || err instanceof MissingHexagramTextError) {
    // Safe to surface: identifies a content gap, not an internal/secret detail.
    return jsonError(err.message, 422);
  }
  if (err instanceof ModelRequestError) {
    console.error("Model request failed:", err.cause);
    return jsonError("The interpretation model request failed.", 502);
  }
  console.error("Unexpected interpretation error:", err);
  return jsonError("Interpretation failed.", 500);
}
