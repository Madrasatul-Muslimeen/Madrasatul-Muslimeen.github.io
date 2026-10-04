# ADR-010 — Mapping My Journey Foundation v1

- **Status:** ACCEPTED (Master Architect authority, MAP Phase 6 task P6-A)
- **Date:** 2026-09-15
- **Contract identifier:** `journey-map-contract:v1`
- **Blast radius:** BR-0 — one pure policy module, imported by nothing. No
  application behaviour, no schema change, no Rules change, no data change, and
  **no activation of `noteFolders` or `notePlacements`.**

## Context

Phase 6 begins with a reconciliation, not an implementation. Mapping My Journey
(MMJ) has been named in the accepted architecture since 2026-09-10 and has a
**disabled placeholder pillar** in the live app; the data layer has carried
`createNoteFolder()` and `createNotePlacement()` since Phase 5, unruled and
uninvoked. Nothing has ever decided what they mean.

Four accepted statements constrain MMJ, and this ADR does nothing but make each
one enforceable:

Three are locked distinctions, quoted here **verbatim** from
`ACTIVE-ARCHITECTURE.md` so that a check can hold this ADR and the architecture
to the same words:

> - Mapping My Journey ≠ a separate Notebook subsystem.
> - Note Origin ≠ Note Destination.
> - Reflection Archive ≠ Personal Journey Map.

The fourth comes from the accepted Note Foundation contract
(`note-foundation-contract.json`) and ADR-004: folder placement is a
**many-to-many relation**, and moving a Note never changes its identity.

### What was found while reconciling

**`createNoteFolder()` validates `parentFolderId` not at all.** It calls
`createDocument()` directly, with no lookup of any kind — unlike its sibling
`createNotePlacement()`, which opens a transaction and checks that both
documents exist, share the tenant and owner, and are active. So a folder may
today name a parent that does not exist, one belonging to **another person or
another tenant**, or **itself**; and two folders may name each other, producing
a cycle that any tree walk would follow for ever.

That was harmless while the collection was unruled and uninvoked. It is the
core structure of MMJ, so it is not harmless now.

**`semanticRole` is free text defaulting to `"user"`.** It is the only field
that could carry "Reflection Archive ≠ Personal Journey Map", and nothing
constrains it — the identical shape of drift ADR-009 closed for `noteSources`.

## Decision

### 1. MMJ reads the Note Foundation. It never defines a Note of its own

MMJ is a *destination* over `notes`. It may introduce no collection that stores
Note content, no second note identity, and no parallel revision chain. This is
the enforceable form of "≠ a separate Notebook subsystem", and it is what makes
"the Master Notebook" a view rather than a system.

### 2. Origin and Destination are different relations and may never be derived from each other

| | Collection | Answers |
|---|---|---|
| **Origin** | `noteSources` (ADR-009) | *What is this Note about?* |
| **Destination** | `notePlacements` → `noteFolders` | *Where has its author filed it?* |

A `noteSources` document may never carry `folderId` or `placementId`. A
`notePlacements` document may never carry `sourceKey`, `sourceKind`,
`relationshipKind` or `provenanceKind`. **No code may compute one from the
other** — not "file it automatically under the surah it is about", not "infer
what it is about from the folder it is in". Both are relationships to the same
permanent Note (ADR-004) and neither is identity.

The temptation this forbids is a real one and worth naming: auto-filing a Note
into a folder named for its `sourceKey` looks helpful and would quietly make
Destination a function of Origin, collapsing the distinction the architecture
locks.

### 3. `semanticRole` is a closed set of exactly three

- `journey-map` — the Personal Journey Map.
- `reflection-archive` — the Reflection Archive.
- `user` — a folder the person made and named themselves.

`journey-map` and `reflection-archive` are **system roles**: at most one of each
per (tenant, person), and a folder may never change from one role to another
or into `user`. `user` folders are unlimited and freely named.

**What this decides, and what it deliberately does not.** It decides only the
minimum the locked distinction requires — that the Archive and the Map must not
be the same container, and must be distinguishable without reading a name a
person can change. It decides **nothing** about what a Journey Map looks like,
what it is for, how it is drawn, or what belongs in it: that is product, and an
Owner Control Gate. A fourth semantic role is likewise an Owner decision.

*Alternative reading considered:* that "Reflection Archive ≠ Personal Journey
Map" names two concepts rather than two containers. Rejected because two
concepts that share one container are not distinguishable in the data, so the
distinction could not be enforced, only described — and a locked distinction
that cannot fail a check is not locked.

### 4. A folder tree is a tree: acyclic, own-owner, depth-bounded

- A parent must exist, be **active**, and belong to the **same tenant and the
  same owner** — the check `createNotePlacement()` already performs, which
  `createNoteFolder()` never did.
- A folder may not be its own ancestor. Self-parenting and longer cycles are
  both refused.
- Depth is bounded at **64** including the root (S9, 4 Oct 2026, decision 66: lifted from 8, which was the app's own limit and never a Rules one; what remains is a technical guard, and the cycle refusal is unchanged). A bound is required because
  every consumer of a tree walks it, and an unbounded depth turns one
  pathological chain into an unbounded read on a screen that must open fast
  (Architecture Part 8). Sixty-four is deeper than any real filing scheme goes
  (the Owner's "without a limit") and still small enough that a full walk is
  cheap. (It was eight until S9.)

### 5. Placement is many-to-many, and a move is two facts, never a rewrite

One Note may be placed in several folders at once; one folder holds many Notes.
"Moving" a Note is retiring one placement and creating another — **never**
editing a placement's `folderId`, which would destroy the record that it was
ever filed elsewhere (I4), and never touching the Note (ADR-004: moving a Note
never changes its identity).

## Consequences

- `noteFolders` and `notePlacements` **stay unruled and unactivated.** This ADR
  fixes their contract; it does not deploy, wire, or write anything.
- The Rules candidate for both collections is a separate bounded task (P6-B),
  and belongs in its own file: the Phase 5 candidate is queued for deployment
  and adding to it would change what gets deployed.
- `createNoteFolder()`'s missing parent validation is now a **recorded defect**
  with an accepted contract to validate against, rather than an unnoticed one.

## Rollback

Delete the module. Nothing imports it, no document has been written under this
contract, and no existing document changes shape.

## Amendment 1 — Sections, folder looks and Tags (Siyagah round 7, 1 Oct 2026)

**Authority.** Owner decisions M2 ("sections sit above folders"), M3 (folder
colours required), 42.5 ("we need Tag only, not 'type'") in
`docs/governance/2026-09-27-owner-decisions.md`. The Owner publishes the Rules;
the Architect never deploys.

**What it adds, all additive, nothing existing changes shape:**

1. **`noteFolders` gains three optional fields.** `color` (`#RRGGBB` or
   absent/null), `bold` (bool or absent/null), and `sectionId`. Only a **root
   `user` folder** may carry a `sectionId`; a nested folder inherits its root's
   section, and a system folder (§3) is never filed under one — so the Map and
   the Archive stay roots of their own meaning. The section must be the
   owner's own, and **active when a folder is (re)assigned to it**; a folder
   already in a section that is later retired keeps working until moved.
2. **`noteSections`** (new): `{tenantId}__{sectionId}`, a named, ordered,
   optionally coloured/bold group of root folders. Same ownership, read and
   retire-never-delete model as `noteFolders`.
3. **`noteTags`** (new): `{tenantId}__{tagId}`, a name and an optional colour.
4. **`noteTagLinks`** (new): one Note carrying one tag. **The Note document is
   not touched** — a tag is a link beside the Note, like a placement (§5), so
   the Note Foundation's revision chain (ADR-004, ADR-009) is unchanged and
   tagging never stamps a revision. `noteId` and `tagId` are frozen: untagging
   retires the link, tagging again restores it, and a restore needs both ends
   active.
5. **Note Types are deliberately absent.** No `type`/`kind` field exists on any
   of these documents, and the Rules refuse one.

**Rejected alternative: a `tags[]` array on the Note.** It would put a
mutable, non-revisioned field on the one document whose every change is a
revision, and an array cannot be retired one element at a time (I4).

**No composite index is needed.** Every list is equality-only on
`tenantId`, `ownerPersonId`, `status` with a `limit`, the same shape folder
lists already use in production.

**Proof.** `tools/firestore-emulator/siyagah-round7.rules.test.mjs` runs the
deployment candidate (`docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules`)
in the emulator: 75 cases, every denial paired with an allow differing in one
fact, every denial a clean `false`; mutation-proven rule by rule.

## Amendment 2 — Note flags and links between Notes (Siyagah round 14, 4 Oct 2026)

**Authority.** Owner decision 66 (the S8–S14 plan) in
`docs/governance/2026-09-27-owner-decisions.md`, issue #566, and the Siyagah
reference's Note shape (`docs/reference/2026-09-30-siyagah-folder-and-note-pane-handover-v2.md`
§1.3, §4). The Owner publishes the Rules; the Architect never deploys. The app
side stays switched off (`ready: false`) until the Owner says they are live.

**What it adds:**

1. **Four optional booleans on a Note:** `pinned`, `favourite`, `archived`,
   `finalised`. Absent reads as `false`, so every existing Note is unchanged.
2. **A second, flag-only update path.** On an **active** Note, the owner may
   change only these four flags (and `updatedAt`) **without a new revision**.
   Nothing else may move on that path — not the title, body, status or
   revision pointer.
3. **The content/revision path never moves a flag**, and is **closed while a
   Note is finalised**: no title, body, status or revision change at all until
   the owner un-finalises it (a flag write). So a finalised Note can be neither
   edited nor moved to Trash until it is un-finalised.
4. **`archived`** hides a Note from folder lists by default (an app rule). It
   is not `status: retired`: an archived Note is not in Trash and is never
   deleted.
5. **`noteLinks`** (new): `{tenantId}__{linkId}`, one Note linking to another
   Note of the **same owner** (`fromNoteId` → `toNoteId`). The app shows the
   reverse direction as "Linked from". A Note may not link to itself. Both
   ends are frozen: unlinking retires the link, linking again restores it, and
   a create or restore needs both Notes to exist, be the owner's own and be
   active. Read by the same people who may read the owner's Notes.

**Why flags may sit on the Note without a revision, when Amendment 1 rejected
a `tags[]` array there.** A revision records what a Note *says*. A flag records
how its owner *files* it — the same kind of fact as a placement or a tag link,
which never stamp a revision either. Four fixed booleans have none of the
array's problem: each is one value, set or cleared on its own, and the Rules
can type-check every one. Putting them on the Note is what lets a folder list
sort pinned Notes first and hide archived ones from the one read it already
makes, with no second collection to join.

**No composite index is needed.** Link lists are equality-only
(`tenantId`, `ownerPersonId`, `fromNoteId` or `toNoteId`, `status`) with a
`limit`.

**Firestore's expression budget.** With two `allow update` clauses on `notes`,
evaluating both in full exceeds Firestore's 1,000-expression limit (measured in
the emulator). So each clause starts with the cheap test that tells it from the
other — `noteFlagsUnchanged() && notFinalised()` on the content path,
`onlyFlagsChange()` on the flag path — and a write meant for one path leaves
the other in a few expressions.

**Proof.** `tools/firestore-emulator/siyagah-round14.rules.test.mjs` runs the
deployment candidate (`docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules`)
in the emulator: 60 cases, every denial paired with an allow differing in one
fact; mutation-proven rule by rule: 16 mutations, each caught by its own case. Removing the cheap first test from the content path makes a plain pin write fail on the budget, so the clause order is load-bearing and is itself under test.
