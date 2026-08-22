# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.

**Current milestone: QuranRevival v07.56.** Cutover to production happened
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
v07.22 (12 Aug 2026, on the CLI) is Shell round 5 — the owner reported
that after v07.21 the landing page still looked exactly like their
original screenshot, and they were right: v07.21 only stopped the Study
category auto-opening, which was never the thing eating the screen.
**Measured before touching anything** (headless Chromium, 390×700 phone
viewport, `#app` forced visible and the owner's own real tenant state
simulated): the `Mastery Wheel` heading sat at **661px on a 700px-tall
screen** — the wheel was entirely below the fold on the app's own landing
page. The cost was almost all in two pre-existing pieces of
`quranrevival.html`, neither introduced by shell round 4 but both newly
prominent now that this page is the first screen: the seven stacked
pickers (Tenant/Person/Surah/Ayah/Approach/Language/Study Unit, ~375px on
a phone) and the tenant-editable `#globalBanner` (~90px, and in Ahsan's
tenant its text happens to echo the app's own title/tagline, so it read as
the same banner printed twice). Fixed by collapsing all the pickers into a
single `<details id="studyOptions">` closed by default — deliberately the
same disclosure idiom, and near-identical styling, to the nav bar's own
category buttons, so the one collapsible thing on the page has one visual
language and needs no new JS or click handlers. Every control keeps its id
and its order within the form, so all existing wiring is untouched; only
the wrapper is new. `#unitLabel` ("Tracking: Surah 1, Ayah 1") stays
OUTSIDE the disclosure so the current selection is always readable without
opening anything. `#globalBanner` was compacted from a second hero (1.5rem
title + its own 2px rule) to an eyebrow, and `renderBanner()` now hides the
whole strip when the tenant has set no banner text at all rather than
leaving an empty ruled block; the "Edit banner" button moved inside Study
options, so an owner/prime-only control stops costing every visitor a row
of landing height — and so hiding the empty strip never hides the only way
back in to set one. **Result, measured the same way: 661px → 293px with
the tenant banner still set, 241px if the owner clears it** — the wheel is
comfortably on the first screen either way. Verified in the same run that
the disclosure starts closed and that all nine controls are still present
and visible once it's opened. The owner's own duplicate banner text was
deliberately NOT cleared from Firestore — it's their tenant content (I4/D6),
and it's now a compact two-line strip they can clear themselves from Study
options → Edit banner if they want the extra ~50px.
v07.23 (12 Aug 2026, on the CLI) is Shell round 6, a small typographic
follow-up: the app banner's tagline ("Reviving the Quran, abandoned.") sat
~15px below the `QuranRevival` title — `h1`'s own default bottom margin
(0.67em) — while the tenant banner's title/subtitle pair sat ~1.6px apart,
so the owner read the app banner as two loose lines rather than one unit
and asked for it "closer, like how it shows in the Module." `h1` on
`quranrevival.html` now carries `margin-bottom: 0.15rem` and
`.app-tagline` drops its own top margin: **measured 15px → 2px**, matching
the tenant banner's pairing. Page-local, so no other page's `h1` moved.
**The owner also asked for their tenant's duplicate banner text to be
cleared** — authorized explicitly, but NOT done from here: this session
ran on Claude Code on the web, a cloud sandbox with no Firebase
credentials, no `firebase` CLI, and no browser reachability to Firestore,
so the write is genuinely impossible from this environment rather than
merely skipped. Handed back as three taps in the app itself (Study options
→ Edit banner → empty both fields → Save); v07.22's `renderBanner()`
already hides the whole strip once empty, verified in the same run (wheel
heading lands at 228px with it cleared, vs 293px with it set). **A future
session with real Firebase access should check whether the owner ever did
it, and offer again if not.** Also confirmed while testing, since the
owner asked directly: with the tenant banner cleared, the Quran Study
module still carries the app banner (title + tagline) — that IS the
module's banner, per the owner's own "either the same banner to carry or a
similar new but distinct one, whatever easy as builder" call back in shell
round 4, so clearing the tenant strip never leaves the module bannerless.
v07.24 (12 Aug 2026, on Claude Code on the web) is Shell round 7, from the
same "Layout Discussion" session as rounds 4-6 and again driven by the
owner's own reading of the live landing page rather than a build phase.
Two owner decisions, both taken after a mockup artifact was shown and
discussed: **the Study screen moves INSIDE Study options** (their call,
overriding the recommendation to give Study its own third tab -- "the
stuff inside the 'Study' can even better make sense within the 'Study
Options', user do not have to click more for those things"; organising
what sits inside that panel is explicitly deferred to a next round), and
**the wheel card must leave no blank space above the bottom bar**, so more
Approaches show before scrolling. `quranrevival.html` is now a real app
shell instead of a plain scrolling document: a header, a `#stage` that
stretches, and a `#dock` pinned at the bottom carrying a two-button tab
row (Study options / Explore) plus the always-visible `#unitLabel`
("Tracking: Surah 1, Ayah 1") on its own line -- exactly the two bottom
lines the owner sketched. Shell round 5's `<details id="studyOptions">`
disclosure is retired; its seven pickers, the banner-admin block and the
whole Study screen now live in `#panelStudyOptions`, and Explore's
`#explorePanel` in `#panelExplore`, each sliding up from the dock with the
tabs still reachable above it. **The key layout fix was `height`, not
`min-height`**: the first attempt used `min-height: 100dvh`, and the
column simply grew past the viewport so the approaches list took its full
30-row height again -- the very thing the round removes. A fixed
`height: 100dvh` + `overflow: hidden` on `body` is what lets the stage
stretch into leftover space; nothing is lost by the page not scrolling,
since the only long list on the landing screen scrolls inside itself.
Also fixed along the way, a real pre-existing defect: `.mastery-wheel` had
no `height: auto`, and `renderMasteryWheel()` emits BOTH `width` and
`height` attributes on its `<svg>` -- so on a phone the width was capped by
`max-width` while the height stayed at its full attribute value, and the
viewBox centred a smaller wheel inside a taller box, i.e. genuine blank
space inside the card on exactly the screens with least room to spare.
**Measured** (headless Chromium, the owner's real tenant state simulated,
same method as v07.22): gap between the wheel card and the dock is 9px at
every size tested (390x700, 390x844, 360x640, 768x1024) -- that 9px is the
dock's own `margin-top`, i.e. deliberate separation, not leftover space --
and the dock is fully visible in all four. Approaches visible before
scrolling on a 390x700 phone: **3 with the owner's tenant banner still
set, 5 with it cleared**; 6 on a 390x844 phone, all 30 on a tablet.
Verified with the page's own handlers really running (Firebase modules
stubbed at the network layer, not the page's JS bypassed -- a first
attempt that merely blocked the imports silently tested nothing, since
the module script never ran at all): both panels open/close, tapping the
open tab closes it, switching tabs swaps them, the x button resets
`aria-expanded`, and all 61 of the page's `getElementById` targets still
resolve after the move. No `firestore.rules`, schema or JS-module changes
-- this page's own markup, CSS and inline script only. **The owner's
duplicate tenant banner text is STILL not cleared** (authorized back in
v07.23, still impossible from a cloud sandbox with no Firebase
credentials) and it now costs a visible Approach row, so it is worth
offering again: Study options -> Edit banner -> empty both fields -> Save.
v07.25 (13 Aug 2026, on Claude Code on the web) is Shell round 8, a
same-thread correction to v07.24: the owner asked why the wheel had been
made smaller and said it should "cover the entire edge left and right."
Fair -- v07.24 had capped it at `min(320px, 27vh)` (189px on a 390x700
phone) purely to buy approach rows, which was a trade made on the owner's
behalf without asking. Reversed. On phones the wheel card now breaks out
of `body`'s own 1rem gutter (negative margins, square corners, no side
borders) so it is genuinely full-bleed, and the wheel fills it:
`width: min(100%, calc(100dvh - 420px))`. The calc is a floor, not a
preference -- it only binds on SHORT screens, where it shrinks the wheel
rather than pushing the dock off the bottom; on any normal-height phone
100% wins and the wheel really does touch both edges. **Measured** (same
headless method as v07.22/07.24, both banner states): 390x844 and 412x915
give a genuinely edge-to-edge wheel (377px and 399px, a 6px card gutter
each side) with 2-4 and 4-6 Approaches still visible; 390x700 falls back
to 280px with 1-3 rows, 360x640 to 220px with 1-3. Gap above the dock
stays 9px and the dock stays fully visible at every size, with no card
overflow anywhere. The `- 420px` reserve was tuned deliberately: at
`- 380px` the wheel hit its full width one size sooner but a 390x700
phone's approaches list collapsed to a 0-row sliver, which looked broken
for no real gain, since the phones where edge-to-edge is actually
reachable were unaffected by the change. Tablet/desktop are untouched --
they keep the side-by-side wheel-and-list card at the pre-round 320px.
Page handlers re-verified with the Firebase-stubbed harness (both panels,
tab switching, the x button, no page errors).
v07.26 (13 Aug 2026, on Claude Code on the web) is Shell round 9, two more
owner-spotted wastes of landing height, both from reading the live screen.
**The dock's "Tracking: Surah 1, Ayah 1" line is gone for the default unit**
-- the owner's point was exact: the wheel's own centre disc already reads
"SURAH 1 - AYAH 1", so the line printed the same thing twice. It is NOT
deleted outright, though, and the reason matters: `renderWheel()` hardcodes
`centerRef` to the CURRENT AYAH, and the wheel's segments are always that
one ayah's statuses -- so for Range, Whole Surah, Ruku', Juz and Page the
Tracking line is the only place on screen naming what "Track this unit"
would actually claim. `renderUnitLabel()` now hides the line when
`unitType === "ayah"` (the default, and the overwhelmingly common case) and
brings it back for the other five. Checked against `currentUnitInfo()`'s
own five non-ayah branches rather than assumed. **The space above the app
banner is halved** -- `h1`'s UA default top margin (0.67em, ~15px) was
sitting on top of `body`'s own 1rem padding, so the banner floated roughly
a nav-bar's height down the screen for nothing; body padding-top 1rem ->
0.5rem and an explicit `h1 { margin-top: 0.35rem }`. **Measured before and
after by loading the previous commit's own copy of the page side by side
with the new one: 31px -> 14px.** Together the two changes are worth 1-2
Approach rows depending on where row boundaries fall -- on a 390x844 phone
with the owner's tenant banner still set, 2 -> 4 rows; cleared, 4 -> 5;
412x915 gives 5 and 7; 390x700 gives 2 and 4; 360x640 gives 2 and 4. Gap
above the dock stays 9px, dock fully visible, no overflow at any size,
including with the Tracking line forced back on (Juz unit), which costs at
most one row and never breaks the layout. The wheel itself is untouched at
every size -- its `calc(100dvh - 420px)` floor is expressed against the
viewport, not against leftover card height, so shrinking the chrome hands
every reclaimed pixel to the approaches list rather than growing the
wheel. That was deliberate: the owner asked for Approaches this round, not
a bigger wheel.
v07.27 (13 Aug 2026, on Claude Code on the web) is Shell round 10, the
owner's follow-up to round 9: reclaim the small gap above the "Mastery
Wheel" heading and a little more above the app banner, with the explicit
target of **5 Approaches visible** and the explicit caution "check
carefully, not to mess up anything else." **Measured the requirement
first** rather than trimming by feel: a fifth row needed exactly 37px, and
the approaches list had -1px of slack, so seven separate gaps were costed
before any were touched. Trimmed: `h1` margin-top 0.35rem -> 0, the
tagline's bottom margin 0.8rem -> 0.35rem, `#globalBanner`'s
padding-bottom/margin-bottom 0.4/0.5rem -> 0.25/0.2rem, the wheel
heading's own margins (mobile) 0.15/0.3rem -> 0/0.15rem, and the wheel
card's internal padding/gaps 0.55/0.5/0.45rem -> 0.4/0.35/0.3rem. The
eighth and largest saving, ~10px, is the nav bar's `margin-bottom: 1rem` +
`padding-bottom: 0.6rem` -- and it is taken as a **page-local `#topNav.app-nav`
override, deliberately NOT an edit to `css/shell.css`**, because that rule
is shared by all 16 pages and only this one is fighting for landing height
(verified after the change that `shell.css` is untouched and that all five
edited rules live inside this page's own `<style>`). **Result, measured:
the gap above "Mastery Wheel" 10px -> 3px, above the banner 14px -> 8px,
and the approaches list 139px -> 186px, i.e. 4 -> 5 rows with the owner's
tenant banner still set, with 10px of slack left over.** Every other size
gained a row too: 412x915 5 -> 7, 390x700 2 -> 4, 360x640 2 -> 4; cleared-
banner states are 6/8/5/5. **The wheel is byte-for-byte the same size at
every viewport tested** (377/399/280/220px, tablet 320px) -- as in round 9,
the `calc(100dvh - 420px)` floor is expressed against the viewport, so
reclaimed chrome goes to the list and never to the wheel. Gap above the
dock stays 9px, dock fully visible, no overflow anywhere, including with
the Tracking line forced back on for a Juz unit (costs one row, never
breaks). Page handlers re-verified with the Firebase-stubbed harness.
v07.28 (13 Aug 2026, on Claude Code on the web) is Shell round 11 -- the
round v07.24 parked and CLAUDE.md has carried as "next round already
agreed" ever since: **organising the inside of `#panelStudyOptions`**, built
to the owner's own drawn mockup rather than to a shape proposed here. The
panel's controls were a flat wrap-as-it-fits `.row` of nine pickers; they
are now **three bars, grouped by what KIND of choice each one is** --
bar 1 WHO is studying (Tenant, Person, Language, Approach), bar 2 WHAT is
being studied (Study Unit, Surah, Ayah, "Go to"), bar 3 HOW it is read /
heard / claimed (Reading view, Listening settings, Track this unit). Each
bar is a CSS grid whose `minmax(0,1fr)` columns are what actually make four
labelled `<select>`s share one line on a 390px phone -- verified, not
assumed. Four new things, all owner-asked: **(a)** a "Go to" typing field --
`2:255` jumps to that ayah, `2:255-260` switches to the Range unit and sets
both ends, a bare `2` opens that surah; anything it cannot read (or an ayah
past the surah's end) says so in place rather than doing nothing. **(b)**
**Reading view** and **(c)** **Listening settings**, two buttons that each
open a card below rather than each spending a permanent row: Reading view
holds Page display (renamed from "Page view" per the owner), the Tajweed
checkbox and the Word-by-Word language, all keeping the exact visibility
rules they already had -- plus a deliberately DISABLED "Translation"
placeholder, since choosing a translation by translator's name is real
scope the owner asked to defer, and a disabled control with a plain note
beats an invisible promise. Listening settings holds the reciter picker,
Play ayah / Play whole surah, Loop and the whole multi-reciter drill; the
button disables itself when the selected Approach has no audio panel, so
it can never open an empty card. **(d)** a summary strip under the bars
naming what the choices add up to (Person / Unit / Approach / Reading /
Listening), built with `textContent` since person and Approach names are
tenant-authored. **This is a move, not a rewrite**: every control kept its
id and its handler, and the one piece of new JS wiring in the study screen
is `tajweedControl`'s own visibility rule, which the checkbox used to
inherit from `#singleAyahNavRow` before it moved out of it. **The owner's
first question this round -- should Language move to Home -> Settings
instead? -- is answered "not yet, and here is why":** it genuinely is a
global, all-modules choice, but no such setting exists anywhere yet (nav's
Settings category is still a disabled placeholder from shell round 3), and
`currentLang` is this page's own local state. So Language stays in bar 1
where the owner put it, and **"one global language preference, read by
every module" is now a named, still-unbuilt item** -- do not let it drift
out of this file. **Correction, made 13 Aug 2026 in the same session:** this
paragraph first said eight other study pages "each hold their own copy" of
`currentLang`. That is wrong, and the truth matters for whoever builds the
round -- `grep` finds `currentLang` in `quranrevival.html` and NOWHERE else.
Every other page and module passes the literal `"en"` into `langText()`, so
Bangla today works in the Quran module alone and nothing else in the app can
show it at all. The round is therefore not "consolidate nine copies" but
"give eight pages a language they never had," which is more valuable and a
different shape of work. See `LAYOUT-BACKLOG.md` item 1.
**Measured** (headless Chromium, Firebase stubbed at the network layer so
the page's own module script really runs, the owner's tenant state
simulated, same method as v07.22-07.27): the LANDING page is
byte-for-byte unchanged from v07.27 at all five viewports in both banner
states -- same wheel-heading top, same wheel width, same Approach-row
count, same 9px gap above the dock, no horizontal overflow -- which is the
point, since this round only ever touches what is inside a panel that
starts closed. Inside the panel: all three bars hold one line each with no
overflow, all 71 of the page's `getElementById` targets still resolve, and
26 behaviour checks pass, including both cards opening/closing one at a
time, the typing field's three good shapes and two bad ones, the range
flow-through onto From/To, Prev/Next, the Juz Tracking line and Explore.
One real pre-existing defect fixed in passing: the reciter `<select>`
sizes itself to its longest option name and overflowed its container --
invisible before because it sat in an unbordered part of the Study screen,
obvious once it had a card edge to cross. No `firestore.rules`, schema or
shared-CSS changes -- this page's own markup, CSS and inline script only.
**Pushed to the production mirror the same day** (`madrasatul-muslimeen.
github.io`, `app/js/version.js` + `app/quranrevival.html` -- the only two
files that differed, so the mirror had no unrelated drift), on the owner's
explicit go-ahead, per this file's own "ask before pushing there" rule
(that rule was retired 17 Aug 2026 — see the deployment section below).
**One decision closed on the owner's own follow-up:** they asked whether
the summary strip is needed at all, since "the choices are already visible
in the buttons." Half true, and the half that isn't is why it stays --
**their call, asked and answered, do not re-open it unprompted.** Bar 3's
two buttons show no value at all (nothing on screen names the reading mode
or the reciter until you open the card), and on a 390px phone the four
`<select>`s in bars 1-2 truncate to "Madrasa...", "Approac...", "1. Al-Fa..."
-- so the strip is the only place a tenant-authored person or Approach name
is readable in full. Offered as three options (trim to Reading+Listening /
remove entirely / keep); the owner chose keep, unchanged.
v07.29 (13 Aug 2026, on Claude Code on the web) is Shell round 12 -- three
small owner-asked cleanups, no new mechanism. **(a)** The shared nav's
"Old app" link is now **"Legacy App - v06"**, changed in all 19 pages that
carry it (it is static pre-JS markup per v07.08's anti-flash fix, not
`nav.js` output, so it genuinely lives 19 times). **(b)** The nav's
**"Study" category is now "Modules"** -- the owner asked for "Study Module"
and, to their credit, asked in the same breath whether it would fit.
**Measured: it does not.** The summary needs 97px and gets 75-83px on a
phone, so it ellipsised to "Study Mo...", and was still clipped at an
unreadable 8.8px on a 360px screen; letting it wrap to two lines cost 13px
of nav height and **one visible Approach row** at 360x640 and 390x844,
which is precisely what shell rounds 9-10 spent themselves reclaiming. Both
options were put to the owner with those numbers and they chose the short
word. Note `.nav-cat > summary` is `white-space: nowrap` + `text-overflow:
ellipsis`, so a too-long category label fails SILENTLY by truncating --
worth re-measuring (`navcheck` pattern in `LAYOUT-BACKLOG.md`) any time one
is renamed. **(c)** The **"Edit banner" block is removed from Study
options** -- the owner had already cleared their tenant's banner text
themselves (closing the item CLAUDE.md had carried since v07.23), leaving
just a button taking space: "it is only showing 'edit banner' and taking
space." **Removed from that SCREEN only, nothing destroyed (I4):** the
tenant's `bannerTitle`/`bannerSub` fields are untouched in Firestore and
`renderBanner()` still displays them if ever set again -- verified in the
same run, a tenant with a banner still renders it. What is gone is the
editing UI, and it now has **no home in the app at all** -- until a real
Settings surface exists a banner can only be set from the Firebase console.
That is a deliberate, recorded consequence, not an oversight: see
`LAYOUT-BACKLOG.md`. Also dropped the then-unused `updateDocument` import
and the three now-dead CSS rules. Re-verified with the same harness: all 26
behaviour checks still pass, `getElementById` targets 71 -> 65 (exactly the
six removed banner-edit elements) with none missing, no page errors, all
four nav buttons on one line at 320/360/390/412/768px, and the landing page
otherwise unchanged.

v07.30 (13 Aug 2026, on Claude Code on the web) is **Shell round 13 — one
global Language preference, `LAYOUT-BACKLOG.md` item 1**, the thing v07.28
named and the owner confirmed as the next round to build in its own session.
Three decisions were put to the owner first and answered before any code was
written, as that item required. **(a) Storage: localStorage now, a Firestore
sync layered on later.** So there is NO new startup read, no new collection
and no `firestore.rules` change — the load-speed contract and I9 are untouched,
which was the whole reason the question had to be asked. `js/prefs.js` is
shaped so the later sync slots in behind the same `getAppLang()` getter
without a single call site changing. The accepted trade is that the choice is
per browser: set it on the phone and the tablet still shows English until it
is set there too. **(b) "Language" is now TWO settings, not one.** `currentLang`
had been doing two unrelated jobs at once — which language user-visible NAMES
appear in (global, every module, the I11 concern) and whether the Bangla ayah
TRANSLATION shows next to the English (a Quran *reading* choice). They are
split: **app language** lives under Home → Settings and applies everywhere;
**translation language** lives in the Quran module's Reading view card. The
owner's own 8 Aug 2026 rule — picking the Bangla reciter brings Bangla text on
screen — still works, but now flips the translation setting ONLY; it no longer
renames every person, Approach and subject across the whole app as a side
effect of choosing a reciter. **(c) All modules at once**, the owner's call
over going module by module, on the stated grounds that a Settings control
which silently fails to translate most of the app reads as a bug rather than a
staged rollout. Concretely: `currentLang` is gone; **100 hardcoded `"en"`
arguments across 15 files now read `getAppLang()`**, and all 13 pages/shared
modules that render the nav mount the control (the 8 module pages come free
via `topic-study.js`/`routine-study.js`/`asma-study.js`). Before this round
**Bangla worked in the Quran module alone** and was unreachable everywhere
else no matter what the tenant had stored — so this is "give 18 pages a
language they never had," not "consolidate copies of one." `js/nav.js` stays
a pure renderer (I2): it emits the `<select>` and nothing else — reading the
stored value and wiring the change is `mountAppLangControl()`'s job in
`prefs.js`, one line per page. Every page takes that helper's default
handler, which reloads; `quranrevival.html` alone passes its own in-place
re-render, because reloading the landing page would re-fire the boot and
Quran-entry splashes. Bar 1 of Study options is down to three cells
(Tenant/Person/Approach) — **measured: still one line each at 320/360/390/412/
768px, nav still four buttons on one line, no overflow.** **Verified with 151
behaviour checks** (the control present and defaulting to English on all 19
nav-bearing pages; Bangla names really appearing on every one of them; the
in-place re-render vs the reload path; the split proven in both directions —
app language bn does NOT turn the ayah translation on, translation bn does NOT
rename anything; the Bangla-reciter auto-switch; an unknown stored value
falling back to English rather than wedging) **plus the standard landing-page
layout regression run against the previous commit's own copy of the page: byte-for-byte
identical at all five viewports in both banner states** — same wheel-heading
top, same wheel width, same Approach-row count, same 9px dock gap, 65
`getElementById` targets with none missing, no page errors. That is the
expected result, since everything this round moved lives inside containers
that start closed. **Deliberately NOT done, and said to the owner up front
rather than discovered afterwards: the app's own words are still English** —
`nav.js`'s labels ("Modules", "Operation", "Quran Study"…) and every page's
headings and buttons are hardcoded strings, so Bangla today means Bangla
names inside an English frame. That is a real translation project needing the
owner's own Bangla wording, now recorded as `LAYOUT-BACKLOG.md` item 6.
**One behaviour change worth knowing:** the translation language is a stored
preference now, so if the Bangla reciter turns it on it stays on across
reloads until it is changed back in Reading view — previously it reset on
every load. Say so if the owner asks why Bangla text keeps appearing.

v07.31 (13 Aug 2026, on Claude Code on the web) is **full app translation,
phase 1 of 6 — THE SHELL.** The owner asked for this directly, minutes after
v07.30 shipped, and their framing is the whole specification: *"when we
change the language, the entire app (except the Banner) should turn into
that language … A person only reads Bangla, nothing in English. He must find
things in Bangla otherwise he won't use the app."* So the test is not "is it
translated" but "could someone who reads no English use it". **Measured
first, before proposing anything: 641 unique English strings across the 19
user-facing pages and shared modules, plus ~360 platform-data items with no
Bangla (31 subject names, 90 Approach Guide paragraphs, 114 surah names, 99
Asma meanings) — ~1,000 in total.** The honest headline given to the owner:
the code is mechanical, the WRITING is the bottleneck. **Three decisions were
put to them and answered before any code: (a) Claude drafts all the Bangla
and the owner corrects it** — uncertain lines are marked `// ?` in the
catalogue, concentrated on religious/technical wording where a wrong Bangla
word is worse than English; **(b) Bengali numerals (১২৩) when the app is in
Bangla**, via `num()` applied at each render point, never by rewriting the
DOM, so ids/versions/URLs can never be mangled; **(c) admin screens ARE
included** (phase 5), so a Bangla-only person could run a tenant, not only
study in one. **The mechanism, which every later phase depends on: THE KEY IS
THE ENGLISH TEXT ITSELF.** `t("Sign out")` looks up `"Sign out"` in
`app/js/i18n/bn.js`; there are no invented key names. That choice is
deliberate and load-bearing — a missing translation returns the English, so
the usual i18n failure (a screen showing `nav.signOut`) is impossible by
construction, which matters because the app will be part-translated for
several phases. `translateStatic()` walks the page's own text nodes on load
and swaps what it recognises, so ~500 static headings/labels/buttons across
19 pages are translated **without editing their HTML at all**; it remembers
each node's original English in a WeakMap, which is what makes switching
BACK to English work (a one-way DOM swap would have been a real trap, caught
before shipping). Dynamic output keeps its own `t()` calls. **Phase 1
delivers:** `js/i18n.js`, `js/i18n/bn.js` (116 entries), `tools/i18n-coverage.mjs`
(prints per-phase progress — `node tools/i18n-coverage.mjs`, reading the same
catalogue the app reads so the number can't drift from the phone), the whole
nav/Home/Settings/sign-in strip, splashes, About, onboarding, accept-invite,
and the six shared progress statuses (now via `statusLabel()`/
`statusLabelsById()` in `unit-keys.js`, translated at CALL time so a language
change mid-session isn't stuck). **Shell area: 94/94 strings, 100%. App-wide:
174/641, 27%.** Two things settled here that later phases inherit: **a
Bengali font stack app-wide** (`system-ui` can resolve to a font with no
Bengali glyphs — empty boxes, i.e. unusable for exactly the person this is
for; also added to `accept-invite.html`/`onboarding.html`, which have no nav
but are often the first screen a new person sees), and **Bangla line-height
1.3, measured not guessed** — 1.55 cost a visible Approach row at 390px and
412px, 1.35 still cost one at 412px, 1.3 gives exact parity with English at
320/360/390/412/768px, so Bangla costs the layout nothing. **Verified: 212
behaviour checks in both languages** (English untouched on all 19 nav pages;
nav, links, sign-in strip and Settings label all Bangla on all 19; the
en→bn→en round trip in place with no reload; statuses in the wheel legend
and sidebar; invite/onboarding; `num()` giving ২৫৫ while the version badge
stays `07.31`) **plus the standard landing-page layout regression: byte-for-byte
identical at all five viewports in both banner states.** Three test failures
during the run were investigated and proved to be WRONG ASSERTIONS, not
defects — every language picker names Bangla in Bangla in every language on
purpose (it is how a Bangla-only reader finds the setting), and page `<h1>`s
belong to their own later phase. **Two real pre-existing findings, recorded
not silently patched:** page headings still carry developer noise ("People
(F-012)", "Records (Phase 3)") which is meaningless in either language and
should be cleaned by whichever phase owns each page; and at 320px the
ENGLISH nav truncates "Operation"/"Bookmark" (73px of text in a 65px box) —
confirmed identical on the previous commit, and notably Bangla does NOT
truncate there. **See `TRANSLATION-PLAN.md`** for the full six-phase plan,
the measured sizing, and what each phase owns. Phase 2 is the Quran module
(89 strings + 114 surah names).

v07.32 (13 Aug 2026, on Claude Code on the web) is **full app translation,
phase 2 of 6 — THE QURAN MODULE**, the module the app is named after.
**Area coverage 107/107 (100%); app-wide 273/658 (41%).** Delivers
`quranrevival.html` end to end (both dock tabs, all three Study-options bars,
the Reading view and Listening cards, the Explore drill, the way modal, the
wheel legend and centre disc) plus `way-modal.js`, `ayah-renderer.js`,
`hifz-renderer.js` and `audio-player.js`. **The 114 surah names are in
Bangla**, in their own file `js/i18n/surah-names-bn.js` — kept out of `bn.js`
because they are DATA not interface wording, and out of
`tools/quran-data-pull/output` because that folder is generated and a re-pull
would overwrite them. Three method points later phases must follow: **(a)
`num()` is applied where a number is DRAWN, never to a value** — the surah
picker reads "২. আল-বাকারা" while its `<option value>` stays `2`, because
every change handler parses it back with `Number()`; getting this backwards
would break every picker on the page. **(b) New `parseNum()` reads Bengali
digits BACK**, so the "Go to" box accepts `২:২৫৫` — a Bangla-only reader on a
Bangla keyboard types Bengali digits, and a box that refuses what the
interface itself taught them to type is exactly where someone gives up; use
it on any field where a person types a number. **(c) Failure messages are
translated too (I15)** — an error a Bangla reader cannot read is nearly as
useless as no error; on-screen messages are translated, while `throw new
Error(...)` diagnostics carrying HTTP codes stay English on purpose, since
they are for whoever is helping rather than for the reader. Reciters keep
their own names (a person's name is not translated); only the bracketed
language note changes. Two `renderExplore*` functions declared a local
`const surahName` that would have **shadowed the imported helper** — found
and renamed before it could bite. **Verified: 232 behaviour checks** (all of
phase 1's, plus surah names and Bengali numerals in the pickers with option
VALUES proven still plain, the wheel centre, dock tabs, all bar labels, unit
types, Reading view, typing `২:২৫৫` really jumping to 2:255, a bad reference
explaining itself in Bangla, and English proven byte-unchanged) **plus the
landing-page layout regression (identical at all five viewports in both
banner states) and a nav check in BOTH languages: Bangla now has exact parity
with English at 320/360/390/412/768px** (7/6/5/5/10 Approach rows either way).
**Two real bugs in `tools/i18n-coverage.mjs` were found and fixed — both made
it OVERSTATE progress**, which is the dangerous direction: its filter required
a three-letter word, so "Go to" was skipped entirely and the report claimed
100% while that label sat in English (caught by a behaviour test, not by the
report); and an escaped quote inside a key truncated it into a phantom
missing string called `"Couldn"`. **The standing lesson, now recorded in
`TRANSLATION-PLAN.md`: the coverage number is a guide, not proof — only a
behaviour test that reads the rendered page can show a screen is really
translated.** Phase 3 is the nine other study modules (50 strings + 31 subject
names and glosses + 90 Approach Guide paragraphs).

v07.33 (13 Aug 2026, on Claude Code on the web) is **full app translation,
phase 3 of 6 — THE NINE OTHER STUDY MODULES.** **Area 242/242 (100%);
app-wide 497/949 (52%) — past halfway.** Covers the nine module pages (Deen
Study, Arabic, Hadith, General Study, Nature-Life, Life Skill, Health, LDOG,
Asma ul Husna), `topic-study.js`/`routine-study.js`/`asma-study.js` and the
`topic-renderer`/`asma-renderer`, **plus the platform content itself: 55
subject-tree names and glosses, and all 30 Approach Guide sets (What / How /
How to measure) — roughly 90 paragraphs of religious and technical Bangla,
the heaviest writing in the whole project.** **The most reusable finding of
this phase, which phases 4-6 must assume: PLATFORM DATA IS TRANSLATED AT READ
TIME, NOT AT SEED TIME.** `js/catalogue-data.js` is a *seed* — its text was
copied into each tenant's Firestore documents at tenant-creation and is never
re-read, so adding `bn` there would have translated the app for a madrasah
created tomorrow and done nothing at all for the owner's own tenant, seeded
weeks ago. Instead `langText()` (`js/lang.js`) now falls back through the same
Bangla catalogue keyed by the English it finds stored — `value[lang] →
t(value.en) → value.bn → value.en` — which fixes **every existing tenant at
once with no data migration, no Firestore write and no `firestore.rules`
change**; a tenant that authored its own Bangla still wins, since
`value[lang]` is checked first. **Also cleaned, as `TRANSLATION-PLAN.md` says
each phase should: developer noise in three page titles** ("Deen Study (Phase
6)", "Health (Phase 7)", "Learn Deen On-the-Go (Phase 7)") — meaningless in
either language; a test now fails if `(Phase n)` or `(F-nnn)` reappears in a
module page's title or heading. **A THIRD coverage-tool bug was found, and it
is the one that proves the standing rule:** the report said the modules area
was 100% translated **while the intro paragraph on every module page was
still English** — the extractor read `Islamic History &amp; Story` from the
HTML source, but `translateStatic()` reads text nodes from the live DOM where
that is already `Islamic History & Story`, so the key could never match. The
extractor now decodes HTML entities and the affected keys were rewritten.
**It was found by opening a real rendered page and reading it, not by the
report** — three phases, three times the number has overstated progress.
**Verified: 282 behaviour checks** (all of phases 1-2, plus every one of the
nine pages' heading/title/intro in Bangla with no developer noise, and
specifically **that a SEEDED English-only subject name and gloss render in
Bangla with no English left in the list** — the test that proves the
read-time fallback really works — plus English module pages proven unchanged)
**plus the landing-page layout regression (identical at all five viewports in
both banner states) and the nav check in both languages (still exact parity).**
Phase 4 is tracking & feedback (Records, Monitor, Homework, Course Offers).

v07.34 (14 Aug 2026, on Claude Code on the web) is **full app translation,
phase 4 of 6 — TRACKING & FEEDBACK.** **Area 205/205 (100%); app-wide
711/1039 (68%).** Covers `records.html`, `monitor.html`, `homework.html`,
`course-offers.html`, `js/monitor.js` and `js/continue-strip.js`, and cleans
the four developer-noise headings this phase owned ("Records (Phase 3)",
"Monitor (Phase 8)", "Homework (Phase 9)", "Course Offers (Phase 7 round
2)") — a test now fails if `(Phase n)`/`(F-nnn)`/`round n` reappears in any
of them. Two of those pages' intro paragraphs were also **factually stale**,
not just noisy — Records still said "there's no Quran/topic renderer yet
(that's Phase 4)" and Course Offers still said studying through an enrolled
offer "isn't wired into the study screens yet", both untrue since Phase 4 and
v07.16/v07.19 respectively — so they were rewritten as plain user-facing
sentences rather than translated as-is.

**The real finding this phase is about the coverage TOOL, not the writing:
three whole shapes of user-visible string were invisible to it**, so it could
report an area at 100% while a picker, a table column and every save-failure
message in the app sat there in English. **(a) Label maps** — a stored
identifier becomes readable text via a small map whose values are the English
keys (`t()` receives a *variable*, which no extractor pattern could see);
`*_LABELS` is now a **naming convention the report depends on**, and eight
such maps were introduced (confirm state, activity action, unit type,
submission state, offer/class status, role in class, app role, weekday).
**(b) Singular/plural pairs** — `t(n === 1 ? "…entry…" : "…entries…")`; only
a quote sitting immediately after `t(` was ever matched, so the plural half
went uncounted. **(c) `js/errors.js` belonged to no area at all** — its eight
plain-language write-failure sentences are the entire visible surface of I15,
shown on every screen in the app, and were therefore neither translated nor
reported as missing. Now in the `shell` area, written as `() => t("…")`
thunks so they are translated at call time *and* countable. **That is four
phases, four times the number has overstated progress** — the standing rule
in `TRANSLATION-PLAN.md` holds, and `tools/i18n-verify/probe.mjs` (new,
checked in) now makes the honest check cheap by dumping a page's whole
rendered text, its pickers and its placeholders in either language.

**Two things phases 1-3 shipped past, found by reading a rendered page and
fixed here.** The **"no account found yet" dead end** — the screen a
signed-in person with no tenant sees — was English in **twelve** separate
copies (nine pages plus `topic-study.js`/`routine-study.js`/`asma-study.js`),
each a template literal no extractor could see; now one
`noAccountMessageHtml()` in `nav.js`, which every one of them already
imports. And the **role names in every page's tenant picker**
("Madrasatul Muslimeen (owner, prime)") plus the nav's "Previewing as"
notice. Those live in a **new three-line `app/js/roles.js`** rather than in
`session-context.js`, deliberately: `nav.js` needs them and is by its own
contract (I2) a pure renderer that never touches Firebase, while
`session-context.js` imports the Firestore SDK. Also fixed: `records.html`'s
**Status picker was built from `STATUSES`' own English `label`**, so it stayed
English in Bangla even after phase 1 translated statuses everywhere else.

**Method points phases 5-6 inherit.** **The first real use of the context
suffix** — Homework's note form has a label meaning "about WHICH student" and
it was picking up the nav's translation of the About *page*; `t("About|person")`
plus `data-i18n-ctx="person"` is what i18n.js reserved that mechanism for, and
more collisions should be expected as the admin screens land. **A possessive
cannot be assembled**: `<span>{name}</span>'s enrolments` and `Assignments for
<span>{name}</span>` both reverse in Bangla, so each became one
`t("{name}'s enrolments", { name })` sentence rendered by JS (same for
`Enrol {name}`). **Identifiers keep a reader-facing twin**: `unitKeyLabel()`
turns `ayah:1:1` into "Ayah 1:1"/"আয়াত ১:১" while the key, the chunk key and
the CSV export stay canonical. **A CSV is a data export, not a screen** — its
header row is translated, its dates/unit keys/action ids are not. **Dates come
in two shapes** — an ISO string that *is* the stored value gets `num()` only;
a human-formatted one takes the reader's locale (`bn-BD`) so month names
translate too; an `<input type="date">` value is never touched.

**Verified: 341 behaviour checks** (all of phases 1-3, plus the four pages'
heading/title/intro in Bangla with no developer noise; the unit-type and
status pickers Bangla with option VALUES proven still the bare identifiers;
every table header, confirmation-state pill and activity action Bangla;
Bengali digits throughout; **typing `২:২৫৫` into the Reference box really
resolving to surah 2**, the `parseNum()` rule phase 2 set; the CSV *header*
translated; the About-collision fix; both possessive headings reading
name-first; a real write failure explained in Bangla, including an unmapped
error code with the code left readable; and all four pages proven still
byte-for-byte English) **plus the landing-page layout regression (identical at
all five viewports in both banner states, 65 `getElementById` targets, none
missing) and the nav check in both languages (unchanged parity).** The
verification harness's Firebase stub gained **real rows** for records,
activity, domains, course offers, enrolments, assignments, submissions and
teaching notes — a status pill or a role label can only be proved translated
if something actually renders it; two details there are load-bearing and are
now documented in its README (a `tenantPeople` doc id is the BARE personId,
and the seeded `activity` doc id must carry whichever week the suite runs in).
**No `firestore.rules`, schema or data changes** — nothing to deploy but the
static files. **Flagged, not changed:** Records still says "chunk" on screen
("Entries in this chunk", "Chunk: surah_1"). That is a storage concept
leaking into the interface, meaningless in either language, but rewording it
is an English-copy decision rather than a translation one — raised for the
owner rather than decided here. Phase 5 is Admin (People, Catalogue,
Curriculum, Classes).

v07.35 (14 Aug 2026, on Claude Code on the web) is **full app translation,
phase 5 of 6 — ADMIN.** **Area 219/219 (100%); app-wide 899/1086 (83%).**
Covers `people.html`, `catalogue.html`, `curriculum.html`, `classes.html` and
`js/study-lock.js`, and cleans the last of the developer noise this project
has carried in its page headings: "People (F-012)", "Catalogue (Phase 2)",
"Curriculum (Phase 11)", "Classes (Phase 10)", plus the whole **"Study Mode
handover lock — test only (F-016)"** block, whose paragraph was a builder's
note ("throwaway demo of the LOCK MECHANISM", "D10", "Phase 3/4") rather than
anything a user could act on — rewritten as plain instructions. Four intro
paragraphs got the same treatment (Stage B2, I4/I6 and "cross-subject" jargon
all removed). A behaviour check now fails if `(Phase n)`, `(F-nnn)`,
`round n`, `Stage B2` or an invariant reference reappears in **any** page's
title, heading or intro. **This closes the "page headings still carry
developer noise" item `TRANSLATION-PLAN.md` has carried since phase 1.**

**The coverage report was very nearly honest this time** — one missing string,
not a whole invisible category, the first phase of five where that is true.
The `_LABELS` convention phase 4 introduced is exactly why: every identifier
map added this round was counted the moment it was written. Reading the
rendered pages still found what the report could not. **A status value
nothing else uses:** `modules.js` seeds a module as `"planned"` and flips it
to `"active"` when that module's UI ships, so `planned` sat outside the status
map and printed raw in the Catalogue's Modules table — the standing lesson in
its narrower form, **a label map is only as complete as the values that
actually reach it, so check the writer, not only the screens.** **Two `t`
shadows waiting to happen:** `trackableRowHtml(t)` took the trackable as a
parameter named `t`, and a filter callback did the same, so any `t("…")`
added inside either would have silently called the wrong thing (phase 2 hit
this exact shape with `surahName`) — renamed to `row` before translating
those bodies. **And one real pre-existing I11 bug, not a translation gap:**
`classes.html` read a class's gloss straight off `.en`, so a tenant that HAD
authored Bangla for it still saw English; now through `langText()`, proved by
a stub row whose two languages actually differ.

**`app/js/roles.js` (new in v07.34) is renamed `app/js/labels.js`** and is now
the one place an identifier's wording lives when no single domain module owns
it: role names **plus** the lifecycle status shared by subjects, trackables,
modules, ladders, levels, curriculum units, classes, course offers,
enrolments and invites (active / archived / ended / pending / accepted /
revoked / planned / draft). It imports only `i18n.js`, so `nav.js` can use it
while staying the pure, Firebase-free renderer its own contract (I2) requires.
`course-offers.js`'s `contextStatusLabel` and `roleInClassLabel` are now
**re-exports** of it rather than second copies — `roleInClassLabel` in
particular was mapping the same two words ("Student", "Teacher") as
`roleLabel`, so one concept now has one helper. Two more method points phase 6
inherits: **a `confirm()` dialog is a screen too** — `Archive "{name}"?` was
an English verb concatenated onto a quoted name, which reverses in Bangla, so
each branch is its own whole sentence now (the same rule phase 4 set for
possessives); and **an identifier shown as a tag should be resolved to a
name** — the subject tree printed raw moduleIds (`deen`, `quranrevival`) as
tags, now looked up in the modules the page has already loaded, so they follow
`langText()` and any admin rename rather than a second hardcoded list.

**Verified: 402 behaviour checks** (all of phases 1-4, plus every admin page's
heading/title/intro/table-header/legend/section-heading in Bangla with no
developer noise; the roster's Roles column no longer a raw array; an invite's
role and state Bangla while the email address is left exactly as it is; the
View-as and invite-Role pickers Bangla with option VALUES proven still the
bare role ids; a refused device handover explained in Bangla; the Modules
table's Renderer and Status cells Bangla including `planned`, with
"QuranRevival" proven still untranslated; module tags showing names not ids;
Bengali digits in the Approach list and the seed line; Term/Week pickers
Bangla with values still plain numbers; the grade history's dates in Bengali
digits; a tenant-authored Bangla gloss really rendering; and the admin pages
proven still byte-for-byte English) **plus the landing-page layout regression
and the nav check in both languages, both unchanged.** One test failure during
the run was investigated and proved a WRONG ASSERTION, not a defect — a table
header that is only "#" is punctuation, not wording, and reads the same in
both languages. **One harness note worth keeping:** `layout.mjs` compares
against the previous commit's copy of `quranrevival.html`, so a round that
RENAMES a module that page imports makes the old copy 404 and score 0
everywhere, which looks like a catastrophic regression and is not — drop a
shim at the old path for the length of the comparison. Recorded in the
harness README. **No `firestore.rules`, schema or data changes** — nothing to
deploy but the static files. Phase 6 is Asma ul Husna (89 strings + the 99
Names' meanings), the last one.

v07.36 (14 Aug 2026, on Claude Code on the web) is **full app translation,
phase 6 of 6 — ASMA UL HUSNA. The last phase: the app is now translated end
to end.** **Area 191/191 (100%); app-wide 1,099/1,099 (100%).** Covers the 99
meanings, the 99 Names in Bangla script, the 92 screensaver poster captions,
`js/asma-renderer.js` and the Asma parts of `js/asma-study.js`.

**Three decisions were put to the owner before a word of Bangla was written**
— the Names have established renderings in Bangladeshi Islamic literature and
drafting 99 of them from scratch would have been the wrong move. The owner
chose: **(a)** base the meanings on the **standard Bangladeshi wording** (the
Islamic Foundation Bangladesh Bangla Qur'an and the 99-Names lists circulated
by IFB and As-Sunnah Foundation) rather than translating this app's own
English glosses, and they intend to **supply their own prepared list later** —
confirmed to them that replacing it is a single edit per Name in one file, no
schema change, no Firestore write; **(b)** add the **Name itself in Bangla
script** (আর-রহমান), not just the meaning — a card showed Arabic, a Latin
transliteration and an English meaning, so a Bangla-only reader could read one
line of three and the Latin line was dead space on exactly the screen this
whole project is for; **(c)** caption the **posters in Bangla** where the Name
is recognisable, noting they are a WIDER, older list on a different
transliteration convention.

**The mechanism, for whoever touches this next: the Bangla lives in two files
and NEITHER of them is `asma-data.js`.** Meanings are interface wording, so
they are in `js/i18n/bn.js` keyed by their English, where the coverage report
counts them; the Names are data indexed by number, so they are in a new
`js/i18n/asma-names-bn.js` reached through a new `asmaName()` helper — an
exact copy of phase 2's `surahName()`, for the same reason. `asma-data.js`'s
99 `bn: null` slots were **deliberately left empty**, and its header now says
why: `langText()` checks `value[lang]` FIRST, so a `bn` filled there would
silently override any later correction made in `bn.js`, and the report (which
reads `bn.js` and nothing else) would show 0% while the screen showed Bangla.
One source, not two. Note this is the opposite call from phase 3's — that
file genuinely is never seeded to Firestore, so filling it *would* have
worked; it was rejected on drift grounds, not on reachability.

**The coverage tool was wrong for the FIFTH time in six phases, and in a new
direction — it hid strings from the denominator.** An apostrophe inside a
`label:` value (`label: 'Al-Mu\'mim'`) tore the match at the backslash, and
the fragment was then discarded as a stray-backslash artifact, so five of the
93 poster captions were **never counted and therefore could never be reported
missing** — the area could have shown a confident 100% with five captions in
English and no line anywhere saying so. Fixed, escape-aware in both quote
styles. **The standing rule is unchanged and is the most reusable thing this
project has learned: the coverage number is a to-do list, never evidence.**

**Two real defects outside this phase's own area, both found by reading a
rendered page.** `"Claimed and confirmed."` — **the message shown after every
successful claim, on every study screen in the app** — was English at five
call sites (`quranrevival.html` twice, `topic-study.js`, `routine-study.js`,
`asma-study.js`); none ever wrapped the ternary in `t()`, and the report's
plural matcher only fires *inside* `t(...)`, so the quran and modules areas
both read 100% from phases 2 and 3 onward. Its sibling string had been sitting
translated in `bn.js`, unused, since phase 1. And the **Asma detail panel
printed raw identifiers** — a `claimedStatus` with its underscores swapped for
spaces, plus a bare `confirmState` id, meaningless in either language. Both go
through the shared label helpers now; **`confirmStateLabel` moved from
`records.js` to `js/labels.js` and is re-exported**, because `asma-renderer.js`
has to print it and is a pure renderer (I2) that must never gain a Firebase
dependency — the same move, for the same reason, that created `labels.js`.
Also fixed: a poster caption reading `Al-Aleem3`, straight off a filename (the
URL keeps the real filename). And **two `t`/`num` shadows caught before they
could bite**, by grepping for them *before* translating anything nearby — one
of them a local `const num =` on the very line that then needed the imported
`num()`.

**Verified: 424 behaviour checks** (all of phases 1-5, plus all 99 cards
proven Bangla end to end with **not one** Name left in Latin script, not one
meaning in English and not one number in Latin digits; `data-number` proven
still plain so `Number()` reads it back; the Arabic untouched; the detail
panel's "১ of ৯৯" reading as one Bangla sentence rather than a number glued to
an English word; the status line with no raw status or confirmState id; the
way modal's title; the screensaver's caption AND its `alt` text with the
archive.org URL untouched; the claim message at all five sites; and the whole
page proven still byte-for-byte English) **plus the landing-page layout
regression (identical at all five viewports in both banner states, 65
`getElementById` targets, none missing) and the nav check in both languages
(Bangla still at exact parity; the only reported problem is the pre-existing
320px ENGLISH truncation of "Operation"/"Bookmark", which Bangla does not
have).** The harness gained a `subject_asma_ul_husna` records chunk and a
`studied_asma` trackable — without the trackable `asma-study.js` returns early
from the way modal and its title never renders at all.

**What is NOT translated, now that all six phases are through** — each a
deliberate decision, written up in full in `TRANSLATION-PLAN.md`'s new "Where
this actually stands" section: **the language is per BROWSER, not per person**
(localStorage `mm_app_lang`, the owner's own v07.30 call, taken so the setting
needs no new startup read, no new collection and no `firestore.rules` change —
so Bangla set on the phone leaves the tablet in English until set there too;
`prefs.js` is shaped for a Firestore sync to slot in behind the same
`getAppLang()` getter, and **that sync is the most likely next request**); the
tenant banner (excluded by the owner's own original wording); people's and
reciters' own names; Arabic anywhere; CSV export values; `throw new Error()`
diagnostics; and a handful of strings mapped to themselves on purpose so the
report counts them as decided rather than forgotten. **The Bangla wording is a
first draft throughout** — lines marked `// ?` are the ones worth the owner's
eye first, and in this phase those are Al-Waliyy/Al-Wali (two distinct Names
most Bangla lists render identically) and Ad-Darr (the most theologically
sensitive line in the project). **No `firestore.rules`, schema or data
changes** — nothing to deploy but the static files.

v07.37 (14 Aug 2026, on Claude Code on the web) is **the app language synced
to the ACCOUNT** — asked for by the owner the moment phase 6 landed, in their
own words: *"A setting user does in one device should reflect in any device
when signing, setting again is just annoying."* v07.30 had deliberately made
it per-BROWSER (localStorage), and `TRANSLATION-PLAN.md` had flagged this sync
as the most likely next request; it was.

**The design point that matters, and it reverses `LAYOUT-BACKLOG.md`'s own
prediction: this needed neither a new startup read nor a new collection.**
That file's decision table said a Firestore-backed language preference would
cost both, which is why v07.30 chose localStorage. It was wrong. The language
is now one extra field on **`userIndex/{uid}`** — the document every one of
the fourteen signed-in pages ALREADY fetches in its auth bootstrap to resolve
the person's default tenant. So the snapshot is in hand, the read is free, and
**nothing at all was added to the pre-first-paint path**; the load-speed
contract's three-reads-after-paint budget is untouched and there was no I9
conversation to have. **The lesson recorded in both files: before proposing a
new collection for a preference, check what the startup path already reads.**

**localStorage still decides what paints, and that is deliberate, not a
leftover.** The language must be known SYNCHRONOUSLY or a Bangla reader
watches an English page appear and change under them — a network read cannot
happen before first paint. So localStorage paints; then, once sign-in
resolves, the account's value is compared and, if it differs, adopted with a
single reload; that device then agrees and never reloads again. Changing the
language writes both, so **the last change made on any device is what every
other device picks up next time it loads** — no timestamps compared, no
per-device precedence, nothing to merge. The one visible cost, stated plainly
rather than discovered later: on a device that has NEVER opened the app the
first paint is English even for a Bangla reader, until the account read
returns and the page reloads. Once per device.

**`firestore.rules` DID change, and it must be deployed** — `userIndex`'s
update rule pins the writable fields with `hasOnly()`, so `'appLang'` joined
that list. One word. The `platformAdmin` guard (I10) is untouched and a
display preference carries no authority. **Until the owner deploys it via the
Firebase Console** (same copy-paste route as every recent round — this owner's
machine can't keep the CLI installed), changing the language still works on
the device but the save is denied, and `safeWrite()` shows the reason on
screen (I15). That is why the failure path deliberately does NOT reload: a
reload would throw the message away before it could be read.

**Two structural points a later round must not undo.** `js/prefs.js` stays
Firebase-free and imports NOTHING — pure renderers (`asma-renderer.js`, and
`nav.js` via `APP_LANGS`) import `getAppLang()` from it and must never gain a
Firebase dependency (I2) — so the Firestore half lives in a new
**`js/lang-sync.js`**, imported only by page controllers that already talk to
Firebase. A behaviour check now fails if either file gains one. And
`adoptAppLang()` **refuses to adopt when localStorage cannot be written**
(private browsing): otherwise the next load would read the old value, adopt
again and reload, forever. That loop is not hypothetical — the verification
harness hit exactly it, because `addInitScript` re-imposed the device value on
every navigation including the adopt reload; the harness now seeds the
preference only when absent, which is what a real device does.

The read side is one line per page (`if (adoptAppLangFromUserIndex(userIndexSnap)) return;`,
straight after the existing `getDoc`) and the write side is one swapped call
(`mountSyncedAppLangControl` for `mountAppLangControl`), across all 14
signed-in pages/controllers. `onboarding.html` and `accept-invite.html` are
deliberately left alone — there is no account to sync with yet.

**Verified: 435 behaviour checks** (all of phases 1-6, plus a fresh device
adopting the account's Bangla and really rendering in it; the account
overriding a device that disagrees, in both directions; a device that already
agrees **not** reloading — which is what stops every load reloading forever;
an account with no language set leaving the device alone, i.e. everyone's
behaviour before this round; choosing a language really writing to
`userIndex`, carrying `appLang` + `updatedAt` and **nothing else**, since
`hasOnly()` would reject anything more; and the two I2 source checks above)
**plus the landing-page layout regression (identical at all five viewports in
both banner states) and the nav check in both languages, both unchanged.** The
stub's `updateDoc` now records writes to sessionStorage rather than memory —
the sync reloads on success, which would wipe an in-memory record and make a
real write look as though it never happened. **No schema change beyond the one
additive field, and no data migration** — an account with no `appLang` simply
keeps using its device's own setting.

v07.38 (15 Aug 2026, on Claude Code on the web) is **real load speed,
measured** — the owner's own report, in their words: *"the app is live and I
use it daily; it feels slow to open."* Their framing set the method: measure
before changing anything, and deliver numbers a non-coder can read.

**The measurement problem had to be solved before the speed problem, and it
is the most reusable thing this round produced. `tools/i18n-verify`'s Firebase
stub ANSWERS INSTANTLY** — run naively it would have reported every page
loading in a few milliseconds no matter how many Firestore reads it makes: a
comforting number and a false one. Said to the owner up front rather than
discovered later. So the stub was instrumented (additively — default latency
0, so all 435 translation checks are untouched): **every Firestore call now
logs itself and waits a set number of milliseconds before answering.** That
gives two honest measurements — the **call log**, which is a fact about the
CODE and does not change with connection speed, and a **wall clock** that
shows what that log costs a person. The headline figure is **round trips IN
SEQUENCE**: reads fired together cost one wait, reads fired one after another
cost one wait each. A second method point future rounds must copy: **the
tenant is measured in the state the owner's real one is in** (seeded weeks
ago, `newContext({ seedTemplates })`) — the stub's default data is a
HALF-seeded tenant, which makes the seeding paths write on every load, so
measuring against it would flatter or damn the wrong thing. See
`tools/perf/README.md`.

**Baseline, phone viewport, 150ms per round trip:** Quran Study 10 sequential
round trips / 1.70s; Deen Study **14 / 2.09s**; Health 15 / 2.24s; Asma 13 /
1.94s; Records 11 / 1.62s. The app frame did not appear until ~0.9s. Against
the load-speed contract's three-reads-after-first-paint budget, the app was
making 11–17, nearly all strictly one after another.

**The owner's own lead was confirmed** — the three `ensure*Seeded()` checks do
run on every page load of every page for a tenant seeded weeks ago, finding
nothing to do. **Three findings beyond it, all pure waste: memberships were
loaded TWICE on every page load of every page** (`initializeActiveContext()`
fetched the list, used it, threw it away, and the page then fetched the
identical list again for its tenant picker); **subjects and trackables were
read twice** (the seed check read them, then `loadContextData()` read them
again); and **the tail was needlessly serial** — records, then enrolments,
then bookmarks, each waiting for the last though none depends on another. Plus
one data-model finding: **`subjectTemplates` is written and never read** — no
screen displays it and even `ensureTenantCatalogueSeeded()` builds from the
bundled constant, so that full-collection read fed nothing.

**Two decisions were put to the owner with the numbers attached, per I9 and
their own "let me choose" instruction, and answered before any code:** scope =
**remove the waste** (they did NOT take the third option, which would also
have repainted the frame earlier at the cost of touching render order on 14
pages — still available); and **both registry reads off the startup path**,
with the stated and accepted trade-off that **an admin's edit to a module or
subject now reaches a study page on the NEXT load rather than the current
one.**

**Built:** `bootstrapContext()` in `session-context.js` (returns the context
AND the memberships it used to pick it — `initializeActiveContext()` kept,
unchanged, sharing one `pickContext()` helper); new **`js/catalogue-repair.js`**,
whose header carries the whole reasoning; the three seed calls removed from
`topic-study.js`/`routine-study.js`/`asma-study.js` and their tenant-switch
handlers, replaced by **seed-only-if-the-page's-own-data-is-absent** plus a
background drift check that runs at most once per browser tab; one-wave reads
in every `loadContextData()`; and on `quranrevival.html`,
`syncUnneditedTrackableNames()` moved off the blocking path entirely (it was
the cause of the second trackables read). **Nothing deleted or reshaped
(I4)** — every seeding function is untouched and still writes exactly what it
wrote; only WHEN they are called changed. **No `firestore.rules`, schema or
data changes.**

**Result, measured the same way: Deen Study 14 round trips → 6, 2.09s →
0.89s; Quran Study 10 → 6, 1.70s → 0.93s; Health 15 → 6; Asma 13 → 6; Records
11 → 5, 1.62s → 0.87s.** On a poor connection (300ms) Deen Study goes 4.03s →
1.65s. The frame appears at ~0.6s instead of ~0.9s. The sequence is now
userIndex → memberships → tenant name → {roster, tenant, subjects,
trackables} → {records, activity, enrolments, bookmarks}: six waits instead of
fourteen, for the same data. **Why it stops at 6 and not 5:** the records
chunk depends on which person is selected, which depends on the roster —
going below that means guessing the person before the roster lands, a
different and riskier change, not attempted.

**Verified: all 435 behaviour checks pass, `layout.mjs` reports NO LAYOUT
REGRESSIONS** (landing page byte-for-byte identical at all five viewports in
both banner states, 65 `getElementById` targets, none missing), **navcheck
unchanged in both languages, translation coverage still 1,099/1,099** — plus
a new suite, **`tools/perf/new-tenant.mjs`, 10/10**, which is not optional
reassurance but the test the round had to pass: each study page run against a
tenant with NO catalogue at all seeds and then renders real content, and a
tenant already set up is proved NOT written to on a normal load. All 19
nav-bearing pages load clean.

**Flagged for the owner, deliberately NOT changed: every load of Quran Study
downloads ~460KB from `raw.githubusercontent.com`** — `audio-player.js` warms
the Bangla reciter's ayah-timing map at module load, for a real documented
reason (an `await` between a Play click and `audio.play()` can break the
browser's user-gesture association and get playback silently rejected). It is
fire-and-forget so it does NOT delay time-to-usable, but it is 460KB of mobile
data on every landing-page visit whether or not anyone plays Bangla audio.
Both fixes have a user-visible downside, so it is the owner's call. Its real
cost could not be measured — this sandbox cannot reach that host. See
`LOAD-SPEED-STATUS.md` for the full round, including where the load-speed
contract now genuinely stands (5–12 reads, but **5–6 waits** — a study screen
showing real progress needs more than three documents by nature; what the
contract is really protecting against is waiting for them one at a time).

v07.39 (15 Aug 2026, same day) closes the item v07.38 flagged, on the owner's
one-line answer — *"Giving priority in loading speed."* **The Bangla
reciter's ayah-timing map (measured: 460,531 bytes, 450KB) is no longer
fetched on every landing-page load.** `audio-player.js` used to fetch it the
moment the module loaded, for anyone, whether or not they ever played audio.
**It could not simply be deleted, and that is the whole difficulty:** browsers
only let `audio.play()` through when it runs inside (or very soon after) a
real user gesture, so an `await` on a network fetch between the Play tap and
`play()` can get playback silently rejected — the fetch has to happen BEFORE
the tap. So the eager module-load warm-up became an exported
`warmSegmentedTimestamps()`, called from the two gestures that ALWAYS precede
Play: **opening the Listening settings card** (the only place Play lives) and
**changing the reciter**. Idempotent, so calling both costs nothing, and a
real failure still surfaces at click time rather than being swallowed early.
Someone who never opens Listening settings never downloads it at all.
Time-to-usable is unchanged (0.93s @150ms, 6 round trips) — as expected, since
the fetch was never blocking; the win is 450KB of a phone's bandwidth on every
visit. **Both halves are verified, because either alone would be wrong**
(`behaviour.mjs` section 26, suite now **437**): nothing requests it during
load, AND opening Listening settings really does. A test checking only the
first would have passed on a build where Bangla playback had quietly stopped
working. Layout, navcheck and coverage (1,099/1,099) all unchanged.

v07.40 (15 Aug 2026, on Claude Code on the web) is **Shell round 14 — the
inside of Study options rebuilt to the owner's own four tablines, plus real
whole-Qur'an search, plus the first measurements this page has ever had at a
PC size.** Written from the owner's own brief, and three decisions were put to
them with numbers attached (a mockup artifact was used again, as rounds 4–11
did) and answered before any code.

**The layout.** Round 11's three bars become five, grouped the way the owner
drew them: **1** WHO — *User Role*, *Student* (their words, replacing "Tenant"
and "Person"; the element ids are deliberately unchanged, `tenantSelect`
really does still switch tenant); **2** WHAT — Study Unit, Surah, Ayah; **3**
FIND IT — Go to, Go, **Search**; **4** CLAIM IT — Approach (brought down out
of bar 1) beside *Track this unit*; **5** Reading view + Listening settings,
untouched per their "keep as it is for now". Bar order was the one genuine
ambiguity in the brief — their numbering said tabline 4, their words said
"below Tabline2" — **asked, and they chose the numbering.** Every control kept
its id and its handler; moving them was this round, rewiring them was not.
**The summary strip is removed**, as asked ("don't need to show the above
choices in words below again"). Round 11 had put that exact question to them
and they chose keep, on the stated grounds that a 77px cell cut the tenant and
Approach names to "Madrasatul Mus…" and the strip was the only place they read
in full — **so the strip was only worth removing because this round's own bars
fix that at source.** Measured: two cells to a line is **160px each instead of
77px** at 390px, and the tenant name goes from needing 224px in a 77px box to
needing it in a 160px one (still clipped on a phone, fully readable from 768px
up; in Bangla it fits outright at 390px and above). Nothing was destroyed —
the selects, their handlers and their values are all untouched (I4).

**Search is the only genuinely new mechanism, and the owner chose the widest
of four options offered.** Not "this surah only" (free, buildable inside the
round) but **the whole Qur'an in all three languages.** Built as
`tools/quran-data-pull/build-search-index.js` → three files, and the choice of
three rather than one is the load-bearing decision: **the language is picked
by the SCRIPT the person typed in**, not by the app's language setting, so a
search downloads exactly one index (Latin → `search-en.json`, Bengali → `bn`,
Arabic → `ar`) instead of all three. **Measured against the deployed site
after pushing, not estimated: 284KB / 450KB / 323KB on the wire** (4.3MB raw).
Worth knowing for the next round that sizes a file this way — `gzip -9`
locally predicted 272/363/278, and GitHub Pages compresses less aggressively
than that, so a local gzip estimate runs ~5–25% light. **Nothing is fetched on the
startup path** — the index loads the first time a search actually runs, the
same "on first use" treatment v07.39 gave the reciter timing map, and a visit
that never searches downloads nothing. Perf re-measured to prove it: Quran
Study still 6 sequential round trips / 0.89s at 150ms latency, unchanged.
`js/quran-search.js` is pure logic (no DOM, no Firebase — I2); the fetch lives
in `quran-data.js`, which stays the only place that reads these static files.

**Two details in the search worth not undoing.** Arabic is matched with the
small marks stripped from *both* sides — nobody types them — but the result is
**highlighted in the properly-pointed original**, via an `originalRange()`
that walks the original counting only the characters that survived
normalisation; the stripped form is what matches and is never what is shown.
And **the Go box now takes words as well as references**, which is the owner's
own suggestion ("you may enable 'Go To' field instead of a separate search
field"): a reference still jumps exactly as before, but only text made of
digits and reference punctuation can still produce "Couldn't read…" — real
words search instead of erroring. `goToReference()` was split out of
`applyJump()` so clicking a result navigates without overwriting what was
searched for.

**PC, measured for the first time.** The owner's own note said phone now, PC
later, and asked for the harness widened first — **so this round takes the
baseline and fixes only what the new bars needed anyway.** `layout.mjs` and
the new `tools/i18n-verify/panel.mjs` now both run at **1280×800, 1440×900 and
1920×1080** as well as the phones; nothing had ever measured this page above
768px, and it has exactly one media query (`max-width: 720px`), so every PC
size took a single untested path. Two findings, reported to the owner rather
than acted on: **the panel stops growing at 928px on any screen** (the page's
own 60rem cap — half a 1920px monitor is empty), and **every bar was a
four-column grid whatever it held**, leaving a dead 220px column beside any
three-cell bar at 1280, 1440 and 1920 alike. The second is fixed, because a
bar now declares its own column count (`.opt-bar-2` / `.opt-bar-3`, and
`align-items: stretch` moved out of `.opt-bar-3` into a new `.opt-bar-btns` —
round 11 had those two facts tangled together, which only worked while the
three-column bar was the buttons one). The first is left alone; a real PC
layout is a design change, not a fix. **A measurement trap worth keeping:**
panel.mjs's first version reported two false wraps because it compared cells'
TOP edges — a labelled `<select>` and a bare button beside it are
bottom-aligned on purpose. It groups by overlapping vertical range now.

**Verified: 468 behaviour checks** (all 437 of v07.39's, plus the five bars
asserted by control ID rather than position; both renamed labels; the summary
strip proven gone; a real English search finding real ayahs, naming the surah,
highlighting the matched word, and fetching **exactly one** index; clicking a
result moving the screen and leaving the box alone; a word in the Go box
searching while a mistyped reference still explains itself; a real reference
still jumping; unpointed Arabic matching pointed text, right-to-left, with the
vowel marks intact in the highlight; and the whole thing again in Bangla,
including Bengali script really reaching the Bangla index while the app is in
Bangla — the case that proves search language and app language are separate)
**plus `layout.mjs` reporting NO LAYOUT REGRESSIONS at all eight viewports in
both banner states** — landing page byte-for-byte identical, same wheel, same
Approach rows (5/7/4/4/10), same 9px dock gap, `getElementById` targets 65 →
68 with none missing — **navcheck unchanged in both languages** (the only
reported problem is still the pre-existing 320px ENGLISH truncation of
"Operation"/"Bookmark", which Bangla does not have), **translation coverage
1,109/1,109 (100%)** — the total grew by 10 because this round adds ten
strings, not because anything slipped — **and `tools/perf/measure.mjs`
unchanged**, which is the check that proves a layout round added no Firestore
reads. One real defect was found by reading a rendered result and not by any
report: `surahName()` needs the English name handed to it, so results first
read "2:45" — a bare number, in the one feature whose whole point is finding
what you cannot number.

**Flagged, not changed:** the **"Edit banner" control still has no home
anywhere in the app** (removed from this panel in v07.29). This round was
asked to raise it if a natural place appeared — it did not. The rebuilt panel
is now tightly about studying, and putting a tenant-admin control back into it
would undo exactly what v07.29 was for; it belongs in the Settings surface
`LAYOUT-BACKLOG.md` item 1 describes, which still does not exist. No
`firestore.rules`, schema or Firestore data changes — but note the two rules
changes written and **still not deployed** (v07.18 Homework teacher-scoping,
v07.37 `appLang`) are unaffected by this round and still pending.

v07.41 (15 Aug 2026, same day) is **shell round 15 — three tightenings of
round 14's own panel, from the owner reading it straight after it shipped.**
No new mechanism; all three are things round 14 left on the table.

**(a) Search and Go are one control now.** The field was already dual-purpose,
so a "Go" button, a "Go to" title and a separate "Search" button were **three
names for two things** — the owner's point exactly. Bar 3 is now one
full-width field titled **Search** with one **Search** button, and the button
is smart rather than two buttons in a trenchcoat: a reference jumps, words
search, a mistyped reference still explains itself. `jumpGoBtn` is **gone**
(the one id this round retires — merging two controls means one id has to go;
`searchBtn` was kept because it is what the control now is, and it already
carried the `aria-controls`). Measured: the field's line goes from 216px + a
105px button cell to **327px** at 390px.

**(b) "Track this unit" → "Track"**, and bar 4 stops splitting 50/50 — it is
`minmax(0,1fr) auto`, so the button takes only its own word and Approach
takes the rest. **Measured at 390px: Approach 160px → 275px**, against the
93px "Memorise (Hifz)" actually needs, so a tenant-authored Approach name is
now readable in full on a phone rather than merely less clipped.

**(c) With Range on, "To ayah" no longer drops to its own line.** The fix is
that **bar 2 is FLEX now, not grid**, and that is the whole point: a grid has
to declare its column count up front, but this bar holds three cells normally
and four with Range on — so a 3-column grid pushed "To" down, and a 4-column
one would have left a dead column the rest of the time, i.e. exactly the PC
waste round 14 had just removed. Flex sizes itself to what is visible. The
ayah-number cells are pinned narrow (`.opt-cell-num`, 4.1rem) since three
digits never need a share of the line, which also hands Study Unit and Surah
**105px → 124px each** when Range is off. `From ayah`/`To ayah` shortened to
**From**/**To** — at the width three digits need, the longer labels were
silently ellipsised, and these labels are `nowrap` + `text-overflow: ellipsis`,
so that failure is invisible. **Measured at every width in both languages,
both unit types: all five bars on one line, nothing truncated, no overflow.**

**One real cost, found by measuring rather than after the fact:** at **320px**
fitting four cells on one line left English's "Study Unit" needing 69px in a
65px box. Fixed with the page's **second** media query (`max-width: 340px`),
which trims the number cells to 3.4rem and the labels of that one bar to
0.67rem. Bangla already fitted at 320px and still does. Worth knowing that
320px is *below every viewport in the harness* (which starts at 360) — it was
caught by a deliberate one-off sweep, not by the suite.

**Verified: 475 behaviour checks** (was 468 — seven new: the merged control,
the one-word claim button, Approach measurably winning its line, and the four
Range-on-one-line assertions) **plus `layout.mjs` NO LAYOUT REGRESSIONS at all
eight viewports in both banner states** (`getElementById` targets 68 → 67,
exactly the retired `jumpGoBtn`, none missing), **navcheck unchanged**,
**coverage 1,107/1,107 (100%)** — the total *fell* by 2 because "Go" and "Go to"
stopped being used on any screen; both keys are kept in `bn.js` rather than
deleted, as are "Track this unit", "From ayah" and "To ayah" — **and perf
unchanged** (6 round trips, 0.89–0.91s).

**One stale test was found and fixed, and it is the useful lesson here:**
`behaviour.mjs`'s "the version badge is NOT mangled into Bengali digits"
asserted the literal `/v?0?7\.3/`, which quietly made it a test of *which
release we were on* — it failed the moment v07.39 became v07.40, reporting the
correct value as wrong. It is written against the *shape* now
(`/^v?\d+\.\d+$/` plus no Bengali digits), so a version bump can never fail it
again. Note this means round 14's reported "468 passed, 0 failed" was run
**before** its own version bump; the bump surfaced this, and nothing about the
app was wrong.

v07.42 (15 Aug 2026, same day) is **shell round 16 — a second squeeze, and a
real Arabic search defect found by the owner's own question.**

**The owner asked whether Search does PHRASES or only single words. The
honest answer needed testing, not reading the code — and testing found a
genuine miss.** English and Bangla phrases worked (the match is a plain
substring, so several words in a row match as one). **Arabic phrases largely
did not, and silently.** The Uthmani script writes some long A sounds as a
**superscript alef** rather than a full one: 1:2's `ٱلْعَٰلَمِينَ` contains no
plain alef at all, so `رب العالمين` — typed the only way anyone would type it
— returned **nothing**. Not an error, not "0 results because it isn't there":
a correct query answered wrongly. Stripping the mark cannot fix it (the two
sides still differ by a letter) and folding the mark INTO an alef breaks the
opposite case (`الرحمن`, typed without one against a text carrying the
superscript one — the case round 14's own test happened to cover, which is
why it passed). **Fixed by dropping the alef entirely from the comparison on
both sides**, the alef-insensitive matching Qur'an search tools generally
use. `رب العالمين` now returns 42, `مالك يوم الدين` returns 1. The accepted
cost, stated rather than hidden: two words differing only by an alef stop
being told apart (قال/قل), so Arabic search is slightly broader than literal
— which beats silently empty. `originalRange()` needed one more line for it:
the highlight now extends BACKWARDS over dropped characters too, or a word
beginning with a dropped alef was highlighted from its second letter.
**`isDropped()` is now the single source of truth** that `normalize()` itself
calls, so the two can never disagree about which characters survived — that
agreement is what the whole highlight mapping rests on.

**The squeeze (the owner's ask: "'to' and 'from' can be squeezed a little to
make more room for the Surah name").** Measured the floor first rather than
trimming by feel: three digits need 22px of text plus the dropdown arrow's
~18px and 8px of padding, so ~48px is where the arrow starts crowding the
number. `.opt-cell-num` goes **4.1rem → 3.1rem (50px)**. **The LABEL, not the
box, turned out to be the binding constraint** — "From" needs ~58px at the
normal 0.72rem — so those two cells take a 0.66rem label, and that is what
actually buys the width. **Measured at 390px: Surah 124px → 132px with Range
off, 104px with it on; at 412px, 143px/115px — so the longest English surah
name (113px) now fits outright.** Bangla's longest needs 95px and fits from
390px. **And it removed the media query round 15 added:** nothing truncates at
320px any more, so the page is back to **one** screen-size rule, where it
started.

**Verified: 479 behaviour checks** (was 475 — four new, all phrase cases: an
English phrase matching as a phrase, the Arabic phrase that used to find
nothing, its highlight proven to cover both words with their marks and to
start at the first letter, and a Bangla phrase) **plus `layout.mjs` NO LAYOUT
REGRESSIONS at all eight viewports in both banner states** (`getElementById`
67 → 67), **navcheck unchanged**, **coverage 1,107/1,107**, **perf unchanged**.
A full sweep at 320/360/390/412/768/1280/1920 in both languages and both unit
types confirms five bars, one line each, nothing truncated, no overflow.

**Two notes the owner asked to have recorded properly, now `LAYOUT-BACKLOG.md`
items 7 and 8** — read them there before acting on either. In short: **(7)
"Edit banner" is doable and small** (~half an hour, no schema or rules change,
owner/prime-gated, markup recoverable from the v07.29 commit) and is only
homeless because the rebuilt study panel is the wrong place for a tenant-admin
control; its natural home is Home → Settings. **(8) The "choice status
writing" comes back as a "current study" readout under a toggle** — and the
item is explicit that this is **not** a revert of the removed summary strip:
it should name the CONTENT being studied rather than echo the pickers, sit
behind a disclosure (the page already has that idiom three times over, do not
invent a fourth), and the owner must be asked one question first — whether it
belongs inside Study options or on the landing screen near the dock, the
latter costing landing height that rounds 9-12 spent themselves reclaiming.

v07.43 (15 Aug 2026, on Claude Code on the web) is **shell round 17 — the
reading screen. The Qur'an itself stops being displayed inside a drawer.**
The owner's own words, and the whole specification: *"When all
selections/choices are picked, then what happens? The outcome — the Quran,
Translations, the word-by-word — displays inside the same palette. How absurd!
Once the selection is done, the outcome should now show and take the entire
mobile screen except the Banner, the top menu and the bottom menu. And that
also should have an option to hide (tapping on screen should show it again)."*

**This undoes a v07.24 decision, deliberately and with the owner's own
reversal.** Shell round 7 put the Study screen inside `#panelStudyOptions` on
their call at the time ("the stuff inside the 'Study' can even better make
sense within the 'Study Options', user do not have to click more for those
things"). **Measured, that put the Qur'an 447px down inside a panel capped at
`74dvh`, under five bars of controls: 193px of visible ayah content on a
390×844 phone, 87px at 390×700 and 42px at 360×640.** Forty-two pixels of
Qur'an. The reading is now a **stage view of its own**, reached from a third
dock tab.

**The shape was the owner's decision, taken from a working two-phone demo
rather than a description** (an artifact, as rounds 4–14 have used), with the
pixel cost of each option measured and attached. Two were offered: reading as
its own screen you switch to (A), or reading replacing the wheel until closed
(B). **The recommendation here was B; the owner chose A, and their reason was
better than the recommendation:** in B, once reading is open the Study options
tab is the natural place to put "back to reading", which costs a tap to reach
the settings — and **the settings change per child**, which is the app's most
common real workflow (D10). A keeps Study options one tap away at all times.
Recorded because it is the second time this project has had a "reading vs
options" trade decided by how the owner actually teaches, not by layout logic.

**What was built.** `#stage` now holds two views and shows one: the Mastery
Wheel (the landing screen, untouched) or `#readView`. The wheel heading and
`#wheelSection` stay **direct children of `#stage`** on purpose — every
measured sizing rule this page has keys off that, so the wheel's own layout is
byte-for-byte what rounds 9–14 left it. `#readView` carries a read bar
(◂ Mastery Wheel · what is being read · ⤢ Full screen) that does NOT scroll,
over `#readScroll`, which is the only thing that does — so Previous/Next and
the way back stay reachable however long the ayah is. The dock's third tab is
`#tabReadBtn`, a **view switch, not a disclosure**: `aria-pressed`, no caret,
and excluded from `dockTabs` (which `closeAllPanels()` resolves by
`data-panel` and would have thrown on).

**The three answers the owner gave, all asked before building.** *Full screen*
is exactly their shape: **a button hides** the title, tagline, banner, nav and
dock, and **a tap on the reading restores them** — nothing ever hides on a
stray tap, and a tap on a button, checkbox or notes box inside the reading is
left alone. *Page display* (a real mushaf page) **opens immersive**, since a
page is a page. *A multi-ayah unit opens at its **first** ayah* — read from
`currentUnitAyahBounds()`, which is already what "Track this unit" claims
against, so the reading opens on the same ayah the claim starts from with no
second source of truth. *Explore stays exactly as it is.*

**Two real defects were found by measuring, before either shipped, and both
were invisible in a screenshot.** `hidden` on `#wheelSection` **did nothing** —
`.wheel-box` sets `display:flex`, and a class rule beats the UA's own
`[hidden] { display: none }` — so the wheel stayed on screen and pushed the
reading **632px down an 844px phone**, which is the exact defect this round
exists to remove, reappearing in a new place. And the phone full-bleed rule,
copied from the wheel card, was put on `#studyScreen` **inside** the scroller
rather than on the scroller itself, giving every phone a sideways scrollbar.
Both are now their own assertions in `reading.mjs`.

**Measured result** (`tools/i18n-verify/reading.mjs`, new and checked in — the
first tool this project has had that measures the reading at all, which is why
the defect survived ten layout rounds). Banner cleared, English: **390×844,
ayah content visible 193px → 432px, i.e. the whole ayah, with 643px of reading
area (798px in Full screen); 412×915 → 714px; 390×700 87px → 426px; 360×640
42px → 306px of 432px needed, 594px in Full screen.** The reading starts 214px
down instead of 447px. Bangla measures the same. **`layout.mjs` reports NO
LAYOUT REGRESSIONS at all eight viewports in both banner states** — landing
page byte-for-byte identical, same wheel, same Approach rows, same 9px dock
gap, `getElementById` targets 67 → 74 with none missing — **navcheck unchanged
in both languages** (the only reported problem is still the pre-existing 320px
ENGLISH truncation of "Operation"/"Bookmark"), **coverage 1,110/1,110 (100%)**,
and **`tools/perf/measure.mjs` unchanged at 6 sequential round trips / 0.89s**,
which is the check that proves a layout round added no Firestore reads.
**Verified: 505 behaviour checks** (was 479 — 26 new, section 29: the Study
screen proven gone from the panel and present on the stage, the wheel proven
hidden by *computed display* rather than by the `hidden` property alone, Study
options still one tap away while reading, Full screen hiding all three strips
with the Qur'an still there, a tap restoring them, a button press inside the
reading *not* exiting Full screen, tapping Read again returning to a really
redrawn wheel, a Ruku' opening at its own first ayah, and all of it in
Bangla). One failure during the run was a **wrong assertion, not a defect** —
ayah 10 of Surah 2 sits in Ruku' 2, which runs 8–20, so "the first ayah of the
unit" is 8 and not 1; the check now reads the unit's start out of the
reference line instead of hardcoding a number. No `firestore.rules`, schema or
Firestore data changes — nothing to deploy but the static files. (The two
rules changes still pending from earlier rounds — v07.18 Homework
teacher-scoping and v07.37 `appLang` — are unaffected and still not deployed.)

v07.44 (16 Aug 2026, on Claude Code on the web) is **shell round 18 — the
owner's own fix list after using round 17's reading screen.** Five asks, all
from real use, all built. Three decisions were put to them first and answered.

**(a) A Ruku', Juz, Hizb or Page is now CHOSEN BY ITS NUMBER.** Before this
those units were only ever *inferred* from whichever ayah happened to be open:
choosing "Juz" claimed the juz the current ayah sat in, and there was no way
to say "Juz 17" without first finding an ayah inside it. Bar 2 gains one cell
whose label rewrites itself per unit type (Ruku' № / Juz № / Hizb № / Page №)
— one cell doing four jobs is what keeps the bar on one line — plus a readout
naming what the chosen unit covers. **The owner's own rule for a unit spanning
several surahs: name the TOP and the BOTTOM only, never the ones in between**
("Surah 2 142 → Surah 3 9"). Picking a number loads that unit's own surah if
it is a different one and lands on its FIRST ayah, the same rule round 17 set
for the Read tab. **They chose "also pickable" over a read-only readout**, so
the Surah picker stays alongside and the two agree in both directions.

**(b) Hizb is a real Study Unit at last** — `unit-keys.js` has listed it in
`UNIT_TYPES` since Phase 5 with nothing able to select it. **No re-pull was
needed and that is why it fitted in this round:** every pulled ayah already
carries `hizbQuarter`, and a hizb is four quarters, so
`tools/quran-data-pull/build-hizb-index.js` derives the 60-row table offline
from data already on disk — the same discipline as the juz and page tables
(scan the real field, never hand-type boundaries), and it refuses to write if
the quarters do not run 1–240 without gaps or the hizbs do not come out at
exactly 60. Records chunking needed no decision: hizb is Quran-wide, so it
falls to `subject_quran` exactly as juz and page already do.
**None of the three tables joins the startup path (I9)** — each is fetched the
first time that unit type is actually chosen (4KB / 12KB / 64KB), so someone
who never picks one downloads none of them. Verified by a check that fails if
any of them is requested during load.

**(c) Play / Pause / Stop / Whole surah are ON the reading screen**, not two
taps away inside Listening settings. This needed a real `pause()`/`resume()`
in `audio-player.js`, and **the difference from `stop()` is the whole reason
both exist**: `stop()` clears the playlist, so a whole-surah run ends and Play
restarts it from the top; `pause()` deliberately leaves the position and the
queue alone, so Play resumes mid-ayah and the surah carries on. Play resumes
rather than restarts whenever something is sitting paused — restarting an ayah
someone deliberately paused is the wrong answer to the same tap.

**(d) Reading view is always visible now** (the owner: "displayed visible to
enable less tap instead of pop-up") **and Tajweed, Word-by-Word and the
translations are all tickable at the same time**. Their call, asked first:
**the ticks ADD to whatever the Approach declares rather than replacing it**,
so an Approach still means what it always meant and what "Track this unit"
claims is untouched — this changes what is on screen, never what is recorded.
**Listening settings deliberately STAYS behind its button, and the reason is
load speed, not layout**: opening it is what fetches the Bangla reciter's
460KB timing map (v07.39), which must not reach anyone who never listens.
`prefs.js` gained an additive `getQuranTranslationLangs()`/`setQuranTranslationLangs()`
pair, because the old single-value preference **could not express two of the
four answers** — Bangla alone, or neither (Arabic on its own). The old getter
and setter are untouched and still mean what they meant, so the 8 Aug 2026
Bangla-reciter rule and anything else reading them keep working; the set is
stored under its own key and starts, on a device that has never seen it, from
whatever the old preference already said. **No migration.**

**(e) One reciter list, not two.** The owner, reading the Listening card:
*"'Listening Settings' shows reciters names multiple times. 'Drill Reciters'
already shows the reciters, redundant is the top pop-up one."* They were
right — a `<select>` of every reciter sat directly above a checkbox list of
the same reciters. **The select is what went**, because the checkbox list is
the one that can express "these three"; the single-reciter actions now read
the first ticked one. Their other two points fall out of the same change: the
play buttons sit below the reciters (the drill's own do), and the pair that
duplicated them moved to the reading screen, which is (c).

**Verified: 538 behaviour checks** (was 505 — 33 new, sections 30 and 30l:
every unit type's picker with its real count (30 juz / 60 hizb / 604 pages /
a surah's own rukus), option VALUES proven still plain numbers, Juz 5 really
loading Surah 4 and landing on ayah 24, a two-surah juz reading top → bottom
while a one-surah juz does not, the boundary tables proven absent from the
load path and present on first use, all four reading ticks rendering at once,
**Bangla alone proven expressible** — the thing the old picker could not say —
the duplicate reciter picker and play buttons proven gone with each reciter
named exactly once, the transport present with Pause correctly disabled while
nothing plays, and all of it again in Bangla with Bengali digits).
**`panel.mjs` now measures bar 2 under THREE unit types** (three cells for
Single Ayah, four for a numbered unit, five for Range) — measuring only the
default measured the easiest case and proved nothing about the other two; all
three hold one line with nothing truncated at all eight viewports in both
languages. **`layout.mjs` NO LAYOUT REGRESSIONS** (landing page byte-for-byte
identical, `getElementById` targets 74 → 83, none missing), **`reading.mjs`
OK in both languages**, **navcheck unchanged** (still only the pre-existing
320px English truncation), **coverage 1,126/1,126 (100%)**, **perf unchanged
at 6 sequential round trips**. One failure in one run was the sandbox's proxy
blocking archive.org's poster images (section 22h), environmental and
unrelated — it passes when that host is reachable. No `firestore.rules`,
schema or Firestore data changes.

**Flagged, not built: choosing a translation by TRANSLATOR is still not
possible, and it is a data job, not a picker.** `tools/quran-data-pull`
packages exactly one English and one Bangla translation per ayah, so "multiple
translations at the same time" means those two — which now really can both be
on. The disabled Translator control says so in plain words on screen rather
than promising something the data cannot do. See `LAYOUT-BACKLOG.md` item 4.

v07.45 (16 Aug 2026, on Claude Code on the web) is **shell round 19 — an
Approach is a way of studying, not a gate on it.** The owner stated this as a
standing correction, and it is worth treating as a rule rather than a round:
*"The Approaches are meant to be only one special way of using this app, study
the Quran. It doesn't dominate the entire Quran Study Module. So no approach
blocks the regular study process; therefore all study options (including
listening) always remain active whatever approach is chosen."*

**The code disagreed with them, and by a lot. Measured before building, from
`catalogue-data.js`: of the 32 Approaches, 12 declare no `text` panel** — pick
one and the Qur'an itself vanished from the reading screen — **25 no `audio`**,
so Listening settings disabled itself and opened to "this Approach has no
listening panel", **26 no `loop`, 31 no `wordByWord`.** So on most Approaches
the app quietly took the Qur'an, the recitation and the loop away. One rule
change fixes all of it: **an Approach's `panels` list is what the screen OPENS
with, never what it permits.** Concretely, `renderStudyScreen()` now always
includes `text`, the reader's ticks add on top, and nothing anywhere consults
`panels` to decide whether a control is available. The Approach's own working
panels — notes, reflection, writing, the checklist — still come from the
Approach, which is the owner's own call ("we will design that later according
to the nature of the approach").

**The panel is reorganised to match, from a demo they approved.** Listening is
now a section exactly like Reading view: **no button, no second "Recitation"
heading, no Stop** (Stop lives on the reading screen, where the listener
actually is), one reciter list, then **Repeat / Mode / Loop / Play on one
line** — "Play", not "Play Drill". **There is no fifth bar of buttons left at
all.** The disabled **Translator** placeholder is gone too, on their
instruction: when real translations exist it returns as a Translation toggle
with the languages inside it.

**Mushaf view is a reading tick now, and it works on a single ayah** — their
own ask, for a one-ayah memorising programme: "I need to see where it sits in
the Mushaf view, grey out the rest makes it focused." So the old four-value
"Page display" picker (mushaf / tajweed / wordByWord / translation), which only
appeared for Whole Surah and Range, is **retired** — `pageDisplayMode` is gone
and those choices are the ordinary Reading view ticks, which now work the same
way whatever the unit. Mushaf is the one choice that cannot share the screen,
so ticking it **disables the other four rather than hiding them**, with a line
saying why. `getMushafPagesForKeys()` needed nothing new: it was always happy
with one ayah key.

**The one real cost this round had, and how it was paid.** v07.39 stopped
fetching the Bangla reciter's 460KB timing map on every visit by tying it to
*opening the Listening card* — and this round deletes that card. The owner saw
the gap themselves and named the case: someone arrives at the reading screen
from a bookmark, never opens Study options, and presses Play. **Fixed in two
halves.** The map is warmed from every gesture that can precede Play (opening
Study options, opening the reading screen, ticking a reciter, and Play itself),
and `audio-player.js` gained **`unlockAudio()`**, called SYNCHRONOUSLY inside
the Play tap before any `await`: touching the shared `<audio>` element inside
the gesture marks it user-activated, after which a later programmatic `play()`
is allowed even though a fetch happened in between. That is what makes Play
safe from a cold start without putting 460KB back on the load path — proven by
a check that fails if anything requests it during load, and another that it IS
requested when the reading screen opens.

**Ordering — "a translation should show above another, a recitation to play
before another" — is NOT built, deliberately, but the data now supports it.**
`setQuranTranslationLangs()` keeps the caller's order instead of forcing its
own, and ticked reciters are stored in the order they were TICKED rather than
the order they are listed. Nothing shows that order yet; when the owner asks,
it is a UI job rather than a data migration. See `LAYOUT-BACKLOG.md` item 11.

**One real regression was caught by the suite during the build, before it
shipped:** the first version made *every* multi-ayah unit render as a flow, so
a Ruku'/Juz/Hizb/Page stopped reading ayah by ayah and lost Previous/Next —
beyond what was asked, and it left a stale position readout on screen. Which
units use the flow renderer is unchanged from round 18 (Whole Surah and Range);
Mushaf is the only thing layered on top. There is now a check for exactly that.

**Verified: 557 behaviour checks** (was 538 — 19 new, sections 31 and 31f:
Listening proven a section with no button, no "Recitation", no Stop, Play
renamed, Translator and Page-display gone; **an Approach declaring no audio
proven to still offer every reciter, Loop, Play and all five reading ticks,
with the Qur'an on screen** — the rule itself; Mushaf greying rather than
hiding the others, saying why, and working on a single ayah; a Ruku' still
reading ayah by ayah; and the timing map absent from the load path but warmed
by opening the reading screen). **`layout.mjs` NO LAYOUT REGRESSIONS**
(`getElementById` targets 83 → 80 — exactly the three removed controls — none
missing), **`reading.mjs` OK**, **`panel.mjs` no truncation and no wrapped bar
at any of the eight viewports in either language**, **navcheck unchanged**,
**coverage 1,121/1,121 (100%)**, **perf unchanged at 6 sequential round
trips**. No `firestore.rules`, schema or Firestore data changes.

v07.46 (17 Aug 2026, on Claude Code on the web) is **shell round 20 — the
moving tagline strip, and the first screen the owner edits their own app
content from.** Their ask: a single line under the app banner that cycles
through short taglines, some carrying a link — some opening a page inside the
app, some an outside site in a new tab — with them as the only person who can
add or edit them. A demo artifact was shown first (the movement options side by
side, with the pixel cost attached), the same way rounds 4–14 were agreed, and
**five decisions were taken before any code was written.**

**(a) The strip stands EXACTLY where the static tagline stood — not an extra
line.** Their call, and also the cheap one: **measured, the strip is 19px
against the paragraph's 23–24px**, so the landing page starts 3–6px HIGHER on
every phone and **gains an Approach row at 390×844** (6 → 7, banner cleared).
An extra line below the tagline would have cost one row on three of the four
phones — measured first, in `tools/i18n-verify/tagline-cost.mjs` (new, checked
in), which is the tool to reuse for the next thing anyone proposes putting up
there. Desktop sits 1px lower, changing no row count anywhere. **The first line
is still static markup**, exactly like the sign-in strip (v07.08): with no
JavaScript, or before the tenant's own lines arrive, the page reads precisely
as v07.45 did, and if the line whose turn it is already says the same thing,
nothing moves at all.

**(b) Quran Study page only, for now** — module-tagging a line is round 2.
**(c) Flip, Fade and Slide up all ship and the owner picks** ("so i can choose
often, gives a variation"); Ticker was dropped. **(d) It changes ONCE PER
VISIT**, which is the whole character of the thing and their own words: "No
change will be frequent. A few might stay for days, a few once a day. maximum 1
change per session could be." So a line carries a **hold measured in days**
(Every visit / One day / Three days / One week / One month) and the strip is a
still line with one noticeable movement, not a carousel. **(e) The lines live
on the TENANT DOCUMENT**, edited from the new `taglines.html` (Home →
Settings, owner/prime only). **No extra read, no new collection, no
`firestore.rules` change** — `loadContextData()` already fetches that document
and `canAdminIdentity()` already lets owner/prime write it. That is the v07.37
lesson applied a second time: before adding a read, check what the startup path
already reads. **Perf re-measured to prove it: 6 sequential round trips, 0.88s
at 150ms latency, unchanged.**

**`js/taglines.js` is pure (I2)** — no DOM, no Firebase — so the rotation rule
is testable without a browser, which is exactly how the round's worst defect
was caught. It ships **six lines**: the five from the approved demo plus the one
the owner added by name ("Quran (calls) for Critical Reasoning"). Four carry no
link, because they said they would set them later; two DO, so both kinds are
demonstrably working on day one (`asma-study.html` inside the app, and the
archive.org poster page they supplied back in v07.15, in a new tab with
`rel="noopener"`). A line can also be **attached to one ayah** (`ayahRef`,
written `2:255`) and appears the moment that ayah is open — their "an article
about the Ayah" — interrupting the ordinary line without advancing it. **I4:
there is no delete**, only Retire, which keeps the words and the link; **I5:
every line has a permanent id and order is separate**, so re-ordering never
disturbs the remembered state; **I11: text is language-keyed**, and the six
shipped lines reach Bangla through `langText()` → `t(value.en)`, the read-time
path phase 3 built, so they are translated with no data migration.

**Two real defects were found by measuring, not by reading, and both are worth
knowing if this code is touched.** Asked again during the same visit — which
happens on **every ayah change**, because an ayah-attached line has to be able
to appear — a line whose hold is "every visit" advanced EVERY time: paging
through five ayahs walked five lines, i.e. precisely the carousel the owner did
not want. `pickTagline()`'s new `lockedId` is the fix, and the rule test now
asserts it in both directions (locked line stays; an ayah's line still
interrupts). And the outgoing line **kept the `tagline-in-*` class it arrived
with** — both rules set the `animation` shorthand, so the out animation never
ran and the old line sat on top of its replacement for ~800ms until the safety
timeout swept it up. Neither was visible in a screenshot.

**The coverage tool was wrong for the SIXTH time in seven rounds, and again
about the denominator:** a language-keyed literal written in code
(`text: { en: "..." }`) matched none of its patterns, so all six shipped
taglines were invisible — the report would have said 100% with six English
lines on the landing page of a Bangla reader's app. An `en:` matcher is added,
escape-aware like the `label:` one phase 6 fixed. **The standing rule holds:
the coverage number is a to-do list, never evidence.** Also recorded in the
harness README: `app/_prev-quranrevival.html`, the shim `layout.mjs` compares
against, is itself a `.html` file in `app/`, so the coverage total reads
1,171 → 1,277 with 0 missing while it exists — the old page counted twice, not
106 new strings. Delete the shim before reading the number.

**Verified: 601 behaviour checks** (was 557 — 44 new, sections 32–32l: the
strip present and no taller than what it replaced; the page still reading its
own tagline before the tenant's lines land; nothing moving a second in, then
the line arriving once after the owner's own delay; a held line NOT giving way
and its hold not silently restarted; an expired hold handing over; an outside
address proven a real `<a target="_blank" rel="noopener">` marked in words as
well as an arrow, and an in-app one proven to stay in the same tab; an ayah's
own line appearing as soon as that ayah is open and the ordinary line — the
SAME one — coming back after; nine assertions on the pure rule including the
lock and a remembered line that no longer exists; a tenant's Bangla line and a
shipped English-in-code line both really rendering in Bangla; and the editing
screen end to end — every line listed with retired ones included, Save inert
until something changes, adding, retiring-not-deleting, re-ordering, a mistyped
ayah explaining itself, the write landing on the tenant document carrying
exactly `taglineSettings,taglines,updatedAt`, the whole screen in Bangla with
option VALUES proven still bare ids, and the link offered to owner/prime
only). **`layout.mjs` reports NO LAYOUT REGRESSIONS** at all eight viewports in
both banner states (`getElementById` targets 80 → 81, none missing),
**`reading.mjs` OK**, **`panel.mjs` no truncation and no wrapped bar**,
**navcheck unchanged** (still only the pre-existing 320px ENGLISH truncation of
"Operation"/"Bookmark"), **coverage 1,171/1,171 (100%)**, **perf unchanged at 6
sequential round trips**. No `firestore.rules`, schema or Firestore data
changes — nothing to deploy but the static files. (The two rules changes still
pending from earlier rounds — v07.18 Homework teacher-scoping and v07.37
`appLang` — are unaffected and still not deployed.)

**Flagged for the next round, in `LAYOUT-BACKLOG.md` item 12:** per-module
lines (the other half of the owner's own "which one to appear with which
module" — the strip has to reach the other pages first, and a `moduleIds[]`
field alongside `ayahRef` is where it hangs), a line attached to a RANGE rather
than a single ayah, and the fact that **Settings now has a real screen in it**,
which makes it the natural home for "Edit banner" (item 7) whenever that is
picked up.

v07.47 (17 Aug 2026, same day) is a **correction to v07.46, from the owner's
own screenshot of the live page:** *"The top menu bar jumps up after 1 sec of
loading and covers the tagline, in mob and tab it covers 70%."* They were
right, and the measurement found a real defect **plus a wrong number in
v07.46's own report.**

**The defect.** `body` is a flex column (shell round 7), and the strip shipped
as a flex item with `height: 19px` — so it was **shrunk** whenever the column
was tight. Measured at 390×844: the strip was given **16px for a 19px line**,
and its own `overflow: hidden` cut the bottom off the words. It shrank further
the moment `renderNavBar()` filled `#navBar` a second into the load, which is
exactly what the owner saw as the menu jumping up and covering the tagline. The
old `<p>` could be shrunk too, but its overflow was visible, so nothing was
ever clipped — the clipping is what the fixed height introduced. **Fixed with
`flex: none` and a content-derived `min-height: 1.3em` instead of a px height**,
so the box cannot be wrong at any font size, in any language, or if a phone's
own text-size setting scales the page. The line that is ARRIVING now stays in
normal flow (it is what holds the strip open); only the line that is LEAVING is
taken out of flow, for the ~0.3s it animates away.

**And the number v07.46 got wrong.** That round reported the strip as "3–6px
cheaper than the paragraph it replaces, gaining an Approach row at 390×844".
**That gain was the bug** — the strip only looked shorter because it was being
squeezed. Measured against **v07.45**, the last build before the strip: the
landing page is now **identical at 390×844, 412×915, 390×700 and 360×640 in
both banner states** — same wheel-heading top (148px / 103px), same Approach
rows (5/7/4/4 and 6/8/5/5), same wheel width, same 9px dock gap. Desktop is
1px lower. So the honest position is **exact parity: the strip costs nothing
and gains nothing**, which is still the right answer to the owner's original
"don't add a line", but it is not the bonus row that was claimed. The
`tagline-cost.mjs` prediction was sound; what shipped did not match it, and the
regression suite could not see the difference because **it compares against the
previous commit, which by then was the clipped build**. Worth remembering:
`layout.mjs` proves "nothing changed since last time", never "this is right" —
when a round is a correction, re-measure against the last KNOWN-GOOD commit
(`git show <sha>:app/quranrevival.html`), not just `HEAD`.

**Verified: 613 behaviour checks** (was 601 — 12 new: at 390×844, 768×1024 and
1280×800, in both languages, the words are proven not clipped by the strip AND
the strip proven to stay one line tall while a change is in flight, which is the
new risk the in-flow fix introduces). `layout.mjs` **NO LAYOUT REGRESSIONS**
against v07.45's own copy of the page. No `firestore.rules`, schema or data
changes.

v07.48 (17 Aug 2026, on Claude Code on the web) is **shell round 21 — the
reading screen gets Prev and Next, and full screen becomes a choice rather
than a behaviour.** Two owner asks from real use. A demo artifact was shown
first with the measurements attached (the way rounds 4–20 were agreed) and
four decisions were put to them and answered before any code.

**(1) A tap on the reading TOGGLES full screen, both ways** — their words:
*"tapping on the screen will take the entire mobile screen edge to edge,
tapping again will move it back to normal with the top and bottom menu
bars."* This deliberately **reverses round 17's own rule** that a tap only
ever restores ("nothing hides on a stray tap"), which was that round's
considered choice and is now overruled by the owner's own use. A tap on a
control is still left alone, and so is a tap that is really the end of
SELECTING TEXT — otherwise highlighting an ayah to copy it would flip the
screen away, which no screenshot would ever show.

**(2) Prev and Next move THE UNIT, whatever the unit is** — the owner's rule:
*"any choice which reflects in the reading screen should have a button to
choose next of the same choice (example, if a range of 5 Ayat is chosen, then
the 'next' button should bring the next 5 Ayat)."* One button, seven meanings,
read off `currentUnitType`: the next ayah, the next five, the next surah,
ruku', juz, hizb or page. They flank the line naming what is being read, which
is where the owner asked for them. **The "◂ Mastery Wheel" button is gone**, on
their own reasoning — the dock's Read tab already toggles the stage back, so it
was a second way to do one thing. **Full screen survives**, in the slot the
separate Pause button vacated when Play was merged with it (their plan, and
measured to cost nothing: four buttons still hold one line at 360px).

**The full-screen question came back bigger than it went out, and that is the
round's real substance.** Asked whether full screen should ALSO hide the
reading screen's own two bars — 88% of the phone against 99%, measured both
ways — the owner answered neither: *"enable the options to hide everything,
show banner, show top and bottom menu, show only top menu, only bottom menu,
show the next buttons, play button, enable all choices to show individually or
together."* So `body.immersive-read` now means only "full screen is on", and
**five independent `fs-hide-*` classes** say what that means today, set from a
stored preference at the moment it goes on. Reading view carries a **"Full
screen hides"** group — Banner / Top menu / Prev and Next / Play controls /
Bottom menu — all ticked by default, which is their original "the entire mobile
screen edge to edge". localStorage (`mm_reading_fullscreen_hides`), the same
additive shape round 18's translation set took: **no new startup read, no
collection, no `firestore.rules` change** (I9 untouched, and perf re-measured
to prove it — 6 sequential round trips, unchanged). An empty set is legal and
the card says so on screen, rather than leaving a gesture that silently does
nothing.

**Measured** (`reading.mjs`, banner cleared, English, same method as rounds
17–20): full screen goes **742 → 836px at 390×844 — 99% of the phone, from
88%** — 813 → 907 at 412×915, 598 → 692 at 390×700, 538 → 632 at 360×640.
Ordinary reading gained too, because the Single-Ayah inner buttons are now
hidden as duplicates: **ayah content visible at 360×640 goes 205 → 263px**, and
the reading starts 13px higher at every size. `#studyScreen`'s own 17px side
padding comes off in full screen, so "edge to edge" is literal rather than
nearly.

**A real pre-existing defect this round fixes, found by measuring and invisible
in a screenshot.** `#readRef` — the one line naming what you are reading — is
`nowrap` + `text-overflow: ellipsis`, so it **fails silently**, the same trap
the nav has. With Surah 2 open it had 139px at 390px and needed **220px** for
"Ruku' 1 of Surah 2 (ayahs 1–7)", i.e. it read "Ruku' 1 of Sur…"; at 360px even
"Surah 2, Ayah 1" was cut. Dropping the two flanking buttons hands it 245px.
The owner's own layout plan fixed this for free — it now has its own check.

**Three more decisions, all asked and answered before building.** **Next
carries on into the next surah** — it used to stop dead at a surah's last ayah
while Juz/Hizb/Page crossed by nature, so Next meant two different things; the
only real ends now are 1:1 and the last ayah of 114. **Both prev/next pairs are
kept** — the read bar moves the UNIT, the row under the text still moves the
AYAH inside a Ruku'/Juz/Hizb/Page; for Single Ayah the two would be identical,
so **only the two buttons hide** and the row stays, because `#ayahPosition`
beside them is the one place the surah's total is written ("Ayah 1 of 286").
Hiding the row outright would have taken real information off the screen to
remove a repetition. **Play doubles as Pause**, reading the audio's real state
through a new additive `setPlaybackStateHandler()` in `audio-player.js` — fired
on play/pause/ended from ANY cause, so the button can never sit there reading
"Pause" with nothing playing; the Play handler checks `isPlaying()` **before**
`unlockAudio()`, which would otherwise undo the very pause it was asked for.

**Two findings a later round must not undo, both caught by the suite rather
than by reading.** The new ticks are **`.fs-ticks`, deliberately NOT
`.reading-ticks`** — three behaviour checks read that class as "the five
reading choices", so sharing it made them count ten and made "Mushaf greys the
others" fail, since these five correctly stay live under Mushaf. That is the
**second** time this class has had to be split for exactly this reason; the CSS
comment already recorded the first (`.reciter-ticks`). **`.reading-ticks` is a
name with meaning, not styling.** And **`rangeSpan` is remembered separately
from `rangeFrom`/`rangeTo`**: Surah 1 has seven ayahs, so Next on a five-wide
window gives a short tail (6–7) — and the first version stepped back by that
*truncated* width of two, landing on 4–5 and silently reducing the reader's own
choice of five. It looks redundant beside `to - from + 1`; it is not.

**Verified: 645 behaviour checks** (was 613 — 32 new, section 33: the bar's
three occupants by id, the Ruku' line proven no longer clipped, Next and Prev
on a Range with the chosen width proven to survive a truncation, Whole Surah
moving the picker too, Prev greyed at 1:1, Next proven to cross into Surah 2,
the inner buttons hidden for Single Ayah with the position readout proven kept
and kept for a Ruku', all five strips offered separately and on by default,
full screen with everything ticked leaving only the Qur'an, a partial choice
("keep the bottom menu and the play buttons") proven to keep just those, the
tap proven to work in both directions, a control press inside the reading
proven not to exit, the padding proven gone, and all of it again in Bangla with
the stored values proven still plain ids) **plus `layout.mjs` NO LAYOUT
REGRESSIONS at all eight viewports in both banner states** (landing page
byte-for-byte identical — same wheel-heading top, same wheel width, same
Approach rows, same 9px dock gap; `getElementById` targets 81 → 83, none
missing), **`reading.mjs` OK in both languages**, **`panel.mjs` no wrapped
bar**, **navcheck unchanged** (still only the pre-existing 320px ENGLISH
truncation of "Operation"/"Bookmark", which Bangla does not have), **coverage
1,179/1,179 (100%)**, **perf unchanged at 6 sequential round trips / 0.92s**.
Three older checks were **updated rather than deleted**, each because this round
deliberately removed what they asserted (29h's back button, 30j's separate
Pause, 29b's inner Prev/Next) — the reason is recorded in each. No
`firestore.rules`, schema or Firestore data changes — nothing to deploy but the
static files. (The two rules changes still pending from earlier rounds — v07.18
Homework teacher-scoping and v07.37 `appLang` — are unaffected and still not
deployed.)

**Pushed to the production mirror the same day** (`madrasatul-muslimeen.github.io`),
and the rule about doing so changed with it: the owner made mirror pushes
STANDING rather than per-round — *"Push it always, don't need permission."* See
the deployment section below, which is rewritten accordingly. `app/` was diffed
whole before copying and the only five files that differed were this round's
own, so the mirror carried no unrelated drift; version badge 07.47 → 07.48.

**Flagged, not built:** a Range that crosses a surah boundary still gives a
short tail rather than reaching into the next surah mid-window — deliberate,
since `buildUnitKey.range` keys a range to ONE surah, so a two-surah window
could not be claimed at all. And **Prev/Next exist only on the Quran module's
reading screen**; the other nine study modules have no equivalent. See
`LAYOUT-BACKLOG.md` item 13.

v07.49 (17 Aug 2026, on Claude Code on the web) is **shell round 22 — the
pickers move to where the reading actually happens, full screen becomes a
three-state cycle, and a real display defect from round 21 is fixed.** The
owner sent a phone screenshot and three points; a demo artifact was shown with
the measurements attached and four decisions were answered before any code.

**The defect first, because it was live.** Round 21 read the owner's "edge to
edge" as applying to the TEXT and set `#studyScreen`'s horizontal padding to
0 in full screen. **Measured, reproduced on Surah 107 at every phone width:
the gutter went 17px → 0px**, putting the Arabic's diacritics and end-of-ayah
marks hard against the glass — which is exactly what their screenshot showed.
**Nothing technically overflowed, which is why no check caught it**:
`reading.mjs` only asked whether the scroller scrolls sideways. The card is
what goes edge to edge now — no border, no corner, background all the way out
— while the text keeps **8px**; `reading.mjs` measures the gutter from this
round on.

**(1) Three full-screen states, walked by one gesture.** The owner's reply to
round 21: *"one was no bar stays (you did that), 2nd, 2 bars only (next and
play bars), how we have that option? ... the 2nd option is missing."* It was
in fact expressible — untick two of the five switches — but **a setting you
have to go and find is a chore, not an option**, so the tap now walks
**normal → reading only → bare → normal**. State 2 is a FIXED set (banner, top
menu, bottom menu) because that is the owner's own description of it; the five
switches keep defining state 3. A tick set that is empty makes state 3
identical to state 1, so it is skipped rather than making every third tap
appear to do nothing.

**(2) The pickers are on the reading screen.** The owner's reasoning:
*"an user might not go to study option, straight will go to read. There the
user has last session, or pulls a bookmark, anyways user stays on read."*
Study Unit, Surah, Ayah, the unit number, and From/To now sit above the
reading. **Measured with the real page's own fonts: the new picker row plus
the icon control row come to 68px against the 94px they replace** — one line
each at 360/390/412px with five cells showing, nothing clipped. So this gains
26px of Qur'an rather than costing any; the reading area went 587 → 610px at
390×844 and the ayah content visible at 360×640 went 308 → 330px.
**They are MIRRORS, not a second source of truth** — the owner chose to keep
both places for now ("will decide later if should keep only one"), and each
reading-screen control copies its options and value from the matching control
in Study options and forwards a change straight back to it, so the canonical
handler remains the only code that decides anything.

**The owner spotted a real duplication and they were right.** `#readRef` (the
read bar) and `#unitLabel` (the dock) printed **the same sentence, measured
across every unit type: five of the six**. A note in `LAYOUT-BACKLOG.md` had
assumed the two were never visible together; that assumption was wrong.
`#readRef` is gone — the pickers say it better, because they are the readout
AND the control — and the dock keeps the sentence, which is the only place a
span like "Juz 5 covers 4:24 → 5:81" can be written.

**(3) Play follows the chosen unit.** The owner said "Whole surah play becomes
redundant"; it was nearly true and the honest version is better. Play used to
sound exactly ONE ayah whatever unit was chosen, so only the separate button
could play more. Now a Range plays the range, a Ruku' plays the ruku', Whole
Surah plays the surah — and `readPlaySurahBtn` is genuinely redundant and
gone. A reciter with no per-ayah files (English Kevan Brighting, Bangla
Shareef Bayezid Mahmud) now plays its whole-surah file instead of erroring
with a message telling the reader to press a button that no longer exists.
**Prev/Next stayed at the top with the pickers rather than moving down with
Play** — they change WHAT IS READ, like the pickers, while Play and Stop
change what is HEARD.

**Two real defects found by the suite during the build, neither visible in a
screenshot.** Juz/Hizb/Page fill their number list only once the boundary
table arrives, which is AFTER `renderStudyScreen()` has already synced the
mirrors — so the reading screen showed an empty number cell for those three
units until `renderUnitNumberPicker()` was made to re-sync. And **an
`<audio>` element in the error state is not "playing"**: a source that fails
to load fires `play` optimistically and `error` afterwards, leaving the merged
button reading "Pause" with nothing sounding. `isPlaying()` now checks
`.error` too, and `error`/`abort` joined the state-handler's event list.

**Play was investigated and this round did NOT break it** — the button reaches
the audio layer and requests the right file. **Every recitation is served from
archive.org**; if that host is unreachable, all four reciters fail identically
and there is nothing in this code to fix. Flagged to the owner to check
whether archive.org opens on their network at all. The Arabic FONT is their
own separate session — the current stack is `'Traditional Arabic', 'Amiri',
serif`, neither of which is bundled, so each phone shows whatever it happens
to have.

**Verified: 667 behaviour checks pass** (was 645 — sections 33 and 34 grew by
22: every picker present and named, the mirror proven to drive the real
control AND to follow it back, all five cells on one line with no overflow, a
numbered unit's 30 juz, Play proven to request one ayah's file for a Single
Ayah and to start a range for a Range, "Whole surah" proven gone, all three
full-screen states asserted by what each keeps — **including the owner's
missing middle one** — and the whole thing again in Bangla with option VALUES
proven still plain ids). **The one failure is environmental**: section 22h's
Asma poster images come from archive.org, which this sandbox's proxy blocks —
the same failure v07.44 already recorded. **`layout.mjs` NO LAYOUT
REGRESSIONS** at all eight viewports in both banner states (`getElementById`
targets 83 → 86, none missing), **`reading.mjs` OK in both languages**,
**`panel.mjs` no wrapped bar and no truncated label**, **navcheck unchanged**
(still only the pre-existing 320px ENGLISH truncation of "Operation"/
"Bookmark"), **coverage 1,180/1,180 (100%)**, **perf unchanged at 6 sequential
round trips / 0.92s**. Several older checks were **updated rather than
deleted**, each because this round deliberately removed what they asserted
(`#readRef`, `#readTransport`, `readPlaySurahBtn`, the two-way toggle, and
round 21's own button-text assertions now that the controls are icons whose
name lives in `aria-label`) — the reason is recorded in each. No
`firestore.rules`, schema or Firestore data changes.

v07.50 (18 Aug 2026, on Claude Code on the web) is **shell round 23 — the
Qur'an gets a real typeface, bundled.** The owner put our reading screen beside
another Qur'an app and asked for that app's Arabic: *"I want the other one to
incorporate in our app. Keep the current one as an option to choose from (in
the Study option). And also same time or you can do it next phase, whatever is
easy, the Indo/Pak script as well."*

**The diagnosis is the headline: the app had never shipped an Arabic font at
all.** `.ayah-arabic` asked for `'Traditional Arabic', 'Amiri', serif` and
**neither was bundled**, so the real rule was "whatever this phone happens to
have" — which is exactly why their Arabic looked unlike the app they compared
it with, and why it can differ between their own devices.

**Three faces are bundled now, all OFL, and the old behaviour is KEPT as a
choice rather than removed (I4)**: Scheherazade New (the default — measured
against the owner's screenshot as the closest of the candidates), Noto Naskh
Arabic, Amiri Quran, and "your device's own", which resolves to exactly the
pre-round-23 stack. The picker sits in Study options → Reading view beside the
other display choices; the preference is localStorage, the same additive shape
rounds 18/21 used, so **no new startup read, no collection, no
`firestore.rules` change**.

**Two build decisions worth not undoing.** **(a) The fonts are SELF-HOSTED,
not linked from Google Fonts** — the app already depends on one third-party
host (archive.org, for every recitation) and that host is the prime suspect in
the owner's own "Play doesn't work" report; a second independently-failing
host is the last thing the Qur'an *text* needs. Self-hosted means: if the app
loads, the font loads. **(b) They are subset by `tools/fonts/build-fonts.mjs`
(new, checked in) from the complete originals, driven by the ACTUAL TEXT we
ship** — every codepoint in every ayah of `tools/quran-data-pull/output`, which
came to **74** — keeping **every** OpenType layout feature, because Arabic
shaping and mark positioning live in those tables. Result: **23KB / 21KB /
39KB**. Measured during the round and worth knowing: **Google's own woff2
subsets render Qur'anic marks differently from the complete font**, so taking
their files would have been the wrong shortcut; the subsets built here were
verified to render **identically to the full originals**.

**One thing joins the landing page and is flagged per I9: the chosen face,
~24KB, requested at ~280ms.** It is there because the Mastery Wheel's centre
disc is Arabic too (the wheel now follows the same setting — one variable,
`--quran-font`, governs the ayah text, the word-by-word chips and the wheel).
`font-display: swap` means the ayah is readable immediately in the fallback
and re-sets when the face arrives — **a blank Qur'an while a font downloads
would be the worst possible trade.** Perf re-measured to prove nothing else
moved: **6 sequential round trips / 0.94s, unchanged.**

**Indo-Pak is NOT built, and the reason is a data fact rather than a
preference: it is a different TEXT, not a different font.** Indo-Pak mushafs
spell words differently from the Uthmani text this app ships (`uthmaniText` is
the only Arabic field in the pulled data — checked, not assumed), so rendering
our text in an Indo-Pak face would produce a hybrid that reads wrong to anyone
who actually uses that script. Doing it properly means a re-pull adding a
second per-ayah field, the same shape as the multiple-translations problem in
`LAYOUT-BACKLOG.md` item 4 — and it **could not even be started from this
sandbox**, whose proxy blocks `api.quran.com`. The Reading view card says so on
screen in plain words rather than promising a picker that cannot work.

**Verified: 682 behaviour checks pass, 0 failed** (was 667 — 14 new in section
35: the picker's four options with values proven still plain ids, the default
proven to be the face the owner asked for, the device stack proven KEPT rather
than removed, the choice proven to reach the rendered Qur'an, **the woff2
proven actually fetched rather than merely referenced**, the choice proven to
survive a reload, an unknown stored value proven to fall back rather than wedge,
and the whole thing in Bangla with the typefaces' own names proven left alone —
they are proper nouns, like the reciters'). **`layout.mjs` NO LAYOUT
REGRESSIONS** at all eight viewports in both banner states (`getElementById`
targets 86 → 87, none missing), **`reading.mjs` OK**, **navcheck unchanged**
(still only the pre-existing 320px ENGLISH truncation of "Operation"/
"Bookmark"), **coverage 1,186/1,186 (100%)**, **perf unchanged**. No
`firestore.rules`, schema or Firestore data changes.

v07.51 (18 Aug 2026, on Claude Code on the web) is **shell round 24 — two
word-by-word defects the owner found in the live app, both real, both
pre-existing.**

**(a) The words of an ayah were laid out LEFT TO RIGHT.** Their words: *"The
word by word reads from left to right. it has to be right to left."* Correct,
and it had been wrong since the panel was built (F-050): `.wbw-strip` is a flex
row with no `direction`, so the FIRST word of the ayah was drawn at the LEFT of
the row and reading the chips in order meant reading the Arabic backwards.
`direction: rtl` on the strip is what reverses the chips; each chip is set back
to `ltr` inside, because its transliteration and gloss are left-to-right
scripts, while the Arabic line keeps the `dir="rtl"` the renderer already gave
it. The root/derivative strip had the same defect and is fixed with it.
**The check that matters measures GEOMETRY, not the CSS property** — the first
chip must really be drawn to the right of the second, on the same line.

**(b) The transliteration stayed English when everything else was Bangla.**
Their report: *"all selections showing Bangla, yet Transliteration is showing
Eng"* — with Word-by-Word language on "বাংলা only", the chips still printed
`tabāraka`. The transliteration is a LATIN-script pronunciation aid, so it now
follows the same language choice: shown when English is among the chosen
languages, absent otherwise. "বাংলা only" has to mean only Bangla, and a Latin
line is unreadable to precisely the person the whole Bangla project is for.
**Worth knowing before anyone "restores" it: a BANGLA-script transliteration
does not exist in our data** — `tools/quran-data-pull` pulls quran.com's
`transliteration` word field, which is Latin only. Putting Bangla
transliteration on screen would be a data job, not a rendering one.

Both fixes are in `app/js/ayah-renderer.js` and this page's own CSS, so they
reach every screen that renders the word-by-word panel. `quranrevival-render-
test.html` carries its own copy of that CSS and was kept in step rather than
left to disagree silently.

**Verified: 691 behaviour checks pass, 0 failed** (was 682 — 9 new in section
36, including the geometry check above, the Arabic line proven still RTL inside
an LTR chip, and "no Latin letters left on any chip" for the owner's own
setting). **`layout.mjs` NO LAYOUT REGRESSIONS** (`getElementById` targets
unchanged at 87), **`reading.mjs` OK**, **coverage 1,186/1,186**. No
`firestore.rules`, schema or Firestore data changes.

v07.52 (18 Aug 2026, on Claude Code on the web) is **shell round 25 — the root
& derivatives panel in Bangla, and the reading controls moved right.** Three
owner asks from the live app, one of which was a question with a real answer.

**(a) The grammar labels were English on an otherwise Bangla screen** — "what
about these derivates? in Bangla means everything should be Bangla." **Measured
before building, and the measurement is what made it tractable: the pulled data
carries 359 DISTINCT part-of-speech strings, but they are compositions of just
46 ATOMS joined by " + ".** So `posLabel()` in `js/labels.js` splits on the
joiner, translates each atom and rejoins — 46 entries expressing all 359
combinations. The root counts take `num()` too, so they read ৮৭৯× rather than
879×. **A second thing the measurement showed, fixed for BOTH languages: a
dozen of those atoms are raw Quranic Arabic Corpus codes — RES, PRO, PREV, EXL,
INT, EXH, SUR, AVR, EQ, COM, IMPV — which tell an English reader exactly as
little as they tell a Bangla one.** They are expanded to real words ("RES" →
"Restriction Particle"), so English gains from this round as well. An unknown
atom prints as it is rather than vanishing — the data has one such glitch
entry, and printing it beats inventing a meaning.

**(b) The controls moved to the right of the reading bar**, which only became
possible because of (c).

**(c) The reciter caption is gone, and the owner's question deserved a real
answer rather than just compliance.** They asked *"why do we show 'Abdullah
Basfar' there? What's its function? can we remove that from there?"* Its only
function was naming which reciter Play would use — which Study options →
Listening already says, and which the reader chose there in the first place.
So nothing is lost by removing it, and it was the one thing keeping the control
row from sitting where the Arabic starts.

**The coverage tool was wrong for the EIGHTH time in nine rounds, and this one
is a genuine convention bug rather than a missed pattern.** Its `*_LABELS`
extractor matched EVERY quoted string in the block — which happened to work
only because every other map in the codebase writes its keys as bare
identifiers (`pending:`, `teacher:`). `POS_LABELS` must quote its keys, since
they contain spaces ("Proper Noun"), so the report started demanding Bangla for
raw corpus codes that never reach `t()` at all. It reads the VALUE side of each
pair now, falling back to every string only for array-shaped maps.

**A defect caught by measuring, and the measurement itself had to be fixed
first.** The first attempt at (b) added `justify-content: flex-end` to a rule
that already carried `justify-content: space-between` LATER in the same block,
so the stale declaration quietly won. The check did not catch it because it
measured the LAST button's right edge — and `space-between` also ends at the
right edge. **Only the FIRST button's position tells the two apart**, which is
what the check measures now.

**Verified: 704 behaviour checks pass, 0 failed** (was 691 — 13 new in section
37). **`layout.mjs` NO LAYOUT REGRESSIONS** (`getElementById` targets 87 → 86,
exactly the retired caption, none missing), **`reading.mjs` OK**, **coverage
1,230/1,230 (100%)**. Two older checks were **updated rather than deleted**
(30j and 33a, both of which asserted the caption this round removed). No
`firestore.rules`, schema or Firestore data changes.

v07.53 (21 Aug 2026, on Claude Code on the web) is **shell round 26 — the
listening fixes.** The owner reported, with two phone screenshots, that
playback was "mixed problems": sometimes only the Arabic plays and then two
error prompts appear back to back; unticking and reticking something, or moving
between Study options and Read, stops the recitation; and **both Arabic and
Bangla ticked plays only Arabic.** Six separate defects were found behind
those three sentences. **Five of the six are invisible in a screenshot and
none of them could be found by reading the coverage or layout reports** — they
needed a test that actually plays audio, which is new this round.

**The measurement problem came first, again.** Every earlier section of the
behaviour suite could leave audio alone, because archive.org is unreachable
from this sandbox and the checks only ever asked WHICH FILE was requested
(`34d` aborts every archive.org request on purpose). That is not enough here:
every one of the owner's complaints is about what happens AFTER a file loads,
or fails to. So section 38 **serves real, playable audio of its own** — a
generated silent WAV, a short one per ayah for a direct reciter and a longer
one for the segmented reciter to seek around inside, plus a real Bangla timing
map — and watches the app's own behaviour. Two method points worth keeping:
**a boundary check rides on `timeupdate`, which browsers throttle to about a
quarter of a second**, so a 300ms ayah really takes ~900ms and a fixed sleep
makes the test flaky rather than wrong — wait for the state, never for a
guessed number of milliseconds; and **Range and Whole Surah render as a flow,
which does not move `#ayahSelect`**, so they cannot say which ayah is
sounding — a Ruku' can, which is why these tests use one.

**The six defects.** **(1) The reading screen's Play used ONE reciter** while
the list beside it took several ticks: `currentReciterId`, the first ticked.
That is the owner's own "only Arabic is played not Bangla" — and the two Play
buttons meant different things, which is the confusion underneath the whole
report. **There is one Play now**, `playCurrentSelection()`, called by both
buttons: every ticked reciter, in ticked order, over the chosen unit, honouring
Repeat, Mode and Loop. `playDrill()` gained loop support so it can be that one
sequencer without losing what the old single-reciter range player did.
**(2) One failure raised TWO prompts** — the element's `error` event alerted
one sentence and the rejected `play()` promise alerted the browser's own
wording of the same thing, which is exactly the two screenshots. Both roads
now go through `reportFailure()`, which says one sentence and drops a repeat
within two seconds; it returns the Error marked `reported`, so a caller that
must reject (the sequencer, which has to stop rather than spin through the
rest of the surah) can do so without the page alerting it again.
**(3) `unlockAudio()` was itself firing a phantom code-4 error.** Calling
`play()` on an element with NO source does not fail quietly — the browser runs
its resource-selection algorithm, fails, and fires a real `error` event saying
"the audio source isn't available", **and the error listener tore down
`currentRange`/`currentPlaylist` as it went**, killing the playback that tap
was unlocking. It hands the gesture a one-sample silent clip now, which really
loads. **(4) `seekTo()` hung for ever on a failed load** — it listened for
`loadedmetadata` and nothing else, so a Bangla file that would not load left
its promise pending: the sequence never advanced, never reported and never
recovered, and the old Play button stayed disabled. It rejects on `error` now,
and **both listeners are removed together**, which fixes a second bug in the
same six lines: the surviving `{ once: true }` listener made the NEXT
successful load seek to the PREVIOUS ayah's position.
**(5) A segmented reciter's finished ayah looked exactly like a pause** — it
stops part-way through a whole-surah file — so the next Play "resumed" it and
ran straight on into the rest of the surah with no boundary listener left to
stop it. `atEndOfRun` is what tells the two apart.
**(6) Switching to the reading screen stopped the recitation.** Round 17's
rule opens a unit at its first ayah, and playback moves the current ayah as it
advances — so tapping Read mid-listen jumped BACKWARDS and called `stopDrill()`
on the way. It repositions only when nothing is playing or paused; with
nothing playing, round 17's rule is untouched.

**One more, found by the tests rather than by reading, and it is the more
interesting half of an old fix.** After a failed load, a retry made no request
at all: `seekTo()` asked "is this a different file?" via the element's own
`currentSrc`, which **lags a source assignment by a task**, so straight after
the unlock clip was assigned it still named the file that had just failed —
answer "no", no reload, Play dead for the rest of the session. Round 4 (8 Aug
2026) had moved TO `currentSrc` precisely because a hand-tracked flag went
stale; round 26 moves back to a tracked value, `setMediaSource()`, which is now
**the only place in the module that assigns `el.src`**. Round 4's lesson is
what makes that safe and is worth restating: one writer, or a tracked value
goes stale.

**Two deliberate behaviour changes, both stated rather than slipped in.**
**Repeat now defaults to 1× instead of 5×** — with one Play serving both
screens, a default of 5 would have meant every ordinary Play silently
repeating five times; the reader raises it when they want a drill. And **a
failure now NAMES what failed** ("Couldn't play Shareef Bayezid Mahmud
(Bangla), Surah 1, Ayah 1: the audio source isn't available…"), so a missing
file in one reciter's archive stops looking like a broken app. The five reason
strings were English literals dropped into a translated sentence until now
(I15) and are translated with it.

**What could NOT be checked from here, and matters:** this sandbox's proxy
blocks archive.org, so whether the owner's own failing file is genuinely
missing from that item is **unknown**. Every defect above is real and fixed,
but if a particular ayah or surah still refuses to play, the new message names
it — that name is what a future session needs to check the archive item
itself.

**Verified: 721 behaviour checks pass, 0 failed** (was 704 — 17 new in section
38: both ticked reciters proven to really sound; one failure proven to raise
exactly one prompt, naming the reciter and the ayah; a failed Bangla load
proven to report once and to be recoverable by the next Play; the recitation
proven to keep playing when Read is tapped mid-listen, while an idle Read tap
still opens at the unit's first ayah; a finished unit proven to start over
rather than run on; pause and resume proven not to refetch; and Repeat proven
to default to once). **`layout.mjs` NO LAYOUT REGRESSIONS** at all eight
viewports in both banner states — landing page byte-for-byte identical,
`getElementById` targets unchanged at 86, none missing — **`reading.mjs` OK**,
**`panel.mjs` no truncation and no wrapped bar**, **navcheck unchanged** (still
only the pre-existing 320px ENGLISH truncation of "Operation"/"Bookmark"),
**coverage 1,239/1,239 (100%)**, **`tools/perf/measure.mjs` unchanged at 6
sequential round trips / 0.91s**, and **`tools/perf/new-tenant.mjs` 10/10**. No
`firestore.rules`, schema or Firestore data changes — nothing to deploy but the
static files. (The two rules changes still pending from earlier rounds —
v07.18 Homework teacher-scoping and v07.37 `appLang` — are unaffected and still
not deployed.)

v07.54 (21 Aug 2026, on Claude Code on the web) is **shell round 27 — four
fixes the owner listed after using round 26.** Small in scope, but two of them
reverse earlier decisions of this project's own, and one is a fifth playback
defect that only real use could have surfaced.

**(1) A Range shows From and To, and no third Ayah picker.** Round 22 asked the
owner "From and To only, or all three?" and they said all three; using it, they
reversed it — *"the Surah already shows the number, don't need the button to
choose the number again"*. They are right, and the reversal pays for itself:
with the third picker gone there is room to widen the number cells, which was
their second complaint (**"3 digits show cut-off, looks odd"** — measured, and
true: `3.1rem` is 50px, and "286" plus a dropdown arrow does not fit). Now
**3.9rem**, with a check that measures the widest option against its own box in
the select's own font rather than trusting the eye. Worth knowing: **Study
options has hidden that picker for Range and Whole Surah since round 19**
(`isPageUnit`) — so this is the reading-screen mirror finally agreeing with the
control it mirrors, not a new rule.

**(2) The ayah being recited is marked on screen.** A Range or a Whole Surah
renders as a FLOW — every ayah drawn at once — so as the recitation advanced
the page genuinely did not move: the owner's *"the Ayah playing should display
on the screen (now it remains static)"*. `renderStudyScreen()` was being called
on every ayah, and re-rendering identical content is invisible. Each ayah in
the flow now carries `data-ayah`, the one being recited takes a tinted band
with a coloured left edge, and it is scrolled into view (`block: "nearest"`, so
only when it has gone off screen). **Deliberately a class toggle and a scroll,
not a re-render** — the flow can be a whole surah, and rebuilding all of it
hundreds of times would fight the reader's own scrolling; the same reasoning,
and the same shape, as the Mushaf path's `setActiveAyah()`. The band is behind
the words rather than a colour on them, because the Arabic already carries
Tajweed colouring and must not be competed with.

**(3) Word by Word no longer drags the grammar table with it.** They were ONE
panel in `ayah-renderer.js` — `wordByWord` rendered the word chips *and* the
root/derivatives table — so asking for the words always got both. They are two
panels now (`wordByWord`, `rootDerivatives`) and **"Roots & derivatives" is its
own reading choice** in Study options → Reading view, alongside Tajweed, Word
by Word and the translations. That is where every other reading choice already
lives; the owner offered "the read panel, or the Study Setting panel, or both",
and putting a sixth tick on the reading screen would cost landing/reading
height that rounds 9–27 have spent themselves reclaiming — say the word and it
can go in both. Note an Approach that declares `wordByWord` in
`catalogue-data.js` now means the words alone, which is what that name says.
**`.reading-ticks` is five choices no longer but six** — three behaviour checks
read that class as a count, and they are updated rather than worked around;
this is the third time that class has needed care when something moved near it.

**(4) A missing file for ONE reciter no longer stops the whole recitation.**
The owner's fourth report: a Range playing Arabic and Bangla, paused, played
again — and the Bangla file, which had been playing a moment earlier, came back
"not available" and *"it actually came to a total stop"*. Three changes, in
order of how much they matter:
**(a)** every load is now **retried once, silently** — a file that worked and
then did not is transient (a dropped connection, a range request archive.org
refused on the way back, a mobile browser releasing a paused media resource),
and the honest answer to a transient failure is to ask again before telling
anyone; **(b)** the failure message is **held back 700ms and thrown away if the
sound starts**, so a hiccup the retry fixes never interrupts the reader at all;
**(c)** a reciter that really cannot play is **set aside for the rest of that
run** rather than ending it — the run stops only when there is nobody left who
can play. So Bangla failing now means Arabic carries on, with one message
saying why, instead of silence.
**One detail in (b) is load-bearing and was caught by a test, not by reading:**
cancelling on *any* playback is wrong. With two reciters, the next thing to
play after Bangla fails is the ARABIC file — and cancelling then would swallow
the only explanation the reader gets for why Bangla went quiet. It cancels only
when the file that failed is the file now playing.

**Verified: 740 behaviour checks pass, 0 failed** (was 721 — 19 new in section
39: a Range proven to show From and To and no third picker, on one line, with a
three-digit ayah proven to fit its box; the flow's ayahs proven to carry their
own numbers, the recited one proven marked and the mark proven to follow the
recitation, exactly one at a time; the words panel proven to render without the
derivatives and the derivatives proven to render without the words; a reciter
whose files are unreachable proven not to stop the other one, and to be
explained once rather than once per ayah; and a first failure that the retry
fixes proven to play with the reader never interrupted). Three older checks
were **updated rather than deleted**, each because this round deliberately
changed what they asserted (34c's "all 3" for a Range, and two `.reading-ticks`
counts). **`layout.mjs` NO LAYOUT REGRESSIONS** at all eight viewports in both
banner states — landing page byte-for-byte identical, `getElementById` targets
86 → 88 (exactly the new tick and its label), none missing — **`reading.mjs` OK
in both languages**, **`panel.mjs` no wrapped bar and no truncated label**,
**navcheck unchanged** (still only the pre-existing 320px ENGLISH truncation of
"Operation"/"Bookmark"), **coverage 1,240/1,240 (100%)**, **perf unchanged at 6
sequential round trips**, **`new-tenant.mjs` 10/10**. No `firestore.rules`,
schema or Firestore data changes.

v07.55 (21 Aug 2026, on Claude Code on the web) is **shell round 28 — the
Mushaf page, and the reading moves sideways.** Three owner asks. The first two
were reported as one visual complaint and turned out to be **two separate
defects, both pre-existing since Phase 5 and both invisible to every existing
tool** — nothing in this project had ever rendered a Mushaf page in a test,
which is exactly how they survived.

**(1) The page was 32px wider than the phone it was drawn on.** The owner's
words: *"The Mushaf view screen on the right side is cut off ... it should be
like the left side."* Measured, and exactly right: `.hifz-page` carries
`width: 100%` AND `padding: 18px 16px`, and this page has no global
`box-sizing: border-box` — so on a 390px screen the page ran from x=8 to
x=414, keeping its 8px gutter on the left and hanging **24px off the right**.
One declaration fixes it; the measurement is what found it. Now 8px each side
at every phone size, with nothing scrolling sideways.

**A second, deeper defect the same measurement exposed: the lines were never
justified at all.** `justifyPageLines()` gives up when `pageEl.clientWidth` is
0, which is the case for an element inside a hidden container — and that is
precisely how Mushaf is turned on in this app: the tick lives in the Study
options panel, which sits over a stage that may still be showing the wheel. So
the page was rendered, silently skipped, and then revealed with its lines at
their natural width instead of spanning the page. Nothing re-ran it, because
nothing was watching. **A `ResizeObserver` is now**, and it earns its keep
twice: rotating the phone had the same silent problem. Also fixed in the same
function: `natural` was read from `offsetWidth`, which `.hifz-line`'s own
`max-width: 100%` **clamps** — so a line whose glyphs were genuinely too wide
measured as exactly right, scaled by 1.0, and went on overflowing by a few
pixels with nothing able to notice. It reads the intrinsic width now.

**(2) The recited ayah is marked and followed on the Mushaf page.**
`setActiveAyah()` already coloured the words; it had no background and never
scrolled, so on a page taller than a phone the reader had to find it. It now
carries a real band and calls `scrollIntoView({ block: "nearest", inline:
"nearest" })`. The band is painted with `box-shadow`, not `padding`, on
purpose: each word is a flex item, so padding would change the line's width
and fight the justification that spans it — and the 0.06em spread bridges the
word gap so an ayah reads as one continuous band rather than a row of tiles.

**(3) "Let the page move from left to right" — the whole reading is paged
sideways now.** This was genuinely ambiguous (page-turn direction? one view or
all of them?), so it was **put to the owner with the readings spelled out, and
they chose the widest: every reading view moves sideways, not only Mushaf.**
So a Mushaf page, an ayah of a Range, or an ayah of a whole surah each become
a page you move ACROSS, left to right, instead of a strip you scroll down;
each is exactly one screen wide and scrolls DOWN inside itself when its own
content is taller, so a long ayah with both translations still reads.
**The horizontal scroller is the STRIP (`#pageViewContainer`), never
`#readScroll` itself** — round 17 put a check on that element scrolling
sideways, because a full-bleed card overflowing it was a real defect, and that
check is worth keeping honest. One detail that made the CSS clean rather than
a fight: `renderStudyScreen()` sets that container's `display` inline to `""`
or `"none"`, and `""` falls back to the stylesheet — so the sideways rule can
turn it into a flex row without ever contradicting the code that hides it.
**On by default, because that is what was asked**, with a "Page by page" tick
in Reading view as the way back (localStorage, the same additive shape rounds
18/21/23 used — **no new startup read, no collection, no `firestore.rules`
change**, and perf re-measured to prove it). It also makes round 27's
follow-the-recitation work harder for its living: the ayah being recited is now
in a different COLUMN, so following it carries the strip across.

**`.reading-ticks` is seven choices now, not five** — that class is a name with
meaning and three checks read it as a count; this is the fourth round in a row
where something moving near it needed care. One of them needed a real decision
rather than a number change: **Mushaf greys the choices it REPLACES** (Tajweed,
the words, the derivatives, the translations) **but not "Page by page"**, because
how you move between pages still applies to a Mushaf page — visibly so, since
its pages sit side by side too.

**Verified: 763 behaviour checks pass, 0 failed** (was 740 — 23 new in sections
40 and 41: the page proven to fit its screen with equal gutters and nothing
scrolling sideways; every line proven justified **even though the page was
drawn while hidden**, and none spilling past either edge; the recited ayah
proven marked with a real background and proven to move on with the
recitation; the strip proven to page sideways with one screen-wide page per
ayah, running left to right in reading order; the tick proven to give the
scrolling reading back and to survive a reload; the recitation proven to carry
the strip across; and the Mushaf's own pages proven side by side rather than
stacked). Four older checks were **updated rather than deleted**, each because
this round changed what they asserted. **This suite renders a real Mushaf page
for the first time** — `tools/i18n-verify/fixtures/` holds two real pages (9KB
of the 2.8MB layout file) and deliberately no glyph font: the suite serves one
of the app's OWN bundled Arabic faces in its place, a real loadable woff2, so
`FontFace.load()` resolves and justification runs for real rather than being
skipped. See that folder's README before "fixing" it with a 122KB binary.
**`layout.mjs` NO LAYOUT REGRESSIONS** at all eight viewports in both banner
states (`getElementById` targets 88 → 89, exactly the new tick, none missing),
**`reading.mjs` OK in both languages**, **`panel.mjs` no wrapped bar and no
truncated label**, **navcheck unchanged**, **coverage 1,241/1,241 (100%)**,
**perf unchanged at 6 sequential round trips**, **`new-tenant.mjs` 10/10**. No
`firestore.rules`, schema or Firestore data changes.

v07.56 (21 Aug 2026, same day) is a **same-round correction to v07.55**, from
the owner's own question: *"Did I say the page movement from left to right or
right to left? How is the Qur'an read? Arabic is written? It's right to left."*
They were right, and the mistake was mine, not theirs -- their original
instruction ("let the page move from left to right") was about the swipe
GESTURE, and v07.55 read it as the on-screen PAGE ORDER instead, shipping ayah
1 leftmost and later ayahs running rightward. Plain left-to-right order, which
is backwards for a language that reads right to left.

**Fixed with one property, `direction: rtl` on the strip (`#pageViewContainer`)
itself** -- flex lays DOM-order children out from the inline-start edge, and
RTL's inline-start is the right, so ayah 1 (still the first child in the
markup; nothing about unit order changed) now renders flush with the right
edge and ayah 2 sits to its LEFT, off-screen until the reader moves. Exactly
how a real Mushaf's pages turn. Every child gets `direction: ltr` back, because
a page's own content -- translation blocks, buttons, the word-by-word strip --
was built assuming an LTR page and must not be mirrored along with the strip
itself. The ayah-separator border (round 28's own) moves from the right edge of
each page to the left, since the TRAILING edge in reading order is now the
left side.

**One real, measured surprise: `scrollLeft` goes NEGATIVE under `direction:
rtl`, not positive.** Chromium's own RTL scroll model puts `scrollLeft = 0` at
the START (the right, for RTL) and counts DOWN as the reading advances toward
the end (leftward) -- the mirror image of ordinary LTR scrolling. Confirmed
by loading the real page and reading the number rather than assumed: at ayah 1,
`scrollLeft` is 0; scrolled to ayah 2, it is -356. The one behaviour check that
watches the recitation carry the strip across (`41c`) was asserting the wrong
sign and is corrected to match, with the measurement recorded in its own
comment so the next person doesn't have to rediscover it.

**Verified: 764 behaviour checks pass, 0 failed** (unchanged in count from
v07.55 -- this is a direction correction, not new coverage; three existing
checks in section 41 were updated to assert the corrected right-to-left order
and the negative-scrollLeft fact, rather than added to or duplicated).
**`layout.mjs` NO LAYOUT REGRESSIONS** at all eight viewports in both banner
states (`getElementById` targets unchanged at 89, none missing), **`reading.mjs`
OK in both languages**, **navcheck unchanged**, **coverage 1,241/1,241 (100%)**
(no strings changed). Confirmed visually too, not just by the suite: a fresh
render shows ayah 1/page 50 sitting flush against the right edge on load, with
later ayahs/pages reachable only by moving left -- screenshotted and read, not
inferred from the numbers alone. No `firestore.rules`, schema or Firestore data
changes.

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
| `LAYOUT-BACKLOG.md` | **The pick-up list for outstanding layout work** (opened 13 Aug 2026, after shell round 11), ordered as the owner wants it taken. Item 1 (one global Language preference) is agreed and ready to build in its own session. Read it before starting any layout round — it also records the measure-before-and-after method every round since v07.22 has used. |

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
`madrasatul-muslimeen.github.io` (confirmed 9 Aug 2026). **Push there every
time, without asking — the owner made this standing on 17 Aug 2026
(v07.48), in their own words: "Push it always, don't need permission."**
This supersedes the old "it's a live public site, so ask first" rule that
this file carried from the cutover until then, and it is now the same tier
as the routine git operations below: finish a chunk of work, merge the PR
on the dev repo, mirror it, done. The owner's reasoning is the obvious one
— they test against the live site, so work that stops at `main` has, from
their side, not shipped. **Diff the whole of `app/` before copying**
(`diff -rq app /workspace/madrasatul-muslimeen.github.io/app`) rather than
copying only the files you think you touched: that is what proves the
mirror had no unrelated drift, and it has caught a stale mirror before.

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

**Parked, owner-approved 13 Aug 2026 (shell round 9/10): make the Mastery
Wheel itself reflect the selected Study Unit.** Surfaced while removing the
duplicated "Tracking:" line from the dock. Today `renderWheel()` is
hardcoded to the CURRENT AYAH on both axes — its segments come from
`approachStatusesForCurrentAyah()` (which builds `buildUnitKey.ayah(...)`
directly) and its centre disc from a literal `SURAH n · AYAH n`. So when
the Study Unit is Range, Whole Surah, Ruku', Juz or Page, the wheel keeps
showing the single ayah while "Track this unit" claims against something
else entirely. v07.26 handled this by keeping the dock's Tracking line
alive for exactly those five units (hidden only for `ayah`), which is a
correct stopgap, not the fix. The owner asked for the real thing "later",
explicitly deferring it — **do not build it unprompted, but do not lose
it either.** The shape of the fix, worked out at the time: drive the wheel
off `currentUnitInfo().unitKey` instead of the hardcoded ayah key, and
label the centre from `currentUnitInfo().label`. **Three of the five are
free** — range/surah/ruku already chunk to `surah_${n}`, which
`refreshChunkAndWheel()` has loaded anyway — **but juz and page chunk to
`subject_quran`**, a different document, so those two need a second
records read. That lands on the landing page's own startup path, so it is
an I9 / load-speed-contract conversation (Architecture Part 8: "Landing
page — card information only"), not just a rendering change. Also
undecided: what the centre's Arabic text should be when a unit spans many
ayahs (today it is that one ayah's `uthmaniText`). **Owner's steer, 13 Aug 2026: that
last part is not one decision but six — treat the centre as configurable
per unit type, deciding for EACH of `ayah` / `range` / `surah` / `ruku` /
`juz` / `page` separately what it should show and how it should be
written.** So the fix is a small per-unit table (what Arabic, if any; what
reference text), not one global rule bolted onto `renderWheel()`. Ask the
owner for their six answers when the round is actually picked up — do not
infer them.

**Done in v07.28 (shell round 11): organise the inside of
`#panelStudyOptions`.** This was CLAUDE.md's own "next round already
agreed" item from v07.24 onwards; it is built, to the owner's drawn
three-bar mockup. See v07.28's paragraph above. What it left behind, all
of it the owner's own explicit deferral rather than anything discovered
mid-build:

- ~~**One global language preference, read by every module.**~~ **BUILT in
  v07.30 (shell round 13)** — see that version's own paragraph above. Both
  decisions this item said had to be put to the owner were put to them and
  answered (localStorage now with a Firestore sync later; and two settings,
  not one). What it left open is `LAYOUT-BACKLOG.md` item 6: the app's own
  chrome (nav labels, page headings, buttons) is still hardcoded English.
- **Choosing a translation by the translator's name.** Asked for, and
  explicitly parked by the owner in the same message ("that build we can do
  later ... we now concentrate on organising the layout only"). The
  Reading view card carries a DISABLED `#translationChoiceSelect` and a
  plain note so the place it will live is visible and honest. The data
  question comes first: `tools/quran-data-pull` currently packages one
  English and one Bangla translation per ayah, so more translators means
  re-pulling and re-packaging the surah files, not just a picker.
- **The banner-admin block is still the one unrelated thing in the panel.**
  It sits between the summary strip and `<h2>Study</h2>` only because shell
  round 5 moved it off the landing page to save height. Not worth its own
  round; worth remembering if a real Settings surface ever lands.
