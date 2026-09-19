# MMSA / QuranRevival — authoritative continuation package

**Issued:** 19 September 2026
**Supersedes:** `docs/reports/2026-09-18-SESSION-HANDOVER.md`, which stopped at
`d8f0492` / v08.25 and is now history. Where the two disagree, this file wins.
**Read `CLAUDE.md` first, then this.** This file is the deterministic state; the
brief is the standing law.

---

## 1. Exact state, as measured

| | |
|---|---|
| `origin/main` | **`db6cb24b807d77630914e076d413bec6982cc3d7`** |
| `main` application version | **v08.30** |
| Accepted v08.30 build | `8ea445fb376784fb8452cb2042e4eaa8e017f41b` (one behind `db6cb24`; `app/` byte-identical — `db6cb24` is a report-stamp commit) |
| Development branch | **`claude/charming-rubin-xzxbk1`** |
| Branch tip | **`bfa2dad705e1a92ebb46cf142760f7a3b6861d2e`** — `710f182` is the v08.31 application and governance tip; `bfa2dad` adds this package, records O3c and repoints the brief's handover block, and changes **no** application file (`git diff 710f182 bfa2dad -- app/` is empty) |
| Branch application version | **v08.31** — RESERVED and AUTHORIZED, **NOT integrated** |
| Working tree | clean |
| Held Phase 4 wiring | `claude/phase4-wiring` at `7e2931f795af1cd97efc1167660cea93aa22b9ab` — **SUPERSEDED** by v08.30's re-derivation; its `v08.26` stamp stays HISTORICAL |
| Next unallocated version | **`08.32`** — a boundary marker, **not an allocation** |

### The four deployment states — record them separately, always

This is the governance correction of 19 Sep 2026, and collapsing it back into
one boolean is the specific mistake to avoid.

| State | Value | Basis |
|---|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** | v08.30 is on `main` |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN** | **Presumed, `verified: false`.** The sandbox proxy refuses `CONNECT` to `github.io`. This rests on the brief's own record, not a measurement |
| `FIREBASE_RULES_DEPLOYED` | **NO** | E1 closed |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** | The evidence subcollection has no rule |
| `E1` | **CLOSED** | No `study-monitoring` Console access from a sandbox |

`docs/governance/programme-integration-ledger.json` holds these, and
**guard G** in `tools/i18n-verify/programme-ledger.mjs` enforces them: each has
its own closed vocabulary, a presumption must declare itself a presumption, and
the feature cannot be recorded operational while its Rules are not deployed.

---

## 2. What v08.31 is, in one paragraph

v08.30 put the Phase 4 ✓ on the branch GitHub Pages serves, where it could only
ever produce an error. v08.31 adds an explicit persistence-readiness gate that
**defaults to false** and **cannot infer readiness from `firestore.rules`**
(`app/js/study-evidence-readiness.js` imports nothing at all, so the inability is
the enforcement). While it is false the ✓ is not actionable, **no evidence write
is attempted**, and the reader is told why in English and Bangla. The writer's
fail-closed rethrow is untouched underneath as defence in depth. `#readBar` is
byte-identical to v08.30 at all seven widths in both languages.

Full account: `docs/reports/2026-09-19-quranrevival-v0831-release-gating.md`.

**Enabling the gate later is a governed decision, not an edit.** Flipping
`ready` to `true` alone returns false — a well-formed `decision` is also
required — and guard G fails if the source declares ready while the ledger
records the Rules as not deployed. Both must move together, with the ledger's
`evidencePersistenceReadiness.requiredToEnable` list satisfied.

---

## 3. The exact first execution task

**It depends on one thing only, and it is access, not design.**

**If authenticated Firebase Console access to `study-monitoring` is available:**
deploy **four indexes first, then the assembled Rules, in that order** —
indexes before rules, because rules first would let the new screens ask
questions the database then refuses. The only file to paste is
`docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`.
**NEVER paste a `candidate-2026-09-15` file** — those are self-contained test
extracts, and pasting one would replace the entire live ruleset with a file
governing three collections. Owner-facing instructions:
`docs/governance/phase4-6-production-deployment-package-2026-09-17.md`.
Then, and only then, put the readiness enablement to the Master Architect as a
governed decision (§2).

**If it is not available:** the first task is whatever the Master Architect
instructs. Nothing in the repository is blocked on a design question; everything
outstanding is either E1 or an Owner UI decision (§4).

---

## 4. The three lists, kept separate

### 4.1 Owner decisions — nothing here is Claude's to settle

| id | Subject | State |
|---|---|---|
| **O4-READBAR-WRAP** | `#readBar` wraps at 390px and 412px since v08.30 | **ACCEPTED OWNER UI DEBT.** Costs 33px of reading area at the two commonest phone widths. Presentation is tidy (screenshotted). Three remedies costed, **none chosen**. **Must not be changed during integration.** |
| **O3** | `tenantSelect` truncated in the Study-options panel | OPEN. 224px of text in a 145px cell. Widen / shorten / reveal are materially different choices |
| **O3b** | `surahSelect` / `unitTypeSelect` at 320px | OPEN. The row is **genuinely short of space** (−63.9px at 320px in Range); no redistribution reaches it |
| **O3c** | `#drillModeSelect` truncated in **Bangla** at six viewports | **NEW, 19 Sep 2026.** Found by running `panel.mjs bn`; proven pre-existing by reverting `app/` to the accepted v08.30 build and getting the identical six. English is clean. Reported, not fixed |
| **OWNER_REVIEW_DEFAULT_1** | The Reading Approach is inferred from translation visibility | PROVISIONAL build default, preserved unchanged. It decides which Approach a person's record credits, from a control they may not connect to it |
| **OWNER_REVIEW_DEFAULT_2** | A juz / hizb / ruku' / page records **no** evidence and says so | PROVISIONAL build default, preserved unchanged. **No evidence was invented to complete tracking** |
| **D14-WIRING** | Timezone activation | OPEN. The contract modules are on `main` and unreachable by construction. Activation needs a Rules change and rides E1 |
| **Guardian approval window** | Phase 5 GUARD-05/06/07 | Not implemented, deliberately. Every guardian content edit is denied outright — safer than the accepted design, and recorded rather than faked |
| **Server-side cycle prevention** | Phase 6 folder trees | Recorded, not adopted. Its cost is forbidding folder moves, which is a product decision |

### 4.2 Technical work that needs no new authority

- **v08.31 integration into `main`** — the Master Architect's instruction to
  give. The branch is pushed and clean; every gate passes.
- **SCR-01** (`ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`): `behaviour.mjs`'s
  hand-maintained exclusion list for intentionally multi-script elements. The
  replacement is a semantic declarative contract. **Not authorised to build.**
- **DR-01** (design record only): `behaviour.mjs` is one monolithic file at 56
  sections and 982 checks. **Not authorised to build.**
- **`study-note-service.js` calls the evidence store directly.** Unreachable
  today (D3 Journaling has no producer, P5-D unbuilt), and pinned as unreachable
  by a boundary check — **wiring it fails that check until it goes through
  `recordStudyEvidence()`.** Whoever builds P5-D must route it through the gate.
- **P5-D, the Note editor** — held behind E1 (its writes need the Note
  Foundation Rules **and** indexes).

### 4.3 Environment and access

- **E1 is the single blocking dependency**: authenticated Firebase access to
  `study-monitoring`. `firebase` reports "Failed to authenticate"; the Rules API
  returns 403. Seven ledger items sit on it.
- **The sandbox proxy refuses `github.io`**, so serving cannot be verified here.
  Anything about Pages is PRESUMED and must say so.
- **TLS interception** trips "no page errors" checks on any page fetching over
  HTTPS (`ERR_CERT_AUTHORITY_INVALID`). Environmental. **Never reach for
  `--ignore-certificate-errors`** — it would hide a real certificate problem.
- **`archive.org` and `api.quran.com` are unreachable** here. The 22g failures
  are intermittent, so a green 22g is not evidence either way.
- Run every `tools/i18n-verify` suite **from the repository root**; they resolve
  paths from `process.cwd()` and fail loudly and confusingly otherwise.

---

## 5. Verification baseline — what a clean run looks like today

| Suite | Clean result |
|---|---|
| `behaviour.mjs` | **981 passed, 1 failed** — the one failure is 31e's TLS artefact |
| `layout.mjs` | exit 0, NO LAYOUT REGRESSIONS, `getElementById` **253**, **0 dangling**, 22 deferred |
| `navcheck.mjs` | exit 0 |
| `panel.mjs en` | exit 0 |
| `panel.mjs bn` | **exit 1 — 6 × `#drillModeSelect`, PRE-EXISTING** (O3c) |
| `reading.mjs` | exit 0 |
| `programme-ledger.mjs` | 8 passed / 22 noted / 0 failed (guards A–G) |
| `programme-ledger-mutations.mjs` | **49 passed, 0 failed** |
| `study-activity-evidence-boundary.mjs` | **26 passed, 0 failed** |
| `brief-integrity.mjs` | 8 passed, 0 failed |
| `rules-authorisation-executable.mjs` | 38 passed, 0 failed |
| `quran-boundary` / `note-foundation-boundary` | 30 / 30, 0 failed |
| `journey-map-boundary` / `d14-timezone-boundary` | 13 / 10, 0 failed |
| `study-approach-contract-boundary` | 16 passed, 0 failed |
| `firestore-index-requirements` / `stub-parity` | 8 / 3, 0 failed |
| hadith corpus / source-rights / commentary-binding | exit 0, all three |
| `i18n-coverage` | 1,879 scanned, 1,818 Bangla, **61 missing** |

Emulator (needs `firebase emulators:exec`, not a bare run):
Phase 4 activity-evidence **53 assertions, 0 failures**.

---

## 6. Things a new session will get wrong unless it reads this

1. **Merged is not deployed, and served is not operational.** Four states, four
   records. `main` being served does not make the Phase 4 feature work.
2. **A version bump on a branch is not a version on `main`.** This file's
   predecessors got that wrong three times. `brief-integrity.mjs` checks the
   milestone line against `origin/main:app/js/version.js` now.
3. **v08.32 is NOT allocated.** The ledger names it only as the unallocated
   boundary, which is what lets guard B refuse anyone who stamps it. Read the
   allocation off the Master Architect at the time, never off arithmetic.
4. **A mutation harness must never reach for `git`.** One in this session
   restored with `git checkout -- app tools` and destroyed an hour of
   uncommitted guard work. Back up in memory; commit before mutating.
5. **An UNPROVEN mutation is a finding about the guard**, to be chased, not
   deleted. One in this session found a genuinely vacuous assertion.
6. **A grep cannot see an uncaught throw.** Read exit codes.
7. **Run `panel.mjs` in BOTH languages.** A suite that only ever runs in one
   language is measuring one language — that is how O3c went unrecorded.
8. **Delete `app/_prev-quranrevival.html` before reading a coverage total.**
9. **Nothing may be deployed**, and `firestore.rules` still contains the word
   `evidence` **zero** times. That is the E1 gate, and it is what makes the
   feature fail closed.

---

## 7. State block

```
MMSA_QR_CONTINUATION_PACKAGE
ISSUED=2026-09-19
SUPERSEDES=docs/reports/2026-09-18-SESSION-HANDOVER.md
MAIN_SHA=db6cb24b807d77630914e076d413bec6982cc3d7
MAIN_VERSION=v08.30
DEV_BRANCH=claude/charming-rubin-xzxbk1
DEV_BRANCH_TIP=bfa2dad705e1a92ebb46cf142760f7a3b6861d2e
V0831_APPLICATION_TIP=710f182e049a2471629823ab5a7c2d15ccf594c5
DEV_BRANCH_VERSION=v08.31
V0831_STATE=RESERVED_AND_AUTHORIZED_NOT_INTEGRATED
V0832_STATUS=UNALLOCATED
APPLICATION_CODE_INTEGRATED=YES
GITHUB_PAGES_SERVING=PRESUMED_FROM_MAIN
FIREBASE_RULES_DEPLOYED=NO
EVIDENCE_RECORDING_OPERATIONAL=NO
E1_STATUS=CLOSED
BLOCKING_DEPENDENCY=ACCESS_NOT_DESIGN
FIRST_TASK_WITH_E1=deploy four indexes, then the assembled Rules, in that order
FIRST_TASK_WITHOUT_E1=await Master Architect instruction; nothing is blocked on a design question
OPEN_OWNER_DECISIONS=O4-READBAR-WRAP, O3, O3b, O3c, OWNER_REVIEW_DEFAULT_1, OWNER_REVIEW_DEFAULT_2, D14-WIRING, guardian approval window, server-side cycle prevention
DEFERRED_NOT_AUTHORISED=SCR-01, DR-01
HELD_BRANCH=claude/phase4-wiring @ 7e2931f795af1cd97efc1167660cea93aa22b9ab (SUPERSEDED, stamp v08.26 HISTORICAL)
WORKING_TREE=CLEAN
READY_TO_SHIP=NO
```
