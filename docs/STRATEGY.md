# 易經 Consultation Platform — Market Research, Tech Stack & MVP Spec

*A strategic build document. Prepared June 2026.*

---

## 0. Executive thesis

The market for digital divination is large, growing ~20% annually, and overwhelmingly AI-driven in its next phase — but the I Ching specifically is served by apps stuck in one of two old molds: **reference tools** (scholarship, translations, hexagram libraries) and **casting tools** (you ask, you cast, you read, you're on your own). Almost none bridge the gap into *contextual, conversational interpretation* of a specific question. That gap is your opening.

The core product is an **AI consultation that takes a real question, casts a real hexagram deterministically, and returns a personalized interpretation** that holds a conversation, remembers your history, and treats you as an intelligent adult rather than a fortune-cookie recipient.

One architectural fact drives the entire build: the I Ching is a **closed, finite corpus** — 64 hexagrams, 384 line texts, a handful of commentary traditions. You do *not* need the heavy "AI + vector database + RAG pipeline" stack most people reach for. The whole knowledge base fits in a model's context window, the casting is pure math, and prompt caching makes the unit economics almost trivial. This is a meaningful competitive and cost advantage if you build it right.

**Recommended beachhead:** Vietnam + Vietnamese/Chinese diaspora, because (a) belief is culturally deep and mainstream, (b) the language layer (Vietnamese + Chinese) is underserved by Western apps, and (c) you understand the market natively.

---

## 1. Market research

### 1.1 Market size — and an honest caveat

Published "astrology app market" figures vary *wildly* depending on how analysts draw the boundary — anywhere from ~$194M to ~$16B for 2026. That spread tells you the analysts disagree on definitions more than on direction, so treat any single headline number with suspicion. What's consistent and trustworthy is the **shape**:

| Signal | Finding | Source |
|---|---|---|
| Growth rate | ~20% CAGR sustained through 2030 | The Business Research Company; MarkNtel; Research & Markets |
| Primary growth driver (forecast period) | **AI-based prediction & personalized interpretation** | The Business Research Company |
| Geographic download leader | **Asia-Pacific (~40–50% of downloads)**, driven by Android | Market Growth Reports |
| Revenue leader | North America / US (subscription spend) | Sensor Tower via multiple |
| Monetization pattern | **~72% of paid interactions are microtransactions + subscription upgrades**; multi-tier monetization in ~65% of leading apps | Market Growth Reports |
| Retention lever | AI personalization improved retention **10–18%** | Market Growth Reports |

Two numbers worth internalizing: the **engagement** is in Asia, the **money** is in the West. That argues for a Vietnam-beachhead, global-monetization strategy — build where the cultural depth and your home advantage are, price-discriminate to capture Western willingness-to-pay later.

Benchmark to anchor against: **Co-Star** reached 20M+ downloads and roughly **$400K/month** revenue at its peak, reaching ~25% of US women 18–25. That's a Western, Western-astrology product. Nobody has built the equivalent for the East Asian metaphysical tradition with modern AI and modern design. That's the whitespace.

### 1.2 The competitive landscape — and the actual gap

The existing I Ching apps fall cleanly into two buckets, and almost none bridge them:

**Reference apps** (e.g. *Yi Jing*, *I Ching: Book of Changes*, *App of Changes*) — high scholarship, beautiful translations, hexagram libraries. Built for *studying* the I Ching. Excellent at what they do.

**Casting apps** (e.g. *Visionary I Ching*) — you enter a topic, cast coins, read an illustrated interpretation, save to a journal. One-time unlock model ("a couple of cappuccinos"). Built for a *quick consult*.

The structural problem, as one 2026 comparison guide put it bluntly: you ask, you cast, you read — *the rest is up to you. And that's why most people end up overthinking.* The apps hand you raw text and abandon you. Bridging "helpful for studying" and "helpful for making this specific decision right now" is the unmet need.

**Early AI entrants exist but are shallow** — there are AI hexagram-reading websites and multi-agent "fortune teller" platforms (e.g. Jenova's specialist agents, an *I Ching Oracle* with multiple commentary traditions). And note one direct competitor worth studying: a freemium **I Ching + BaZi** app (贞元易 / "I Ching Divination") that combines daily I Ching guidance with Four Pillars charts and leans hard on *education* ("open methodology," explained calculations). They've validated the freemium + education angle. Nobody has yet nailed **deep conversational interpretation with memory, in Vietnamese + Chinese, with serious design.**

### 1.3 Why Vietnam is the right beachhead

Belief here is not niche or fringe — it's mainstream and cross-class. Vietnamese culture broadly consults astrology, phong thủy (風水), and tử vi (紫微斗數) for auspicious dates, business openings, weddings, naming, and home construction, *regardless of professed religion or education level*. The Five Elements (Ngũ Hành) framework underpins astrology, feng shui, medicine, and naming. This is a population that already pays — in time, ritual, and money — for metaphysical guidance.

Crucially for you: **the quality content gap.** Most serious I Ching material online is in English or Classical Chinese. Deep, well-designed Vietnamese-language interpretation is thin. You can own that.

### 1.4 Target segments (ranked)

1. **The reflective decider** — educated 25–45, uses the I Ching (or wants to) for real decisions: career moves, relationships, business timing. Wants depth and dialogue, hates fortune-cookie apps. *Highest LTV, your core.*
2. **The diaspora seeker** — Vietnamese/Chinese abroad, culturally connected, higher USD willingness-to-pay, underserved in their own language. *Best monetization.*
3. **The practitioner / learner** — wants to genuinely learn to read the I Ching. Drives retention and community, slower to monetize.
4. **(Later) The business user** — executives and consultants using 易經 as a structured decision-reflection framework. Higher price point, B2B motion. *Phase 2+.*

### 1.5 Positioning

Not "fortune telling." Position as a **structured reflective practice for navigating change and decisions** — respectable enough that a serious professional uses it without embarrassment, deep enough that a believer trusts it. The 易經 is literally the *Book of Changes*; lean into change/decision-making, not prophecy.

---

## 2. Tech stack research & recommendations

### 2.1 The insight that simplifies everything: a bounded corpus

Most "AI app" builds assume you need retrieval-augmented generation (RAG) over a large, open knowledge base — vector database, embeddings, chunking, the works. **The I Ching does not require this**, and recognizing that saves you enormous complexity and cost:

- There are exactly **64 hexagrams**.
- Each has a Judgment (彖), an Image (象), and **6 line texts** → **384 line statements** total.
- Add 2–5 commentary traditions per hexagram (e.g. Wilhelm, Legge, a Vietnamese scholarly source, your own house voice) and the *entire* knowledge base is on the order of **a few hundred thousand tokens** — small enough to live in a structured database and be pulled by exact lookup, with only the relevant slice sent to the model per reading.

The consequence: **the casting and hexagram identification are pure deterministic code; the model only does interpretation.** This is also a *correctness* requirement — LLMs are unreliable at precise symbolic computation (coin probabilities, King Wen lookup, changing-line logic) and will hallucinate. Never let the model compute the hexagram. Compute it in code, then hand the model the exact, verified texts.

Vector search re-enters the picture only for **Phase 2** features — semantic search across a user's own reading journal ("what did the oracle say about my career?"), or a learning/Q&A mode over broader I Ching literature. Use `pgvector` (a Postgres extension) for that when the time comes; you won't need a dedicated vector DB at this scale.

### 2.2 Model choice

For the interpretation layer, the relevant strengths in mid-2026:

| Model family | Strength relevant here | Note |
|---|---|---|
| **Claude (Sonnet 4.6 / Opus 4.8)** | Best-in-class for **high-nuance, brand-sensitive, literary** generation and cultural resonance; consistently top tier for tone | Recommended **default** for the reading itself |
| **Qwen3 / Qwen-MT (Alibaba)** | Strongest on **Asian languages** — handles Classical Chinese idiom and structure natively where Western-trained models strain | Strong option for Chinese-heavy processing or cost-sensitive paths |
| **Gemini 3.x (Flash / Pro)** | Long context, multimodal, **cost-efficient Flash tier** | Good for high-volume/background tasks |
| **DeepSeek V4** | Cheapest high-volume bulk | Lower-stakes batch work |

**Recommendation:** Use **Claude Sonnet 4.6** as the interpretation engine for the MVP — it's the best price-to-quality balance for exactly this kind of tone-sensitive, culturally-loaded writing, supports a 1M-token context window at standard pricing, and supports prompt caching. Reserve **Opus 4.8** for a premium "deep reading" tier if you want a quality step-up. Keep **Qwen** in your back pocket for Chinese-language depth and as a cost hedge. Architect the model call behind an interface so you can route or swap per-tier without rewriting.

### 2.3 Cost model (this is the good news)

Current Anthropic API pricing (verified against official pricing docs, June 2026), per million tokens (MTok):

| Model | Input | Output |
|---|---|---|
| Claude Haiku 4.5 | $1 | $5 |
| **Claude Sonnet 4.6** | **$3** | **$15** |
| Claude Opus 4.8 | $5 | $25 |

Two levers make this cheap for *this* product specifically:
- **Prompt caching** cuts cached input cost by **~90%**. Your system prompt, interpretation scaffold, and reused hexagram texts are largely static — perfect cache candidates.
- **Batch API** is **50%** off for anything non-realtime (e.g. pre-generating daily hexagrams).

Rough per-reading economics on Sonnet 4.6, sending only the relevant hexagram's data (~5–8K input tokens) and producing a rich ~1–1.5K-token reading:

| Item | Tokens | Cost |
|---|---|---|
| Input (uncached) | ~8K | ~$0.024 |
| Output | ~1.5K | ~$0.023 |
| **Per reading (pre-caching)** | | **~$0.05** |
| **Per reading (with caching on static context)** | | **~$0.02–0.03** |

At **10,000 readings/month** that's roughly **$200–500** in model cost. Against even a $2–4/month subscription or per-reading microtransactions, the margin is very healthy. Model cost is *not* your constraint — distribution and retention are.

### 2.4 Payments — the Vietnam-specific reality (read this carefully)

This is where naive builds get hurt. Two facts:

1. **Stripe/PayPal are limited for local Vietnamese businesses** (currency/fee constraints). Local rails dominate: **MoMo, ZaloPay, VNPay**, plus **PayOS** and bank QR (VietQR). Vietnam's mobile-payments market is ~$40.5B (2026); ~50M+ active e-wallets. Vietnamese users *trust and complete* checkout with familiar local methods.
2. **App-store in-app purchase (Apple/Google) takes 15–30%** *and* forces you onto their payment rails, where you **cannot** use MoMo/ZaloPay directly for digital subscriptions.

**Implication for the build:** go **web-first** (responsive PWA). A web app lets you integrate local Vietnamese payment gateways directly, avoid the 30% app-store tax, and ship faster. Wrap it for the app stores *later* (Capacitor or an Expo build) once you have traction — and even then, route Vietnamese payments through web/links where store policy allows, and accept IAP only where required. This single decision materially changes your margins and your speed.

### 2.5 Recommended stack (MVP)

| Layer | Choice | Why |
|---|---|---|
| **Frontend** | **Next.js** (React) as a responsive **PWA** | Fast to build with AI coding tools; one codebase serves web + installable mobile; sidesteps app-store payment tax |
| **Styling** | Tailwind + a small custom design system | Seriousness and restraint are a *feature* here — no ad-cluttered fortune-cookie look |
| **Backend / API** | Next.js API routes or a thin **Node/TypeScript** service | Keep it monolithic and simple for MVP |
| **Casting engine** | **Pure TypeScript module** (deterministic) | Correctness-critical; never an LLM |
| **Database** | **Postgres** (Supabase or Neon) | Stores hexagram corpus (JSON), users, readings; `pgvector` available for Phase 2 |
| **Auth** | Supabase Auth / Auth.js | Email + social; low friction |
| **LLM** | **Claude Sonnet 4.6** via Anthropic API, behind a model-router interface | Best tone/nuance; caching + batch for cost |
| **Payments** | **MoMo + ZaloPay + VNPay/PayOS** (local), Stripe for international cards | Local trust + diaspora USD |
| **Hosting** | Vercel (frontend) + managed Postgres | Minimal ops for a small team |
| **Analytics** | PostHog (events + funnels) | Watch activation & retention from day one |

You can build essentially all of this with an agent-first IDE — and per our earlier discussion, **start in the Antigravity IDE** (hands-on, you shape the interpretation logic and prompts directly) rather than fully delegating to Antigravity 2.0. The prompt design and cultural accuracy are the heart of the product; you want to be *in* that code.

---

## 3. Product spec — the MVP

### 3.1 The one core loop (build this, nothing else, first)

```
Ask a real question  →  Cast (deterministic)  →  Receive interpretation  →  Converse  →  Save to journal
```

1. **Ask.** User types a genuine question or decision they're facing (the product coaches them to frame it as a situation, not a yes/no — this matters for I Ching quality).
2. **Cast.** A tactile digital coin-cast (3-coin method) animates and produces 6 lines *in code*. The engine identifies the **primary hexagram**, any **changing lines**, and the **resulting hexagram**.
3. **Interpret.** The system pulls the exact texts for that hexagram + changing lines from the database and sends them, plus the user's question and context, to Claude. It returns a **personalized, situation-specific reading** — not a generic hexagram dump — in the user's language (Vietnamese / Chinese / English).
4. **Converse.** The user can ask follow-ups ("what does the changing line in position 3 mean for the timing?") and the model answers *grounded in the same verified texts*, holding context.
5. **Save.** The reading is stored in a personal journal with the question, date, hexagrams, and the dialogue.

### 3.2 Feature scope

**In scope (MVP):**
- Question framing + casting (3-coin method, animated)
- Deterministic hexagram + changing-line + resulting-hexagram computation
- AI interpretation grounded in verified texts, situation-aware
- Follow-up conversation on a reading
- Personal reading journal (history, searchable later)
- Multilingual output: **Vietnamese + Chinese + English**
- Accounts + low-friction auth
- Freemium gating + payments (local + international)
- Clean, serious, ad-free design

**Explicitly out of scope (resist these until later):**
- BaZi / Tử Vi / full chart systems (Phase 2 ecosystem play)
- Yarrow-stalk method and method-choice (add once core works; note its probabilities differ from coins — purists will eventually want it)
- Social/community features
- Native app-store apps (wrap later)
- B2B/team features
- User-selectable commentary traditions in the UI (curate one strong house voice first)

### 3.3 Monetization

The research is clear that this category monetizes through **microtransactions + subscription upgrades** (~72% of paid interactions), with multi-tier being standard. Match that, and price-discriminate by geography:

- **Free tier:** a limited number of full readings (e.g. a few per month), basic interpretation, journal. Enough to feel the value; ad-free always.
- **Subscription (core):** unlimited readings, deeper interpretation (Opus-tier "deep reading"), full journal search, follow-up depth. Price **low for Vietnam** (~49K–99K VND/mo ≈ $2–4) and **higher in USD** for diaspora/Western users.
- **Microtransaction option:** pay-per-"deep reading" credits for users who won't subscribe — matches local spending behavior.
- **(Phase 2) Premium / B2B:** decision-workshop framing, multi-system charts, higher price point.

Avoid the Co-Star $20/mo anchor for the Vietnam market — willingness-to-pay is lower locally; capture the higher USD price abroad instead.

### 3.4 The product's "do-not-violate" principles (your differentiation)

These are *why* you win, and every PR/design decision should be checked against them:

1. **The model never computes the hexagram.** Casting is deterministic code. Always.
2. **Interpret the *question*, not just the hexagram.** Generic hexagram text is free everywhere; situation-specific reading is the product.
3. **Hold a conversation.** The reading is a starting point for dialogue, not a dead-end wall of text. This directly solves the "you're on your own → overthinking" failure of every existing app.
4. **Memory compounds value.** Users who log readings over months get something no first-time-open app can offer.
5. **Treat users as intelligent adults.** No manipulative dark patterns, no fear-based upsells, no ads. Seriousness is the brand.
6. **Cultural and textual accuracy is sacred.** Ground every reading in real, sourced texts. Never let the model invent hexagram content.
7. **Language depth is a moat.** Vietnamese-first quality that Western apps can't match.

---

## 4. Technical architecture (MVP)

### 4.1 System diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js PWA)                          │
│  Question framing UI · Coin-cast animation · Reading view · Journal   │
│  Follow-up chat · Auth · Paywall · i18n (vi / zh / en)                │
└───────────────┬──────────────────────────────────────────────────────┘
                │ HTTPS (JSON)
┌───────────────▼──────────────────────────────────────────────────────┐
│                      API LAYER (Next.js routes / Node)                │
│                                                                       │
│   /cast ─────────────► ┌─────────────────────────────┐               │
│                        │   CASTING ENGINE (pure TS)   │  NO LLM       │
│                        │  • 3-coin RNG → 6 lines      │               │
│                        │  • old/young yin/yang (6/7/8/9)│              │
│                        │  • King Wen lookup → hex #     │              │
│                        │  • changing lines → resulting #│              │
│                        └──────────────┬──────────────┘               │
│                                       │ verified hexagram object       │
│   /interpret ────────► ┌──────────────▼──────────────┐               │
│                        │   INTERPRETATION SERVICE     │               │
│                        │  1. fetch exact texts (DB)   │               │
│                        │  2. build prompt (cached      │◄──────┐      │
│                        │     system + scaffold)        │       │      │
│                        │  3. call Claude Sonnet 4.6    │───────┼────► Anthropic API
│                        │  4. stream reading to client  │       │      (prompt caching,
│                        └──────────────┬──────────────┘        │       Sonnet 4.6 /
│                                       │                        │       Opus 4.8 premium)
│   /chat (follow-ups) ──────────────────┘  (same grounded texts │
│                                            + convo history)     │
│   /payments/* ──────► MoMo · ZaloPay · VNPay/PayOS · Stripe ────┘      │
└───────────────┬──────────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────────┐
│                         POSTGRES (Supabase/Neon)                      │
│  hexagrams (64, JSON: judgment/image/lines/commentary)                │
│  users · subscriptions · readings (Q, hexagrams, dialogue)            │
│  [Phase 2] pgvector embeddings for journal/literature search          │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 The casting engine (correctness-critical, deterministic)

This is the part most builds get subtly wrong by handing it to an LLM. The logic:

- **3-coin method:** three coins, each tails=2 / heads=3. Sum each line:
  - **6** = old yin (changing, → becomes yang) — probability 1/8
  - **7** = young yang (stable) — 3/8
  - **8** = young yin (stable) — 3/8
  - **9** = old yang (changing, → becomes yin) — 1/8
- Generate **6 lines bottom-to-top**. This gives the **primary hexagram**.
- A hexagram = lower trigram + upper trigram (3 lines each, 8 trigrams / bagua). Map the line pattern to a **King Wen number (1–64) via a lookup table** — the King Wen sequence is *not* a simple binary count, so a table is mandatory.
- **Changing lines** (any 6s or 9s) are interpreted individually and flipped to compute the **resulting/transformed hexagram**.
- Output a verified object: `{ primaryHexagram, changingLinePositions[], resultingHexagram, lines[] }`.

Use a seeded, auditable RNG so casts are reproducible for debugging, and store the cast result with each reading. *(Note for v2: the yarrow-stalk method has different probabilities — 6=1/16, 7=5/16, 8=7/16, 9=3/16 — so it's a distinct mode, not a cosmetic toggle. Purists will ask for it.)*

### 4.3 The interpretation pipeline

1. **Retrieve, don't generate, the source.** Pull the exact Judgment, Image, the *specific* changing-line texts, and the resulting hexagram's judgment from Postgres. The model receives verified text, never invents it.
2. **Prompt structure for caching.** Split the prompt so the **static** parts (system instructions, house interpretive voice, formatting rules) are cached (~90% input savings), and only the **dynamic** parts (this hexagram's texts, the user's question and context) vary.
3. **Situation-aware instruction.** The system prompt's job is to make the model interpret *this question* through the hexagram — synthesizing primary hexagram, changing lines, and the movement toward the resulting hexagram into guidance, in the user's language and a consistent voice.
4. **Stream** the reading to the client for responsiveness.
5. **Follow-ups** reuse the same grounded texts plus conversation history, so the dialogue stays anchored to the actual reading rather than drifting into generic chatbot territory.

### 4.4 Data model (sketch)

| Table | Key fields |
|---|---|
| `hexagrams` | `number` (1–64), `name_zh`, `name_vi`, `name_en`, `judgment`, `image`, `lines` (JSON: 6 entries, each with line text + per-tradition commentary), `trigrams` |
| `users` | `id`, `auth`, `locale`, `created_at`, plan/entitlement |
| `subscriptions` | `user_id`, `tier`, `status`, `provider` (momo/zalopay/vnpay/stripe), period |
| `readings` | `id`, `user_id`, `question`, `cast_result` (JSON), `primary_hex`, `changing_lines`, `resulting_hex`, `interpretation`, `created_at` |
| `reading_messages` | `reading_id`, `role`, `content`, `created_at` (the follow-up dialogue) |
| *(Phase 2)* `embeddings` | `pgvector` over readings / literature for semantic journal search |

### 4.5 Build sequence (suggested milestones)

1. **Casting engine + corpus** — get the deterministic engine correct and load all 64 hexagrams with at least one strong commentary voice (in Vietnamese first). *No UI, just correctness — write tests against known casts.*
2. **Interpretation endpoint** — wire Claude with the grounding + caching prompt; tune the house voice until readings feel genuinely good (this is the real work; budget time here).
3. **Minimal UI** — question framing, cast animation, reading view, journal. Web/PWA.
4. **Follow-up chat** — grounded dialogue on a reading.
5. **Auth + paywall + one payment rail** (MoMo first) — close the loop to revenue.
6. **i18n polish + second payment rail + analytics** — measure activation and week-4 retention.
7. *(Only now)* consider app-store wrapping, additional methods, or Phase 2 ecosystem features.

---

## 5. Key risks & open questions

- **Interpretation quality is the entire product.** If the readings feel generic, nothing else matters. This is where to over-invest, and where your cultural/linguistic edge has to show. Plan to hand-evaluate hundreds of readings.
- **Sourcing the corpus** — you need rights-clean, high-quality hexagram texts and commentary, ideally with a strong original Vietnamese voice. Public-domain translations (e.g. Legge) plus your own house interpretation is the safe path; vet licensing on anything modern.
- **Retention, not acquisition, is the hard part** — a divination app is easy to try once and forget. The journal + memory + conversation loop is your retention bet; instrument it and watch week-4 numbers obsessively.
- **Cultural sensitivity & responsibility** — people may bring real, weighty life decisions. The product should guide reflection, never pose as deterministic prophecy or substitute for professional help on serious matters (health, legal, financial). Bake that posture into the voice.
- **Willingness-to-pay in Vietnam is lower than the West** — hence the geographic price-discrimination and microtransaction options. Validate pricing early with real users.
- **Payment/store policy friction** — keep the web-first lever to protect margins; revisit only when traction justifies app-store presence.

---

### Sources
Market and competitive data drawn from: The Business Research Company; Research and Markets; MarkNtel Advisors; 360iResearch; Market Growth Reports; Business Research Insights; Sensor Tower (via secondary); Astrologica market-statistics compilation; Shadow OS and Jenova I-Ching app comparisons; Apple App Store / Google Play listings. Vietnam market/cultural context: Facts and Details; Vietnam Airlines cultural guide; multiple Vietnamese zodiac/feng-shui sources. Payments: SBS Software; WooshPay; NOWPayments; Visa Vietnam. Model landscape: Lokalise; Vozo; Hakuna Matata Tech; arXiv cultural-nuance MT benchmark. Anthropic API pricing verified against official Anthropic pricing documentation (June 2026). Figures vary by source and methodology and should be re-verified before any financial planning.
