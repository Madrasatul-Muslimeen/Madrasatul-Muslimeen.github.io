# QuranRevival — Quran Stream Integration Reconciliation

- **Date:** 2026-09-18
- **Type:** **RECONCILIATION ONLY.** No implementation, no merge, no deployment, no version allocation.
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **Authority:** Master Architect Programme Coordination — Quran Stream

> **HEADLINE CORRECTION: `main` HAS MOVED from the reported baseline.** The instruction's baseline is `6758490…`. Actual `origin/main` is **`7111e3c975d3cf3fd0bf0c0d7814691edcd5299e`** — two commits further on, landed by another session. The application version is unchanged at **08.27**. Details in §1.2.

---

## 1. Actual repository state

### 1.1 Measured facts

| | Value |
|---|---|
| **`origin/main` SHA** | **`7111e3c975d3cf3fd0bf0c0d7814691edcd5299e`** |
| **`origin/main` app version** | **`08.27`** |
| **Current branch** | `main` |
| **HEAD (after sync)** | `7111e3c975d3cf3fd0bf0c0d7814691edcd5299e` |
| **Clean / dirty** | **clean** — `git status --porcelain` empty |
| **Ahead / behind `origin/main`** | **0 / 0** (was 0 ahead / **2 behind** on arrival; synced by fast-forward to observe real state) |
| **Has `main` moved from `6758490…`?** | **YES — by 2 commits** |

### 1.2 What `main` gained since the reported baseline

Both commits are authored by a Claude session other than this one, dated 2026-09-18:

| SHA | Subject |
|---|---|
| `ff1ae1b` | D14: the timezone foundation as an unreachable candidate, and measured layout options |
| `7111e3c` | D14: write the contract's own payloads through the candidate Rules |

**13 files, +4,324 lines, 0 deletions.** New: `app/js/timezone-contract.js`, `app/js/timezone-service.js`, `docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules`, `tools/firestore-emulator/d14-timezone.*`, `tools/i18n-verify/d14-timezone-{contract,boundary}.mjs`, `tools/i18n-verify/select-layout-options.mjs`, `docs/reports/2026-09-18-select-layout-measurements.json`, two D14 reports, plus `CLAUDE.md` and `CHANGELOG.md`.

**The Owner's summary of this is accurate, and it was verified independently rather than accepted:**

- `firestore.rules` — **byte-identical** to `6758490`. Nothing deployed.
- `firebase.json` — **byte-identical**.
- `app/js/timezone-service.js` — **imported by nothing.** `timezone-contract.js` is imported only by `timezone-service.js`. The chain is unreachable from any page, which is why `version.js` correctly did **not** move.

### 1.3 Baseline health of current `main`

All pure guards green, including the two new D14 guards:

`brief-integrity` **0** · `rules-authorisation-executable` **0** · `firestore-index-requirements` **0** · `rules-deployment-candidate` **0** · `stub-parity` **0** · `d14-timezone-contract` **0** · `d14-timezone-boundary` **0**

### 1.4 D14 — exact status

| Aspect | State |
|---|---|
| Decision | **Recorded as D14** in `CLAUDE.md`'s decisions table (auto-capture default; a chosen location determines the zone until changed or returned to auto) |
| Code | **PRESENT on `main`** — `timezone-contract.js` (pure), `timezone-service.js` |
| Reachability | **UNREACHABLE** — no page imports either; verified by import scan |
| Version impact | **None.** `main` stayed **08.27** because nothing reachable changed |
| Rules | **CANDIDATE ONLY** — `docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules`. **`firestore.rules` untouched; NOT deployed; NOT authorized** |
| Blocking dependency | **E1** — authenticated Firebase access to `study-monitoring` |

### 1.5 Phase 4 wiring — exact status

| Aspect | State |
|---|---|
| Branch / SHA | `origin/claude/phase4-wiring` at **`7e2931f795af1cd97efc1167660cea93aa22b9ab`** — **matches `7e2931f`** |
| Merged? | **NO — HELD.** Not an ancestor of `origin/main` |
| Its `version.js` | **`08.26`** |
| Position vs `main` | **2 ahead, 28 behind** |
| Modified this session? | **No.** Not re-cut, not re-stamped, not activated |

**Version consequence:** `main` has passed this branch twice (08.26, then 08.27). Its 08.26 stamp now names a version that means something else. **The next free number is no longer derivable from the branch and must be allocated by the Master Architect**, not read off arithmetic.

### 1.6 Unmerged branches carrying application versions

| Branch | Tip | `version.js` | Position vs `main` |
|---|---|---|---|
| `claude/phase4-wiring` | `7e2931f` | **08.26** | 2 ahead, 28 behind |
| `feature/hadith-study` | `cd344f4` | **08.29** | 11 ahead, 2 behind |
| `claude/charming-rubin-xzxbk1` | `49f37c9` | 08.26 | **fully merged** into `main` — spent |

---

## 2. Quran Stream integration inventory

`app/js` holds **88** modules: **37** Quran/study-domain, **51** platform/shared, **0** Hadith. `tools/i18n-verify` holds **33** Quran/MAP suites, **10** cross-module suites, **0** Hadith (Hadith's own three live on its branch).

### A. Quran-domain-owned — safe for the Quran stream to change

- **Study / Read / Explore:** `quran-*.js` (word identity, word card, word progress, explore), `ayah-*.js`, `surah-*.js`, `mushaf-*.js`, `reciter-*.js`, `unit-keys.js`, `way-modal.js`, `wheel-resize.js`, `mastery-wheel.js`
- **Notes / MMJ (MAP Phases 5–6):** `note-foundation.js`, `note-journal-evidence.js`, `study-note-binding.js`, `study-note-service.js`, `journey-map-contract.js`, `journey-map-service.js`
- **Study→Approach (MAP Phase 4):** `study-approach-contract.js`, `study-activity-evidence.js`
- **Page:** `app/quranrevival.html` (the single largest Quran surface; carries the Study-options panel, QCR and Asma panels inline)
- **Guards:** the 33 `quran-*`, `note-*`, `journey-*`, `study-*` suites in `tools/i18n-verify`

### B. QuranRevival platform / shared — **NOT Quran-owned**

- **Identity / tenancy / roles:** `identity.js`, `people.js`, `invites.js`, `session-context.js`, `self-check.js`
- **Catalogue / registry:** `catalogue.js`, `catalogue-data.js`, `catalogue-repair.js`, `collections.js`, `modules.js`, `feature-registry.js`, `domains.js`
- **Tracking core:** `records.js`, `activity.js`, `envelope.js`
- **Navigation / shell:** `nav.js`, `app/css/shell.css`, **and the static nav markup duplicated across 22 pages**
- **i18n:** `i18n.js`, `lang.js`, `lang-sync.js`, **`app/js/i18n/bn.js`**, `labels.js`
- **Cross-module surfaces:** `bookmarks.js`, `bookmark-nav.js`, `bookmark-popover.js`, `continue-strip.js`, `monitor.js`, `homework.js`, `classes.js`, `course-offers.js`, `curriculum.js`, `grades.js`, `resources.js`, `backup.js`, `backup-file.js`, `topic-renderer.js`, `topic-study.js`, `routine-study.js`, `hifz-renderer.js`
- **Version:** **`app/js/version.js`** — single source of truth, now Master-Architect-controlled
- **Standing brief / log:** **`CLAUDE.md`**, **`CHANGELOG.md`**
- **D14 (new):** `timezone-contract.js`, `timezone-service.js` — platform-level, not Quran-domain

### C. Deployment / security shared

- **`firestore.rules`** — production, byte-identical, deploy is an Owner Control Gate
- **`firebase.json`** — no `indexes` key; a check asserts it stays so
- **Rules candidates:** `phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` (the only paste file), the two `candidate-2026-09-15` **test extracts** (never paste), `phase6-journey-map-rules-candidate-2026-09-15.rules`, **`d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules`**
- **Index candidates:** `phase5-note-foundation-indexes-candidate-2026-09-15.json`, the Phase 6 `notePlacements` candidate
- **Owner-facing package:** `phase4-6-production-deployment-package-2026-09-17.md`

### D. Test / verification shared

- **`tools/i18n-verify/behaviour.mjs`** — 982 checks, 56 sections, **every module**. The single highest-collision file
- **`layout.mjs`**, **`panel.mjs`**, **`navcheck.mjs`**, **`reading.mjs`** — measurement suites
- **`harness.mjs`**, **`firebase-stub.mjs`** — the shared browser/Firestore stub
- **`brief-integrity.mjs`**, **`stub-parity.mjs`** — repository-integrity guards
- **`tools/i18n-coverage.mjs`**, **`tools/md2report.py`**, **`tools/firestore-emulator/`**

---

## 3. Hadith Stage A / Stage B — **AVAILABLE**, not unavailable

Both reported commits are present in this repository, on **`origin/feature/hadith-study`**, **unmerged**:

| Reported | Found | Subject | `version.js` |
|---|---|---|---|
| Stage A `7f61328` | **PRESENT** | *Hadith Stage A: put the synthetic topic inside the synthetic namespace* | **08.28** |
| Stage B `cd344f4` | **PRESENT** (branch tip) | *Hadith Stage B report: record its own commit SHA* | **08.29** |

Branch: **11 ahead, 2 behind** `main`; merge base `6758490` — the same baseline the instruction quotes. **28 files, +5,111 / −6.** Not merged, and not merged by this session.

**The reserved versions match what the branch actually carries** (A = 08.28, B = 08.29).

### 3.1 Findings on that branch, reported not corrected

1. **Internal version drift.** Its `CLAUDE.md` block states *"This branch carries app version `08.28`"* while its `version.js` reads **`08.29`**. Stage B bumped the file and the brief block was not updated. This is the drift class the project has recorded three times.
2. **It writes `08.28`, never `v08.28`.** `brief-integrity.mjs`'s scanner matches `\bv(0[78]\.\d{2})\b`, so it is **blind to that notation** — which is why the "every version the brief names is in `CHANGELOG.md`" check does not fire.
3. **The branch does not touch `CHANGELOG.md` at all.** The project's own recorded rule is that a round leaving the brief is appended to the log **first**. Two staged versions currently exist with no log entry.
4. **That branch's own brief records the collision that produced this instruction:** *"08.27 was a REAL COLLISION, not a reservation. This branch took 08.27 while `main` was on 08.25; `main` then merged 08.26 and shipped its own 08.27, so for a while two different builds carried one number."* This is direct evidence for the Master Architect's version-allocation rule.

---

## 4. Shared-file collision risks

**Predicted textual conflicts between `origin/main` and `origin/feature/hadith-study`: ZERO.** `git merge-tree --write-tree` produced a clean tree (`abe034b`) with no conflict markers. Nothing was merged or written.

> **That clean result is the risk, not the reassurance.** Every collision below would merge **silently**. Git cannot see any of them.

The **only** file both streams have modified since the shared merge base is `CLAUDE.md`, and their hunks are far apart (Hadith at line 27, D14 at line 199), so git auto-merges it.

---

**FILE:** `app/js/version.js`
**QURAN USE:** single source of truth for the badge, the About line and every exported backup stamp; `main` = **08.27**
**HADITH USE:** stamped **08.28** (Stage A) then **08.29** (Stage B)
**CURRENT CHANGE ON EACH STREAM:** Quran — none pending. Hadith — `08.27 → 08.29`
**COLLISION TYPE:** **Silent semantic collision — version allocation.** A merge takes the branch's `08.29` with **no conflict and no human decision**. This exact mechanism already produced a real duplicate at 08.27
**SAFE COORDINATION OPTIONS:** (a) Master Architect allocates the number and the branch is re-stamped to it immediately before merge; (b) `version.js` is excluded from feature-branch commits entirely and bumped only on `main` at merge; (c) a guard that fails when a branch's `version.js` is not the next free number read off `main`. **Not chosen here.**

---

**FILE:** `CLAUDE.md`
**QURAN USE:** standing brief — milestone line, MAP status, decisions D1–D14, standing lessons
**HADITH USE:** a new Hadith blockquote inserted near the top (line 27), plus a note interpreting the milestone line
**CURRENT CHANGE ON EACH STREAM:** Quran/D14 — +31 lines at line 199. Hadith — +42 lines at line 27
**COLLISION TYPE:** **Textually clean, semantically contended.** Both streams write the same governing document; hunks do not overlap **today**. `brief-integrity.mjs` enforces the milestone line against `origin/main`, so a false merge claim fails — but only for the milestone line, not for the rest
**SAFE COORDINATION OPTIONS:** (a) one owned block per stream, fixed position, never edited across streams; (b) split per-stream status into separate files the brief links to; (c) leave as-is and accept that hunk proximity is luck. **Not chosen here.**

---

**FILE:** `CHANGELOG.md`
**QURAN USE:** full round-by-round log; the Quran stream appends every tranche
**HADITH USE:** **none — the branch does not touch it**
**CURRENT CHANGE ON EACH STREAM:** Quran/D14 — +104 lines appended. Hadith — nothing
**COLLISION TYPE:** **Rule breach, not a conflict.** Two staged versions with no log entry; both streams append to the same tail, so simultaneous appends conflict the moment Hadith starts writing
**SAFE COORDINATION OPTIONS:** (a) Hadith appends its 08.28/08.29 entries before merge; (b) per-stream changelog files merged at release. **Not chosen here.**

---

**FILE:** `app/js/i18n/bn.js`
**QURAN USE:** shared Bangla catalogue for the whole app; coverage 1,803 scanned / 47 missing
**HADITH USE:** **+68 lines** of Hadith strings
**CURRENT CHANGE ON EACH STREAM:** Quran — none pending. Hadith — additive
**COLLISION TYPE:** **Append collision.** Additive and low-risk, but both streams append to one object; a duplicate key silently wins by source order, and the coverage total is a shared number both streams report
**SAFE COORDINATION OPTIONS:** (a) per-module key namespaces with a duplicate-key guard; (b) split catalogue files merged at load. **Not chosen here.**

---

**FILE:** `tools/i18n-verify/behaviour.mjs`
**QURAN USE:** 982 checks / 56 sections; this session reconciled sections 38f, 42h, 43h, 45b/c and 50k
**HADITH USE:** **+32 / −6** — Hadith sections added
**CURRENT CHANGE ON EACH STREAM:** Quran — none pending. Hadith — appended sections
**COLLISION TYPE:** **Highest-collision shared file.** Both streams add sections to one file and both quote its pass/fail total as evidence. A merge changes the total, so **each stream's recorded baseline becomes wrong on the other's merge**, with no conflict raised
**SAFE COORDINATION OPTIONS:** (a) per-module suite files with a thin runner that sums them; (b) section-range ownership; (c) report per-section counts rather than one global total. **Not chosen here.**

---

**FILE:** `app/hadith-study.html`
**QURAN USE:** platform page — Hadith module delivered inside Phase 6 round 2 / Phase 12; carries the shared nav block
**HADITH USE:** **modified (+43)**, not added — it already exists on `main`
**CURRENT CHANGE ON EACH STREAM:** Quran — none pending. Hadith — rework
**COLLISION TYPE:** **Ownership transfer of an existing platform page.** Low conflict risk today; it becomes a shared-nav collision the moment either stream edits the nav markup duplicated across 22 pages
**SAFE COORDINATION OPTIONS:** (a) confirm the page transfers to the Hadith stream; (b) keep the nav block platform-owned and out of module edits. **Not chosen here.**

---

**No overlap at all** on: `firestore.rules`, `firebase.json`, any Rules or index candidate, `nav.js`, `app/css/shell.css`, `records.js`, `activity.js`, `identity.js`, `people.js`, or any of the 33 Quran/MAP guard suites.

---

## 5. Instruction compliance — what was deliberately NOT done

- **No Study-select layout option implemented.** `surahSelect` / `unitTypeSelect` / `tenantSelect` remain **Owner decision O3**, with measurements on record
- **D14 not wired.** No import added; the chain remains unreachable
- **D14 Rules not activated.** `firestore.rules` byte-identical
- **Phase 4 wiring `7e2931f` not modified**, not re-cut, not re-stamped, not merged
- **Hadith not merged.** `git merge-tree` is a read-only prediction; nothing was written to the repository
- **Nothing deployed**
- **`08.30+` not allocated**, and no version changed. `main` remains **08.27**
- **No Owner product decision taken**

The only repository action was **`git merge --ff-only origin/main`** to bring this checkout to the real `main` so state could be observed, plus the two report files this instruction requests.

## 6. Shared Change Rule — acknowledged, and one consequence

The rule is adopted. Its immediate effect: **the Quran stream currently has no available application tranche.** Every remaining Quran item either needs an Owner decision (O1, O2, O3, O5, O6), external access (E1), a version allocation (withheld), or a shared/platform file. Quran-domain-owned BR-0 work inside `app/js/quran-*`, `note-*`, `journey-*`, `study-*` and their own guards remains available and touches nothing shared.

**No SHARED CHANGE REQUEST is raised by this reconciliation**, because it changed no shared file. Should the Master Architect authorise the select-layout work, it would require one against `app/quranrevival.html` **and** `app/js/version.js`.

---

## 7. Machine-copyable state

```
QURAN_STREAM_STATE
MAIN_SHA=7111e3c975d3cf3fd0bf0c0d7814691edcd5299e
MAIN_VERSION=08.27
BRANCH=main
HEAD=7111e3c975d3cf3fd0bf0c0d7814691edcd5299e
AHEAD_BEHIND=0/0 (arrived 0 ahead / 2 behind; synced ff-only to observe)
MAIN_MOVED_FROM_REPORTED_BASELINE=YES 6758490->7111e3c (+2 commits, D14 tranche, version unchanged)
D14_STATUS=CODE_ON_MAIN_UNREACHABLE; timezone-contract.js + timezone-service.js present, imported by nothing; Rules CANDIDATE ONLY (docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules); firestore.rules + firebase.json BYTE-IDENTICAL; NOT deployed; NOT authorized; version correctly unmoved at 08.27; blocked by E1
PHASE4_STATUS=HELD at 7e2931f795af1cd97efc1167660cea93aa22b9ab; NOT an ancestor of main; version.js=08.26; 2 ahead / 28 behind; untouched this session; stamp now 2 versions behind main
UNMERGED_VERSION_CLAIMS=claude/phase4-wiring@7e2931f=08.26; feature/hadith-study@7f61328=08.28 (Stage A); feature/hadith-study@cd344f4=08.29 (Stage B, tip); claude/charming-rubin-xzxbk1@49f37c9=08.26 MERGED/spent
SHARED_FILES=app/js/version.js; CLAUDE.md; CHANGELOG.md; app/js/i18n/bn.js; tools/i18n-verify/behaviour.mjs; layout.mjs; panel.mjs; navcheck.mjs; reading.mjs; harness.mjs; firebase-stub.mjs; brief-integrity.mjs; stub-parity.mjs; nav.js; app/css/shell.css; static nav markup x22 pages; firestore.rules; firebase.json; all Rules/index candidates; records.js; activity.js; envelope.js; identity.js; people.js; invites.js; catalogue*.js; modules.js; feature-registry.js; i18n.js; lang*.js; timezone-contract.js; timezone-service.js
HADITH_OVERLAPS=AVAILABLE on origin/feature/hadith-study (11 ahead / 2 behind, merge base 6758490). Overlapping shared files: app/js/version.js (08.27->08.29, SILENT allocation collision); CLAUDE.md (both streams edit; hunks non-adjacent today); app/js/i18n/bn.js (+68 append); tools/i18n-verify/behaviour.mjs (+32/-6, shared totals invalidated); app/hadith-study.html (MODIFIED, pre-existing platform page). CHANGELOG.md NOT touched by Hadith = rule breach. git merge-tree predicts ZERO textual conflicts -> every collision above would merge SILENTLY
HADITH_BRANCH_FINDINGS=brief block says "carries app version 08.28" while version.js=08.29; brief writes "08.28" not "v08.28" so brief-integrity's scanner is blind to it; no CHANGELOG entry for either staged version
NEXT_SAFE_QURAN_WORK=NONE at application level. All remaining Quran items require an Owner decision (O1,O2,O3,O5,O6), external access (E1), a Master Architect version allocation (withheld), or a shared/platform file. Available without new authority: BR-0 work confined to Quran-domain-owned files (app/js/quran-*, note-*, journey-*, study-*) and their own guard suites, with no version bump
BLOCKERS=E1 authenticated Firebase access to study-monitoring (gates ledger 1,2,3,6 and transitively 4, plus D14 Rules); O1 guardian approval window; O2 server-side folder-cycle prevention; O3 select presentation (tenantSelect/surahSelect/unitTypeSelect); O5 MMJ scope/fourth semantic role; O6 P5-D editor shape; VERSION ALLOCATION 08.30+ withheld to Master Architect; SHARED CHANGE RULE now gates every platform-file edit
```

---

*Reconciliation only. No development tranche was begun. Returned to the Owner for Master Architect reconciliation.*
