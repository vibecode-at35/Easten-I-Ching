# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**The single source of truth for agent rules is `AGENTS.md` — read it in full before writing any code.**

---

## Read these docs in order before writing anything

1. **`AGENTS.md`** — binding operating rules (golden rules, scope discipline, coding conventions)
2. **`README.md`** — orientation and doc map
3. **`ARCHITECTURE.md`** — system design, module layout, the deterministic-vs-LLM split
4. **`DATA_MODEL.md`** — Postgres schema
5. **`ICHING_REFERENCE.md`** — domain source of truth (hexagram encoding, King Wen table, casting math)
6. **`docs/TASK/`** — the active milestone; **build only this, then stop and report**

---

## Stack

- **Framework:** Next.js (App Router) — web-first PWA
- **Language:** TypeScript (strict mode, no `any` without written reason)
- **Styling:** Tailwind CSS
- **Database:** Postgres via Supabase or Neon; `pgvector` deferred to Phase 2
- **LLM:** Anthropic API — Claude Sonnet 4.6 (default), Opus 4.8 (premium tier)
- **Auth:** Supabase Auth / Auth.js
- **Payments:** MoMo, ZaloPay, VNPay/PayOS (VN), Stripe (international)
- **Hosting:** Vercel + managed Postgres; **Analytics:** PostHog

---

## Commands (once the project is initialized)

```bash
npm run dev          # start Next.js dev server
npm run build        # production build
npm run lint         # ESLint
npm test             # run all tests (Jest / ts-jest)
npm test -- casting  # run a single test file by name pattern
npx ts-node scripts/seed-hexagrams.ts  # seed the hexagram corpus into Postgres
```

> The project is pre-MVP / documentation-first. Update these commands once `package.json` exists.

---

## Architecture in one paragraph

The API layer has two separate concerns that must never blur: `POST /api/cast` runs a **pure TypeScript casting engine** (`/lib/iching/`) that converts 3-coin randomness into a hexagram object deterministically — no LLM involved, ever. `POST /api/interpret` takes that cast + the user's question, fetches exact texts from Postgres, and passes them to the model via a single router (`/lib/interpretation/router.ts`) — the model receives source text, it does not recall or generate domain content. Follow-up chat (`POST /api/chat`) reuses the same grounded texts + message history.

---

## Critical constraints (details in `AGENTS.md`)

- **The model never computes the hexagram.** Casting is deterministic code only.
- **Never invent I Ching content.** Names, judgments, line texts come from `ICHING_REFERENCE.md` and the seeded corpus — not model memory.
- All LLM calls go through `/lib/interpretation/router.ts` only.
- i18n from day one: Vietnamese / Chinese / English; no hardcoded display strings.
- No dark patterns, no ads, ever.
