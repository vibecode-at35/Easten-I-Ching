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
  extract: jest.fn(),
}));

import { getHexagramRecord } from "../db/hexagrams";
import { interpret as routerInterpret, extract as routerExtract } from "./router";
import { gatherGroundedTexts, runInterpretation } from "./interpret";
import { MissingHexagramTextError } from "../db/hexagrams";
import { HexagramFabricationError } from "./hexagram-guard";

const mockedGetHexagramRecord = getHexagramRecord as jest.Mock;
const mockedRouterInterpret = routerInterpret as jest.Mock;
const mockedRouterExtract = routerExtract as jest.Mock;

/** Default Phase 1 mock: a neutral, valid extraction so existing tests need no changes. */
function mockExtractWith(json: Record<string, unknown>) {
  mockedRouterExtract.mockImplementation(async function* () {
    yield JSON.stringify(json);
  });
}

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
  // Neutral default so tests that don't care about Phase 1 don't need to set it up.
  mockExtractWith({ stated: [], unstated: [], questionType: "other" });
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
    expect(mockedRouterExtract).not.toHaveBeenCalled();
  });
});

// ─── Two-phase grounding: Phase 2 receives and is instructed by Phase 1 ─────

describe("runInterpretation — two-phase grounding (Phase 1 -> Phase 2)", () => {
  async function drain(iterable: AsyncIterable<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const chunk of iterable) out.push(chunk);
    return out;
  }

  it("Phase 2's prompt contains the stated/unstated/questionType fields Phase 1 extracted", async () => {
    mockExtractWith({
      stated: ["feels stuck", "is waiting for something"],
      unstated: ["no job or career decision mentioned", "no relationship mentioned"],
      questionType: "emotional_state",
    });
    mockedRouterInterpret.mockImplementation(async function* () {
      yield "reading";
    });

    const cast = castWith({});
    await drain(runInterpretation({ cast, question: "I feel stuck", locale: "en" }));

    expect(mockedRouterExtract).toHaveBeenCalledTimes(1);
    const [extractionPrompt] = mockedRouterExtract.mock.calls[0];
    expect(extractionPrompt.messages[0].content).toBe("I feel stuck");

    const [readingPrompt] = mockedRouterInterpret.mock.calls[0];
    const userContent = readingPrompt.messages[0].content as string;
    expect(userContent).toContain("Stated: feels stuck; is waiting for something");
    expect(userContent).toContain(
      "Unstated (hard boundaries — do not introduce): no job or career decision mentioned; no relationship mentioned",
    );
    expect(userContent).toContain("Question type: emotional_state");
  });

  it("Phase 1 runs before Phase 2 (extract called, then interpret)", async () => {
    const callOrder: string[] = [];
    mockedRouterExtract.mockImplementation(async function* () {
      callOrder.push("extract");
      yield JSON.stringify({ stated: [], unstated: [], questionType: "other" });
    });
    mockedRouterInterpret.mockImplementation(async function* () {
      callOrder.push("interpret");
    });

    await drain(runInterpretation({ cast: castWith({}), question: "Q", locale: "en" }));

    expect(callOrder).toEqual(["extract", "interpret"]);
  });

  it("falls back gracefully when Phase 1 fails: Phase 2 still runs, without a grounding section", async () => {
    mockedRouterExtract.mockImplementation(async function* () {
      throw new Error("extraction model unavailable");
    });
    mockedRouterInterpret.mockImplementation(async function* () {
      yield "reading anyway";
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const cast = castWith({});
    const chunks = await drain(runInterpretation({ cast, question: "Q", locale: "en" }));

    expect(chunks).toEqual(["reading anyway"]);
    expect(mockedRouterInterpret).toHaveBeenCalledTimes(1);
    const [readingPrompt] = mockedRouterInterpret.mock.calls[0];
    const userContent = readingPrompt.messages[0].content as string;
    expect(userContent).not.toContain("Stated:");
    expect(userContent).not.toContain("Unstated");
    expect(userContent).not.toContain("Question type:");
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("falls back gracefully when Phase 1 returns unparseable output", async () => {
    mockedRouterExtract.mockImplementation(async function* () {
      yield "not json at all";
    });
    mockedRouterInterpret.mockImplementation(async function* () {
      yield "reading anyway";
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const chunks = await drain(
      runInterpretation({ cast: castWith({}), question: "Q", locale: "en" }),
    );

    expect(chunks).toEqual(["reading anyway"]);
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});

// ─── Hexagram-fabrication guard (buffer, validate, retry once, then fail safe) ──

describe("runInterpretation — hexagram-fabrication guard", () => {
  async function drain(iterable: AsyncIterable<string>): Promise<string[]> {
    const out: string[] = [];
    for await (const chunk of iterable) out.push(chunk);
    return out;
  }

  const FABRICATED_TEXT = "Resulting hexagram: #43 Guài (夬) — a transformation that was never cast.";
  const CLEAN_TEXT = "Hexagram 11, Tài, speaks of peace and the meeting of heaven and earth.";

  it("passes clean output straight through on the first attempt, calling the router once", async () => {
    mockedRouterInterpret.mockImplementation(async function* () {
      yield CLEAN_TEXT;
    });

    const chunks = await drain(runInterpretation({ cast: castWith({}), question: "Q", locale: "en" }));

    expect(chunks).toEqual([CLEAN_TEXT]);
    expect(mockedRouterInterpret).toHaveBeenCalledTimes(1);
  });

  it("regenerates once when the first attempt fabricates a hexagram, and yields the clean retry", async () => {
    let call = 0;
    mockedRouterInterpret.mockImplementation(async function* () {
      call += 1;
      yield call === 1 ? FABRICATED_TEXT : CLEAN_TEXT;
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const chunks = await drain(runInterpretation({ cast: castWith({}), question: "Q", locale: "en" }));

    expect(chunks).toEqual([CLEAN_TEXT]);
    expect(mockedRouterInterpret).toHaveBeenCalledTimes(2);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("Hexagram fabrication detected"),
      expect.arrayContaining([expect.stringContaining("43")]),
    );

    consoleError.mockRestore();
  });

  it("throws HexagramFabricationError when fabrication persists through the retry, yielding nothing", async () => {
    mockedRouterInterpret.mockImplementation(async function* () {
      yield FABRICATED_TEXT;
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const chunks: string[] = [];
    let caught: unknown;
    try {
      for await (const chunk of runInterpretation({ cast: castWith({}), question: "Q", locale: "en" })) {
        chunks.push(chunk);
      }
    } catch (err) {
      caught = err;
    }

    expect(chunks).toEqual([]); // nothing was ever yielded to the caller
    expect(mockedRouterInterpret).toHaveBeenCalledTimes(2); // first attempt + one retry, no more
    expect(caught).toBeInstanceOf(HexagramFabricationError);
    expect((caught as HexagramFabricationError).foundReferences).toEqual(
      expect.arrayContaining([expect.stringContaining("43")]),
    );

    consoleError.mockRestore();
  });

  it("never flags a legitimate resulting hexagram as fabricated", async () => {
    mockedRouterInterpret.mockImplementation(async function* () {
      yield "Primary #11 泰 moves toward the resulting hexagram #36 明夷, as the changing line shifts.";
    });

    const cast = castWith({ changingLinePositions: [2], resultingHexagram: 36 });
    const chunks = await drain(runInterpretation({ cast, question: "Q", locale: "en" }));

    expect(chunks).toHaveLength(1);
    expect(mockedRouterInterpret).toHaveBeenCalledTimes(1);
  });
});
