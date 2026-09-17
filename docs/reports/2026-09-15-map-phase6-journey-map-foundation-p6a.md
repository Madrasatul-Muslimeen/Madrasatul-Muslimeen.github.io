# MAP Phase 6 — P6-A: Mapping My Journey reconciled with the Note Foundation (ADR-010)

- **Date:** 2026-09-15
- **Task:** MAP Phase 6, task P6-A — the reconciliation the directive requires before any Phase 6 foundation is built
- **Method:** PRESERVE → RECONCILE → EXTEND; IMPLEMENT → TEST → AUDIT → CORRECT
- **Blast radius:** **BR-0.** One pure module, imported by nothing. `git diff origin/main -- app/` shows **no tracked change at all** beyond the new file. Nothing activated.
- **Application version:** **08.25, deliberately unchanged.**
- **Result:** ACCEPT — 9 of 9 mutations proven to fail the suites; 0 failures across 13 suites.

---

## 1. Why a reconciliation, and not an implementation

The directive is explicit: *"Do not activate `noteFolders` / `notePlacements`
prematurely merely because Phase 6 has begun. First reconcile Phase 6
requirements with the accepted Note Foundation and ADR-009."*

That is the whole of this task. Mapping My Journey has been named in the
accepted architecture since 2026-09-10 and has a **disabled placeholder pillar
in the live app**; `createNoteFolder()` and `createNotePlacement()` have sat in
the data layer since Phase 5, unruled and uninvoked. **Nothing had ever decided
what they mean.**

### What the reconciliation found

**`createNoteFolder()` validates `parentFolderId` not at all.** It calls
`createDocument()` directly, with no lookup of any kind — where its sibling
`createNotePlacement()` opens a transaction and checks that both documents
exist, share the tenant and owner, and are active. So today a folder may name a
parent that does not exist, one belonging to **another person or another
tenant**, or **itself**; and two folders may name each other, producing a cycle
that any tree walk follows for ever.

Harmless while the collection was unruled and uninvoked. It is the *core
structure* of MMJ, so it stops being harmless the moment Phase 6 starts.

**`semanticRole` is free text defaulting to `"user"`.** It is the only field
that can carry the locked distinction "Reflection Archive ≠ Personal Journey
Map", and nothing constrains it — the identical shape of drift ADR-009 closed
for `noteSources`, found a second time in the same data layer.

---

## 2. ADR-010, and what it deliberately does not decide

`docs/governance/adr/ADR-010-mapping-my-journey-foundation-v1.md`, contract
identifier `journey-map-contract:v1`. It adds no new intent: it makes four
already-accepted statements **enforceable**.

| § | Decision |
|---|---|
| 1 | MMJ reads the Note Foundation and defines no Note of its own |
| 2 | Origin and Destination are different relations and may never be derived from each other |
| 3 | `semanticRole` is a closed set of exactly three: `journey-map`, `reflection-archive`, `user` |
| 4 | A folder tree is a tree: acyclic, own-owner, depth-bounded at 8 |
| 5 | Placement is many-to-many; a move is two facts, never a rewrite |

### §2 names a temptation, because it is a real one

Auto-filing a Note into a folder named for its `sourceKey` looks helpful, and
would quietly make **Destination a function of Origin** — collapsing a
distinction the architecture locks. So a `noteSources` document may never carry
`folderId`, a `notePlacements` document may never carry any of the four Origin
field names, and no code may compute one from the other.

**The enforcement is inability, not restraint.** `journey-map-contract.js`
imports *nothing at all* — no `study-note-binding.js`, no `unit-keys.js`, no
`buildUnitKey`, no way to parse a Study Unit key. A check asserts that absence.
A module that cannot see an Origin cannot derive a Destination from one.

### §3 decides the minimum, and says so

`journey-map` and `reflection-archive` are **system roles**: at most one of each
per (tenant, person), never renameable into each other or into `user`, and
**neither nested nor nestable** — nesting the Archive inside a user folder would
let a person hide it, and nesting it under the Map would make one a part of the
other. That is the locked distinction undone by a drag.

It decides **nothing** about what a Journey Map looks like, what it is for, how
it is drawn, or what belongs in it. That is product, and an Owner Control Gate.
A fourth semantic role is likewise an Owner decision.

*The alternative reading was weighed and recorded:* that "Reflection Archive ≠
Personal Journey Map" names two concepts rather than two containers. Rejected,
because two concepts sharing one container are not distinguishable in the data —
the distinction could then only be described, never enforced, and **a locked
distinction that cannot fail a check is not locked.**

### §4's depth bound has a reason, not a round number

Every consumer of a tree walks it, and an unbounded depth turns one pathological
chain into an unbounded read on a screen that must open fast (Architecture
Part 8). Eight is deep enough that no real filing scheme meets it and shallow
enough that a full walk is cheap.

`folderTreeRefusal()` returns a **reason string**, not a boolean: every one of
these refusals has to reach a person as a sentence, and `false` cannot be
translated into one. Seven distinct reasons — `self-parent`, `parent-missing`,
`parent-not-mine`, `parent-not-active`, `parent-is-system`, `cycle`,
`ancestor-missing`, `too-deep`.

### §5 keeps I4 true through a drag

"Moving" a Note is **retiring one placement and creating another**. There is no
"update the placement's `folderId`" shape anywhere in the module, because that
operation destroys the record that the Note was ever filed where it was. A check
asserts the retirement does not carry the new folder and that no in-place update
shape exists.

---

## 3. Tests

| Suite | Result |
|---|---|
| `tools/i18n-verify/journey-map-contract.mjs` | **20 passed** |
| `tools/i18n-verify/journey-map-boundary.mjs` | **13 passed, 0 failed** |
| 11 other pure suites | all green, unchanged |

The pure suite is organised by **locked distinction** rather than by function,
because what is being proven is that each distinction can fail a check.

### Mutation testing — 9 of 9 proven able to fail

| # | Mutation | Caught by |
|---|---|---|
| P1 | `semanticRole` vocabulary re-opened | J1 |
| P2 | A system folder may have a parent | J3 |
| P3 | Origin fields silently dropped instead of refused | J4/J5 |
| P4 | Cycle detection removed | J8 |
| P5 | Depth bound removed | J11 — "one deeper is refused" |
| P6 | A move becomes an in-place `folderId` rewrite | J15/J16 |
| P7 | The contract imports the Origin binding | boundary — "must import nothing at all" |
| P8 | A `noteFolders` block leaks into the Phase 5 deployment candidate | boundary — the queued candidate is byte-identical |
| P9 | An app module imports the journey contract | boundary reachability |

**P8 is the one worth naming.** A Phase 6 decision must never change what a
Phase 5 deployment would apply, and the queued candidate file is the thing that
would be pasted into the Firebase Console. The check holds it byte-identical to
`origin/main` *and* asserts it governs neither folders nor placements.

---

## 4. Nothing activated — verified

| Claim | Evidence |
|---|---|
| `noteFolders` / `notePlacements` unruled | `firestore.rules` byte-identical; governs none of the five Note collections |
| The queued Phase 5 candidate unchanged | byte-identical to `origin/main`, and carries no folder/placement block |
| Existing user notes preserved | `ayah-notes.js` byte-identical |
| Note Foundation untouched by P6-A | `note-foundation.js` byte-identical to `origin/main` |
| MMJ still unavailable to a reader | the `tabJourneyBtn` pillar is still `disabled` |
| MMJ is not a second Notebook | the Note collection set in `collections.js` is unchanged, asserted by name |
| No behaviour or layout change | `git diff origin/main -- app/` reports **no tracked change**; `version.js` byte-identical |

---

## 5. Recorded, not fixed

- **`createNoteFolder()`'s missing parent validation.** It is now a *recorded*
  defect with an accepted contract to validate against. Fixing it means making
  the data layer call `folderTreeRefusal()` — which requires reading the
  person's folders, which is the activation P6-B covers. Fixing it inside a
  reconciliation task would have activated the collection by the back door.
- **The Rules candidate for `noteFolders` / `notePlacements`** is P6-B, and
  belongs in its **own file** for exactly the reason P8 tests.
- **The guardian approval window** (Phase 5, matrix GUARD-05/06/07) still awaits
  an Owner storage decision.

---

## 6. Pending-dependency ledger

| # | Item | Blocked on |
|---|---|---|
| 1 | Phase 4 production activation | Firebase Console access — `claude/phase4-wiring` `c4fca4a` unmerged, 208-line Rules amendment undeployed |
| 2 | Phase 5 Note Foundation Rules | Firebase Console access — candidate at 60 emulator assertions |
| 3 | Phase 5 Note Foundation **indexes** | Firebase Console access — **must deploy with item 2**, or the collections authorise queries they cannot execute |
| 4 | P5-D — the Note editor surface | Items 2 and 3 |
| 5 | Phase 5 guardian approval window | Owner storage decision |
| 6 | Phase 6 activation of folders/placements | Its own Rules candidate (P6-B), then a deployment |

---

## 7. Next

**P6-B — the `noteFolders` / `notePlacements` Rules candidate and its emulator
suite**, in its own file, plus wiring `folderTreeRefusal()` into
`createNoteFolder()` so the recorded defect is closed against a tested rule
rather than against a hope. Neither needs a deployment to build or to prove.
