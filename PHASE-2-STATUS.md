# Phase 2 — Catalogue — Status

Last updated: 2026-07-31
Read alongside `CLAUDE.md`.

---

## Position

**Phase 2 complete — all 9 features (F-021..F-029) built, deployed, and
owner-verified.** `QuranRevival_Subject_Catalogue_v3.md` was approved as-is
at the start of this phase (D11 in CLAUDE.md) and is now the live content:
7 modules, a 41-node subject tree (6 top-level, 10 grouping, 31 studiable
subjects), and the 30 Approaches across their 7 sections, all seeded from
one platform master list into any tenant that opens the new catalogue
screen. The owner ran it for real (tenant "Ahsan", owner role), found two
real bugs and asked for two real gaps to be closed — all fixed and built,
see below.

`app/` now has, beyond Phase 1's files: `catalogue.html`, and
`js/catalogue-data.js`, `js/catalogue.js`, `js/modules.js`. `firestore.rules`
gained a Phase 2 section covering `modules`, `subjectTemplates`, `subjects`,
`trackables`, `ladders`, `levels`, `personLevels` — deployed via
`firebase deploy --only firestore:rules`. `self-check.js` was extended to
verify all of it against the caller's real tenant.

## What was built

- **Module registry** (F-021) — `modules/{moduleId}`, platform-wide, 7 rows:
  QuranRevival (ayah renderer), Deen, Arabic, General, Nature-Life (topic
  renderer), Hadith (topic renderer), Health (routine renderer, matching
  the Architecture doc's renderer table). All start `status: "planned"` —
  none has a real screen yet; flipped to `"active"` module by module as
  Phases 4/6/12 actually ship them.
- **Subject tree** (F-022) — `subjectTemplates/{id}` (platform master,
  read-only after genesis) and `subjects/{tenantId}__{id}` (each tenant's
  own copy), both carrying `ancestorIds` computed from `parentId` so a
  roll-up can walk the chain in one query (I12). "Core"/"Enhancement" are
  real nodes, not labels, matching the catalogue doc's own instruction.
- **Copy-on-write** (F-023) — opening `catalogue.html` for a tenant with no
  subjects yet auto-seeds all 41 nodes and all 30 Approaches from the
  platform lists in one atomic batch. Any tenant-side edit sets `edited:
  true`, the flag the Architecture doc says should drive "update without
  overwrite" (a template-sync engine that actually reacts to that flag is
  not needed yet and wasn't built — nothing calls for it until a platform
  template itself changes after tenants have already copied it).
- **Trackables — the 30 Approaches** (F-024) — grouped into the 7 sections
  exactly as counted in the catalogue doc (6/7/2/4/4/3/4), each with a
  `panels[]` (Layout A tool list) and a `guide{what,how,measure}`. The
  guide text is a **first-draft I wrote during this build** — the catalogue
  doc names the 30 Approaches but doesn't supply Guide-tab copy. It's
  ordinary editable tenant data (catalogue doc, Part 5 note 4), not a
  decision, so I didn't stop to ask — but it's worth a skim, since it's
  the first real prose in the app that a student will read.
- **Ladders & levels** (F-025) — schema + CRUD only, no seeded content on
  purpose: the Architecture doc gives "General Grades, Hifz Years" as
  examples, not a spec, so `catalogue.html` just lets an owner/prime add
  their own ladders and ordered levels.
- **Catalogue admin screen** (F-026) — `catalogue.html`: view the module
  list, the full subject tree (indented by depth), the 30 Approaches
  (with an expandable Guide box per approach), and ladders/levels.
  Owner/prime get inline rename controls and the "add a subject" /
  "add a ladder or level" forms; everyone else sees the same screen
  read-only, matching the role table (teacher explicitly cannot configure
  the catalogue).
- **Layer 1 security rules** (F-026) — reads open to any tenant member;
  writes to owner/prime/platformAdmin (`canAdminCatalogue`), except the
  one-time template-copy seed writes, which any signed-in/tenant member
  may perform (harmless, identical, additive content — same "first writer
  wins on fixed content" shape already used for the Phase 1 tenant
  bootstrap). No client delete anywhere (I4/D6). Deployed.
- **Self-check extended for Layer 1** (F-027) — `admin-self-check.html` now
  also confirms, against your real tenant: all 7 modules present, the
  subject tree has at least 41 nodes with a valid `ancestorIds` chain on
  every one, all 30 Approaches are present across all 7 sections, and a
  real write to your own tenant's `subjects/quran` row succeeds only if
  you hold owner or prime (an *expected block* otherwise, not a failure).
- **Subject re-parenting** (F-028) — the Edit control on a subject now
  changes its "Level (parent)" as well as its name. This isn't a single
  -field edit: moving a node recomputes `ancestorIds` for it and every
  descendant (I12 -- a stale chain silently breaks roll-ups), and flips the
  old/new parent's `isTrackable` if the move changes whether either still
  has children. Refuses a move that would nest a node under its own child;
  the parent-picker also never offers an invalid target in the first place.
- **Archive/Restore** (F-029) — the owner asked for delete; I4/D6 are
  explicit and binding ("nothing is ever deleted... no client-side delete
  anywhere") so this became a reversible status flip instead, confirmed
  with the owner as the right substitute. Archive/Restore now sits next to
  Edit on subjects, Approaches, ladders, and each individual level; each
  table has a "Show archived" toggle, off by default. Archived subjects
  drop out of parent-picker dropdowns so nothing new gets filed under a
  retired branch.

## Real bugs found and fixed along the way

Same discipline as Phase 1: caught by the owner actually running it against
production, not by review.

1. **Seed batch hit Firestore's rules-evaluation ceiling, not the write
   limit.** The first `catalogue.html` visit seeds 41 subjects + 30
   trackables in one batch. That's nowhere near the 500-write batch limit,
   but Firestore separately caps the total `get()`/`exists()` calls a
   single transaction or batched write may spend evaluating security rules
   at 20 -- shared across the *whole* commit. Every one of those 71 creates
   needs an owner/prime lookup (`get()`+`exists()` on `tenantMemberUids`),
   so one batch blew straight through that ceiling and Firestore denied the
   entire commit with a bare `permission-denied`. Fixed by chunking the
   seed into small batched commits (5 docs each) and making the seed diff
   against what's actually already in the tenant, so a partial run repairs
   itself on the next visit instead of silently appearing "done."
2. **Subject tree displayed out of order.** `getSubjectTree` sorted the
   whole flat 41-node list by `order` globally, but `order` is only ever a
   per-sibling rank (each group of children restarts at 1) -- so unrelated
   branches sharing a rank interleaved instead of nesting, and Agro-Farming
   visually floated up next to Quran. The `parentId`/`ancestorIds` data was
   always correct; only the display order was wrong. Fixed with a proper
   depth-first walk (`orderForDisplay`).

## One design decision made without stopping to ask, flagged for review

The catalogue doc tags the Hadith node `[QuranRevival / Deen]`, but its own
Part 5 also says no node uses `moduleIds[]` for more than one module, and
the Architecture doc's Phase 12 module list names Hadith as its own fifth
module (with Arabic, General Study, Health, Nature-Life) — two statements
in the approved source that don't agree with each other. Built as: **Hadith
is its own module** (`moduleIds: ["hadith"]`), reading the bracket as
descriptive text about Hadith's role, not a literal dual-module tag. This is
recorded as part of D11 in CLAUDE.md. If the real intent was a genuinely
shared QuranRevival/Deen node, it's a one-field data fix, not a rebuild —
just say so.

## Owner verification — done

Confirmed working end-to-end against production by the owner (tenant
"Ahsan", owner role): catalogue seeds cleanly, self-check all-green except
the deliberately-blocked rows, subject tree displays correctly nested,
rename + re-parent + Archive/Restore all exercised successfully.

## Next

**Phase 2 is closed.** Ready to start Phase 3 (Tracking core — records
chunked per surah/subject, activity per week, the 6 statuses, Not-
Applicable exclusion, unit keys incl. hizb/rub/manzil, domainIds,
confirmation + bulk confirm + return) whenever you'd like.
