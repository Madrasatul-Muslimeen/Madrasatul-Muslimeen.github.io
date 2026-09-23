# Note Foundation retirement — the emulator equivalence gap, and the visible MAP candidate list

**Date:** 2026-09-20 · **Type:** Investigation and documentation only. No
application file, `bn.js`, version, Rules, or any protected path changed.

---

## 1. What this closes, and what it does not

Issue #107 asked for **executable emulator-backed evidence** invoking the real
`retirePermanentNote()` (fixed in this PR) against the Phase 5 Note Foundation
Rules candidate — success and stale-revision denial — "if feasible without
protected path edits," and, if not feasible, **"report the precise equivalence
gap and a minimal authorized test plan; do not touch protected paths."**

**It is not feasible in this sandbox, for two independent reasons, both
verified rather than assumed, and neither is a protected-path question alone:**

1. **The Firestore emulator binary cannot be downloaded here.** `firebase-tools`
   and `@firebase/rules-unit-testing` (both already declared as devDependencies
   in `tools/firestore-emulator/package.json`) start a real Firestore emulator
   by fetching a Java binary from Google Cloud Storage on first run. Tested
   directly against this sandbox's egress proxy: `https://storage.googleapis.com`
   returns **HTTP 403**, and `https://www.gstatic.com` is refused at the CONNECT
   step with `connect_rejected (organization policy)`. `java` itself is present
   (`/usr/bin/java`), so the blocker is specifically the emulator download, not
   the runtime. This is the same class of restriction this repository's own
   history already records for `archive.org` and `api.quran.com` — real for
   this sandbox, not necessarily for the owner's or a differently-configured
   session's environment.
2. **Even where the binary were reachable, every file that could run such a
   test sits on a protected path.** The existing candidate-Rules emulator
   suite for Notes (`tools/firestore-emulator/note-foundation-v1.rules.test.mjs`,
   its `firebase.json`, and the whole `tools/firestore-emulator/` directory) is
   listed on this bridge's own protected-path table under "Deployment /
   security." Adding new cases to it — even success/denial cases only, even
   read-only in spirit — is a shared-file touch requiring declared Master
   Architect authorisation, exactly as this bridge's rules require, and exactly
   the same gate PR #104 itself already crossed correctly (it added no test
   inside that directory, only inside `tools/i18n-verify/`, none of whose
   touched files are on the protected list).

Neither cause is worked around. No file under `tools/firestore-emulator/` or
`tests/firestore/` was created, edited, or even `npm ci`'d into (which would
have written `node_modules/` inside that protected directory, a state change
this bridge's rule against touching a protected *family* — not merely its
tracked files — is read to forbid).

## 2. The precise equivalence gap

PR #104's own `tools/i18n-verify/note-foundation-data-layer.mjs` already calls
the **real** `retirePermanentNote()` (previously every caller of it in this
suite was stubbed) and asserts, against `firebase-stub.mjs`:

- the write order (a `create` on `noteRevisions` before the `update` on
  `notes`);
- the new revision's `previousRevisionId` equals the note's prior
  `currentRevisionId`, and its `revisionReason` is `"retired"`;
- the note's own `currentRevisionId` afterwards names the *new* revision, not
  the retired one;
- calling it with a mismatched `expectedRevisionId` throws `"Stale Note
  revision."`, and the stub records no write.

**What this proves, and what it structurally cannot:** `firebase-stub.mjs`
never mutates its own `DATA` from a batched/transactional write the way a real
Firestore instance does (`CLAUDE.md`'s own standing lesson — "the Firebase stub
never mutates its own DATA"), and, more to this specific gap, **it contains no
Rules evaluator at all.** It can prove the function *produces the write shape
the candidate Rules' `committedRevisionMatches()` helper is written to require*
— confirmed by hand in PR #104's report §2, reading the two side by side — but
a hand-read match between application code and Rules text is not the same
epistemic class of evidence as the Rules language actually accepting or
rejecting that exact write. **The gap is specifically:** whether Firestore's
own CEL-like rules evaluator, given the literal candidate Rules text and the
literal two-write transaction `retirePermanentNote()` issues, returns *allow*
for a correctly-chained retirement and *deny* for one whose `previousRevisionId`
does not chain from the note's pre-transaction `currentRevisionId` — is
asserted by reading, not by execution. `tools/i18n-verify/*` suites cannot
close this gap by construction; only `tools/firestore-emulator/` can, and it is
the protected directory.

**A narrower, real risk this gap leaves open:** the client-side guard in
`retirePermanentNote()` itself (`if (note.currentRevisionId !== expectedRevisionId)
throw new Error("Stale Note revision.")`, `app/js/note-foundation.js:183`)
reads the note fresh inside the same Firestore transaction, so it is already
correct against genuine concurrent-write staleness *as long as this function is
the only path that ever sets `status: 'retired'`*. What only a live Rules
evaluation proves, and what this investigation cannot, is that the *server*
independently refuses a malformed retirement that bypasses this function
entirely — the defense-in-depth case, not the happy-path case. The Rules text
read in §1 (`committedRevisionMatches()`) is written to do exactly this; it has
simply never been executed against a live evaluator with this function's real
write shape as input.

## 3. Minimal authorized test plan (for whoever holds `tools/firestore-emulator/`)

Two cases, both addable to the existing
`tools/firestore-emulator/note-foundation-v1.rules.test.mjs` (which already has
the `IMM-03b` fixture this PR's report says was hand-authoring the *correct*
shape) rather than a new file:

1. **SUCCESS:** seed a Note and its birth revision exactly as
   `createPermanentNote()` would, then run the real
   `retirePermanentNote()`-shaped two-write transaction (create the "retired"
   revision, then update the Note) through the emulator as the owner's own
   auth context. Assert `allow`.
2. **STALE REVISION DENIAL:** same seed, but issue the transaction with a
   `previousRevisionId` on the new revision that does **not** equal the Note's
   current `currentRevisionId` (simulating a client that bypassed the
   application-level guard, or a second writer that already retired the Note).
   Assert `deny`, and assert the Note document is unchanged afterwards.

Both cases exercise `committedRevisionMatches()` on the *update* branch
(`resource.data.currentRevisionId`, Rules line 259) specifically, which is the
one this fix's write shape newly reaches — the create branch
(`committedRevisionMatches(null)`, line 249) is exercised at Note birth and is
untouched by this fix. **This needs a declared shared-file touch and Master
Architect authorisation before it is written**, per this bridge's own rule;
nothing here pre-empts that authorisation or drafts the diff.

## 4. Concrete visible MAP candidates, with their exact dependency

Enumerated from `docs/governance/programme-integration-ledger.json`'s
`openOwnerDecisions`, `ownerUiDebt`, and `ownerReviewAfterBuild`,
`docs/governance/DDR.md`, and this investigation's own reading of
`app/js/note-foundation.js` and the Phase 5 Rules candidate — every one
independently checked against the repository rather than recalled from
`CLAUDE.md` prose alone.

| Candidate | Blocked by | What, exactly |
|---|---|---|
| **P5-D — the Note editor surface** | **E1** | The Phase 5 Note Foundation Rules and indexes are `firestoreRules: NOT_DONE` / `firestoreIndexes: NOT_DONE` in the ledger's `deployment` block. Building a real editor means real writes the deployed database would deny outright. |
| **Guardian approval window** (Phase 5 `GUARD-05/06/07`) | **Owner Control Gate, no ledger DDR entry** | No 30-minute server-expiring approval mechanism exists in the data layer; every guardian content edit is denied outright instead, deliberately, per `CLAUDE.md`. A storage design is needed before any code. |
| **Note→Study-Unit re-binding** (an existing Note gaining a second `noteSources` link after birth) | **None — the one candidate this investigation found gate-free** | The Phase 5 Rules candidate already authorises creating a `noteSources` link against any existing owned Note; `createPermanentNote()` is the only place the data layer ever creates one. Flagged, not built, in PR #104's own report §"What this deliberately does NOT do." No DDR item, no shared-path touch, no E1 dependency — the next real bounded tranche if the Owner wants Phase 5 work to continue without waiting on E1. |
| **Held Phase 4 wiring** (`claude/phase4-wiring`, `7e2931f`) | **E1** | Ledger stream `quran-phase4-wiring`, `status: HELD`, waiting on the Rules deployment before the study-event wiring can be merged. |
| **D14 timezone activation** (auto/manual mode + chosen-location override) | **E1 + shared path (`firestore.rules`)** | The deployed Rules authorise only `hasOnly(['timezone', 'updatedAt'])` on `tenantPeople`; representing a mode or a chosen location needs a Rules change, which is both a shared-path edit and gated on E1's deployment access. |
| **Server-side folder-cycle prevention** (`ancestorIds[]` + `depth`, Phase 6) | **Owner Control Gate + shared path (`firestore.rules`)** | Recorded in the Phase 6 build log as "recorded, not adopted" — Rules cannot walk an ancestor chain of unknown length, so enforcing this server-side needs a schema/Rules change costing re-parenting itself, an explicit product trade the Owner has not made. |
| **Non-Quran progress/mastery model** (Deen Study, Arabic, General Study, Hadith, Nature-Life, Health) | **DDR-001** | `docs/governance/DDR.md`: INACTIVE/DEFERRED, no accepted universal progress definition exists outside Quran's 30 Approaches. |
| **Subject-scoped teacher authority** | **DDR-002** | Same register: current authority is student-scoped only; narrowing it to a co-enrolled teacher's own assigned `subjectIds[]` is deferred. |
| **Translator selection** (`#translationChoiceSelect`, disabled since Phase 7) | **DDR-003** | Deferred: no approved translator dataset/packaging decision exists yet. |
| **A 31st Approach** | **DDR-004** | Deferred: MAP v4 locks exactly 30; reopening the count is the Owner's call alone. |
| **Hadith Explore's three new strings** (this task's own §5, issue #108) + the wider interface-localization backlog (`LAYOUT-BACKLOG.md` item 6, app chrome) | **Shared path (`bn.js`)** | Every one of these is a real, already-built English string with no code gate at all — purely waiting on a `bn.js` catalogue extension, which only the Quran/shared-file owner can make under this bridge's own protected-path rule. |
| **O3 / O3b / O3c / O4-READBAR-WRAP** (tenant-picker truncation, number-picker/unit-type truncation at 320px, Bangla-only `#drillModeSelect` truncation, `#readBar` wrap at 390/412px) | **Owner UI decision, no code gate** | Each has a materially different set of costed remedies (widen a cell, shorten wording, accept the wrap) recorded in the ledger's `ownerUiDebt`; none is a DDR, E1, or shared-path block — only a choice among trade-offs nobody but the Owner should make silently. |
| **Reading-Approach inference from translation visibility, and juz/hizb/ruku'/page recording no evidence** | **Owner Control Gate, no ledger DDR entry** | `ownerReviewAfterBuild` `OWNER_REVIEW_DEFAULT_1`/`_2`: both are PROVISIONAL build defaults, explicitly flagged rather than re-decided at v08.30, still open. |
| **This issue's own emulator-backed Rules evidence** | **Sandbox network policy (Google Storage) + shared path (`tools/firestore-emulator/`)** | See §§1–3 above — the one candidate in this table blocked by environment rather than by a governance gate, and the reason this round could not close it outright. |

## 5. Checkout preflight and governance suites (this session, this branch)

Full-history preflight (PR #98's shape) already run once this session:
`git remote set-branches origin '*'` then `git fetch --depth=2147483647 origin`;
`origin/main` and the ledger's one active stream (`origin/claude/phase4-wiring`)
both resolve. No `CHECKOUT PREFLIGHT FAILED`.

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 40 passed, 0 failed |

All seven exit 0 — identical to PR #104's own table. This round adds one
documentation file and touches no application code.

## 6. What this deliberately does not do

- No file under `tools/firestore-emulator/`, `tests/firestore/`,
  `docs/governance/` (other than reading it), `firestore.rules`,
  `firebase.json`, or `.github/workflows/` was created, edited, or installed
  into.
- No `bn.js`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`, or other
  platform-shared path touched.
- No merge, no deploy, no version bump. `v08.32` remains unallocated.
- `app/js/note-foundation.js` and the fix PR #104 already made are unchanged
  by this round — this is investigation and documentation only.
- The MAP candidate list above is an enumeration for the Owner/Master
  Architect to choose from, not a recommendation of which to build next; no
  candidate was started.

---
