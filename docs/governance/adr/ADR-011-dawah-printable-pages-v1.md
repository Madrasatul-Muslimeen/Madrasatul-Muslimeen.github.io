# ADR-011 — Dawah Printable Pages v1

- **Status:** ACCEPTED (Owner authority for the product terms, 24 Sep 2026;
  Master Architect authority for this record, MAP v4 Phase 7 task P7-A)
- **Date:** 2026-09-24
- **Contract identifier:** `dawah-printable-pages:v1`
- **Blast radius:** BR-0 — one pure policy module and one uninvoked data
  layer, for one new, additive, unruled and unactivated collection
  (`dawahPages`). No application behaviour, no screen, no schema change to
  any existing collection, no Rules change, no data change, and no
  `version.js` bump.

## Context

MAP v4 names Phase 7 (Dawah) and Phase 8 (Share/Media) as future modules. The
MAP v4 source document is not in this repository, so — as this platform's own
authority ordering requires (`CLAUDE.md`, "Authority and repository
evidence") — the Owner's own explicit product decisions ARE the Phase 7
definition, recorded here rather than re-derived from a document that is not
present.

ADR-005 already binds this space, pre-dating MAP v4 itself (2026-09-10):
*"Dawah is broader than Share. Every Dawah/Share artifact is derived output
and must never overwrite its source Note."* Nothing had yet given that
sentence a collection, a lifecycle, or a way to be enforced.

`app/js/note-foundation.js` already carries the Note Foundation this ADR
builds on: permanent Note identity (ADR-004), immutable full-snapshot
revisions, and the origin/reference binding (ADR-009). Nothing about the Note
Foundation changes here — Dawah reads a Note's own pinned revision once, at
creation, and never touches it again.

## Decision

### 1. Who may see a shared Dawah piece: the same tenant (Madrasah) only

No public link, and no posting outside the app. A `dawahPages` document is
readable only inside the tenant it was authored in — the same tenant
isolation (I13) every other Foundation collection already enforces at the
Rules layer, not merely in client queries.

### 2. What a Dawah piece is: a printable page made from a Note

A `dawahPages` document is a **frozen copy of one Note revision's content**
(`title`, `bodyHtml`), plus the source Study Unit key the Note was bound to,
if it had one. **No picture cards, audio or video in this phase.** A future
Phase 8 (Share/Media) is a separate decision and a separate ADR — this one
governs printable text pages only.

### 3. Approval: a child's piece needs approval; an adult's does not

**"Child" is `tenantPeople.isMinor === true`.** `app/js/people.js` already
writes this field on every person (`addPersonToTenant()`,
`updatePersonInTenant()`); nothing new is added to represent it.

**An approver is any of:**

- the person named in that minor's own `tenantPeople.managedByPersonId` (the
  guardian field `people.js` already writes and the deployed Rules already
  use for `isGuardianOf()`);
- a co-enrolled teacher — the same `teacherStudentLinks` mirror and the same
  `isCoEnrolledTeacherOf()` relationship the deployed Rules already use to
  scope a teacher's reach on Notes (`canReadNoteOf()`);
- a tenant owner or prime — an ordinary active
  `memberships/{tenantId}__{personId}__{role}` row for `owner` or `prime`.

**A child can never approve their own page.** This is checked first and
unconditionally in `isValidDawahApprover()` (`app/js/dawah-contract.js`), so
no later clause — a child who happens to also hold another role — can reopen
it.

**Nothing was invented to represent any of this.** `isMinor` and
`managedByPersonId` on `tenantPeople`, the `teacherStudentLinks` mirror, and
ordinary `memberships` rows are all pre-existing, already-written,
already-deployed-and-used facts. Verified directly against
`firestore.rules` (`isGuardianOf()`, `isCoEnrolledTeacherOf()`,
`isOwnerIn()`/`isPrimeIn()`) and `app/js/people.js`
(`addPersonToTenant()`/`updatePersonInTenant()`) before this ADR was written,
per this task's own instruction to stop and say so if the data could not
support the rule. It can.

### 4. ADR-005 still binds: a Dawah piece is derived output

A `dawahPages` document never repoints at a different Note or revision after
creation (`sourceNoteId`/`sourceRevisionId` are write-once), and no function
in `app/js/dawah-data.js` writes to `notes`, `noteRevisions`, `noteSources`,
`noteFolders` or `notePlacements` — the module does not import
`note-foundation.js` at all, which is the enforcement-by-inability this
platform's own standing lesson prefers over a rule a module is merely
trusted to follow (see `journey-map-contract.js`'s identical treatment of
"Origin ≠ Destination", ADR-010 §2).

### 5. The lifecycle: a closed set of four statuses, one-way except retire

| From | Action | To | Who |
|---|---|---|---|
| `draft` | `submit` | `awaiting-approval` | the author, when their piece needs approval |
| `draft` | `share` | `shared` | the author, **only** when their piece does not need approval |
| `awaiting-approval` | `approve` | `shared` | a valid approver (§3) |
| `awaiting-approval` | `return` | `draft`, with `returnedNote` | a valid approver (§3) |
| any non-`retired` status | `retire` | `retired` | the author (I4: archive, never delete) |

There is no `draft → shared` route for a page that needs approval, and no
`awaiting-approval → shared` route that skips a valid approver's decision —
both are refused by construction in `app/js/dawah-contract.js`'s
`dawahTransition()` and `canShareDirectly()`, and independently by the Rules
candidate (§6 below), so neither side alone is the only guard.

**Once `shared`, a page cannot return to `draft` or `awaiting-approval`.**
Only `retire` is reachable from `shared` — a shared page that needs
correcting is retired and a fresh page made from a fresh revision, never
edited in place, which is the same "no edit in place" discipline ADR-005
already applies to the Note it came from.

### 6. Document shape (`dawahPages/{tenantId}__{pageId}`)

All additive: `pageId`, `tenantId`, `authorPersonId`, `sourceNoteId`,
`sourceRevisionId`, `title`, `bodyHtml`, `sourceUnitKey` (nullable), `status`,
`approvedByPersonId` (nullable), `approvedAt` (nullable), `returnedNote`
(nullable), plus the I17 envelope (`schemaVersion`, `createdAt`, `updatedAt`,
`createdBy`). No `ownerUid`-style mirror field is carried — unlike the Note
Foundation family, nothing in this contract needs to query `dawahPages` by
uid, so one was not added.

## Consequences

- `dawahPages` stays unruled and unactivated. This ADR fixes its contract; it
  does not deploy, wire, or write anything. The Rules candidate is a
  self-contained extract in its own file
  (`docs/governance/phase7-dawah-pages-rules-candidate-2026-09-24.rules`),
  proven against an isolated Firestore emulator, and deployment is a
  separate Owner Control Gate.
- No screen exists yet (P7-B). `app/js/dawah-data.js` is reachable by no
  page — a boundary suite asserts that.
- Phase 8 (Share/Media) is untouched by this ADR and needs its own decision
  and its own record when it is picked up.

## Rollback

Delete the two modules and the Rules candidate file. Nothing imports either
module, no document has ever been written under this contract, and no
existing collection or document changes shape.
