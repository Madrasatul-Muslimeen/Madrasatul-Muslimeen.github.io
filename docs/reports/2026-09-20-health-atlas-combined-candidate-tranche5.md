# Health Atlas combined candidate (tranche 5): reconciling tranches 1-4 into one branch

Dispatched via the MMSA task bridge (issue 115, comment `5752939512`).
Authoritative timestamp: 2026-09-20 22:08 UTC.

## Summary

Four independent Health-owned draft pull requests existed after tranche 4:
draft PR 105 (foundation), draft PR 111 (claim-provenance, stacked on 105),
draft PR 119 (Foods/Conditions/Age Groups, stacked on 111) and draft PR 121
(Master Categories, branched from 105 directly and never stacked on 111 or
119). Two independent stacks both modified the same foundation branch, which
is exactly the situation the dispatching task asked to reconcile into one
integration-ready candidate.

This tranche does that: `claude/health-atlas-combined-candidate-tranche5`,
branched from PR 119's own head (which already contains 105, 111 and 119 in
a straight line) with PR 121's tranche merged on top. **No dataset, selector
or view file from any of the four tranches was changed by this merge.** The
only files touched by the merge itself: `app/health/README.md` (both
tranches' own sections kept, plus a new section recording this
reconciliation) and `app/health/health-atlas.html`'s footer (now links to
both `health-atlas-more.html` and `health-atlas-categories.html`, where it
previously linked only to the former).

## What was investigated first

Before merging anything, each PR's actual diff was read directly from the
GitHub API (`pull_request_read`, not assumed from an earlier report), and
`git diff --stat` was run for every PR against its own declared base:

| PR | Branch | Base | Files touched | Protected/shared path touched |
|---|---|---|---|---|
| 105 | `claude/health-atlas-foundation-tranche1` | `main` | 12, all under `app/health/`, `tools/health-atlas-verify/`, `docs/reports/` | None |
| 111 | `claude/health-claim-provenance-tranche1` | 105's branch | 9, same three directories | None |
| 119 | `claude/health-atlas-foods-ages-tranche1` | 111's branch | 10, same three directories | None |
| 121 | `claude/health-atlas-master-categories-tranche4` | 105's branch | 9, same three directories | None |

`main` had not moved since PR 105 was opened (`origin/main` is still
`2cb405e388`), so no rebase was needed to bring the stack current.

The only file both independent stacks (111-through-119, and 121) modified
relative to their shared base (105) is `app/health/README.md` — each tranche
appended its own section. `health-atlas.html`'s footer was modified only by
119 (which added a forward link the moment it built the "more" page); 121
deliberately left that file alone, saying so in its own report, precisely to
avoid this exact merge conflict at integration time.

## What changed in the merge

- **`git checkout -b claude/health-atlas-combined-candidate-tranche5
  origin/claude/health-atlas-foods-ages-tranche1`** — this already carries
  105, 111 and 119's commits in a straight line, unmodified.
- **`git merge --no-ff origin/claude/health-atlas-master-categories-tranche4`**
  — one real conflict, in `app/health/README.md`. Resolved by keeping both
  sides' sections (claim-provenance, tranche 3, tranche 4, in that order)
  and adding one new section recording the reconciliation itself, including
  a correction to tranche 4's own note that it deliberately left the footer
  unlinked ("this combined candidate is that integration").
- **One follow-up edit, not part of the raw merge**: `health-atlas.html`'s
  footer now reads two links side by side —
  `Also draft: Foods, Conditions & Age Groups (arrow) . Food Master
  Categories (arrow)` — rather than the single link 119 added on its own
  stack. This is the one-line follow-up PR 121's own report flagged as
  needed "at integration time," done here rather than left for later, since
  this branch is exactly that integration.

Every dataset file (`health-atlas-data.js`), every selector file, and every
view file from all four tranches is present in this branch **byte-identical**
to its own PR — confirmed by diffing this branch against each source PR's
head for those specific files.

```
git diff origin/claude/health-atlas-foundation-tranche1 HEAD -- app/health/js/health-atlas-data.js app/health/js/health-atlas-selectors.js app/health/js/health-atlas-view.js
git diff origin/claude/health-claim-provenance-tranche1 HEAD -- app/health/js/health-atlas-claims.js
git diff origin/claude/health-atlas-foods-ages-tranche1 HEAD -- app/health/js/health-atlas-more-selectors.js app/health/js/health-atlas-more-view.js app/health/health-atlas-more.html
git diff origin/claude/health-atlas-master-categories-tranche4 HEAD -- app/health/js/health-atlas-categories-selectors.js app/health/js/health-atlas-categories-view.js app/health/health-atlas-categories.html
```

All four commands produce empty output.

## Boundaries respected

`git diff --stat origin/main HEAD` — 35 files changed, 10,429 insertions,
zero deletions, every path under `app/health/`, `tools/health-atlas-verify/`
or `docs/reports/`. Checked by name against every family in the shared-path
ownership map (version, platform-shared, platform-shared tooling,
governance, deployment/security, the workflow gate itself): zero matches.
No version allocated or bumped — `app/js/version.js` untouched, `v08.32`
stays unallocated. Nothing deployed. Not linked from any shared-nav surface.

## Governance suite results (full-history preflight applied first)

The repository was confirmed shallow (`git rev-parse
--is-shallow-repository` returned `true`), then `git fetch --unshallow
origin` was run, then `origin/claude/pensive-knuth-2pu3jj` and
`origin/claude/phase4-wiring` (the two HELD branches
`docs/governance/programme-integration-ledger.json` declares) were fetched
explicitly — the exact preflight PR 119 and PR 121 each diagnosed a piece of.
`git rev-parse --is-shallow-repository` then returned `false`.

All seven, on this branch's own head, after that preflight:

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations.mjs` | 49 passed, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations.mjs` | 11 passed, 0 failed |
| `study-event-wiring.mjs` | 41 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |

**182 passed, 0 failed, across all seven.** Neither guard script was read,
edited or weakened — both are protected tooling and both are already
correct once the ledger's declared branches are genuinely present.

## Health-owned suite results

All thirteen suites this codebase now carries under
`tools/health-atlas-verify/` (three from tranche 1, four from tranche 2,
three from tranche 3, three from tranche 4), run unmodified on the combined
branch:

| Suite | Result |
|---|---|
| `data-integrity.mjs` | 21 passed, 0 failed |
| `selectors.mjs` | 8 passed, 0 failed |
| `view-boundary.mjs` | 14 passed, 0 failed |
| `claims-integrity.mjs` | 10 passed, 0 failed |
| `claims-mutations.mjs` | 7 passed, 0 failed |
| `view-provenance-boundary.mjs` | 7 passed, 0 failed |
| `view-provenance-mutations.mjs` | 4 passed, 0 failed |
| `more-selectors.mjs` | 9 passed, 0 failed |
| `view-boundary-more.mjs` | 26 passed, 0 failed |
| `view-boundary-more-mutations.mjs` | 7 passed, 0 failed |
| `categories-selectors.mjs` | 7 passed, 0 failed |
| `view-boundary-categories.mjs` | 58 passed, 0 failed |
| `view-boundary-categories-mutations.mjs` | 7 passed, 0 failed |

**185 passed, 0 failed, across all thirteen.**

## Browser walk of every Health page, with excluded-field checks

A focused, un-checked-in Playwright script (Chromium, served via this
repo's own `serve.js`), written for this reconciliation, deleted before
this commit. It builds one excluded-field corpus from the live data module
— every food's `nutrition[]` and `servingQty`, every food's raw `organs[]`
entry that carries a digit (the dose-bearing subset tranche 3's own report
found), every disease's `remedies`/`homeRemedies`/`naturalRemedies`, every
age group's `notes[]`, and the whole Lifestyles dataset (name and all three
substantive fields) — 287 distinct values after removing entries that
collide with an approved label (e.g. several foods' `nutrition` arrays
literally contain the bare word "Protein" as a nutrient-category tag, which
is also an approved master-category name).

It then walks all three pages, opening every individual detail view rather
than sampling:

- **`health-atlas.html`**: all 9 systems opened; all 46 organs opened
  individually; 82 total function statements, 82 total evidence badges (one
  per statement), 0 `cited-evidence`, 0 unclassified — the same honest
  0-cited finding PR 111 established, unchanged by this merge. Footer
  carries exactly one link to `health-atlas-more.html` and exactly one link
  to `health-atlas-categories.html`, confirmed by `href` rather than by
  visible text.
- **`health-atlas-more.html`**: Foods tab (default) renders all 34 foods,
  each opened individually; Conditions tab renders all 17 diseases, each
  opened individually; Age Groups tab renders all 6 age groups (matched by
  their full rendered label, `Name (range)`, since a bare name is a real
  substring of another — `Adult` inside `Midlife Adult` and `Older Adult`),
  each opened individually. Zero Lifestyle dataset names render anywhere
  across any tab.
- **`health-atlas-categories.html`**: all 8 master categories render and
  were opened individually; every category's own sub-category food counts
  match what the live dataset says for it, and the 8 categories' totals sum
  to exactly 34 — the whole Foods dataset, with no loss and no overlap, the
  same invariant PR 121 established. Links back to `health-atlas.html`.

**30 checks, 0 failed, 0 page errors anywhere in the walk. Zero verbatim
excluded-field leaks across 287 distinct values, checked against the
combined text of every list view and every individual detail view on all
three pages.**

Two probe defects were found and fixed while writing this script, neither
an application defect — recorded per this repository's own standing lesson
that a failing check is surprisingly often a wrong assertion:

1. Playwright's unquoted `text=name` locator matches by substring, and this
   dataset has two real collisions the earlier tranches' own narrower
   walks never happened to hit: `Bladder` is a substring of `Gallbladder`,
   and `Thyroid` is a substring of `Parathyroid Glands`. An unquoted
   locator silently opened the wrong organ for one of the 46 and undercounted
   its badges by one. Fixed by quoting every `text=` locator for an exact
   match (`text="Bladder"`), confirmed against the dataset for every other
   organ and system name pair.
2. The age-group list button's own rendered label is `Name (range)`, not
   the bare name (see `renderAgeGroupList` in
   `health-atlas-more-view.js`), so an exact-match locator on the bare name
   found nothing. Fixed by matching the exact label the view actually
   renders.

## PR dependency table (for MMSA-123's ledger/nav authorisation)

| PR | Branch | Base | State | Relationship to this candidate |
|---|---|---|---|---|
| 105 | `claude/health-atlas-foundation-tranche1` | `main` | Open draft | Superseded — its dataset, selectors and Body Systems view are carried into this branch byte-identical |
| 111 | `claude/health-claim-provenance-tranche1` | 105's branch | Open draft | Superseded — its claim-provenance registry and badge rendering are carried into this branch byte-identical |
| 119 | `claude/health-atlas-foods-ages-tranche1` | 111's branch | Open draft | Superseded — its Foods/Conditions/Age Groups browser is carried into this branch byte-identical; its footer edit is extended (not replaced) by this branch |
| 121 | `claude/health-atlas-master-categories-tranche4` | 105's branch (sibling; never stacked on 111 or 119) | Open draft | Superseded — its Master Categories browser is carried into this branch byte-identical; the footer link it deliberately deferred is added here instead |
| This tranche | `claude/health-atlas-combined-candidate-tranche5` | `main` | New draft PR (opened by this task) | Supersedes all four above — the single integration-ready candidate |

**Recommendation, not executed here**: once this combined candidate is
reviewed, PRs 105, 111, 119 and 121 can be closed without merging (their
content lives on, unchanged, inside this branch) rather than merged
individually. Closing someone else's open PRs is outside this task's
authorised scope — that decision, and the exact ledger/nav fields below,
belong to MMSA-123.

The exact `docs/governance/programme-integration-ledger.json` `health`
entry fields (`integrationState`, `repository`, `activeBranch` = this
branch's name, `branchTip` = this branch's head commit, `declaredVersion`,
`baselineSha` = `2cb405e388`, `baselineStatus`, `ownedPaths` = every path
under `app/health/` and `tools/health-atlas-verify/`) and the one-line
`app/js/nav.js` change (matching the shape the `/legacy/`/`/legacy-v07/`
links already use) are unchanged from what PR 119 and PR 121 each already
specified. Neither file is touched by this tranche.

## Owner app test required: NO

Not merged, not deployed, not linked from any shared-nav surface — needs
`node serve.js` and a direct URL to view, same as all four superseded
tranches and for the identical reason. If MMSA-123 authorises integration,
the build/role/steps/evidence for a future Owner test are the same three
URLs already served locally in this task
(`app/health/health-atlas.html`, `app/health/health-atlas-more.html`,
`app/health/health-atlas-categories.html`), with no sign-in and no tenant
required.

## What this deliberately does not do

- Does not resolve which of the five branches (four superseded plus this
  one) should be kept as the repository's permanent Health branch — an
  Owner/Master Architect decision.
- Does not edit `docs/governance/programme-integration-ledger.json` or
  `app/js/nav.js` — both are named above for MMSA-123, neither is touched
  here.
- Does not close, merge, or request review on PRs 105, 111, 119 or 121.
- Does not allocate or bump any version, deploy anything, or claim
  approval.
- Does not add or change any nutrition, dose, remedy, treatment or
  lifestyle-recommendation content — the merge touches only `README.md` and
  one footer line; every dataset, selector and view file is byte-identical
  to its source PR.

## Test plan

- [x] `node tools/health-atlas-verify/data-integrity.mjs` -- 21/0
- [x] `node tools/health-atlas-verify/selectors.mjs` -- 8/0
- [x] `node tools/health-atlas-verify/view-boundary.mjs` -- 14/0
- [x] `node tools/health-atlas-verify/claims-integrity.mjs` -- 10/0
- [x] `node tools/health-atlas-verify/claims-mutations.mjs` -- 7/0
- [x] `node tools/health-atlas-verify/view-provenance-boundary.mjs` -- 7/0
- [x] `node tools/health-atlas-verify/view-provenance-mutations.mjs` -- 4/0
- [x] `node tools/health-atlas-verify/more-selectors.mjs` -- 9/0
- [x] `node tools/health-atlas-verify/view-boundary-more.mjs` -- 26/0
- [x] `node tools/health-atlas-verify/view-boundary-more-mutations.mjs` -- 7/0
- [x] `node tools/health-atlas-verify/categories-selectors.mjs` -- 7/0
- [x] `node tools/health-atlas-verify/view-boundary-categories.mjs` -- 58/0
- [x] `node tools/health-atlas-verify/view-boundary-categories-mutations.mjs` -- 7/0
- [x] All seven required governance suites, after full-history + required-ref preflight, 182/0
- [x] Focused, un-checked-in Playwright browser walk of all three pages, every detail view opened individually, 30/0, zero excluded-field leaks across 287 values
