# Document 3 — Progress Tracking Architecture

QuranRevival v08.00 · read-only analysis of the live codebase

---

## 0. The status model as it actually is

**The brief names five statuses. The code has six, plus one off-ramp.** The
difference matters, so here is the real list — `app/js/unit-keys.js:110`,
verbatim:

```js
export const STATUSES = Object.freeze([
  { id: "not_applicable", label: "Not Applicable", onRamp: false },
  { id: "not_started",    label: "Not started",    onRamp: true },
  { id: "learning",       label: "Learning",       onRamp: true },
  { id: "practising",     label: "Practising",     onRamp: true },
  { id: "achieved",       label: "Achieved",       onRamp: true },
  { id: "mastered",       label: "Mastered",       onRamp: true },
]);
```

Mapping to the brief's terms:

| Brief | Code id | Notes |
|---|---|---|
| Not Started | `not_started` | on ramp |
| Learning | `learning` | on ramp |
| Practicing | **`practising`** | **British spelling in the stored id.** Any new code must match exactly |
| Achieved | `achieved` | on ramp |
| Mastered | `mastered` | on ramp |
| — | `not_applicable` | **off ramp** — I7: excluded from totals, never counted as zero |

`not_applicable` is not a sixth step. It is an explicit exclusion, and every
aggregation in the app skips it rather than scoring it 0.

The English `label` is the **stored, canonical value and the translation key**;
`statusLabel(id)` (`unit-keys.js:139`) is the only place it becomes text a
person reads, translated at call time.

---

## 1. What entity receives a status

**A `(person, unit, Approach)` triple.** Nothing else in this application can
hold a status.

Concretely, a status is a value inside a map entry whose key is
`${unitKey}::${trackableId}`, inside a document whose id encodes the tenant and
the person. There is no status on a subject, on a section, on a module, on a
word, or on an Approach as a whole.

---

## 2 & 3. How a status is stored, and where

**Collection:** `records`
**Document id:** `{tenantId}__{personId}__{chunkKey}`
**Full path:** `records/{tenantId}__{personId}__{chunkKey}`

Real examples: `records/t1__p1__surah_2`, `records/t1__p1__subject_quran`.

The document is a **map of entries**, not a list. `app/js/records.js:5`
(the file's own header) plus the entry constructed at `records.js:170`:

```
records/{tenantId}__{personId}__{chunkKey}
  tenantId, personId, schemaVersion, createdAt, updatedAt, createdBy
  entries {
    "<unitKey>::<trackableId>": {
      unitType,             // "ayah" | "range" | "surah" | "ruku" | "juz" | "hizb" | "page" | ...
      subjectId,            // "quran"
      trackableId,          // "approach_04"
      claimedStatus,        // one of the six ids
      claimedByPersonId,
      confirmedStatus,      // frozen (I6) — null until a real confirm
      confirmState,         // "pending" | "confirmed" | "returned"
      confirmedByPersonId,
      confirmedAt,          // ISO string
      returnNote,
      domainIds[],          // optional tenant-authored tags
      notes,                // free text
      updatedAt
    }
  }
```

A single real entry, anonymised:

```json
{
  "entries": {
    "ayah:2:255::approach_04": {
      "unitType": "ayah",
      "subjectId": "quran",
      "trackableId": "approach_04",
      "claimedStatus": "practising",
      "claimedByPersonId": "p1",
      "confirmedStatus": "learning",
      "confirmState": "pending",
      "confirmedByPersonId": "p2",
      "confirmedAt": "2026-09-01T09:14:02.113Z",
      "returnNote": null,
      "domainIds": [],
      "notes": "",
      "updatedAt": "2026-09-04T18:22:41.008Z"
    }
  }
}
```

Note what this example shows: `claimedStatus` has moved on to `practising`
while `confirmedStatus` is still frozen at the previously confirmed `learning`,
and `confirmState` is back to `pending`. That is I6 working correctly.

**Writes are dot-path updates**, so a claim touches one entry and never rewrites
the map (`records.js:191`):

```js
await updateDocument(db, TENANT.RECORDS, docId, { [`entries.${entryKey}`]: entry, tenantId, personId });
```

**There is no delete path** anywhere — D6/I4.

---

## 4. Relationship to user

Two distinct identities, and conflating them is a real hazard:

- **`personId`** — the *subject* of the record. Appears in the document id and
  as a top-level field. This is who the progress belongs to.
- **`uid`** — the Firebase Auth login. Never in a records document except via
  `createdBy` on the envelope.

The bridge is `tenantPeople/{personId}.authUid`, which the security rules
dereference (`firestore.rules:788`):

```
function isSelfPerson(personId) {
  return signedIn() && exists(tenantPersonRef(personId))
      && get(tenantPersonRef(personId)).data.authUid == myUid();
}
```

One login can act for several people — a guardian recording for their children —
which is why `claimedByPersonId` is a *separate* field from the document's
`personId`. A parent claiming for a child writes `personId: child`,
`claimedByPersonId: parent`.

**Four legacy `personId` shapes must all keep working** (I16/D3): `p1`…`p4`,
`p` + 13-digit timestamp, `person_` + 8 uid chars, `person_admin1`.

---

## 5. Relationship to Approach

`trackableId` — the right-hand half of the entry key, and also stored
redundantly as a field on the entry.

**The relationship is by opaque string only.** Verified: the only code that ever
decomposes an entry key does so on `::` and takes both halves whole
(`quranrevival.html`, `buildExploreWiderSpans()`):

```js
const [unitKey, trackableId] = key.split("::");
```

Nothing validates a `trackableId` against the trackables collection, nothing
parses inside it, and a records entry for an Approach that was later archived
still sits there intact (I4). This is a deliberate property and it is what makes
§14 below possible.

---

## 6. Relationship to Quran study unit

`unitKey` — the left-hand half. Fully covered in Document 2. The unit's *type*
is also denormalised onto the entry as `unitType` so that "show all page-based
progress" is a filter rather than a re-parse of every key string.

---

## 7. Is progress stored or dynamically calculated?

**Both, at two different levels, and the split is clean:**

- **A claim is STORED.** The `(person, unit, Approach)` status is a durable
  Firestore write. This is the only persisted progress in the system.
- **Everything above a claim is CALCULATED, every render, from claims already
  in memory.** Roll-ups, pooled statuses, Explore colours, the Breakdown
  histogram, the Monitor report — none of it is written back anywhere.

**There is no denormalised progress document, no summary collection, no
aggregate counter, and no Cloud Function maintaining one.** This was checked
across the whole collection map (`app/js/collections.js`): the tracking-core
collections are `trackables`, `records`, `activity`, `bookmarks`, `ayahNotes`,
`domains`. None of them is a computed roll-up.

**This is a genuinely important finding for a coverage feature.** It means:

- *Good:* there is no cache to invalidate and no aggregate that can drift.
  Adding a new calculation is pure read-side work.
- *Bad:* every calculation is bounded by what is in memory, and what is in
  memory is bounded by the chunk reads. A whole-Quran percentage over 77,429
  words cannot be computed from the landing page's single surah chunk. Explore
  already accepts a ~115-document read to compute its whole-Quran view; a
  word-level metric would need the same or a new shape.

---

## 8. How parent progress is aggregated

Fully specified in Document 2 §6. In one line: **MAX downward (a wide claim
floors its ayahs), MIN upward (a wide unit takes its weakest ayah),
`not_applicable` excluded from both.** Explore only; the landing wheel does not
aggregate at all.

---

## 9. How percentages are calculated

**Percentages barely exist in this application, and none of them drives a
colour.** There are exactly two, and both are narrow.

**(a) `summarizeStatuses()`** — `unit-keys.js:157`, the only ratio primitive:

```js
export function summarizeStatuses(statusIds) {
  const counted = statusIds.filter((s) => s !== "not_applicable");
  const achievedOrBetter = counted.filter((s) => s === "achieved" || s === "mastered").length;
  return {
    countedTotal: counted.length,
    excludedNotApplicable: statusIds.length - counted.length,
    achievedOrBetter,
    ratio: counted.length === 0 ? null : achievedOrBetter / counted.length,
  };
}
```

Note: **"progress" here is defined as `achieved` or `mastered`**, nothing else.
`learning` and `practising` count in the denominator but not the numerator.
`ratio` is `null`, not `0`, when nothing is countable — a deliberate distinction
between "no progress" and "nothing to measure".

Two callers only: `way-modal.js:100` and `monitor.js:158`.

**(b) The Breakdown tab histogram** — `way-modal.js:99`, a per-status share
within one surah:

```js
const pct = summary.countedTotal ? Math.round((count / summary.countedTotal) * 100) : 0;
```

**(c) The Coverage tab** — `way-modal.js:124` — is a **count, not a
percentage**: *"N of M ayahs touched in this surah for this Approach."*
"Touched" means `statusId && statusId !== "not_started"`.

**What is NOT a percentage anywhere: the Mastery Wheel, the Explore wheel, the
sidebar chips, the Juz/Surah/Ruku levels.** Every one of those is a status id
mapped to a colour, full stop.

**Consequence for the planned coverage metric:** the formula
`understood ÷ total × 100` has **no existing home in this architecture**. It is
not an extension of anything; it is a new kind of quantity. The nearest existing
thing is `summarizeStatuses().ratio`, which is a ratio over *claims*, not over
*words*.

---

## 10. What code writes progress

**One function: `claimStatus()` in `app/js/records.js:154`.** There is no second
write path for a claim anywhere in the application.

Its full behaviour, in order:

1. Validate the status is one of the six (`isValidStatus`) — throws otherwise.
2. Compute the chunk key and entry key.
3. Read `subjects/{tenantId}__{subjectId}.confirmationRequired` (the per-subject
   override).
4. Compute whether confirmation is required (see Document 4).
5. Read the existing chunk to get the previous entry.
6. Build the entry, respecting I6.
7. Dot-path update, or create the chunk if it does not exist.
8. Return `{ chunkKey, entryKey, needsConfirmation }`.

The I6-critical part, `records.js:170`, verbatim:

```js
const entry = {
  unitType, subjectId, trackableId,
  claimedStatus: statusId,
  claimedByPersonId,
  confirmedStatus:      needsConfirmation ? (prevEntry.confirmedStatus ?? null)      : statusId,
  confirmState:         needsConfirmation ? "pending"                                : "confirmed",
  confirmedByPersonId:  needsConfirmation ? (prevEntry.confirmedByPersonId ?? null)  : claimedByPersonId,
  confirmedAt:          needsConfirmation ? (prevEntry.confirmedAt ?? null)          : nowIso,
  returnNote:           needsConfirmation ? (prevEntry.returnNote ?? null)           : null,
  domainIds: domainIds ?? [],
  notes: notes ?? "",
  updatedAt: nowIso,
};
```

**Call sites — all nine, found by grep:**

| File | Line | Context |
|---|---|---|
| `app/quranrevival.html` | 10943 | Note view → Approach card (the main Quran claim path) |
| `app/quranrevival.html` | 11032 | Note view → Asma ul Husna card |
| `app/quranrevival.html` | 11924 | the floating "Track this unit" overlay |
| `app/records.html` | 540 | the records screen's own claim control |
| `app/js/topic-study.js` | 512 | topic renderer (Deen, Arabic, Hadith, General, Nature-Life) |
| `app/js/routine-study.js` | 510 | routine renderer (Health, LDOG) |
| `app/js/asma-study.js` | 755 | Asma ul Husna module |
| `app/js/self-check.js` | 279 | admin self-check |

Every one wraps the call in `safeWrite()` (I15 — a failed write must reach the
user, never `console.error` alone) and follows a successful claim with
`logActivity()` (`app/js/activity.js`), which appends to
`activity/{tenantId}__{personId}__{weekKey}`. **Activity is the audit log, not
the progress store** — I3: `viaProgramId`/`viaSessionId` live there and never in
a record key.

---

## 11. What code reads progress

| Reader | File | What it reads |
|---|---|---|
| `getRecordsChunk()` | `records.js:66` | one document by id — the primitive |
| `listAllRecordsForPerson()` | `records.js:354` | every chunk for a person, **one query** on `tenantId + personId` |
| `listPendingForPerson()` | `records.js:372` | the above, filtered to `confirmState === "pending"` |
| landing wheel | `quranrevival.html:5545` | `refreshChunkAndWheel()` → one `surah_N` chunk |
| the `subject_quran` cache | `quranrevival.html:5608` | `ensureQuranSubjectChunk()` — fetched **on first use**, cached per person, deliberately off the startup path (I9) |
| Explore | `quranrevival.html:6623` | `ensureExploreChunksLoaded()` — up to 114 surah chunks + `subject_quran`, in parallel, once per Explore open |
| Monitor | `app/js/monitor.js` | `listAllRecordsForPerson()` |
| Records screen | `app/records.html` | `getRecordsChunk()` |

The `listAllRecordsForPerson` query, `records.js:354`, is the only list query
against `records` and its list-safety is deliberate — both filter fields are
exactly what the rule checks:

```js
const q = query(
  collection(db, TENANT.RECORDS),
  where("tenantId", "==", tenantId),
  where("personId", "==", personId)
);
```

---

## 12. What code updates status

| Action | Function | Effect |
|---|---|---|
| Claim / re-claim | `claimStatus()` | sets `claimedStatus`; resets `confirmState` to `pending` if confirmation is required |
| Confirm | `confirmEntry()` `records.js:201` | freezes `confirmedStatus = claimedStatus`, stamps who and when |
| Return | `returnEntry()` `records.js:219` | sets `confirmState = "returned"` + `returnNote`. **Leaves `confirmedStatus`/`confirmedAt` frozen** |
| Bulk confirm (surah/subject) | `bulkConfirmChunk()` | every `pending` entry in one chunk |
| Bulk confirm (week) | `bulkConfirmWeek()` | every entry touched by that week's activity doc, across chunks |
| Bulk confirm (person) | `bulkConfirmAllPendingForPerson()` | — |
| Bulk confirm (class) | `bulkConfirmClass()` | loops actively-enrolled students |

**No function ever lowers a status, deletes an entry, or recalculates a
confirmed value.** I4 and I6 together.

---

## 13. Is word-level progress currently possible?

**No, and the reason is precise: there is no word unit key.**

What is missing, checked item by item:

| Requirement | Present? |
|---|---|
| A `word` entry in `UNIT_TYPES` | **No** — `unit-keys.js:14` has twelve types, none is `word` |
| A `buildUnitKey.word()` constructor | **No** |
| A stable per-word identifier in the dataset | **No** — words carry `position` (unique within an ayah only), no global id. See Document 7 |
| A chunking rule for word claims | **No** — `chunkKeyFor()` would send `word:*` to `subject_quran` by fallback |
| A boundary/containment rule | **No** |
| Rendering of a word-level status | **No** |

What is **not** missing, and this is the encouraging half:

- The records schema is **entirely key-driven**. A word unit key would be stored
  and read by the existing code with **no schema change and no rules change** —
  `claimStatus()` calls `parseUnitKey()` to get `unitType` and otherwise treats
  the key as opaque.
- The security rules are shape-agnostic: `records` is gated on
  `canRecordFor(tenantId, personId)` only, and never inspects `entries`.

**The blocking problem is scale, not schema.** A per-word-occurrence claim model
means up to 77,429 entries per person *per Approach*, all landing in one
`subject_quran` document (that is where `chunkKeyFor()`'s fallback would send
them). **Firestore's hard limit is 1 MiB per document.**

Measured, not estimated: one entry of exactly the shape `claimStatus()` writes,
serialised compactly together with its key, is **359 bytes**. That gives roughly
**2,900 entries per document**. The resulting sizes, for one person for one
Approach:

| Claim granularity | Entries | Approx. size | Fits one document? |
|---|---|---|---|
| Per word occurrence | 77,429 | **~26.5 MiB** | **No — ~26× over** |
| Per unique surface form | 21,295 | ~7.3 MiB | **No — ~7× over** |
| Per lemma | 4,832 | ~1.65 MiB | **No — ~1.7× over** |
| Per root | 1,642 | ~0.56 MiB | **Yes**, with roughly 44% headroom |

(Counts are from the real dataset — Document 7. Firestore's own field-size
accounting differs slightly from compact JSON, so treat these as the right
order of magnitude rather than exact byte counts; the conclusions are not close
enough to the boundary for that to matter, except for lemmas.)

**So: root-level claims fit the existing chunking scheme as it stands. Lemma,
surface-form and per-occurrence claims do not, and would need either a new
chunking rule or a different storage shape.** This is a hard arithmetic
constraint and the reviewer should design against it from the start rather than
discover it in testing. Note also that this is per person *per Approach* — two
Approaches claiming against roots would double the entry count in the same
document, which erases the root-level headroom.

---

## 14. Can the current architecture support multiple independent progress tracks within one Approach?

**Short answer: yes at the storage layer, today, with no schema change — and no
at every layer above it.** The distinction is sharp and worth stating precisely,
because it decides how much of Options B and C is free.

### 14.1 What already works

The stored key is `${unitKey}::${trackableId}` and **`trackableId` is never
parsed**. So these three keys are already, today, three fully independent
records entries:

```
ayah:2:255::approach_31_L1
ayah:2:255::approach_31_L2
ayah:2:255::approach_31_L3
```

Each gets its **own** `claimedStatus`, `confirmedStatus`, `confirmState`,
`confirmedByPersonId`, `confirmedAt`, `returnNote`, `domainIds` and `notes`.
Nothing in `claimStatus`, `confirmEntry`, `returnEntry`, any bulk-confirm
function, or `firestore.rules` would need to change. The teacher approval
workflow (Document 4) would work on each independently, because it operates on
entry keys.

**So the requirement "each track needs independent Not Started / Learning /
Practising / Achieved / Mastered, percentage, teacher approval and completion
state" is satisfied by the data layer as it stands.**

### 14.2 What does not work

The obstacle is that **"a track" has nowhere to be declared.** Everything above
storage assumes *one trackable = one Approach = one wheel segment = one sidebar
row = one Track card*:

| Layer | Assumption | Consequence for three tracks under one Approach |
|---|---|---|
| `trackables` schema | flat; no `parentId`, `levels[]`, `trackIds[]` (Document 1 §11) | three tracks must be three trackable **documents**; there is no field that says they belong together |
| `quranTrackables` filter (`quranrevival.html:5468`) | every `subjectId === "quran"` row is an Approach | three track rows become **three Approaches on the wheel**, not one |
| `renderWheel()` | one segment per element of `quranTrackables` | 30 → 32 or 33 segments |
| `renderWheelSidebar()` | one row per trackable | three sibling rows, visually unrelated |
| `renderExploreApproachList()` | one selectable Approach per trackable | Explore shows three separate Approaches |
| `way-modal.js` Track card | one status picker per trackable | correct per track, but no combined view |
| **Nothing** | — | there is **no** roll-up from tracks to a parent Approach, because no parent exists |

### 14.3 The precise architectural limitation

**There is exactly one, and it is a missing field, not a wrong design:**

> `trackables` has no grouping field that carries records meaning. The one
> grouping field it does have — `group` / `groupName`, the 7 sections — is
> display-only: it never appears in a unit key or an entry key, nothing
> aggregates by it, and a section cannot be claimed or shown a status.

Every other consequence in §14.2 follows from that single absence. Concretely,
to make "one Approach containing N independently tracked levels" a real concept
rather than a naming convention, the minimum change is:

1. **A field on `trackables`** marking parent/child (e.g. `parentTrackableId`,
   or a `kind: "approach" | "track"` discriminator). Additive, no migration —
   existing rows read as top-level by absence.
2. **A change to the one filter line** at `quranrevival.html:5468` so the wheel
   shows parents, not every row.
3. **A roll-up rule** deciding what a parent Approach's own status *is* when its
   children disagree. **This does not exist anywhere in the app today** and
   cannot be inferred: the two existing aggregation rules (MIN upward for
   Explore, no aggregation at all for the landing wheel) are about *units*, not
   about *trackables*, and the brief explicitly forbids the obvious defaults
   ("do not assume Level 1 automatically completes Level 2"). **This is a design
   decision for the reviewer, not a technical one.**
4. **A UI decision** on how a parent with children is presented on a wheel whose
   segments are already at their legible limit at 30.

Items 1 and 2 are small. Item 3 is the real work, and it is a question about
meaning rather than about code.

---

## 15. Summary table for the reviewer

| Question | Answer |
|---|---|
| Statuses | 6 ids, 5 on-ramp + `not_applicable` off-ramp; note `practising` spelling |
| What holds a status | `(personId, unitKey, trackableId)` — nothing else |
| Where | `records/{tenantId}__{personId}__{chunkKey}`, in an `entries` map |
| Stored or computed | claims stored; **all** roll-ups computed per render, nothing cached |
| Percentages | two, both narrow; **none drives a colour**; no coverage metric exists |
| Single write path | `claimStatus()` — 9 call sites |
| Word-level progress | not possible today: no word unit key, no word id, and per-occurrence claims exceed Firestore's 1 MiB document limit by ~20× |
| Independent tracks under one Approach | **storage: works today, unchanged.** Presentation and roll-up: not modelled at all |
| The single blocking absence | no records-meaningful grouping field on `trackables` |
