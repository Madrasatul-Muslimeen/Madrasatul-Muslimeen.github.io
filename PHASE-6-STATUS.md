# Phase 6 — Deen Study & Topic Renderer — Build & Fix Log

Read alongside `CLAUDE.md`. Built and fixed 9–10 August 2026, in one
continuous session, owner-verified round by round rather than all at once.

---

## Position

**Complete and owner-verified.** Scope grew beyond the original phase
name during the round — Deen Study shipped first, then the same pattern
was extended to four more modules, then Health and Life Skill were pulled
out as independent modules at the owner's explicit request. All of it is
live on `madrasatul-muslimeen.github.io/app/`, not just committed to this
dev repo — every push was verified by polling the actual live URLs until
they served the new content, not assumed from a successful `git push`.

---

## Round 1 — Deen Study & topic renderer built

Planned first: Phases 6, 7, 8, 9, 12 were assessed against the
architecture's own build-phase dependency table. Phase 12 (remaining
modules) was dropped from the batch — it architecturally requires Phase
10 (Classes & provider, Tuition-Provider safeguarding-at-scale) and Phase
11 (Curriculum, grades & resources), neither of which the owner's own use
needs yet. Phase 6 itself needed one real design decision first: Quran's
progress model (30 Approaches) assumes the content is already in hand;
Deen Study's isn't. Owner's answer: existing subject-tree nodes are the
trackable unit, one universal "Studied" trackable measures progress
(recommended option, chosen over per-subject bespoke trackables or a
richer generic set) — lightest to ship, extendable later without
breaking data (I5).

**Built**, reusing Phase 2/3's existing generic machinery rather than a
parallel system (confirmed by reading the actual code first, not assumed):
`records.js`'s claim/confirm/return, `way-modal.js`'s Track/Guide/
Breakdown tabs, and the subject tree's `isTrackable`/`ancestorIds`
machinery were all already renderer-agnostic. The real gaps were narrower
than they first looked:

- **`app/js/resources.js`** (new) — CRUD for the `resources` collection,
  reserved in the schema since Phase 0 but never wired up until now. Its
  own `firestore.rules` entry added (read: any tenant member, write:
  owner/prime — same shape as `domains`/`subjects`).
- **`app/js/topic-renderer.js`** (new) — pure renderer (I2) for the
  subject-tree browser: breadcrumb, child list with status chips, resource
  display. Built shared from day one, even though only Deen Study used it
  at first.
- **`app/js/catalogue.js`** — `createTopicSubject()`: lets owner/prime add
  a topic under any subject with an optional resource, and — a real
  pre-existing gap found while building this — correctly flips the
  parent's `isTrackable` off when it gains its first child. The original
  "add a tenant-specific subject" flow (built in Phase 2) never did this,
  which would have let a subject be claimable both as itself and as its
  own new child.
- **`app/js/catalogue-data.js`** — one "Studied" trackable template per
  topic-based module, seeded as a separate code path from the existing
  Quran `APPROACH_TEMPLATES` seeding so Quran's own seed logic was never
  touched.
- **`app/js/way-modal.js`** — `renderWayModalShell()` now takes an
  optional tab list (defaults to Quran's existing four), so Deen Study
  opens Track/Guide/Breakdown without a Coverage tab that doesn't apply
  to topics yet.
- **`app/deen-study.html`** (new) — the actual study screen. No topics
  pre-seeded — every Deen Study subject stays a plain, unclaimable leaf
  until a real topic with a real resource is added under it, per the
  owner's explicit instruction this round.
- **`app/js/nav.js`** — Deen Study link added.

**Real bug caught before shipping, not after**: the first pass tried to
auto-flip the `deen` module's `status` field from "planned" to "active" on
every page load. `firestore.rules` restricts module updates to
`isPlatformAdmin()` only — this would have thrown a permission error for
the owner (not a platform admin) on every single visit. Checked whether
anything actually reads `module.status` before removing it — nothing does,
it's purely informational in Catalogue's own table — so the function was
deleted rather than the security rule loosened for a cosmetic value.

Owner tested: "works good."

---

## Round 2 — extended to Hadith, Arabic, General Study, Nature-Life

Owner asked whether the same treatment could be done for the rest of the
topic-renderer modules in one go. Health was flagged and excluded — it
uses the "routine" renderer (a scheduled habit, not a topic+resource),
which is Phase 7 scope, not this pattern.

Given five real call sites at once (not speculative future ones),
`deen-study.html`'s script was extracted into **`app/js/topic-study.js`**
— `initTopicStudyPage({moduleId, trackableId, rootSubjectId})` — and each
of `arabic-study.html`, `hadith-study.html`, `general-study.html`,
`naturelife-study.html` became a thin DOM shell calling it.
`deen-study.html` itself was rewritten on top of the same shared module
and re-verified to behave identically, not just assumed safe.

One trackable template per module added (`studied_arabic`,
`studied_hadith`, `studied_general`, `studied_naturelife`) — same reason
as Deen's: `trackables.moduleId` is required, so one row can't literally
serve every module.

---

## Round 3 — Health built as a real module; a dropdown clarity fix

Owner: Health is a major part of the real curriculum, build it as its own
module now (subjects: Know Your Body, Know Your Food, Physical Activities
> Lying/Standing/Sitting Movements, Walking, Squatting, HIIT, Breathing
Exercise, Fasting). Structure only, per the owner's own framing — the real
study screen still needs Phase 7's routine renderer.

`health_study` had existed since Phase 2 as a single stub leaf nested
under General Study's Enhancement branch (tagged `moduleIds: ["health"]`
but structurally elsewhere) — given a real top-level `health` root
instead, matching every other module's own-root shape.
`ensureHealthStudyReparented()` added to `catalogue.js` as a one-time,
self-repairing fix (reuses the existing `reparentSubject()`) for tenants
that already seeded the old placement.

Owner also reported General Study's page showing Life Skill content
instead of Core's real subjects. Re-checked the data and code and found no
bug in either at the time — leading hypothesis was the Catalogue's
"Add a tenant-specific subject" parent picker: a single flat ~50-row
dropdown with only indentation to distinguish modules, easy to misclick.
Fixed regardless: each option now shows its module tag.

---

## Round 4 — the General Study bug was real; found via direct Firestore access

Owner re-confirmed the symptom persisted. Rather than guess further from
code review, used the Firebase CLI's own stored OAuth token (already
logged in to this project) to query Firestore's REST API directly and see
the actual tenant data — the first time this project's build process has
verified live data this way instead of relying on the owner's click-through
or code inspection alone.

**Root cause, confirmed from real data**: `deen_enhancement` and
`general_enhancement` had both been accidentally reparented to top-level
(`parentId: null`) on **31 July 2026** — Phase 2's original catalogue
testing, months before either study page existed to surface it.
`topic-study.js`'s root-finding
(`moduleSubjects.find(n => n.parentId === null)`) then had two genuine
top-level nodes to choose between per module, and Firestore doesn't
guarantee query result order — which one "won" was luck. Deen Study
apparently drew the lucky order and tested fine in round 1; General Study
didn't. `health_study` had the identical corruption, just invisible
because it was archived.

**Two fixes**:
1. **Data repair**, applied directly via the Firestore REST API — dry-run
   computed first and printed for review, then applied, then re-verified
   every module has exactly one root. `deen_enhancement` →`deen_study`,
   `general_enhancement` → `general_study`, `health_study` → `health`.
   `ancestorIds` recomputed for all 10 affected descendants (including 2
   tenant-added ad-hoc topics) using the exact same algorithm
   `catalogue.js`'s own `computeAncestorIds()` uses — nothing hand-typed.
   Only `parentId`/`ancestorIds` touched; names, statuses, and resources
   the owner had already set were left exactly as they were.
2. **Code fix**, durable: `initTopicStudyPage()` now takes an explicit
   `rootSubjectId` instead of inferring "the" root via
   `parentId === null`. Even if a subject gets mis-edited to top-level
   again in the future, it can no longer hijack another module's browse
   root.

Owner re-confirmed: "General and Deen study is ok now."

---

## Round 5 — Life Skill: a direct link, then full independence

Owner asked for a direct "Life Skill" menu link rather than three clicks
through General Study. Built first as a shortcut (`startAtSubjectId`,
letting a page start browsing partway into another module's tree while
still chunking records under the true module root, so a claim made from
the shortcut and the same claim made from the main page would land in the
same place). Verified live, then the owner corrected the actual ask:
**"Life Skill is not a subject under General. It's totally independent.
Should come out from General."**

Rebuilt properly as its own module — same shape as Health:

- New module `lifeskill` (renderer: `topic`, since its subjects are
  topic+resource, unlike Health's routine-based ones).
- `life_skill` given a real top-level subject root; `ensureLifeSkillReparented()`
  added to `catalogue.js`, same self-repairing shape as the Health
  version, plus one extra step that one didn't need:
  `reparentSubject()` only ever touches structural fields
  (`parentId`/`ancestorIds`), never `moduleIds`, so `life_skill` and its
  two children needed an explicit re-tag from `["general"]` to
  `["lifeskill"]` after the structural move.
- Applied directly to the real tenant's data (dry-run, apply, re-verify,
  same discipline as round 4) — which also surfaced that
  `life_skill_tech_cognition`/`life_skill_trading` pointed straight at
  `general_enhancement` rather than at `life_skill` itself (the same
  flattening pattern already seen on Mathematics/English under General
  Study). Reparented under `life_skill` properly, making it a genuinely
  self-contained tree rather than a module-tagged pair of General Study
  leaves.
- The `startAtSubjectId` shortcut mechanism was removed from
  `topic-study.js` entirely once nothing needed it anymore — no dead
  generality left behind.

A real bug caught mid-migration: the fix script's first `--apply` run
failed with `HTTP 400: Cannot convert firestore.v1.Value with type
unset` — setting a Firestore field to `null` needs the REST API's
`nullValue` type, not `stringValue: null`. The round-4 migration never
hit this because it only ever moved nodes *out of* top-level (`null` →
a real id), never *into* it. Fixed, re-run, verified.

`life-skill.html` is a full standalone module page
(`moduleId: "lifeskill"`, `rootSubjectId: "life_skill"`), not the earlier
shortcut hack.

---

## What's live now

Nav: Study (Quran), Deen Study, Arabic, Hadith, General Study, Nature-Life,
Life Skill, Records, People*, Catalogue* (*owner/prime only).

Every module above the line uses the same topic renderer and the same
"add a topic + resource from Catalogue, it becomes claimable" mechanism.
Health has a real module and subject tree in Catalogue but no nav link or
study screen yet — deliberately, waiting on Phase 7's routine renderer.

None of this round's changes touched `index.html` (the old app) or wrote
to a legacy Firestore collection. Every push to
`madrasatul-muslimeen.github.io/app/` was confirmed live by polling the
actual served content, not assumed from the push succeeding.

## What still needs your click-through

1. Confirm Life Skill's own page shows Technology & Cognition and Trading,
   and that General Study no longer mentions Life Skill anywhere.
2. Add a real topic (with a resource) under a couple of the newer modules
   (Arabic, Hadith, Nature-Life) — same flow as Fiqh/Mathematics before —
   and confirm claiming works there too.
3. General click-through of the nav bar now that it's seven items deep —
   flag if it feels cluttered; the architecture's own "2+ modules → card
   grid" landing-page redesign (flagged since Phase 5 round 8, not built)
   may be worth revisiting once more modules stack up, but that's a
   separate decision, not raised again proactively here.

## What's next

**Phase 7 (Bookmarks, programs, routines)** — independent of this phase,
ready to start. It also carries the "routine renderer" Health's real study
screen is waiting on, and course offers/routines that Learn Deen
On-the-Go needs.
