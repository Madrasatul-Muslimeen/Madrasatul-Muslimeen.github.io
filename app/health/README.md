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
