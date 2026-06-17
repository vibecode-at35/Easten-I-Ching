# ROADMAP — Milestones & Metrics

The build sequence and what to watch. Build **one milestone at a time** (`AGENTS.md`); each has its own task file in `docs/TASKS/` when active.

---

## Build sequence

| # | Milestone | Delivers | Depends on |
|---|---|---|---|
| **M1** | **Casting engine + corpus** | Correct, tested deterministic engine; 64-hexagram corpus seeded. *No UI, no AI.* | `ICHING_REFERENCE`, `DATA_MODEL` |
| **M2** | **Interpretation endpoint** | Claude wired with grounding + caching; readings that are specific to the question and feel genuinely good. **The real work — budget time here.** | M1, `INTERPRETATION_PROMPT` |
| **M3** | **Minimal UI** | Question framing → cast animation → reading view → journal. Web/PWA. | M2, `PRD` |
| **M4** | **Follow-up chat** | Grounded dialogue on a reading. | M3 |
| **M5** | **Auth + paywall + MoMo** | Accounts, free limits, one local payment rail → first revenue. | M4, `MONETIZATION` |
| **M6** | **i18n polish + 2nd rail + analytics** | vi/zh/en verified by native readers; ZaloPay/VNPay; PostHog funnels live. | M5 |
| **P2** | **Phase 2** | `pgvector` journal search, learning mode, BaZi/Tử Vi ecosystem, B2B, app-store wrap, yarrow method. | traction |

Sequencing principle: get **correctness** (M1) and **quality** (M2) right before spending on UI, and close the **revenue loop** (M5) before polishing. Don't reorder to do the fun parts first.

---

## Metrics to watch (instrument from M3)

- **Activation:** % of new users who complete their **first reading**. If this is low, the framing/casting/reading flow has friction.
- **Quality signal:** do users engage in **follow-up** and **return** to readings? (Proxy for "the readings are actually good.")
- **Week-4 retention:** the hard one for any divination app — easy to try once, easy to forget. The journal + memory + conversation loop is the retention bet; watch this obsessively.
- **Free → paid conversion**, and **VN vs diaspora** split (validates the geographic pricing).
- **Cost per reading** (should sit ~$0.02–0.05 with caching; alert if it drifts).

Retention, not acquisition, is the make-or-break number. Optimize the loop before pouring into growth.

---

## Don't build yet (deferred on purpose)

BaZi / Tử Vi / full charts · yarrow-stalk method + method selection · social/community · native app-store apps · B2B/team features · user-selectable commentary traditions in UI · semantic journal search / `pgvector`. Each is reasonable later; none belongs in the path to a working, monetizable core. Revisit only when the core loop retains users.

---

## The one-line reminder

Correct casting → genuinely good readings → a loop people come back to → then revenue → then growth. In that order.
