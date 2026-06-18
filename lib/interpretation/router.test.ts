import * as fs from "fs";
import * as path from "path";
import { interpret, extract, resolveModel, EXTRACTION_MODEL, ModelRequestError, type ModelClient } from "./router";
import type { AssembledPrompt } from "./prompt";

function makeAssembledPrompt(): AssembledPrompt {
  return {
    system: [{ type: "text", text: "static house voice", cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: "dynamic per-request content" }],
  };
}

async function drain(iterable: AsyncIterable<string>): Promise<string[]> {
  const chunks: string[] = [];
  for await (const chunk of iterable) {
    chunks.push(chunk);
  }
  return chunks;
}

// ─── Model routing ────────────────────────────────────────────────────────────

describe("resolveModel", () => {
  it("default tier resolves to claude-sonnet-4-6", () => {
    expect(resolveModel("default")).toBe("claude-sonnet-4-6");
  });

  it("premium tier resolves to claude-opus-4-8", () => {
    expect(resolveModel("premium")).toBe("claude-opus-4-8");
  });

  it("defaults to the default tier when omitted", () => {
    expect(resolveModel()).toBe("claude-sonnet-4-6");
  });
});

// ─── Streaming via an injected (mocked) client — no live API calls ───────────

describe("interpret — streaming via injected client", () => {
  it("calls client.messages.stream with the resolved model and the exact assembled prompt", async () => {
    const prompt = makeAssembledPrompt();
    let capturedParams: unknown;
    const client: ModelClient = {
      messages: {
        stream: (params) => {
          capturedParams = params;
          return { async *[Symbol.asyncIterator]() {} };
        },
      },
    };

    const chunks = await drain(interpret(prompt, "premium", client));

    expect(capturedParams).toMatchObject({
      model: "claude-opus-4-8",
      system: prompt.system,
      messages: prompt.messages,
    });
    expect(chunks).toEqual([]);
  });

  it("both tiers route through the same interpret() entry point", async () => {
    const seenModels: string[] = [];
    const client: ModelClient = {
      messages: {
        stream: (params) => {
          seenModels.push(params.model);
          return { async *[Symbol.asyncIterator]() {} };
        },
      },
    };

    await drain(interpret(makeAssembledPrompt(), "default", client));
    await drain(interpret(makeAssembledPrompt(), "premium", client));

    expect(seenModels).toEqual(["claude-sonnet-4-6", "claude-opus-4-8"]);
  });

  it("yields only content_block_delta/text_delta content, skipping other event types", async () => {
    const events: unknown[] = [
      { type: "message_start", message: {} },
      { type: "content_block_delta", delta: { type: "text_delta", text: "Hello" } },
      { type: "content_block_delta", delta: { type: "text_delta", text: ", world" } },
      { type: "content_block_delta", delta: { type: "input_json_delta", partial_json: "{}" } },
      { type: "message_stop" },
    ];
    const client: ModelClient = {
      messages: {
        stream: () => ({
          async *[Symbol.asyncIterator]() {
            for (const e of events) yield e;
          },
        }),
      },
    };

    const chunks = await drain(interpret(makeAssembledPrompt(), "default", client));
    expect(chunks.join("")).toBe("Hello, world");
  });

  it("wraps a synchronous stream() failure in ModelRequestError without leaking the original message", async () => {
    const secretError = new Error("Authorization failed for key sk-ant-SECRET12345");
    const client: ModelClient = {
      messages: {
        stream: () => {
          throw secretError;
        },
      },
    };

    let caught: unknown;
    try {
      await drain(interpret(makeAssembledPrompt(), "default", client));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ModelRequestError);
    expect((caught as Error).message).toBe("The interpretation model request failed.");
    expect((caught as Error).message).not.toContain("sk-ant-SECRET12345");
    expect((caught as ModelRequestError).cause).toBe(secretError);
  });

  it("wraps a mid-stream iteration failure in ModelRequestError, preserving chunks already yielded", async () => {
    const secretError = new Error("token sk-ant-SECRET67890 rejected");
    const client: ModelClient = {
      messages: {
        stream: () => ({
          async *[Symbol.asyncIterator]() {
            yield { type: "content_block_delta", delta: { type: "text_delta", text: "partial" } };
            throw secretError;
          },
        }),
      },
    };

    const chunks: string[] = [];
    let caught: unknown;
    try {
      for await (const chunk of interpret(makeAssembledPrompt(), "default", client)) {
        chunks.push(chunk);
      }
    } catch (err) {
      caught = err;
    }

    expect(chunks).toEqual(["partial"]);
    expect(caught).toBeInstanceOf(ModelRequestError);
    expect((caught as Error).message).not.toContain("sk-ant-SECRET67890");
  });
});

// ─── Phase 1: extract() — cheap grounding-extraction model ──────────────────

describe("extract — Phase 1 grounding model, same router", () => {
  it("EXTRACTION_MODEL is claude-haiku-4-5", () => {
    expect(EXTRACTION_MODEL).toBe("claude-haiku-4-5");
  });

  it("calls client.messages.stream with the extraction model id (not a reading tier)", async () => {
    const prompt = makeAssembledPrompt();
    let capturedParams: unknown;
    const client: ModelClient = {
      messages: {
        stream: (params) => {
          capturedParams = params;
          return { async *[Symbol.asyncIterator]() {} };
        },
      },
    };

    await drain(extract(prompt, client));

    expect(capturedParams).toMatchObject({
      model: "claude-haiku-4-5",
      system: prompt.system,
      messages: prompt.messages,
    });
  });

  it("yields text_delta content the same way interpret() does", async () => {
    const client: ModelClient = {
      messages: {
        stream: () => ({
          async *[Symbol.asyncIterator]() {
            yield { type: "content_block_delta", delta: { type: "text_delta", text: '{"a":1}' } };
          },
        }),
      },
    };

    const chunks = await drain(extract(makeAssembledPrompt(), client));
    expect(chunks.join("")).toBe('{"a":1}');
  });

  it("wraps stream failures in ModelRequestError, same as interpret()", async () => {
    const secretError = new Error("key sk-ant-SECRET-EXTRACT failed");
    const client: ModelClient = {
      messages: {
        stream: () => {
          throw secretError;
        },
      },
    };

    let caught: unknown;
    try {
      await drain(extract(makeAssembledPrompt(), client));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ModelRequestError);
    expect((caught as Error).message).not.toContain("sk-ant-SECRET-EXTRACT");
  });
});

// ─── Single entry point: SDK isolation ────────────────────────────────────────

describe("SDK isolation", () => {
  it("@anthropic-ai/sdk is imported only in lib/interpretation/router.ts", () => {
    const root = path.resolve(__dirname, "..", "..");
    const offenders: string[] = [];

    function walk(dir: string): void {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
          const content = fs.readFileSync(full, "utf8");
          if (content.includes("@anthropic-ai/sdk")) {
            offenders.push(path.relative(root, full).split(path.sep).join("/"));
          }
        }
      }
    }

    for (const dir of ["lib", "app"]) {
      const fullDir = path.join(root, dir);
      if (fs.existsSync(fullDir)) walk(fullDir);
    }

    expect(offenders).toEqual(["lib/interpretation/router.ts"]);
  });
});
