# TASK — Milestone 1: Casting Engine + Corpus

**This is the active task. Build only this. Then stop and report.** See `AGENTS.md` for the rules that govern how.

---

## Goal

A correct, tested, deterministic I Ching casting engine and the loaded 64-hexagram corpus. No UI, no AI, no accounts, no payments. Just the foundation everything else stands on — and the one part that, if wrong, silently corrupts every future reading.

---

## In scope

1. **Casting engine** (`/lib/iching/`), pure TypeScript, no I/O, no LLM:
   - 3-coin method producing line values 6/7/8/9 with the exact probabilities in `docs/ICHING_REFERENCE.md` §3.1 (6: 1/8, 7: 3/8, 8: 3/8, 9: 1/8).
   - Build the **primary hexagram** from 6 lines (bottom→top), encode to the 6-bit `value` (§1).
   - Identify the King Wen number via the lookup table (§6).
   - Detect **changing lines** (values 6 and 9) and compute the **resulting hexagram** (§4).
   - Return the full `cast_result` object shape from `docs/DATA_MODEL.md` §3 (include `method` and a `seed` for reproducibility).
2. **Trigram + King Wen modules** encoding `docs/ICHING_REFERENCE.md` §1, §2, §6 as data.
3. **Corpus loader**: `/data/hexagrams.seed.json` for all 64 hexagrams (number, binary, names in vi/zh/en, trigrams, judgment, image, 6 line texts, optional commentary — shape per `docs/DATA_MODEL.md` §1–2) and a script to seed Postgres.
4. **Tests** (see acceptance criteria).

## Out of scope (do NOT build)

- Any UI or animation
- Any LLM / interpretation call
- Auth, accounts, payments, entitlements
- Yarrow-stalk method (Phase 2)
- `pgvector` / journal search
- The actual database app wiring beyond the seed script

If you think something here is required but unscoped, **stop and ask** — don't expand silently.

---

## Acceptance criteria

- [ ] **Bijection test:** the 64 `value`s in the King Wen table are exactly the integers 0–63, each once.
- [ ] **Reference cases pass** (`docs/ICHING_REFERENCE.md` §7): all-yang → Hex 1 (value 63); all-yin → Hex 2 (value 0); lower Qián/upper Kūn → Hex 11 (value 7); lower Kūn/upper Qián → Hex 12 (value 56); lower Lí/upper Kǎn → Hex 63 (value 21); Hex 11 with old-yang at position 2 → primary 11, changing [2], resulting Hex 46.
- [ ] **Verification test (release blocker):** hexagram identification validated against an authoritative published King Wen source (§8). The table in the reference doc is a *draft* — this test is what makes it trustworthy. Do not consider Milestone 1 done without it.
- [ ] **Distribution test:** over many casts, single-line value frequencies approximate 1/8, 3/8, 3/8, 1/8 within tolerance.
- [ ] **Determinism test:** the same seed reproduces the same cast.
- [ ] **Corpus completeness:** all 64 hexagrams present in the seed; each has 6 line texts and names in vi/zh/en; seed matches the reference doc's numbers/trigrams.
- [ ] Strict TypeScript, no `any` without reason, engine modules have zero I/O.

---

## Suggested file structure

```
/lib/iching/
  trigrams.ts        # the 8 trigrams + values (§2)
  kingwen.ts         # value → King Wen number (§6) + helpers
  casting.ts         # 3-coin cast → cast_result (§3, §4)
  types.ts           # Line, LineType, HexagramCast, etc.
  casting.test.ts    # all acceptance tests above
/data/
  hexagrams.seed.json
/scripts/
  seed-hexagrams.ts  # load corpus into Postgres
```

## Definition of done

All acceptance tests pass (including the authoritative-source verification), code is typed and readable, no out-of-scope work, and you've reported what was built/tested. Corpus text sourcing note: use rights-clean public-domain translations (e.g. Legge) plus original house text — confirm licensing before importing anything modern (see `docs/INTERPRETATION_PROMPT.md` and `docs/STRATEGY.md` risks).

---

## Next milestone (preview only — do not start)

M2: the interpretation endpoint (`docs/INTERPRETATION_PROMPT.md`, `docs/ARCHITECTURE.md` §5). Wait for review of M1 first.
