# MMSA task bridge — `retirePermanentNote()` would be denied by the accepted Phase 5 Rules candidate

**Date:** 20 September 2026
**Origin:** issue #100, comment [5749486448](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/100#issuecomment-5749486448) — "Resume actual QuranRevival MAP implementation from current MMSA `main` (v08.31)."
**Status: CANDIDATE. Not merged. Nothing deployed.** `app/js/version.js` stays `08.31` — this round is a correctness fix inside an already-uninvoked module, not a shipped behaviour change, and it is not claimed as one.

---

## 1. What was asked, and how the candidate was chosen

The task asked to resume MAP product work: find one bounded, genuinely unfinished tranche in Quran-owned, non-protected paths, preferring Study/Word Card/Mapping My Journey, and to fall back to the next independent buildable item if the first candidate needs a deferred architecture decision or a protected/shared path.

**Every remaining MAP tranche in Study/Word Card/Mapping My Journey that would be new user-visible capability turned out to be blocked, and each is named rather than silently skipped:**

- `DDR-001`–`DDR-004` (`docs/governance/DDR.md`) lock the non-Quran progress model, subject-scoped teacher authority, translator selection, and the 30-Approach count — all Owner/Master Architect decisions, none reopened here.
- Every remaining Note Foundation / Mapping My Journey capability that would matter to a real reader (the Note editor surface, any Journey Map screen, deploying the Phase 4/5/6 Rules and indexes) is gated on **E1 — Firestore Rules deployment**, which `CLAUDE.md`'s current milestone records as still CLOSED, and Rules/index deployment is explicitly a protected path this bridge must not touch.
- Closing the remaining translation-coverage gap (`node tools/i18n-coverage.mjs` reports 61 missing strings) is *not* an Owner-gated decision — `DDR.md`'s own "Corrected non-DDR items" says so — but every missing string lives in `app/js/i18n/bn.js`, which is on this bridge's protected/shared-path table. Flagged, not touched.
- "Edit banner needs a home" (`LAYOUT-BACKLOG.md` item 7) is real, small, and fully specified, but wiring its link into Home → Settings needs an edit to `app/js/nav.js`, also on the protected table.

**So the search moved to the exact method this codebase already uses for safe MAP progress under E1 closure**: read what the accepted-but-undeployed Rules CANDIDATES authorise, then check whether the JS data layer can actually perform it — in **both directions**, including the direction this repository's own standing lessons note nobody had run yet: *does the data layer ever write a shape the Rules candidate would refuse?*

That reverse-direction check found a real, mechanically-provable defect.

---

## 2. The defect

`app/js/note-foundation.js`'s `retirePermanentNote()` — the only way `study-note-service.js`'s `retireStudyNote()` retires a permanent Note — did exactly one write:

```js
transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED });
```

`docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules`'s `notes/{noteKey}` match block applies `committedRevisionMatches(resource.data.currentRevisionId)` to **every** `allow update`, not only a content revision:

```
function committedRevisionMatches(previousRevisionId) {
  return existsAfter(revisionRef(d().currentRevisionId))
      && getAfter(revisionRef(d().currentRevisionId)).data.noteId == d().noteId
      && getAfter(revisionRef(d().currentRevisionId)).data.tenantId == d().tenantId
      && getAfter(revisionRef(d().currentRevisionId)).data.ownerPersonId == d().ownerPersonId
      && getAfter(revisionRef(d().currentRevisionId)).data.get('previousRevisionId', null) == previousRevisionId;
}
```

A status-only update leaves `currentRevisionId` pointing at the **same** revision it already named. The rule then requires that revision's own `previousRevisionId` field to equal itself — a revision chaining from itself, which is never true (a revision's `previousRevisionId` is fixed at its own creation). **Every retire would therefore be denied the moment this Rules candidate is deployed.** The same text is carried unchanged into the assembled `phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`, so it is not fixed downstream either.

**The emulator suite's own IMM-03b case had already recorded the correct shape by hand**, and passed only because it hand-crafts a batch write (a new revision plus the status/`currentRevisionId` update) rather than calling the real function:

```js
// tools/firestore-emulator/note-foundation-v1.rules.test.mjs (protected — read only, not touched)
await ok("IMM-03b", "retiring writes a status instead", (() => {
  const b = writeBatch(p1);
  b.set(doc(p1, "noteRevisions", nk(T, "rev...009")),
    revDoc({ revisionId: "rev...009", previousRevisionId: REV2, revisionReason: "retired" }));
  b.update(doc(p1, "notes", nk(T, NOTE)), { status: "retired", currentRevisionId: "rev...009", updatedAt: new Date() });
  return b.commit();
})());
```

So the accepted design was correct, and never implemented. The data layer's own unit tests never caught it either: `tools/i18n-verify/note-foundation-data-layer.mjs` never called `retirePermanentNote()` at all, and `tools/i18n-verify/study-note-service.mjs` stubs it out completely (`retirePermanentNote: async (_db, args) => { calls.retire.push(args); }`), so nothing anywhere exercised its real write shape until this round.

---

## 3. The fix

`retirePermanentNote()` now commits a real revision when it retires a Note — the exact shape IMM-03b already expected:

```js
export async function retirePermanentNote(db, { tenantId, noteId, expectedRevisionId, actorUid }) {
  const noteDocId = noteFoundationDocId(tenantId, noteId);
  const revisionId = newNoteEntityId();
  await runEnvelopeTransaction(db, actorUid, async (transaction) => {
    const snapshot = await transaction.get(TENANT.NOTES, noteDocId);
    if (!snapshot.exists()) throw new Error("Note does not exist.");
    const note = snapshot.data();
    if (note.currentRevisionId !== expectedRevisionId) throw new Error("Stale Note revision.");

    transaction.create(TENANT.NOTE_REVISIONS, noteFoundationDocId(tenantId, revisionId), {
      revisionId, noteId,
      tenantId: note.tenantId, ownerPersonId: note.ownerPersonId, ownerUid: note.ownerUid ?? null,
      previousRevisionId: expectedRevisionId,
      title: note.title, bodyHtml: note.bodyHtml,
      revisionReason: "retired", actorUid,
    });
    transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED, currentRevisionId: revisionId });
  });
  return revisionId;
}
```

Title and body are carried forward unchanged into the retirement revision — retiring is not a content edit, and `updatePermanentNoteContent()`'s own `noteShapeOk()`-satisfying shape already relies on the Rules seeing a full, valid document, not a partial one. `envelope.js`'s `createDocument`/`runEnvelopeTransaction` (untouched, and outside this bridge's edit anyway — it lives in `app/js/envelope.js`, not on the protected list, but nothing about it needed to change) stamps the usual `schemaVersion`/`createdAt`/`updatedAt`/`createdBy` envelope on both writes, satisfying `noteRevisions`' own `hasAll`/`hasOnly` list unchanged.

The single caller, `study-note-service.js`'s `retireStudyNote()`, is unaffected: it never used the old function's (nonexistent) return value, and the new returned `revisionId` is additive.

---

## 4. Change budget

**Touched, all Quran-owned and none on the protected/shared-path table:**

| File | Change |
|---|---|
| `app/js/note-foundation.js` | `retirePermanentNote()` now commits a real revision (see §3). One existing line replaced; nothing else in the file changed. |
| `tools/i18n-verify/note-foundation-data-layer.mjs` | New focused section: 11 assertions exercising the real function (not a stub) against the fixed shape, plus the two pre-existing error paths (stale revision, missing Note). |
| `tools/i18n-verify/study-note-boundary.mjs` | Its "insertion only" guard against `note-foundation.js` is narrowed from "0 removed lines" to "removed lines are exactly the one pinned line this round replaces" — see §5. |
| `tools/i18n-verify/journey-map-boundary.mjs` | Same narrowing, same reason — it carries an identical guard over the same file. |
| This report (`.md` + `.html`) | New. |

**Not touched:** `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, anything under `docs/governance/` (including every `.rules`/index candidate and the ledger), `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/`, `tools/i18n-verify/behaviour.mjs`, `harness.mjs`, `firebase-stub.mjs`, `brief-integrity.mjs`, `programme-ledger.mjs`, `programme-ledger-mutations.mjs`. No Rules, index, or deployment change of any kind. No merge.

**App version:** unchanged at `08.31`. **`08.32` remains unallocated.** This fix has no user-visible effect today — `note-foundation.js` is still imported by nothing reachable from any page (unaffected by this round; see the boundary suites above, both still green) — so there is no live behaviour to gate a version bump on. If a future round wires a Note surface to this module, that round's own version allocation is the Master Architect's, not predicted here.

---

## 5. Why two existing checks were narrowed, not weakened

`study-note-boundary.mjs` and `journey-map-boundary.mjs` each carry a guard reading, in effect, "`app/js/note-foundation.js` changed by insertion only — 0 removed lines," which is how earlier rounds mechanically proved "every existing export still behaves exactly as it did" without having to re-read the whole file by eye every time.

That claim is genuinely incompatible with fixing a bug **inside** an existing function: the one line this round removes is the exact line that was wrong. Weakening the guard to "some lines may be removed" would have let a future round reshape anything in this file unnoticed — the opposite of what the guard is for. So both guards keep the same strength for everything else and add exactly one named exception:

```js
const NOTE_FOUNDATION_PINNED_REMOVAL =
  "-    transaction.update(TENANT.NOTES, noteDocId, { status: NOTE_STATUS.RETIRED });";
// removedLines must deep-equal [NOTE_FOUNDATION_PINNED_REMOVAL] — anything else still fails
```

**Proven both ways, not assumed:**
- With the fix applied and no other change, both suites pass (17/0 and 13/0 — one more executing check than the prior baseline, since the guard now runs to completion instead of failing).
- With the fix reverted (`git stash` on `app/js/note-foundation.js` alone), the new focused test in `note-foundation-data-layer.mjs` fails exactly where expected (`create:noteRevisions` missing from the write sequence) — this is the direct mutation proof that the new test catches the original defect.
- With an unrelated, deliberately introduced removal in `note-foundation.js` (a mutation of `NOTE_VISIBILITY`'s own declaration, reverted immediately after), both narrowed guards still fail, naming the extra line — proving the exception is pinned to exactly the one line this round claims, not loosened generally.

---

## 6. Tests

**New:** `tools/i18n-verify/note-foundation-data-layer.mjs` gained 11 assertions calling the real `retirePermanentNote()` (not a stub) and checking:

- the write sequence is `create:noteRevisions` then `update:notes` (not the old single `update:notes`);
- the new revision's `previousRevisionId` chains from the revision being left behind, and its `revisionReason` is `"retired"`;
- the new revision carries the Note's own `noteId`/`tenantId`/`ownerPersonId`;
- the Note's own update sets `status: "retired"` **and** `currentRevisionId` to the freshly minted revision id, never the old one;
- the existing stale-revision and missing-Note error paths are unchanged.

**Updated:** the two "insertion only" boundary guards above, narrowed with a pinned, mutation-proven exception (§5).

**Run (repository root, full history and all branches fetched first, per the known checkout-artifact lesson in `PHASE-5-STATUS.md`/`CLAUDE.md`'s own standing lessons):**

| Suite | Result |
|---|---|
| `note-foundation-data-layer` | 47 + 30 P6-D + 18 P5-F/P6-E + 11 retire-revision = 106 assertions passed |
| `note-foundation-boundary` | 30 passed, 0 failed |
| `note-foundation-transaction` | 16 assertions passed |
| `note-foundation-size-preflight` | 5 synthetic fixtures measured, no Firestore claim |
| `note-foundation-emulator-scaffold` | 31 passed, 0 failed |
| `study-note-service` | 35 passed |
| `study-note-boundary` | 17 passed, 0 failed |
| `study-note-binding` | 16 passed |
| `journey-map-service` | 18 passed |
| `journey-map-boundary` | 13 passed, 0 failed |
| `journey-map-contract` | 34 passed |
| `hadith-corpus` (forbidden-token scan names `note-foundation.js`) | 33 passed, 0 failed |

**Seven governance suites required by the task bridge (repository root, full history fetched):**

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 40 passed, 0 failed (was 38 on the unmodified baseline — the two new passes are `notes`'s own FORWARD/BACKWARD field checks now exercising the fixed shape) |

All thirteen suites run in this round exit 0.

---

## 7. Acceptance gaps and what this does NOT do

- **This is not deployed and cannot be**, whatever it fixes: `notes`/`noteRevisions`/`noteSources` still carry no live Firestore Rule (E1 remains closed per `CLAUDE.md`'s current milestone), so retiring a permanent Note is still denied in production today — exactly as it was before this round, for the unrelated reason that nothing is deployed at all. This round makes the CANDIDATE correct; it does not make the feature usable.
- **`note-foundation.js` remains imported by nothing reachable from any page.** Both boundary suites above still assert that, unchanged.
- **A second, real gap the same investigation found is NOT closed here, and is flagged rather than folded in:** the Phase 5 Rules candidate authorises creating a `noteSources` link against any existing, owned Note (`REL-01` only checks the Note exists and is the owner's) — but the data layer creates a `noteSources` document in exactly one place, inside `createPermanentNote()` at birth. Nothing can add a second source link to an already-existing Note, so `relationshipKind: "reference"` (defined in `study-note-binding.js`) is only ever settable at creation, and re-binding a Note to a second Study Unit after the fact is unreachable. `retireNoteSource()` (P5-F) covers the retire half of that lifecycle only. This is a genuine "an accepted decision no code can perform" gap of the same shape as the one this round closed, and it is a reasonable next bounded tranche — deliberately left for its own round rather than widening this one.
- **No rollback is needed against any live system**: nothing was deployed, and the only affected artefact is an uninvoked module plus its own tests.

---

## 8. Rollback

Revert this commit. `retirePermanentNote()` returns to its pre-existing (defective) single-line update; the two boundary guards return to their unnarrowed form; the new test section is removed with it. No data, Rule, or index is affected either way, because none was touched.
