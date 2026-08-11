# Phase 7 — Bookmarks, Programs, Routines — Build Log

Read alongside `CLAUDE.md` and `PHASE-6-STATUS.md`. Round 1 built 10 August
2026; round 2 (course offers + enrolments) also built 10 August 2026,
v07.11, after the owner confirmed external-student use is actually on the
horizon (see below — this reverses round 1's own deferral decision, on
purpose, not by drift).

## Round 1 — bookmarks, Continue strip, routine renderer, LDOG

---

## Position

**Round 1 complete, not yet owner-verified.** Phase 7's written scope
(Architecture s7, F-073…F-084) is "Bookmarks (auto-resume + named, grouped
by program), Continue strip, course offers with routines, LDOG module,
routine renderer, in-app reminders." Two real scope questions came out of
reading that against the current codebase and Post-cutover priority (D13);
the owner decided both before any code was written:

1. **Learn Deen On-the-Go (LDOG)** was a plain topic under Deen Study
   ("Daily Deen Learning Habit for Life"). The Architecture doc's own
   renderer table (s5) names it as its own "routine" module, same as
   Health. Owner: pull it out, same treatment Health and Life Skill
   already got.
2. **Course offers + routines** (a shared schedule multiple people follow
   together) is Stage B1 territory — built for Tuition-Provider/external-
   student use, which D13 ranks below the owner's own and family's use.
   Owner: defer it to a later round; ship the rest now.

So this round is everything in Phase 7's scope **except** course offers —
Bookmarks, the Continue strip, the routine renderer, Health's real study
screen (structure-only since Phase 6 round 3), and LDOG pulled out as its
own module. In-app reminders are built as a lightweight, no-infrastructure
feature (see below), not the push-notification version the Architecture
doc's own Growth Seams section (s9) separately flags as needing the
distribution decision — that stays Phase 15+/parked, unchanged.

---

## What was built

**`app/js/bookmarks.js`** (new) — `bookmarks/{tenantId}__{personId}`, one
doc per person. `resume{}` is auto-touched every time a topic or routine is
opened in any module — a position, not a log, so I4 doesn't apply to it the
way it applies to records/activity. `saved[]` (named bookmarks a person
explicitly creates) is I4/D6-safe: "removing" one sets `removed:true`
in place rather than deleting the array element. `programId` is the literal
string `"none"` on every entry for now — same "reserved field, populated
later" shape as `activity.js`'s `viaProgramId`, ready for whenever course
offers ship.

**`app/js/continue-strip.js`** (new) — pure I2 renderer. The Architecture
doc (s5) ties the Continue strip to a card-grid landing page ("2+ modules
-> card grid + Continue strip") that was never built (flagged since Phase
5 round 8, still open — a separate decision, not part of this round).
Scoped here instead as a strip embedded directly in every study page's own
shell, right under the nav bar — delivers the "jump back to where I left
off" value without also being the landing-page rebuild. Wired into
`topic-study.js` and the new `routine-study.js`: every module's `-study.html`
page now has a `#continueStrip` div, shows up to 5 recent positions across
every module, and a click deep-links straight to that topic/routine's
detail view via `?resume=<subjectId>`.

**Routine renderer** — built as `routine-study.js`, a sibling controller to
`topic-study.js` rather than a merge into it or a subclass of it (see that
file's own header comment for why: the two share breadcrumb/list/resource
rendering directly from `topic-renderer.js`, but a routine leaf is claimed
toward mastery **and** logged per-occurrence for a streak, which a topic
never is — forcing one controller to cover both would mean every topic
caller carrying dead streak code it never uses). Concretely:

- `activity.js` gained `hasLoggedOn`, `getRecentWeeksActivity`, and
  `computeStreak` — all reading the same `activity` entries every module
  already writes (`action: "practised"` for a routine's Log button, vs.
  `"claimed"` for a status claim). No new collection.
- `way-modal.js` gained a `renderStreakTab()` — a fourth tab
  (Track/Guide/**Streak**/Breakdown) showing the streak count and a Log
  button.
- `topic-renderer.js`'s `renderTopicChildList()` gained an optional third
  parameter (`loggedTodayByNodeId`, empty by default) so a routine's browse
  list can show a "Logged today" / "Due today" badge per leaf — additive,
  every existing topic-renderer caller is unaffected.
- One "Practised" trackable per routine module (`practised_health`,
  `practised_ldog`) — same shape as the topic renderer's "Studied"
  trackable (`catalogue-data.js`'s `studiedTemplate`), via a sibling
  `practisedTemplate` helper.

**In-app reminders** — no push infrastructure (that stays Phase 15+, gated
on the distribution decision, per the Architecture doc's own Growth Seams
list). Built as: a "Due today" / "Logged today" badge per routine leaf on
the browse list (from the current week's already-loaded activity doc — no
extra read), plus a small banner at the top of Health/LDOG's page counting
how many routines at the current browse level aren't logged yet today.

**Health's real study screen** (`app/health-study.html`, new) — Health has
had a real module and subject tree since Phase 6 round 3 (structure only,
explicitly waiting on this round's routine renderer). Now wired up:
`initRoutineStudyPage({ moduleId: "health", trackableId: "practised_health",
rootSubjectId: "health" })`. No routines pre-seeded — same "claimable only
once a real resource is attached" rule every topic module already follows.

**LDOG pulled out as its own module** (`app/ldog-study.html`, new) — new
module `ldog` (renderer: `routine`), new top-level subject root `ldog` +
child `daily_deen_habit` (root+child shape, matching Health, not Life
Skill's "the node itself becomes the root" shape — this leaves room for
more LDOG subjects later without a second restructure).
`ensureLdogReparented()` added to `catalogue.js`, same self-repairing shape
as `ensureHealthStudyReparented`/`ensureLifeSkillReparented` — reparents
`daily_deen_habit` out of `deen_enhancement` and retags its `moduleIds`
from `["deen"]` to `["ldog"]`. Wired into `catalogue.html`'s existing
`runSeedIfNeeded()`, so it self-repairs the next time an owner/prime opens
the Catalogue page, same as the two prior migrations.

**Applied directly to the real tenant's data** (dry-run, apply, re-verify,
same discipline as Phase 6 rounds 4–5) rather than waiting on that next
Catalogue page load — checked first (direct Firestore access, same method
Phase 6 round 4 used) that `daily_deen_habit` had zero existing claimed
records anywhere (it never had a resource attached, so nothing to lose),
then created `modules/ldog`, the tenant's `ldog` subject row, and both new
`practised_health`/`practised_ldog` trackable rows, then reparented
`daily_deen_habit` and re-verified the whole tenant still has exactly one
top-level root per module (the same check that caught round 4's real bug)
before finishing.

**`firestore.rules`** — new `bookmarks/{tenantId}__{personId}` match block,
same `canRecordFor` shape as `records`/`activity` (a person's own data,
read/write gated the same way). Deployed and confirmed live (`firebase
deploy --only firestore:rules`).

**Nav** — Health and Learn Deen On-the-Go links added
(`app/js/nav.js`).

---

## Verified this round

- Every new/edited JS file parses cleanly (`node --check`).
- `firestore.rules` compiled and deployed without error.
- Local static server (`serve.js`) + the Browser pane: `catalogue.html`,
  `deen-study.html` (an already-shipped page, to confirm the `topic-study.js`
  edits didn't regress it), `health-study.html`, and `ldog-study.html` all
  load with zero console errors and every import resolving — as far as
  sign-in-page-only checking can go without the owner's own Google account.
- Direct Firestore read (same OAuth-token method as Phase 6 round 4):
  confirmed the real tenant now has exactly one top-level (`parentId: null`)
  subject per module (`arabic_language, deen_study, general_study, hadith,
  health, ldog, life_skill, nature_life, quran`), and that `daily_deen_habit`
  carries no orphaned claim history from its old placement.

**Not verified**: the actual signed-in click-through (Continue strip
appearing/working, logging a routine, the Streak tab, Health/LDOG topics
once a resource is added). That needs the owner's own account — see below.

---

## What still needs your click-through

1. Open **Catalogue** once (confirms the self-repair path works exactly as
   it will for anyone who hasn't already benefited from this round's direct
   data fix) — should show Health and Learn Deen On-the-Go's module rows.
2. Add a real topic (with a resource) under Health and under Learn Deen
   On-the-Go, same flow as any other module's first topic.
3. Open that topic from **Health** / **Learn Deen On-the-Go** in the nav,
   claim a status, and separately hit **Log today** on the Streak tab —
   confirm the streak count and the "Due today"/"Logged today" badge on the
   browse list update.
4. From any module's study page, open a topic, then go to a different
   module's page and check the **Continue strip** shows it and jumps back
   in correctly.
5. Confirm Deen Study no longer shows "Daily Deen Learning Habit for Life"
   under Enhancement (it should only appear now under Learn Deen
   On-the-Go).

## What's next (as of round 1)

**Course offers + routines** — deferred by the owner this round (Stage B1,
lower priority than the owner's/family's own use per D13). Revisit once
external-student use is actually on the horizon, per the same D13 ordering.
Until then, `bookmarks.resume`'s `programId` segment stays the literal
string `"none"` for every entry.

Production deploy (`madrasatul-muslimeen.github.io/app/`) — pending; see
the session report for what's asked of the owner before that push.

---

## Round 2 — course offers + enrolments (v07.11)

**Round 2 complete, not yet owner-verified.** Built after the owner
confirmed (asked directly) that external-student use is now actually on
the horizon — the exact trigger round 1's own deferral note said to wait
for.

### What was built

**`app/js/course-offers.js`** (new) — `courseOffers/{tenantId}__{offerId}`
(admin-authored, same read-any-member/write-`canAdminCatalogue` shape as
ladders/domains/resources) and `enrollments/{tenantId}__{contextId}__{personId}`
(`contextType` is always `"courseOffer"` this round — classes don't exist
until Phase 10, and nothing in a later phase is a prerequisite for an
earlier one). `routine{}` on a course offer is deliberately minimal — days
of week, a start/end date, a notes field — a description of *when* the
offer runs, not real dated session instances (that's Operations/Phase 14,
reserved, not built). I4/D6 throughout: offers archive via `status`,
enrolments end via `status`/`endedAt`, nothing is ever deleted.

**`app/course-offers.html`** (new) — same shell every Phase page uses.
Owner/prime get a "New course offer" form (name, subjects, a day-of-week
picker, optional date range, notes) and can archive an offer or end anyone's
enrolment. Every visible person can enrol themselves/their child into an
active offer and see that person's own current enrolments.

**`firestore.rules`**:

- `courseOffers` — read any member, write `canAdminCatalogue` (owner/
  prime/platformAdmin), exactly like ladders/domains/resources.
- `enrollments` — write via a new `canEnrol()` (admin, the child's
  guardian, or the adult enrolling themself — matches the role table;
  teachers don't self-enrol students). Read via admin, the person
  themself/their guardian, **or a new `isEnrolledAsTeacherIn()`** — this
  is the one worth flagging: it's a real, properly-scoped alternative to
  the "teacher sees the whole tenant roster" gap used everywhere else in
  this codebase (records, assignments — no per-teacher assignment model
  exists there yet). A teacher can only see the enrolment roster of a
  course offer they are *themselves* enrolled in with `roleInClass:
  "teacher"` — checked via one `get()` on their own enrolment doc for that
  same `contextId`. It doesn't retroactively fix the older, disclosed gaps
  elsewhere, but it's a real building block for eventually closing them
  (the still-parked Family-tenant "outside teacher scoped to specific
  subjects/children" question could plausibly reuse this exact mechanism
  later, even outside a course-offer context).

**`app/js/nav.js`** — added "Course Offers" after Homework.
**`app/js/version.js`** — bumped to `07.11`.

### Explicitly NOT built this round (flagged, not an oversight)

**Wiring live study activity to a real enrolled offer.** `bookmarks.resume`'s
`programId` and `activity`'s `viaProgramId` (I3) both stay the literal
string `"none"`/`null` — this round ships the offer/enrolment data layer and
an admin UI, but does not touch `topic-study.js`, `routine-study.js`,
`quranrevival.html`, `hifz-renderer.js`, or any other already-shipped study
renderer to make them aware "I'm studying this as part of an enrolled
offer." That's a real, separate integration task across every study screen
this codebase has, not something to fold into the same sitting as the data
layer. Also not built: adding `enrollments` to the app's startup path,
despite the Architecture doc's own load-speed budget (s8) listing it there
("3 reads: userIndex, enrolments, bookmarks") — deliberately deferred until
the live-study wiring above actually needs it; adding an unused startup
read now would violate this project's own "nothing joins the startup path
without being flagged" rule for no real benefit yet.

### Verified this round

- `node --check` on `course-offers.js` and the `nav.js` edit — parses
  cleanly.
- `firestore.rules` compiled clean on both a dry-run and the real deploy
  (`firebase deploy --only firestore:rules --project study-monitoring`).
- `course-offers.html` loaded in a real browser against the local dev
  server: every import resolves, no console errors introduced, the
  day-of-week checkbox list renders correctly, and `renderNavBar()`
  re-exercised directly shows the new "Course Offers" link in the right
  place.

**Not verified**: the actual signed-in click-through — same limitation
every round has had. What the owner should check for real: create a course
offer, enrol yourself and a child into it from two different accounts, end
an enrolment, and (if a teacher account is available) confirm a teacher can
only see the roster of an offer they're enrolled to teach, not others.
