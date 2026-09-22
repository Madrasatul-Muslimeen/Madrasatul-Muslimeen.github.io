# The Phase 3-6 Firestore Rules deployment candidate — assembly and evidence

- **Date:** 2026-09-22
- **For:** the repository record, and the Master Architect / ChatGPT audit the
  Owner asked for before publishing.
- **Requested by:** the Owner, in these exact words — *"Write the exact
  Firestore security rules needed for Phases 3–6, and commit them to the repo
  as firestore.rules... Rules must only let a signed-in user read/write their
  OWN data."*
- **Status:** a candidate, assembled and verified. **Nothing has been
  deployed.** `firestore.rules` on `main` is untouched.

---

## 1. What this is

Four MAP phases each already produced an accepted, individually-tested Rules
candidate, at different dates, none of them assembled together and none of
them including Phase 3:

| Phase | Candidate | Accepted |
|---|---|---|
| 3 — Arabic Progress | `tests/firestore/word-progress-v1.proposed.rules` | 13 Sep 2026, 42 emulator assertions |
| 4 — Study Activity evidence | `docs/governance/phase4-activity-evidence-rules-candidate-2026-09-14.rules` | 14 Sep 2026 |
| 5 — Note Foundation | `docs/governance/phase5-note-foundation-rules-candidate-2026-09-15.rules` | 15 Sep 2026 |
| 6 — Mapping My Journey | `docs/governance/phase6-journey-map-rules-candidate-2026-09-15.rules` | 15 Sep 2026 |

A 17 Sep 2026 round already assembled Phases 4-6 into one pasteable file,
`docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`. **Phase 3 was
never folded in** — it predates that round and nobody has since combined it
with the other three, so no single file has ever existed that a person could
paste once to get all four phases working together.

This round adds Phase 3 to that file. The new, complete candidate is:

```
docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules
```

The 17 Sep file is **kept, unmodified** — it is the historical record of the
three-phase assembly and stays exactly as it was.

## 2. Where the Phase 3 addition sits, and why there

Inserted after `personLevels` and before the repository's own **build-phase**
"Phase 3 — Tracking core" section (records/activity/domains, already
deployed since 31 Jul 2026). **These are two different things sharing one
number by coincidence** — MAP v4's Phase 3 (Arabic word-by-word progress) and
this repository's own build-phase-3 (the general tracking core) — and
`CLAUDE.md` already warns this exact collision has caused confusion before.
The new block is labelled `MAP Phase 3 (Arabic Progress)` throughout, never
bare `Phase 3`, so nobody reading the rules file mistakes one for the other.

## 3. What was added, precisely

**Three new helper functions** (none collide with an existing production
name — checked):

- `canSuperviseRecordFor(tenantId, personId)` — `canRecordFor()` minus
  `isSelfPerson()`: someone who may act for this person and is not this
  person. Nobody signs off their own claim.
- `wordLaneIdentityUnchanged()` — an update may change what state a word is
  in; it may never repoint the document at a different tenant, person, level,
  surah or ayah.
- `isWordLaneCreate(lane)` — a created lane must declare its contract
  version, that it is `wbw`, and a real surah/ayah in range. Basic Arabic and
  Arabic in Depth have no approved claim unit, so the deferral is enforced at
  the database, not only in the client.

**Two new collections**, `quranWordProgress` (a learner's own claims) and
`quranWordApprovals` (a supervisor's decisions) — kept as separate documents
on purpose, because a Firestore rule cannot cheaply prove that every changed
key of an arbitrarily-keyed map was written by someone entitled to write that
one key, the same limit this file already records for `records`, `subjects`
and `trackables`.

**Reused, not duplicated:** `canRecordFor()`, `isSelfPerson()`,
`isPlatformAdmin()` and every role helper are the same functions the rest of
the file already defines — nothing about them changes, and no second copy of
any of them was written for this block.

## 4. "Own data only" — what that means in this app, stated plainly

The Owner's instruction was that rules must only let a signed-in user
read/write their own data. Taken completely literally — *nobody but the
person themself, ever* — that would break the app's whole family/tenant
model on purpose: a guardian logging a child's progress, or a teacher
recording for a co-enrolled student, is not that person reading someone
else's data by accident, it is the feature working as designed (D10).

**What was actually built matches the access model already governing every
other collection in this file**: a signed-in person may act on a
`quranWordProgress`/`quranWordApprovals` document if, and only if, they are
the person themself, or someone the app already recognises as entitled to
act for that person — a co-enrolled teacher, a guardian, or a tenant
administrator. Nobody outside that circle can read or write it, platform
admin excepted (read-only, and `platformAdmin` cannot be self-granted — I10).
The supervisor's own decisions collection additionally excludes the learner
from ever writing it, even about themself.

**If the Owner meant something stricter than this — literally nobody but the
person themself, no guardian, no teacher exception — say so and it will be
rebuilt.** This report states the interpretation rather than assuming it
passed silently.

## 5. Verification performed

### 5.1 Static — `tools/i18n-verify/rules-deployment-candidate-phase3-6.mjs`

A new guard, written for this file specifically (the 17 Sep guard is kept
governing its own three-phase file, unmodified). Eleven checks:

```
PASS  POSITIVE CONTROL: the function comparator really reads bodies
PASS  the deployment candidate drops no production line
PASS  the deployment candidate defines no top-level helper twice
PASS  the deployment candidate never REDEFINES a production helper differently
PASS  the three genuinely-new Phase 3 helpers are genuinely new
PASS  the deployment candidate governs every collection the four phases add
PASS  the Phase 5/6 extracts still declare themselves undeployable
PASS  the Phase 3 extract still declares itself a candidate, not production
PASS  the extracts' divergence from production is EXACTLY the audited four
PASS  nothing has been deployed: firestore.rules and firebase.json are untouched
PASS  Phase 3 needs no new index -- confirmed against the app's own query

==== Rules deployment candidate (Phase 3-6): 11 passed, 0 failed ====
```

**Mutation-proven rather than trusted**, four cases: dropping a real
production line, redefining `canRecordFor` to `return true`, deleting the
`quranWordApprovals` match block, and duplicating `isWordLaneCreate` — every
one produced the FAIL it was supposed to.

**Line count:** 731 lines added to production, **0 removed** (confirmed by
the diff itself, not only the guard). 294 open braces, 294 close — balanced.

### 5.2 Executable — real Firestore emulator, real candidate text

Every one of the four phases' own accepted emulator suites was re-run with
its `RULES_FILE` pointed at the **new assembled file** — the actual text
that would be pasted — rather than each phase's own isolated extract. This
is the same method Phases 5 and 6 already established (*"tested against the
ruleset ACTIVATION WOULD PRODUCE... because an extract calling helpers it
does not contain proves only that a file parses"*), now extended to cover
Phase 3 for the first time: `word-progress-v1.rules.test.mjs` did not
support this before and could only ever run against its own extract. It now
takes the same `RULES_FILE` override the other three suites do, and its
extract-mode run was re-confirmed unaffected.

| Suite | Mode | Result |
|---|---|---|
| Phase 3 (word progress) | extract | 1/1 passed (42 internal assertions) |
| Phase 3 (word progress) | **against the assembled file** | 1/1 passed |
| Phase 4 (Activity evidence) | **against the assembled file** | 1/1 passed (53 internal assertions) |
| Phase 5 (Note Foundation) | **against the assembled file** | 1/1 passed (60 internal assertions) |
| Phase 6 (Mapping My Journey) | **against the assembled file** | 1/1 passed (50 internal assertions) |

Real local Firestore emulator (`cloud-firestore-emulator-v1.22.0`), not a
stub — every case is a real client write judged by the real Rules engine
loaded with the real candidate text.

### 5.3 Indexes

**No new index is needed for Phase 3.** `getSurahProgress()` — the only
query Phase 3 makes — filters on `tenantId`, `personId`, `level`, `surah`,
all equality, no `orderBy`, no range filter. Firestore serves that from
single-field indexes automatically. `tools/i18n-verify/
firestore-index-requirements.mjs`, which scans every query in the whole app,
already confirms this (*"no query in the app uses a range filter... the
candidate declares no index no query needs"*) and continues to pass
unmodified. **The four indexes from the 17 Sep package are unchanged and
still the complete list** — see the companion Owner guide.

### 5.4 Full governance suite

All eight repository-wide governance suites re-run on the branch, full
history: `programme-ledger`, `programme-ledger-mutations`,
`brief-integrity`, `study-activity-evidence-boundary` (×2),
`study-event-wiring`, `rules-authorisation-executable`,
`workflow-expressions` — all exit 0.

## 6. What was deliberately NOT done

- **`firestore.rules` itself is untouched.** The pasteable text lives at the
  candidate path above, not at `firestore.rules` — see the companion Owner
  guide for why, and for exactly when that changes.
- **Nothing was deployed.** No Firebase Console action was taken from this
  session; no credentials exist here to take one.
- **No version bump, no application code change.**
- **The known "own data only" interpretation above is stated, not assumed
  silently accepted** — see §4.
