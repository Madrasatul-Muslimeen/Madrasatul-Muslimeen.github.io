# Word Card — Mushaf-mode cross-surah scroll targeting, fixed (2026-09-21)

## Task

Issue #113, a "QURAN MAP v4 NEXT BOUNDED TRANCHE" task-bridge round: *"prior task
5760397546 completed at draft #139 head `ba86e085`; review current main, MAP
v4/DDR/ledger and actual heads of #135→#137→#138→#139 before work. Investigate
Mushaf-mode cross-surah Word Card occurrence arrival using a Playwright
`page.route` synthetic data fixture, without bypassing TLS verification. Gate
A: reproduce whether `renderFlowView`'s asynchronous Mushaf path leaves the
destination āyah unrendered at scroll time; test English/Bangla and
desktop/mobile, compare Read/Note and non-Mushaf regressions. Gate B: only if
reproduced, implement ONE Quran-owned unprotected-path fix that awaits the
actual render before targeting the destination, with a committed focused
browser test that fails on the old behavior and passes on the fix; preserve
focus, card return, Range semantics and no new write."*

This is exactly PR #139's own named next candidate: *"the named next eligible
bounded item — Option B: restructure `scrollFlowToCurrentAyah()`'s Mushaf
branch to await the real render, verified via a Playwright `page.route()`
synthetic-fixture interception."*

## Verified starting state

- `origin/main`: `16cfb0b3512609313a68d487dca28945a31855b8`, `app/js/version.js`
  reads `APP_VERSION = "08.32"`.
- PR #135 `claude/laughing-goodall-kjfoqn` @ `4078b654e8fe74a312e56fabb80c72c11a116729`, draft, unmerged.
- PR #137 `claude/laughing-goodall-s7pc6n` @ `ffeccd5a779a6c923d69e195487a313907c86a9a`, draft, unmerged, based on #135.
- PR #138 `claude/laughing-goodall-wqztcn` @ `a2585a0d21192954ccde5b8efb5ebaf5b867657a`, draft, unmerged, based on #137, merges current `main` in.
- PR #139 `claude/laughing-goodall-711mno` @ `ba86e0851c996dc5b7583bbcfa3f68e8f8fa33f7`, draft, unmerged, based on #138. This round's own starting point.

All four confirmed via `mcp__github__pull_request_read` (method `get`) rather
than trusted from prose. This round's commits land on the same branch,
`claude/laughing-goodall-711mno`, continuing PR #139.

## Gate A: reproducing the gap, by reading first

`app/js/quranrevival.html`'s `navigateToAyah()` — the word-card mechanism's
one navigation function — used to run:

```js
renderStudyScreen();      // synchronous; internally FIRES renderFlowView() without awaiting it
scrollFlowToCurrentAyah(); // ran on the very next line, synchronously
```

`scrollFlowToCurrentAyah()`'s Mushaf branch was a **permanent, deliberate
no-op** (`if (mushafToggle.checked) return;`), carried from PR #135 with the
stated reason *"hifz-renderer.js keeps no per-ayah row to target."* Reading
`app/js/hifz-renderer.js` found that reason was half true: it has **no**
`.page-flow-ayah`-style markup for a Mushaf page (correct), but it **does**
keep a per-ayah `wordRegistry` (`Map<"surah:ayah", HTMLElement[]>`), the exact
primitive a scroll target needs. What actually blocked this was **timing, not
a missing primitive**: `renderFlowView()`'s Mushaf branch is asynchronous
(`ensureMushafData()` + a per-page font load + line justification inside
`renderMushafPages()`), and nothing awaited it before the old code's own
(no-op) scroll attempt.

This diagnosis was then **measured**, not just reasoned about, with a
synthetic fixture (below), and two further, unplanned defects were found by
the standard-lesson revert-and-confirm step this task itself requires — see
"Two further findings" below. All three had to be closed together before Gate
B could be verified as more than a partial fix.

## The synthetic fixture

`tools/i18n-verify/quran-word-card-mushaf-scroll.mjs` (new, 419 lines)
intercepts the three real network calls `hifz-renderer.js` makes
(`page.route()`, no TLS verification bypassed anywhere — the route answers the
request before it leaves the browser's own network stack):

- the page-layout JSON (`mushaf-madani-v2.json`) — fulfilled after a 250ms
  delay with a small synthetic dataset;
- the per-page glyph fonts — aborted after a 300ms delay (matches this
  sandbox's own genuine TLS failure against the real host, paced wide enough
  to sample reliably);
- the surah-header font — aborted immediately (unused by this fixture).

The synthetic Mushaf spans four pages: page 3 carries the origin āyah
(2:71:13, the same proven fixture `quran-word-card-return.mjs` and
`quran-word-card-flow-nav.mjs` already use, known to carry a lemma occurrence
at 4:92:17 on a different surah — real local word-index data, untouched by
this mock). The destination surah (4) deliberately spans **three** pages
(44/45/46), with the target āyah (4:92) on the **middle** one — see "A
vacuous first version of Gate B" below for why one page was not enough.

Every essential precondition is a named, failing `check()`, never a silent
skip, per this stack's own standing correction (`quran-word-card-note-origin-return.mjs`'s dated correction).

## Gate A result: reproduced

Reading confirmed the mechanism; the fixture then measured the actual race.
Sampled 80ms into the render (well inside the ≥300ms font-load gap):

```
GATE A: navigateToAyah()'s own state already moved to the destination surah
        before the render settles                         -> surah === "4"  TRUE
GATE A: the destination āyah's own Mushaf content is genuinely NOT YET
        rendered at this sampled instant (the real async gap)   TRUE
```

`navigateToAyah()`'s own state mutations (`surahSelect`/`ayahSelect`) run
**before** the async Mushaf render even starts (they're synchronous), while
the destination's own word spans cannot exist until `renderPage()` finishes
appending them — a real, measured gap, not assumed.

## Gate B: the fix

**Quran-owned, unprotected files only**: `app/js/hifz-renderer.js` and
`app/quranrevival.html`. Neither is on the protected/shared list.

1. **`app/quranrevival.html`** — a new module-level `flowRenderPromise`,
   stashed by `renderStudyScreen()`'s own flow-view branch the moment it
   fires `renderFlowView(...)` (one line, at that existing call site — nothing
   about `renderStudyScreen()`'s ~24 other call sites changes, since it stays
   completely synchronous). `scrollFlowToCurrentAyah()`'s Mushaf branch is no
   longer a no-op: it `await`s that promise, re-checks that the flow view is
   still the thing on screen (state may have changed while the render was in
   flight), then calls the new targeting primitive. Its one caller,
   `navigateToAyah()`, now `await`s it too (it was already an `async
   function`).
2. **`app/js/hifz-renderer.js`** — a new export, `scrollToAyahIfRendered(ayahKey)`,
   deliberately **not** a reuse of the existing `setActiveAyah()` (that
   function's "playing" class means "the recitation is sounding this ayah
   right now" — painting the destination gold for an ordinary navigation with
   nothing playing would be the same class of mistake `renderFlowView()`'s own
   "Fix round" comment already records fixing once). It looks the ayah up in
   the module's own `wordRegistry`, scrolls its first span into view, and
   reports (`true`/`false`) whether it actually found something — a caller
   never claims a landing that did not happen.

### Two further findings, closed as part of the same fix

**(1) A pre-existing, unrelated double-render race.** `navigateToAyah()`
changing surah calls `loadSurah()`, whose own tail already calls
`renderStudyScreen()` once (at the just-reset āyah 1); `navigateToAyah()` then
calls it again itself (at the real destination āyah). For a Whole-Surah/Range
unit, the page bounds do not depend on which āyah is "current", so **both
renders can ask `renderMushafPages()` for the same page set, concurrently** —
and that function had no re-entrancy guard: a stale, still-in-flight render's
own `renderPage()` calls kept appending pages and words into the (by then
reset) shared container and `wordRegistry` after a newer render had already
started. Found by the revert-and-confirm step below, not by inspection first:
the *unfixed* code's own scroll attempt reported **`pageCount: 6`** (two full
copies of a three-page render) rather than a clean 3. This is a genuine
characteristic of the surrounding app (not introduced by this fix, and not
specific to word-card navigation — any surah change in Mushaf + Whole
Surah/Range would hit it), so it was closed rather than worked around: a
monotonic `renderGeneration` token, checked inside `renderPage()` after each
`await` (font load) before either the shared `wordRegistry` or the container
is touched, matching the same shape `quranWordCardRequest` already uses
elsewhere in this app for exactly this class of problem ("a superseded async
caller must stop mutating shared state").

**(2) `inline: "nearest"` never scrolls this app's own RTL scroll-snap
container.** The first working version of `scrollToAyahIfRendered()` used
`{ block: "nearest", inline: "nearest", behavior: "instant" }`, matching
`setActiveAyah()`'s own existing call. **Measured, not assumed**: a direct
`element.scrollIntoView({ inline: "nearest" })` against a real off-screen page
in `#pageViewContainer` (which is `direction: rtl` with
`scroll-snap-type: x mandatory`, per its own shared CSS) left `scrollLeft`
completely unchanged — and a *plain* `container.scrollLeft = <any value>`
assignment (property set, `scrollTo()`, `scrollBy()`) was **also** silently
ignored in every variant tried. `{ inline: "start" }`, by contrast — the exact
choice `scrollFlowToCurrentAyah()`'s own non-Mushaf sibling branch already
makes, for the same container — worked immediately and correctly. Fixed to
match that established, already-proven convention.

**This second finding has a real, separate implication for a DIFFERENT,
untouched feature.** `setActiveAyah()` (Mushaf audio-follow-the-recitation
highlighting, "round 28") still uses `inline: "nearest"` on the same
container. If the sounding āyah is on a page not already on screen, this
measurement says that scroll plausibly never fires in the app's own default
(sideways) reading mode. **Flagged in the source (a comment on
`scrollToAyahIfRendered()`) and here — not fixed.** It is a different feature
(audio playback, not word-card navigation), outside this task's own scope, and
deserves its own reproduction before anything is changed. No line of
`setActiveAyah()` was touched.

## The revert-and-confirm proof (Gate B requirement)

Per the task's own instruction: reverted the fix locally (`git stash push --
app/js/hifz-renderer.js app/quranrevival.html`), re-ran the corrected suite,
confirmed the failure, restored the fix, re-ran clean. Three rounds of this
were needed, because the first two attempts each found a genuine defect of
their own — this is reported as history, not smoothed over:

1. **First revert-and-confirm attempt found GATE B was VACUOUS.** With a
   single-page-per-surah fixture, `body.read-sideways #pageViewContainer > *`
   gives every rendered page `flex: 0 0 100%` — with only one child, that page
   *is* the whole scrollable width and reads "in view" the instant it exists,
   scrolled to or not. `GATE B` passed identically on unfixed and fixed code.
   Closed by making the destination surah span three pages (above), with the
   target on the middle one, so a render that never scrolls genuinely leaves
   something else in view.
2. **Second attempt found a genuine TEST TIMING bug, not an app defect.**
   With three pages, the suite's own `destSettled` wait was keyed on the
   destination āyah's marker text — which lands in the DOM as soon as the
   *middle* page (of three, rendered sequentially) finishes, **before** the
   render's own promise (and therefore the fix's own scroll call, which
   awaits it) has actually resolved. The suite was reading scroll state in
   that genuine gap and reporting a false failure against *correctly fixed*
   code. Closed two ways: waiting for the **last** page's own marker (a named
   `LAST_PAGE_MARKER`) before reading scroll state, and — more directly —
   polling for `#pageViewContainer.scrollLeft !== 0` itself, the exact thing
   `GATE B` asserts, before reading the final geometry.
3. **Third attempt: clean.** Reverted code: **exactly one failure** —
   `GATE B` itself, with the target's rect at `left: -508.09375` (fully
   off-screen) and `pageCount: 6` (the double-render, also reproduced on
   unfixed code, as expected — the generation guard is part of the fix).
   Every other check, including the card-return and no-write checks, passed
   on the unfixed code too, which is the precise, isolated positive control
   Gate B needs. Fix restored: **17/17 on the single-context debug run
   (`en`/mobile) and 59/59 on the full four-context suite**, both clean.

## Suite results — raw, as observed

```
node tools/i18n-verify/quran-word-card-mushaf-scroll.mjs   (new, this round)
==== 59 passed, 0 failed ====
```

(4 lang×viewport contexts × 14 checks each = 56, + 3 in the Mushaf-off
regression block = 59 — counted directly from the source's own `check()`
call sites, not estimated.)

Re-run, unmodified by this round except where noted, **all on the current,
fixed head**:

```
node tools/i18n-verify/quran-word-card-return.mjs            (PR #135's own suite)
==== 55 passed, 0 failed ====

node tools/i18n-verify/quran-word-card-popup.mjs              (PR #137's own suite)
==== 22 passed, 0 failed ====

node tools/i18n-verify/quran-word-card-flow-nav.mjs            (PR #138's own suite)
==== 19 passed, 0 failed ====

node tools/i18n-verify/quran-word-card-note-origin-return.mjs  (PR #139's own suite)
==== 51 passed, 0 failed ====
```

`quran-word-card-return.mjs`'s own `clickSafely()` splash-hardening (PR #135's
21 Sep correction) reproduced clean — no hang, no timeout, matching its own
documented baseline exactly.

## Governance suites — raw, as observed

Checkout preflight: this session's checkout was already a full clone (`git
rev-parse --is-shallow-repository` → `false` after one `git fetch
origin --unshallow` early in the session); `origin/claude/pensive-knuth-2pu3jj`
and `origin/claude/phase4-wiring` (the two ledger-HELD refs) were fetched
explicitly. All seven, run individually from the repository root, **on the
final, fixed head**:

```
1) programme-ledger.mjs                           -> 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                  -> 49 passed, 0 failed
3) brief-integrity.mjs                             -> 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            -> 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  -> 11 passed, 0 failed
6) study-event-wiring.mjs                          -> 41 passed, 0 failed
7) rules-authorisation-executable.mjs              -> 38 passed, 0 failed
```

All seven exit 0. None of these suites touch anything this round changed
(Quran/Mushaf word-card code is outside every one of their own scopes), and
the numbers above match this stack's own previously-documented baseline
exactly.

## Changed-file inventory

Computed directly (`git diff <verified-current-main-sha> --stat`), not copied
from prior rounds' prose. **Whole stack (#135→#139 plus this round) against
verified current `main` (`16cfb0b3`):**

```
 app/js/hifz-renderer.js                                                     |  84 ++++-
 app/quranrevival.html                                                       | 193 +++++++++-
 docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.html         | 101 +++++
 docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.md           | 352 ++++++++++++++++
 docs/reports/2026-09-21-word-card-desktop-popup-window.html                 | 123 ++++++
 docs/reports/2026-09-21-word-card-desktop-popup-window.md                   | 249 ++++++++++++
 docs/reports/2026-09-21-word-card-flow-mode-return-navigation.html          |  94 +++++
 docs/reports/2026-09-21-word-card-flow-mode-return-navigation.md            | 370 ++++++++++++++++
 docs/reports/2026-09-21-word-card-note-origin-return-investigation.html     | 112 ++++++
 docs/reports/2026-09-21-word-card-note-origin-return-investigation.md       | 169 +++++++++
 docs/reports/2026-09-21-word-card-stack-integration-evidence-repair.html    | 118 ++++++
 docs/reports/2026-09-21-word-card-stack-integration-evidence-repair.md      | 331 ++++++++++++++
 tools/i18n-verify/quran-word-card-flow-nav.mjs                              | 198 ++++++++++
 tools/i18n-verify/quran-word-card-mushaf-scroll.mjs                         | 419 +++++++++++++++++++
 tools/i18n-verify/quran-word-card-note-origin-return.mjs                    | 410 ++++++++++++++++++
 tools/i18n-verify/quran-word-card-popup.mjs                                 | 291 ++++++++++++++
 tools/i18n-verify/quran-word-card-return.mjs                                | 373 ++++++++++++++++
 17 files changed, 3971 insertions(+), 16 deletions(-)
```

**This round's own diff alone**, against PR #139's own prior head
(`ba86e0851c`):

```
 app/js/hifz-renderer.js                              |  84 ++++-
 app/quranrevival.html                                |  66 +++-
 tools/i18n-verify/quran-word-card-mushaf-scroll.mjs   | 419 +++++++++++++++++++
 3 files changed, 557 insertions(+), 12 deletions(-)
```

No protected or shared path anywhere in either diff — confirmed by listing,
not by claim:

- No `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`,
  `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`,
  `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`.
- No `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`.
- No `docs/governance/` path (including no `.rules`/index candidate).
- No `firestore.rules`, `firebase.json`, `tests/firestore/`,
  `tools/firestore-emulator/`.
- No `.github/workflows/`.

## What this deliberately does NOT do

- **No version bump.** `app/js/version.js` is untouched; `v08.32` stays
  current per `docs/governance/programme-integration-ledger.json`, `v08.33` is
  next unallocated. **This is a real behaviour change and needs a version
  allocated by the Master Architect** — incomplete pending that, same position
  as #135/#137/#138/#139's own.
- **`setActiveAyah()`'s own `inline: "nearest"` call is untouched** — flagged
  as a plausible, separate, pre-existing defect in the audio-follow feature,
  not fixed here. See "Two further findings" above.
- **No new translation string, no Firestore write/Rule/index.**
- **No merge, no rebase, no force-push, no deploy, no approval claimed.**
  Every commit this round pushed is a plain commit onto
  `claude/laughing-goodall-711mno` (PR #139's own branch), which stays
  **draft**.
- **The pre-existing Range/surah-crossing content-correctness defect PR #138
  flagged is still untouched** — out of this round's own scope.

## Owner app test — NO before merge, YES after

**Before merge**: nothing to test — this fixes behaviour not yet on the live
site (PR #139, and the three PRs it stacks on, are all draft and unmerged).

**After merge**, on the live app, at any width, in either language:

1. Open Quran Study, turn on word-by-word, set Study Unit to **Whole Surah**
   (e.g. Al-Baqarah), and turn on **Mushaf view**.
2. Tap an Arabic word inside the Mushaf page — actually, tap the *equivalent*
   word from the ordinary Read view first (Mushaf's own glyphs carry no tap
   target), switch to **Basic Arabic**, expand the lemma-occurrences line, and
   note a link on a **different surah**. *(If none is available on the loaded
   surah, any lemma-linked occurrence crossing surahs will do — this is a
   general Mushaf-mode fix, not specific to one word.)*
3. Turn Mushaf on (the card stays open, floating over the page). Tap the
   cross-surah occurrence link.
4. **Expected (the fix)**: you land on the destination surah's own Mushaf
   page, genuinely scrolled to show it — not the previous page, not a blank
   or stale position.
5. Tap "← Back to Word Card". **Expected** (unchanged, already correct):
   you return to the exact word and āyah you started from, with Mushaf still
   on.
6. Repeat in Bangla, and at a narrow phone width if possible.

No Firestore write happens anywhere in this flow.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01796ZkypZ223nvqKwqZycJZ
