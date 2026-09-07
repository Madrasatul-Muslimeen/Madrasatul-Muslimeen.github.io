# 07 — Progress and Tracking System

QuranRevival v08.02 · the deepest system in the application

---

## 1. All progress statuses — **six, not five**

```js
// app/js/unit-keys.js:114
export const STATUSES = Object.freeze([
  { id: "not_applicable", label: "Not Applicable", onRamp: false },
  { id: "not_started",    label: "Not started",    onRamp: true },
  { id: "learning",       label: "Learning",       onRamp: true },
  { id: "practising",     label: "Practising",     onRamp: true },
  { id: "achieved",       label: "Achieved",       onRamp: true },
  { id: "mastered",       label: "Mastered",       onRamp: true },
]);
```

**Three facts the names do not tell you:**

1. **The stored id is `practising`** — British spelling. New code must match exactly.
2. **`not_applicable` is off the ramp.** It is an *exclusion*, not a sixth step — invariant I7 requires it excluded from totals, never counted as zero.
3. The English `label` is the **stored, canonical value and the translation key**. `statusLabel(id)` (`unit-keys.js:139`) is the only place it becomes readable text, translated at call time so a mid-session language change is picked up.

### Meaning of each — what the code does and does not say

| Status | What the code does with it | Defined meaning? |
|---|---|---|
| `not_started` | the default when no entry exists; bottom of `RAMP_ORDER` | implicit |
| **Learning** | position 2 on the ramp | **none in code** |
| **Practising** | position 3 | **none in code** |
| **Achieved** | position 4; **counts toward "progress"** | **none in code** |
| **Mastered** | position 5, the top; a distinct HUE on the wheel | **none in code** |
| `not_applicable` | skipped by every aggregation | an explicit exclusion |

> **There is no semantic definition of Learning / Practising / Achieved /
> Mastered anywhere in the codebase.** No criteria, no minimum time, no required
> evidence, no ordering constraint. A learner may pick `mastered` on the first
> click. The only guidance is each Approach's own `guide.measure` sentence, which
> is **displayed text, never validated**.

**The app defines "progress" narrowly** — `summarizeStatuses()` counts only
`achieved` **or** `mastered` in its numerator:

```js
// app/js/unit-keys.js:157
export function summarizeStatuses(statusIds) {
  const counted = statusIds.filter((s) => s !== "not_applicable");
  const achievedOrBetter = counted.filter((s) => s === "achieved" || s === "mastered").length;
  return { countedTotal: counted.length,
           excludedNotApplicable: statusIds.length - counted.length,
           achievedOrBetter,
           ratio: counted.length === 0 ? null : achievedOrBetter / counted.length };
}
```

`ratio` is **`null`, not `0`**, when nothing is countable — a deliberate
distinction between "no progress" and "nothing to measure".

---

## 2. Status transitions

**There is no state machine.** A claim is a free assignment from a `<select>`:

```
any status  ──────▶  any other status      (no validation beyond isValidStatus)
```

The only guard is membership of the six (`isValidStatus`, which throws on
anything else). **Transitions may go backwards, skip levels, or repeat.**

What a *re-claim* changes, and what it deliberately does not (invariant I6):

```
re-claim  →  claimedStatus := new value
          →  confirmState  := "pending"        (if confirmation is required)
          →  confirmedStatus, confirmedAt, confirmedByPersonId  ← UNCHANGED
```

So an entry legitimately shows `claimedStatus: "mastered"` beside
`confirmedStatus: "achieved"` — the student has moved on and the teacher has not
caught up. **This is correct behaviour, not a bug.**

---

## 3. Who can change status

| Action | Who | Gate |
|---|---|---|
| Claim for self | anyone | `isSelfPerson()` |
| Claim for another | owner, prime, co-enrolled teacher, guardian-of | `canRecordFor()` |
| **Confirm / return** | the same set | **`canRecordFor()` — the identical gate** |

> **The security rules do not distinguish claiming from confirming.** Anyone who
> may write a record at all may set `confirmedStatus`. The separation exists
> **only in client-side JavaScript** — `records.html` is the only screen that
> offers Confirm/Return, and it hides them when `viewAsRole === "student"`.

---

## 4. The claim process

```js
// app/js/records.js:154 — THE single write path for all progress in the app
export async function claimStatus(db, {
  tenantId, personId, subjectId, unitKey, trackableId,
  statusId, notes, domainIds, claimedByPersonId, claimedByUid,
}) { … }
```

Nine steps, and **nine Firestore reads before the write**:

| # | Step | Reads |
|---|---|---|
| 1 | `isValidStatus(statusId)` — throws otherwise | 0 |
| 2 | `chunkKeyFor(unitKey, subjectId)` | 0 |
| 3 | `entryKey = ${unitKey}::${trackableId}` | 0 |
| 4 | `getSubjectConfirmationOverride()` → `subjects/{t}__{subjectId}` | **1** |
| 5 | `computeConfirmationRequired()` → 6 role gets | **6** |
| 6 | …+ `personIsManaged()` → `tenantPeople/{personId}` | **1** |
| 7 | `getDoc(records/{t}__{p}__{chunk})` — the previous entry | **1** |
| 8 | **WRITE** — dot-path update, or create | — |
| 9 | caller then calls `logActivity()` | +1 write |

The I6-critical construction (`records.js:170`):

```js
const entry = {
  unitType, subjectId, trackableId,
  claimedStatus: statusId,
  claimedByPersonId,
  confirmedStatus:     needsConfirmation ? (prevEntry.confirmedStatus ?? null)     : statusId,
  confirmState:        needsConfirmation ? "pending"                               : "confirmed",
  confirmedByPersonId: needsConfirmation ? (prevEntry.confirmedByPersonId ?? null) : claimedByPersonId,
  confirmedAt:         needsConfirmation ? (prevEntry.confirmedAt ?? null)         : nowIso,
  returnNote:          needsConfirmation ? (prevEntry.returnNote ?? null)          : null,
  domainIds: domainIds ?? [], notes: notes ?? "", updatedAt: nowIso,
};
```

**Whether confirmation is required is COMPUTED, never configured per person**
(`records.js:124`) — see 02-USER-ROLES-AND-PERMISSIONS.md §3 for the ordered
cascade and its consequences.

---

## 5. Approval, return, and the two statuses

| Action | Function | Effect |
|---|---|---|
| Confirm | `confirmEntry()` `records.js:201` | `confirmedStatus := claimedStatus` (**frozen**), `confirmState := "confirmed"`, stamps who + when |
| Return | `returnEntry()` `records.js:219` | `confirmState := "returned"` + `returnNote`. **Leaves `confirmedStatus`/`confirmedAt` frozen** |
| Bulk (surah/subject) | `bulkConfirmChunk()` `:262` | every `pending` entry in one chunk |
| Bulk (week) | `bulkConfirmWeek()` `:274` | every entry touched by that week's activity doc, across chunks |
| Bulk (person) | `bulkConfirmAllPendingForPerson()` `:297` | |
| Bulk (class) | `bulkConfirmClass()` `:322` | loops active `student` enrolments |

Bulk confirms skip anything not currently `pending` (`records.js:251`).
A `returned` entry offers "Confirm anyway" (`records.html:483`).

### Claimed vs confirmed — **handled entirely separately**

```
claimedStatus     ← what the student says       →  drives EVERY wheel and colour
confirmedStatus   ← what the teacher froze (I6) →  drives NOTHING visual
confirmState      ← pending | confirmed | returned
```

**They are separate fields, separate columns, and separately maintained.** The
architectural inconsistency is not that they are conflated — it is that only one
of them is ever *used* outside the Records table.

---

## 6. Database structure

**Collection:** `records`
**Document id:** `{tenantId}__{personId}__{chunkKey}`

```json
{
  "tenantId": "t1",
  "personId": "p1",
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
  },
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

Plus the envelope every document carries (I17): `schemaVersion`, `createdAt`,
`updatedAt`, `createdBy` — `app/js/envelope.js`.

**Writes are dot-path updates**, so a claim touches one entry and never rewrites
the map. **There is no delete path anywhere** (I4/D6).

---

## 7. Is progress stored or calculated? — **both, at two levels**

- **A claim is STORED.** The `(person, unit, Approach)` status is a durable write. **This is the only persisted progress in the system.**
- **Everything above a claim is CALCULATED on every render**, from claims already in memory: roll-ups, pooled statuses, Explore colours, the Breakdown histogram, the Monitor report.

> **There is no denormalised progress document, no summary collection, no
> aggregate counter, and no Cloud Function maintaining one.** Verified across the
> whole collection map (`app/js/collections.js`).

*Good:* nothing can drift, and there is no cache to invalidate.
*Bad:* every calculation is bounded by what is in memory, which is bounded by the
chunk reads — Explore already pays ~115 document reads to compute its
whole-Quran view.

---

## 8. How parent progress aggregates

Fully specified in **06-STUDY-UNITS.md §7**. In one line:

```
MAX downward (a wide claim floors its ayahs) · MIN upward (a wide unit takes its
weakest ayah) · not_applicable excluded from both (I7) · the landing wheel does
NEITHER — direct claim only.
```

---

## 9. How percentages are calculated

**Percentages barely exist, and none drives a colour.**

| # | Percentage | Where |
|---|---|---|
| 1 | `summarizeStatuses().ratio` | `unit-keys.js:157` — two callers only |
| 2 | Breakdown-tab histogram | `way-modal.js:99` — `Math.round((count / summary.countedTotal) * 100)` |
| — | Coverage tab | `way-modal.js:124` — **a count, not a percentage**: "N of M ayahs touched" |

**Not a percentage anywhere:** the Mastery Wheel, the Explore wheel, the sidebar
chips, all four Explore levels. Every one is a status id mapped to a colour.

---

## 10–12. Code that writes, reads and updates progress

### Writes
**One function: `claimStatus()`.** Nine call sites:

| File | Line | Context |
|---|---|---|
| `app/quranrevival.html` | 10967 | Note view → Approach card (the main Quran path) |
| `app/quranrevival.html` | 11056 | Note view → Asma ul Husna card |
| `app/quranrevival.html` | 11948 | the floating "Track this unit" overlay |
| `app/records.html` | 540 | the Records screen's own claim control |
| `app/js/topic-study.js` | 512 | topic renderer (6 modules) |
| `app/js/routine-study.js` | 510 | routine renderer (2 modules) |
| `app/js/asma-study.js` | 755 | Asma ul Husna |
| `app/js/self-check.js` | 279 | admin self-check |

Every one wraps the call in `safeWrite()` (I15 — a failed write must reach the
user, never `console.error` alone) and follows success with `logActivity()`.

### Reads

| Reader | Where | Cost |
|---|---|---|
| `getRecordsChunk()` | `records.js:66` | 1 doc — the primitive |
| `listAllRecordsForPerson()` | `records.js:354` | **1 query**, `tenantId` + `personId` |
| `listPendingForPerson()` | `records.js:372` | the above, filtered to `pending` |
| landing wheel | `refreshChunkAndWheel()` `:5565` | 1 doc |
| `subject_quran` cache | `ensureQuranSubjectChunk()` `:5628` | 1 doc, **first use only** (I9) |
| Explore | `ensureExploreChunksLoaded()` `:6647` | **≤115 docs, parallel, per open** |
| Monitor | `monitor.js` | via `listAllRecordsForPerson()` |
| Records screen | `records.html` | via `getRecordsChunk()` |

The only list query against `records` is deliberately **list-safe** — both filter
fields are exactly what the rule checks:

```js
// app/js/records.js:354
query(collection(db, TENANT.RECORDS),
      where("tenantId", "==", tenantId),
      where("personId", "==", personId));
```

### Updates
`confirmEntry`, `returnEntry`, and the four bulk-confirm functions. **No function
ever lowers a status, deletes an entry, or recalculates a confirmed value.**

---

## 13. Firestore collections and security rules

```
match /records/{recordKey} {
  allow read: if isPlatformAdmin();
  allow read: if signedIn() && !exists(/databases/$(database)/documents/records/$(recordKey));
  allow read: if canRecordFor(resource.data.tenantId, resource.data.personId);
  allow create: if canRecordFor(request.resource.data.tenantId, request.resource.data.personId);
  allow update: if canRecordFor(resource.data.tenantId, resource.data.personId);
  // No delete (I4/D6).
}
```

The second `allow read` is deliberate, not a hole: `claimStatus()` reads a chunk
to see whether it exists before creating it, and for a first-ever claim
`resource` is null. A nonexistent document has no data to expose.

**The rules never inspect `entries`** — only `tenantId` and `personId`. New unit
keys, trackable ids and entry fields therefore need **no rules change**.

---

## 14. The full trace of one status change

```
USER clicks "Mastered" in the Note view's Approach card, then "Claim"
  │
  ▼ COMPONENT   wireApproachEmbed() claim handler        quranrevival.html:10967
  │              assignees = checkedAssignees(...)        ← may be SEVERAL people
  │
  ▼ WRAPPER     safeWrite(...)                            errors.js:107   (I15)
  │
  ▼ SERVICE     claimStatus(db, {...})                    records.js:154
  │               chunkKeyFor()          → "surah_2"      records.js:53
  │               entryKey               → "ayah:2:255::approach_04"
  │               getSubjectConfirmationOverride()        1 read
  │               computeConfirmationRequired()           7 reads
  │               getDoc(existing chunk)                  1 read
  │
  ▼ FIRESTORE   updateDocument(records/t1__p1__surah_2,
  │               { "entries.ayah:2:255::approach_04": {...} })   ← dot-path
  │
  ▼ AUDIT       logActivity() → activity/t1__p1__{weekKey}        (I3)
  │
  ▼ RE-READ     chunkKey === "subject_quran"
  │               ? ensureQuranSubjectChunk({force:true}) + renderWheel()
  │               : refreshChunkAndWheel()                :5565
  │
  ▼ CALCULATION approachStatusesForCurrentUnit()          :5685
  │               reads claimedStatus straight from the fresh chunk
  │               ── NO aggregation on this screen ──
  │
  ▼ WHEEL       renderWheel() → renderScopedWheel()       mastery-wheel.js:300
  │               fill = STATUS_COLORS[statusId]
  │
  ▼ NOTE VIEW   renderNoteViewNow() — rebuilds the card against the fresh chunk
  │
  ▼ EXPLORE     ── NOT UPDATED HERE ──
                Explore recomputes only on its next open (ensureExploreChunksLoaded).
                One exception, added deliberately: refreshChunkAndWheel() patches
                exploreChunksBySurah in place if Explore has been opened this
                session, so a claim shows as a real colour change without
                closing and reopening Explore.
END
```

---

## 15. Architectural inconsistencies — observed, not fixed

**1. Approval gates nothing visual.** Every wheel and every Explore colour reads
`claimedStatus`. `confirmedStatus` appears only in the Records table. **A
*returned* claim still shows green on the wheel.** This is the largest
inconsistency in the system.

**2. The rules do not separate claiming from confirming.** `canRecordFor()` is
the same gate for both; the separation is client-side only.

**3. Two aggregation rules that deliberately disagree.** The landing wheel shows
a direct claim; Explore pools. A Juz whose ayahs are all mastered reads
`not_started` on one screen and green on the other. Both are correct for their
own screen and the difference is invisible.

**4. Privilege is checked before studenthood.** `computeConfirmationRequired()`
returns `false` at the owner/prime/teacher/guardian checks *before* reaching the
student check — so any administrative role silently exempts a person from
approval even if they also hold `student`.

**5. `subjects.confirmationRequired` is the only configuration knob**, and it is
per **subject** — so it cannot be varied per Approach or per unit type.

**6. `not_applicable` is on the same picker as the ramp**, though it is
semantically a different kind of thing.

**7. Nine reads per claim, multiplied by assignees.** A guardian claiming for
three children pays 27 reads for one press.

**8. Activity is written but never queried as a list.** `activity.js` reads by id
only — there is no list query for activity anywhere in the app, so the backup
walks week keys from the tenant's `createdAt` to today rather than listing them.

---

## 16. Can the schema support multiple independent tracks within one Approach?

**Storage: yes, today, unchanged. Presentation: no.**

Because `trackableId` is an opaque string that nothing parses — the only code
that decomposes an entry key splits on `::` and takes both halves whole — these
are already three fully independent entries:

```
ayah:2:255::approach_31_L1
ayah:2:255::approach_31_L2
ayah:2:255::approach_31_L3
```

Each gets its own status, confirmation state, approver and timestamp, with **no
schema change and no rules change**.

**But nothing above storage can show them.** `trackables` is flat (no `parentId`,
no `levels[]`), and every wheel and Explore level composes the entry key from
**one selected `trackable.id`** — so levels hidden in an id suffix are invisible
to every colour. **The single blocking absence is a records-meaningful grouping
field on `trackables`**; the existing `group`/`groupName` is display-only.

*(This question is analysed in full, with the three curriculum options, in the
separate package at `docs/external-architecture-review/`.)*
