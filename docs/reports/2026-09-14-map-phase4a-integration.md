# MAP Phase 4, Task P4-A — INTEGRATION into `main`

**Date:** 14 September 2026
**Authority:** Master Architect decision of 2026-09-14 — *"P4-A IS ACCEPTED.
Integrate the reported MAP Phase 4 Task P4-A tranche from
`claude/dreamy-tesla-0clj36` into current `main`, preserving the reported change
budget and version 08.24."*
**Result:** **`main` = `7728c0230848a1ab38b2192fdb45849bebf370a2`**, app version
**08.24**.
**Status:** integration complete and verified. **P4-A CLOSED. AWAITING MASTER
ARCHITECT P4-B ARCHITECTURE INSTRUCTION.**

**P4-B was NOT begun.** No Firestore Rules or index was modified or deployed. No
migration, backfill or production write was performed. Nothing was taken from
`claude/pensive-knuth-2pu3jj`.

---

## 1. Identifiers

| Item | SHA / value |
|---|---|
| Pre-merge `main` | `10961f3462aac73e63f678155483b5dbd9c5146c` (v08.23) |
| Accepted tranche `claude/dreamy-tesla-0clj36` | `266e2cf059b470aab00c9486043f37fe0b216e6d` |
| **Merge commit — new `main`** | **`7728c0230848a1ab38b2192fdb45849bebf370a2`** |
| Remote `main` after push, read back | `7728c0230848a1ab38b2192fdb45849bebf370a2` |
| App version | **08.24** (was 08.23) |
| Rollback point | `10961f3462aac73e63f678155483b5dbd9c5146c` |

`main` had **not moved** since the tranche branched — 0 commits on `main` absent
from the branch — so nothing was rebased, squashed or reconciled.

## 2. Merge method

From a clean tree, `main` reset to `origin/main`, then:

```
git merge --no-ff origin/claude/dreamy-tesla-0clj36
```

`--no-ff` matches the accepted 13 September Phase 2–3 precedent: `main` was an
ancestor and the merge was fast-forwardable, so a real merge commit was forced
to record both parents and make the integration **revertible as one unit**. The
merge commit body states in its own words what the merge does *not* authorise.

**Blast radius:** 11 files, +1,177 / −18 lines.

## 3. Pre-merge scope verification — the merge contains only accepted P4-A scope

Checked **before** merging, against the change budget declared in the P4-A
delivery report.

### Every file the merge touches

| Status | File |
|---|---|
| A | `docs/governance/adr/ADR-008-study-approach-event-contract-v1.md` |
| A | `app/js/study-approach-contract.js` |
| A | `app/js/study-activity-evidence.js` |
| A | `tools/i18n-verify/study-approach-contract.mjs` |
| A | `tools/i18n-verify/study-activity-evidence.mjs` |
| A | `tools/i18n-verify/study-approach-contract-boundary.mjs` |
| A | `docs/reports/2026-09-14-map-phase4a-study-approach-contract.md` |
| A | `docs/reports/2026-09-14-map-phase4a-study-approach-contract.html` |
| M | `app/js/version.js` (`08.23` → `08.24`) |
| M | `CHANGELOG.md` |
| M | `CLAUDE.md` |

**Eleven files — exactly the eight created and three modified that the delivery
report declared. Nothing else, in either direction.**

### Gated material proven ABSENT from the tranche

| Result | File |
|---|---|
| absent | `app/js/study-activity-week.js` (keyed writer) |
| absent | `tests/firestore/activity-v1.proposed.rules` |
| absent | `tests/firestore/activity-v1.security-matrix.json` |
| absent | `docs/governance/activity-rules-proposal-2026-09-12.md` |
| absent | `tools/firestore-emulator/activity-v1.rules.test.mjs` |
| absent | `tools/firestore-emulator/activity-v1.firebase.json` |
| absent | any tracked `firestore.indexes.json` |

### Protected files proven byte-identical to pre-merge `main`

`firestore.rules` · `app/js/activity.js` · `app/js/records.js` ·
`app/quranrevival.html` · `app/js/quran-word-card.js` ·
`tests/firestore/word-progress-v1.proposed.rules` — **all six IDENTICAL.**

### The isolated branch is not in this history

`git merge-base --is-ancestor origin/claude/pensive-knuth-2pu3jj HEAD` →
**not an ancestor.** No commit from that branch is reachable from the new
`main`, so no keyed-Activity, `v1Events`, Rules-candidate or Phase 5 material
entered by any path, including transitively.

## 4. Post-merge verification

### 4.1 `main` contains the accepted files and version 08.24

All eight new files **PRESENT** on the merged tree. `app/js/version.js` reads
**`08.24`**. The ADR register now runs **ADR-001 … ADR-008** — the gap that
made the accepted contract sit outside the accepted baseline is closed.

Re-read from the **remote** after the push: `origin/main` =
`7728c0230848a1ab38b2192fdb45849bebf370a2`, its `version.js` = **08.24**,
ADR-008 **present**, `study-activity-week.js` **absent**.

### 4.2 The Study→Approach modules remain uninvoked and unwired

Proven three independent ways on the merged tree:

1. **`study-approach-contract-boundary.mjs` — 16 passed, 0 failed**, including
   its scan of every `.js` and `.html` under `app/` for an importer.
2. **An independent `grep -rl`** for either module name across all of `app/`
   returns **only the two modules themselves** — no other file mentions them.
3. **A direct import scan** (`from "…study-approach-contract|…-evidence"`)
   across `app/` returns **no importer anywhere**, other than the evidence
   module's own import of the contract.

`app/js/activity.js` on merged `main` is **byte-identical** to pre-merge `main`
— still the original `arrayUnion` append path, no `v1Events`, no contract
import.

### 4.3 P4-A boundary tests and regression checks, run on merged `main`

| Suite | Result |
|---|---|
| `study-approach-contract.mjs` | **13 passed, 0 failed** |
| `study-activity-evidence.mjs` | **11 passed, 0 failed** |
| `study-approach-contract-boundary.mjs` | **16 passed, 0 failed** |

| Regression suite | Result | Recorded baseline |
|---|---|---|
| `quran-word-card-rendered.mjs` | **122 passed, 0 failed** | 122 |
| `quran-word-card.mjs` | 36 passed, 0 failed | 36 |
| `quran-word-card-integration.mjs` | 10 passed, 0 failed | 10 |
| `quran-word-progress-model.mjs` | 57 passed, 0 failed | 57 |
| `quran-word-progress-data.mjs` | 37 passed, 0 failed | 37 |
| `quran-word-coverage.mjs` | 10 passed, 0 failed | 10 |
| `quran-word-coverage-arabic.mjs` | 29 passed, 0 failed | 29 |
| `quran-word-identity-contract.mjs` | 6 passed, 0 failed | 6 |
| `quran-word-indexes.mjs` | 9 passed, 0 failed | 9 |
| `quran-word-index-loader.mjs` | 8 passed, 0 failed | 8 |
| `quran-boundary.mjs` | 30 passed, 0 failed | 30 |
| `stub-parity.mjs` | 3 passed, 0 failed | 3 |
| `reading.mjs` | **`READING SCREEN OK`** in `en` and `bn` | OK |
| `navcheck.mjs` | **Unchanged** — only the pre-existing 320 px English truncation of "Operation"/"Bookmark" (73 > 65 px) | same |
| Translation coverage | **1,803 scanned / 47 missing — both unchanged** | 1,803 / 47 |

**`layout.mjs` was not re-run on the merged tree, and deliberately so.**
`app/quranrevival.html` on merged `main` is **byte-for-byte identical** to
pre-merge `main` (`diff` empty), so the landing page cannot have moved; the
full 16-configuration before/after comparison was already run on the tranche
itself against a real v08.23 shim, and returned every metric identical with
`getElementById` 250 → 250. Re-running it here would compare the page against
itself.

**`behaviour.mjs` was not re-run on the merged tree** for the same reason — the
page and every module it exercises are byte-identical to the tranche, where it
scored **800 passed / 3 failed**, stopping at the documented section-42
`[data-note-master-toggle]` crash carried since v07.69.

> **A correction to the P4-A delivery report.** That report described this run
> as "identical to the v08.23 run". The 803 total and the stopping point are
> identical, but the v08.23 session's final corrected figure was **803 passed /
> 0 failed**, not 800 / 3. The three differing checks are section 22g, where
> this sandbox's egress proxy blocks `archive.org`; that block was evidently not
> in force during the v08.23 run. **This is environmental variance in the test
> sandbox, not a code difference** — the modules under test are byte-identical
> — but the earlier wording overstated the match and is corrected here.

## 5. Rules, index, migration and deployment status — unchanged

| | Status |
|---|---|
| `firestore.rules` | **UNCHANGED**, byte-for-byte identical to pre-merge `main` |
| Firestore indexes | **none changed, none deployed**; no tracked index file exists |
| Migration / backfill | **none** |
| Production data writes | **none** |
| `tests/firestore/word-progress-v1.proposed.rules` | still **CANDIDATE ONLY, NOT DEPLOYED** — unchanged Owner Control Gate |
| `quranWordProgress` / `quranWordApprovals` | still have **no server-side rule**; word progress remains exercisable only by the Owner's own account |
| Keyed Activity writer / `v1Events` / Activity Rules candidate | **NOT integrated, NOT cherry-picked, NOT reconstructed, NOT activated, NOT deployed** |

## 6. GitHub Pages

The push updated the default branch, so GitHub Pages rebuilds automatically.
At the time of writing, the `pages build and deployment` run for
`7728c0230848a1ab38b2192fdb45849bebf370a2` (run #292) was **in progress** —
see §7 for its final state.

**This sandbox cannot reach `madrasatul-muslimeen.github.io`**: the egress proxy
refuses the connection (`connect_rejected`, organization policy), so all four
attempts to fetch the live `version.js` returned status `000`. **The live badge
therefore could not be read from here, and is not claimed as verified by direct
fetch.** What *is* verified is the deployment's input and its pipeline: remote
`main` really carries v08.24, and Pages really started a build for that exact
SHA.

## 7. Pages build outcome — SUCCESS

Read from the GitHub Actions API after completion:

| Field | Value |
|---|---|
| Workflow | `pages build and deployment`, run **#292** |
| Head SHA | **`7728c0230848a1ab38b2192fdb45849bebf370a2`** — the merge commit |
| Status | **completed** |
| Conclusion | **success** |
| Started / finished | 2026-09-14 05:54:40Z → 05:55:30Z |
| Run | `https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/actions/runs/34811340834` |

**So: GitHub Pages has built and deployed the merge commit successfully, and the
content it deployed is `main` at v08.24 — verified by reading `version.js` back
from `origin/main`.**

**The one thing still not directly verified:** this sandbox cannot fetch the live
URL (§6), so the rendered badge was not read from the deployed site. The chain —
remote `main` at v08.24 → Pages build for that exact SHA → conclusion `success`
— is complete and each link is evidenced, but the final "I loaded the page and
saw v08.24" step is the Owner's (§8, step 1). A hard refresh may be needed once,
since browsers cache `version.js`.

## 8. What the Owner should check — ninety seconds

1. Open the app. The badge beside the name should read **v08.24**.
   If it still reads v08.23, hard-refresh once (the browser caches `version.js`).
2. Study → Read, word-by-word on, tap any Arabic word, open **Basic Arabic**.
   Each derived-form row should read as one group — `Noun  سَلَٰم  42
   occurrences` — with **no long empty gap in the middle of the row**, and
   `Proper Noun +1` on **one line**.
3. Open **Arabic in Depth**, expand a form; the occurrence rows beneath should be
   grouped the same way.
4. Return to the landing page: Approach rows, Mastery Wheel and dock exactly as
   before.
5. Switch to Bangla and glance at the same two screens.

**Expected result: nothing visibly different anywhere except the badge reading
v08.24.** Anything else is a finding — report it and it will be treated as one.

## 9. Position

**P4-A CLOSED.**

**P4-B is NOT begun and will not be begun** until the Master Architect issues the
architecture resolution covering Activity evidence persistence, event identity,
server-verifiable uniqueness, Rules enforcement, existing `entries[]`
compatibility and rollback.

**STATUS: AWAITING MASTER ARCHITECT P4-B ARCHITECTURE INSTRUCTION.**
