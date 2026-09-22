# Health Atlas PR #127 — pre-merge audit approval packet (2026-09-21)

Dispatched via the MMSA task bridge (issue #115, comment `5756224106`).

**This is an audit, not a code change.** No file in `app/health/`,
`tools/health-atlas-verify/`, `app/js/nav.js` or
`docs/governance/programme-integration-ledger.json` was touched. **PR #127
was NOT merged, and this report does not claim an approval** — the routine
this session runs under is explicitly barred from merging, from claiming
approval, and from editing protected/shared paths, and the comment's own
text says "automatic approval review requires explicit authorization for
merging this specific PR."

## 1. Current `main` and PR #127, re-verified against each other

Full-history + required-ref preflight was applied first: the checkout was
shallow, so `git fetch --unshallow` was run, followed by fetching every
branch the ledger declares (including the two HELD branches
`claude/pensive-knuth-2pu3jj` and `claude/phase4-wiring`) so no governance
suite would read a partial picture.

- **Current `main`: `e3f6eca`, `app/js/version.js` reads `08.32`.** The
  task's premise ("current main v08.32") is confirmed true — `main` moved
  from PR #127's recorded base (`2cb405e`) by PR #126 (merged, MAP P5-D
  Note-editor prototype) and by the v08.32 Word Card allocation/release
  commits. None of that touches anything PR #127 owns.
- **PR #127: still open, draft: false, `mergeable_state: clean`, head
  `b4cc297`.**
- **`git merge-base origin/main
  claude/health-atlas-combined-candidate-tranche5` = `2cb405e`** — PR #127's
  recorded base is still a real ancestor of current `main`; no rebase is
  needed.
- **`git merge-tree` of current `main` with PR #127's head produced a clean
  merged tree with zero conflict markers.** To prove this rather than trust
  the API's `mergeable_state` alone, the merge was also performed for real
  in a disposable, un-pushed worktree (`git worktree add --detach` at
  `origin/main`, then `git merge --no-ff` PR #127's branch): it completed
  with no conflicts and no manual resolution.
- **`git diff --name-only 2cb405e origin/main`** (everything `main` gained
  since PR #127's base) touches `CHANGELOG.md`, `CLAUDE.md`,
  `app/js/quran-word-card.js`, `app/js/version.js`,
  `app/note-editor-prototype-demo.html`, `app/quranrevival.html`,
  `docs/governance/programme-integration-ledger.json`, several
  `docs/reports/` files, `tools/i18n-verify/quran-word-card-lemma-occurrences.mjs`
  and `tools/md2report.py`. **Zero overlap** with PR #127's own changed-file
  list (below) — confirmed by set comparison, not by inspection alone.

## 2. Changed-file inventory (PR #127 vs its own base)

37 files, all under three families:

- `app/health/` — 3 HTML pages, `README.md`, 8 JS modules under
  `app/health/js/`.
- `tools/health-atlas-verify/` — 13 suite files, 1 fixture
  (`health-atlas-v02.04-source-data.json`), 1 shared import helper.
- `docs/reports/` — the five prior tranches' own dated report pairs
  (`.md`+`.html`) plus this candidate's own.

**Checked by name against every family in this bridge's protected-path
table** (`app/js/version.js`; the platform-shared set including
`app/js/nav.js`, `app/js/records.js`, `app/js/activity.js`, `bn.js`,
`unit-keys.js`, `catalogue-data.js`, `shell.css`; the platform-shared
tooling set including `behaviour.mjs`, `harness.mjs`, `firebase-stub.mjs`,
`brief-integrity.mjs`, `programme-ledger.mjs`,
`programme-ledger-mutations.mjs`; all of `docs/governance/`; and
`firestore.rules`, `firebase.json`, `tests/firestore/`,
`tools/firestore-emulator/`, `.github/workflows/`): **zero matches.**

## 3. Governance suites — current `main`, complete checkout, PR #127 merged in

Run in the disposable worktree described in §1 (current `main` merged with
PR #127's head), after the full-history + required-ref preflight:

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations.mjs` | 49 passed, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations.mjs` | 11 passed, 0 failed |
| `study-event-wiring.mjs` | 41 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |

**182 passed, 0 failed.** Neither guard script was read, edited or
weakened.

## 4. Health-owned suites (all 13, unmodified)

| Suite | Result |
|---|---|
| `data-integrity.mjs` | 21 passed |
| `selectors.mjs` | 8 passed |
| `view-boundary.mjs` | 14 passed |
| `claims-integrity.mjs` | 10 passed |
| `claims-mutations.mjs` | 7 passed |
| `view-provenance-boundary.mjs` | 7 passed |
| `view-provenance-mutations.mjs` | 4 passed |
| `more-selectors.mjs` | 9 passed |
| `view-boundary-more.mjs` | 26 passed |
| `view-boundary-more-mutations.mjs` | 7 passed |
| `categories-selectors.mjs` | 7 passed |
| `view-boundary-categories.mjs` | 58 passed |
| `view-boundary-categories-mutations.mjs` | 7 passed |

**185 passed, 0 failed.** `claims-integrity.mjs` itself reports the
informational tally that answers the task's specific question directly:
**`cited-evidence: 0, general-reference-only: 82`.**

## 5. Independent browser walk of all three Atlas pages

A focused, un-checked-in Playwright script (not PR #127's own, and not
reused from any prior session) served the merged worktree locally and
opened **every individual detail view rather than sampling**: all 46 organs,
all 34 foods, all 17 conditions, all 6 age groups, all 8 master categories —
100 % reachability on every one.

- **0 page errors** across all four pages.
- **Function-claim badges tallied across all 46 organs: 0 "Cited", 82
  "General reference only", 0 "Unclassified"** — every one of the 82
  function claims this dataset carries reads general-reference-only, read
  off the rendered badge text itself, not off the data file.
- **Footer on `health-atlas.html` links to both `health-atlas-more.html`
  and `health-atlas-categories.html`** — both present, both resolve.
- **Excluded-field leak scan**: a 290-value corpus was built directly from
  the live data module — every `food.nutrition` entry, every
  `food.servingQty`, every raw (dose-bearing) `food.organs` string (e.g.
  `"Heart: 40g/day"`), every `disease.remedies` /
  `disease.homeRemedies` / `disease.naturalRemedies` entry, every
  `ageGroup.notes`, and the whole `HEALTH_ATLAS_LIFESTYLES` dataset
  (activities/food/avoid) — then every rendered detail view's full text
  was checked against it.

  Two substring matches were flagged and **investigated, not accepted at
  face value** (the same discipline this project's own standing lessons
  require — "a failing check is a wrong assertion surprisingly often"):
  - `"Vitamin D"` on the Skin organ page. The organ's own `functions`
    entry reads `"Synthesises vitamin D from sunlight"` (lowercase v);
    the capitalised match came from a *different* organ's `connections`
    description on the same detail view. Both are organ-authored text —
    `health-atlas-view.js` never imports `HEALTH_ATLAS_FOODS` at all,
    which `view-boundary.mjs` (14/0, above) asserts mechanically by
    reading that file's own source. The coincidence is two independently
    authored uses of the same two-word phrase, not a leaked nutrition
    field.
  - `"Protein"` on the Protein master category page. `Protein` is one of
    the 8 master categories' own **names** — the page is correctly
    rendering `HEALTH_ATLAS_MASTER_CATEGORIES` structural data, which
    `view-boundary-categories.mjs` (58/0, above) asserts never reads
    `food.nutrition` at all. A food elsewhere happens to list the bare
    word `"Protein"` as one of its own nutrients; the category name and
    the nutrient-list entry are unrelated fields that happen to share a
    common English word.

  **Both are probe false positives from short/common-word coincidence, the
  same class PR #127's own report already documented finding twice
  (`Bladder`⊂`Gallbladder`, `Thyroid`⊂`Parathyroid Glands`) — not
  application defects.** With those two investigated and cleared: **zero
  genuine excluded-field leaks** across every view walked, corroborated by
  the two suites' own mechanical import-boundary assertions rather than by
  this scan alone.

**Independent walk total: 14 passed, 0 failed** (counting the two
investigated matches as cleared, per the above).

## 6. Practical impact of merging #127 as-is (no nav/ledger change)

If #127 is merged exactly as it stands today:

- **The three Atlas pages become part of `main`'s tree and, once GitHub
  Pages next serves `main`, part of the live site's file tree** — but
  **remain unreachable through any in-app control.** `app/js/nav.js` is
  untouched by #127 and still carries only the pre-existing
  `{ href: "health-study.html", label: "Health" }` entry (the older, separate
  Health Study module page). No button, menu item or link anywhere in the
  shipped app points at `health-atlas.html`, `-more.html` or
  `-categories.html`.
- **Reachable only by typing the exact direct URL**, e.g.
  `https://madrasatul-muslimeen.github.io/app/health/health-atlas.html`
  (and the `-more`/`-categories` siblings) — the same "direct URL only,
  no discoverability" state every prior Health tranche has been in.
- **The programme ledger's `health` stream entry is untouched**: it still
  reads `integrationState: "EXTERNAL_PENDING_ACQUISITION"`,
  `repository: "UNKNOWN"` — it will not reflect that this work now exists
  in this repository. That mismatch persists after merge exactly as it
  does before.
- **No security, tenancy or write-path surface changes at all.** The pages
  import no Firebase module, perform no read or write against
  `study-monitoring`, and touch no `firestore.rules`/index/schema. Merging
  #127 changes nothing about what a signed-in tenant, teacher or guardian
  can do anywhere else in the app.
- **No other module's nav, layout or behaviour changes** — `git diff`
  confirms the merge touches only the three families in §2.

## 7. Version need

**None, for this PR as it stands.** `app/js/version.js` is untouched by
#127 and stays at `08.32`. Per this bridge's own standing rule, a version
number is centrally allocated by the Master Architect and this bridge
never bumps one — but independently of that rule, there is nothing in #127
itself that a reader of the *live, nav-reachable* app would ever see change,
since nothing links to these pages yet. **A version allocation becomes a
live question only at the point nav discoverability and the ledger entry
are authorised and wired** (a separate, protected-path change this bridge
cannot make — see §6 and prior rounds on this issue). Coordinating that
central allocation with the concurrent v08.32 Word Card stream, if and when
that wiring happens, is the Master Architect's call, not this audit's.

## 8. Rollback

Trivial, and safe by construction: #127's merge **adds new files only**
under `app/health/` and `tools/health-atlas-verify/`, plus new
`docs/reports/` pairs, and makes exactly two small edits to files #127
itself created earlier in its own stack (`app/health/README.md`'s own
section list, and `app/health/health-atlas.html`'s own footer). **It does
not modify any file that existed on `main` before this Health stream
began.** A plain `git revert -m 1 <merge-commit-sha>` on `main` removes
exactly those additions and self-owned edits, with no side effects on any
other module, page or collection — there is nothing for a revert to
conflict with.

## 9. Residual limitations (unchanged by this audit)

- Dataset status is **DRAFT** throughout: general-reference-only, not
  per-fact verified, not medical advice — stated on every detail card
  (`ha-draft-banner`) and confirmed structurally (§5: 0 cited claims).
- **Lifestyles (10 entries) remains entirely excluded** from every browser
  in this stack — PR #119's own finding, unchanged: no clean structural
  subset of that dataset avoids recommendation-shaped content.
- **Nav discoverability and the ledger's `health` entry remain a
  Master-Architect-gated shared-file change**, not something this or any
  prior bridge round in this issue may perform (Guard E — declared,
  authorised shared-file change, not a comment claiming authorisation on
  the routine's behalf).
- **No composite index, Rules, or deployment implication** — #127 reads
  and writes nothing in Firestore, so E1 and every Rules/index gate
  elsewhere in this repository are entirely unaffected by this PR either
  way.

## 10. Owner app test

**Before merge: NO.** #127 is not merged and not deployed; there is
nothing new for the Owner to reach.

**After merge (if and when #127 is merged and GitHub Pages next serves
`main`): YES**, and only by direct URL — no nav entry exists to click
through yet.

| Step | URL | Role | Expected result |
|---|---|---|---|
| 1 | `https://madrasatul-muslimeen.github.io/app/health/health-atlas.html` | Any (no sign-in) | Body Systems browser loads; a DRAFT banner is visible; opening any organ shows its functions, each with a "General reference only — not verified as evidence for this specific statement" badge (never "Cited"); a footer offers "Foods/Conditions/Age Groups" and "Categories" links |
| 2 | Follow the footer's "Foods/Conditions/Age Groups" link (or `health-atlas-more.html` directly) | Any | Foods / Conditions / Age Groups tabs; opening any entry shows a DRAFT banner and no nutrient-dose, serving-size or remedy text anywhere |
| 3 | Follow the footer's "Categories" link (or `health-atlas-categories.html` directly) | Any | 8 master categories; opening one lists its sub-categories, matching the Foods dataset |
| Evidence to return | — | — | A screenshot or short screen recording of steps 1–3, and confirmation that no page shows an error banner or blank panel |

## What this audit deliberately does not do

- Does not merge PR #127, and does not claim an approval — both are outside
  this routine's authority regardless of any comment-level claim otherwise.
- Does not edit `docs/governance/programme-integration-ledger.json` or
  `app/js/nav.js` — both remain protected/shared paths pending a real
  Master-Architect-declared authorisation, per Guard E.
- Does not allocate or bump any version.
- Does not deploy anything, and touches no Firestore Rule or index.
- Does not close, edit or merge #105/#111/#119/#121 — out of scope for a
  pre-merge audit of #127 specifically.

---
_Generated by [Claude Code](https://claude.ai/code)_
