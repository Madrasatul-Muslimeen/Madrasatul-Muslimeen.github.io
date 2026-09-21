# Word Card / Mushaf: audio-follow off-screen scroll fix, and PR #139 evidence repair

**Issue #113, comment `5762932654`** — a third continuation on this same
stack, following `5760397546` (PR #139 evidence repair round) and
`5761146956` (the Mushaf-mode word-card arrival timing fix, PR #139 head
`43dc87f`). Verified first rather than trusted: `origin/main` at `16cfb0b`
(`v08.32`); stack heads `#135` `4078b65`, `#137` `ffeccd5`, `#138` `a2585a0`,
`#139` `43dc87f` — all re-confirmed by fetching the PR refs directly, not
read off prose. Issue #123 (the platform coordination issue the task also
named) was re-read for context; nothing in it bears on this Quran-owned,
Word-Card-adjacent task.

## Gate A — three named corrections to PR #139's own evidence, none to the app

**(1) The Mushaf scroll-timing report's "this round" file inventory was
wrong, and the same class of gap the task itself was flagging.**
`docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.md` claimed the
previous round's own diff (against PR #139's prior head `ba86e0851c`) was
three files, 557 insertions — but that round's own commit (`43dc87f`) also
carried its own dated Markdown/HTML report pair, which the count omitted.
Verified directly:

```
git diff --stat ba86e08 43dc87f
 app/js/hifz-renderer.js                                                     |  84 ++++-
 app/quranrevival.html                                                       |  66 +++-
 docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.html             | 130 +++++++
 docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.md               | 369 ++++++++++++++++++
 tools/i18n-verify/quran-word-card-mushaf-scroll.mjs                         | 419 +++++++++++++++++++
 5 files changed, 1056 insertions(+), 12 deletions(-)
```

Corrected in both the `.md` and its `.html` twin (hand-patched to match, the
same technique the prior evidence-repair round used, because
`tools/md2report.py` has no fenced-code-block handling at all and
regenerating from scratch would have reintroduced the exact "literal stray
backtick" defect that round already fixed for the other reports in this
stack — confirmed by actually running the generator against the corrected
Markdown and diffing the two: the existing committed HTML already carries
proper `<pre><code>` blocks, the regenerated one does not).

**(2) The stale "un-checked-in" header — corrected.**
`tools/i18n-verify/quran-word-card-mushaf-scroll.mjs`'s own module header
said it was "following this project's own established practice for a
focused un-checked-in script" — true of the project's OLDER convention
(a focused Playwright script run once and thrown away), false of this file,
which is committed, versioned, and re-run by every later round in this
stack (three times already, in this task's own governance-suite re-run
below). Reworded to say plainly that it is committed and runs the same way
its sibling suites do.

**(3) Audit: are the pre-fix negative control and the actual destination
geometry independently asserted, and are ordinary-flow and Note-origin
regressions covered?** Read the whole 59-check suite line by line rather
than sampled:

- **GATE A and GATE B are two separate, independently-asserted checks**, not
  one conflated pass/fail: GATE A (`quran-word-card-mushaf-scroll.mjs` lines
  ~278–279) samples mid-flight state (the state already moved to the
  destination surah, the destination content genuinely not yet rendered) —
  it establishes that the async race is real, nothing about whether the fix
  works. GATE B (line ~322) is the actual fix assertion: the destination
  word's own `getBoundingClientRect()` is checked against the viewport,
  separately from a prior "the span exists at all" check (line ~321) — an
  existence check and a geometry check are two different `check()` calls, so
  a future regression that (say) fails to render the destination at all is
  distinguishable from one that renders it but never scrolls to it.
- **The "pre-fix negative control" is a manual revert-and-confirm proof**,
  not an automated dual-run baked into the committed suite — consistent with
  this project's own established convention throughout its history ("revert
  the CSS and it exits 1", stated in prose rather than built as an in-suite
  toggle). The suite's own header comments narrate that the revert-and-confirm
  step was actually performed during development and found two real defects
  (the `renderMushafPages()` double-render race, and the `inline: "nearest"`
  finding this task's own Gate B goes on to close) — read and confirmed
  present, not merely asserted.
- **Ordinary (non-Mushaf) flow regression is embedded directly in the same
  file** (the closing `{...}` block, "Regression: the same cross-surah jump
  with Mushaf OFF"), matching the stack's own stated convention ("so a future
  change that breaks one while fixing the other cannot hide behind 'that's a
  different suite'").
- **Note-origin regression is covered by re-running the separate, dedicated
  51-check suite** (`quran-word-card-note-origin-return.mjs`) rather than
  duplicated inline — the previous round already re-ran it on this exact
  final integrated head and reported 51/0; embedding ~150 lines of Note-view
  setup a second time inside the Mushaf suite would duplicate coverage the
  dedicated suite already owns in full, the same "not duplicated here"
  principle `quran-word-card-flow-nav.mjs`'s own header already states for
  Range-unit semantics. **No gap found** — this task's own independent re-run
  of `quran-word-card-note-origin-return.mjs` below reproduces 51/0 again, on
  the final state after this round's own new fix.

No code was changed for this item — audit only, and the audit found the
suite's construction sound.

## Gate B — Mushaf audio-follow off-screen āyah targeting: reproduced and fixed

The task's own preferred candidate: `setActiveAyah()` in
`app/js/hifz-renderer.js`, the audio/drill "follow the recitation" primitive
(round 28), uses `inline: "nearest"` on the same `#pageViewContainer` PR
#139's own synthetic-fixture testing already measured as never actually
scrolling (`scroll-snap-type: x mandatory` + `direction: rtl` — a direct
DOM test found `inline: "nearest"` leaves `scrollLeft` unchanged while
`inline: "start"` moves it correctly, on the identical element). PR #139's
own report flagged this as "a plausible PRE-EXISTING, LIVE defect for the
same container whenever the sounding āyah is on a page not already on
screen" and deliberately did not fix it (different feature, out of that
task's own scope).

**Reproduced with a committed real-browser synthetic fixture, no TLS
bypass, no playback-timing change, no writes, no Range-policy assumption.**
New suite: `tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs`.

- **Why this needs real playback, and why a direct function call would not
  do**: `setActiveAyah()` is only ever reached from
  `audio-player.js`'s `onAyahChange` callback, which only ever fires from
  genuine playback (`playOneAndWait()`/`playCurrentRangeAyah()`, read
  directly). No test hook exists to call it any other way, and adding one
  would test something the app itself cannot reach.
- **The fixture**: the same `page.route()` interception technique the
  sibling Mushaf suite already established (no TLS trust decision anywhere
  — a same-origin-different-host request answered before it leaves the
  browser's own network stack) — a synthetic two-page Mushaf (surah 2 āyah 1
  on a fabricated page 3, āyah 10 on a fabricated page 45 — deliberately far
  apart in DOM order, matching the sibling suite's own reasoning for why a
  single-page render can never demonstrate an off-screen condition), **and**
  a genuine, tiny, decodable silent WAV (8kHz mono 8-bit PCM, 120ms, built
  in-file — the same silent-WAV-as-data-URI technique `audio-player.js`'s
  own `unlockAudio()` already uses for the same reason: a real, decodable
  clip, not a mock object) served for the Arabic reciter's real per-ayah
  route (`archive.org/download/abdullah-ali-basfar.ayahbyayah/**`, the exact
  host this project's own standing lessons already record as unreliable from
  this sandbox).
- **The drill**: Study Unit "Range of Ayahs", surah 2, āyahs 1–10 — ten REAL
  local āyahs (not a fabricated count), kept short only so ten genuine
  `playOneAndWait()` steps finish quickly. Āyahs 2–9 carry no synthetic
  glyph entry at all, so `setActiveAyah()` is a correct, silent no-op for
  each of them (its own doc comment: "No-op if that ayah isn't part of the
  currently-rendered page(s)") — proven by the drill completing cleanly with
  no page errors, not merely assumed.
- **The real "▶ Play" button is pressed** — `playCurrentSelection()` →
  `playDrill()` → `playOneAndWait()` per āyah, entirely unmodified by this
  task. Mode/repeat stay the app's own defaults ("Each Ayah", ×1); Range is
  used exactly as the existing feature already is, nothing about what a
  Range means for Mastery/tracking is touched or assumed.

**The fix**, `app/js/hifz-renderer.js`, one line inside `setActiveAyah()`:
`inline: "nearest"` → `inline: "start"`, matching
`scrollToAyahIfRendered()`'s own already-fixed sibling call exactly (same
container, same CSS interaction). `block` stays `"nearest"` (ordinary
vertical scroll, unaffected) and `behavior` stays `"smooth"` — this is a
scroll-target fix, not a playback-timing change; nothing in
`audio-player.js` was touched.

**A real timing trap in the TEST, found and fixed before trusting a first
green run**: `scrollIntoView({ behavior: "smooth" })` animates
asynchronously over real wall-clock time. The suite's first draft read
`getBoundingClientRect()` the instant the destination word was marked
`"playing"` (the same tick `setActiveAyah()` calls `scrollIntoView`) and
reported GATE B as failing even on the FIXED code — a false failure against
correct code, not a real one (`scrollLeft` before/after was `0`/`0`,
i.e. sampled before the animation had moved at all). Fixed by polling for
`scrollLeft` to actually settle (three consecutive stable samples, bounded
at 3s) before taking the final measurement, the same "poll a real DOM
state, never sample once" discipline this stack's own sibling suites already
follow.

**Revert-and-confirm, performed for real, not merely narrated**:

```
# fixed code
node tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs
25 passed, 0 failed

# app/js/hifz-renderer.js: inline: "start" -> inline: "nearest" (temporary revert)
node tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs
21 passed, 4 failed
  FAIL  en GATE B: the off-screen destination āyah is actually SCROLLED INTO VIEW ...
  FAIL  en #pageViewContainer's own scrollLeft genuinely moved ...
  FAIL  bn GATE B: the off-screen destination āyah is actually SCROLLED INTO VIEW ...
  FAIL  bn #pageViewContainer's own scrollLeft genuinely moved ...

# fix restored
node tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs
25 passed, 0 failed
```

The reverted run fails **exactly** the two GATE B assertions, in both
languages, and nothing else — every precondition, the ten-step drill
itself, the origin's own un-mark, the real-audio-request count, the
no-writes check and the no-page-errors check all still pass on the
unfixed code, which is what proves the two failures are really about the
scroll target and not a fixture artefact.

## Suite results — raw, independently re-run on this round's own final state

```
tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs (new)   -> 25 passed, 0 failed
tools/i18n-verify/quran-word-card-mushaf-scroll.mjs (#139)     -> 59 passed, 0 failed
tools/i18n-verify/quran-word-card-return.mjs (#135)            -> 55 passed, 0 failed
tools/i18n-verify/quran-word-card-popup.mjs (#137)             -> 22 passed, 0 failed
tools/i18n-verify/quran-word-card-flow-nav.mjs (#138)          -> 19 passed, 0 failed
tools/i18n-verify/quran-word-card-note-origin-return.mjs (#139) -> 51 passed, 0 failed
```

## Governance suites — all seven, full-history checkout with both ledger HELD refs fetched by remote-tracking name

```
1) programme-ledger.mjs                           -> 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                 -> 49 passed, 0 failed
3) brief-integrity.mjs                             -> 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            -> 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  -> 11 passed, 0 failed
6) study-event-wiring.mjs                          -> 41 passed, 0 failed
7) rules-authorisation-executable.mjs              -> 38 passed, 0 failed
```

Local results only — no head-specific CI result was available for this
head at the time of writing.

## Changed-file inventory

**This round's own diff**, against PR #139's own prior head (`43dc87f`) —
computed WITH this report's own committed Markdown/HTML pair included from
the start, the exact gap Gate A's item (1) above corrected in the PREVIOUS
round's own report:

```
 app/js/hifz-renderer.js                                                     |  12 ++-
 docs/reports/2026-09-21-word-card-mushaf-audio-follow-and-evidence-repair.md | 289 ++++++++++++++
 docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.html             |  12 +-
 docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.md               |  15 +-
 tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs                      | 321 ++++++++++++++
 tools/i18n-verify/quran-word-card-mushaf-scroll.mjs                         |   6 +-
 6 files changed, 643 insertions(+), 12 deletions(-)
```

**Whole stack** (#135→#139 plus this round), against verified current `main`
(`16cfb0b`):

```
 app/js/hifz-renderer.js                                                     |  96 ++++-
 app/quranrevival.html                                                       | 193 +++++++++-
 docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.html         | 101 +++++
 docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.md           | 352 ++++++++++++++
 docs/reports/2026-09-21-word-card-desktop-popup-window.html                 | 123 ++++++
 docs/reports/2026-09-21-word-card-desktop-popup-window.md                   | 249 ++++++++++++
 docs/reports/2026-09-21-word-card-flow-mode-return-navigation.html          |  94 +++++
 docs/reports/2026-09-21-word-card-flow-mode-return-navigation.md            | 370 ++++++++++++++
 docs/reports/2026-09-21-word-card-mushaf-audio-follow-and-evidence-repair.md | 289 ++++++++++++++
 docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.html             | 132 +++++++
 docs/reports/2026-09-21-word-card-mushaf-scroll-timing-fix.md               | 374 ++++++++++++++
 docs/reports/2026-09-21-word-card-note-origin-return-investigation.html     | 112 ++++++
 docs/reports/2026-09-21-word-card-note-origin-return-investigation.md       | 169 ++++++++
 docs/reports/2026-09-21-word-card-stack-integration-evidence-repair.html    | 118 ++++++
 docs/reports/2026-09-21-word-card-stack-integration-evidence-repair.md      | 331 ++++++++++++++
 tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs                      | 321 ++++++++++++++
 tools/i18n-verify/quran-word-card-flow-nav.mjs                              | 198 ++++++++++
 tools/i18n-verify/quran-word-card-mushaf-scroll.mjs                         | 423 +++++++++++++++++
 tools/i18n-verify/quran-word-card-note-origin-return.mjs                    | 410 ++++++++++++++
 tools/i18n-verify/quran-word-card-popup.mjs                                 | 291 ++++++++++++++
 tools/i18n-verify/quran-word-card-return.mjs                                | 373 ++++++++++++++
 21 files changed, 5102 insertions(+), 17 deletions(-)
```

No protected or shared path anywhere in either diff:

- No `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`,
  `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`,
  `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`.
- No `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, no `tools/md2report.py`.
- No `docs/governance/` path (including no `.rules`/index candidate).
- No `firestore.rules`, `firebase.json`, `tests/firestore/`,
  `tools/firestore-emulator/`.
- No `.github/workflows/`.

## What this deliberately does NOT do

- **No version bump.** This is a real, user-visible behaviour change (the
  Mushaf audio-follow scroll target) and needs a Master Architect version
  allocation — `app/js/version.js` is untouched, `v08.32` stays current,
  `v08.33` remains unallocated, flagged as incomplete pending that
  allocation.
- **No merge, no deploy, no Rules/index change, no approval claimed.**
- **`audio-player.js` is untouched** — nothing about playback timing,
  boundary detection, or the drill sequencer changed; only the scroll
  TARGET inside `setActiveAyah()`.
- **`setActiveAyah()`'s own "playing" highlight logic is untouched** — only
  its `scrollIntoView` call's `inline` option changed.
- **The pre-existing Range/surah-crossing content-correctness product
  decision packet and the earlier Mushaf-mode word-card-arrival items
  remain untouched** — outside this round's own three-item bound.
- **No further, fourth item was sought this round** — Gate A's three named
  corrections and Gate B's reproduction-and-fix both landed with real
  findings; the task's own framing supports stopping here.

## Owner app test

**NO before this round merges** (nothing on `main`/served yet — this is a
draft, unmerged branch). **YES after #135→#139 (including this round) are
merged**, at `https://madrasatul-muslimeen.github.io/app/quranrevival.html`,
signed in as owner/prime, any width, either language:

1. Open Quran Study, Read screen, a surah with several pages of Mushaf
   content (e.g. Surah Al-Baqarah). Turn on **Mushaf view**.
2. Set Study Unit to **Range of Ayahs** spanning a wide range (e.g. ayah 1
   to ayah 100) so more than one Mushaf page is in the range.
3. Scroll the Mushaf view so the FIRST page is on screen and a LATER page
   (further into the range) is off screen.
4. Press **▶ Play**. Expected (this round's fix): as the recitation reaches
   an āyah whose page is off screen, the Mushaf view **scrolls to bring it
   into view** — before this fix, it silently stayed on the original page
   while the recitation moved on, with only the (invisible, off-screen)
   "now sounding" highlight actually updating.
5. Repeat in Bangla; repeat with Mushaf view OFF (unaffected — the ordinary
   flow view's own now-playing highlight/scroll, unchanged).

No Firestore write happens anywhere in this flow.
