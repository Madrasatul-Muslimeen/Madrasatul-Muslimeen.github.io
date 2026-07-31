# Phase 1 — Identity & access — Status

Last updated: 2026-07-31
Read alongside `CLAUDE.md` and the approved plan this phase is following
(9 stages: F-009 through F-017).

---

## Position

**Stages 1-3 built and owner-verified.** The owner signed in, created a
real tenant (family account, name "Ahsan") through `app/onboarding.html`,
and it succeeded after two rounds of bug-fixing on the Layer-0 security
rules and the identity module (both fixed and committed — see git log for
`Fix Stage 3` commits).

Two real bugs found and fixed during Stage 3, both now committed:
1. The `memberships` collection's create rule had no way to bootstrap a
   brand-new tenant's very first owner role — `canAdminIdentity()` depends
   on `tenantMemberUids`, which doesn't exist yet at that point.
2. `findUnusedPersonId()` tried to read-check whether a candidate personId
   already existed before creating the account — but nobody is allowed to
   read a record that isn't theirs yet, so this read was always denied.
   Removed the pre-check; a fresh random id is used directly, with a
   collision-retry loop as the safety net (~1-in-9,000,000 odds).

`firebase.json` + `.firebaserc` added — the Firebase CLI is already
authenticated as `smahk9@gmail.com` and has access to `study-monitoring`,
so rules can now be deployed directly with
`firebase deploy --only firestore:rules` instead of manual copy-paste into
the console.

## What's next

Stage 4 (F-012, owner adds people to the tenant) is next. Stages 5-9
follow in order per the approved plan — see
`C:\Users\Muhammad\.claude\plans\peaceful-finding-fountain.md` for the full
breakdown.

## Open item

Run `admin-self-check.html` once more when convenient — the
"tenants (new-generation, representative probe)" row should now say Pass
instead of Blocked, confirming the tenant that was just created is
reachable under the new rules. Not urgent; Stage 9 will add proper Layer-0
probes to this screen anyway.
