# Range cross-surah content policy — reproduced with exact state and rendered rows, decision packet for the Master Architect/Owner (no policy chosen)

**Issue #113, comment `5765863506`** ("QURAN MAP v4 NEXT"), the seventh
task-bridge round on this stack. Verified first rather than trusted:
`origin/main` at `16cfb0b` (`v08.32`); stack heads `#135` `4078b65`, `#137`
`ffeccd5`, `#138` `a2585a0`, `#139` `2a373e39e0fb3fb53c1e749c66b581fdbfdc2a43`
(matches the task's own stated head exactly — the prior round's own
`5764719193`). Issue #123 (the platform coordination issue the task also
named) was re-read: it is a separate, not-yet-dispatched MMSA platform
coordination item ("Task trigger to follow") naming Bangla-key/checkout/
Health-nav/E1 items across a different set of PRs (#91/#98/#104/#110/#112/
#120/#122, Health #105/#111/#119/#121); nothing in it names a gate-free,
independently reproducible Quran-owned defect this round could pick up, so
none was invented — per the task's own instruction, this round finishes the
evidence/decision packet below instead.

## Gate A — the newest report pair corrected, independently re-verified

See `docs/reports/2026-09-21-quran-surah-select-scroll-retarget.md`'s own
"Corrected 21 Sep 2026" section: that report's changed-file inventory said 3
files where the commit has 4 (its own dated `.md`/`.html` pair was bundled
into one bullet), and its paired `.html` broke every Markdown list item into
a detached paragraph and every fenced code block into a garbled single-line
paragraph with stray literal backticks — both defects in
`tools/md2report.py`'s own rendering (no fenced-code-block handling existed
at all), not in that report's Markdown. Fixed there; full account in that
file.

Independently re-run from a full-history checkout carrying both
ledger-named refs (`git fetch origin --unshallow`, then
`git fetch origin claude/pensive-knuth-2pu3jj claude/phase4-wiring`):

```
node tools/i18n-verify/quran-flow-step-nav.mjs (#139)                     -> 32 passed, 0 failed
node tools/i18n-verify/quran-mushaf-audio-follow-scroll.mjs (#139)        -> 25 passed, 0 failed
node tools/i18n-verify/quran-word-card-mushaf-scroll.mjs (#139)           -> 59 passed, 0 failed
node tools/i18n-verify/quran-word-card-return.mjs (#135)                  -> 55 passed, 0 failed
node tools/i18n-verify/quran-word-card-popup.mjs (#137)                  -> 22 passed, 0 failed
node tools/i18n-verify/quran-word-card-flow-nav.mjs (#138)               -> 19 passed, 0 failed
node tools/i18n-verify/quran-word-card-note-origin-return.mjs (#139)     -> 51 passed, 0 failed
node tools/i18n-verify/quran-surah-select-scroll-retarget.mjs (#139)     -> 38 passed, 0 failed
```

All eight reproduce PR #139's own documented baseline exactly.

**The negative-control claim was independently re-verified for real**, not
read and trusted: manually reverting the one line added to `surahSelect`'s
own change handler (commenting out `await scrollFlowToCurrentAyah();`
in `app/quranrevival.html`) and re-running
`quran-surah-select-scroll-retarget.mjs` produced:

```
reverted:      34 passed, 4 failed
restored:      38 passed, 0 failed
```

The four failures on the reverted code are exactly the four GATE-B-labelled
checks: `en GATE B: the flow strip is actually SCROLLED to surah 2's own
āyah 1 (this is the fix)`, `bn` of the same, `desktop GATE B: the flow strip
is actually SCROLLED to surah 1's own āyah 1`, and the Range case's `GATE B:
the flow strip is actually SCROLLED to the new surah's own āyah 1` — each
one's own diagnostic showed the flow strip still parked on the stale āyah
(`"visibleAyah":"7"` where `"ayah":"1"` was expected, and the Range case
landing on `"5"` instead of its own new window's first āyah). Both
Mushaf-mode checks and both `ayahSelect` structural-proof checks (10 checks
across both languages) passed unchanged on the reverted code, confirming
they are non-differentiating exactly as PR #139's report claims. `git diff
--stat app/quranrevival.html` was empty both before this manual revert and
after restoring it — the working tree carries no residue from this check.

Restored and re-confirmed: `38 passed, 0 failed`.

**The `ayahSelect` negative finding was independently re-verified too.**
Case 5 of the same suite drives every unit type (`ayah`, `ruku`, `surah`,
`range`) plus Mushaf-on-a-non-flow-unit, in both languages, asserting
`ayahSelectShown` and `flowShown` are never both true at once — structural
proof that `ayahSelect`'s own change handler can never fire while there is
anything for a scroll-retarget fix to act on. All 10 of those checks pass
unchanged whether the `surahSelect` fix above is present or reverted,
confirming they are non-differentiating exactly as claimed; `ayahSelect`'s
handler remains untouched by this round too.

Governance suites, all seven, re-run from the same full-history checkout:

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
head-specific CI result was available at the time of writing (PR #139's
head commit `2a373e39` shows `state: pending, total_count: 0` on GitHub's
own combined-status API — no check has reported against it).

## Gate B — the Range cross-surah content problem, reproduced with exact state and rendered rows

PR #138's own report first raised this; PR #139's sixth round reproduced one
instance of it while investigating `surahSelect`'s own scroll gap and
flagged it again, explicitly out of scope both times ("do not decide
cross-surah Range content policy"). This round reproduces it independently,
end to end, with the exact state and rendered content at every step, and
turns it into the decision packet the task asked for — **no Range code is
changed here.**

### The defect, read from the source before anything was run

`app/quranrevival.html`'s `surahSelect` change handler
(`surahSelect.addEventListener("change", async () => { currentSurahNum =
Number(surahSelect.value); await loadSurah(); await
scrollFlowToCurrentAyah(); });`) calls `loadSurah()`, which resets
`currentAyahNum` to `1` but **never touches `rangeFrom`/`rangeTo`**
(read at `app/quranrevival.html:6009-6032`). `openSurahAt()` (used by
`stepUnit()`'s `ayah`/`surah`/`ruku` branches and by `navigateToAyah()`'s
cross-surah jump) has the same gap — it also only calls `loadSurah()` and
sets `currentAyahNum`. The ONE place in this codebase that gets this right
is `stepUnit()`'s own `range` branch (`app/quranrevival.html:5526-5550`): it
explicitly re-anchors `rangeFrom`/`rangeTo` to a fresh window in the new
surah (forward: starts the window at the new surah's āyah 1; backward: ends
it at the new surah's last āyah), using the reader's own remembered span
(`rangeSpan`) — but only when a surah boundary is crossed by the Prev/Next
"step" gesture. `surahSelect`'s own dropdown, and the word-card cross-surah
jump (`navigateToAyah()`), both reach a surah change through a different
code path and neither carries the same reset.

`currentUnitInfo()` (`app/quranrevival.html:5255-5260`) is the ONE function
every claim, note-origin binding and the dock's own "Tracking: …" line reads
to know what unit is currently selected. Its `range` branch is:
`buildUnitKey.range(currentSurahNum, from, to)` where `from`/`to` come
straight from `rangeFrom`/`rangeTo` — **with no check that the window still
fits inside `currentSurahNum`'s own āyah count, and no check that the window
was ever actually chosen against this surah at all.**

### Reproduced live, both the state and what a reader would actually see

Driven through the real dropdown (`#surahSelect`, dispatching a genuine
`change` event, not a direct state write), English, mobile viewport
(390×844), no code changed:

| Step | `surahSelect` | `rangeFromSelect` | `rangeToSelect` | Rendered flow-strip rows (`.page-flow-ayah[data-ayah]`) | `#wheelUnitNowLine` (the dock's own "Tracking:" line — exactly what `currentUnitInfo().label` reads) |
|---|---|---|---|---|---|
| 1. Surah 1, Range unit, window set to 3..7 | `1` | `3` | `7` | `3, 4, 5, 6, 7` (surah 1's own āyahs 3–7) | "Tracking: Ayahs 3–7 of Surah 1" |
| 2. Pick Surah 2 from the dropdown | `2` | `3` (unchanged) | `7` (unchanged) | `3, 4, 5, 6, 7` (**surah 2's own** āyahs 3–7 — different text entirely, same numbers) | "Tracking: Ayahs 3–7 of Surah 2" |

No page error, no Firestore write, in either step (`window.__fsLog` write-kind
count `0` throughout).

**Step 2's own label reads as a completely ordinary, valid unit** — "Ayahs
3–7 of Surah 2" is exactly what the app would show if a reader had
deliberately opened surah 2 and picked that window by hand. Nothing on
screen marks it as stale or as a window that was never chosen against this
surah. The five rendered rows are real, readable surah-2 āyahs; a reader who
had not been watching the surah number would see nothing wrong at all.

### Why this is worse than a display glitch — the permanent-key implication

`currentUnitInfo().unitKey` in this state is `range:2:3-7` — a real,
well-formed permanent unit key (I5: units are keyed by permanent ID, never
by name) for "Surah 2, āyahs 3–7," a window **the reader never selected**.
Three consumers read exactly this value, unguarded:

1. **A claim.** The wheel and the floating "Track this unit" card both
   claim against `currentUnitInfo().unitKey`
   (`app/quranrevival.html:6155-6176` reads `currentUnitInfo()` directly for
   this). Pressing claim in this state would write a real, permanent
   `entries.range:2:3-7:…` record (I4: nothing is ever deleted — archived or
   superseded only) for a unit the reader was never looking at when they
   made the choice that produced this key.
2. **A Note's origin.** Opening the Note view from this state calls
   `openNoteFor(currentUnitInfo().unitKey, …)`
   (`app/quranrevival.html:12472` onward: `parseUnitKey(unitKey)` feeds
   `noteScope`, and `noteScopeUnitInfo()` at `app/quranrevival.html:10998-
   11003` recomputes the identical composite from `noteScope.rangeFrom`/
   `rangeTo` against `currentSurahNum`). A Note anchored here binds
   permanently (ADR-009's `noteSources`, "a link may be retired, never
   repointed") to `range:2:3-7` — a Study Unit the reader did not choose.
3. **Navigation/bookmarking.** `#readBookmarkBtn` and the reading-position
   bookmark both read `currentUnitInfo()` too
   (`app/quranrevival.html:13072-13084`), so a bookmark saved in this state
   would resume to the same wrong composite window later.

None of the three paths validates the window against the surah before
writing. **This is a data-integrity risk, not only a rendering one**: once a
claim or a Note anchor is written against a key nobody chose, I4 and I5
together mean it can be archived or superseded but never silently
corrected away — the wrong permanent record stays discoverable in that
person's history.

### Two or more safe product-policy options — none chosen here

The task's own instruction is explicit: *"do NOT silently choose a Range
policy or patch it."* Four options were identified (the first three costed
directly against this exact reproduction; the fourth against the existing
UI):

1. **Port `stepUnit()`'s own reset, always, on any surah change while Range
   is selected** — re-anchor the window to the new surah's own āyah 1
   through `rangeSpan` (mirroring the forward branch of
   `app/quranrevival.html:5537-5540`) regardless of whether the old window
   would have fit. **Cost**: consistent and simple, but a reader who picked
   a range that DOES fit the new surah (e.g. 3..7 into a surah with 20
   āyahs) still gets silently moved to 1..5 — a behaviour change even when
   nothing was actually wrong.
2. **Re-anchor only when the window does not fit**, keeping it unchanged
   when it does (a fit check: `to <= currentSurahData.ayahCount` after the
   surah loads). **Cost**: more code (a conditional path `stepUnit()`
   doesn't need, since its own reset always applies at a boundary crossing
   by construction), but never moves a window that was already valid,
   closest to "least surprising."
3. **Clamp only** (`rangeTo = Math.min(rangeTo, newCount)`,
   `rangeFrom = Math.min(rangeFrom, rangeTo)`) rather than fully
   re-anchoring. **Cost**: cheapest, but does not correct the actual
   defect this packet reproduces — a clamped 3..7 in a 5-āyah surah becomes
   3..5, still a window the reader never chose against this surah, just a
   smaller one. Recorded because it was considered, not because it is
   recommended.
4. **Disable/hide Range entirely across a direct surah change** — force the
   unit type back to Ayah (or refuse the surah pick) whenever Range is
   selected. **Cost**: the most protective against a wrong permanent key,
   but removes a working, presumably-used capability (jumping surahs while
   studying a range) rather than fixing it, and needs its own UI treatment
   (what does the picker show, what tells the reader why).

None of these is implemented in this round. Options 1 and 2 both have a
close, already-shipped precedent in `stepUnit()`'s own Range branch, so
either is a small, bounded change once chosen; the choice between them
(always re-anchor vs. re-anchor only when necessary) is a genuine product
question about what a reader would expect, not an engineering one.

### The precise decision required

**The Master Architect or Owner needs to choose one of the four options
above** (or state a fifth) for what `range:{surah}:{from}-{to}` should mean
the moment a Range window is carried across a surah boundary by a **direct
surah pick** — as distinct from the Prev/Next "step" gesture, which
`stepUnit()` already has a working, accepted answer for. The three affected
call sites are `surahSelect`'s own change handler, `navigateToAyah()`'s
cross-surah word-card jump, and (structurally, though not reproduced here)
any future direct-surah-pick site that does not route through
`openSurahAt()`+`stepUnit()`. Until a choice is made, `surahSelect`'s Range
gap stays exactly as reproduced above — a claim, a Note, or a bookmark made
while a Range window has been carried across a surah change by a direct
pick risks a real, permanent record against a unit the reader never chose.

## What this round deliberately did NOT do

- **No Range code changed anywhere** — `rangeFrom`/`rangeTo`,
  `loadSurah()`, `openSurahAt()`, `surahSelect`'s handler and
  `currentUnitInfo()` are all byte-identical to PR #139's own head
  (`2a373e39`); confirmed by `git status --short` showing only the report
  files this round touches.
- **No policy chosen** — the four options above are recorded, not ranked
  beyond their own stated costs, and none is implemented.
- **No protected or shared path touched** — none of `app/js/version.js`,
  `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`, any
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, anything under
  `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`.
  `tools/md2report.py` (not on this list) was touched, for Gate A's
  rendering fix only — see that report's own account.
- **No version bump** — `app/js/version.js` untouched, `v08.32` stays
  current, `v08.33` unallocated.
- **No merge, no deploy, no Rules change, no approval claimed.**
- **No busywork invented from issue #123** — reviewed, found not to name a
  gate-free, independently reproducible Quran-owned item for this round (see
  the opening section above).

## Owner app test

**NO — this round is evidence and documentation only; nothing to test.**
Nothing was fixed or changed in the app by this round beyond the two
already-committed report files this round corrects (Gate A) and this new
report (Gate B, no app change at all). The reproduction above was performed
in this sandbox's own test harness (synthetic Firebase stub, no real
account), not against the live app.
