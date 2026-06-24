# Milestone 3 — The Reading Experience

*The first user-facing, visual milestone. Delivers the core loop: ask a question → tactile ceremonial cast → streamed reading on the warm-traditional hexagram screen. Built on M1 (deterministic casting engine) and M2 (two-phase grounded interpretation), both already complete, tested, and hardened against fabrication.*

**Before building, the agent reads:** `AGENTS.md` (golden rules), `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, and this file. Build only this milestone. Follow existing project conventions; keep the type-check and test suite green.

---

## 1. Goal

A person can, in a web browser:
1. Enter a real question.
2. Perform a tactile, ceremonial cast — coins, lines forming bottom-to-top, a sense of ritual.
3. Receive a grounded interpretation that **streams in** on a warm, classical hexagram screen.

That is the whole milestone. It is the emotional heart of the product made real.

---

## 2. Non-goals (explicit — these are later milestones)

- **No authentication / accounts** → M4.
- **No payments** → later.
- **No history / saved readings** → M4.
- **No companion memory** (using past readings to shape new ones) → M5. *This is the north star, but it is NOT built here.*
- **No Master character** → separate design track.
- **No full 64-hexagram corpus** → see §8. M3 is built and tested against the seeded hexagrams (1 and 2).

If a task feels like it belongs to one of the above, stop — it is out of scope for M3.

---

## 3. Golden rules that constrain this milestone

From `AGENTS.md`, the ones M3 must honor:

- **The UI never computes the hexagram.** Casting is owned by the deterministic engine in `lib/iching`. The UI *presents* a cast; it must never reimplement coin logic or fabricate a result. (Golden rule #1 — the rule the whole architecture exists to protect.)
- **Never invent I Ching content.** The UI displays only what the casting engine and `/api/interpret` return. No placeholder hexagram text, no invented names.
- **No dark patterns, no ads, no engagement mechanics.** The screen is calm and reverent. No streaks, no nudges, no "share to unlock," no upsells. The product respects the person and the tradition. (Golden rule #5.)
- **Build only the active task.** §2 is binding.

---

## 4. The core loop (three states)

```
[1] Question entry  →  [2] Casting ceremony  →  [3] Reading
```

Single, linear flow. One question, one cast, one reading. A "cast again / new question" affordance returns to [1]. No branching, no menus beyond this in M3.

---

## 5. Design system — warm-traditional

The chosen aesthetic: ink on rice-paper, classical, reverent. Cinnabar seal as the signature accent. Brush-weighted hexagram lines. Serif type. The opposite of a cluttered fortune-app — calm, considered, made for people who live this tradition.

These are starting tokens; refine in build, but stay within this world.

### 5.1 Color (light / "paper" — the M3 default)

| Token | Value | Use |
|---|---|---|
| `paper-base` | `#EFE7D6` | Main background (rice-paper cream) |
| `paper-raised` | `#F4EEE0` | Cards / raised surfaces |
| `ink` | `#3A2E1C` | Primary text, hexagram lines (sepia-black) |
| `ink-muted` | `#8B7A5C` | Secondary text, the user's question, hints |
| `cinnabar` | `#9A3324` | Seal, changing-line marks, the single accent |
| `cinnabar-deep` | `#7C2A1E` | Cinnabar text on light, if needed |
| `hairline` | `rgba(58,46,28,0.15)` | Dividers, thin borders |

Use cinnabar sparingly — it is a *seal*, an accent, not a theme color. Most of the screen is paper and ink.

### 5.2 Dark / "ink" variant (NOT built in M3 — structure tokens to allow it later)

"Warm paper by day, ink by night." Deep ink ground (`#14161E`), warm off-white text (`#E8E3D5`), **gold** accent (`#C9A24A`) replacing cinnabar for the contemplative night feel. Define tokens as CSS variables / a theme object so this variant can be added in a later pass without rework. Do not build the toggle now.

### 5.3 Typography

- **Serif for content** — the reading, hexagram names, anything editorial. Recommend `Noto Serif` (Latin) + `Noto Serif TC` (the corpus uses *traditional* Chinese: 乾, 坤, 元亨利貞). Classical, readable.
- **Sans for chrome** — buttons, small labels. A clean humanist sans (e.g. `Inter` / `Noto Sans`).
- Reading body: ~17–18px, line-height ~1.75, generous. The reading should *breathe* — it is meant to be sat with, not skimmed.
- Hexagram name (CJK): large, 40–56px.
- Sentence case for UI. No ALL CAPS except perhaps a small, letter-spaced English hexagram name as a refined label.

### 5.4 The seal (印章)

A cinnabar square containing the hexagram's Chinese name (or number), rendered like a carved stamp — the signature mark on the reading. Tasteful and restrained: a slightly irregular carved edge is welcome; kitsch is not. It is the one moment of strong color.

### 5.5 Hexagram rendering

- Six lines, stacked **bottom-to-top** (position 1 = bottom). This ordering is load-bearing — verify against `CastResult`.
- **Yang (solid)** line = one continuous brush bar. **Yin (broken)** line = two segments with a center gap.
- Brush-weighted: lines feel inked, not geometric — slightly organic ends, subtle weight. Simple is fine; avoid a sterile CSS-border look.
- **Changing lines marked**: a small cinnabar mark (dot or tick) beside any changing line, signalling it is "moving."
- **Resulting hexagram**: when there are changing lines, show the resulting hexagram as a secondary, smaller glyph with a clear primary → resulting transition. When there are none, show only the primary, whole.

### 5.6 Motion

Calm and weighted. No bouncy/playful easing. Coins settle; lines brush into place one at a time, bottom-to-top, with an unhurried, ink-settling feel. The reading streams at a readable, contemplative pace. Motion should feel like ritual, never like a loading spinner.

---

## 6. Screen specs

### 6.1 Question entry

- A single calm screen: a serif prompt (e.g. "What's on your mind?"), a free-text input, and a quiet "Cast" affordance.
- Question is **required** (the interpretation needs it). Gentle validation — no harsh error styling.
- No categories, templates, or suggested questions in M3. Free text only.

### 6.2 Casting ceremony — the heart

- **Three coins** (matches the engine's `three_coin` method).
- The person initiates the cast. The ceremony then forms the six lines, bottom-to-top, each brushing into place.
- **Recommended interaction:** let the person actively trigger each toss (tap to cast each line) for genuine ritual participation and tactility — this is what makes it feel ceremonial rather than a canned animation. Auto-advance with deliberate pacing is an acceptable fallback. Decide in build; favor participation.
- **The cast result is owned by `lib/iching`** (golden rule #1). The animation *presents* the engine's result; it does not generate the hexagram itself. The experience should feel as though the casting produces the lines — whether lines are generated per-toss via the engine or revealed from a full pre-computed `CastResult` is an implementation choice, but the engine must be the source of every line.
- On completion, the hexagram is whole; transition to the reading.

### 6.3 Reading

- **Top:** the completed hexagram glyph; the name (e.g. 乾 / Qián / The Creative); changing lines marked; the resulting hexagram shown if applicable (primary → resulting). The cinnabar seal as signature.
- **The question** shown small and quiet, for context.
- **The reading streams in** below, in serif, generous spacing — the oracle *speaking*. Progressive render as chunks arrive from `/api/interpret`.
- Single column, scrollable, lots of breathing room. A quiet "ask another question" affordance at the end. Nothing else — no share bar, no related-content rail, no engagement hooks.

---

## 7. Technical wiring

- **Casting:** use the existing `lib/iching` engine. Recommended: a thin `/api/cast` route that runs the engine and returns a `CastResult`, OR direct import of the pure casting module into the client (it is pure TS, no server deps). **Must not** reimplement coin/hexagram logic in the UI. Generate a strong random seed per cast (e.g. crypto random) and pass it to the engine; store the seed in the `CastResult` for reproducibility (the engine already supports this).
- **Interpretation:** `POST /api/interpret` with `{ cast, question, locale }`; consume the streamed response; render progressively. The two-phase grounding and the hexagram-fabrication guard already protect the output — the UI renders what it receives and handles errors.
- **Locale:** default `"en"` for M3 (the demo corpus has `en` + `zh`; `vi` is intentionally absent until sourced). Build `locale` as a parameter so `zh` and eventually `vi` switch in later. *(Reminder: the eventual primary market is Vietnamese/Chinese; vi text is a pending corpus task, not an M3 task.)*
- **Error handling — calm fallbacks, never raw internals:**
  - `422` (missing hexagram text) → a gentle "this reading couldn't be completed — try casting again" (common until the corpus is full; see §8).
  - `502` (fabrication guard tripped / model failure) → same calm fallback. Never expose which hexagram or any internal detail.
  - Network/stream failure → calm retry affordance.
  - No technical error text ever reaches the person.

---

## 8. Known constraint / dependency — corpus coverage

**Only Hexagrams 1 (Qián) and 2 (Kūn) currently have real text** in `data/hexagrams.demo.json`. A random cast landing on any of the other 62 hexagrams will make `/api/interpret` return `422` by design (it refuses to invent text — correct behavior).

Implications:
- M3 can be **built and tested now** by forcing the cast to a seeded hexagram (1 or 2), exactly as `scripts/first-reading.mjs` does.
- M3 is **not usable with random casts** until the full 64-hexagram corpus is populated — a separate, rights-clean data-sourcing task (Legge public-domain text via ctext, classical Chinese; vi pending).
- **Build a dev/test toggle** that forces the cast to a seeded hexagram, so M3 can be developed and demoed before the corpus is complete. Include at least one changing-line case (e.g. all-changing Hexagram 1 → 2) to exercise the resulting-hexagram path.

Full corpus population is a prerequisite for real launch and can proceed in parallel with M3. Flag it on the roadmap; do not let it block M3 development.

---

## 9. Companion-ready structural notes (for M4 / M5 — design for, don't build)

The north star is a companion that *remembers* the person. M3 builds none of that, but should not block it:

- Represent each reading as a structured object — `{ id, timestamp, question, locale, cast, interpretationText, primaryHexagram, resultingHexagram }` — even though M3 does not persist it. Shape it so M4 can store it and M5 can analyze patterns across readings.
- Keep reading **data** separate from **presentation** components.
- Keep the `/api/interpret` request assembly **extensible**, so M5 can later inject relevant past-reading context — without breaking the grounding discipline. (Memory must never become a backdoor for fabrication; that is an M5 design problem, flagged here only so M3 doesn't make it harder.)

---

## 10. Acceptance criteria (testable)

- A person can enter a question, trigger a ceremonial cast, and receive a streamed reading on the warm-traditional screen.
- The cast demonstrably comes from `lib/iching` — the UI never computes the hexagram itself.
- The hexagram glyph renders bottom-to-top with correct yang/yin lines; changing lines are marked; the resulting hexagram is shown when changing lines exist.
- The reading streams in, is readable, and matches the warm-traditional tokens (paper, ink, serif, cinnabar seal).
- Error states (`422` / `502` / network) show calm fallbacks; no raw errors or internals ever surface.
- Non-goals respected: no auth, payments, history, memory, or character present.
- Responsive on mobile and desktop (assume most users are on phones).
- A dev toggle can force a seeded hexagram (1 or 2), including a changing-line case, for testing before the corpus is complete.

---

## 11. Suggested task breakdown (ordered)

1. **Design tokens + app shell** — warm-traditional colors, type, spacing as CSS variables / theme object (dark variant tokens stubbed but unused); base page/layout.
2. **Hexagram glyph component** — renders a `CastResult`: six lines bottom-to-top, yang/yin, changing-line marks, primary → resulting. Brush-weighted styling.
3. **The seal component** (印章).
4. **Question entry screen.**
5. **Casting ceremony** — coins + line-forming animation wired to the `lib/iching` engine; dev toggle to force a seeded hexagram; favor tap-to-toss participation.
6. **Reading screen** — `POST /api/interpret`, consume stream, progressive render; the calm error fallbacks.
7. **Wire the core loop** — question → cast → reading, plus "ask another"; responsive pass.
8. **Manual verification** — against forced Hexagram 1 and Hexagram 2, including an all-changing 1 → 2 case that exercises the resulting-hexagram display. Confirm error fallbacks by forcing a 422 (cast to an unseeded hexagram).

Report at a sensible checkpoint before committing, per the established pattern.

---

## 12. Out of scope — reminder

No auth. No payments. No history. No companion memory. No Master character. No full corpus. If it is one of these, it is not M3.
