/**
 * kingwen.authoritative.ts
 *
 * AUTHORITATIVE King Wen sequence fixture — the independent ground truth for the
 * "authoritative-source verification" test (Milestone 1, the RELEASE BLOCKER).
 *
 * PROVENANCE (why this is independent, not a copy of our own engine's table):
 *   The upper/lower trigram composition for every hexagram is taken from the
 *   Wikipedia "List of hexagrams of the I Ching" (King Wen order), which cites the
 *   Wilhelm/Baynes "I Ching or Book of Changes". Trigram composition is
 *   convention-independent fact (not a copyrightable text). The 6-bit `value`
 *   below was then derived from that trigram composition using THIS project's
 *   encoding convention (see below) — so it is produced independently of the
 *   engine's own kingwen table. If the engine mis-typed any entry, comparing
 *   against this fixture will catch it.
 *   Cross-checked against ICHING_REFERENCE.md: all 64 entries agree.
 *   Verified: 2026-06-17.
 *
 * ENCODING CONVENTION (must match the engine — see ICHING_REFERENCE.md §1–2):
 *   - Line is yang (solid) = 1, yin (broken) = 0.
 *   - Lines counted bottom (position 1) to top (position 6).
 *   - Bottom line is the least-significant bit.
 *   - value = L1·1 + L2·2 + L3·4 + L4·8 + L5·16 + L6·32
 *   - Lower trigram = lines 1–3 (bits 0–2); upper trigram = lines 4–6 (bits 3–5).
 *   - Therefore: value = lowerTrigramValue + upperTrigramValue · 8.
 *   - Sanity: all-yang = 63, all-yin = 0.
 *
 * If the engine uses a different bit convention, the verification test SHOULD
 * fail here — that is the test doing its job. Reconcile the convention; do not
 * "fix" it by editing this fixture to match a buggy engine.
 */

export type TrigramKey =
  | 'qian' // ☰ Heaven  (1,1,1) -> 7
  | 'dui'  // ☱ Lake    (1,1,0) -> 3
  | 'li'   // ☲ Fire    (1,0,1) -> 5
  | 'zhen' // ☳ Thunder (1,0,0) -> 1
  | 'xun'  // ☴ Wind    (0,1,1) -> 6
  | 'kan'  // ☵ Water   (0,1,0) -> 2
  | 'gen'  // ☶ Mountain(0,0,1) -> 4
  | 'kun'; // ☷ Earth   (0,0,0) -> 0

/** Trigram -> 3-bit value (bottom line = LSB). Included so `value` is reproducible. */
export const TRIGRAM_VALUES: Record<TrigramKey, number> = {
  qian: 7,
  dui: 3,
  li: 5,
  zhen: 1,
  xun: 6,
  kan: 2,
  gen: 4,
  kun: 0,
};

export interface AuthoritativeHexagram {
  /** King Wen number, 1–64. */
  number: number;
  /** Pinyin name (for human eyeballing; not used by the equality check). */
  name: string;
  /** Upper (outer) trigram. */
  upper: TrigramKey;
  /** Lower (inner) trigram. */
  lower: TrigramKey;
  /** 6-bit pattern in this project's convention = lower + upper*8. */
  value: number;
}

/**
 * The 64 hexagrams in King Wen order with their authoritative trigram
 * composition and the derived 6-bit value.
 */
export const AUTHORITATIVE_KING_WEN: readonly AuthoritativeHexagram[] = [
  { number: 1,  name: 'Qián',       upper: 'qian', lower: 'qian', value: 63 },
  { number: 2,  name: 'Kūn',        upper: 'kun',  lower: 'kun',  value: 0  },
  { number: 3,  name: 'Zhūn',       upper: 'kan',  lower: 'zhen', value: 17 },
  { number: 4,  name: 'Méng',       upper: 'gen',  lower: 'kan',  value: 34 },
  { number: 5,  name: 'Xū',         upper: 'kan',  lower: 'qian', value: 23 },
  { number: 6,  name: 'Sòng',       upper: 'qian', lower: 'kan',  value: 58 },
  { number: 7,  name: 'Shī',        upper: 'kun',  lower: 'kan',  value: 2  },
  { number: 8,  name: 'Bǐ',         upper: 'kan',  lower: 'kun',  value: 16 },
  { number: 9,  name: 'Xiǎo Chù',   upper: 'xun',  lower: 'qian', value: 55 },
  { number: 10, name: 'Lǚ',         upper: 'qian', lower: 'dui',  value: 59 },
  { number: 11, name: 'Tài',        upper: 'kun',  lower: 'qian', value: 7  },
  { number: 12, name: 'Pǐ',         upper: 'qian', lower: 'kun',  value: 56 },
  { number: 13, name: 'Tóng Rén',   upper: 'qian', lower: 'li',   value: 61 },
  { number: 14, name: 'Dà Yǒu',     upper: 'li',   lower: 'qian', value: 47 },
  { number: 15, name: 'Qiān',       upper: 'kun',  lower: 'gen',  value: 4  },
  { number: 16, name: 'Yù',         upper: 'zhen', lower: 'kun',  value: 8  },
  { number: 17, name: 'Suí',        upper: 'dui',  lower: 'zhen', value: 25 },
  { number: 18, name: 'Gǔ',         upper: 'gen',  lower: 'xun',  value: 38 },
  { number: 19, name: 'Lín',        upper: 'kun',  lower: 'dui',  value: 3  },
  { number: 20, name: 'Guān',       upper: 'xun',  lower: 'kun',  value: 48 },
  { number: 21, name: 'Shì Kè',     upper: 'li',   lower: 'zhen', value: 41 },
  { number: 22, name: 'Bì',         upper: 'gen',  lower: 'li',   value: 37 },
  { number: 23, name: 'Bō',         upper: 'gen',  lower: 'kun',  value: 32 },
  { number: 24, name: 'Fù',         upper: 'kun',  lower: 'zhen', value: 1  },
  { number: 25, name: 'Wú Wàng',    upper: 'qian', lower: 'zhen', value: 57 },
  { number: 26, name: 'Dà Chù',     upper: 'gen',  lower: 'qian', value: 39 },
  { number: 27, name: 'Yí',         upper: 'gen',  lower: 'zhen', value: 33 },
  { number: 28, name: 'Dà Guò',     upper: 'dui',  lower: 'xun',  value: 30 },
  { number: 29, name: 'Kǎn',        upper: 'kan',  lower: 'kan',  value: 18 },
  { number: 30, name: 'Lí',         upper: 'li',   lower: 'li',   value: 45 },
  { number: 31, name: 'Xián',       upper: 'dui',  lower: 'gen',  value: 28 },
  { number: 32, name: 'Héng',       upper: 'zhen', lower: 'xun',  value: 14 },
  { number: 33, name: 'Dùn',        upper: 'qian', lower: 'gen',  value: 60 },
  { number: 34, name: 'Dà Zhuàng',  upper: 'zhen', lower: 'qian', value: 15 },
  { number: 35, name: 'Jìn',        upper: 'li',   lower: 'kun',  value: 40 },
  { number: 36, name: 'Míng Yí',    upper: 'kun',  lower: 'li',   value: 5  },
  { number: 37, name: 'Jiā Rén',    upper: 'xun',  lower: 'li',   value: 53 },
  { number: 38, name: 'Kuí',        upper: 'li',   lower: 'dui',  value: 43 },
  { number: 39, name: 'Jiǎn',       upper: 'kan',  lower: 'gen',  value: 20 },
  { number: 40, name: 'Xiè',        upper: 'zhen', lower: 'kan',  value: 10 },
  { number: 41, name: 'Sǔn',        upper: 'gen',  lower: 'dui',  value: 35 },
  { number: 42, name: 'Yì',         upper: 'xun',  lower: 'zhen', value: 49 },
  { number: 43, name: 'Guài',       upper: 'dui',  lower: 'qian', value: 31 },
  { number: 44, name: 'Gòu',        upper: 'qian', lower: 'xun',  value: 62 },
  { number: 45, name: 'Cuì',        upper: 'dui',  lower: 'kun',  value: 24 },
  { number: 46, name: 'Shēng',      upper: 'kun',  lower: 'xun',  value: 6  },
  { number: 47, name: 'Kùn',        upper: 'dui',  lower: 'kan',  value: 26 },
  { number: 48, name: 'Jǐng',       upper: 'kan',  lower: 'xun',  value: 22 },
  { number: 49, name: 'Gé',         upper: 'dui',  lower: 'li',   value: 29 },
  { number: 50, name: 'Dǐng',       upper: 'li',   lower: 'xun',  value: 46 },
  { number: 51, name: 'Zhèn',       upper: 'zhen', lower: 'zhen', value: 9  },
  { number: 52, name: 'Gèn',        upper: 'gen',  lower: 'gen',  value: 36 },
  { number: 53, name: 'Jiàn',       upper: 'xun',  lower: 'gen',  value: 52 },
  { number: 54, name: 'Guī Mèi',    upper: 'zhen', lower: 'dui',  value: 11 },
  { number: 55, name: 'Fēng',       upper: 'zhen', lower: 'li',   value: 13 },
  { number: 56, name: 'Lǚ',         upper: 'li',   lower: 'gen',  value: 44 },
  { number: 57, name: 'Xùn',        upper: 'xun',  lower: 'xun',  value: 54 },
  { number: 58, name: 'Duì',        upper: 'dui',  lower: 'dui',  value: 27 },
  { number: 59, name: 'Huàn',       upper: 'xun',  lower: 'kan',  value: 50 },
  { number: 60, name: 'Jié',        upper: 'kan',  lower: 'dui',  value: 19 },
  { number: 61, name: 'Zhōng Fú',   upper: 'xun',  lower: 'dui',  value: 51 },
  { number: 62, name: 'Xiǎo Guò',   upper: 'zhen', lower: 'gen',  value: 12 },
  { number: 63, name: 'Jì Jì',      upper: 'kan',  lower: 'li',   value: 21 },
  { number: 64, name: 'Wèi Jì',     upper: 'li',   lower: 'kan',  value: 42 },
] as const;

/** value (0–63) -> King Wen number (1–64). The map the verification test compares against. */
export const valueToKingWen: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(AUTHORITATIVE_KING_WEN.map((h) => [h.value, h.number])),
);

/** King Wen number (1–64) -> value (0–63). */
export const kingWenToValue: Readonly<Record<number, number>> = Object.freeze(
  Object.fromEntries(AUTHORITATIVE_KING_WEN.map((h) => [h.number, h.value])),
);

/**
 * Self-check: confirms this fixture is internally well-formed (a bijection between
 * the 64 values {0..63} and the 64 King Wen numbers {1..64}), and that each
 * `value` equals lower + upper*8 for its stated trigrams. Call this from the test
 * suite before comparing the engine against the fixture. Throws on any defect.
 */
export function assertAuthoritativeIntegrity(): void {
  if (AUTHORITATIVE_KING_WEN.length !== 64) {
    throw new Error(`Expected 64 hexagrams, got ${AUTHORITATIVE_KING_WEN.length}`);
  }
  const values = new Set<number>();
  const numbers = new Set<number>();
  for (const h of AUTHORITATIVE_KING_WEN) {
    const derived = TRIGRAM_VALUES[h.lower] + TRIGRAM_VALUES[h.upper] * 8;
    if (derived !== h.value) {
      throw new Error(
        `Hexagram ${h.number} (${h.name}): value ${h.value} != derived ${derived} ` +
          `from lower=${h.lower} upper=${h.upper}`,
      );
    }
    if (h.value < 0 || h.value > 63) throw new Error(`Value out of range: ${h.value}`);
    if (h.number < 1 || h.number > 64) throw new Error(`Number out of range: ${h.number}`);
    values.add(h.value);
    numbers.add(h.number);
  }
  if (values.size !== 64) throw new Error('Values are not a bijection of 0–63');
  if (numbers.size !== 64) throw new Error('Numbers are not a bijection of 1–64');
}
