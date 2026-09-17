# MAP Phase 6 — P6-B: the Mapping My Journey Rules candidate, and the defect P6-A recorded

- **Date:** 2026-09-15
- **Task:** MAP Phase 6, task P6-B
- **Method:** PRESERVE → RECONCILE → EXTEND; IMPLEMENT → TEST → AUDIT → CORRECT
- **Blast radius:** **BR-0.** One application file changed, by **40 insertions and 0 deletions**, and it is reachable from no page. Nothing deployed, nothing activated in production.
- **Application version:** **08.25, deliberately unchanged.**
- **Result:** ACCEPT — 7 of 7 Rules mutations and 3 of 3 wiring mutations proven to fail the suites; 0 failures across 16 pure suites and both emulator suites.

---

## 1. The Rules candidate

`docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules`, governing
exactly `noteFolders` and `notePlacements`.

**It is its own file, and that is the point.** The Phase 5 candidate is *queued
for deployment* — it is the text that gets pasted into the Firebase Console — so
a Phase 6 decision must never change what a Phase 5 deployment would apply. A
check holds the Phase 5 file byte-identical to `origin/main` and asserts it
governs neither collection; P6-A's mutation P8 proved that check can fail.

**The shared helper block is reproduced unchanged and held identical by a
check.** Two copies of a security model that drift apart is how one collection
quietly acquires a weaker rule than its sibling.

### What the rules enforce

| ADR-010 | Enforced as |
|---|---|
| §2 Origin ≠ Destination | **Structurally.** A placement's `keys().hasOnly()` list contains none of `sourceKey`, `sourceKind`, `relationshipKind`, `provenanceKind`, so an Origin field on a Destination document is refused *by the server*, not merely by the client |
| §3 Closed semantic role | The three-way `semanticRole` test, plus `semanticRole` frozen on update — a folder may be renamed, reordered, re-parented or retired, but may never become a different *kind* of folder |
| §3 System folders neither nested nor nestable | A system role forces `parentFolderId == null`, and nothing may name a system folder as its parent |
| §4 One hop of the tree | Parent must exist, share tenant and owner, be active, not be a system folder, and not be the folder itself |
| §5 A move is retire-and-create | **`folderId` and `noteId` frozen on update.** A placement can never be repointed, which is what would destroy the record that the Note was ever filed where it was (I4) |
| I4/D6 | `allow delete: if false` on both collections |

Both ends of a placement must be real, mine and active — the same three facts
`createNotePlacement()` already checked in its transaction, now enforced where a
client cannot skip them.

### The one thing the rules CANNOT do, stated rather than papered over

**Firestore Rules cannot prevent a cycle of length two or more.** `A → B → A`
satisfies every one-hop check, and Rules cannot walk an ancestor chain of
unknown length.

- Cycle and depth enforcement therefore live **client-side**, in
  `folderTreeRefusal()`.
- A determined client can corrupt **its own owner's** folder tree — never anyone
  else's, because every rule is owner-scoped.
- **Consequence for every consumer, and it is not optional: any walk of this
  tree must be bounded regardless of what the rules guarantee.**

The design that *would* close it at the server is **recorded rather than
adopted**: a materialised `ancestorIds[]` + `depth`, verified against the
parent's own — the shape I12 already uses for roll-ups — which makes a cycle
impossible because a folder would have to appear in its own ancestor list. Its
cost is that re-parenting becomes either forbidden or a multi-document rewrite
of every descendant that Rules cannot verify atomically. **Forbidding folder
moves is a product decision and an Owner Control Gate**, so v1 does not take it
unilaterally.

---

## 2. The defect P6-A recorded is now closed

`createNoteFolder()` validated `parentFolderId` **not at all**. It now:

1. Runs ADR-010's field rules through `journeyFolder()` **before any read**, so
   a malformed folder never costs a query;
2. Reads the person's own folders (a new `listNoteFoldersForOwner()`, equality-only
   and bounded — **no new composite index**, verified by the P5-E index suite);
3. Judges the proposed parent with `folderTreeRefusal()` and throws the reason.

**Why a read and not a transaction, stated in the code:** judging a tree needs
the person's other folders, and a Firestore transaction cannot run a query. The
race that leaves is narrow and bounded — two *concurrent* creates by the same
person could close a cycle, and the Rules cannot catch that either — which is
exactly why every consumer must bound its own walk.

---

## 3. Tests

| Suite | Result |
|---|---|
| Phase 6 emulator Rules suite (new) | **50 assertions, 0 failures, 0 expression-budget denials** |
| `note-foundation-data-layer.mjs` | **27 assertions** (15 + 12 new folder-validation cases) |
| Phase 5 emulator Rules suite | 60 assertions, 0 failures, 31 of 37 matrix cases — unchanged |
| 15 other pure suites | all green |

### Mutation testing — 10 of 10 proven able to fail

| # | Mutation | Caught by |
|---|---|---|
| R1 | Folder create drops `isNoteOwner` | F-OWN-03 — a guardian could create a folder for their child |
| R2 | `parentOneHopOk` always true | F-ROLE-03 |
| R3 | `semanticRole` vocabulary opened | F-ROLE-02 |
| R4 | Placement `folderId` no longer frozen | P-MOVE-01 |
| R5 | `bothEndsOk` dropped | P-END-01 |
| R6 | `sourceKey` allowed on a placement | P-ORIGIN-sourceKey |
| R7 | Folder delete allowed | F-LIFE-02 |
| W1 | `folderTreeRefusal()` no longer consulted | data-layer suite |
| W2 | `journeyFolder()` field validation skipped | data-layer suite |
| W3 | The folder read skipped entirely | data-layer suite |

Every denial in the emulator suite asserts its **deciding evaluation was a clean
`false`** — never an expression-budget refusal, which is what sank the Phase 4
Activity candidate.

---

## 4. Two checks and one suite corrected in place, with reasons

1. **`journey-map-boundary.mjs` — "no app source imports the journey contract"**
   became "the only importer is the data layer, itself unreachable", with the
   importer set **pinned** to `["app/js/note-foundation.js"]` and each importer
   asserted unreachable from every page. The claim that matters — nothing a
   reader can reach touches this — is unchanged.
2. **`note-foundation.js` byte-identity → addition-only** in the same suite, for
   the same reason as P5-E: the file is now extended, and "nothing removed or
   reshaped" is the claim that matters and is mechanically provable.
3. **`note-foundation-data-layer.mjs` broke the moment the import was added**,
   and the fix is worth recording because it is this project's own trap in a new
   costume: the suite loads the module from a **`data:` URL**, which cannot
   resolve a *relative* specifier. The pure contract is now rewritten to its real
   `file://` URL — resolved, not stubbed, because it is pure — the same technique
   the Phase 4 store suite already uses.

---

## 5. Nothing activated — verified

| Claim | Evidence |
|---|---|
| Nothing deployed | `firestore.rules` and `firebase.json` byte-identical to `origin/main` |
| The Phase 5 deployment candidate unchanged | byte-identical, and governs neither folders nor placements |
| Still unreachable | No page reaches `journey-map-contract.js` or `note-foundation.js` by any chain |
| Existing user notes preserved | `ayah-notes.js` byte-identical |
| Data layer extended, not reshaped | `note-foundation.js` diff is **40 insertions, 0 deletions** |
| MMJ still unavailable to a reader | the `tabJourneyBtn` pillar is still `disabled` |
| No new index needed | the P5-E index suite still reports index-requiring queries only where declared |
| No behaviour or layout change | the only tracked `app/` change is a file no page can load; `version.js` byte-identical |

---

## 6. Pending-dependency ledger

| # | Item | Blocked on |
|---|---|---|
| 1 | Phase 4 production activation | Firebase Console access — `claude/phase4-wiring` `c4fca4a` unmerged, 208-line Rules amendment undeployed |
| 2 | Phase 5 Note Foundation Rules | Firebase Console access — 60 emulator assertions |
| 3 | Phase 5 Note Foundation **indexes** | Firebase Console access — **must deploy with item 2** |
| 4 | P5-D — the Note editor surface | Items 2 and 3 |
| 5 | Phase 5 guardian approval window | Owner storage decision |
| 6 | **Phase 6 folders/placements Rules** | Firebase Console access — 50 emulator assertions, **new this task** |
| 7 | Server-side cycle prevention (`ancestorIds[]` + `depth`) | Owner decision: it costs the ability to move a folder |

---

## 7. Next

The Phase 6 *foundation* is now as complete as it can be without a deployment:
the contract is decided, the data layer validates against it, and both
collections have a tested Rules candidate. What remains in Phase 6 is the
**surface** — and it sits behind the same dependency as P5-D, for the same
reason: every write it made would be denied until the Rules are deployed, and
I15 requires that denial to reach the reader.
