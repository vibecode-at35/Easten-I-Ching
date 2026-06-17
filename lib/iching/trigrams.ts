/** Trigram keys used throughout the engine and corpus (lowercase, ASCII). */
export type TrigramKey = "qian" | "dui" | "li" | "zhen" | "xun" | "kan" | "gen" | "kun";

export interface Trigram {
  key: TrigramKey;
  pinyin: string;
  chinese: string;
  /** 3-bit value, bottom line = LSB. Source: ICHING_REFERENCE.md §2. */
  value: number;
  element: string;
}

/**
 * The eight trigrams (八卦).
 * value = bit0*L1 + bit1*L2 + bit2*L3, where yang=1, yin=0.
 * Source: ICHING_REFERENCE.md §2.
 */
export const TRIGRAMS: Readonly<Record<TrigramKey, Trigram>> = {
  qian: { key: "qian", pinyin: "Qián", chinese: "乾", value: 7, element: "Heaven" },
  dui:  { key: "dui",  pinyin: "Duì",  chinese: "兌", value: 3, element: "Lake"    },
  li:   { key: "li",   pinyin: "Lí",   chinese: "離", value: 5, element: "Fire"    },
  zhen: { key: "zhen", pinyin: "Zhèn", chinese: "震", value: 1, element: "Thunder" },
  xun:  { key: "xun",  pinyin: "Xùn",  chinese: "巽", value: 6, element: "Wind"    },
  kan:  { key: "kan",  pinyin: "Kǎn",  chinese: "坎", value: 2, element: "Water"   },
  gen:  { key: "gen",  pinyin: "Gèn",  chinese: "艮", value: 4, element: "Mountain"},
  kun:  { key: "kun",  pinyin: "Kūn",  chinese: "坤", value: 0, element: "Earth"   },
};

/** Compute the 6-bit hexagram value from lower and upper trigram values. */
export function hexagramValue(lowerValue: number, upperValue: number): number {
  return lowerValue + upperValue * 8;
}
