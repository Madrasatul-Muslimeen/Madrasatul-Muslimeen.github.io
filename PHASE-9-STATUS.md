# Phase 9 — Homework & feedback — Build Log (round 1)

Read alongside `CLAUDE.md` and `PHASE-8-STATUS.md`. Built 10 August 2026, v07.10.

---

## Position

**Round 1 complete, not yet owner-verified.** Scope, confirmed with the
owner before building: assignments to a **person** (numeric score,
confirm-with-comment, parent copy, Admin copy) + teaching notes, backed by
`assignments`/`submissions`/`teachingNotes` — three collections
`collections.js` already reserved names for since Phase 0 but nothing had
written to until now. Two things flagged and agreed before starting:

1. **No class-assignment yet.** Classes/enrolments don't exist until
   Phase 10, so "assign to person or class" (the Architecture doc's own
   phrasing) is built as person-only for this round — a class-wide
   assignment is a Phase 10 follow-on, same deferral shape Phase 7 used for
   course offers.
2. **"Parent copy, Admin copy" is on-screen visibility, not a
   notification.** Full messaging (`threads`/`messages`) is Phase 13.
   A guardian/admin sees a scored assignment the next time they look at
   Homework — nothing pushes or emails them yet.

---

## A real bug found and fixed along the way

While designing who's allowed to create an assignment "for their own
child," I traced `firestore.rules`' `isGuardianOf()` and found it checked
`memberships/{tenantId}__{personId}__guardian`'s `guardianOf[]` field —
but **nothing in the client ever writes anything into that array**.
`addPersonToTenant()` (`identity.js`, `invites.js`, `people.js`) all
create that membership row with `guardianOf: []` and never touch it again.
`PHASE-3-STATUS.md` already found and worked around this on the
`records.js` side back in Phase 3 (`computeConfirmationRequired()` reads
`tenantPeople.managedByPersonId` instead) — but the **rules-side copy of
the same check was never fixed to match**.

Net effect, live since Phase 3: **a guardian-only role (no owner/prime/
teacher held at the same time) could not actually `canRecordFor()` —
record, confirm, or bookmark for — their own child**, through
`firestore.rules`, despite D10 explicitly promising this workflow and
`records.js`'s own client logic already assuming it worked. It only ever
worked by accident for accounts that also held owner/prime/teacher.

**Fixed**: `isGuardianOf(tenantId, childPersonId)` now checks
`tenantPeople/{childPersonId}.managedByPersonId == myPersonIdIn(tenantId)`
— the same real, populated field `records.js` already uses — instead of
the always-empty `guardianOf[]`. `tenantPersonRef()` was moved earlier in
the file so both use sites can call it. Deployed to `study-monitoring`
tonight, ahead of the rest of this round's rules (validated with
`firebase deploy --only firestore:rules --dry-run` first, then a real
deploy — compiled clean both times, one pre-existing unrelated warning at
line 85 not touched by this change).

**This retroactively fixes records/activity/bookmarks guardian access too**
— not just Phase 9. Worth the owner specifically re-testing "sign in as a
guardian-only account, record/confirm something for your child" against
Records or a study screen, not just Homework.

---

## What was built

**`app/js/homework.js`** (new):

- `createAssignment()` — one `assignments` doc + one `not_submitted`
  `submissions` stub per assigned person, in a single chunked batch (same
  `SEED_CHUNK_SIZE`-style reasoning as `catalogue.js`: the batch's total
  rule-evaluation `get()`/`exists()` calls are capped at 20).
- `listAssignmentsForTenant()` / `listAssignmentsForPerson()` — the latter
  is what a self/student actor must use (its `array-contains` filter on
  `assignedToPersonIds` is what makes the query provably rule-safe for
  them; the tenant-wide list only works for admin/teacher/guardian actors,
  whose read-rule branches don't depend on any one document's
  `assignedToPersonIds`).
- `getSubmission()` / `listSubmissionsForAssignment()`, `markSubmitted()`
  (student/self — a timestamp + optional note, no file attachment; that's
  Phase 15+ territory), `scoreSubmission()` (teacher/guardian/admin —
  "confirm-with-comment," freezes `maxScoreAtMark` alongside the score,
  I6-style, so a later edit to the assignment's own `maxScore` never
  reinterprets an already-issued mark).
- `createTeachingNote()` / `listMyTeachingNotes()` — private to the author;
  `authorUid` rides alongside `authorPersonId` purely so the security rule
  can check ownership in one field read (same shape `tenantPeople.authUid`
  already uses for `isSelfPerson`).

**`app/homework.html`** (new) — same sign-in-gate/nav-bar/tenant-and-person
shell every other Phase page uses. A "New assignment" form (checkbox roster
picker, optional subject/due-date/max-score, instructions) shown only to
owner/prime/teacher/guardian (real or "View as" previewed) roles. Per-student
assignment cards showing the student's own submission status, a "Mark as
submitted" action, and (for whoever can mark) a score + comment action. A
private teaching-notes section, author-only, never shown to anyone else.

**`firestore.rules`**:

- `isAssignmentCreator(tenantId, assignedToPersonIds)` — admin/teacher are
  tenant-wide (same disclosed gap `session-context.js`'s own
  `scopedRoster()` comment already carries for teachers — no per-teacher/
  per-guardian student-assignment model exists yet). A **guardian-only**
  actor is scoped for real, not just disclosed: `assignedToPersonIds` must
  be exactly one child, and `isGuardianOf()` must hold for that one id —
  Firestore rules can't cheaply prove "every element of an arbitrary-length
  list is my child," so a guardian assigning the same homework to two kids
  makes two single-target assignment docs client-side.
- `assignments` — read is wider than write (see `isAssignmentCreator`
  above): any admin/teacher/guardian in the tenant can see every
  assignment. In a real multi-family Tuition-Provider tenant this means a
  guardian could see another family's homework — flagged, not hidden; same
  category of gap as the teacher one, bounded by the same Stage-B2/Phase 10
  boundary. Fine for Family/Individual tenants (D13's current priority),
  worth narrowing before Stage B2 rollout.
- `submissions` — reuses `canRecordFor()` exactly as-is (it's the same
  "this one person's own data" shape as records/activity/bookmarks).
- `teachingNotes` — private to `authorUid`, full stop.

**`app/js/nav.js`** — added "Homework" after Monitor.
**`app/js/version.js`** — bumped to `07.10`.

---

## Not verified

Same limitation as every prior round: no real Google account to sign in
with here. Mechanically verified this round:

- `node --check` on `homework.js` and the `nav.js` edit — parses cleanly.
- `firestore.rules` compiled clean on both a dry-run and the real deploy
  (`firebase deploy --only firestore:rules --project study-monitoring`) —
  one pre-existing, unrelated warning at line 85, not touched this round.
- `homework.html` loaded in a real browser against the local dev server:
  every import resolves (200s), no console errors introduced (the three
  404s that show are the same pre-existing, unrelated ones already seen on
  every other page).

**What the owner should check for real, once signed in:** create an
assignment for a real child, mark it submitted as that child (or via
"View as"), score it as the teacher/guardian/owner, and confirm the
teaching-notes section stays private (sign in as a second account in the
same tenant and confirm they can't see the first account's notes). Also —
per the bug fix above — specifically re-test a **guardian-only** account's
existing Records/study-screen access, since that was silently broken since
Phase 3 and this round is what surfaced it.

---

## Round 2 — closing the Homework teacher-scoping gap (11 Aug 2026, v07.17)

Closes the gap `isAssignmentCreator()`'s own comment flagged since this
phase first shipped: **the teacher branch was blanket `isTeacherIn(tenantId)`**
— any teacher membership could create/read an assignment naming ANY
student in the tenant, not just their own, because Firestore rules can't
cheaply prove "every element of `assignedToPersonIds` is one of my
co-enrolled students" (no per-element `get()` construct exists). Built now
that Phase 10's `classes`/`enrollments` give this a real anchor to check
against, using exactly the contextId-trust model the original comment
proposed: the client only ever offers checkboxes drawn from one declared
class/course-offer's own roster; the rule checks a single, cheap,
fixed-path `get()` proving the teacher is an active teacher in that one
declared context, instead of trying to inspect every array element.

**`firestore.rules`**:
- New `isActiveTeacherInContext(tenantId, contextId)` — a direct `get()` on
  `enrollments/{tenantId}__{contextId}__{myPersonId}`, checking
  `roleInClass == 'teacher' && status == 'active'`. Same shape as
  `isCoEnrolledTeacherOf()`/`teacherStudentLinkRef()` just above it.
- `isAssignmentCreator()` — teacher branch now
  `isTeacherIn(tenantId) && isActiveTeacherInContext(tenantId, contextId)`,
  gains a `contextId` parameter. Guardian branch unchanged.
- `assignments`' own read rule — same change: the blanket
  `isTeacherIn(resource.data.tenantId)` branch replaced with
  `isTeacherIn(...) && isActiveTeacherInContext(..., resource.data.contextId)`.
  **The guardian branch is deliberately left as-is** (`isGuardianIn(tenantId)`
  alone, tenant-wide) — that's a separate, already-disclosed limitation
  (see round 1 above and this file's own git history), not attempted this
  round; only the teacher-scoping task that was actually asked for.
- Every `assignments` doc has always written a real `contextId` field
  (`createAssignment()` — `null` before this round, a real class/course-offer
  id from now on for a teacher-created one), so `resource.data.contextId` is
  always safe to read on old documents too — no missing-field case, no
  migration needed.

**`app/js/course-offers.js`** — new
`activeTeacherContextIdsFromEnrollments(enrollments)`, a pure function
mirroring the rule's own `isActiveTeacherInContext()` definition so the
client query and the server rule agree on what "actively teaching this
context" means.

**`app/js/homework.js`** — `createAssignment()` gains a `contextId` param
(still defaults to `null`, unchanged for admin/guardian callers).
`listAssignmentsForPerson()` gains an optional `restrictTeacherContextIds`
param — **required** for a pure-teacher caller (their read is only provable
when the query itself is constrained to `contextId in [...]`, since
Firestore evaluates a list query's rule against its whole potential result
set, not per returned document) and **must be omitted** for admin/guardian/
self callers, whose own read branches don't depend on `contextId` at all
— passing it there would wrongly hide assignments only visible via their
own branch.

**`app/homework.html`** — new "Class / Course Offer" picker in the create
form: an admin sees every class/course offer in the tenant plus
"(none — any visible person)"; a teacher sees only their own actively-taught
contexts, no "(none)" option (matches the rule's own requirement) unless
they also hold owner/prime/guardian (a mixed-role actor can still fall back
to their other, contextId-independent branch). Picking a real context
restricts "Assign to" to that context's own active student roster instead
of the full visible roster. A pure-teacher actor with zero active-teacher
enrolments sees a clear message and a disabled create button, instead of a
raw permission-denied.

**`app/js/nav.js`** — the stale "Homework still shows every assignment"
gap note is now an empty string, not deleted outright (kept as a landing
spot for a future gap found the same way).
**`app/js/version.js`** — bumped to `07.17`.

### Verified this round

- `node --check` on `course-offers.js`, `homework.js`, `nav.js` — parses
  cleanly. `homework.html`'s inline `<script type="module">` extracted and
  `node --check`ed — parses cleanly.
- `firestore.rules` — brace/paren counts balanced (212/212, 744/744), no
  duplicate `function` names.

**Not yet owner-verified** (needs `firestore.rules` deployed via the
Firebase Console first, same as every rules round since Phase 10 — this
session has no authenticated Firebase CLI):

1. Deploy `firestore.rules`.
2. As owner/prime: create an assignment with "(none)" selected — confirm it
   still works exactly as before (no regression for admin-created
   assignments).
3. As owner/prime: create a class or course offer, enrol a real teacher and
   a student into it, then (once signed in as that teacher, or via "View
   as: teacher" with the caveat that a preview can't fully prove this —
   see `PHASE-10-STATUS.md`'s own standing note) confirm the teacher's
   Homework page shows the new context in the picker, restricts "Assign to"
   to that context's roster, and successfully creates an assignment.
4. Confirm a teacher with ZERO active-teacher enrolments sees the "no
   active class/course offer" message and can't create an assignment at
   all (button stays disabled).
5. Confirm a teacher can still see/read assignments they already created
   through a real context (the read-side restriction shouldn't hide their
   own work).
