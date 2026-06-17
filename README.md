# 易經 — AI I Ching Consultation Platform

> An AI consultation that takes a real question, casts a real hexagram deterministically, and returns a personalized, conversational interpretation grounded in verified texts — in Vietnamese, Chinese, and English. Not a fortune cookie. A serious tool for navigating change and decisions.

**Status:** Pre-MVP. Documentation-first. Build has not started.
**Beachhead market:** Vietnam + Vietnamese/Chinese diaspora.

---

## How to use this repo (read this first, agent included)

If you are an AI coding agent, **read the docs in this order before writing any code:**

1. **`AGENTS.md`** — the rules you must follow. Non-negotiable. Read it fully.
2. **`docs/STRATEGY.md`** — *why* this product exists (market, positioning). Context, not build instructions.
3. **`docs/PRD.md`** — *what* to build (features, screens, acceptance criteria).
4. **`docs/ARCHITECTURE.md`** — *how* it's structured (the deterministic-vs-LLM split is critical).
5. **`docs/ICHING_REFERENCE.md`** — the domain truth. **Never invent hexagram data; always consult this.**
6. **`docs/ROADMAP.md`** — the build sequence.
7. **`docs/TASKS/`** — the current scoped task. **Build only the active milestone.**

Do not build the whole vision at once. Build the active task in `docs/TASKS/`, get it correct and tested, then stop and report.

---

## Documentation map

| File | Purpose | Audience |
|---|---|---|
| `README.md` | Orientation + doc map | Everyone |
| `AGENTS.md` | Agent operating rules & guardrails — **single source of truth** | Agent (primary) |
| `CLAUDE.md` | Thin bootstrap → points Claude Code to `AGENTS.md` | Claude Code |
| `GEMINI.md` | Thin bootstrap → points Antigravity to `AGENTS.md` (it won't auto-load it) | Antigravity |
| `docs/STRATEGY.md` | Market research, positioning, business thesis | Founder, agent (context) |
| `docs/PRD.md` | Product requirements: features, screens, acceptance | Agent (build spec) |
| `docs/ARCHITECTURE.md` | Tech architecture, stack, module layout | Agent (build spec) |
| `docs/DATA_MODEL.md` | Postgres schema, build-ready | Agent (build spec) |
| `docs/ICHING_REFERENCE.md` | Trigrams, casting math, **King Wen table**, changing-line logic | Agent (domain truth) |
| `docs/INTERPRETATION_PROMPT.md` | The LLM grounding prompt & house voice | Agent (product core) |
| `docs/MONETIZATION.md` | Tiers, pricing, payment rails, entitlements | Founder, agent |
| `docs/ROADMAP.md` | Milestones, build order, metrics to watch | Founder, agent |
| `docs/TASKS/*.md` | Tightly-scoped, one-at-a-time build tasks | Agent (do this now) |

> Note: `docs/STRATEGY.md` is the strategy document previously produced (`yijing-platform-spec.md`). Rename/move it into `docs/STRATEGY.md` when you set up the repo.

---

## Stack at a glance

- **Frontend:** Next.js (React) as a responsive **PWA** — web-first to avoid app-store payment tax.
- **Backend:** Next.js API routes / thin Node-TypeScript service.
- **Casting engine:** pure TypeScript, deterministic, **never an LLM**.
- **Database:** Postgres (Supabase or Neon); `pgvector` reserved for Phase 2.
- **LLM:** Claude Sonnet 4.6 via Anthropic API (behind a model-router interface), with prompt caching.
- **Payments:** MoMo + ZaloPay + VNPay/PayOS (local) and Stripe (international).
- **Hosting:** Vercel + managed Postgres. **Analytics:** PostHog.

---

## The one rule that matters most

**The model never computes the hexagram.** Casting, hexagram identification, changing lines, and the resulting hexagram are computed by deterministic code (`docs/ICHING_REFERENCE.md`). The LLM only *interprets* verified texts. Violating this silently corrupts every reading. See `AGENTS.md`.
