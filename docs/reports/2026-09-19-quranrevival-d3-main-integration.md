# QuranRevival D3 chokepoint — integration into `main`

**Date:** 19 September 2026
**Ruling executed:** *Proceed with the D3 chokepoint integration. … require programme-ledger mutations 49/0, programme-ledger zero failures, and the repaired study-event-wiring suite 41/0. Compare browser failures with the documented baseline; do not label a test harness defect environmental.*
**Result:** integrated. **App version stays `08.31`, `08.32` stays UNALLOCATED, evidence readiness stays closed, and nothing was deployed.**

---

## 1. The SHAs, each reported separately

| | |
|---|---|
| **Pre-integration `main`** | **`c26c711026320385e6a2e7c29019908cbc21084b`** |
| **D3 work commit** | **`57a73a8b7664c9818c3814e495e4abdeebaf608f`** |
| **Reconciled candidate** | **`22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8`** |
| **Integration commit** | **`22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8`** — the integration was a **fast-forward**, so the candidate *is* the integration commit. No merge commit was created, and none is invented here to make the table look fuller |
| **Final remote `main`** | **`22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8`** — re-fetched and read back after the push |

Supporting commits, so the chain is readable rather than implied: the D3 tip as first accepted was `3adc853`; `d46bed0` and `22777fc` are the two reconciliation merges (against `b295ea8` and against `c26c711`); `c69ccf7` is the authorised documentation-only entry; `65b7620` is the integration-candidate report.

---

## 2. FINDING — the reported `main` SHA was already stale, and the ruling anticipated it

The ruling reported SCR-HADITH-02's `main` as `35d51e6eabb3d01fd5046760cb2d9f3c1886f80c` and told me to verify the actual remote first. **It had advanced.** `origin/main` was **`c26c711`**, one commit ahead.

**The advance is report-only, established by reading the diff rather than trusting the commit subject:** `git diff 35d51e6 c26c711` is exactly two files, `docs/reports/2026-09-19-hadith-scr02-integration.{md,html}`. No code, no ledger, no tooling. So `c26c711` was the correct base and the verification below was performed against it.

**The SCR-HADITH-02 fix is what this branch's own candidate report diagnosed.** `d55f82f` changes one expression in `programme-ledger-mutations.mjs`:

```js
- const s = l.streams.find((x) => x.id === "hadith");
+ const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);
```

— deriving the subject from the ledger, the shape guard B's own mutations already used. The mutation harness returns to **49 passed, 0 failed.**

---

## 3. The exact integration diff

Eleven files. **Nothing else.**

| Kind | Files |
|---|---|
| Application — **one page-unreachable module** | `app/js/study-note-service.js` |
| Verification tooling | `tools/i18n-verify/study-activity-evidence-boundary.mjs`, `…-boundary-mutations.mjs` *(new)*, `study-event-wiring.mjs`, `study-note-service.mjs` |
| Shared documents — **expressly authorised** | `CLAUDE.md`, `CHANGELOG.md` |
| Reports | `…-d3-journaling-chokepoint.{md,html}`, `…-d3-integration-candidate.{md,html}` |

**`git diff c26c711 <candidate> -- app/` names exactly one file**, and it is reachable from **0 of 29 pages**.

### The Hadith work is preserved, and it was checked rather than assumed

`git diff origin/main HEAD -- tools/i18n-verify/programme-ledger-mutations.mjs docs/governance/` is **empty**. The SCR-HADITH-02 fix and the programme ledger record arrive on `main` exactly as the Hadith stream left them; this branch modifies neither, and never has.

Both reconciliation merges were **conflict-free by construction**, established by reading the two change sets before merging: the Hadith advances touched the ledger, the mutation harness and six reports; this branch touches a study module, four `study-*` suites, the two shared documents and its own reports. No path is common to both.

---

## 4. The three explicitly required gates

| Required | Target | Measured | |
|---|---|---|---|
| `programme-ledger-mutations` | **49 / 0** | **49 passed, 0 failed** | ✓ exit 0 |
| `programme-ledger` | **zero failures** | **8 passed, 23 noted, 0 failed** | ✓ exit 0 |
| `study-event-wiring` | **41 / 0** | **41 passed, 0 failed** | ✓ exit 0 |

`study-event-wiring`'s 41 is the number that matters most here: that suite executed **zero** checks between v08.31's own accepted commit `65ef3c5` and this branch's repair, because a third import was added to the module it loads and the harness rewrote only two — it threw `ERR_INVALID_URL` at load, exiting 1 with a stack trace and no `FAIL` line.

---

## 5. Every other gate

### 5.1 Pure

| Suite | Result |
|---|---|
| `study-activity-evidence-boundary` | **27 / 0** |
| `study-activity-evidence-boundary-mutations` *(new)* | **11 / 0** |
| `study-note-service` | **35** |
| `brief-integrity` | 8 / 0 |
| `study-note-boundary` · `study-note-binding` | 17 · 16 |
| `note-foundation-boundary` · `note-journal-evidence` | 30 · 18 |
| `study-activity-evidence` · `-id` · `-store` | 11 · 29 · 26 |
| `study-approach-contract` · `-boundary` | 13 · 16 |
| **`quran-boundary`** | **30 / 0** |
| `journey-map-boundary` · `-contract` · `-service` | 13 · 34 · 18 |
| `d14-timezone-boundary` · `-contract` | 10 · 21 |
| **`hadith-corpus` · `-source-rights` · `-commentary-binding`** | **33 · 14 · 14** |
| **`hadith-gate-contracts` · `-governing-contracts`** | **11 · 14** |
| `rules-authorisation-executable` | 38 / 0 |
| `rules-deployment-candidate` · `firestore-index-requirements` · `stub-parity` | 10 · 8 · 3 |

All exit 0. The Hadith stream's own two newer guards were run as well as its three established ones — a reconciliation that did not run what it merged would not have checked it.

### 5.2 Rendered

| Suite | Result | Exit |
|---|---|---|
| `layout.mjs` (shim built from `c26c711`) | **NO LAYOUT REGRESSIONS** | 0 |
| `navcheck.mjs` | nav fits in both languages at every width | 0 |
| `panel.mjs en` | PANEL OK apart from the known baseline | 0 |
| `panel.mjs bn` | **6 PROBLEM(S)** — the **O3c** baseline, 6 × `#drillModeSelect` | 1 |
| `reading.mjs` | READING SCREEN OK | 0 |
| `i18n-coverage.mjs` | **1,879 scanned / 1,818 Bangla / 61 missing** — unchanged | 0 |
| `behaviour.mjs` | **980 passed, 2 failed**, 56 sections (982 checks) | **1 — NOT GREEN, see §6** |

`layout.mjs` was run against a shim built from the **new** `main`, so it answers the question a reconciliation must answer — did the Hadith advance and this branch together move anything on the landing page — rather than repeating an older comparison. They did not. The shim was deleted before the coverage total was read.

### 5.3 The emulator surface

`git diff origin/main HEAD -- firestore.rules firebase.json firestore.indexes.json tests/ tools/firestore-emulator/ docs/governance/` is **empty**, so the Phase 4 emulator result (53 assertions, 0 failures) cannot have moved and was not re-run. That is a stronger statement than a repeat run.

---

## 6. THE BROWSER SUITE — exit 1, and the two failures recorded separately

**980 passed, 2 failed, 56 sections — exit 1.** The suite is **not green and is not described as green.** Its two failures are `22h` and `31e`, both `net::ERR_CERT_AUTHORITY_INVALID`.

### The failure-by-failure comparison against clean `main`

`behaviour.mjs` was run against **clean `main` at `c26c711`** in a detached worktree served on its own — verified serving main's code, not the candidate's, by reading back `study-note-service.js` and finding the pre-D3 direct store import still in it.

| Run | Code under test | Result | Failures |
|---|---|---|---|
| 1 | `a20892f` — v08.31 integration, **predates D3** | 980 / 2 | `22h`, `31e` |
| 2 | D3 branch, pre-reconciliation | 978 / 4 | `22g` x3, `31e` |
| 3 | D3 reconciled against `b295ea8` | 978 / 4 | `22g` x3, `31e` |
| 4 | **clean `main` `c26c711`** | **978 / 4** | **`22g` x3, `31e`** |
| 5 | **candidate `22777fc`** | **980 / 2** | **`22h`, `31e`** |

Every run: 982 checks, 56 sections, exit 1.

- **`31e` fails in all five.** Reproduced on clean `main`.
- **`22g` fails on clean `main` and PASSES on the candidate.** The candidate is not worse; the defect is `main`'s.
- **`22h` fails on the candidate and on `a20892f`**, a commit that predates the D3 branch entirely. It cannot be D3's.
- **No application failure in any run**, and the candidate carries **fewer** failures than clean `main` (2 against 4).

**There is no new application or test failure**, which is the condition the ruling set for integration.

### 6.1 `22g` — a reproduced, pre-existing RANDOM-SLIDE HARNESS DEFECT, not a network failure

The ruling said not to label a test harness defect environmental. **Checked, and the standing label in `CLAUDE.md` — "the environmental archive.org poster block" — is wrong.**

**Evidence 1 — no network call is involved at all.** Opening `asma-study.html` and the screensaver, the page's only off-localhost requests are the two Firebase SDK modules. **Zero requests to `archive.org`. Zero failed requests.** Nothing was blocked, because nothing was asked for.

**Evidence 2 — the starting slide is random.** `app/js/asma-study.js:839`:

```js
screensaverIndex = Math.floor(Math.random() * screensaverDeck.length);
showScreensaverSlide();
```

and `buildScreensaverDeck()` returns `[...93 photo slides, ...~99+ Name-poster slides]`. A **photo** slide renders `.asma-screensaver-img` with an `archive.org` `src`; a **Name** slide renders `.asma-poster.asma-poster-screensaver` instead. `22g`'s three checks assert the photo shape **unconditionally**.

**Evidence 3 — measured.** Fourteen consecutive opens: **4 photo, 10 Name-poster, 0 empty.** A mixture, on one unchanged build, in one browser session.

**So `22g` fails on a coin flip**, at roughly the deck's own photo-to-name ratio — which is exactly the "intermittent" pattern the brief recorded and mis-attributed. **The application is correct**: a Name poster is a legitimate screensaver slide, added by the Name-poster round. The **test** was never updated to accept the second shape.

**It is not this branch's, proven rather than asserted.** `git diff origin/main HEAD` names **0** files across `app/js/asma-study.js`, `app/asma-study.html` and `tools/i18n-verify/behaviour.mjs`, and both the random-start line and the three assertions are byte-identical on `main`.

### 6.2 `31e` and `22h` — separately recorded, with their TLS evidence

Both fail with the identical diagnostic: **`console: Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID`**. That is this sandbox's TLS interception presenting a certificate Chromium will not trust, on pages that fetch over HTTPS. `31e` is *"no page errors"* on the reading screen; `22h` is *"no page errors in Bangla"* on the Asma page. Neither is an assertion about application behaviour — each is a page-error sweep that the interception trips.

**`31e` is reproduced on clean `main`** (run 4). **`22h` is reproduced on `a20892f`** (run 1), which predates D3. `CLAUDE.md` already records this class as affecting six checks across three suites.

**`--ignore-certificate-errors` was NOT used.** It would also hide a real certificate problem, and this repository forbids it by name.

**A consequence that has to be stated rather than papered over: `behaviour.mjs` cannot exit 0 in this sandbox**, because `31e` fails unconditionally on every run of every commit. An exit-code standard would make integration permanently impossible here, so the standard applied is the one the ruling itself describes — **compare every failure with clean `main`, and require no new application or test failure.** Under that standard the candidate passes; under an exit-code standard nothing ever could. **The suite is recorded as exit 1, never as green.**

**A consequence worth stating plainly: `behaviour.mjs` cannot exit 0 in this sandbox**, because `31e` fails on every run regardless of the code. So the gate standard applied here is **no new failure against the documented baseline and no application failure** — an exit-code standard would make integration permanently impossible, which cannot be the intent. Under that standard the suite passes: no new application or test failure; the candidate carries FEWER failures than clean `main` (2 against 4).

### 6.3 Not fixed here, and why

`tools/i18n-verify/behaviour.mjs` is a **platform-shared** path and no authorisation covers it — the same discipline applied to SCR-HADITH-02, which was left entirely to Claude-Hadith. It is recorded as a finding for the Master Architect to assign.

The fix is small and has two obvious shapes: accept **either** slide shape (a Name poster is a legitimate screensaver slide), or make the starting index deterministic under test. Either removes a check that has been reporting a ~29% false alarm, and — more importantly — removes a label that has been teaching every session to dismiss a real defect as the network.

---

## 7. Integration

`main` was fast-forwarded to the verified candidate. **`main` did not move at any point during verification** — `c26c711` when the work began, `c26c711` immediately before the push, re-read after.

**Post-push verification was done against the remote**, not the local tree: `origin/main` was re-fetched and its tree read back.

| Check | Result |
|---|---|
| `origin/main` before the push | `c26c711026320385e6a2e7c29019908cbc21084b` |
| Fast-forward possible | **YES** — `origin/main` is an ancestor of the candidate |
| `origin/main` after the push, re-fetched | **`22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8`** |
| local `main` == remote | **MATCH** |
| `app/js/version.js` on the remote | **`export const APP_VERSION = "08.31";`** — unchanged |
| `evidence` in `firestore.rules` on the remote | **0 occurrences** |
| Readiness declaration on the remote | **`ready: false`, `decision: null`** — closed |
| Working tree | **clean, 0 changes** |

**Guards re-run on integrated `main`**, not merely on the candidate: `programme-ledger` **8 / 23 noted / 0 failed**, `programme-ledger-mutations` **49 / 0**, `brief-integrity` **8 / 0**, `study-activity-evidence-boundary` **27 / 0** and its mutations **11 / 0**, `study-event-wiring` **41 / 0**, `study-note-service` **35**, `quran-boundary` **30 / 0**, `hadith-corpus` **33 / 0**, `hadith-gate-contracts` **11 / 0**, `hadith-governing-contracts` **14 / 0**, `rules-authorisation-executable` **38 / 0**. All exit 0.

---

## 8. The four deployment states — three unchanged, and the first says only what it means

| State | Value | Basis |
|---|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** | `main` carries the D3 repair. It changes one page-unreachable module, so **no reader's behaviour changes** |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN**, `verified: false` | The sandbox proxy refuses `CONNECT` to `github.io` |
| `FIREBASE_RULES_DEPLOYED` | **NO** | **E1 CLOSED.** Nothing deployed, nothing attempted |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** | The evidence subcollection has no rule |

`firestore.rules` names `evidence` **zero** times. `EVIDENCE_PERSISTENCE_DECLARATION.ready` is still the literal `false` with `decision: null` — **the readiness gate was not enabled**. `app/js/version.js` reads **`08.31`**, untouched. **`08.32` is UNALLOCATED**, and nothing in this tranche names it.

---

## 9. State block

```
MMSA_QR_D3_INTEGRATION
DATE=2026-09-19
REPORTED_MAIN_IN_RULING=35d51e6eabb3d01fd5046760cb2d9f3c1886f80c (STALE -- verified before use)
PRE_INTEGRATION_MAIN=c26c711026320385e6a2e7c29019908cbc21084b
ADVANCE_35d51e6_TO_c26c711=REPORT-ONLY (two files, docs/reports/)
D3_WORK_COMMIT=57a73a8b7664c9818c3814e495e4abdeebaf608f
D3_TIP_AS_FIRST_ACCEPTED=3adc853b2432acd04e1800fb8e278ac6a76311e1
RECONCILIATION_MERGES=d46bed0 (vs b295ea8), 22777fc (vs c26c711)
INTEGRATION_COMMIT=22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8
FINAL_REMOTE_MAIN=22777fc0c0c4bb93944d7e4eea72ad00db9dcfd8
MAIN_MOVED_DURING_VERIFICATION=NO
INTEGRATION_DIFF=11 files -- 1 page-unreachable app module, 4 tooling, 2 authorised shared documents, 4 reports
HADITH_FIX_AND_LEDGER_PRESERVED=YES -- 0 files differ across programme-ledger-mutations.mjs and docs/governance/
PROGRAMME_LEDGER_MUTATIONS=49 passed, 0 failed (REQUIRED 49/0)
PROGRAMME_LEDGER=8 passed, 23 noted, 0 failed (REQUIRED zero failures)
STUDY_EVENT_WIRING=41 passed, 0 failed (REQUIRED 41/0)
D3_BOUNDARY=27/0; ITS MUTATIONS=11/0
QURAN_BOUNDARY=30/0
HADITH=corpus 33, source-rights 14, commentary-binding 14, gate-contracts 11, governing-contracts 14 -- all 0 failed
RENDERED=layout NO REGRESSIONS, navcheck 0, panel en 0, panel bn 6 (O3c baseline), reading 0, coverage 1879/1818/61 unchanged
BEHAVIOUR=980 passed / 2 failed of 982, 56 sections, EXIT 1 -- NOT green. Clean main c26c711 scored 978/4. 22g fails on main and PASSES here; 22h also fails on pre-D3 a20892f; 31e fails in all five runs. No application failure in any run
BROWSER_BASELINE_CORRECTION=22g is a HARNESS DEFECT, not environmental -- random starting slide (Math.random over a 93-photo + ~99-name deck); measured 4 photo / 10 name over 14 opens; ZERO archive.org requests. 31e IS environmental (TLS). behaviour.mjs is platform-shared and was NOT edited
APP_VERSION=08.31 UNCHANGED
V0832_STATUS=UNALLOCATED
EVIDENCE_READINESS=CLOSED (ready:false literal, decision:null)
FIREBASE_RULES_DEPLOYED=NO
EVIDENCE_RECORDING_OPERATIONAL=NO
E1_STATUS=CLOSED
APP_DEPLOYED=NO
READY_TO_SHIP=NO
```
