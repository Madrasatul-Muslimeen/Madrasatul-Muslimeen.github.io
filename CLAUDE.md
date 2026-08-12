# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.

**Current milestone: QuranRevival v07.21.** Cutover to production happened
9 August 2026 (v07.00) — the app is now live and real, not a beta. v07.01
(same day) added a version badge next to the app name and a link to the
old app from the shared nav bar. v07.02 (10 Aug 2026) is Phase 6: the
topic renderer plus six new study screens — Deen Study, Arabic, Hadith,
General Study, Nature-Life, and Life Skill (pulled out mid-round into its
own independent module, owner's call) — a real top-level subject tree +
module for Health (structure only; its actual study screen needed the
"routine" renderer, built next round), and topic authoring with resources
from the Catalogue page. v07.03 (10 Aug 2026) is Phase 7 round 1: the
routine renderer (streak + "log today," on top of the same claim/confirm
ramp every renderer shares), Bookmarks + a Continue strip embedded in
every study page, Health's real study screen, and Learn Deen On-the-Go
pulled out of Deen Study into its own module (owner's call, same
treatment Health/Life Skill got). Course offers + routines — the rest of
Phase 7's written scope — deferred by the owner to a later round (Stage
B1, lower priority than the owner's/family's own use per D13). v07.04
(10 Aug 2026) added a direct Ayah picker next to Surah on QuranRevival's
Study screen (owner: Prev/Next alone made jumping deep into a long surah
impractical). v07.05 (10 Aug 2026) fixed a real, pre-existing bug across
all 8 topic/routine module pages (Deen Study, Arabic, Hadith, General
Study, Nature-Life, Life Skill, Health, Learn Deen On-the-Go): subject
names in the browse list were invisible white-on-white (the row is a
`<button>`, whose base style is white text; `.topic-row` overrode the
background to white but never overrode the text color) — only the status
chip's own explicitly-colored text ever showed, which read as "nothing
here but 'No resource yet'." v07.06 (10 Aug 2026) made the Catalogue
page's subject tree collapsible per-subject (a toggle on any branch row,
session-only state) and made clicking a module in the Modules table jump
straight to that module's subject-tree section. v07.07 (same day)
followed up on owner feedback: every branch now starts collapsed by
default (opened on demand, not the other way round) on a fresh view —
reset per tenant switch, but left alone after an in-place add/edit/archive
so an open section doesn't silently re-collapse — and the toggle itself is
now much bigger (0.8rem → 1.3rem, bold) for an easier tap target. v07.08
(same day) fixed the sign-in "flash" on every page (owner: clicking
between modules looked like it signed you out and back in) — every page's
default pre-JS-load state was "Not signed in." with a visible Sign In
button; that's genuinely what painted first on every full-page navigation
before Firebase Auth resolved, even though the session itself was fine.
Changed the default to a neutral "Checking sign-in…" with the button
hidden until the app actually confirms there's no user — pure markup,
zero JS logic touched, across all 16 pages that have this block. Also
added move-up/move-down + a "Move to…" re-parent action to Catalogue's
Modules and Subjects tables (auto-renumbering siblings on each move), and
granted the owner's account `platformAdmin` so the module half of that
actually works (D14). v07.09 (same day) is Phase 8 round 1: `monitor.html`
+ `js/monitor.js` — one universal report over `records` + `activity`
(weekly/monthly, per-student and per-subject summaries, CSV export, print),
plus a Quran-only Approach-status breakdown on top, exactly as scoped
below. Read-only, no new collection, no `firestore.rules` change. v07.10
(same day) is Phase 9 round 1: `homework.html` + `js/homework.js` —
assignments to a **person** (no classes until Phase 10), numeric scores,
confirm-with-comment, plus private teaching notes. Along the way, found and
fixed a real bug live since Phase 3: `firestore.rules`' `isGuardianOf()`
checked a `memberships.guardianOf[]` field nothing in the client has ever
written to (always `[]`) — a guardian-only account could not actually
record/confirm/bookmark for their own child through the rules, only ever
working by accident when the same account also held owner/prime/teacher.
Rebuilt on the same real, populated `tenantPeople.managedByPersonId` field
`records.js` already used (see `PHASE-3-STATUS.md`'s own note that this was
fixed client-side but, it turns out, never on the rules side). Deployed to
`study-monitoring` immediately. v07.11 (same day) is Phase 7 **round 2**:
course offers + enrolments (`courseOffers`/`enrollments`, Stage B1) —
round 1 had deferred this as lower priority than the owner's/family's own
use per D13; built now that the owner confirmed external-student use is
actually on the horizon (asked directly before building, per the D13
ordering's own stated trigger). `app/course-offers.html` +
`js/course-offers.js`, plus a `firestore.rules` addition at the time worth
noting: `isEnrolledAsTeacherIn()` was a real, properly-scoped alternative
to the "teacher sees the whole tenant roster" gap used elsewhere in this
codebase — a teacher could see the enrolment roster of a course offer they
were themselves enrolled to teach. Does not yet wire live study activity
(`bookmarks.resume.programId`, `activity.viaProgramId`) to a real enrolled
offer — flagged as a deliberate, separate follow-up, not an oversight, and
still true as of v07.12. v07.12 (11 Aug 2026, on Claude Code on the web) is
**Phase 10 round 1: Classes & provider (Stage B2)** — `classes.html` +
`js/classes.js`, `enrollments` generalized to `contextType: "class"`
(reusing Phase 7 round 2's `enrolPerson()`/`endEnrollment()` rather than
duplicating them), class-wide bulk confirm, and the real substance of the
round: **the second open access-control question this file had parked is
now closed, asked directly and confirmed by the owner before building** —
a teacher membership no longer grants blanket tenant-wide access to every
student; `canRecordFor()` (records/activity/bookmarks/submissions) and the
`tenantPeople` roster read now both require `isCoEnrolledTeacherOf()`, a
new `teacherStudentLinks` D9-style rules-support mirror keyed by
class/course-offer enrolment. `isEnrolledAsTeacherIn()` above is retired —
superseded by this, not left running alongside it. **`homework`/
`assignments` is a flagged, deliberate exception**, still tenant-wide for
teachers — Firestore rules can't cheaply prove "every element of an
array is one of my students," only a single id, so this needs a real
contextId-trust model or per-student assignment docs as its own follow-up.
Prime role was audited, not rebuilt — already correct everywhere since
Phase 1. **`firestore.rules` for this round was deployed by the owner
11 Aug 2026**, via the Firebase Console's rules editor (copy-paste from
GitHub, not the CLI — this owner's click-through machine can't reliably
keep Node/CLI tools installed between logins) — compiled and published
clean, no errors. Owner-verified same day: version badge shows v07.12
(confirms the production mirror push is actually live, not just merged in
the dev repo), `classes.html` loads, a real class + student enrolment
works. No teacher account existed before this round, so the one real
behavior change this round makes (a teacher losing blanket tenant-wide
access to just co-enrolled students) had nothing to break. **Still open:**
the actual scoping enforcement (a co-enrolled teacher allowed, an
unrelated one cleanly blocked) needs a second real account holding only
`teacher` — owner/prime's own access bypasses the new scoping entirely, so
it can't be proven from the owner's own login or a "View as" preview. See
`PHASE-10-STATUS.md` for the full build log and the remaining checklist,
including a real gap found and fixed in the same sitting (not a live bug
like Phase 9's): the first version of `enrollments`' read rule would have
silently prevented a guardian-enrolled child's class teacher from ever
gaining real authority over them. v07.13 (11 Aug 2026, on Claude Code on
the web) is **Phase 11 round 1: Curriculum, grades & resources (Stage
C)** — `curriculum.html` + new `js/curriculum.js`/`js/grades.js`, plus an
extension to the existing `js/resources.js`. Ladders and levels (the
schema half of "grades") were already built in Phase 2 (`F-025`); what was
actually missing was assigning a person a level over time as **dated
history** — `personLevels`, whose `firestore.rules` block was, notably,
already deployed pre-emptively back in Phase 2/10 for exactly this round,
same "reserve the rule before the UI needs it" pattern as `tenantInvites`
in Phase 1. That rule allows `create` but not `update`/`delete` on
purpose: `grades.js` never edits an old dated row, it only ever adds a new
one with a later `fromDate` — a correction is a new row, not touching the
last one, matching I4/I6's own shape everywhere else in this app.
`curriculumUnits` (the CONTENT half, cross-subject) and `curriculumPlan`
(the SCHEDULE half — 4 terms × 10 weeks, a class **or a person** as
context) are the two genuinely new collections this round, kept separate
per I8 so re-planning a unit into a different week never touches the unit
itself. `resources.js` gained a real tenant-wide browse (`listResources`)
and archive (`setResourceStatus`) — its own old comment claiming Firestore
couldn't support a tenant-wide list query for it was checked against the
actual deployed rule and found to be stale, corrected in place rather than
left to mislead a future round. Person-context curriculum planning
(alongside class-context) was a deliberate choice, not directly asked of
the owner: I1 ("nothing in Layer 2/3 ever requires a `classId`") only
technically binds Layer 2/3, but the same reasoning was extended here so a
Family/Individual tenant — the owner's/family's own real use, ranked first
by D13 — gets real curriculum scheduling too, not just Tuition-Provider
classes. **Not yet owner-verified, `firestore.rules` not yet deployed**
(same Claude-Code-on-the-web / no-CLI constraint as every recent round) —
see `PHASE-11-STATUS.md` for the full build log and an 8-item verification
checklist, plus what was deliberately left for a later round (curriculum
plan entries don't yet wire to any study renderer, same "data layer +
admin UI first" shape Phase 7 round 2 already used for course offers).
v07.14 (11 Aug 2026, on the CLI) is Shell round 3: the shared nav bar
(`app/js/nav.js`, `renderNavBar()`) had grown to a flat ~19-link list that
wrapped/crowded at the horizon — reorganized into five categories per the
owner's own mockup — **Admin** (People, Catalogue — owner/prime only,
unchanged gating), **Study Module** (all 9 study-renderer pages),
**Operation** (Classes, Curriculum, Course Offers, Homework, Records,
Monitor — Classes and Curriculum keep their real `ownerPrimeOnly` gating
from Phase 10/11 even though the category itself is open to everyone else
too), **Bookmark** and **Settings** (Language, Appearance) both disabled
placeholders only, real functionality deferred by the owner to a later
round. This round was planned and mostly built before Phase 10/11 (Classes,
Curriculum) landed on `main` from a concurrent Claude-Code-on-the-web
session — merged in on top rather than shipped from a stale base, which is
why Operation carries real links for both instead of the disabled
"Curriculum" placeholder this round was originally going to ship with.
Each category is a native `<details>/<summary>` disclosure (no
click-handler JS needed, keeping `nav.js` a pure renderer per I2) that
auto-opens if it contains the current page. Location change only,
confirmed with the owner before building — no link's destination or
gating logic changed beyond folding Phase 10/11's own per-link
`ownerPrimeOnly` flags into the category-level render. The Legacy App
link, sign-in status text, and Sign In/Sign Out buttons moved out of
`renderNavBar()`'s own output into each page's static pre-JS markup as a
labeled "Home" bar — they were already static (v07.08's anti-flash fix),
and folding them into the role-gated renderer would have delayed them
until after sign-in resolves, reintroducing exactly the kind of flash
v07.08 fixed. The nav bar's CSS, previously copy-pasted into a `<style>`
block in every one of 15 pages since shell round 1, is now one shared
`app/css/shell.css` linked from each page instead. On `quranrevival.html`
only (per the owner's own scope call — every other page's ad hoc `<h1>`
stays untouched): the "QuranRevival vX.XX" title now carries a tagline
("Reviving the Quran, abandoned.", reused verbatim from the boot splash)
and sits above the nav bar, and the existing tenant-editable banner
(F-061, `#globalBanner`) moved to sit *before* `#navBar` instead of
immediately after it, so the nav bar is no longer directly followed by a
second banner. No Firestore or `firestore.rules` changes. None of
v07.04–07.14 are phase deliverables beyond 07.09/07.10/07.11/07.12/07.13
themselves; no status file of their own for 07.04–07.08 or 07.14. See
`PHASE-11-STATUS.md` for Phase 11 round 1's build log,
`PHASE-10-STATUS.md` for Phase 10 round 1's, `PHASE-9-STATUS.md`
for Phase 9 round 1's (including the bug fix above in full),
`PHASE-8-STATUS.md` for Phase 8 round 1's, `PHASE-7-STATUS.md` for Phase 7
(now covering both rounds), and `PHASE-6-STATUS.md` for Phase 6's,
including three real pre-existing data bugs found and fixed by querying
Firestore directly rather than guessing from the code. We are past "build
against a parity checklist" and into "rebuild, enhance, modify, and fix
from here," driven by real use. See "Post-cutover rollout order" below for
whose real use comes first.
v07.15 (11 Aug 2026, on Claude Code on the web) is **Phase 13 round 1:
Asma ul Husna + About** — the 99 Names of Allah as a real study module
(`app/js/asma-data.js`, sourced and cross-checked rather than typed from
memory, registered via the same `MODULE_TEMPLATES`/`SUBJECT_TEMPLATES`/
`TOPIC_TRACKABLE_TEMPLATES` pattern every other module uses, its own
`"asma"` renderer since the content is fixed platform data, not
tenant-authored), a screensaver cycling poster images the owner supplied
mid-round (`https://archive.org/details/NamesAndAttributesOfAllah`,
referenced by URL rather than copied into the repo — this codebase embeds
no binary media anywhere else either, Quran audio included), and
`about.html` — the first real screen reading `feature-registry.js`'s
`getFullRegistry()` (built in Phase 0 as F-006, unused by any screen until
now). Along the way, found and fixed a stale-flag bug: **Phase 12
("Remaining modules") was already fully built**, delivered inside Phase 6
round 2 (Arabic/Hadith/General Study/Nature-Life) and Phase 7 round 1
(Health) without its own numbering ever being flipped from `"planned"` to
`"built"` — same drift Phase 10's build log already flagged for Phases
6-9's rows. No code changed for Phase 12 itself; the flag was simply
wrong. **Messaging (threads, per-person inbox) — the third and largest
piece of Phase 13's own scope — is deliberately deferred**, not built this
round: the Architecture doc already resolves its hard safeguarding
question (guardian sees every minor's thread, no private adult-child
thread, append-only, no group chat), but it's still new direct-communication
surface involving children, and per D13's own "lower-risk, proven-first"
spirit it's better sequenced once there's a real second `teacher`-only
account to verify against — the same gap Phase 10 itself is still waiting
on. See `PHASE-13-STATUS.md` for the full build log.
v07.16 (11 Aug 2026, on Claude Code on the web) closes part of the gap
Phase 7 round 2 explicitly flagged and deferred: `bookmarks.resume`'s
`programId` and `activity`'s `viaProgramId` (I3) now carry a real course
offer id when the person studying is actively enrolled in one that covers
the subject — previously always `"none"`/`null`. Wired into `topic-study.js`
(Deen Study, Arabic, Hadith, General Study, Nature-Life, Life Skill) and
`routine-study.js` (Health, LDOG) via a new
`programSubjectMapFromEnrollments()` helper in `course-offers.js`.
**QuranRevival and Asma ul Husna are still NOT wired** — their subjectId
shape doesn't map cleanly onto a course offer's `subjectIds[]` picker,
flagged as real separate follow-up rather than guessed at. Purely additive
metadata — no `firestore.rules` change, no behavior change for anyone not
enrolled in a matching course offer. See `PHASE-7-STATUS.md`'s new "Round
3" section for the full build log.
v07.17 (11 Aug 2026, on Claude Code on the web) closes the Homework
teacher-scoping gap `isAssignmentCreator()`'s own comment flagged since
Phase 9 first shipped: a teacher could create/read an assignment naming
ANY student in the tenant, not just their own, because Firestore rules
can't cheaply prove "every element of `assignedToPersonIds` is one of my
co-enrolled students." Built using exactly the contextId-trust model that
comment proposed, now that Phase 10's classes/enrollments give it a real
anchor: new `isActiveTeacherInContext()` in `firestore.rules` (a single,
cheap, fixed-path `get()` on `enrollments`), `homework.html` gained a real
"Class / Course Offer" picker that restricts a teacher's "Assign to" list
to that context's own roster, and requires one before a teacher-created
assignment can be written at all. The guardian branch of the same rule was
initially left as-is (a separate, already-disclosed, tenant-wide
limitation) — see v07.18 immediately below for why that changed same-day.
v07.18 (11 Aug 2026, on Claude Code on the web) is a same-day correction
to v07.17, asked for directly ("finish the guardian side too") — and while
building it, a real flaw was found in v07.17's own read-rule design before
the owner ever deployed it (caught in time, no live exposure): a security
rule that reads a *different* document via `get()` — which
`isActiveTeacherInContext()` does — is exactly the shape Firestore's
list-query provability check tends to reject outright, and `assignments`
is *always* read via a query in this app, never a single `getDoc()`. Left
as shipped, a real teacher's (or a newly-scoped guardian's) own homework
list would likely have 403'd the moment the rules deployed. **Fixed by
denormalizing instead of computing at read time**: `assignments` gained
`extraReadersPersonIds[]` — every active teacher of the declared
`contextId` plus the guardian of each assigned student, computed ONCE at
creation by the client, not the rule. The read rule now only checks plain
array membership on that field — the same, already-proven-in-production
shape the assigned-student-self branch has used since Phase 9 round 1 —
which is what actually closes the guardian gap too, symmetrically, in the
same change. `isActiveTeacherInContext()` itself is untouched and still
correct — it backs `create`/`update`, single-document writes where this
list-query concern never applied. `firestore.rules` still NOT deployed —
this round's version supersedes v07.17's; deploy v07.18's rules, not an
earlier copy. See `PHASE-9-STATUS.md`'s "Round 2" section (rewritten
in place to describe the corrected design, with the original flaw
recorded rather than erased) for the full build log.
v07.19 (12 Aug 2026, on Claude Code on the web) closes two more
already-flagged follow-ups in one sitting, both picked over Phase 14
(Operations, still excluded unless asked) and Phase 13's messaging (still
blocked on a real teacher account): **QuranRevival and Asma ul Husna are
now wired into the `programId` mechanism** Phase 7 round 3 built for the
other modules — both turned out straightforward (their one anchor subject
is already offerable in a course offer's own subject picker); along the
way, found that `quranrevival.html` never calls `touchResume()` at all —
a real, separate, pre-existing gap in Phase 7 round 1's own Continue-strip
rollout, flagged rather than silently patched in. **Subject-level teacher
scoping is also built** — the SUBJECT half of the access-control question
CLAUDE.md has carried since 31 Jul 2026 (the STUDENT half closed in Phase
10). This is explicitly a CLIENT-SIDE restriction, not a new
`firestore.rules` boundary — `canRecordFor()` is unchanged, since records
chunk a whole module's claims under one document and rules can't safely
inspect which one key of that map a write touched, same limitation this
codebase already accepts elsewhere. A real data-model finding along the
way: `enrolPerson()`'s own per-enrolment `subjectIds[]` is never actually
populated by any screen (checked every real call site) — the first draft
of this round read from it and would have locked every teacher out of
every subject; the shipped version reads subjects off the CLASS/COURSE
OFFER itself instead, where an admin actually names them, and falls back
to no restriction when a context never named any (an empty result almost
always means "didn't bother," not "assigned to nothing"). No
`firestore.rules` change either round — nothing to deploy this time. See
`PHASE-7-STATUS.md`'s "Round 4" and `PHASE-10-STATUS.md`'s "Round 2" for
the full build logs. **Check this line's version number every session** —
it's manually updated per `app/js/version.js`'s own scheme (first two
digits = big overhaul, last two = each new feature) and will drift if a
future round forgets to bump it here too.
v07.20 (12 Aug 2026, on the CLI) is Shell round 4, from a real layout
discussion with the owner (see the "Layout Discussion" session) rather
than a build-phase deliverable. Two things changed together:
**QuranRevival is also the whole app's name, not only one module's** — so
the app no longer shows a separate landing page before the Quran Study
content. `app/index.html` is now a pure, silent, synchronous redirect into
`quranrevival.html` with no banner or Firebase logic of its own (it never
needed any — `quranrevival.html` already handles sign-in/no-account/
signed-in independently, since every other page already links to it
directly). This is what the owner meant by "the landing page should be
like [the Mastery Wheel screenshot]": banner, then nav, then the wheel,
with no visible hop between two differently-chromed pages — achieved by
retiring the second page's own chrome rather than merging the ~1500 lines
of wheel/Explore/drill code into two places. Every other file that already
referenced `quranrevival.html` by name (`continue-strip.js`,
`feature-registry.js`, `mastery-wheel.js`, `course-offers.js`,
`asma-posters.js`, `monitor.js`) needed no changes — the canonical URL
never moved. Caught and fixed along the way: `index.html` used to fire the
boot splash (Ta'awwudh/Basmala) before its own sign-in check; stripping
its UI would have silently dropped that splash from the real app entirely,
since nothing else called it. It now fires from `quranrevival.html`,
chained before the existing Quran-entry splash, each still keyed to its
own independent Every-time/Once-a-day/Once-a-week preference.
**The shared nav bar (`js/nav.js`, shell round 3's five categories) is down
to four main buttons — Home / Study / Operation / Bookmark — sized to fit
one line on a phone**, per the owner's own follow-up ("a mobile can hold 4
buttons in one line... Settings could go under Main [Home]... Home button
is one of the main buttons"). Admin, About and Settings all fold inside
Home now instead of being their own top-level entries. Home itself is
still split the same way it always was for the v07.08 sign-in-flash fix —
sign-in status, Sign In/Out and the Legacy App link stay static markup
each page renders before any script runs (now a `.nav-cat-home` `<details>`
sitting in the nav row itself instead of a separate bar above it);
`renderHomeExtras()` (new, alongside the existing `renderNavBar()`) renders
only the role-gated Admin/About/Settings portion, injected into that same
`<details>` once roles are known — exactly Admin's old timing, one level
deeper. The Study category's first entry is renamed "Study" → "Quran
Study". Applied identically across every page that carries the nav bar
(confirmed with the owner: same bar everywhere, not just the two pages
above) — including `classes.html` and `curriculum.html`, which turned out
to have missed shell round 3 entirely (built concurrently, merged in
after): no `shell.css` link, no Legacy App link, and their own stale local
`.app-nav`/`.nav-link` CSS left over from before the `<details>`-based
category redesign, silently unstyled ever since. Brought in line with
every other page as part of this same round rather than left as a second,
separate gap. No `firestore.rules` or schema changes — layout and shared
JS/CSS only. See the "Layout Discussion" session transcript for the full
back-and-forth (a mockup artifact was used mid-discussion to confirm the
shape before building) rather than a phase status file, since this wasn't
phase-numbered work.
v07.21 (12 Aug 2026, on the CLI) is a same-day correction to v07.20, from
the owner's own phone screenshot of the live result: on quranrevival.html
(now the landing page too), the "Study" category was auto-opening on every
visit — `renderCategory()` had always opened a category by default when
the current page was one of its own links, harmless when quranrevival.html
was one destination among several, but with it now also serving as the
landing page, that meant Study's full module list was expanded on
effectively every load, pushing the real content (the wheel) further down
the screen than intended. Removed entirely, for every category including
Home — they all start closed now and stay closed until tapped; the
current-page link itself still gets the `nav-current` highlight once a
category is opened, so nothing about "where am I" is lost. Also flagged to
the owner, not yet acted on pending their steer: quranrevival.html's own
tenant-editable `#globalBanner` (Ahsan's tenant has it set to literally
repeat "QuranRevival" / "Reviving the Quran, abandoned.", the app banner's
own wording) plus the Tenant/Person/Surah/Ayah/Approach/Language/Study
Unit control row both sit between the nav and the wheel — both pre-existing
quranrevival.html content, not introduced by shell round 4, but far more
visible now that this page is the default first screen. That's squarely
the "Quran Study module's own layout" conversation the owner already asked
to have separately, once shell round 4 shipped.

---

## What this is

A multi-tenant Madrasah platform, being rebuilt from a single-file HTML app
(`index.html`, ~10,150 lines) into a Firebase/Firestore application.

**The owner is a non-coder.** They cannot read code, cannot verify code, and can
only perform checks when guided click by click. This is a hard constraint on how
work is done, not a preference. Anything that ends with "please test this" is a
step that may never actually get verified — so verification must be mechanical
wherever possible.

Communication: plain language, one-line gloss on any jargon. Direct and
decision-oriented. Corrections come promptly when framing drifts.

---

## Source of truth

| File | Role |
|---|---|
| `QuranRevival_Complete_Architecture.html` | **THE source of truth.** Schema, invariants, roles, renderers, unit keys, 15 build phases, load-speed budget. Confirmed by the owner. |
| `QuranRevival_Subject_Catalogue_v3.md` | 31 subjects, 30 Approaches in 7 sections. **Approved as-is (D11).** Phase 2 input. |
| `QuranRevival_Parked_Items_Register.html` | 36 deferred items. **Do not build these.** |
| `index.html` | The pre-cutover production app. **REFERENCE ONLY — NEVER EDIT.** No longer live at the production URL as of 9 Aug 2026 (cutover) — archived, reachable at `https://madrasatul-muslimeen.github.io/legacy/index.html`. |

Do not re-derive or re-propose the architecture. If a request appears to
conflict with it, **ask** — do not assume.

`QuranRevival_Master_Plan_Final.md` and `QuranRevival_System_Blueprint.md` are
referenced in older instructions but were never supplied and do not exist.

---

## How to work

- **Master Software Architect.** Diagnose before changing anything.
- **One phase at a time.** Present the plan and its blast radius; get explicit
  sign-off; then build.
- **Read only what the current task needs.** Do not re-survey the whole file.
  Do not restate the architecture.
- **Verify, do not guess.** Before claiming anything works: check syntax,
  confirm every referenced function actually exists, confirm no existing
  behaviour or data was removed. Never report something as done without
  having checked it.
- **Additive only.** Never delete or destructively reshape data. Archive,
  revoke, return, mark consumed — never destroy.
- **State the blast radius before writing code.**
- **If a plan proves wrong mid-build, STOP and say so.** Do not build something
  known to be poor.
- **No permission-asking for routine building/fixing work.** The owner has
  said this repeatedly and explicitly: do not pause to ask before file
  edits, git operations (add/commit/status/log/diff/init), running or
  stopping the local test server, or any Firebase CLI action on the
  `study-monitoring` project — including deploying `firestore.rules`. This
  covers everything in this project's folder and everything on that
  Firebase project. Just do it and report what was done afterward. The
  only things that still need the owner's actual input are genuine
  design/scope decisions — an architecture deviation, an ambiguous spec, a
  real "which approach" choice — the kind of thing that needs their
  opinion, not their permission.
- **On Claude Code on the web: merge your own PRs, every time, without being
  asked.** This project has been worked on both via the Claude Code CLI
  (local files, no GitHub layer, changes are just immediately there) and via
  Claude Code on the web (each session gets its own working branch on
  `Madrasatul-Muslimeen/QuranRevival---ClaudeCode`; nothing reaches `main` —
  what the owner actually tests — until a PR merges it in). The owner's own
  click-through always happens against `main`. A session that finishes work
  and leaves it sitting on an unmerged branch has, from the owner's side,
  done nothing yet — this already caused real confusion once (Phase 4
  round 2: real fixes, pushed, but invisible until merged two rounds later).
  So: open the PR and merge it yourself as the last step of finishing any
  chunk of work on this repo, same as the other git operations above — no
  permission needed, don't leave it pending "for the owner to merge" unless
  they've explicitly said they want to review first.
- **Be proactive.** Flag anything adjacent that is broken or risky rather than
  working around it silently.
- **Report every time:** what was done, what is pending, what the owner should
  check. Keep checks short — long click-throughs will not happen.
- **Must work on desktop, tablet and phone.**
- **Do not build** Finance, Operations, medical records, or distribution unless
  explicitly asked.

---

## The invariants (Architecture Part 4) — binding

Seventeen, not fourteen. Some older notes say fourteen; I14 is printed out of
order in the source, after I17, which is where the miscount came from.

| # | Rule |
|---|---|
| I1 | Nothing in Layer 2 or 3 ever requires a `classId` |
| I2 | Modules never call each other. Renderers are shared components |
| I3 | `viaProgramId` / `viaSessionId` live on activity, never in a record key |
| I4 | Nothing is ever deleted — archive, revoke, return, mark consumed |
| I5 | Units are keyed by permanent ID, never by name |
| I6 | Confirmation state is frozen when marked, never recalculated |
| I7 | Not Applicable is excluded from totals, not counted as zero |
| I8 | Curriculum content is separate from schedule |
| I9 | Nothing joins the startup path without being flagged |
| I10 | `platformAdmin` cannot be self-granted |
| I11 | Every user-visible name is language-keyed from day one |
| I12 | Roll-ups count through `ancestorIds` — counted once, never twice |
| I13 | Tenant isolation is enforced in security rules, not only in queries |
| I14 | Sessions are fetched by date range only, never as a set |
| I15 | A failed write must reach the user. Never `console.error` alone |
| I16 | Every existing `personId` is preserved unchanged at migration |
| I17 | Every document carries `schemaVersion`, `createdAt`, `updatedAt`, `createdBy` |

**I11 is the expensive one to retrofit.** Language-key every user-visible name
from the first document written. English filled, Bangla later.

**I15 is how bug B1 hid for months.** Four collections failed silently while the
app looked healthy.

---

## Load-speed contract (Architecture Part 8) — non-negotiable

| Moment | Allowed | Never |
|---|---|---|
| Startup, before first paint | Local cache only — paint immediately | Any network wait |
| Startup, after first paint | 3 reads: `userIndex`, `enrolments`, `bookmarks` | Any module's study data |
| Landing page | Card information only | Records, curriculum, sessions |
| Module registry | Bundled, refreshed in background | A blocking read |
| Records | One chunk per surah or subject | All records for a person |
| Activity | One document per week | A year at once |
| Sessions | Date range only | The full set |
| Screensaver, About, resources | On first use | At startup |

**Nothing joins the startup path without flagging it to the owner first.**

Baseline: the current app makes four failing, blocking round-trips at every
startup. Removing those alone makes the new build faster than the old.

---

## Terminology — precise, non-negotiable

| Correct | Never |
|---|---|
| **QuranRevival** = the module name | not the subject |
| **Quran** = the subject name | not the module |
| **Deen Study** | not "Islamic Studies" |
| **30 Approaches** | not "30 Ways" |

Ethics (social) and Akhlaq (personal) are **distinct** nodes. Confirmed.

---

## Approved decisions (D1–D13)

| # | Decision |
|---|---|
| D1 | **One** Firebase project — `study-monitoring`. Separate projects would give users different uids and orphan all history |
| D2 | New-generation collections are named **`tenantPeople`** and **`tenantInvites`** to avoid colliding with the live `people` / `invites`. *Deviation from Architecture naming — approved* |
| D3 | 7-digit `personId` applies to **new people only**. Legacy IDs are grandfathered forever (I16 wins). *Deviation from Architecture — approved* |
| D4 | New build uses the **modular (ESM) Firebase SDK**. The live file stays on compat 10.12.2, untouched |
| D5 | **Offline persistence on** — `persistentLocalCache` with multi-tab support |
| D6 | **No client-side delete anywhere**, from day one. Erasure, if ever needed, is an admin-side operation |
| D7 | `weekStartsOn` added to the tenant document in Phase 0, used from Phase 8 |
| D8 | **Admin self-check screen built in Phase 0 as F-008**, before other UI. It is what makes every later phase self-verifying, given the owner cannot check code |
| D9 | Two small Phase 1 lookup collections not in the original Architecture doc: **`tenantMemberUids`** (uid→role mirror, lets security rules check "does this login hold role X in tenant Y" without a query) and **`inviteTokens`** (opaque link codes, so invite links never carry a raw email in the URL). Neither is ever shown in any screen. *Approved deviation* |
| D10 | **The Study Mode handover lock (F-016) only ever engages for an explicit "hand this device to a child to study independently" action — never for a guardian/teacher's own recording.** Confirmed by the owner: teaching the same Ayah/Hadith to multiple children (and themselves) in one sitting, then logging each person's progress in turn from a dropdown, is the normal fast workflow and must never be blocked or require "ending a session." Signed-in owner/teacher picking a person from a roster/records dropdown to log something for them is not a device handover and must never touch the lock, no matter how many people are recorded in sequence. Binding on Phase 3 (records/activity) and Phase 4 (the QuranRevival module's actual study screens) when they're built. |
| D11 | **`QuranRevival_Subject_Catalogue_v3.md` approved as-is**, at the start of Phase 2 (2026-07-31): 6 top-level subject-tree nodes (Quran, Hadith, Arabic Language, Deen Study, General Study, Nature-Life), 31 studiable subjects, 30 Approaches in 7 sections, Hadith kept top-level and mandatory in its own right, Ethics/Akhlaq distinct. One resolved ambiguity: the doc tags Hadith `[QuranRevival / Deen]`, but Part 5 also states no node uses `moduleIds[]` for more than one module, and the Architecture doc's Phase 12 list names Hadith as its own fifth remaining module (alongside Arabic, General Study, Health, Nature-Life). Built as: **Hadith is its own module** (`moduleIds: ["hadith"]`), its bracket tag read as descriptive text about its role, not a literal dual-module assignment. Flagged for the owner to correct if the intent was actually a shared/dual-module node. |
| D12 | **New Phase 3 collection `domains`** (`domains/{tenantId}__{domainId}`), not in the original Architecture doc, added to back the `records.entries.domainIds[]` field the doc names but never defines a collection for. Same shape as D9 (a small supporting collection the doc's own named fields required). Tenant-authored, no platform seed, mirrors `ladders`/`levels` — matches the legacy app's free-text, user-defined "Domains" tag on subjects, promoted to a permanent-ID registry (I5) since `domainIds` is now a plural array on each record entry. *Approved-by-precedent deviation, flagged for the owner to correct if a different shape was intended.* Also Phase 3: **records chunking** ("one doc per surah/subject") is implemented as *surah* for unit types that carry their own surah number (`ayah`/`range`/`surah`/`ruku`) and *subject* for everything else (`juz`/`hizb`/`rub`/`manzil`/`page`/`hadith`/`topic`/`name` — Quran-wide divisions or non-Quran, with no single surah to group by). Re-chunking later is a data migration, not an architecture change (I5 only pins the unit key itself). And **`subjects.confirmationRequired`** (`true`/`false`/`null`) was added as a new, additive field so "confirmation can be switched on or off per subject" (Architecture s6) has somewhere to live — editable from `catalogue.html`'s existing subject edit form. |
| D13 | **Post-cutover rollout order** (confirmed 9 Aug 2026, QuranRevival v07.00): make it work for the **owner's own real use first** — before family, before external students, before the rest of the role/tenant model the Architecture doc already plans for. Then family. Then external students. Then everyone/everything else, as originally planned. **This reorders priority, not scope** — nothing here changes what gets built, only what gets fixed/polished first when something's wrong. Concretely: if the owner hits real friction using the app themselves, that outranks a family- or student-facing gap, which outranks a general multi-tenant/other-role gap, regardless of build-phase numbering. Don't re-derive this from the Architecture doc's own phase order — this is a use-rollout sequence layered on top of it, not a replacement for Phase 6–15's own scope. |
| D14 | **The owner's own account (uid `3ff4BoGFLeV6FYBoTiJkMr7sFuV2`, `smahk9@gmail.com`) holds `platformAdmin: true`**, granted directly 10 Aug 2026 (v07.08) via a one-time administrative Firestore write, not through any app-side flow. I10 ("`platformAdmin` cannot be self-granted") is about closing the S1 self-service escalation hole in the app's own code paths — it was never meant to block a legitimate one-time grant to someone who is, in every real sense, already the platform's sole administrator (Firebase project owner, GitHub repo owner, the one real tenant's owner). Concretely needed because `modules/{moduleId}` is platform-wide (Architecture Layer 1) and `firestore.rules` restricts writing it to `isPlatformAdmin()` only — the Catalogue page's new module-reorder buttons (v07.08) would 403 for the owner otherwise. *Approved by the owner, asked directly before granting.* |

---

## Legacy personId formats — four shapes, all must keep working

| Shape | Origin |
|---|---|
| `p1` … `p4` | Seeded defaults. **Browser localStorage only — not in Firestore** |
| `p` + 13-digit timestamp | Created by the app's Add Person |
| `person_` + first 8 chars of uid | Created by invite acceptance |
| `person_admin1` | Created by hand in the console |

Any new ID scheme must coexist with all four (I16, D3).

---

## Build phases

Phase 0 Foundation · 1 Identity & access · 2 Catalogue · 3 Tracking core ·
4 QuranRevival module · 5 Migration & parity · 6 Deen Study & topic renderer ·
7 Bookmarks, programs, routines · 8 Monitor & reports · 9 Homework & feedback ·
10 Classes & provider · 11 Curriculum, grades & resources · 12 Remaining
modules · 13 Full messaging & extras · 14 Operations · 15+ Reserved.

**Phase 5 is the gate.** No cutover from the old app until the parity checklist
is derived from a live audit of `index.html` and signed by the owner — not by
Claude. *(9 Aug 2026: the owner exercised this as their own call, not
Claude's — chose to cut over before the checklist was fully signed, given no
other real users existed. The rule stands as the reason a checklist exists
and gets read seriously; it wasn't overridden by Claude.)*

**Current position: Phase 0, Phase 1 (Identity & access), Phase 2
(Catalogue), Phase 3 (Tracking core), Phase 4 (QuranRevival module), and
Phase 6 (Deen Study & topic renderer) all complete and owner-verified.
Phase 7 (Bookmarks, programs, routines) round 1 is built, not yet
owner-verified** — see `PHASE-7-STATUS.md` for exactly what's in round 1
(bookmarks, Continue strip, the routine renderer, Health's real study
screen, Learn Deen On-the-Go pulled out as its own module) **and round 2**
(course offers + enrolments, Stage B1 — built after the owner confirmed
external-student use is now actually on the horizon, reversing round 1's
own deferral on purpose) **and round 3** (11 Aug 2026, v07.16 — wires
`bookmarks.resume.programId`/`activity.viaProgramId` into `topic-study.js`/
`routine-study.js` for real, closing part of the gap round 2 flagged;
QuranRevival/Asma ul Husna not wired yet at the time) **and round 4**
(12 Aug 2026, v07.19 — wires QuranRevival and Asma ul Husna too, closing
that gap for real; also surfaces that `quranrevival.html` never calls
`touchResume()` at all, a separate pre-existing gap, see
`PHASE-7-STATUS.md`).
**Phase 8
(Monitor & reports) round 1 is also built, not yet owner-verified** — see
`PHASE-8-STATUS.md`. **Phase 9 (Homework & feedback) round 1 is also
built, not yet owner-verified** — see `PHASE-9-STATUS.md`, including a
real guardian-access bug found and fixed in `firestore.rules` (already
deployed) that predates this phase, **and round 2** (11 Aug 2026, v07.18 —
closes both the Homework teacher-scoping gap round 1 itself flagged AND the
matching guardian one, via a denormalized `extraReadersPersonIds[]` field
rather than a get()-dependent read rule (v07.17's first attempt at the
teacher half had a real list-query flaw, found and fixed same-day before
ever being deployed — see that version's own CLAUDE.md paragraph);
`firestore.rules` for this round NOT yet deployed). **Phase 10 (Classes &
provider,
Stage B2) round 1 is built, `firestore.rules` deployed and partially
owner-verified 11 Aug 2026** (deployed via the Firebase Console, not the
CLI — see that phase's own paragraph above for why; version badge,
`classes.html`, and a real class + enrolment all confirmed working; the
actual teacher-scoping enforcement itself still needs a second real
`teacher`-only account to prove, since owner/prime's own login bypasses
it) **and round 2** (12 Aug 2026, v07.19 — the SUBJECT half of the same
long-parked access-control question, client-side only, no rules change;
see that round's own note on `enrolPerson()`'s dead `subjectIds[]` param)
— see `PHASE-10-STATUS.md` for the full build log, the remaining
verification checklist, and a real gap found and fixed in the same
sitting, before it ever shipped. **Phase 11 (Curriculum, grades &
resources, Stage C) round 1 is built, `firestore.rules` deployed via the
Firebase Console and owner-checked okay (11 Aug 2026)** — see
`PHASE-11-STATUS.md` for the full build log and an 8-item verification
checklist. **Phase 12 (Remaining modules) is built** — it turned out to
already be fully delivered inside Phase 6 round 2 (Arabic, Hadith, General
Study, Nature-Life) and Phase 7 round 1 (Health); only its own
`feature-registry.js` status flag was stale, corrected 11 Aug 2026 — no
new code was needed. **Phase 13 (Full messaging & extras) round 1 is
built** — Asma ul Husna (99-Name study module + owner-supplied poster
screensaver) and `about.html` reading the feature registry; messaging
itself (threads, per-person inbox) is deliberately deferred to a later
round, pending a real second `teacher`-only account to verify its
safeguarding rules against — see `PHASE-13-STATUS.md`. See also
`PHASE-0-STATUS.md`, `PHASE-1-STATUS.md`, `PHASE-2-STATUS.md`,
`PHASE-3-STATUS.md`, `PHASE-4-STATUS.md`, and `PHASE-6-STATUS.md`. Phase 5
(Migration & parity) is separately covered below — cutover already
happened; two small follow-up items remain open, not gating anything.

**Phase 8 (Monitor & reports) — built 10 Aug 2026 (v07.09), round 1, not yet
owner-verified.** Scope, confirmed with the owner before building: **one
universal report**, not Quran-only — reads from `records` + `activity`,
which are already the same shape for every module (ayah, topic, or
routine), so it reports on whatever's actually been claimed/logged
regardless of how built-out any given module is. New page `monitor.html` +
new `js/monitor.js` for the aggregation (plus one small additive read added
to `records.js`, `listAllRecordsForPerson`), weekly and monthly views,
per-student and per-subject summaries, CSV export, print — the same shapes
the *old* app's own Monitor module had (`exportWeekCSV`/`exportMonthCSV`/
`doPrint` in `index.html`, read directly to confirm this scope before
building it). Scoped to whoever can already see this data today (owner/
prime/teacher/guardian/self per existing rules) — no new permission model.
**Quran gets one extra section on top**: the 30-Approach status breakdown
for one student at a time (reusing `summarizeStatuses`, already built) —
richer because Quran has real structured trackable data nothing else does
yet. Read-only throughout; no schema or security-rule changes made. See
`PHASE-8-STATUS.md` for the full build log and what's flagged for the
owner to weigh in on.

**Cutover happened 9 August 2026 — QuranRevival v07.00.**
`https://madrasatul-muslimeen.github.io/` now redirects into the new app
(`/app/index.html`); the old app is archived, not deleted, at
`/legacy/index.html`. The owner made an explicit, informed call to cut over
before B5 and a real signed-in click-through of rounds 12–14 were resolved
— both are now post-cutover follow-up, tracked in
`PHASE-5-PARITY-CHECKLIST.md`, not blockers. Migration itself was closed
earlier (the owner decided the old app's data is all demo data, not worth
preserving). **We are now in real-use iteration, not pre-cutover build
mode — see D13 for whose real use gets priority (owner, then family, then
external students, then everyone else).** This paragraph was stale for six
rounds before a 9 Aug note — **check `PHASE-5-STATUS.md` first, every
session, for what's actually current**; don't rely on this file's own
"current position" line alone.

**Post-cutover deployment shape (9 Aug 2026), replacing the old beta-mirror
setup**: `madrasatul-muslimeen.github.io` is the real production site.
`https://madrasatul-muslimeen.github.io/app/…` is the live app — any fix
to this repo's `app/` has to also ship there (that path used to be
`/beta/app/`; the cutover promoted it to `/app/` directly, so **don't ship
to a `/beta/app/` path anymore — it no longer exists on that repo**).
`/beta/` itself is free again for the *next* phase's testing cycle, same
pattern this project used throughout Phase 5 — check what, if anything,
currently lives there before assuming it's empty. The old app lives on,
untouched, at `https://madrasatul-muslimeen.github.io/legacy/index.html` —
**by direct URL only; no button or link exists in either app pointing to
the other** (asked and confirmed 9 Aug 2026 — this was a deliberate
minimal-risk choice at cutover, not an oversight left unfinished. Add one
only if the owner actually asks for it).
Same GitHub access that reaches this repo also reaches
`madrasatul-muslimeen.github.io` (confirmed 9 Aug 2026) — pushing there
directly is possible, but it's a live public site outside this repo's own
scope, so ask before pushing there, unlike the routine git operations
below.

**On the CLI (this tool), "the local repo" and "the GitHub repo" are the
same repo — there is no other way to edit code with it.** The CLI always
works on a local checkout; that's the tool, not a choice made per session.
What went wrong once (10 Aug 2026) was a *process* gap, not a *tool* one:
commits were made locally but never pushed, so GitHub sat 7 commits stale
for a full session until the owner noticed. Fixed going forward — push to
`origin/main` is now the automatic last step after every commit here, same
tier as add/commit, no different from the production-mirror push above
except this one never needs asking first (see
[[feedback_push_dev_repo_to_origin]]). Practical effect: GitHub is
essentially always current within moments of any change, so anyone
watching the repo (owner on a tablet, a Claude Code *Web* session, anyone
else) sees real state. **A genuinely GitHub-only, no-local-checkout
workflow means Claude Code on the web (claude.ai/code) instead of this
CLI** — a different product entry point, browser-based, each session
gets its own working branch merged via PR. Confirmed working on a tablet
browser for *monitoring* (GitHub.com's own UI and the deployed site at
`madrasatul-muslimeen.github.io` are both standard responsive web — no
different from any other site on a tablet); *driving* a session from a
tablet via Claude Code on the web hasn't been tested by anyone on this
project and shouldn't be assumed smooth without trying it first.

**`PHASE-5-PARITY-CHECKLIST.md` is the actual cutover-gate document** —
built 9 Aug 2026, consolidating all 14 rounds into the single sign-off
CLAUDE.md's own "Phase 5 is the gate" rule requires. Read that file, not
`PHASE-5-STATUS.md`'s full round-by-round history, for "are we ready to
cut over" — `PHASE-5-STATUS.md` stays the detailed log underneath it.

**Note for future sessions on this owner's test setup:** the owner's actual
click-through machine is a non-persistent office VDI with no admin rights
and no Node/Python normally available — `git clone` targets and installed
software don't survive between logins. If local testing is needed again,
use Node's portable ZIP distribution (no install/admin needed — see
`PHASE-4-STATUS.md` round 4 for the exact steps), not the `.msi` installer.

**Open design question, raised during Phase 3 verification, not yet
resolved:** claiming/confirming only works for the Quran subject today,
because Approaches (`trackables`) only exist for Quran — every other
subject (Deen Study, Arabic, General Study, Hadith, Nature-Life, Health)
has no defined "what does progress look like here" system at all. This
predates this rebuild; it is not a Phase 3 defect. It doesn't block Phase 4
(QuranRevival module — Quran-only by definition), but likely needs a design
conversation, possibly back at the architecture stage, before Phase 6
(Deen Study & topic renderer) can be planned. See `PHASE-3-STATUS.md`.

**Owner's decision on this, round 6 of Phase 5 (see `PHASE-5-STATUS.md`):**
needs a long discussion and real resourcing, and should wait until every
other phase that doesn't depend on it is finished first. **Do not raise this
proactively again each session** — it's on record here once; leave it alone
until the owner reopens it themselves.

**Second open access-control question, raised by the owner 2026-07-31 —
the STUDENT half resolved 11 Aug 2026 (Phase 10 round 1, v07.12), the
SUBJECT half still open.** The owner's original scenario: a guardian (in a
Family/Individual tenant, not a Tuition Provider) wants to bring in an
outside teacher for a few subjects only — that teacher should record/
confirm progress **only for the specific children they teach** (now real
and enforced) **and only on the subjects they're actually assigned to
teach** (still not enforced). Phase 10 was asked directly, before
building, whether the new class-scoped teacher-assignment mechanism should
sit alongside today's blanket tenant-wide access or replace it — the owner
chose replace. `canRecordFor()`/`tenantPeople` roster reads now require
`isCoEnrolledTeacherOf()`, driven by `enrollments` + the new
`teacherStudentLinks` mirror. Crucially, this works through **either** a
`classes.html` class **or** a `course-offers.html` course offer — I1
("nothing in Layer 2/3 ever requires a `classId`") already meant a
Family/Individual tenant could use a course offer as the lightweight
enrolment vehicle without needing a full "class" concept, so the owner's
original scenario doesn't need its own separate primitive after all — a
course offer with one teacher and one child enrolled is exactly that.
**What's still open:** the rule scopes by STUDENT only, not by subject — a
co-enrolled teacher currently gets full record/confirm authority over that
student across every subject, not just the ones listed on their
enrolment's own `subjectIds[]`. Same "Firestore rules can't safely inspect
one key of an arbitrarily-keyed map" limitation this codebase already
accepts elsewhere (subjects/trackables/records entries) — enforcing it for
real needs client-side filtering in the study screens/records.js keyed off
`subjectIds`, not attempted this round. See `PHASE-10-STATUS.md`.
