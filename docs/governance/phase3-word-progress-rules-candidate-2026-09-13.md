# Phase 3 — word-progress Rules candidate and storage safeguards

**Date:** 2026-09-13. **Status:** CANDIDATE, **NOT DEPLOYED**, not merged into
`firestore.rules`. Deploying Rules is an Owner Control Gate. Nothing in this
document or in the branch it describes changes production.

Candidate: `tests/firestore/word-progress-v1.proposed.rules`
Suite: `tools/firestore-emulator/word-progress-v1.rules.test.mjs`
(`npm run word-progress` from `tools/firestore-emulator/`)

## 1. The storage decision, and the measurement behind it

The Phase 3 storage paper set the gate: compare viable approaches, report read
and write cost, and separate self-state from teacher-state writes if Rules
cannot tell them apart. Measured against the packaged dataset (114 surahs,
6,236 ayahs, 77,429 occurrences; longest ayah 2:282 at 128 words; largest
surah 2 at 6,116 words):

| | per-occurrence document | **per-ayah, per-role lane (chosen)** |
|---|---:|---:|
| Documents per person (ceiling) | 77,429 | 12,472 (two lanes × 6,236) |
| Reads for one word | 1 | 2 (one per lane), then cached |
| Reads for a whole Al-Baqarah | 6,116 | **2 queries**, returning only the ayahs actually touched |
| Writes for one claim | 1 | 1 |
| Writes for one decision | 1 | 1 |
| Rules must walk a map? | no | **no** |

Worst-case document size, measured as a JSON proxy with realistic 20–24
character identifiers, ayah 2:282 fully populated: **learner lane 9,716
bytes**, **supervisor lane 101,111 bytes** with six retained decisions per
word. Both are far inside Firestore's 1 MiB document limit. This is a JSON
byte count, **not** a Firestore encoded size and **not** a billing figure.

Safeguards actually implemented, not just proposed:
- `MAX_WORDS_PER_AYAH = 128` refuses a 129th word in a lane.
- `MAX_RETAINED_DECISIONS = 6` bounds the per-word decision history, and
  `historyTruncated` records what fell off, so a truncated history is never
  reported as complete.
- `MAX_LANES_PER_SURAH_READ = 300` caps a surah read; going over reports
  `truncated` and deliberately does **not** cache as complete, because a short
  read would understate coverage.
- Nothing joins the startup path. Verified in a browser off
  `window.__fsLog`: zero reads on the landing path, zero from opening Read,
  exactly two the moment a word card is opened, exactly two queries when
  Explore reaches a surah.

## 2. Why two collections — the security design

A Firestore rule cannot cheaply prove that every changed key of an
arbitrarily-keyed map was written by someone entitled to write **that** key.
The deployed rules already record this limitation for `records`, `subjects`
and `trackables`. The storage paper's instruction was explicit: *"If Rules
cannot distinguish self-state from teacher-state writes, separate them into
role-specific documents before enabling a writer."*

So the learner's claims live in `quranWordProgress` and a supervisor's
decisions in `quranWordApprovals`, same document id. Each document then
belongs to exactly one (person, role) pair, and document-level authority is
both sufficient and exact. The only new authority idea is
`canSuperviseRecordFor()` — `canRecordFor()` minus `isSelfPerson()`: *someone
who may act for this person and is not this person*. Nobody signs off their
own claim.

A learner **reads** their approvals lane and can never write it. Being told
your work was sent back is the point of sending it back.

## 3. The Phase 4 failure mode, and why this candidate is not in it

The Phase 4 Activity Rules candidate was rejected because 9 of its 13 logged
denials were refused by Firestore's 1000-expression evaluation limit rather
than by the security logic — denials that sat inside `assertFails` and so
looked correct while proving nothing, and that would later refuse *legitimate*
writes as a week grew.

No rule in this candidate walks a map, counts entries, or inspects a dynamic
key. The cost of a write does not grow with the number of words a person has
learned, **because the document's size never enters a rule**. That is asserted
rather than argued: the suite fills a lane to the full 128 words of 2:282 and
then writes one more word, as an `assertSucceeds` in both lanes — so
exhaustion would appear as a FAILURE, never as a tidy green denial. The
emulator log contains **zero** references to the expression limit.

## 4. Result, and the one limitation stated plainly

**42 assertions, all passing** against the Firestore emulator: 23 denials and
19 allows.

**Every denial is paired with an allow that differs in exactly one fact** —
actor, subject, operation, or field — on the same collection. A ruleset that
denied by exception rather than by decision would have denied the paired allow
too. Deletes have no legitimate counterpart, so those three are paired on the
ACTOR instead: each is refused a delete on a document the same actor has
already been allowed to write.

**The limitation.** The emulator log still carries `evaluation error` lines on
denied operations. What was established about them, by measurement:

- A run containing **only allowed operations produces zero** of them.
- They arise from `DefaultEmulatorRulesAuthorizer.withVerboseErrors` — the
  emulator's diagnostic path, which runs *when a request is denied* to build a
  readable message — named directly in the stack trace.
- A probe with four independent single-helper clauses produced them uniformly
  across all four, so they do not localise to any one helper.
- Guarding the update clauses with `resource != null` (S8-class defensiveness
  the deployed rules already apply to reads) reduced them from 38 to 32.

That evidence points to a denial-reporting artefact rather than a cause of
denial, and it is **not** the expression-budget shape that sank Phase 4. But
it is not a complete characterisation, and this document does not claim one.
The allow/deny pairing above is what the acceptance argument rests on.

## 5. What is NOT enforced here, stated rather than hidden

The per-entry **shape** — which state code, which timestamp — is validated
client-side, exactly as `records.entries` already is. Same accepted trust
boundary, not a new gap. What the rules enforce is who may write the document
at all, that its identity fields can never be repointed at another tenant,
person, level or ayah, that only `wbw` may be written (Basic Arabic and Arabic
in Depth have no approved claim unit, so the deferral is enforced at the
database, not only in the client), and that nothing is ever deleted (I4/D6).

## 6. Owner Control Gate

Deployment of these Rules requires explicit Owner authority and is **not**
requested by this document. Until they are deployed, the two collections have
no server-side rule, so the feature is exercisable on this branch and by the
Owner's own account only; it is not usable by a student or teacher account
against production. That is a deliberate consequence of not crossing the gate,
not an oversight.

## 7. A pre-existing breakage found, and not silently worked around

`tools/firestore-emulator/activity-v1.firebase.json` points its `rules` at
`../../tests/firestore/activity-v1.proposed.rules`, and the installed
firebase-tools refuses a path outside the directory holding `firebase.json`
("… is outside of project directory"). **`npm run activity-proposal` therefore
cannot start at all** in this environment — it fails before any assertion
runs. This predates Phase 3 and was reproduced directly.

It is left unfixed on purpose: that suite is the evidence base for a REJECTED
candidate sitting at an Owner gate, and quietly changing how it runs is not
this tranche's business. The remedy is one line — point its `rules` at a file
inside `tools/firestore-emulator/`, as
`word-progress-v1.firebase.json` now does with `closed.placeholder.rules`
(deliberately deny-all, so a suite that forgot to install its candidate fails
loudly rather than passing against something permissive). The candidate under
test is supplied by `initializeTestEnvironment()` from `readFileSync` in every
case, so the config's path never determined what was actually tested.
