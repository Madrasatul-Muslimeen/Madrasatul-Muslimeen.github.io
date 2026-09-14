# MAP Phase 4, Task P4-A — the Study-to-Approach event contract, landed as a pure tranche

**Date:** 14 September 2026
**Version:** `08.23` → **`08.24`**
**Branch:** `claude/dreamy-tesla-0clj36`
**Authority:** Owner instruction of 14 Sep 2026 — resume MAP execution from the
first unfinished Phase 4 task after live acceptance of v08.23.
**MAP requirements:** Phase 4 (Study → Approach Connection Framework);
ADR-003 (Activity ≠ Mastery); ADR-008 (this contract); MAP §§9, 10, 11, 21, 22.
**Blast radius:** **BR-0** — two new pure modules, imported by nothing.
**Status:** built and fully verified. **PENDING OWNER LIVE VERIFICATION.**

**Not in this round:** no Firestore Rules change, no index, no migration, no
backfill, no production write, no event wiring, no UI change, no data-model
change, no change to the live Activity writer.

---

## 1. Reconciliation first — the 12 September records against today's `main`

The two 12 September documents are historical checkpoints. Reconciled against
the repository as it actually stands:

| Claim in the 12 Sep records | Reality on `main` today | Disposition |
|---|---|---|
| GitHub `main` = `4833b19c` | `main` = **`10961f3462aac73e63f678155483b5dbd9c5146c`**, app version **08.23** | **Superseded.** The Phase 2–3 verification merge (`07ebbde`, v08.19) plus v08.20–v08.23 landed after that snapshot |
| "Next bounded task: Task 68 — extract and independently validate a pure P2/P4 contract/index tranche onto current `main`" | The **P2 half is done** — word identity, the generated indexes and the Word Card are all on `main` | **Half-complete** |
| — | The **P4 half was never extracted.** ADR-008, `study-approach-contract.js`, `study-activity-evidence.js` and their two pure suites exist **only** on `claude/pensive-knuth-2pu3jj` | **This is the gap this task closes** |
| Ledger row: "4 Study event mapping contract — IMPLEMENTED + VERIFIED + ACCEPTED" | True of the *scope that was accepted*, **but not of the baseline**: `docs/governance/adr/` on `main` holds ADR-001…**007** only. ADR-008 is absent | **Conflict, reported and now closed.** An accepted decision that is not in the repository is not part of the accepted baseline |
| Phase 4 generic keyed Activity writer — "IMPLEMENTED + VERIFICATION PENDING" | Absent from `main`. `app/js/activity.js` on `main` is still the original `arrayUnion` append path — proven, not assumed | **Correctly excluded.** See §6 |

**No Git bundle was needed.** Current `main` was read directly from `origin`.
The still-isolated Phase 4 branch was fetched read-only and inspected to answer
the separate question the Owner asked — whether any of it is needed. Part of it
is (this tranche); the rest is gated (§6).

### Working-tree reconciliation

`claude/dreamy-tesla-0clj36` was at `origin/main` exactly — **0 ahead, 0
behind** — before any file was touched. One inconsistency worth naming: the
**local `main` ref was stale** at `6e9bee5`, 28 commits behind `origin/main`.
Two early presence checks run against it gave wrong answers and were re-run
against `origin/main`; every finding in this report is from `origin/main`.

### One documentation defect found, not caused by this round

`CLAUDE.md` on `main` still opens with a header block stating *"THIS BRANCH IS
THE PHASE 2-3 VERIFICATION MERGE CANDIDATE … Nothing here is deployed."* That
was true of the candidate branch and is **false of `main`**: the merge
completed on 13 Sep and GitHub Pages serves `main`. A session reading it would
believe the live app is an unmerged candidate. Corrected in this round.

---

## 2. What was chosen as the first eligible Phase 4 task, and why

MAP Phase 4 decomposes (MAP §21) into, in dependency order:

1. **the event-mapping contract** — pure policy, no storage, no wiring;
2. the Activity writer that persists evidence — needs Rules;
3. the UI event wiring for Reading, Listening, Journaling and WbW — needs (2).

Only **(1)** is eligible today. It is pure, additive, reversible, touches no
protected zone, and needs no Rules, no index and no data change. (2) and (3)
are blocked — §6.

So **Task P4-A** is: put the accepted contract into the accepted baseline, as
pure uninvoked policy, with the checks that keep it honest.

---

## 3. Change budget, as declared before coding

**Created**

| File | What |
|---|---|
| `docs/governance/adr/ADR-008-study-approach-event-contract-v1.md` | The accepted decision record, now in the register on `main` |
| `app/js/study-approach-contract.js` | Pure policy: the event → Approach map, the 80% Listening threshold, deterministic retry keys |
| `app/js/study-activity-evidence.js` | Pure projection: an event → one candidate Activity row. Persists nothing |
| `tools/i18n-verify/study-approach-contract.mjs` | 13 pure contract checks |
| `tools/i18n-verify/study-activity-evidence.mjs` | 11 pure projection checks |
| `tools/i18n-verify/study-approach-contract-boundary.mjs` | **New this round** — 16 checks, §5 |
| `docs/reports/2026-09-14-map-phase4a-study-approach-contract.{md,html}` | This report |

**Modified:** `app/js/version.js` (`08.23` → `08.24`), `CHANGELOG.md`, `CLAUDE.md`.

**Explicitly not touched:** `firestore.rules` · `app/js/activity.js` ·
`app/js/records.js` · `app/quranrevival.html` · `app/js/quran-word-card.js` and
every other Word Card file · `tests/firestore/` · any `app/*.html`.

**Data structures added or changed:** none. **External dependencies:** none.
**Rollback:** delete the six new files and restore `version.js`. Because the
modules are imported by nothing, removing them cannot break a running page.

---

## 4. What the contract actually says

ADR-008 v1, `study-approach-contract:v1`. Every mapped event appends **Activity
evidence only**; none of them grants `achieved` or `mastered`. Mastery still
moves only through the existing explicit claim and, where required, the
existing confirmation workflow — ADR-003 unchanged.

| Event | Approach | Activity | Mastery |
|---|---|---|---|
| `reading.completed` | `approach_01` Reading (with Tajweed) / `approach_03` Reading (with Meaning), by Study mode | one `practised`, deduplicated per unit per UTC day | **none** |
| `listening.completed` | `approach_07` Listening (Arabic only) / `approach_08` Listening (Arabic with meaning) | one `practised`, only past **80%** of the selected unit | **none** |
| `journal.note-created` | `approach_10` Journaling | one `practised` per committed new Note | **none** |
| `journal.note-revised` | `approach_10` Journaling | at most one per Note per UTC day | **none** |
| `wbw.engaged` | `approach_04` Reading — Word-by-Word Meaning | one `practised` per occurrence per UTC day | **none** — the dedicated WbW approval state stays separate |
| `status.claimed` / `status.confirmed` | — | the existing entries | the **only** two that move mastery |

Deliberately *not* counted: opening or scrolling a passage; seeking, looping,
buffering, failed playback, background preload; opening, typing in or
cancelling a draft Note.

---

## 5. The checks this round added, and why they are the ones that matter

The two extracted suites (24 checks) exercise the modules' functions. Passing
them would not have caught the two ways this tranche could really go wrong, so
a third suite was written for exactly those.

**A. The modules must stay uninvoked.** The whole safety claim of this tranche
is "landing it changes nothing", and that claim is about *wiring*, which no
function-level test can see. The suite reads every `.js` and `.html` under
`app/` and asserts that nothing imports either module; that the evidence module
imports only the contract and word identity; that the contract module imports
nothing at all; and that neither can reach `firebasejs`, `runTransaction`,
`arrayUnion`, `activity.js`, `records.js`, `envelope.js`, `claimStatus`,
`achieved` or `mastered`. It also asserts `activity.js` still uses its existing
`arrayUnion` path and carries no `v1Events`.

**B. A hardcoded Approach id can silently come to mean the wrong Approach.**
The contract names `approach_07` as a literal. If a later round renumbers the
catalogue, every one of the 24 function checks keeps passing while real study
is credited to the wrong Approach — a defect invisible on any screen. So the
suite reads `APPROACH_TEMPLATES` and asserts each id still carries the exact
English name the contract means, that the policy references no Approach outside
that set, and that all 30 are still present. **All six ids verified against the
live catalogue: `approach_01/03/04/07/08/10` are exactly the six Approaches
ADR-008 names.**

**C. Permanent keys (I5) must be the app's own.** The evidence module accepts
unit keys by regexp. The suite builds them with `buildUnitKey.ayah/range/surah`
and the occurrence id with `quranWordOccurrenceId`, and asserts those exact
values are accepted verbatim — and that `juz`, `ruku`, `page`, `hizb`, `topic`
and `name` keys, also built by `buildUnitKey`, all **fail closed**.

### One of my own checks was wrong, and was corrected rather than believed

The forbidden-token check failed on `study-activity-evidence.js` for
`claimStatus`. Investigated before changing anything: the only occurrence is
the module's **own header comment**, *"never persists evidence and never calls
Records/claimStatus"* — the check failed on the sentence promising the very
thing it was checking for. It now scans code with block comments and whole-line
comments removed. Trailing `//` comments are still scanned deliberately: that
errs towards a false alarm, never a missed wiring.

### Proven able to fail — four deliberate mutations, each caught

| Mutation | Result |
|---|---|
| `import { studyEventPolicy }` added to `app/js/records.js` | **FAIL** — "no app source imports the guarded modules" |
| `approach_07` swapped for `approach_09` in the policy | **FAIL** — "the policy references no Approach outside that set" |
| The gated keyed `activity.js` copied in from the isolated branch | **FAIL** — "activity.js still uses its existing arrayUnion append path" |
| `tests/firestore/activity-v1.proposed.rules` copied in | **FAIL** — "no Firestore Rules or index file is touched by this tranche" |

The working tree was restored after each, and the suite returns 16/16.

---

## 6. What is NOT in this round, and the exact gate on each

**The keyed Activity writer** — `app/js/study-activity-week.js`, the rewritten
`app/js/activity.js`, `tests/firestore/activity-v1.proposed.rules` and its
security matrix — is deliberately left on `claude/pensive-knuth-2pu3jj`.

It is not merely unverified; it is **blocked on a real, named, unresolved
security question**. Its own Task 50 audit caveat records it: the prototype
hashes the raw `eventKey` with SHA-256 to get a safe map field name, and
**Firestore Rules cannot recompute that hash from the event payload**. Rules can
enforce create-only map keys and preserve old values, but cannot establish that
two different supplied hash keys do not carry the same raw event key. So the
honest-client retry property must not be described as server-enforced
uniqueness.

On top of that, the branch's `activity.js` stops appending to `entries[]` for
general activity and moves new writes to a `v1Events` map, compensating on read
with a dual-read projection. That is a **BR-3 change to the write shape of a
live collection that holds real Owner data**, and the deployed Rules would not
enforce the new invariants.

> **OWNER CONTROL GATE — no decision is being asked for in this delivery.**
> Integrating the keyed Activity writer requires, together: (a) approval of the
> `v1Events` storage design including how event-key integrity is established
> *or* an accepted statement that it is not server-enforceable; (b) a Rules
> candidate that compiles and passes a full allow/deny emulator suite; (c) an
> explicit decision to deploy those Rules; (d) accepted compatibility and
> rollback analysis for existing `entries[]` data. Until all four exist, Phase 4
> tasks (2) and (3) stay blocked, and nothing in this round moves them.

**Also not touched:** DDR-001, DDR-002, DDR-003 and DDR-004 are all untouched
and remain INACTIVE/DEFERRED. The Phase 5 Note Foundation material on that
branch is out of scope. Phase 2–3 behaviour and the accepted Word Card
behaviour are unchanged — proven in §7.

---

## 7. Tests executed

Every line below was run on this tranche. Nothing is reported as passing that
was not run.

### This round's own suites

| Suite | Result |
|---|---|
| `study-approach-contract.mjs` | **13 passed, 0 failed** |
| `study-activity-evidence.mjs` | **11 passed, 0 failed** |
| `study-approach-contract-boundary.mjs` | **16 passed, 0 failed** (new) |

### Phase 2 / Phase 3 — the accepted baseline, unchanged

| Suite | Result | v08.23 baseline |
|---|---|---|
| `quran-word-card.mjs` | 36 passed, 0 failed | 36 |
| `quran-word-card-integration.mjs` | 10 passed, 0 failed | 10 |
| `quran-word-card-rendered.mjs` | **122 passed, 0 failed** | 122 |
| `quran-word-identity-contract.mjs` | 6 passed, 0 failed | 6 |
| `quran-word-indexes.mjs` | 9 passed, 0 failed | 9 |
| `quran-word-index-loader.mjs` | 8 passed, 0 failed | 8 |
| `quran-word-progress-model.mjs` | 57 passed, 0 failed | 57 |
| `quran-word-progress-data.mjs` | 37 passed, 0 failed | 37 |
| `quran-word-progress-rendered.mjs` | **81 passed, 0 failed** | 81 |
| `quran-word-explore-rendered.mjs` | **35 passed, 0 failed** | 35 |
| `quran-word-coverage.mjs` | 10 passed, 0 failed | 10 |
| `quran-word-coverage-arabic.mjs` | 29 passed, 0 failed | 29 |
| `quran-boundary.mjs` | 30 passed, 0 failed | 30 |
| `stub-parity.mjs` | 3 passed, 0 failed | 3 |

### Regression

| Check | Result |
|---|---|
| `behaviour.mjs` | **800 passed, 3 failed** — the documented baseline, identical to the v08.23 run |
| `layout.mjs` | **Every landing-page metric byte-for-byte identical** at all 16 configurations |
| `navcheck.mjs` | **Unchanged** — the single pre-existing problem only |
| `reading.mjs` | **`READING SCREEN OK`** in both `en` and `bn` |
| `panel.mjs` | **48 configurations per language, 0 truncated labels, 0 wrapped bars** |
| Translation coverage | **1,803 scanned / 47 missing — both unchanged** |

#### `behaviour.mjs` — 800 / 3

The three are section 22g, the `archive.org` poster block this sandbox's proxy
enforces. The run then stops at the documented section-42
`[data-note-master-toggle]` visibility crash carried since v07.69 — the same
803 total, the same three, the same stopping point as v08.22 and v08.23. **No
check the suite reaches needed updating**, which is the expected result for a
round that adds modules nothing calls.

#### `layout.mjs` — nothing moved, and the comparison could really fail

16 measurements (8 viewports × 2 banner states). Wheel-heading top, wheel width,
Approach row count, dock gap, dock visibility and page overflow are **identical
before → after at every one**; the suite printed `CHANGED:` **zero** times, and
there were **zero page errors, zero overflows, zero lost Approach rows**.
`getElementById` targets **250 → 250**, with the same 22-entry pre-existing
missing list (the `asmaX*` / `qcr*` ids recorded across many rounds).

Its non-zero exit is that pre-existing missing list, which the suite counts once
per configuration — 16. It is **structurally proven pre-existing**, not asserted:
`app/quranrevival.html` is **byte-for-byte identical to `HEAD`** (`diff` empty),
so the list the suite reads from the "after" page *is* `HEAD`'s own list.

The before/after shim was set up so it could actually fail. `HEAD`'s
`quranrevival.html` became `app/_prev-quranrevival.html`, and because the only
app-code change this round is the version string, `HEAD`'s `version.js` was
dropped in as `app/js/_prev-version.js` with the shim's import repointed at it —
so "before" really rendered **v08.23** against "after" **v08.24**. Without that
both sides would have read v08.24 and the run would have proven nothing. Both
shims were deleted before the coverage total was read.

#### `navcheck.mjs` — the one problem is the pre-existing one

The 320 px **English** truncation of "Operation" and "Bookmark" (73 px needed,
65 px available), exactly as `CLAUDE.md` has recorded it for many rounds. Bangla
is clean at every width; both languages keep 4 nav buttons on one line, with no
overflow, at 320/360/390/412/768 px. `app/js/nav.js` and the `<nav>` block are
untouched by this round, so it cannot have been introduced here.

#### `panel.mjs` — both languages

48 configurations each, **0 truncated labels and 0 wrapped bars** in both. The
suite does report pre-existing `<select>` truncations (`tenantSelect`,
`surahSelect`, `rangeFromSelect`, `rangeToSelect`, `unitNumSelect`); those are
not label or bar problems, they are unchanged, and they cannot be this round's —
the page is byte-identical to `HEAD`.

---

## 8. Deployment and data status

| | Status |
|---|---|
| `firestore.rules` | **UNCHANGED**, byte-for-byte |
| Firestore indexes | **none changed, none deployed** |
| Migration / backfill | **none** |
| Production data writes | **none** |
| `tests/firestore/word-progress-v1.proposed.rules` | still **CANDIDATE ONLY, NOT DEPLOYED** — unchanged Owner Control Gate |
| `quranWordProgress` / `quranWordApprovals` | still have **no server-side rule**, so word progress still works only for the Owner's own account. Unchanged by this round, repeated because it affects what you see |
| GitHub Pages | serves `main`. **This tranche is on `claude/dreamy-tesla-0clj36`, NOT on `main`, so it is NOT live.** The live app still reads **v08.23** until the branch is merged |

---

## 9. Live test — ninety seconds

**First, the honest position on where this is.** The work is pushed to
`claude/dreamy-tesla-0clj36`, not to `main`. GitHub Pages serves `main`, so
**the live app still reads v08.23 and will keep doing so until this branch is
merged.** Merging is an integration decision (MAP Gate E) and is yours, not
mine; say the word and it will be done, or test it from the branch first.

This tranche deliberately changes **nothing you can see except the version
number**, so the test is mostly a test that nothing broke.

1. Open the app. Once the branch is merged, the badge beside the name should
   read **v08.24**. Until then it correctly still reads **v08.23** — that is not
   a failure.
2. Study → Read, word-by-word on, tap any Arabic word. The Word Card should
   open exactly as it did in v08.23 — one tidy group per row
   (`Noun  سَلَٰم  42 occurrences`), no long empty gap mid-row, and `Proper
   Noun +1` on one line.
3. Open **Arabic in Depth**, expand a form; the occurrence rows should still be
   grouped the same way.
4. Go back to the landing page. All your Approach rows, the Mastery Wheel and
   the dock should look exactly as before.
5. Switch to Bangla and glance at the same two screens.

**Expected result: no visible change anywhere except `v08.24`.** If anything
looks different, that is a finding — say so and it will be treated as one.

**v08.24 is NOT Owner-verified until you confirm it.**

---

## 10. What is pending, and the next eligible task

**Pending Owner action, two things:** (a) the integration decision — this
tranche sits on `claude/dreamy-tesla-0clj36` and is not on `main`, so it is not
live; (b) live verification of v08.24 once it is (§9).

**Next eligible task, needing no new authority:** there is none inside Phase 4.
Tasks (2) and (3) both sit behind the Owner Control Gate in §6. The honest next
bounded task under MAP §21 is therefore either the Owner's decision on that
gate, or a Phase 4 task that needs neither storage nor Rules — of which the
contract was the last.

**STATUS: AWAITING HUMAN SIGN-OFF.**
