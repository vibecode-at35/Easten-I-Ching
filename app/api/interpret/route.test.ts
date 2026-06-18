import { NextRequest } from "next/server";

jest.mock("../../../lib/interpretation/interpret", () => ({
  runInterpretation: jest.fn(),
}));

import { runInterpretation } from "../../../lib/interpretation/interpret";
import { MissingHexagramTextError } from "../../../lib/db/hexagrams";
import { ModelRequestError } from "../../../lib/interpretation/router";
import { HexagramFabricationError } from "../../../lib/interpretation/hexagram-guard";
import { POST } from "./route";

const mockedRunInterpretation = runInterpretation as jest.Mock;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/interpret", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const VALID_BODY = {
  cast: { primaryHexagram: 11, changingLinePositions: [2], resultingHexagram: 36 },
  question: "Should I take the new role?",
  locale: "en",
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Streaming: full text reassembles from chunks ────────────────────────────

describe("POST /api/interpret — happy path", () => {
  it("returns 200, streams the reading, and reassembles to the full text", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      yield "Part one. ";
      yield "Part two. ";
      yield "Part three.";
    });

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/plain");

    const text = await res.text();
    expect(text).toBe("Part one. Part two. Part three.");
  });

  it("forwards the validated params (including tier) to runInterpretation", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      yield "ok";
    });

    await POST(makeRequest({ ...VALID_BODY, tier: "premium" }));

    expect(mockedRunInterpretation).toHaveBeenCalledTimes(1);
    expect(mockedRunInterpretation.mock.calls[0][0]).toMatchObject({
      question: VALID_BODY.question,
      locale: "en",
      tier: "premium",
    });
  });
});

// ─── Input validation ─────────────────────────────────────────────────────────

describe("POST /api/interpret — validation", () => {
  it("rejects invalid JSON with 400", async () => {
    const req = new NextRequest("http://localhost/api/interpret", {
      method: "POST",
      body: "{not json",
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(mockedRunInterpretation).not.toHaveBeenCalled();
  });

  it("rejects a missing/empty question with 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, question: "" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/question/i);
    expect(mockedRunInterpretation).not.toHaveBeenCalled();
  });

  it("rejects an invalid locale with 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, locale: "fr" }));
    expect(res.status).toBe(400);
    expect(mockedRunInterpretation).not.toHaveBeenCalled();
  });

  it("rejects an invalid tier with 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, tier: "ultra" }));
    expect(res.status).toBe(400);
    expect(mockedRunInterpretation).not.toHaveBeenCalled();
  });

  it("rejects a malformed cast with 400", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, cast: { primaryHexagram: "eleven" } }));
    expect(res.status).toBe(400);
    expect(mockedRunInterpretation).not.toHaveBeenCalled();
  });
});

// ─── Error handling: safe, sanitized, correctly-coded failures ──────────────

describe("POST /api/interpret — error handling", () => {
  it("maps a grounding failure (missing text) to 422 with a safe message", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      throw new MissingHexagramTextError("hexagram 11 judgment", "en");
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toContain("hexagram 11 judgment");
  });

  it("maps a model request failure to 502 without leaking the underlying cause", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      throw new ModelRequestError(new Error("secret upstream detail sk-ant-XYZ"));
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).not.toContain("sk-ant-XYZ");
  });

  it("maps persisted hexagram fabrication to 502 without leaking which hexagram was fabricated", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      throw new HexagramFabricationError(["#43 (夬)"]);
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).not.toContain("43");
    expect(json.error).not.toContain("夬");

    consoleError.mockRestore();
  });

  it("maps an unexpected error to 500 without leaking internals", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      throw new Error("some unexpected internal detail with secret_token_123");
    });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).not.toContain("secret_token_123");
  });

  it("a failure on the FIRST chunk yields a proper error status, not a broken 200 stream", async () => {
    mockedRunInterpretation.mockImplementation(async function* () {
      throw new MissingHexagramTextError("hexagram 1 image", "vi");
    });

    const res = await POST(makeRequest(VALID_BODY));
    // The bug this guards against: calling an async generator function doesn't
    // run its body until iterated, so a naive implementation would return 200
    // and only fail once the stream is read.
    expect(res.status).toBe(422);
  });
});
