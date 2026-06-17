# TASK — Milestone 2: Interpretation Endpoint

**This is the active task once M1 is committed. Build only this. Then stop and report.** See `AGENTS.md` for the rules. Design intent for the reading lives in `docs/INTERPRETATION_PROMPT.md`; pipeline shape in `docs/ARCHITECTURE.md` §5.

---

## Goal

Turn a cast hexagram + a real question into a personalized, grounded reading by calling Claude through a single model router. This is where the product becomes a product. Unlike M1, there is **no unit test for "is this a good reading"** — quality is evaluated by a human reading outputs. The agent's job is to build a correct, well-structured, testable pipeline; the founder judges the readings.

---

## Prerequisites (human, before the agent can produce a real reading)

1. **Anthropic API key.** Put `ANTHROPIC_API_KEY=...` in `.env.local` (already git-ignored). The SDK reads it from the environment; the key is never hardcoded or committed.
2. **A small real demo corpus.** M1 deliberately seeded only structural data (no judgment/image/line texts). M2 needs *real* hexagram text to interpret. A tiny rights-clean demo set (2–3 hexagrams, public-domain source) is enough to validate the loop end-to-end. **The agent must NOT invent or generate this text** (`AGENTS.md`). It is supplied by a human as a seed file, the same way the King Wen fixture was. The full 64-hexagram multilingual corpus is a separate content workstream.

The agent can build and test the entire pipeline with a **mocked model** without either prerequisite; the prerequisites are only needed to see a live reading.

---

## In scope

1. **Model router** — `/lib/interpretation/router.ts`: the single entry point for all model calls (`AGENTS.md` §3). Uses the official `@anthropic-ai/sdk`. Exposes a small interface (e.g. `interpret(params): stream`) so models/tiers are swappable. Default model **`claude-sonnet-4-6`**; premium "deep reading" tier **`claude-opus-4-8`**. No raw SDK calls anywhere else in the codebase.
2. **Prompt assembly** — `/lib/interpretation/prompt.ts`: builds the request per `docs/INTERPRETATION_PROMPT.md`:
   - **Static system prompt** (role, voice, grounding contract, guardrails, output guidance) as a `system` block array, with `cache_control: { type: "ephemeral" }` on the **last static block**.
   - **Dynamic payload** (the user's question, locale, and the fetched verified texts) goes in the **user message — AFTER the cache breakpoint**. Putting any per-request content at or before the breakpoint breaks caching (you pay a fresh cache write every call and never get a read). This ordering is correctness-and-cost critical.
3. **Interpretation service** — `/lib/interpretation/interpret.ts`: takes `{ cast, question, locale }`, fetches the **exact** verified texts for the primary hexagram, the relevant changing-line texts, and the resulting hexagram (using the emphasis rules in `ICHING_REFERENCE.md` §5), assembles the prompt, calls the router, and streams the reading. The model receives source text; it never recalls or generates hexagram content.
4. **API route** — `POST /api/interpret`: validates input, runs the service, **streams** the reading to the client.
5. **Tests** (mocked model — see acceptance criteria).

## Out of scope (do NOT build)

- Follow-up chat (`/api/chat`) — that is a later milestone.
- Any UI (M3).
- Auth, payments, accounts, rate limiting, entitlements.
- The full 64-hexagram corpus content (separate human workstream).
- Persisting readings to the DB (wire the pipeline; persistence can be a thin follow-up).
- Evaluating or asserting reading *quality* in code.

If something here seems to require out-of-scope work, **stop and ask**.

---

## Acceptance criteria (tests use a MOCKED Anthropic client — no live calls in CI)

- [ ] **Single entry point:** a test/lint check confirms the Anthropic SDK is imported only in `router.ts`.
- [ ] **Prompt assembly:** given a cast + question + locale, the assembled request contains the exact fetched texts (primary judgment/image, the correct changing-line texts per `ICHING_REFERENCE.md` §5, resulting hexagram when changing lines exist) and the user's question, in the correct locale field.
- [ ] **Grounding contract:** the assembled prompt passes only the provided texts; a test confirms no hexagram text is sourced from anywhere but the corpus/fetch. The system prompt explicitly forbids recalling/inventing content.
- [ ] **Cache breakpoint placement:** a test asserts `cache_control` sits on the last *static* system block and that no per-request content appears at or before it. (Guards the cost model.)
- [ ] **Model routing:** default resolves to `claude-sonnet-4-6`; premium path resolves to `claude-opus-4-8`; both go through the router.
- [ ] **Streaming:** the route returns a streamed response; a test verifies the streaming path assembles the full text from chunks.
- [ ] **Error handling:** API/network/timeout errors are caught and surfaced cleanly (no secrets in error output); missing texts cause an explicit, safe failure rather than a model guess.
- [ ] **No secrets committed:** key only via `process.env.ANTHROPIC_API_KEY`; `.env.local` git-ignored.
- [ ] Strict TypeScript; no `any` without a written reason.

---

## Suggested file structure

```
/lib/interpretation/
  router.ts        # ONLY place that imports @anthropic-ai/sdk; model selection
  prompt.ts        # static system (cached) + dynamic payload assembly
  interpret.ts     # fetch verified texts -> assemble -> call -> stream
  types.ts         # InterpretParams, etc.
  prompt.test.ts   # assembly, grounding, cache-breakpoint tests
  interpret.test.ts# service tests with mocked router/model
/app/api/interpret/route.ts   # POST /api/interpret (streaming)
/data/hexagrams.demo.json     # SMALL real demo corpus — human-populated placeholder
```

## Definition of done

All acceptance tests pass with a mocked model; the SDK is isolated to the router; the cache breakpoint is correctly placed; no secrets or invented content; and you've reported what was built/tested, plus a note that (a) a real `ANTHROPIC_API_KEY` and (b) the demo corpus text are the two human inputs needed to see a live reading. Commit when green. Do not start the next milestone.

---

## How to verify a real reading (human, after the build)

1. Add `ANTHROPIC_API_KEY` to `.env.local`.
2. Populate `/data/hexagrams.demo.json` with real, rights-clean text for a few hexagrams (supplied separately — do not let the agent invent it).
3. Call `POST /api/interpret` with a genuine question and a cast that lands on a seeded hexagram.
4. **Read the output yourself.** Judge: is it specific to the question? grounded in the texts? the right voice? correct in the locale? This human evaluation — not a passing test — is the real bar for M2. Iterate on `docs/INTERPRETATION_PROMPT.md`, not the engine.
