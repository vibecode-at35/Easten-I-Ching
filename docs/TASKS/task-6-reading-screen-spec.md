# Task 6 — The Reading Screen

*The final visual piece of M3. The oracle speaks. A person sees their hexagram, seal, and question, then receives the interpretation streaming in real-time on a warm, classical screen. This is where the product becomes an experience.*

**Scope:** Build only this screen. Wire it to the existing `/api/interpret` endpoint and the ceremony flow from Task 5. Nothing more.

---

## 1. Layout — Left/Right with responsive stacking

### Desktop (≥768px)
```
[Hexagram + Seal]  |  [Question + Reading streams in]
     Left (30%)    |        Right (70%)
```

- **Left column** (30%): fixed width or flex-basis
  - Hexagram glyph (the six lines, centered)
  - Seal below it (印章, with name/number)
  - Plenty of whitespace around; calm and stable
  
- **Right column** (70%): reading text flows in
  - User's question at the very top, in `ink-muted`, serif, ~18px
  - Empty space below (where the reading will arrive)
  - The interpretation streams in progressively, word by word
  - Text is serif (`Noto Serif`), `ink` color, ~18px, line-height ~1.75
  - Generous left/right padding

- **Divider**: optional subtle `hairline` vertical line between columns (low opacity)

### Mobile (<768px)
```
[Question]
[Hexagram + Seal, centered]
[Reading streams in below]
```

Stack vertically. Hexagram centered. Reading text below. Same token spacing/sizing. Full-width padding.

---

## 2. The reading stream behavior

**Fetch the interpretation:**
- On mount, call `POST /api/interpret` with:
  ```json
  {
    "hexagramId": 1,
    "changingLines": [...],
    "question": "should i visit my friend",
    "context": { }
  }
  ```
- Pass `Accept: text/event-stream` (or rely on the agent's streaming setup from M2)
- The response is a stream of tokens/chunks arriving over time

**Progressive render:**
- As chunks arrive, append them to the reading text
- The text should grow word-by-word (or sentence-by-sentence, at the granularity the API returns)
- No buffering; display arrives in real time
- Use a `<div>` or `<p>` to hold the text; append text nodes as they arrive

**Visual feedback while streaming:**
- No spinner (no loading animation; the arriving text is the signal)
- Cursor blink is fine if it's subtle
- Once the stream ends, the text sits complete

---

## 3. Error handling — calm fallbacks

**422 (unseeded hexagram):**
- Display: "The oracle is still learning about this question. Try asking again."
- Styled in `ink-muted`, serif, centered in the reading area
- An "Ask another" button below (styled cinnabar outline, matches the ceremony button)

**502 or network error:**
- Display: "The connection faltered. Please try again."
- Same styling and button

**Timeout (stream doesn't complete within 30s):**
- Display the partial reading that arrived
- Add a note in `ink-muted` below: "The reading was interrupted."
- "Ask another" button still available

**Do not:**
- Show raw error codes or stack traces
- Show "Something went wrong" generic messages
- Show loading spinners or skeleton screens (they break the calm feeling)

---

## 4. The components and data flow

**Receives from Task 5 (`CastingCeremony`):**
- `castResult: CastResult` (hexagram ID, primary/resulting, changing lines, etc.)
- `question: string` (the user's question)

**Displays:**
- `<HexagramGlyph castResult={...} size="large" />` (reuse from Task 2)
- `<Seal hexagramId={castResult.hexagramId} />` (reuse from Task 3)
- Question text in serif
- Streaming reading text below/beside

**On "Ask another":**
- Call `onReset()` prop (passed from `page.tsx`)
- Return to the question entry screen (Task 4)
- Clear the form, ready for a new question

---

## 5. Design — warm-traditional tokens

- **Background:** `paper-base` (`#EFE7D6`)
- **Text:** `ink` (`#3A2E1C`) for reading, `ink-muted` for question
- **Serif font:** `Noto Serif` (reading text breathes at ~18px, ~1.75 line-height)
- **Button:** cinnabar outline on transparent (same as ceremony button)
- **Divider (optional):** `hairline` token, very faint
- **No colors other than paper, ink, and cinnabar.** The screen is reverent.

---

## 6. Responsive requirements

- **Desktop (≥768px):** left/right layout, left column fixed or flex-stable
- **Tablet (480–767px):** still left/right but tighter; hexagram smaller if needed
- **Mobile (<480px):** full vertical stack, full-width text, same padding/spacing rhythm
- **All sizes:** hexagram and seal stay proportional; text stays readable

---

## 7. Dev toggle

Wire the `?devHexagram=1` or `?devHexagram=2` query param (already supported from Task 5):
- If set, the reading screen receives that forced hexagram ID
- Otherwise, uses the real cast result
- This allows manual testing of the reading screen without re-casting

---

## 8. Acceptance criteria (testable)

- [ ] Layout is left/right on desktop, vertical-stack on mobile
- [ ] Question displays at the top
- [ ] Hexagram glyph and seal render correctly
- [ ] Reading streams in from `/api/interpret`, displaying word-by-word
- [ ] Stream completes and text sits stable
- [ ] 422 error shows calm fallback
- [ ] 502 error shows calm fallback
- [ ] Network failure shows calm fallback
- [ ] "Ask another" button returns to question entry
- [ ] No spinners, no loading states, no raw errors visible
- [ ] Warm-traditional tokens applied throughout
- [ ] `tsc --noEmit` clean
- [ ] Test suite passes (138/138)

---

## 9. Non-goals (reminder)

- No saving the reading
- No sharing, social, or engagement mechanics
- No "related readings" or recommendations
- No UI chrome beyond the essentials
- No Master character or memory features

---

## 10. Suggested implementation order

1. Build the layout component (`ReadingScreen.tsx`) with left/right structure (desktop) and responsive stacking
2. Add hexagram/seal/question display (reuse existing components)
3. Wire to `POST /api/interpret`, begin streaming, progressive text render
4. Add error fallbacks for 422, 502, network
5. Add "Ask another" button and routing back to question entry
6. Manual test: force a hexagram via dev toggle, watch the reading stream in
7. Test error states: submit an unseeded hexagram to trigger 422, force a 502, pull network cable
8. Responsive pass: view on mobile and tablet sizes
9. Verify tokens and styling are clean; no hardcoded colors

---

## 11. One structural note

Once Task 6 is complete, M3 is done — the core loop (ask → cast → read) works end-to-end. The product is shippable. M4 (persistence) and M5 (memory/companion) are sequels, not corrections.

Before committing Task 6, you'll want to:
- Walk through the full flow on real question examples (not just the dev toggle)
- Check that the reading feels *responsive* and *alive* (streaming helps with this)
- Confirm the error fallbacks feel calm, not alarming
- Make sure the warm-traditional feeling holds end-to-end

This is the capstone of this milestone. Build with care.
