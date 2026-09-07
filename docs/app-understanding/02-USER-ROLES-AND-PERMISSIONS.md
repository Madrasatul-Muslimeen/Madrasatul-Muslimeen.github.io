# 02 — User Roles and Permissions

QuranRevival v08.02 · from `firestore.rules`, `session-context.js`,
`records.js`, `people.js`, `nav.js`

---

## 0. The identity model in one picture

```
Google account (uid)
      │
      │  tenantPeople/{personId}.authUid
      ▼
Person (personId)  ──────────── may have NO login at all (a managed child)
      │
      │  one document per role held
      ▼
memberships/{tenantId}__{personId}__{role}      ← existence IS the assertion
      │
      │  denormalised for the security rules (rules cannot run queries)
      ▼
tenantMemberUids/{…}  { tenantId, uid, personId, roles: [...] }
```

**Three identities that must not be conflated:**

| Identity | What it is | Where |
|---|---|---|
| `uid` | a Google login | Firebase Auth; `createdBy` on every document |
| `personId` | the *subject* of records — who the progress belongs to | document ids, `records.personId` |
| `tenantId` | the isolation boundary | prefix of every document id |

One login may act for several people (a guardian recording for children), which
is why `claimedByPersonId` is a **separate field** from the record's own
`personId`.

---

## 1. The six roles

```js
// app/js/records.js:90 — and mirrored in app/js/people.js:24
const MEMBERSHIP_ROLES = ["owner", "prime", "teacher", "guardian", "student", "self"];
```

Plus one that is **not** a membership: **`platformAdmin`**, a flag on the user
document spanning every tenant (invariant I10: it cannot be self-granted).

### owner
- **Purpose.** Runs the tenant. Created by `createTenantWithOwner()` (`identity.js:47`).
- **Permissions.** Everything within the tenant: `canAdminIdentity()`, `canAdminCatalogue()`, `canRecordFor()` for anyone.
- **Screens.** All, including the owner/prime-only ones: Classes, Curriculum, Taglines, and the Admin group (People, Catalogue).
- **Creates.** People, invites, classes, course offers, curriculum, resources, homework, catalogue content, Approach edits.
- **Approves.** Anyone's claims, tenant-wide.
- **Own study.** **Self-confirmed** — nothing stands over them (`records.js:124`).
- **Note.** `owner` is **never offered as a checkbox** on either the Add-person or Edit-person form (`people.js:20`, `EDITABLE_ROLES`).

### prime
- **Purpose.** A second administrator; "confirm anyone".
- **Permissions.** Effectively identical to owner in the rules — every helper tests `isOwnerIn(t) || isPrimeIn(t)`. **Could not confirm from code** any rules-level power an owner has that a prime does not; the difference appears to be intent and provenance, not enforcement.
- **Own study.** Self-confirmed.

### teacher
- **Purpose.** Teaches specific students and confirms their progress.
- **Permissions.** `canRecordFor()` succeeds **only** via `isCoEnrolledTeacherOf(tenantId, personId)` — a flat `exists()` on the denormalised `teacherStudentLinks` mirror, proving a shared class or course offer.
- **Screens.** Modules, Records, Monitor, Homework, Course Offers. **Not** Classes/Curriculum/Taglines/Admin.
- **Approves.** Claims of co-enrolled students only.
- **Own study.** Self-confirmed.
- **Documented gap.** Scope is **by student, not by subject**. A co-enrolled teacher has authority over that student across *every* subject, not only those on the enrolment's `subjectIds[]`. Recorded in the project's brief as an open question.
- **Second documented gap.** Homework/assignments is still tenant-wide-ish for teachers, narrowed by `isActiveTeacherInContext()` rather than per-student — see `isAssignmentCreator()`'s own comment in `firestore.rules`.

### guardian
- **Purpose.** A parent. Manages and confirms for their own children.
- **Permissions.** `isGuardianOf(tenantId, childPersonId)`; roster scoped to `p.id === myPersonId || p.managedByPersonId === myPersonId` (`session-context.js:160`).
- **Approves.** Their own children's claims.
- **Own study.** **Self-confirmed** — "a guardian studying, not as someone else's declared student, stands at the same level" (`records.js` comment).

### student
- **Purpose.** Learns; claims progress.
- **Permissions.** `isSelfPerson(personId)` only. Roster scoped to themselves alone.
- **Own study.** **Needs confirmation** — the only role that always does.
- **UI.** While a "View as Student" preview is active, confirm/return controls are not rendered at all (`app/records.html:332`, `canConfirm = viewAsRole !== "student"`). That is presentation; the rules are the enforcement.

### self
- **Purpose.** An independent adult learner with no guardian.
- **Own study.** Self-confirmed — *unless* `tenantPeople.managedByPersonId` is set, which forces confirmation regardless of role.

### platformAdmin (not a membership)
- Spans every tenant; required to write `modules/{moduleId}` (Layer 1 is platform-wide).
- Granted once by hand to the owner's own account (decision D14), deliberately outside any app flow, because I10 forbids self-granting.

---

## 2. Permission matrix

| Capability | owner | prime | teacher | guardian | student | self |
|---|---|---|---|---|---|---|
| Read own records | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Read others' records | all | all | co-enrolled only | own children | ✘ | ✘ |
| Claim for self | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Claim for another | all | all | co-enrolled | own children | ✘ | ✘ |
| **Confirm / return** | all | all | co-enrolled | own children | ✘ | ✘ |
| Own claims need approval | ✘ | ✘ | ✘ | ✘ | **✔** | ✘* |
| Add/edit people, invites | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Edit catalogue / Approaches | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Classes, Curriculum, Taglines | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Course Offers, Homework, Records, Monitor | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Backup | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| "View as" preview | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Write `modules` | platformAdmin only | | | | | |

\* unless `managedByPersonId` is set.

**Backup is deliberately not owner-only**, unlike Taglines beside it: it exports
exactly what the signed-in account may already read, so a guardian backing up
their children's notes reads nothing new.

---

## 3. Can one person hold multiple roles? — **Yes**

**Structurally supported and actively used.** Three independent confirmations
from the code:

**(a) One document per role.** `memberships/{tenantId}__{personId}__{role}` —
a person holding both `owner` and `guardian` simply has two documents. There is
no uniqueness constraint and no "primary role" field.

**(b) `roles` is an array**, carried on the `tenantMemberUids` mirror and read
straight into the session context:

```js
// app/js/session-context.js — getMyMemberships()
const memberships = snap.docs.map((d) => d.data()); // { tenantId, uid, personId, roles }
```

**(c) Every consumer tests membership, never equality.** Throughout the app the
pattern is `roles.includes("owner") || roles.includes("prime")` — never
`role === "owner"`. `getRosterRoles()` (`people.js:41`) fires one `getDoc()` per
possible role per person and returns **an array of every active role**.

### How the three named combinations behave

| Combination | Behaviour in the current code |
|---|---|
| **Owner + Student** | Works. But **owner wins for confirmation**: `computeConfirmationRequired()` returns `false` at the owner check *before* it ever reaches the student check. So an owner who is also a student is **self-confirmed** — their claims never wait for review. |
| **Owner + Guardian** | Works cleanly, and is the expected real-world shape for this project's actual owner. Owner grants tenant-wide admin; guardian grants `isGuardianOf()` for their own children. The two are additive with no conflict. |
| **Guardian + Teacher** | Works. `canRecordFor()` is a disjunction, so authority is the **union**: their own children *plus* co-enrolled students. |

**The general rule, stated exactly:** permissions are a **union** across roles
(every rules helper is `||`-joined), **except** for
`computeConfirmationRequired()`, which is an **ordered cascade** and stops at the
first match:

```js
// app/js/records.js:124 — order is significant
if (subjectOverride === true)  return true;
if (subjectOverride === false) return false;
if (roles.includes("owner") || roles.includes("prime")) return false;
if (roles.includes("teacher") || roles.includes("guardian")) return false;
if (await personIsManaged(db, personId)) return true;
if (roles.includes("student")) return true;
return false;
```

**Consequence worth flagging:** privilege is checked before studenthood, so
**any administrative or teaching role silently exempts a person from needing
approval**, even if they also hold `student`. That is a deliberate reading of
"a teacher's own study is self-confirmed" — but it means "Owner + Student"
cannot be used to make an owner's own claims reviewable.

**`managedByPersonId` is the one signal that overrides a role**, and it sits on
`tenantPeople`, not on memberships. A managed person needs confirmation whatever
roles they hold — except owner/prime/teacher/guardian, which return earlier.

---

## 4. "View as" — role preview

- **Who.** `CAN_VIEW_AS = new Set(["owner", "prime", "platformAdmin"])` (`session-context.js:123`).
- **What.** `effectiveRoles(realRoles, viewAsRole)` returns **`[viewAsRole]` alone** — a *collapse*, never a union: "View as only ever narrows what a screen displays, on top of permissions the viewer already, genuinely has."
- **Where stored.** In the active context, persisted in **localStorage**, so it survives reloads and can sit forgotten on a device for weeks.
- **Known trap** (recorded in the project's own standing lessons): `canAdminCatalogueClientSide()` is false while a preview is on, so a stale preview makes admin controls appear "missing". Check for one before hunting a layout bug.
- **Honest limitation, recorded in `nav.js`:** a teacher preview runs on top of the owner's own real access, so it **cannot prove** the teacher restriction actually holds.

---

## 5. Authentication architecture

- **Provider.** Google sign-in only — `GoogleAuthProvider` + `signInWithPopup` (`app/quranrevival.html:3691`). **No email/password, no anonymous auth.**
- **SDK.** Firebase **modular (ESM) v10.12.2**, loaded straight from Google's CDN — no npm, no bundler (decision D4).
- **Session.** Firebase's own persistence, plus `persistentLocalCache` with `persistentMultipleTabManager` (decision D5) so the app paints from local data with no network wait.
- **Per page.** Each page runs `onAuthStateChanged` → `bootstrapContext(db, uid, defaultTenantId)` → picks a tenant/role context → renders. There is **no router and no shared shell**: every page bootstraps itself.
- **Invites.** `invites.js` + `accept-invite.html`; links carry an opaque token from `inviteTokens` (decision D9) so an email address is never in a URL.

---

## 6. Authorisation architecture

**Two layers, and only one of them is real security.**

**(a) Firestore security rules — `firestore.rules`, 1,122 lines.** The only
server-side authority. The central gate:

```
function canRecordFor(tenantId, personId) {
  return canAdminIdentity(tenantId)
      || (isTeacherIn(tenantId) && isCoEnrolledTeacherOf(tenantId, personId))
      || isGuardianOf(tenantId, personId) || isSelfPerson(personId);
}
```

**(b) Client-side gating** — `renderNavBar()`, `canConfirm`, `scopedRoster()`.
This is presentation only.

### Four properties a new architect must know

1. **The rules do not distinguish claiming from confirming.** `canRecordFor()`
   is the same gate for both, so anyone who may write a record at all may set
   `confirmedStatus`. **The claim/confirm separation is client-side JavaScript
   only.**
2. **The rules never inspect `entries`.** They check only `tenantId` and
   `personId`. New unit keys, trackable ids and entry fields therefore need
   **no rules change**.
3. **Firestore rules can `get()`/`exists()` a fixed path but can NEVER run a
   query.** This single constraint explains two collections that exist purely to
   serve the rules — `tenantMemberUids` (uid→role) and `teacherStudentLinks`
   (teacher↔student). Any new rules-level check needs the same denormalised
   mirror.
4. **There is no delete rule anywhere** (I4 / D6).

### Two operational limits worth carrying forward

- **Rules `get()` budget.** Firestore allows 20 `get()`/`exists()` calls while evaluating rules for a batched write (10 for a single-document request), **per document in the batch**. Seeding all 71 catalogue rows in one batch was denied with a bare `permission-denied`; the fix in the code is `SEED_CHUNK_SIZE = 5` (`catalogue.js:127`).
- **Deterministic gets, never queries.** `getPersonRoles()` fires six parallel `getDoc()`s rather than one `where()` query, precisely because a rule cannot prove a list request safe.

---

## 7. The Study Mode handover lock (F-016)

`app/js/study-lock.js` — `acquireStudyLock()`, `releaseStudyLock()`,
`canSwitchTo()`.

Decision **D10** is explicit and binding: the lock engages **only** for an
explicit "hand this device to a child to study independently" action. A signed-in
owner or teacher picking people from a dropdown to log progress in turn is the
normal fast workflow and **must never** touch the lock, however many people are
recorded in sequence.
