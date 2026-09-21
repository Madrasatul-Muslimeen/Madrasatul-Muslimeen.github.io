# Health Atlas — tranche 4: Master Categories index, and a shallow-clone finding beyond the earlier missing-ref diagnosis

Dated 2026-09-20, authoritative UTC (`date -u`). Dispatched via the MMSA task bridge, issue #115, comment `5752675728`.

## What this task asked for, and what was decided

The dispatching comment asked for a full-history, direct-scope audit of the PR #105 → PR #111 → PR #119 Health Atlas stack; one new bounded, independent, read-only Health-owned slice, built only if dataset inspection proved it could show structural facts without uncited nutrition doses, therapies or lifestyle recommendations, explicitly naming the Master Categories index as a candidate rather than a command; a declared file budget, data/security impact statement, test plan and rollback plan before coding; stacking on PR #119 only if required by imports, with the exact merge order documented; and, if no safe slice existed, an MMSA shared-nav/ledger integration Gate A/B package instead.

**Verdict: a safe slice existed, and it needed nothing from PR #119.** `HEALTH_ATLAS_MASTER_CATEGORIES` — 8 entries, checked directly against the live data file before any code was written — carries only `.id`, `.name` and `.subs` (a list of plain category-label strings). There is no nutrition, serving-quantity, remedy, treatment or lifestyle-recommendation field anywhere on this dataset to defer, unlike every dataset the three prior tranches worked with. This is the Master Categories index the task named as a candidate, built as tranche 4.

## Stack audit: PR #105 → PR #111 → PR #119

Read fresh from the GitHub API rather than assumed, all three still open drafts with `mergeable_state: clean`:

- PR #105 (`claude/health-atlas-foundation-tranche1`, base `main` at `2cb405e388`): the dataset (`health-atlas-data.js`) and the Body Systems browser. Diff scope: 12 files, all under `app/health/`, `tools/health-atlas-verify/` and `docs/`.
- PR #111 (`claude/health-claim-provenance-tranche1`, base PR #105's branch): claim-provenance badges. Diff scope: 9 files, same three path families, touching two existing Health-owned files and adding five new ones — no file outside `app/health/`/`tools/health-atlas-verify/`/`docs/`.
- PR #119 (`claude/health-atlas-foods-ages-tranche1`, base PR #111's branch): the Foods/Conditions/Age Groups browser. Diff scope: 10 files, same three path families.

All three PRs' own bodies independently confirm zero touches to any protected/shared path (version, platform-shared files, platform-shared tooling, governance, deployment/security, `.github/workflows/`) — confirmed again here by re-reading each PR's file list rather than trusting the claim alone.

**PR #105's and PR #111's own reports both originally mis-diagnosed a governance-suite failure as "pre-existing on `origin/main`," and PR #119 corrected both** by finding the real cause: `programme-ledger-mutations.mjs` and `brief-integrity.mjs` both read facts about every branch the ledger declares, including the two HELD branches (`claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`), and a checkout that had not fetched both hit `fatal: invalid object name` errors that masqueraded as suite defects. That correction was independently re-verified in this session (see below) and found to be right, but incomplete — one layer of the same class of problem remained undiagnosed. See "A second, deeper checkout-shape finding" below.

## Dataset inspection, done before writing any code

`HEALTH_ATLAS_MASTER_CATEGORIES` was read directly out of `app/health/js/health-atlas-data.js` on PR #105's branch tip (no code from PR #111 or PR #119 was needed to read it — it has existed, unread by any view, since tranche 1):

- 8 entries: Protein, Carb, Fat, Veg, Fruit, Water, Air, Herbs & Spices.
- Every entry carries exactly `.id`, `.name`, `.subs` — no other field exists on this dataset at all.
- Every sub-category label was cross-checked against every `food.category` value in `HEALTH_ATLAS_FOODS` (34 entries): the two sets match 1:1 in both directions, zero orphans either way.
- The 8 categories' food counts, summed via their `.subs`, total exactly 34 — the whole Foods dataset, confirming the taxonomy partitions it with no loss and no overlap.

The one cross-dataset read the new module makes is `food.category`, already an approved, already-displayed field (`health-atlas-more-view.js` has read it unchanged since PR #119's own tranche). No other Foods field, and no field of Diseases/Lifestyles/Ages, is read anywhere in the new code.

## Declared file budget, data/security impact, tests and rollback (written before coding)

**File budget — 8 new files, 2 additive edits, all inside Health-owned paths:**

- `app/health/js/health-atlas-categories-selectors.js` (new, pure)
- `app/health/js/health-atlas-categories-view.js` (new)
- `app/health/health-atlas-categories.html` (new page)
- `tools/health-atlas-verify/categories-selectors.mjs` (new, pure-logic checks)
- `tools/health-atlas-verify/view-boundary-categories.mjs` (new, boundary guard)
- `tools/health-atlas-verify/view-boundary-categories-mutations.mjs` (new, mutation-proof companion)
- `docs/reports/2026-09-20-health-atlas-master-categories-tranche4.md` (this file)
- `docs/reports/2026-09-20-health-atlas-master-categories-tranche4.html` (its twin)
- `app/health/README.md` (additive — one new section, appended)
- `app/health/health-atlas.html` — **deliberately NOT edited.** See "Why no forward link was added" below.

No file outside `app/health/`, `tools/health-atlas-verify/` and `docs/reports/` is touched. No path in the version, platform-shared, platform-shared-tooling, governance, deployment/security or workflow families appears anywhere in this diff.

**Data/security impact: none.** No Firebase call, no Firestore read or write, no sign-in, no tenant, no new collection, no network call anywhere in the new code — same as every earlier Health Atlas tranche. No PII is involved; the only data read is the static, in-repo, frozen `HEALTH_ATLAS_MASTER_CATEGORIES` and `HEALTH_ATLAS_FOODS` exports. The page stays English-only, unwired, unlinked from `app/js/nav.js` and from every other shared-nav surface.

**Tests, declared before coding and then executed (all passing, detailed below):** a pure selector-logic suite; a source-text boundary guard proving the view and its selectors never read a forbidden field or import a forbidden dataset; a mutation-proof companion proving that guard can actually fail; a focused, un-checked-in Playwright browser walk of all 8 categories with an evidence-based (not word-blacklist) leak check against every real excluded field value in the live dataset; and a re-run of the three tranche-1 suites plus all seven required governance suites.

**Rollback:** trivial. Every change is either a wholly new file or an additive section/line in a Health-owned file. Nothing is wired into shared nav, deployed, or written to any database. Reverting this branch, or simply never merging its draft PR, removes the entire tranche with no migration and nothing else to undo.

## Why this tranche needed nothing from PR #111 or PR #119, and the resulting merge order

The task instruction was explicit: stack on PR #119 only if required by imports. `health-atlas-categories-view.js` imports only `health-atlas-categories-selectors.js` (new in this tranche) and `health-atlas-selectors.js`'s sibling data file `health-atlas-data.js` — both present since PR #105. Nothing here imports `health-atlas-claims.js` (PR #111) or `health-atlas-more-selectors.js`/`health-atlas-more-view.js` (PR #119). So this tranche is built on **PR #105's branch directly** (`claude/health-atlas-foundation-tranche1`), as a sibling of PR #111/PR #119 rather than a fourth link in their chain.

**Exact merge order recommendation for the Master Architect:** `main` → PR #105 (`claude/health-atlas-foundation-tranche1`) is the common ancestor all three siblings share. From there, PR #111 → PR #119 form one chain (claim-provenance, then Foods/Conditions/Age Groups, each needing the one before it); this tranche's branch (`claude/health-atlas-master-categories-tranche4`) is an independent second chain off the same PR #105 base and can integrate before, after, or interleaved with PR #111/PR #119 — its own diff touches no file either of them also touches **except** `app/health/README.md`, where both this tranche and PR #119 append their own new section. That is a textual, sequential append in both cases (matching the pattern PR #111 and PR #119 already used against each other) and resolves as a trivial merge — keep both sections, in whichever order the Master Architect merges the branches. No other file overlaps.

## Why no forward link was added from `health-atlas.html`

PR #119 added a one-line "Also draft: Foods, Conditions & Age Groups" link to `health-atlas.html`'s footer. This tranche's branch is based on PR #105, which does not yet carry that line, so adding a second footer line here for this tranche would either (a) silently diverge from PR #119's footer if PR #119 merges first, needing manual reconciliation, or (b) collide as a same-region merge conflict if this tranche merges first. Given the task's own instruction to keep coupling to the minimum the imports require, the one-line cross-link was left out of this tranche entirely — it is a purely cosmetic navigation convenience, not required by any import, and is flagged here as a one-line follow-up for whoever performs the actual integration merge (add both "Also draft:" lines to `health-atlas.html`'s footer in whatever order the branches land). The new page does link back to `health-atlas.html` from its own header, so a reader who lands directly on the categories page is never stranded.

## Governance suite results — all seven, plus a second, deeper checkout-shape finding

All seven required suites were run from the repository root, on this branch's own tip, after fetching every branch the ledger declares:

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations.mjs` | 49 passed, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations.mjs` | 11 passed, 0 failed |
| `study-event-wiring.mjs` | 41 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |

**Zero failures across all seven, but getting there needed one more step than PR #119's own diagnosis names, and it is worth recording precisely because PR #119's fix did not fully hold in this session.**

This session fetched both HELD branches PR #119's report names (`claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`) *before* first running the suites — exactly PR #119's own prescribed fix. `programme-ledger.mjs` and `brief-integrity.mjs` both passed cleanly at that point. `programme-ledger-mutations.mjs` still failed: **48 passed, 1 failed**, naming `MUTATION [E] a stream's shared-file touch loses its declaration`, with the message `fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch`.

**Root cause, confirmed directly rather than assumed:** this session's checkout was shallow (`git rev-parse --is-shallow-repository` → `true`), and `programme-ledger.mjs`'s own fact-gathering computes each declared stream's changed paths as `git diff --name-only $(git merge-base <branch> origin/main) <branch>`. For `quran-phase4-wiring` (the one stream that both declares `app/js/version.js` as a shared touch and has a real `activeBranch`), `git merge-base origin/claude/phase4-wiring origin/main` returned nothing and exited 1 — not because the ref was missing (it had already been fetched, and `git rev-parse` resolved it fine), but because the two branches' true common ancestor sits far enough back (`claude/phase4-wiring` carries 625 reachable commits against `main`'s 101 in this checkout) that the shallow clone's history window did not reach it. Because `programme-ledger.mjs`'s own code guards this specific call with `base ? git(...) : []`, a failed `merge-base` does not throw — it silently produces `changedPaths: []` for that stream. `programme-ledger.mjs` itself therefore showed no failure at all (a shallow-clone false negative that produces zero visible symptoms in the base guard), and the problem only surfaced downstream, in `programme-ledger-mutations.mjs`'s fixture selection, which needs a stream with a **real, non-empty** declared-and-diffed touch to mutate.

This is a **different, and more insidious, half of the same checkout-shape hazard PR #105/#111/#119 already flagged** — not "an unfetched ref throws a loud error" (their diagnosis, correct as far as it went) but "a shallow clone can silently zero out a real branch's diff even once its ref is present, with no error anywhere in the base guard to notice by." Fixed in this session with `git fetch --unshallow origin` (confirmed `git rev-parse --is-shallow-repository` → `false` afterward, and `git merge-base origin/claude/phase4-wiring origin/main` then resolved to `8a305c3`). Re-running all seven suites after that produced the 0-failures table above.

**Flagged for the Master Architect, exactly as PR #119 flagged the first half of this finding, and for the identical reason: `.github/workflows/` and the guard scripts themselves are both outside this task's authorised scope, and both are already correct.** Neither `programme-ledger.mjs` nor `programme-ledger-mutations.mjs` was edited (both are protected tooling). The practical implication for CI: `actions/checkout`'s default `fetch-depth: 1` would reproduce this exact silent-zeroing behaviour even if a workflow step separately fetches the declared branch refs by name — the refs being present is not sufficient; the checkout needs enough depth (or `fetch-depth: 0`) for `git merge-base` to actually find the common ancestor between a long-lived stream like `quran-phase4-wiring` and `main`.

## Health-owned test suites

All ten Health-owned suites, re-run from the repository root on this branch's tip:

| Suite | Result | Tranche |
|---|---|---|
| `data-integrity.mjs` | 21 passed, 0 failed | 1 (re-run, unaffected) |
| `selectors.mjs` | 8 passed, 0 failed | 1 (re-run, unaffected) |
| `view-boundary.mjs` | 14 passed, 0 failed | 1 (re-run, unaffected) |
| `categories-selectors.mjs` | 7 passed, 0 failed | 4 (new) |
| `view-boundary-categories.mjs` | 58 passed, 0 failed | 4 (new) |
| `view-boundary-categories-mutations.mjs` | 7 passed, 0 failed | 4 (new, mutation-proof) |

The other four Health-owned suites (`claims-integrity.mjs`, `view-provenance-boundary.mjs`, `claims-mutations.mjs`, `view-provenance-mutations.mjs`, `more-selectors.mjs`, `view-boundary-more.mjs`, `view-boundary-more-mutations.mjs`) belong to PR #111 and PR #119's own branches, which this tranche does not build on and therefore does not carry — they are unaffected by this tranche and were already re-verified as passing inside PR #119's own report.

Each `view-boundary-categories-mutations.mjs` mutation reintroduces a real hazard class and the guard must name it by substring match: rendering `food.servingQty`, reading `food.organs` directly instead of through the approved organ-name path, importing `HEALTH_ATLAS_DISEASES`, importing `HEALTH_ATLAS_LIFESTYLES`, adding a selector exposing `food.nutrition`, and widening the page's data-file import beyond its two authorised names. All six mutations were refused by name; the positive control confirms the guard passes clean on the real, unmutated files; every mutated file was restored byte-for-byte via a `finally` block (confirmed with `git status --short` after the run — zero residual diff).

## Browser verification

A focused, un-checked-in Playwright script (Chromium, served via this repository's own `serve.js`), screenshotted, then deleted before commit — 21 checks, all passing:

- No page errors on load; a non-trivial rendered body.
- All 8 master categories listed by name (Protein, Carb, Fat, Veg, Fruit, Water, Air, Herbs & Spices).
- Opening Protein shows its own name, the DRAFT/"not medical advice" banner, and all four of its sub-categories (Meat, Fish, Beans/Lentils, Nuts) with per-sub food counts that sum to 10 — verified against the live dataset (2 Meat, 2 Fish, 3 Beans/Lentils, 3 Nuts).
- Back navigation returns to the full 8-category list.
- **The strongest check**: every one of the 491 real field values excluded by this and the earlier tranches (`nutrition`, `servingQty`, `organs`, `remedies`, `homeRemedies`, `naturalRemedies`, `symptoms`, `cause`, Lifestyles' `activities`/`food`/`avoid`, and age `notes`) was pulled directly from the live data module and checked against every one of the 8 rendered category-detail screens. Zero appeared verbatim — after excluding 3 values that are exact-text collisions with an APPROVED label (several foods' `.nutrition` arrays literally contain the bare word "Protein" as a nutrient-category tag, which is textually identical to, but semantically unrelated to, the "Protein" master category's own approved `.name`; asserted by comparing against the actual approved-label set, not by hand-picking an exception).
- `health-atlas.html` (tranche 1) still boots with no new page errors, confirming this tranche introduced no regression to the untouched foundation page.

Two screenshots were taken (category list; the Protein detail card) and reviewed directly — the list shows all 8 categories with sub-category and item counts; the detail card shows the DRAFT banner, the category name, its four sub-categories each with an individual food count, and the "open the Foods browser for individual entries" cross-reference note. Both screenshots and the scratch script were deleted before this commit, per this project's standing practice for focused browser verification.

## What this deliberately does NOT do

- Does not link individual sub-categories through to the Foods browser's own per-food detail view (PR #119's `health-atlas-more.html`) — that page has no URL-parameter or deep-linking support today, and adding one was out of this tranche's bounded scope. A reader is told in words to "open the Foods browser for individual entries."
- Does not edit `health-atlas.html`'s footer (see "Why no forward link was added" above) — flagged as a one-line follow-up for the actual integration merge.
- Does not stack on, depend on, or modify anything from PR #111 or PR #119.
- Does not touch `CLAUDE.md`'s Health ledger entry (`EXTERNAL_PENDING_ACQUISITION`), `docs/governance/programme-integration-ledger.json`, or `app/js/nav.js` — the exact fields a future integration would need are specified below, unedited.
- Does not allocate or bump any version; `app/js/version.js` is untouched.
- Does not deploy anything, and makes no approval claim.

## For the Master Architect / Owner — the integration gate, specified rather than crossed

Exactly as PR #119 did for its own tranche, the concrete ledger fields and nav change a future authorised integration would need are named here, with neither file edited:

- `docs/governance/programme-integration-ledger.json`'s `health` stream entry would need its `ownedPaths` list extended with `app/health/js/health-atlas-categories-selectors.js`, `app/health/js/health-atlas-categories-view.js`, `app/health/health-atlas-categories.html`, `tools/health-atlas-verify/categories-selectors.mjs`, `tools/health-atlas-verify/view-boundary-categories.mjs`, `tools/health-atlas-verify/view-boundary-categories-mutations.mjs` (in addition to the paths PR #105/#111/#119 already specified in their own reports).
- `app/js/nav.js` would need one additional line in the existing Home ▾ dropdown, matching the shape the `/legacy/`/`/legacy-v07/` links already use, pointing at `app/health/health-atlas-categories.html` — the exact same one-line pattern PR #119 already specified for its own page, alongside it rather than instead of it.
- The CI checkout-depth implication of the finding above (`actions/checkout`'s default shallow fetch silently zeroing a long-diverged stream's declared diff) is not touched here — `.github/workflows/` is out of this task's scope, exactly as PR #119 recorded for the first half of this same finding.

Whether to correct the `health` ledger entry, whether to change CI checkout behaviour, whether to add the `health-atlas.html` footer cross-link at merge time, and whether PR #105/#111/#119/this tranche should proceed toward integration at all remain Owner/Master Architect decisions, not resolved here.

## Owner app-test required: **NO**

This tranche is not merged to `main`, not deployed to GitHub Pages, not linked from `app/js/nav.js` or any other shared-nav surface, and needs a local `node serve.js` to view at all (its ES module imports are blocked by the browser's CORS rule for a bare `file://` path, the same as every prior Health Atlas tranche) — there is no build or URL on the Owner's live app where this page is currently reachable. This matches the state of PR #105, PR #111 and PR #119, none of which asked for Owner app-testing either, and for the identical reason: the surface does not exist on the deployed app yet. If the Master Architect authorises integration (ledger entry, nav line, and the existing `health-study.html` disambiguation all resolved), Owner app-testing would become meaningful at that point, on the deployed URL `https://madrasatul-muslimeen.github.io/app/health/health-atlas-categories.html`, role: any signed-in role (page needs no sign-in or tenant), steps: open the page, click each of the 8 category buttons, confirm the sub-category names and per-sub-category counts render and the DRAFT banner is present on every detail card, expected evidence: a screenshot of the category list and of one opened category detail card.

## What was NOT done, and why

- The CI checkout-depth fix itself was not implemented (`.github/workflows/`, out of authorised scope, per the rules this task was dispatched under).
- The `health` ledger entry and `app/js/nav.js` were not edited (Owner/Master Architect decision, per the rules this task was dispatched under).
- No version was allocated or bumped.
- Nothing was deployed, merged, or claimed approved.
