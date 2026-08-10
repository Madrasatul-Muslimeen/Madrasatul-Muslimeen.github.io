# Phase 7 — Bookmarks, Programs, Routines — Build Log (round 1)

Read alongside `CLAUDE.md` and `PHASE-6-STATUS.md`. Built 10 August 2026.

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

## What's next

**Course offers + routines** — deferred by the owner this round (Stage B1,
lower priority than the owner's/family's own use per D13). Revisit once
external-student use is actually on the horizon, per the same D13 ordering.
Until then, `bookmarks.resume`'s `programId` segment stays the literal
string `"none"` for every entry.

Production deploy (`madrasatul-muslimeen.github.io/app/`) — pending; see
the session report for what's asked of the owner before that push.
