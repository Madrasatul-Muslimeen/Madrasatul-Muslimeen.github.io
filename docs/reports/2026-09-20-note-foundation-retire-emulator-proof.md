# MMSA task bridge — a real emulator-backed proof of `retirePermanentNote()` against the candidate Rules, and a MAP candidates enumeration

**Date:** 20 September 2026
**Origin:** issue #107, a follow-up review of PR #104 (`docs/reports/2026-09-20-note-foundation-retire-revision-fix.md`).
**Status: CANDIDATE. Not merged. Nothing deployed.** `app/js/version.js` stays `08.31`. This round adds test evidence only — no `app/` file changed.

---

## 0. Reconciliation with a parallel investigation on this same branch

While this round was in progress, a parallel session pushed
`docs/reports/2026-09-20-note-foundation-retire-equivalence-gap-and-map-candidates.md`
to this same branch, reporting the Firestore emulator download as **blocked**
in its sandbox (`storage.googleapis.com` returning HTTP 403), and delivering
the equivalence-gap-and-test-plan fallback the task's own instructions name
for exactly that outcome. **This is real sandbox-environment variance, not a
factual contradiction to resolve by picking a side.** This round's own
sandbox reached `storage.googleapis.com` without issue, the emulator JAR
downloaded and ran to completion (§2), and the resulting proof is
reproducible and mutation-tested (§4). Both reports are kept, both are true
of the sandbox that produced them, and the practical conclusion is the more
useful one for whoever reads this branch next: **in an environment where the
emulator binary is reachable, the real proof this issue asked for is
achievable**, so the other report's minimal-authorized-test-plan (its own §3)
is superseded by this round's actual, working file rather than remaining a
proposal — though its MAP candidate table remains independently useful and is
not duplicated verbatim here (§7 below is this round's own independent
reading of the same ledger/DDR sources, cross-checked against it: both
enumerations agree on substance).

This is also visible in the two reports' `programme-ledger-mutations` numbers
(49 passed there, 48 passed + 1 self-reported fixture-drift here, §6) — the
same live ledger state moved between the two runs, for reasons unrelated to
either investigation, exactly the class of thing that suite's own precondition
search is designed to report honestly rather than hide.

## 1. What was asked, and the outcome in one line

Issue #107 asked for executable, emulator-backed evidence that calls the **real** `retirePermanentNote()` against the **candidate** Phase 5 Note Foundation Rules, covering both a success and a stale-revision denial — or, if that is infeasible without touching a protected path, a precise equivalence-gap writeup and a minimal authorised test plan instead.

**The real proof was achieved.** A Firestore emulator genuinely launches in this sandbox (the JAR downloads over the network without issue), so this round did not have to fall back to the equivalence-gap-only path. `tools/i18n-verify/note-foundation-retire-emulator-proof.mjs` (new; nothing under `tools/firestore-emulator/` or `tests/firestore/` is modified) starts a real Firestore emulator, loads the real `app/js/note-foundation.js` unmodified except for one rewritten import specifier, and runs it against the real candidate Rules text read straight from `docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules`. **4/4 real assertions pass**, and a throwaway mutation (documented in §4) proves the proof is not vacuous.

---

## 2. Feasibility investigation

`tools/firestore-emulator/` and `tests/firestore/` are protected paths (read-only, never edit or commit to). The investigation, in the order the task specified:

1. **`npm ci` inside `tools/firestore-emulator/`.** Materialises 730 packages into the gitignored `node_modules/` (confirmed via `git status --porcelain` before and after: only `node_modules/` and `firestore-debug.log` — both already `.gitignore`d — ever appear; `package-lock.json`, the one tracked file `npm ci` reads, is untouched). This is not a protected-path edit: nothing tracked changed.
2. **Launching the real emulator.** `firebase emulators:exec --only firestore --project <demo-id> --config tools/firestore-emulator/note-foundation-v1.firebase.json "…"` — using the config file exactly as it is, read not written — genuinely downloads `cloud-firestore-emulator-v1.22.0.jar` and starts it (Java 21 is present in this sandbox). A throwaway probe script (`node -e "console.log('EMULATOR-UP')"`, never committed) confirmed the whole pipeline end-to-end before any real test code was written.
3. **SDK cross-compatibility.** `@firebase/rules-unit-testing` (5.0.2) and the npm `firebase` metapackage (12.19.0) resolve to a single, non-duplicated copy of `@firebase/firestore` in `tools/firestore-emulator/node_modules` (checked directly), so a `db` handle obtained from `@firebase/rules-unit-testing`'s `authenticatedContext(...).firestore()` and the real `doc`/`getDoc`/`runTransaction`/etc. functions from `require("firebase/firestore")` are the same SDK instance — confirmed with a second throwaway probe (`setDoc`/`getDoc` round-trip against the real emulator, not committed) before it was relied on.

So the answer to the core question is **yes, a real emulator-backed proof is feasible here**, and the fallback equivalence-gap-only deliverable in the task's §3 was not needed.

---

## 3. How the real function is invoked without editing a protected path

`tools/i18n-verify/note-foundation-retire-emulator-proof.mjs` is a new file. It:

- Reads `app/js/note-foundation.js`, `app/js/envelope.js`, `app/js/collections.js`, `app/js/journey-map-contract.js` from disk (unmodified) and the candidate Rules text from `docs/governance/…rules` (unmodified).
- Rewrites exactly one import specifier per Firestore-importing file — the same `data:` module technique `tools/i18n-verify/note-foundation-data-layer.mjs` already uses to run the real function against a Firebase-free stub — except here the substitution points at the **real** `firebase/firestore` SDK bound to the live emulator, not a stub. Every rewrite asserts it actually matched (`assert.notEqual(out, before, …)`), so a silent no-op rewrite (e.g. after some future edit to `note-foundation.js`'s import line) fails loudly instead of quietly still importing the unreachable `gstatic` URL.
- Resolves `@firebase/rules-unit-testing` and `firebase/firestore` via `createRequire(path.join(root, "tools/firestore-emulator/package.json"))` — Node's CJS resolver walks up from that directory and finds `tools/firestore-emulator/node_modules` on its own, so this file needs no `package.json` of its own and installs nothing new anywhere tracked.
- Also loads the **pre-fix** `retirePermanentNote()` verbatim from commit `2cb405e388bb069c11c6e62a9f53854c91995e0b` (PR #104's own recorded base) via `git show`, rather than re-typing the old buggy code by hand — with an assertion that the fetched text still contains the known defective line, so this proof cannot silently drift onto some other commit's content.

Nothing under `tools/firestore-emulator/`, `tests/firestore/`, or any other protected path is edited. The only new file is `tools/i18n-verify/note-foundation-retire-emulator-proof.mjs`, which is not one of the six specifically-protected files in that directory.

**How to run it** (the emulator must be launched by the same command that runs the test — this file does not start the emulator itself):

```
cd tools/firestore-emulator && npm ci   # once
cd tools/firestore-emulator && npx firebase emulators:exec \
  --only firestore \
  --project demo-quranrevival-note-foundation-retire-proof \
  --config note-foundation-v1.firebase.json \
  "node --test ../i18n-verify/note-foundation-retire-emulator-proof.mjs"
```

---

## 4. What the real emulator actually proved

Three cases, one Firestore emulator instance, one candidate Rules text, seeded via `withSecurityRulesDisabled` and exercised through `env.authenticatedContext("uid-p1").firestore()`:

| Case | What runs | Result |
|---|---|---|
| **SUCCESS** | The real, **fixed** `retirePermanentNote()` (from the current working tree) retires `note1` | **Accepted.** A new revision is minted, chains from the old one (`previousRevisionId`), the Note's `currentRevisionId` moves to it, and a properly-scoped `list` query proves exactly two revisions exist for `note1` — nothing extra, nothing skipped. |
| **STALE REVISION DENIAL** | The same real function is called a *second* time on `note1`, naming the now-superseded `expectedRevisionId` | **Refused before any write is attempted** — `retirePermanentNote()`'s own client-side guard throws `"Stale Note revision."`, and the revision count is proven unchanged (no `noteRevisions` document was created by the attempt). |
| **PRE-FIX DENIAL** | The real, **pre-fix** `retirePermanentNote()` — loaded verbatim from commit `2cb405e`, the exact code PR #104 replaced — retires `note2` | **Denied by the real candidate Rules**, `code: 'permission-denied'`, and `note2` is proven completely untouched afterwards (still `status: "active"`, still pointing at its original revision). This is the mechanical proof, on a real emulator, of the exact defect PR #104's report describes by hand-reading the Rules text. |

```
# tests 4
# pass 4
# fail 0
```

**The proof is not vacuous — mutation-tested.** Temporarily pointing the SUCCESS case at the *pre-fix* function instead of the fixed one (a throwaway, uncommitted edit, reverted immediately and confirmed byte-identical afterwards) makes the SUCCESS and STALE-REVISION cases both fail against the identical real Rules, with `permission-denied` — proving this proof genuinely discriminates the fixed function from the broken one, rather than passing regardless of which code runs.

**A real Rules behaviour was discovered and had to be respected, not routed around.** The first draft of the SUCCESS case's own verification query (`getDocs(collection(p1, "noteRevisions"), limit(50))`, with no `where` filter) was itself refused by the real emulator — `"Property ownerPersonId is undefined on object … for 'list'"` — which is Firestore's real enforcement of exactly what the candidate's own comment states and the protected suite's `QUERY-02` case already asserts: *an unscoped list, even over documents that would each individually satisfy the per-document rule, is refused outright.* The query was corrected to the same `where(tenantId) && where(ownerPersonId) && where(noteId)` shape the protected suite's own `QUERY-01` pattern uses (read there only as evidence of the required shape, not copied verbatim). This is recorded because it is itself a small, real confirmation that the candidate Rules behave as documented — found by hitting the real emulator, not by reading the Rules text a second time.

---

## 5. What this closes from PR #104's own report

PR #104's report (§ "Acceptance gaps") named the exact equivalence gap this round closes: *"the pre-existing emulator suite's own `IMM-03b` case had already recorded the correct shape by hand… and passed only because it never called the real function."* That is now closed by a suite that does call the real function, twice (fixed and pre-fix), against the same real candidate Rules text, with a real Firestore emulator arbitrating both — while leaving the protected suite itself completely untouched.

---

## 6. Governance suite results

Full history and all branches fetched first (`git fetch origin --prune`), run from the repository root.

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 48 passed, **1 self-reported "fixture drift," not a failure of the guard** (see below) |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 40 passed, 0 failed |

**The one non-clean line, read rather than reported blind.** `programme-ledger-mutations`'s `[E] a stream's shared-file touch loses its declaration` case prints `fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch` — the mutation's own precondition search found no current stream in the live ledger data matching the shape it needs to remove a declaration from, so it reports itself as **unable to run**, not as a caught-or-missed defect. This is exactly the "UNPROVEN precondition" class `CLAUDE.md`'s own standing lessons describe for this suite (mutation preconditions are derived from the *live* programme state, which moves as other streams land). Nothing in this round touched `programme-integration-ledger.json`, any stream's declared touches, or `app/js/version.js` — confirmed by `git status` showing zero changes to any file outside `tools/i18n-verify/note-foundation-retire-emulator-proof.mjs` and this report. This is a pre-existing state of the live ledger, not a regression introduced here.

**Directly-relevant suites re-run clean, confirming no regression of PR #104's own work:**

| Suite | Result |
|---|---|
| `note-foundation-boundary` | 30 passed, 0 failed |
| `note-foundation-data-layer` | 47 + 30 P6-D + 18 P5-F/P6-E + 11 retire-revision = 106 assertions passed |
| `note-foundation-transaction` | 16 assertions passed |
| `study-note-boundary` | 17 passed, 0 failed |
| `journey-map-boundary` | 13 passed, 0 failed |

All exit 0 except where noted.

---

## 7. MAP candidates — concrete, currently visible, with their exact dependency

Read off `CLAUDE.md`'s current milestone, `docs/governance/DDR.md`, `docs/governance/programme-integration-ledger.json` and `LAYOUT-BACKLOG.md` as they stand today (`main` `2cb405e`, v08.31; `E1` recorded `CLOSED`).

| # | Candidate | Blocked on | Detail |
|---|---|---|---|
| 1 | **`noteSources` re-binding** — let an *existing* owned Note gain a second source link (`relationshipKind: "reference"`) after birth | **Nothing** — no DDR, no E1, no shared path. Named in PR #104's own report §7 as the next reasonable bounded tranche. | The Phase 5 Rules candidate already authorises creating a `noteSources` link against any existing owned Note (`REL-01`); the data layer only ever creates one, at `createPermanentNote()`'s own birth. This is buildable today in `app/js/note-foundation.js` (Quran-owned, not on the protected table) and needs no new authority — the exact "ask what the Rules authorise, then what the code can perform" method this repository already uses. |
| 2 | **P5-D — the Note editor surface** | **E1** (Firestore Rules + indexes deployment for `notes`/`noteRevisions`/`noteSources`) | Every write it made would be denied in production today. Also a real behaviour/version-bump change once E1 opens. |
| 3 | **Phase 4 Study-event WIRING** (`claude/phase4-wiring`, held at `7e2931f795af1cd97efc1167660cea93aa22b9ab`, confirmed still present on the remote) | **E1** (Activity-evidence Rules + indexes) | The storage design, Rules candidate, deploy decision and compatibility analysis are all separately required per `CLAUDE.md`'s v08.24 entry; its `v08.26` version stamp is HISTORICAL, not a forward allocation. |
| 4 | **Mapping My Journey (Phase 6) screen** — any real folder/placement UI built on `journey-map-service.js` | **E1** (Phase 6 `noteFolders`/`notePlacements` Rules + the 4th composite index) **and** an Owner Control Gate on what a Journey Map screen actually shows (ADR-010 decided only the minimum: Origin≠Destination, `semanticRole`'s 3 values, acyclic/depth-8 folders — not what the screen looks like) | The data/service layer (`listNotePlacementsForFolder/ForNote`, `moveNotePlacement`, `ownerFolderTree`, …) is already built and tested; nothing reachable exists to view it. |
| 5 | **D14 timezone mode wiring** (`timezoneMode`/`timezoneLocation`, `app/js/d14-timezone-*` candidates) | **E1** — specifically, the deployed `tenantPeople` Rule authorises `hasOnly(['timezone','updatedAt'])` only, so a mode field is denied in production the moment it is written; a Rules change is required | The product decision (D14) is already made; the representation is already built as an unreachable candidate; only the Rules change (and its deployment) remain, both under E1. |
| 6 | **DDR-001 — non-Quran progress model** (Deen Study, Arabic, General Study, Hadith, Nature-Life, Health claim/mastery semantics) | **Owner/Master Architect DDR** | No accepted universal definition of progress exists outside Quran; MAP work for any other module's claim/confirm behaviour is blocked here, not on E1. |
| 7 | **DDR-002 — subject-scoped teacher authority** | **Owner/Master Architect DDR** | Authority is student-scoped only today; narrowing it to the subjects a teacher's own enrolment lists needs client-side filtering keyed off `subjectIds`, deferred pending the decision. |
| 8 | **DDR-003 — translator selection** | **Owner/Master Architect DDR** | The Reading screen's `#translationChoiceSelect` stays disabled; re-packaging `tools/quran-data-pull`'s output for more than one translator per language is real, separate work gated behind the product decision. |
| 9 | **DDR-004 — the locked 30 Approaches** (a 31st Approach, or any reinterpretation of the count) | **Owner** (explicit reopening only) | Nothing here is technically blocked; it is locked by MAP v4 and stays exactly 30 until the Owner reopens it. |
| 10 | **Interface-localisation gap** (`node tools/i18n-coverage.mjs` — 61 missing strings, per PR #104's own investigation) | **Shared path**: every missing string lives in `app/js/i18n/bn.js`, on the protected/shared-path table | `DDR.md`'s own "Corrected non-DDR items" says this is *not* an Owner-gated decision — it is pure backlog — but it cannot be closed from a bridge run without an authorised edit to a shared file. |
| 11 | **"Edit banner" needs a home** (`LAYOUT-BACKLOG.md` item 7) | **Shared path**: wiring its link into Home → Settings needs `app/js/nav.js`, on the protected/shared-path table | Fully specified, ~30 minutes of work, no schema or `firestore.rules` change — the only obstacle is the one shared file it must touch. |
| 12 | **O3 / O3b / O3c** — `tenantSelect`, `surahSelect`/`unitTypeSelect`, and Bangla `#drillModeSelect` truncations in the Study-options panel | **Owner UI decision** (not E1, not a DDR) | Layout debt, not a MAP feature gap as such, but recorded in the same ledger (`openOwnerDecisions`) alongside the MAP-blocked items above; listed here for completeness since the task asked for *all* visible MAP-adjacent candidates and their dependency, and these are the ones that are neither E1 nor a DDR. |

**Summary of the dependency shape:** of the twelve items above, **four (#2–5) are purely E1**, **four (#6–9) are purely Owner/Master Architect DDR decisions**, **two (#10–11) are purely a shared/protected-path edit**, **one (#1) is genuinely unblocked** (and is this report's own recommendation for the next bounded tranche), and **one (#12) is Owner UI debt** outside the DDR/E1/shared-path taxonomy but tracked in the same ledger. Nothing on this list needs a new architecture decision beyond what is already recorded.

---

## 8. What this deliberately does NOT do

- **No protected path touched.** Checked against the task bridge's table: `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, the six named `tools/i18n-verify/*.mjs` files, everything under `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/` (including its `package.json`/`package-lock.json`), `.github/workflows/` — **none modified**. `tools/firestore-emulator/node_modules/` and `firestore-debug.log` are gitignored, untracked artefacts of running `npm ci`/the emulator, not committed.
- **No version bump.** `app/js/version.js` stays `08.31`.
- **No merge, no deploy, no approval claimed.**
- **PR #104's own application fix is untouched.** `app/js/note-foundation.js` carries the identical fix this round only reads and re-runs.
- **The `noteSources` re-binding gap (§7, item 1) is flagged, not built here** — it is a genuinely separate bounded tranche, deliberately left for its own round rather than folded into this evidence-only one.

---

## 9. Rollback

Delete `tools/i18n-verify/note-foundation-retire-emulator-proof.mjs` and this report pair. Nothing else changed; no data, Rule, index, or application file is affected either way.
