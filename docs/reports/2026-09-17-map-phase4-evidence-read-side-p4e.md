# MAP Phase 4 (P4-E) — the evidence rows were authorised to be read, and nothing read them

- **Date:** 2026-09-17
- **Task:** give ADR-008's Activity evidence subcollection the read side its accepted Rules already authorise
- **Blast radius:** **BR-0.** One `app/js` module changed, still unreachable from any page. No `.html` changed. `firestore.rules`, `firebase.json`, all four index candidates and all three Rules candidates **byte-identical**. **No new index** — this is the one MAP read that needs nothing added.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT. Store suite 19 → **26**, evidence boundary 15 → **17**, 4 of 4 reader mutations caught. Phase 4 emulator **53**, coverage **1,803 / 47**, all other suites unchanged.

---

## 1. The gap

`activity/{tenantId}__{personId}__{weekKey}/evidence` had one writer and **no reader anywhere in `app/js`.** The accepted candidate has authorised a read since P4-C, mirroring the parent weekly document's own **deployed** rule exactly — `isPlatformAdmin()` or `canRecordFor(tenantId, personId)` — and its emulator suite proves all three sides of it: the person themselves may read their evidence, another learner may not, an anonymous caller may not.

So this is the same write-only asymmetry P5-E closed for `noteSources` and P6-C for `notePlacements`, found in the Phase 4 collection — and here the read was not merely permitted but already **tested**.

## 2. The shape, and why it needs no index

`listStudyActivityEvidence(db, { tenantId, personId, weekKey, maximum })` returns `{ rows, truncated }`.

**No filter and no order, both deliberate.** The path is the whole scope — it already names the tenant, the person and the week — so re-filtering on the fields inside would re-ask a question the path has answered. And no `orderBy` means **no composite index**: this is the only MAP read that adds nothing to the index candidates, which matters because the Owner-facing package's index tables are bound by a check to the machine-readable candidates.

**Truncation is reported by asking for one more than the cap** (the P5-E pattern). A bound hit silently would lose events the person really recorded.

**It returns evidence rows and nothing else** — no totals, no Approach credit, no claim state. A check asserts the returned JSON contains none of `claimStatus`, `achieved`, `mastered`, `confirmed`, `entries`, `chunkKey`. Activity is not Mastery (ADR-003), and the moment this returned something claim-shaped it would be a second, unauthorised route into what `bulkConfirmWeek()` confirms.

## 3. The boundary guards were extended to the reader, and mutation-proven

The evidence boundary suite existed to protect one thing: that evidence can never reach `activity.entries[]`, because `bulkConfirmWeek()` builds its confirm set entirely from that array. A reader does not threaten the array — but a reader whose **result** travelled into the Mastery workflow would be the same defect by another route. Two new guards:

- the reader queries the path `evidenceCollectionPath()` builds, with a `limit`, and with **no `orderBy` and no `where`**;
- `records.js` names neither the reader nor its module nor its cap.

| Mutation | Caught by |
|---|---|
| add `orderBy("dateIso")` | the reader guard **and** `firestore-index-requirements.mjs` (which throws: *could not read the collection of a query*) |
| add `where("personId", "==", personId)` | the reader guard |
| drop the `limit` | the reader guard |
| query `TENANT.ACTIVITY` instead of the subcollection | **two** guards — the writer's own subcollection-only check and the reader guard |

Each mutation asserted its own occurrence count before running.

## 4. Two of my own near-misses, both the same trap

**I nearly recorded that the candidate authorises no read at all.** My grep was `allow (get|list|create|update|delete)` — it **omitted `read`**, which is the keyword this file actually uses. The block has `allow read` twice. Had I not checked the emulator suite and found it already testing reads, I would have written up a non-existent defect in an accepted artefact, and one that would have looked alarming: the writer's own first operation is a read, so "no read authorisation" would have implied Phase 4 could not function at all.

**I then nearly recorded that `firestore-index-requirements.mjs` has a blind spot**, because I tested the `orderBy` mutation and grepped the output for `^  FAIL|failed` and saw nothing. The guard had in fact thrown an **uncaught assertion** and exited 1 — it fails loudly and correctly on a query whose collection it cannot read. My grep could not see an uncaught throw.

**Both are the same lesson, twice in one day: read the failure text and the exit code, not a grep of them.** The first version of that lesson went into the brief this morning after four boundary suites' `ENOENT` nearly became a finding about four rotting guards. It has now earned two more instances, and the brief entry says so.

## 5. Verification

| | |
|---|---|
| `study-activity-evidence-store.mjs` | 19 → **26** |
| `study-activity-evidence-boundary.mjs` | 15 → **17**, 4 / 4 mutations caught |
| `firestore-index-requirements.mjs` | **8 / 0**, and proven to throw on an added `orderBy` |
| Phase 4 emulator | **53**, unchanged — including the three read cases |
| `study-activity-evidence-id` / `-evidence` / `study-approach-contract-boundary` | 29 / 11 / 16, unchanged |
| `rules-authorisation-executable` | **17 / 0** — evidence is still create-only in both the Rules and the writer |
| `stub-parity` | **3 / 0** — `collection`, `getDocs`, `limit`, `query` were all already exported by the stub |
| Every Note Foundation and Journey Map suite | unchanged |
| Translation coverage | **1,803 / 47** — no user-visible string |
| `firestore.rules`, `firebase.json`, 3 Rules candidates, 4 index candidates, every `app/*.html` | **byte-identical** |

## 6. Flagged, not changed

- **Nothing reads it yet in a surface, and that is still the gate.** The reader is uninvoked; a Monitor or Activity screen that showed evidence would be a real behaviour change behind the Phase 4 Rules deployment.
- **The candidate's read rule has no `request.query.limit` bound**, unlike Phase 5/6's `listIsBounded()`. It is safe — the scope is one person's one week, and this reader caps itself — but a different caller could list the subcollection unbounded. Recorded rather than changed: tightening it is a Rules amendment to a candidate already in the Owner's deployment package.
- **No aggregation was built.** "How many āyāt did this person read this week" is a product question about a screen that does not exist.

---

*Master Architect audit: BR-0, additive, no accepted decision changed, no Owner Control Gate crossed. The read this implements was authorised and already server-tested; only the client side was missing.*
