# Hadith Study — H0 contract and file-ownership audit

- **Date:** 2026-09-18
- **Gate:** H0 (read-only repository and contract audit), per *QuranRevival — Hadith Claude Start Prompt v03, 2026-09-18* and *Hadith Study Master Plan v01, 2026-09-17*
- **Blast radius:** **BR-0, documentation only.** No file under `app/`, `tools/`, `tests/`, `firestore.rules`, `firebase.json` or any Rules/index candidate was modified. `git diff -- app/ tools/ tests/ firestore.rules firebase.json` is empty.
- **Application version:** **08.25, unchanged.** Documentation-only work retains the version, per the Start Prompt and the repository's own convention.
- **Result:** H0 delivered. **Five contradictions between the plan and the repository are reported below; two of them are Owner Control Gates and block H1/H2 from proceeding as written.**

---

## 1. Verified repository state

Every value here was read from Git and the working tree in this session. Nothing is carried over from a document.

| Fact | Verified value |
|---|---|
| Remote | `https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io` |
| Default branch | `main` |
| Checked-out branch | `claude/beautiful-darwin-faeim7` |
| HEAD commit | `d8f049207d80fdd58f31931d82a080ef7d4f6fe7` |
| HEAD subject | *Audit the deployed rules for the same gap: clean, with one finding* |
| Application version | **`08.25`** — `app/js/version.js`, `APP_VERSION = "08.25"` |
| Version on `main` | **`08.25`** — identical |
| Worktrees | **Exactly one:** `/home/user/Madrasatul-Muslimeen.github.io` |
| Working tree | Clean (`git status --short` empty) |
| Served from | GitHub Pages. Root `index.html` is a **redirect stub** to `/app/index.html`; the application itself lives in `app/` |
| Firebase project | `study-monitoring` (`.firebaserc`), single project (D1) |
| `firebase.json` | `firestore.rules` only. **No `indexes` key.** No `firestore.indexes.json` exists |
| App modules | 85 files in `app/js/`, 28 pages in `app/*.html` |
| Deployed Rules | `firestore.rules`, 1,122 lines, 39 collections |
| Test harness | 45 `.mjs` suites in `tools/i18n-verify/`, plus `tools/firestore-emulator/`. **No `package.json`** — Playwright is installed ad hoc |

**Correction to the Start Prompt:** it states *"the application is served from the repository root."* It is not. The repository root serves a 20-line redirect stub; the application is served from `/app/`. Two frozen archives also serve from this repository and **write real data to the same Firestore**: `/legacy-v07/` (v07.139) and `/legacy/index.html` (v06.30). Both are marked **REFERENCE ONLY — NEVER EDIT**. Any Hadith standalone entry point must not be confused with these.

### 1.1 The branch is not a clean base — and this is the first isolation problem

`claude/beautiful-darwin-faeim7` is **21 commits ahead of `main` and zero behind.** Those 21 commits are the current Quran-side builder's unmerged work: **67 files, 8,737 insertions**, spanning MAP Phase 4 (P4-E evidence read side), Phase 5 (P5-F relation lifecycle), Phase 6 (P6-C read model, P6-D folder editing) and a large test-harness excavation.

Five files under `app/js/` are changed relative to `main`, including `note-foundation.js` (+323 lines) and `journey-map-service.js` (+163 lines) — **precisely the Note and Mapping My Journey modules a Hadith adapter must build on.**

Consequence: this branch is a *moving Quran-work branch*, not a verified base. Building Hadith on it merges the two lines of work into one inseparable branch, which is exactly what the Master Plan's isolation rules forbid.

---

## 2. THE FINDING THAT CHANGES THE TASK — a Hadith module already exists

**Neither the Master Plan nor the Start Prompt mentions it.** It is live, in production, and shipped as part of Phase 12.

| Evidence | Value |
|---|---|
| Page | `app/hadith-study.html` (149 lines), live and linked |
| Navigation | `app/js/nav.js:63` — `{ href: "hadith-study.html", label: "Hadith" }` |
| Renderer | `app/js/topic-study.js` → `initTopicStudyPage({ moduleId: "hadith", ... })` — the **generic topic renderer**, shared with Deen Study, Arabic, General Study and Nature-Life |
| Module | `catalogue-data.js:56` — `{ id: "hadith", name: "Hadith", icon: "📜", renderer: "topic", order: 7 }` |
| Subjects | Five, all `moduleIds: ["hadith"]` — Adab Al-Mufrad, Shamayyl Muhammadiya, Hadith — Al-Ghayb, Hadith Reading, Hadith — Stories |
| Tracking | **One** module-wide trackable, `studied_hadith`, from `studiedTemplate()` — name "Studied", a single claim ramp per topic |
| Unit keys written | **`topic:<subjectId>`** — *not* `hadith:…` |
| Records chunk | `subject_<subjectId>` (D12) |

**What this module is:** a topic browser. A reader picks one of five Hadith topics, opens its resource, and claims one status ("Studied") against it. There is **no collection, no book, no chapter, no narration, no isnād, no matn, no edition, no grading, no commentary and no Arabic source text anywhere in it.**

So the plan is not contradicted in its *goal* — nothing resembling the plan's corpus model exists. It is contradicted in its *premise*: the plan reads as though Hadith is greenfield, and it is not. A new narration-level Hadith module and this topic module would both be called "Hadith", both appear in the same navigation, and both write claims for the same people.

**This is an Owner Control Gate** — "choose among materially different product behaviours." It must be decided before H1, because the answer changes the data model, the navigation, the catalogue seed and every record already claimed. The three options and their real costs are in §6.

---

## 3. The permanent unit key for Hadith already exists, and it conflicts with the plan

`app/js/unit-keys.js` has carried a Hadith unit type since Phase 3:

```
hadith: (collectionName, number) => `hadith:${collectionName}:${number}`
```

The file's own header offers `"hadith:bukhari:5678"` as its worked example. The shape is pinned a second time, independently, in `app/js/study-note-binding.js` as `/^hadith:[A-Za-z0-9_-]+:\d{1,6}$/`, where it maps to `sourceKind: "hadith-unit"`.

**Three problems, all real:**

1. **It keys by collection *name*.** I5 is *"units are keyed by permanent ID, never by name"* — and `unit-keys.js` says so in its own opening comment. `bukhari` is a name-derived slug, not a permanent ID. The rest of the file obeys I5 strictly; this one entry does not.
2. **It keys by an edition-specific display number.** The Master Plan requires an opaque internal narration ID plus a separate `ExternalReference` record, and states explicitly: *"never infer cross-edition equivalence from a number alone."* A key of `hadith:bukhari:1` **is** that inference, baked permanently into the record. The Source Register makes the same point from the other side — `HCM-0001` and `HCM-0002` are two distinct source occurrences of one report and "must retain their own collection, edition and source IDs."
3. **It cannot express a repeat occurrence.** The plan requires repeated narrations to be kept as separate source occurrences. Two occurrences of the same numbered narration collapse to one key.

**How much does changing it cost? Measured, not assumed — and the answer is: almost nothing.**

`buildUnitKey.hadith` has **no producer in any study screen.** Searched across `app/`, `tools/` and `tests/`, the only application call site is `app/records.html:279`, inside a manual unit-key builder form where an administrator types a reference by hand. The remaining five hits are test fixtures. The live Hadith module writes `topic:` keys, not `hadith:` keys.

So no study surface has ever produced a `hadith:` unit key. Whether any exists in production data is the one thing this session cannot verify — it requires reading live Firestore, which H0 does not authorise. **That check is a prerequisite to H1.**

**Changing a permanent Study Unit key is an Owner Control Gate** and is not proposed here. Recorded, with the cost measured, for the Master Architect's decision.

---

## 4. The shared contracts a Hadith adapter must mount on

Inventoried against the plan's four pillars. **Good news first: three of the four are already subject-neutral**, so a Hadith adapter needs far less new shared surface than the plan anticipates.

| Pillar | Current contract | Hadith fit |
|---|---|---|
| **Approach** | 30 Approaches, seeded from `APPROACH_TEMPLATES` into each tenant's `trackables` collection; the Firestore documents are the source of truth, not the constant. Owner-editable since v08.01–v08.02 (name, section, position, Guide). | **Hardcoded to Quran.** `catalogue.js:211` states it plainly: *"APPROACH_TEMPLATES' moduleId/subjectId are hardcoded to Quran."* Hadith Approaches need their own template set and ids. **The plan's instruction not to borrow Quran Approach numbers is correct and confirmed by the code.** The mechanism already exists and needs no new authority: `studiedTemplate()` / `practisedTemplate()` are the precedent for module-scoped trackables (`subjectId: null`). |
| **Study (Read/Note)** | `claimStatus()` in `records.js` takes `{ tenantId, personId, subjectId, unitKey, trackableId, statusId, … }`. **Entirely unit-type agnostic** — it parses `unitType` out of the key and stores it. | **Mounts unchanged.** No shared-code change required to record a Hadith claim, given a valid unit key and a trackable. |
| **Record & Track** | Six statuses (`not_applicable`, `not_started`, `learning`, `practising`, `achieved`, `mastered`); claim → confirm ramp with `confirmState`; I6 freezing; I7 exclusion. `computeConfirmationRequired()` derives who confirms from the person's own teacher/guardian/prime links — **not configured per subject except by an explicit `subjects.confirmationRequired` override**. | **Mounts unchanged.** Note the plan's wording *"Learning → Practicing → Achieved → Mastered"* — the repository spells it **`practising`** and carries **six** statuses, not four. Use the stored ids verbatim. |
| **Explore** | Per-Approach / per-unit aggregation reading `records` chunks. | Mounts, but its pooling is Quran-shaped (surah/juz/page). A Hadith hierarchy (collection → book → chapter) needs its own aggregation. New Hadith-owned code, not a shared change. |
| **Mapping My Journey** | `journey-map-contract.js` — pure, **imports nothing at all**, and a boundary check asserts that absence. Folder tree acyclic, own-owner, depth-bounded at 8. `journey-map-service.js` provides `folderContents`, `noteFilings`, `ownerFolderTree`, `moveNoteToFolder`. | **Fully subject-neutral — the best news in this audit.** MMJ can carry Hadith notes with no change to shared code. **One catch, see below.** |
| **Note identity** | ADR-004: a Note has permanent identity; origin and placement are relationships, not identity. `note-foundation.js` provides the full lifecycle (create, revise, retire, folders, placements, source links). `study-note-binding.js` (ADR-009) binds a Note to a unit key and **already accepts `hadith:` keys**, deriving `sourceKind: "hadith-unit"`. | **Already anticipates Hadith.** Permanent Note IDs are already distinct from Study Unit keys, and multiple notes per source are already supported. This satisfies the Start Prompt's item 4 requirement without new design. |
| **Roles / tenancy** | `hasRoleIn()`, `canRecordFor()`, `isSelfPerson()`, `personInTenant()`, `isCoEnrolledTeacherOf()` in `firestore.rules`; tenant isolation enforced in rules (I13), not only in queries. | **Mounts unchanged**, subject to §5's deployment gate. **Open, pre-existing:** teacher scoping is by *student*, not by *subject* — a co-enrolled teacher has record authority across every subject. A Hadith-only external teacher is therefore **not** enforceable today. This is a known open item, not a Hadith defect. |

### 4.1 The MMJ catch — "Hadith Reflection auto-folder" may cross an accepted gate

The Start Prompt asks for a *"Hadith Reflection auto-folder by collection and source order."* ADR-010 closes folder `semanticRole` at exactly three values — `journey-map`, `reflection-archive`, `user` — and records that **a fourth semantic role is an Owner Control Gate.**

Three ways to satisfy the request, only one of which crosses that gate:

1. A `user` folder auto-created and ordered — **no gate**, and the ordering the plan asks for is already supported (`notePlacements.order`, with a composite index already specified for it).
2. Hadith notes filed under the existing `reflection-archive` system folder — **no gate**.
3. A new `hadith-reflection` system role — **crosses ADR-010's gate.**

Recommendation: option 1 or 2. **Not decided here.**

---

## 5. The gate that blocks H2 as written: the Note Foundation is not deployed

This is the single most consequential constraint on the plan's schedule, and the plan does not account for it.

**The Note Foundation and Mapping My Journey collections have no deployed Firestore Rules.** Searched `firestore.rules`: zero occurrences of `notes`, `noteRevisions`, `noteSources`, `noteFolders` or `notePlacements`. They exist only in `docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`, which is a **candidate awaiting Owner deployment through the Firebase Console.**

An unruled collection is **denied by default**. So today, for every client:

- A Hadith Note cannot be created.
- A Hadith note cannot be filed into any MMJ folder.
- The Phase 4 Study-event evidence writer cannot write.

Additionally, **no composite index has ever been declared in this project** — `firebase.json` has no `indexes` key. The Note Foundation's queries need them, and deploying Rules without indexes would leave collections authorising queries they cannot execute. Rules and indexes must deploy together, indexes first.

**Consequence for the plan:** the Start Prompt's H2 deliverable bundles *"Study/Track/Explore/MMJ adapter"* into one gate. **Track mounts today. Note and MMJ cannot.** H2 should be split, or its Note/MMJ half declared blocked on the same Owner Control Gate that already holds seven pending items. Building a Hadith Note surface before that deployment produces a screen whose every write is denied.

This is not a Hadith problem and Hadith cannot fix it. It is reported so the tranche is planned around it rather than discovering it at test time.

---

## 6. Contradictions between the plan and the repository — the complete list

| # | Plan says | Repository says | Severity |
|---|---|---|---|
| C1 | Hadith is to be built | **A Hadith module already exists and is live** (topic-based, 5 subjects, one "Studied" trackable) | **Owner Control Gate** — decide before H1 |
| C2 | Narration identity is an opaque internal ID with separate `ExternalReference`; never infer cross-edition equivalence from a number | `buildUnitKey.hadith(collectionName, number)` → `hadith:bukhari:1` — keys by **name** and by an **edition-specific number** | **Owner Control Gate** — permanent Study Unit key |
| C3 | Create a separate worktree and `feature/hadith-study` branch from a verified current base; do not use the Quran builder's checkout | **One worktree exists**, and the branch this session is pinned to carries **21 unmerged Quran commits touching `note-foundation.js` and `journey-map-service.js`** | **Blocks isolation** — decide before H1 |
| C4 | H2 delivers a Study/Track/Explore/**MMJ** adapter | Note Foundation and MMJ collections have **no deployed Rules** and **no declared indexes**; every write is denied by default | **Blocks half of H2** |
| C5 | "the application is served from the repository root" | Root is a redirect stub; the app is at `/app/`. Two frozen archives also serve from this repository and write to the same live Firestore | Factual correction |
| C6 | Record & Track states `Learning → Practicing → Achieved → Mastered` | Six statuses, spelled `practising`, plus `not_applicable` (I7) and `not_started` | Use stored ids verbatim |
| C7 | Hadith Approaches need an inventory decision | Confirmed by code — `APPROACH_TEMPLATES` moduleId/subjectId are hardcoded to Quran | Plan is correct; mechanism exists |

### The C1 decision, with costs attached

| Option | What it means | Cost |
|---|---|---|
| **A — Extend** the existing `hadith` module with a narration corpus alongside its five topics | One module, one nav entry, one module id. Topic claims keep working untouched | The topic renderer is **shared with four other modules**; a Hadith-only corpus view must not leak into them. Needs a second renderer behind the same module id |
| **B — A second, separate module** (e.g. `hadith-corpus`) | Full isolation. The existing module is untouched, additive only (I4) | Two "Hadith" entries in the same navigation. Confusing to a reader unless named and placed deliberately |
| **C — Supersede**: the new module replaces the existing one; the five topics migrate into it | One coherent Hadith surface | **Touches live records.** Existing `topic:` claims would need re-keying or dual-reading. Destructive-migration territory, against I4 |

**My recommendation: B now, A later if the owner wants them merged.** It is the only option that is purely additive, needs no migration, and lets the corpus module be built and reviewed in isolation. The naming question ("Hadith" vs "Hadith Study" vs "Hadith Collections" in the nav) is small and reversible; the data question is not.

---

## 7. Proposed file-ownership map

Offered for agreement, not applied. No file below has been created.

| Owner | Paths |
|---|---|
| **Hadith branch — exclusive** | `app/hadith-*.html` (new corpus pages), `app/js/hadith-*.js`, `tools/hadith-data-pull/`, `tools/i18n-verify/hadith-*.mjs`, `docs/governance/hadith-*`, `docs/reports/*-hadith-*` |
| **Quran branch — exclusive, Hadith must not touch** | `app/quranrevival.html`, `app/js/quran-*.js`, `app/js/mastery-wheel.js`, `app/js/ayah-*.js`, `app/js/qcr*.js`, `app/js/study-approach-contract.js`, `app/js/study-activity-evidence*.js` |
| **Shared — frozen; change only by agreed contract amendment** | `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/note-foundation.js`, `app/js/study-note-binding.js`, `app/js/journey-map-contract.js`, `app/js/journey-map-service.js`, `app/js/catalogue-data.js`, `app/js/nav.js`, `app/js/version.js`, `firestore.rules`, `firebase.json`, all Rules and index candidates |
| **Never edited by anyone** | `legacy/index.html`, `legacy-v07/` |

**Shared interfaces needing agreement with the Quran builder, in priority order:**

1. `unit-keys.js` — whether a narration-occurrence key is added, and in what shape (C2). Highest risk: it is the one file both lines of work would change for different reasons.
2. `catalogue-data.js` — adding Hadith Approach templates and any new module/subject rows.
3. `nav.js` — one line, but it is duplicated as static markup across 22 pages.
4. `note-foundation.js` / `journey-map-service.js` — currently being actively extended on the Quran branch. **Hadith should treat both as read-only until that work merges to `main`.**

---

## 8. What H0 did not do, and why

- **No production data was read.** Whether any `hadith:` unit key exists in live Firestore is unverified; verifying it needs Firestore access this gate does not authorise. **Prerequisite to H1.**
- **One suite was run, as a baseline: `brief-integrity.mjs`, 6 passed / 2 failed.** No other suite was run — H0 changed no code, so there is nothing to regress. The harness's own rule, that suites must be run from the repository root, was followed and is recorded for the first tranche that does change code.

### 8.1 The two `brief-integrity` failures are a sandbox artefact, and the fact they test is true

Both failures read `Command failed: git rev-parse origin/claude/phase4-wiring`. Taken at face value this says the standing brief names an unmerged branch that no longer exists — which would be a real finding worth reporting.

**It is not.** Checked against the remote directly:

```
git ls-remote --heads origin claude/phase4-wiring
7e2931f795af1cd97efc1167660cea93aa22b9ab    refs/heads/claude/phase4-wiring
```

The branch exists, at **exactly the commit `7e2931f` the brief names.** This sandbox's clone simply has a narrow fetch refspec, so no local `origin/claude/phase4-wiring` ref exists for `rev-parse` to resolve. The guard is checking a true fact and failing on how this environment fetched the repository.

**Flagged, not fixed:** `brief-integrity.mjs` could fall back to `git ls-remote` when a ref is not fetched locally, and would then be correct in both environments. It is a shared `tools/` file on the Quran side of the ownership map in §7, so it is reported rather than changed. Whoever picks it up should know the failure is environmental and the brief itself is accurate.
- **No branch or worktree was created.** Blocked on C3 (§9).
- **No shared file was modified.** Per the Start Prompt: *"No shared mutation yet."*
- **No source text was fetched, imported or cached.** No request was made to sunnah.com, islamweb.net, OpenITI or HadeethEnc. Per the Source Register, no corpus is approved and the absence of a displayed licence is not permission.
- **Nothing was deployed, merged or published.**

---

## 9. Blocking decisions

**C3 — branch and isolation.** This session is pinned by its harness to `claude/beautiful-darwin-faeim7` and instructed never to push to another branch without explicit permission. The Start Prompt requires `feature/hadith-study` from a verified base. These cannot both be satisfied. Additionally, the pinned branch is not a clean base: it carries 21 unmerged Quran commits, five of them in `app/js/`, two in the very modules a Hadith adapter mounts on.

Recommended: cut `feature/hadith-study` from **`main`** (the verified base, v08.25) in its own worktree, and authorise pushing to it. Building Hadith on the current branch would entangle it with unmerged Quran work.

**C1 — the existing Hadith module.** Extend, run alongside, or supersede (§6). This changes the data model, the catalogue seed and the navigation, so it must be settled before H1 begins.

**C2 — the Hadith unit key.** Whether `buildUnitKey.hadith` is amended, superseded by a new narration-occurrence key type, or left alone with the corpus keyed some other way. A permanent Study Unit key is an Owner Control Gate; no change is proposed here.

Everything else in H1 — the source, edition, permission and commentary manifests, the reference and import schema, the synthetic fixtures — can proceed once C3 is answered, and does not depend on C1 or C2 being settled first.
