# SCR-HADITH-02 integrated into `main`

**19 September 2026 · Hadith Study stream · integration report · BR-0 · no application change**

Under the Master Architect's instruction to integrate SCR-HADITH-02 from
`feature/hadith-study` into `main`, with the scope confirmed first, three gates
required, and a stop on any movement of `main` or any gate failure.

**`main` did not move and no gate failed.** The integration is a **fast-forward**
— `main` was already an ancestor of the branch, so no merge commit was created
and no tree was rewritten.

---

## SHAs, reported separately as required

| | |
|---|---|
| **Branch tip, confirmed before integrating** | `35d51e6eabb3d01fd5046760cb2d9f3c1886f80c` |
| **`main` before integration** | `b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32` |
| **`main` re-checked immediately before the push** | `b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32` — **UNMOVED** |
| **INTEGRATION SHA** (the commit `main` was advanced to) | **`35d51e6eabb3d01fd5046760cb2d9f3c1886f80c`** |
| **FINAL `origin/main`, read back after the push** | **`35d51e6eabb3d01fd5046760cb2d9f3c1886f80c`** |
| **FINAL `origin/feature/hadith-study`** | `35d51e6eabb3d01fd5046760cb2d9f3c1886f80c` — branch and `main` are now the same commit |
| **Method** | fast-forward, `b295ea8..35d51e6`; **no merge commit** |

The integration SHA and the final `main` SHA are identical here **because the
integration was a fast-forward and nothing has landed on `main` since.** They are
reported as two separate facts rather than one, because they are two separate
facts: the first is what this session advanced `main` to, the second is what
`origin/main` actually reads now.

---

## Scope, confirmed BEFORE integrating

The diff between `origin/main` and the branch tip is **four files, 336
insertions, 3 deletions**, and every one of them is inside the authorised scope:

| File | What | Authorised as |
|---|---|---|
| `tools/i18n-verify/programme-ledger-mutations.mjs` | **+10/−2** — the guard-A mutation derives its subject stream from the ledger instead of hard-coding `"hadith"`. Two lines of fix, eight of comment | The authorised mutation fix |
| `docs/governance/programme-integration-ledger.json` | **+13/−1** — the Hadith stream record only | Its Hadith ledger record |
| `docs/reports/2026-09-19-hadith-scr02-mutation-fix.md` | +207, new | Its dated report |
| `docs/reports/2026-09-19-hadith-scr02-mutation-fix.html` | +106, new | Its dated report |

**Nothing else, proven rather than asserted.** `git diff` across `app/`,
`firestore.rules`, `firebase.json`, `tests/`, `legacy/`, `legacy-v07/`,
`CLAUDE.md` and `CHANGELOG.md` is **empty**.

**The ledger change was confirmed at FIELD level, not by reading the diff.** Both
ledger hunks fall inside the `hadith` record, whose bounds on `main` are file
lines 332–417; the changed lines are 335 and an insert after 400. A structural
comparison then parsed both versions and compared every top-level key and every
stream:

- **All 22 top-level keys UNCHANGED** — including `versionAllocations` (so the
  Quran **v08.31 LIVE** allocation and both Hadith allocations are untouched),
  `deployment` (all four states), `nextUnallocated`, `deploymentSecuritySharedPaths`,
  `sharedChangeRequests`, `versionVocabulary` and `d14`.
- **All five streams present; four byte-identical** (`mmsa-platform`, `quran`,
  `quran-phase4-wiring`, `health`). **Only `hadith` changed**, and within it only
  two things: `activeBranchNote` (its sentence saying the fix was *not* applied
  was false once it was) and a **sixth `declaredSharedTouches` record** carrying
  the Master Architect provenance for the mutation-file touch.

---

## The three required gates

Run on the integration candidate **before** the push, and again against the
**pushed remote** afterwards. Identical results at both points:

| Gate | Required | Measured, before | Measured, after push |
|---|---|---|---|
| `programme-ledger-mutations.mjs` | **49/0** | **49 passed, 0 failed** — exit 0 | **49 passed, 0 failed** |
| `programme-ledger.mjs` | **zero failures** | **8 passed, 23 noted, 0 failed** — exit 0 | **8 passed, 23 noted, 0 failed** |
| `brief-integrity.mjs` | **zero failures** | **8 passed, 0 failed** — exit 0 | **8 passed, 0 failed** |

**What `main` gains by this, stated plainly:** until this integration, `main`
carried the stale hard-coded mutation, so **its own mutation suite exited 1** —
guard A's fourth failure mode was unproven on the branch the site is served from.
It is proven there now.

---

## Verification of the pushed remote

Read back **out of `origin/main` itself**, not out of the working tree:

| Check | Result on `origin/main` |
|---|---|
| The mutation's subject line | `const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);` |
| Hadith stream record | 6 shared-file touch records; `activeBranch` **null**; `declaredVersion` **null** |
| The dated report | present, 207 lines |
| `app/js/version.js` | `export const APP_VERSION = "08.31";` — **unchanged** |
| `nextUnallocated` | **`08.32`** — still unallocated |

---

## What was NOT done

- **No application code changed.** `app/`, `firestore.rules`, `firebase.json`
  and `tests/` are byte-identical across the integration.
- **v08.32 was NOT allocated.** The version stays **08.31**, owned by the Quran
  stream and marked LIVE; `nextUnallocated` still names 08.32 only to record
  that it belongs to nobody.
- **Nothing was deployed.** Repository `firestore.rules` evidence and the
  DEPLOYED Firebase Rules state are separate facts: the file is readable here and
  is untouched, and the deployed state cannot be inspected from this sandbox.
  **FIREBASE_RULES_DEPLOYED: UNVERIFIED.**
- **`study-event-wiring.mjs` was NOT touched** — its `data:`-URL import failure
  is a pre-existing test-harness defect that MMSA/QR has repaired on its D3
  branch, and duplicating that repair would produce two independent fixes of one
  shared file and a conflict at its merge.
- **All Hadith Owner Control Gates remain CLOSED**: C2 not applied, no Hadith
  Approach id allocated, no corpus/translation/commentary imported, no durable
  Track, no Notes/MMJ persistence, no Rules or index activation, no migration.

---

## Machine-readable status

BRANCH_TIP_CONFIRMED=35d51e6eabb3d01fd5046760cb2d9f3c1886f80c

PRE_MAIN_SHA=b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32 (re-checked immediately before the push; UNMOVED)

INTEGRATION_SHA=35d51e6eabb3d01fd5046760cb2d9f3c1886f80c

FINAL_MAIN_SHA=35d51e6eabb3d01fd5046760cb2d9f3c1886f80c (read back from origin/main after the push)

METHOD=fast-forward b295ea8..35d51e6; no merge commit

SCOPE=4 files, +336/-3: the authorized mutation fix (+10/-2), the Hadith ledger record only (+13/-1), and the dated report .md + .html

SCOPE_PROVEN=all 22 top-level ledger keys UNCHANGED; 4 of 5 stream records byte-identical; only streams[hadith] changed; app/, firestore.rules, firebase.json, tests/, CLAUDE.md, CHANGELOG.md all empty diffs

MUTATIONS=49 passed, 0 failed (required 49/0) - before and after the push

PROGRAMME_LEDGER=8 passed, 23 noted, 0 failed (required zero) - before and after the push

BRIEF_INTEGRITY=8 passed, 0 failed (required zero) - before and after the push

APP_VERSION=08.31 unchanged; v08.32 NOT allocated

OWNER_CONTROL_GATES=ALL CLOSED

FIREBASE_RULES_DEPLOYED=UNVERIFIED - nothing deployed by this integration

SESSION_STATUS=INTEGRATED. origin/main = 35d51e6, gates green on the pushed remote. This report's own commit is the only thing that follows it, and it changes no code.
