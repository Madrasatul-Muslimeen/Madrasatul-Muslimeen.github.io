# MAP Phase 4 — P4-B Activity Evidence Persistence Architecture Resolution

**Date:** 14 September 2026
**Authority:** Master Architect instruction of 2026-09-14.
**Baseline read:** `main` = `925a9c2ca94fdffcfc0563d498681dfe902ab700`, app version `08.24`,
working tree clean, verified against `origin/main` before anything was read.
**Type:** ARCHITECTURE / RECONCILIATION. **No implementation is authorised by this report.**

**Nothing was changed that could change behaviour.** `git diff HEAD -- app firestore.rules`
is **empty**. `app/js/version.js` still reads `08.24` and was deliberately not bumped.
No Rules or index deployed, no migration, no backfill, no production write, no Study
event wired, no historical Phase 4 branch merged, no P4-C begun.

**Recommendation (stated in full at §12): P4-B ARCHITECTURE READY FOR MASTER ARCHITECT
AUDIT — with two decisions reserved to the Master Architect, named in §11.**

---

> ## ⬥ MASTER ARCHITECT DECISION, 14 September 2026 — recorded after the audit
>
> **P4-B ARCHITECTURE ACCEPTED WITH REQUIRED IDENTITY AMENDMENT.**
>
> Everything below this box is **the report as submitted for audit**, left
> unaltered so the audit trail stays readable. Two corrections were required and
> have been applied; where the original text below differs from them, **the
> corrections win.**
>
> **Required Correction 1 — Journal event identity.** The submitted identity was
> **insufficient for Journaling**: built from event type, Approach, unit and
> day alone, two different Notes on the same āyah on the same day collapse to
> one identity and the second is silently lost as a duplicate — which
> contradicts ADR-008's own rule of one event per committed new Note. `noteId`
> **must** participate in the deterministic identity:
> `journal.note-created__approach_10__<unitKey>__<noteId>__once` and
> `journal.note-revised__approach_10__<unitKey>__<noteId>__<dateIso>`. Rules
> must re-derive and verify it. **Applied**, using one five-slot form for all
> five events with the literal `none` in the Note slot for the three non-Note
> events, so the Rules identity check stays a single concatenation rather than a
> branch — which is what this report's own expression-budget finding requires.
>
> **Required Correction 2 — WbW grain.** §11-A's recommendation is **approved**:
> `wbw.engaged` deduplicates by **āyah + person + UTC day**, not occurrence.
> ADR-008 is amended accordingly. The Master Architect further directed that
> `occurrenceId` be retained **only** against a concrete downstream requirement,
> since the first occurrence to create the document would win the field
> arbitrarily. **Reviewed against every reader of Activity — Monitor, backup,
> and `bulkConfirmWeek()` — none requires it, so `occurrenceId` is OMITTED.**
> The authoritative occurrence-level state remains `quranWordProgress`. This
> supersedes §4.2 and §5 of the report below, which still describe it as
> optionally stored.
>
> **§11-B (Rules deployment) remains an open Owner Control Gate.** Not granted.
>
> **P4-C was authorised** on that basis and is delivered separately in
> `2026-09-14-map-phase4c-evidence-writer.md`. The amended candidate Rules were
> re-executed: **53 assertions, 0 failures, 0 expression-budget denials.**

---

## 1. Current-state findings

### 1.1 How Activity is stored and written today

`activity/{tenantId}__{personId}__{weekKey}` — one document per person per week.
`weekKey` is the ISO date of the week's start under the tenant's own `weekStartsOn` (D7).

`logActivity()` (`app/js/activity.js`) reads the week document, then either
`createDocument(...)` with `entries: [entry]` or `updateDocument(...)` with
`entries: arrayUnion(entry)`. Each entry is exactly:

```
{ date, subjectId, unitKey, unitType, trackableId, action, viaProgramId, viaSessionId }
```

There is **no event identity of any kind** in the current model, and therefore no
deduplication: `arrayUnion` deduplicates only *byte-identical* values. Two presses of a
Log button on the same day for the same unit produce one entry by accident of value
equality, not by design — and any differing field (a `viaProgramId` that resolved on the
second attempt, say) makes them two.

**Eleven call sites**, all client-side: `asma-study.js`, `routine-study.js` (×2),
`topic-study.js`, `self-check.js`, `records.html`, and `quranrevival.html` (×3).
Observed `action` values: `claimed`, `practised`, `selfCheck`, `logRoutine`.

### 1.2 Who reads Activity, and what each reader would do with new evidence

| Reader | What it does | What ADR-008 evidence would do to it |
|---|---|---|
| `records.js` `bulkConfirmWeek()` | **§1.3 — the critical finding** | **Would silently confirm Mastery** |
| `monitor.js` | counts entries per student / per subject / per unit, weekly and monthly | Counts would rise sharply; "entries" stops meaning "things done" |
| `backup.js` + `backup-file.js` | flattens every week's `entries[]` into the export and prints a count | Export grows; a new shape must be readable |
| `activity.js` `hasLoggedOn()` / `computeStreak()` | routine streaks, filtered by `action === "practised"` **and** `subjectId` | Only affected if a routine is ever added for `subjectId: "quran"`; today none is |

### 1.3 The finding that dominates this architecture

`records.js` `bulkConfirmWeek()` — reachable from `records.html` as
**"Bulk confirm all pending this week"** — builds its confirm set **entirely from
`activity.entries[]`**:

```js
for (const e of activitySnap.data().entries ?? []) {
  const chunkKey = chunkKeyFor(e.unitKey, e.subjectId);
  const entryKey = `${e.unitKey}::${e.trackableId}`;
  ...                       // then bulk-confirms every matching PENDING records entry
}
```

So a `(unitKey, trackableId)` pair appearing in Activity causes the matching **pending
Mastery claim to be confirmed**. It confirms only entries already `pending`, so evidence
alone cannot create a claim — but it does mean that **if ADR-008 `practised` evidence were
written into `entries[]`, merely reading an āyah would enlarge the set of claims a
supervisor's one click confirms.**

That is Activity granting Mastery. It is the exact thing ADR-003 and ADR-008 forbid, it
lives in **client code where no Firestore Rule can prevent it**, and it exists on `main`
today. **This single fact disqualifies any design that files ADR-008 evidence into the
existing `entries[]` array**, however well-secured that array might otherwise be.

### 1.4 Where Mastery actually lives — the good news

Mastery is `records/{tenantId}__{personId}__{chunkKey}`, written only by `claimStatus()`,
`confirmEntry()`, `returnEntry()` and the bulk-confirm helpers. **Activity and Mastery are
already separate collections.** So a persistence model that writes evidence anywhere other
than `records/` cannot escalate to Mastery *through the database* — the only escalation
path is a client reader like §1.3, which is closed by construction in §4.

### 1.5 The deployed Activity Rules, and their real gaps

```
match /activity/{activityKey} {
  allow read:   if isPlatformAdmin();
  allow read:   if signedIn() && !exists(.../activity/$(activityKey));
  allow read:   if canRecordFor(resource.data.tenantId, resource.data.personId);
  allow create: if canRecordFor(request.resource.data.tenantId, request.resource.data.personId);
  allow update: if canRecordFor(resource.data.tenantId, resource.data.personId);
  // No delete (I4/D6).
}
```

Verified gaps, none of which this report proposes to change:

1. `activityKey` is **never bound** to the `tenantId`/`personId`/`weekKey` fields, so an
   authorised writer can file `activity/A__B__week` carrying `tenantId: C`.
2. `tenantId`/`personId`/`weekKey` are **not frozen on update**.
3. `entries[]` is **not append-only at the database** — `allow update` permits replacing
   the whole array. Append-only is a property of `logActivity()`, i.e. of the client.
4. No entry-shape validation, no size bound, no event-identity concept.
5. `isSelfPerson(personId)` proves "this login owns that person" but **not** "that person
   belongs to this tenant" — a cross-tenant binding gap.

### 1.6 Identity and key contracts the design must honour

- **Permanent unit keys (I5)** — `buildUnitKey` yields `ayah:S:A`, `range:S:F-T`,
  `surah:S`, `juz:N`, `ruku:S:N`, `page:E:N`, `hizb`, `rub`, `manzil`, `hadith:C:N`,
  `topic:ID`, `name:N`. **None contains `_`.** Verified by reading `unit-keys.js`.
- **Occurrence identity (ADR-007)** — `quran-word-occurrence:v1:S:A:P`. No `_`.
- **Note identity** — `crypto.randomUUID().replaceAll("-","")`, 32 hex chars. No `_`.
- **Tenant/person** — `tenantPeople/{personId}` carries `tenantId` and `authUid`;
  `tenantMemberUids/{tenantId}__{uid}` carries `roles` and `personId`.
- **Approach ids** — `approach_01`…`approach_30`; **these DO contain `_`**, which matters
  in §5 and is handled there.
- **ADR-008 (accepted, on `main` since v08.24)** maps five automatic events to six
  Approaches, each `practised`, each with **no mastery effect**, plus `status.claimed` /
  `status.confirmed`, which belong to the explicit Mastery workflow.

### 1.7 Study surfaces that would eventually emit the events

`quranrevival.html` (reading, recitation playback, the Word Card and its WbW toggles),
`note-foundation.js` + the Note view (journaling), and `quran-word-progress.js` (WbW).
**None of them is wired to anything in P4-B, and none is touched by this report.**

---

## 2. Assessment of the isolated historical implementation

Read **read-only** from `claude/pensive-knuth-2pu3jj`. Not merged, not reconstructed.

### 2.1 What its own record says about why it was rejected

The accepted Phase 3 Rules candidate on `main`
(`tests/firestore/word-progress-v1.proposed.rules`) states it in writing:

> "…the failure that rejected the Phase 4 Activity candidate, where **9 of 13 logged
> denials were refused by Firestore's 1000-expression evaluation limit rather than by the
> security logic** — a denial by budget exhaustion that would later refuse legitimate
> writes as the document grew."

**This is the authoritative reason, and it is more precise than the SHA-256 story.** The
SHA-256 objection (Rules cannot recompute a client hash) applies to the *offline
prototype* described in the Task 50 caveat. The branch's actual
`planKeyedStudyActivityAppend()` uses the **raw** `eventKey` as the map field name, not a
hash — so that specific objection does not describe the code that exists. The
**budget-exhaustion** finding does, and it is fatal on its own: a rule whose cost grows
with stored data eventually denies legitimate writes.

### 2.2 Concepts worth keeping

| Concept | Verdict |
|---|---|
| A **deterministic event key** derived from the contract, not invented by the caller | **KEEP** — it is the whole idea |
| Re-deriving the canonical evidence and refusing a caller-supplied key that disagrees | **KEEP**, and promote it from client-side to a **Rules-enforced** check (§5) |
| Refusing anything that is not `action: "practised"` / `masteryEffect: "none"` | **KEEP** |
| Refusing unit keys outside `ayah` / `range` / `surah` | **KEEP** |
| Freezing historical `entries[]` and never rewriting it | **KEEP** as an absolute |
| A dual-read projection so old and new evidence read as one list | **KEEP the idea**, reshape it (§7) |

### 2.3 Concepts to discard

| Concept | Verdict and reason |
|---|---|
| `v1Events` map inside the weekly document | **DISCARD.** §3 Option C — the rejection reason |
| `JSON.stringify([...])` as the event key | **DISCARD.** Rules cannot reproduce JSON quoting/escaping, so identity could only be taken on trust |
| SHA-256 of the key as a map field name (the prototype) | **DISCARD.** Rules cannot compute it |
| Rewriting `logActivity()`'s general path onto the keyed map | **DISCARD.** A BR-3 change to a live collection that buys nothing P4-B needs |
| `MAX_STUDY_WEEK_ENTRIES` / byte preflight in the client | **DISCARD as a security measure** — client preflight is not a bound. Keep only as a UX guard if wanted |
| `projectMixedWeekEntries()` merging the map into `entries[]` | **DISCARD in that form** — merging evidence into the array the §1.3 confirm path reads is precisely the hazard |

---

## 3. Alternative comparison

Judged on correctness, security, compatibility, rollback and cost — **not diff size**.

### Option A — one document per event

`activity/{tenantId}__{personId}__{weekKey}/evidence/{eventId}`, `eventId` carrying the
deterministic identity.

| Property | Assessment |
|---|---|
| Deterministic identity | **Yes** — the id *is* the identity |
| Rules-validatable | **Yes** — the id is re-derived by string concatenation and compared to the `{eventId}` wildcard |
| Retry safety | **Enforced by the database.** `create` on an existing document fails unconditionally. Not a rule, not a transaction, not a client check |
| Immutability | `allow update, delete: if false` — one line, absolute |
| Rule cost | **Constant.** No map is walked; document size never enters a rule |
| Tenant/person binding | From the **path**, at zero read cost |
| Activity ≠ Mastery | Separate collection; a `hasOnly()` field list makes a status field unstorable |
| Legacy `entries[]` | **Untouched by construction** — a subcollection is independent of its parent, which need not even exist |
| Rollback | Stop writing; optionally stop reading. Nothing to undo |
| Migration needed | **None** |
| Cost | One document write per event; reads are a bounded subcollection query per week |

### Option B — server-verifiable composite key

Not a competing storage shape but the **identity discipline**: build identity only from
components Rules can inspect and compare, joined by a separator no component can contain.
**Adopted, and applied inside Option A.** Standalone (a composite key as a field inside a
shared document) it inherits whichever container it sits in, so it does not resolve the
storage question by itself.

### Option C — keyed map in the existing weekly document (`v1Events`)

| Property | Assessment |
|---|---|
| Rules-validatable identity | Partly — Rules *can* index a map by a computed key and use `diff().affectedKeys()`; the raw-key form is not unverifiable in principle |
| **Rule cost** | **REJECTED HERE.** Cost grows with the map, and the measured outcome is already on record: 9 of 13 denials were budget exhaustion, which later refuses legitimate writes |
| Document ceiling | The week document trends toward Firestore's 1 MiB limit and every write rewrites all of it |
| Legacy `entries[]` | Shares a document with the array `bulkConfirmWeek()` reads — §1.3 |
| Retry safety | A rule, not a database guarantee |

**Option C is explicitly rejected**, on recorded evidence, not preference.

### Option D — considered and not chosen

- **A top-level `activityEvidence/{tenantId}__{personId}__{eventId}` collection.** Works,
  but reading "this person's evidence this week" needs a filtered query and therefore
  composite-index management, where Option A's path gives the same scope for free. Rejected
  for **avoidable index surface**, which is itself a gated change.
- **A per-day rollup document.** Smaller read counts, but the dedupe unit stops being the
  document, so retry safety returns to being a rule. Rejected: it trades the single
  strongest property away for read cost that §6 shows is already acceptable.

**Chosen: Option A, with Option B's identity discipline.**

---

## 4. Recommended P4-B persistence architecture

### 4.1 Shape

```
activity/{tenantId}__{personId}__{weekKey}          ← EXISTING weekly doc. UNTOUCHED.
└── evidence/{eventId}                              ← NEW subcollection. Create-only.
        eventId = eventType__trackableId__unitKey__dedupeScope
```

The parent weekly document is **not read, not written, and need not exist**. Legacy
`entries[]` is untouched *by construction*.

### 4.2 The document

```
contractVersion : "study-approach-contract:v1"
eventType       : one of the five ADR-008 automatic events
tenantId        : must equal the path's tenant
personId        : must equal the path's person
weekKey         : must equal the path's week
dateIso         : "YYYY-MM-DD" (UTC)
subjectId       : "quran"
unitKey         : ayah:S:A | range:S:F-T | surah:S      (I5)
unitType        : "ayah" | "range" | "surah", paired with the key
trackableId     : the Approach ADR-008 gives this event
action          : "practised"        — the only permitted value
dedupeScope     : "once" for journal.note-created, else dateIso
masteryEffect   : "none"             — the only permitted value
occurrenceId?   : optional, wbw.engaged only
noteId?         : optional, journal events only
schemaVersion, createdAt, updatedAt, createdBy        (I17)
```

`hasOnly()` pins the field list, so **no `status`, `claimedStatus`, `confirmedStatus` or
`confirmState` field can exist on one of these documents.** Nothing stored here is
readable as a claim even by a confused future reader.

### 4.3 Why the identity is a delimiter-joined string

Rules can concatenate strings and compare the result to the `{eventId}` wildcard, so the
rule **re-derives the identity from the document's own fields** and rejects any id that
disagrees. That is a server-side guarantee. Rules cannot compute SHA-256 and cannot
reproduce `JSON.stringify`'s quoting — an identity in either form is only ever taken on
trust from the client, which is not identity enforcement.

**Separator safety, verified rather than assumed:** the separator is `__`. `unitKey` is
constrained by regex to digits and colons; `dedupeScope` is `once` or an ISO day;
`eventType` and `trackableId` are compared against exact literals. None can contain `_`
except `trackableId` — which is why `trackableId` is matched against the **literal set**
`approach_01|03|04|07|08|10` rather than a pattern, so its single `_` is never ambiguous.
No separate hygiene check is needed, and none is spent.

### 4.4 The §1.3 hazard, closed by construction

Evidence is **not** in `entries[]`. `bulkConfirmWeek()` reads `entries[]` and nothing
else, so it cannot see evidence and its behaviour does not change by one document. The
implementation task must add a **check that asserts this stays true** (§10), because the
protection is structural and a future refactor could undo it silently.

---

## 5. Event identity matrix

For all five automatic events. `status.claimed` and `status.confirmed` are **deliberately
excluded from this collection entirely** — they are the explicit Mastery workflow, they
already write `records/` plus a legacy Activity entry, and they are not expressible here:
the rule's `eventType` check does not admit them, and `action` may only be `practised`.

| | `reading.completed` | `listening.completed` | `journal.note-created` | `journal.note-revised` | `wbw.engaged` |
|---|---|---|---|---|---|
| **Actor / person** | `personId`, from the path | same | same | same | same |
| **Tenant** | `tenantId`, from the path | same | same | same | same |
| **Approach** | `approach_01` plain / `approach_03` with meaning | `approach_07` Arabic-only / `approach_08` with meaning | `approach_10` | `approach_10` | `approach_04` |
| **Unit identity** | `ayah` / `range` / `surah` key (I5) | same | the āyah or range the Note is anchored to | same | the āyah containing the occurrence |
| **Event type** | literal | literal | literal | literal | literal |
| **Dedupe boundary** | unit + day | unit + day | **note, once** | note + day | **see §11-A** |
| **Time component** | `dateIso`, UTC day | `dateIso` | **none** — `dedupeScope` is `once` | `dateIso` | `dateIso` |
| **Source identity** | — | — | `noteId` (stored, not in the id) | `noteId` | `occurrenceId` (stored, not in the id) |
| **Stable event identity** | `reading.completed__approach_01__ayah:2:255__2026-09-14` | `listening.completed__approach_08__surah:2__2026-09-14` | `journal.note-created__approach_10__ayah:2:255__once` | `journal.note-revised__approach_10__ayah:2:255__2026-09-14` | `wbw.engaged__approach_04__ayah:2:255__2026-09-14` |
| **Client supplies** | the whole document and the id | same | same | same | same |
| **Rules validate** | id ⇔ fields; event ⇔ Approach; unit shape ⇔ unitType; scope ⇔ path; `practised`/`none`; field list; `createdBy` == caller; authority | same | same, plus `dedupeScope == 'once'` | same | same |
| **Retry behaviour** | same id → `create` on an existing doc → **denied by the database** | same | same | same | same |
| **Mutation behaviour** | `update`/`delete` denied unconditionally | same | same | same | same |

### One structural subtlety, resolved

`journal.note-created` must dedupe **for the life of the note**, not per day — but the
document lives under a *week*. A retry a week later would land in a different week and
create a second document. **Resolution: the evidence's `dateIso` is the note's own
creation date, never "now".** The week is then a function of the note, so every retry
resolves to the same path and the same id. This must be an explicit requirement on the
writer, and a test (§10).

---

## 6. Firestore Rules enforceability matrix

The candidate is `docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules`.
**CANDIDATE ONLY. NOT DEPLOYED. `firestore.rules` is byte-for-byte unchanged.**

**It was executed**, against the Firestore emulator, project `demo-quranrevival-activity-evidence-v1`,
port 8087, isolated — **36 assertions, 0 failures, and 0 denials caused by expression
budget.** Every denial is a decision the rules made. See §6.2 for why that last clause is
the important one.

| Invariant | Enforced by Rules? | How |
|---|---|---|
| Tenant isolation | **YES** | `activityKey == tenantId + '__' + personId + '__' + weekKey`, then `canRecordFor(tenantId, personId)` |
| Actor / person ownership | **YES** | `canRecordFor` — reproduced unchanged from the deployed rules |
| **Cross-tenant person binding** | **YES — closes a gap the deployed rules have** | `personInTenant()` proves the person's `tenantPeople` doc names this tenant; `isSelfPerson()` alone does not |
| Allowed create fields | **YES** | `keys().hasOnly([...])` + `hasAll([envelope])` |
| Immutable fields | **YES, absolutely** | `allow update, delete: if false` — nothing is mutable, so nothing needs freezing |
| Event identity enforcement | **YES** | `eventId == eventType + '__' + trackableId + '__' + unitKey + '__' + dedupeScope` |
| Event ⇔ Approach mapping | **YES** | one disjunction pinning each event to its ADR-008 Approach(es) |
| Unit identity (I5) | **YES** | regex per accepted unit type, **paired with `unitType`** |
| Dedupe boundary correctness | **YES** | `'once'` for note-created, `== dateIso` otherwise |
| Update / delete policy | **YES** | denied unconditionally, for everyone, including admins |
| Activity → Mastery escalation | **YES, at the database** | `action == 'practised'`, `masteryEffect == 'none'`, and `hasOnly()` makes a status field unstorable |
| Invalid unit / event rejection | **YES** | `juz`, `page`, `topic`, `hadith`, unknown events, unmapped Approaches all denied |
| Cross-user / cross-tenant denial | **YES** | verified by allow/deny pairs in the emulator |
| Duplicate / replay | **YES — by the database, not by a rule** | `create` on an existing document always fails |
| `createdBy` authenticity | **YES** | `createdBy == request.auth.uid` |

### 6.1 What Rules CANNOT enforce — stated, not hidden

1. **That the interaction really happened.** Rules cannot know whether a person truly read
   an āyah or truly played 80% of a recitation. A client entitled to write for that person
   can assert a well-formed event that never occurred. This is the **same trust boundary
   the deployed rules already accept** for `records.entries` and `quranWordProgress` — not
   a new gap — but it must never be described as server-enforced proof of study.
2. **Completeness or ordering.** Nothing proves a person did not simply omit events.
3. **That `dateIso` is really today.** A writer may backdate within the week the path
   names. The **week** binding is enforced; the day inside it is not, because
   `request.time` is server time and not the learner's calendar day.
4. **A cap on how much evidence a person accumulates.** Rules cannot count documents.
   §11-A is the architectural answer to volume; it is not a Rules problem.
5. **The §1.3 client coupling.** No rule can stop `bulkConfirmWeek()` from reading
   whatever array it likes. The protection is structural (evidence is not in that array)
   and must be held by a test (§10).

### 6.2 The measurement that changed this design — my own first draft failed it

The first draft of the candidate was written, executed, and **11 of its 36 assertions were
denied by the 1000-expression budget rather than by the security logic** — the identical
defect that rejected the earlier Activity candidate, reproduced by accident while trying
to avoid it. The suite reported 36 passing and proved nothing for those 11.

Three changes removed it completely, and they are now part of the design rather than a
tuning afterthought:

1. **No `split()`.** The path/body binding became one string comparison instead of
   splitting the key and indexing it three times.
2. **No separator-hygiene regexes.** The format constraints already forbid `_` in every id
   component (§4.3), so four `.matches()` calls were removed as redundant, not relaxed.
3. **One combined event/Approach check** replacing three overlapping ones, and `hasAll()`
   reduced to the four envelope fields not otherwise checked by value.

Result: **0 budget denials, 36/36.**

**The cost-reduction pass introduced a real defect, which the suite caught.** Dropping
`split()` silently removed `unitType == unitKey.split(':')[0]`, so a document could store
`unitKey: "surah:2"` while declaring `unitType: "ayah"` — and every report that filters by
`unitType` would mis-file it. It is restored by **pairing** `unitType` with its key inside
the regex check, which is cheaper than the original and cannot be lost the same way.

**Proven able to fail:** with `idIsDerivedIdentity()` neutralised, the suite collapses from
36 assertions to 6 and fails at "an id that does not derive from the fields is refused".
It is not a suite that passes because it cannot fail.

---

## 7. Existing `entries[]` compatibility plan

**Legacy reads preserved; new writes use the new model. No migration.**

| Question | Answer |
|---|---|
| **Old reader behaviour** | **Unchanged, byte for byte.** `getWeekActivity()` returns the same document with the same `entries[]`. `logActivity()` is not modified |
| **New reader behaviour** | A reader that wants evidence reads the `evidence` subcollection **explicitly and additionally**. No existing reader is altered to do so |
| **Aggregation across legacy and new** | **Deliberately separate, and this is a design decision, not an omission.** Merging evidence into `entries[]` is what would feed §1.3. Monitor should report Activity and Study evidence as **two figures**, because they mean different things: a logged action versus a mapped interaction |
| **Backup / export** | Additive. `backup.js` gains one bounded subcollection read per week alongside the existing per-week `getDoc`; `backup-file.js` prints it as its own section with its own count. The existing `activity` count keeps its current meaning, so old exports stay comparable |
| **Duplicate-count risk** | **Structurally zero** while the two are not merged. If a future round *does* merge them, the id is deterministic and the array entries carry no id, so de-duplication would have to be defined then — a reason not to merge casually |
| **Rollback behaviour** | §8 |
| **Do existing production documents need transformation?** | **NO. None. Not one.** The new collection is empty until the first write; every existing weekly document remains valid and unchanged |

**No transformation was performed, and none is proposed.**

---

## 8. Rollback plan

Four levels, each independently reversible, none destructive (I4).

| Level | Action | Effect | Data |
|---|---|---|---|
| 1 — disable emission | Stop calling the writer (a flag, or unwire the adapter) | No new evidence. App behaves exactly as v08.24 | Existing evidence kept, readable |
| 2 — revert the client | Revert the implementation commit | The writer no longer exists | Kept |
| 3 — revert the Rules | Redeploy the previous `firestore.rules` | The subcollection returns to having no rule, so it is closed to clients | Kept, readable by an admin |
| 4 — abandon | Leave the collection unread | Dormant data, no reader, no cost | **Never deleted** (I4/D6) |

Because the model is **create-only and additive**, there is no state to unwind at any
level: no existing document was altered, no field repurposed, no array rewritten. A
rollback is "stop writing", never "put it back".

---

## 9. Exact proposed implementation / change budget for the NEXT task

**P4-C — the persisting writer. NOT AUTHORISED BY THIS REPORT.**
Proposed for the Master Architect to accept, amend or refuse.

**Create**

| File | Purpose |
|---|---|
| `app/js/study-activity-evidence-id.js` | Pure: builds `eventId` and the evidence document from a `projectStudyActivityEvidence()` row. No Firebase |
| `app/js/study-activity-evidence-store.js` | The only writer. One `createDocument()` into the subcollection. Treats an already-exists denial as **success, not an error** |
| `tools/i18n-verify/study-activity-evidence-id.mjs` | Pure id/shape checks |
| `tools/i18n-verify/study-activity-evidence-store.mjs` | Writer behaviour against the stub, incl. retry-is-a-no-op |
| `tools/i18n-verify/study-activity-evidence-boundary.mjs` | The structural guards of §10 |

**Modify**

| File | Change |
|---|---|
| `app/js/version.js` | `08.24` → `08.25` |
| `CHANGELOG.md`, `CLAUDE.md` | the round entry |
| `tools/i18n-verify/firebase-stub.mjs` | subcollection support, **only if** the stub lacks it (to be measured first) |

**Explicitly NOT to touch:** `app/js/activity.js` · `app/js/records.js` ·
`firestore.rules` · `app/quranrevival.html` and every other `app/*.html` ·
`app/js/monitor.js` · `app/js/backup.js` · `app/js/backup-file.js` · every Word Card and
Phase 3 file.

**Data structures:** one new subcollection. No existing structure changed.
**Dependencies:** none. **Blast radius: BR-0** — the writer stays uninvoked until a
separate task wires a Study surface to it. **Rollback:** §8 level 2.

**Deliberately deferred beyond P4-C**, each its own bounded task: wiring Reading;
wiring Listening; wiring Journaling; wiring WbW; the Monitor/backup **read** path.

---

## 10. Tests required before implementation can be accepted

1. **Emulator allow/deny suite** — the 36 executed assertions, **plus** the §11-A volume
   decision once made. Acceptance requires **zero budget-exhaustion denials**; a green run
   containing even one is a failed run. Every denial paired with an allow differing in one
   fact.
2. **Mutation proof** — neutralise `idIsDerivedIdentity()`, `scopeMatchesPath()`,
   `personInTenant()` and the `hasOnly()` list in turn; each must break the suite.
3. **Pure id/shape suite** — every ADR-008 event's id built and round-tripped;
   `status.claimed`/`status.confirmed` produce no evidence.
4. **Note-creation week stability** — a `journal.note-created` retry on a later date
   resolves to the **same** path and id (§5).
5. **Retry-is-a-no-op** — the writer treats an already-exists denial as success and
   surfaces no error to the user (I15 applies to *real* failures only).
6. **Structural guard: evidence must never reach `entries[]`** — assert `activity.js` is
   unmodified, that the writer never writes `TENANT.ACTIVITY` at document level, and that
   `bulkConfirmWeek()` still reads only `entries[]`. **This is the §1.3 protection; it is
   structural and must be held by a test.**
7. **Activity ≠ Mastery guard** — the writer names no `records`, `claimStatus`,
   `confirmEntry`, `achieved` or `mastered` (the shape the Phase 3 suites already use).
8. **Cost measurement** — write N evidence documents, then write one more, and assert the
   rule's cost did not change.
9. **Regression baseline unchanged** — `behaviour.mjs` 803 total at the documented stop;
   `layout.mjs` byte-identical; `navcheck`, `reading`, `panel` unchanged; coverage
   1,803/47; every Phase 2/3 suite at its recorded count.
10. **Read-path cost** — measure a real week's evidence read before any Monitor/backup
    wiring is proposed.

---

## 11. Owner Control Gates — two genuine ones

### 11-A. `wbw.engaged` deduplicates per OCCURRENCE per day, and that is an unbounded stream

**This is the one substantive tension inside ADR-008 itself**, and it is not mine to
resolve.

ADR-008 says `wbw.engaged` deduplicates by **occurrence + person + UTC date**, and in the
same document says: *"Store the minimum event evidence needed… Do not create an unbounded
interaction stream."* At occurrence grain those two sentences disagree. A learner tapping
100 words a day produces ~700 evidence documents a week — 36,000 a year, per person — and
per-occurrence detail **already exists** in `quranWordProgress` (Phase 3), which is the
dedicated WbW state ADR-008 itself says stays separate.

| Option | Volume per person per week | Consequence |
|---|---|---|
| **As written** — occurrence + day | ~700 | Faithful to the text; a real interaction stream; read cost and storage grow fast |
| **Amend to āyah + day** — *recommended* | ~10 | Activity records "did word-by-word work on this āyah today", which is Activity's own grain. `occurrenceId` is still stored on the document for provenance. No information is lost — the occurrence detail lives in `quranWordProgress` |

**Recommended: amend the `wbw.engaged` Activity dedupe boundary to āyah + day**, keeping
`occurrenceId` as a stored field. That is an amendment to an accepted ADR and therefore
**requires Master Architect authority. It has not been applied.** The candidate Rules as
executed accept either, because the boundary lives in `dedupeScope`; only the writer's id
derivation changes.

### 11-B. Deploying the candidate Rules

Until `firestore.rules` is amended and deployed, the `evidence` subcollection **has no
rule and is therefore closed to all clients.** So P4-C can be built, tested and merged
safely, but **the feature cannot function for anyone** — not even the Owner — until
deployment. Deployment is an Owner Control Gate and is **not requested here.** The exact
decision needed: *"Deploy the amendment adding `match /activity/{activityKey}/evidence/{eventId}`
to production `firestore.rules`."*

**Not a gate, but named:** the five deployed-Rules gaps in §1.5 are pre-existing, are
**not** introduced or worsened by this design, and are **not** proposed for change here.
Gap 5 (cross-tenant person binding) is closed *within* the new subcollection by
`personInTenant()`; it remains open on the parent `activity` collection.

**DDR-001, DDR-002, DDR-003 and DDR-004 are untouched** and remain INACTIVE / DEFERRED.
Nothing in this report activates a deferred decision.

---

## 12. Recommendation

The architecture is resolved: a **create-only document per event**, in a subcollection of
the existing weekly Activity document, with a **delimiter-joined identity that Firestore
Rules re-derive and verify**, deduplication enforced by the database rather than by a
rule, unconditional immutability, no migration, and a rollback that is only ever "stop
writing".

It has been **executed, not merely reasoned about**: 36 emulator assertions, 0 failures,
**0 budget-exhaustion denials**, and proven able to fail. The one defect the cost pass
introduced was caught by that suite and fixed.

Two decisions are reserved to the Master Architect and are stated exactly in §11: the
`wbw.engaged` dedupe grain (11-A), and Rules deployment (11-B). Neither blocks the
architecture — 11-A changes one line of the writer's id derivation and nothing structural;
11-B gates function, not construction.

# P4-B ARCHITECTURE READY FOR MASTER ARCHITECT AUDIT

**STATUS: AWAITING HUMAN SIGN-OFF. No implementation authorised. P4-C not begun.**
