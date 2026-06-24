# Voice & Character — Design Brief

*Captured at the end of a long working session. Nothing here is implemented yet — this is a clean starting point to pick up with a fresh mind. Two related ideas: a near-term voice refinement (Part 1) and a longer-term character concept (Part 2).*

---

## Context: where the voice stands today

The reading voice has been validated as **correct** (grounded in real texts, no fabricated situations, no fabricated hexagrams — both failure modes now caught structurally) and is **largely good** in quality. On the hard test questions (a prophecy demand, a moral dilemma) it declined to predict gracefully, held weight with care, and offered genuine insight. The remaining work is *craft*, not bug-fixing.

One pattern surfaced: the voice does excellent indirect work — offering the hexagram's image and the real tension — and then often **appends the moral** ("Qián counsels you toward what endures," "it counsels against inaction"). That closing step is what Parts 1 and 2 below are both responses to.

---

## Part 1 — The Upāya principle (near-term; refines the existing voice)

### The realization
The most elegant readings work the way indirect teaching works: a wise teacher doesn't hand you the answer, they create the conditions for you to find it yourself. Upāya (Buddhist "skillful means"), Socratic maieutics ("midwifery" — helping someone give birth to what they already know), the Buddha's raft (useful to cross the river, not to carry afterward), Kierkegaard on indirect communication (existential truths can't be directly transmitted — told "let go of your ego," you've only received information; arriving at it through a parable, you've *lived* it).

This isn't a bolt-on. The I Ching is *itself* an indirect-teaching device — it hands you an image (a dragon, heaven in motion, a well) and lets you find yourself in it. The voice should align with what the oracle already is.

### The concrete principle (for `INTERPRETATION_PROMPT.md`)
- The reading offers the hexagram's **image** and the **genuine tension** between it and the person's question — then **trusts the person to arrive** at their own meaning.
- It does **not** tell them what the hexagram "counsels," what it "asks of them," or what they should conclude. The moment it states the lesson, the parable self-destructs and becomes mere instruction — and the ego gets a handle to push back against.
- End on a **question or an image to sit with**, never a verdict or a "should."
- Frame this as a *positive* principle (how to land a reading), not a restriction.

### Status
Scoped and ready to implement as a prompt refinement. This is the cheap, high-value next step on the voice itself. **Best validated against more than one hexagram** — see the note below.

### Important prerequisite
The voice has only ever been seen on **Hexagram 1 (Qián)** — the single most action-oriented hexagram in the book. Some of the "lean toward action" we observed may simply be *Qián being Qián*. Before tuning hard against the lean, see the voice on a **receptive** hexagram (e.g. Kūn, #2) — the lean may look completely different or invert. This argues for **extending the demo corpus to a second hexagram** before refining the voice further. (Hexagram 2 is also the natural pair to 1 and unlocks the changing-line path, never yet tested.)

---

## Part 2 — The Master (longer-term character concept)

### The concept
An occasional figure — a teacher — who appears at certain moments (e.g. when the user seems confused or stuck) to offer perspective through **indirection**: parable, story, the Upāya move. Distinct from the base reading voice; a separate *mode*, not a flavor applied to every reading.

### Decisions made (this session)
1. **Occasional, not omnipresent.** The base reading voice stays as-is. The character is a separate layer that appears *sometimes*, not on every reading. (This also keeps the persona from fighting the grounding discipline on every call.)
2. **Tradition: blended, but researched and intentional** — not a vague "Eastern wisdom" smoothie, and not a trope.
3. **Bound by the same contract as the base voice** — no invented hexagram content, no invented situations, no "the master recalls an ancient tale…" that smuggles fabrication back in.
4. **This is downstream of M3.** "Appears when the user feels confused" is an *interaction feature* — it needs a UI, a session, and a confusion signal. None of that exists yet (today there's only an API + a terminal script). The character can be **designed** now, but **built** only once there's a user to appear to.

### Cautions to honor (so the good version gets built, not the trope)
- **The authenticity tightrope.** "Mysterious Asian master on a US mountain" is, untreated, a stock Western trope. The product's *entire* differentiation is treating this tradition with seriousness for an audience (Vietnamese/Chinese) who live it. A cliché character could undercut exactly that strength. Doable well — but only with a genuinely specific, non-trope figure.
- **Tradition coherence.** The I Ching is **Chinese — Taoist/Confucian**, not Buddhist. A "secret Buddhist master" reading the I Ching risks muddling traditions in a way knowledgeable users notice instantly. *However:* there is a real, honest bridge — **Chan/Zen Buddhism emerged from Buddhism meeting Taoism in China**, so a figure standing at the Chan/Taoist/Confucian confluence can be historically grounded rather than a muddle — *if* built on the real connections. (Research this properly before committing.)
- **Persona vs. grounding.** A richly-drawn character *invites* the model to embellish and improvise — the opposite of the discipline just hard-won against fabrication. The character's rules must explicitly forbid this.

### Open questions (resolve before building)
- **Who is this character, specifically?** A real point of view, background, and name — specific enough to escape the trope. What do they actually believe?
- **Which tradition, made coherent?** Lean into the Chan/Taoist/Confucian confluence? How is it presented so a knowledgeable user nods rather than winces?
- **How does the voice differ** from the base reading voice? What makes it recognizably *them*? How does it embody Upāya (parable, indirection)?
- **What triggers their appearance,** and how is "confusion" detected? (Specify for when M3 exists.)
- **Do they speak *the reading*, or appear *alongside* it** as a separate intervention?
- **How are they constrained** against fabrication while still feeling like a character?

### Eventual home
A `docs/CHARACTER.md` design doc, written the same way specs were written before code — get the character right on paper, test it on a couple of contrasting hexagrams, *then* build.

---

## Suggested next-session order
1. **Extend demo corpus to Hexagram 2 (Kūn)** — cheap; unlocks fair voice judgment on a receptive hexagram *and* the changing-line path.
2. **Implement the Upāya principle** in `INTERPRETATION_PROMPT.md`; test on Qián *and* Kūn.
3. **Design the Master character** on paper (`docs/CHARACTER.md`), resolving the open questions above — fresh mind, not tired.
4. Character as a *feature* (conditional appearance) waits until **M3** gives it a user to appear to.
