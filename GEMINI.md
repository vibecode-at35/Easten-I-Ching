# GEMINI.md

**Bootstrap file for Google Antigravity.** Antigravity loads this natively but does **not** auto-load `AGENTS.md`, so this file points it there. The single source of truth for behavior rules is `AGENTS.md`.

## Always, at the start of a session

1. **Read `AGENTS.md`** in the project root — it contains the binding behavior rules. Treat it as the authority.
2. Read `README.md` for the documentation map.
3. For the current work, open the active task in `docs/TASKS/` and build **only** that task.
4. Check for nested `AGENTS.md` files in subdirectories for area-specific rules. *(Enable Settings → Agent → "Load nested AGENTS.md files" if available.)*

## Non-negotiable rules (authoritative versions in AGENTS.md)

- **Never let the model compute the hexagram.** Casting, identification, changing lines, and the resulting hexagram are deterministic TypeScript validated against `docs/ICHING_REFERENCE.md`.
- **Never invent I Ching content.** Names, judgments, images, line texts, and the King Wen mapping come only from the reference doc and the seeded corpus.
- **Interpret the question, not just the hexagram.** Ground every LLM call in the exact verified texts.
- **No dark patterns, no ads, ever.**
- **Build only the active task.** No speculative scaffolding. Stop and report when done.

## Notes for Antigravity specifically

- `.agent/` directory conventions (rules/, workflows/, skills/) may be used for Antigravity-native config, but shared rules stay in `AGENTS.md` to remain portable across tools.
- Antigravity-only overrides, if ever needed, go here in `GEMINI.md` (highest user priority) — but prefer keeping one source of truth in `AGENTS.md` and avoid duplicating rules that could drift.

Keep this file thin. Change rules in `AGENTS.md`, not here.
