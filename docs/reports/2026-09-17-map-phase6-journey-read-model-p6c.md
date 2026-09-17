# MAP Phase 6 — P6-C: the Mapping My Journey read model, the placement lifecycle, and the bounded walk

- **Date:** 2026-09-17
- **Task:** MAP Phase 6, task P6-C, continued from `main a3c689f` without pause
- **Blast radius:** **BR-0.** Two application files changed, by **180 insertions and 0 deletions**; one new module. No page can reach any of them.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT — 8 mutations run, 7 caught and the 8th proved a *correct* non-failure; 166 emulator assertions against the deployable text; 15 pure suites green.

---

## 1. The gap

Phase 6 had a decided contract (ADR-010), a tested Rules candidate, and a
validated `createNoteFolder()`. What it did not have was any way to *read* what
it writes:

- **`notePlacements` was write-only** — created and never read. A folder's
  contents could not be listed; there was no way to ask where a Note had been
  filed. Exactly the shape `noteSources` was in before P5-E.
- **ADR-010 §5's "a move is retire-and-create" was unexecutable.**
  `placementMove()` existed as pure policy and **nothing could execute it**,
  because no retire function existed at all.
- **P6-B concluded that any walk of the folder tree must be bounded** — Rules
  can enforce one hop and can never prevent a cycle — and then left every future
  consumer to remember that.

---

## 2. What was built

### Data layer (`note-foundation.js`, +113 lines, 0 removed)

`listNotePlacementsForFolder()`, `listNotePlacementsForNote()`,
`retireNotePlacement()`, `moveNotePlacement()`.

**The move is one transaction, deliberately.** Done as two writes, a failure
between them leaves the Note filed in both folders or in neither, and the reader
cannot tell which happened. Both ids are known up front, so no query is needed
and a transaction is available — unlike `createNoteFolder()`, which must read a
whole folder set to judge a tree and therefore cannot use one.

**A reasoned asymmetry between the two list queries, and it saves an index.**
`listNotePlacementsForFolder()` is **ordered**, because a folder may hold
hundreds of Notes and truncating that arbitrarily would really lose things.
`listNotePlacementsForNote()` is deliberately **equality-only**: the set of
folders *one* Note sits in is inherently tiny, so it is bounded by the data
itself, and ordering it in Firestore would cost a second composite index for no
real gain. The caller sorts the handful it gets.

### The bounded walk (`journey-map-contract.js`, +67 lines)

`buildFolderTree()` returns `{ roots, orphaned, cyclic }`.

**Nothing is silently dropped.** A folder the walk refuses is *named* in one of
the two lists, because a Note filed in a folder that vanished from the screen is
indistinguishable, to its author, from a Note that was lost. Past the accepted
depth of 8 a folder is kept and marked `depthCapped` rather than pruned away.

### Service (`journey-map-service.js`, new, uninvoked)

`folderContents()`, `noteFilings()`, `ownerFolderTree()`, `moveNoteToFolder()`.

**A retired Note is excluded by the NOTE's status, not the placement's** — the
same asymmetry P5-E found for source links, for the same reason: retiring a Note
never touches its placements (I4 keeps them), so an active placement pointing at
a retired Note is the *normal* post-retirement state. Filtering on the placement
would leave retired Notes on screen for ever.

---

## 3. Two things a test found that reading would not have

### The service's ADR-010 §2 guarantee was weaker than the contract's

`moveNoteToFolder()` built its payload from named fields, so an Origin field
passed by a caller was **silently ignored** rather than refused — and a caller
who passed `sourceKey` would have believed it did something. The fix is one
line: forward `...rest` to the contract, so the service's guarantee is *exactly*
the contract's rather than a weaker cousin of it. Caught by a check that failed,
not by review.

### The cycle guard was crediting the wrong line, and I proved it

Mutation **M6** removed the `reached.has()` guard from the walk — the line a
reader would assume provides cycle safety — and **no test failed**. Rather than
add a test or patch the code, I established why.

`parentFolderId` is single-valued, so a cycle can only be *entered* from inside
itself: every member's parent is another member. **Walking downward from the
null-parent roots therefore never reaches one.** Verified empirically with the
guard removed, against cycles-with-tails, a bare two-node cycle, duplicate
folder ids and a three-node cycle — **none looped**.

So the real protection is the **direction of the walk**, and the guard is
unreachable-by-construction defence. It is kept (a folder gaining two parents
would make it live) and its comment now says so, because a reader who credits
the wrong line will eventually "simplify" the one that matters.

**M6 is therefore a correct non-failure, not a test gap** — the distinction
matters, and asserting coverage I had not demonstrated would have been the worse
outcome.

---

## 4. Tests

| Suite | Result |
|---|---|
| `journey-map-contract.mjs` | **28 passed** (20 + 8 walk cases) |
| `journey-map-service.mjs` | **13 passed** (new) |
| `journey-map-boundary.mjs` | 13 passed, 0 failed |
| `note-foundation-data-layer.mjs` | **47 assertions** (27 + 20 move/retire cases) |
| `firestore-index-requirements.mjs` | 8 passed (reads both index candidates now) |
| Phase 6 emulator | **53 assertions** (50 + 3 atomic-move cases), 0 failures |
| 9 other pure suites | green |

**The atomic move is proven at the server, not assumed.** Rules evaluate every
write in a batch independently, so "both halves are individually allowed" had to
be demonstrated — the retire is an update whose identity fields are frozen.
`P-ATOMIC-01` commits retire-and-create as one batch; `P-ATOMIC-02` proves a
batch that *repoints* instead is still refused; `P-ATOMIC-03` proves it cannot
place into someone else's folder.

**Every refusal in the move leaves nothing written**, asserted case by case — a
half-done move is worse than a refused one.

### Mutations

| # | Mutation | Outcome |
|---|---|---|
| M1 | The move creates without retiring | caught |
| M2 | The retirement carries the new folder (I4 broken) | caught |
| M3 | The target folder's owner no longer checked | caught |
| M4 | `folderContents` filters on the placement's status | caught |
| M5 | The move stops forwarding unknown fields to the contract | caught |
| M6 | The walk's `reached` guard removed | **correctly did not fail** — see §3 |
| M7 | The depth cap removed | caught |
| M8 | Orphaned folders silently dropped | caught |

---

## 5. The deployment package was kept in step

P6-C's new ordered query needs a **fourth** composite index, which would have
left the package I handed over yesterday quietly wrong.

- A **Phase 6 index candidate** in its own file, for the same reason its Rules
  are separate: the Phase 5 file is already in the Owner's hands.
- The **package updated to four indexes**, field by field.
- **A new check binds the package's hand-written tables to the machine-readable
  candidates**, so they cannot drift and leave the Owner creating the wrong
  index — a failure mode no other test here could see, because it happens
  between a document and a human.

The assembled deployment candidate needed no change (Phase 6's *rules* did not
change), and was re-verified: Phase 5 **60** and Phase 6 **53** assertions
against it, unchanged.

---

## 6. Verified

| Claim | Evidence |
|---|---|
| Additive only | `journey-map-contract.js` +67/−0, `note-foundation.js` +113/−0 |
| Nothing deployed | `firestore.rules`, `firebase.json` byte-identical |
| Existing notes untouched | `ayah-notes.js` byte-identical |
| Still unreachable | no page reaches the contract, the service or the data layer by any chain |
| No behaviour change | `version.js` byte-identical |

---

## 7. Pending-dependency ledger

| # | Item | Blocked on |
|---|---|---|
| 1–4 | Phase 4/5/6 Rules + four indexes | **READY — VERIFIED — PENDING EXECUTION ACCESS.** One paste, four index forms |
| 5 | Merging `claude/phase4-wiring` (`c4fca4a`) | items 1–4 |
| 6 | P5-D, the Note editor | ADR-004's deferral — Owner |
| 7 | Server-side folder-cycle prevention | Owner: it costs the ability to move a folder |

---

## 8. Next

Phase 6's foundation is now complete to the same depth as Phase 5's: contract,
Rules candidate, index candidate, validated writes, and a read model with a safe
walk. What remains in both phases is **surface**, and both surfaces are held —
P5-D by ADR-004's deferral, Mapping My Journey's shape by ADR-010 §3, which I
wrote narrow deliberately.
