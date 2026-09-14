# MAP Phase 4 — PRODUCTION PACKAGE

**Date:** 14 September 2026
**Purpose:** everything needed to put Phase 4 into production, in one place, so
the only remaining step is an action requiring Firebase credentials this
execution environment does not have.

**Nothing in this package has been deployed.** Production `firestore.rules` is
byte-for-byte unchanged.

---

## 1. The exact tested Rules amendment

**File:** `docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules`
(the isolated extract that the emulator suite loads)

**Merged form, ready to publish:**
`docs/governance/phase4-activity-evidence-DEPLOYMENT-candidate-2026-09-14.rules`
= the repository `firestore.rules` **plus** the evidence block and nothing else.

| Proof | Result |
|---|---|
| lines **removed** from the baseline | **0** |
| lines added | 208 |
| deleting the inserted region reproduces the baseline **exactly** | **TRUE** |
| evidence block byte-identical to the emulator-tested candidate | **TRUE** |
| existing `match /activity/{activityKey}` rule | **unchanged** |
| every other rule in the file | **unchanged** |

## 2. Exact production insertion location

Immediately **after** the closing brace of the existing block:

```
match /activity/{activityKey} {
  allow read: if isPlatformAdmin();
  allow read: if signedIn() && !exists(/databases/$(database)/documents/activity/$(activityKey));
  allow read: if canRecordFor(resource.data.tenantId, resource.data.personId);
  allow create: if canRecordFor(request.resource.data.tenantId, request.resource.data.personId);
  allow update: if canRecordFor(resource.data.tenantId, resource.data.personId);
  // No delete (I4/D6).
}
⟵ THE NEW BLOCK GOES HERE, before `match /bookmarks/...`
```

It is a **sibling** match block, not a nested one, and it reuses the deployed
`canRecordFor` helper unchanged.

## 3. Rules baseline / parity verification procedure

**Do this first, every time. The repository copy is not proof of what is live.**

1. Open the Firebase Console → Firestore → **Rules** for `study-monitoring`.
2. Copy the live text out.
3. Diff it against this repository's `firestore.rules`. The expected difference
   is **one trailing newline** in the repository copy and nothing else
   (`CLAUDE.md`, 2026-09-10).
4. **If anything else differs, STOP.** Something was changed in the Console
   since; publishing from the repository copy would silently revert it. Bring
   the live text into the repository first, re-derive the candidate from it, and
   re-run §6.
5. Only when the diff is that single newline is the prepared candidate valid.

## 4. Final D1–D4 wiring commits

| Tranche | Where |
|---|---|
| P4-A contract | `main`, merge `7728c02` (v08.24) |
| P4-C writer | `main`, merge `05ba016` (v08.25) |
| Rules candidate + blocker report | `main`, `65d3f99` |
| **P4-D1/D2/D4 wiring** | `claude/phase4-wiring` — **NOT merged** |
| **P4-D3 Journaling** | **NOT BUILT** — blocked, §11 |

## 5. Resulting application version

| | |
|---|---|
| `main` today | **08.25** |
| after merging the wiring branch | **08.26** |

One increment for the integrated wiring candidate, not four: D1, D2 and D4 are
internal checkpoints behind the deployment gate and are recorded by commit SHA,
not by production version churn.

## 6. Full regression evidence

See `docs/reports/2026-09-14-map-phase4d-study-event-wiring.md` for the
per-suite table. Headline: emulator **53 assertions, 0 failures, 0
expression-budget denials**, every denial asserted to end in a decisive clean
`false`, all four important Rules checks proven active by mutation; pure suites
39 + 29 + 19 + 18; P4-A and Phase 2/3 baselines unchanged.

## 7. Rollback procedure

**Rules** — republish the previous ruleset. The Console keeps every published
version and can roll back in one click. Because the amendment is
**addition-only**, rolling back removes the evidence rule and touches nothing
else; the subcollection simply becomes unwritable again. **No data is lost** —
existing evidence documents remain, readable by an admin.

**Application** — revert the wiring merge. Because the writer is additive and
create-only, there is no state to unwind: no existing document was altered, no
field repurposed, no array rewritten. Rollback is "stop writing", never "put it
back" (I4/D6 — nothing is ever deleted).

**Order matters:** roll back the application first, then the Rules. The reverse
leaves a live app writing to a collection that has just stopped accepting it,
which surfaces permission errors to readers.

## 8. Exact deployment actions

**Route A — Firebase Console** (the route this project has used before, and the
one available without granting anything to this environment):

1. Run §3's parity check. Stop if it fails.
2. Open the deployment candidate, copy the block between
   `// MAP Phase 4 (P4-B/P4-C) -- ADR-008 Study Activity evidence.` and the
   closing `}` of `match /activity/{activityKey}/evidence/{eventId}`.
3. Paste it into the live Rules at §2's location.
4. **Publish.**
5. Merge `claude/phase4-wiring` into `main` (v08.26) so the app can use it.

**Route B — CLI**, if credentials are ever available here:

```
# after §3's parity check passes
cp docs/governance/phase4-activity-evidence-DEPLOYMENT-candidate-2026-09-14.rules firestore.rules
npx firebase --project study-monitoring deploy --only firestore:rules
```

## 9. Post-deployment verification

1. **Re-read the live Rules** and confirm the evidence block is present and the
   rest is unchanged.
2. Open the app as the Owner, Study → Read, and press the **✓** button on a
   single āyah. Expected: the tick turns on, and **no red failure banner**
   appears at the bottom of the screen. A banner means the write was denied and
   the Rules did not take.
3. Press **✓** again on the same āyah. Expected: it reads **"Already recorded
   for today."** — proof that deduplication is working at the database.
4. Press **▶** and let a whole short surah play to the end. Nothing visible
   happens; that is correct. Listening records silently.
5. Open the Word Card on any word and set a word state. Expected: no failure
   banner.
6. **Check that nothing reached Mastery:** open the Note view's Track card for
   that āyah. It must still read exactly as before — no claim, no confirmation.
   That is the invariant the whole design exists to protect.

## 10. Phase 4 closure checklist

| Item | State |
|---|---|
| ADR-008 accepted, and amended 14 Sep | **DONE** |
| P4-A Study→Approach contract on `main` | **DONE** (v08.24) |
| P4-B persistence architecture accepted | **DONE** |
| P4-C evidence writer on `main` | **DONE** (v08.25) |
| Rules candidate, emulator-verified | **DONE** — 53 assertions, 0 budget denials |
| Rules evaluation-diagnostic root-caused and proven | **DONE** — §11 of the D-report |
| P4-D1 Reading wired | **DONE**, unmerged |
| P4-D2 Listening wired | **DONE**, unmerged |
| P4-D4 WbW wired | **DONE**, unmerged |
| **P4-D3 Journaling wired** | **BLOCKED** — §11 |
| Rules deployed | **BLOCKED** — no credentials |
| Wiring merged to `main` | **HELD** until Rules are deployed |
| Monitor / backup read path for evidence | **NOT STARTED** — deliberately; a separate task after closure |

## 11. The two things that remain, and what each needs

**(a) Rules deployment — an access dependency, not a design question.**
Everything is prepared and verified; §8 is the action. It needs Console access
or credentials, neither of which this environment has.

**(b) P4-D3 Journaling — a genuine architecture decision.**
The live note surface `ayah-notes.js` stores **one note per (person, unitKey),
keyed by unitKey, with no id of any kind**. ADR-008 as amended requires a
permanent `noteId` in the event identity and requires two Notes on the same unit
to remain independent — **that model cannot hold two notes on one unit at all.**
`note-foundation.js`, which has permanent note ids and revisions, is the Phase 5
Note Foundation and is imported by nothing; activating it is out of scope.

Three routes, none safe to choose without authority:

| Route | Consequence |
|---|---|
| **Activate Phase 5 Notes for Journaling** | ADR-008 is satisfied as written, but this is Phase 5 work inside Phase 4 |
| **Amend ADR-008's Journaling identity** to the live one-note-per-unit reality | D3 ships now; "different Notes on the same unit" becomes moot because the product has no such concept |
| **Defer D3 to Phase 5** | Phase 4 closes with Reading, Listening and WbW; Journaling follows the Note Foundation |

**Synthesising a `noteId` from the unitKey is NOT among them.** It would leave
the amendment's words in place while emptying them of meaning, and nothing on
any screen would show it.
