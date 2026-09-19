# MMSA / QuranRevival — D3 chokepoint branch: reconciliation against the Hadith ledger repair

**Date:** 19 September 2026
**Ruling executed:** *Accept the D3 chokepoint foundation repair on its branch. Keep v08.31; v08.32 remains unallocated. Do not integrate this branch while programme-ledger guards A and B fail on main. Claude-Hadith is handling the authorized Hadith ledger repair.*
**Outcome in one line:** the Hadith repair **has landed**, guards A and B are **green**, the branch is reconciled, verified and pushed — and it is **NOT integrated**, because one required gate is red on `main` itself and clearing it is outside this session's authority.

---

## 1. The SHAs, reported separately as instructed

| | |
|---|---|
| **D3 work commit** | **`57a73a8b7664c9818c3814e495e4abdeebaf608f`** — the repair itself: `study-note-service.js` and four suites |
| **D3 branch tip as accepted** | **`3adc853b2432acd04e1800fb8e278ac6a76311e1`** — the work **plus** the dated report in `.md` and `.html`. Verified pushed: local `HEAD` and `origin/claude/busy-hawking-5p8ck8` were byte-identical before any reconciliation began |
| `main` when the last round ended | `a64e2a1c97f397aba26bdfa281fdf4f2b5486547` |
| **`origin/main` now** | **`b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32`** — *Hadith: stamp the post-integration SHAs and remote guard results into the report* |
| Reconciliation merge | `d46bed0c5e7b76f62606859a2f559a9eae2f91a7` |
| Documentation-only entry | `c69ccf7017430b6a5fd397d3601a2bbb977128c6` |
| **D3 branch tip now, pushed and verified** | **`c69ccf7017430b6a5fd397d3601a2bbb977128c6`** |

`3adc853` is stated separately from `57a73a8` because the ruling asked for exactly that distinction: the work commit changes code, and the tip that was accepted also carries the report. `git diff 57a73a8 3adc853` is two files, both of them the report.

---

## 2. The Hadith ledger repair has landed

`origin/main` moved `a64e2a1 → b295ea8`, carrying three commits:

```
e207296  Merge origin/main (a64e2a1, v08.31) into feature/hadith-study
bde0f8e  Hadith: the authorised ledger repair, and the S5 report corrected in a superseding note
b295ea8  Hadith: stamp the post-integration SHAs and remote guard results into the report
```

**It changed twelve files and not one of them is a D3 file:** `docs/governance/programme-integration-ledger.json`, one new governance note, four reports in both formats, and two new guards (`hadith-gate-contracts.mjs`, `hadith-governing-contracts.mjs`). **`CLAUDE.md` and `CHANGELOG.md` were not touched by it**, which is why §4's entry appends cleanly rather than competing with anything. `app/js/version.js` on the new `main` still reads **`08.31`**.

**The Hadith ledger record was not modified by this session, in any way.** The reconciliation is a merge; `git diff origin/main HEAD -- docs/governance/programme-integration-ledger.json` is **empty**.

### The named blocker is cleared

| Guard | Before the Hadith repair | Now |
|---|---|---|
| **A** — no version claimed twice | **FAIL** — *stream hadith declares 08.29 but feature/hadith-study is stamped 08.30* | **PASS** — *08.31 is LIVE and matches main* |
| **B** — nothing stamps an unreserved number | **FAIL** — *…which the ledger reserves for nobody under stream hadith* | **PASS** — *1 declared branch stamp is reserved, and nothing claims 08.32 or beyond* |

`programme-ledger.mjs` is **8 passed / 22 noted / 0 failed**, exit 0.

---

## 3. Reconciliation

`origin/main` was merged into the branch. **Conflict-free, and verified rather than predicted** — the two change sets share no file, established by reading the diff before merging rather than by watching git succeed.

After the merge, `git diff origin/main HEAD -- app/` names **exactly one file**: `app/js/study-note-service.js`, which is page-unreachable. Nothing else under `app/` differs from `main` by a byte, and `app/js/version.js` is untouched.

---

## 4. The authorised documentation-only entry

Added after checking current `main`, as instructed, in the two shared documents and nowhere else. `git diff HEAD~1 HEAD` is **`CLAUDE.md` and `CHANGELOG.md`, nothing more.**

It records the three facts the ruling names:

1. **The service remains page-unreachable** — 0 of 29 pages, with `records.js` (16) and `study-event-wiring.js` (1) as the positive controls that stop the walk passing vacuously, and 0 import cycles across 96 modules.
2. **The direct store caller was removed** — `recordJournalEvidence()` calls `recordStudyEvidence()`, and the boundary suite's `KNOWN_UNREACHABLE_CALLER` exception is **gone rather than widened**.
3. **`study-event-wiring.mjs` was repaired from 0 executing checks to 41** — it had thrown `ERR_INVALID_URL` at module load since v08.31's own accepted commit `65ef3c5`, exiting 1 with a stack trace and **no `FAIL` line**, so the chokepoint's own unit suite asserted nothing for the whole of its existence.

**The CHANGELOG entry is deliberately not a version heading.** It reads `NO VERSION BUMP` and names no new number, so no v-prefixed scanner in this repository can read it as an allocation. **`08.32` stays UNALLOCATED**, and `app/js/version.js` stays `08.31`.

`brief-integrity.mjs` is **8 passed / 0 failed** after the edit — including its check that the milestone line matches `origin/main`'s own `version.js`.

---

## 5. Verification

### 5.1 Pure gates, on the reconciled tree

| Suite | Result | Exit |
|---|---|---|
| `programme-ledger` (A–G) | **8 / 22 noted / 0 failed** — **A and B now PASS** | 0 |
| `programme-ledger-mutations` | **48 / 1** — §6, pre-existing on `main` | **1** |
| `brief-integrity` | 8 / 0 | 0 |
| `study-activity-evidence-boundary` | **27 / 0** | 0 |
| `study-activity-evidence-boundary-mutations` | **11 / 0** | 0 |
| `study-event-wiring` | **41 / 0** | 0 |
| `study-note-service` | **35** | 0 |
| `study-note-boundary` / `study-note-binding` | 17 / 16 | 0 |
| `note-foundation-boundary` / `note-journal-evidence` | 30 / 18 | 0 |
| `study-activity-evidence` / `-id` / `-store` | 11 / 29 / 26 | 0 |
| `study-approach-contract` / `-boundary` | 13 / 16 | 0 |
| **`quran-boundary`** | **30 / 0** | 0 |
| `journey-map-boundary` / `-contract` / `-service` | 13 / 34 / 18 | 0 |
| `d14-timezone-boundary` / `-contract` | 10 / 21 | 0 |
| **`hadith-corpus`** | **33 / 0** | 0 |
| **`hadith-source-rights`** | **14 / 0** | 0 |
| **`hadith-commentary-binding`** | **14 / 0** | 0 |
| **`hadith-gate-contracts`** *(new, from the repair)* | **11 / 0** | 0 |
| **`hadith-governing-contracts`** *(new, from the repair)* | **14 / 0** | 0 |
| `rules-authorisation-executable` | 38 / 0 | 0 |
| `rules-deployment-candidate` / `firestore-index-requirements` / `stub-parity` | 10 / 8 / 3 | 0 |

The two guards the Hadith repair introduced were run as well as the three existing Hadith suites — a stream's new guards are part of the base this branch now sits on, and a reconciliation that did not run them would not have checked what it merged.

### 5.2 Post-push remote checks

The branch was pushed, then **a fresh detached worktree was checked out from `origin/claude/busy-hawking-5p8ck8` and the gates re-run there** — so the results above are proven of *what is on the remote*, not merely of a local tree that happens to resemble it.

- Remote tip `c69ccf7017` == local `HEAD`: **identical**.
- Every deliverable present in the remote tree: the five work files, the report in both formats, and both shared documents.
- **Every gate result reproduced exactly**, including the single pre-existing failure of §6.
- `origin/main` re-read after the push: **`b295ea8`, unmoved.**

### 5.3 Rendered gates

| Suite | Result | Exit |
|---|---|---|
| `layout.mjs` (shim built from the NEW `main`, `b295ea8`) | **NO LAYOUT REGRESSIONS** | 0 |
| `navcheck.mjs` | nav fits in both languages at every width | 0 |
| `panel.mjs en` | PANEL OK apart from the known baseline | 0 |
| `panel.mjs bn` | **6 PROBLEM(S)** — the **O3c** baseline: 6 x `#drillModeSelect`, Bangla, 48px usable against 54px needed | **1 — pre-existing** |
| `reading.mjs` | READING SCREEN OK | 0 |
| `i18n-coverage.mjs` | **1,879 scanned, 1,818 Bangla, 61 missing** — identical to baseline | 0 |
| `behaviour.mjs` | **978 passed, 4 failed, 56 sections — 982 checks, the baseline total** | **1 — all four environmental** |

**`layout.mjs` was run with its comparison shim built from the new `main`**, so it answers the question a reconciliation has to answer — *did the Hadith repair and this branch together move anything on the landing page* — rather than merely repeating an older comparison. They did not. The shim was deleted before the coverage total was read, which is this repository's own recorded trap: it is a second copy of a page in `app/`, and counting it corrupts the number.

### 5.4 `behaviour.mjs`

**978 passed, 4 failed, 56 sections — 982 checks against the baseline's 982.** All four failures are the documented environmental set and not one is an application failure:

- **`22g` x 3** — the archive.org poster block. `CLAUDE.md` records it as **intermittent** (*"inside one tranche on identical code they passed in runs 1/3/5/9/10 and failed in 2/4/6/7/8/11"*), so neither a red nor a green `22g` is evidence either way.
- **`31e`** — the sandbox TLS artefact, `ERR_CERT_AUTHORITY_INVALID`. `--ignore-certificate-errors` was **not** used; it would also hide a real certificate problem.

This is **identical to the run on the pre-reconciliation branch** — same total, same four, same sections — which is what a reconciliation that changes one page-unreachable file should produce, and it was measured rather than assumed.

### 5.5 The emulator suite was not re-run, and the reason is stronger than a re-run

`git diff origin/main HEAD -- firestore.rules firebase.json firestore.indexes.json tests/ tools/firestore-emulator/ docs/governance/` is **empty**. Not one byte of the security, index, emulator or governance surface differs from `main` — so the Phase 4 result (53 assertions, 0 failures, re-run during this morning's v08.31 integration) cannot have moved. **The Hadith repair changed the ledger; this branch changed none of it.**

---

## 6. THE ONE RED GATE, AND WHY THIS BRANCH IS NOT INTEGRATED

`programme-ledger-mutations.mjs` exits **1**: `48 passed, 1 failed`.

**It is not this branch's.** Proven, not argued: a detached worktree was checked out at clean `origin/main` (`b295ea8`) and the harness run there. It fails **identically**, with the same single case. The branch reproduces `main`'s result and adds nothing to it.

**The failing case, diagnosed.**

```
FAIL  MUTATION [A] the ledger and the branch disagree about what the branch is stamped
      guard A did NOT fail -- it is UNPROVEN and must not be trusted
```

The mutation **hardcodes the hadith stream**:

```js
const s = l.streams.find((x) => x.id === "hadith");
s.declaredVersion = "08.28";
```

The Hadith repair — correctly — set `hadith.activeBranch` to `null`, because the stream is `MERGED_TO_MAIN` and has no live branch. Guard A's branch-versus-ledger comparison only runs for streams that *have* an active branch, so with `activeBranch: null` the loop body never reaches hadith and the mutation provokes nothing.

**Its own sibling shows the intended shape.** Mutation `[B]`, three lines below, **derives** its target instead of naming a stream:

```js
const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);
```

That is precisely the correction this repository already made on 18 September — *"both DERIVE their target from the ledger now … so they model the general programme state rather than one day's arithmetic."* **Mutation `[A]` was left hardcoded when its siblings were fixed**, and the Hadith repair is simply what exposed it. `quran-phase4-wiring` still carries `activeBranch: claude/phase4-wiring`, so a derived target exists and the mutation would be provable again.

**Guard A itself is sound and is not in doubt.** It fired correctly on the real divergence earlier today, naming it exactly. What is unproven is the *mutation's ability to reach it*, which is debt in the harness rather than a hole in the guard — a materially smaller problem than an unproven guard usually is, and still worth closing.

**Why it was not fixed here.** `tools/i18n-verify/programme-ledger-mutations.mjs` is a **platform-shared** path. The ruling authorised exactly two shared files, `CLAUDE.md` and `CHANGELOG.md`, and this is neither. It is a one-line change and it is not this session's to make.

### The integration decision

The ruling says: **"Integrate only if all required gates are green and main has not moved during verification."**

`main` has **not** moved — `b295ea8` before and after. But one gate is **not green**, and it cannot be made green from inside this session's authority. So **the branch was not integrated**, and no ceremonial merge was made.

This is deliberately the literal reading. The specific blocker the ruling named — guards A and B — **is cleared**, and it would have been easy to treat that as the whole condition. It is not what the sentence says, and the previous round already carried one judgement call of that shape; a second would be a habit. **The branch is ready: `main` is merged in, every other gate is green on the pushed remote tip, and integration is one fast-forward whenever the Master Architect rules.**

Two routes are open, and both are the Master Architect's:
1. Authorise the one-line fix to mutation `[A]` — derive the stream the way `[B]` does — then integrate.
2. Rule the harness failure out of scope for this integration, and integrate as-is.

---

## 7. The four deployment states — unchanged

| State | Value | Basis |
|---|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** for v08.31 | `main` carries v08.31; **this branch is NOT integrated** |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN**, `verified: false` | The sandbox proxy refuses `CONNECT` to `github.io` |
| `FIREBASE_RULES_DEPLOYED` | **NO** | **E1 CLOSED.** Nothing was deployed and nothing was attempted |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** | The evidence subcollection has no rule |

`firestore.rules` contains the word `evidence` **zero** times, and the readiness declaration is still the literal `false` with `decision: null`. **The gate was not enabled.**

---

## 8. State block

```
MMSA_QR_D3_RECONCILIATION
DATE=2026-09-19
D3_WORK_COMMIT=57a73a8b7664c9818c3814e495e4abdeebaf608f
D3_BRANCH_TIP_AS_ACCEPTED=3adc853b2432acd04e1800fb8e278ac6a76311e1
PREVIOUS_MAIN=a64e2a1c97f397aba26bdfa281fdf4f2b5486547
CURRENT_MAIN=b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32
HADITH_LEDGER_REPAIR=LANDED (bde0f8e, stamped b295ea8)
RECONCILIATION_MERGE=d46bed0c5e7b76f62606859a2f559a9eae2f91a7
DOCUMENTATION_COMMIT=c69ccf7017430b6a5fd397d3601a2bbb977128c6
D3_BRANCH_TIP_NOW=c69ccf7017430b6a5fd397d3601a2bbb977128c6
BRANCH_PUSHED=YES, remote tip == local HEAD, gates re-run from a fresh remote checkout
GUARD_A=PASS
GUARD_B=PASS
PROGRAMME_LEDGER=8 passed / 22 noted / 0 failed
PROGRAMME_LEDGER_MUTATIONS=48 passed / 1 failed -- PRE-EXISTING ON MAIN, proven in a clean worktree
MUTATION_A_DIAGNOSIS=hardcodes the hadith stream; the repair correctly set hadith.activeBranch=null; sibling [B] derives its target and is the intended shape; platform-shared file, NOT fixed here
INTEGRATED=NO -- "integrate only if ALL required gates are green" is not satisfied
MAIN_MOVED_DURING_VERIFICATION=NO
CEREMONIAL_MERGE=NONE
LEDGER_MODIFIED_BY_THIS_SESSION=NO
SHARED_FILES_TOUCHED=CLAUDE.md, CHANGELOG.md (both expressly authorised)
APP_FILES_CHANGED=1 (app/js/study-note-service.js, page-unreachable)
VERSION=08.31 UNCHANGED
V0832_STATUS=UNALLOCATED
FIREBASE_RULES_DEPLOYED=NO
EVIDENCE_RECORDING_OPERATIONAL=NO
E1_STATUS=CLOSED
BEHAVIOUR=978 passed / 4 failed of 982, 56 sections -- all four environmental (22g x3 archive.org intermittent, 31e TLS), 0 application failures
READY_TO_SHIP=NO
```
