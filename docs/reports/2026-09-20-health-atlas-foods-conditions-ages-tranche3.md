# Health Atlas — governance re-verification, and Foods/Conditions/Age Groups tranche 3

**20 Sep 2026, dispatched via the MMSA task bridge (issue #115).** This
report covers two separate pieces of work, done in the order the task asked
for: (1) a full-history, required-ref re-verification of PR #105 and PR #111's
own "pre-existing failure" claims for the seven required governance suites,
and (2) — since that re-verification found no Health-owned defect blocking
it — one new bounded, independent, Health-owned, read-only browser tranche
built on top of PR #111's own head.

## Part 1 — Full-history / required-ref preflight

Working copy: not shallow (`git rev-parse --is-shallow-repository` → `false`).
Three refs fetched explicitly by name, each landing at exactly the SHA the
task description named:

| Ref | SHA |
|---|---|
| `origin/main` | `2cb405e388bb069c11c6e62a9f53854c91995e0b` |
| `origin/claude/health-atlas-foundation-tranche1` (PR #105 head) | `79bc5f115267adc67e6dffa0347b64f331bb4a3a` |
| `origin/claude/health-claim-provenance-tranche1` (PR #111 head) | `82a8515bbf1389e76e49a062df465b04102e5055` |
| `origin/health/source-v02-04-handover` (verified source) | `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9` |

Three isolated `git worktree` checkouts were made from these refs (main tip,
PR #105 head, PR #111 head) so each ref's own suite run could not disturb
another's working tree.

**A genuine gap was found in this step, and it changed every result below.**
`brief-integrity.mjs` and `programme-ledger-mutations.mjs` both read facts
about EVERY branch the programme ledger declares — including the two HELD
branches CLAUDE.md names, `claude/pensive-knuth-2pu3jj` (the Phase 5 ADR-008
foundation) and `claude/phase4-wiring` (the held Study-event wiring). Neither
had been fetched by the initial three-ref preflight the task described,
because neither PR touches them. Both were fetched explicitly:

| Ref | SHA |
|---|---|
| `origin/claude/pensive-knuth-2pu3jj` | `b0221ce4a4d1291e5392f50ffb11949be07a1b39` |
| `origin/claude/phase4-wiring` | `7e2931f795af1cd97efc1167660cea93aa22b9ab` |

This is not a minor footnote — see Part 2 below. Both of PR #105's own
flagged "pre-existing" governance-suite failures, and PR #111's one flagged
failure, turned out to be artifacts of this exact gap, not genuine platform
defects.

## Part 2 — Re-verifying the seven required governance suites, honestly

Run from the repository root on each of three refs, with the full ref set
fetched (main tip, PR #105 head, PR #111 head), plus a fourth column for this
tranche's own new branch tip:

| Suite | main tip | PR #105 head | PR #111 head | Tranche 3 (this PR) |
|---|---|---|---|---|
| `programme-ledger.mjs` | 8 passed, 25 noted, 0 failed | 8 passed, 23 noted, 0 failed | 8 passed, 23 noted, 0 failed | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations.mjs` | **42 passed, 7 failed** | 49 passed, 0 failed | 49 passed, 0 failed | 49 passed, 0 failed |
| `brief-integrity.mjs` | 8 passed, 0 failed | 8 passed, 0 failed | 8 passed, 0 failed | 8 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 27 passed, 0 failed | 27 passed, 0 failed | 27 passed, 0 failed | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations.mjs` | 11 passed, 0 failed | 11 passed, 0 failed | 11 passed, 0 failed | 11 passed, 0 failed |
| `study-event-wiring.mjs` | 41 passed, 0 failed | 41 passed, 0 failed | 41 passed, 0 failed | 41 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed | 38 passed, 0 failed | 38 passed, 0 failed | 38 passed, 0 failed |

**Every column is clean except one cell: `programme-ledger-mutations.mjs` on
plain `main` tip, and only when the two held branches are NOT fetched.**

### The mechanism, read from source rather than assumed

`programme-ledger-mutations.mjs` imports `measure()` from
`programme-ledger.mjs`, which builds a `facts.branches` map keyed by every
stream the ledger declares — including `quran-phase4-wiring`, whose branch is
`claude/phase4-wiring`. Several of the 49 mutations pick a stream at random
from the ledger and mutate/query its branch facts. Without
`origin/claude/phase4-wiring` fetched, `facts.branches['quran-phase4-wiring']`
is `undefined`, and three mutations that happen to target that stream throw
raw JS errors instead of exercising the guard:

```
FAIL  MUTATION [A] the ledger and the branch disagree about what the branch is stamped
      Cannot set properties of undefined (setting 'declaredVersion')
FAIL  MUTATION [B] a branch is stamped a version reserved for nobody
      Cannot read properties of undefined (reading 'activeBranch')
FAIL  MUTATION [B] a branch stamps at or beyond the unallocated boundary
      Cannot read properties of undefined (reading 'activeBranch')
FAIL  MUTATION [C] the recorded historical stamp is not what the held branch carries
      guard C did NOT fail on "..." -- it is UNPROVEN and must not be trusted
FAIL  MUTATION [E] a stream's shared-file touch loses its declaration
      fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch
FAIL  MUTATION [E] a stream newly touches a shared file nobody declared
      Cannot read properties of undefined (reading 'activeBranch')
FAIL  MUTATION [E] a stream touches the deployed Rules
      Cannot read properties of undefined (reading 'activeBranch')
```

Confirmed causally, not just by timing: re-running the identical suite
against the identical `main` tip commit, before and after fetching
`origin/claude/pensive-knuth-2pu3jj` and `origin/claude/phase4-wiring`, flips
the result from **42/7 → 49/0** with zero code changes and zero ledger
changes — only the local ref set changed. The `MUTATION [E] a stream's
shared-file touch loses its declaration` case (the "fixture drift" message
PR #111's report names) is one of these seven; it is not an independent
finding.

**`brief-integrity.mjs` needed the same two refs for a different reason**: two
of its own checks (`"...and the ones the brief says are held on a branch
really are on it"` and `"the unmerged wiring candidate the brief names still
exists at the commit it names"`) run `git rev-parse` against
`origin/claude/pensive-knuth-2pu3jj` and `origin/claude/phase4-wiring`
directly and throw `fatal: invalid object name` when the ref is absent —
which is what produced PR #105's reported 6/2. PR #111's own report already
correctly diagnosed this exact cause for `brief-integrity.mjs` ("the
2-failure count PR #105's own report recorded... was specific to that
session's environment — a missing `origin/claude/phase4-wiring` ref") — but
did not extend the same diagnostic step to `programme-ledger-mutations.mjs`,
whose one reported failure (48 passed, 1 failed) is caused by exactly the
same missing-ref class, just a different one of the seven cases above.

### Conclusion on governance-suite failures

**Zero of the seven required suites carry a genuine failure on `main`, PR #105's head, or PR #111's head.** Every failure either PR reported was a
consequence of an incomplete local git fetch in the session that produced
it, not a repository or Health-owned code defect. No edit to
`programme-ledger-mutations.mjs`, `brief-integrity.mjs`, or any other
protected tooling file was made or was needed — both files are correct; they
simply require the ledger's declared branches to be genuinely present to
answer the questions they ask. **This is a platform CI/checkout-shape finding,
not a code defect**, flagged in "For the Master Architect" below rather than
fixed, because `.github/workflows/` is a protected path this task must not
touch.

## Part 3 — Health-owned focused suites, re-run and confirmed

All ten Health-owned suites, run on this tranche's own branch tip (which
carries PR #105 and PR #111's own work unmodified, plus this tranche's
additions):

| Suite | Result |
|---|---|
| `data-integrity.mjs` | 21 passed, 0 failed |
| `selectors.mjs` | 8 passed, 0 failed |
| `view-boundary.mjs` | 14 passed, 0 failed |
| `claims-integrity.mjs` | 10 passed, 0 failed (informational: cited-evidence: 0, general-reference-only: 82) |
| `view-provenance-boundary.mjs` | 7 passed, 0 failed |
| `claims-mutations.mjs` | 7 passed, 0 failed |
| `view-provenance-mutations.mjs` | 4 passed, 0 failed |
| `more-selectors.mjs` (new, this tranche) | 9 passed, 0 failed |
| `view-boundary-more.mjs` (new, this tranche) | 26 passed, 0 failed |
| `view-boundary-more-mutations.mjs` (new, this tranche) | 7 passed, 0 failed |

All of PR #105's and PR #111's own suites reproduce their claimed counts
exactly, unaffected by the one-line footer link this tranche adds to
`health-atlas.html` (verified by re-running them after that edit).

## Part 4 — Browser verification, personally observed

Two focused, un-checked-in Playwright scripts (Chromium via the
pre-installed `/opt/pw-browsers`), served through this repository's own
`serve.js`, screenshotted. Both scripts were deleted from the working tree
before this branch was committed (neither is part of the repository).

**Foundation + claim-provenance (`health-atlas.html`), walking the WHOLE
site rather than one sample organ:**

- Page boots with zero page errors.
- All 9 body-system blocks render; the DRAFT / "not medical advice" notice
  is present verbatim.
- Every one of the **46 organs** was opened individually (not just Heart):
  **82 total function statements, 82 total badges** — exactly one badge per
  statement, everywhere.
- **Zero** badges anywhere read `cited-evidence`; **zero** render
  `Unclassified`; all 82 read `general-reference-only` — matching PR #111's
  own claimed finding exactly, now confirmed by walking every organ rather
  than the two PR #111 sampled.
- No forbidden clinical/dose/treatment/remedy text pattern found anywhere
  on the page.

**Tranche 3 (`health-atlas-more.html`, this PR's own new page):**

- Page boots with zero page errors.
- Foods tab: 34 foods render across 12 categories (matches the source
  count). Conditions tab: 17 diseases render. Age Groups tab: 6 age groups
  render.
- **The strongest check**: every one of the **244 actual excluded field
  values** — every `food.nutrition` entry, every `food.servingQty` value,
  every `disease.remedies`/`homeRemedies`/`naturalRemedies` entry, every
  `ageGroup.notes` entry, pulled verbatim from the live data module — was
  checked against the rendered text of all 57 entries (34 foods + 17
  diseases + 6 age groups). **Zero appear anywhere on the page.** This is
  evidence-based (comparing against the actual excluded values) rather than
  a generic word-blacklist, which is what caught the real defect below.
- The foundation page (`health-atlas.html`) links forward to this page.

**A real defect this browser walk found, before it ever shipped**: an
earlier draft of this tranche rendered `food.organs` as-is, on the
assumption (from reading a handful of entries) that the field was purely
qualitative ("Lungs: continuous"). Walking all 34 foods in the browser
turned up six that embed a nutrient-dose recommendation in that same field
— `oats` ("Heart: 40g/day"), `almonds` ("Heart: 30g/day"), `walnuts`
("Brain: 30g/day"), `lentils` ("Large Intestine: 1 cup/day"), `spinach`
("Eyes: 1 cup/day"), `berries` ("Brain: 1 cup/day"). This is exactly the
class of content the task excludes. Fixed by adding `organNamesFor()` to
`health-atlas-more-selectors.js`, which strips every `"Organ: qualifier"`
string to the organ name only before display; the view module was changed
to call it instead of reading `food.organs` directly, and
`view-boundary-more.mjs` now asserts that call site by name, with a
mutation (`"read food.organs directly instead of calling
organNamesFor(food)"`) proving the guard catches a regression back to the
original bug. `more-selectors.mjs` also asserts, dataset-wide across all 34
foods (not just the six found by browsing), that `organNamesFor()` leaves no
digit in any organ name.

**A false positive in this tranche's own first verification script, also
worth recording:** an early version flagged the bare word "treatment"
appearing in the page — which turned out to be the view's own disclaimer
sentence ("Diagnosis and treatment-related content are deliberately not
shown here"), not a content leak. A word blacklist cannot tell a refusal
from a leak. Replaced with the evidence-based check above (compare against
actual excluded field values), which is both stronger and immune to this
class of false positive.

## Part 5 — What this tranche built

Base: `claude/health-claim-provenance-tranche1` (PR #111 head, `82a8515`).
New branch: `claude/health-atlas-foods-ages-tranche1`.
`git diff 82a8515 -- app/js/ CLAUDE.md CHANGELOG.md docs/governance/
firestore.rules firebase.json tests/firestore/ tools/firestore-emulator/
.github/workflows/` is empty.

**New files:**

- `app/health/js/health-atlas-more-selectors.js` — pure selectors for
  Foods, Diseases and Age Groups (never Lifestyles).
- `app/health/js/health-atlas-more-view.js` — the read-only Foods /
  Conditions / Age Groups browser, tab-based.
- `app/health/health-atlas-more.html` — the new page.
- `tools/health-atlas-verify/more-selectors.mjs` (9 checks),
  `view-boundary-more.mjs` (26 checks), `view-boundary-more-mutations.mjs`
  (7 mutation-proof checks).

**Modified (additive only):**

- `app/health/health-atlas.html` — one footer line linking forward to the
  new page.
- `app/health/README.md` — two new sections documenting the
  claim-provenance tranche (which had none yet) and this tranche.

### What this tranche shows, and what it deliberately excludes, field by field

| Dataset | Shown | Excluded, and why |
|---|---|---|
| Foods (34) | `name`, `category`, organ names (via `organNamesFor`), general references | `nutrition`, `servingQty` — nutrient-dose-shaped (`"~2.7L/day"`, `"Adequate fibre 25-38g/day"`); raw `organs` text — six entries embed a dose (see above) |
| Diseases (17) | `name`, `cause`, `symptoms`, `organAffected`, general references | `remedies`, `homeRemedies`, `naturalRemedies` — treatment/remedy content |
| Age Groups (6) | `name`, `range` | `notes` — nutrition-guidance prose keyed to age (`"Iron needs rise further for menstruating teens"`) |
| Lifestyles (10) | **nothing — the whole dataset is deferred** | Unlike the three above, there is no clean structural/organizational subset: `.activities`, `.food` and `.avoid` are themselves lifestyle recommendations end to end (`"150 min/week moderate aerobic activity"`, `"avoid screens immediately before bed"`, `"Adequate fibre (25–38g/day)"`). Partially showing this dataset would mean picking which recommendations to exclude case by case rather than by field, which is a materially different (and much weaker) boundary than the field-level ones above. |

This mirrors PR #105's own deferral pattern for organs (data preserved,
never rendered, boundary asserted mechanically by reading the view module's
own source) — extended here to three more datasets, and extended further by
excluding one whole dataset outright where no field-level line could be
drawn honestly.

## Boundaries respected

- **No shared or protected path touched.** `git diff` against PR #111's head
  touches only `app/health/health-atlas.html` (one line),
  `app/health/README.md` (additive sections), and five new files under
  `app/health/` and `tools/health-atlas-verify/`. Nothing under
  `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`,
  `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`,
  `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`,
  the platform-shared tooling files, `docs/governance/`,
  `firestore.rules`/`firebase.json`/`tests/firestore/`/
  `tools/firestore-emulator/`, or `.github/workflows/`.
- **No version allocated or bumped.** `app/js/version.js` untouched;
  `v08.32` remains unallocated.
- **Nothing deployed.** No Firestore/Rules/index/hosting change.
- **Not linked from shared nav.** `app/js/nav.js` untouched; the new page
  is reachable only via a footer link on the existing unlinked draft page.
- **No overlap checked and confirmed** before building: `mcp__github__list_pull_requests`
  and `mcp__github__list_branches` were read fresh: the only branches
  touching `app/health/` or `tools/health-atlas-verify/` are PR #105, PR
  #111 and the read-only source handover branch; no other open PR or branch
  in the repository touches either path.

## What this deliberately does not do

- Does not build Lifestyles at all — see the table above.
- Does not add dosage, treatment, remedy or lifestyle-activity content to
  any screen.
- Does not touch `HEALTH_ATLAS_MASTER_CATEGORIES` (food master-category
  groupings) — a plausible next slice, not attempted here to keep this
  tranche bounded.
- Does not wire the Health Atlas into any shared nav, tenant, or Firebase
  surface. Still the same isolated, unwired, English-only draft.
- Does not fix, weaken, or otherwise touch `programme-ledger-mutations.mjs`
  or `brief-integrity.mjs` — both are protected tooling and, per Part 2
  above, both are already correct.
- Does not edit `docs/governance/programme-integration-ledger.json` or
  `CLAUDE.md`. See the next section for exactly what a future authorised
  integration would need to change there.
- Does not merge PR #105 or PR #111, does not claim either is accepted, and
  is itself opened as a draft PR stacked on PR #111's own branch.

## For the Master Architect / Owner

**1. The governance-suite "pre-existing failure" claims in PR #105 and PR #111 should be corrected, not treated as accurate history.** Both are false
in the sense that matters: neither reproduces on a properly-fetched
checkout of the branch it was reported against. This report updates both PR
bodies (see below) to state the corrected, re-verified counts.

**2. A second platform tooling finding, hit while writing this very
report**: `tools/md2report.py` (the house Markdown→HTML report generator,
`main` tip `2cb405e388`) has a live, unfixed infinite loop. Its paragraph
scanner excludes any line starting with `#` (reserved for headings), but
its heading regex requires whitespace after the hashes
(`^(#{1,6})\s+`) — so a line starting with `#` but NOT followed by
whitespace (e.g. this report's own first draft had a hard-wrapped line
starting `#105's head, or PR #111's head.` after an editor wrapped a
sentence mentioning "PR #105") matches no branch at all, and the scanner's
own index never advances: **100% CPU, unbounded memory growth, no
output**, confirmed and killed at 1.5GB / 2m18s CPU time before it was
allowed to continue. Branch `claude/exciting-goodall-rqn1pm` (PR #91, "Automation pilot evidence,
and fix an infinite loop in md2report.py") already proposes exactly this
fix, still open and unmerged as of this report, and its own comment names
the same root cause independently (`"A line can slip past every branch
above ... Found when a CI report quoting real '##[error]' output hung the
generator indefinitely"`). **This
tranche worked around it by rewording this report's own prose** (removing
the accidental line-start) rather than editing `tools/md2report.py` — that
file is shared platform tooling outside this task's authorised scope
(`app/health/`, `tools/health-atlas-verify/`, and this task's own report
files), so it was left untouched and is flagged here instead. Any report
author who wraps a sentence mentioning a bare `#NNN` issue/PR number at a
line start will hit this until the existing fix is merged.

**3. A third platform finding, not a Health finding, worth the Master
Architect's attention**: `programme-ledger-mutations.mjs` and
`brief-integrity.mjs` both
depend on every ledger-declared branch (including HELD branches like
`claude/phase4-wiring` and `claude/pensive-knuth-2pu3jj`) being fetched
locally, or they report false failures that look exactly like real
programme-control defects. A CI runner using a shallow, single-branch,
`fetch-depth: 1` checkout (the `actions/checkout` default) would hit this
on every run for every PR, and nothing under `tools/i18n-verify/` or
`.github/workflows/` currently guards against it. This is flagged here
because both are protected paths this task must not touch; the fix (either
have the guards fetch what they need, or have the workflow do a full-branch
checkout before running them) is the Master Architect's call.

**4. The `health` ledger entry is still stale**, exactly as both PR #105
and PR #111 already flagged, now with a third tranche added on top. Not
edited here (protected path). If and when a future integration is
authorised, the exact fields on `docs/governance/programme-integration-ledger.json`'s
`health` entry that would need to change are:

```
"health": {
  "integrationState": "EXTERNAL_PENDING_ACQUISITION",   // → e.g. "IN_REPOSITORY_DRAFT" or whatever vocabulary the Master Architect adopts
  "repository": "UNKNOWN",                               // → this repository's own name/URL
  "activeBranch": "UNKNOWN",                              // → the branch actually authorised for integration at that time
  "branchTip": "UNKNOWN",                                 // → that branch's head commit SHA
  "declaredVersion": "UNKNOWN",                           // → stays UNKNOWN / unallocated until the Master Architect allocates one AT integration time, per this repository's own "a held branch does not predict its own version" rule
  "baselineSha": "UNKNOWN",                               // → the `main` commit the integration is guardedly merged from
  "baselineStatus": "UNKNOWN"                              // → e.g. "CURRENT" once reconciled
  "ownedPaths": []                                         // → ["app/health/", "tools/health-atlas-verify/"], naming exactly what this stream owns, the same shape every other stream's `ownedPaths` already uses
}
```

And the nav change a real integration would need — **not built, not
proposed as urgent, just specified exactly** — is one line in
`app/js/nav.js`'s existing Home ▾ dropdown structure (the same file already
carries the `/legacy/` and `/legacy-v07/` static links CLAUDE.md documents),
pointing at whichever of `app/health/health-atlas.html` /
`health-atlas-more.html` the Master Architect decides is the entry point,
gated the same way every other module link in that file already is —
nothing here should be read as recommending it happen before the ledger
fields above are resolved and a version is allocated.

**5. No Owner/Master Architect decision was found blocking further
Health-owned, unwired, read-only work.** The next plausible bounded slice
(not attempted here) is `HEALTH_ATLAS_MASTER_CATEGORIES` — the food
master-category groupings, all clean structural data with no dose/remedy
fields at all on a first read (itself worth verifying by the same
browser-walk discipline this report used, given that Foods' own `organs`
field looked clean on a first read too).
