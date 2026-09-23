# MAP Phase 5 (P5-G) — `createNoteSource()`, a further active binding for an existing Note

**Task bridge run from issue #113**, comment
[5752673823](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/113#issuecomment-5752673823)
— the Master Architect's Gate B audit of draft PR #117: *"APPROVED WITH
CORRECTIONS for the one bounded Note Foundation `noteSources`
additional-binding data-layer milestone in §6."* This report is the coded
implementation of that approved milestone.

**Date:** 2026-09-20 UTC. **Blast radius:** BR-0 — one new exported function,
page-unreachable, in an already-uninvoked module; no schema, Rules, or
version change.

## 0. Owner app-test section

**Required: NO.** `app/js/note-foundation.js` is imported by nothing under
`app/*.html` (proven below, §5) — exactly as every other Note Foundation
module has been since Phase 5 opened. There is no build a reader can open,
click, or claim against; the new function is reachable only from this
repository's own test harness. Nothing here changes what an Owner, teacher,
guardian or student sees in the live app.

## 1. What was approved, and what this implements

PR #117 §5/§6 (Gate B) identified exactly one MAP candidate blocked by
neither E1 (Firestore Rules/index deployment), nor an Owner/Master Architect
DDR-class decision, nor a protected-path edit: **extending `noteSources` so
an existing, already-created Note can gain a further active source-link
binding after its own creation transaction**, rather than only at birth.

The Master Architect's Gate B audit (the triggering comment) approved this
milestone with corrections, and set the change budget: `app/js/note-foundation.js`
and/or `study-note-binding.js`, `tools/i18n-verify/note-foundation-data-layer.mjs`,
a narrowly pinned `study-note-boundary.mjs` if needed, plus this dated
report pair. It required: real-function tests, failure mutations,
tenant/owner denial, duplicate-link handling, existing-link retirement, no
modification to Note creation, and all seven governance suites after a
full-history ref preflight.

## 2. Reconciliation with PR #104 — an independent PR, not a stack

PR #104 (`claude/laughing-goodall-d1pygn`) also touches
`app/js/note-foundation.js`, fixing `retirePermanentNote()`. Before writing
any code, that PR's diff was read directly
(`git diff main origin/claude/laughing-goodall-d1pygn -- app/js/note-foundation.js`):
it replaces lines inside the existing `retirePermanentNote()` function
(originally at source lines 161–170 of `main`'s copy), and narrows
`study-note-boundary.mjs`/`journey-map-boundary.mjs`'s own "insertion only"
guard to a pinned exception for that one replaced line.

**This round did not stack on PR #104's branch.** Two independent reasons:

1. **No dependency exists.** PR #104's change sits entirely inside
   `retirePermanentNote()`; this round's new `createNoteSource()` is
   inserted after `retireNoteSource()` (P5-F) and before `reorderNotePlacement()`
   (P6-E) — a completely different region of the file, touching a different
   collection's write path. Neither reads nor calls the other.
2. **Stacking would create a hard, unnecessary dependency** on an unmerged,
   unreviewed branch. An independent PR from `main` keeps this round mergeable
   on its own, and lets either land first with no rebase forced on the other.

**The consequence turned out simpler than PR #117 §6's own file budget
predicted.** That budget declared `study-note-boundary.mjs` as
"Modify (narrow, pinned exception)", by analogy with PR #104's own need to
narrow it. But PR #104 needed the pinned exception because ITS diff *replaces*
existing lines (numstat: lines removed > 0). This round's diff is **pure
insertion** (`git diff --numstat main -- app/js/note-foundation.js` → `92 0`,
zero removed lines), so the existing unmodified guard —
`assert.equal(removed, "0", ...)` in both `study-note-boundary.mjs` and
`journey-map-boundary.mjs` — already accepts it. **Neither guard was
modified.** Both were re-run unmodified against the new diff and both pass
(§6). This is recorded as a simplification of the declared budget, not a
deviation from the approved scope.

Both PRs remain based on the same `main` tip (`2cb405e`) and, being disjoint
in the lines they touch, can merge in either order with no conflict.

## 3. What `createNoteSource()` does

```js
export async function createNoteSource(db, {
  tenantId, ownerPersonId, ownerUid = null, noteId, source, sourceLinkId = newNoteEntityId(), actorUid,
}) { … }
```

Inside one transaction: reads the Note, refuses if it does not exist, refuses
if it belongs to a different tenant/owner, refuses if it is retired, refuses
if the requested `sourceLinkId` already names an existing `noteSources`
document — then creates exactly one `noteSources` document, with the
identical field set `createPermanentNote()`'s own birth-time source write
already uses (`sourceLinkId, tenantId, ownerPersonId, ownerUid, noteId,
sourceKind, sourceKey, relationshipKind, approachId, provenanceKind,
status`), built through the same `ownership()` / `relationBase()` /
`requireToken()` helpers already in the file. No new import, no new helper.

**Three design choices made in this round, stated rather than hidden:**

- **A retired Note refuses a new binding.** The accepted Phase 5 Rules
  candidate's own `noteSources` `allow create` does not itself check the
  Note's `status` — it checks existence and ownership only (§`REL-01`). This
  function is stricter than the Rules candidate, mirroring
  `updatePermanentNoteContent()`'s existing "Retired Note cannot be edited"
  rule: gaining a further binding is, like a content revision, an action ON
  the Note. **This is a data-layer choice, not an implementation of an
  accepted decision** — flagged here for the Master Architect to confirm or
  override; nothing in ADR-009 or the Rules candidate settles it either way.
- **A duplicate `sourceLinkId` is refused**, the same way `createPermanentNote()`
  already refuses a duplicate Note id — read-then-create inside the one
  transaction.
- **Two active links naming the SAME `sourceKey` are NOT refused.** Neither
  the accepted Rules, ADR-009, nor `listNoteSourcesForUnit()`'s own read
  contract forbids a Note being bound twice to one unit (e.g. once `origin`,
  once later `reference`). Inventing that constraint here would be a new
  decision, not an implementation of one already accepted, so it was not
  added.

**The closed vocabulary (`sourceKind`, `relationshipKind`, `provenanceKind`)
is not this function's to decide** — exactly as `createPermanentNote()`
already leaves it to the caller, validated here only for non-empty presence
via the existing `requireToken()` helper. `study-note-binding.js`'s closed-set
validation (`studyNoteSource()`) is unchanged, still pure, and still
uninvoked; this function does not import it, so the "the binding module is
imported by nothing" boundary claim is untouched.

**Note identity is provably immutable through this call**: the function
never writes to `notes`, only to `noteSources`; a test asserts
`writes.filter(w => w.collectionName === "notes").length === 0` after a
successful call (§4). **The Origin/Destination distinction (ADR-010 §2) is
preserved by construction**: this function does not import
`journey-map-contract.js` and never touches `notePlacements` — the same
separation `study-note-binding.js`'s own module comment already states for
the Journey Map's Origin/Destination rule, now also true of this function.

## 4. Tests — real function calls, not the closed-set validator

16 new assertions in `tools/i18n-verify/note-foundation-data-layer.mjs`,
added in the same file and in the same style PR #104 already used for
`retirePermanentNote()` (calling the REAL function through the module's
existing Firebase-free harness, not a hand-written stand-in):

| Case | What it proves |
|---|---|
| Successful bind on an active Note | Exact write shape; the Note itself is never touched |
| Duplicate `sourceLinkId` | Refused before any write |
| Two active links, same `sourceKey` | Both written — not refused |
| Missing Note | Refused before any write |
| Cross-owner / cross-tenant Note | Refused, reading the Note document rather than trusting the caller |
| Retired Note | Refused |
| Compose with `retireNoteSource()` | A link created by this function can be retired by the existing function, independently of the Note and of any other link |

**Mutation-proved, not merely passing on first write.** Two of the new
guard lines were each independently removed and the suite re-run:

- Removing the retired-Note check made the "retired Note refuses a new
  binding" assertion fail with `Missing expected rejection` — proving the
  test is not vacuous.
- Removing the duplicate-`sourceLinkId` check made the "duplicate is
  refused" assertion fail the same way.

Both mutations were reverted and the file confirmed restored to a pure
92-line insertion (`git diff --numstat main -- app/js/note-foundation.js` →
`92  0`) before anything was committed.

**No modification to Note creation.** `createPermanentNote()` itself has zero
changed lines — confirmed by the insertion-only diff and by re-running the
pre-existing assertions against it in the same suite run, unmodified and
still passing.

## 5. Boundary guards — unmodified, and why that is the correct outcome

`study-note-boundary.mjs` (17 checks) and `journey-map-boundary.mjs`
(13 checks) both re-run **without any edit** and both pass clean, including:

- `app/js/note-foundation.js changed by INSERTION ONLY -- nothing removed or
  reshaped` — the numstat check both guards already carry.
- `NO PAGE can reach either module, by any chain of any length` /
  `NO PAGE can reach the journey contract or its service` — the reachability
  walkers, with their own positive controls, still find zero page-reachable
  chains into any Note Foundation or Journey Map module.
- Every ADR-009 vocabulary check (closed-set membership, fixture-word
  binding) — confirming the new test fixtures used only accepted vocabulary
  (`origin`/`reference`, `study-note`, `quran-unit`).

Because this round's diff is pure insertion, neither guard needed the
pinned-exception narrowing PR #117 §6 anticipated (§2 above).

## 6. Governance and directly-relevant suites (repository root, full history + both required remote refs fetched)

```
1) node tools/i18n-verify/programme-ledger.mjs
==== Programme integration ledger: 8 passed, 23 noted, 0 failed ====

2) node tools/i18n-verify/programme-ledger-mutations.mjs
==== Programme ledger guard mutations: 49 passed, 0 failed ====

3) node tools/i18n-verify/brief-integrity.mjs
==== Standing brief integrity: 8 passed, 0 failed ====

4) node tools/i18n-verify/study-activity-evidence-boundary.mjs
==== Study Activity evidence boundary: 27 passed, 0 failed ====

5) node tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs
==== Evidence boundary guard mutations: 11 passed, 0 failed ====

6) node tools/i18n-verify/study-event-wiring.mjs
==== Study event wiring (P4-D1 Reading, D2 Listening, D4 WbW): 41 passed, 0 failed ====

7) node tools/i18n-verify/rules-authorisation-executable.mjs
==== Rules authorisation executable: 40 passed, 0 failed ====
```

All seven exit 0, zero failures. `rules-authorisation-executable.mjs`
independently discovered BOTH `noteSources` creates (the birth-time one and
this round's new one) via its generic `transaction.create(TENANT.NOTE_SOURCES, …)`
scan and validated each one's field set against the accepted Rules shape —
`CREATE noteSources[0]` and `CREATE noteSources[1]`, both passing both
directions (required fields present, no forbidden field sent) — with no
change to that guard itself.

Directly-relevant suites, all re-run clean: `note-foundation-data-layer.mjs`
(47 + 30 P6-D + 18 P5-F/P6-E + **16 P5-G**, this round's new assertions),
`note-foundation-boundary.mjs` (30/0), `note-foundation-transaction.mjs`
(16 assertions), `study-note-boundary.mjs` (17/0), `journey-map-boundary.mjs`
(13/0), `study-note-binding.mjs` (16), `journey-map-contract.mjs` (34),
`journey-map-service.mjs` (18), `study-note-service.mjs` (35).

## 7. What this deliberately does NOT do

- **No protected/shared path touched** — checked against the task bridge's
  own table: `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`,
  `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`,
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`,
  everything under `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/` — none
  modified.
- **No version bump.** `app/js/version.js` untouched; this branch and `main`
  both read `08.31`; `08.32` remains unallocated.
- **Nothing deployed.** `firestore.rules` is byte-identical to `origin/main`
  (asserted by `study-note-boundary.mjs`); `noteSources` still has no live
  Rule in production, so this function is denied outright there today,
  exactly like every other Note Foundation write.
- **No merge, no approval claimed, no page-reachable UI.** The function is
  page-unreachable, proven mechanically by `study-note-boundary.mjs`'s
  reachability walker (§5), the same as every other Note Foundation module.
- **`retirePermanentNote()`, `createPermanentNote()` and every other existing
  export are untouched** — the diff is a pure 92-line insertion.
- **`study-note-boundary.mjs` and `journey-map-boundary.mjs` were not
  modified**, per §2/§5.

## 8. Open item for Master Architect confirmation — RESOLVED

The one genuine design call this round made without prior authority: **a
retired Note refuses a new source binding** (§3). The accepted Rules
candidate is silent on this (it checks existence and ownership only), so
either answer is defensible; this round chose the stricter one, by analogy
with the existing content-revision rule. If the Master Architect's intent
differs, this is a one-line change (removing the `note.status !== NOTE_STATUS.ACTIVE`
check) with its own mutation-proof already in place to re-verify either way.

**Confirmed 2026-09-20 UTC** — Master Architect audit of this PR (issue
#113, comment
[5752936842](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/113#issuecomment-5752936842)):
*"APPROVED WITH NOTES at the bounded data-layer Gate C, pending independent
diff review; preserve the stricter refusal to attach a new source to a
retired Note, because retirement should not silently regain active
provenance."* The stricter answer stands as authorised, not merely
defensible-by-analogy, and this round's own mutation-proof (§7, the
retired-Note-refusal assertion) is what the Master Architect will re-check
this decision against, not a fresh review of the whole diff.

**Recorded explicitly, per the same instruction: the Rules candidate does
not itself enforce this restriction — it is a data-layer/service invariant
only.** `noteSources`'s `allow create` (REL-01) checks the Note's existence
and ownership; it does not read `notes.status`. So the refusal in
`createNoteSource()` (§3) is the *only* thing standing between a retired
Note and a new active source binding — nothing at the database layer would
stop a second client, written against the same accepted Rules but without
this function's own status check, from creating one directly. **This must
be re-checked before any alternate client writes to `noteSources`**: a
future write path (a different service module, a Cloud Function, a direct
console write) that bypasses `createNoteSource()` bypasses this restriction
entirely, silently, with no Rules-level backstop to catch it. Any such
future path needs its own equivalent check, or an explicit decision to drop
the restriction — never an assumption that the Rules already cover it.

## Rollback

Delete `createNoteSource()` from `app/js/note-foundation.js` and its 16
matching assertions from `note-foundation-data-layer.mjs`. `git diff` would
then be empty against `main` for both files. No other file changes; no data
was ever written to production.
