# MMSA task bridge — Note Foundation retirement: the real-function/real-emulator evidence gap, and the concrete MAP candidate list

**Date:** 20 September 2026
**Origin:** issue #107, comment [5749881379](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/107#issuecomment-5749881379), a follow-up to PR #104's review.
**Status: INVESTIGATION AND REPORT ONLY. No application code, Rule, index, ledger entry, brief line, or version changed. Nothing deployed. No merge.**

---

## 1. What was asked

Issue #107 asked, following PR #104's review, for **executable emulator-backed evidence invoking the real `retirePermanentNote()`** (`app/js/note-foundation.js`) **against the candidate Rules** — success and stale-revision denial — "if feasible without protected path edits," and, if not feasible, "the precise equivalence gap and a minimal authorized test plan." It also asked for a **concrete enumeration of visible MAP candidates with their exact DDR/E1/shared-path dependencies**.

This report answers both. **The emulator-backed evidence was investigated and found not deliverable in this run without either a protected-path edit or an unauthorized duplicate of protected test infrastructure — both of which this bridge is instructed to refuse.** The equivalence gap and a minimal authorized test plan are below (§3–§4), and the MAP candidate enumeration is in §6.

---

## 2. Starting point: PR #104's proof is real, but it is a different kind of proof

PR #104 (open, draft, unmerged; base `main` `2cb405e`) fixes a genuine defect: `retirePermanentNote()` on `main` today still performs a status-only update —

```js
transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED });
```

— which the accepted Phase 5 Rules candidate's `committedRevisionMatches()` would deny outright, because a status-only update leaves `currentRevisionId` chaining from itself. PR #104's fix commits a real `"retired"` revision alongside the status update, matching the shape the emulator suite's own hand-authored `IMM-03b` case already expects.

**PR #104's own proof of correctness is JS-level, not Rules-level**, by its own test plan's wording: "Confirmed the fix's write shape against the Rules candidate's `committedRevisionMatches()` logic **by hand**." Concretely:

- `tools/i18n-verify/note-foundation-data-layer.mjs` loads `app/js/note-foundation.js`'s real source text, but **rewrites its Firestore import to an in-memory fake** (`globalThis.__nfFirestore`, a plain JS object graph with no security-rule evaluator behind it at all). It proves the function now *writes the right shape* (create-then-update, correct `previousRevisionId`, correct `currentRevisionId`). It cannot prove a real Firestore Rules engine would *accept* that shape — only a human reading of `committedRevisionMatches()`'s text can, and that reading is exactly what the report does "by hand."
- `tools/firestore-emulator/note-foundation-v1.rules.test.mjs` **is** genuine emulator-backed, Rules-level proof — it starts a real local Firestore emulator (`@firebase/rules-unit-testing`'s `initializeTestEnvironment`) with the actual candidate Rules text loaded, and every case is a real client write judged by the real Rules engine. But its `IMM-03b` case **hand-authors the batch write directly** (a literal `writeBatch` with the two documents PR #104's fix now also produces) rather than calling `retirePermanentNote()` itself. It has never executed one line of `app/js/note-foundation.js`.

So today, no single suite in this repository has ever handed the real function's real output to a real Rules engine. PR #104's fix is provably *shape-correct* against a hand-read of the Rules text and *shape-consistent* with what the emulator's own hand-authored fixture expects — but "the hand-authored fixture matches the Rules" and "the hand-authored fixture matches the real function" were each proven separately, never as one chain. **That gap — real function → real Rules engine, in one uninterrupted call — is exactly what issue #107 asked to close.**

---

## 3. Why it is not deliverable in this run: three independent blockers

**(1) Both halves of the only genuine-emulator harness are on this bridge's protected-path table.** `tools/firestore-emulator/note-foundation-v1.rules.test.mjs` (where the real function would have to be called) and `tests/firestore/note-foundation.security-matrix.json` (the accepted case list it is keyed against) sit in `tools/firestore-emulator/` and `tests/firestore/` respectively — both are named, whole-directory entries on this bridge's protected/shared-path table. Adding a new case there — even one that only *adds* a call and duplicates zero existing assertions — is a change to a protected path and needs Master Architect authorization this bridge does not have.

**(2) Even the authorization question aside, the real emulator cannot be started in this environment right now.** `tools/firestore-emulator/`'s own `README.md` records it as "a locked, isolated tooling workspace" with its own `package.json`/`package-lock.json`; that workspace's `node_modules` does not exist in this checkout (`npm ci` was never run here), no `firebase`/`@firebase` package exists anywhere in the repository's dependency tree (checked at the repository root too), and the `firebase` CLI binary is not on `PATH`. `java` is present (the emulator's own runtime dependency), but the launcher and the test SDK it needs are not installed. So today, in this sandbox, `tools/firestore-emulator/note-foundation-v1.rules.test.mjs` itself could not be executed to re-confirm PR #104's own reported emulator results, let alone run a new case — this is an environment limitation, not something this task introduced or can fix.

**(3) The obvious workaround — build a second, independent Firebase-emulator test harness outside the protected directories, reading the same (unmodified) candidate Rules file — was considered and rejected.** It is technically possible in principle (this repository already has precedent for rewriting a module's import specifier to swap in a different Firestore binding at test time — `note-foundation-data-layer.mjs` does exactly this for its in-memory stub, and the same technique could point at a real `firebase/firestore` SDK instead). But building a parallel, unauthorized Firebase-testing workspace outside `tools/firestore-emulator/` would (a) need the same `firebase`/`@firebase/rules-unit-testing` packages this sandbox cannot currently install (no evidence of npm registry access here, and none was attempted, per the standing "never work around a boundary" instruction), and (b) duplicate — outside review — exactly the class of security-test infrastructure this repository deliberately keeps in one locked, previously-authorized location (`tools/firestore-emulator/`'s own STAGE-5-TASK-12/13 history). That is precisely the "second copy that could diverge, and was never reviewed" shape this bridge's rules exist to prevent, not merely a stylistic preference. **It was not attempted.**

All three blockers are independent of each other; any one alone would already stop this from being delivered in this run.

---

## 4. The minimal authorized test plan

If the Master Architect authorizes a touch to `tools/firestore-emulator/note-foundation-v1.rules.test.mjs`, the additive change is small and does not touch the accepted matrix, the candidate Rules file, or any existing case:

1. **Load the real function against the emulator's own SDK**, using the same import-rewrite technique `note-foundation-data-layer.mjs` already uses for its stub — except pointed at the `firebase/firestore` bindings the emulator suite already imports at the top of the file (`doc, getDoc, getDocs, ...`), not a fake:
   ```js
   // (inside the existing test(), after env/db/auth setup — sketch only, not applied)
   let nfSource = fs.readFileSync(path.resolve(here, "../../app/js/note-foundation.js"), "utf8")
     .replace(/import\s*\{[\s\S]*?\}\s*from\s*"https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore\.js";/,
       "const { collection, doc, getDoc, getDocs, limit, orderBy, query, where } = globalThis.__realFs;")
     // TENANT and envelope.js also need real-module substitution, same pattern
   ```
   This is additive text inside the existing test file; it changes no existing assertion.

2. **One new `ok(...)` case, e.g. `IMM-03c`**, seeding a Note at `REV2` and calling the real `retirePermanentNote(db, { tenantId: T, noteId: NOTE, expectedRevisionId: REV2, actorUid: "uid-p1" })` under `p1`'s own authenticated context, asserting `assertSucceeds`. This is genuine proof: the real function's real write, judged by the real Rules engine. Roughly 10–15 lines.

3. **On the stale-revision half specifically — a nuance worth recording rather than papering over.** `retirePermanentNote()`'s own first act is an application-level guard: `if (note.currentRevisionId !== expectedRevisionId) throw new Error("Stale Note revision.")`, thrown **before any Firestore write is attempted**. Calling the real function with a stale `expectedRevisionId` therefore proves the *application guard* works, not that the *Rules engine* would independently refuse a stale-chained write — those are different claims. **The Rules-level stale-revision claim is already covered**, structurally, by the existing hand-authored `TXN-03` case ("a stale expected revision is refused"), which commits the equivalent malformed batch directly and is refused by the Rules engine itself. Recommendation: add `IMM-03c` for the allow path (closes the real gap this report identifies) and leave the deny path to `TXN-03` as-is, rather than manufacturing a real-function call that bypasses its own guard to reach Firestore in a state the function is specifically designed never to produce — that would test a codepath the real client can never exercise.

Total authorized diff: roughly 20–30 lines in one already-protected file, zero lines anywhere else, no change to the candidate Rules or the accepted matrix. This is deliberately not applied here.

---

## 5. What this report does NOT do

- **No protected/shared path touched**: `tools/firestore-emulator/`, `tests/firestore/`, `firestore.rules`, `firebase.json`, `docs/governance/` (including the ledger and every `.rules`/index candidate), `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`, `.github/workflows/` — none read-and-modified, all confirmed unchanged by `git status`/`git diff`.
- **No code change of any kind.** `app/js/note-foundation.js` on `main` is untouched by this report; PR #104 remains the place its fix lives, unmerged and un-duplicated here on purpose, so the two PRs do not collide.
- **No version bump.** `app/js/version.js` stays `08.31`; `08.32` remains unallocated.
- **Nothing deployed, no Rules or index change, no merge, no approval claimed.**

---

## 6. Concrete visible MAP candidates, with their exact DDR/E1/shared-path dependency

Read off `CLAUDE.md`'s current milestone, `docs/governance/DDR.md`, and this session's own file-level check of what each candidate would have to touch. "Buildable now" means: no DDR item blocks it, no E1 (Firestore Rules/index deployment) dependency, and no protected/shared path is required.

| Candidate | Blocked by | Detail |
|---|---|---|
| Note editor surface (P5-D) | **E1** | Every write it would make is denied until the Phase 5 Note Foundation Rules and indexes are deployed (`notes`/`noteRevisions`/`noteSources` carry no live Rule today). |
| Any Mapping My Journey / Journey Map screen | **E1** (+ product scope, ADR-010 names it a minimum, not a full design) | `noteFolders`/`notePlacements` are Phase 6, deliberately unruled until Phase 6 Rules deploy; building a screen against them today would be unusable in production and, per ADR-010, "what a Journey Map looks like, is for, or contains" is still an Owner Control Gate beyond the minimum ADR-010 already fixed. |
| Deploying Phase 4/5/6 Rules and indexes (the single blocking action for the two rows above) | **E1 itself** | Needs authenticated Firebase Console access to `study-monitoring`, which this and prior bridge sessions do not have; recorded `FIREBASE_RULES_DEPLOYED: NO` in the programme ledger. |
| Timezone D14 (auto/manual mode + return-to-automatic) | **E1 (a Rules change)** | The deployed `tenantPeople` rule authorises only `hasOnly(['timezone', 'updatedAt'])`; D14's own accepted decision needs a mode field the current Rules would deny in production, so representing the decision needs a Rules change, gated the same as E1 above. |
| Non-Quran progress/mastery model (Deen Study, Arabic, General Study, Hadith, Nature-Life, Health claims) | **DDR-001** | No accepted universal progress/mastery definition exists outside Quran Approaches; explicitly Owner/Master-Architect-gated. |
| Subject-scoped teacher authority (narrowing co-enrolled-teacher access to only their assigned subjects) | **DDR-002** | Current authority is student-scoped, not subject-scoped; DDR-002 defers narrowing or broadening it. |
| Translator selection / repackaging Quran translation datasets | **DDR-003** | Product choice and authoritative packaged datasets are unapproved; the Reading-view selector stays disabled by design. |
| A 31st Approach, or any reinterpretation of the 30 | **DDR-004** | MAP v4 locks exactly 30 Approaches; only the Owner can reopen the count. |
| Closing the remaining interface-localization gap (`node tools/i18n-coverage.mjs`) | **Shared path** (`app/js/i18n/bn.js`) | Not Owner-gated per `DDR.md`'s own "Corrected non-DDR items," but every missing string lives in a file on this bridge's protected table. |
| "Edit banner needs a home" (`LAYOUT-BACKLOG.md` item 7) | **Shared path** (`app/js/nav.js`) | Small and fully specified, but wiring the link needs an edit to a protected file. |
| `noteSources` re-binding — letting an already-created Note gain a **second** source link after birth (`relationshipKind: "reference"` is currently only settable at `createPermanentNote()`'s own birth) | **None of the above — genuinely buildable now** | Flagged in PR #104 §7 as a real "accepted decision no code can perform" gap of the same shape PR #104 itself closed for retirement. Touches only `app/js/note-foundation.js` / `app/js/study-note-binding.js` (Quran-owned, not protected) and no Rule authorises anything today that this would newly exercise incorrectly — it is the one concrete candidate on this list with **no blocking dependency**, and a reasonable next bounded tranche. |

---

## 7. Suites run (repository root)

The seven governance suites this bridge requires, run against the unmodified `main` checkout plus this report only (no code changed):

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 48 passed, **1 failed** — pre-existing, unrelated to this report (see below) |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed — this is the pre-PR-#104 baseline count; this report does not include PR #104's unmerged fix, so `notes`'s two new FORWARD/BACKWARD checks are not yet exercised here |

**The one `programme-ledger-mutations` failure is a pre-existing, self-reported fixture-drift condition, not caused by this report.** Its own output names the cause: *"MUTATION [E] a stream's shared-file touch loses its declaration — fixture drift: no stream both declares `app/js/version.js` and still shows it changed on a branch."* This mutation case needs the live ledger (`docs/governance/programme-integration-ledger.json`) to currently describe a stream in that exact shape to construct its scenario; it reports itself as failed, by design, rather than silently passing when it cannot. This repository's own `docs/reports/2026-09-20-note-foundation-retire-revision-fix.md` (PR #104, run a short time earlier the same day) recorded `49 passed, 0 failed` for this same suite against the same unmodified `main` — the ledger's own declared-touch shape moved between that run and this one, for reasons outside this report (both `docs/governance/` and `tools/i18n-verify/programme-ledger-mutations.mjs` are on this bridge's protected table, so neither is this report's to change or investigate further). Nothing in this report touches the ledger, `programme-ledger-mutations.mjs`, or any shared file.

---

## 8. Rollback

This report adds two new files only (`.md` + `.html`). Deleting them is a full rollback; nothing else in the repository is touched.
