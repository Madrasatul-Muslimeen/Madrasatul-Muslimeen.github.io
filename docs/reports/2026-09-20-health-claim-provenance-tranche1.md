# Health Atlas — claim-level provenance tranche 1

**20 Sep 2026, dispatched via the MMSA task bridge (issue #109).** This is a
follow-up on top of `claude/health-atlas-foundation-tranche1` (PR #105,
**still open, still draft, not merged to `main`**) — the Health Atlas
foundation dataset and Body Systems browser that tranche built. This
tranche adds no new data; it adds a mechanism for saying, per displayed
function statement, whether it is backed by a specific citation or only by
the dataset's general references — and never claims the latter is
verified.

## Where this branches from

Base: `claude/health-atlas-foundation-tranche1` at `79bc5f1` (which is
`main` `2cb405e388` plus that one tranche's own commit). New work branch:
`claude/health-claim-provenance-tranche1`. `git diff 79bc5f1 -- app/js/
CLAUDE.md CHANGELOG.md docs/governance/ firestore.rules firebase.json
tests/firestore/ tools/firestore-emulator/ .github/workflows/` is empty —
no shared or protected path is touched by this tranche.

## What was investigated before anything was built

The task's own steer was: never claim an uncited statement or
organ-specific nutrient dose is verified, and establish the actual fact
pattern rather than assume one. Two questions were answered directly
against `app/health/js/health-atlas-data.js`, not by reading the issue's
own description of it:

1. **Are the 8 top-level `HEALTH_ATLAS_REFERENCES` tied to specific organs,
   specific functions, or just the dataset as a whole?** Every one of the
   46 organs carries its own `refs[]` array pointing into those 8 — so
   references are bound at the ORGAN level (or, for the handful of organs
   that share the same short `refs` list, effectively at the dataset
   level). Nothing in the data shape ties a reference to one function
   statement out of an organ's several.
2. **Does any organ's `functions` array carry anything that already looks
   like a citation, or is the text bare?** Scanned programmatically (every
   `functions[]` string across all 46 organs, tested for an embedded
   reference id like `r1`, a bracketed citation number, or an inline URL):
   **zero matches out of 82 function statements.** The text is bare
   description with no per-statement citation marker of any kind.

**The honest finding, stated plainly rather than softened:** the ported
source data supports organ-level "these are the kind of sources this
material draws from" references, and nothing stronger. Not one of the 82
function statements currently on screen is traceable to a specific source
for that exact claim. This is the same shape CLAUDE.md already accepts for
Hadith — *"zero editions are rights-cleared, so every narration ... says so
in its own Arabic"* — a registry that comes out 100% unverified today is
the honest state, not a shortcoming of the registry.

## What was built

**`app/health/js/health-atlas-claims.js`** (new, Health-owned, no
imports) — the claim registry. A closed, two-value vocabulary:

- `general-reference-only` — the organ's/dataset's general references
  exist but were not written to support this exact statement. The
  honest default.
- `cited-evidence` — a specific `referenceId` (resolving into
  `HEALTH_ATLAS_REFERENCES`) is bound to this exact statement because it
  was traced to that source. Reserved for a real, traceable citation;
  none was found in this tranche's investigation, so the registry claims
  none.

`ORGAN_FUNCTION_CLAIMS` names **every one of the 46 organs' 82 function
statements explicitly** — generated programmatically from the live data
file (not hand-retyped) so the statement text matches byte-for-byte, then
verified by a standalone script with zero mismatches before being
committed. Every entry today is `general-reference-only`; the registry's
own `claims-integrity.mjs` check prints this count on every run
(`cited-evidence: 0, general-reference-only: 82`) so the finding stays
visible rather than being a one-time claim in a report. `evidenceStatusFor`,
`referenceIdFor` and `isValidStatus` are the read API; each returns `null`/
`false` for anything it doesn't recognise rather than defaulting to a
status, so an unclassified statement is a fact a caller must handle, never
a value it can mistake for classified.

**Why an explicit per-statement registry, not a global default function.**
A function that returned `general-reference-only` for anything it did not
recognise would make "not silently unclassified" true by construction for
every statement forever — including a NEW one added to
`health-atlas-data.js` tomorrow that nobody has looked at. Naming every
statement explicitly means a new one is *missing* from the registry until
someone deliberately adds it, and the boundary suite below fails by name
until they do.

**`app/health/js/health-atlas-view.js` (modified, additively)** — every
function statement in the organ-detail screen now renders one evidence
badge beside it. The badge's status comes only from
`evidenceStatusFor()`/the imported `EVIDENCE_STATUS` constant — never a
parallel string literal in the view — so a future edit cannot make a
statement read as "cited" without a real registry entry naming it so. A
statement the registry has no entry for renders as **visibly
"Unclassified"**, not silently as either status. `app/health/health-atlas.html`
gains three small badge style rules (general/cited/unclassified), purely
additive.

**Two Health-owned static guards, `tools/health-atlas-verify/`:**

- **`claims-integrity.mjs`** (10 checks) — cross-checks the registry
  against the live data file: every organ has an entry; every organ's
  registered statements match the data file's `functions[]` exactly, same
  order, same text; no orphan entries for organs that don't exist; every
  status is one of the two closed values; every `cited-evidence` claim
  names a `referenceId` that really resolves; `evidenceStatusFor`/
  `referenceIdFor` behave correctly on known and unknown input.
- **`view-provenance-boundary.mjs`** (7 checks) — reads the view module's
  own source text (the same static pattern PR #105's `view-boundary.mjs`
  already uses in this tranche) and asserts: the view really imports and
  calls the registry (positive control); the raw string literals
  `'cited-evidence'` and `'general-reference-only'` never appear in
  executable code (only the imported constant may decide the branch);
  every rendered function statement is routed through the badge renderer,
  with no bypass path; an unclassified statement gets a visible
  "Unclassified" label.

**Two mutation suites proving both guards can actually fail**
(`claims-mutations.mjs`, 7 checks; `view-provenance-mutations.mjs`, 4
checks) — following this repository's own in-memory-backup/mutate/spawn/
assert-non-zero/restore-in-`finally` pattern (never `git`, so a concurrent
session's uncommitted work is never at risk). Each names a real drift
shape and the guard must refuse it BY NAME, not merely exit non-zero:

| Mutation | Guard | Result |
|---|---|---|
| Remove an organ's whole registry entry | claims-integrity | caught, named |
| Reword a registered statement so it no longer matches the data file | claims-integrity | caught, named |
| Add an orphan entry for a non-existent organ id | claims-integrity | caught, named |
| Give a claim an out-of-vocabulary status | claims-integrity | caught, named |
| Mark a claim cited-evidence with a dangling `referenceId` | claims-integrity | caught, named |
| Mark a claim cited-evidence with no `referenceId` at all | claims-integrity | caught, named |
| POSITIVE CONTROL: a well-formed cited-evidence claim with a real referenceId | claims-integrity | **passes**, proving the guard refuses on substance, not on the word "cited" |
| Hardcode a raw `'cited-evidence'` literal in the badge renderer (the live bypass this guard exists to catch) | view-provenance-boundary | caught, named |
| Remove the import of the claims registry | view-provenance-boundary | caught, named |
| Render function statements without calling the badge renderer (the pre-tranche shape, now a regression) | view-provenance-boundary | caught, named |
| Remove the visible "Unclassified" fallback branch | view-provenance-boundary | caught, named |

One near-miss worth recording: the first draft of the positive-control
mutation reused the *Heart* "pumps blood" statement, which
`claims-integrity.mjs`'s own "resolves a known statement" check also
hardcodes — so marking it `cited-evidence` made that unrelated check fail
too, and the mutation runner reported a false failure. Switched to a
*Lungs* statement instead. Recorded because it is exactly the class of
mistake CLAUDE.md's own standing lessons warn about — a check's fixture
colliding with a different check's fixture — caught here before it ever
reached a report.

## Browser verification

A focused, un-checked-in Playwright script (served via this repository's
own `serve.js`, matching PR #105's own method) against
`app/health/health-atlas.html`: 11 checks, all passing — no page errors;
Heart opens with its 4 function statements, each carrying exactly one
evidence badge, all reading `general-reference-only`, with the badge text
containing the words "not verified"; **zero** badges on the whole page
read `cited-evidence` (matches the 0-cited finding exactly); **zero**
badges render as unclassified (every statement has a registry entry);
Brain (a second, unrelated organ) opens correctly and also shows one badge
per function. Screenshotted: the badges render as small, readable pills
directly under each function line, distinct from the "General references"
block further down the card (which still lists the organ-level sources
unchanged).

## Governance suites

All seven, run from the repository root on `claude/health-claim-provenance-tranche1`:

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations.mjs` | 48 passed, **1 failed** |
| `brief-integrity.mjs` | 8 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations.mjs` | 11 passed, 0 failed |
| `study-event-wiring.mjs` | 41 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |

**The one failure is pre-existing and unrelated to this tranche.** Checked
directly, not assumed: `programme-ledger-mutations.mjs` was re-run against
a clean `git worktree add` of the base branch tip (`79bc5f1`, with no
Health claim-provenance files present at all) and produced the **identical**
count — 48 passed, 1 failed — naming the same case, `MUTATION [E] a
stream's shared-file touch loses its declaration`, with the identical
message: *"fixture drift: no stream both declares app/js/version.js and
still shows it changed on a branch."* This is a fixture-selection issue
inside the mutation harness itself (it depends on which stream currently
has a live, undeployed `version.js` declaration across the whole
programme, which shifts as other streams integrate) — nothing under
`app/health/` or `tools/health-atlas-verify/` is read by this guard or its
mutation harness. `brief-integrity.mjs` passed cleanly (8/0) on both this
branch and the base — the 2-failure count PR #105's own report recorded
for it was specific to that session's environment (a missing
`origin/claude/phase4-wiring` ref) and does not reproduce here.

Also run and passing: the four pre-existing Health Atlas pure suites from
PR #105 (`data-integrity.mjs` 21/0, `selectors.mjs` 8/0, `view-boundary.mjs`
14/0 — all unaffected by this tranche's additive changes) plus this
tranche's own two new suites (`claims-integrity.mjs` 10/0,
`view-provenance-boundary.mjs` 7/0) and two mutation suites
(`claims-mutations.mjs` 7/0, `view-provenance-mutations.mjs` 4/0).

## Boundaries respected

- **No shared or protected path was touched.** Not `app/js/version.js`, not
  `CLAUDE.md`/`CHANGELOG.md`/`app/js/i18n/bn.js`/`app/js/nav.js`/
  `app/js/unit-keys.js`/`app/js/records.js`/`app/js/activity.js`/
  `app/js/catalogue-data.js`/`app/css/shell.css`, not the platform-shared
  tooling files (`behaviour.mjs`, `harness.mjs`, `firebase-stub.mjs`,
  `brief-integrity.mjs`, `programme-ledger.mjs`,
  `programme-ledger-mutations.mjs`), not anything under
  `docs/governance/`, not `firestore.rules`/`firebase.json`/
  `tests/firestore/`/`tools/firestore-emulator/`, not
  `.github/workflows/`. `git diff --stat HEAD` shows exactly the two
  Health-owned files this tranche modified
  (`app/health/health-atlas.html`, `app/health/js/health-atlas-view.js`)
  plus the five new files, and nothing else.
- **No version was allocated or bumped.** This tranche changes an
  isolated, unwired, unlinked draft surface, not live app behaviour, so
  it needs no version for that reason on its own — but any future
  tranche that DOES wire this into a live surface will need a version
  allocated centrally by the Master Architect before it can ship, per
  this repository's own standing rule against two streams claiming one
  number.
- **Nothing was deployed.** No Firestore rule, index, or hosting change of
  any kind. This tranche touches no data layer at all — it is two new
  pure/DOM-only modules and one Health-owned test tool directory.
- **PR #105's own boundary is untouched and re-verified, not merely
  assumed.** `view-boundary.mjs` (the nutrition/food/disease/remedy
  deferral guard) was re-run unmodified against the new view module and
  still passes 14/0 — this tranche adds a second, independent boundary
  suite alongside it rather than editing the first one.

## What this deliberately does not do

- **Does not upgrade any statement to `cited-evidence`.** The
  investigation found zero traceable per-statement citations in the
  ported source data, so none is claimed. Reserving `cited-evidence` for
  a real, traced citation — never invented or guessed — was the explicit
  instruction, and the registry honours it by being 100%
  `general-reference-only` today.
- **Does not touch nutrition-dose, food-source, activity or deterioration
  fields, or the Diseases/Lifestyles/Ages/Foods datasets.** Those remain
  exactly as PR #105 left them: preserved in the data file, never
  rendered by any view, guarded by the untouched `view-boundary.mjs`.
  Claim-level provenance for those fields (per the task's own "organ-
  specific nutrient dose" phrasing) is real future work, but building it
  now would mean either fabricating citations that don't exist in the
  source or extending scope well past this bounded tranche — flagged as
  the natural next tranche, not attempted here.
- **Does not wire the Health Atlas into any shared nav, tenant, or
  Firebase surface.** It remains the same isolated, unwired, English-only
  draft page PR #105 built.
- **Does not merge, does not claim PR #105 is accepted**, and is
  deliberately opened as a draft PR stacked on PR #105's own branch, not
  on `main` — this PR's diff is meant to be read as an addition ON TOP of
  PR #105, and should not be merged before or independently of it.

## For the Master Architect / Owner

This tranche needs no new authority to build or review — it touches only
Health-owned, unwired paths. What it changes for a reader of the draft
Body Systems browser: every function statement they see now says, in
words, whether it is backed by a specific citation or only by general
references — and today, honestly, every one of them says the latter.
