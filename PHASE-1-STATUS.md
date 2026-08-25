# Phase 1 — Identity & access — Status

Last updated: 2026-07-31
Read alongside `CLAUDE.md`.

---

## Position

**Phase 1 complete — all 9 stages built and owner-verified.** A real
account was created, a second person invited and accepted, the tenant/
role switcher and View as control work, the Study Mode handover lock
correctly blocks switching to a different child mid-session, and the
self-check screen now checks the real Layer-0 data instead of a synthetic
probe.

`app/` now has, beyond Phase 0's files: `onboarding.html`, `people.html`,
`accept-invite.html`, and `js/identity.js`, `js/people.js`, `js/invites.js`,
`js/session-context.js`, `js/study-lock.js`. `firestore.rules` covers both
generations in one file (F-003 closed out here, not in Phase 0). Rules are
now deployed directly via `firebase deploy --only firestore:rules`
(`firebase.json` + `.firebaserc` added) rather than manual console
copy-paste.

## Real bugs found and fixed along the way

Every one of these was caught by actually running the feature against
production, not by review — exactly the point of building and verifying
one stage at a time. All fixed and committed; see git log for details.

1. **Memberships bootstrap.** The very first owner-role row a new tenant
   ever gets couldn't be created — `canAdminIdentity()` depends on
   `tenantMemberUids`, which doesn't exist yet at that point. Fixed with a
   dedicated bootstrap rule branch, restricted to owner/self roles only.
2. **Unauthorized pre-check read.** `findUnusedPersonId()` tried to check
   whether a candidate personId already existed before creating the
   account — but nobody may read a record that isn't theirs yet, so the
   check was always denied. Removed; a fresh random id is used directly,
   with a collision-retry loop (~1-in-9,000,000 odds) as the safety net.
3. **inviteTokens privacy leak.** `allow read: if true` grants both `get`
   and `list` — meaning anyone could enumerate every tenant's pending
   invite emails, not just look up a token they already hold. Caught and
   fixed before real invitee data was exposed to this. Split into
   `allow get: if true` (fine — the token itself is the credential) and
   `allow list` scoped to that tenant's own admins.
4. **Invite preview hung before sign-in.** `accept-invite.html` tried to
   read the full invite (tenant name, role) before the visitor had signed
   in, but that read requires a signed-in, matching email — neither true
   yet. Split into a pre-sign-in peek (token → email only) and a
   post-sign-in full resolve; added one new tenants-read rule branch so a
   pending invitee can see the tenant's name before joining.
5. **Lost invite link, unrecoverable by design flaw.** The link token was
   only ever cached in-memory for one browser session. Fixed by letting
   tenant admins look up any of their own tenant's still-pending invite
   tokens on demand, any time.
6. **tenantMemberUids list query denied unconditionally.** Firestore
   requires a *list* request's rule to be provable purely from the query's
   own filters — it will not reason about how a document id is
   constructed, even when that construction is always correct. Split
   `allow read` into `allow get` (unchanged) and a new `allow list` that
   mirrors the query's own filter directly.
7. **Study Mode UI hid its own controls.** The dropdown and "Start
   studying" button were disabled/hidden while a lock was held, which
   meant there was no way to even attempt (and see refused) a switch to a
   different child. The lock logic itself was correct throughout; only the
   button wiring was wrong.

## Next

Ready to start Phase 2 (Catalogue) whenever you'd like — or pause here.
