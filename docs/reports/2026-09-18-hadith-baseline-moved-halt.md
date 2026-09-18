# Hadith Stage A/B integration — HALTED: BASELINE MOVED

**Date:** 2026-09-18 · **Type:** Mandated halt under instruction 1 of the Integration-Preparation tranche.
**No integration was performed. No history was rewritten. No version was consumed. Nothing was merged, deployed or refactored.**

The instruction is unconditional: *"Confirm `origin/main` before doing anything. If it is
no longer `7111e3c...`, STOP implementation and report BASELINE MOVED with the new SHA
and diff summary."* The baseline check failed on the first command of the tranche, so
implementation never began. This report is that mandated notice, plus everything the
Master Architect needs to re-authorise in one step.

---

## 1. BASELINE MOVED

| | |
|---|---|
| `origin/main` **authorised** | `7111e3c975d3cf3fd0bf0c0d7814691edcd5299e` |
| `origin/main` **actual** | **`5ea0d928b8f326e0164c988ef79e4d1d1c168eeb`** |
| Application version | **`08.27` — UNCHANGED** |
| Hadith branch HEAD | `8b14eb18d58599446636da460442627cca395a68` (local = remote, tree clean) |

### The move, in full

**One commit, two files, both documentation.**

| SHA | Subject |
|---|---|
| `5ea0d928b8f326e0164c988ef79e4d1d1c168eeb` | *Quran Stream integration reconciliation: state, inventory, Hadith overlap, collision risks* |

Diff `7111e3c → 5ea0d92`: **2 files changed, 392 insertions, 0 deletions** —
`docs/reports/2026-09-18-quran-stream-integration-reconciliation.{md,html}`.

**Materially benign, established rather than assumed:** filtering the changed paths for
anything outside `docs/reports/` returns **nothing**. No application code, no
`app/js/version.js`, no shared file, no `firestore.rules`, no `firebase.json`. `main`
remains `08.27`. **D14 is still present and still unreachable** in the new baseline —
`timezone-contract.js` and `timezone-service.js` both exist and no page or module
imports either.

**Assessment, for the Master Architect's decision and not a substitute for it:** the move
is documentation-only and changes nothing the integration depends on. Re-authorising
against `5ea0d92` appears to be a formality. **That judgement is the Master Architect's
to make, and implementation stays halted until it is made.**

---

## 2. Merge prediction against the NEW baseline — analysis only, nothing written

Run because it costs nothing and materially informs the re-authorisation. It is a
read-only prediction: `git merge-tree --write-tree` writes no ref and touches no
worktree, and HEAD and `git status` were re-verified unchanged immediately afterwards.

| | |
|---|---|
| `git merge-tree --write-tree origin/main HEAD` | **exit 0 — NO CONFLICT** |
| Predicted result tree | `2732514ea2473831792e68029e430b345be0296b` |
| HEAD after | `8b14eb18d58599446636da460442627cca395a68` — **unchanged** |
| Working tree after | **clean** |

The prediction is unchanged in substance from the previous baseline: the only file both
streams have modified since the shared merge base (`6758490`) is `CLAUDE.md`, in
non-adjacent regions.

---

## 3. The Quran stream's reconciliation — read, and one figure corrected

The commit that moved the baseline is the Quran stream's own reconciliation, and it
addresses this stream directly. It **corroborates** the Hadith reconciliation on every
material point: Stage A `7f61328` at 08.28 and Stage B `cd344f4` at 08.29 both present
and unmerged; zero predicted textual conflicts; `CLAUDE.md` the only shared-file overlap.

**Its three Hadith-branch findings are exactly the three this tranche's task 4 asks to
fix, and all three are confirmed true** (§4).

**One figure in it is overstated, reported factually:** it records
`tools/i18n-verify/behaviour.mjs` as **+32 / −6**. Measured three independent ways here —
`git diff --numstat`, `--shortstat`, and a raw `grep -c` of added and removed lines — it
is **+27 / −5**, identically whether measured over Stage B alone or over the whole branch
from the merge base. The correct figure is **+27 / −5**.

**Two figures that look like disagreements are not**, and the difference is scope:

| File | Stage B alone | Whole branch from merge base | Both correct? |
|---|---|---|---|
| `app/js/i18n/bn.js` | +21 / −0 | **+68 / −0** | **Yes** — +47 came from H2-A, +21 from Stage B |
| `app/hadith-study.html` | +43 / −0 | +43 / −0 | Yes — identical |

For merge planning the **whole-branch** figures are the right ones; my earlier
reconciliation quoted Stage-B scope, which was correct for its own question. Recorded so
the two documents are not read as contradicting each other.

---

## 4. Task-4 governance drift — all three items CONFIRMED, none yet fixed

Verified against the repository, because a fix must not be planned from a report alone.

| # | Item | Evidence | Status |
|---|---|---|---|
| 1 | Brief claims the wrong version | `CLAUDE.md:29` reads *"This branch carries app version `08.28`"*; `app/js/version.js` reads **`08.29`** | **CONFIRMED.** Written at Stage A, never updated when Stage B bumped |
| 2 | Non-canonical notation blinds the guard | The Hadith block contains **4** bare `08.28` and **0** `v08.28`/`v08.29`. `brief-integrity.mjs:165` scans `/\bv(0[78]\.\d{2})\b/g` — **the `v` prefix is required** | **CONFIRMED** |
| 3 | No changelog entries | `CHANGELOG.md` contains **0** matches for `v08.28` or `v08.29` | **CONFIRMED** |

**Items 2 and 3 are one defect, and this is the part worth stating plainly.** Because the
brief writes `08.28` rather than `v08.28`, the scanner never sees the version, so
`brief-integrity`'s *"every version the brief names is also in `CHANGELOG.md`"* check
**passes vacuously** for both Hadith versions. It is not detecting compliance; it is
failing to look. Writing the canonical `v08.28` / `v08.29` will make the guard **see**
them, and it will then correctly demand the changelog entries that task 4 also requires.
**The two halves of task 4 fit together, and the guard is not to be weakened** — the
notation is what is wrong, not the check.

---

## 5. Prepared execution plan — ready to run on re-authorisation

Held, not performed. Recorded so that re-authorisation needs no further design.

1. **Re-confirm** `origin/main` immediately before acting, and halt again if it has moved.
2. **Integrate by merge, not rebase** — `git merge origin/main` into `feature/hadith-study`,
   the same history-preserving method used at `aef6cf3` and `85c35cf`. **No accepted Stage
   A/B commit is rewritten**, so `7f61328` and `22526b2` keep their SHAs and their recorded
   versions. The Hadith branch is never merged into `main`.
3. **Preserve `08.29`** — `main` is `08.27` and does not touch `version.js`, so no conflict
   arises and the candidate keeps 08.29. **`08.30` is not allocated.** Verify the resulting
   tree carries D14, Stage A and Stage B with no loss on either side.
4. **Governance, in the Hadith-owned block only**: correct `08.28` → `08.29` as the
   branch's *current* application version, while recording the historical truth
   (Stage A = v08.28, Stage B = v08.29), in canonical `v08.xx` notation. Add
   `CHANGELOG.md` entries for **v08.28** and **v08.29**, described explicitly as Hadith
   branch/integration milestones, with **no claim that either was deployed or live**.
5. **`behaviour.mjs`**: no redesign. The Stage-B exclusion stays. Record
   `SHARED CHANGE REQUEST 01 — STATUS=ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`. The
   comment-only indentation defect may be corrected **only if the behavioural diff is
   provably empty**, which for a comment it is — to be demonstrated, not assumed.
6. **Full verification** per task 7, with environmental failures separated from
   application failures by name.
7. **Merge prediction** per task 8. **No merge, no deployment, no further tranche.**

**Scope discipline:** the five shared files (`version.js`, `CLAUDE.md`, `CHANGELOG.md`,
`bn.js`, `behaviour.mjs`) would be touched **only** as tasks 3–5 require. `bn.js` and
`behaviour.mjs` need **no further change at all** in that tranche — their Stage B state is
already accepted.

---

## 6. Gates — all remain CLOSED

No real corpus, translation or commentary embedding · no permanent Hadith key adoption ·
no Approach ID allocation · no durable Track · no Notes/MMJ persistence · no Rules or
index activation · no migration · no deployment · no merge · **no version consumed —
`08.29` stands and `08.30+` remains unallocated.**

## 7. Firestore Rules — the two facts, stated separately

**REPOSITORY:** `firestore.rules` and `firebase.json` are **byte-identical to
`origin/main`**; `firestore.rules` contains **0** `hadith` collections; no
`firestore.indexes.json` exists. This proves repository content and nothing else.

**DEPLOYMENT: UNVERIFIED.** No `firebase` CLI, no `gcloud`, no credentials; the Firebase
Rules API returns **HTTP 403 PERMISSION_DENIED** to an unregistered caller. The deployed
ruleset has not been inspected and cannot be inspected from this environment.

---

## HADITH_INTEGRATION_CANDIDATE

The named deliverable is **NOT PRODUCED**: no candidate exists, because the tranche
halted at its own first gate. Fields are reported against the actual state, and a field
that would describe unperformed work says so rather than being filled in speculatively.

STATUS=HALTED_BASELINE_MOVED

MAIN_SHA=5ea0d928b8f326e0164c988ef79e4d1d1c168eeb

MAIN_SHA_AUTHORISED=7111e3c975d3cf3fd0bf0c0d7814691edcd5299e

MAIN_SHA_DELTA=1 commit, 2 files, +392/-0, docs/reports/ ONLY (the Quran stream's own reconciliation). No app code, no version, no shared file, no Rules. Materially benign; re-authorisation is the Master Architect's call

MAIN_VERSION=08.27

BRANCH=feature/hadith-study

HEAD=8b14eb18d58599446636da460442627cca395a68

MERGE_BASE=6758490cf957c646df4945ad52b0cf403cc3cf61

STAGE_A_SHA=7f6132888bc02728e07e2214b5a8d6323708e00a

STAGE_A_VERSION=08.28

STAGE_B_VERSION=08.29

CANDIDATE_VERSION=08.29 (unchanged; NOT consumed; 08.30+ unallocated)

D14_PRESENT=YES in origin/main 5ea0d92 (timezone-contract.js and timezone-service.js both present, still unreachable — no importer). NOT YET in the Hadith branch: integration not performed

GOVERNANCE_DRIFT_FIXED=NO — halted. All three items CONFIRMED and unfixed: CLAUDE.md:29 says 08.28 while version.js says 08.29; the brief uses bare 08.28 (4x) and no v08.xx, so brief-integrity.mjs:165 /\bv(0[78]\.\d{2})\b/ cannot see it and its CHANGELOG check passes VACUOUSLY; CHANGELOG.md has 0 entries for either version

CHANGELOG_0828=ABSENT — not written (halted)

CHANGELOG_0829=ABSENT — not written (halted)

SHARED_FILES_CHANGED=NONE by this halt. Accepted Stage A/B state stands: app/js/version.js (08.29), CLAUDE.md (Hadith block), app/js/i18n/bn.js (+68/-0 whole-branch; +21/-0 Stage B), tools/i18n-verify/behaviour.mjs (+27/-5 — CORRECTING the Quran report's +32/-6, measured three ways). CHANGELOG.md untouched

BEHAVIOUR_DEFERRED_DEBT=SHARED CHANGE REQUEST 01 STATUS=ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED. Stage-B exclusion remains. Future platform solution must distinguish intentionally multi-language/multi-script content from data-i18n-skip. Contract NOT invented here

TEST_RESULT=NOT RUN for an integration candidate — none exists. Last full evidence at HEAD stands: 13 pure suites 243 passed / 0 failed, all exit 0; behaviour.mjs 978 passed / 4 failed across 56 sections

ENVIRONMENTAL_FAILURES=4, all environmental, none application: archive.org screensaver caption / alt text / poster URL (x3, recorded as INTERMITTENT) and one sandbox TLS ERR_CERT_AUTHORITY_INVALID

MERGE_PREDICTION=CLEAN against the NEW baseline. git merge-tree --write-tree origin/main HEAD exits 0 with result tree 2732514ea2473831792e68029e430b345be0296b and no conflicts. Read-only: HEAD and working tree re-verified unchanged. Only shared-file overlap is CLAUDE.md, in non-adjacent regions

RULES_REPOSITORY_STATUS=UNCHANGED — firestore.rules and firebase.json byte-identical to origin/main; 0 hadith collections; no firestore.indexes.json

RULES_DEPLOYMENT_STATUS=UNVERIFIED — no firebase CLI, no gcloud, no credentials; Rules API returns HTTP 403 PERMISSION_DENIED (unregistered caller). Deployed ruleset not inspected and not inspectable from this environment

READY_FOR_MASTER_ARCHITECT_MERGE_REVIEW=NO — halted at the baseline gate before any work. Awaiting re-authorisation against 5ea0d928b8f326e0164c988ef79e4d1d1c168eeb (or a newer confirmed SHA). The execution plan is prepared and needs no further design
