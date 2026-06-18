// scripts/first-reading.mjs
//
// First live reading — forces a Hexagram 1 (Qián) cast with NO changing lines
// and calls POST /api/interpret, then streams the reading to your terminal.
//
// WHY Hexagram 1 with no changing lines: the demo corpus only has real text for
// Hexagram 1 (en + zh). All-young-yang (six 7s) => all-yang => Hexagram 1, with
// no changing lines, so the reading needs only Hexagram 1's judgment + image.
//
// PREREQUISITES
//   1. ANTHROPIC_API_KEY is set in .env.local  (never commit it)
//   2. The dev server is running:  npm run dev
//   3. data/hexagrams.demo.json has real Hexagram 1 text (already confirmed)
//
// RUN
//   node scripts/first-reading.mjs
//   (override host if needed:  BASE_URL=http://localhost:3001 node scripts/first-reading.mjs)
//
// NOTE ON FIELD NAMES (read this):
//   The request body and the cast object below follow the project spec
//   (docs/DATA_MODEL.md cast_result shape + the M2 task's { cast, question, locale }).
//   If your actual /api/interpret route or your CastResult type in
//   lib/iching/types.ts uses different field names, adjust the two objects below
//   to match — or hand this file to the agent and ask it to reconcile + run.

const BASE = process.env.BASE_URL || "http://localhost:3000";

// A forced Hexagram 1 cast: all six lines young yang (value 7), nothing changing.
const cast = {
  lines: [1, 2, 3, 4, 5, 6].map((position) => ({
    position,
    value: 7, // 7 = young yang (stable). 6/8 = yin, 9 = old yang (changing).
    type: "young_yang",
    changing: false,
  })),
  primaryHexagram: 1,
  changingLinePositions: [],
  resultingHexagram: null,
  method: "three_coin",
  seed: "demo-hexagram-1",
};

const body = {
  cast,
  locale: "en", // demo corpus has en + zh populated; vi is intentionally absent (will throw)
  question:
    "I feel stuck and I don't know why. Nothing's wrong exactly, but I feel like I'm waiting for something and I can't tell what.",
};

const res = await fetch(`${BASE}/api/interpret`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

if (!res.ok) {
  console.error(`\nHTTP ${res.status} ${res.statusText}`);
  console.error(await res.text());
  console.error(
    "\nCommon causes: dev server not running, ANTHROPIC_API_KEY missing/invalid, " +
    "or the request shape doesn't match the route. See the field-name note at the top.\n",
  );
  process.exit(1);
}

// Stream the reading as it arrives.
const reader = res.body.getReader();
const decoder = new TextDecoder();
process.stdout.write("\n--- READING (Hexagram 1, Qián / The Creative) ---\n\n");
for (; ;) {
  const { value, done } = await reader.read();
  if (done) break;
  process.stdout.write(decoder.decode(value, { stream: true }));
}
process.stdout.write("\n\n--- END ---\n");
