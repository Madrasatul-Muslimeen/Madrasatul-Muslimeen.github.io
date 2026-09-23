# Health Atlas — foundation tranche 1 (draft, unwired)

This directory is a bounded, isolated Health Atlas module foundation, built
from the verified v02.04 standalone source staged on
`health/source-v02-04-handover` (commit `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9`,
`docs/health-source/health-atlas-v02.04-standalone.html`, blob
`dae1476867b6ad28f6911961f1bfd9769dc815d4`, 115,697 bytes,
SHA-256 `f7cb56980ae125bb387118c9282bf50c92b5fe414ca3480fa92547e9af9685a1`).
Every value was re-derived from that exact source and checked before this
tranche was written — see `tools/health-atlas-verify/`.

**This is deliberately not wired into anything else in the repository.** No
shared nav file was touched, nothing here imports `app/js/nav.js`,
`app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js` or
`app/css/shell.css`, there is no Firebase/Firestore call anywhere in this
tree, `app/js/version.js` is untouched, and nothing under `docs/governance/`
was changed. The page needs no sign-in, no tenant and no backend — it only
reads the data file shipped beside it. **It does need to be served over
http, the same as every other page under `app/`** (`node serve.js`, then
open `http://127.0.0.1:8080/app/health/health-atlas.html`): its ES module
imports are blocked by the browser's own CORS rule for the bare `file://`
scheme, exactly the reason `serve.js`'s own header comment gives for why
this whole app needs a local server rather than a double-clicked file.
Measured, not assumed — a Playwright smoke run against a raw `file://` path
failed with that exact CORS error before this note was written; the same
run against `http://127.0.0.1:8080/...` passed. This was worth writing down
rather than letting the page silently overclaim "standalone" in a way this
tranche's own README first got wrong.

## What this tranche built

- `js/health-atlas-data.js` — the preserved dataset: all 9 systems, 46
  organs, 34 foods, 17 diseases, 10 lifestyle habits, 6 age groups, 8 food
  master-categories and the 8-entry reference catalogue, every id and text
  value copied unchanged from the verified source. `HEALTH_ATLAS_STATUS` is
  the literal string `'DRAFT'`.
- `js/health-atlas-selectors.js` — pure, DOM-free selector functions over
  that dataset.
- `js/health-atlas-view.js` + `health-atlas.html` — **one concrete working
  capability**: a read-only Body Systems browser. Pick a system, see its
  organs; pick an organ, see its name, body system, **functions** (what it
  does), what it connects to, and general references. Every screen carries
  a DRAFT / "not medical advice" notice.

## What this tranche deliberately does NOT build

The source also carries `nutritionNeeds`, `foodSources`, `activity`,
`deterioration` per organ, and `remedies` / `homeRemedies` /
`naturalRemedies` per disease — several with specific figures (e.g. a
milligrams-per-day amount). The task that opened this tranche is explicit:
*treat every organ, nutrition, disease and remedy assertion as DRAFT, don't
show it as per-fact verified or as an organ-specific additive dose, and
don't invent anything past what needs verification.* Rather than paraphrase
or soften those figures, this tranche **defers displaying them at all**:

- The data is preserved in `health-atlas-data.js` (so nothing is lost and a
  later tranche can build on it), but
- `health-atlas-view.js` never reads those fields, and never reads
  `HEALTH_ATLAS_FOODS`, `HEALTH_ATLAS_DISEASES`, `HEALTH_ATLAS_LIFESTYLES` or
  `HEALTH_ATLAS_AGES` at all.
- `tools/health-atlas-verify/view-boundary.mjs` asserts that boundary by
  reading the view module's own source text, the same "check by reading the
  code" pattern this repository already uses for its other boundary guards
  — so a future edit that starts rendering a dosage or a remedy fails a
  check instead of shipping quietly.

Also not built, and left for a proposed next tranche: the wheel/diagram
visualisation, the Foods/Diseases/Lifestyle/Age Groups tabs, edit/import/
export, and any language-keying (I11) — this page is English-only and
unlinked, matching how other demo-only draft surfaces in this repository
have been staged before a translation and product-fit pass.

## Governance notes for whoever picks this up next

- **No version was allocated or bumped.** `v08.32` remains unallocated; this
  tranche is not a shipped behaviour change to the live app, and
  `app/js/version.js` was not touched.
- **`CLAUDE.md`'s programme ledger still marks `health` as
  `EXTERNAL_PENDING_ACQUISITION`.** That file is platform-shared and out of
  this tranche's authority to edit. The handover branch existing, and this
  foundation now existing on top of it, is a fact the Master Architect
  should reconcile against that ledger entry — this report flags it rather
  than editing the ledger.
- Nothing here claims parity with, or supersedes, the existing
  `app/health-study.html` topic-module screen (the Phase 7/12 "Health" study
  module already in the shared nav). The two are unrelated and this tranche
  does not touch that file.

## Claim-provenance tranche (`js/health-atlas-claims.js`, additive)

Every organ function statement now renders one evidence-status badge —
`general-reference-only` or `cited-evidence`, a closed two-value vocabulary.
All 82 statements across all 46 organs are currently `general-reference-only`
(0 `cited-evidence`), because none was found to carry an embedded citation
when the whole dataset was scanned programmatically. See
`docs/reports/2026-09-20-health-claim-provenance-tranche1.md`.

## Tranche 3 (`js/health-atlas-more-*.js`, `health-atlas-more.html`)

A second bounded, read-only browser, built on top of the foundation and
claim-provenance tranches: **Foods** (grouped by category), **Conditions**
(cause + symptoms + affected organs) and **Age Groups** (name + range).

**What it deliberately does NOT show, and why:**

- `food.nutrition` and `food.servingQty` — nutrient-dose-shaped
  (`"~2.7L/day"`, `"Adequate fibre 25-38g/day"`).
- `disease.remedies`, `disease.homeRemedies`, `disease.naturalRemedies` —
  treatment/remedy content.
- `ageGroup.notes` — nutrition-guidance prose keyed to age
  (`"Iron needs rise further for menstruating teens"`).
- **`HEALTH_ATLAS_LIFESTYLES` is not read at all.** Unlike the fields above,
  there is no clean structural/organizational subset of that dataset — its
  three substantive fields (`.activities`, `.food`, `.avoid`) are themselves
  lifestyle recommendations end to end (`"150 min/week moderate aerobic
  activity"`, `"avoid screens immediately before bed"`). The whole export is
  deferred rather than partially shown.

**A real defect this tranche's own browser walk found before shipping**:
`food.organs` looks purely qualitative on most entries (`"Lungs:
continuous"`) but six of the 34 foods embed a dose recommendation in the
same field (`"Heart: 40g/day"`, `"Large Intestine: 1 cup/day"`) — found by
opening every rendered food in a real browser, not by reading the field's
shape. `organNamesFor()` in `health-atlas-more-selectors.js` strips to the
organ name only; `tools/health-atlas-verify/view-boundary-more.mjs` and its
mutation-proof companion both assert the view calls it rather than reading
`food.organs` directly. Full account in the tranche's own dated report.

Guarded by `tools/health-atlas-verify/more-selectors.mjs`,
`view-boundary-more.mjs` and `view-boundary-more-mutations.mjs`, following
the same "read the module's own source text" pattern as tranche 1's
`view-boundary.mjs`.

## Tranche 4 (`js/health-atlas-categories-*.js`, `health-atlas-categories.html`)

A third bounded, read-only browser, built on top of this foundation tranche
only (not stacked on the separately-developed claim-provenance or
Foods/Conditions/Age Groups tranches — see this tranche's own dated report
for why): the food **Master Categories** index — the 8-entry taxonomy
(`HEALTH_ATLAS_MASTER_CATEGORIES`) this dataset has carried since tranche 1
but that no view had ever read until now.

**Why this dataset needed no field-by-field deferral, unlike every earlier
tranche:** each master category carries only `.id`, `.name` and `.subs` (a
list of plain category-label strings) — checked directly against the live
data file before writing any code. There is no nutrition, serving-quantity,
remedy, treatment or lifestyle-recommendation field anywhere on this
dataset to exclude. The one cross-dataset read this tranche makes is
`food.category`, to count how many foods sit under each sub-category label
— already an approved, already-displayed field. Every sub-category label
was checked to match a real `food.category` value 1:1 in both directions
(zero orphans either way), and the 8 categories' food counts sum to exactly
34, the whole Foods dataset, confirming the taxonomy partitions it with no
loss and no overlap.

Guarded by `tools/health-atlas-verify/categories-selectors.mjs`,
`view-boundary-categories.mjs` and its mutation-proof companion
`view-boundary-categories-mutations.mjs`, following the same "read the
module's own source text" pattern as the earlier boundary guards — even
though this dataset carries no field of its own to defer, the guard still
refuses an import of `HEALTH_ATLAS_DISEASES`, `HEALTH_ATLAS_LIFESTYLES` or
`HEALTH_ATLAS_AGES`, and any Foods field beyond `.id`/`.name`/`.category`,
since this module has no legitimate reason to touch any of them.

**Originally built without a forward link from `health-atlas.html`'s
footer**, deliberately, to avoid an unnecessary merge conflict with tranche
3's own footer edit at integration time. This combined candidate (tranche 5,
below) is that integration: `health-atlas.html`'s footer now links to both
`health-atlas-more.html` and `health-atlas-categories.html`. The new page
still links back to `health-atlas.html`.

## Combined candidate (tranche 5) — reconciling tranches 1–4 into one branch

This tranche does not add a dataset or a view. It merges the previously
independent tranche 3 (`claude/health-atlas-foods-ages-tranche1`, stacked on
the claim-provenance tranche, itself stacked on this foundation) and
tranche 4 (`claude/health-atlas-master-categories-tranche4`, branched
directly from this foundation tranche and never stacked on tranche 3) into
one branch, so a future integration has a single candidate rather than two
independent stacks that both modify this same foundation. The only
resolution needed: this file (both tranches' sections kept, in the order
above) and `health-atlas.html`'s footer, which now carries both tranches'
forward links side by side. No dataset, selector or view file from any
tranche was changed in the process — see the tranche's own dated report for
the full merge-conflict account and the exact three-branch dependency
table.

## Tranche 6 (`js/health-atlas-diagrams.js`, additive to `health-atlas-view.js`)

Built directly on `main` (tranche 5 already merged, so no stacking was
needed): the Body Systems page's own three-column layout, a two-level
interactive systems/organs wheel, the three body-system diagrams the source
actually built (Renal & Urinary, Sensory, Integumentary — the other six
still show a plain "in progress" notice, matching the source's own split),
and a name/function search box. All read-only, same deferral boundary as
every earlier tranche. Guarded by `tools/health-atlas-verify/
view-boundary-wheel.mjs` + its mutation-proof companion, and 5 new checks
in `selectors.mjs`. Full account, the screen-by-screen parity matrix and
the verification numbers: `docs/reports/
2026-09-21-health-atlas-body-systems-parity-tranche6.md`.

## Tranche 7 — correction + column drag-resize

Two bounded, read-only changes on top of tranche 6, both in
`health-atlas-view.js`/`health-atlas.html` only:

1. **Corrected an unsupported claim tranche 6 shipped.** The "diagram still
   in progress" placeholder asserted the text connections shown instead
   "are accurate" — a word this app's own evidence-provenance model (every
   one of the 82 function statements is `general-reference-only`, never
   verified per-fact) does not support. Reworded to point at that text
   without asserting its accuracy.
2. **Ported the source's column drag-resize** for the sections and detail
   columns either side of the (still-flexible) wheel column — the same
   `mousedown`/`mousemove`/`mouseup` shape and mutable-width-object state
   the source's own `startColumnDrag()`/`COL_WIDTHS` use, re-applied to
   this view's CSS Grid layout rather than the source's flexbox one, with
   its own (narrower) clamp range since this page's row is narrower than
   the source's full-bleed one. Also keyboard-operable (`ArrowLeft`/
   `ArrowRight` on a focused divider) as an accessibility addition beyond
   the source's pointer-only strips — the same kind of addition the wheel
   wedges already carry. Full account, the exact clamp values and reasons,
   and the verification numbers: `docs/reports/
   2026-09-21-health-atlas-body-systems-parity-tranche7.md`.

## Tranche 8 — a committed, reproducible browser acceptance test, plus a navigation slice

Two bounded, read-only changes, neither touching a dataset, selector or view file's own logic:

1. **`tools/health-atlas-verify/body-systems-parity-browser.mjs` (new, committed).** Every prior
   tranche's browser verification was a "focused, un-checked-in Playwright script … deleted before
   commit" — real when it ran, not independently reproducible afterwards. This file fixes that gap
   for the resizable three-column Body Systems UI specifically (the evidence gap issue #115 named):
   a real Chromium walk, run with one command
   (`node tools/health-atlas-verify/body-systems-parity-browser.mjs`), covering desktop/tablet/phone
   with both mouse and keyboard — the 3-column grid, both dividers' drag-resize (clamped, persisting
   across a redraw) and keyboard resize (clamped), the wheel's keyboard drill-down/back, search, the
   three built diagrams, and the corrected "diagram in progress" placeholder text tranche 7
   introduced. Proven able to fail, not just to pass: two independent mutations (reintroducing the
   retracted "accurate" claim; loosening the s3 minimum clamp) were both caught, then reverted. This
   follows the same "committed, not wired into CI" precedent `tools/i18n-verify/layout.mjs`,
   `panel.mjs`, `reading.mjs` and `navcheck.mjs` already set in this repository —
   `.github/workflows/verify.yml` explicitly excludes that whole class ("need Playwright and a
   served app") and none of them is added to it here either.
2. **Cross-linking between the three Health pages.** `health-atlas.html`'s footer already linked to
   both `health-atlas-more.html` and `health-atlas-categories.html` (tranche 5), but those two pages
   only ever linked back to `health-atlas.html`, never to each other — so reaching Master Categories
   from Foods/Conditions/Age Groups meant going back through the Body Systems page first. Each now
   also links directly to the other, completing the same full cross-link matrix
   `health-atlas.html` already had. Read-only, no new data read, no new page.

Full account and verification numbers: `docs/reports/
2026-09-21-health-atlas-body-systems-parity-tranche8.md`.

## Tranche 9 — a References index, linking into existing organ detail

One bounded, read-only capability: a References index for the 8
`HEALTH_ATLAS_REFERENCES`, reachable via a new two-tab bar
(`Body Systems` / `References`) at the top of `health-atlas.html`, alongside
the existing three-column Body Systems layout rather than replacing it.

**What it reads: nothing new.** `organsForReference()` (the new selector,
the reverse of the existing `referencesFor()`) reads only the same
`organ.refs[]` field the detail column's own "General references" block
has read since foundation tranche 1 — no new field, no new dataset, no
change to `health-atlas-claims.js`'s evidence registry.

**Gate A (source fields, ownership, boundary), decided before building:**
the v02.04 standalone source's own References tab (`renderRefsTab()`) is a
flat `id / name / url` table with **no organ links at all** — so "links
into existing organ detail" is this tranche going beyond source parity, on
issue #115's own instruction to add them "where supported". The app has no
URL-addressable per-organ route (`health-atlas.html` takes no query
parameter; organ selection is in-memory `state.selectedOrganId`), so an
organ "link" is a real button wired to the exact same `onSelectOrgan()`
path the sections column and the wheel legend already use — not a fabricated
`<a href>` into a page that cannot resolve it. Ownership: all files touched
are Health-owned (`app/health/**`, `tools/health-atlas-verify/**`); none is
in any protected/shared-path family. Privacy/clinical boundary: unchanged —
no nutrition/dose/remedy/treatment field is read, and the index explicitly
disclaims that a reference listed for an organ backs that organ's material
*in general*, never any one function statement individually (every
statement's own evidence badge, unchanged by this tranche, is what actually
makes that distinction; the index's own note text says so, and a static
guard plus a browser check both assert the index text never uses the word
"cited").

**Gate B — built, since Gate A found no blocker.** `organsForReference()`
in `health-atlas-selectors.js`; `buildViewTabs()` / `buildReferencesScreen()`
in `health-atlas-view.js`; CSS for the tab bar and the references table in
`health-atlas.html`. One real edge case exercised, not hypothetical: of the
8 references, USDA FoodData Central (`r5`) is cited by zero organs in this
dataset (it backs food-nutrition figures this view never renders, per the
existing deferral boundary) — the index says so in words instead of
rendering an empty cell.

**Verification.** `selectors.mjs` gained 6 new checks for
`organsForReference()`; `view-boundary-wheel.mjs` gained 4 new checks,
including two positive controls (the index really links into organ
detail, not a dead reference; the index text never claims per-statement
verification) — both checks proven able to fail by two independent
mutations (breaking the return-to-Body-Systems switch; weakening the
disclaimer text), caught by both the static guard and the new browser
suite independently, then reverted. New committed, reproducible browser
suite `tools/health-atlas-verify/references-index-browser.mjs` (12 checks,
desktop/tablet/phone, mouse click + keyboard Enter + a real touch tap),
following the precedent tranche 8's `body-systems-parity-browser.mjs` set —
not wired into `.github/workflows/verify.yml`, same reason every other
Playwright-based suite here is not.

Full account and verification numbers: `docs/reports/
2026-09-21-health-atlas-references-index-tranche9.md`.

## Tranche 10 — the view switcher's real keyboard/screen-reader operability (issue #115 Gate A/B)

One bounded, read-only correction: `buildViewTabs()`'s two buttons
(`Body Systems` / `References`) declared `role="tab"` + `aria-selected` and
their container `role="tablist"`, borrowing the WAI-ARIA Tabs pattern's
vocabulary without the rest of what that pattern requires — neither button
carried `aria-controls`, nothing carried `role="tabpanel"`, and the
tablist had no Left/Right/Home/End key handling. A screen-reader user was
told "tab, 1 of 2" and then found nothing behind that promise; a
keyboard-only user following the Tabs pattern's own arrow-key convention
found it did nothing.

**Gate A (reproduced before touching app code).** A new committed browser
suite, `tools/health-atlas-verify/references-tabs-accessibility-browser.mjs`,
was run against the unmodified tranche 9 commit (`5817643bf3a7`) first:
5 of its 10 checks failed exactly as described above (no `aria-controls`,
no `role="tabpanel"`, `role="tab"`/`"tablist"` present with no `aria-pressed`
equivalent). See the dated report for the raw console output of that run.

**Gate B — the fix.** These two buttons switch between two whole,
unrelated screens (the Body Systems 3-column layout and the References
table), not panels of one shared view, so building out full tab semantics
(panels, `aria-controls`, arrow-key roving tabindex) would be real
complexity spent modelling a pattern that does not describe what this
control actually is. Issue #115's own instruction named the alternative:
"ordinary buttons if these are view-switch actions." `buildViewTabs()` now
drops `role="tab"`/`"tablist"`/`aria-selected` entirely and uses two plain
`<button type="button">` elements with `aria-pressed` (the WAI-ARIA
toggle-button pattern) inside a `role="group"` container with an
`aria-label`. A native `<button>` needs no bespoke keyboard handling at
all — it is already in the normal Tab order and already activates on both
Enter and Space — and this screen never suppresses its focus outline, so
"visible focus" was already true and stayed true. Re-running the new
suite against the fix: 10/10 pass. `references-index-browser.mjs`'s own
pre-existing `aria-selected` assertions were updated in place to
`aria-pressed` (the attribute the fixed pattern actually uses) — still
12/12 passing.

**What this tranche did NOT do.** It did not build the full ARIA Tabs
pattern (tabpanels, `aria-controls`, arrow-key navigation) — issue #115's
instruction named ordinary buttons as an equally valid outcome when the
controls are view-switch actions, which these are, so this is the
narrower, more conformant fix rather than a partial one. It touched no
protected/shared path, no version number, and nothing outside
`app/health/**` and `tools/health-atlas-verify/**`.

Full account, the Gate A raw failure output, and verification numbers:
`docs/reports/2026-09-21-health-atlas-references-tabs-accessibility.md`.
