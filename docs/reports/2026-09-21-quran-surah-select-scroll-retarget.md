# `surahSelect`'s own dropdown never re-targeted the flow/Mushaf scroll position either — reproduced, fixed; `ayahSelect` investigated and does not reproduce

**Issue #113, comment `5764719193`** ("QURAN MAP v4 NEXT"), following on from
`5763795772`'s own `stepUnit()`/`goToUnitNumber()` cross-surah scroll fix
(PR #139 head `28b2a495`). Verified first rather than trusted: `origin/main`
at `16cfb0b` (`v08.32`); stack heads `#135` `4078b65`, `#137` `ffeccd5`,
`#138` `a2585a0`, `#139` `28b2a495852fc5cb80d3c40f90edc23eab9a4bed` (matches
the task's own stated head exactly). Issue #123 (the platform coordination
issue the task also named) was re-read for context; nothing in it bears on
this Quran-owned, Word-Card-adjacent task.

## Gate A — independently re-run, reproduces PR #139's own exact baseline: 32/25/59/55/22/19/51, all passing

```
node tools/i18n-verify/quran-flow-step-nav.mjs (#139)                     -> 32 passed, 0 failed
node tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs (#139)        -> 25 passed, 0 failed
node tools/i18n-verify/quran-word-card-mushaf-scroll.mjs (#139)           -> 59 passed, 0 failed
node tools/i18n-verify/quran-word-card-return.mjs (#135)                  -> 55 passed, 0 failed
node tools/i18n-verify/quran-word-card-popup.mjs (#137)                   -> 22 passed, 0 failed
node tools/i18n-verify/quran-word-card-flow-nav.mjs (#138)                -> 19 passed, 0 failed
node tools/i18n-verify/quran-word-card-note-origin-return.mjs (#139)      -> 51 passed, 0 failed
```

Every number matches PR #139's own report byte-for-byte.

**The negative-control claim was independently re-verified, not just read.**
The task asked specifically to inspect it: *"only four non-Mushaf checks
differentiate; Mushaf and `goToUnitNumber()` checks pass even reverted."* A
manual revert (commenting out the two `await scrollFlowToCurrentAyah();`
calls added at the tails of `stepUnit()` and `goToUnitNumber()`, this
project's own established convention rather than an automated dual-run) and
re-run of `quran-flow-step-nav.mjs` produced:

```
reverted:      28 passed, 4 failed
```

The four failures are exactly the four checks the report calls out:
`GATE B: the flow strip is actually SCROLLED to surah 2's own āyah 1 (this
is the fix)`, `GATE B: ... surah 1's own āyah 1 (backward direction)`,
`GATE B: ... the new window's own first āyah` (Range, cross-surah), and
`the flow strip lands on the new window's own first āyah` (Range,
same-surah regression case). All two Mushaf-mode checks and both
`goToUnitNumber()` checks passed unchanged on the reverted code, confirmed
non-differentiating exactly as claimed. Restored and re-confirmed: `32
passed, 0 failed`.

The prior round's own report pair
(`2026-09-21-word-card-mushaf-audio-follow-and-evidence-repair.md`/`.html`)
was opened; its fenced code blocks render as real `<pre><code>` in the
`.html` twin, not literal backticks — no repair needed. PR #139's body
already describes its current head (`28b2a495`) accurately as of the start
of this round; it is extended below, not rewritten, per the task's own
instruction not to rewrite historical reports.

## Gate B — the adjacent gap PR #139's own report flagged, investigated for real

PR #139's report named it explicitly and deliberately left it alone: *"The
bare `surahSelect`/`ayahSelect` dropdown change handlers share the identical
root cause (grepped: neither calls `scrollFlowToCurrentAyah()` either) and
are flagged, not fixed, as a separate item for a future round."* This round
is that future round — reproducing each one for real before deciding
anything, per the task's own instruction, rather than assuming both are the
same defect just because they were flagged together.

### `surahSelect` — REPRODUCES

Read first, not assumed: `surahSelect.addEventListener("change", async ()
=> { currentSurahNum = Number(surahSelect.value); await loadSurah(); });`
(`app/quranrevival.html`, pre-existing). `loadSurah()` always resets
`currentAyahNum` to `1` — the identical target `openSurahAt()` uses for
`stepUnit()`'s own surah-unit branch — but never called
`scrollFlowToCurrentAyah()`.

**Reproduced with a debug run before touching any code**: Whole Surah unit,
surah 1 (7 āyahs), flow strip scrolled to its own last āyah (`7`), then
surah 2 picked directly from the `#surahSelect` dropdown (not the Next
button — a different trigger than PR #139's own round, isolating this exact
code path). State correctly moved to `{"surah":"2","ayah":"1"}`, but the
flow strip stayed visually on āyah `7` (`scrollLeft: -2136`, unchanged from
before the pick) — the identical `renderFlowView()` non-Mushaf-branch
"one atomic `innerHTML` assignment does not reset `scrollLeft`" defect
`stepUnit()`/`goToUnitNumber()`/`navigateToAyah()` already needed the same
fix for, reproduced here through a third, independent trigger.

**The fix**: one line, the same already-shipped, never-modified
`scrollFlowToCurrentAyah()` every other cross-surah site already calls,
added to the tail of `surahSelect`'s own change handler:

```js
surahSelect.addEventListener("change", async () => {
  currentSurahNum = Number(surahSelect.value);
  await loadSurah();
  await scrollFlowToCurrentAyah();
});
```

### `ayahSelect` — does NOT reproduce, investigated rather than invented

The task's own instruction: *"If it does not reproduce, do not invent it."*
Read the two `display` toggles in `renderStudyScreen()` before assuming
anything: `ayahSelectControl.style.display = unitRendersWhole() ? "none" :
"";` and `pageViewContainer.style.display = usesFlow ? "" : "none";`, where
`unitRendersWhole()` is `mushafToggle.checked || currentUnitType === "surah"
|| currentUnitType === "range"` and `usesFlow` is `isMushaf || isPageUnit`
(`isPageUnit` being the identical `surah`/`range` test). **The two
conditions are the same condition** — `ayahSelect` is shown exactly when the
flow strip is hidden, and vice versa, for every unit type and with Mushaf on
or off. Its change handler can therefore never fire while there is anything
for `scrollFlowToCurrentAyah()` to retarget.

Measured on the rendered page rather than trusted from the reading above:
`quran-surah-select-scroll-retarget.mjs` case 5 drives every unit type
(`ayah`, `ruku`, `surah`, `range`) plus Mushaf-on-a-non-flow-unit, in both
languages, asserting `ayahSelectShown` and `flowShown` are never both true
at once — 10 checks, all passing. `ayahSelect`'s handler is left untouched.

### A separate, out-of-scope gap found while reproducing — flagged, not fixed

Investigating `surahSelect` with a Range unit surfaced a second, unrelated
defect: `loadSurah()` resets `currentAyahNum` but never touches
`rangeFrom`/`rangeTo`, so picking a different surah while a Range window
does not fit inside the new surah leaves the flow strip showing the OLD
window's āyah numbers rendered against the NEW surah's text (reproduced:
surah 1 range `3..7`, surah picked to `2`, state read
`{"surah":"2","ayah":"1"}` but the rendered rows stayed `["3","4","5","6","7"]`
and the stale scroll position was, correctly, left where it was since āyah
`1` has no rendered row to scroll to). This is a **content** question — what
a Range window should show after crossing a surah boundary — not a scroll
question, and the task's own instruction is explicit: *"Do not decide
cross-surah Range content policy."* Case 3 of the new suite isolates the
scroll-retargeting fix from this by choosing a window (`1..5`) that stays
valid in the destination surah, so it proves only what this round fixes.
**Flagged for a future round, not fixed here**, the same "flag rather than
drive-by fix an adjacent site" convention this stack's earlier rounds
already follow.

## New suite: `tools/i18n-verify/quran-surah-select-scroll-retarget.mjs` (38 checks)

- Case 1: Whole Surah, non-Mushaf, English + Bangla, mobile (390×844) — the
  GATE B assertion, plus state/row-count/no-writes/no-errors.
- Case 2: same, desktop width (1100×800) — the fix proven at a second
  viewport, not assumed from the mobile case (this project's own recurring
  "measure at more than one viewport" lesson).
- Case 3: Range unit, window `1..5` (stays valid in the destination surah) —
  isolates the scroll fix from the separate Range content-policy gap above.
- Case 4: Mushaf mode — **honestly recorded as correctness/regression, not
  GATE-B-differentiating** (verified by the same manual revert-and-confirm
  below), the same reason PR #139's own Mushaf cases were non-differentiating:
  `renderMushafPages()`'s own `innerHTML = ""` step resets `scrollLeft`
  before repainting, and a direct surah pick always lands on the
  destination's own first āyah — exactly what a reset-to-0 container already
  shows.
- Case 5: `ayahSelect` structural proof (above), both languages.

**Revert-and-confirm performed for real** (commenting out only the new
`await scrollFlowToCurrentAyah();` line in `surahSelect`'s own handler,
leaving `stepUnit()`/`goToUnitNumber()`/`navigateToAyah()`'s own calls
untouched):

```
fixed code:    38 passed, 0 failed
reverted:      34 passed, 4 failed
fix restored:  38 passed, 0 failed
```

The four failures on the reverted code are exactly the four
GATE-B-labelled checks (English, Bangla, desktop, Range) — the Mushaf case
and both `ayahSelect` cases (10 checks across both languages) pass
unchanged either way, confirmed non-differentiating rather than assumed.

## Full regression sweep, all eight Quran suites re-run against this round's final state

```
quran-flow-step-nav.mjs (#139)                    -> 32 passed, 0 failed
quran-mushaf-audio-follow-scroll.mjs (#139)       -> 25 passed, 0 failed
quran-word-card-mushaf-scroll.mjs (#139)          -> 59 passed, 0 failed
quran-word-card-return.mjs (#135)                 -> 55 passed, 0 failed
quran-word-card-popup.mjs (#137)                  -> 22 passed, 0 failed
quran-word-card-flow-nav.mjs (#138)               -> 19 passed, 0 failed
quran-word-card-note-origin-return.mjs (#139)     -> 51 passed, 0 failed
quran-surah-select-scroll-retarget.mjs (new)      -> 38 passed, 0 failed
```

No regression anywhere.

## Governance suites, all seven, re-run after fetching full history and every ledger-named remote ref

The sandbox's default checkout was **shallow** and was missing two
ledger-named branches (`claude/pensive-knuth-2pu3jj`,
`claude/phase4-wiring`), which is exactly what the task asked to guard
against ("full-history and every ledger-named remote ref"). `git fetch
origin --unshallow` plus fetching both named branches turned two spurious
local failures (`programme-ledger-mutations.mjs` 42/7, `brief-integrity.mjs`
6/2 — both `fatal: … unknown revision` on the two missing refs, not real
governance failures) into the documented baseline:

```
programme-ledger.mjs                           -> 8 passed, 23 noted, 0 failed
programme-ledger-mutations.mjs                 -> 49 passed, 0 failed
brief-integrity.mjs                             -> 8 passed, 0 failed
study-activity-evidence-boundary.mjs            -> 27 passed, 0 failed
study-activity-evidence-boundary-mutations.mjs  -> 11 passed, 0 failed
study-event-wiring.mjs                          -> 41 passed, 0 failed
rules-authorisation-executable.mjs              -> 38 passed, 0 failed
```

All seven reproduce the exact documented baseline. Local results only — no
head-specific CI result was available at the time of writing.

## This round's own diff (against prior head `28b2a495`)

**Corrected 21 Sep 2026 — a seventh task-bridge round found this section's
own count wrong: it said 3 files where the commit has 4.** `git diff --stat
28b2a495 2a373e39` is the source of truth: `app/quranrevival.html` (14
insertions, 1 deletion — one comment block and one one-line change to
`surahSelect`'s own handler), the new
`tools/i18n-verify/quran-surah-select-scroll-retarget.mjs` (357 lines, 38
checks), and this round's own new dated report pair — **two separate files**,
`docs/reports/2026-09-21-quran-surah-select-scroll-retarget.md` (250
insertions) and its `.html` twin (125 insertions) — which the prior wording
bundled into one bullet and so undercounted. **4 files, 746 insertions(+), 1
deletion(-)** in total. No protected or shared path touched anywhere
(confirmed by listing — `git status --short` — not claim):
`app/quranrevival.html` is Quran-owned application code, and the new suite is
a Quran-scoped test file following this stack's own established naming, not
one of the six platform-shared tooling files the task names
(`behaviour.mjs`/`harness.mjs`/`firebase-stub.mjs`/`brief-integrity.mjs`/
`programme-ledger.mjs`/`programme-ledger-mutations.mjs`).

**The paired `.html` twin also broke every Markdown list item into a
detached paragraph** — each `- ` item rendered as its own single-item
`<ul>`, with any wrapped continuation line landing as a stray `<p>` outside
any list, and every fenced code block rendered as a garbled single-line
paragraph with literal stray backticks instead of `<pre><code>`. Neither
defect is in this file's own Markdown, which was and remains untouched by
this correction — both were defects in `tools/md2report.py`'s own rendering
of it. `tools/md2report.py` had no fenced-code-block (`` ``` ``) handling at
all: a fence line matched none of the parser's other branches, so its
content fell into the plain-paragraph scanner, which joins consecutive lines
with spaces — losing every line break and leaving the `inline()` step's
single-backtick regex to opportunistically pair two of the fence's own three
backticks together, swallowing the whole block as one `<code>` span with a
stray backtick on each side. Fixed with a dedicated fence branch, checked
first in the line loop (before any other line-type test can misinterpret a
fenced line), that consumes verbatim lines up to the closing fence and emits
real `<pre><code>` with the content HTML-escaped but otherwise untouched.
**The list-detachment defect could not be reproduced by re-running the
now-fence-fixed script against this file's own unchanged Markdown** — every
`- `/continuation block here regenerates as one correct `<ul>` with the
continuation text folded into its own `<li>` — so the committed `.html` twin
was not a faithful rendering of this file to begin with. Regenerated with
`python3 tools/md2report.py <this .md> <this .html>` using the corrected
script; this file's own Markdown source is unchanged by this correction
except for this section's own file count above.

## Owner app test

**NO before integration, YES after (informational only; nothing to fix
before merge).** Steps, once integrated and deployed: open the app, go to
Read, pick a Study Unit of **Whole Surah**, scroll the reading strip a
little (swipe left/right), then pick a **different Surah** from the Surah
dropdown near the top of Study options. **Expected**: the reading strip
lands on the new surah's own first āyah, on screen, not wherever the old
scroll position happened to land. No sign-in beyond the existing
owner/prime session is needed; nothing is written to Firestore by this
change (confirmed: `writes=0` in every case above).

## Deliberately NOT done

- **No version bump** (`v08.32` stays current, `v08.33` unallocated — this
  IS a real behaviour change and needs a Master Architect allocation, same
  as every prior round on this branch).
- **No merge/deploy/Rules change.**
- **`ayahSelect`'s own handler is untouched** — investigated, does not
  reproduce, left alone rather than "fixed" defensively.
- **The Range cross-surah content-policy gap is flagged, not fixed** —
  a genuine Owner/Master-Architect product decision, out of this task's own
  named scope.
- **PR #139's own body is extended with this round's update, not rewritten**
  — its earlier rounds' own sections are kept as history, per the task's own
  instruction.
