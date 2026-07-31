# Phase 2 — Catalogue — Status

Last updated: 2026-07-31
Read alongside `CLAUDE.md`.

---

## Position

**Phase 2 built — all 7 features (F-021..F-027) in place, deployed, not yet
owner-verified.** `QuranRevival_Subject_Catalogue_v3.md` was approved as-is
at the start of this phase (D11 in CLAUDE.md) and is now the live content:
7 modules, a 41-node subject tree (6 top-level, 10 grouping, 31 studiable
subjects), and the 30 Approaches across their 7 sections, all seeded from
one platform master list into any tenant that opens the new catalogue
screen.

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

## What the owner should check

Everything below needs a real Google sign-in, which only you can do. Start
`Start Local Test Server.bat` first if it isn't already running.

1. **Open `catalogue.html` before self-check, not after** — self-check only
   reads what's already there, it doesn't create anything. Go to
   `http://localhost:8080/app/catalogue.html`, sign in. It should auto-seed
   your tenant's catalogue on first load (a one-line green status message),
   then show 7 modules, the full subject tree, and the 30 Approaches
   grouped into 7 sections. Click **Guide** on a couple of Approaches — is
   the wording good enough to ship, or does anything read wrong?
2. *Then* open `admin-self-check.html`, sign in, tap **Run self-check**.
   Expect all-green except a few *deliberately blocked* rows (platformAdmin
   self-grant, `rooms`, and the catalogue write-access row unless you're
   owner/prime in your active tenant) — those say "Correctly blocked, as
   designed" / "Blocked (expected)" and need no action. The "N write
   failures logged this session" note at the bottom counts those expected
   blocks too — it's not a sign anything is actually wrong.
3. If you're owner/prime: on `catalogue.html`, try renaming one subject and
   one Approach (Edit button), and add one custom subject and one
   ladder+level. If you're only a teacher/guardian/student in your active
   tenant, confirm you see the same screen but with no Edit buttons and a
   note explaining why.

## Next

Ready to start Phase 3 (Tracking core — records, activity, the 6 statuses,
confirmation) whenever you'd like, once the above is checked — or pause
here.
