# PRD — MVP Product Requirements

Build-oriented requirements for the I Ching consultation MVP. For market/positioning rationale see `docs/STRATEGY.md`. For build rules see `AGENTS.md`.

---

## 1. The core loop (this is the entire MVP)

```
Ask a real question  →  Cast (deterministic)  →  Receive interpretation  →  Converse  →  Save to journal
```

Everything in the MVP exists to make this loop feel genuinely good. If the readings aren't good, nothing else matters — over-invest in interpretation quality.

---

## 2. User stories

- *As a reflective decider,* I can enter a real situation I'm facing and receive a reading that speaks to **my** situation, not a generic hexagram description.
- *As a user,* I can ask follow-up questions about my reading and get answers grounded in the same hexagram, holding context.
- *As a returning user,* I can see my past readings, what I asked, and how I reflected — value that compounds over time.
- *As a Vietnamese (or Chinese / English) speaker,* I get depth and nuance in my own language.
- *As a believer or a skeptic,* I'm treated as an intelligent adult — no fortune-cookie tone, no ads, no manipulation.

---

## 3. Screens / flows

### 3.1 Question framing
- Free-text input for the user's question or situation.
- Gentle coaching toward a *situation/decision* framing rather than a yes/no question (I Ching readings are richer this way). E.g. helper text and an optional example.
- Language selector (vi / zh / en), defaulting to locale.

### 3.2 Casting
- A tactile, unhurried **3-coin cast** animation, six throws, bottom-to-top.
- Casting result is produced by the **deterministic engine** (see `docs/ICHING_REFERENCE.md`), not the animation and not the model.
- Display the resulting **primary hexagram**, any **changing lines**, and the **resulting hexagram** clearly (name + glyph in the user's language + Chinese).

### 3.3 Reading
- The personalized interpretation, streamed in.
- Structure (guidance, not rigid): the situation read through the primary hexagram; what the changing line(s) mean for *this* question; where the movement toward the resulting hexagram points.
- Always the user's language, always the house voice (`docs/INTERPRETATION_PROMPT.md`).

### 3.4 Follow-up conversation
- The user can ask follow-ups on the reading.
- Answers stay **anchored to the same verified texts** + conversation history — not generic chatbot drift.

### 3.5 Journal
- Chronological list of past readings: date, question, hexagrams, and the dialogue.
- Open any past reading to re-read. (Semantic search across the journal is **Phase 2**.)

### 3.6 Accounts & paywall
- Low-friction auth (email + social).
- Free tier limits; subscription / microtransaction upgrade flow (see `docs/MONETIZATION.md`).
- Ad-free always, including free tier.

---

## 4. Scope

### In scope (MVP)
- Question framing + coaching
- Deterministic casting (3-coin) → primary + changing lines + resulting hexagram
- AI interpretation grounded in verified texts, specific to the question
- Follow-up conversation on a reading
- Personal reading journal (history; search is Phase 2)
- Multilingual output: Vietnamese + Chinese + English
- Auth + freemium gating + payments (local + international)
- Clean, serious, ad-free design

### Explicitly out of scope (resist until later)
- BaZi / Tử Vi / full chart systems → Phase 2 ecosystem play
- Yarrow-stalk method + method selection (different probabilities; add after core works)
- Social / community features
- Native app-store apps (wrap with Capacitor/Expo later)
- B2B / team features
- User-selectable commentary traditions in the UI (curate one strong house voice first)
- Semantic journal search / `pgvector` (Phase 2)

---

## 5. Acceptance criteria (per feature)

| Feature | Done when |
|---|---|
| Casting engine | Produces a valid hexagram; identification validated by tests against the King Wen table; changing lines & resulting hexagram correct; 3-coin distribution sane (6:1/8, 7:3/8, 8:3/8, 9:1/8). |
| Interpretation | Reading is specific to the entered question; grounded only in fetched texts; in the selected language; consistent house voice; no invented hexagram content. |
| Follow-up chat | Stays anchored to the same reading's texts + history; does not drift to generic answers. |
| Journal | Readings persist per user; list + open works; isolated per user (no cross-user leakage). |
| Auth + paywall | Free limits enforced; upgrade unlocks correctly; entitlements correct after payment; no dark patterns. |
| i18n | All user-facing strings localizable; vi/zh/en output verified by a native reader. |

---

## 6. Non-functional requirements

- **Quality bar:** interpretation quality is the product. Plan to hand-evaluate hundreds of readings before launch.
- **Privacy:** questions and journals are sensitive; minimal logging, scoped access, no cross-user exposure.
- **Responsibility:** reflective tone, never deterministic prophecy; defer to qualified help on serious matters.
- **Performance:** readings stream for responsiveness; casting is instant (it's local math).
- **Cost:** use prompt caching on static context; reserve Opus-tier for a premium "deep reading" only.
