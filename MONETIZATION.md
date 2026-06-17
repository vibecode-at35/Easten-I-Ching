# MONETIZATION — Tiers, Pricing & Payments

How the product makes money, and the build implications. Market context in `docs/STRATEGY.md`; entitlement data in `docs/DATA_MODEL.md`.

---

## 1. The category's monetization pattern (match it)

Divination/astrology apps monetize overwhelmingly through **microtransactions + subscription upgrades** (~72% of paid interactions), with multi-tier offerings standard in leading apps. So: a generous free taste, a low-friction subscription, and a pay-per-use option for those who won't subscribe — and **price by geography**, since Vietnam's willingness-to-pay is lower than the West's while the diaspora can bear USD pricing.

---

## 2. Tiers

| Tier | What it includes | Notes |
|---|---|---|
| **Free** | A few full readings/month, the journal, ad-free | Enough to feel real value. Ad-free *always* — seriousness is the brand. |
| **Subscriber** (core) | Unlimited readings, full journal, deeper follow-up | The main recurring revenue. |
| **Premium "deep reading"** | Opus-tier interpretation, longer/deeper readings | Either a higher tier or via credits. |
| **Microtransaction credits** | Pay-per-deep-reading without subscribing | Matches local spend behavior; captures non-subscribers. |
| **(Phase 2) Business / B2B** | Decision-workshop framing, multi-system charts | Higher price point, separate motion. |

---

## 3. Geographic pricing

- **Vietnam:** keep it low — roughly **49,000–99,000 VND/month (~$2–4)** for the subscription, plus cheap credit packs. Don't anchor to Western $20/mo pricing; it won't convert locally.
- **Diaspora / international:** price in **USD higher** to capture greater willingness-to-pay (these users are also the most underserved in their own language).
- Detect by locale/region; keep it honest and non-manipulative (no fake discounts).

---

## 4. Payment rails (the build-critical part)

Two hard facts drive the architecture:

1. **Local rails dominate and are trusted in Vietnam:** **MoMo, ZaloPay, VNPay**, plus **PayOS** and bank QR (VietQR). Stripe/PayPal are limited for local Vietnamese businesses (currency/fees).
2. **App-store in-app purchase takes 15–30%** *and* forces their payment rails — you **cannot** use MoMo/ZaloPay directly for digital subscriptions inside a store-distributed app.

**→ Go web-first (PWA).** A web app lets you integrate local rails directly, avoid the 30% tax, and ship faster. Wrap for app stores later (Capacitor/Expo) once traction justifies it — and even then, route payments through web/links where store policy allows, accepting IAP only where required.

**Integration plan:**
- Local: **MoMo first** (broadest reach), then **ZaloPay** and **VNPay/PayOS**.
- International: **Stripe** for cards (diaspora/West).
- Each provider behind its own module (`/lib/payments/*`) with a shared `entitlements.ts` that's the single place deciding who can do what.

---

## 5. Entitlement logic

- `subscriptions` (`docs/DATA_MODEL.md`) holds `tier`, `status`, `provider`, `credits`, `current_period_end`.
- Gate checks live in one place (`entitlements.ts`): can this user start a reading? a deep reading? Is a credit consumed or a subscription active?
- Webhooks from each provider update entitlements; never trust the client for entitlement state.

---

## 6. What's gated vs free

| Capability | Free | Subscriber | Premium/credits |
|---|---|---|---|
| Standard readings | limited/month | unlimited | unlimited |
| Deep (Opus-tier) reading | — | included or credits | yes |
| Journal (view/save) | yes | yes | yes |
| Journal semantic search *(Phase 2)* | — | yes | yes |
| Ads | none, ever | none | none |

Keep gating generous enough that the product earns trust before it asks for money. No dark patterns (`AGENTS.md`).
