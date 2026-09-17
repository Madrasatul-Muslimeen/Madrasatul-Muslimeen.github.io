# MAP Phase 5 — P5-E: the Note read model, and the Firestore index requirement nobody had recorded

- **Date:** 2026-09-15
- **Task:** MAP Phase 5, task P5-E, executed under the Continuous MAP Execution Directive
- **Method:** PRESERVE → RECONCILE → EXTEND; IMPLEMENT → TEST → AUDIT → CORRECT
- **Blast radius:** **BR-0.** Both changed application files remain unreachable from every page. No behaviour changed.
- **Application version:** **08.25, deliberately unchanged** — nothing a reader can reach behaves differently.
- **Result:** ACCEPT — 8 of 8 code mutations and 2 of 2 Rules mutations proven to fail the suites; 0 failures across 16 pure suites and the emulator.

---

## 1. Why this task, and the finding that made it urgent

P5-D (the Note editor) is held behind the Note Foundation Rules deployment. The
directive's own rule applies: a blocked production path is bypassed
temporarily, not treated as a stop. So this task took the remaining Phase 5
work that needs no deployment — and immediately found something that would have
broken P5-D *after* those Rules were deployed.

### F1 — the repository declares no Firestore composite index, anywhere

`firebase.json` has no `indexes` key. No `firestore.indexes.json` exists. Not
one composite index has ever been declared in this project.

### F2 — that was harmless until Phase 5, and is not harmless now

Every `orderBy` in the entire application — measured, not assumed:

```
app/js/note-foundation.js:207   where ×3 + orderBy("updatedAt", "desc")
app/js/note-foundation.js:217   where ×3 + orderBy("createdAt", "desc")
```

That is the complete list. There are **zero** range or inequality filters
anywhere in `app/js`. Every other query in the app is equality-only, and
Firestore serves those from single-field indexes — which is precisely why a
live, working application has survived with no index file at all.

The Note Foundation introduced the first two queries that combine equality
filters with an `orderBy` on a *different* field. Each of those requires a
composite index or fails in production with
`failed-precondition: The query requires an index`. **So the Note Foundation,
even with its Rules deployed, could not have listed a single Note.**

### F3 — no emulator run could ever have caught this

Proven rather than assumed. `tools/firestore-emulator/index-probe.test.mjs`
starts the emulator with an index file declaring **zero** indexes and runs
exactly such a query:

```
RESULT: SERVED 3 documents -- the emulator does NOT enforce composite indexes
```

Every one of Phase 5's emulator assertions is therefore silent about index
requirements. This gap was only ever findable by reading the queries.

### F4 — `noteSources` was write-only

ADR-009 defined how a Note binds to a Study Unit, and **nothing ever read one
back.** `note-foundation.js` could list a person's Notes and one Note's
revisions; there was no way to ask "which Notes are about this āyah" — which is
the only question a Study surface, or Phase 6's Mapping My Journey, actually
asks.

---

## 2. What was built

### The read side of ADR-009 (BR-0, still unreachable)

`note-foundation.js` gains two additive exports; the diff is **57 insertions,
0 deletions**, so no existing behaviour could have been reshaped:

- `listNoteSourcesForUnit()` — the source links binding one permanent unit key
  to this person's Notes, scoped to tenant + owner + `sourceKey` + status,
  **ordered newest-first and bounded**.
- `getNotesByIds()` — Notes by permanent id, as one parallel batch.

`study-note-service.js` gains `notesForStudyUnit()`, which validates the unit
key through ADR-009's binding (the only place a unit key is judged), then
composes the two.

**The ordering is not decoration.** The bound exists to stop an unbounded read;
without an order, hitting it would return an *arbitrary* subset and the reader
would silently lose Notes they wrote. Ordered newest-first, a truncation means
"the most recent N", which a surface can state honestly. That order is what
costs the third composite index, and it is worth it.

**One read per Note, deliberately, rather than `documentId() in [...]`.**
`activity.js` already resolves a set of documents with `Promise.all` over the
keys it needs, so this is a shape this codebase has rather than a new one, and
it needs no new Firebase SDK name in the test stub. The cap of 30 is a cap, not
an expected cost: the usual number of Notes a person has written on one āyah is
one or two.

### Three design points the tests pin

| Behaviour | Why it is not obvious |
|---|---|
| **A retired Note is excluded, filtered on the NOTE's status, not the link's** | `retirePermanentNote()` updates the Note and never touches its source links (I4 — the link is not destroyed either). An active link pointing at a retired Note is the **normal** post-retirement state. Filtering on the link would show retired Notes to the reader for ever. |
| **A link naming a Note that no longer exists is dropped, not thrown** | One dangling link must not deny a reader every other Note on the unit. |
| **Truncation is reported, never swallowed** | The query asks for one more than the cap, so "there is more" is read off the data rather than guessed when a page happens to come back exactly full. |

And the requirement this whole line of work exists for: **two Notes on the same
āyah both come back, as two Notes.** That is the read-side half of ADR-008's own
amendment, and it is what the quick-note surface — keyed by unit alone — can
never express.

### The index candidate

`docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json`,
three composite indexes, one per requiring query. **Candidate only**:
`firebase.json` is byte-identical and still has no `indexes` key, and nothing
sits at the deploy path `firestore.indexes.json`. Deploying indexes is an Owner
Control Gate, like Rules. A check asserts both facts, so the candidate cannot
quietly become a deployment.

### The durable fix — `tools/i18n-verify/firestore-index-requirements.mjs`

Correcting three queries is not the fix; the fix is that the fourth cannot go
unnoticed. This suite extracts every balanced `query(...)` expression in
`app/js`, resolves its collection through `collections.js` rather than a
retyped name, decides from the operators whether Firestore can serve it from
single-field indexes, and asserts that everything that cannot has a declared
candidate index — and that the candidate declares nothing no query needs.

It carries a **positive control**: without one, a broken regex would find no
queries and every case would pass vacuously. It also asserts that
index-requiring queries appear **only** in `note-foundation.js`, so the first
one written anywhere else fails the suite by name.

---

## 3. Tests

| Suite | Result |
|---|---|
| `study-note-service.mjs` | **29 passed** (19 + 10 new read-model cases) |
| `study-note-boundary.mjs` | **17 passed, 0 failed** |
| `firestore-index-requirements.mjs` | **7 passed, 0 failed** (new) |
| Phase 5 emulator Rules suite | **60 assertions, 0 failures, 0 expression-budget denials, 31 of 37 matrix cases** (was 53) |
| 13 other pure suites | all green, unchanged |

The seven new emulator cases (`QUERY-04`…`QUERY-10`) run the **exact** query
shapes `note-foundation.js` executes, `orderBy` and all, so what is proven is
the real read path rather than a simplified stand-in. Fresh **active** source
links are seeded first, deliberately: a list over a set that matches nothing
succeeds trivially and would prove nothing — `REL-05` had retired the only link
`p1` owned.

### Mutation testing

| # | Mutation | Caught by |
|---|---|---|
| N1 | Filter on the LINK's status instead of the Note's | R3 — retired Note reappears |
| N2 | No one-over probe for truncation | R1 / R5 |
| N3 | Unit-key validation removed | R8 — "Missing expected rejection" |
| N4 | Duplicate note ids no longer collapsed | R7 |
| N5 | The `noteSources` index removed from the candidate | index suite, by name |
| N6 | `orderBy` dropped from the query (silently unordered) | index suite positive control |
| N7 | A real import of the binding added to `records.js` | boundary reachability |
| N8 | A line removed from `note-foundation.js` | boundary addition-only |
| R-A | `noteSources` list rule drops `canReadNoteOf` | emulator QUERY-08/09 |
| R-B | `noteSources` list rule drops `listIsBounded` | emulator QUERY-06 |

All restored; every suite returned to its baseline and the Rules candidate is
byte-identical.

---

## 4. Three checks corrected in place, with the reasons

**None was deleted or excepted.** Each was made to express its own claim better.

1. **`study-note-boundary.mjs` — the importer scan reported a wiring that did
   not exist.** Its delimiter class included a **backtick**, so a prose
   `` `study-note-binding.js` `` inside a doc comment counted as an import.
   Requiring a `from`/`import` keyword in front makes it an import scan rather
   than a text search. The same flaw was fixed in the Phase 4 suite. Proven
   still able to catch a real import.
2. **`note-foundation.js` byte-identity → addition-only.** P5-E extends that
   file, so byte-identity is no longer the right claim — but "not reshaped"
   still is, and it is the one that matters. An **addition-only diff** (0
   removed lines) proves it mechanically, and is a stricter thing to assert
   than "some lines changed and they looked fine on reading".
3. **The two drifting fixtures are corrected, and bound.** P5-C's report said
   they were test data it did not own; P5-E owns them. `quran`/
   `created-in-study` and `quran-ayah`/`reader-created` are now the accepted
   vocabulary, and a new boundary check reads **every** `.mjs`/`.js`/`.json`
   under `tools/` and fails on any source-binding word outside ADR-009.
   Correcting them once was not the fix; binding them is, because the next
   fixture would otherwise invent a fifth spelling. The check skips lines that
   *call* `studyNoteSource()` — proving a bad word is refused necessarily means
   writing that bad word down — which keeps it a check about fixtures rather
   than a filename exception.

---

## 5. Preservation — verified, not asserted

| Claim | Evidence |
|---|---|
| Existing user notes preserved | `app/js/ayah-notes.js` **byte-identical** to `origin/main` |
| Note Foundation not reshaped | `note-foundation.js` diff is **57 insertions, 0 deletions** |
| Activity and Records untouched | `activity.js`, `records.js` **byte-identical** |
| Nothing deployed | `firestore.rules` and `firebase.json` **byte-identical**; no `firestore.indexes.json` exists |
| Still unreachable | No page reaches either P5-C/P5-E module by any chain of any length |
| No destructive migration | No `migrat`, `backfill`, `deleteDoc`, `writeBatch`, `delete`, `clear(` or `remove(` in either module |
| No layout or behaviour change | The only tracked `app/` changes are two files no page can load; `app/js/version.js` byte-identical |

`layout.mjs` was not re-run, for the same stated reason as P5-C: no page, nor
any module any page can reach, differs from `origin/main`.

---

## 6. What was deliberately NOT done

- **`noteFolders` / `notePlacements` remain unruled and untouched.** They are
  Phase 6, an unruled collection is denied by default, and the directive is
  explicit that beginning Phase 6 does not license activating them.
- **No index was deployed, and `firebase.json` was not pointed at the
  candidate.** Adding that key is a deployment-shaped change and an Owner
  Control Gate; a check now asserts it has not happened.
- **The guardian approval window (matrix GUARD-05/06/07) is still not built.**
  The accepted contract describes a 30-minute server-expiring, Note-specific
  approval, but names no collection to hold it, and its own
  `foundationCollections` / `deferredCollections` lists do not include one.
  Choosing that storage is a new architecture choice — an Owner Control Gate —
  so it is recorded here rather than invented. Every guardian content edit
  stays denied outright, which is strictly safer than the accepted design.

---

## 7. Pending-dependency ledger

| # | Item | Blocked on | State preserved |
|---|---|---|---|
| 1 | Phase 4 production activation | Firebase Console access | `claude/phase4-wiring` `c4fca4a` unmerged; 208-line Rules amendment undeployed |
| 2 | Phase 5 Note Foundation Rules | Firebase Console access | Candidate at 60 assertions; `firestore.rules` untouched |
| 3 | Phase 5 Note Foundation **indexes** | Firebase Console access | **New this task.** Candidate under `docs/governance/`; must be deployed *with* item 2 or the Note Foundation's three list queries fail |
| 4 | P5-D — the Note editor surface | Items 2 **and** 3 | Not started; a real behaviour change requiring a version bump and full layout measurement |
| 5 | Guardian approval window | Owner storage decision | Denied-outright stands |

**Item 3 is new and matters to item 2:** deploying the Rules alone would leave
the Note Foundation able to authorise queries it cannot execute.

---

## 8. Next

Independent Phase 5 work that requires no deployment is now **exhausted**: the
architecture, the contracts, the pure foundations, the read model, the Rules
candidate, the index candidate and the compatibility position are all in the
repository. The next task is **Phase 6 — Mapping My Journey foundation**,
beginning with reconciling its requirements against the accepted Note
Foundation and ADR-009 before any collection is activated.
