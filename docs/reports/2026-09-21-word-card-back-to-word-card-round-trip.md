# Word Card — "Back to Word Card" round trip verified, two real gaps closed (2026-09-21)

## Task

Issue #113, comment `5754481102` (the bridge's own bounded task, verified
against the six MMSA task-bridge checks before being read as a task): *"MAP v4
next bounded QuranRevival Word Card milestone after Owner-verified v08.32:
inspect the current live Study Word Card navigation and implement a reliable
Back to Word Card action when a Basic Arabic lemma/root occurrence sends the
reader to another ayah. Preserve the original word, tab, expansion/scroll
intent and target ayah; do not create a history trap or break Prev/Next,
language switching or mobile."*

## What already existed, read before anything was built

**Gate A (read-only investigation) came first**, per the task's own "declare
Gate A/B file budget, state model, tests/rollback before building." Reading
`app/quranrevival.html` and `app/js/quran-word-card.js` found the "Back to
Word Card" mechanism was **not missing** — it was built in three earlier,
already-merged rounds (comments in the code read "v08.20", "v08.21", "v08.22")
and reused, unmodified, by PR #112's own lemma-occurrences feature via the
shared `data-word-occurrence-goto` navigation identity:

- `quranWordCardOrigin` — records the word the reader is visiting FROM, the
  tab, the Depth-tab derived form they had expanded, the study screen
  (`unitType`) and scroll position, but **only on the first hop of a chain**,
  so repeated jumps always offer the way back to the true starting word.
- `renderWordCardReturnBar()` / `#wordCardReturnBar` — a control on the study
  screen itself (not inside the card, since v08.22 fixed the card sitting over
  the destination āyah), visible only while an origin exists.
- `returnToWordCardOrigin()` / `openWordOccurrenceAt()` — the way back:
  reopens the original word, restores its tab and (for the Depth tab) its
  expanded derived form, restores the unit type, and clears the origin (so the
  bar disappears and there is no lingering trail — no history trap).

No MAP v4 document or execution ledger exists in this repository to check
against (confirmed again by grep across history and branches, consistent with
every prior session's own finding on record, most recently PR #112's own body)
— so "Gate A/B" here is this task's own framing, not a citation. The closest
real governing text is `docs/governance/ACTIVE-ARCHITECTURE.md`'s locked
distinction "Surface Token ≠ Lemma ≠ Root ≠ Grammatical Family," which this
round does not touch (the fix below is a UI-restore convenience state, not an
identity concept).

**Gate B (build) was reached** because closing the gap found below needed no
new architecture, no Firestore Rule, no shared/protected path and no version
allocation — a genuinely bounded, Quran-owned, read-only-from-the-database
change.

## What no suite had ever exercised

Every existing check (`quran-word-card.mjs`, `quran-word-card-integration.mjs`,
`quran-word-card-rendered.mjs`, PR #112's own
`quran-word-card-lemma-occurrences.mjs`) stopped at *"the return bar appears."*
**None of them ever pressed it.** Doing that in a real browser
(`tools/i18n-verify/quran-word-card-return.mjs`, new, 50 checks) found two
real defects in the pre-existing mechanism — both are exactly what the task's
own acceptance wording named ("expansion/scroll intent").

### Defect 1 — the Basic tab's lemma list did not survive the round trip

`hydrateWordCardOccurrences()` unconditionally reset
`quranWordCardLemmaExpanded = false` on every call, including the reopen after
`returnToWordCardOrigin()`. A reader who expanded the "{count} lemma-linked
occurrences" list, followed a row to another āyah, then pressed "Back to Word
Card" found the ORIGINAL word again — correctly — but its lemma list had
silently collapsed. The code's own comment defended this as deliberate ("it
has nothing to restore across a jump"), which is true for an ordinary word
change (Prev/Next, opening a different word directly) but not for a genuine
return to the same word.

**Fix**: a one-shot signal (`quranWordCardRestoreLemmaExpanded`), set only by
`openWordOccurrenceAt()` when a `restore.lemmaExpanded` flag is present (i.e.
only on the return path), consumed and cleared at the top of
`hydrateWordCardOccurrences()` so every OTHER hydrate (a direct word open, a
Prev/Next move) is completely unaffected. `goToWordOccurrence()` now records
`lemmaExpanded: quranWordCardLemmaExpanded` in the origin object, mirroring
exactly how the Depth tab's `expandedForm` is already carried. This is the
same treatment the Depth tab's derived-form list has had since v08.21 — not a
new pattern.

### Defect 2 — the scroll restore could never have worked, in the real layout

`goToWordOccurrence()` captured `window.scrollY` and
`returnToWordCardOrigin()` restored it with `window.scrollTo(...)`. **This
app's shell is `body { height: 100vh; overflow: hidden; }`** — the document
itself never scrolls. Measured, not assumed: the new acceptance script scrolls
the origin screen to a real, non-zero position and reads `window.scrollY` back
as 0 every time. The scroll-restore code written in v08.22 could never have
moved anything in the app as it actually renders — a "PASSING check can carry
the same blind spot as the code it guards" of the *opposite* kind: no check
existed at all, so the blind spot was simply never seen.

**The first fix attempt was itself wrong, and re-measuring is why it was
caught before this shipped.** It targeted `#readScroll` (the Read screen's
`overflow-y: auto` panel), which sounds like the obvious answer and is wrong
for most real readers: **sideways paging is this app's own DEFAULT**
(`getSidewaysReading()` in `app/js/prefs.js` — *"never set: the owner's own
default"* → `true`), and `body.read-sideways #readScroll { overflow: hidden;
}` — in that mode `#readScroll` cannot scroll at all. A debug run against the
real fixture (which never touches this preference, so it renders in the
actual default) showed the capture reading 0 straight through the first
fix's own guard. `#ayahPanels` is the element that actually scrolls in
sideways mode (`overflow-y: auto`), for the ordinary case of a
single-āyah-at-a-time unit (ayah/ruku/juz/hizb/page).

**Fix**: `readViewScrollContainer()` picks the right element for the CURRENT
rendering — `#ayahPanels` in sideways mode (the default), `#readScroll`
otherwise — and `readViewScrollTop()` / `setReadViewScrollTop()` read/write
whichever one that is, in place of `window.scrollY` / `window.scrollTo`. This
is correct for the ordinary single-āyah Read screen, which is where
`goToWordOccurrence()`'s destination always lands (by design, stated in the
existing v08.20 comment — the destination is always Read view, even when the
reader started in Note view, so the card never disturbs an open Note's
contenteditable). **Two cases are explicitly NOT covered, and both fall back
to the pre-existing no-op (0), never a regression**:

- **A flow unit (Whole Surah/Range) or Mushaf mode** pages `#pageViewContainer`
  *horizontally* in sideways mode instead (shell round 28) — a materially
  different restore (which whole PAGE was showing), and choosing
  whether/how to restore a page position there is a real product question,
  not a mechanical port of this fix.
- **Note view as the origin** (the reader had the word card open while
  reading a Note, then followed an occurrence link) — Note view is a complex
  popup (`#notePopupBody`, its own side pane, Maximize) with no established
  single scroll surface in this codebase; restoring it is out of this
  bounded task's scope.

Both are stated here rather than silently left broken, per this project's own
standing rule to say what was not done and why. The acceptance script
(`quran-word-card-return.mjs`) reads and sets the same element the app itself
now does — `#ayahPanels` under `body.read-sideways`, `#readScroll` otherwise —
deliberately, so the check cannot pass by measuring the wrong container.

## What was verified, in a real browser, both languages

`tools/i18n-verify/quran-word-card-return.mjs` (new, committed, un-checked-in
Playwright acceptance script — this project's established pattern):

1. **The Basic-tab lemma pathway, full round trip** (en/bn): opens the fixture
   word (surah 2, āyah 71, position 13 — the same proven fixture PR #112 and
   `quran-word-card-rendered.mjs` already use), expands the lemma list,
   scrolls the origin screen, follows an occurrence link, confirms navigation
   + card-closed + return bar, **presses the actual return control**, and
   confirms: the ORIGINAL word reopens (not the destination word), the
   ORIGINAL tab is restored, **the lemma list is restored EXPANDED**, the
   return bar is gone (origin cleared — no trap), **scroll position is
   restored**, a second occurrence link is still live for a fresh trip, the
   whole interaction writes nothing (`__fsLog`), and no page errors.
2. **Depth-tab (root/derived-form) pathway — regression check**: the SAME
   shared `hydrateWordCardOccurrences()` this round changed is what the
   pre-existing v08.21 restore already depended on; this confirms it still
   round-trips correctly (original word, Depth tab, previously-expanded form
   all restored) after the fix.
3. **Prev/Next does not leak the restore signal**: expand the lemma list, move
   to the next word via the card's own arrows (not a return), confirm the NEW
   word's own toggle starts collapsed — the exact acceptance criterion PR
   #112's own suite established, now proven to survive this round's change
   too (the restore signal is genuinely one-shot).
4. **Keyboard**: the return control is a real `<button>`, receives focus, and
   `Enter` activates it exactly as a click would (round trip completes, origin
   clears).
5. **Language switch while the bar is visible**: this app reloads the whole
   page on a language change (documented, deliberate — CLAUDE.md's own
   standing lesson on `prefs.js`). Confirmed: no duplicated bar, no stuck
   state, no page error — the transient bar resets with everything else, as
   designed, rather than surviving into a state nothing rendered it for.
6. **Geometry**: the return button at 320×640 / 390×844 / 412×915, both
   languages — real tap target (≥36px), stays inside the viewport, no
   sideways scroll. (The button's own CSS already declares `min-height: 40px`,
   unchanged by this round.)

## Suite results

```
node tools/i18n-verify/quran-word-card-return.mjs
==== 55 passed, 0 failed ====
```

Also re-run, unmodified by this round, all pass at their own established
baseline:
- `node tools/i18n-verify/quran-word-card.mjs` → 50 passed, 0 failed
- `node tools/i18n-verify/quran-word-card-integration.mjs` → 10 passed, 0 failed
- `node tools/i18n-verify/quran-word-card-lemma-occurrences.mjs` → 50 passed, 0 failed
- `node tools/i18n-verify/quran-word-card-rendered.mjs` → 120 passed, 2 failed
  (the 2 are `ERR_CERT_AUTHORITY_INVALID`, this sandbox's own documented TLS-
  interception artifact — the exact baseline PR #112 itself recorded, unchanged)

## Governance suites (all seven, required by this task)

**Checkout preflight correction needed first — the same class PR #112 itself
found and fixed.** A fresh checkout is shallow and does not carry
`origin/claude/pensive-knuth-2pu3jj` or `origin/claude/phase4-wiring` as
remote-tracking refs; `programme-ledger-mutations.mjs` and `brief-integrity.mjs`
both read those by name and fail with `Cannot read properties of undefined` /
`fatal: invalid object name` when they are missing — not an application defect,
a missing fetch. Corrected with `git fetch origin --unshallow` then
`git fetch origin claude/pensive-knuth-2pu3jj claude/phase4-wiring`. With that
done, all seven pass:

```
1) node tools/i18n-verify/programme-ledger.mjs
==== Programme integration ledger: 8 passed, 23 noted, 0 failed ====

2) node tools/i18n-verify/programme-ledger-mutations.mjs
==== Programme ledger guard mutations: 49 passed, 0 failed ====

3) node tools/i18n-verify/brief-integrity.mjs
==== Standing brief integrity: 8 passed, 0 failed ====

4) node tools/i18n-verify/study-activity-evidence-boundary.mjs
==== Study Activity evidence boundary: 27 passed, 0 failed ====

5) node tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs
==== Evidence boundary guard mutations: 11 passed, 0 failed ====

6) node tools/i18n-verify/study-event-wiring.mjs
==== Study event wiring (P4-D1 Reading, D2 Listening, D4 WbW): 41 passed, 0 failed ====

7) node tools/i18n-verify/rules-authorisation-executable.mjs
==== Rules authorisation executable: 38 passed, 0 failed ====
```

## `git diff --stat` against `main`

```
app/quranrevival.html | 91 +++++++++++++++++++++++++++++++++++++++++++++------
1 file changed, 81 insertions(+), 10 deletions(-)
```
plus three new files: `tools/i18n-verify/quran-word-card-return.mjs` (352
lines), this report (`.md` + `.html`).

Only `app/quranrevival.html` is touched inside `app/` — `app/js/quran-word-card.js`
was read but not modified (the two defects both live in the page-level
controller code, not the pure renderer module).

## What this deliberately does NOT do

- **No protected or shared path touched.** None of `app/js/version.js`,
  `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`, any of
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, anything under
  `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`,
  `tools/firestore-emulator/`, or `.github/workflows/` was modified.
- **No new translation string.** Both fixes are pure state/behaviour;
  `backToWord`/`backToWordCard`/`backToWordTitle`/`visitingFrom` already exist
  in English and Bangla since the v08.20–22 rounds that first built this
  mechanism.
- **No Firestore write, Rule, or index proposed, changed, or deployed** —
  `__fsLog` write-kind count is 0 through the whole round trip, both
  languages.
- **No version bump.** `app/js/version.js` is untouched; per
  `docs/governance/programme-integration-ledger.json`, `08.32` is the
  **current, Owner-verified** milestone on `main` and `08.33` is the next
  unallocated number. **This is a real behaviour change and needs a version
  allocated by the Master Architect** — it is incomplete pending that,
  exactly as this task's own instruction anticipated ("hand off any new
  translation literals and central version request to MMSA" — no new
  translation literal was needed, but the version allocation still is).
- **No merge, no deploy, no approval claimed.**
- **Sideways/Mushaf scroll restore and Note-view-origin scroll restore are
  flagged, not built** — see Defect 2 above for exactly why and what each
  would need.
- **No 31st Approach, no DDR item, no Owner UI decision (O3/O3b/O3c/
  O4-READBAR-WRAP) touched** — none of those controls or screens is anywhere
  in this diff.

## Owner app test — NO before integration, YES after

**Before this PR merges**: the "Back to Word Card" control already exists on
the live app and mostly works (word + tab restore already did). The two
things this round fixes — the lemma list staying expanded, and the page
actually scrolling back to where you were — are **not yet on the live site**
until this PR is merged. Nothing to test yet.

**After this PR merges**, to check on a phone or desktop:

1. Open the Quran Study screen, turn on word-by-word (WbW), tap any Arabic
   word to open its Word Card.
2. Switch to the **Basic Arabic** tab. If the word shows a "lemma-linked
   occurrences" line, tap it to expand the list of other places that word's
   dictionary form appears.
3. Scroll down a little on the reading screen (so there is something to come
   back to), then tap one of the occurrence rows in the expanded list.
4. You should land on a different āyah, the Word Card closed, and a small
   "← Back to Word Card [ref]" bar above the reading area.
5. Tap that bar. **Expected**: you return to the exact word you started from,
   still on the Basic Arabic tab, **with the lemma-occurrences list still
   expanded** (this is the fix — before this round it would have shown
   collapsed again), and the reading screen scrolled back to roughly where you
   were before you tapped away (also the fix — before this round it always
   snapped to the top). The "Back to Word Card" bar disappears once you're
   back.
6. Try the same thing in Bangla (switch language, repeat), and on a narrow
   phone width if possible — the bar and its button should stay fully on
   screen and easy to tap in both.

No Firestore write happens anywhere in this flow — it is entirely a reading
convenience.
