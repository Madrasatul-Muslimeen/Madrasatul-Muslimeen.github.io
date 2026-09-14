# MAP Phase 5 — P5-A Note Foundation Rules · P5-B Journaling identity bridge

**Date:** 15 September 2026
**Baseline:** `main` = `1dfed1836b9a32970d49332a5ff978efb436e877`, app version **08.25**
**Type:** Rules candidate + one pure module. **No application behaviour changed**,
so **no version increment** — per the version rule, documentation/test/candidate
work that leaves app behaviour untouched does not churn the version.
**Status:** built and verified. No Rules deployed.

**Phase 4 preserved untouched:** wiring candidate `c4fca4a` (v08.26) unmerged,
the 208-line Rules amendment intact, production activation still a **pending
external-access dependency** — recorded, not blocking.

---

## 1. Reconciliation before changing anything (PRESERVE → RECONCILE → EXTEND)

What is really on `main` today, read rather than assumed:

| Item | State |
|---|---|
| `app/js/note-foundation.js` | **present, and imported by nothing** — the accepted uninvoked data layer |
| Collections declared | `notes`, `noteRevisions`, `noteSources`, `noteFolders`, `notePlacements` |
| **Firestore Rules for any of them** | **NONE** — all five denied by default |
| `tests/firestore/note-foundation.security-matrix.json` | the accepted design: **37 cases** |
| Existing Phase 5 suites | `boundary` 30 · `data-layer` 15 · `transaction` 16 · `size-preflight` 5 fixtures · `emulator-scaffold` 31 — **all green on `main`** |
| Live note surface `app/js/ayah-notes.js` | **unchanged, and untouched by this round** |

**Nothing was activated merely because it exists.** The data layer stays
uninvoked; this round gives it the Rules it has never had and the pure bridge
Phase 4 was waiting for.

**Existing user notes are untouched.** `ayahNotes` keeps its own collection, its
own rule and its own behaviour. There is no dual-write, no fallback, and **no
migration of any kind** — destructive or otherwise.

## 2. P5-A — the Note Foundation Rules candidate

`docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules`
**CANDIDATE ONLY. NOT DEPLOYED.** Production `firestore.rules` untouched.

**Governs exactly three collections: `notes`, `noteRevisions`, `noteSources`.**
`noteFolders` and `notePlacements` are **deliberately absent** — they are MAP
Phase 6 (Mapping My Journey), the code that writes them is uninvoked, and an
unruled collection is denied by default. Leaving them out is the safe answer,
and the suite asserts they stay denied.

### The security design

Everything follows from the matrix's own `canonicalOwner: ownerPersonId`, with
`ownerUid` nullable because a managed child may have no login at all:

- **Only the owner writes.** Not a guardian, not a teacher, not a tenant
  administrator, not a platform administrator. Every other role that can see a
  Note can only ever **read** it. That is deliberately stricter than
  `canRecordFor()`, which the rest of the app uses for progress data — **a Note
  is a person's own private writing, not a record kept about them.**
- A guardian is a **custodian, not an owner**: scoped read of a linked child.
- A teacher reads only an **actively** linked student.
- An administrator reads only **inside their own tenant**; a platform
  administrator gets no cross-tenant reach here (ADMIN-04).
- Revisions are **create-only for ever**. Identity is frozen. Nothing is ever
  deleted (I4/D6) — retiring writes a status.

### `getAfter()` makes the revision pointer real, not a promise

A Note's `currentRevisionId` must name a revision that **exists once this commit
lands**, belongs to the same Note, tenant and owner, and — on an update —
**chains from the revision the Note is moving away from**. Rules evaluate each
document independently, so without `getAfter()` a client could point a Note at a
revision it never wrote and the pointer would be fiction. This is what makes
matrix cases TXN-01, TXN-02 and TXN-03 enforceable rather than aspirational.

### Cost is a security property, applied from the start

The P4-B finding is designed in rather than discovered: no rule walks a map,
counts entries or inspects a dynamic key, so every rule costs a fixed handful of
`get()`/`exists()` calls **regardless of how many Notes a person has written.**
Measured: **0 expression-budget denials.**

### What it deliberately does NOT do, stated not hidden

Matrix cases **GUARD-05/06/07** describe a 30-minute, server-expiring,
Note-specific approval that would let a guardian revise a managed child's
content. **No such mechanism exists** — the accepted data layer has no approval
document and no expiry concept. Rather than invent one inside a Rules candidate,
this ruleset **denies every guardian content edit outright**. That satisfies
GUARD-04, GUARD-06, GUARD-07 and GUARD-08 in full and is **strictly safer** than
the accepted design; only the single *allow* case GUARD-05 is unreachable, and
it stays a recorded dependency.

## 3. P5-B — the Journaling identity bridge (resolves the deferred P4-D3)

`app/js/note-journal-evidence.js` — pure, uninvoked.

**This is the thing Phase 4 could not have.** ADR-008 as amended requires
`noteId` in the Journaling event identity and requires two Notes on the same unit
to stay independent. The live `ayah-notes.js` keys one note per (person,
unitKey) with **no id at all**, so there was nothing to key on — which is why
P4-D3 was deferred rather than bodged. The Note Foundation supplies the real
thing: a permanent `noteId` minted once, and a `revisionId` chain.

- `journal.note-created` — one event for the life of that Note, `dedupeScope`
  `'once'`.
- `journal.note-revised` — at most one per Note per UTC day.

**Which event it is comes from the revision CHAIN, not a caller's flag.** A
Note's first revision has `previousRevisionId: null`; every later one names what
it chains from. So a caller cannot claim a creation twice, or mislabel a
revision, because the data the write produced decides.

**Committed changes only, by construction.** The function requires a `noteId`
*and* the `revisionId` that commit produced. A draft, an open editor, a
cancelled edit and a failed autosave never produce a `revisionId`, so none of
them can reach it — ADR-008's exclusion enforced by what the signature demands
rather than by a flag. A retirement records nothing: retiring is not journaling.

**The bodge is tested against.** `isPermanentNoteId("ayah:2:255")` is `false`,
and a commit carrying a unitKey as its `noteId` returns `null`. The thing the
Master Architect forbade cannot pass silently.

## 4. Tests

| Suite | Result |
|---|---|
| **Phase 5 Rules, emulator** (isolated, demo project) | **53 assertions, 0 failures, 0 expression-budget denials** |
| Matrix coverage | **31 of 37 cases exercised** |
| Every denial | asserted to end in a **decisive clean `false`** |
| `note-journal-evidence.mjs` (P5-B, pure) | **18 passed, 0 failed** |
| `note-foundation-boundary.mjs` | 30 passed, 0 failed |
| `note-foundation-data-layer.mjs` | 15 assertions passed |
| `note-foundation-transaction.mjs` | 16 assertions passed |
| `note-foundation-emulator-scaffold.mjs` | 31 passed, 0 failed |
| `note-foundation-size-preflight.mjs` | 5 fixtures measured |

### The 6 matrix cases NOT exercised, and why

| Cases | Reason |
|---|---|
| GUARD-05, GUARD-06, GUARD-07 | the guardian approval mechanism does not exist; all guardian edits are denied outright instead (§2) |
| REL-02, REL-03, REL-04 | `noteFolders` / `notePlacements` are **MAP Phase 6**, out of this candidate's scope and denied by default |

### Mutation testing — every important check proven active

| Neutralised | Assertions reached | Suite |
|---|---|---|
| baseline | 53 | passes |
| `isNoteOwner()` on **create** (3 occurrences) | **19** | **fails** |
| `isNoteOwner()` on **update** (2 occurrences) | **22** | **fails** |
| `noteIdentityUnchanged()` | **21** | **fails** |
| `personInTenant()` in `canReadNoteOf` (2 occurrences) | **20** | **fails** |
| `committedRevisionMatches()` | **8** | **fails** |

### Two harness flaws and one REAL design flaw, all found by mutation

**(1) A partial mutation proves nothing.** The first run reported three checks
untested. Two were the harness's own fault: it replaced only the **first**
occurrence of a pattern, and `isNoteOwner` appears three times, `personInTenant`
twice — the rest kept enforcing. The harness now replaces **every** occurrence
and prints how many it changed.

**(2) A denial some OTHER rule produced is not evidence.** IMM-01 denied an owner
repoint — but through `committedRevisionMatches`, not the identity check. Five
isolating cases (ISO-00…ISO-04) were added, then two more (ISO-05…ISO-07) that
**seed a structurally perfect next revision past the rules**, so the only thing
left to refuse the write is the single rule under test. ISO-07 is the paired
allow differing from ISO-06 in exactly one fact: who is doing it.

**(3) A REAL design flaw in my own rule.** The update path required
`createdBy == myUid()`, which **conflates authorship with authorisation**. It
happened to deny a teacher's update — for the wrong reason — and it meant the
**owner check on the update path was never exercised at all**: neutralising
`isNoteOwner` there left the suite green. `createdBy` is an origin fact, so it is
now **stamped on create and frozen on update**, and authorisation is
`isNoteOwner()`'s job alone. The mutation that previously passed now fails at 22
assertions.

### Superseded note on the earlier harness flaw

The first mutation run reported three checks as untested — `isNoteOwner`,
`noteIdentityUnchanged`, `personInTenant`. **Two of those were the harness's
fault, not the suite's:** the script replaced only the **first** occurrence of a
pattern, and `isNoteOwner` appears three times and `personInTenant` twice, so the
remaining copies kept enforcing. A partial mutation proves nothing. The harness
now replaces **every** occurrence and reports how many it changed.

`noteIdentityUnchanged` was a **real** gap: IMM-01 denied an owner repoint, but
via `committedRevisionMatches`, not the identity check — a denial some other rule
would have produced anyway. Five **isolating** cases were added (ISO-00…ISO-04),
each a write that passes every rule except the one named, and ISO-00 is the
paired allow that differs from ISO-01 in exactly one fact.

## 5. Phase 4 — preserved, not disturbed

| | |
|---|---|
| `main` | `1dfed18`, **v08.25** — unchanged by this round |
| Wiring candidate | `claude/phase4-wiring` = `c4fca4a`, **v08.26**, unmerged, merges clean |
| Rules amendment | preserved, re-verified 53/0/0 at the gate |
| Production deployment | **PENDING EXTERNAL ACCESS** — recorded dependency |
| P4-D3 Journaling | **DEFERRED TO PHASE 5 — REQUIRED DEPENDENCY ON PERMANENT NOTE IDENTITY.** P5-B is that identity; the wiring itself remains Phase 5 work |

## 6. Position and next

**Done:** Phase 5 reconciliation; the Note Foundation Rules candidate with its
37-case matrix executed to 31; the Journaling identity bridge.

**Next, and unblocked:** P5-C — the Note editor and Study integration, wiring
`note-foundation.js` and the P5-B bridge to a real surface. Like the Phase 4
wiring it will be built and tested but **not merged** while the Note Foundation
collections have no deployed rule, for the same reason: the writer surfaces
genuine denials (I15) and every write would be denied in production.

**Two deployment dependencies now stand, both the same kind and neither
blocking construction:** the Phase 4 Activity-evidence Rules, and the Phase 5
Note Foundation Rules. Both candidates are emulator-verified and ready.

**STATUS: CONTINUING. No Owner-only decision is outstanding in Phase 5 so far.**
