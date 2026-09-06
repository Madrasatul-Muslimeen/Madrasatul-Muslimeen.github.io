# Document 9 — Relevant Firestore Schema

QuranRevival v08.00 · only the collections relevant to Approaches, progress,
approval, Explore and Quran units

**No credentials, API keys, tokens, project identifiers or private
configuration appear in this document or anywhere in this review package.**
All examples are anonymised: tenant `t1`, people `p1`/`p2`/`p3`. `app/js/firebase-init.js`
is deliberately **excluded** from the code export because it carries the
Firebase web client configuration.

Collection names are constants in `app/js/collections.js` — nothing in this
codebase types a collection name as a bare string.

---

## 0. Two generations coexist

`app/js/collections.js` declares two maps, on purpose (D1 — one Firebase
project, shared users and history):

- **`LEGACY`** — what the pre-cutover app read and writes. Untouched.
- **`TENANT`** — the current schema. Named `tenantPeople` / `tenantInvites`
  rather than `people` / `invites` so the generations can never collide (D2).

**Everything below is `TENANT`.** The legacy collections are out of scope.

---

## 1. Identity — users, students, teachers

### `tenantPeople/{personId}`
The person record. **`personId` is the identity used everywhere in tracking.**

```json
{
  "tenantId": "t1",
  "name": { "en": "Student One", "bn": "…" },
  "authUid": "«firebase-auth-uid»",
  "managedByPersonId": "p2",
  "status": "active",
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

| Field | Meaning |
|---|---|
| `authUid` | links the person to a login. **Null for a managed child with no login** |
| `managedByPersonId` | set ⇒ this person is a managed child ⇒ their claims need confirmation |
| `name` | language-keyed (I11) |

**Four legacy `personId` shapes must all keep working** (I16, D3): `p1`…`p4`;
`p` + 13-digit timestamp; `person_` + first 8 chars of a uid; `person_admin1`.
**Any new code must treat `personId` as an opaque string.**

### `memberships/{tenantId}__{personId}__{role}`
**Existence is the assertion.** One document per role held.
Roles: `owner`, `prime`, `teacher`, `guardian`, `student`, `self`.

Read by `getPersonRoles()` (`records.js:93`) as six parallel `getDoc()`s —
never a query, because Firestore rules cannot safely permit an arbitrary list.

### `userIndex/{uid}`
uid → which tenants and person ids. One of the **three** reads allowed after
first paint (load-speed contract).

### `tenantMemberUids/{…}` — rules support (D9)
uid→role mirror. Exists so security rules can answer "does this login hold role
X in tenant Y" with a fixed-path `get()`. **Never shown in any screen.**

### `teacherStudentLinks/{…}` — rules support (Phase 10)
Denormalises "is teacher T actively co-enrolled with student S". Backs
`isCoEnrolledTeacherOf()`. **Never shown in any screen.**

> **The pattern to know: Firestore security rules can `get()`/`exists()` a fixed
> document path but can NEVER run a query.** Any new rules-level check for the
> Arabic levels will need the same denormalised-mirror treatment.

---

## 2. Approaches — `trackables/{tenantId}__{trackableId}`

Document id example: `t1__approach_04`.

```json
{
  "tenantId": "t1",
  "moduleId": "quranrevival",
  "subjectId": "quran",
  "group": 1,
  "groupName": { "en": "Building Foundation / Learning Tools", "bn": "…" },
  "name": { "en": "Reading — Word-by-Word Meaning", "bn": "শব্দে শব্দে অর্থসহ পাঠ" },
  "guide": { "what": { "en": "…" }, "how": { "en": "…" }, "measure": { "en": "…" } },
  "panels": ["text", "wordByWord"],
  "order": 4,
  "status": "active",
  "sourceTemplateId": "approach_04",
  "edited": false,
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

**Read pattern** — one query per page load, tenant-wide (`catalogue.js:300`):

```js
query(collection(db, TENANT.TRACKABLES), where("tenantId", "==", tenantId))
```
then sorted by `order`, then filtered client-side:
```js
quranTrackables = allTrackables.filter((t) => t.subjectId === "quran" && t.status !== "archived");
```

**Write patterns:** seed (admin action, chunked ≤5 docs per batch — see below),
rename, archive/restore, and platform-name sync for unedited copies. **There is
no create-trackable path in the UI** (Document 1 §9).

**No `parentId`, no `levels[]`, no `trackIds[]`** — the flatness that Document 3
§14 turns on.

---

## 3. Study progress — `records/{tenantId}__{personId}__{chunkKey}`

**The central collection.** Document ids: `t1__p1__surah_2`,
`t1__p1__subject_quran`.

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
    },
    "surah:2::approach_02": { "…": "…" },
    "ruku:2:1::approach_01": { "…": "…" }
  },
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

**Entry key: `${unitKey}::${trackableId}`.** Both halves are opaque strings that
nothing parses beyond the `::` split.

**Chunking** (`records.js:52`):

| Unit types | `chunkKey` | Docs per person |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku` | `surah_{n}` | ≤114 |
| `juz`, `hizb`, `page`, `rub`, `manzil` | `subject_quran` | 1 |
| non-Quran | `subject_{subjectId}` | 1 each |

**Read patterns:**

| Pattern | Where | Cost |
|---|---|---|
| One chunk by id | `getRecordsChunk()` | 1 doc |
| All chunks for a person | `listAllRecordsForPerson()` | **1 query**, `tenantId` + `personId` |
| Explore open | `ensureExploreChunksLoaded()` | **≤115 docs in parallel** |
| Landing wheel | `refreshChunkAndWheel()` | 1 doc (+1 first Juz/Hizb/Page use) |

**Write pattern — always a dot-path update on one entry**, never a map rewrite:

```js
updateDocument(db, TENANT.RECORDS, docId, { [`entries.${entryKey}`]: entry, tenantId, personId })
```

**No delete rule exists** (I4 / D6).

**Size limit — the binding constraint.** Firestore caps a document at **1 MiB**.
One entry with its key serialises to **~359 bytes**, so a chunk saturates around
**2,900 entries**. Document 3 §13 works through what that permits.

---

## 4. Status tracking — the value set

Six ids, `app/js/unit-keys.js:110`: `not_applicable` (off-ramp, I7),
`not_started`, `learning`, `practising`, `achieved`, `mastered`.
**Note the British spelling `practising` in the stored id.**

---

## 5. Teacher approval

Lives on the same `records` entry — `confirmState` (`pending` | `confirmed` |
`returned`), `confirmedStatus`, `confirmedByPersonId`, `confirmedAt`,
`returnNote`. **No separate approval collection, no queue collection, no Cloud
Functions.** Full workflow in Document 4.

Supporting collections:

### `subjects/{tenantId}__{subjectId}`
Carries `confirmationRequired` (`true` / `false` / `null`) — the only
configuration knob on the approval rule (D12). Also `parentId` and
`ancestorIds[]` for roll-ups (I12) — **QuranRevival's whole tree is the single
leaf `"quran"`**, so that machinery is unused here.

### `activity/{tenantId}__{personId}__{weekKey}`
Append-only audit, **one document per week** (load-speed contract). Carries
`viaProgramId` / `viaSessionId` (I3 — never in a record key). Drives week-scope
bulk confirm. **Read by id only — there is no list query for activity anywhere
in this app.**

### `enrollments`, `courseOffers`, `classes`
Drive `bulkConfirmClass()` and the teacher-scoping rules.

---

## 6. Explore

**Explore has no collections of its own.** It reads `records` and `trackables`
only. Its display preferences live in **browser localStorage** via
`app/js/prefs.js`, not Firestore.

---

## 7. Quran units

**No Firestore collection.** Unit keys are strings; boundaries are static JSON
files (Documents 2 and 7). Nothing about the Quran's structure is in the
database.

---

## 8. Relationships

```
   userIndex/{uid} ──▶ tenantPeople/{personId} ──▶ memberships/{t}__{p}__{role}
                              │                          │
                              │                          ├─▶ tenantMemberUids   (rules mirror)
                              │                          └─▶ teacherStudentLinks (rules mirror)
                              ▼
                    records/{t}__{p}__{chunkKey}
                              │
                        entries{ "<unitKey>::<trackableId>" }
                              │                     │
              ┌───────────────┘                     └──────────────┐
              ▼                                                    ▼
   unit key — a STRING                              trackables/{t}__{trackableId}
   no collection; boundaries                          subjectId ──▶ subjects/{t}__{subjectId}
   are static JSON                                                    confirmationRequired
                              │
                              ▼
                    activity/{t}__{p}__{weekKey}   (audit; I3)
```

**Neither half of the entry key is a foreign key.** Nothing validates a
`trackableId` against `trackables`, and nothing validates a `unitKey` against
anything. This is deliberate (I4/I5: an archived Approach's records survive
intact) and it is what makes new key shapes storable without schema change.

---

## 9. Indexes

**No `firestore.indexes.json` exists in this repository.** Every query in the
tracking path is either a single-field equality or a two-field equality
(`tenantId` + `personId`), which Firestore serves from automatic indexes.

**The list-safety constraint is more important than indexing here.** A rule can
permit a query only if it can prove, from the query's own filters alone, that
every possible result satisfies the rule. `listAllRecordsForPerson()` filters on
exactly the two fields `canRecordFor()` checks — that is why it is allowed. **A
new query shape on `records` that does not fix both `tenantId` and `personId`
will be denied, however the indexes are configured.**

---

## 10. Security rules relevant to this review

`firestore.rules` (1,122 lines). The gate:

```
function canRecordFor(tenantId, personId) {
  return canAdminIdentity(tenantId)
      || (isTeacherIn(tenantId) && isCoEnrolledTeacherOf(tenantId, personId))
      || isGuardianOf(tenantId, personId) || isSelfPerson(personId);
}
```

Four properties that matter for anything new:

1. **Rules never inspect `entries`.** Only `tenantId` and `personId`. **New unit
   keys, new trackable ids and new entry fields need no rules change.**
2. **Claiming and confirming are the same permission.** The separation is
   client-side JavaScript only.
3. **Teacher scope is by student, not by subject** — a known open gap. An
   outside Arabic teacher cannot today be confined to Arabic.
4. **No delete rule anywhere** (I4/D6).

---

## 11. Two operational constraints worth carrying forward

**(a) Rules `get()` budget.** Firestore allows **20** `get()`/`exists()` calls
while evaluating rules for a batched write (10 for a single-document request).
`canAdminCatalogue()`/`anyMemberOf()` each cost `exists()` + `get()`, **per
document in the batch** — so seeding all 71 catalogue rows in one batch was
denied outright with a bare `permission-denied`. The fix in the code
(`catalogue.js:127`) is `SEED_CHUNK_SIZE = 5`. **Any bulk write of new
trackables inherits this and must chunk.**

**(b) Claim cost.** One `claimStatus()` call performs **9 reads** before its
write: 6 role gets + 1 `tenantPeople` get + 1 `subjects` get + 1 chunk get.
**Per claim, per level.** Three independently-claimed levels means three times
that, unless a future design batches them.
