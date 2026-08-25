# Phase 8 — Monitor & reports — Build Log (round 1)

Read alongside `CLAUDE.md`. Built 10 August 2026, v07.09.

---

## Position

**Round 1 complete, not yet owner-verified.** Scope was confirmed with the
owner before the build (recorded in `CLAUDE.md`): one universal report over
`records` + `activity` (the same shape for every module), weekly and
monthly views, per-student and per-subject summaries, CSV export, print,
plus a Quran-only Approach-status breakdown on top. Read-only throughout —
no new collection, no `firestore.rules` change.

---

## What was built

**`app/js/monitor.js`** (new) — pure aggregation + a couple of bounded
Firestore reads:

- `monthWeekKeys(year, month, weekStartsOn)` — every distinct weekKey whose
  week touches any day of that month (a handful of weeks, never a year at
  once, matching the load-speed contract's spirit even though the contract
  itself names `sessions`, a Phase 14 collection that doesn't exist yet).
- `activityForRoster(db, tenantId, personIds, weekKeys)` — flattened,
  personId-tagged activity entries across a roster and a week list. Built on
  `activity.js`'s own `getWeekActivity()` (one doc-get per person per week,
  deterministic id — missing weeks are just skipped, same convention
  `getRecentWeeksActivity` already uses for the routine renderer's streaks).
- `filterEntriesToMonth()` — trims a month's fetched weeks down to entries
  whose own `date` actually falls in that month (a fetched week can
  straddle two months at its edges).
- `summarizeByStudent()` / `summarizeBySubject()` — the same two axes the
  old app's own Monitor report used (`index.html`'s weekly/monthly report),
  rebuilt against this schema's real activity entries instead of the old
  app's free-text day/subject grid cells. A roster member with zero entries
  still appears (0 days, 0 entries) so a quiet week/month is visible, not
  just absent.
- `summarizeQuranApproaches()` — per-Approach status histogram (all six
  statuses, I7-respecting: `not_applicable` excluded from `countedTotal`/
  `ratio`, never counted as zero) for one person's Quran records. Reads via
  `records.js`'s new `listAllRecordsForPerson()` (one query, every chunk
  the person touches) rather than `quranrevival.html`'s own Explore-screen
  pattern of looping a `getRecordsChunk()` per surah — cheaper, and this
  screen doesn't need per-ayah resolution, only the roll-up.
- `entriesToCsvRows()` / `downloadCsv()` / `printReportHtml()` — same two
  outputs the old app's Monitor report had (`exportWeekCSV`/
  `exportMonthCSV`/`doPrint`), rebuilt against this schema's flat
  activity-entry rows. `printReportHtml()` prints whatever's already
  rendered on screen (a new pop-up window, `window.print()`, auto-close),
  not a re-fetch — same shape as the old app's `doPrint()`, including
  surfacing a blocked pop-up with an `alert()` instead of failing silently.

**`app/js/records.js`** (extended) — new `listAllRecordsForPerson()`: every
records entry for a person across however many chunks they touch, one query
(`tenantId`+`personId`, both fixed by the query's own filters — the same
list-safety proof D9/`PHASE-3-STATUS.md` already established for querying
`records`/`memberships`). `listPendingForPerson()` is now a one-line filter
on top of it instead of its own duplicate query — a safe refactor, same
behaviour, one less copy of the query shape to keep in sync.

**`app/monitor.html`** (new) — sign-in gate (same "Checking sign-in…"
pre-JS markup as the other 16 pages, v07.08), shared nav bar, tenant +
student selects, a "whole roster" checkbox that widens the weekly/monthly
report to everyone visible to the signed-in login (`scopedRoster()`,
computed from real roles or an active "View as" preview — always applied
up front here, unlike `records.html`'s own person picker which lists
everyone and lets Firestore's rules deny the read per-person; a report
iterating a whole roster in one pass needed the scoping done client-side
first so an out-of-scope student doesn't turn into a batch of denied reads
breaking the whole report).

Week/Month tabs with Prev/Next + a date/month picker, a per-student table
(days active, entry count, subject breakdown), a per-subject table (entries,
students, distinct units), a raw-entries table (the CSV/print source), and
the Quran Approach-breakdown table (one student at a time — a status
snapshot, not scoped to the week/month range above, called out on-screen so
it's never mistaken for part of the date-ranged report next to it).

**`app/js/nav.js`** — added a "Monitor" link between Records and People, no
`ownerPrimeOnly` restriction (matches the scope decision: whoever can
already see this data today — owner/prime/teacher/guardian/self per
existing rules — sees the report, no new permission model).

**`app/js/version.js`** — bumped to `07.09`.

---

## Design decisions made without stopping to ask, flagged for review

1. **Quran Approach breakdown reads `claimedStatus`, not `confirmedStatus`.**
   Matches `quranrevival.html`'s own wheel/coverage reads
   (`poolCoverageStatus`) — "what's actually been done," not "what's been
   signed off yet." A pending claim still shows up in the breakdown; it just
   isn't distinguished from a confirmed one in this table. If the owner
   wants confirmation state visible here too, that's a follow-up, not a
   redesign — the histogram already has every entry's `confirmState`
   available, just not rendered.
2. **Quran breakdown is scoped to one student at a time**, not "whole
   roster" like the weekly/monthly report above it. Reading a person's full
   Quran history is already a real, if bounded, cost (however many
   surah/subject chunks they've touched); doing that for an entire roster
   at once on every report load would be the kind of unbounded read the
   load-speed contract exists to prevent. Flagged in case the owner wants a
   multi-student version later — it would need its own, more deliberate
   batching, not just removing the one-person restriction.
3. **CSV/print always reflect the currently-rendered report** (whichever
   scope/range is on screen), not a separate export configuration — same
   "print what's on screen" shape the old app's `doPrint()` used.

---

## Not verified

The actual signed-in click-through — this environment has no real Google
account to sign in with, same limitation every prior phase's build round
has had. What WAS verified mechanically this round:

- `node --check` on every new/edited JS file (`monitor.js`, the
  `records.js` edit, `nav.js`) — parses cleanly.
- `monitor.html` loaded in a real browser against the local dev server: all
  imports resolve (200s), no console errors introduced (the three 404s seen
  are pre-existing and reproduce identically on `records.html` — unrelated
  to this round).
- `renderNavBar()` re-exercised directly in-browser — the new "Monitor"
  link renders in the right place with the right href.
- Every aggregation function in `monitor.js` (`monthWeekKeys`,
  `filterEntriesToMonth`, `summarizeByStudent`, `summarizeBySubject`,
  `summarizeQuranApproaches`, `entriesToCsvRows`) exercised directly
  in-browser against hand-built fixture data — correct week-span
  computation, correct month filtering at a week boundary, correct
  zero-entry student inclusion, correct I7 exclusion of `not_applicable`
  from the Quran breakdown's counted total.

**What the owner should check for real, once signed in:** open Monitor,
confirm the Week/Month tables match what was actually logged this week,
try "whole roster," download a CSV and open it, print a report, and check
the Quran Approach breakdown against a student who has real Quran progress.
