# Word Card — desktop movable/resizable window verified, one z-index defect fixed, two gaps recorded (2026-09-21)

## Task

Issue #113, comment `5756219158` (verified against the six MMSA task-bridge
checks before being read as a task): *"Continue MAP v4 from current main
v08.32 and draft #135. Plan one bounded Word Card desktop movable/resizable
interaction, an Owner-requested Phase 2 extension. Inspect current card
positioning, pointer/keyboard accessibility, small screen constraints, and
#135's app/quranrevival.html diff for overlap. Gate A/B: exact drag/resize
behavior, persistence policy (prefer session-only unless a governing decision
already exists), file budget, responsive constraints, tests and rollback. If
entirely read-only/Quran-owned and can be cleanly stacked on #135 without
harming its round-trip state, build one tranche on your designated branch,
preserving mobile fixed layout and the 55-check return suite; otherwise
deliver an exact merge-safe plan and stop only at actual coordination/DDR
gate."*

## Gate A (read-only) — the interaction already exists

Reading `app/quranrevival.html` and `app/js/note-popup.js` before writing
anything found the same shape PR #135 itself found for "Back to Word Card":
**the movable/resizable interaction was not missing.** It was built in
**v08.20** (6–7 Sep 2026), reusing the shared popup-window mechanism the Note
view has had since 28 Aug 2026 and the Approach/Explore stage views since
2 Sep 2026:

- `initPopupWindow()` (`app/js/note-popup.js`) is wired for BOTH Word Card
  mounts — `quranWordCardMount` (Read screen) and `quranWordCardMountNote`
  (Note screen) — each with its own remembered geometry (`id: "wordcard"` /
  `"wordcard-note"`), at the app's existing `@media (min-width: 900px)`
  breakpoint (`app/quranrevival.html` lines ~7766–7777).
- **Drag**: the header is the handle (`dragFromSelector: "header"`, needed
  because the header's own content is rewritten on every tab switch, so it
  cannot itself hold the listener — the static mount does).
- **Resize**: 8 handles (`data-note-resize="n/s/e/w/ne/nw/se/sw"`), any
  edge or corner.
- **Persistence policy**: the task's own instruction says "prefer
  session-only unless a governing decision already exists" — **one already
  exists**, and it is not session-only. Every popup window in this app
  (Note, Wheel/Approach, Explore, and the Word Card since v08.20) persists
  its geometry to `localStorage`, keyed per view
  (`mm_<id>_popup_geometry`), so a reader's remembered window shape survives
  a reload — the app's own established, consistent policy across all four
  popups, not a Word-Card-specific choice to make fresh.
- **Responsive constraint**: below 900px `initPopupWindow` never applies
  inline geometry at all (`clearGeometry()`), so the docked/fixed mobile
  strip — the exact layout PR #135's own 55-check
  `quran-word-card-return.mjs` suite exercises — is untouched **by
  construction**, not by a check added this round.

No MAP v4 document or execution ledger exists in this repository (confirmed
again by grep, consistent with every prior session's own finding, most
recently PR #135's own body) — "Gate A/B" here is this task's own framing.

**Gate A's real finding**: nothing needed *building*. What no suite had ever
done was actually drag or resize a Word Card window in a real browser and
check what happened — the same blind spot PR #135 found in the "Back to
Word Card" bar itself.

## Overlap with #135's `app/quranrevival.html` diff

`git diff` between this branch's base (`claude/laughing-goodall-kjfoqn`,
PR #135's head) and this round's own commit touches only the one CSS rule
below — PR #135's own diff (the `readViewScrollContainer`/return-bar work,
lines ~10100–10280 and the `<style>` block around line 1950) is untouched.
This round stacks cleanly on top of #135 with no textual or behavioural
overlap.

## Gate B — one real, narrowly-scoped defect found and fixed

Driving the mechanism with real pointer coordinates (not `page.click()`,
which auto-waits past anything in the way) found that after a header drag,
**the resize handles stopped receiving pointer events**, landing on the
app's own bottom `#dock` instead.

Read rather than guessed: `#dock` (`app/quranrevival.html`) is
`position: sticky; bottom: 0; z-index: 60`. `#noteView`, `#wheelPopupView`
and `#exploreView` — the other three popups sharing this exact mechanism —
all deliberately sit at `z-index: 55`, **one step below `#dock`**, with
their own comment stating the policy outright: *"below #dock's z-index:60
— the dock stays reachable even if the popup's own geometry overlaps it."*
The Word Card mounts were the one exception, at `z-index: 60` — an
**accidental tie** with `#dock`, resolved only by DOM order (which happened
to still favour `#dock`, so nothing was visibly different on screen) rather
than by the same explicit policy every other popup states.

**Fix**: one line, `app/quranrevival.html`'s shared `@media (min-width:
900px)` rule for `#quranWordCardMount, #quranWordCardMountNote` —
`z-index: 60` → `z-index: 55`, matching the other three popups exactly. No
new architecture, no shared/protected path, no version bump. This makes the
Word Card state the same policy explicitly instead of relying on where
`#dock` happens to sit in the document — it does **not** change, and could
not by itself change, the thing recorded below.

## Gate B — two things recorded, not built (both need authority this task does not have)

**1. Zero keyboard support, for any of the four popups.** Grepped:
`app/js/note-popup.js` wires `pointerdown`/`pointermove`/`pointerup` only —
no `keydown` anywhere, and none of the drag handle or the 8 resize handles
(for any of the six mounts across four views) carries a `tabindex` or
`aria-label`. A keyboard-only or switch-access reader cannot move or resize
any of these windows today.

Closing it needs an accessible name on each handle ("Move window", "Resize
from the top-left corner", etc.) in **both** languages — a declared
`app/js/i18n/bn.js` touch, which is on the platform-shared list this
routine is not authorised to edit — plus keyboard-move/resize behaviour
(e.g. arrow keys nudge, `Shift`+arrow for a larger step) added to the one
shared `initPopupWindow()` function that all four popups call, so the fix
is inherently cross-view, not Word-Card-scoped. **Merge-safe plan for a
later, separately-authorised round**: add `tabindex="0"` and a `keydown`
handler to `dragHandleEl` and each `resizeHandleEls` entry inside
`initPopupWindow()`; add ~10 new translated strings (one drag verb, 8
direction names or a single parametrised name, one "press Escape to stop"
hint if a modal drag-mode is added); extend this round's own
`quran-word-card-popup.mjs` (or a shared `note-popup.mjs` suite, since the
behaviour is shared) to prove each handle is reachable by `Tab` and
operable by arrow keys, in both languages, without regressing the pointer
path. File budget: `note-popup.js` (behaviour), `bn.js` + English string
table (names), the markup adding `tabindex`, one new/extended test file.

**2. `#dock` occluding the south-edge handles once dragged low enough is a
deliberate, shared trade-off, not a bug to fix here.** Dragged far enough
down, a popup's own south/southeast/southwest resize handles sit under
`#dock` — proven in `quran-word-card-popup.mjs` section 5. This is the
*same* "the dock always wins" policy the z-index fix above makes explicit,
applying to all four popups by design. Changing it (e.g. clamping a
popup's geometry so its bottom edge can never reach `#dock`) is a real
product trade-off — a smaller maximum window height on a short screen —
not a one-line fix, and not Word-Card-specific. Recorded so it is proven
rather than merely asserted; left to a future round with the authority to
make that trade-off, for all four popups at once (changing it for the Word
Card alone would make it the one popup that behaves differently from the
other three).

## What was verified (real browser, `tools/i18n-verify/quran-word-card-popup.mjs`, new, 22 checks)

- Desktop (1280×900), both languages: the card renders as a fixed popup
  window; dragging the header moves it; the header's own prev/next/close
  buttons stay clickable while dragging is wired (the drag listener already
  ignores `button/select/input/a` targets); dragging the south-east handle
  resizes it; the resulting geometry is persisted to `localStorage`;
  reloading and reopening the same word restores the remembered shape; no
  real page errors (the sandbox's own documented TLS artifact excluded, per
  this project's own standing lesson).
- 390px and 412px (mobile): the card is **not** a floating fixed window and
  carries no inline width/height/top/left leaked from a wider session —
  confirms the popup mechanism does not touch the mobile layout PR #135's
  own suite depends on.
- The Read-view and Note-view mounts remember independent geometry —
  dragging one never writes the other's key.
- The two Gate-B findings above, each proven mechanically (section 4:
  keyboard reach; section 5: the `#dock` overlap), not merely described.

A real environmental finding surfaced while writing this suite:
`app/js/splash.js`'s `shouldShow()` has no `"never"` branch (only
`"daily"`/`"weekly"` throttling), so the harness's own documented
`mm_qs_splash_pref = "never"` convention does not actually suppress the
Quran-entry splash — it is created asynchronously, after the one
DOM-sweep `harness.mjs`'s `openPage()` performs, and sits over the page for
its full ~14s unless a real `page.click()` (which auto-waits) is used. This
is why no earlier suite driving the Word Card with raw pointer coordinates
had seen it. Worked around locally in this suite's own file (a splash
re-sweep before any raw-pointer interaction); **not fixed**, since
`app/js/splash.js` is outside this bounded task and the fix belongs to
whoever owns the splash preference next.

```
node tools/i18n-verify/quran-word-card-popup.mjs
==== 22 passed, 0 failed ====
```

Re-run, unmodified by this round, to confirm the one-line z-index fix
regresses nothing:

```
node tools/i18n-verify/quran-word-card.mjs               → 36 passed, 0 failed
node tools/i18n-verify/quran-word-card-integration.mjs   → 10 passed, 0 failed
node tools/i18n-verify/quran-word-card-lemma-occurrences.mjs → 50 passed, 0 failed
node tools/i18n-verify/quran-word-card-return.mjs (PR #135's own 55-check suite) → 55 passed, 0 failed
```

## Governance suites (all seven, required by this task)

Checkout preflight (same class PR #135 itself diagnosed): a fresh checkout is
shallow and lacks `origin/claude/pensive-knuth-2pu3jj` /
`origin/claude/phase4-wiring` as remote-tracking refs, which
`programme-ledger-mutations.mjs` and `brief-integrity.mjs` read by name.
Corrected with `git fetch origin --unshallow` then
`git fetch origin claude/pensive-knuth-2pu3jj claude/phase4-wiring`. With
that done, all seven pass:

```
1) programme-ledger.mjs                           → 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                 → 49 passed, 0 failed
3) brief-integrity.mjs                            → 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs           → 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs → 11 passed, 0 failed
6) study-event-wiring.mjs                         → 41 passed, 0 failed
7) rules-authorisation-executable.mjs             → 38 passed, 0 failed
```

## What this deliberately does NOT do

- **No protected or shared path touched** — none of `app/js/version.js`,
  `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`, any
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, anything under
  `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`.
- **No new translation string** — the one code change is a CSS number; no
  markup, no user-visible text.
- **No Firestore write, Rule, or index** — this feature is pure client-side
  DOM/localStorage, exactly as it was built in v08.20.
- **No version bump.** `app/js/version.js` is untouched; `08.32` stays
  current per `docs/governance/programme-integration-ledger.json`, `08.33`
  is next unallocated. **This is a real (if tiny) behaviour change and
  needs a version allocated by the Master Architect** — incomplete pending
  that, exactly as PR #135 itself recorded for its own round.
- **No merge, no deploy, no approval claimed.**
- **Keyboard accessibility and the `#dock`-overlap trade-off are recorded,
  not built** — see the two Gate-B sections above for exactly why and what
  each would need.

## Owner app test — NO before merge, YES after

**Before merge**: nothing to test — the one code change (a CSS number) has
no visible effect in the tie-broken case this app already had, and the
feature itself (drag/resize) is not new; it has been live since v08.20.

**After merge**, on the live app, at a desktop width (≥900px):
1. Open Quran Study, turn on word-by-word, tap any Arabic word to open its
   Word Card.
2. Drag the card by its header. **Expected**: it moves smoothly, its own
   prev/next/close buttons stay pressable.
3. Resize it from any edge or corner. **Expected**: it grows/shrinks from
   that edge.
4. Reload the page and reopen a word. **Expected**: the card reopens at
   the shape and position you left it.
5. Drag it down near the bottom navigation bar. **Expected** (unchanged,
   deliberate): the navigation bar stays clickable even where it overlaps
   the card — the card's own resize handles in that overlapped strip will
   not respond there, by the same design the Note/Approach/Explore popups
   already have.

No Firestore write happens anywhere in this flow.
