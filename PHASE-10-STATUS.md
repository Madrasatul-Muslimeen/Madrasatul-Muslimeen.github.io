# Phase 10 — Classes & provider — Build Log (round 1)

Read alongside `CLAUDE.md` and `PHASE-9-STATUS.md`. Built 11 August 2026, v07.12,
on Claude Code on the web (branch `claude/quran-revival-continue-hoyinn`).

---

## Position

**Round 1 complete, not yet owner-verified, and firestore.rules NOT yet
deployed** (this session has no authenticated Firebase CLI — the rules
change below needs the owner's own `firebase deploy --only firestore:rules`
before any of Phase 10's real, per-student teacher scoping actually takes
effect; until then, `firestore.rules` in this repo and what's live on
`study-monitoring` are out of sync, same as any other rules change made
from Claude Code on the web).

Scope, decided directly with the owner before building (Architecture doc's
Phase 10 delivers: "Classes, enrolments, prime role, teacher assignment,
class-wide bulk confirm, safeguarding rules at scale"):

1. **Teacher scoping: "replace," not "add alongside."** The owner was asked
   directly whether the new class-scoped teacher-assignment mechanism
   should sit ALONGSIDE today's blanket tenant-wide teacher access
   (`isTeacherIn(tenantId)` alone, in `canRecordFor()`) or REPLACE it. The
   owner chose replace — closing CLAUDE.md's own parked, second open
   access-control question ("a teacher membership currently grants
   tenant-wide access to every student and subject") for real, not just
   adding a second narrower path next to the broad one.
2. **Prime role — audited, not rebuilt.** Grep across every `.html`/`.js`
   file found `prime` already fully wired everywhere it needs to be:
   `people.html`'s add-person and invite forms, "View as" preview,
   `catalogue.html`/`course-offers.html`/`homework.html`/`migrate.html`'s
   own `canAdmin`/`canCreate` checks, `session-context.js`'s
   `CAN_VIEW_AS`/`scopedRoster()`. Nothing needed building — this was
   already correct from Phase 1 onward.

---

## What was built

### `classes` — the new collection + admin screen

**`app/js/classes.js`** (new) — `createClass()` / `listClasses()` /
`setClassStatus()` (archive, never delete — I4/D6). Deliberately thin:
roster management (enrol/end a student or teacher) is NOT duplicated here
— it reuses `course-offers.js`'s `enrolPerson()`/`endEnrollment()` with
`contextType: "class"` instead of `"courseOffer"`, since `enrollments` is
one shared collection per the Architecture doc's own schema and Phase 7
round 2 already built the generic half of it.

**`app/classes.html`** (new) — same sign-in-gate/nav-bar/tenant shell every
other Phase page uses. Owner/prime only (matches People/Catalogue's own
`ownerPrimeOnly` nav gating — unlike Course Offers, a class's roster is
admin-managed, not self-enrol). Create a class (name, gloss, subjects),
enrol/end a student or teacher, archive a class, and a **class-wide bulk
confirm** button (below).

### `enrollments` generalized to `contextType: "class"` + the teacher-scoping mirror

**`app/js/course-offers.js`** — `enrolPerson()` now takes an explicit
`contextType` (defaults to `"courseOffer"`, so every existing Phase 7
call site keeps working unchanged); `endEnrollment()` now takes `uid`.
Both now also maintain **`teacherStudentLinks`**, a new D9-style
rules-support mirror collection (`tenantId__teacherPersonId__studentPersonId`
→ `{ active }`): security rules can `exists()`/`get()` a fixed document
path but can never run a query, so there was no cheap way for
`firestore.rules` to ask "is there SOME class or course offer where this
teacher and this student are both actively enrolled" directly against
`enrollments` — that would mean scanning every `contextId`. This mirror
denormalizes exactly that yes/no answer, recomputed by the client
(`recomputeTeacherStudentLink()`/`syncTeacherStudentLinksForContext()`) on
every `enrolPerson()`/`endEnrollment()` call, for **both** classes and
course offers — so Phase 7 round 2's course-offer teachers gain this same
real, enforced authority too, not a separate mechanism per `contextType`.
Never shown in any screen, same as `tenantMemberUids`/`inviteTokens` (D9).

**A real gap found and fixed while building this**, same shape as Phase
9's guardian bug: the first version of `enrollments`' read rule only let
someone read their OWN enrolment row (self/guardian), an admin's tenant-wide
row, or a teacher's own row in a context they teach. That's fine for
*reading your own status*, but `syncTeacherStudentLinksForContext()` needs
to enumerate *every other* active row in a context to recompute the right
mirror pairs — and a guardian enrolling their own child could only ever
see that ONE row, so their query for "who else is in this class" came back
empty. Net effect, if left unfixed: **a class's teacher would never
actually gain authority over a guardian-added child** until some unrelated
admin action happened to touch that same class again. Fixed by widening
`enrollments`' read to `anyMemberOf(tenantId)` — matches the same shape
`classes`/`courseOffers` docs themselves already use one block up in the
rules file, and an enrolment row only ever carries `personId` + role +
status, never the personal data itself (that's `tenantPeople`, which keeps
its own, still fully scoped, read rule below). Found and fixed in this
same sitting, before it ever shipped — not a live bug like Phase 9's.

### `firestore.rules` — the real safeguarding change (NOT YET DEPLOYED)

- **New `isCoEnrolledTeacherOf(tenantId, studentPersonId)`** — the one
  flat, O(1) lookup against `teacherStudentLinks` everything below runs
  through.
- **`canRecordFor()`** (records/activity/bookmarks/submissions) —
  `isTeacherIn(tenantId)` alone used to be enough; a teacher membership
  granted write access to every student in the tenant, not just their own.
  Now also requires `isCoEnrolledTeacherOf()`. This is the real,
  substantive behavior change the owner approved: **any teacher currently
  relying on blanket tenant-wide access will lose it the moment this
  deploys**, unless they're enrolled to teach the student through a class
  or course offer.
- **`tenantPeople` roster read** — same replacement. Because this rule is
  evaluated per-document, a list query (every page's own
  `where("tenantId","==",activeTenantId)` roster fetch) now comes back
  pre-filtered automatically — no client code needed to change for the UI
  to reflect this. `session-context.js`'s `scopedRoster()` doc comment was
  updated to explain why its teacher branch still just returns the roster
  unchanged and that's correct, not a leftover gap.
- **`classes`** — new match block, same admin-authored
  read-any-member/write-`canAdminCatalogue` shape as `courseOffers`.
- **`enrollments`** — read widened to `anyMemberOf()` (see the gap above).
- **`teacherStudentLinks`** — new match block. Read: admin, or either
  named person in the pair. Write: `canEnrol()` on either side (same
  authorization the enrolment change that triggers a recompute already
  needed).
- **`isEnrolledAsTeacherIn()`** and its `enrollmentRef()`-only-user removed
  — it only ever backed the narrower `enrollments` read rule that's now
  `anyMemberOf()`, so it became genuinely dead code, not kept "just in
  case."
- **Deliberately NOT scoped: `assignments` / `isAssignmentCreator()`.**
  `assignedToPersonIds` legitimately holds many students at once (a
  teacher assigning homework to a whole class in one document), and
  Firestore rules can't cheaply prove "every element of an arbitrary-length
  list is one of my co-enrolled students" the way `isCoEnrolledTeacherOf()`
  proves it for a single id — there's no per-element `get()` construct in
  rules at all, not just an expensive one. Closing this needs either a real
  contextId-trust model on assignments (client only offers checkboxes for
  one class's own roster; the rule checks a single `get()` on that
  declared `contextId` instead of every array element) or per-student
  assignment documents. Both are real, separate follow-up work — flagged,
  not silently left. `nav.js`'s "Previewing as: teacher" notice was updated
  to name this specific remaining gap instead of the old, now-resolved
  "shows the full roster" one.

### Class-wide bulk confirm

**`app/js/records.js`** — `bulkConfirmAllPendingForPerson()` (every pending
entry for one person, confirmed in one pass regardless of chunk) and
`bulkConfirmClass()` (loops every actively-enrolled student in a class).
This is the third bulk-confirm scope the Architecture doc names ("a surah,
a week, a class — required from the first version") that Phase 3 had to
leave for later because classes didn't exist yet — see that file's own
`bulkConfirmChunk`/`bulkConfirmWeek` comment.

### Nav

**`app/js/nav.js`** — added "Classes" (owner/prime only) after Course
Offers. Updated the stale "Previewing as: teacher" gap note (see above).

**`app/js/version.js`** — bumped to `07.12`.
**`app/js/feature-registry.js`** — Phase 10's `PHASE_RESERVATIONS` entry
flipped from `"planned"` to `"built"`, with a note on the assignments
exception. (Phases 6–9's own entries were already stale — still marked
`"planned"` despite being built and shipped — a pre-existing gap from
before this session, not something Phase 10 caused or was asked to fix.
Flagged here so it isn't mistaken for new drift.)

---

## Verification status

Mechanically verified during the build (no real Google account or
authenticated Firebase CLI available in that environment):

- `node --check` on every changed/new `.js` file (`collections.js`,
  `course-offers.js`, `classes.js`, `records.js`, `nav.js`,
  `session-context.js`, `feature-registry.js`, `version.js`) — parses
  cleanly.
- Both new/changed inline `<script type="module">` blocks
  (`classes.html`, `course-offers.html`) extracted and `node --check`ed —
  parse cleanly.
- `firestore.rules` — brace/paren counts balanced, no duplicate `function`
  names (checked twice, once after finding and fixing a duplicate
  `enrollmentRef()` introduced mid-edit).

**Owner-verified, 11 Aug 2026:**

- `firestore.rules` deployed via the Firebase Console's rules editor
  (console.firebase.google.com, project `study-monitoring`) — copy-paste
  from GitHub's `main` branch, not the CLI (matches this owner's
  non-persistent-VDI constraint noted in `CLAUDE.md` — no Node/CLI
  reliably available on their click-through machine). Compiled and
  published successfully, no errors.
- App version badge confirmed showing `v07.12` after deploy — confirms the
  mirrored `app/` push (`madrasatul-muslimeen.github.io`) is actually live,
  not just merged in the dev repo.
- `classes.html` loads cleanly from the nav bar.
- Created a real class, enrolled a real person as a student — confirmed in
  the roster line under the class card.
- No teacher account existed before this round (owner confirmed directly),
  so the one real behavior change this round makes — a teacher losing
  blanket tenant-wide access to just co-enrolled students — had **nothing
  to break**. Nothing needed re-testing for regressions here.

**Still open — needs a real second account holding only the `teacher`
role** (owner/prime's own access bypasses the new scoping entirely via
`canAdminIdentity()`, and `View as: teacher` previews on top of that same
real access, so neither proves the restriction actually holds):

1. Enrol a teacher and a student into the same class; confirm the teacher
   can record/confirm for that student on a study screen or Records.
2. Confirm a **different** teacher (not enrolled in that class) gets a
   clean, on-screen permission-denied message (I15) trying to act for that
   same student — not a silent failure.
3. Enrol a guardian's own child into a class as a student (as the
   guardian, not as admin) and confirm the class's teacher gains authority
   over that child too — this is exactly the scenario the `enrollments`
   read-rule gap (found and fixed before shipping, see above) would have
   silently broken if it had gone out unfixed.
4. Try the class-wide bulk confirm button after a couple of students have
   pending entries; confirm the count matches.
