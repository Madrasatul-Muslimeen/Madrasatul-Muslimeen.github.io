# Hadith Study — H2-A reconciliation, before H2-B

**Date:** 2026-09-18
**Branch:** `feature/hadith-study`
**Branch HEAD at reconciliation:** `8051c85c8db5d00a0fd8d54ae2ff4215b9d66e4e`
**Status:** H2-A remains **awaiting Master Architect audit**. No H2-B work started. No merge, no deploy, no Rules change, no Firestore write of any kind.

This report answers the five reconciliation items in the Owner's handover of 2026-09-18, with the exact commands and their real output. It corrects **three** statements in the H2-A report, records **one new finding** in H2-A's own code, and flags **one stale figure** in the standing brief that belongs to the Quran/`main` side.

---

## 1. Verified state — commits, branches, worktrees, version

Commands: `git fetch origin --prune` · `git rev-parse origin/main feature/hadith-study c7ee03e 8051c85` · `git worktree list` · `git status --short`.

| Fact | Value |
|---|---|
| `origin/main` | `1cac2b8ea8ca2e5bac8ab5a10fa01a332b226cd8` |
| `origin/feature/hadith-study` = local HEAD | `8051c85c8db5d00a0fd8d54ae2ff4215b9d66e4e` |
| **Last app-code commit** | `c7ee03ef957a191ae195977623972e32f6a366a5` |
| **Report commit** | `8051c85c8db5d00a0fd8d54ae2ff4215b9d66e4e` |
| Merge base with `main` | `1cac2b8…` — **the branch contains all of `main`**; 0 behind, 6 ahead |
| Working tree | **clean**, no uncommitted change |
| `APP_VERSION` on branch | **`08.27`** |
| `APP_VERSION` on `main` | **`08.25`** |
| `claude/phase4-wiring` | `7e2931f795af1cd97efc1167660cea93aa22b9ab` (still holds `08.26`) |

**Worktrees.** The handover's `/home/user/hadith-study` worktree did **not exist** in this session's container — a fresh container carries only the clone. It was re-created from the existing branch (`git worktree add /home/user/hadith-study feature/hadith-study`); **no new branch and no new repository was made**.

| Path | Branch | HEAD |
|---|---|---|
| `/home/user/Madrasatul-Muslimeen.github.io` | `claude/vibrant-dijkstra-s1s8kl` | `1cac2b8` (identical to `main`) |
| `/home/user/hadith-study` | `feature/hadith-study` | `8051c85` |

**Diff against `main`** — 20 paths: **17 added, 3 modified, 0 deleted**.
`firestore.rules`, `firebase.json` and every Rules/index candidate are **untouched**. `app/quranrevival.html`, `app/hadith-study.html` and `app/index.html` are **byte-identical to `origin/main`** (verified by `git diff --quiet`, not by reading). The three modified files are `CLAUDE.md` (additive block at top, milestone line untouched), `app/js/i18n/bn.js` (**47 insertions, 0 deletions**) and `app/js/version.js`.

---

## 2. `8051c85` versus `c7ee03e` — resolved, not chosen

The handover required that this be explained rather than silently resolved. It is a parent/child pair two minutes apart, and **the distinction has no consequence for the tested application**:

- `git diff --stat c7ee03e 8051c85 -- app/ tools/ firestore.rules` → **empty output**
- `git diff --name-status c7ee03e 8051c85` → exactly two lines, both `A` (added): the H2-A report's `.html` and `.md`

| Commit | Time (UTC) | Contents |
|---|---|---|
| `c7ee03e` | 05:08:08 | **The application.** 10 files, 1,742 insertions — the five new `app/` files, two new suites, `version.js`, `bn.js`, `CLAUDE.md` |
| `8051c85` | 05:10:06 | **The report only.** 2 files, 438 insertions — the H2-A `.md` and `.html`. **No application code** |

**Conclusion.** `c7ee03e` is the last app-code commit and the tested tree; `8051c85` is that same tree plus its report. **Both trees contain identical application code**, so the delivery message (`8051c85`) and the report (`c7ee03e`) do not conflict — the report was written at the code commit and committed as the next one. **No amendment to the tested-commit record is required**; the accurate statement, now recorded here, is:

> **Tested application code: `c7ee03e`. Audit the branch at `8051c85`, which is that code plus its report.**

---

## 3. Deployed Rules — terminology corrected, status **UNVERIFIED**

The H2-A report §1.4 is headed *"checked in the repository rather than inferred"*, which is right, but its table then labels two rows **"deployed rules"** while reading the repository file `firestore.rules`. **Those are separate facts and the wording conflated them.** Corrected here:

| Reading | What it is | Status |
|---|---|---|
| `firestore.rules` **in this repository** at `8051c85` | Repository Rules **content** | **Verified.** 0 occurrences of `notes`/`noteRevisions`/`noteSources`/`noteFolders`/`notePlacements`; 0 occurrences of any `hadith` collection; no `indexes` key in `firebase.json`; no `firestore.indexes.json` |
| Rules **actually deployed** to `study-monitoring` | Production **deployment** | **UNVERIFIED — not inspected** |

**Independent inspection was attempted and failed, with evidence rather than assertion:**

| Probe | Result |
|---|---|
| `command -v firebase` | **not installed** |
| `command -v gcloud` | **not installed** |
| `env` scanned for Google/Firebase/gcloud credential variables | **none set**; no `~/.config/firebase`, no `~/.config/gcloud` |
| `curl https://firebaserules.googleapis.com/v1/projects/study-monitoring/releases` | **HTTP 403 — PERMISSION_DENIED**, *"Method doesn't allow unregistered callers (callers without established identity)."* |

So this session **cannot** read the deployed ruleset. Every statement about production Rules in the H2-A report should be read as a statement about the repository file.

**This does not weaken the persistence gate — it strengthens the reason for it.** Because deployment status is unverified, no Hadith, Note or MMJ write may be attempted, which is exactly what this tranche does: **zero writes, in-memory Track only**. The standing brief's own parity note (production and repository Rules content-identical, verified 2026-09-10, repository copy has one extra terminal newline) is a governance record dated eight days earlier, **not** an inspection performed now, and is not treated here as evidence of current deployment.

**No Hadith/Note/MMJ write was made in this session.**

---

## 4. Checks re-run at the exact branch HEAD (`8051c85`)

All suites run from the **repository root** of the `feature/hadith-study` worktree.

### 4.1 Hadith suites — H1 and H2-A

| Suite | Result | Exit |
|---|---|---|
| `hadith-source-rights.mjs` | **14 passed, 0 failed** | 0 |
| `hadith-corpus.mjs` | **26 passed, 0 failed** | 0 |
| `hadith-commentary-binding.mjs` | **14 passed, 0 failed** | 0 |

**54 passed, 0 failed** — reproducing the H2-A report's §7.2 figures exactly.

### 4.2 Pure regression — 24 suites, all green

`quran-boundary` 30/0 · `study-approach-contract` 13/0 · `study-approach-contract-boundary` 16/0 · `study-activity-evidence` 11/0 · `study-activity-evidence-id` 29/0 · `study-activity-evidence-store` 26/0 · `study-activity-evidence-boundary` 17/0 · `note-foundation-boundary` 30/0 · `note-journal-evidence` 18/0 · `study-note-boundary` 17/0 · `journey-map-boundary` 13/0 · `firestore-index-requirements` 8/0 · `rules-authorisation-executable` 38/0 · `rules-deployment-candidate` 10/0 · `quran-word-identity-contract` 6/0 · `quran-word-progress-model` 57/0 · `quran-word-progress-data` 37/0 · `stub-parity` 3/0 — plus `note-foundation-data-layer`, `note-foundation-transaction`, `study-note-binding`, `study-note-service`, `journey-map-contract`, `journey-map-service` (own summary format), **every one exit 0**.

### 4.3 `behaviour.mjs` — the full browser regression

**Both sides were run in this same container, rather than comparing against a number quoted from the brief** — which is the only way this comparison means anything.

| Tree | Result | Sections |
|---|---|---|
| `feature/hadith-study` @ `8051c85` | **975 passed, 4 failed** | 56 |
| `origin/main` @ `1cac2b8` | **975 passed, 4 failed** | 56 |

**Identical on both sides — the branch causes zero behaviour regression**, and the four failures are the same four, in the same places, on `main` too:

| Failure | Class |
|---|---|
| `22g` the screensaver caption is Bangla | **Environmental** — this sandbox cannot reach `archive.org` |
| `22g` its alt text is translated too | **Environmental** — same |
| `22g` the poster URL is untouched | **Environmental** — same |
| `31e` no page errors — `net::ERR_CERT_AUTHORITY_INVALID` | **Environmental** — the sandbox's TLS interception |

All four are the documented baseline classes, and none is a defect that will occur for the Owner.

**One figure in the standing brief is now stale, and it is a `main`-side number, not a branch one.** The brief records the post-excavation baseline as **973 pass / 4 fail / 56 sections**; measured here, `main` itself is **975 / 4 / 56**. `main` has moved since that measurement was taken on 17 Sep. **Not patched** — `CLAUDE.md` is a shared file owned by the Quran/`main` side, and this is exactly the kind of number that should be re-measured by its owner rather than edited from a feature branch. Recorded for that owner.

### 4.4 The `brief-integrity` failure — recorded honestly, **and one half of it does not reproduce**

The H2-A report §7.4 states **6 passed, 2 failed**. At this HEAD it is **7 passed, 1 failed**.

| Reported failure | Reproduces? |
|---|---|
| The **version drift** — brief says `v08.25 on main`, local `version.js` says `08.27` | **YES. Real, and correctly characterised.** The brief's line is true *of `main`* and must not be "fixed" to 08.27 |
| **`origin/claude/pensive-knuth-2pu3jj` unresolvable**, attributed to *"a narrow fetch refspec"* | **NO — and the diagnosis was wrong** |

**Correction.** The clone's refspec is the standard wildcard, and the branch resolves:

- `git config --get-all remote.origin.fetch` → `+refs/heads/*:refs/remotes/origin/*` — **the standard wildcard, not a narrow refspec**
- `git rev-parse origin/claude/pensive-knuth-2pu3jj` → `b0221ce4a4d1291e5392f50ffb11949be07a1b39` — **resolves**

The refs simply **had not been fetched yet** in that session's container; a plain `git fetch origin` brings all 59 remote branches down. **There is nothing for a shared-file owner to fix here** — the item should be struck from the ledger rather than handed on. It was an unfetched clone, not a misconfigured one.

**Confirming the remaining failure is branch-scoped, not rot on `main`:** the same guard run in the `main` worktree is **8 passed, 0 failed, exit 0**. So `brief-integrity` is healthy on `main` and fails on this branch **only** because the branch carries a version bump that `main`'s milestone line correctly does not claim.

**Handed to the shared-file owner, not patched here.** `brief-integrity.mjs` and `CLAUDE.md`'s milestone line belong to the Quran/`main` side. H2-A's proposed one-line fix — compare against `git show origin/main:app/js/version.js` when `HEAD` is not `main` — is **sound and still not applied**, which was the right call. **No shared code was patched in this session.**

### 4.5 Environment note — the browser suites needed repair before they could run at all

Worth recording because it will recur in every fresh container: `playwright` is **not installed**, and there is no `package.json` at the repository root, so **every browser-driven suite** (`behaviour`, `layout`, `reading`, `panel`, `navcheck`, `tagline-cost`, all `*-rendered`) dies at import with `ERR_MODULE_NOT_FOUND` — on `main` identically, so it is **environmental, not branch-caused** (`tagline-cost.mjs` was confirmed failing the same way on `main`).

Two things had to be true to run them: the package installed **outside the repository** (`/home/user/node_modules`, a symlink into the session scratchpad — the worktree stayed `git status` clean throughout), and the version matched to the pre-installed browser. `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` carries **chromium 1194**; the current release (1.63.0) expects revision 1243 and fails to launch. Probing the releases gives the match:

| playwright | chromium revision |
|---|---|
| 1.55.0 | 1187 |
| **1.56.0** | **1194 ← matches the pre-installed browser** |
| 1.57.0 | 1200 |

`playwright@1.56.0` launches. The suites also require the local server (`node serve.js`, port 8080) to be running, or they fail with `ERR_CONNECTION_REFUSED` and no checks at all.

---

## 5. One new finding in H2-A's own code — the id-prefix invariant is not true, and cannot fail a check

`app/js/hadith-fixture-data.js` states its own safety invariant:

> *"2. **EVERY ID IS PREFIXED `synthetic-`.** A fixture id cannot collide with a real collection or edition id, so a fixture can never be mistaken for an approved edition by any lookup, and a real import can never silently overwrite one."*

**The data does not satisfy it.** Three id families depart from the stated rule:

| Id family | Actual prefix | Matches stated invariant? |
|---|---|---|
| Collections, editions, books, chapters | `synthetic-` | Yes |
| Occurrences | `syn-occ-` | **No** |
| Topic mappings | `syn-map-` | **No** |
| **Topic** — `topic-salah` | *(none)* | **No — no synthetic marker at all** |

**And the guard codifies the data rather than the invariant**, so the gap cannot fail a check. `hadith-corpus.mjs:70-73` asserts `occurrenceId.startsWith("syn-")` and `editionId.startsWith("synthetic-")` — the shapes as built — while **`topicId` is never prefix-asserted anywhere** (`grep -n "topicId" tools/i18n-verify/hadith-corpus.mjs` returns nothing). This is the standing-lesson shape: *a locked distinction that cannot fail a check is not locked*.

**Severity is not uniform, and only one part matters.** `syn-occ-` and `syn-map-` are visibly non-real and will not collide with anything; the discrepancy there is **wording**, and the honest fix is to correct the comment to state the two prefixes actually used. **`topic-salah` is the real one:** it carries no synthetic marker, and a future reviewed Ṣalāh topic would very plausibly be minted under exactly that id — at which point three `reviewStatus: "unreviewed"` synthetic mappings would share a topic id with reviewed real ones. That is precisely the collision the invariant exists to prevent, and the one place the file's own defence-in-depth argument (*"a `synthetic: true` flag a renderer might forget to show would not survive that journey"*) does not hold, because the flag is all there is.

**Not fixed, deliberately.** H2-A is under audit; changing its code now would move the tree the Master Architect is auditing. Recorded for the audit to direct. The suggested resolution, for whenever it is authorised, is small and fixture-only: rename `topic-salah` → `synthetic-topic-salah`, correct the comment to name the real prefixes, and add the missing `topicId`/`topicMappingId` prefix assertions so the rule is enforced rather than described.

---

## 6. Corrections this report makes to the H2-A report

| # | H2-A said | Corrected to |
|---|---|---|
| 1 | §1.4 table rows headed **"deployed rules"** | **Repository Rules content.** Deployed Rules are **UNVERIFIED** — 403, no identity available (§3) |
| 2 | §7.4 — `pensive-knuth-2pu3jj` unresolvable because of a **"narrow fetch refspec"** | **Does not reproduce.** Standard wildcard refspec; the refs were merely unfetched. `brief-integrity` is **7/1**, not 6/2. Strike the item (§4.4) |
| 3 | §11 — `APPROACH_TEMPLATES` hardcoded to Quran, cited `catalogue.js:211` | Substantively **correct**; the citation points at the *comment* stating it. The **definition** is `catalogue-data.js:222`. Precision only |

**Verified as accurate, not merely accepted:** the unit-key proposal's two mechanical claims were tested rather than read. Against the accepted regex `/^hadith:[A-Za-z0-9_-]+:\d{1,6}$/` in `study-note-binding.js:58`, `hadith:bk1422h:999999` matches and `hadith:bk1422h:1000000` is rejected — **the 6-digit bound is exactly as stated** — and `parseUnitKey("hadith:bk1422h:00001")` returns `{unitType:"hadith", parts:["bk1422h","00001"]}` while the legacy `hadith:bukhari:1` still matches and still parses. **Parser compatibility and numeric bound confirmed.**

---

## 7. Gates — reported against each

| Gate | Status this session |
|---|---|
| Synthetic text marked **not Hadith** in ar/en/bn | **HELD.** `SYNTHETIC_NOTICE` carries all three; the Arabic source text denies being a hadith in its own first clause |
| Fixture ids never mixed with real edition ids | **HELD in substance, with one defect recorded** — §5. No real edition id exists anywhere in the tree |
| Source rights default `blocked`; link-only; no copied text | **HELD.** `hadith-source-rights.mjs` 14/0. No corpus or commentary text fetched, cached or embedded; no request made to any source site this session |
| Durable Hadith unit-key semantics unchanged | **HELD.** Proposal only. No key applied, no record written. Live read-only inventory still not obtainable |
| Note/MMJ and live Track persistence closed | **HELD.** No write attempted. Deployed-Rules status now explicitly **unverified**, which tightens rather than relaxes this gate |
| Version bump on app-code change | **N/A — this tranche is documentation-only.** `08.27` retained, nothing under `app/` touched |
| No merge, deploy, migration or Rules deployment | **HELD.** None performed or prepared |

---

## 8. H2-B — inspected, scoped, **not started**

Non-mutating inspection only, as the handover permits. **No file was created or modified for H2-B.** The three items H2-A deferred, with what inspection now adds:

1. **The QuranRevival mount into `app/hadith-study.html`.** Confirmed by reading: the page is 149 lines and its whole body is `initTopicStudyPage({ moduleId: "hadith", trackableId: "studied_hadith", rootSubjectId: "hadith" })` — the **shared** topic renderer, used by **8 pages** (`arabic-study`, `bookmarks`, `deen-study`, `general-study`, `hadith-study`, `life-skill`, `naturelife-study`, `quranrevival`). So the H0 cost stands and is now measured: a corpus view needs its own renderer behind the same module id, and the edit is a real layout change on a shared surface requiring before-and-after measurement at every viewport in both languages.
2. **Hadith Approach ids.** Confirmed: Track today carries `trackableId: "studied_hadith"` — the generic module "Studied" row, **not** an Approach. No Quran Approach number is assigned to Hadith. The registry audit and the recorded decision remain required first, and assigning one is a catalogue decision, not an implementation detail.
3. **Explore aggregation.** The topic index already provides the counting model; the surface is unbuilt.

**Blocked on the audit.** No H2-B code will be written until the Master Architect audits H2-A and issues the next instruction.

---

## 9. What the Master Architect is asked to decide

1. **Accept the tested-commit record** in §2 — tested code `c7ee03e`, audit the branch at `8051c85` — or direct an amendment.
2. **Accept the deployed-Rules correction** in §3, and note that production deployment status is **unverified and not obtainable in this environment**.
3. **Direct the `topic-salah` finding** in §5 — fix inside H2-A, fold into H2-B, or record and defer.
4. **Settle the shared-owner ledger** (§4.4, §4.3). **Strike** the "narrow fetch refspec" item — it was a wrong diagnosis. **Keep** the version-drift item with the Quran/`main` side, unpatched. **Add** one new item for that side: the brief's `behaviour.mjs` baseline reads 973/4 and `main` now measures **975/4**.
5. **Issue the H2-B instruction**, or hold it.

---

## 10. Reproduction

**Set up:** `git fetch origin --prune`, then `git worktree add /home/user/hadith-study feature/hadith-study`, then `cd /home/user/hadith-study && git rev-parse HEAD` (expect `8051c85…`).

**Pure suites** — run from the repository root, because they resolve paths from `process.cwd()`:
`node tools/i18n-verify/hadith-source-rights.mjs` · `node tools/i18n-verify/hadith-corpus.mjs` · `node tools/i18n-verify/hadith-commentary-binding.mjs` · `node tools/i18n-verify/brief-integrity.mjs` (**7/1, exit 1 — expected on this branch**).

**Browser suites** need two things first, or they produce no checks at all: `npm install playwright@1.56.0` **outside the repository** (1.56 is the release matching the pre-installed chromium 1194), and `node serve.js` running on port 8080. Then `node tools/i18n-verify/behaviour.mjs`.
