# Phase 11 — Curriculum, grades & resources — Build Log (round 1)

Read alongside `CLAUDE.md` and `PHASE-10-STATUS.md`. Built 11 August 2026,
v07.13, on Claude Code on the web (branch `claude/phase-11-gk2sed`).

---

## Position

**Round 1 complete, not yet owner-verified, and `firestore.rules` NOT yet
deployed** (this session has no authenticated Firebase CLI — same
constraint as every prior phase built on Claude Code on the web. The two
new match blocks below need the owner's own Firebase Console copy-paste
deploy, same as Phase 10's).

Scope, read directly from the Architecture doc's own Phase 11 row before
building (needs 10; delivers: "Curriculum units (cross-subject), plan
separate from content, 4 terms × 10 weeks, grades per ladder, dated level
history, resources as links and text", `F-117…F-130`, Stage C — "all other
subjects," gated by "curriculum + grades"):

1. **Ladders + levels (the schema half of "grades") were already built in
   Phase 2** (`F-025`, `catalogue.js`/`catalogue.html`) — a ladder and its
   levels can already be created and archived. What Phase 11 actually adds
   on the grades side is the missing piece: **assigning a person a level,
   over time, as dated history** (`personLevels`).
2. **`personLevels`' `firestore.rules` block already existed**, deployed
   ahead of time back in Phase 2/10 (see the block's own comment: "No UI
   yet (Phase 11 uses this), rule deployed now so a future phase doesn't
   hit 'no rule = fully denied' as a surprise" — same pattern as
   `tenantInvites` in Phase 1). It explicitly allows `create` but **not**
   `update` or `delete` — read that as intentional: a dated row, once
   written, is never corrected in place. `grades.js` was built to match
   that constraint exactly (see below), not worked around.
3. **`resources` already existed since Phase 6** (`resources.js`,
   `subjects.resourceIds[]`), but only as "one resource, set at the moment
   a topic subject is created." Phase 11 needed the fuller shape the
   Architecture doc always named: a real link from `curriculumUnits`, and
   a standalone browse/create screen so resources can be authored ahead of
   time and attached wherever needed. `resources.js`'s own old comment
   claiming "no tenant-wide list query" was checked against
   `firestore.rules` and found to be inaccurate for today's rules (the
   `anyMemberOf(tenantId)` shape already supports a `where("tenantId","==",…)`
   list query fine, same as `ladders`/`domains`/`courseOffers` already do)
   — it just hadn't been needed yet. Corrected in the file's own comment,
   `listResources()`/`setResourceStatus()` added.
4. **`curriculumUnits` and `curriculumPlan` were the two genuinely new
   collections** — no rule, no code, nothing written to them before this
   round.

---

## What was built

### `app/js/curriculum.js` (new)

`curriculumUnits/{tenantId}__{unitId}` — the CONTENT half (I8): `createCurriculumUnit()`
(cross-subject `subjectIds[]`, optional `levelId`, `order`), `listCurriculumUnits()`,
`setCurriculumUnitStatus()` (archive, I4/D6), `attachResourceIdToCurriculumUnit()`
(an `arrayUnion` onto `resourceIds[]` — a reference, not a copy, so archiving
the underlying resource stays the single source of truth).

`curriculumPlan/{tenantId}__{planId}` — the SCHEDULE half (I8):
`createCurriculumPlanEntry()`, `listCurriculumPlanForContext()`,
`setCurriculumPlanEntryStatus()` (archive), `moveCurriculumPlanEntry()`
(re-plan into a different term/week/order without touching the unit
itself). `contextType` is `"class"` or `"person"` — I1 ("nothing in Layer
2/3 ever requires a `classId`") only technically binds Layer 2/3, but the
same reasoning was extended here on purpose: a Family/Individual tenant
has no classes, so without a person-level context they'd get no real
curriculum scheduling at all under D13's own "owner's/family's own use
first" ordering. Term is `1`–`4`, week is `1`–`10`, both plain integers —
not tied to any real calendar date (`calendarTerms` is Operations/Phase
14, reserved, not built; I8 keeps adding that later safe, since it only
ever touches the schedule side).

### `app/js/grades.js` (new)

`assignPersonLevel()` — creates one `personLevels/{tenantId}__{personId}__{ladderId}__{fromDate}`
row (`fromDate` defaults to today, `YYYY-MM-DD`). Because the doc id
itself embeds `fromDate` and the deployed rule allows `create` but not
`update`, **a second assignment on the same ladder for the same person on
the same date is refused by the rules themselves** (Firestore evaluates a
`setDoc` against an existing path as an update, which this collection
never allows) — surfaces as a normal on-screen write failure (I15), not a
silent overwrite. `toDate` is written `null` and **stays** `null` forever;
there is no later step that goes back and closes the previous row (there
can't be — no update is allowed). `listPersonLevelHistory()` computes each
row's *effective* end date at read time — sort a ladder's rows by
`fromDate`, each row's effective end is the next-newer row's `fromDate` —
never reading it off the stored field. `getCurrentPersonLevels()` returns
the one row per ladder whose `fromDate` is the latest that isn't in the
future.

### `app/js/resources.js` (extended)

Added `listResources()` (tenant-wide browse — the collection's read rule
already supports this; see point 3 above) and `setResourceStatus()`
(archive, I4/D6, previously missing — the collection had no way to
deactivate a resource once created).

### `app/curriculum.html` (new)

Same sign-in-gate/nav-bar/tenant-shell every other Phase page uses.
Owner/prime only (`canAdminCatalogue` in `firestore.rules` is
owner/prime/`platformAdmin` for every Layer 1 catalogue collection this
page touches — same access model as Catalogue/Classes, not a new one).
Four sections:

- **Curriculum units** — create (name, cross-subject checkboxes pulled
  from the same `isTrackable` leaf list Classes/Course Offers already use,
  optional ladder+level, order), list as cards, archive, attach an
  existing resource from a dropdown.
- **Curriculum plan** — pick a context (Class, from `classes.js`, or
  Person, from the tenant roster), then place a curriculum unit into a
  term/week slot; the current plan for that context renders grouped by
  term, each row removable (archived, not deleted).
- **Resources** — standalone browse/create (link or text), archive.
  Feeds the dropdown in Curriculum units above.
- **Grades** — pick a person, see their current level per ladder plus
  full dated history (computed as described above), assign a new level
  (ladder + level + from-date, defaulting to today).

### `firestore.rules` — the two missing match blocks (NOT YET DEPLOYED)

Appended after `teacherStudentLinks` (end of file), same
`read: anyMemberOf(tenantId)` / `write: canAdminCatalogue(tenantId)` /
no-delete shape every other Layer 1 catalogue collection already uses
(`ladders`, `classes`, `courseOffers`, `resources`, `domains`):

- `curriculumUnits/{tenantId}__{unitId}`
- `curriculumPlan/{tenantId}__{planId}`

`personLevels` and `resources` needed no rules change — both were already
correctly deployed (`personLevels` pre-emptively in Phase 2/10, `resources`
live since Phase 6).

### Nav, version, feature registry

**`app/js/nav.js`** — added "Curriculum" (owner/prime only) after Classes.
**`app/js/version.js`** — bumped to `07.13`.
**`app/js/feature-registry.js`** — Phase 11's `PHASE_RESERVATIONS` entry
flipped from `"planned"` to `"built"`, with a delivers note pointing back
here. Individual `F-117…F-130` entries were not broken out (same as
Phases 8–10's own entries — a phase-level reservation with a status flip
and a pointer to its own status file, not a full per-feature listing).

---

## Verification status

Mechanically verified during the build (no real Google account or
authenticated Firebase CLI available in this environment):

- `node --check` on every new/changed `.js` file (`curriculum.js`,
  `grades.js`, `resources.js`, `classes.js` as a smoke check of the shared
  import shape) — parses cleanly.
- `curriculum.html`'s inline `<script type="module">` block extracted and
  `node --check`ed — parses cleanly.
- `firestore.rules` — brace/paren counts balanced (210/210, 713/713), no
  duplicate `function` or `match` block names anywhere in the file.

**Not yet owner-verified** (needs a real signed-in browser session):

1. `firestore.rules` deployed (Firebase Console copy-paste, same as
   Phase 10 — this owner's click-through machine has no reliable
   Node/CLI). Until then `curriculumUnits`/`curriculumPlan` writes will
   403 — everything else on the page (ladders/levels read, resources,
   personLevels) already works against the live rules.
2. `curriculum.html` loads from the nav bar, version badge shows `07.13`.
3. Create a curriculum unit spanning two different subjects; confirm both
   show in its subjects line.
4. Create a resource, attach it to that unit, confirm it renders (link
   opens in a new tab; text shows inline).
5. Plan that unit into Term 1 / Week 1 for a real class, and separately
   for an individual person (no class) — confirms the person-context path
   actually works for a Family/Individual-shaped use, not just
   Tuition-Provider classes.
6. Remove a plan entry — confirm it disappears from that context's plan
   but the underlying unit is untouched (still listed under Curriculum
   units).
7. Assign a person a level on a ladder, then assign a **different** level
   on the same ladder with a later from-date — confirm History shows both
   rows with the first row's effective end matching the second row's
   start, and Current shows only the newer one.
8. Try assigning a level to the same person/ladder/date twice in a row —
   confirm it fails with an on-screen message (I15), not a silent
   overwrite of the first assignment.

---

## Explicitly not attempted this round (flagged, not a silent gap)

- **No wiring from a curriculum plan entry to real study progress.**
  Placing a unit in Term 2 / Week 3 does not yet make it show up inside
  any study renderer, nor does completing study work anywhere mark a plan
  entry done. The Architecture doc's Phase 11 row only promises the
  curriculum/plan/grades/resources data model and its own admin screen —
  same "data layer + admin UI first, renderer wiring is a separate round"
  shape Phase 7 round 2 already used for course offers (`bookmarks.resume.programId`
  still isn't wired to a real enrolled offer either, as CLAUDE.md's own
  v07.11 note says).
- **No per-unit resource removal** — a unit's `resourceIds[]` only grows
  (`arrayUnion`); there's no "detach just this one reference" control.
  Matches the existing subject-level resource UX in `catalogue.html`
  (also add-only, no per-resource removal there either) — not a new gap
  introduced this round, an existing pattern followed.
- **No UI for creating ladders/levels from this page** — deliberately
  left on the Catalogue page where it already lives (`F-025`); a note
  ("create one on the Catalogue page") shows instead of duplicating that
  form here.
