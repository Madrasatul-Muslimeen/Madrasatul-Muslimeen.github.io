# Hadith — translation coverage in Explore, the next gate-free tranche

**Date:** 2026-09-20 · **Type:** Hadith-owned, product feature plus tests.
**No shared/platform file, Firestore Rules, corpus content or version changed.**

---

## 1. Why this task, and why not the branch's own unmerged tip

This tranche was picked up via the MMSA task bridge, instructed to build the next
bounded Hadith Study tranche from current `main`, after first checking
`feature/hadith-study` for any unmerged Hadith-only work rather than assuming that
branch is current.

**It is not current, and its remaining diff was inspected rather than assumed
stale.** `origin/main..origin/feature/hadith-study` is three commits
(`16dd3bc`, `f35432f`, `2cea0e7`) — the H2-C Approach-id symbolic-slot module, its
guard, a claim-freeze **proposal** (not applied), and a records-key inventory tool.
Everything **else** the branch appears to change is `main` having moved past a much
older base (`db6cb24`): the Hadith S5 governing-contracts work this diff seems to
"delete" is already on `main` (`tools/i18n-verify/hadith-governing-contracts.mjs`,
`hadith-gate-contracts.mjs`, `docs/governance/hadith-c2-live-records-path-2026-09-19.md`
all exist here). The three genuinely new commits are themselves another
pure-and-unreachable policy module awaiting an Owner decision (the Approach id
namespace and v1 slot set) — exactly the closed C2/S2 gate this issue names as
unresolved, not a reachable product improvement. Per the task's own instruction
("implement one meaningful, independent product improvement … rather than only
another plan or guard, if an approved gate-free item exists"), this tranche does
not import or continue that branch.

**What it does instead** is the S5 report's own §7 finding, still true on current
`main`: **S5 is "the natural next safe tranche… it changes no behaviour, needs no
version, and crosses no gate."** This round goes one step further than S5's own
"pin a contract to its document" shape and ships a small, real, reader-visible
improvement inside the same closed-gate boundary S5 established: Explore already
counts the source hierarchy and the topic taxonomy; it did not count how much of
the fixture has an English or a Bangla version at all. That gap is closed.

---

## 2. The feature

**`translationCoverage()`**, a new pure export in `app/js/hadith-corpus.js`,
reports — per edition, and overall — how many synthetic occurrences carry an
English version and how many carry a Bangla version, alongside the always-present
Arabic source. It reads only `availableLanguages()`, the exact per-occurrence fact
the reader-facing fallback label (`resolveText()`) already depends on (schema §1:
a language is never fabricated) — it invents nothing and reads no claim, Track
state or Approach.

**Explore renders it** as a new "Translation coverage" section, after the existing
Topics section: an overall line ("Overall: 8 of 8 have English, 7 of 8 have
Bangla."), then one line per edition. It is entirely additive — every existing
Explore row, and every other tab, is untouched.

**Why this is a real reader-facing improvement, not just another guard.** Explore
already exists to answer "how much of the source and the taxonomy is here", and
today a reader (or, later, a translator coordinating real-corpus import work) has
no way to see which editions still need a translation pass. This is the first
thing Explore reports that is about **content completeness** rather than
**structure count** — the natural next axis, not a new one invented for this task.

---

## 3. What was measured, not guessed

Against the fixture (`app/js/hadith-fixture-data.js`, unchanged): 8 occurrences,
all 8 carry English, 7 of 8 carry Bangla (the fixture's own documented gap,
`syn-occ-0008`, on edition `synthetic-beta-ar-v1`). The new suite asserts the
per-edition split lands where the gap actually is — `synthetic-beta-ar-v1` reports
2 of 2 English, 1 of 2 Bangla — rather than trusting the overall total to imply it.

**A mutation was run and it found a real, pre-existing latent defect, not just
proved the new checks.** Adding `translationCoverage()` directly after
`exploreAggregate()` broke the existing check "EXPLORE — the aggregate reaches no
progress store of any kind": that check sliced the file from
`indexOf("export function exploreAggregate")` to **end of file**, which was
silently correct only because `exploreAggregate` used to be the last export in
the module. The moment a second export was appended after it, that slice pulled
the NEW function's own doc comment — which names `trackableId` on purpose, to say
it is absent — into `exploreAggregate`'s check, and the check failed a case it
had no business seeing. This is the exact defect class this project's own
standing lessons already name ("A mutation came back unproven and found a second
defect… sliced the chokepoint's body as `slice(indexOf(signature))` — to end of
file"). Fixed the same way as that precedent: a shared `exportedFunctionBody()`
helper bounds a check at the **next** top-level `export function`, with a
positive control (`body.length < full.length`) asserting the slice is genuinely
bounded rather than accidentally still reaching the end. Reverting the fix and
re-running reproduces the failure; the fix is in place in the pushed tree.

**Suite counts.** `tools/i18n-verify/hadith-corpus.mjs`: **33 → 38 passed, 0
failed** (5 new COVERAGE checks; the pre-existing EXPLORE check is corrected in
place, not deleted, per this project's own rule). Every other Hadith suite is
unaffected: `hadith-commentary-binding.mjs` 14/0, `hadith-source-rights.mjs`
14/0, `hadith-governing-contracts.mjs` 14/0, `hadith-gate-contracts.mjs` 11/0 —
all read-only against files this tranche did not touch.

**Mutation-proof of the new checks themselves.** Swapping `withEnglish`'s source
from `"en"` to `"bn"` in `translationCoverage()` was caught by two of the five new
checks (36 passed, 2 failed) before being reverted; the suite returned to a clean
38/0 afterward.

---

## 4. Blast radius and files touched

| File | Change |
|---|---|
| `app/js/hadith-corpus.js` | **added** `translationCoverage()` — one new pure export, nothing else changed |
| `app/js/hadith-browser.js` | **added** one import and one new rendering block inside `renderExplore()` — no other view, tab or function touched |
| `tools/i18n-verify/hadith-corpus.mjs` | **added** 5 checks and a shared bounding helper; **corrected in place** the pre-existing EXPLORE guard this round's own change exposed |

**Nothing else changed.** `git diff --stat` against `origin/main` touches exactly
these three files, all Hadith-owned and outside every path this bridge's own
shared/protected list names. No `app/hadith-study.html` or
`app/hadith-collections.html` markup changed — the new section renders through
the existing `#hadithCorpusRoot` mount both pages already share. No fixture data,
no id, no schema, no Firestore Rules, no `firebase.json`, no `CLAUDE.md`,
`CHANGELOG.md`, `bn.js`, `behaviour.mjs`, `programme-integration-ledger.json`,
`app/js/version.js`, or any file under `.github/workflows/` was touched. **BR-0.**

---

## 5. Gates — all remain closed, none was approached

No permanent Hadith unit key, no Approach id, no real corpus text, no durable
write, no Rules or index change, no migration, no deployment, no version
consumed. `translationCoverage()` was swept by the suite's own existing
persistence-reachability GATE checks (`hadith-corpus.mjs`'s "no Hadith module can
reach Firestore or a write path" and "no Hadith module builds a `hadith:`
permanent unit key", both of which already scan `hadith-browser.js` and
`hadith-corpus.js`) — no new gate needed inventing, and both still pass.

---

## 6. What was NOT done, and why

- **The new strings are not yet in `app/js/i18n/bn.js`.** `i18n.js`'s `t()`
  falls back to the English literal for any key with no catalogue entry, so on
  a Bangla page this section reads in English until the Bangla catalogue is
  extended — the exact "flagged for the Quran/shared-file owner rather than
  assumed" treatment the Stage B report already used for a shared-file touch
  this stream cannot make itself. `bn.js` is on this bridge's own protected-path
  list; **four new catalogue keys need adding there**, listed verbatim in §7.
  **Correction, 2026-09-20 (MMSA task bridge, issue #114):** this section
  originally said "three new catalogue keys" and §7 originally claimed the
  per-edition line "reuses the same" key as the overall line. It does not —
  `t(key, vars)` (`app/js/i18n.js:61`) looks a catalogue entry up by the exact
  English literal passed as `key`, and the overall line's literal carries an
  `"Overall: "` prefix the per-edition line's literal does not. Two different
  strings are two different catalogue keys. §7 is corrected below.
- **No collection/edition filter was added to Search.** Considered and set
  aside: with only two synthetic editions in the fixture, a filter control would
  cost real UI space for close to no benefit today, and would need its own
  layout measurement this bounded task did not budget for. Worth revisiting once
  a real multi-edition corpus exists.
- **No DOM/Playwright-level render test was written.** This sandbox has no
  `node_modules` and no `playwright` package installed at all (`npm`/`node`
  cannot resolve it here), so no suite in this repository that depends on
  `tools/i18n-verify/harness.mjs` can run in this environment regardless of what
  this tranche touched. The new rendering code reuses the exact same `el()` /
  `t()` idioms `renderExplore()` already uses successfully for its Topics
  section, immediately above the new block, to minimise the risk of an
  unverified DOM defect — but full-page verification is UNVERIFIED here and
  should be re-run wherever Playwright is available before this is treated as
  visually confirmed.
- **The Bangla `hadith` lowercase subject-heading defect** (noted in the Stage
  B report, owned by the shared `topic-study.js` renderer) was not touched —
  out of scope for a Hadith-owned tranche, unchanged either way by this round.

---

## 7. For whoever holds `bn.js`

**Four new keys, not three** (corrected 2026-09-20 — see §6). English literal
is the key itself (this project's own convention). `t(key, vars)` matches on
the literal string passed as `key`; the overall line and the per-edition line
call `t()` with two literals that differ by the `"Overall: "` prefix, so each
needs its own catalogue entry — neither covers the other:

- `"Translation coverage"` (the `<h3>`)
- `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."` (the caveat paragraph)
- `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."` (the one overall line only)
- `"{en} of {n} have English, {bn} of {n} have Bangla."` (one per edition — this is a **distinct** literal from the one above, not a reuse of it)

---

## Machine-readable status

BRANCH=claude/laughing-goodall-gdrbdj

BASE_MAIN_SHA=2cb405e388bb069c11c6e62a9f53854c91995e0b

MAIN_VERSION=v08.31 (unchanged)

FEATURE_HADITH_STUDY_TIP=2cea0e7 (inspected, not merged, not built on -- see §1)

WORK=app/js/hadith-corpus.js (+translationCoverage), app/js/hadith-browser.js (Explore wiring), tools/i18n-verify/hadith-corpus.mjs (+5 checks, 1 in-place correction)

TEST_RESULT=hadith-corpus.mjs 33 -> 38 passed, 0 failed; hadith-commentary-binding 14/0; hadith-source-rights 14/0; hadith-governing-contracts 14/0; hadith-gate-contracts 11/0

MUTATIONS=1 real latent defect found and fixed (unbounded EXPLORE guard slice); 1 deliberate mutation of the new coverage math caught by 2/5 new checks, reverted

REGRESSION_SUITES=programme-ledger 8/23/0; programme-ledger-mutations 48/1 (pre-existing fixture-drift failure, present on main before this change, unrelated); brief-integrity 8/0; study-activity-evidence-boundary 27/0; study-activity-evidence-boundary-mutations 11/0; study-event-wiring 41/0; rules-authorisation-executable 38/0

BLAST_RADIUS=BR-0 -- three Hadith-owned files, zero shared/protected file touched

SHARED_FILES_CHANGED=NONE (bn.js needs 4 new keys, corrected 2026-09-20 from an original miscount of 3 -- flagged in §7, not added)

VERSION=unchanged, v08.32 still unallocated -- no behaviour-changing version bump was made or requested

DEPLOYMENT=NONE -- nothing deployed, no Rules or index touched

OWNER_CONTROL_GATES=ALL CLOSED, none approached

NEXT_ACTION=Master Architect / Quran-side review; bn.js catalogue entries; Playwright verification of the new Explore section wherever the harness is runnable
