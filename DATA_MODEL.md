# DATA_MODEL — Postgres Schema (build-ready)

The database stores the hexagram corpus (as data, never hardcoded in logic), users, subscriptions, and readings + dialogue. `pgvector` is reserved for Phase 2.

---

## 1. Tables

### `hexagrams` — the corpus (seeded once, rarely changes)
| Column | Type | Notes |
|---|---|---|
| `number` | `int` PK | King Wen number 1–64 |
| `binary` | `int` | 6-bit pattern (lookup key); see `docs/ICHING_REFERENCE.md` |
| `name_zh` | `text` | e.g. 乾 |
| `name_pinyin` | `text` | e.g. Qián |
| `name_vi` | `text` | Vietnamese name |
| `name_en` | `text` | English name |
| `upper_trigram` | `text` | trigram key (qian/kun/zhen/gen/kan/li/xun/dui) |
| `lower_trigram` | `text` | trigram key |
| `judgment` | `jsonb` | `{ vi, zh, en }` |
| `image` | `jsonb` | `{ vi, zh, en }` |
| `lines` | `jsonb` | array of 6, bottom-to-top (see §2) |
| `commentary` | `jsonb` | house interpretive notes, `{ vi, zh, en }`, optional per-tradition |

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `auth_id` | `text` | from auth provider |
| `email` | `text` | |
| `locale` | `text` | `vi` / `zh` / `en` |
| `created_at` | `timestamptz` | |

### `subscriptions` / entitlements
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `tier` | `text` | `free` / `subscriber` / `premium` |
| `status` | `text` | `active` / `canceled` / `past_due` |
| `provider` | `text` | `momo` / `zalopay` / `vnpay` / `payos` / `stripe` |
| `credits` | `int` | for microtransaction "deep reading" credits |
| `current_period_end` | `timestamptz` | |

### `readings`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` FK → users | |
| `question` | `text` | the user's framed situation |
| `locale` | `text` | language of the reading |
| `cast_result` | `jsonb` | full deterministic output (see §3) |
| `primary_hex` | `int` FK → hexagrams.number | |
| `changing_lines` | `int[]` | positions 1–6 |
| `resulting_hex` | `int` | nullable (only if changing lines) |
| `interpretation` | `text` | the streamed reading (final) |
| `created_at` | `timestamptz` | |

### `reading_messages` — the follow-up dialogue
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `reading_id` | `uuid` FK → readings | |
| `role` | `text` | `user` / `assistant` |
| `content` | `text` | |
| `created_at` | `timestamptz` | |

### `embeddings` — **Phase 2 only**
`pgvector` over readings / literature for semantic journal search and learning mode. Do not build in MVP.

---

## 2. `hexagrams.lines` JSON shape

Array of exactly 6 entries, index 0 = bottom line (position 1), index 5 = top line (position 6):

```json
[
  {
    "position": 1,
    "text": { "vi": "...", "zh": "...", "en": "..." },
    "commentary": { "vi": "...", "zh": "...", "en": "..." }
  }
]
```

---

## 3. `readings.cast_result` JSON shape

The full, auditable output of the deterministic engine (store it verbatim for debugging and reproducibility):

```json
{
  "lines": [
    { "position": 1, "value": 7, "type": "young_yang", "changing": false },
    { "position": 2, "value": 9, "type": "old_yang",   "changing": true  }
  ],
  "primaryHexagram": 11,
  "changingLinePositions": [2],
  "resultingHexagram": 46,
  "method": "three_coin",
  "seed": "..."
}
```

`value` ∈ {6,7,8,9}; `type` ∈ {old_yin, young_yang, young_yin, old_yang}; `changing` true for 6 and 9. See `docs/ICHING_REFERENCE.md`.

---

## 4. Indexes & integrity

- Index `readings (user_id, created_at desc)` for the journal.
- Index `reading_messages (reading_id, created_at)`.
- **Row-level isolation:** every read of `readings` / `reading_messages` is scoped to the owning `user_id`. No cross-user access, ever (see `AGENTS.md` privacy rule).
- `hexagrams` is reference data; seed from `/data/hexagrams.seed.json`, which itself must match `docs/ICHING_REFERENCE.md`.
