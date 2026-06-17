# ICHING_REFERENCE — Domain Truth (correctness-critical)

This is the source of truth for casting and hexagram identification. The casting engine implements exactly this. **The model never computes any of this** (`AGENTS.md`, golden rule #1).

> ⚠️ **VERIFICATION REQUIRED.** The King Wen table in §6 was derived systematically (trigram pairs → 6-bit pattern → number) and forms a clean bijection across all 64 patterns, but reproducing 64 attributions without a transposition error is exactly where mistakes hide. **Before the engine ships, add a unit test that validates every hexagram identification against an authoritative published source** (see §8). Do not rely on this table alone in production.

---

## 1. Line encoding

A line is **yang (solid, ⚊) = 1** or **yin (broken, ⚋) = 0**. Lines are generated and numbered **bottom to top**: position 1 = bottom, position 6 = top.

A hexagram is encoded as a **6-bit integer**, bottom line = least significant bit:

```
value = L1·1 + L2·2 + L3·4 + L4·8 + L5·16 + L6·32       (Ln ∈ {0,1})
```

- **Lower trigram** = lines 1–3 (bits 0–2). **Upper trigram** = lines 4–6 (bits 3–5).
- Therefore: `hexagramValue = lowerTrigramValue + upperTrigramValue · 8`.
- Check: all-yang = 63, all-yin = 0.

This `value` (0–63) is the lookup key into the King Wen table.

---

## 2. The eight trigrams (bagua)

Trigram value uses the same bottom-LSB scheme (3 bits):

| Trigram | Chinese | Lines (bottom→top) | Value | Element |
|---|---|---|---|---|
| Qián | 乾 | ⚊⚊⚊ (1,1,1) | 7 | Heaven |
| Duì | 兌 | ⚊⚊⚋ (1,1,0) | 3 | Lake |
| Lí | 離 | ⚊⚋⚊ (1,0,1) | 5 | Fire |
| Zhèn | 震 | ⚊⚋⚋ (1,0,0) | 1 | Thunder |
| Xùn | 巽 | ⚋⚊⚊ (0,1,1) | 6 | Wind |
| Kǎn | 坎 | ⚋⚊⚋ (0,1,0) | 2 | Water |
| Gèn | 艮 | ⚋⚋⚊ (0,0,1) | 4 | Mountain |
| Kūn | 坤 | ⚋⚋⚋ (0,0,0) | 0 | Earth |

---

## 3. Casting methods & line values

Each of the 6 lines resolves to a value 6/7/8/9 with a type:

| Value | Type | Yin/Yang now | Changing? | Becomes |
|---|---|---|---|---|
| 6 | old yin | yin (⚋) | **yes** | yang (⚊) |
| 7 | young yang | yang (⚊) | no | — |
| 8 | young yin | yin (⚋) | no | — |
| 9 | old yang | yang (⚊) | **yes** | yin (⚋) |

### 3.1 Three-coin method (MVP)
Three coins per line; each coin tails = 2, heads = 3; sum the three:

| Sum | Value | Probability |
|---|---|---|
| 6 (T,T,T) | old yin | 1/8 |
| 7 (one H) | young yang | 3/8 |
| 8 (two H) | young yin | 3/8 |
| 9 (H,H,H) | old yang | 1/8 |

The engine may generate the value directly from this distribution; just preserve these exact probabilities.

### 3.2 Yarrow-stalk method (Phase 2 — different probabilities)
Traditional yarrow probabilities are **asymmetric** (this is *why* purists prefer it — changing yin and changing yang are not equally likely, unlike coins):

| Value | Type | Probability |
|---|---|---|
| 6 | old yin | 1/16 |
| 7 | young yang | 5/16 |
| 8 | young yin | 7/16 |
| 9 | old yang | 3/16 |

Implement as a **distinct mode**, not a cosmetic toggle.

---

## 4. Changing lines & the resulting hexagram

1. Build the **primary hexagram** from the cast lines (using their current yin/yang).
2. The **changing line positions** are the positions whose value is 6 or 9.
3. The **resulting (transformed) hexagram** is the primary hexagram with every changing line flipped (6→yang, 9→yin). If there are no changing lines, there is no resulting hexagram.

Store the full cast verbatim (`docs/DATA_MODEL.md`, `cast_result`) for auditability.

---

## 5. Which texts to emphasize (interpretation input)

Common rule set (Wilhelm-style; schools differ — keep configurable). The engine surfaces, and the interpretation prompt receives, the relevant texts:

- **0 changing lines:** the primary hexagram's Judgment + Image.
- **1 changing line:** that line's text is central; primary hexagram as context.
- **2–5 changing lines:** the changing lines' texts, with the movement toward the resulting hexagram emphasized.
- **6 changing lines:** special handling (e.g. for Hexagrams 1 and 2 there are dedicated "all lines change" texts; otherwise weight the resulting hexagram).

The engine's job is to provide the *correct verified texts*; the model's job is to *synthesize them for the question* (`docs/INTERPRETATION_PROMPT.md`).

---

## 6. King Wen lookup table (value → hexagram)

`value` = 6-bit pattern from §1. Columns: King Wen number, pinyin, Chinese, upper trigram, lower trigram, value.

| # | Pinyin | 中文 | Upper | Lower | value |
|---|---|---|---|---|---|
| 1 | Qián | 乾 | Qián | Qián | 63 |
| 2 | Kūn | 坤 | Kūn | Kūn | 0 |
| 3 | Zhūn | 屯 | Kǎn | Zhèn | 17 |
| 4 | Méng | 蒙 | Gèn | Kǎn | 34 |
| 5 | Xū | 需 | Kǎn | Qián | 23 |
| 6 | Sòng | 訟 | Qián | Kǎn | 58 |
| 7 | Shī | 師 | Kūn | Kǎn | 2 |
| 8 | Bǐ | 比 | Kǎn | Kūn | 16 |
| 9 | Xiǎo Chù | 小畜 | Xùn | Qián | 55 |
| 10 | Lǚ | 履 | Qián | Duì | 59 |
| 11 | Tài | 泰 | Kūn | Qián | 7 |
| 12 | Pǐ | 否 | Qián | Kūn | 56 |
| 13 | Tóng Rén | 同人 | Qián | Lí | 61 |
| 14 | Dà Yǒu | 大有 | Lí | Qián | 47 |
| 15 | Qiān | 謙 | Kūn | Gèn | 4 |
| 16 | Yù | 豫 | Zhèn | Kūn | 8 |
| 17 | Suí | 隨 | Duì | Zhèn | 25 |
| 18 | Gǔ | 蠱 | Gèn | Xùn | 38 |
| 19 | Lín | 臨 | Kūn | Duì | 3 |
| 20 | Guān | 觀 | Xùn | Kūn | 48 |
| 21 | Shì Kè | 噬嗑 | Lí | Zhèn | 41 |
| 22 | Bì | 賁 | Gèn | Lí | 37 |
| 23 | Bō | 剝 | Gèn | Kūn | 32 |
| 24 | Fù | 復 | Kūn | Zhèn | 1 |
| 25 | Wú Wàng | 無妄 | Qián | Zhèn | 57 |
| 26 | Dà Chù | 大畜 | Gèn | Qián | 39 |
| 27 | Yí | 頤 | Gèn | Zhèn | 33 |
| 28 | Dà Guò | 大過 | Duì | Xùn | 30 |
| 29 | Kǎn | 坎 | Kǎn | Kǎn | 18 |
| 30 | Lí | 離 | Lí | Lí | 45 |
| 31 | Xián | 咸 | Duì | Gèn | 28 |
| 32 | Héng | 恆 | Zhèn | Xùn | 14 |
| 33 | Dùn | 遯 | Qián | Gèn | 60 |
| 34 | Dà Zhuàng | 大壯 | Zhèn | Qián | 15 |
| 35 | Jìn | 晉 | Lí | Kūn | 40 |
| 36 | Míng Yí | 明夷 | Kūn | Lí | 5 |
| 37 | Jiā Rén | 家人 | Xùn | Lí | 53 |
| 38 | Kuí | 睽 | Lí | Duì | 43 |
| 39 | Jiǎn | 蹇 | Kǎn | Gèn | 20 |
| 40 | Xiè | 解 | Zhèn | Kǎn | 10 |
| 41 | Sǔn | 損 | Gèn | Duì | 35 |
| 42 | Yì | 益 | Xùn | Zhèn | 49 |
| 43 | Guài | 夬 | Duì | Qián | 31 |
| 44 | Gòu | 姤 | Qián | Xùn | 62 |
| 45 | Cuì | 萃 | Duì | Kūn | 24 |
| 46 | Shēng | 升 | Kūn | Xùn | 6 |
| 47 | Kùn | 困 | Duì | Kǎn | 26 |
| 48 | Jǐng | 井 | Kǎn | Xùn | 22 |
| 49 | Gé | 革 | Duì | Lí | 29 |
| 50 | Dǐng | 鼎 | Lí | Xùn | 46 |
| 51 | Zhèn | 震 | Zhèn | Zhèn | 9 |
| 52 | Gèn | 艮 | Gèn | Gèn | 36 |
| 53 | Jiàn | 漸 | Xùn | Gèn | 52 |
| 54 | Guī Mèi | 歸妹 | Zhèn | Duì | 11 |
| 55 | Fēng | 豐 | Zhèn | Lí | 13 |
| 56 | Lǚ | 旅 | Lí | Gèn | 44 |
| 57 | Xùn | 巽 | Xùn | Xùn | 54 |
| 58 | Duì | 兌 | Duì | Duì | 27 |
| 59 | Huàn | 渙 | Xùn | Kǎn | 50 |
| 60 | Jié | 節 | Kǎn | Duì | 19 |
| 61 | Zhōng Fú | 中孚 | Xùn | Duì | 51 |
| 62 | Xiǎo Guò | 小過 | Zhèn | Gèn | 12 |
| 63 | Jì Jì | 既濟 | Kǎn | Lí | 21 |
| 64 | Wèi Jì | 未濟 | Lí | Kǎn | 42 |

Internal consistency: the 64 `value`s are exactly the integers 0–63, each appearing once (a bijection). A good first test: assert this property holds.

---

## 7. Reference test cases (for the engine)

| Lines (bottom→top, yin/yang) | Expected |
|---|---|
| all yang | Hexagram 1, value 63 |
| all yin | Hexagram 2, value 0 |
| yang yang yang / yin yin yin (lower Qián, upper Kūn) | Hexagram 11 (Tài), value 7 |
| yin yin yin / yang yang yang (lower Kūn, upper Qián) | Hexagram 12 (Pǐ), value 56 |
| yang yin yang / yin yang yin (lower Lí, upper Kǎn) | Hexagram 63 (Jì Jì), value 21 |
| Hexagram 11 with old-yang (9) at position 2 | primary 11, changing [2], resulting = flip line 2 → Hexagram 46 (Shēng) |

(Verify the resulting-hexagram example as part of the §8 verification pass.)

---

## 8. How to verify (mandatory before shipping the engine)

1. Cross-check every row in §6 against an authoritative published King Wen sequence — e.g. the Wilhelm/Baynes *I Ching or Book of Changes*, James Legge's translation, or another canonical edition. Several reputable public references list the trigram composition per hexagram.
2. Encode the trigram pairs to `value` independently and assert the §6 numbers match.
3. Assert the bijection property (§6) and run the §7 cases.
4. Only then seed `/data/hexagrams.seed.json` and wire the engine.

Treat any mismatch as a release blocker. A wrong attribution silently mis-identifies hexagrams and corrupts every reading that lands on it.
