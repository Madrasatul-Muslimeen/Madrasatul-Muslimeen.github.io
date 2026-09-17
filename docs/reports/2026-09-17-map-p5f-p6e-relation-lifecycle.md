# MAP P5-F / P6-E — the two relation collections could be written and never taken back

- **Date:** 2026-09-17
- **Task:** close the remaining write-only gaps in `noteSources` and `notePlacements`, both authorised by accepted Rules and performable by nothing
- **Blast radius:** **BR-0.** Three `app/js` modules changed, all still unreachable from any page. No `.html` changed. `firestore.rules`, `firebase.json`, all four index candidates and all three Rules candidates **byte-identical**. Nothing deployed.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT. Two user-facing consequences closed. Data layer 77 → **95**, study-note service 29 → **32**, journey-map service 17 → **18**, Phase 6 emulator 58 → **60**. Coverage 1,803 / 47, `firestore-index-requirements` 8 / 0 — **no new index**.

---

## 1. The pattern, applied a third time

P6-C found that ADR-010 §5's retire-and-create had no retire function. P6-D found that `noteFolders` was create-only while the accepted Rules said *"a folder may be renamed, reordered, re-parented or retired"*. Asking the same question of the two remaining relation collections found two more, and both have a consequence a person would actually hit.

### G1 — a Note could be anchored to a Study Unit and never un-anchored

The accepted Phase 5 Rules candidate says it in one line:

> *A link may be retired, never repointed and never deleted.*

It permits an update affecting only `status` and `updatedAt`, and its emulator suite **already proves the server allows it** (REL-05). `listNoteSourcesForUnit()` already defaults to `status == 'active'`.

**So the read side was built for a writer that did not exist.** ADR-009 gave `noteSources` a writer, P5-E gave it a reader, and nothing gave it a way to take a link back. An origin recorded by mistake was permanent.

### G2 — a Note's position within a folder could never be set

`placementIdentityUnchanged()` freezes `placementId`, `noteId` and `folderId`, so **`order` and `status` are the only fields an update may touch.** `retireNotePlacement()` covered `status`. Nothing covered `order` — and the Phase 6 composite index candidate exists *for it*:

> `listNotePlacementsForFolder()` — a folder's contents, in the author's own order

while `folderContents()`'s own comment promises "in the author's own order". **An index was specified, and a promise made, for a field no code could change after creation.**

## 2. What was added

| Function | Sends | Why that shape |
|---|---|---|
| `retireNoteSource` | `status` only | a repoint is what ADR-009's closed vocabulary exists to prevent; the Rules refuse it too (REL-06) |
| `reorderNotePlacement` | `order` only | a `folderId` change would be a move that rewrote its own record instead of retiring and creating (ADR-010 §5, I4) |
| `unbindStudyNoteSource` | — | the ADR-009 service's own wrapper; records no Activity, because un-anchoring is not study |
| `reorderFiling` | — | the MMJ service's wrapper; a move between folders is still `moveNoteToFolder()` |

## 3. Two deliberate non-cascades

**Retiring a link does not touch the Note.** Retiring the last link leaves the Note active and reachable through `listNotesForOwner()`. A Note is not defined by what it is about (ADR-004), and cascading would give **Origin the power to remove a Note** — the mirror of the derivation ADR-010 §2 forbids in the other direction. Asserted by a check that puts a real Note document in the stub and counts writes to the `notes` collection: zero.

**No restore function was added, and that is a stated omission.** The accepted Rules permit `status` to move in either direction, so a restore *would* be authorised — but no accepted document asks for one, and "can a person un-retire a link they retired" is a product question, not a derivation. Flagged rather than invented.

## 4. A test-harness defect found on the way

`study-note-service.mjs`'s `reset()` cleared its call log by **hand-written list**:

```js
calls.create.length = 0; calls.update.length = 0; calls.retire.length = 0; ...
```

It silently forgot `unbind` the moment P5-F added the key, so calls accumulated across cases and a count assertion failed for a reason with nothing to do with the code under test. It now clears every key, the way `journey-map-service.mjs` already did.

**Worth recording as the general shape: a fixture that enumerates what to reset is a fixture that will be wrong the next time something is added to it.** This one failed loudly, which is the good case; the bad case is a leaked call that makes a later assertion pass.

## 5. Verification

| | |
|---|---|
| `note-foundation-data-layer.mjs` | 77 → **95** (47 + 30 P6-D + 18 P5-F/P6-E) |
| `study-note-service.mjs` | 29 → **32** |
| `journey-map-service.mjs` | 17 → **18** |
| Phase 6 emulator | 58 → **60** (`P-ORDER-01` allow, `P-ORDER-02` the smuggled `folderId` denied) |
| `journey-map-boundary` / `study-note-boundary` | **13 / 0** and **17 / 0** — still unreachable, insertion-only intact |
| `note-foundation-boundary`, `emulator-scaffold`, `note-journal-evidence`, `study-note-binding` | 30 / 31 / 18 / 16, unchanged |
| `study-activity-evidence-boundary`, `study-approach-contract-boundary`, `stub-parity` | 15 / 16 / 3, unchanged |
| `firestore-index-requirements` | **8 / 0 — no new index.** Both additions are document updates; no query was added |
| Translation coverage | **1,803 / 47** — unchanged, no new user-visible string |
| `firestore.rules`, `firebase.json`, 3 Rules candidates, 4 index candidates, every `app/*.html` | **byte-identical** |

## 6. Flagged, not changed

- **No restore path** for a retired link or placement, per §3 — authorised by the Rules, asked for by nothing.
- **The refusal messages still need translating** when a surface exists (I11), as P6-D already flagged. `unbindStudyNoteSource` adds no new reason string; it forwards the data layer's.
- **Nothing was wired to a page.** All three modules remain unreachable, and the Journey Map and Note editor surfaces stay behind the same Rules-and-indexes gate.

---

*Master Architect audit: BR-0, additive, no accepted decision changed, no Owner Control Gate crossed. Both gaps were identified by reading what the accepted Rules candidates authorise and comparing it with what the data layer can perform — the third time that comparison has produced real work with no new authority.*
