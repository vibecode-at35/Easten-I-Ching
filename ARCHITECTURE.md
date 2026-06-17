# ARCHITECTURE — MVP Technical Architecture

Build-ready architecture. The single most important idea: **the casting is deterministic code; the LLM only interprets verified texts.** See `AGENTS.md` golden rules.

---

## 1. Why no vector database (read this)

The I Ching is a **closed, finite corpus**: 64 hexagrams, 384 line texts, a few commentary traditions. The whole knowledge base fits comfortably in a model's context window and lives in a structured database pulled by **exact lookup**. You do **not** need RAG / embeddings / a vector DB for the core reading.

- Hexagram identification = pure math (deterministic engine).
- Interpretation = send only the *relevant* hexagram's exact texts to the model.
- Vector search (`pgvector`) re-enters only in **Phase 2** for semantic journal search and a learning/Q&A mode over broader literature.

This is a cost and correctness advantage. Don't reintroduce complexity the domain doesn't require.

---

## 2. System diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js PWA)                          │
│  Question framing · Coin-cast animation · Reading view · Journal      │
│  Follow-up chat · Auth · Paywall · i18n (vi / zh / en)                │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS (JSON, streaming)
┌───────────────▼──────────────────────────────────────────────────────┐
│                      API LAYER (Next.js routes / Node)                │
│                                                                       │
│   POST /api/cast ────► ┌─────────────────────────────┐               │
│                        │   CASTING ENGINE (pure TS)   │   NO LLM      │
│                        │  • 3-coin RNG → 6 lines      │               │
│                        │  • 6/7/8/9 → line types      │               │
│                        │  • 6-bit pattern → King Wen #│               │
│                        │  • changing lines → result # │               │
│                        └──────────────┬──────────────┘               │
│                                       │ verified hexagram object       │
│   POST /api/interpret ► ┌─────────────▼──────────────┐               │
│                         │  INTERPRETATION SERVICE      │               │
│                         │  1. fetch exact texts (DB)   │               │
│                         │  2. build prompt:            │               │
│                         │     [cached static] + [hex   │──────► Anthropic API
│                         │     texts + question + ctx]  │        (Sonnet 4.6,
│                         │  3. call model (router)      │◄──────  prompt caching;
│                         │  4. stream reading           │         Opus 4.8 premium)
│                         └─────────────┬───────────────┘               │
│   POST /api/chat ──────────────────────┘ (same grounded texts + history)│
│                                                                       │
│   /api/payments/* ──► MoMo · ZaloPay · VNPay/PayOS · Stripe           │
│   /api/auth/* ──────► Supabase Auth / Auth.js                         │
└───────────────┬──────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│                         POSTGRES (Supabase / Neon)                    │
│  hexagrams (64, JSON) · users · subscriptions · readings ·            │
│  reading_messages   [Phase 2] embeddings (pgvector)                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Module / repo layout (suggested)

```
/app                  # Next.js App Router (pages, layouts, UI)
/components            # React components (small, readable)
/lib
  /iching
    casting.ts        # deterministic engine — NO I/O, NO LLM
    kingwen.ts        # 6-bit pattern → King Wen number lookup
    trigrams.ts       # trigram definitions + encoding
    types.ts          # HexagramCast, Line, etc.
    casting.test.ts   # validates against docs/ICHING_REFERENCE.md
  /interpretation
    router.ts         # single entry point for all model calls
    prompt.ts         # builds cached static + dynamic prompt
    interpret.ts      # fetch texts → call model → stream
  /db
    schema.ts         # Postgres schema / queries
    hexagrams.ts      # corpus access (exact lookup)
  /payments
    momo.ts zalopay.ts vnpay.ts stripe.ts
    entitlements.ts   # who can do what
/data
  hexagrams.seed.json # the 64-hexagram corpus (data, not code)
/docs                 # this documentation set
```

Rule: `/lib/iching/casting.ts` is framework-free and pure. The model is only reachable through `/lib/interpretation/router.ts`.

---

## 4. API endpoints (MVP)

| Endpoint | Does |
|---|---|
| `POST /api/cast` | Runs the deterministic engine, returns `{ primaryHexagram, changingLines[], resultingHexagram, lines[] }`. Persists the cast with the reading. |
| `POST /api/interpret` | Takes a cast + question + context, fetches verified texts, calls the model, streams the reading, persists it. |
| `POST /api/chat` | Follow-up turn on an existing reading; reuses the reading's grounded texts + message history. |
| `GET /api/readings` | The user's journal (own readings only). |
| `POST /api/payments/*` | Provider-specific checkout + webhook handling → updates entitlements. |
| `/api/auth/*` | Sign in / up / session. |

---

## 5. Interpretation pipeline detail

1. **Retrieve, don't generate.** Pull the exact Judgment, Image, the *specific* changing-line texts, and the resulting hexagram's judgment from Postgres.
2. **Prompt caching.** Split the prompt: the **static** half (system instructions, house voice, format rules) is cached (~90% input savings); only the **dynamic** half (this hexagram's texts, the question, context) varies per call.
3. **Synthesis instruction.** The system prompt makes the model read *this question* through the hexagram — primary + changing lines + movement to the resulting hexagram → guidance, in the user's language and voice.
4. **Stream** to the client.
5. **Follow-ups** reuse the same grounded texts + history → anchored dialogue, not generic chat.

Full prompt design: `docs/INTERPRETATION_PROMPT.md`.

---

## 6. Model & cost

- Default interpretation model: **Claude Sonnet 4.6** (best tone/nuance per cost; 1M context; caching). Premium "deep reading" tier may use **Opus 4.8**.
- All calls routed through `/lib/interpretation/router.ts` so models/tiers are swappable; keep Qwen available as a Chinese-language / cost hedge.
- Per-reading cost ≈ $0.02–0.05 (lower with caching). Model cost is not the constraint — retention is.

---

## 7. Deployment

- Frontend + API: **Vercel**. Database: managed **Postgres** (Supabase/Neon). Analytics: **PostHog** (instrument activation and week-4 retention from day one).
- Web-first PWA → integrate local VN payment rails directly and avoid the app-store 30% tax. Wrap for stores later (`docs/MONETIZATION.md`).
