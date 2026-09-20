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

**Deliberately not wired to the other draft pages.** This tranche does not
edit `health-atlas.html`'s footer to add a forward link (unlike how tranche
3 added one there) — doing so on a branch based only on tranche 1 would
create an unnecessary merge conflict with tranche 3's own footer edit at
integration time, for a one-line, purely cosmetic cross-link. The new page
does link back to `health-atlas.html`. See the tranche's own dated report
for the exact integration/merge-order recommendation.
