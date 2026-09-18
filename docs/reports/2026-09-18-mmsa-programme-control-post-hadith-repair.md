# MMSA — post-Hadith programme-control repair

- **Date:** 2026-09-18
- **Instruction:** BR-0 governance/test repair of the three post-Hadith programme-control defects, plus MMSA terminology and module-stream registration.
- **Blast radius:** **BR-0.** `git diff a4b9be3 HEAD -- app/ tests/ firestore.rules firebase.json` is **empty**.
- **Application version:** **v08.29 before, v08.29 after.**
- **Result:** All three repaired. **Mutations 25 → 37, 0 failed.** Two further true findings surfaced by the new coverage and fixed.

---

## 1. Baseline

Fetched first. `origin/main` = **`a4b9be3b65dce57a3fd44c3ab6cb2aa94699d99e`**, application **08.29** — matching the authoritative baseline exactly. Hadith integrated at `43dd96f`. Deployment NOT DONE.

---

## 2. Defect 1 — the authorization vocabulary

**One letter, and five real decisions were reported as still outstanding.** The ledger recorded `AUTHORIZED`; guard E tested `t.status === "AUTHORISED"`. No match, so all five Hadith touches fell to the default branch and printed, every run:

```
NOTE [E] stream hadith modifies shared file CLAUDE.md
         -- DECLARED, awaiting Master Architect decision
```

A decision the Master Architect had already made, shown as pending. Worse than a typo: the guard's output was actively misleading about governance state.

**The repair is a closed vocabulary rather than a second spelling.**

| | |
|---|---|
| Statuses | `DECLARED` \| `AUTHORIZED` — **closed**. Any other token **fails by name** |
| `DECLARED` | Disclosed, awaiting the Master Architect's decision. Reported as such and never described as authorized |
| `AUTHORIZED` | Requires `authorization: { by, on, reference }` |
| `by` | From a closed authority set (`master-architect`) — **a module cannot authorise itself** |
| `on` | `YYYY-MM-DD`, validated |
| `reference` | A record that **exists**, checked on disk or on the stream's branch — an authorization must be traceable |

Failing by name is the point: a near-miss like `AUTHORISED` is now loud, where before it silently downgraded. The five existing free-text `authorisedBy` strings were migrated to the structured form, with the original text preserved as `authorizationRecordedAs`.

### 2.1 The positive control then found a second gap

Asked to show an AUTHORIZED touch, the guard returned only DECLARED ones. **Guard E reported from the branch diff, and a merged stream's branch shows no changed paths** — so every authorisation would vanish from the output the moment it landed, exactly when the record matters most. Validation and reporting now run over the touch **records**; the branch diff is only what proves a touch is disclosed rather than hidden.

```
PASS [E] 12 shared-file touch record(s): 5 AUTHORIZED, 7 DECLARED (awaiting decision).
         7 live modification(s) seen across declared branches, 0 undeclared
```

**Coverage added:** 2 positive controls (an AUTHORIZED touch is reported as authorized; **no DECLARED touch is ever described as authorized**, and each says it is awaiting a decision) and **7 negative mutations** — the exact `AUTHORISED` spelling, an undefined token, a DECLARED touch promoted with no metadata, a missing `reference`, a module authorising itself, a non-date date, and a citation to a record that does not exist. Plus a control for the records disappearing entirely.

---

## 3. Defect 2 — Quran v08.27 still marked LIVE

`LIVE` means the version `main`'s `version.js` carries. `main` carries **08.29**, so the mark was simply untrue.

- **v08.27 (quran) → `RELEASED`** — a prior main milestone, what main carried and served from 18 Sep until `43dd96f`. **Shipped; superseded, not withdrawn.** The fact is preserved in the note, not erased.
- **v08.29 (hadith) → `LIVE`.**
- **v08.28 (hadith) → `HISTORICAL`, `forwardAllocation: false`** — stamped at `7f61328` and consumed en route; main never carried it alone, and it is not available for re-allocation.

**The vocabulary is now enforced, not merely described.** Guard A: **exactly one allocation may be LIVE, and it must equal `main.version`.** That check is what would have caught this, and two mutations prove it fails (a superseded milestone left LIVE; two LIVE at once).

**No deployment is claimed.** A new `deployment` block records `firestoreRules: NOT_DONE`, `firestoreIndexes: NOT_DONE`, blocked on E1 — *"recorded as NOT DONE because it has not been proven done"* — and `versionVocabulary` states explicitly that **none** of the five statuses says anything about Firestore deployment. GitHub Pages serving `main` is a separate matter and is not asserted beyond what was measured.

---

## 4. Defect 3 — two stale mutation preconditions

Both reported themselves **UNPROVEN** rather than passing vacuously, which is the behaviour they were built for.

| Mutation | Why it stopped working | Repair — **not** a weakening |
|---|---|---|
| **A** "a second stream claims the LIVE version" | Hard-coded `owner: "hadith"` onto `main.version`, which Hadith now owns. One owner, no collision | Derives the rival: whichever stream does **not** hold that version. Asserts a rival exists, so fixture drift fails loudly |
| **C** "the brief predicts a merge number for the held branch" | Hard-coded 08.28 as "ahead of main"; main reached 08.29, so it was history, not a prediction | Takes a version another stream claims and moves `main.version` **below** it, modelling the situation the guard is for. The regex no longer names a specific stream or number |

Both now exercise their intended guard paths against the **general** programme state rather than one day's arithmetic.

### 4.1 Guard C was refined by a true finding

Registering the corrected allocations made guard C fail: *"the ledger records hadith's historical stamp as 08.28; feature/hadith-study actually carries 08.29."* The guard compared a historical stamp against the **branch tip** — right for a single stamp that never moved (the held Phase 4 wiring), wrong the moment a stream stamps twice on its way in, as Hadith did. It now reads the version at **the commit the stamp names** (`stampedAt` / `commit`), falling back to the tip only for a stamp that names none. **Strictly stronger:** it verifies each stamp where it actually lives.

---

## 5. Terminology — MMSA

Applied to **current** governance only: `CLAUDE.md`'s header, `docs/governance/README.md`, and the ledger's new `programme` block.

| Term | Means |
|---|---|
| **MMSA** | The umbrella integrated Study App / platform. This repository is the MMSA platform repository |
| **QuranRevival** | The **Quran Study module only** — not the platform, not the umbrella |
| **Hadith Study** | The Hadith module |
| **Health Study** | The Health module |
| *future subjects* | Separate subject modules integrated into MMSA |

**Historical reports were not rewritten**, and **no application file, route or product branding was renamed.** `CLAUDE.md` records that older text using "QuranRevival" for the whole platform is to be read that way, rather than being mass-edited.

---

## 6. Active module streams registered

| Stream | State |
|---|---|
| `mmsa-platform` | **ON_MAIN.** The umbrella: shared runtime, shared verification, governance, version allocation, integration. **No branch — it IS main**, so it carries no baseline SHA of its own to go stale; `main.baselineSha` is recorded once and checked as an *ancestor* |
| `quran` | QuranRevival — Quran Study module. MERGED_TO_MAIN |
| `quran-phase4-wiring` | **HELD** at `7e2931f`. Historical `v08.26` stamp, `forwardAllocation: false` |
| `hadith` | Hadith Study module. Integrated at `43dd96f`, v08.29 |
| `health` | **`EXTERNAL_PENDING_ACQUISITION`** |

**Health holds no invented detail.** Repository, branch tip and version are recorded as **`UNKNOWN`** because they are unknown; `declaredVersion` and `baselineSha` are `null`; `ownedPaths` is empty. Its note says plainly that it exists in a separate development account, that no Health implementation exists in this repository and none was created, and that acquiring it is a Master Architect action. The guards have nothing to check it against and correctly check nothing.

---

## 7. Verification

| Suite | Result |
|---|---|
| `programme-ledger.mjs` | **7 passed, 14 noted, 0 failed — EXIT 0** |
| `programme-ledger-mutations.mjs` | **37 passed, 0 failed — EXIT 0** (was 23/2) |
| `brief-integrity.mjs` | **8 passed, 0 failed — EXIT 0** |
| `stub-parity.mjs` | **3 passed, 0 failed — EXIT 0** |
| `rules-authorisation-executable.mjs` | **38 passed, 0 failed — EXIT 0** |
| `rules-deployment-candidate.mjs` | **10 passed, 0 failed — EXIT 0** |
| `firestore-index-requirements.mjs` | **8 passed, 0 failed — EXIT 0** |
| `study-approach-contract-boundary.mjs` | **16 passed, 0 failed — EXIT 0** |
| `note-foundation-boundary.mjs` | **30 passed, 0 failed — EXIT 0** |
| `journey-map-boundary.mjs` | **13 passed, 0 failed — EXIT 0** |
| `study-note-boundary.mjs` | **17 passed, 0 failed — EXIT 0** |
| `d14-timezone-boundary.mjs` | **10 passed, 0 failed — EXIT 0** |
| `d14-timezone-contract.mjs` | **21 passed, 0 failed — EXIT 0** |
| `navcheck.mjs` (live boot) | **EXIT 0** |

**Mutation breakdown (37):** A×4, B×2, C×4, D×4, **E×7 authorization negatives**, F×5, CONTROL×3, plus 2 suite-level positive controls and 2 authorization positive controls, and 4 pre-existing E/D cases. The unmutated baseline check remains — without it, a guard failing on everything would pass every mutation.

### Proven, not asserted

| Claim | Evidence |
|---|---|
| No reachable `app/` change | `git diff a4b9be3 HEAD -- app/` **empty** |
| Version remains v08.29 | `APP_VERSION = "08.29"`; `version.js` not in the diff |
| Rules / Firebase config unchanged | `git diff a4b9be3 HEAD -- firestore.rules firebase.json tests/ docs/governance/*.rules docs/governance/*indexes*.json` **empty** |
| 08.30 not allocated | Only `nextUnallocated` names it; guard B fails anything claiming it |
| D14 unreachable | `d14-timezone-boundary` 10/0 |
| Phase 4 not resumed | `7e2931f` not an ancestor of `main`; branch untouched |
| No Health implementation | No `health` file created anywhere; stream is metadata only |
| Nothing deployed | No credentials in this sandbox; no deployment attempted |

---

## MMSA_PROGRAMME_CONTROL

```
BASE_MAIN_SHA=a4b9be3b65dce57a3fd44c3ab6cb2aa94699d99e
FINAL_MAIN_SHA=4433cb310e5fe4bfb30cd4aeca68942f2f6be077
APP_VERSION=v08.29
MUTATIONS=37_PASSED_0_FAILED_WAS_23_PASS_2_FAIL
AUTHORIZED_VOCABULARY=CLOSED_SET_DECLARED_XOR_AUTHORIZED;AUTHORIZED_REQUIRES_by_on_reference;UNKNOWN_TOKEN_FAILS_BY_NAME
AUTHORIZATION_NEGATIVE_CONTROL=7_MUTATIONS_ALL_CAUGHT(AUTHORISED_MISSPELLING,UNDEFINED_TOKEN,PROMOTED_WITHOUT_METADATA,MISSING_REFERENCE,SELF_AUTHORISING_MODULE,INVALID_DATE,NONEXISTENT_REFERENCE)
QURAN_V0827_STATUS=RELEASED_PRIOR_MAIN_MILESTONE_NOT_LIVE_NOT_WITHDRAWN
MMSA_TERMINOLOGY=UMBRELLA_PLATFORM_APPLIED_TO_CURRENT_GOVERNANCE_ONLY
QURANREVIVAL_TERMINOLOGY=QURAN_STUDY_MODULE_ONLY
HADITH_STATUS=INTEGRATED_43dd96f_v08.29_LIVE_ON_MAIN
HEALTH_STATUS=EXTERNAL_PENDING_ACQUISITION_REPO_SHA_VERSION_ALL_UNKNOWN_NOT_INVENTED
APP_BEHAVIOUR_CHANGE=NO
RULES_CHANGED=NO
DEPLOYED=NO
NEXT_UNALLOCATED=v08.30+
READY_FOR_PARALLEL_MODULE_WORK=YES
```

**A note on `FINAL_MAIN_SHA`:** it names the commit carrying the whole repair. The commit that stamps the value necessarily sits one ahead of the SHA it records — a commit cannot contain its own hash — and changes this report and nothing else.

**READY_FOR_PARALLEL_MODULE_WORK = YES.** The ledger represents all five streams, the vocabulary distinguishes a disclosed touch from an authorised one with metadata that must check out, `LIVE` is bound to `main`, and every guard path is mutation-proven. Two things stay the Master Architect's: the seven **DECLARED** Phase 4 touches still awaiting a decision, and Health's acquisition.

---

Stopping after delivery. No further tranche started.
