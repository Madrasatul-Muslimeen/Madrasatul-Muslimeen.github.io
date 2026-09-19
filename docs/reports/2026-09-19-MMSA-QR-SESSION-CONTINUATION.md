# Claude-MMSA / QuranRevival — session continuation

**Issued:** 19 September 2026
**Supersedes:** `docs/reports/2026-09-19-MMSA-QR-CONTINUATION-PACKAGE.md`, which stopped at `main` `db6cb24` / v08.30 and is now history. Where the two disagree, this file wins.
**Read `CLAUDE.md` first, then this.** The brief is the standing law; this file is the deterministic state.

---

## 1. Verified state

| | |
|---|---|
| **`origin/main` when this file's state was measured** | **`e551c23467ce8eda0e2dafa9dfb474a12bffc690`** — fetched and read back, not quoted from an earlier report |
| **`origin/main` now** | **`972596d906eab6b65d41ad7b3b338630c499bc9a`** — the commit carrying this continuation. Per this repository's convention the stamping commit sits one ahead of the SHA it records, because a commit cannot contain its own hash. **Nothing in §1–§9 changed**: that commit adds these two report files and nothing else |
| `main` tip subject | *Stamp FINAL_REMOTE_MAIN into the D3 integration report* |
| **Application version** | **v08.31** — `app/js/version.js` on the remote reads `export const APP_VERSION = "08.31";` |
| **Next unallocated version** | **08.32 — UNALLOCATED.** A boundary marker, not an allocation. Guard B refuses anyone who stamps it |
| Working tree | clean |
| Local `main` | identical to `origin/main` |

**Everything in this section was read off `origin/main` itself**, not off a working tree that happens to resemble it.

### The last four commits on `main`

```
e551c23  Stamp FINAL_REMOTE_MAIN into the D3 integration report
66e6e6b  D3 integration report: the dated .md and .html
22777fc  Merge origin/main (c26c711 -- SCR-HADITH-02 integrated) into the D3 branch   <- THE D3 INTEGRATION
c26c711  Hadith: SCR-HADITH-02 integration report
```

---

## 2. D3 integration — DONE

The D3 Journaling chokepoint repair is **integrated into `main`**.

| | |
|---|---|
| Original D3 work commit | `57a73a8b7664c9818c3814e495e4abdeebaf608f` |
| Reconciled candidate | `22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8` |
| Integration commit | `22777fc…` — a **fast-forward**, so the candidate *is* the integration commit |
| Pre-integration `main` | `c26c711026320385e6a2e7c29019908cbc21084b` |

**What it changed.** `app/js/study-note-service.js` used to import the Activity evidence store and call `writeStudyActivityEvidence()` **directly, around v08.31's persistence-readiness gate**. It now calls `recordStudyEvidence()`, and the boundary suite's `KNOWN_UNREACHABLE_CALLER` exception is **removed rather than widened** — the importer set is asserted to be exactly `[study-event-wiring.js]`.

**Why it mattered even though nothing was reachable.** The claim *"`recordStudyEvidence()` is the ONE chokepoint"* rested on the module being page-unreachable, not on the code. A claim resting on unreachability expires **silently** the day somebody wires the surface. It now rests on the code, with a mutation harness proving the guard refuses the old bypass.

**Two defects it exposed, both in already-accepted code:**

1. **`tools/i18n-verify/study-event-wiring.mjs` had been DEAD since v08.31's own accepted commit `65ef3c5`.** That commit added a third import to the module the suite loads; the harness rewrote two, so the surviving relative specifier threw `ERR_INVALID_URL` **at module load** — exit 1, stack trace, **no `FAIL` line**. The chokepoint's own unit suite asserted **nothing** for the whole of its existence. Repaired: **0 executing checks → 41**, plus the leftover assertion that would have caught it the same day.
2. **An assertion in the accepted boundary guard could not fail.** It sliced the chokepoint's body to end-of-file, where two helpers re-export the readiness predicate, so *"no longer consults readiness"* was unfailable. Found by a mutation returning UNPROVEN. Bounded at the next top-level `export`, with a positive control.

Full account: `docs/reports/2026-09-19-quranrevival-d3-main-integration.md` and `.html`.

---

## 3. The four deployment states — record them separately, always

Collapsing these into one boolean is the specific mistake this programme corrected on 19 September, and **guard G** in `tools/i18n-verify/programme-ledger.mjs` now enforces the separation.

| State | Value | Basis |
|---|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** | `main` carries v08.31 and the D3 repair |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN** — `verified: false` | **PRESUMED, NOT MEASURED.** The sandbox proxy refuses `CONNECT` to `github.io`; confirmed first-hand — `curl: (56) CONNECT tunnel failed, response 403`. This rests on the brief's own record |
| `FIREBASE_RULES_DEPLOYED` | **NO** | E1 closed. `firestore.rules` on `main` contains the word `evidence` **zero** times; `firebase.json` declares **no** `indexes` key |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** | The evidence subcollection has no rule, so every client write is denied |

**Merged is not deployed, and served is not operational.** `main` being served does not make the Phase 4 feature work for anybody.

### Evidence readiness — CLOSED

`app/js/study-evidence-readiness.js` on `main` declares `ready: false`, `decision: null`.

It **cannot infer readiness from `firestore.rules`** — the module imports **nothing at all**, and the inability is the enforcement. Flipping `ready` to `true` alone returns false: a well-formed `decision` from a closed authority set is also required, **and** guard G fails if the source declares ready while the ledger records the Rules as not deployed. **Enabling it is a governed decision in two files at once, not an edit.**

### E1 — CLOSED

Authenticated Firebase Console access to the `study-monitoring` project. `firebase` reports *"Failed to authenticate"*; the Rules API returns 403. **Seven ledger items depend on it.**

---

## 4. Remaining D3 / Phase 5 product work

D3 Journaling is now correctly *plumbed*. It is not *usable*, and the gap is honest rather than hidden.

| Item | State |
|---|---|
| **A page-reachable producer for D3** | **Does not exist.** No page under `app/` imports `study-note-service.js`; reachable from **0 of 29 pages** |
| **P5-D — the Note editor surface** | **NOT BUILT.** There is no Note editor page or module on `main`. It is the surface that would let anyone create or revise a Note at all |
| Why P5-D is held | Every write it makes needs the **Note Foundation Rules AND the composite indexes** deployed. Both ride E1 |
| The four composite indexes | Candidates only — `phase5-note-foundation-indexes-candidate-2026-09-15.json`, `phase6-journey-map-indexes-candidate-2026-09-17.json`. `firebase.json` still declares none |
| Guardian approval window (GUARD-05/06/07) | **Deliberately not implemented.** Every guardian content edit is denied outright — stricter than the accepted design, and recorded rather than faked |
| Server-side folder-cycle prevention | Recorded, not adopted. Its cost is forbidding folder moves, which is a product decision |

**So the D3 chokepoint work is foundation, not feature.** When P5-D is eventually built, it inherits a gated path instead of a bypass someone must remember to close — which was the whole point.

---

## 5. Verification exceptions a new session must not mislabel

### 5.1 `22g` — a TEST HARNESS DEFECT, not a network failure

**`CLAUDE.md` still describes `22g × 3` as "the environmental archive.org poster block". That label is wrong, and it was disproved by measurement on 19 September.**

`app/js/asma-study.js:839`:

```js
screensaverIndex = Math.floor(Math.random() * screensaverDeck.length);
showScreensaverSlide();
```

`buildScreensaverDeck()` returns `[...93 photo slides, ...~99+ Name-poster slides]`. A **photo** slide renders `.asma-screensaver-img` with an `archive.org` `src`; a **Name** slide renders `.asma-poster.asma-poster-screensaver` instead. `22g`'s three checks assert the photo shape **unconditionally**.

**Measured:** 14 consecutive opens gave **4 photo, 10 Name-poster, 0 empty** — a mixture, on one unchanged build, in one browser session. The page made **zero `archive.org` requests** and had **zero failed requests**: nothing was blocked, because nothing was asked for.

**Confirmed across runs on byte-identical code:** clean `main` `c26c711` scored **978 / 4** with `22g × 3` failing, while the D3 candidate scored **980 / 2** with `22g` **passing**. The Asma path is 0 files different between them.

**The application is correct** — a Name poster is a legitimate screensaver slide. **The test was never updated** to accept the second shape when that round added it.

**Not fixed.** `tools/i18n-verify/behaviour.mjs` is a **platform-shared** path and no authorisation has covered it. The fix is small and has two obvious shapes: accept either slide, or make the starting index deterministic under test.

**Do not record `22g` as environmental.** Doing so teaches every future session to dismiss a real defect as the network — which is exactly what happened for as long as the label stood.

### 5.2 `31e` (and `22h`) — genuinely environmental, TLS

Both fail with **`console: Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID`** — this sandbox's TLS interception presenting a certificate Chromium will not trust, on pages that fetch over HTTPS. Neither asserts application behaviour; each is a page-error sweep that the interception trips.

`31e` reproduces on clean `main`. `22h` reproduces on `a20892f`, a commit that predates the D3 branch entirely.

**Never reach for `--ignore-certificate-errors`** — it would also hide a real certificate problem.

**Consequence a new session must internalise: `behaviour.mjs` CANNOT exit 0 in this sandbox**, because `31e` fails unconditionally on every run of every commit. **An exit-code standard would make integration permanently impossible.** The standard that works is: *compare every failure against clean `main`, and require no new application or test failure.* **Record the suite as "exit 1, N passed / M failed" — never as green.**

### 5.3 `panel.mjs bn` — the O3c Owner UI decision

**`panel.mjs bn` exits 1 with 6 problems, and it is an OPEN OWNER DECISION, not a defect to fix.**

`#drillModeSelect` is truncated in **Bangla** at six viewport/unit combinations: *"প্রতিটি আয়াত"*, **48px usable against 54px needed** — 6px short. **English is clean.**

Found 19 September by running `panel.mjs` in Bangla, and **proven pre-existing** by reverting `app/` to the accepted v08.30 build (`8ea445fb`) and getting the identical six.

It joins **O3** (`tenantSelect`, 224px of text in a 145px cell) and **O3b** (`surahSelect` / `unitTypeSelect` at 320px, the row genuinely short by 63.9px in Range). All three are **materially different choices** — widen the cell, shorten the wording in both languages, or reveal the value without widening — on the most tightly measured screen in the app. **None is Claude's to settle.**

**Process lesson attached to it:** `panel.mjs` takes a language argument and routine verification had only ever run one. **Run both. A suite run in one language is measuring one language.**

---

## 6. Shared-file ownership — read this before touching anything

`docs/governance/programme-integration-ledger.json` is the record; `tools/i18n-verify/programme-ledger.mjs` guard E is the check. A modification to a shared path **must be declared**, and an undeclared one fails.

### Platform-shared — never edit without explicit authorisation

| Path | Owner |
|---|---|
| `app/js/version.js` | **master-architect** — no stream allocates a number for itself |
| `CLAUDE.md`, `CHANGELOG.md` | platform |
| `app/js/i18n/bn.js` | platform — every module adds keys to one file |
| `tools/i18n-verify/behaviour.mjs` | platform — **this is why `22g` was reported, not fixed** |
| `tools/i18n-verify/harness.mjs`, `firebase-stub.mjs`, `brief-integrity.mjs` | platform |
| `tools/i18n-verify/programme-ledger.mjs`, `programme-ledger-mutations.mjs` | platform — **SCR-HADITH-02 lived here** |
| `docs/governance/programme-integration-ledger.json` | platform |
| `app/js/nav.js`, `unit-keys.js`, `records.js`, `activity.js`, `catalogue-data.js`, `app/css/shell.css` | platform |

### Deployment / security shared

`firestore.rules` · `firebase.json` · `docs/governance/*.rules` · `docs/governance/*-indexes-candidate-*.json` · `tests/firestore/*` · `tools/firestore-emulator/*`

### Quran-stream owned — the D3 work lived entirely here

`app/quranrevival.html` · `app/js/quran-*.js` · `ayah-*.js` · `qcr*.js` · `mastery-wheel.js` · `study-approach-contract.js` · `study-activity-evidence*.js` · `study-note-*.js` · `note-foundation*.js` · `journey-map-*.js` · `timezone-*.js` · `study-event-wiring.js` · `study-evidence-readiness.js` · and under `tools/i18n-verify/`: `quran-*.mjs`, `study-*.mjs`, `note-*.mjs`, `journey-map-*.mjs`, `d14-*.mjs`

**The practical rule that kept this session clean:** two separate streams worked the same repository on the same day without one conflict, because each stayed inside its own path family and declared every shared touch. **When a fix belongs to a shared file, report it and let its owner take it** — that is how SCR-HADITH-02 and the `22g` defect were both handled.

---

## 7. THE EXACT NEXT RECOMMENDED TASK

### It is not a coding task, and that is the finding

**Deploy the Phase 4–6 Firestore Rules and the four composite indexes to `study-monitoring`, through the Firebase Console — indexes FIRST, then the Rules.**

| | |
|---|---|
| Owner-facing instructions | `docs/governance/phase4-6-production-deployment-package-2026-09-17.md` |
| The **only** file to paste | `docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` |
| **Never paste** | any `candidate-2026-09-15` file — those are self-contained test **extracts**, and pasting one would replace the entire live ruleset with a file governing three collections |
| Order | **Indexes before Rules.** Rules first would let the new screens ask questions the database then refuses |
| Who can do it | Whoever holds authenticated Console access. **A sandbox session cannot** — E1 |

**Then, and only then**, put the readiness enablement to the Master Architect as a governed decision: `ready: true` plus a well-formed `decision` in `app/js/study-evidence-readiness.js`, **and** `deployment.firebaseRulesDeployed.state = YES` in the ledger. Guard G fails unless both move together.

### What this would make usable for students

Today a student can read, listen and use Word-by-Word, and **none of it is recorded**. The ✓ on `#readBar` is deliberately not actionable and says so in English and Bangla; every evidence write is refused before it is even composed.

Deploying the Rules and indexes, then opening the readiness gate, would make these work **for real people for the first time**:

- **D1 Reading** — an explicit ✓ on an āyah, a range or a whole surah records one Activity evidence document, deduplicated by the database itself.
- **D2 Listening** — ≥80% of the selected unit, with preload, buffering, looping, backward seeks and failure excluded by construction.
- **D4 Word-by-Word** — āyah plus day, on the learner's own action only; a supervisor approving a word records nothing.

That is the Phase 4 Study-event feature the app has been carrying, fully built and fully inert, since v08.30.

### What would STILL block release after that

Deployment is necessary and **not sufficient**. All of the following remain:

1. **D3 Journaling still has no surface.** P5-D, the Note editor, is not built. A student could not create or revise a Note at all — the chokepoint this session repaired would still have no producer.
2. **Three Owner UI decisions are open and student-visible** — **O3** (`tenantSelect`), **O3b** (`surahSelect` / `unitTypeSelect` at 320px), **O3c** (`#drillModeSelect` in Bangla). A Bangla-reading student on a small phone sees cut labels today.
3. **`O4-READBAR-WRAP`** — accepted Owner UI debt. The ✓ costs **33px of reading area** at 390px and 412px, the two commonest phone widths. Three remedies costed, **none chosen**.
4. **Two provisional build defaults are unreviewed** — the Reading Approach inferred from translation visibility (it decides which Approach a person's record credits, from a control they may not connect to it), and juz/hizb/ruku/page recording **no** evidence and saying so. **No evidence was invented to complete tracking**, deliberately.
5. **D14 timezone is unactivated** — the contract modules are on `main` and unreachable by construction; activation needs its own Rules change and rides E1 again.
6. **The guardian approval window is not implemented** — every guardian content edit is denied outright.
7. **`22g` is still a false alarm in the verification suite**, and its label still teaches sessions to dismiss it as the network.
8. **GitHub Pages serving has never been verified from here** — it is `PRESUMED`, and should be confirmed once from a machine that can reach `github.io`.

### If E1 stays closed

**No student-facing feature is buildable**, because every new write path is denied at the database. The highest-value work available is **verification integrity**, and the first item is the **`22g` harness repair** (§5.1) — a small, platform-shared change needing its own authorisation, in the same shape as SCR-HADITH-02.

**Do not allocate v08.32.** Read the allocation off the Master Architect at the time, never off arithmetic.

---

## 8. Things a new session will get wrong unless it reads this

1. **Merged is not deployed, and served is not operational.** Four states, four records.
2. **A version bump on a branch is not a version on `main`.** `brief-integrity.mjs` checks the milestone line against `origin/main:app/js/version.js`.
3. **`behaviour.mjs` cannot exit 0 here.** Compare failures against clean `main`; never call the suite green.
4. **`22g` is a harness defect, not the network.** §5.1.
5. **Run `panel.mjs` in BOTH languages.** That is how O3c went unrecorded.
6. **A grep cannot see an uncaught throw.** Read exit codes *and* the real text — `study-event-wiring.mjs` died silently for a whole version that way.
7. **An UNPROVEN mutation is a finding about the guard**, to be chased. Two real defects in this session were found exactly that way.
8. **A mutation harness must never reach for `git`.** Back up in memory; commit before mutating.
9. **Delete `app/_prev-quranrevival.html` before reading a coverage total**, and never commit it.
10. **Run every `tools/i18n-verify` suite from the REPOSITORY ROOT** — they resolve paths from `process.cwd()` and fail confusingly otherwise.
11. **Verify a reported SHA before using it.** The last ruling's `main` SHA was one commit stale; checking took seconds.

---

## 9. Baseline — what a clean run looks like on `e551c23`

| Suite | Result |
|---|---|
| `programme-ledger` (A–G) | 8 passed / 23 noted / **0 failed** |
| `programme-ledger-mutations` | **49 passed, 0 failed** |
| `brief-integrity` | 8 / 0 |
| `study-activity-evidence-boundary` | **27 / 0** |
| `study-activity-evidence-boundary-mutations` | **11 / 0** |
| `study-event-wiring` | **41 / 0** |
| `study-note-service` | 35 |
| `quran-boundary` | 30 / 0 |
| `hadith-corpus` · `-source-rights` · `-commentary-binding` | 33 · 14 · 14 |
| `hadith-gate-contracts` · `-governing-contracts` | 11 · 14 |
| `rules-authorisation-executable` | 38 / 0 |
| `note-foundation-boundary` · `journey-map-boundary` · `d14-timezone-boundary` | 30 · 13 · 10 |
| `layout.mjs` | NO LAYOUT REGRESSIONS, `getElementById` 253, **0 dangling**, 22 deferred |
| `navcheck.mjs` · `panel.mjs en` · `reading.mjs` | exit 0 |
| **`panel.mjs bn`** | **exit 1 — 6 × `#drillModeSelect`, the O3c Owner decision** |
| **`behaviour.mjs`** | **exit 1 — 982 checks; 978/4 or 980/2 depending on the `22g` coin flip** |
| `i18n-coverage` | 1,879 scanned / 1,818 Bangla / **61 missing** |
| Phase 4 emulator | 53 assertions, 0 failures (`firebase emulators:exec`) |

Playwright is not installed by default. `npm install playwright --no-save`, then run with `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, and start `node serve.js` first. Running the emulator suite prunes one `extraneous` entry from `tools/firestore-emulator/package-lock.json` — **restore it before committing**.

---

## 10. State block

```
MMSA_QR_SESSION_CONTINUATION
ISSUED=2026-09-19
SUPERSEDES=docs/reports/2026-09-19-MMSA-QR-CONTINUATION-PACKAGE.md
MAIN_SHA_AT_MEASUREMENT=e551c23467ce8eda0e2dafa9dfb474a12bffc690
MAIN_SHA=972596d906eab6b65d41ad7b3b338630c499bc9a (the commit carrying this continuation; docs-only above e551c23)
MAIN_VERSION=08.31
D3_INTEGRATION=DONE -- fast-forward at 22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8
D3_WORK_COMMIT=57a73a8b7664c9818c3814e495e4abdeebaf608f
PRE_INTEGRATION_MAIN=c26c711026320385e6a2e7c29019908cbc21084b
V0832_STATUS=UNALLOCATED
EVIDENCE_READINESS=CLOSED (ready:false literal, decision:null; enabling needs code AND ledger together)
E1_STATUS=CLOSED (no authenticated study-monitoring Console access)
APPLICATION_CODE_INTEGRATED=YES
GITHUB_PAGES_SERVING=PRESUMED_FROM_MAIN (verified:false -- proxy refuses github.io, 403)
FIREBASE_RULES_DEPLOYED=NO (firestore.rules names `evidence` 0 times)
EVIDENCE_RECORDING_OPERATIONAL=NO
APP_DEPLOYED=NO
D3_PRODUCT_GAP=no page-reachable producer; P5-D Note editor NOT BUILT; blocked by E1 (Rules AND indexes)
TEST_DEFECT_22g=RANDOM-SLIDE HARNESS DEFECT, NOT environmental. behaviour.mjs is platform-shared; reported, not fixed
TLS_EXCEPTION_31e=environmental, net::ERR_CERT_AUTHORITY_INVALID; reproduces on clean main; 22h same class
BEHAVIOUR_CANNOT_EXIT_0=TRUE -- compare against clean main; never report the suite as green
OWNER_UI_DECISIONS=O3, O3b, O3c, O4-READBAR-WRAP -- none is Claude's to settle
OWNER_REVIEW_DEFAULTS=Reading Approach inferred from translation visibility; juz/hizb/ruku/page record NO evidence
DEFERRED_NOT_AUTHORISED=SCR-01, DR-01
NEXT_TASK=deploy four indexes THEN the assembled Rules via Firebase Console (E1), then put readiness enablement as a governed decision
NEXT_TASK_FILE=docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules
NEVER_PASTE=any docs/governance/*candidate-2026-09-15*.rules file
NEXT_TASK_IF_E1_CLOSED=22g harness repair (platform-shared, needs its own authorisation)
MAKES_USABLE=D1 Reading, D2 Listening, D4 Word-by-Word recording for real people for the first time
STILL_BLOCKS_RELEASE=P5-D unbuilt; O3/O3b/O3c/O4; two provisional defaults unreviewed; D14 unactivated; guardian window absent; 22g false alarm; Pages serving unverified
READY_TO_SHIP=NO
```
