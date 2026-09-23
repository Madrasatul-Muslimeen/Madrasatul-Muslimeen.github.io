# Health Atlas — Body Systems parity tranche 8: committed browser evidence + navigation slice (2026-09-21)

Authoritative timestamp: **2026-09-21, UTC**.

Dispatched via the MMSA task bridge (issue #115, comment `5760406999`). Developed as
`claude/laughing-goodall-8moeiq` continued (stacked on PR #142's own head `3d6be395`, itself stacked
on PR #140's head `0c6fc05c`, itself based on `main` at `16cfb0b` where PR #127 is already merged) —
this round should be reviewed **stacked on #142**, which should itself be reviewed stacked on #140.

## 0. What was independently checked before changing anything

**Gate re-check, not re-trust.** PR #142's own report claims "All 15 Health-owned suites: 249 passed,
0 failed" and "All 7 governance suites … 182 passed, 0 failed". Both were re-run from a clean
checkout of `3d6be395` before any edit in this round and reproduced exactly: **249/0** and **182/0**
(after the same full-history + named-HELD-ref preflight every prior tranche's report describes).

The comment's own instruction was read in full before deciding scope: fix the evidence gap first,
*then* build one further slice, preferring navigation among currently implemented views. Both are
done, in that order, below.

## 1. The evidence gap — a committed, reproducible browser acceptance test

**Finding, confirmed by reading the reports rather than assumed from the comment's framing**: both
PR #140's report and PR #142's report cite a "focused … Playwright walk" as their browser evidence,
and both say, in their own words, that the script was "un-checked-in … deleted before commit". That
is real evidence of what those sessions actually observed, but it is not evidence anyone else can
re-check — a report that goes on citing a deleted script is asking a reader to trust a claim nobody
can reproduce.

**Fix**: `tools/health-atlas-verify/body-systems-parity-browser.mjs` (new, committed). It is a
genuine departure from this project's own usual convention of throwaway probe scripts (`CLAUDE.md`'s
own "Standing lessons" describe many of them, by design) — the right call for a one-off measurement,
the wrong one for a claim a report goes on citing after the session ends. The precedent for a
*committed* Playwright-based suite already exists in this repository:
`tools/i18n-verify/layout.mjs`, `panel.mjs`, `reading.mjs` and `navcheck.mjs` are all committed,
none is wired into `.github/workflows/verify.yml` (that workflow's own comment says why: "need
Playwright and a served app"), and all are run directly by whoever needs the result. This file
follows the identical shape, scoped to Health.

**What it covers, at desktop (1280×900), tablet (768×1024) and phone (390×844), 16 checks:**

- The 3-column grid resolving to 5 tracks at desktop and collapsing to 1 track below the 980px
  breakpoint at tablet/phone (including with a **stale, already-resized** inline width still on the
  grid — proving the media query's `!important` really overrides a JS-driven value, not just the
  CSS-only default case).
- Both dividers: real `role="separator"`/`aria-orientation="vertical"` elements; a real mouse
  drag on the left (s1) divider, clamped to `[200, 420]`, and — critically — persisting across a
  full redraw triggered by selecting a different organ (state, not a DOM side-effect of the drag
  alone); real keyboard input (`ArrowLeft`/`ArrowRight`) on the right (s3) divider, clamped to its
  stated minimum (220px).
- The wheel's keyboard drill-down (`Enter` on a focused system wedge) into that system's organs,
  and the back control returning to all 9 system-level wedges.
- The search box: a real match ("kidneys" → at least one matching row) and a real non-match
  ("zzz-no-such-organ-zzz" → zero rows), proving it filters in both directions rather than only
  ever narrowing.
- All three built diagrams (Kidneys/Renal & Urinary, Eyes/Sensory, Skin/Integumentary) rendering
  real `<svg>` shapes, not an empty box.
- The corrected "diagram in progress" placeholder (tranche 7's own fix) on a system with no built
  diagram (Heart/Cardiovascular), asserted at **all three viewports**, including that it never again
  claims the text below it is "accurate".
- Zero function-statement evidence badges reading "Cited" (0 of 82 statements carry a specific
  citation, per the claim-provenance registry).

**Proven able to fail, not just to pass** — two independent mutations, each reverted immediately
after confirming the failure:

1. Reintroduced tranche 7's own retracted claim (`text connections below are accurate meantime`)
   into `buildDiagramPanel()`'s placeholder. Result: **3 of 16 checks failed** (desktop, tablet and
   phone all independently caught it), each naming the exact offending sentence.
2. Loosened the s3 (detail column) minimum clamp from `220` to `180`. Result: **1 of 16 checks
   failed**, naming the wrong clamp value observed (180 instead of 220).

Both reverts were confirmed with `git diff --stat app/health/js/health-atlas-view.js` returning
empty before proceeding.

**One real discovery while writing this suite, corrected before it ever shipped**: the s3
(detail-column) divider's keyboard direction is the *mirror* of s1's, by design —
`startColumnDrag()`'s own sign convention makes `ArrowLeft` on the right divider **widen** the
detail column (moving the divider toward the wheel) and `ArrowRight` **narrow** it, the opposite of
the intuitive "left always shrinks" reading. The test's first draft asserted the intuitive-but-wrong
direction and failed against the real, correct app behaviour; re-reading `startColumnDrag()`'s mouse
formula (`newWidth = which === 's1' ? startWidth + deltaX : startWidth - deltaX`) confirmed the
app is right and the test's assumption was wrong, not the reverse. This matches tranche 7's own §4,
which already described this exact sequence correctly ("`ArrowLeft` widens the detail column … 20
further `ArrowRight` presses clamp at the minimum") — the new suite now encodes that as a checked
invariant instead of a paragraph a reader has to trust.

**Both dated report twins this evidence gap was raised against are corrected**, not rewritten:
`docs/reports/2026-09-21-health-atlas-body-systems-parity-tranche6.md`/`.html` and
`2026-09-21-health-atlas-body-systems-parity-tranche7.md`/`.html` each gained a `## CORRECTION` /
`<h2>CORRECTION</h2>` section, appended after their original content (never edited in place), naming
the gap and pointing at this file.

## 2. The next bounded slice — navigation among currently implemented views

The comment's own preference order was read and followed: *"prefer navigation among currently
implemented views or another demonstrable feature from the six-tab parity matrix"*. Navigation was
chosen because a safe candidate existed and needed no new dataset, selector, view logic or field
read.

**The exact six-tab parity matrix**, re-verified against the v02.04 standalone source
(`health/source-v02-04-handover`, commit `ed4dbb2e5`, unchanged):

| Source tab | Built here as | Status |
|---|---|---|
| Body Systems | `health-atlas.html` | Built (tranches 1/6/7, this tranche's own evidence fix) |
| Foods | `health-atlas-more.html` | Built, structural fields only (tranche 3) |
| Diseases | `health-atlas-more.html` | Built, structural fields only (tranche 3) |
| Age Groups | `health-atlas-more.html` | Built, structural fields only (tranche 3) |
| Lifestyle | — | **Not built** — tranche 3's own finding: no clean structural/organizational subset exists (all three substantive fields are lifestyle recommendations end to end); deferred, not silently dropped |
| References | — | **Not built as its own browser** — the 8 references are shown inline, per organ, on the Body Systems detail column; no standalone list-all-references view exists |
| *(bonus, not a source tab)* | `health-atlas-categories.html` | Food Master Categories index (tranche 4) |

So this app has **3 pages, not 6**, and one source tab (Lifestyle) and one source feature
(a standalone References index) remain out of scope for the reason already on record. Building
either now would be materially larger than "the one next bounded slice" the comment asked for —
Lifestyle needs its own product decision (the comment forbids "uncited verification" and "unsupported
clinical/dose/remedy advice", and Lifestyle's dataset is exactly that end to end), and a standalone
References browser is a new page, not a link between existing ones.

**What this tranche found and fixed instead**: `health-atlas.html`'s footer has linked to both
`health-atlas-more.html` and `health-atlas-categories.html` since the tranche-5 integration, but
those two pages only ever linked back to `health-atlas.html` — never to each other. Reaching Master
Categories from Foods/Conditions/Age Groups meant going back through the Body Systems page first,
even though both are one hop from it. Each page's header now also links directly to the other:

- `app/health/health-atlas-more.html`: added `<a href="health-atlas-categories.html">Food Master
  Categories →</a>`, matching the exact wording `health-atlas.html`'s own footer already uses.
- `app/health/health-atlas-categories.html`: added `<a href="health-atlas-more.html">Foods,
  Conditions & Age Groups →</a>`, the same pairing in reverse.

All three pages now form a complete cross-link matrix (each links to the other two), matching what
`health-atlas.html` already had. **Read-only, no new data read, no new page, no CRUD, no
import/export, no clinical/dose/remedy content, no uncited claim.**

**Verified by a throwaway Playwright script** (not committed — this is ordinary navigation, not the
resizable-UI evidence gap this tranche exists to fix): from `health-atlas-more.html`, clicking "Food
Master Categories" landed on `health-atlas-categories.html` with zero page errors; from
`health-atlas-categories.html`, clicking "Foods, Conditions & Age Groups" landed back on
`health-atlas-more.html`, also with zero page errors.

## 3. Verification

**All 16 Health-owned suites, run from the repository root, 0 failed** (15 pre-existing + this
tranche's new committed browser suite):

| Suite | Result |
|---|---|
| `data-integrity.mjs` | 21 passed |
| `selectors.mjs` | 13 passed |
| `claims-integrity.mjs` | 10 passed |
| `claims-mutations.mjs` | 7 passed |
| `view-boundary.mjs` | 14 passed |
| `view-provenance-boundary.mjs` | 7 passed |
| `view-provenance-mutations.mjs` | 4 passed |
| `more-selectors.mjs` | 9 passed |
| `view-boundary-more.mjs` | 26 passed |
| `view-boundary-more-mutations.mjs` | 7 passed |
| `categories-selectors.mjs` | 7 passed |
| `view-boundary-categories.mjs` | 58 passed |
| `view-boundary-categories-mutations.mjs` | 7 passed |
| `view-boundary-wheel.mjs` | 53 passed |
| `view-boundary-wheel-mutations.mjs` | 6 passed |
| `body-systems-parity-browser.mjs` (new) | 16 passed |

**265 passed, 0 failed.** The 15 pre-existing suites' counts are byte-identical to PR #142's own
report (249) — nothing in this round's diff touches anything they read; the new 16 are additive.

**All 7 governance suites, run after a full-history + required-ref preflight** (`git fetch
--unshallow`, then explicitly fetching the two HELD branches the ledger declares,
`claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`):

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations.mjs` | 49 passed, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations.mjs` | 11 passed, 0 failed |
| `study-event-wiring.mjs` | 41 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |

**182 passed, 0 failed.** Neither guard script was read, edited or weakened.

**Not applicable: browser English/Bangla.** Confirmed unchanged from every prior tranche's own
finding — `grep -c "i18n\|translateStatic\|t(" app/health/js/health-atlas-view.js` still returns 0.
There is no Bangla surface on any Health Atlas page to check.

**Not applicable: head-specific CI.** `.github/workflows/verify.yml` runs only the seven governance
suites; none of `tools/health-atlas-verify/` (including the new browser suite) is wired into it, by
that workflow's own explicit design. Run directly instead, as every prior tranche has.

## 4. Safety boundary — unchanged, re-run unmodified

Nothing in this round touches a dataset, selector, or the view module's rendering logic — the new
suite reads the page from the outside (a real browser, real DOM), and the two HTML edits add one
`<a>` element each to a header that already contained cross-links in the opposite direction. All 14
existing boundary/mutation suites (view-boundary, view-boundary-wheel, view-boundary-more,
view-boundary-categories, view-provenance-boundary, and their mutation-proof companions) pass
unmodified — none needed a change, because none of this round's files are in their scope.

## 5. Diff budget

`tools/health-atlas-verify/body-systems-parity-browser.mjs` (new), `app/health/health-atlas-more.html`
(one added `<a>`), `app/health/health-atlas-categories.html` (one added `<a>`),
`app/health/README.md` (new Tranche 8 section), `docs/reports/
2026-09-21-health-atlas-body-systems-parity-tranche6.md`/`.html` (correction appended),
`docs/reports/2026-09-21-health-atlas-body-systems-parity-tranche7.md`/`.html` (correction appended),
and this report's own `.md`/`.html`. Checked by name against every protected-path family named in
the task (version, platform-shared files, platform-shared tooling, governance, deployment/security,
the gate itself): **zero matches**.

## 6. What this deliberately does not do

- No version allocated or bumped — `app/js/version.js` untouched, v08.32 stands.
- No protected/shared path touched.
- Nothing merged or deployed; no approval claimed.
- Does not build a Lifestyle tab or a standalone References browser — both remain out of scope for
  the reasons in §2's matrix, not silently dropped.
- Does not add the new browser suite to `.github/workflows/verify.yml` — that workflow's own design
  excludes every Playwright-based suite in this repository, and widening it is outside this task's
  authorised scope (and touches the protected `.github/workflows/` family).
- Does not decide whether a Lifestyle or References surface should ever be built, or in what shape —
  both are Owner/product calls, not test-authoring ones.

## 7. Owner app test

**Required: NO before merge** — nothing here is linked from shared nav or deployed, same posture as
every prior tranche on this issue.

**YES after merge** (and after #140 and #142, since this is stacked on both), direct URL only, no
sign-in/tenant:

1. Open `app/health/health-atlas-more.html` (served over `http://`, not `file://`) and confirm a new
   "Food Master Categories →" link appears under the existing "← Back to the Body Systems browser"
   link; click it and confirm it opens `health-atlas-categories.html`.
2. From there, confirm a "Foods, Conditions & Age Groups →" link appears and returns to
   `health-atlas-more.html`.
3. No other visible change on any of the three Health Atlas pages.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WUkvGJTX7VzzxZppipA2i4

---
_Generated by [Claude Code](https://claude.ai/code/session_01WUkvGJTX7VzzxZppipA2i4)_
