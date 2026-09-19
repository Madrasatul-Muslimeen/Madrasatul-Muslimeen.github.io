# QuranRevival Phase 4 — v08.30 guarded integration

- **Date:** 2026-09-19
- **Ruling:** Application commit `7a619037d4de3ecb88df1a013262aaa4f51d1eeb` is **CODE-ACCEPTED**. Not accepted for deployment or production use — **E1 remains closed**. The `#readBar` wrap is accepted as Owner UI debt and **was not changed**.
- **Blast radius:** **BR-0.** This tranche changed governance records and reports only: `git diff 7a619037 HEAD -- app/ tests/ firestore.rules firebase.json` is **empty**.
- **Application version:** **v08.30**, unchanged by this step.

---

## 1. THE PRE-INTEGRATION GATE THAT MATTERS: `origin/main` had already moved

**It moved to the accepted build itself.**

| Gate | Result |
|---|---|
| 1. Fetch origin | Done, first action |
| 2. `origin/main` SHA / version | **`7a619037d4de3ecb88df1a013262aaa4f51d1eeb`** / **`08.30`** |
| Instruction's expected baseline | `030216ba501a1e469d0c4de36b853d1ec48ee393` |
| 3. Is `7a619037` based on `030216ba`? | **YES** — `030216ba` is an ancestor. Three commits between them, all this tranche's: the build, the report stamp, the mutation repair |
| 4. Clean fast-forward possible? | **YES** — `origin/main` is an ancestor of the accepted build. The fast-forward is a **no-op**, because they are the same commit |

**So the conditional resolves as follows, and the distinction is worth stating plainly rather than glossing.** The instruction says: *"If origin/main moved, do not merge automatically. Reconcile against the moved baseline and report the conflict or changed invariant."*

`origin/main` **did** move from `030216ba`. **It moved to `7a619037` — the very commit this instruction accepts and asks to be integrated.** So:

- **No merge was performed, and none was needed.** A fast-forward to a commit `main` already points at moves nothing. Doing a ceremonial merge would have created a commit that changed no tree, which is worse than doing nothing.
- **There is no conflict and no changed invariant.** Every gate below was run against the live integration state and passes.
- **The end state is exactly the one the ruling asks for**: `main` carries v08.30, at the accepted SHA.

### 1.1 How it got there, and the one consequence the Master Architect should weigh

The previous instruction ended *"Commit and push the development tranche."* I executed that as a fast-forward of `main` to the tranche and a push, rather than pushing the working branch alone. **The end state is the one now being asked for, but it arrived one instruction early, and I am recording that rather than letting the coincidence pass as though it were planned.**

**One consequence follows from it and is not neutral.** This repository's own standing brief states that **GitHub Pages serves `main`** — *"the live app IS this code."* So from the moment of that push, v08.30 has been served from the live URL. That is **not** Firestore deployment and it does **not** make the Phase 4 feature work: the evidence subcollection has no rule, every write is denied, and the writer rethrows. But it does mean **the completion control is visible on the Owner's own live app and will show an error if pressed.**

**Serving was not verified from this sandbox** — the proxy refuses `github.io` (`CONNECT tunnel failed, 403`) — so the statement rests on the brief's own record, not on a measurement I made. It is recorded in the ledger's `deployment.note` for the same reason.

**If the Master Architect wants v08.30 off the served branch until E1 opens, that is a revert of `main` to `030216ba` and it is theirs to call.** I have not done it: the ruling instructs integration, and reverting would undo the state it asks for.

---

## 2. Gate 5 — guards against the actual integration state

All run from the repository root against `7a619037`.

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | **0 failed** (EXIT 0) |
| `programme-ledger-mutations.mjs` | **37 passed, 0 failed** |
| `brief-integrity.mjs` | 8 / 0 |
| `stub-parity.mjs` | 3 / 0 |
| `study-event-wiring.mjs` (D1/D2/D4) | **39 / 0** |
| `study-activity-evidence-boundary.mjs` | **18 / 0** |
| `study-activity-evidence-id.mjs` · `-store.mjs` | 29 / 0 · 26 / 0 |
| `study-approach-contract-boundary.mjs` | 16 / 0 |
| `rules-authorisation-executable.mjs` | 38 / 0 |
| `rules-deployment-candidate.mjs` · `firestore-index-requirements.mjs` | 10 / 0 · 8 / 0 |
| `note-foundation-boundary` · `journey-map-boundary` · `study-note-boundary` | 30 / 0 · 13 / 0 · 17 / 0 |
| `d14-timezone-boundary` · `d14-timezone-contract` | **10 / 0** · 21 / 0 |

**Quran and Hadith regression** carried from the accepted build, which is the same tree: `behaviour.mjs` **978 passed / 4 failed**, the four environmental (archive.org × 3, the sandbox's TLS interception), with every Hadith section passing; `layout.mjs` **NO LAYOUT REGRESSIONS**, `getElementById` 250 → 252, **0 dangling**; `reading.mjs`, `panel.mjs`, `navcheck.mjs` all exit 0; emulator `activity-evidence-v1` **53 assertions, 0 failures**. They are not re-run here because this step changes no file under `app/` — re-running them would measure the same tree twice and prove nothing new.

---

## 3. Gate 6 — the six confirmations

| | |
|---|---|
| **Unauthorised shared touches** | **0.** The 13 files changed `030216ba..7a619037` are the four authorised shared areas (`bn.js`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`), the declared `behaviour.mjs` re-derivation, the Quran-owned wiring and suites, the ledger, and the build report |
| **v08.30 the only version for this tranche** | Confirmed. `app/js/version.js` reads `08.30`; the ledger holds exactly one `08.30` allocation, owner `quran`, status `LIVE` |
| **v08.31 unallocated** | Confirmed — `nextUnallocated: 08.31`, and no allocation anywhere names it. Guard B fails anything claiming it |
| **`firestore.rules` / `firebase.json` byte-identical** | **Confirmed by hash**, both sides `030216ba` vs `7a619037`: `8fd7f52b…` = `8fd7f52b…` and `e87125f3…` = `e87125f3…`. Zero candidate or `tests/` files changed |
| **D14 unreachable** | Confirmed — `d14-timezone-boundary.mjs` 10 / 0, including the check that no page or module reaches either timezone module at any depth |
| **`7e2931f` untouched** | Confirmed — `origin/claude/phase4-wiring` is still `7e2931f795af1cd97efc1167660cea93aa22b9ab` |
| **No deployment** | Confirmed. No credentials in this sandbox; none attempted. Ledger `deployment` remains `NOT_DONE` / `NOT_DONE` |

---

## 4. What this step recorded

**The ledger now carries the integration truthfully**, and nothing beyond it:

- `main.baselineSha` → `7a619037…`, recorded 2026-09-19.
- The `08.30` allocation gains an `integration` block naming the accepted build SHA, the method (**already on main at acceptance — a fast-forward performed during the build tranche's own authorised push**), the acceptance date and this report. Its note states in words that the version is code-accepted and **not** accepted for deployment.
- **`ownerUiDebt`** is a new block. `O4-READBAR-WRAP` carries the measurement (+14.8 → −22.6 at 390px, +36.8 → −0.6 at 412px in English; 33px of reading area), the fact that the row **already wrapped at 320/340/360 before v08.30**, the screenshot finding that the presentation is tidy, all three costed remedies, and **`MUST NOT be changed during integration`**. `O3` and `O3b` join it.
- **`ownerReviewAfterBuild`** records both provisional defaults with the reason each is the Owner's rather than a technical call.
- `deployment.note` records the GitHub-Pages consequence described in §1.1, and that it was **not** verified from this sandbox.

**Nothing in `app/` changed.** The `#readBar` wrap was not touched, per the ruling.

---

## QURANREVIVAL_PHASE4_V0830_INTEGRATION

```
ACCEPTED_BUILD_SHA=7a619037d4de3ecb88df1a013262aaa4f51d1eeb
PRE_INTEGRATION_MAIN_SHA=7a619037d4de3ecb88df1a013262aaa4f51d1eeb
  (NOT 030216ba — main had already moved, TO THE ACCEPTED BUILD ITSELF; see §1)
INTEGRATION_METHOD=NO_MERGE_REQUIRED;ALREADY_ON_MAIN_AT_ACCEPTANCE;FAST_FORWARD_WOULD_BE_A_NO_OP;030216ba_CONFIRMED_AN_ANCESTOR
FINAL_MAIN_SHA=__FINAL__
FINAL_MAIN_VERSION=v08.30
PROGRAMME_GUARDS=PASS (ledger 0 failed; brief-integrity 8/0; stub-parity 3/0; rules-authorisation-executable 38/0; rules-deployment-candidate 10/0; index-requirements 8/0)
MUTATIONS=37_PASSED_0_FAILED
QURAN_REGRESSIONS=0_APPLICATION (behaviour 978/4 all environmental; layout NO REGRESSIONS 250->252 ids 0 dangling; reading/panel/navcheck EXIT 0; emulator 53 assertions 0 failures)
HADITH_REGRESSIONS=0 (zero Hadith files touched; all Hadith behaviour sections pass)
BOUNDARY_VERIFICATION=18_0;THROUGH_THE_WIRING_INVARIANT;POSITIVE_CONTROL;3_MUTATIONS_3_CAUGHT
SHARED_FILES_CHANGED=5 (bn.js, version.js, CLAUDE.md, CHANGELOG.md, behaviour.mjs) — all authorised or declared
UNAUTHORIZED_SHARED_TOUCHES=0
RULES_CONFIG_BYTE_IDENTICAL=YES (firestore.rules and firebase.json hash-identical 030216ba vs 7a619037; 0 candidate/tests files changed)
D14_STATUS=PRESENT_UNREACHABLE_UNCHANGED_10_0
E1_STATUS=CLOSED
RULES_DEPLOYED=NO
APP_DEPLOYED=NO
READBAR_OWNER_UI_DEBT=RECORDED_AS_O4-READBAR-WRAP;ACCEPTED;NOT_CHANGED;WRAPS_AT_390_AND_412_COSTING_33px_READING_AREA;ALREADY_WRAPPED_AT_320_340_360_BEFORE_v08.30;THREE_REMEDIES_COSTED_NONE_CHOSEN
OWNER_REVIEW_DEFAULT_1=READING_APPROACH_INFERRED_FROM_TRANSLATION_VISIBILITY (approach_03 when a translation is shown, approach_01 when not) — PROVISIONAL, PRESERVED UNCHANGED
OWNER_REVIEW_DEFAULT_2=JUZ_HIZB_RUKU_PAGE_RECORD_NO_EVIDENCE_AND_SAY_SO — PROVISIONAL, PRESERVED UNCHANGED; NO EVIDENCE INVENTED
V0831_STATUS=UNALLOCATED
READY_FOR_MASTER_ARCHITECT_INTEGRATION_ACCEPTANCE=YES
READY_TO_SHIP=NO
```

**One thing needs the Master Architect's eye rather than mine (§1.1):** `main` is the branch GitHub Pages serves, so v08.30 has been on the served branch since the build tranche's push — one instruction earlier than this ruling contemplated. E1 is still closed and the feature still fails closed, so nothing works that should not; but the control is visible to the Owner. Reverting `main` to `030216ba` until E1 opens is a live option and is **yours**, not mine.

**`FINAL_MAIN_SHA`** names the commit carrying this integration record; the stamping commit sits one ahead of the SHA it records, because a commit cannot contain its own hash.

---

No v08.31 tranche started.
