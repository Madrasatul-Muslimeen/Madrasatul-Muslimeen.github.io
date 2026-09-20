# MAP v4 Gate A/B planning — requirement-by-requirement status matrix

- **Date:** 2026-09-20 UTC (system clock; no discrepancy found against the authoritative date supplied with this task)
- **Branch:** `claude/laughing-goodall-0q0emg`
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **Task source:** issue #113, comment `5752544463` ("MAP v4 Gate A/B planning only")
- **Scope:** planning and investigation only. **No application code, Rule, index, version, or protected/shared path is changed by this report.**
- **Status:** evidence at a checkpoint, stopped deliberately at Gate B. `OWNER ACTION: NONE required to read this report; ONE decision named in §7 is needed before the selected milestone may be coded.`

## Owner app-test section (required by this task's own instructions)

**Required: NO.**

This report changes nothing a reader can open, click, or claim against. It is
a planning document only — no file under `app/`, no Firestore Rule, no index
candidate, and no version stamp is touched. There is nothing here for the
Owner to test in the live app. If the recommendation in §6 is later coded and
merged, that future PR will carry its own Owner app-test section naming an
exact URL, role, steps and expected result.

---

## 0. What this report is answering, and what it deliberately is not

Issue #113's comment asked four things: (1) verify MAP v4's own phase
numbering and treat it as **potentially distinct** from this repository's
other phase labels, rather than assuming a historical "Phase 2 closed" report
closes anything in MAP v4 terms; (2) inspect `main`, the ADR/DDR set, the
integration ledger and PRs #104/#110/#112; (3) produce a requirement-by-
requirement status matrix for MAP v4 Phases 1–8 with evidence links, gaps and
dependencies, and the shortest route to a page-reachable Study/Note and
Mapping My Journey; (4) select **one** bounded next milestone, declare its
file budget, data/security impact, rollback and tests, and **stop at Gate B**
— no coding.

This report does all four, using only what exists in this repository. It does
**not** implement the selected milestone, does **not** touch any protected or
shared path, and does **not** allocate a version.

## 1. Is MAP v4 itself accessible in this repository? No — confirmed again

The comment names the source document as
`QuranRevival_Master_Architect_Plan_MAP_v4(1).docx`, in the Owner's own
Library, and instructs: *"request its text through the Master Architect only
if inaccessible."* This bridge has no channel to the Master Architect and no
access to the Owner's Library; it can only report the fact and proceed on
repository evidence, which is what the comment's own fallback anticipates.

A repository-wide search (full history, every branch, after fetching the two
remote refs this bridge's own guards need) finds **no MAP v4 document,
execution ledger, or `.docx` of any kind** anywhere in this repository. This
is not a new finding — it is the third time it has been recorded:

- `docs/reports/2026-09-12-reconciliation-and-phase2.md` §1: *"MAP v4, the
  execution ledger and the recovery report are not present in any branch of
  this repository and were not attached to this session."*
- `docs/reports/2026-09-13-map-phase3-arabic-progress.md` repeats the same
  finding verbatim.
- This report, 2026-09-20: same grep, same result, against a fully-fetched
  history including both refs the governance guards require.

**Consequence, stated plainly rather than worked around:** nothing in this
report can *verify* MAP v4's phase numbering against the source document
itself, because the source document is not here. What follows instead is the
next best evidence available inside the repository: the phase numbering the
task's own comment states outright (*"phases 2–8 are Word Identity/Card;
Arabic Progress; Study→Approach Activity; Note Foundation; Mapping My
Journey; Dawah; Share/Media"*), cross-checked against every place that
numbering already appears in committed repository evidence — the ADRs, the
2026-09-12/13 reports, and the ledger. Phase 1 is not named in the comment
and appears nowhere in the repository as an explicit MAP v4 label; §3 records
it as **unattested** rather than guessed.

## 2. The real finding: two distinct phase-numbering schemes coexist, and one recent PR conflated them

This is exactly the risk the task comment flagged (*"compare repository
phase labels as potentially distinct; do not assert global closure from a
historical Phase 2 report"*), and it is real, not hypothetical.

**Scheme A — MAP v4's own numbering**, attested by ADR-005 (*"Affected
requirements: MAP §§1,3,20 Phases 7–8,22"*, naming Dawah=7 and Share=8,
matching the task comment exactly) and by the 2026-09-12 report's own §5/§8,
which grades Word Card/word-identity work as **"Phase 2"** and points
**"Next: Phase 3"** at WbW self-progress / Arabic coverage — i.e. Arabic
Progress. Both ADR-005 and the 2026-09-12 report are describing the same
numbering the task comment names.

**Scheme B — `CLAUDE.md`'s own "Build phases" list**, unrelated in content
and origin: *"Phase 0 Foundation · 1 Identity & access · 2 Catalogue · 3
Tracking core · 4 QuranRevival module · 5 Migration & parity · 6 Deen Study &
topic renderer · 7 Bookmarks, programs, routines · 8 Monitor & reports · 9
Homework & feedback · 10 Classes & provider · 11 Curriculum, grades &
resources · 12 Remaining modules · 13 Full messaging & extras · 14 Operations
· 15+ Reserved."* This is the platform build-rollout sequence from the
original Architecture document, and `CLAUDE.md` records **all of 0–13** as
"complete" or "built" in some round state.

**The numbers collide, and PR #112's own body cites Scheme B numbers to
support a Scheme A conclusion.** Its text reads: *"this repository has since
built and owner-verified Phases 0, 1, 2, 3, 4 and 6 in full, with Phases
7–13 in various built/round states... five phases and roughly 30 versions
past Phase 2's own closure."* Those numbers — 0, 1, 2, 3, 4, 6, 7–13 — are
`CLAUDE.md`'s Build-phase numbers (Foundation, Identity, Catalogue, Tracking
core, QuranRevival module, Deen Study, Bookmarks…), not MAP v4's. Citing
their completeness as evidence about **MAP v4's own** Phase 2 being safely
behind us is citing the wrong scheme's arithmetic to support a real but
differently-sourced conclusion. The underlying conclusion PR #112 reached —
that MAP v4 Phase 2 (Word Identity/Card) really is closed, and the
repository has moved well past it — is **independently correct** (§3 below
re-derives it from Scheme A evidence only), but the citation supporting it
was the wrong scheme. This report records the correction rather than
repeating the conflation.

**Practical rule going forward, stated so it does not have to be
rediscovered a fourth time:** when a session (this bridge's own future runs
included) says "Phase N" in this repository, it must name **which** scheme —
"MAP v4 Phase N" or "Build Phase N" — because the same digit means two
different, unrelated things.

## 3. Requirement-by-requirement status matrix — MAP v4 Phases 1–8

Evidence column links are repository paths, all present on `main` at the
baseline this report reads (`origin/main` tip **`2cb405e3`**, the same commit
this branch and PRs #104/#110/#112 are all based on).

| MAP v4 Phase | Repository label(s) | Status | Key evidence | Gaps / dependencies |
|---|---|---|---|---|
| **1 — (unattested)** | No explicit MAP v4 Phase 1 label found anywhere in the repository. | **UNATTESTED** — not guessed here. | ADR-001 (`existing-app-evolution.md`) is the closest thing to a "Phase 1"-shaped foundational decision (the app evolves from v08.02 rather than being rebuilt), but it is never labelled Phase 1 in any committed text. | Needs the actual MAP v4 text, or explicit Master Architect confirmation of what Phase 1 is, before this row can be filled honestly. |
| **2 — Word Identity/Card** | 2026-09-12 report §5/§8 ("Phase 2… closed"); ADR-002, ADR-007. | **CLOSED on its own executable criteria (2026-09-12), and extended since.** | `docs/reports/2026-09-12-reconciliation-and-phase2.md` §5 (10/10 acceptance criteria ✅, 92 rendered checks); `app/js/quran-word-card.js`; PR #112 (open, draft) adds a further Basic-tab lemma-occurrence toggle on top of the closed baseline. | None blocking. PR #112 is an unmerged, no-version-allocated enhancement on top of an already-closed phase — not a reopening of it. |
| **3 — Arabic Progress** | 2026-09-12 report §8 ("Next: Phase 3"); CLAUDE.md "MAP Phase 3" entries, v08.14–v08.19. | **BUILT, owner-verified per CLAUDE.md; Rules candidate undeployed.** | `app/js/quran-word-progress.js`, `quranWordProgress`/`quranWordApprovals` collections; `tests/firestore/word-progress-v1.proposed.rules` (42 emulator assertions). | `firestore.rules` byte-for-byte unchanged — the two collections have no live server-side rule. Blocked on **E1**. Basic Arabic / Arabic in Depth claim units are refused by design pending a DDR-class decision on their claim unit. |
| **4 — Study→Approach Activity** | CLAUDE.md "MAP Phase 4" P4-A…P4-E, v08.24–v08.31; ADR-008 (+ two amendments). | **Built and wired for D1/D2/D4 (v08.30); D3 wired documentation-only (19 Sep); gated shut by design (v08.31).** | `app/js/study-activity-evidence.js`, `app/js/study-event-wiring.js`, `app/js/study-evidence-readiness.js` (`ready: false` literal). | `firestore.rules` contains the word "evidence" zero times — every write is denied. Blocked on **E1**. The held `claude/phase4-wiring` branch (`7e2931f`) is superseded-by-rederivation and stays untouched per standing instruction; its `08.26` stamp is historical only. |
| **5 — Note Foundation** | CLAUDE.md "MAP Phase 5" P5-A…P5-F; ADR-004, ADR-009. | **Data layer built pure/uninvoked (P5-A…F); no editor surface exists.** | `app/js/note-foundation.js`, `app/js/study-note-binding.js`, `app/js/study-note-service.js`; `docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules` (53/0 emulator, 31/37 accepted matrix); `docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json`. PR #104 (open, draft) fixes a real `retirePermanentNote()` defect against this candidate; PR #110 (open, draft) records why a genuine Rules-engine proof of that fix is not buildable in this sandbox today. | **P5-D, the Note editor UI, is deliberately not built** — CLAUDE.md: "a real behaviour change… every write it made would be denied until the Note Foundation Rules and indexes are deployed." Blocked on **E1**, then on a version allocation once E1 clears. No page anywhere in `app/*.html` renders a permanent Note. |
| **6 — Mapping My Journey** | CLAUDE.md "MAP Phase 6" P6-A…P6-E; ADR-010. | **Data layer built pure/uninvoked (folder CRUD, placement read/write/move); zero UI.** | `app/js/journey-map-contract.js` (imports nothing — Origin≠Destination enforced by inability), `app/js/journey-map-service.js`; `docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules`; `docs/governance/phase6-journey-map-indexes-candidate-2026-09-17.json`. | **No `app/*.html` page or route for Mapping My Journey exists at all** — confirmed by search (`find app -iname "*journey*" -o -iname "*mapping*"` returns only the two `.js` files above). Blocked on **E1** for the Rules/index, and separately on an Owner product decision — ADR-010 itself: *"What a Journey Map looks like, is for, or contains is product and an Owner Control Gate."* Server-side cycle prevention for folders is also an open, costed Owner decision (client-side-only enforcement today). |
| **7 — Dawah** | ADR-005 (*"MAP §§1,3,20 Phases 7–8,22"*). | **NOT STARTED.** | ADR-005 is the only artefact naming Dawah; it is a design constraint (*"Dawah is broader than Share… must never overwrite its source Note"*), not an implementation. | No page, module, or data-layer file exists anywhere in `app/` (confirmed by search). Depends on Phase 5/6 being page-reachable first, per ADR-005's own "derived output" framing (a Dawah artefact derives from a Note). |
| **8 — Share/Media** | ADR-005 (as above). | **NOT STARTED.** | Same single ADR-005 reference as Phase 7; no Share/media page, module or schema exists. | Same dependency chain as Phase 7 — derives from Notes that do not yet have a page-reachable editor. |

**Cross-check against PRs #104/#110/#112**, all open drafts, all based on the
same `main` tip (`2cb405e`), none merged, none in conflict with each other
(#104 and #110 both touch Note Foundation material but #110 is a report-only
PR that deliberately does not stack on #104's code change; #112 touches only
`quran-word-card.js`/`quranrevival.html` and does not overlap either):

- **#112** is Phase 2 (Word Identity/Card) polish on an already-closed phase — no gate crossed, unmerged, no version allocated.
- **#104** is a Phase 5 (Note Foundation) bug fix inside the existing pure/uninvoked data layer (`retirePermanentNote()`), with a genuine emulator-backed proof added in its own round 2 — no protected path touched, no version allocated.
- **#110** is a Phase 5-adjacent investigation report explaining why a *second*, independent emulator proof could not be built without touching protected `tools/firestore-emulator/`/`tests/firestore/` paths — correctly declined rather than worked around.

None of the three changes what §3's matrix says: Phases 2–4 remain ahead of
Phases 5–8 in that order, and Phases 5–6's remaining gap is UI + E1, not data
layer.

## 4. The shortest route to a page-reachable Study/Note and Mapping My Journey

Both are blocked by the **same single external dependency**, plus one
further gate each:

1. **E1 — Firestore Rules and index deployment**, `docs/governance/programme-integration-ledger.json` `openOwnerDecisions[].E1`: *"OPEN — external Firebase Console access. Seven ledger items depend on it."* This requires the Owner (or someone with `study-monitoring` Firebase Console access) to deploy, **indexes before rules**, using the already-assembled package at `docs/governance/phase4-6-production-deployment-package-2026-09-17.md` and `phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`. No sandbox session has ever had these credentials; this is not a coding gap.
2. **For Study/Note specifically**, once E1 clears: build **P5-D**, the Note editor surface. CLAUDE.md already scopes this as *"a real behaviour change (version bump, full layout measurement)"* — an Owner Control Gate of its own (version allocation), separate from E1. No DDR item blocks it.
3. **For Mapping My Journey specifically**, once E1 clears: there is currently **no UI at all**, not even a first draft — this is a bigger step than Note's "editor not yet built," it is "screen not yet started." ADR-010 states plainly that *what the screen shows* is a product decision the Owner must make before it can be built, separate from and in addition to E1.

So: **Note is one deployment (E1) plus one bounded UI build (P5-D) away** from
page-reachable. **Mapping My Journey is one deployment (E1) plus one Owner
product decision plus a UI build from scratch** away — a strictly longer
route than Note's. Neither route can be shortened by coding around E1; both
data layers are already built and waiting.

## 5. What is NOT blocked by E1 or by a DDR item today

Re-reading PR #104's own enumeration (12 MAP candidates, each tagged with its
exact dependency) against this report's own matrix confirms its finding: of
those 12, 4 are gated purely on E1, 4 on an Owner/Master Architect DDR-class
decision, 2 need a shared-path edit this bridge cannot make unilaterally
(`bn.js`, `nav.js`), 1 is Owner UI debt (O3/O3b/O3c), and exactly **one is
genuinely unblocked today**: extending `noteSources` so an existing,
already-created Note can gain a further active source-link binding after its
own creation transaction, rather than only at birth.

This is confirmed independently in this session, not merely repeated from
PR #104:

- The accepted Phase 5 Rules candidate (`docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules`, `noteSources` match block) authorises **`create`** on a `noteSources` document at any time a well-formed link names an existing Note the requester owns — nothing in the Rules text restricts creation to the Note's own birth transaction.
- The data layer (`app/js/note-foundation.js`, `app/js/study-note-binding.js`) currently only ever writes a `noteSources` document as part of the Note-creation transaction. `retireNoteSource()` already exists (P5-F, 17 Sep) to retire one link, but nothing lets an **existing** Note acquire a **new, additional** active source link after it already has one (or after its original link was retired).

This is exactly the repository's own recurring pattern (CLAUDE.md standing
lesson: *"Ask what the accepted Rules authorise, then what the code can
perform"*) — an authorised capability the data layer cannot yet exercise.

## 6. Selected next bounded milestone — stop at Gate B here, no coding

**Selected: a bounded `noteSources` re-binding function** — let an existing,
already-created Note gain a new active source-link binding to a permanent
Study Unit key, independent of the Note's own creation transaction.

This is chosen over every other candidate in §3/§5 because it is the **only**
one requiring neither E1 (Firestore deployment) nor an Owner/Master Architect
DDR-class product decision nor a protected-path edit. It does not itself make
Study/Note or Mapping My Journey page-reachable (§4's route is unchanged by
it — it is a Note Foundation data-layer completeness fix, not a UI surface),
but it is genuine, safe, in-scope Phase 5 progress that needs no external
unblocking.

**File budget (declared, not yet created):**

| File | Action | Why |
|---|---|---|
| `app/js/note-foundation.js` and/or `app/js/study-note-binding.js` | **Modify** — add one new exported function performing the additional-binding write, reusing the existing `noteSources` write shape and `ownershipWellFormed()`-equivalent checks already present for the birth-time binding. | The write shape already exists once; this is additive reuse, not a new pattern. |
| `tools/i18n-verify/note-foundation-data-layer.mjs` | **Modify** — new assertions calling the real function, mirroring the pattern PR #104 already used for `retirePermanentNote()`. | This repository's own rule: a function with no test calling the *real* code proves nothing (found twice already in this exact file). |
| `tools/i18n-verify/study-note-boundary.mjs` | **Modify (narrow, pinned exception)** — same "insertion only" guard PR #104 already had to narrow for its one-line fix, extended by exactly the new lines this adds. | The existing guard's literal claim ("0 removed lines") does not survive any change inside the file; PR #104 already established the pinned-exception pattern to use instead of weakening it generally. |
| `app/*.html`, `app/js/version.js`, `firestore.rules`, `firebase.json`, `docs/governance/*`, any other protected/shared path | **Untouched.** | No UI surface calls the new function (it stays page-unreachable, same as every other Note Foundation module); no version bump; no Rules change — the candidate Rules already authorise this write. |

**Data/security impact:** none in production. The function writes only to
the existing `noteSources` shape the accepted-but-undeployed candidate
already governs; until E1 clears, the collection has no live Rule and every
write is denied in production regardless. No schema change, no new
collection, no change to `notes` or `noteRevisions`.

**Rollback:** delete the new function and its two test files' additions;
`git diff` would be empty everywhere else. No data migration, because nothing
would ever have been written to production (E1 still closed).

**Tests:** the pattern PR #104 already established — real-function assertions
in `note-foundation-data-layer.mjs`, mutation-proof (revert the change, watch
the specific assertion fail, not a broad one), boundary-guard narrowing
proven both ways (passes with the addition; still fails, naming the pinned
line, on an unrelated-line-removal mutation), plus all seven governance
suites (§7).

**Stopping here, deliberately, per this task's own instruction.** The exact
function signature, its exported name, and its precise field set are
implementation-session decisions, not planning-session ones — Gate B's job is
to establish that this is the right bounded unit of work and that its
boundary is real, not to pre-write the code. No file listed above has been
created or modified by this report.

## 7. Owner / Master Architect items — what actually needs a decision

Nothing in this report is blocked pending a decision to be *read*. Exactly
**one** decision would be needed before §6's milestone could be **coded**,
and it is procedural, not architectural:

- **Master Architect authorisation to proceed with §6's implementation** —
  this report is Gate B: a proposal for audit, not a self-authorising
  instruction. No DDR item, Owner UI decision, or protected-path edit stands
  in its way; only the standing "one bounded task at a time" / "STOP at Gate
  B for audit" rule this task's own comment invoked.

Separately, and already on record rather than reopened here: **E1** (Firebase
Console access) remains the single blocker for every page-reachable Phase
4–6 surface, and the Phase 6 UI itself additionally needs an Owner product
decision on what a Journey Map screen shows (ADR-010). Neither is new; both
are restated in §4 for completeness, not raised as fresh asks.

## 8. Governance suite results (repository root, full history + both required remote refs fetched)

```
1) node tools/i18n-verify/programme-ledger.mjs
2) node tools/i18n-verify/programme-ledger-mutations.mjs
3) node tools/i18n-verify/brief-integrity.mjs
4) node tools/i18n-verify/study-activity-evidence-boundary.mjs
5) node tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs
6) node tools/i18n-verify/study-event-wiring.mjs
7) node tools/i18n-verify/rules-authorisation-executable.mjs
```

Results are recorded in the accompanying pull request body (run against this
report's own commit, after it was written, so the numbers reflect the actual
diff this PR carries).

## 9. What this report deliberately does not do

- Does not implement §6's milestone — no `app/js/note-foundation.js`,
  `study-note-binding.js`, or any test file is modified by this report.
- Does not touch any protected/shared path from this bridge's own table:
  checked against the full list (`app/js/version.js`, `CLAUDE.md`,
  `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`,
  `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`,
  `app/css/shell.css`, `tools/i18n-verify/{behaviour,harness,firebase-stub,
  brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`,
  `docs/governance/*`, `firestore.rules`, `firebase.json`, `tests/firestore/`,
  `tools/firestore-emulator/`, `.github/workflows/`) — none modified.
- Does not allocate a version. `app/js/version.js` is untouched; `main` and
  this branch both read `08.31`; `08.32` stays unallocated per the ledger.
- Does not merge, deploy, or claim an approval.
- Does not pick a "next Phase 2 acceptance item" the way issue #113's earlier
  comment asked, because — per §2/§3 — MAP v4 Phase 2 really is closed, on
  MAP v4's own numbering, and has been since 2026-09-12; the live edge of
  work is Phases 4–6, all gated on E1 and/or an Owner decision, with exactly
  one genuinely unblocked bounded item (§5/§6) selected instead.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
