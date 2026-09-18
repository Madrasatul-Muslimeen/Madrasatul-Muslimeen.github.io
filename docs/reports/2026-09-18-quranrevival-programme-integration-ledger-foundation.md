# Programme Integration Ledger — foundation

- **Date:** 2026-09-18
- **Instruction:** Programme Coordination Foundation. Repository-level programme coordination safeguards only. **Not another Quran application tranche.**
- **Blast radius:** **BR-0.** `git diff origin/main -- app/ tests/ firestore.rules firebase.json` is **empty**. Nothing under `app/` imports either new file.
- **Application version:** **08.27 before, 08.27 after — unchanged.**
- **Result:** Delivered. One ledger, two guard files, six guards, **25 mutations all caught**, and **one real defect in `CLAUDE.md` found and corrected by the guards' own first run**.

---

## 0. State was re-read, and it had moved — twice

The instruction says: *"Do not hard-code a false main SHA if main moves during this work. Re-read actual state first."* It had moved, in both places the instruction quoted.

| Fact | Value the instruction implied | **Measured, 18 Sep 2026** |
|---|---|---|
| `origin/main` | `7111e3c975d3cf3fd0bf0c0d7814691edcd5299e` | **`5ea0d928b8f326e0164c988ef79e4d1d1c168eeb`** |
| `main` version | 08.27 | **08.27 — confirmed unchanged** |
| Hadith branch tip | `cd344f4` (Stage B) | **`808539c83d418d77afed96600fb3ab50249f8b0d`** |
| Hadith Stage A `7f61328` version | v08.28 | **08.28 — confirmed, read from `git show 7f61328:app/js/version.js`** |
| Hadith Stage B `cd344f4` version | v08.29 | **08.29 — confirmed** |
| Phase 4 wiring `7e2931f` | HELD, historical 08.26 stamp | **`7e2931f795af1cd97efc1167660cea93aa22b9ab`, stamped 08.26 — confirmed** |

**The `main` move is my own** — the Quran Stream reconciliation report from the previous tranche, two documentation files, 392 insertions, nothing outside `docs/reports/`.

**The Hadith branch advanced by two commits, both documentation**, and the second is worth reading: `808539c`, *"Hadith integration: HALTED at the baseline gate — BASELINE MOVED"*. That stream ran the same baseline check this instruction mandates, found `main` had moved past its authorisation, and **stopped rather than proceeding**. Guard F exists to make that behaviour mechanical rather than dependent on a session remembering to check.

**One figure of mine was wrong and the Hadith stream corrected it.** My reconciliation recorded `behaviour.mjs` as +32/−6 on their branch. Measured here three ways, it is **+27/−5**. Their figure is right; the ledger carries the corrected one.

---

## 1. The problem this exists to retire

Three coordination facts were got wrong by careful sessions within one day, and **not one of them was caught by a guard**:

1. **v08.26 was reported as being on `main`** while it was only on a branch. Caught by the Owner reading.
2. **Two independent builds simultaneously carried 08.27** — `main` (the number pickers) and `feature/hadith-study`. That is precisely the thing a version number exists to prevent. Caught by the Hadith stream reading every branch before stamping, and resolved by them to 08.28 / 08.29.
3. **`CLAUDE.md` forward-allocated 08.28 to the held Phase 4 wiring** — a held branch predicting its own merge number, in a number another stream had already taken — **and it was written bare, without the `v`**, so every v-prefixed scanner in this repository was blind to it. `grep -c 'v08\.28' CLAUDE.md` returned **0** while the number sat in the paragraph. Caught by nobody until guards C and D, independently, on their first run.

Every safeguard was prose that a session had to read and remember. It failed in both directions on the same day.

---

## 2. What was built

| File | Lines | Role |
|---|---|---|
| `docs/governance/programme-integration-ledger.json` | 433 | The machine-readable record. **Data, not authority.** |
| `tools/i18n-verify/programme-ledger.mjs` | 409 | Six guards, as a pure function of (ledger, measured repository). |
| `tools/i18n-verify/programme-ledger-mutations.mjs` | 205 | 25 mutations + 2 positive controls proving each guard can fail. |

Plus a governance registration and ownership table in `docs/governance/README.md`, and the round entry, three standing lessons and the line-70 correction in `CLAUDE.md`.

**The guards are a pure function** — `runGuards(ledger, facts)` — precisely so the mutation suite can hand them a corrupted ledger and a stubbed repository. A guard bolted to `execFileSync` cannot be mutation-tested, and this project's own lesson is that a guard which cannot fail is worse than no guard, because it is believed.

### 2.1 What the ledger encodes

| Field family | Content |
|---|---|
| `main` | `baselineSha` `5ea0d92…`, `version` `08.27`, `ref` `origin/main` |
| `versionAllocations` | 08.26 RELEASED (quran) · 08.26 **HISTORICAL** (quran-phase4-wiring, `forwardAllocation:false`) · 08.27 **LIVE** (quran) · 08.28 **RESERVED** (hadith, Stage A) · 08.29 **RESERVED** (hadith, Stage B) |
| `nextUnallocated` | **08.30 — NOT ALLOCATED.** Allocation is the Master Architect's |
| `streams` | `quran` (merged), `quran-phase4-wiring` (**HELD**), `hadith` (**HALTED_AWAITING_REAUTHORISATION**), each with owned path families, branch tip, baseline SHA and baseline status |
| `platformSharedPaths` | 14 entries, each with an owner — `version.js` = **master-architect**, the rest platform |
| `moduleContentSurfaces` | `app/hadith-study.html` = hadith-owned, **with the navigation and shell contract explicitly platform-owned** |
| `deploymentSecuritySharedPaths` | `firestore.rules`, `firebase.json`, the Rules and index candidates, `tests/firestore/*`, `tools/firestore-emulator/*` |
| `sharedChangeRequests` | **SCR-01**, `ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED` |
| `designRecords` | **DR-01**, design record only |
| `closedIntegrationGates` | G-NAV-320 (v08.26), G-GETELEMENTBYID-22 (investigation), G-NUMBER-PICKERS (v08.27) |
| `openOwnerDecisions` | O3, O3b, E1, D14-WIRING |
| `d14` | `ON_MAIN_UNREACHABLE`, version 08.27 unchanged, both modules named |

**The held wiring's 08.26 is recorded as `HISTORICAL` with `forwardAllocation: false`** and a note saying in words that it is not a claim on any future merge number — exactly as the instruction requires.

**`main.baselineSha` is checked as an ANCESTOR of `origin/main`, never as equal.** `main` moves forward constantly and that is not drift; a baseline that is *not* an ancestor means history was rewritten, and that is a hard failure. This is what stops the ledger going stale the instant its own commit lands.

### 2.2 The six guards

| | Guard | Fails when |
|---|---|---|
| **A** | Version collision | Two streams hold a CLAIMING allocation (LIVE/RESERVED/RELEASED) on one version — **or** a branch's real stamp disagrees with what the ledger says that stream declares |
| **B** | Unreserved version | A branch is stamped a version the ledger reserves for nobody under that stream, or at/beyond `nextUnallocated` |
| **C** | Held stamp read as allocation | A historical stamp fails to declare `forwardAllocation:false`, carries a claiming status, or does not match what the held branch really carries — **or the brief names a version ahead of `main` in the same paragraph as a held commit** |
| **D** | Non-canonical version reference | A ledger data field is not canonical `NN.NN` — **or a ledger-declared version appears in the brief only in bare form**, invisible to every v-prefixed scanner |
| **E** | Undeclared shared-file change | A declared stream modifies a platform/shared or deployment/security path with no declaration and no authorisation |
| **F** | Stale integration baseline | A stream's baseline is not an ancestor of `origin/main`, or has moved without `MOVED_ACKNOWLEDGED` and a real acknowledgement file, or the ledger's record of `main`'s version disagrees with `version.js` |

**Guard E's three-way outcome is deliberate.** A shared-file touch is `AUTHORISED`, `DECLARED` (disclosed, awaiting decision — reported every run, does not fail) or `UNDECLARED` (**fails**). The guard's job is that nothing reaches a shared file undisclosed; it is not to approve what is disclosed, which is the Master Architect's. A guard that failed on every existing disclosed touch would be permanently red and therefore ignored — which is the failure mode this whole tranche exists to prevent.

---

## 3. The first run — four findings, and three of them were the guard's fault

**A guard's first run is where its own false-positive rate is measured.** This project's own standing lesson, and it earned its keep again.

| # | Finding | Verdict |
|---|---|---|
| 1 | Guard C flagged **three** correct sentences in the held-wiring paragraph (08.25, 08.26, 08.27) | **GUARD DEFECT.** A held branch's paragraph properly recounts history. Narrowed to numbers **ahead of `main`'s current version** — a forward number is the defect, a backward one is narration |
| 2 | Guard C flagged `08.28` in the same paragraph | **REAL. The defect this tranche existed to find** |
| 3 | Guard D flagged `08.28` named only in bare form | **REAL — the same defect, from the other direction, by an independent guard** |
| 4 | Guard F reported the Hadith acknowledgement file as missing | **GUARD DEFECT.** It looked on `main` for a file that legitimately lives on the stream's own branch. `fileExists` now tries the branch first |
| 5 | Guard E reported seven undeclared shared touches on `claude/phase4-wiring` | **REAL, and closed by declaring them.** The branch's owned paths and its seven shared touches were read off the branch and recorded. **`7e2931f` was NOT re-cut, re-stamped or touched** — the inventory was taken by reading |

Findings 2 and 3 are one defect in `CLAUDE.md` line 70, caught by two guards that share no code path. The paragraph now says the 08.26 stamp is historical, that the merge number is whatever the Master Architect allocates at that time, and carries a dated note recording both halves of what was wrong.

**Declaring the held branch's shared touches is real information, not bookkeeping.** It is exactly what the merge will touch, visible before authorisation rather than after: `CHANGELOG.md` +91, `CLAUDE.md` +20, `bn.js` +5, `version.js` +1/−1 (**the line that conflicts at merge**), and three `tools/firestore-emulator/` files.

---

## 4. The mutation that went UNPROVEN, and the defect it found

One mutation — *"a forward version is caught even when it belongs to nobody yet"* — did **not** produce the expected failure. Chasing it rather than deleting it found a real defect in both new guards:

**The trailing guard `(?![\d.])` refuses a version that ends a sentence**, because the full stop matches the class. So `The branch is stamped 08.29.` was **invisible to the guard written to find invisible references**. It is `(?!\.?\d)` now — still rejecting `08.295` and `08.29.3`, and seeing a version at a full stop.

This is the **second** time the trailing-full-stop trap has appeared here; the first was `brief-integrity.mjs`'s own first run, where `v([\d.]+)` swallowed a full stop and produced `"08.25."`. It is now a standing lesson. A second mutation pins the fix.

**A related subtlety, also found by that mutation:** `/\bv?(\d{2}\.\d{2})/` cannot match `v08.44` at all — there is no word boundary between `v` and `0`, and `\b` before `0` fails. The two forms are matched with one lookbehind-based pattern rather than a clever optional `v`.

---

## 5. Test results

```
node tools/i18n-verify/programme-ledger.mjs
  ==== Programme integration ledger: 7 passed, 12 noted, 0 failed ====
       main 5ea0d928b8 at v08.27
  EXIT 0

node tools/i18n-verify/programme-ledger-mutations.mjs
  ==== Programme ledger guard mutations: 25 passed, 0 failed ====
  EXIT 0
```

The 12 NOTEs are the declared shared-file touches (11) and the acknowledged Hadith baseline move (1). They are printed every run on purpose: an open coordination item should be visible, not silent.

**Mutations, by guard:** A×2, B×2, C×4, D×4, E×3, F×5, CONTROL×2, plus two positive controls (the unmutated ledger has zero failures; the guards really ran and really read the repository). **The unmutated baseline check is what makes the other 25 mean anything** — without it a guard that failed on everything would pass every mutation.

**Regression:** `brief-integrity.mjs` 8/8 after this report exists (7/8 before it, correctly naming this file as a brief path that did not yet exist — the guard working as designed).

---

## 6. Recorded and deliberately NOT implemented

### SHARED CHANGE REQUEST 01 — `STATUS = ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`

| | |
|---|---|
| **File** | `tools/i18n-verify/behaviour.mjs` |
| **Current owner-use** | Platform/shared behaviour verification for every module and page |
| **Required change** | The file accumulates module-specific exclusions for elements that are intentionally multilingual or multiscript (source scripture, transliteration, narrator names). Each module adds its own, so the shared file grows a module-shaped list no module owns |
| **Reason** | The replacement is a **semantic declarative contract** — an element declares what it *is*, and the suite derives whether it should be translated. **Distinct from `data-i18n-skip`**, which declares only that a check should not look and carries no meaning a second consumer could reuse |
| **Expected blast radius** | BR-1 or above — markup across every module's pages, plus the shared suite |
| **Other modules affected** | quran, hadith, deen-study, arabic, general-study, nature-life, health, asma |
| **Decision** | **DEFERRED. Accepted architectural debt. NOT authorised for implementation.** Nothing in this tranche implements it |

### DR-01 — design record only

`behaviour.mjs` is one monolithic file at 56 sections and 982 checks, and every new module grows it. The longer-term candidate direction is **module-specific behaviour suites plus a thin aggregate runner** that composes them and reports one total, rather than unlimited growth of one file. **A direction, not a decision.** It is recorded so the next platform round does not rediscover the problem, and so no module round quietly splits the file on its own authority.

---

## 7. Governance ownership, as established

| File | Owner |
|---|---|
| `app/js/version.js` | **Master Architect — global authority.** No stream allocates a number for itself |
| `CLAUDE.md` | Platform — governance, shared |
| `CHANGELOG.md` | Platform — release history, shared |
| `app/js/i18n/bn.js` | Platform — shared translation catalogue |
| `tools/i18n-verify/behaviour.mjs` | Platform — shared verification infrastructure |
| `app/hadith-study.html` | Hadith — module content surface. **The common navigation and page shell inside it remain platform-owned** |

**The SHARED CHANGE RULE**, now mechanical via guard E: if a module's work requires modifying a declared shared or platform file and no shared-change authorisation exists, STOP that portion and raise a SHARED CHANGE REQUEST — file, current owner-use, required change, reason, expected blast radius, other modules potentially affected. **Do not silently take ownership.**

---

## 8. What this tranche did NOT do

Every prohibition in the instruction, confirmed by measurement rather than intent:

- **No reachable application change.** `git diff origin/main -- app/ tests/ firestore.rules firebase.json` is empty.
- **`app/js/version.js` untouched — 08.27 before, 08.27 after.**
- **08.30 not allocated.** The ledger names it as the unallocated boundary and guard B fails anything claiming it.
- **D14 not wired, D14 Rules not activated.** Recorded as `ON_MAIN_UNREACHABLE`.
- **Phase 4 wiring not modified.** `7e2931f` read only; not re-cut, not re-stamped, not merged.
- **Hadith not merged.** Its branch was read; nothing was fetched into `main`.
- **Nothing deployed.**
- **The measured Study-select layout options were not implemented** — O3 and O3b remain Owner decisions.
- **The build system was not redesigned.** Three files, one of them data.

---

## PROGRAMME_COORDINATION_STATE

```
MAIN_SHA=5ea0d928b8f326e0164c988ef79e4d1d1c168eeb
MAIN_VERSION=08.27
LEDGER_FILE=docs/governance/programme-integration-ledger.json
GUARD_FILES=tools/i18n-verify/programme-ledger.mjs,tools/i18n-verify/programme-ledger-mutations.mjs
VERSION_COLLISION_GUARD=A_IMPLEMENTED_PASS
UNRESERVED_VERSION_GUARD=B_IMPLEMENTED_PASS
CANONICAL_VERSION_GUARD=D_IMPLEMENTED_PASS_FOUND_AND_FIXED_0828_BARE_IN_CLAUDE_MD
SHARED_FILE_GUARD=E_IMPLEMENTED_PASS_11_DECLARED_0_UNDECLARED
STALE_BASELINE_GUARD=F_IMPLEMENTED_PASS_HADITH_MOVED_ACKNOWLEDGED
HELD_STAMP_GUARD=C_IMPLEMENTED_PASS_FOUND_AND_FIXED_FORWARD_ALLOCATION_IN_CLAUDE_MD
MUTATION_TESTS=25_PASSED_0_FAILED_PLUS_2_POSITIVE_CONTROLS
REACHABLE_APP_CHANGE=NO
APP_VERSION_BEFORE=08.27
APP_VERSION_AFTER=08.27
HADITH_0828=RESERVED_STAGE_A_ACCEPTED_MILESTONE_7f61328_VERIFIED
HADITH_0829=RESERVED_STAGE_B_INTEGRATION_cd344f4_VERIFIED_BRANCH_TIP_808539c
NEXT_UNALLOCATED=08.30+
PHASE4_STATUS=HELD_7e2931f_STAMP_0826_HISTORICAL_NOT_A_FORWARD_ALLOCATION
D14_STATUS=ON_MAIN_UNREACHABLE_VERSION_UNCHANGED_NOT_WIRED_RULES_NOT_ACTIVATED
SHARED_CHANGE_01=DEFERRED_ACCEPTED_ARCHITECTURAL_DEBT
TEST_RESULT=LEDGER_GUARD_7_PASS_12_NOTE_0_FAIL_EXIT_0;MUTATIONS_25_PASS_0_FAIL_EXIT_0;BRIEF_INTEGRITY_8_PASS_0_FAIL
```

---

## 9. Held for Master Architect audit

Delivery ends here. **No further development tranche has been started.** Three items are the Master Architect's, and the guards report them every run rather than deciding them:

1. **Hadith re-authorisation** against `5ea0d92`. Its stream halted on the moved baseline itself; the move is documentation-only.
2. **The 11 declared shared-file touches** across the two unmerged branches — disclosed, awaiting decision.
3. **The held wiring's merge number**, to be allocated at merge time. `08.30+` is unallocated and no stream may take it.
