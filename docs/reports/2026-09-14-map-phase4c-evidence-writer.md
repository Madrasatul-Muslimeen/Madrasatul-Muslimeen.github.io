# MAP Phase 4 — P4-C: the Study Activity evidence writer

**Date:** 14 September 2026
**Version:** `08.24` → **`08.25`**
**Branch:** `claude/dreamy-tesla-0clj36` — **NOT merged into `main`**, per the instruction.
**Authority:** Master Architect decision of 2026-09-14 — P4-B accepted with two required
corrections; P4-C authorised, writer only.
**Baseline:** branched from `main` = `925a9c2ca94fdffcfc0563d498681dfe902ab700` (v08.24).
**Blast radius:** **BR-0** — two new modules, imported by nothing.
**Status:** built and verified. **P4-C READY FOR MASTER ARCHITECT AUDIT.**

**Not in this round:** no Rules deployed, no index, no migration, no backfill, no
production write, no Study event wired, no Monitor or backup read path, no P4-D.

---

## 1. The two required corrections, applied

### Correction 1 — the Note's identity participates in event identity

```
journal.note-created__approach_10__<unitKey>__<noteId>__once
journal.note-revised__approach_10__<unitKey>__<noteId>__<dateIso>
```

**Encoding, and why it was adjusted.** All five automatic events use **one
five-slot form**, with the literal `none` filling the Note slot for the three
non-Note events, rather than a four-slot form for some and a five-slot form for
others. The decision permitted adjustment "only if necessary for safe Rules
validation", and it is: a single arity keeps the Rules identity check a **single
string concatenation** instead of a branch, which is exactly what P4-B's
expression-budget finding requires. The semantic identity contains the Note
identity, as directed. `none` cannot be mistaken for a real `noteId`, which is
always 32 hexadecimal characters — and both halves of that are enforced.

**Rules re-derive and verify it**, and enforce the two-sided rule that makes the
`none` slot safe: a Journal event **must** carry a well-formed `noteId`; a
non-Journal event **must not** carry one at all. Without the first, a Journal
event could take the `none` slot and collide with every other Note on that āyah;
without the second, a reading event could smuggle in a `noteId` and mint an
unbounded family of ids for one real event.

### Correction 2 — WbW Activity grain, and the `occurrenceId` decision

`wbw.engaged` deduplicates by **āyah + person + UTC day**. ADR-008 is amended:
its status line, the `wbw.engaged` row, and a new "Master Architect amendments"
section recording both corrections, why each was required, and what is unchanged.

**`occurrenceId` is OMITTED.** Reviewed against every reader of Activity as
directed — Monitor counts per student, subject and unit; backup prints entries;
`bulkConfirmWeek()` cannot see this collection at all — and **none has a concrete
downstream requirement for it.** Storing one would also mislead: whichever word
was tapped first that day would arbitrarily win the field while the other
ninety-nine went unrepresented, giving the appearance of occurrence-level
precision the āyah/day grain does not have. The authoritative occurrence-level
state remains `quranWordProgress`, unchanged. The field is not in the Rules'
accepted key list, so it cannot be stored even by a client that tries.

---

## 2. What was built

| File | Purpose |
|---|---|
| `app/js/study-activity-evidence-id.js` | **Pure.** Deterministic `eventId`, the evidence document, ADR-008's mapping and dedupe boundaries. No Firebase, no DOM |
| `app/js/study-activity-evidence-store.js` | **The only writer.** One `createDocument()` into the subcollection, with the read-first/re-read retry discipline of §3 |
| `tools/i18n-verify/study-activity-evidence-id.mjs` | 29 pure identity and shape checks |
| `tools/i18n-verify/study-activity-evidence-store.mjs` | 19 writer-behaviour checks against an in-memory Firestore |
| `tools/i18n-verify/study-activity-evidence-boundary.mjs` | 13 structural guards |
| `tools/firestore-emulator/activity-evidence-v1.rules.test.mjs` | **53** emulator assertions (was 36) |
| `docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules` | amended candidate. **NOT DEPLOYED** |

**Modified:** `app/js/version.js` (`08.24`→`08.25`), ADR-008, the P4-B report
(amendment box, original text left intact), `CHANGELOG.md`, `CLAUDE.md`.

**Not touched:** `app/js/activity.js` · `app/js/records.js` · `firestore.rules` ·
every `app/*.html` · `app/js/monitor.js` · `app/js/backup.js` ·
`app/js/backup-file.js` · every Word Card and Phase 3 file. Proven in §5.

### A simplification worth recording

`doc(db, path, id)` accepts a **multi-segment** collection path, so
`activity/<weekKey>/evidence` + `eventId` is a valid document reference in three
arguments. **`envelope.js` therefore needs no change** to stamp the I17 envelope
here, and **the test harness's own `doc()` needs no change either** — the
subcollection costs this codebase nothing new. The P4-B change budget had
flagged a possible stub change; measured, it was not needed.

---

## 3. Retry is a successful no-op — and that is not the same as swallowing errors

The identity is the document id, so a retry addresses a document that already
exists. The candidate Rules permit `create` only, so such a write returns
`permission-denied` — **and so does a genuine authorisation failure.** Treating
every `permission-denied` as "already recorded" would hide real failures, which
I15 forbids outright.

So the writer reads first, and on a denial reads **again** before deciding:

| Situation | Outcome |
|---|---|
| document already present | no write attempted → `written: false` |
| write denied, document now present | two writers raced; the event **is** recorded → `written: false` |
| write denied, still absent | a **real** failure → rethrown, so it reaches the user (I15) |

Cost: one read per event, and that read is the only thing that distinguishes
"already done" from "not allowed". Measured: **a first write costs 1 read + 1
create; a retry costs 1 read and 0 creates.**

---

## 4. Tests executed

### The Master Architect's six required Note cases, plus the WbW cases

| Required case | Emulator | Pure | Store |
|---|---|---|---|
| 1. two different Notes on the same unit may each create evidence | **MA-1 PASS** | PASS | PASS |
| 2. retrying creation evidence for the same Note is a duplicate | **MA-2 PASS** | PASS | PASS |
| 3. two different Notes revised on the same unit/day may each create evidence | **MA-3a/3b PASS** | PASS | PASS |
| 4. repeated revision evidence for the same Note/day deduplicates | **MA-4 PASS** | PASS | PASS |
| 5. changing `noteId` without the corresponding `eventId` is denied | **MA-5 PASS** | — | — |
| 6. changing `eventId` without the corresponding `noteId` is denied | **MA-6 PASS** | — | — |
| WbW occurrence duplication cannot create multiple documents for one āyah/day | **MA-W1/W2/W3 PASS** | PASS | **PASS — 100 writes → 1 document** |

Plus three hygiene cases that make the `none` slot safe: a Note event with no
`noteId` cannot take it; a non-Note event may not smuggle one in; a malformed
`noteId` is refused.

### Candidate Rules — emulator, isolated, demo project only

| | Result |
|---|---|
| Assertions | **53 passed, 0 failed** (was 36 before the amendments) |
| Expression-budget denials | **0** |
| Denial reasons | every one a decision the rules made |

**Mutation testing — each important check neutralised in turn:**

| Neutralised | Assertions reached | Suite |
|---|---|---|
| baseline | 53 | passes |
| `idIsDerivedIdentity()` | **6** | **fails** |
| `scopeMatchesPath()` | **38** | **fails** |
| `personInTenant()` | **41** | **fails** |
| `noteIdentityOk()` | **25** | **fails** |
| restored | 53 | passes |

#### A suite defect found by that mutation run, and fixed

On the first pass, **`personInTenant()` was neutralised and the suite still
passed** — so that check was untested. The reason was a wrong case: the
cross-tenant test had `p1` writing for `pX`, which `canRecordFor` already denies
because p1's login is not pX's, so it proved nothing about the tenant binding.
The isolating case has `pX` writing **for themselves** under tenant `t1`'s path:
`isSelfPerson()` is true and `canRecordFor` **allows** it, so `personInTenant()`
is the only thing standing between pX (tenant `t2`) and tenant `t1`'s data. It is
paired with an allow differing in one fact — the same writer filing under their
**own** tenant succeeds. The mutation now fails the suite, as shown above.

### P4-C suites

| Suite | Result |
|---|---|
| `study-activity-evidence-id.mjs` | **29 passed, 0 failed** |
| `study-activity-evidence-store.mjs` | **19 passed, 0 failed** |
| `study-activity-evidence-boundary.mjs` | **13 passed, 0 failed** |

**Boundary suite proven able to fail**, four mutations:

| Mutation | Result |
|---|---|
| import the writer into `records.js` | **FAIL** ×2 (uninvoked, and no surface names it) |
| make `bulkConfirmWeek()` read the evidence subcollection | **FAIL** — the Mastery-coupling guard |
| let the writer express `action: "claimed"` | **FAIL** |
| renumber a mapped Approach | **FAIL** |

#### A second self-inflicted defect, found by that same exercise

The Approach-binding mutation **did not fail at first**. The cause was mine:
`check()` is synchronous and I had given it an `async` body, so the assertion
threw inside an uncaught promise and the case was counted green. A passing check
carrying exactly the blind spot it was written to close. `APPROACH_TEMPLATES` is
imported statically now, the body is synchronous — and **`check()` itself now
refuses any function that returns a promise**, so this cannot recur anywhere in
the suite.

#### A third failing check that was a wrong assertion, not a defect

"the writer never writes an `entries[]` array" failed on
`Object.entries(UNIT_KEY_SHAPES)` — a JavaScript builtin, not the Firestore
array. Investigated before changing the module; the module was right. The check
now matches `entries` with a negative lookbehind for `Object.`.

### Regression — nothing moved

| Check | Result | Baseline |
|---|---|---|
| `study-approach-contract.mjs` / `-evidence` / `-boundary` (P4-A) | 13 / 11 / 16, 0 failed | 13 / 11 / 16 |
| `quran-word-card.mjs` / `-integration` | 36 / 10, 0 failed | 36 / 10 |
| `quran-word-progress-model` / `-data` | 57 / 37, 0 failed | 57 / 37 |
| `quran-word-coverage-arabic` / `quran-boundary` / `quran-word-indexes` | 29 / 30 / 9, 0 failed | same |
| `stub-parity.mjs` | 3 passed, 0 failed | 3 |
| `layout.mjs` | **every metric byte-for-byte identical** at all 16 configurations; `CHANGED:` printed **0** times; 0 page errors, 0 overflows, 0 lost rows; `getElementById` **250 → 250** | same |
| `navcheck.mjs` | unchanged — only the pre-existing 320 px English truncation | same |
| `reading.mjs` | **`READING SCREEN OK`** | OK |
| Translation coverage | **1,803 / 47 — both unchanged** | 1,803 / 47 |
| `behaviour.mjs` | **803 passed, 0 failed** — the documented total, at the documented stop | 803 total |

The `layout.mjs` comparison used `HEAD`'s own `quranrevival.html` **and**
`HEAD`'s `version.js` as `_prev-` shims with the import repointed, so "before"
really rendered **v08.24** against "after" **v08.25**. `app/quranrevival.html` is
byte-for-byte identical to `HEAD`. Both shims were deleted before the coverage
total was read.

---

## 5. Structural safety — every item the decision required

| Required proof | How it is held | Result |
|---|---|---|
| evidence never enters legacy `entries[]` | the writer's source may not contain `arrayUnion`, `logActivity`, or Firestore `entries`; it addresses only `.../evidence` | **PASS** |
| `bulkConfirmWeek()` remains unable to see Study evidence | its body must still read `activitySnap.data().entries`, and must not mention `evidence` or run a query | **PASS**, and proven able to fail |
| no writer dependency on `records`, `claimStatus`, `confirmEntry`, `achieved`, `mastered` | forbidden-token scan over code with comments stripped | **PASS** |
| `status.claimed` / `status.confirmed` cannot be persisted as evidence | absent from the event table; refused by the pure module, the store and the Rules | **PASS** ×3 |
| retrying the same event is a successful no-op at the application layer | §3, measured | **PASS** |
| genuine persistence failures remain visible | a real denial and a network error are both rethrown | **PASS** |
| existing Activity behaviour unchanged | `activity.js` byte-identical to `HEAD`; still `arrayUnion`; no `v1Events`; no evidence reference | **PASS** |
| Rules cost does not grow with accumulated evidence | 160 documents written, then one more — same rule, same cost, no map walked | **PASS** |

---

## 6. Rules, index, migration and deployment status

| | Status |
|---|---|
| Production `firestore.rules` | **UNTOUCHED**, byte-for-byte identical to `HEAD` |
| Candidate Rules | **CANDIDATE ONLY — NOT DEPLOYED.** Amended for both corrections |
| Firestore indexes | none changed, none deployed; no tracked index file exists |
| Migration / backfill | **none** |
| Production data writes | **none** — the emulator runs against `demo-quranrevival-activity-evidence-v1`, and the tooling refuses any project id without a `demo-` prefix |
| The writer | **UNINVOKED.** Nothing in `app/` imports it |
| **Consequence, stated plainly** | until the Rules are deployed, the `evidence` subcollection has **no rule and is closed to every client**. P4-C is built, tested and safe to review, but **cannot function for anyone — including the Owner — until deployment**, which remains an Owner Control Gate and is **not requested here** |

---

## 7. `behaviour.mjs` — completed

**803 passed, 0 failed** — the documented total, stopping at the pre-existing
section-42 `[data-note-master-toggle]` crash carried since v07.69
(`behaviour.mjs:4123`). **No check the suite reaches needed updating**, which is
the expected result for a round that adds modules nothing calls.

Two notes for the record, because an earlier draft of this report was written
while the run was still in progress and said so:

1. It grinds almost to a halt in the sections that fetch from hosts this sandbox
   cannot reach — section 40 pulls Mushaf page images, section 41 recitation
   audio — where every request must time out before the suite advances. The
   partial figure quoted mid-run (776 through section 40) was labelled as
   incomplete at the time and is superseded by the 803 above. Nothing was ever
   claimed as passing that had not run.
2. **Section 22g's three `archive.org` screensaver failures did not occur in
   this run**, giving 803/0 rather than the 800/3 some recent runs record. That
   difference is environmental — this sandbox's proxy — and not a code
   difference; the modules under test are byte-identical to `HEAD`.

---

## 8. What the Owner would see

**Nothing.** The writer is uninvoked and no screen changed. The only visible
difference is the version badge reading **v08.25** — and only once this branch
is merged, which the instruction defers. `main` still serves **v08.24**.

---

## 9. Position

**P4-D not begun.** No Study surface is wired; Monitor and backup have no read
path; no Rules are deployed.

**Open Owner Control Gate, unchanged:** deploying the candidate Rules. The exact
decision: *"Deploy the amendment adding `match /activity/{activityKey}/evidence/{eventId}`
to production `firestore.rules`."*

DDR-001 through DDR-004 untouched and still INACTIVE / DEFERRED.

# P4-C READY FOR MASTER ARCHITECT AUDIT

**STATUS: AWAITING HUMAN SIGN-OFF.**
