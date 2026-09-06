# Document 4 — Teacher Approval Architecture

QuranRevival v08.00 · read-only analysis of the live codebase

---

## 0. The headline answer

**Teacher approval does NOT gate Explore, the Mastery Wheel, or any colour
anywhere in the application.** Every visual progress surface reads
`claimedStatus` — the student's own unverified claim. `confirmedStatus` is
written, frozen and displayed, but it drives no wheel, no colour and no
roll-up. This is stated up front because it is the single most surprising fact
in this document and it changes what "approval" means for any new feature.

Evidence, and this is exhaustive — every read of a status that produces a colour:

```js
// quranrevival.html:5578  ayahStatusesForCurrentTrackable()
return { ayah: a.ayah, statusId: entry?.claimedStatus ?? "not_started" };

// quranrevival.html:5665  approachStatusesForCurrentUnit()   (the landing wheel)
statusId: entries[`${info.unitKey}::${trackable.id}`]?.claimedStatus ?? "not_started",

// quranrevival.html:6506  effectiveAyahStatus()              (Explore)
const own = entries[`${buildUnitKey.ayah(surah, ayah)}::${trackableId}`]?.claimedStatus ?? "not_started";

// quranrevival.html, buildExploreWiderSpans()                (Explore roll-up)
const statusId = entry?.claimedStatus;
```

`confirmedStatus` appears in exactly two places in the whole UI: the Records
table's own "Confirmed" column (`app/records.html:489`) and the Way modal's
Track tab. Neither is a wheel.

---

## 1. The full trace

```
  STUDENT ACTION
  ─────────────
  Note view → Approach card → pick a status → press "Claim"
  app/quranrevival.html:10938  wireApproachEmbed()  →  claimBtn click handler
        │
        ▼
  PROGRESS CLAIM
  ──────────────
  claimStatus(db, { tenantId, personId, subjectId:"quran", unitKey,
                    trackableId, statusId, notes, domainIds,
                    claimedByPersonId, claimedByUid })
  app/js/records.js:154
        │
        ├── isValidStatus(statusId)                    ← throws on an unknown status
        ├── chunkKeyFor(unitKey, subjectId)            ← which document
        ├── getSubjectConfirmationOverride(...)        ← READ subjects/{tenantId}__quran
        ├── computeConfirmationRequired(...)           ← 6 role gets + 1 tenantPeople get
        └── getDoc(records/{tenantId}__{personId}__{chunkKey})   ← previous entry
        │
        ▼
  DATABASE WRITE
  ──────────────
  records/{tenantId}__{personId}__{chunkKey}
      entries."<unitKey>::<trackableId>" = { claimedStatus, confirmState, ... }
  (dot-path update; create if the chunk does not exist)
  app/js/records.js:189
        │
        ├── if self-confirmed  → confirmState:"confirmed", confirmedStatus:=statusId  [DONE]
        └── if confirmation required → confirmState:"pending", confirmedStatus UNCHANGED (I6)
        │
        ▼
  activity/{tenantId}__{personId}__{weekKey}   ← logActivity(), append-only audit (I3)
  app/js/activity.js
        │
        ▼
  TEACHER REVIEW
  ──────────────
  app/records.html — the ONLY review surface in the application
      pick a person → pick a chunk → optional "Pending only" filter
      listPendingForPerson() / getRecordsChunk()
        │
        ▼
  APPROVAL OR REJECTION
  ─────────────────────
  confirmEntry()  app/js/records.js:201      → confirmState:"confirmed"
                                               confirmedStatus := claimedStatus  (FROZEN, I6)
                                               confirmedByPersonId, confirmedAt stamped
  returnEntry()   app/js/records.js:219      → confirmState:"returned" + returnNote
                                               confirmedStatus / confirmedAt UNTOUCHED
  bulkConfirmChunk / bulkConfirmWeek /
  bulkConfirmAllPendingForPerson / bulkConfirmClass
        │
        ▼
  FINAL PROGRESS UPDATE
  ─────────────────────
  The records entry now carries BOTH values side by side, permanently:
      claimedStatus     ← what the student says            → drives EVERY wheel and colour
      confirmedStatus   ← what the teacher froze (I6)      → drives NOTHING visual
```

---

## 2. Relevant UI components

| Component | File | Role |
|---|---|---|
| Note view → Approach card | `app/quranrevival.html:10938` `wireApproachEmbed()` | the main student claim control on the Quran screen |
| "Track this unit" overlay | `app/quranrevival.html:11924` | the floating claim card |
| Way modal — Track tab | `app/js/way-modal.js:80` `renderTrackTab()` | renders current claimed/confirmed + a status picker; **pure renderer (I2)** — the caller wires the button |
| Records screen | `app/records.html` | **the only** confirm/return UI |
| Bulk confirm buttons | `app/records.html:126`, `:134` | chunk scope and week scope |
| "Pending only" filter | `app/records.html:124` | `rows.filter(([, e]) => e.confirmState === "pending")` |

`way-modal.js` is deliberately Firebase-free (I2): it emits a `.way-claim-btn`
and the host page attaches the handler. Any new track/level UI should follow the
same split.

---

## 3. Relevant services and functions

`app/js/records.js` is the whole approval service. There is no other.

| Function | Line | Purpose |
|---|---|---|
| `getPersonRoles()` | 93 | every role a person holds, via **one `getDoc()` per possible role** — never a query |
| `personIsManaged()` | 107 | reads `tenantPeople/{personId}.managedByPersonId` |
| `getSubjectConfirmationOverride()` | 113 | `subjects/{tenantId}__{subjectId}.confirmationRequired` |
| `computeConfirmationRequired()` | 124 | the decision, below |
| `claimStatus()` | 154 | the single write path |
| `confirmEntry()` | 201 | approve |
| `returnEntry()` | 219 | reject |
| `bulkConfirmEntries()` | 238 | private helper, one chunk, one commit |
| `bulkConfirmChunk()` | 262 | surah/subject scope |
| `bulkConfirmWeek()` | 274 | week scope, across chunks, driven by the activity doc |
| `bulkConfirmAllPendingForPerson()` | 297 | person scope |
| `bulkConfirmClass()` | 322 | class scope — active `student` enrolments only |
| `listPendingForPerson()` | 372 | the review queue |

**`computeConfirmationRequired()` — who needs approval**, `records.js:124`, verbatim:

```js
export async function computeConfirmationRequired(db, tenantId, personId, subjectOverride) {
  if (subjectOverride === true) return true;
  if (subjectOverride === false) return false;

  const roles = await getPersonRoles(db, tenantId, personId);
  // Owner/prime administer the tenant; nothing stands over them here.
  if (roles.includes("owner") || roles.includes("prime")) return false;
  // "A teacher's own study is self-confirmed" -- a guardian studying (not as
  // someone else's declared student) stands at the same level.
  if (roles.includes("teacher") || roles.includes("guardian")) return false;

  if (await personIsManaged(db, personId)) return true;
  if (roles.includes("student")) return true;

  // 'self' role (or no role rows at all) with no guardian on file.
  return false;
}
```

Read plainly: **approval is computed, never configured per person.** "Does this
person have someone standing over them? Then wait. Otherwise it counts straight
away." The only configuration knob is the **per-subject** override
`subjects.confirmationRequired` (`true` / `false` / `null`), editable from
`app/catalogue.html`.

A design note the code makes explicit: this is built on **deterministic
`getDoc()`s, never a `where(...)` query**, because a Firestore rule can only
permit a list request if it can prove from the query's own filters that every
possible result satisfies the rule. `memberships`/`tenantPeople` were not built
list-safe, so each addressable document is read directly. **Cost: 6 role gets +
1 tenantPeople get + 1 subject get + 1 chunk get = 9 reads per claim.** Any new
per-level claim path inherits that cost per claim, per level.

---

## 4. Firestore documents involved

| Collection | Path | Role in this workflow |
|---|---|---|
| `records` | `{tenantId}__{personId}__{chunkKey}` | holds `claimedStatus`, `confirmedStatus`, `confirmState`, `confirmedByPersonId`, `confirmedAt`, `returnNote` |
| `activity` | `{tenantId}__{personId}__{weekKey}` | append-only audit; drives week-scope bulk confirm |
| `memberships` | `{tenantId}__{personId}__{role}` | existence = holds that role |
| `tenantPeople` | `{personId}` | `authUid`, `managedByPersonId` |
| `subjects` | `{tenantId}__{subjectId}` | `confirmationRequired` override |
| `tenantMemberUids` | uid-keyed | **rules-support mirror** (D9) so rules can check role without a query |
| `teacherStudentLinks` | denormalised | **rules-support mirror** (Phase 10) so rules can check teacher↔student co-enrolment without a query |
| `enrollments` | — | drives `bulkConfirmClass()` |

---

## 5. Cloud Functions

**There are none.** Checked: `firebase.json` and the repository contain no
`functions/` directory and no Cloud Function source. The entire approval
workflow is **client-side JavaScript plus Firestore security rules**. There is
no server-side trigger, no scheduled job, and no server-side validation beyond
the rules.

**This matters for any future coverage calculation:** there is nowhere today to
run a server-side aggregation. Anything computed must be computed in the
browser, from documents the browser has read.

---

## 6. Roles

Declared in `records.js:90`:

```js
const MEMBERSHIP_ROLES = ["owner", "prime", "teacher", "guardian", "student", "self"];
```

| Role | Own claims | Can confirm others |
|---|---|---|
| `owner` | self-confirmed | yes, tenant-wide |
| `prime` | self-confirmed | yes, tenant-wide |
| `teacher` | self-confirmed | **only co-enrolled students** |
| `guardian` | self-confirmed | **only their own children** |
| `student` | **needs confirmation** | no |
| `self` | self-confirmed (unless managed) | no |

A person **managed by a guardian** (`tenantPeople.managedByPersonId` set) needs
confirmation regardless of other roles.

A UI-only refinement: while a "View as Student" preview is active, the confirm
and return controls are not rendered at all (`app/records.html:333`,
`canConfirm = viewAsRole !== "student"`). This is presentation, not
enforcement — the rules are the enforcement.

---

## 7. Approval states

`confirmState` — exactly three values, written only by `records.js`:

| State | Set by | Meaning |
|---|---|---|
| `pending` | `claimStatus()` when confirmation is required | awaiting review |
| `confirmed` | `confirmEntry()`, bulk confirms, or `claimStatus()` when self-confirmed | approved |
| `returned` | `returnEntry()` | sent back, with an optional `returnNote` |

Translated for display by `confirmStateLabel()` (`app/js/labels.js`, re-exported
from `records.js`).

**I6 — confirmation state is frozen when marked, never recalculated.** In
practice:

- A **new claim** after a confirmation resets `confirmState` to `pending` but
  **leaves `confirmedStatus`, `confirmedAt` and `confirmedByPersonId` exactly as
  they were.** So an entry legitimately shows `claimedStatus: "mastered"` next
  to `confirmedStatus: "achieved"` — the student has moved on and the teacher
  has not caught up yet. **This is correct behaviour, not a bug**, and any new
  reader of these fields must expect it.
- A **return** changes only `confirmState` and `returnNote`. The previously
  frozen confirmation survives.
- Bulk confirms skip anything not currently `pending` (`records.js:251`):
  `if (!entry || entry.confirmState !== "pending") continue;`
- A `returned` entry offers "Confirm anyway" in the UI (`app/records.html:483`).

---

## 8. Security rules

`firestore.rules`, the records block (line 840) and the gate it uses (line 792):

```
function isSelfPerson(personId) {
  return signedIn() && exists(tenantPersonRef(personId))
      && get(tenantPersonRef(personId)).data.authUid == myUid();
}
function canRecordFor(tenantId, personId) {
  return canAdminIdentity(tenantId)
      || (isTeacherIn(tenantId) && isCoEnrolledTeacherOf(tenantId, personId))
      || isGuardianOf(tenantId, personId) || isSelfPerson(personId);
}

match /records/{recordKey} {
  allow read: if isPlatformAdmin();
  allow read: if signedIn() && !exists(/databases/$(database)/documents/records/$(recordKey));
  allow read: if canRecordFor(resource.data.tenantId, resource.data.personId);

  allow create: if canRecordFor(request.resource.data.tenantId, request.resource.data.personId);
  allow update: if canRecordFor(resource.data.tenantId, resource.data.personId);
  // No delete (I4/D6).
}
```

**Four properties the reviewer must not miss:**

1. **The rules do not distinguish claiming from confirming.** `canRecordFor` is
   the same gate for both. Anyone who may write a record at all may set
   `confirmedStatus`. **The claim/confirm separation is enforced entirely in
   client-side JavaScript.**
2. **The rules never inspect `entries`.** They check only `tenantId` and
   `personId`. Any new unit key, trackable id, or entry field is therefore
   permitted by the existing rules with **no rules change** — which is exactly
   why compound trackable ids (Document 3 §14) are storable today.
3. **Teacher scope is by STUDENT, not by SUBJECT.** `isCoEnrolledTeacherOf()`
   proves a shared class or course offer. A co-enrolled teacher gets record and
   confirm authority over that student **across every subject**, not only the
   ones on their enrolment's `subjectIds[]`. This is a known, documented open
   gap (CLAUDE.md, "second open access-control question"), not something this
   review discovered. It is directly relevant: **if an outside Arabic teacher is
   brought in for the new levels, the rules cannot today confine them to Arabic.**
4. **The second `allow read` line is deliberate**, not a hole: `claimStatus()`
   reads a chunk to see whether it exists before creating it, and for a
   first-ever claim `resource` is null. A nonexistent document has no data to
   expose.

`isCoEnrolledTeacherOf()` is a single flat `exists()` on the denormalised
`teacherStudentLinks` mirror, because **Firestore rules can `get()`/`exists()` a
fixed path but can never run a query** (D9). Any new rules-level check for the
Arabic levels faces the same constraint and will need the same denormalisation
pattern.

---

## 9. Is teacher approval required before progress affects Explore?

**No.** Restating §0 with the consequence spelled out:

| Surface | Reads |
|---|---|
| Landing Mastery Wheel | `claimedStatus` |
| Explore — Quran / Juz / Surah / Ruku' levels | `claimedStatus` (via `effectiveAyahStatus`) |
| Explore wider-unit roll-up | `claimedStatus` (via `buildExploreWiderSpans`) |
| Way modal — Breakdown, Coverage | `claimedStatus` |
| Records table | **both**, in separate columns |
| Monitor report | `claimedStatus` |

So a student's unconfirmed, or even **returned**, claim colours the wheel green
immediately and stays green. `confirmState === "returned"` has **no visual
effect anywhere except the Records table.**

**What this means for the new Arabic levels.** The brief asks that each level
have its own teacher approval. That is satisfied automatically at the data layer
(each entry key carries its own `confirmState`). But if the intent is that
approval should *gate* a coverage percentage — that an "understood word count"
should only count teacher-confirmed items — **that is a new behaviour this
application does not have anywhere today.** It would mean reading
`confirmedStatus` for the metric, which no existing surface does, and deciding
what to show for `pending` and `returned` claims. That is a design decision for
the reviewer; the code offers no precedent to follow.
