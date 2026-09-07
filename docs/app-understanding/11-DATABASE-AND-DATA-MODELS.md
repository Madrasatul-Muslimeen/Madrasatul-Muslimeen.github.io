# 11 — Database and Data Models

QuranRevival v08.02 · **Firestore only** — there is no other database

All examples are anonymised (tenant `t1`, people `p1`/`p2`). No credentials
appear anywhere in this package.

---

## 0. Two generations coexist, on purpose

`app/js/collections.js` (79 lines) is the single source of every collection
name. **Nothing in this codebase types a collection name as a bare string** —
that is the whole point of the file.

| Map | What | Rule |
|---|---|---|
| `LEGACY` | what the pre-cutover single-file app reads and writes | untouched |
| `TENANT` | the current schema | everything below |

Both live in **one Firebase project** (`study-monitoring`, decision D1) so users
and history are shared, never orphaned. The current collections are named
`tenantPeople` / `tenantInvites` rather than `people` / `invites` precisely so
the two generations can never collide (decision D2).

**There are no subcollections in active use.** One is declared —
`threads/{threadId}/messages/{messageId}` — and messaging is not built.

---

## 1. Complete collection map

### Layer 0 — identity

| Collection | Document ID | Purpose | Used? |
|---|---|---|---|
| `tenants` | `{tenantId}` | the household/school; **also owns `approachSections` since v08.02** | ✔ |
| `tenantPeople` | `{personId}` | a person: name, `authUid`, `managedByPersonId`, status | ✔ |
| `memberships` | `{tenantId}__{personId}__{role}` | **existence IS the role assertion** | ✔ |
| `userIndex` | `{uid}` | uid → tenants + default tenant | ✔ |
| `tenantInvites` | `{tenantId}__{inviteId}` | invitations with quota | ✔ |
| `tenantMemberUids` | uid-keyed | **rules-support mirror** (D9) — never in any UI | ✔ |
| `inviteTokens` | opaque token | so an invite link never carries an email (D9) | ✔ |

### Layer 1 — catalogue and organisation

| Collection | Document ID | Purpose | Used? |
|---|---|---|---|
| `modules` | `{moduleId}` | **platform-wide**, 10 modules; `isPlatformAdmin()` to write | ✔ |
| `subjectTemplates` | `{subjectId}` | platform master subject list | ✔ |
| `subjects` | `{tenantId}__{subjectId}` | the tenant's tree; `parentId`, `ancestorIds[]`, `confirmationRequired` | ✔ |
| `trackables` | `{tenantId}__{trackableId}` | **the 30 Approaches + 9 module trackables** | ✔ |
| `ladders` / `levels` | `{tenantId}__{id}` | **grade** ladders (curriculum), not study levels | ✔ |
| `personLevels` | `{tenantId}__{…}` | an awarded grade | ✔ (`grades.js`) |
| `classes` | `{tenantId}__{classId}` | a class | ✔ |
| `courseOffers` | `{tenantId}__{offerId}` | a lighter enrolment vehicle | ✔ |
| `enrollments` | `{tenantId}__{…}` | who studies with whom | ✔ |
| `teacherStudentLinks` | flat, deterministic | **rules-support mirror** — never in any UI | ✔ |
| `curriculumUnits` / `curriculumPlan` | `{tenantId}__{id}` | content and schedule, **separate** (I8) | ✔ |
| `resources` | `{tenantId}__{resourceId}` | link/text attached to subjects and units | ✔ |
| `ayahCollections` | `{tenantId}` | **one doc per tenant** — QCR named cross-surah collections | ✔ |
| `asmaCollections` | `{tenantId}` | **one doc per tenant** — Names groups + tenant overrides | ✔ |

### Layer 2 — tracking core

| Collection | Document ID | Purpose | Used? |
|---|---|---|---|
| **`records`** | `{tenantId}__{personId}__{chunkKey}` | **all progress** | ✔ |
| `activity` | `{tenantId}__{personId}__{weekKey}` | append-only audit, **one doc per week** | ✔ |
| `bookmarks` | `{tenantId}__{personId}` | `resume{}` + `saved[]` | ✔ |
| `ayahNotes` | `{tenantId}__{personId}` | rich-text notes keyed by unitKey | ✔ |
| `domains` | `{tenantId}__{domainId}` | tag registry behind `entries.domainIds[]` (D12) | ✔ |

### Layer 2.5 — communication

| Collection | Used? |
|---|---|
| `threads` | **✘ reserved name only** — no reader, no writer |
| `messages` (subcollection) | **✘ reserved name only** |
| `teachingNotes` | ✔ — written and read by `app/js/homework.js:251` |

**Verified by grep:** `THREADS` and `MESSAGES` appear **only** in
`collections.js`. Messaging is deliberately deferred, pending a real second
teacher-only account to verify its safeguarding rules against.

### Layer 3 — homework

| Collection | Document ID | Used? |
|---|---|---|
| `assignments` | `{tenantId}__{assignmentId}` | ✔ |
| `submissions` | `{tenantId}__{…}` | ✔ |

**Not present at all**, deliberately: Finance, Operations, medical records,
facilities. The collections file says so explicitly — there are no names to
reserve for them yet.

---

## 2. Major document schemas

### `records` — the central collection

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
    "surah:2::approach_02":  { "…": "…" },
    "juz:30::approach_07":   { "…": "…" }
  },
  "schemaVersion": 1, "createdAt": "…", "updatedAt": "…", "createdBy": "«uid»"
}
```

**Chunking** (`records.js:53`):

| Unit types | `chunkKey` | Documents per person |
|---|---|---|
| `ayah`, `range`, `surah`, `ruku` | `surah_{n}` | up to **114** |
| `juz`, `hizb`, `page`, `rub`, `manzil` | `subject_quran` | **1** |
| non-Quran (`topic`, `name`, `hadith`) | `subject_{subjectId}` | 1 each |

### `trackables` — an Approach

```json
{
  "tenantId": "t1", "moduleId": "quranrevival", "subjectId": "quran",
  "group": 1,
  "groupName": { "en": "Building Foundation / Learning Tools", "bn": "…" },
  "name": { "en": "Reading — Word-by-Word Meaning", "bn": "শব্দে শব্দে অর্থসহ পাঠ" },
  "guide": { "what": {"en":"…"}, "how": {"en":"…"}, "measure": {"en":"…"} },
  "panels": ["text", "wordByWord"],
  "order": 4, "status": "active",
  "sourceTemplateId": "approach_04", "edited": false
}
```

`edited: true` freezes a tenant's copy against future platform name changes
(`syncUnneditedTrackableNames()`). **`reorderTrackables()` and
`saveApproachSections()` deliberately do NOT set it** — reordering or renaming a
section is not the tenant claiming authorship of an Approach's wording, and
stamping the flag would cut that tenant off from future translation fixes.

### `tenants` — including the v08.02 addition

```json
{
  "name": { "en": "…", "bn": "…" },
  "weekStartsOn": 6,
  "approachSections": [
    { "n": 1, "name": { "en": "Building Foundation / Learning Tools", "bn": "…" } },
    { "n": 2, "name": { "en": "Engagement / Attachment", "bn": "…" } }
  ],
  "taglines": [ "…" ]
}
```

`approachSections` is **additive** — absent on a tenant that has never edited
sections, in which case `sectionsFromTenantDoc()` falls back to the platform
defaults. It was put here rather than in a new collection because a collection
the deployed rules have never seen would be a 403 for the owner (this sandbox
has no Firebase CLI).

### `tenantPeople`, `memberships`, `activity`, `bookmarks`

```json
// tenantPeople/{personId}
{ "tenantId": "t1", "name": { "en": "…", "bn": "…" },
  "authUid": "«uid»",          // null for a managed child with no login
  "managedByPersonId": "p2",   // set ⇒ claims need confirmation
  "isMinor": true, "timezone": "…", "status": "active" }

// memberships/{tenantId}__{personId}__{role}   — existence IS the assertion
{ "tenantId": "t1", "personId": "p1", "role": "student", "status": "active" }

// activity/{tenantId}__{personId}__{weekKey}   — APPEND-ONLY (arrayUnion)
{ "tenantId": "t1", "personId": "p1", "weekKey": "2026-W36",
  "entries": [ { "date": "…", "subjectId": "quran", "unitKey": "ayah:2:255",
                 "unitType": "ayah", "trackableId": "approach_04",
                 "action": "claimed", "viaProgramId": null, "viaSessionId": null } ] }

// bookmarks/{tenantId}__{personId}
{ "resume": { "quranrevival::__none__::quran": { "position": {...}, "settings": {...} } },
  "saved":  [ { "id": "…", "name": "…", "position": {...}, "removed": false } ] }
```

**`activity` carries `viaProgramId`/`viaSessionId` — invariant I3 says these
live on activity and NEVER in a record key.**

---

## 3. Relationships

```
   userIndex/{uid} ──▶ tenantPeople/{personId} ──▶ memberships/{t}__{p}__{role}
                              │                          │
                              │                          ├─▶ tenantMemberUids     (rules mirror)
                              │                          └─▶ teacherStudentLinks  (rules mirror)
                              ▼
                    records/{t}__{p}__{chunkKey}
                              │
                        entries{ "<unitKey>::<trackableId>" }
                              │                     │
              ┌───────────────┘                     └──────────────┐
              ▼                                                    ▼
   unit key — a STRING                              trackables/{t}__{trackableId}
   NO collection; boundaries                          subjectId ──▶ subjects/{t}__{subjectId}
   are static JSON files                                              confirmationRequired
                              │
                              ▼
                    activity/{t}__{p}__{weekKey}   (audit; I3)
```

> **Neither half of the entry key is a foreign key.** Nothing validates a
> `trackableId` against `trackables`, and nothing validates a `unitKey` against
> anything. This is deliberate (I4/I5: an archived Approach's records survive
> intact) and it is why new key shapes are storable with no schema change.

---

## 4. Indexes

**No `firestore.indexes.json` exists in this repository.** Every query in the
tracking path is a single-field or two-field equality, which Firestore serves
from automatic indexes.

**List-safety matters more than indexing here.** A rule can permit a query only
if it can prove from the query's own filters that every possible result
satisfies the rule:

```js
// app/js/records.js:354 — the only list query against records
query(collection(db, TENANT.RECORDS),
      where("tenantId", "==", tenantId),
      where("personId", "==", personId));
```

Both filter fields are exactly what `canRecordFor()` checks — that is why it is
allowed. **A new query shape on `records` that does not fix both fields will be
denied however the indexes are configured.**

---

## 5. Read and write patterns

### Reads

| Pattern | Where | Cost |
|---|---|---|
| One chunk by id | `getRecordsChunk()` | 1 doc |
| All chunks for a person | `listAllRecordsForPerson()` | **1 query** |
| Startup wave (Quran screen) | `loadContextData()` `:5458` | 4 in parallel (3 Firestore + 1 static) |
| Landing wheel | `refreshChunkAndWheel()` | 1 doc |
| Lazy Quran-wide chunk | `ensureQuranSubjectChunk()` | 1 doc, **first use only** |
| **Explore open** | `ensureExploreChunksLoaded()` | **≤115 docs in parallel** |
| Roles for one person | `getPersonRoles()` | **6 parallel `getDoc()`s, never a query** |
| Roles for a roster | `getRosterRoles()` | **6 × N people** |

### Writes

| Pattern | Where |
|---|---|
| Dot-path update on one entry | `claimStatus()` — never rewrites the map |
| `arrayUnion` append | `activity.js:70` |
| Batched envelope writes | `commitEnvelopeBatch()`, **chunked to 5** |
| Order-only writes | `reorderTrackables()` — writes only documents whose number changed |
| **Delete** | **none, anywhere** (I4/D6) |

**Every document carries the I17 envelope** — `schemaVersion`, `createdAt`,
`updatedAt`, `createdBy` — applied by `app/js/envelope.js`, which refuses to run
without a uid.

---

## 6. Scaling limitations — observations

**1. Firestore's 1 MiB document limit, on `records`.** One entry with its key
serialises to roughly **359 bytes**, so a chunk saturates around **2,900
entries**. Bounded today (a surah chunk holds at most `ayahCount × 30`
Approaches), but it is a hard ceiling for any finer-grained progress: per-word
claims would be ~26 MiB.

**2. `entries` is a map that only grows.** No delete path (I4), so a chunk
accumulates for the life of a person.

**3. Explore's ~115 reads per open** is by far the heaviest operation in the app.
Bounded by "surahs the 30 juz touch", i.e. all 114 — it does not grow with usage,
but it does not shrink either.

**4. `activity` uses `arrayUnion` on an array in one document per week.** A very
heavy week could approach the document limit, and **the array is rewritten in
full by Firestore on each append**. Bounded by one week's activity.

**5. `getRosterRoles()` is 6 × N reads.** For a 40-person roster that is 240
document reads to render a roles column.

**6. Nine reads per claim**, multiplied by the number of assignees.

**7. `ayahCollections` and `asmaCollections` are ONE document per tenant.** Both
grow with tenant-authored content and share the same 1 MiB ceiling.

**8. The rules `get()` budget** — 20 per batched write, per document — already
forced `SEED_CHUNK_SIZE = 5`. Any new bulk write inherits it.

**9. `listAllRecordsForPerson()` reads every chunk for a person.** Bounded by
"surahs touched + subjects touched", not by raw entry count — but it is the
basis of Monitor and of every pending-review scan.

**10. The Quran data (31 MB) is outside all of this** — static files, browser
cached, never a Firestore read.
