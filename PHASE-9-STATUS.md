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

## Round 2 — closing Homework's teacher AND guardian read gaps for real (11 Aug 2026, v07.17)

Closes two gaps at once, both the same structural shape:

1. `isAssignmentCreator()`'s own comment flagged since this phase first
   shipped: **the teacher branch was blanket `isTeacherIn(tenantId)`** — any
   teacher membership could create/read an assignment naming ANY student in
   the tenant, not just their own.
2. The assignments read rule's guardian branch was `isGuardianIn(tenantId)`
   alone — **any guardian could read every family's homework in the tenant**,
   not just their own child's (flagged, not fixed, when round 1 first
   shipped this phase — see this file's own earlier note).

Both existed for the identical reason: Firestore rules can't cheaply prove
"every element of `assignedToPersonIds` is one of mine" — no per-element
`get()` construct exists for a data-driven-length array.

**This section replaces an earlier version of itself, written and shipped
in the same sitting, then found to have a real flaw before the owner ever
deployed it** — worth recording plainly rather than pretending the first
draft didn't happen. The first version fixed the teacher branch with
`isActiveTeacherInContext()`, a `get()` against a *different* document
(`enrollments`), checked inside the READ rule. That looked right and
compiles fine, but a closer look at how this codebase's own
`tenantMemberUids` rules block explains Firestore's list-query behavior
made clear it was the same fragile shape: **Firestore can only allow a
`list()`/`query()` request if it can prove, from the query's own filters
alone, that every possible result satisfies the rule.** `assignments` is
*always* read via a query in this app (`listAssignmentsForPerson()`),
never a single `getDoc()` — so a get()-dependent read rule risked
Firestore rejecting a teacher's (or a newly-scoped guardian's) entire
assignments list with a flat permission-denied the moment the rules
deployed, not a partial/filtered result. Caught and revised in the same
round, before the owner ever ran the Firebase Console deploy that would
have shipped it — no live breakage, but worth being honest that the first
attempt was wrong and why.

### The fix: denormalize instead of computing at read time

`assignments` gains a new field, **`extraReadersPersonIds[]`** — every
active teacher of the declared `contextId` (if set), plus the guardian of
each `assignedToPersonIds` entry (if any) — computed **once, at creation**,
by the client (`homework.html`, fed into `homework.js`'s
`createAssignment()`), not recomputed at read time. The read rule then
only ever checks **`myPersonIdIn(tenantId) in resource.data.extraReadersPersonIds`**
— structurally identical to the assigned-student-self branch just above it
(`myPersonIdIn(...) in resource.data.assignedToPersonIds`), which has
worked in production, via a query, since Phase 9 round 1. No `get()`
inside the array-membership check itself, so it's provable the same way.

**`firestore.rules`**:
- `isActiveTeacherInContext(tenantId, contextId)` — **unchanged**, still
  exactly right. It's used by `isAssignmentCreator()` for `create`/`update`,
  which are single-document writes, not queries — the list-provability
  concern never applied there in the first place, only to the read rule
  that used to also call it.
- `assignments`' read rule — now three branches: `canAdminIdentity()`
  (tenant-wide, unchanged), the assigned-student-self branch (unchanged),
  and the new `extraReadersPersonIds` branch, which replaces BOTH the old
  blanket teacher branch and the old blanket guardian branch entirely.
- `isAssignmentCreator()` — unchanged from the first draft (teacher branch
  requires `isActiveTeacherInContext()`; guardian branch still single-child
  only, `isGuardianOf()`).

**`app/js/homework.js`**:
- `createAssignment()` gains `extraReadersPersonIds` — stored as-given, `[]`
  if omitted; computed by the caller, not this file.
- `listAssignmentsForPerson()` — reverted to its original simple form (no
  `restrictTeacherContextIds` — that belonged to the first, discarded
  design). Safe for admin and self/assigned-student callers only.
- New `listAssignmentsForReader(db, tenantId, readerPersonId)` — queries
  `extraReadersPersonIds array-contains readerPersonId`. This is what a
  teacher or guardian now calls to see assignments they're NOT the assigned
  student on; the query's own filter on the exact field the rule checks is
  what makes it provable. Returns everything the reader can see (their own
  active-teacher contexts' assignments AND their own children's) — the
  caller narrows further client-side (`a.assignedToPersonIds.includes(studentId)`)
  since Firestore can't additionally constrain by a field
  (`assignedToPersonIds`) this particular query doesn't filter on without
  hitting the same problem this whole redesign exists to avoid.
- `listAssignmentsForTenant()` — doc comment corrected (admin-only now,
  teacher/guardian no longer have a blanket branch); still unused by any
  screen.

**`app/homework.html`**:
- The Class/Course Offer context picker from the first draft is unchanged
  (still required for a pure-teacher actor to create an assignment at all —
  that requirement was always about `isAssignmentCreator()`, which didn't
  need revising).
- `refreshAssignToChecks()` now also stashes `contextTeacherIds` (every
  active teacher of the selected context) alongside the roster restriction
  it already computed — reused at create time instead of a second fetch.
- The create handler computes `extraReadersPersonIds` as
  `[...contextTeacherIds, ...guardianIds]` (deduplicated), where
  `guardianIds` comes from each assigned student's own `managedByPersonId`
  — already present on `roster`, no extra Firestore read needed. Worth
  noting explicitly: this is also what lets the CREATOR read their own
  just-created assignment back afterward — a teacher is always among
  `contextTeacherIds` for the context they just proved they teach, and a
  guardian creating for their own (only allowed) child is always that
  child's own `managedByPersonId`, i.e. themselves. No special-casing
  needed for either.
- `refreshAssignments()` now branches: admin or viewing yourself
  (`personId === myPersonId`) still calls `listAssignmentsForPerson()`
  exactly as before Phase 9 round 1 ever added a wrinkle; a non-admin actor
  viewing someone else (a teacher's student, or a guardian's child) calls
  `listAssignmentsForReader()` and narrows client-side to that one person.

### Verified this round

- `node --check` on `course-offers.js`, `homework.js`, `nav.js` — parses
  cleanly. `homework.html`'s inline `<script type="module">` extracted and
  `node --check`ed — parses cleanly.
- `firestore.rules` — brace/paren counts balanced (212/212, 757/757), no
  duplicate `function` names.
- Re-read `tenantMemberUids`' own rules comment specifically to sanity-check
  the revised design against a failure mode this codebase has already hit
  once for real — the `extraReadersPersonIds` branch's query/rule shape now
  matches the ALREADY-WORKING self-branch pattern exactly, not the
  get()-in-list-rule shape that motivated the rewrite.

**Not yet owner-verified** (needs `firestore.rules` deployed via the
Firebase Console first, same as every rules round since Phase 10 — this
session has no authenticated Firebase CLI, and no way to test a real
Firestore query against real rules from here):

1. Deploy `firestore.rules`.
2. As owner/prime: create an assignment with "(none)" selected — confirm it
   still works exactly as before (no regression for admin-created
   assignments), and that the assigned student can still see it.
3. **The one check that matters most this round**: as a real teacher
   account, open Homework and confirm the assignments list actually loads
   (not a permission-denied) — this is the exact failure mode the redesign
   exists to prevent. Same for a real guardian account viewing their own
   child.
4. As owner/prime: create a class or course offer, enrol a real teacher and
   a student into it, confirm the teacher's Homework page shows the new
   context in the picker, restricts "Assign to" to that context's roster,
   and successfully creates an assignment — then confirm THAT teacher can
   see the assignment they just created.
5. As a guardian: confirm you can see your own child's assignments
   (including ones an admin or teacher created, not just ones you created
   yourself) but NOT another family's child's assignments.
6. Confirm a teacher with ZERO active-teacher enrolments sees the "no
   active class/course offer" message and can't create an assignment at
   all (button stays disabled).
