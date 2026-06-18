jest.mock("./router", () => ({
  extract: jest.fn(),
}));

import { extract as routerExtract } from "./router";
import {
  buildExtractionPrompt,
  extractGrounding,
  parseGroundingExtraction,
  GroundingExtractionError,
} from "./grounding";

const mockedRouterExtract = routerExtract as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── parseGroundingExtraction ─────────────────────────────────────────────────

describe("parseGroundingExtraction", () => {
  it("parses a well-formed JSON object", () => {
    const raw = JSON.stringify({
      stated: ["feels stuck"],
      unstated: ["no job mentioned"],
      questionType: "emotional_state",
    });
    expect(parseGroundingExtraction(raw)).toEqual({
      stated: ["feels stuck"],
      unstated: ["no job mentioned"],
      questionType: "emotional_state",
    });
  });

  it("tolerates surrounding prose or markdown fences around the JSON object", () => {
    const raw = 'Here you go:\n```json\n{"stated":[],"unstated":[],"questionType":"other"}\n```\nDone.';
    expect(parseGroundingExtraction(raw)).toEqual({ stated: [], unstated: [], questionType: "other" });
  });

  it.each(["decision", "emotional_state", "open_reflection", "relationship", "other"])(
    "accepts questionType %s",
    (questionType) => {
      const raw = JSON.stringify({ stated: [], unstated: [], questionType });
      expect(parseGroundingExtraction(raw).questionType).toBe(questionType);
    },
  );

  it("throws GroundingExtractionError when no JSON object is present", () => {
    expect(() => parseGroundingExtraction("not json at all")).toThrow(GroundingExtractionError);
  });

  it("throws GroundingExtractionError on malformed JSON", () => {
    expect(() => parseGroundingExtraction("{ stated: [oops] }")).toThrow(GroundingExtractionError);
  });

  it("throws GroundingExtractionError when `stated` is not a string array", () => {
    const raw = JSON.stringify({ stated: "feels stuck", unstated: [], questionType: "other" });
    expect(() => parseGroundingExtraction(raw)).toThrow(GroundingExtractionError);
  });

  it("throws GroundingExtractionError when `unstated` is not a string array", () => {
    const raw = JSON.stringify({ stated: [], unstated: [123], questionType: "other" });
    expect(() => parseGroundingExtraction(raw)).toThrow(GroundingExtractionError);
  });

  it("throws GroundingExtractionError on an invalid questionType", () => {
    const raw = JSON.stringify({ stated: [], unstated: [], questionType: "prophecy" });
    expect(() => parseGroundingExtraction(raw)).toThrow(GroundingExtractionError);
  });

  it("throws GroundingExtractionError when the parsed JSON is an array, not an object", () => {
    expect(() => parseGroundingExtraction("[1, 2, 3]")).toThrow(GroundingExtractionError);
  });
});

// ─── buildExtractionPrompt ────────────────────────────────────────────────────

describe("buildExtractionPrompt", () => {
  it("puts the literal question in the user message and nothing else", () => {
    const prompt = buildExtractionPrompt("Should I move abroad?");
    expect(prompt.messages).toEqual([{ role: "user", content: "Should I move abroad?" }]);
  });

  it("does not mark the extraction system block as cached (separate from Phase 2's breakpoint)", () => {
    const prompt = buildExtractionPrompt("Q");
    expect(prompt.system[0]!.cache_control).toBeUndefined();
  });

  it("instructs JSON-only output with the three required keys", () => {
    const prompt = buildExtractionPrompt("Q");
    const systemText = prompt.system[0]!.text;
    expect(systemText).toContain("stated");
    expect(systemText).toContain("unstated");
    expect(systemText).toContain("questionType");
  });
});

// ─── extractGrounding — routes through router.extract(), no raw SDK use ─────

describe("extractGrounding", () => {
  it("calls router.extract with the question and returns the parsed result", async () => {
    mockedRouterExtract.mockImplementation(async function* () {
      yield JSON.stringify({ stated: ["a"], unstated: ["b"], questionType: "decision" });
    });

    const result = await extractGrounding("Should I take the job?");

    expect(mockedRouterExtract).toHaveBeenCalledTimes(1);
    const [prompt] = mockedRouterExtract.mock.calls[0];
    expect(prompt.messages[0].content).toBe("Should I take the job?");
    expect(result).toEqual({ stated: ["a"], unstated: ["b"], questionType: "decision" });
  });

  it("joins multiple streamed chunks before parsing", async () => {
    mockedRouterExtract.mockImplementation(async function* () {
      yield '{"stated":[],"uns';
      yield 'tated":[],"questionType":"other"}';
    });

    const result = await extractGrounding("Q");
    expect(result).toEqual({ stated: [], unstated: [], questionType: "other" });
  });

  it("propagates parse errors as GroundingExtractionError", async () => {
    mockedRouterExtract.mockImplementation(async function* () {
      yield "garbage, not json";
    });

    await expect(extractGrounding("Q")).rejects.toThrow(GroundingExtractionError);
  });

  it("forwards the injected client through to router.extract", async () => {
    mockedRouterExtract.mockImplementation(async function* () {
      yield JSON.stringify({ stated: [], unstated: [], questionType: "other" });
    });
    const fakeClient = { messages: { stream: jest.fn() } };

    await extractGrounding("Q", fakeClient as never);

    expect(mockedRouterExtract).toHaveBeenCalledWith(expect.anything(), fakeClient);
  });
});
