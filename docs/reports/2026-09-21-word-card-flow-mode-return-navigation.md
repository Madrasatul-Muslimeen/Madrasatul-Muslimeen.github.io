# Word Card — the flow-mode gap #135 flagged, closed (2026-09-21)

## Task

Issue #113, comment `5756756444` (verified against the MMSA task-bridge's six
checks before being read as a task): *"Take the next bounded Quran Word Card
return-navigation tranche: the sideways/Mushaf flow-mode origin identified as
out of scope in draft #135. First inspect MAP v4, the programme ledger,
current main, and draft PRs #135 and #137; verify precise dependencies and
path ownership. Gate A: reproduce the return path in a browser in both
reading modes, identify actual lost state or scroll location, define
acceptance and a small Quran-owned file budget. Gate B: if a genuine defect
and cleanly stackable on #137 after #135, implement..."*

No MAP v4 document or programme execution ledger exists in this repository
beyond `docs/governance/programme-integration-ledger.json` (confirmed again by
grep, consistent with #135's and #137's own findings) — "Gate A/B" here is
this task's own framing, not a citation.

## Branch and dependency

This branch fast-forwards in PR #137's head (`claude/laughing-goodall-s7pc6n`,
which itself carries PR #135's own commit, `claude/laughing-goodall-kjfoqn`,
unmodified) and merges current `main` (`16cfb0b3`, v08.32, the Health Atlas
PR #127 integration) into it — a clean, conflict-free merge: `git diff e3f6eca
origin/claude/laughing-goodall-s7pc6n --stat` shows PR #137's own stack
touches only `app/quranrevival.html` and adds new test/report files, none of
them a protected or shared path, so nothing from Health Atlas could collide
with it. This PR is stacked on **#137**, depends on **#135 and #137 merging
first**, and its own diff against `origin/claude/laughing-goodall-s7pc6n` is
one new function, one one-line call site, and one new test file.

## Gate A: reproducing the flagged gap in a real browser

PR #135's own report named the gap precisely: *"Sideways/Mushaf flow mode
(Whole Surah/Range, which pages `#pageViewContainer` horizontally) and a
Note-view origin are explicitly not covered — both fall back to the
pre-existing no-op, never a regression — and are flagged rather than silently
left broken."* `readViewScrollContainer()` returns `null` whenever
`#pageViewContainer` (the flow strip) is the visible reading surface, so
`origin.scrollY` is always captured as `0` and `setReadViewScrollTop()` is a
no-op on the way back.

**The first debug run found this premise incomplete, not wrong.** A captured
PIXEL offset — the mechanism that works for `#ayahPanels` — is not what is
actually missing here. `#pageViewContainer`'s own `scrollLeft` is a property
of the CONTAINER, and a browser does **not** reset it when `renderFlowView()`
replaces the element's `innerHTML` with a different surah's content: the
stale pixel value simply carries over into the new content's coordinate
space. Reproduced with a focused, un-checked-in Playwright script (deleted
before commit), surah 2 āyah 71 (root سلم, word 13) in Whole Surah flow mode,
scrolled to that āyah's own page (`scrollLeft = -24920`), then following a
lemma occurrence at **4:92** (a different surah):

- **The AWAY leg lands on the wrong content.** Arrival at surah 4 kept
  `scrollLeft = -24920` unchanged, which in surah 4's own (differently
  proportioned) flow strip landed the reader on **surah 4's own āyah 71** —
  not āyah 92, the āyah actually tapped. The tapped word (`4:92:17`) was
  measurably off-screen (`rLeft: -7217px` against a 356px-wide viewport).
  This is not a "scroll lost" defect in the sense of "back to the top" — it
  is landing on unrelated, wrong content with no indication anything is
  wrong.
- **The RETURN leg happened to be correct in this exact scenario**, but by
  coincidence, not design: returning to the SAME surah (2) reproduces the
  identical deterministic layout, so the stale pixel value from the away leg
  lands back on the right page purely because the content is byte-identical
  to what it was. This is not a guaranteed contract — it depends on the
  destination and origin surah's flow strips having matching total widths,
  which does not hold in general (confirmed separately for Range, below).

**Both legs go through exactly one function**, `navigateToAyah()` — called
only by `goToWordOccurrence()` (the away leg) and `openWordOccurrenceAt()`
(the return leg, via `returnToWordCardOrigin()`), and by nothing else in the
file. Ordinary navigation (Prev/Next, the Ayah/Surah selects, the flow
strip's own swipe) never calls it — confirmed by grep, and independently
confirmed by a debug run showing that switching surahs or setting `ayahSelect`
through their own normal change handlers does not move the flow strip at all
(a deliberate, documented design elsewhere in the file: *"this view has never
moved `#ayahSelect` as it scrolls"*, `stepFlowAyah()`'s own comment). This
means a fix placed inside `navigateToAyah()` is scoped to the word-card
mechanism alone and cannot touch any other navigation path.

## A second, pre-existing defect found and NOT fixed here

Testing **Range** unit type surfaced a real, separate defect: `currentUnitType
=== "range"` derives its flow bounds from `rangeFrom`/`rangeTo` — raw āyah
numbers with no surah attached. Following a cross-surah lemma occurrence
while Range is selected renders **the destination surah's own āyahs 65–75**
(an arbitrary slice unrelated to the tapped word), not the target āyah at
all. **This is NOT new, and NOT scoped to the word-card mechanism**: the
plain `surahSelect` dropdown's own change handler
(`surahSelect.addEventListener("change", ...)`) calls `loadSurah()` directly
with no revalidation of `rangeFrom`/`rangeTo` either — switching surahs by
hand while reading a Range shows exactly the same wrong content. It predates
issue #113 entirely and is a Study-options/Range design question (what should
"the same range" mean across a surah change?), not a return-navigation gap.
**Flagged here, not built** — fixing it would mean deciding that question,
which is outside this task's bounded scope and not "cleanly stackable" as a
small fix.

## Gate B: the fix

One new function beside `readViewScrollContainer()`, and one call site inside
`navigateToAyah()`:

```js
function scrollFlowToCurrentAyah() {
  if (getComputedStyle(pageViewContainer).display === "none") return;
  if (mushafToggle.checked) return;
  const row = pageViewContainer.querySelector(`.page-flow-ayah[data-ayah="${currentAyahNum}"]`);
  row?.scrollIntoView({ inline: "start", behavior: "instant" });
}
```

Called at the end of `navigateToAyah()`, after `renderStudyScreen()`. This is
**identity-based, not pixel-based** — it finds the row for the āyah actually
being shown and brings it into view, which is correct on both legs and does
not depend on origin/destination surahs sharing a total scroll width. Verified
against the fix: the same cross-surah reproduction now lands on **surah 4,
āyah 92** (the correct target, word in view), and the return trip still lands
correctly on surah 2, āyah 71.

**Mushaf mode is deliberately NOT covered, for two independent reasons.**
(1) `hifz-renderer.js`'s word spans (`renderWord()`) carry no ayah-identifying
attribute at all — only an internal, module-private `wordRegistry` map knows
which spans belong to which āyah, so there is no DOM selector this file can
target without either exporting a new function from that shared module or
reconstructing its page-number logic here; both are a larger, riskier change
than this bounded tranche's own file budget allows. (2) This sandbox cannot
verify a Mushaf fix even if one were built: a debug run with `mushafToggle`
checked rendered **zero** `.hifz-page` elements — the Mushaf page glyph data
is fetched via `raw.githubusercontent.com` (per `CLAUDE.md`'s own
`legacy-v07/README-ARCHIVE.txt` note on what the app shares), which this
sandbox's network policy does not reach. Shipping an unverified change to a
shared rendering module is exactly what this project's own standing lessons
warn against. Recorded as a follow-up, same as PR #135's own precedent for
this exact gap.

## What changed

| File | What |
|---|---|
| `app/quranrevival.html` | `scrollFlowToCurrentAyah()` (new, ~10 lines) + one call site in `navigateToAyah()` (1 line). No other line touched. |
| `tools/i18n-verify/quran-word-card-flow-nav.mjs` *(new)* | Focused, un-checked-in Playwright acceptance script — 19 checks: Whole Surah cross-surah round trip (both languages, arrival AND return), Range same-surah regression (proving the pre-existing Range/surah-crossing gap above is untouched, neither better nor worse), and the ordinary single-āyah unit type (proving `scrollFlowToCurrentAyah()` is a true no-op outside flow mode). |
| `docs/reports/2026-09-21-word-card-flow-mode-return-navigation.md` / `.html` *(new)* | This report. |

`app/js/quran-word-card.js` and `app/js/hifz-renderer.js` were read but not
modified.

## Suite results

```
node tools/i18n-verify/quran-word-card-flow-nav.mjs
==== 19 passed, 0 failed ====
```

Re-run, unmodified by this round, to confirm no regression to #135/#137's own
suites:

- `quran-word-card-return.mjs` (PR #135's own 55-check suite) → **55 passed, 0 failed**
- `quran-word-card-popup.mjs` (PR #137's own 22-check suite) → **22 passed, 0 failed**

## Governance suites (all seven, required by this task)

```
1) programme-ledger.mjs                           → 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                  → 48 passed, 1 failed
3) brief-integrity.mjs                             → 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            → 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  → 11 passed, 0 failed
6) study-event-wiring.mjs                          → 41 passed, 0 failed
7) rules-authorisation-executable.mjs              → 38 passed, 0 failed
```

**The one failure in (2) is pre-existing and unrelated to this change** —
verified by `git stash`-ing this round's entire diff (both the modified
`app/quranrevival.html` and the new test/report files) and re-running: the
identical `48 passed, 1 failed` result reproduces on the unmodified merge
base (`origin/claude/laughing-goodall-s7pc6n` merged with current `main`).
The failing case is `MUTATION [E] a stream's shared-file touch loses its
declaration` — a guard-E mutation this round never touches (this round
declares no shared-file modification of any kind; `app/quranrevival.html` and
the new files it adds are all Quran-owned, non-shared paths). Not
investigated further or fixed — it is not this round's to fix, and "fix a
pre-existing failure in a platform-shared guard script" would itself require
touching `tools/i18n-verify/programme-ledger-mutations.mjs`, which is on the
protected/shared-tooling list this task may not modify.

## What this deliberately does NOT do

- **No protected or shared path touched** — none of `app/js/version.js`,
  `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`, any
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, anything under
  `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`.
- **No new translation string** — the fix is pure navigation/scroll logic,
  nothing user-visible changes in wording.
- **No Firestore write, Rule, or index** — `__fsLog` write-kind count is 0
  through the whole round trip, both languages (asserted in the new suite).
- **No version bump.** `app/js/version.js` is untouched; `v08.32` stays
  current per the programme ledger, `v08.33` is next unallocated. **This is a
  real (if narrowly-scoped) behaviour fix and needs a version allocated by the
  Master Architect** — incomplete pending that, same as #135's and #137's own
  stated position.
- **No merge, no deploy, no approval claimed.**
- **Mushaf-mode flow scroll targeting is flagged, not built** (untestable in
  this sandbox; would need a shared-module change to `hifz-renderer.js`).
- **The Range/surah-crossing content-correctness defect is flagged, not
  fixed** — pre-existing, not scoped to issue #113, and needs a product
  decision about what "the same range" means across a surah change.
- **The Note-view-origin scroll surface PR #135 also flagged remains
  untouched** — this round did not investigate it; it is a materially
  different, more complex scroll surface per #135's own report, and this
  task's own comment named only the flow-mode gap specifically.

## Owner app test — NO before merge, YES after

**Before merge**: nothing to test — this fixes behaviour not yet on the live
site (depends on #135 and #137 merging first).

**After merge, and after #135/#137 also merge**, on the live app, at any
width:

1. Open Quran Study, turn on word-by-word, set Study Unit to **Whole Surah**
   for a surah such as Al-Baqarah (surah 2).
2. Scroll the flow strip a good way in (e.g. to āyah 70 or later), tap an
   Arabic word to open its Word Card, switch to **Basic Arabic**, and expand
   the "lemma-linked occurrences" line if one appears with a link to a
   **different surah** (most root/lemma lists include one).
3. Tap that occurrence link. **Expected (the fix)**: you land on the
   destination surah, scrolled directly to the tapped āyah's own page — not
   the first page of that surah, and not some unrelated page.
4. Tap "← Back to Word Card". **Expected**: you return to the exact word and
   āyah you started from, scrolled to its own page (unchanged from before this
   fix — the return leg already worked correctly here).
5. Repeat in Bangla.

No Firestore write happens anywhere in this flow.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
