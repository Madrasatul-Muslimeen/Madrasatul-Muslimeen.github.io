# MAP Task 48 — isolated Activity Rules security proposal

**Status:** DRAFT, NOT ENFORCED. **Date:** 2026-09-12.
**Scope:** `activity/{tenantId}__{personId}__{weekKey}` and versioned Study Activity only.
No deployment, production access, migration, Rules activation or event wiring is authorised by this proposal.

## Existing behavior and security gap

The existing rule permits `create` for `canRecordFor(request.resource.data.tenantId, request.resource.data.personId)` and `update` for `canRecordFor(resource.data.tenantId, resource.data.personId)`. It does not bind those fields to the document ID, freeze them on update, constrain week size, preserve old entries, or enforce event-key uniqueness. `logActivity` reads before writing and uses `arrayUnion`; Task 47's separate uninvoked writer uses a transaction and stores `eventKey` in one weekly entry. Neither client path supplies server-enforced append-only integrity.

## Proposed fail-closed rule requirements

1. On read, enforce the same tenant/person authorization as the scoped record policy; a missing-document `get` returns no data but must not authorize any existing unrelated document or a list. Prove absent-document behavior separately in emulator.
2. On create/update, verify `activityKey == tenantId + '__' + personId + '__' + weekKey`, path-safe nonempty IDs, valid ISO UTC week key and the tenant's authoritative week-start policy. Freeze tenant/person/week, schema envelope origin and `createdBy` on update. For cross-tenant person references, prove the person belongs to the named tenant; `isSelfPerson(personId)` alone is insufficient for this binding.
3. Bound the document size and number of entries, and require each new v1 entry to contain the exact approved fields, valid type/date/Approach, `practised` action, and no Mastery or word-approval state. Legacy entries must remain unmodified.
4. Retries must be no-ops and never append duplicate keys; an authenticated client must not overwrite, remove, reorder or substitute any historical entry, even when duplicate legacy entries exist.
5. Preserve legacy `logActivity` and existing Records/Note Foundation behavior. No unbounded person-wide or cross-tenant list query may pass.

## Candidate mechanisms; no selection yet

**A — retain only the array.** A transaction prevents accidental simultaneous duplicate writes by honest clients. Rules checking `new.entries.hasAll(old.entries)` and `new.entries.size() == old.entries.size() + 1` does *not* prove ordered append or multiplicity preservation when historical duplicates exist. It also cannot prove global event-key uniqueness by iterating arbitrary entries. A alone fails requirements 3–4 and must not be accepted as security enforcement.

**B — add a bounded keyed map inside each weekly document.** Store new v1 Study evidence in an `eventKey`-derived map, with legacy `entries` frozen for Study updates. Rules can inspect map `diff()` for one added key and no changed/removed keys, bound map size, constrain the new value, and prevent client delete. Existing `logActivity` can continue its legacy array path only under a separately verified immutability check for the v1 map. The map's stable key derivation, allowed bytes, canonical evidence binding, read model and maximum size must be specified and measured. This is a design candidate, not a proved solution. Client-computed keys are not proof an interaction occurred.

**Task 50 audit caveat:** The offline prototype hashes the raw `eventKey` with SHA-256 for a safe map field name. Firestore Rules cannot independently recompute that hash from the event payload. It can enforce create-only map keys and preserve old values, but cannot establish that two different supplied hash keys do not contain the same raw `eventKey`. Key integrity therefore remains a distinct acceptance question. Do not describe the prototype's honest-client retry property as server-enforced semantic uniqueness.

**Task 51 candidate correction:** Use the bounded raw `eventKey` as the map field name and carry `lastEventKey` as the one newly added key. A Rules candidate could compare `v1Events.diff(old.v1Events).addedKeys().hasOnly([lastEventKey])` and `v1Events[lastEventKey].eventKey == lastEventKey`, limiting the map diff to exactly one addition. This would make the map key itself unique for the same exact bytes. It still cannot prove canonical JSON encoding or that the reading/listening interaction occurred, and Firebase field-name/encoded-size constraints remain emulator-gated. No executable rule or application writer uses this shape yet.

**Task 52 draft:** `tests/firestore/activity-v1.proposed.rules` isolates a potential Rules implementation by copying the current Rules and changing only the Activity match. It is intentionally outside `firebase.json` and cannot deploy by normal configuration. Static boundary checks prove other Rules text is unchanged. Audit identifies two unsatisfied cases: the draft legacy branch can still substitute duplicate historical array entries, and it cannot validate a client-supplied event key's canonical semantics. It also has not been parsed or exercised by the emulator. The draft is **REJECTED for acceptance** until corrected and run against every matrix case; it must not be copied to `firestore.rules` on static evidence.

**C — create-only per-event receipt plus weekly projection.** This gives a unique document key with create-only semantics but adds write/read cost, a cross-document atomicity rule, and an interaction stream. It requires an explicit load/privacy assessment against ADR-008 before selection.

**Recommendation for next bounded task:** Prototype B in a pure model and a standalone demo-only Rules candidate, preserving both old and v1 entries. Execute all Task 48 cases in the exact Firestore emulator, including duplicate historical rows and malicious updates, before selection or event wiring. If B cannot satisfy the weekly size and Rules checks, produce a concrete Owner architecture decision between a revised bounded shape and deferred integration.

## Acceptance locks

The existing `firestore.rules` file is unchanged by Task 48. Static checks and an allow/deny matrix are preparation only. Emulator Rules execution, exact runtime verification, authenticated QA and independent regression audit remain **PENDING**. Keep the app branch and Rules branch isolated; do not merge, push, deploy or access production.
