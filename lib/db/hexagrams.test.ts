import {
  getHexagramRecord,
  getLineRecord,
  resolveLocaleText,
  HexagramTextNotFoundError,
  MissingHexagramTextError,
  type HexagramRecord,
} from "./hexagrams";

describe("getHexagramRecord", () => {
  it("returns the structural record for a seeded demo hexagram (number 1)", () => {
    const record = getHexagramRecord(1);
    // Structural facts only — already verified in M1, robust to future text population.
    expect(record.number).toBe(1);
    expect(record.name_pinyin).toBe("Qián");
    expect(record.name_zh).toBe("乾");
    expect(record.lines).toHaveLength(6);
  });

  it("throws HexagramTextNotFoundError for a King Wen number absent from the demo corpus", () => {
    expect(() => getHexagramRecord(64)).toThrow(HexagramTextNotFoundError);
  });
});

describe("hexagram 1 — real populated text (data/hexagrams.demo.json)", () => {
  it("judgment and image resolve to non-null text for en and zh", () => {
    const record = getHexagramRecord(1);

    const judgmentEn = resolveLocaleText(record.judgment, "en", "hexagram 1 judgment");
    const judgmentZh = resolveLocaleText(record.judgment, "zh", "hexagram 1 judgment");
    const imageEn = resolveLocaleText(record.image, "en", "hexagram 1 image");
    const imageZh = resolveLocaleText(record.image, "zh", "hexagram 1 image");

    expect(judgmentEn.length).toBeGreaterThan(0);
    expect(judgmentZh).toContain("元亨");
    expect(imageEn.length).toBeGreaterThan(0);
    expect(imageZh).toContain("天行健");
  });

  it("all six lines resolve to non-null text for en and zh", () => {
    const record = getHexagramRecord(1);

    for (const line of record.lines) {
      const en = resolveLocaleText(line.text, "en", `hexagram 1 line ${line.position}`);
      const zh = resolveLocaleText(line.text, "zh", `hexagram 1 line ${line.position}`);
      expect(en.length).toBeGreaterThan(0);
      expect(zh.length).toBeGreaterThan(0);
    }
  });

  it("vi is still genuinely absent (not yet supplied) and throws as designed", () => {
    const record = getHexagramRecord(1);
    expect(() => resolveLocaleText(record.judgment, "vi", "hexagram 1 judgment")).toThrow(
      MissingHexagramTextError,
    );
  });
});

describe("resolveLocaleText", () => {
  // Use a local fixture (not the real demo file) so this test is robust to
  // humans populating data/hexagrams.demo.json later.
  const populated = { vi: "vi-text", zh: "zh-text", en: "en-text" };
  const partiallyMissing = { vi: "vi-text", zh: null, en: "en-text" };

  it("returns the text for a populated locale", () => {
    expect(resolveLocaleText(populated, "en", "test")).toBe("en-text");
    expect(resolveLocaleText(populated, "vi", "test")).toBe("vi-text");
  });

  it("throws MissingHexagramTextError when the locale's text is null", () => {
    expect(() => resolveLocaleText(partiallyMissing, "zh", "test context")).toThrow(
      MissingHexagramTextError,
    );
  });

  it("error message includes the context and locale, never invents a fallback", () => {
    try {
      resolveLocaleText(partiallyMissing, "zh", "hexagram 1 judgment");
      throw new Error("expected resolveLocaleText to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MissingHexagramTextError);
      expect((err as Error).message).toContain("hexagram 1 judgment");
      expect((err as Error).message).toContain("zh");
    }
  });
});

describe("getLineRecord", () => {
  const record: HexagramRecord = {
    number: 99,
    name_pinyin: "Test",
    name_zh: "測",
    judgment: { vi: null, zh: null, en: null },
    image: { vi: null, zh: null, en: null },
    lines: [{ position: 3, text: { vi: null, zh: null, en: "line-3" } }],
  };

  it("finds a line by position", () => {
    expect(getLineRecord(record, 3).text.en).toBe("line-3");
  });

  it("throws RangeError when the position is structurally absent", () => {
    expect(() => getLineRecord(record, 5)).toThrow(RangeError);
  });
});
