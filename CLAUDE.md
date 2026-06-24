# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**The single source of truth for agent rules is `AGENTS.md` — read it in full before writing any code.**

---

## Read these docs in order before writing anything

1. **`AGENTS.md`** — binding operating rules (golden rules, scope discipline, coding conventions)
2. **`README.md`** — orientation and doc map
3. **`ARCHITECTURE.md`** — system design, module layout, the deterministic-vs-LLM split
4. **`DATA_MODEL.md`** — the *intended* Postgres schema (not yet wired — see Architecture below)
5. **`ICHING_REFERENCE.md`** — domain source of truth (hexagram encoding, King Wen table, casting math)
6. **`docs/TASKS/`** — the active milestone; **build only the current task, then stop and report**

This repo is built one scoped task at a time, in commit-sized increments (`feat(ui): M3 Task 2 — ...` etc.) — never the whole milestone at once. After finishing a task: run the checks below, verify against the real dev server (not just `tsc`/tests — see Architecture note on Tailwind), report what changed, and stop for explicit sign-off before committing or starting the next task.

---

## Commands

```bash
npm run dev                      # start Next.js dev server (localhost:3000)
npm run build                    # production build
npm test                         # run all tests (Jest + ts-jest)
npm test -- casting              # run tests whose path matches a pattern (e.g. lib/iching/casting.test.ts)
npx jest lib/iching/casting.test.ts   # run one exact test file
npx jest -t "bijection"          # run tests whose name matches a pattern
npx tsc --noEmit                 # type-check only — run this after every change, it's the fast gate
```

`npm run lint` exists in `package.json` but **is not actually usable yet** — no ESLint config file exists, so `next lint` drops into an interactive "how would you like to configure ESLint" prompt (and `next lint` itself is deprecated in this Next version). Don't rely on it; `tsc --noEmit` + the test suite are the real gates this project has used throughout.

**Dev-server / `.next` caveat (learned the hard way):** run **only one** `npm run dev` at a time, and **do not run `npm run build` while a dev server is up** — both write the same `.next` directory, and a second writer corrupts the webpack server chunks (`Cannot find module './NNN.js'`, `__webpack_modules__[id] is not a function`). To recover: kill the stray dev server(s), `rm -rf .next`, restart one server. Prefer `tsc --noEmit` to gate changes (it never touches `.next`); only build when no dev server is running.

No env vars are required to run tests (all model calls are mocked — see Architecture). For a live model call, `ANTHROPIC_API_KEY` must be in `.env.local` (git-ignored); `scripts/first-reading.mjs` is a manual live-verification script, not part of the test suite — edit its `cast`/`question` and run it directly against `npm run dev` to sanity-check a real reading.

---

## Architecture

### The deterministic/LLM split (the rule everything else protects)

`lib/iching/` is a pure, framework-free TypeScript module — no I/O, no network, no LLM. `casting.ts` converts six line values into a `CastResult` (primary hexagram, changing lines, resulting hexagram) via a seeded PRNG and a King Wen lookup table (`kingwen.ts`, cross-checked against an independently-sourced fixture in `kingwen.authoritative.ts`). **Nothing outside this module may compute, identify, or transform a hexagram** — including the UI. The pattern when the UI needs derived hexagram data: add it to `casting.ts` with a self-check, never to the component. Two live examples — `deriveResultingLines` (the resulting hexagram's line-by-line yin/yang pattern, self-checked against the engine's own `resultingHexagram` number) and `coinFacesForLine` (the three coin faces the casting ceremony shows, self-checked to sum to the actual line value) — both throw rather than silently render a mismatch. Components only ever render data already computed by `lib/iching`.

### Corpus access — static JSON, not Postgres (yet)

`DATA_MODEL.md` describes a Postgres schema, but nothing is wired to a database yet. `lib/db/hexagrams.ts` reads two static files instead:
- `data/hexagrams.seed.json` — all 64 hexagrams, **structural data only** (number, binary value, Chinese/pinyin name, trigrams). Small (~8KB). Source for the authoritative King Wen verification test, the fabrication guard's "every hexagram identity" list, and the **client-safe** `getHexagramStructure`/`getAllHexagramIdentities`.
- `data/hexagrams.demo.json` — **all 64 hexagrams populated** (zh + en for all; vi for most), ~250KB. 1–56 from ctext.org (Legge 1899) with Vietnamese from Ngô Tất Tố; 57–64 merged from the two single-lineage candidate files in `data/sources/` (en from Legge 1882, zh from zh.wikisource, vi from Ngô Tất Tố). **Before re-touching the corpus, read both candidate files' `_meta` pros/cons — this is a hard rule in `AGENTS.md` §7.** A handful of fields are genuinely `vi: null` (e.g. hex 58 judgment, hex 58 line 1, hex 59 line 2); a vi request for those throws `MissingHexagramTextError` → `/api/interpret` returns `422` by design (the service refuses to invent missing text). Note the line-text shape is `{ position, text: { vi, zh, en } }` — the loader reads `line.text[locale]`, so a flat `{ position, zh, … }` line is a data bug (it was the cause of a 57–64 crash).

### The interpretation pipeline — two model calls, then a guard, then send

`POST /api/interpret` (`app/api/interpret/route.ts`) → `lib/interpretation/interpret.ts`'s `runInterpretation`, which does, in order:
1. **Fetch grounded texts** for the cast (`lib/db/hexagrams.ts`) — throws `MissingHexagramTextError`/`HexagramTextNotFoundError` if the corpus can't cover this cast.
2. **Phase 1 — grounding extraction** (`grounding.ts`): a cheap, non-streamed call (Claude Haiku 4.5) reads the raw question and returns `{ stated, unstated, questionType }`. This exists because the system prompt alone ("don't invent details the user didn't mention") left a residual hallucination rate under live testing; failure here is logged and swallowed — Phase 2 just runs without a grounding object, never blocked.
3. **Assemble the prompt** (`prompt.ts`): a cached static system block (house voice + grounding contract — must stay byte-identical across calls for prompt caching) plus a dynamic user message (question, locale, Phase 1's output, the fetched hexagram texts). Locale and all per-request content live *only* in the dynamic block; nothing per-request may leak into the cached block.
4. **Phase 2 — the reading** (`router.ts`'s `interpret()`, Claude Sonnet 4.6 default / Opus 4.8 premium).
5. **Hexagram-fabrication guard** (`hexagram-guard.ts`): Phase 2's *entire* response is buffered (not streamed chunk-by-chunk to the client — this is a real, deliberate latency tradeoff) and scanned for any hexagram reference — exact Chinese name or `#NN` form — outside the actual cast's primary/resulting pair. A violation triggers exactly one retry with the identical prompt; if it still fails, `runInterpretation` throws `HexagramFabricationError` and **nothing is ever sent to the client**. This exists because a live test produced a reading that fabricated five changing lines and a wrong resulting hexagram from memory — caught after the fact, then closed structurally rather than by prompt wording alone.

`router.ts` is the **only** module in the codebase that imports `@anthropic-ai/sdk` (enforced by a test that scans the source tree) — both `interpret()` (Phase 2) and `extract()` (Phase 1) share one internal streaming/error-handling helper there.

All of this is tested against **mocked** model clients — no live API calls in the test suite.

Two smaller API routes support the reading flow:
- **`POST /api/clarify`** — a fast Haiku "gatekeeper" (also via `router.ts`'s `extract()`) returning `{ action: "proceed" | "ask", clarificationQuestion }`. `QuestionEntry` calls it inline to optionally nudge the person to add context *before* casting. It **fails open** (any error → `proceed`); it must tolerate the model wrapping the JSON in prose/fences (parse the first `{…}` block, not the whole response).
- **`GET /api/hexagram?n=<1-64>&locale=<vi|zh|en>`** — returns the verified judgment + image text for the reading screen's summary cards. Server-side only, so the 250KB corpus never reaches the client bundle; a missing field comes back `null` (card omitted), never invented.

### UI layer (M4: dark theme, i18n, the full reading flow)

Next.js App Router. `app/page.tsx` is a single client orchestrator stepping through phases **landing → entry → casting → reading** (there is no separate clarification screen — `QuestionEntry` consults `/api/clarify` inline). A fixed `LanguageSwitcher` (top-right) and `ExitButton` (top-left, on every non-landing screen → full reset to landing) sit above all phases.

**Theme.** `app/globals.css` is the design system as **Tailwind v4 `@theme` tokens** (CSS-first; there is no `tailwind.config.js`). The default is the dark **"ink by night"** palette: `bg`/`surface`/`text`/`text-muted`/`gold` (+`gold-bright`/`gold-dim`)/`cinnabar`/`hairline`. **Gold is the carrying accent** (wordmark, hexagram lines, primary buttons); **cinnabar** is reserved for the seal and changing-line marks. Tailwind v4 only emits a token once a component references it — confirm by source, not compiled output. Motion keyframes (`fade-up`, `pop-in`, `gold-shimmer`, `coin-toss`, `seal-stamp`, `brush-stroke`, `oracle-dot`) live here too.

**i18n (vi / zh / en, full parity).** `lib/i18n/` holds a typed message dictionary (`messages.ts` — no hardcoded display strings anywhere), a `LocaleProvider` with `useT()`/`useLocale()`, and localized 8-trigram labels (`trigrams.ts`). **One** app-level locale (default `vi`, persisted to `localStorage`) drives **both** the UI chrome and the reading language sent to `/api/interpret`; `lib/interpretation/locale.ts`'s `detectLocale` exists but is no longer authoritative.

**Presentational discipline + the client/server corpus split.** `components/` pieces render already-computed data and do no hexagram computation (golden rule #1) — the casting coins render engine-derived `coinFacesForLine` results as a 方孔錢 cash-coin SVG; `ReadingScreen` leads with structural cards (glyph, name, trigrams via the seed; verified judgment/image via `/api/hexagram`) and tucks the streamed AI reading behind a "Xem chi tiết" toggle. **Client components must read only the seed** (`getHexagramStructure`) — importing `getHexagramRecord` (which pulls the 250KB demo corpus) into a client component would bloat the bundle. `app/dev/hexagram-glyph/page.tsx` is a dev-only route for visually checking glyph/seal components.

### Not built yet

No auth, no payments, no persistence of readings, no follow-up chat, no companion memory — all explicitly out of scope until later milestones.

---

## Critical constraints (full detail in `AGENTS.md`)

- **The model never computes the hexagram; neither does the UI.** Casting and any hexagram transformation live only in `lib/iching`.
- **Never invent I Ching content.** Hexagram names/judgments/line texts come only from the seeded corpus — a missing value is a `422`, never a guess.
- All LLM calls go through `lib/interpretation/router.ts` only (enforced by a source-tree-scanning test).
- i18n is fully wired (vi/zh/en) — all UI strings live in `lib/i18n/messages.ts`, never hardcoded. The corpus is largely populated in all three; the few remaining `vi: null` fields stay `null` (→ `422`), never English-filled.
- No dark patterns, no ads, ever.
