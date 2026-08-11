# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.

**Current milestone: QuranRevival v07.12.** Cutover to production happened
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
`js/course-offers.js`, plus a `firestore.rules` addition worth noting:
`isEnrolledAsTeacherIn()` is a real, properly-scoped alternative to the
"teacher sees the whole tenant roster" gap used elsewhere in this codebase
— a teacher can only see the enrolment roster of a course offer they are
themselves enrolled to teach. Does not yet wire live study activity
(`bookmarks.resume.programId`, `activity.viaProgramId`) to a real enrolled
offer — flagged as a deliberate, separate follow-up, not an oversight.
v07.12 (11 Aug 2026) is Shell round 3: the shared nav bar (`app/js/nav.js`,
`renderNavBar()`) had grown to a flat ~19-link list that wrapped/crowded at
the horizon — reorganized into five categories per the owner's own
mockup — **Admin** (People, Catalogue — owner/prime only, unchanged
gating), **Study Module** (all 9 study-renderer pages), **Operation**
(Records, Monitor, Homework, Course Offers, plus a disabled "Curriculum"
placeholder — that's unbuilt Phase 11 scope), **Bookmark** and **Settings**
(Language, Appearance) both disabled placeholders only, real functionality
deferred by the owner to a later round. Each category is a native
`<details>/<summary>` disclosure (no click-handler JS needed, keeping
`nav.js` a pure renderer per I2) that auto-opens if it contains the current
page. Location change only, confirmed with the owner before building —
no link's destination or gating logic changed. The Legacy App link, sign-in
status text, and Sign In/Sign Out buttons moved out of `renderNavBar()`'s
own output into each page's static pre-JS markup as a labeled "Home" bar —
they were already static (v07.08's anti-flash fix), and folding them into
the role-gated renderer would have delayed them until after sign-in
resolves, reintroducing exactly the kind of flash v07.08 fixed. The nav
bar's CSS, previously copy-pasted into a `<style>` block in every one of
15 pages since shell round 1, is now one shared `app/css/shell.css` linked
from each page instead. On `quranrevival.html` only (per the owner's own
scope call — every other page's ad hoc `<h1>` stays untouched): the
"QuranRevival vX.XX" title now carries a tagline ("Reviving the Quran,
abandoned.", reused verbatim from the boot splash) and sits above the nav
bar, and the existing tenant-editable banner (F-061, `#globalBanner`) moved
to sit *before* `#navBar` instead of immediately after it, so the nav bar
is no longer directly followed by a second banner. No Firestore or
`firestore.rules` changes. None of v07.04–07.12 are phase deliverables
beyond 07.09/07.10/07.11 themselves; no status file of their own for
v07.04–07.08 or v07.12. See
`PHASE-9-STATUS.md` for Phase 9 round 1's build log (including the bug fix
above in full), `PHASE-8-STATUS.md` for Phase 8 round 1's, `PHASE-7-STATUS.md`
for Phase 7 (now covering both rounds), and `PHASE-6-STATUS.md`
for Phase 6's, including three real pre-existing data bugs found and
fixed by querying Firestore directly rather than guessing from the code.
We are past "build against a parity checklist" and into "rebuild,
enhance, modify, and fix from here," driven by real use. See "Post-cutover
rollout order" below for whose real use comes first. **Check this line's
version number every session** — it's manually updated per
`app/js/version.js`'s own scheme (first two digits = big overhaul, last
two = each new feature) and will drift if a future round forgets to bump
it here too.

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
own deferral on purpose). **Phase 8
(Monitor & reports) round 1 is also built, not yet owner-verified** — see
`PHASE-8-STATUS.md`. **Phase 9 (Homework & feedback) round 1 is also
built, not yet owner-verified** — see `PHASE-9-STATUS.md`, including a
real guardian-access bug found and fixed in `firestore.rules` (already
deployed) that predates this phase. See also
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

**Second open access-control question, raised by the owner 2026-07-31, not
yet resolved:** a guardian (in a Family/Individual tenant, not a Tuition
Provider) wants to bring in an outside teacher for a few subjects only —
that teacher should be able to record/confirm progress **only on the
subjects they're actually assigned to teach, only for the specific
children they teach**, and should be **blocked from every other subject
and every other module entirely**, not just from other teachers' students.
**Nothing built through Phase 3 supports this.** Every place a `teacher`
role currently grants access (`canRecordFor` in `firestore.rules`,
`isTeacherIn(tenantId)`) is **tenant-wide** — any teacher membership in a
tenant currently sees/can act on every person and every subject in it,
because there is no subject-scoped or student-scoped assignment concept
yet. The Architecture doc's own Phase 10 ("Classes & provider") is titled
"safeguarding rules at scale" and lists "teacher assignment," but that's
scoped to Stage B2 (Tuition Provider tenants running classes) — the owner's
scenario is a **Family-tenant, no-classes-yet** version of the same need,
which may mean this needs a lighter-weight primitive earlier than Phase 10,
not a full classes/enrolments system. **Do not build this without a design
conversation first** — flagged for discussion after the phased work, same
as the item above.
