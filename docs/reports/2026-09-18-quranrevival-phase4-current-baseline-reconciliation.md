# QuranRevival Phase 4 — current-baseline reconciliation

- **Date:** 2026-09-18
- **Instruction:** Reconcile the held QuranRevival Phase 4 work against today's MMSA main. **Not permission to merge. No implementation.**
- **Blast radius:** **BR-0, documentation only.** No `app/`, no version, no Rules, no deployment.
- **Application version:** **v08.29, unchanged.**
- **Held branch:** `7e2931f795af1cd97efc1167660cea93aa22b9ab`, stamped **v08.26** — HISTORICAL, not a future allocation. **Not re-cut, not re-stamped, not merged.**

---

## 1. Baseline, verified

| | |
|---|---|
| MMSA `origin/main` | **`20d03a3e02f40fdf02d12ba962eb8d83b3e24428`** — matches the authoritative state exactly |
| main version | **`08.29`** |
| Phase 4 branch | `7e2931f`, version `08.26` |
| Shared merge base | **`8a305c3`** (*MAP Phase 6 P6-C: the Journey Map read model*) |
| Working tree | clean |

`git merge-tree --write-tree origin/main 7e2931f` is **read-only** and was run only as a prediction; `HEAD` and the tree were re-verified unchanged immediately after. It exits **1** with **three conflicts: `CHANGELOG.md`, `CLAUDE.md`, `app/js/version.js`** — all three governance/shared, none of them the capability. `app/quranrevival.html` and `app/js/i18n/bn.js` auto-merge.

---

## 2. What Phase 4 was intended to deliver

**One thing: the bridge from a real Study interaction to one ADR-008 Activity evidence event.** Three of the four sub-tranches are built on the branch.

| | Behaviour | Credits |
|---|---|---|
| **D1 Reading** | An **explicit** ✓ on `#readBar`. ADR-008: *"merely opening or scrolling a passage does not complete Reading"* — no passive trigger anywhere | `approach_01` (Arabic only) or `approach_03` (a translation on screen) |
| **D2 Listening** | A playback session that covers **≥80%** of the selected unit. Preload, buffering, looping, backward seeks and failures cannot complete it — each by construction, not by special case | `approach_07` / `approach_08` |
| **D4 WbW** | Word-by-word study of one āyah on one day, at **āyah + day** grain, on the **learner's** own action only — a supervisor approving a word records nothing | `approach_04` |
| **D3 Journaling** | **Not on the branch.** Blocked at the time | — |

**Activity is not Mastery.** The module cannot reach `records.js`, `claimStatus()`, `achieved` or `mastered`, and never touches the legacy `activity.entries[]` array. Evidence goes to its own subcollection. That separation is the whole security case and is asserted by reading the source.

---

## 3. File-by-file classification

**Every dependency the branch needs still exists on current main**, checked rather than assumed: `study-activity-evidence-store.js` with `writeStudyActivityEvidence`, `weekKeyFor` exported from `activity.js`, `parseQuranWordOccurrenceId`, and `setPlaybackErrorHandler` in `quranrevival.html`.

| File | Ownership | Status | Port |
|---|---|---|---|
| `app/js/study-event-wiring.js` (+222, new) | **QURAN_OWNED** | **STILL_REQUIRED** | **SAFE_TO_PORT** — pure, no drift on main |
| `app/quranrevival.html` (+223/−2) | **QURAN_OWNED** | **STILL_REQUIRED** | **REQUIRES_REIMPLEMENTATION** — see §3.1 |
| `tools/i18n-verify/study-event-wiring.mjs` (+295, new) | **QURAN_OWNED** | **STILL_REQUIRED** | **SAFE_TO_PORT** |
| `tools/i18n-verify/study-activity-evidence-boundary.mjs` (+28/−6) | **QURAN_OWNED** | **STILL_REQUIRED** | **REQUIRES_REIMPLEMENTATION** — see §3.2 |
| `docs/reports/2026-09-14-map-phase4d-*` | **QURAN_OWNED** | STILL_REQUIRED as history | **SAFE_TO_PORT** |
| `docs/governance/phase4-production-package-2026-09-14.*` | **QURAN_OWNED** | **SUPERSEDED** by `phase4-6-production-deployment-package-2026-09-17` | **DO_NOT_PORT** |
| `app/js/version.js` (+1/−1) | **MMSA_SHARED** | **OBSOLETE** — the `v08.26` stamp names something else now | **DO_NOT_PORT.** The Master Architect allocates |
| `CLAUDE.md` (+20) | **MMSA_SHARED** | **SUPERSEDED** — written for a v08.26 round, against a brief that has since changed by +752/−11 | **REQUIRES_REIMPLEMENTATION** |
| `CHANGELOG.md` (+91) | **MMSA_SHARED** | **SUPERSEDED** — same reason, +1406/−1 on main since | **REQUIRES_REIMPLEMENTATION** |
| `app/js/i18n/bn.js` (+5) | **MMSA_SHARED** | **STILL_REQUIRED** (I11) | **SAFE_TO_PORT** — 4 keys, additive, **zero collision with Hadith's +68** (each checked) |
| `tools/firestore-emulator/activity-evidence-v1.rules.test.mjs` (+43/−2) | **MMSA_SHARED** | STILL_REQUIRED as test quality | **SAFE_TO_PORT — but SEPARABLE** (§4.1) |
| `tools/firestore-emulator/baseline-diagnostic.{test.mjs,firebase.json}` (+37, new) | **MMSA_SHARED** | STILL_REQUIRED as evidence | **SAFE_TO_PORT — but SEPARABLE** (§4.1) |

### 3.1 Why `quranrevival.html` needs re-implementation rather than porting

The **markup does not conflict** — main's only change since the merge base is v08.27's `.opt-cell-num > select` CSS rule, in the Study-options bar, and the Phase 4 button goes on `#readBar`. Merge-tree auto-merges it.

**The measurement is what is stale.** Phase 4 adds a control to `#readBar`, which this brief calls *"this app's densest row"*, and it was measured against `8a305c3`. Since then the **measuring instruments have all been rewritten**: `panel.mjs` now measures real usable width with a measured dropdown arrow and judges the longest option; `layout.mjs` distinguishes deferred from dangling ids and fails on a dangling one; `navcheck.mjs` gained 340px and an empty baseline; all four non-`check()` suites gained meaningful exit codes. **A number measured with the old instrument is not evidence under the new one** — this repository's own lesson. The markup ports; the verification must be re-run, not re-quoted.

### 3.2 Why the boundary guard needs re-deriving

**The branch already solved this correctly, and its reasoning should be kept.** `study-activity-evidence-boundary.mjs` on main asserts *"NO PAGE can reach the evidence writer, by any chain"* — the safety case for an uninvoked module. Wiring makes that deliberately false. The branch inverts it to the stronger form: **every page-reachable path to the writer must pass THROUGH `study-event-wiring.js`**, with a positive control (`chains.length > 0`, because zero chains would mean the wiring is broken). That is exactly right and is the shape to reproduce.

**It cannot be taken verbatim**, because main added **+24 lines of P4-E reader guards** to the same file after the branch was cut — the subcollection-only read, the `limit()`, the absent `orderBy` (which would need a composite index nothing declares), and the check that `records.js` cannot name the reader. Merge-tree predicts no textual conflict, but **a clean auto-merge is not a correct merge of two invariants**: the inversion must be re-derived on top of the P4-E guards rather than dropped beside them.

**A second guard must also change**, and the branch does not touch it: `study-approach-contract-boundary.mjs` guards `study-approach-contract.js` and `study-activity-evidence.js` as uninvoked. The wiring imports the **store** (`study-activity-evidence-store.js`), not those two, so — measured, not assumed — **that guard is unaffected and stays as it is.** Worth stating, because the two guard files have confusingly similar names and guard different module sets.

---

## 4. Shared-file authorization requests

The ledger records **seven DECLARED** touches for `quran-phase4-wiring`. The reconciliation narrows them: **four are needed for the capability, three are separable test/diagnostic work.**

---

**PATH:** `app/js/i18n/bn.js`
**ORIGINAL_PHASE4_CHANGE:** +5/−0 — four Bangla strings for the ✓ button's label and its three status messages.
**WHY_STILL_NEEDED:** I11. The button and every message it shows are user-visible text; an English `aria-label` is exactly the gap a coverage sweep has caught before.
**CURRENT_MAIN_HAS_EQUIVALENT:** **NO** — each of the four keys checked individually against main: 0 occurrences. Hadith's own +68 keys do not overlap.
**PROPOSED_CURRENT_CHANGE:** the same four keys, appended. Purely additive.
**BLAST_RADIUS:** BR-1, additive only.
**QURANREVIVAL_EFFECT:** the new control reads correctly in Bangla.
**HADITH_EFFECT:** **none** — disjoint keys, append-only, no Hadith key touched.
**HEALTH_FUTURE_EFFECT:** none; append-only leaves every future module's keys free.
**AUTHORIZATION_REQUIRED:** **YES**

---

**PATH:** `app/js/version.js`
**ORIGINAL_PHASE4_CHANGE:** +1/−1 — the `08.26` stamp.
**WHY_STILL_NEEDED:** the tranche is a reachable app change, so it must carry a version.
**CURRENT_MAIN_HAS_EQUIVALENT:** **NO** — main is `08.29`.
**PROPOSED_CURRENT_CHANGE:** **stamp the number the Master Architect allocates, and nothing else.** `v08.30` is reserved for the next accepted reachable tranche; **this reconciliation does not consume it.** The branch's `08.26` is **DO_NOT_PORT**.
**BLAST_RADIUS:** BR-1 — the badge, the About line, the backup stamp.
**QURANREVIVAL_EFFECT:** the badge names the tranche.
**HADITH_EFFECT:** none once allocated centrally; **this is the exact file that produced the real 08.27 duplicate**, which is why the allocation is not the stream's to make.
**HEALTH_FUTURE_EFFECT:** none.
**AUTHORIZATION_REQUIRED:** **YES — Master Architect global authority**

---

**PATH:** `CHANGELOG.md`
**ORIGINAL_PHASE4_CHANGE:** +91/−0 — the round entry.
**WHY_STILL_NEEDED:** the repository rule is that a round leaving the brief is appended here first, so trimming the brief can never destroy it.
**CURRENT_MAIN_HAS_EQUIVALENT:** **NO** — and main has moved +1406/−1 since, so the branch's text sits in the wrong place and names the wrong version.
**PROPOSED_CURRENT_CHANGE:** a **newly written** entry for the allocated version, appended in main's current structure.
**BLAST_RADIUS:** BR-0.
**QURANREVIVAL_EFFECT / HADITH_EFFECT / HEALTH_FUTURE_EFFECT:** none — append in its own region; no other stream's region rewritten.
**AUTHORIZATION_REQUIRED:** **YES**

---

**PATH:** `CLAUDE.md`
**ORIGINAL_PHASE4_CHANGE:** +20/−0 — the brief entry.
**WHY_STILL_NEEDED:** the brief carries the round and the standing lessons; and the four durable Phase-4 rules must be updated when the branch stops being held.
**CURRENT_MAIN_HAS_EQUIVALENT:** **PARTIAL** — main carries the VERSION NUMBERING NOTE describing the branch **as held**. That text must change *because* the hold ends, not be merged over.
**PROPOSED_CURRENT_CHANGE:** newly written entry, plus retiring the four held-branch rules and pointing the ledger entry from HELD to integrated.
**BLAST_RADIUS:** BR-0, one of three predicted merge conflicts.
**HADITH_EFFECT:** none — Hadith's region is untouched.
**AUTHORIZATION_REQUIRED:** **YES**

---

**PATH:** `tools/firestore-emulator/activity-evidence-v1.rules.test.mjs`
**ORIGINAL_PHASE4_CHANGE:** +43/−2 — replaces a bare `assertFails` with a check that **a denial is a DECISION, not an exception the rules tripped over.** Firestore Rules evaluates in more than one pass; a field read on an unresolved `get()` is recorded as "evaluation error" and the verbose denial string concatenates every pass, so a sound rule looks broken.
**WHY_STILL_NEEDED:** it is a genuine strengthening of a shared suite and it is **not needed for the capability**.
**CURRENT_MAIN_HAS_EQUIVALENT:** **NO** — unchanged on main.
**PROPOSED_CURRENT_CHANGE:** port as-is, **in a separate tranche of its own.**
**BLAST_RADIUS:** BR-0, test only.
**HADITH_EFFECT:** none today; **beneficial later** — any module writing rules-guarded data gets the same diagnostic honesty.
**AUTHORIZATION_REQUIRED:** **YES, but separable — do not bundle it with the capability**

---

**PATH:** `tools/firestore-emulator/baseline-diagnostic.test.mjs` **and** `baseline-diagnostic.firebase.json`
**ORIGINAL_PHASE4_CHANGE:** +37/−0, two new files. A diagnostic that runs the **unmodified production `firestore.rules`** in an isolated emulator and proves the "evaluation error" string predates the Phase 4 amendment.
**WHY_STILL_NEEDED:** it is the evidence for the claim above. Without it the amendment stands accused of a defect it did not introduce.
**CURRENT_MAIN_HAS_EQUIVALENT:** **NO.**
**PROPOSED_CURRENT_CHANGE:** port with the item above, same separate tranche.
**BLAST_RADIUS:** BR-0. **It READS production `firestore.rules` and changes nothing**; `baseline-diagnostic.firebase.json` is an isolated emulator config pointing at a placeholder ruleset, **not** the production `firebase.json`. Flagged because a filename pattern match makes it look otherwise.
**HADITH_EFFECT / HEALTH_FUTURE_EFFECT:** none.
**AUTHORIZATION_REQUIRED:** **YES, separable**

---

### 4.1 The answer to "can this be delivered mostly through Quran-owned files?"

**Yes.** The capability itself is **four Quran-owned files** plus **one additive Bangla block** and the two governance records every round writes. The three emulator files are test and diagnostic quality with no bearing on the behaviour, and belong in a tranche of their own.

**Shared touches required for the capability: 4 of 7** — and of those, `CHANGELOG.md` and `CLAUDE.md` are the documentation every round writes, `version.js` is one line the Master Architect allocates, and `bn.js` is four appended keys.

---

## 5. Protections — verified against current main

| Protected | Verdict |
|---|---|
| **Hadith v08.29 integration** | **PROTECTED.** Phase 4 touches **zero** files matching `hadith` (measured). Its `bn.js` keys are disjoint from Hadith's +68 |
| **Programme Integration Ledger** | **PROTECTED.** Not touched. Its `quran-phase4-wiring` record — ownedPaths and seven DECLARED touches — matches this inventory exactly |
| **Authorization vocabulary** | **PROTECTED.** The seven touches stay `DECLARED`; nothing here promotes one to `AUTHORIZED` |
| **MMSA / QuranRevival terminology** | **PROTECTED.** Phase 4 is a **QuranRevival module** tranche; the branch's own prose predates the vocabulary and its historical reports are not rewritten |
| **Current i18n** | **PROTECTED.** Four additive keys, zero collisions, each checked |
| **Navigation / shell** | **PROTECTED.** `nav.js` and `shell.css` untouched. The new control is inside `#readBar`, a Quran surface |
| **Tracking contracts** | **PROTECTED** — and this is the load-bearing one. The wiring cannot reach `records.js`, `claimStatus()`, `achieved`, `mastered` or `activity.entries[]`; `bulkConfirmWeek()` still reads `entries[]` alone |
| **MMJ / Notes contracts** | **PROTECTED.** `note-foundation.js`, `journey-map-*.js` untouched |
| **D14 foundation** | **PROTECTED but COUPLED** — see §6 |
| **Rules / index state** | **PROTECTED.** `firestore.rules` and `firebase.json` untouched; no candidate altered; the evidence subcollection rule exists **only** in the undeployed assembled candidate (`firestore.rules` contains the word "evidence" **0** times) |

Baseline health on main at the time of this reconciliation: `programme-ledger` 0 failed, mutations **37/0**, `brief-integrity` 8/0, `stub-parity` 3/0, `study-approach-contract-boundary` 16/0, `rules-authorisation-executable` 38/0, `firestore-index-requirements` 8/0.

---

## 6. Old Phase-4 assumptions that are now invalid

**Four, and three of them are in the tranche's favour.**

1. **"The keyed Activity writer's four gates block Phase 4."** **INVALID — resolved by later work.** Those gates (the SHA-256 map key Rules cannot recompute; the BR-3 move of live writes into a `v1Events` map; the `entries[]` compatibility and rollback analysis) belong to a **different design on a different branch** (`claude/pensive-knuth-2pu3jj`). P4-B/P4-C replaced it with **one create-only document per event in a subcollection, deduplicated by the database because the identity IS the document id**. `activity.js` is untouched by this branch — confirmed, it is not in the changed set. **Three of the four gates are simply moot.**
2. **"D3 Journaling is blocked because `ayah-notes.js` cannot express two notes on one unit."** **INVALID at the contract level — resolved by P5-B.** `app/js/note-journal-evidence.js` is on main and keys Journaling on the Note Foundation's permanent `noteId`. **But it has no reachable producer**: it is imported by 0 pages, and the Note editor (P5-D) is not built. So D3 is **designed, not deliverable** — and it is **out of this tranche's scope** either way.
3. **"`#readBar` measures as it did."** **INVALID as evidence.** The markup is unchanged, but every measuring suite has been rewritten since (§3.1). Re-measure.
4. **"`study-activity-evidence-boundary.mjs` is what the branch left."** **INVALID.** Main added +24 lines of P4-E reader guards after the cut (§3.2).

### 6.1 The D14 coupling, recorded rather than discovered later

The wiring calls `weekKeyFor(at, weekStartsOn)` for the event's `weekKey` and its own `utcDay()` for `dateIso`. **`weekKeyFor()` reads the DEVICE's local calendar day** (`getFullYear/getMonth/getDate`) and then formats UTC; `utcDay()` is pure UTC. Near midnight the two can name different days — deliberate on the branch, but it means **Phase 4 evidence consumes exactly the function D14 would change.** D14 is unreachable and unchanged by this tranche, so nothing breaks; but if D14 is ever activated, evidence written before it keeps week keys computed under the old rule. **No backfill is proposed and none should be assumed.** Recorded so it is not rediscovered as a defect.

---

## 7. Unresolved questions, re-classified against current state

Stale questions from the old reports were re-evaluated rather than repeated.

| # | Question | Class |
|---|---|---|
| 1 | The keyed-writer storage design, its Rules candidate, the deploy decision and `entries[]` rollback | **RESOLVED_BY_LATER_WORK** — a different design on a different branch (§6.1) |
| 2 | D3 Journaling's note identity | **RESOLVED_BY_LATER_WORK** (P5-B) at contract level; delivery sits behind P5-D, out of scope |
| 3 | The evidence subcollection's Rules and the `request.query.limit` symmetry | **RESOLVED_BY_LATER_WORK** — candidate accepted, in the assembled deployment file, **do not amend** |
| 4 | Deploying the Rules so a write can succeed | **EXTERNAL_DEPENDENCY (E1)** — authenticated Firebase Console access. Access, not design |
| 5 | The boundary-guard inversion, and re-deriving it over P4-E | **TECHNICAL_DECISION — resolvable here** |
| 6 | `weekKey` device-local vs `dateIso` UTC | **TECHNICAL_DECISION — resolvable here**, with §6.1 recorded |
| 7 | Listening coverage does not accumulate across two sessions | **TECHNICAL_DECISION — already made**, the conservative reading of "a session completed it" |
| 8 | **Reading credits `approach_01` or `approach_03` inferred from whether a translation is on screen**, silently | **OWNER_DECISION — product choice.** It decides which Approach a person's own record credits, from a toggle they may not connect to it. Infer silently, show which Approach was credited, or let the reader choose |
| 9 | **A Juz, Hizb, Ruku' or Page records NO evidence** — the ✓ answers *"Reading is recorded for an āyah, a range or a whole surah."* | **OWNER_DECISION — product choice.** Accept the gap with that message, hide the control for those units, or extend the contract (which is an ADR-008 amendment) |

**Two genuine Owner decisions. Both are small, both are about what a reader sees, and neither blocks building** — each has a defensible default already implemented on the branch.

---

## 8. The smallest safe implementation tranche

**Scope: D1 Reading, D2 Listening, D4 WbW. Not D3.**

### Files

| File | Ownership | Action |
|---|---|---|
| `app/js/study-event-wiring.js` | QURAN_OWNED | **Create** — port from `7e2931f` unchanged (pure; verified against current dependencies) |
| `app/quranrevival.html` | QURAN_OWNED | **Change** — re-apply the `#readBar` control, the aria-live status span and the three call sites onto current markup, then **re-measure** |
| `tools/i18n-verify/study-event-wiring.mjs` | QURAN_OWNED | **Create** — port (39 assertions) |
| `tools/i18n-verify/study-activity-evidence-boundary.mjs` | QURAN_OWNED | **Change** — re-derive the through-the-wiring inversion **on top of** main's P4-E guards |
| `app/js/i18n/bn.js` | **MMSA_SHARED** | **Change** — 4 appended keys · **authorization required** |
| `app/js/version.js` | **MMSA_SHARED** | **Change** — the allocated number · **Master Architect authority** |
| `CHANGELOG.md`, `CLAUDE.md` | **MMSA_SHARED** | **Change** — newly written entries · **authorization required** |
| `docs/reports/2026-09-…-phase4-wiring-on-mmsa.{md,html}` | QURAN_OWNED | **Create** |

**Not in this tranche:** the three emulator files (separate BR-0 tranche), the superseded 2026-09-14 production package, D3 Journaling, any Rules or index change, any Hadith or Health file.

### Behaviour delivered

An explicit ✓ on the Read bar records one Reading evidence event; finishing ≥80% of a listened unit records one Listening event; a learner's own word-state action records one WbW event for that āyah that day. Each is **one create-only document in `activity/{tenant}__{person}__{week}/evidence/`**, deduplicated by the database. **No claim, no confirmation, no `records` write, no change to any existing screen's behaviour.**

### Tests

`study-event-wiring.mjs` (39 pure assertions) · the re-derived boundary suite, **mutation-proven both ways** (remove the wiring → the positive control fails; add a second importer → the inversion fails) · the existing emulator suite for the subcollection · `programme-ledger` + mutations · `brief-integrity` · `stub-parity` · `rules-authorisation-executable` · `firestore-index-requirements` · and the **full re-measurement** of `#readBar`: `layout.mjs` against the pre-tranche commit, `panel.mjs`, `reading.mjs`, `navcheck.mjs`, both languages, every viewport, **with the screenshot looked at**.

### Acceptance criteria

1. Three evidence events written and **proven by their values**, not by an element existing.
2. `bulkConfirmWeek()` still reads `entries[]` alone; no claim status moves anywhere.
3. `#readBar` measured at every viewport in both languages, with a **real-length** fixture — no truncation, no wrap, tap target ≥36px.
4. Every guard green, and the boundary inversion mutation-proven both ways.
5. Four Bangla strings verified **on the rendered page in Bangla**, not from a coverage count.
6. `firestore.rules`, `firebase.json` and every candidate byte-for-byte unchanged.
7. The ledger updated: the stream moves off HELD, the four shared touches carry real `authorization` metadata.

### Is v08.30 appropriate?

**Yes — it is a reachable app change and needs a version.** Two conditions on it, stated plainly:

- **`v08.30` is reserved and this task does not consume it.** Nothing here stamps it.
- **The tranche rides E1 and should not be authorised to ship before it.** Until the Rules are deployed, the evidence subcollection has **no rule and is closed to every client**, and the writer **rethrows** so a failure reaches the user (I15) — correct behaviour that would make every ✓ press show an error. Building the tranche needs no new authority; **shipping it needs the Rules deployed first, indexes before rules.** There is no honest way to split that.

---

## QURANREVIVAL_PHASE4_RECONCILIATION

```
MAIN_SHA=20d03a3e02f40fdf02d12ba962eb8d83b3e24428
MAIN_VERSION=v08.29
HISTORICAL_PHASE4_SHA=7e2931f
HISTORICAL_VERSION=v08.26
SURVIVING_CAPABILITY=D1_READING+D2_LISTENING+D4_WBW_TO_ADR008_EVIDENCE_SUBCOLLECTION;D3_JOURNALING_OUT_OF_SCOPE
OBSOLETE_CHANGES=1 (app/js/version.js v08.26 stamp)
SUPERSEDED_CHANGES=3 (CLAUDE.md entry, CHANGELOG.md entry, phase4-production-package-2026-09-14.*)
QURAN_OWNED_CHANGES=6 (study-event-wiring.js, quranrevival.html, study-event-wiring.mjs, study-activity-evidence-boundary.mjs, the P4-D report .md+.html)
SHARED_TOUCH_COUNT=7_DECLARED;4_REQUIRED_FOR_CAPABILITY;3_SEPARABLE_TEST_DIAGNOSTIC
SHARED_AUTHORIZATION_REQUESTS=4 (app/js/i18n/bn.js, app/js/version.js, CHANGELOG.md, CLAUDE.md) + 2 separable (activity-evidence-v1.rules.test.mjs, baseline-diagnostic.*)
HADITH_PROTECTED=YES_ZERO_FILES_TOUCHED_ZERO_I18N_KEY_COLLISIONS
PROGRAMME_LEDGER_PROTECTED=YES_UNTOUCHED_AND_ITS_RECORD_MATCHES_THIS_INVENTORY
D14_STATUS=UNREACHABLE_UNCHANGED_BUT_COUPLED_VIA_weekKeyFor_RECORDED
GENUINE_OWNER_DECISIONS=2 (Reading Approach inferred from translation visibility; no evidence for juz/hizb/ruku/page)
TECHNICAL_DECISIONS=3 (boundary-guard inversion over P4-E; weekKey local vs dateIso UTC; listening does not accumulate across sessions)
EXTERNAL_DEPENDENCIES=1 (E1 — authenticated Firebase Console access; indexes before rules)
PROPOSED_IMPLEMENTATION_FILES=app/js/study-event-wiring.js;app/quranrevival.html;tools/i18n-verify/study-event-wiring.mjs;tools/i18n-verify/study-activity-evidence-boundary.mjs;app/js/i18n/bn.js;app/js/version.js;CHANGELOG.md;CLAUDE.md;docs/reports/<dated>.md+.html
PROPOSED_VERSION=v08.30
REACHABLE_APP_CHANGE=NO
APP_VERSION_AFTER=v08.29
READY_FOR_MASTER_ARCHITECT_BUILD_AUTHORIZATION=YES_TO_BUILD;NOT_TO_SHIP_UNTIL_E1
```

**READY = YES to build, NOT to ship until E1.** The capability survives, its dependencies are intact, three of its four historical blockers are resolved by later work, and it is mostly Quran-owned. Two genuine Owner decisions remain, both small and both with a defensible default already implemented. **`7e2931f` was read only** — not re-cut, not re-stamped, not merged.

---

Stopping after delivery.
