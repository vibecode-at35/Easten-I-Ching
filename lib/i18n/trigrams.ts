import type { Locale } from "../interpretation/types";
import type { TrigramKey } from "../iching/trigrams";

/**
 * Localized labels for the eight trigrams (八卦) — name and natural image.
 *
 * These are fixed, well-established domain constants (the same standing as the
 * King Wen table or the trigram pinyin/chinese already in lib/iching/trigrams.ts),
 * not generated hexagram content. Used only for the reading screen's structural
 * summary (Quái Trên / Quái Dưới / Tượng). AGENTS.md §2 governs corpus text
 * (judgments, line texts) — not the names of the trigrams themselves.
 */
interface TrigramLabel {
  /** The trigram's name (e.g. vi "Càn", zh "乾"). */
  name: string;
  /** Its natural image / element (e.g. vi "Trời", zh "天", en "Heaven"). */
  element: string;
}

const TRIGRAM_LABELS: Record<Locale, Record<TrigramKey, TrigramLabel>> = {
  vi: {
    qian: { name: "Càn", element: "Trời" },
    dui: { name: "Đoài", element: "Đầm" },
    li: { name: "Ly", element: "Lửa" },
    zhen: { name: "Chấn", element: "Sấm" },
    xun: { name: "Tốn", element: "Gió" },
    kan: { name: "Khảm", element: "Nước" },
    gen: { name: "Cấn", element: "Núi" },
    kun: { name: "Khôn", element: "Đất" },
  },
  zh: {
    qian: { name: "乾", element: "天" },
    dui: { name: "兌", element: "澤" },
    li: { name: "離", element: "火" },
    zhen: { name: "震", element: "雷" },
    xun: { name: "巽", element: "風" },
    kan: { name: "坎", element: "水" },
    gen: { name: "艮", element: "山" },
    kun: { name: "坤", element: "地" },
  },
  en: {
    qian: { name: "Qián", element: "Heaven" },
    dui: { name: "Duì", element: "Lake" },
    li: { name: "Lí", element: "Fire" },
    zhen: { name: "Zhèn", element: "Thunder" },
    xun: { name: "Xùn", element: "Wind" },
    kan: { name: "Kǎn", element: "Water" },
    gen: { name: "Gèn", element: "Mountain" },
    kun: { name: "Kūn", element: "Earth" },
  },
};

const IMAGE_JOIN: Record<Locale, string> = { vi: " và ", zh: " · ", en: " and " };

export function trigramName(locale: Locale, key: TrigramKey): string {
  return TRIGRAM_LABELS[locale][key].name;
}

/** The "Tượng" line: the two trigrams' natural images joined (e.g. "Trời và Lửa"). */
export function trigramImage(locale: Locale, upper: TrigramKey, lower: TrigramKey): string {
  const labels = TRIGRAM_LABELS[locale];
  return `${labels[upper].element}${IMAGE_JOIN[locale]}${labels[lower].element}`;
}
