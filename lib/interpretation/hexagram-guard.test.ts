import {
  buildForbiddenIdentities,
  findFabricatedHexagramReferences,
  HexagramFabricationError,
  type AllowedHexagrams,
} from "./hexagram-guard";

// ─── buildForbiddenIdentities ────────────────────────────────────────────────

describe("buildForbiddenIdentities", () => {
  it("excludes only the primary hexagram when there is no resulting hexagram", () => {
    const allowed: AllowedHexagrams = { primaryNumber: 1, resultingNumber: null };
    const forbidden = buildForbiddenIdentities(allowed);

    expect(forbidden).toHaveLength(63);
    expect(forbidden.find((h) => h.number === 1)).toBeUndefined();
    expect(forbidden.find((h) => h.number === 43)).toEqual({ number: 43, nameZh: "夬" });
  });

  it("excludes both primary and resulting hexagrams when a resulting hexagram exists", () => {
    const allowed: AllowedHexagrams = { primaryNumber: 11, resultingNumber: 36 };
    const forbidden = buildForbiddenIdentities(allowed);

    expect(forbidden).toHaveLength(62);
    expect(forbidden.find((h) => h.number === 11)).toBeUndefined();
    expect(forbidden.find((h) => h.number === 36)).toBeUndefined();
  });
});

// ─── findFabricatedHexagramReferences ────────────────────────────────────────

describe("findFabricatedHexagramReferences", () => {
  const hex1Only: AllowedHexagrams = { primaryNumber: 1, resultingNumber: null };

  it("returns no violations for clean text referencing only the allowed primary hexagram", () => {
    const text =
      "Hexagram 1, Qián, is pure heaven, six unbroken lines, ceaseless creative motion. " +
      "The judgment speaks of what is great and originating.";
    expect(findFabricatedHexagramReferences(text, hex1Only)).toEqual([]);
  });

  it("detects a forbidden hexagram referenced by its exact Chinese name", () => {
    const text = "This situation calls for resolute action — the hexagram of breakthrough, 夬, applies here.";
    const violations = findFabricatedHexagramReferences(text, hex1Only);
    expect(violations).toEqual(["#43 (夬)"]);
  });

  it("detects a forbidden hexagram referenced by its #NN number form", () => {
    const text = "Resulting hexagram: #43 — a transformation toward resolute action.";
    const violations = findFabricatedHexagramReferences(text, hex1Only);
    expect(violations).toEqual(["#43 (夬)"]);
  });

  it("does not false-positive on a larger number that merely contains the forbidden number's digits", () => {
    const text = "There are #430 considerations and also hexagram #143 mentioned nowhere real.";
    const violations = findFabricatedHexagramReferences(text, hex1Only);
    expect(violations).not.toContain("#43 (夬)");
  });

  it("never flags the allowed primary hexagram's own number or name", () => {
    const text = "Hexagram #1, 乾 (Qián), pure creative force, six unbroken lines.";
    expect(findFabricatedHexagramReferences(text, hex1Only)).toEqual([]);
  });

  it("never flags the allowed resulting hexagram when one legitimately exists", () => {
    const allowed: AllowedHexagrams = { primaryNumber: 11, resultingNumber: 36 };
    const text =
      "Primary hexagram #11 泰 (Tài) moves toward the resulting hexagram #36 明夷 (Míng Yí), " +
      "as the changing line shifts.";
    expect(findFabricatedHexagramReferences(text, allowed)).toEqual([]);
  });

  it("still flags a third, unrelated hexagram even when a legitimate resulting hexagram is present", () => {
    const allowed: AllowedHexagrams = { primaryNumber: 11, resultingNumber: 36 };
    const text = "Primary #11 泰 moves toward #36 明夷, echoing the spirit of #43 夬 as well.";
    const violations = findFabricatedHexagramReferences(text, allowed);
    expect(violations).toEqual(["#43 (夬)"]);
  });

  it("REPRODUCES TODAY'S LIVE FAILURE: a Hexagram-1, no-changing-lines cast whose output mentions Guài/#43 must be caught", () => {
    // Paraphrase of the actual fabricated output from the live test that prompted this guard:
    // a forced Hexagram 1 cast with changingLinePositions: [] and resultingHexagram: null,
    // whose generated reading nonetheless invented five changing lines and a transformation.
    const fabricatedOutput = `
Hexagram 1, Qián, pure Heaven, six unbroken lines.

Changing lines:
- Line 1 (bottom): [A dragon lies hidden. It is not the time for active doing.]
- Line 2: [We see the dragon appearing in the field.]
- Line 3: [Danger. No blame.]
- Line 5: [The flying dragon is in the heavens.]
- Line 6 (top): [There will be occasion to repent of the confidence felt in superior strength.]

Resulting hexagram: #43 Guài (夬) — Judgment: Guai requires the exhibitor of it to proclaim
his resolve in the royal court, to announce it with truth and sincerity.
    `;

    const violations = findFabricatedHexagramReferences(fabricatedOutput, hex1Only);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations).toContain("#43 (夬)");
  });
});

// ─── HexagramFabricationError ────────────────────────────────────────────────

describe("HexagramFabricationError", () => {
  it("carries the found references without including them in the public message", () => {
    const err = new HexagramFabricationError(["#43 (夬)"]);
    expect(err.foundReferences).toEqual(["#43 (夬)"]);
    expect(err.message).not.toContain("43");
    expect(err.message).not.toContain("夬");
    expect(err.name).toBe("HexagramFabricationError");
  });
});
