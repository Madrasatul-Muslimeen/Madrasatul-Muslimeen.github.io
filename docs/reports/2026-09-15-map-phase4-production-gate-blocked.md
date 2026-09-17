# MAP Phase 4 — Production Gate: HALTED AT STEP 1

**Date:** 15 September 2026
**Authority:** Owner authorisation of 2026-09-15 to deploy the tested Phase 4
Firestore Rules amendment; Master Architect Phase 4 Production Gate instruction.
**Result:** **DEPLOYMENT NOT PERFORMED. NOTHING WAS DEPLOYED, NOTHING WAS
MERGED.**
**`main`:** `65d3f997888480aedad58b6ed82fc4ec7d76bd74`, app version **08.25** —
unchanged.
**Wiring candidate:** `claude/phase4-wiring` = `c4fca4aa477a3f0429779b711544e48386bd2a3b`,
v08.26 — unmerged, as instructed.
**Production `firestore.rules`: byte-for-byte unchanged.**

**Phase 4 is NOT closed, and no closure report is produced.** The gate's own
step 10 makes the closure report conditional on all production verification
passing; none of it could run.

---

## 1. Where it stopped, and why

The Owner's authorisation removes the *permission* barrier. It does not supply
the *access*, and those are different things.

**Step 1 — "Perform the production Firestore Rules parity procedure" — cannot be
executed from this environment.** The procedure's first action is to read the
live ruleset for `study-monitoring`. Re-tested today, after the authorisation:

| Probe | Result |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_TOKEN` / any `FIREBASE_*` or `GOOGLE_*` env var | **none set** |
| `~/.config/configstore/firebase-tools.json` | present but **empty** — no tokens, no user |
| service-account / admin-SDK / ADC key files on disk | **none found** |
| `firebase --project study-monitoring firestore:databases:list` | **`Error: Failed to authenticate, have you run firebase login?`** |
| `GET https://firebaserules.googleapis.com/v1/projects/study-monitoring/releases` | **HTTP 403** |

So the live text cannot be read, and therefore cannot be compared.

**This is stricter than the stop condition the gate anticipated.** Step 2 says to
stop if parity *differs* by more than the documented trailing newline. Here
**parity cannot be established at all** — which is a superset of that condition,
not a lesser one. Publishing the prepared candidate without it would risk
silently reverting any change made in the Console since 10 September, which the
accepted package's own procedure exists to prevent.

**I did not improvise around it, and I am not requesting credentials** — the
standing instruction forbids asking for tokens or service-account secrets in
chat, and §5 below needs none.

## 2. Steps 3–9 were therefore not attempted

| Step | State |
|---|---|
| 3. Deploy the amendment | **NOT DONE** — blocked by step 1 |
| 4. Re-read production Rules and prove the block present / remainder unchanged | **NOT DONE** — cannot read them |
| 5. Merge `claude/phase4-wiring` into `main` | **DELIBERATELY NOT DONE** — see §3 |
| 6. Preserve version 08.26 | held on the branch |
| 7. Deploy via GitHub Pages, verify commit correspondence | **NOT DONE** — depends on 5 |
| 8. Six post-deployment verification checks | **NOT DONE** — depends on 3 and 5 |
| 9. Rollback on failure | not applicable; nothing was changed to roll back |
| 10. Closure report | **NOT PRODUCED** — conditional on 8 |

## 3. Why the merge was held even though step 5 reads as a separate action

The gate orders the steps deploy → verify → merge, and its own step 9 gives the
rollback order as **application first, Rules second**. Both encode the same
dependency: the app goes live *after* the Rules.

Merging now would invert it. With no rule for the subcollection, production
denies every evidence write; the accepted P4-C writer **rethrows genuine denials
by design** (I15, and ADR-008's amendment forbids making them silent). The Owner
would get a failure banner on **every āyah they marked read**, in the app they
use daily — a live regression, caused by shipping the client half of a feature
whose server half is not there.

Holding the merge is the instruction's own intent, not a deviation from it.

## 4. What WAS verified today, at the gate

Everything that does not require production access was re-checked against
today's `main`, not assumed from the earlier run.

| Check | Result |
|---|---|
| Deployment candidate still valid against today's `firestore.rules` | **YES** |
| `diff` baseline → candidate | **one hunk, `871a872,1079`** |
| lines **removed** | **0** |
| lines added | 208 |
| Removing lines 872–1079 reproduces today's `firestore.rules` | **BYTE-FOR-BYTE EXACT** |
| Evidence block byte-identical to the emulator-tested candidate | **YES** |
| Insertion point | immediately after the existing `match /activity/{activityKey}` block's closing brace, before `match /domains/…` — exactly §2 of the accepted package |
| **Full emulator suite against the EXACT deployment file** | **53 assertions, 0 failures, 0 expression-budget denials** |
| `claude/phase4-wiring` merges into `main` | **CLEAN — no conflicts** |
| Production `firestore.rules` | **unchanged** |

### A correction to my own check, recorded rather than buried

My first reconstruction check reported the candidate as **not** addition-only.
That was the check being wrong, not the file: it located the inserted region by
matching a header-comment string and sliced at the wrong index. `diff` is
authoritative and says one pure-append hunk with **zero** lines removed, and
deleting exactly lines 872–1079 reproduces `firestore.rules` byte-for-byte. The
candidate is sound; the check was not, and has been replaced by the line-range
reconstruction above.

## 5. Exactly what unblocks this — no secret needs to be shared

The accepted package's **Route A** needs no credentials given to this session.
Whoever holds Firebase Console access for `study-monitoring` performs steps 1–4:

1. Firebase Console → Firestore → **Rules**. Copy the live text.
2. Diff it against this repository's `firestore.rules` on `main` (`65d3f99`).
   The **only** expected difference is one trailing newline in the repository
   copy. **If anything else differs, stop and send that difference back** — that
   is the gate's step 2, and it still applies.
3. If parity holds: open
   `docs/governance/phase4-activity-evidence-DEPLOYMENT-candidate-2026-09-14.rules`
   and copy **lines 872–1079** — the block beginning
   `// MAP Phase 4 (P4-B/P4-C) -- ADR-008 Study Activity evidence.` and ending
   with the closing brace of `match /activity/{activityKey}/evidence/{eventId}`.
   Paste it immediately **after** the existing `match /activity/{activityKey}`
   block's closing `}` and before `match /domains/…`. **Publish.**
4. Confirm the published Rules show the evidence block and that nothing else
   moved.

Then tell me it is published, and I will do steps 5–9 without further pause:
merge `claude/phase4-wiring` into `main` at v08.26, confirm the Pages deployment
corresponds to the merged commit, run all six post-deployment checks, and either
produce the closure report or roll back in the documented order and report the
exact failure.

**Alternatively**, if authenticated access is ever present in this execution
environment, I will perform steps 1–9 end to end under the authorisation already
given, with no further approval needed.

## 6. P4-D3 Journaling — status preserved

**DEFERRED TO PHASE 5 — REQUIRED DEPENDENCY ON PERMANENT NOTE IDENTITY.**

Not deleted, not cancelled, not completed. Per the Master Architect's D3 decision
of 2026-09-15: ADR-008 is **not** amended to accommodate the temporary
one-note-per-unit `ayah-notes.js` model; no `noteId` is synthesised from
`unitKey`; Phase 5 Note Foundation is **not** activated inside Phase 4.
Journaling Activity must later use the permanent Note identity supplied by the
accepted Phase 5 Note Foundation. Nothing in this task touched any of it.

## 7. Position

**Accepted and integrated on `main`:** P4-A (v08.24), P4-C (v08.25).
**Accepted and held on the branch:** P4-D1, P4-D2, P4-D4 (v08.26), merging
cleanly, fully tested.
**Accepted as deployment candidate:** the Rules amendment — re-verified today,
53/0/0 against the exact file that would be published.
**Deferred:** P4-D3, to Phase 5.
**Blocked:** the deployment itself, on production Firebase access.

**Phase 4 remains NOT CLOSED.** No Phase 5 implementation was begun.

---

**PHASE 4 PRODUCTION GATE HALTED — BLOCKER: NO AUTHENTICATED FIREBASE ACCESS TO
`study-monitoring` IN THIS EXECUTION ENVIRONMENT, SO THE MANDATORY RULES PARITY
PROCEDURE (STEP 1) CANNOT BE PERFORMED AND NOTHING WAS DEPLOYED OR MERGED.**
