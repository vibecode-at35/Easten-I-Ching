import type { HexagramRecord } from "../db/hexagrams";
import type { CastResult } from "../iching/types";

jest.mock("../db/hexagrams", () => {
  const actual = jest.requireActual("../db/hexagrams");
  return {
    ...actual,
    getHexagramRecord: jest.fn(),
  };
});

jest.mock("./router", () => ({
  interpret: jest.fn(),
}));

import { getHexagramRecord } from "../db/hexagrams";
import { interpret as routerInterpret } from "./router";
import { gatherGroundedTexts, runInterpretation } from "./interpret";
import { MissingHexagramTextError } from "../db/hexagrams";

const mockedGetHexagramRecord = getHexagramRecord as jest.Mock;
const mockedRouterInterpret = routerInterpret as jest.Mock;

const PRIMARY_RECORD: HexagramRecord = {
  number: 11,
  name_pinyin: "Tài",
  name_zh: "泰",
  judgment: { vi: null, zh: null, en: "EN_PRIMARY_JUDGMENT" },
  image: { vi: null, zh: null, en: "EN_PRIMARY_IMAGE" },
  lines: [1, 2, 3, 4, 5, 6].map((position) => ({
    position,
    text: { vi: null, zh: null, en: `EN_LINE_${position}` },
  })),
};

const RESULTING_RECORD: HexagramRecord = {
  number: 36,
  name_pinyin: "Míng Yí",
  name_zh: "明夷",
  judgment: { vi: null, zh: null, en: "EN_RESULT_JUDGMENT" },
  image: { vi: null, zh: null, en: "EN_RESULT_IMAGE" },
  lines: [1, 2, 3, 4, 5, 6].map((position) => ({
    position,
    text: { vi: null, zh: null, en: `EN_RESULT_LINE_${position}` },
  })),
};

function castWith(overrides: Partial<CastResult>): CastResult {
  return {
    lines: [],
    primaryHexagram: 11,
    changingLinePositions: [],
    resultingHexagram: null,
    method: "three_coin",
    seed: "test-seed",
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedGetHexagramRecord.mockImplementation((number: number) => {
    if (number === 11) return PRIMARY_RECORD;
    if (number === 36) return RESULTING_RECORD;
    throw new Error(`unexpected hexagram number in test: ${number}`);
  });
});

// ─── gatherGroundedTexts — emphasis rules (ICHING_REFERENCE.md §5) ───────────

describe("gatherGroundedTexts", () => {
  it("0 changing lines: primary judgment + image only, no changing lines, no resulting", () => {
    const cast = castWith({ changingLinePositions: [], resultingHexagram: null });
    const grounded = gatherGroundedTexts(cast, "en");

    expect(grounded.primary).toMatchObject({
      number: 11,
      judgment: "EN_PRIMARY_JUDGMENT",
      image: "EN_PRIMARY_IMAGE",
    });
    expect(grounded.changingLines).toEqual([]);
    expect(grounded.resulting).toBeNull();
    expect(mockedGetHexagramRecord).toHaveBeenCalledTimes(1);
    expect(mockedGetHexagramRecord).toHaveBeenCalledWith(11);
  });

  it("1 changing line: that line's text is fetched, plus primary and resulting", () => {
    const cast = castWith({ changingLinePositions: [2], resultingHexagram: 36 });
    const grounded = gatherGroundedTexts(cast, "en");

    expect(grounded.changingLines).toEqual([{ position: 2, text: "EN_LINE_2" }]);
    // Only the changing line is included — not the other five lines.
    expect(grounded.changingLines).toHaveLength(1);
    expect(grounded.resulting).toMatchObject({ number: 36, judgment: "EN_RESULT_JUDGMENT" });
  });

  it("2-5 changing lines: all changing lines' texts are fetched, with resulting hexagram", () => {
    const cast = castWith({ changingLinePositions: [1, 3, 5], resultingHexagram: 36 });
    const grounded = gatherGroundedTexts(cast, "en");

    expect(grounded.changingLines).toEqual([
      { position: 1, text: "EN_LINE_1" },
      { position: 3, text: "EN_LINE_3" },
      { position: 5, text: "EN_LINE_5" },
    ]);
  });

  it("respects the requested locale", () => {
    const cast = castWith({});
    expect(() => gatherGroundedTexts(cast, "vi")).toThrow(MissingHexagramTextError);
  });

  it("missing text throws MissingHexagramTextError rather than guessing", () => {
    const cast = castWith({ changingLinePositions: [], resultingHexagram: null });
    expect(() => gatherGroundedTexts(cast, "zh")).toThrow(MissingHexagramTextError);
  });
});

// ─── runInterpretation — orchestration + grounding contract ─────────────────

describe("runInterpretation", () => {
  async function drain(iterable: AsyncIterable<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const chunk of iterable) out.push(chunk);
    return out;
  }

  it("assembles a prompt containing only fetched texts and the question, then calls the router", async () => {
    mockedRouterInterpret.mockImplementation(async function* () {
      yield "reading chunk";
    });

    const cast = castWith({ changingLinePositions: [2], resultingHexagram: 36 });
    const chunks = await drain(
      runInterpretation({ cast, question: "MY_REAL_QUESTION", locale: "en" }),
    );

    expect(chunks).toEqual(["reading chunk"]);
    expect(mockedRouterInterpret).toHaveBeenCalledTimes(1);

    const [assembledPrompt, tier] = mockedRouterInterpret.mock.calls[0];
    expect(tier).toBe("default");

    const userContent = assembledPrompt.messages[0].content as string;
    expect(userContent).toContain("MY_REAL_QUESTION");
    expect(userContent).toContain("EN_PRIMARY_JUDGMENT");
    expect(userContent).toContain("EN_PRIMARY_IMAGE");
    expect(userContent).toContain("EN_LINE_2");
    expect(userContent).toContain("EN_RESULT_JUDGMENT");

    // Lines that are NOT changing must not leak into the prompt.
    expect(userContent).not.toContain("EN_LINE_1");
    expect(userContent).not.toContain("EN_LINE_3");
  });

  it("defaults to the 'default' tier when none is specified, and forwards 'premium' when given", async () => {
    mockedRouterInterpret.mockImplementation(async function* () {});

    await drain(runInterpretation({ cast: castWith({}), question: "Q", locale: "en" }));
    expect(mockedRouterInterpret.mock.calls[0][1]).toBe("default");

    await drain(
      runInterpretation({ cast: castWith({}), question: "Q", locale: "en", tier: "premium" }),
    );
    expect(mockedRouterInterpret.mock.calls[1][1]).toBe("premium");
  });

  it("never calls the router when grounding fails (missing text)", async () => {
    mockedRouterInterpret.mockImplementation(async function* () {
      yield "should never run";
    });

    const cast = castWith({});
    await expect(drain(runInterpretation({ cast, question: "Q", locale: "zh" }))).rejects.toThrow(
      MissingHexagramTextError,
    );
    expect(mockedRouterInterpret).not.toHaveBeenCalled();
  });
});
