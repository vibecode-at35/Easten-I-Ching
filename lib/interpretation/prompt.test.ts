import { assemblePrompt, buildSystemBlocks, buildUserMessageText, SYSTEM_PROMPT } from "./prompt";
import type { GroundedTexts, GroundingExtraction } from "./types";

const noChangingLines: GroundedTexts = {
  primary: {
    number: 1,
    namePinyin: "Qián",
    nameZh: "乾",
    judgment: "FIXTURE_PRIMARY_JUDGMENT",
    image: "FIXTURE_PRIMARY_IMAGE",
  },
  changingLines: [],
  resulting: null,
};

const withChangingLines: GroundedTexts = {
  primary: {
    number: 11,
    namePinyin: "Tài",
    nameZh: "泰",
    judgment: "FIXTURE_PRIMARY_JUDGMENT",
    image: "FIXTURE_PRIMARY_IMAGE",
  },
  changingLines: [{ position: 2, text: "FIXTURE_LINE_2_TEXT" }],
  resulting: {
    number: 36,
    namePinyin: "Míng Yí",
    nameZh: "明夷",
    judgment: "FIXTURE_RESULTING_JUDGMENT",
  },
};

const fixtureGrounding: GroundingExtraction = {
  stated: ["FIXTURE_STATED_ONE", "FIXTURE_STATED_TWO"],
  unstated: ["FIXTURE_UNSTATED_JOB", "FIXTURE_UNSTATED_RELATIONSHIP"],
  questionType: "emotional_state",
};

// ─── Prompt assembly: exact fetched texts appear, correctly placed ───────────

describe("buildUserMessageText — assembly", () => {
  it("includes the question and locale", () => {
    const text = buildUserMessageText("Should I take the job?", "en", noChangingLines);
    expect(text).toContain("Question: Should I take the job?");
    expect(text).toContain("Locale: en");
  });

  it("includes the primary hexagram's exact judgment and image", () => {
    const text = buildUserMessageText("Q", "en", noChangingLines);
    expect(text).toContain("FIXTURE_PRIMARY_JUDGMENT");
    expect(text).toContain("FIXTURE_PRIMARY_IMAGE");
    expect(text).toContain("#1 Qián (乾)");
  });

  it("omits changing-lines and resulting-hexagram sections when there are no changing lines", () => {
    const text = buildUserMessageText("Q", "en", noChangingLines);
    expect(text).not.toContain("Changing lines");
    expect(text).not.toContain("Resulting hexagram");
  });

  it("includes changing-line texts at their correct positions when present", () => {
    const text = buildUserMessageText("Q", "vi", withChangingLines);
    expect(text).toContain("Changing lines: [2] with texts:");
    expect(text).toContain("line 2: FIXTURE_LINE_2_TEXT");
  });

  it("includes the resulting hexagram's judgment when changing lines exist", () => {
    const text = buildUserMessageText("Q", "vi", withChangingLines);
    expect(text).toContain("#36 Míng Yí (明夷)");
    expect(text).toContain("FIXTURE_RESULTING_JUDGMENT");
  });

  it("reflects the locale passed in, not a hardcoded one", () => {
    expect(buildUserMessageText("Q", "zh", noChangingLines)).toContain("Locale: zh");
    expect(buildUserMessageText("Q", "vi", noChangingLines)).toContain("Locale: vi");
  });
});

// ─── Phase 1 grounding extraction wiring (optional 4th param) ───────────────

describe("buildUserMessageText — Phase 1 grounding section", () => {
  it("omits the grounding section entirely when none is provided (backward compatible)", () => {
    const text = buildUserMessageText("Q", "en", noChangingLines);
    expect(text).not.toContain("Stated:");
    expect(text).not.toContain("Unstated");
    expect(text).not.toContain("Question type:");
  });

  it("includes Stated, Unstated, and Question type when a grounding object is provided", () => {
    const text = buildUserMessageText("Q", "en", noChangingLines, fixtureGrounding);
    expect(text).toContain("Stated: FIXTURE_STATED_ONE; FIXTURE_STATED_TWO");
    expect(text).toContain(
      "Unstated (hard boundaries — do not introduce): FIXTURE_UNSTATED_JOB; FIXTURE_UNSTATED_RELATIONSHIP",
    );
    expect(text).toContain("Question type: emotional_state");
  });

  it("omits the Stated line when stated is empty, but still includes Question type", () => {
    const grounding: GroundingExtraction = { stated: [], unstated: [], questionType: "decision" };
    const text = buildUserMessageText("Q", "en", noChangingLines, grounding);
    expect(text).not.toContain("Stated:");
    expect(text).not.toContain("Unstated");
    expect(text).toContain("Question type: decision");
  });

  it("the grounding section appears before the hexagram texts in the user message", () => {
    const text = buildUserMessageText("Q", "en", noChangingLines, fixtureGrounding);
    const groundingIdx = text.indexOf("Question type:");
    const hexagramIdx = text.indexOf("Primary hexagram:");
    expect(groundingIdx).toBeGreaterThanOrEqual(0);
    expect(hexagramIdx).toBeGreaterThan(groundingIdx);
  });
});

// ─── Grounding contract ───────────────────────────────────────────────────────

describe("grounding contract", () => {
  it("the static system prompt forbids recalling/inventing hexagram content", () => {
    expect(SYSTEM_PROMPT).toContain("Do not recall, invent, or add hexagram content from memory");
    expect(SYSTEM_PROMPT).toContain("If a needed text is missing, say so plainly");
  });

  it("the system block never contains per-request content (sentinel fixture texts)", () => {
    const system = buildSystemBlocks();
    const fullSystemText = system.map((b) => b.text).join("\n");
    expect(fullSystemText).not.toContain("FIXTURE_PRIMARY_JUDGMENT");
    expect(fullSystemText).not.toContain("FIXTURE_LINE_2_TEXT");
    expect(fullSystemText).not.toContain("Should I take the job?");
  });

  it("the static system prompt instructs treating Unstated items as hard boundaries", () => {
    expect(SYSTEM_PROMPT).toContain("Unstated");
    expect(SYSTEM_PROMPT).toContain("hard boundary");
    expect(SYSTEM_PROMPT).not.toContain("FIXTURE_UNSTATED_JOB");
  });

  it("the assembled prompt's user message contains only the provided grounded texts and question — no extra hexagram content", () => {
    const assembled = assemblePrompt("My real question", "en", withChangingLines);
    const userContent = assembled.messages[0]!.content;

    // Every fixture string that was provided shows up.
    for (const expected of [
      "FIXTURE_PRIMARY_JUDGMENT",
      "FIXTURE_PRIMARY_IMAGE",
      "FIXTURE_LINE_2_TEXT",
      "FIXTURE_RESULTING_JUDGMENT",
      "My real question",
    ]) {
      expect(userContent).toContain(expected);
    }

    // Nothing about hexagrams not in the grounded payload appears (e.g. hexagram 2 or 64 names).
    expect(userContent).not.toContain("Kūn");
    expect(userContent).not.toContain("Wèi Jì");
  });
});

// ─── Cache breakpoint placement (cost-critical) ──────────────────────────────

describe("cache breakpoint placement", () => {
  it("system has exactly one block", () => {
    expect(buildSystemBlocks()).toHaveLength(1);
  });

  it("cache_control sits on the last (and only) static system block", () => {
    const system = buildSystemBlocks();
    const lastBlock = system[system.length - 1]!;
    expect(lastBlock.cache_control).toEqual({ type: "ephemeral" });
  });

  it("the system block is byte-identical across calls with different per-request content", () => {
    const a = assemblePrompt("Question A", "en", noChangingLines);
    const b = assemblePrompt("Question B totalement différente", "vi", withChangingLines);
    expect(a.system).toEqual(b.system);
  });

  it("no per-request content appears at or before the cache breakpoint", () => {
    const assembled = assemblePrompt("UNIQUE_QUESTION_TOKEN", "en", withChangingLines);
    const cachedBlock = assembled.system[assembled.system.length - 1]!;
    expect(cachedBlock.cache_control).toBeDefined();
    expect(cachedBlock.text).not.toContain("UNIQUE_QUESTION_TOKEN");
    expect(cachedBlock.text).not.toContain("FIXTURE_LINE_2_TEXT");
  });

  it("the Phase 1 grounding object never contaminates the cached system block", () => {
    const assembled = assemblePrompt("Q", "en", noChangingLines, fixtureGrounding);
    const cachedBlock = assembled.system[assembled.system.length - 1]!;
    expect(cachedBlock.text).not.toContain("FIXTURE_STATED_ONE");
    expect(cachedBlock.text).not.toContain("FIXTURE_UNSTATED_JOB");
    expect(cachedBlock.text).not.toContain("emotional_state");
  });

  it("system block stays byte-identical whether or not a grounding object is passed", () => {
    const withoutGrounding = assemblePrompt("Q", "en", noChangingLines);
    const withGrounding = assemblePrompt("Q", "en", noChangingLines, fixtureGrounding);
    expect(withGrounding.system).toEqual(withoutGrounding.system);
  });

  it("the grounding object lives in the user message, after the breakpoint", () => {
    const assembled = assemblePrompt("Q", "en", noChangingLines, fixtureGrounding);
    expect(assembled.messages[0]!.content).toContain("FIXTURE_STATED_ONE");
  });

  it("all per-request content lives strictly after system, in the user message", () => {
    const assembled = assemblePrompt("UNIQUE_QUESTION_TOKEN", "en", withChangingLines);
    expect(assembled.messages[0]!.role).toBe("user");
    expect(assembled.messages[0]!.content).toContain("UNIQUE_QUESTION_TOKEN");
    // The Anthropic API always processes `system` before `messages`, so placing
    // dynamic content exclusively in `messages` guarantees it comes after the
    // cached breakpoint structurally, not just by string position.
  });
});
