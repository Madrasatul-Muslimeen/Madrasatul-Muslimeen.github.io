# Health Atlas — Body Systems parity tranche 6: Gate A parity matrix + Gate B build (2026-09-21)

Authoritative timestamp: **2026-09-21, UTC** (system clock at time of writing: `2026-09-21T11:47 UTC`, confirmed with `date -u`).

This closes the two gates the originating comment on issue #115 asked for, in order:
**Gate A** — a screen-by-screen parity matrix between the verified v02.04 standalone source and
current `main` (which already carries PR #127's three read-only review pages); and **Gate B** —
the first substantial, owner-visible parity tranche, built as a draft PR directly on current
`main`.

## 0. What this is not

The comment names a Markdown file, `2026-09-19-health-atlas-source-handover.md`, as part of the
source handover. **That file does not exist anywhere in this repository** — checked with
`git ls-tree -r` against every remote branch (including `health/source-v02-04-handover` itself)
and found on none of them. This is recorded rather than invented: the comment's premise about that
one file is not true of the repository as it stands. It does not block this task — the actual
source artefact, `docs/health-source/health-atlas-v02.04-standalone.html`, is real, and its
identity was independently re-verified below rather than trusted from the comment's own numbers.

## 1. Source identity — re-verified, not trusted

| Claim | Verified value | Match |
|---|---|---|
| Branch | `health/source-v02-04-handover` | exists, fetched |
| Commit | `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9` | `git rev-parse` — exact match |
| Path | `docs/health-source/health-atlas-v02.04-standalone.html` | exists at that commit |
| Size | 115,697 bytes | `wc -c` — exact match |
| SHA-256 | `f7cb56980ae125bb387118c9282bf50c92b5fe414ca3480fa92547e9af9685a1` | `sha256sum` — exact match |

## 2. Dataset cardinalities — verified on BOTH sides, not assumed equal

| Dataset | Source (counted directly from the standalone file) | Current `main` (`HEALTH_ATLAS_*`, counted via a live `import()`) | Match |
|---|---|---|---|
| Systems | 9 | 9 | yes |
| Organs | 46 | 46 | yes |
| Foods | 34 | 34 | yes |
| Diseases | 17 | 17 | yes |
| Lifestyle habits | 10 | 10 | yes |
| Age groups | 6 | 6 | yes |
| Food master categories | 8 | 8 | yes |
| References | 8 | 8 | yes |

Every figure the task named was independently re-derived and matches exactly on both sides.

## 3. Gate A — screen-by-screen parity matrix

Columns: **Source** (v02.04 standalone, in-browser, in-memory, fully editable) · **On `main` before
this tranche** (PR #105→#111→#119→#121→#127, merged) · **After this tranche** (this PR) ·
**Medical-evidence status** of what is or would be shown.

| Area | Source behaviour | On `main` before this tranche | After this tranche | Evidence status |
|---|---|---|---|---|
| Six-tab nav (Body Systems / Foods / Diseases / Lifestyle / Age Groups / References) | One page, six tabs | Split across 3 static pages; **no Lifestyle tab, no References tab at all** | **Unchanged this tranche** — still 3 pages, still no Lifestyle/References. Body Systems page itself is otherwise substantially reworked (below) | Lifestyle is safety-excluded by design (its 3 substantive fields are lifestyle recommendations end to end — no structural subset exists, per the tranche-3 report); References tab is simply not built yet, and is low-risk (it is literally the 8-entry citation catalogue already shown inline as links) |
| Body Systems: three-column layout (sections list \| wheel \| detail) | Yes, `.bs-layout-3col`, resizable dividers between columns | **No** — single-column list, click-to-replace detail view | **Built**: CSS grid 3 columns (sections \| wheel \| detail), collapses to 1 column below 980px. Column-width drag-resize (source's own `.bs-divider`) **not** ported — flagged below | n/a (layout only) |
| Collapsible per-system sections | Yes, plus reorder (▲▼), rename, delete, add | **No** — organs listed flat as pill buttons, no grouping affordance beyond a heading | **Built**: expand/collapse only. Reorder/rename/delete/add **not** ported (all are write operations — see §5) | n/a (structure only) |
| Interactive wheel (systems ring → organ ring → **field ring**) | Yes, 3 levels, resizable SVG box | **Not built at all** | **Built, 2 of 3 levels**: systems ring and organ-ring. The third "fields" ring (which just re-shows functions/connections/refs already visible in the detail pane) is **not** ported — flagged below | Wedges/labels carry only organ/system name — no clinical content in the SVG itself |
| Wheel resize | CSS `resize: both` on the SVG box | n/a | **Built** — same CSS property, same interaction | n/a |
| Body-system diagrams (3 built: Renal, Sensory, Integumentary; 6 "in progress" placeholders) | Yes | **Not built at all** | **Built** — all 3 diagrams ported verbatim (same shapes/coordinates/labels), same 6-placeholder split as the source. Diagram data lives in its own new file, `health-atlas-diagrams.js`, with no imports | Pure anatomical structure drawings; no dose, remedy or additive claim of any kind |
| Search (organ name + function text) | Yes, also auto-expands matching sections | **Not built anywhere in the app** | **Built** — `matchesOrganSearch()` reads only `organ.name` and `organ.functions`, the two fields this view already renders; matching sections auto-expand while searching, same as source | Search cannot become a side door into an excluded field — asserted mechanically (§5) |
| Food master categories (8, grouping the 12 intake categories) | Yes, and **editable** (reassign which of the 12 sit under which of the 8, rename either level) | Read-only browser (tranche 4): shows the 8 categories and each one's food count | **Unchanged this tranche** (out of this tranche's Body-Systems-only scope) | n/a |
| All entity add/edit/delete/reorder (organs, foods, diseases, lifestyle habits, ages, systems) — the source's `openForm()` modal, `defaultData()` fallback | Yes, full CRUD, everywhere | **None anywhere** — every page 100% read-only | **Still none** — deliberately, see §5 | Full editing of unreviewed medical content is exactly the safety boundary this task's own instructions ask to hold off on |
| Header JSON export / import / reset | Yes | **Not built** | **Not built** — there is no in-memory mutable `DATA` to export yet (every field the current app shows is a static ES module constant); building export/import ahead of any editing capability would export a fixed snapshot with nothing to import it back into meaningfully | n/a |
| In-memory persistence semantics ("refresh loses edits") | Explicit: `DATA` is a plain JS variable, no `localStorage`, no backend | **Not applicable** — nothing on any page can be edited, so there is no persistence question yet | **Still not applicable**, for the same reason. **This is the semantic a future editing tranche must preserve**: this app must not add `localStorage`-backed "drafts" for Health Atlas data without an explicit product decision, since the source's whole safety model rests on unreviewed edits never surviving a refresh | n/a |

## 4. What Gate B built

**One bounded, read-only tranche on top of the existing Body Systems foundation** (`app/health/js/health-atlas-view.js`, `health-atlas-selectors.js`, and one new file `health-atlas-diagrams.js`), landing directly on current `main` (`16cfb0b`, v08.32) — no stacking needed, since #127 is already merged.

- **Three-column layout** — CSS Grid (`minmax(220px,300px) minmax(260px,380px) minmax(240px,1fr)`), collapsing to a single column below 980px.
- **Collapsible system sections**, default collapsed (matching the source), auto-expanding while a search is active.
- **Two-level interactive SVG wheel** (systems, then one system's organs), built with real SVG DOM nodes (`createElementNS`/`setAttribute`) rather than markup strings — this codebase's view layer has never used `innerHTML` anywhere, and this tranche does not start. Every wedge is also keyboard-operable (`tabindex`, `role="button"`, Enter/Space), which the source's own pointer-only wedges are not — a small accessibility improvement made while porting, not a source behaviour.
- **Resizable wheel box** (CSS `resize: both`), matching the source's own `.wheel-svg-box`.
- **Search box** over organ name + function text (`matchesOrganSearch`, new pure selector).
- **Three body-system diagrams** (Renal & Urinary, Sensory, Integumentary), ported verbatim from the source's own SVG shapes into a new pure-data module, `health-atlas-diagrams.js` (no imports, independently auditable, same pattern as `health-atlas-claims.js`). The other six systems show the source's own "diagram … still in progress" notice.
- Selecting an organ (from the list, the wheel, or search) shows it in the persistent detail column — the same functions/connections/references content the foundation tranche already rendered, unchanged, still with its evidence-provenance badges.

**Still 100% read-only.** Nothing added, edited, deleted or reordered anywhere; the banner text says so explicitly now.

## 5. Safety boundary — how it holds under the new surface area

The foundation tranche's rule — this view reads only `organ.id/.name/.system/.role/.functions/.connections/.refs`, and never `nutritionNeeds`/`foodSources`/`activity`/`deterioration`/any disease or lifestyle field — is unchanged. Three new files touch this view; all three are guarded:

- **`tools/health-atlas-verify/view-boundary-wheel.mjs`** (new, 53 checks) re-runs the forbidden-identifier sweep across `health-atlas-view.js`, `health-atlas-selectors.js`, `health-atlas-diagrams.js` **and** `health-atlas.html` itself, asserts `health-atlas-diagrams.js` carries zero imports and defines *exactly* the three systems the source built a diagram for (no silent fourth), asserts the view never uses `innerHTML`/`outerHTML`, and carries five positive controls proving the wheel, the diagrams, collapsible sections and search all really exist (a guard that cannot fail is worse than none).
- **`tools/health-atlas-verify/view-boundary-wheel-mutations.mjs`** (new, 6 checks) proves the guard above can actually fail: reintroducing `nutritionNeeds` into the detail render, importing `HEALTH_ATLAS_DISEASES` into the page, widening search to read `deterioration`, adding an unauthorised fourth diagram, and switching to `innerHTML` are each caught **by name**.
- **`tools/health-atlas-verify/selectors.mjs`** gained 5 new checks for `matchesOrganSearch` itself (case-insensitivity, name vs. function matching, safety against a malformed organ, blank-term behaviour).
- The existing `view-boundary.mjs` (14 checks) and `view-provenance-boundary.mjs`/`-mutations.mjs` (7 + 4 checks) still pass unmodified — two of the provenance mutations needed a one-line whitespace/formatting match fix in the rewritten view (a stray comment and an arrow-function parenthesis) to keep matching their exact-string replacement targets; **no assertion in either file was weakened**, both were re-run mutation-proven afterward.

**Independent browser-level check, not just the static guards**: a focused, un-checked-in
Playwright walk (29 checks, deleted before commit) opened every one of the 46 organs and checked
that **organ's own** excluded-field values (`nutritionNeeds`/`foodSources`/`activity`/
`deterioration`, 275 values across the dataset) never appear on that organ's own rendered page.
Zero leaks. (An earlier version of this same check compared against the *whole* excluded-field
corpus rather than each organ's own, and found one coincidental hit — "Vitamin D" appears, in
Title Case, in `skin.connections` — "Vitamin D synthesis (supports bones)" — an already-approved,
already-rendered field, coinciding with an unrelated, *different* organ's excluded value that
happens to be exactly the bare string "Vitamin D". This is the same false-positive class the
2026-09-21 PR #136 pre-merge audit already investigated and dismissed for an identical reason;
narrowing the check to each organ's own values removed the noise without weakening what it proves.)

## 6. What remains deferred (named, not silently dropped)

- The wheel's third "fields" ring (functions/nutrition-labels/food-sources/activity/deterioration/connections/refs as wedges) — the source has it; this tranche's detail column already shows the safe subset of that same information, so the ring would be a navigation convenience, not new content, and was left out to keep this tranche bounded.
- System/organ **add, edit, delete, reorder, rename** (the source's `openForm()`, `openAddSystemModal()`, move-up/down, delete-with-confirm) — a real, substantial CRUD surface over content that (per this task's own safety boundary) has not had an accuracy pass. Building it well — validation, in-memory state shape, the "refresh loses edits" persistence contract from §3 — is its own bounded piece of work, not an afterthought bolted onto a layout tranche.
- Header **export / import / reset** — meaningless without something editable to export/reset, per §3.
- **Foods / Diseases / Lifestyle / Age Groups / References** tabs unified into one Body-Systems-style page — out of this tranche's scope (Body Systems only, per the task's own "preferring the Body Systems … layout" instruction); the existing tranche-3/4 pages for Foods/Conditions/Age Groups/Categories are untouched.
- Column drag-to-resize (the source's `.bs-divider`) — a small, self-contained follow-up; the columns are usably sized by default and the wheel box itself is already resizable.

## 7. Verification

**All 15 Health-owned suites, run from the repository root, 0 failed:**

| Suite | Result |
|---|---|
| `data-integrity.mjs` | 21 passed |
| `selectors.mjs` | 13 passed (+5 new, for `matchesOrganSearch`) |
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
| `view-boundary-wheel.mjs` (new) | 53 passed |
| `view-boundary-wheel-mutations.mjs` (new) | 6 passed |

**249 passed, 0 failed.**

**All 7 governance suites, run after a full-history + required-ref preflight** (`git fetch
--unshallow`, then explicitly fetching the two HELD branches the ledger declares,
`claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring` — the exact preflight prior rounds on this
issue diagnosed), against current `main` (`16cfb0b`, v08.32):

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
**29 checks, 0 failed**, covering:

- Desktop (1280×900): 3-column grid really lays out as 3 tracks; 9 sections render, all start
  collapsed; wheel shows 9 system wedges; clicking a section header expands it; clicking a wedge
  drills into that system's organs and shows a back link; the back link returns to 9 wedges;
  selecting an organ (list row) populates the detail column; every visible evidence badge is
  checked and **none** reads "Cited" (0 of 82 statements are `cited-evidence`); searching narrows
  the list; an organ in a system **with** a built diagram (kidneys/renal) shows the real diagram;
  an organ in a system **without** one (heart/cardio) shows the "still in progress" notice; the
  wheel box's CSS `resize` is `both`.
- Tablet (768×1024): no page errors, no horizontal overflow, layout has collapsed to a single
  column (confirming the 980px breakpoint fires, not assumed from the source's own CSS).
- Phone (390×844, this project's own most-tested width): no page errors, no horizontal overflow,
  search box stays usable width, wheel drill-down still works.
- Keyboard: a wedge can receive focus and Enter activates it (the accessibility addition noted in
  §4).
- Excluded-field boundary: all 46 organs opened individually; zero leak their own excluded values
  onto their own page (see §5 for the one false-positive investigated and resolved during this
  check's own development).

**XSS**: this view has never used `innerHTML` anywhere (confirmed structurally, not just by
review — `view-boundary-wheel.mjs` now asserts it), and every string this tranche renders comes
from the static, developer-controlled dataset via `textContent`/`setAttribute`, never from live
user input. **Import validation**: not applicable — no import feature exists yet (§3, §6).

## 8. Diff budget

37 files touched by PR #127 (unchanged, not part of this PR's diff) plus, in this PR:

- `app/health/js/health-atlas-view.js` (rewritten)
- `app/health/js/health-atlas-selectors.js` (one function added)
- `app/health/js/health-atlas-diagrams.js` (new)
- `app/health/health-atlas.html` (CSS + header/footer text updated)
- `tools/health-atlas-verify/view-boundary-wheel.mjs` (new)
- `tools/health-atlas-verify/view-boundary-wheel-mutations.mjs` (new)
- `tools/health-atlas-verify/selectors.mjs` (5 checks added)
- `docs/reports/2026-09-21-health-atlas-body-systems-parity-tranche6.md` + `.html` (this report)

Checked by name against every protected-path family in this task's own instructions
(`app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
`app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`,
`app/css/shell.css`, `tools/i18n-verify/*`, `docs/governance/`, `firestore.rules`, `firebase.json`,
`tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/`): **zero matches.** No
version allocated or bumped (`app/js/version.js` untouched, `08.32` stands). Nothing deployed,
merged, or claimed approved.

## 9. Owner app test

**Required: NO before merge.** Nothing here is linked from shared nav or deployed; this is a
direct-URL-only draft PR, same posture as every prior tranche on this issue.

**YES after merge**, direct URL only (no sign-in, no tenant):

1. Open `app/health/health-atlas.html` (served over `http://`, not a bare `file://` path — see
   `app/health/README.md`).
2. Confirm the page loads with a DRAFT banner and a three-column layout: a list of 9 body systems
   on the left, a wheel in the middle, an empty "select a body part…" panel on the right.
3. Click any system's name in the wheel (or the left-column heading) — the wheel should redraw to
   show that system's own organs, and a "← All Body Systems" link should appear above it.
4. Click an organ (from the wheel, or expand its system in the left column and click its name) —
   the right column should show that organ's name, its body system, its **Functions**, each with a
   small "General reference only" badge, and its references.
5. Click an organ from the **Renal & Urinary** system (e.g. Kidneys) — expect a small anatomical
   diagram above the detail card. Click an organ from any **other** system (e.g. Heart) — expect a
   plain "diagram … still in progress" sentence instead, no image.
6. Type into the search box at the top of the left column (e.g. "kidney") — the list should narrow
   to matching organs and their sections should open automatically.
7. On a phone-width browser window, confirm the three columns stack into one column and nothing
   runs off the edge of the screen.

**Expected result throughout**: everything is view-only — no save/edit/delete control anywhere on
this page — and every function statement carries a visible "General reference only" (never
"Cited") badge.
