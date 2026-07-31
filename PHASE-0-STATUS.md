# Phase 0 — Status

Last updated: 30 July 2026
Read alongside `CLAUDE.md`.

---

## Position

**Phase 0 built and owner-verified.** Seven of the eight deliverables
(F-001, F-002, F-004, F-005, F-006, F-007, F-008) are built, live in the
new `app/` folder, and confirmed working by the owner's own click-through of
the F-008 self-check screen — signed in as themselves, in an Incognito
window, against the real production database. All 14 checks passed or
blocked exactly as expected; nothing failed.

**F-003** (security rules for the new-generation collections) is the one
deliverable still deferred — deliberately. Nothing writes real data into
those collections yet, so there is nothing concrete to write permission
rules against. Revisit at the start of Phase 1, when tenant data starts
being written for real.

The production `index.html` has not been touched anywhere in this process —
everything new lives in `app/`, alongside it.

**O1 partially resolved:** `monitorWeeks` is confirmed reachable and
writable under the existing rules (self-check test write succeeded).
`juzSummariesPage` likewise. Both were previously "unconfirmed, do not
assume fixed" — now confirmed reachable. Whether they hold real data yet is
still separate from whether they're reachable.

Work completed this session was diagnosis plus two live fixes to the fallback
app — both applied through the Firebase console, no code changes.

---

## RESOLVED — Bug B1

**Symptom:** `rukuSummaries`, `juzSummaries`, `juzSummariesPage` and
`monitorWeeks` never reached Firestore. `studyProgress` showed no change either.
Survived the S3 rules fix, which made it look like a code fault.

**Root cause: a single capital letter.** The admin's user document
(`users/3ff4BoGFLeV6FYBoTiJkMr7sFuV2`) had its field spelled **`PersonId`**.
The app reads **`personId`**. It therefore got `undefined`, and line 3909 set
the active person to `undefined`.

Consequences, both traced in code:

1. `mmSavePersonProgress(undefined, …)` → `.doc(undefined)` → Firestore
   **invents a random document name**. Hundreds of orphan documents in
   `studyProgress` (`06s48UbEUo3nJ5NNEfJB` and similar), each holding empty
   scaffolding (`status: 0`, `date: null`, `notes: ""`). Every save went to a
   fresh address; nothing was ever read back.
2. The three summary saves at lines 4657–4665 are guarded by
   `state.rukuSummary[state.activePersonId]` and friends. With an undefined
   key these are falsy, so **the saves never ran at all** — which is why the
   collections did not exist rather than containing junk.

**Fix applied (console only, additive):**
- Added `personId: "person_admin1"` to the admin user document.
  `PersonId` left in place, untouched.
- Added `email: "smahk9@gmail.com"` to the same document.
- Created `people/person_admin1` with `name`, `role`, `ownerUid`, `teacherId`.

**Confirmed:** `rukuSummaries` and `juzSummaries` appeared immediately, and
`rukuSummaries/person_admin1` exists. Correct ID → correct document name.

**Consequence for the Architecture:** the note recording B1 as a Phase 5
save-logic trace is now obsolete. It was a data fault, not a code fault. The
code is sound; it was fed an empty person ID.

---

## RESOLVED — Security S4, S5, S6 (+ S7, S8)

Published 30 July 2026. Full annotated file: `firestore.rules`.

| ID | Was | Now |
|---|---|---|
| S4 | `allow read, delete: if isTeacher();` on `invites` — unconditional. Any teacher could read and delete every invite platform-wide | Read scoped to `invitedBy == myUid()`. No teacher delete |
| S5 | `people` create checked `ownerUid` but not `teacherId` — anyone could file a person under any teacher | `teacherId` must be the caller, or match the invite |
| S6 | `request.auth.token.email` keeps Google's capitalisation; invite doc ids are lowercased by the client. Capital-letter addresses matched nothing — which also failed the `users` **create** rule, blocking registration entirely | `myEmailLower()` with a type guard. The earlier `.lower()` failure was a missing null guard, not a Firestore limitation |
| S7 | `people` and `users` allowed client deletes | Removed (I4). Only remaining delete is line 9628, an invite consuming itself. Console deletes unaffected |
| S8 | Five progress collections dereferenced `get(people/{personId}).data` directly — a missing document **errors** rather than returning false, surfacing as an unexplained denial | `exists()`-guarded helpers. Same security, clean failure |

S1, S2, S3 carried forward unchanged from the 29 July version.

---

## Firestore reality — as observed, not assumed

**Collections present:** `appSettings`, `invites`, `juzSummaries`, `people`,
`rooms`, `rukuSummaries`, `studyProgress`, `teachers`, `userPrefs`, `users`.

**Still absent:** `juzSummariesPage`, `monitorWeeks`. Probably untouched during
testing rather than broken — **unconfirmed, do not assume fixed.**

**Accounts:** 7 logins in Authentication, 6 role records in Firestore `users`.

| Account | Role | Note |
|---|---|---|
| `smahk9@gmail.com` | admin | `3ff4BoGF…` — repaired this session |
| `abu.aabdullah.ahsan@gmail.com` | teacher | `xIXYKayz…` — owner's teaching account |
| `mydeenstudy@gmail.com` | **none** | `HT4skSmvs…` — can sign in, has no role record. Will hit an error screen. Origin unknown |
| `shadia.ashrafi…` | — | Disabled in Authentication |

**All current Firestore data is demo/test.** The owner confirmed it can be
recreated. This materially lightens Phase 5 migration.

**But:** the four-person roster (`p1`–`p4`) exists **only in browser
localStorage**, seeded from `DEFAULT_PEOPLE` and `loadSharedPeople`. It has
never been in Firestore. A cache clear loses it with no recovery. Flagged to
the owner; no export built yet.

---

## Open items

| # | Item | Priority |
|---|---|---|
| O1 | `juzSummariesPage` and `monitorWeeks` still absent — confirm whether fixed or separately broken | Medium |
| O2 | `rooms` collection: **zero mentions** in all 10,146 lines of `index.html`, no security rule, origin unknown. Left deliberately locked | Low — investigate before Phase 0 build |
| O3 | `mydeenstudy@gmail.com` has a login but no role record. Phase 1's invite flow must handle a half-finished signup rather than stranding the account | Medium — Phase 1 |
| O4 | Several hundred orphan `studyProgress` documents with random names, holding empty scaffolding. Nothing reads them | Low — parked |
| O5 | `mmSavePersonProfile` (line 10015) is **defined but never called**. Dead code — and the reason `people/` records only ever existed for invite-accepted users | Low — do not carry into the new build |
| O6 | Subject Catalogue v3 not yet approved. Blocks Phase 2, not Phase 0 | Phase 2 gate |
| O7 | Which panels each of the 30 Approaches needs is undefined. Blocks Phase 4 | Phase 4 gate |
| O8 | I4 ("never deleted") versus a parent's right to erasure — unresolved in the Architecture. D6 defers it: no client delete at all | Deferred |

---

## Phase 0 deliverables — built, files in `app/`

| ID | Deliverable | Status |
|---|---|---|
| F-001 | Firebase bootstrap — modular SDK, auth and Firestore loaded in parallel, persistent cache | Built — `app/js/firebase-init.js` |
| F-002 | Collection map — every collection name as a constant in one place; no bare strings elsewhere | Built — `app/js/collections.js` |
| F-003 | Merged security rules covering both generations | **Deferred by design** — see below |
| F-004 | Document envelope — stamps `schemaVersion`, `createdAt`, `updatedAt`, `createdBy` on every write (I17). Nothing writes except through it | Built — `app/js/envelope.js` |
| F-005 | Language-key helpers — read with `bn` → `en` → key fallback; always write an object (I11) | Built — `app/js/lang.js` |
| F-006 | Feature registry — F-001…F-175 as bundled data, each with phase and `built \| planned`. The About screen reads this same list | Built — `app/js/feature-registry.js`. F-001–F-008 named individually; F-009–F-175 reserved at phase level only (the Architecture doc doesn't specify finer detail yet) |
| F-007 | Write-failure surface — every failed write reaches the user in plain language plus a session error buffer (I15) | Built — `app/js/errors.js` |
| F-008 | Admin self-check screen — one tap: collections reachable, test write to each, offline queue empty, no silent failures | Built and **owner-verified** — `app/admin-self-check.html` + `app/js/self-check.js` |

Also added, outside the F-numbered list: `app/index.html` (a small F-001
connection-test page), `serve.js` and `Start Local Test Server.bat` (a local
web address is required for Google sign-in to work at all — a plain
double-clicked file is refused).

**Deliberate deviation from the original plan:** the rules file published today
covers the **live generation only**. Rules for the new-generation collections
arrive with F-003, when those collections actually exist. Writing permissions
for a schema not yet built would have been guessing, and the smaller change was
easier to verify.

**Load-speed accounting for Phase 0:** SDK load is parallelised, which is faster
than today's three serial loads. Persistent cache init is single-digit
milliseconds and removes the network wait. Net effect: neutral to slightly
faster. Nothing else joins the startup path without flagging it first.

---

## Next actions

1. ~~Confirm the published rules caused no regression.~~ Done — self-check
   confirms admin read/write across every rule-guarded collection.
2. ~~Resolve O1.~~ Done for reachability — `juzSummariesPage` and
   `monitorWeeks` both confirmed reachable and writable.
3. ~~Investigate O2 (`rooms`).~~ Confirmed still correctly locked; origin
   still unknown, still deliberately left alone.
4. ~~Begin Phase 0 — F-001 first, F-008 early.~~ Done, owner-verified.
5. **Decide:** build F-003 now anyway (rules for collections nothing yet
   writes to), or leave it deferred and move into Phase 1 (Identity &
   access), which is what will actually start writing real tenant data.
