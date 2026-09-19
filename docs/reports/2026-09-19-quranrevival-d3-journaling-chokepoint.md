# MMSA / QuranRevival — D3 foundation repair: Journaling routed through the evidence chokepoint

**Date:** 19 September 2026
**Ruling executed:** *Accept the v08.31 integration. E1 remains CLOSED; do not deploy Rules or enable evidence recording. Proceed immediately with the proposed D3 foundation repair on the actual current main.*
**Blast radius:** BR-0. One page-unreachable module, three verification suites, one new mutation harness. **No shared file. No UI change. No version bump. Nothing deployed.**

---

## 1. The state this was built on

| | |
|---|---|
| Remote `origin/main`, fetched at the start of this tranche | **`a64e2a1c97f397aba26bdfa281fdf4f2b5486547`** |
| — which is | **`Stamp FINAL_MAIN_SHA into the v08.31 integration report`** — the final integration report-stamp commit itself |
| One behind it | `877bca0190ae25a2ad6e13d1822946390514829e` — the v08.31 post-integration governance stamp |
| Two behind it | `a20892f1e4cbf4e86498fe371232466141ca95df` — the v08.31 application tip |
| `main` application version | **v08.31**, unchanged by this tranche |
| Working branch | `claude/busy-hawking-5p8ck8`, cut from `origin/main` |

The three-commit shape is the one the integration report records: the accepted application tip, the governance stamp that the fast-forward's own facts required, and the report stamp that could not contain its own hash.

---

## 2. What changed

### 2.1 `app/js/study-note-service.js` — the repair itself

`recordJournalEvidence()` imported `writeStudyActivityEvidence` from the evidence store and called it directly, around v08.31's persistence-readiness gate. That was never a live bypass — the module is page-unreachable, D3 Journaling has no producer and P5-D is not built — but it meant **"`recordStudyEvidence()` is the ONE chokepoint" was a claim about reachability, not about the code.** A claim resting on unreachability expires the moment somebody wires the surface, and it expires silently.

It now imports `recordStudyEvidence` from `study-event-wiring.js` and calls it. The direct store import is gone.

### 2.2 The four outcomes, kept distinct

`written: false` is true of **both** a refusal and a retry, so on its own it carries no meaning. Every outcome now returns the same five fields, so no fact is ever inferred from the absence of another:

| Outcome | `skipped` | `blocked` | `written` | `eventId` | `reason` |
|---|---|---|---|---|---|
| Nothing to record | **true** | false | false | `null` | `null` |
| Gate shut — nothing composed, nothing sent | false | **true** | false | `null` | `evidence-rules-not-deployed` |
| Already recorded (a retry is a successful no-op) | false | false | **false** | the id it deduplicated against | `null` |
| Recorded | false | false | **true** | the new id | `null` |

**The null return is checked before it is read, and the reason is about meaning rather than about a throw.** `recordStudyEvidence()` returns `null` for a falsy argument. Spreading `null` does *not* throw in JavaScript — `{ ...null }` is a silent no-op — so the old `{ ...outcome, skipped: false }` would have produced an object with **no `written` field at all**, and a missing field reads as falsy, which is exactly the already-recorded case. An absent outcome must never be able to wear the face of a successful no-op. The outcome is normalised field by field rather than spread, so a field added upstream cannot arrive here unread and a missing one cannot arrive as `undefined`.

### 2.3 The boundary guard, narrowed

`study-activity-evidence-boundary.mjs` used to tolerate a second caller **by name**:

```js
const KNOWN_UNREACHABLE_CALLER = "study-note-service.js";
```

That exception is **gone**, not widened. Two assertions replace it:

- the importer set is **exactly** `[study-event-wiring.js]`;
- scanning every source under `app/`, the only module that *calls* `writeStudyActivityEvidence(` is `study-event-wiring.js`.

A tolerated exception is how a list of one becomes a list of ten. There is no exception left to add to.

**Comments are stripped before that scan, and that is not fussiness.** The service's own doc comment now names `writeStudyActivityEvidence()` in order to explain that it no longer calls it. Scanning raw text would fail against perfectly correct source — this repository's own recorded trap. A negative control in the mutation harness pins it.

A new case, `D3 Journaling goes through the gate, and its outcomes stay distinguishable`, reads the service's source and asserts the import, the call, the null check *before* the first read of the outcome, and all four outcome fields.

### 2.4 A new, checked-in mutation harness

`tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs`. A narrowing is exactly the kind of change that can be made vacuously, so the guard is fed the old bypass and must refuse it by name.

**It never reaches for `git`.** Every file it touches is read into memory first and written back from memory in a `finally`. The continuation package records why: a mutation harness in this repository once restored with `git checkout -- app tools` and destroyed an hour of uncommitted work.

---

## 3. Findings

### 3.1 FINDING A — `study-event-wiring.mjs` had been DEAD since v08.31's own accepted commit

Running the gates turned up `study-event-wiring.mjs` exiting **1** with a stack trace and **no FAIL line**.

It was not my change. `git stash` and a run against unmodified `origin/main` reproduced it exactly.

**Root cause, pinned to a commit.** The suite loads the real `app/js/study-event-wiring.js` as a `data:` module with its app imports rewritten to injected globals. v08.31's **`65ef3c5`** — the accepted application change — added a *third* import, `./study-evidence-readiness.js`. The suite rewrote two. A relative specifier inside a `data:` module cannot resolve, so the module threw `ERR_INVALID_URL` **at load, before a single check ran.**

So from `65ef3c5` until this repair, **the chokepoint's own unit suite asserted nothing at all** — including its cases `an eligible completion reaches the store exactly once` and `this module never swallows a failure — I15 stays the caller's job`. This is the repository's own standing lesson in a new costume: *a check that has never run has earned nothing*, and *a grep cannot see an uncaught throw*.

**Repaired**, in a quran-owned file:
- the third import is rewritten, with the readiness **answer** injected while the gate's **logic** stays the real source (the shipped declaration is `ready: false` and cannot be argued out of it, so leaving it in place would make every write path unreachable and the suite would test the gate instead of the contract — what the shipped declaration actually says is pinned at its source by the boundary suite);
- **the missing leftover assertion is added** — `study-note-service.mjs` has carried that assertion all along, which is exactly why the same edit did not kill *that* suite silently. A new import now fails by name instead of killing the suite.

**0 executing checks → 41**, 0 failed. Two of those 41 are new and cover the gate behaviourally at its own module: a shut gate reaches the store not at all, and a refusal is tellable apart from an already-recorded no-op.

### 3.2 FINDING B — an assertion in the accepted boundary guard could not fail, found by a mutation

The mutation *"the chokepoint stops consulting readiness"* came back **UNPROVEN**: the guard failed, but naming the wrong fault. An unproven mutation is a finding about the guard, so it was chased rather than deleted.

`study-activity-evidence-boundary.mjs` sliced the chokepoint's body as `w.slice(w.indexOf("export async function recordStudyEvidence"))` — **to end of file**. `study-event-wiring.js` has two helpers *below* that function which re-export the readiness predicate. So deleting the gate from inside the function left the symbol in the slice anyway: `assert.ok(gate > -1, "recordStudyEvidence() no longer consults readiness")` **could not fail.** The suite refused the mutation only because a *different* assertion — the ordering one — fired instead, reporting a fault nobody could act on.

Fixed with a shared `functionBody(code, signature)` bounded at the next top-level `export`, applied to both call sites, with a positive control asserting the slice does not run past its own function. The mutation now passes for the right reason.

### 3.3 FINDING C — `feature/hadith-study` and the ledger disagree, and it is not this tranche's to fix

`programme-ledger.mjs` fails **two guards on current `main`**:

```
FAIL [A] stream hadith declares 08.29 but feature/hadith-study is stamped 08.30 -- the ledger and the branch disagree
FAIL [B] feature/hadith-study is stamped 08.30, which the ledger reserves for nobody under stream hadith
```

**It is not caused by this tranche** — proven by running the guard against an unmodified `origin/main` working tree, where it fails identically. It was also green earlier today, before the Hadith stream pushed.

What actually happened, measured rather than assumed:

- `origin/feature/hadith-study` is now **`b7e0dab`**, carrying **five new Hadith S5 commits timestamped 04:08–04:23 UTC today** — during this session.
- The branch was re-cut from **`db6cb24`**, which was `main` at v08.31's base. `git diff db6cb24 origin/feature/hadith-study -- app/js/version.js` is **empty**: the branch's `version.js` reads `08.30` because it **inherited** it from `main`, not because the stream stamped it.
- The ledger still records hadith as `declaredVersion: 08.29`, `integrationState: MERGED_TO_MAIN`, `branchTip: c1a4f19a` — all true when written, all stale now. The recorded tip is still an ancestor, so **no history was rewritten**.
- `08.30` is recorded as **`quran` / RELEASED** — superseded by v08.31 on `main`.
- The branch is now **three commits behind `main`** and will need re-basing onto v08.31.

**Guard A's wording is exactly right. Guard B's says "an invented version", and in this case that is misleading** — nothing was invented; the number was inherited by re-cutting from `main`. The *conclusion* holds (hadith holds no claim on `08.30`), but the wording would send a reader hunting for a stamp that was never made. Offered as an observation, not a change: `programme-ledger.mjs` is platform-shared and not mine to edit.

**This needs the Master Architect**, on two counts that are explicitly theirs: the hadith stream's ledger record needs updating to reflect that it has resumed work, and its eventual integration needs a version allocated. **`08.32` remains UNALLOCATED and this session did not allocate it.**

`programme-ledger-mutations.mjs` reports `48 passed, 1 failed` for the same reason and says so itself: *"the unmutated ledger already fails; the mutations below would prove nothing."* Its positive control is behaving correctly.

### 3.4 A correction of my own, and a probe defect of my own

Two things in this session's own working, recorded rather than quietly fixed:

- I read `app/js/version.js` with a grep that took the **first quoted number in the file** and reported `08.28`. That number sits in a *comment*; the export reads `08.31` and is untouched. The correct read is `grep APP_VERSION`.
- The diagnostic probe in §4 counts wrapped lines from raw `top` values, and reported `lines 2` for a row that is measurably one line high. Icons of differing heights on an `align-items: center` row have different `top`s while sharing a line — this repository's own v08.23 lesson. **The bar's measured height is the ground truth**; the comparison probe, which buckets by vertical *centre*, agrees with the height at every width.

---

## 4. The 412px `#readBar` disagreement, resolved

The two v08.31 reports disagree at exactly one of fourteen measurement points.

| | bar | children | need | avail | slack | height | verdict |
|---|---|---|---|---|---|---|---|
| v08.31 **build** report, en 412 | 380×75.0 | 10 | **380.6** | 380 | **−0.6** | 75.0 | wrapped |
| v08.31 **integration** report, en 412 | 380×41.78 | 10 | **379.51** | 380 | **+0.49** | 41.78 | one line |

**They agree on everything that could indicate a defect** — same bar width, same child count, same behaviour at the other six widths, and both report v08.30 and v08.31 as byte-identical. The whole disagreement is **1.09px of `need` on a 380px row**.

**Re-measured to attribute it rather than guess.** The same page was measured at three moments — as soon as `#readBar` attaches, after `document.fonts.ready`, and after a 900ms settle:

```
en 412   early 380x41.78 need 379.51 slack +0.49   fonts=loaded
         fonts.ready ... identical
         settled     ... identical      (stable across all three moments)
```

So it is **not** font loading, and not a settle-time artefact — the measurement does not move.

Per-child widths at en 412 sum to 321.91, plus nine 6.4px gaps and zero padding: **379.51**. The build report's own table gives the ⋮ as **31.0px** where this run measures `readQuickMenuSlot` at **30.39px** — 0.61px, with the remaining ~0.5px spread across the other nine controls.

**The cause is the renderer, and the case is a boundary case.** This session measured with the only Chromium this sandbox has, **Chromium 141.0.7390.37** at `/opt/pw-browsers/chromium-1194` (the Playwright version installed here expects build 1243, which is not present, so `CHROMIUM_PATH` was used). The build tranche recorded no renderer. Sub-pixel glyph metrics differ between Chromium builds, and **English at 412px fits by 0.49px — 0.129% of the row.** Any renderer difference above roughly one eighth of one percent flips it.

Everything else agrees in direction, and Bangla at 412 agrees in magnitude too: **−9.34 measured here against −9.9 in the build report**, 0.56px apart and unambiguously wrapped in both.

**Resolution.**
1. **Neither report is wrong.** Each measured its own renderer honestly. The build report's `−0.6` and this session's `+0.49` are the same row measured 1.09px apart, either side of a boundary it sits on.
2. **The disagreement says nothing about the code.** At English 412px, `#readBar` is within half a pixel of wrapping, and whether it does is decided by the device, not by v08.30 or v08.31.
3. **The governing fact for `O4-READBAR-WRAP` is untouched by all of this, and both reports state it independently:** v08.31 introduces **no additional wrapping**. This tranche re-confirmed it against `origin/main`: **14/14 measurement rows identical, 0 changed.**
4. **Recorded for `O4-READBAR-WRAP`:** English at 412px is a knife-edge, not a clearance. Any future measurement claiming it fits, or that it wraps, should name the renderer it used. The honest statement is *"at 412px in English the bar is at its boundary; in Bangla it wraps by ~9.5px."*

**No UI change was made.** `git diff origin/main -- app/` names exactly one file, and it is page-unreachable.

---

## 5. Verification

### 5.1 Reachability — the claim item 4 asks for

Walked from **all 29 pages** under `app/`, following local imports to any depth:

| Module | Pages that can reach it |
|---|---|
| `study-note-service.js` | **0** |
| `note-foundation.js` | 0 |
| `journey-map-service.js` | 0 |
| `study-note-binding.js` | 0 |
| `note-journal-evidence.js` | 0 |
| **CONTROL** `records.js` | **16** |
| **CONTROL** `study-event-wiring.js` | **1** |

The two controls are what stop this passing vacuously: a broken walker would report zero for everything.

**No reachable behaviour changed.** `git diff origin/main -- app/` names exactly `app/js/study-note-service.js`, and nothing else under `app/` differs by a byte — so every page, every stylesheet and every reachable module is identical to `main`. `app/js/version.js` is untouched and reads **`08.31`**; the proof above is what entitles it to stay there.

### 5.2 Import cycles — item 5

All **96** modules under `app/js` were walked: **0 cycles**. `study-note-service.js`'s transitive closure is 18 modules and **does not contain itself**, so the new edge to `study-event-wiring.js` introduces none.

### 5.3 Gates

| Suite | Before | After | Exit |
|---|---|---|---|
| `study-activity-evidence-boundary` | 26 / 0 | **27 / 0** | 0 |
| `study-activity-evidence-boundary-mutations` | *(new)* | **11 / 0** | 0 |
| **`study-event-wiring`** | **DEAD — 0 checks, exit 1** | **41 / 0** | 0 |
| `study-note-service` | 32 | **35** | 0 |
| `study-note-boundary` | 17 / 0 | 17 / 0 | 0 |
| `study-note-binding` | 16 | 16 | 0 |
| `note-foundation-boundary` | 30 / 0 | 30 / 0 | 0 |
| `note-journal-evidence` | 18 / 0 | 18 / 0 | 0 |
| `study-activity-evidence` | 11 / 0 | 11 / 0 | 0 |
| `study-activity-evidence-id` | 29 / 0 | 29 / 0 | 0 |
| `study-activity-evidence-store` | 26 / 0 | 26 / 0 | 0 |
| `study-approach-contract` | 13 / 0 | 13 / 0 | 0 |
| `study-approach-contract-boundary` | 16 / 0 | 16 / 0 | 0 |
| `quran-boundary` | 30 / 0 | 30 / 0 | 0 |
| `journey-map-boundary` / `-contract` / `-service` | 13 / 34 / 18 | 13 / 34 / 18 | 0 |
| `d14-timezone-boundary` / `-contract` | 10 / 21 | 10 / 21 | 0 |
| `hadith-corpus` / `-source-rights` / `-commentary-binding` | 33 / 14 / 14 | 33 / 14 / 14 | 0 |
| `brief-integrity` | 8 / 0 | 8 / 0 | 0 |
| `rules-authorisation-executable` | 38 / 0 | 38 / 0 | 0 |
| `rules-deployment-candidate` | 10 / 0 | 10 / 0 | 0 |
| `firestore-index-requirements` / `stub-parity` | 8 / 3 | 8 / 3 | 0 |
| **`programme-ledger`** | **6 / 22 noted / 2 failed** | same | **1 — FINDING C, pre-existing, not this tranche** |
| **`programme-ledger-mutations`** | **48 / 1** | same | **1 — the same cause, reported by its own positive control** |

### 5.4 Rendered gates

| Suite | Result | Exit |
|---|---|---|
| `layout.mjs` (shim built from `origin/main`) | **NO LAYOUT REGRESSIONS** — every landing-page metric byte-identical at all 8 viewports in both banner states | 0 |
| `navcheck.mjs` | nav fits in both languages at every width | 0 |
| `panel.mjs en` | PANEL OK apart from the known baseline | 0 |
| `panel.mjs bn` | **6 PROBLEM(S) — 6 x `!! NEWLY TRUNCATED: select #drillModeSelect`, the **O3c** baseline. Bangla “প্রতিটি আয়াত”, **48px usable against 54px needed** — 6px short, at six viewport/unit combinations. `tenantSelect`, `surahSelect` and `unitTypeSelect` are the separately tolerated O3/O3b baseline** | **1 — pre-existing** |
| `reading.mjs` | READING SCREEN OK | 0 |
| `behaviour.mjs` | **978 passed, 4 failed, 56 sections — 982 checks, the baseline total** | **1 — all four environmental** |

`layout.mjs` was run with the comparison shim built from `origin/main`, so it answers the question this tranche has to answer — *did anything on the landing page move* — rather than merely "is it the same as last time". It did not. The shim was deleted before any coverage figure was read.

**The two non-zero exits, both pre-existing and both named.**

- **`panel.mjs bn` is O3c**, recorded in the continuation package as found on 19 Sep and proven pre-existing there by reverting `app/` to the accepted v08.30 build and getting the identical six. `panel.mjs en` exits 0, and this tranche touches no panel code.
- **`behaviour.mjs`'s four failures are the documented environmental set**: `22g × 3` — the archive.org poster block, which `CLAUDE.md` records as **intermittent** (*"inside one tranche on identical code they passed in runs 1/3/5/9/10 and failed in 2/4/6/7/8/11"*), so a green `22g` is not evidence either way — and `31e`, the sandbox TLS artefact. **982 checks against the baseline's 982.** `--ignore-certificate-errors` was not used; it would also hide a real certificate problem.

**The emulator suite was not re-run, and the reason is stronger than a re-run would be.** `git diff origin/main -- firestore.rules firebase.json firestore.indexes.json tests/ tools/firestore-emulator/ docs/governance/` is **empty** — not one byte of the security or emulator surface differs from `main`, so the Phase 4 result (53 assertions, 0 failures, re-run during the v08.31 integration earlier today) cannot have moved.

### 5.5 The mutations, in full

| Mutation | Guard must refuse it |
|---|---|
| POSITIVE CONTROL — the guard passes on the real, unmutated repository | passes |
| POSITIVE CONTROL — the harness restored every file it touched | passes |
| **the direct D3 call is restored, exactly as it was before this tranche** | **refused** |
| the service imports the store again without calling it | refused |
| a module that has never touched evidence starts calling the store | refused |
| the chokepoint stops consulting readiness | refused *(this one found FINDING B)* |
| the null outcome is spread instead of checked | refused |
| a refusal collapses into `written: false` | refused |
| the service loses the chokepoint import | refused |
| NEGATIVE CONTROL — a comment naming the store does **not** trip the guard | stays green |
| POSITIVE CONTROL — every mutated file is byte-identical to how it started | passes |

**11 passed, 0 failed, 0 unproven.** The third is the one the ruling asks for by name.

---

## 6. What was deliberately not done

- **No shared file was touched.** All five files are `quran`-owned under the ledger's own path families. In particular `CLAUDE.md` and `CHANGELOG.md` were **not** updated, because both are platform-shared and the ruling says to stop rather than take one. **This is a real consequence worth naming:** this repository's standing rule is that a round leaving the brief is appended to `CHANGELOG.md` first. This tranche leaves no brief entry, so the record lives in this report until the Master Architect authorises the two-line brief and changelog note.
- **No version bump.** `app/js/version.js` stays `08.31`, which §5.1's unreachability proof is what entitles it to do. **`08.32` was not allocated.**
- **Nothing was deployed.** `firestore.rules`, `firebase.json`, `firestore.indexes.json` and `tests/firestore/` are byte-for-byte unchanged; `firestore.rules` still contains the word `evidence` **zero** times.
- **The readiness gate was not enabled.** `EVIDENCE_PERSISTENCE_DECLARATION.ready` is still the literal `false` with `decision: null`. E1 is **CLOSED**.
- **`feature/hadith-study` was not touched**, and neither was the ledger that describes it. Both are other people's to move.

---

## 7. The four deployment states — unchanged by this tranche

| State | Value | Basis |
|---|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** | `main` carries v08.31; this tranche adds a BR-0 repair to it |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN**, `verified: false` | The sandbox proxy refuses `CONNECT` to `github.io` — re-confirmed today: `curl: (56) CONNECT tunnel failed, response 403` |
| `FIREBASE_RULES_DEPLOYED` | **NO** | E1 CLOSED |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** | The evidence subcollection has no rule |

---

## 8. State block

```
MMSA_QR_D3_FOUNDATION_REPAIR
DATE=2026-09-19
BASE_MAIN_SHA=a64e2a1c97f397aba26bdfa281fdf4f2b5486547
BASE_MAIN_SHA_IS=the final v08.31 integration report-stamp commit
MAIN_VERSION=08.31 (UNCHANGED)
BRANCH=claude/busy-hawking-5p8ck8
BRANCH_HEAD=57a73a8b7664c9818c3814e495e4abdeebaf608f (the work; this report sits one commit ahead)
BLAST_RADIUS=BR-0
APP_FILES_CHANGED=1 (app/js/study-note-service.js, page-unreachable)
SHARED_FILES_CHANGED=0
VERSION_BUMP=NONE
V0832_STATUS=UNALLOCATED
REACHABILITY=study-note-service.js reachable from 0 of 29 pages; controls records.js=16, study-event-wiring.js=1
IMPORT_CYCLES=0 of 96 modules
CHOKEPOINT_CALLERS=1 (study-event-wiring.js) -- KNOWN_UNREACHABLE_CALLER exception REMOVED
MUTATIONS=11 passed, 0 failed, 0 unproven
FINDING_A=study-event-wiring.mjs DEAD since 65ef3c5 (v08.31's accepted commit); repaired, 0 -> 41 checks
FINDING_B=boundary guard's unbounded function slice made an assertion unable to fail; found by mutation; fixed
FINDING_C=feature/hadith-study (b7e0dab) vs ledger -- guards A and B fail on main, PRE-EXISTING, needs Master Architect
READBAR_412_RESOLUTION=boundary case, 1.09px apart, renderer-dependent; Chromium 141.0.7390.37; both reports honest; no code difference
READBAR_VS_MAIN=14/14 IDENTICAL, 0 changed -- no UI change
FIRESTORE_RULES_DEPLOYED=NO
EVIDENCE_RECORDING_OPERATIONAL=NO
E1_STATUS=CLOSED
READY_TO_SHIP=NO
```
