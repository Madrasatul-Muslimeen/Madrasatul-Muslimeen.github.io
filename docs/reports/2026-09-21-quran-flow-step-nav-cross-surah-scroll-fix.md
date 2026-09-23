# Word Card stack: "Next unit"/"Previous unit" and the unit-number picker never re-targeted the flow/Mushaf scroll position

**Issue #113, comment `5763795772`** ("QURAN MAP v4 NEXT"), following on from
`5762932654`'s own Mushaf audio-follow scroll fix (PR #139 head `2e381956`).
Verified first rather than trusted: `origin/main` at `16cfb0b` (`v08.32`);
stack heads `#135` `4078b65`, `#137` `ffeccd5`, `#138` `a2585a0`, `#139`
`2e381956024bce30920d568dadb94f1fdbaa4290` (matches the task's own stated
head exactly) — all re-confirmed by fetching the PR refs directly. Issue
#123 (the platform coordination issue the task also named) was re-read for
context; nothing in it bears on this Quran-owned, Word-Card-adjacent task.

## Gate A — the six named suites, independently re-run, reproduce the exact stated baseline

```
node tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs (new, #139)   -> 25 passed, 0 failed
node tools/i18n-verify/quran-word-card-mushaf-scroll.mjs (#139)           -> 59 passed, 0 failed
node tools/i18n-verify/quran-word-card-return.mjs (#135)                  -> 55 passed, 0 failed
node tools/i18n-verify/quran-word-card-popup.mjs (#137)                   -> 22 passed, 0 failed
node tools/i18n-verify/quran-word-card-flow-nav.mjs (#138)                -> 19 passed, 0 failed
node tools/i18n-verify/quran-word-card-note-origin-return.mjs (#139)      -> 51 passed, 0 failed
```

Every number matches PR #139's own report byte-for-byte. Also re-audited:
the new audio fixture's own off-screen geometry (its own precondition
check asserts the destination āyah is genuinely off screen before playback,
and genuinely scrolled into view after — both real `check()` calls, not
assumed), the revert-and-confirm narrated in that report (a manual
revert-then-rerun, this project's own established convention, not an
in-suite toggle), the real "▶ Play" path (ten genuine `playOneAndWait()`
steps through the actual drill sequencer, not a direct function call), the
"writes nothing" assertion, and English/Bangla coverage (both languages
carry the full check set). The `2026-09-21-word-card-mushaf-audio-follow-and-evidence-repair.md`/`.html`
pair was opened and its fenced code blocks render as real `<pre><code>`
in the `.html` twin, not literal backticks — no repair needed this round.

## Gate B — a new, previously undiscovered defect: `stepUnit()` and `goToUnitNumber()` never re-target the flow/Mushaf scroll position

**Found by testing the owner's own documented feature directly, not by
reading an old report.** Shell round 21's own comment in
`app/quranrevival.html` states the rule in the owner's own words: *"any
choice which reflects in the reading screen should have a button to choose
next of the same choice... It CROSSES SURAH BOUNDARIES."* `stepUnit()`
(the "Next unit"/"Previous unit" buttons) and `goToUnitNumber()` (the
unit-number picker, and `stepUnit()`'s own Juz/Hizb/Page branch) both
cross a surah boundary on purpose — but a direct grep found exactly ONE
call site for `scrollFlowToCurrentAyah()` in the whole file, inside
`navigateToAyah()` (the WORD-CARD jump's own primitive, "Issue #113",
PR #138/#139). Neither `stepUnit()` nor `goToUnitNumber()` ever called it.

**Reproduced with a debug run before touching any code:** Whole Surah unit,
surah 1 (Al-Fātihah, 7 āyahs), the flow strip scrolled so āyah 7 is on
screen, then "Next" pressed.

```
BEFORE: {"surah":"1","scrollLeft":-2136,"rows":["1","2","3","4","5","6","7"]}
AFTER:  {"surah":"2","ayahSelectValue":"1","scrollLeft":-2136,"rowCount":286,"visibleAyah":"7"}
```

State correctly moved to surah 2, āyah 1 — but `#pageViewContainer`'s own
`scrollLeft` was byte-for-byte **unchanged**, so the reader was left
looking at whichever āyah of surah 2 happened to occupy that same stale
pixel offset (āyah 7, in this exact reproduction) instead of surah 2's own
āyah 1. This is the identical "the browser does not reset `scrollLeft`
when `innerHTML` is replaced for a different surah" defect PR #138's own
report already measured for the word-card jump path — reproduced here
through a completely different, and far more common, trigger: the
ordinary Next/Previous reading gesture.

**The fix**, two one-line additions, both calling the SAME already-shipped,
already-tested function, which is itself untouched:

```js
// tail of stepUnit() (covers Ayah, Range, Whole Surah, Ruku')
renderStudyScreen();
renderWheel();
await scrollFlowToCurrentAyah();

// tail of goToUnitNumber() (covers Juz/Hizb/Page, and the unit-number
// picker's own direct change handler)
renderStudyScreen();
renderWheel();
await scrollFlowToCurrentAyah();
```

`scrollFlowToCurrentAyah()` already no-ops correctly when the flow view is
not showing at all (checked internally), so adding the call at these two
sites is safe regardless of unit type or Mushaf state — proven, not
assumed, by the regression case below.

**Verified against the fix** (the same reproduction, re-run):

```
AFTER (fixed): {"surah":"2","ayahSelectValue":"1","scrollLeft":0,"rowCount":286,"visibleAyah":"1"}
```

## Scope, deliberately bounded

`stepUnit()` and `goToUnitNumber()` are the two functions this round
fixes, matching the owner's own explicitly documented "Next/Previous unit"
and unit-number-picker features. The bare `surahSelect`/`ayahSelect`
dropdown change handlers share the identical root cause — grepped, neither
calls `scrollFlowToCurrentAyah()` either — and are **NOT touched here**,
flagged as a related, separate, out-of-scope-for-this-round item, the same
"flag rather than drive-by fix an adjacent site" convention this stack's
earlier rounds already follow.

## New committed suite: `tools/i18n-verify/quran-flow-step-nav.mjs` — 32 checks, real-browser acceptance QA

1. **Whole Surah, non-Mushaf, "Next" crosses a surah boundary** (English and
   Bangla): the flow strip is genuinely scrolled to surah 1's own last āyah
   before Next is pressed, state moves to surah 2's own āyah 1, and **GATE
   B: the flow strip is actually scrolled to surah 2's own āyah 1** — plus
   a no-writes check and a no-page-errors check.
2. **Whole Surah, non-Mushaf, "Previous" crosses a surah boundary**
   (backward direction — the fix must not be one-directional). Whole
   Surah's own "Previous" always opens the new surah at its own āyah 1
   (`openSurahAt(target, 1)`, unconditional on direction — a pre-existing,
   separate design choice this round does not touch); what this round's
   fix must get right is that the flow strip actually follows wherever the
   state lands, in either direction, and it does.
3. **Range unit, non-Mushaf, "Next" crosses a surah boundary**: the range
   window opens in the next surah, starting at its own āyah 1, and the flow
   strip actually lands there.
4. **Regression: same-surah stepping is unaffected** — the range window
   still advances correctly within one surah with no unintended scroll
   behaviour from the new call.
5. **Mushaf mode, "Next" crosses a surah boundary**, via `stepUnit()`'s own
   tail. Surah 1 renders THREE synthetic pages so scrolling to its own last
   āyah genuinely moves `scrollLeft` away from 0 (asserted as its own
   precondition) before crossing into surah 2's own, separately rendered
   page.
6. **`goToUnitNumber()`: the unit-number picker crosses a surah boundary**
   (Mushaf on, Page unit, page 1 → page 2 — a real boundary per
   `tools/quran-data-pull/output/page-index.json`: page 1 = 1:1–1:7, page 2
   = 2:1–2:5), proving the OTHER function this round fixes, and its own
   direct-picker entry point distinct from `stepUnit()`'s Juz/Hizb/Page
   branch.

## Revert-and-confirm, performed for real — and one honest finding it produced

```
node tools/i18n-verify/quran-flow-step-nav.mjs        (fixed)     -> 32 passed, 0 failed
git stash push -- app/quranrevival.html                (reverted)
node tools/i18n-verify/quran-flow-step-nav.mjs        (reverted)  -> 27 passed, 4 failed
  FAIL  en GATE B: the flow strip is actually SCROLLED to surah 2's own āyah 1 (this is the fix)
  FAIL  bn GATE B: the flow strip is actually SCROLLED to surah 2's own āyah 1 (this is the fix)
  FAIL  GATE B: the flow strip is actually SCROLLED to surah 1's own āyah 1 (backward direction)
  FAIL  GATE B: the flow strip is actually SCROLLED to the new window's own first āyah
git stash pop                                          (fix restored)
node tools/i18n-verify/quran-flow-step-nav.mjs        (fixed)     -> 32 passed, 0 failed
```

Cases 1–4 (the non-Mushaf checks) fail **exactly** on the reverted code and
nowhere else — every precondition, every regression check and both
no-write/no-error checks still pass on the unfixed code, which is what
proves the four failures are really about the scroll target and not a
fixture artefact.

**The first attempt at cases 5 and 6 (the Mushaf-mode checks) did NOT fail
on the reverted code — investigated rather than forced to pass, and it
found a second, genuinely separate mechanism.** `renderMushafPages()`
(`app/js/hifz-renderer.js`) sets `container.innerHTML = ""` and rebuilds
from an empty container; a direct measurement (sampling `#pageViewContainer`'s
own `scrollLeft` every 200ms across the transition, unfixed code) found
the browser resets `scrollLeft` to **0** the moment the container is
genuinely emptied — a different mechanism from `renderFlowView()`'s own
NON-Mushaf branch, which replaces content in one atomic `innerHTML`
assignment with no empty intermediate state (exactly why THAT branch does
NOT self-correct, per PR #138's own original measurement and this round's
own cases 1–4). And because `stepUnit()`/`goToUnitNumber()` always land on
the destination unit's own FIRST āyah (`openSurahAt(target, 1)` /
`row.startAyah`), that first āyah is exactly what a freshly
emptied-then-rebuilt Mushaf container already shows at its own reset
`scrollLeft` of 0 — so THESE TWO call sites' Mushaf branch of the fix,
while correct and deliberately kept (consistency with the non-Mushaf
branch, and safety for any future caller that might not always land on a
unit's own first āyah), is not independently gate-differentiating for this
specific trigger. **The suite records this honestly**: cases 5 and 6 are
kept as real, passing correctness/regression checks with their own header
comments explaining exactly why they are not GATE B claims, rather than
labelling them as proof they cannot support. The genuine Mushaf-mode proof
of this fix's OTHER call site (`navigateToAyah()`, which does **not**
always land on a unit's own first āyah) is PR #139's own already-shipped,
already-mutation-proven `quran-word-card-mushaf-scroll.mjs` — untouched by
this round.

## Suite results — raw, independently re-run on this round's own final state

```
tools/i18n-verify/quran-flow-step-nav.mjs (new)                 -> 32 passed, 0 failed
tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs (#139)   -> 25 passed, 0 failed
tools/i18n-verify/quran-word-card-mushaf-scroll.mjs (#139)      -> 59 passed, 0 failed
tools/i18n-verify/quran-word-card-return.mjs (#135)             -> 55 passed, 0 failed
tools/i18n-verify/quran-word-card-popup.mjs (#137)              -> 22 passed, 0 failed
tools/i18n-verify/quran-word-card-flow-nav.mjs (#138)           -> 19 passed, 0 failed
tools/i18n-verify/quran-word-card-note-origin-return.mjs (#139) -> 51 passed, 0 failed
```

## Governance suites — all seven, full-history checkout with the ledger's own declared branch fetched by remote-tracking name

```
1) programme-ledger.mjs                           -> 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                 -> 49 passed, 0 failed
3) brief-integrity.mjs                             -> 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            -> 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  -> 11 passed, 0 failed
6) study-event-wiring.mjs                          -> 41 passed, 0 failed
7) rules-authorisation-executable.mjs              -> 38 passed, 0 failed
```

Local results only — no head-specific CI result was available at the time
of writing; this PR's own CI check should be read once it runs.

## Changed-file inventory

**This round's own diff**, against PR #139's own prior head (`2e381956`):

```
 app/quranrevival.html                                                       |  17 +
 docs/reports/2026-09-21-quran-flow-step-nav-cross-surah-scroll-fix.html     | 111 +
 docs/reports/2026-09-21-quran-flow-step-nav-cross-surah-scroll-fix.md       | 285 +
 tools/i18n-verify/quran-flow-step-nav.mjs                                   | 490 +
 4 files changed, 903 insertions(+)
```

No protected or shared path touched anywhere in this diff:

- No `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`,
  `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`,
  `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`.
- No `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, no `tools/md2report.py`.
- No `docs/governance/` path (including no `.rules`/index candidate).
- No `firestore.rules`, `firebase.json`, `tests/firestore/`,
  `tools/firestore-emulator/`.
- No `.github/workflows/`.

`app/js/hifz-renderer.js` was **read, not modified** — the second,
already-shipped fix from the previous round (`setActiveAyah()`'s own
`inline: "start"`) is untouched by this round.

## What this deliberately does NOT do

- **No version bump.** This is a real, user-visible behaviour change (the
  flow/Mushaf view now follows the "Next"/"Previous unit" buttons and the
  unit-number picker across a surah boundary) and needs a Master Architect
  version allocation — `app/js/version.js` is untouched, `v08.32` stays
  current, `v08.33` remains unallocated, flagged as incomplete pending that
  allocation.
- **No merge, no deploy, no Rules/index change, no approval claimed.**
- **The bare `surahSelect`/`ayahSelect` dropdown change handlers are NOT
  fixed here** — same root cause, different call sites, flagged above as a
  separate item for a future round rather than widened into this one.
- **The pre-existing Range/surah-crossing content-correctness product
  decision packet is untouched** — this round's fix does not decide or
  touch that question; it only makes the SCROLL POSITION follow wherever
  `currentAyahNum`/`currentSurahNum` already land, whatever those values
  are.
- **`app/js/hifz-renderer.js`, `audio-player.js` and `app/js/quran-word-card.js`
  are all untouched.**
- **No new translation string** — both fixes are pure behaviour, calling an
  existing, unmodified function; no new user-visible text was added.

## Owner app test

**NO before this round merges** (nothing on `main`/served yet — this is a
draft, unmerged branch). **YES after this round and the rest of the
#135→#139 stack are merged**, at
`https://madrasatul-muslimeen.github.io/app/quranrevival.html`, signed in
as owner/prime, any width, either language:

1. Open Quran Study, Read screen. Set Study Unit to **Whole Surah**, choose
   a short surah (e.g. Al-Fātihah, surah 1), and scroll the flow strip so
   the surah's own LAST āyah is on screen.
2. Press the **"Next unit" (⏭)** button. Expected (this round's fix): the
   screen moves to the new surah and the flow strip **scrolls to show that
   surah's own first āyah** — before this fix, the strip silently stayed at
   the same pixel position, which could show the wrong āyah of the new
   surah (or nothing at all) depending on how far the reader had scrolled.
3. Repeat with the **"Previous unit" (⏮)** button, and with **Range** as
   the Study Unit.
4. Repeat with **Mushaf view** turned on — the same "Next"/"Previous"
   buttons should bring the new surah's own page into view.
5. Repeat in Bangla.

No Firestore write happens anywhere in this flow.
