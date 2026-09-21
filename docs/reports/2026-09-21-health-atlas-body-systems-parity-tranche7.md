# Health Atlas — Body Systems parity tranche 7: correction + column drag-resize (2026-09-21)

Authoritative timestamp: **2026-09-21, UTC** (system clock at time of writing: `2026-09-21T11:20 UTC`, confirmed with `date -u`).

This is the independent review of draft PR #140 (`claude/laughing-goodall-90k6mh`, head
`0c6fc05c`) and current `main` (PR #127 merged, `16cfb0b`) that issue #115's `/mmsa-task` comment
`5759518320` asked for, plus the one bounded next slice it asked to build. Developed as
`claude/laughing-goodall-8moeiq`, branched from PR #140's own head so its tranche-6 work does not
have to be rebuilt — this PR should be reviewed **stacked on #140**, not on `main` directly.

## 0. What was independently checked before changing anything

**Gate re-check, not re-trust.** PR #140's own report claims "All 15 Health-owned suites: 249
passed, 0 failed", "All 7 governance suites … 182 passed, 0 failed" and a 29-check Playwright walk
covering desktop/tablet/phone. All three were re-run from a clean checkout of `0c6fc05c` before any
edit in this round, and reproduced exactly: **249/0**, **182/0** (after the same full-history +
named-HELD-ref preflight PR #140's own report describes), and a fresh, wider focused Playwright walk
(§4 below) confirmed the 3-column layout, wheel keyboard operation and the three diagrams all work
as claimed.

## 1. The correction — an unsupported claim in PR #140's own diff

**Finding.** `buildDiagramPanel()`'s placeholder for a system with no built diagram read:

> "Diagram for the {systemName} system is still in progress — **text connections below are
> accurate meanwhile**."

`grep -n -i "accurate" $(git diff origin/main 0c6fc05c -- app/health)` finds exactly one hit, this
one, introduced by PR #140 itself (it does not appear on `main` before that PR). This is the
unsupported phrase issue #115's comment named.

**Why it's wrong, precisely.** This app's own evidence-provenance model — built in the
claim-provenance tranche and unchanged since — assigns every one of the 46 organs' 82 function
statements an explicit `EVIDENCE_STATUS`. All 82 are `general-reference-only`
(`claims-integrity.mjs`'s own informational line: `cited-evidence: 0, general-reference-only: 82`),
and the badge rendered next to every one of them says so: *"General reference only — not verified as
evidence for this specific statement."* Nothing in the registry, the data file or this tranche's own
diagram data makes any statement "accurate" in a verified sense — that word asserts something this
codebase's own honesty model explicitly declines to claim anywhere else on the page. It is exactly
the class of overclaim the project's `general reference only, not per-fact verified, not medical
advice` banner (present on this same screen, twice) exists to prevent.

**Fix.** Reworded to point at the same text without asserting its accuracy:

> "Diagram for the {systemName} system is still in progress — **see the general-reference text
> below in the meantime**."

One line, `app/health/js/health-atlas-view.js`. No other text on the page made the same claim —
checked with a second sweep of the diff for `accurate|verified|confirmed|validated|proven` outside
already-correct negative constructions ("not per-fact verified", "not verified as evidence") — zero
further hits.

## 2. Re-verification of PR #140's other claims (3-column layout, wheel keyboard, diagrams)

Read `app/health/js/health-atlas-view.js` and `health-atlas.html` end to end at `0c6fc05c`, then
confirmed each claim in the browser (§4):

| Claim in PR #140's report | Re-checked | Result |
|---|---|---|
| Three-column CSS grid (sections \| wheel \| detail), collapses to one column below 980px | Read the CSS + measured at 1280/768/390px | Confirmed — grid resolves to the expected track count at desktop width, and to a single track below 980px |
| Two-level interactive SVG wheel, keyboard-operable (`tabindex`, `role="button"`, Enter/Space) | Read `makeActivatable()`, then drove it with real keyboard events | Confirmed — focusing a systems-level wedge and pressing Enter drills into that system's organs; the back control returns to the systems level |
| Three diagrams (Renal & Urinary, Sensory, Integumentary), "in progress" notice for the other six | Read `health-atlas-diagrams.js` (3 keys, 0 imports) and opened one organ from each side | Confirmed — Kidneys (renal) renders a real SVG; Heart (cardio, no diagram) renders the placeholder — now corrected (§1) |
| 0 of 82 function statements ever read "Cited" | Re-read `health-atlas-claims.js`'s registry and confirmed in the browser on two different organs | Confirmed |

No further defect was found in the re-check. **§1 is the only correction this round makes to
tranche 6's own work.**

## 3. The next bounded slice — column drag-resize

The comment offered two options for the one next slice: *"preferably source-faithful column
resizing or safe navigation among the existing six review tabs."* Column resizing was chosen: it was
already named as the one deferred, self-contained item in tranche 6's own report §6
("Column drag-to-resize (the source's `.bs-divider`) — a small, self-contained follow-up"), it stays
inside the Body-Systems-only scope this tranche and #140 both already carry, and it needs no new
tab, page or dataset the way "navigation among six tabs" would (the app still has 3 pages, not 6 —
building two more tabs, Lifestyle and References, is materially larger work the comment did not ask
for as the one bounded piece).

**What the source does** (`docs/health-source/health-atlas-v02.04-standalone.html` on
`health/source-v02-04-handover`, re-verified at commit `ed4dbb2e5`, unchanged since PR #105's own
identity check): a mutable `COL_WIDTHS = {s1: 340, s3: 360}` object; two `.bs-divider` strips, one
either side of the always-flexible wheel column; `startColumnDrag(e, whichCol)` on `mousedown`,
adjusting the dragged side's width by the pointer's delta, clamped to `[240, 640]`, and writing the
new width straight to the column's inline `style.width` on every `mousemove` — no full re-render
during the drag, only a state update that the next normal render picks up.

**What this tranche ports, and what it deliberately does not copy verbatim:**

- The same three-event shape (`mousedown` → `mousemove`/`mouseup` on `document`), the same mutable
  per-side width object (`state.colWidths = {s1, s3}`), and the same "write directly to the DOM
  during the drag, let state flow through the next ordinary redraw" technique — ported as-is.
- **Re-applied to this view's CSS Grid layout** (`.ha-bs-3col`) rather than the source's flexbox one
  (`.bs-layout-3col`): the divider strips are now grid tracks (`10px` each) between the three
  content tracks, and a drag rewrites the container's own `grid-template-columns` rather than one
  column's `style.width`. This keeps the wheel column's existing `minmax(240px, 1fr)` flexible
  behaviour exactly as tranche 6 built it.
- **A narrower clamp range, deliberately not the source's `[240, 640]`.** The source's row is
  `full-bleed` (`main.full-bleed { max-width: none; }`); this app's `<main>` caps at `88rem`/`1408px`
  with three tracks plus two 10px dividers plus a `1rem` gap on each side. Letting either side column
  reach 640px here would leave the wheel column as little as ~120px wide on a 1280px-wide browser
  window — visibly broken, not merely tight. Measured against this page's own layout: **`s1` (the
  section list) clamps to `[200, 420]`, `s3` (the detail column) to `[220, 460]`**, chosen so the
  wheel column's `minmax(240px, 1fr)` can never be squeezed below its own stated minimum at the
  narrowest practical desktop width this project tests (1280px: `1280 − 2×10 (dividers) − 2×16
  (gaps, 1rem@16px) − 2×~16 (main padding)` leaves comfortably over 240px free even at both columns'
  maximum).
- **Keyboard resize (`ArrowLeft`/`ArrowRight` on a focused divider) is new, not a source behaviour.**
  The source's own divider is pointer-only. This is the same class of addition tranche 6 already made
  for the wheel wedges (`tabindex`, `role="button"`, Enter/Space — "an accessibility addition beyond
  the source's own pointer-only wedges"), applied here to a second pointer-only control the source
  ships. The divider carries `role="separator"`, `aria-orientation="vertical"` and a descriptive
  `aria-label` ("Resize the body-system list column" / "Resize the detail column"); each arrow-key
  press nudges by 20px, clamped to the same bounds as the mouse drag.
- **Below the existing 980px breakpoint, dividers are hidden and the grid forces a single column with
  `!important`** — the exact same technique the source itself uses at its own (1180px) breakpoint to
  override its own JS-driven inline widths (`.bs-layout-3col .bs-col{width:auto !important;}`). A
  resized-but-then-narrowed screen can never end up with a stale, too-wide inline
  `grid-template-columns` fighting the single-column layout.
- Default widths (`s1: 260`, `s3: 300`) sit inside the old static `minmax()` ranges tranche 6
  shipped (`minmax(220px, 300px)` / `minmax(260px, 380px)`), so a reader who never touches a divider
  sees the identical starting layout tranche 6 already had — checked in the browser walk below (§4,
  "3-column grid really lays out as 5 tracks").

**Still 100% read-only, still no new field read.** This slice touches no data file, no selector, no
evidence-provenance code and no diagram data — only `health-atlas-view.js` (grid construction +
divider widgets) and `health-atlas.html` (divider CSS, updated copy). The existing forbidden-field
boundary (`view-boundary-wheel.mjs`, §5) needed no change and was re-run unmodified.

## 4. Verification

**All 15 Health-owned suites, run from the repository root, 0 failed:**

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

**249 passed, 0 failed** — identical counts to PR #140's own report; nothing in this round's diff
touches anything these suites read beyond the one corrected string and the new (unguarded-by-name,
and not required to be — it adds no forbidden field) divider code.

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

**Focused browser walk** (Playwright, local `serve.js`, un-checked-in, deleted before commit),
**25 checks, 0 failed**:

- **Desktop (1280×900):** the 3-column grid really resolves to 5 tracks (section list, divider,
  wheel, divider, detail); 9 system sections render; the wheel starts at the systems level and a
  keyboard `Enter` on a focused wedge drills into that system's organs, with the back control
  returning to the systems level; the corrected placeholder copy on Heart (no diagram) no longer
  contains "accurate" and still names the system and says "in progress"; 0 evidence badges read
  "Cited" on either Heart or Kidneys; Kidneys renders a real diagram `<svg>`; dragging the left
  divider with the mouse widens the sections column by the drag distance, clamped inside `[200,
  420]`; the resized width survives a full redraw triggered by selecting a different organ (state
  persistence, not just a DOM side-effect of the drag); focusing the right divider and pressing
  `ArrowLeft` widens the detail column by exactly one step (20px); 20 further `ArrowRight` presses
  clamp at the minimum (220px) rather than shrinking further or going negative; the divider carries
  `role="separator"` and `aria-orientation="vertical"`.
- **Tablet (768×1024):** no page errors, no horizontal overflow, the grid has collapsed to a single
  track (confirming the 980px breakpoint still fires), and the dividers are hidden rather than left
  as dead drag handles.
- **Phone (390×844):** no page errors, no horizontal overflow, single-track layout, and the
  corrected placeholder copy renders correctly here too via a real tap (not just at desktop width).

**Not applicable: browser English/Bangla.** This page carries no i18n of any kind (confirmed in PR
#105's own report: "no language-keying (I11) … proposed as the next tranche"; still true — `grep -c
"i18n\|translateStatic\|t(" app/health/js/health-atlas-view.js` returns 0). There is no Bangla
surface to check.

**Not applicable: head-specific CI.** This repository's CI workflow does not currently run the
Health-owned suites as a named per-file check exposed to this session (only the seven governance
suites are wired into `.github/workflows/`, all touching `tools/i18n-verify/`, none of it under
`tools/health-atlas-verify/`); the Health-owned suites above were run directly instead, the same way
every prior Health Atlas tranche has verified itself.

## 5. Safety boundary — unchanged, re-run unmodified

The deferral boundary (`view-boundary.mjs`, `view-boundary-wheel.mjs` and their mutation-proof
companions) reads `health-atlas-view.js`, `health-atlas-selectors.js`, `health-atlas-diagrams.js` and
`health-atlas.html`'s own source text and refuses every forbidden field/collection this app's Body
Systems screen must never touch. Nothing in this round adds an import, a new data field, or an
`innerHTML`/`outerHTML` call — the divider widgets are built with the same `el()`/`svgEl()` DOM
helpers this file has always used, and read only `state.colWidths`, a plain number pair this tranche
itself introduces. All 53 + 6 wheel-boundary checks pass unmodified (§4); no guard needed editing.

## 6. Diff budget

`app/health/js/health-atlas-view.js` (the correction + the divider/grid code),
`app/health/health-atlas.html` (divider CSS, updated header/footer copy), `app/health/README.md`
(new Tranche 6 + Tranche 7 sections — tranche 6 had shipped without one), and this report's `.md` +
`.html`. Checked by name against every protected-path family named in the task (version,
platform-shared files, platform-shared tooling, governance, deployment/security, the gate itself):
**zero matches** (`git diff --stat 0c6fc05c` touches only the four paths above).

## 7. What this deliberately does not do

- No version allocated or bumped — `app/js/version.js` untouched, v08.32 stands.
- No protected/shared path touched.
- Nothing merged or deployed; no approval claimed.
- Does not build the wheel's third "fields" ring, system/organ CRUD, header export/import/reset, or
  the Lifestyle/References tabs — all still named as deferred, unchanged from tranche 6's own §6.
- Does not decide which of the two options the comment offered is "the" right one going forward —
  safe navigation among the (currently 3, not 6) review tabs is still open for a future round.

## 8. Owner app test

**Required: NO before merge** — nothing here is linked from shared nav or deployed, same as #140.

**YES after merge** (and after #140 itself, since this PR is stacked on it), direct URL only, no
sign-in/tenant: open `app/health/health-atlas.html` (served over `http://`, not `file://`).

1. Expand a body system or click a wheel wedge, select an organ — confirm the detail column shows
   its functions with "General reference only" badges (never "Cited").
2. Select an organ in a system **without** a diagram (e.g. Heart) — confirm the placeholder text
   says the diagram is "still in progress" and points at the text below **without calling it
   accurate**.
3. Select an organ in a system **with** a diagram (e.g. Kidneys) — confirm a real diagram renders.
4. On a desktop-width window, hover the thin strip just left of the wheel and just right of the
   wheel — the cursor should change to a resize cursor; drag either one and confirm the
   corresponding column widens or narrows, and the wheel stays visible and usable throughout.
5. Click into one of those same strips (so it shows a focus ring) and press the Left/Right arrow
   keys — confirm the same column resizes in small steps.
6. Narrow the browser window below roughly tablet width — confirm the layout stacks into one column
   and the resize strips disappear.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
