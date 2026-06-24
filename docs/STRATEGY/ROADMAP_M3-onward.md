# Roadmap — M3 onward

*Captured at a clean checkpoint. The core (M1 casting + M2 interpretation) is built, hardened against both fabrication failure modes, and committed. This file holds the scoping decisions for what comes next, so next session starts from a clear plan, not a blank page.*

---

## The product arc (sequenced deliberately)

**M3 — The reading experience** *(next)*
Ask → tactile ceremonial cast → streamed reading on the warm-traditional hexagram screen. The foundation everything else stands on. Fully testable on its own.

**M4 — Persistence + history**
Readings saved and revisitable. This is where the accounts / identity / storage question gets resolved properly — because the companion vision (below) gives a real reason for durable, identity-linked storage. Device-local storage is the fallback, but it breaks the companion illusion across devices, so this needs a real decision.

**M5 — The companion / memory layer** *(the differentiator)*
New readings draw on the person's past readings, recurring questions, and patterns to feel continuous — "you asked about this same tension a month ago." This is the north star: a personal companion that remembers you, not a stateless oracle.
- **Design tension to resolve:** memory feeds extra context to the model, which collides with the grounding discipline built in M2 (the anti-fabrication work). Must be designed so "memory" never becomes a vector for the model to invent things the person didn't say. Deserves its own careful design pass.

**Alongside, whenever:**
- The **Upāya voice refinement** (offer the image + tension, don't append the moral) — see `VOICE_AND_CHARACTER.md`.
- The **Master character** designed on paper (`docs/CHARACTER.md`) — see `VOICE_AND_CHARACTER.md`.

---

## Key insight that shaped this

The goal isn't a "history feature" — it's **memory**. History is just its visible surface.
- **History** = a passive list of past readings. A logbook.
- **Memory / companion** = the system *uses* the past to make each new reading feel continuous. Relational.

The companion feeling is the product's real differentiator vs. "a chatbot with a hexagram." But it sits *on top of* a working reading experience — you can't build a companion's memory until there's something to remember. Hence: reading experience first (M3), then persistence (M4), then memory (M5).

The companion feeling also comes partly from the *texture* of M3 itself — the warmth, the ceremony, the Upāya voice. Memory deepens companionship; it doesn't create it from nothing.

---

## M3 scope (decided)

**Aesthetic: warm-traditional.** Rice-paper / cream surfaces, sepia-ink text, cinnabar seal (印章) as the signature accent, brush-weighted hexagram lines, classical serif type. Natural dark variant later = "warm paper by day, ink by night" (keeps the candlelit feel from the dark option).

**Casting moment: tactile & ceremonial.** Animated coins, lines forming bottom-to-top, a sense of ritual. This is the emotional heart — must feel ceremonial, not gimmicky.

**Platform: web-first** (Next.js PWA) — already locked (avoids app-store tax, enables local VN payment rails later).

**Core loop (M3 only):** ask a question → tactile cast → streamed reading on the warm hexagram screen.

**Reading screen:** reading **streams in** (oracle feels like it's *speaking*; streaming infra already exists). Hexagram shown **visually** (six-line glyph, changing lines marked) alongside the prose. Uses the existing `/api/interpret`.

**Explicit non-goals for M3** (these are M4/M5):
- No auth
- No payments
- No history / saved readings
- No companion memory
- No Master character

**Companion-ready note:** build M3's reading and data structures so M4 (persistence) and M5 (memory) can hook in later without a rewrite. Design *for* the north star even while not building it.

---

## Immediate next step (next session)

Write `docs/TASKS/milestone-3-reading-experience.md` — the M3 task spec, the same way M1 and M2 had task files before any code. It should lock:
- The core loop and screens (question entry → casting ceremony → reading)
- The warm-traditional design tokens (exact reds, paper tones, type, seal + brush-line behavior; note the day/night variant)
- The casting ceremony interaction and pacing
- The reading screen (streamed text + hexagram glyph with changing lines)
- The explicit non-goals above
- The companion-ready structural note

Then — and only then — hand it to the agent and build. M3 is the biggest construction task yet (first visual, interactive, taste-driven milestone); expect real sessions.

---

## Loose ends to verify when fresh
- **API key rotation** — confirm the exposed key was revoked and a fresh one is in `.env.local` (the one real security item).
- **Hexagram 2 (Kūn) loader check** — the demo corpus was extended; confirm Kūn reads non-null in the repo.
- **Kūn voice read (optional)** — three Kūn readings were generated; the full text was never read for quality. Run 2 reportedly ended with a directive ("say something") — worth reading if/when revisiting the Upāya refinement.
