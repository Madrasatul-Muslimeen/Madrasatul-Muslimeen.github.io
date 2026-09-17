# MAP — the deployment package, and the divergence it uncovered

- **Date:** 2026-09-17
- **Task:** assemble a deployable Firestore ruleset for MAP Phases 4, 5 and 6, and the Owner-facing instructions for it
- **Blast radius:** **BR-0.** No application file changed at all — `git diff origin/main -- app/` is empty. `firestore.rules`, `firebase.json` and `version.js` byte-identical. Nothing deployed.
- **Application version:** **08.25, unchanged.**
- **Result:** ACCEPT — 8 of 8 mutations caught; 163 emulator assertions pass against the assembled file; 13 pure suites green.

---

## 1. Why this task, while the surfaces are blocked

Every remaining surface task is behind an accepted deferral or an Owner decision.
The deployment items are not: they are behind *access*, and what was standing
between the Owner and acting on them was that the instructions did not exist.

Checking that assumption produced three findings, in increasing severity.

### F1 — the standing brief pointed at a file that is not on `main`

`CLAUDE.md` said deployment "goes through the Firebase Console using
`docs/governance/phase4-production-package-2026-09-14.md`". **That file is not on
`main`.** The Owner following the brief would have found nothing.

> **Correction, 2026-09-17.** This report first said the file "was never
> written". That is wrong: it *was* written, and lives on the unmerged
> `claude/phase4-wiring` branch, where it was never merged across. The dead
> pointer on `main` was real and the fix is unchanged — the consolidated package
> supersedes it — but the characterisation was not.

### F2 — Phase 5 and Phase 6 had no deployable text at all, and pasting what exists would have destroyed the ruleset

Both Phase 5 and Phase 6 candidates are **extracts**: self-contained files
carrying their own copy of the shared helper block so the emulator can run them
in isolation. Each says so in its own header. But nothing had ever assembled a
deployable version, which means:

- **Pasting either extract into the Console would have replaced the entire live
  ruleset** with a file governing three collections and nothing else. For a
  non-coder Owner told "deploy the Phase 5 rules", that is the obvious action.
- **Every emulator assertion was proving something about a file nobody would
  ever deploy** — 110 assertions across the two phases, all about text with no
  route to production.

Phase 4 had avoided this by building a separate `DEPLOYMENT-candidate` and a
suite for it. Phases 5 and 6 had not.

### F3 — four helpers the extracts call "unchanged from the deployed rules" are not unchanged

Both extracts state that their duplicated helpers are "reproduced unchanged from
the deployed rules so the emulator can run it in isolation". Comparing every
shared helper against `firestore.rules`, ten match exactly and **four do not**:

| Helper | Production | Extract |
|---|---|---|
| `hasRoleIn` | `role in myRolesIn(tenantId)` | inlines its own `memberUidRef` read with `.get('roles', [])` |
| `myPersonIdIn` | `tenantMemberDoc(tenantId).personId` | `.get('personId', null)` |
| `isSelfPerson` | `.data.authUid` | `.data.get('authUid', null)` |
| `isCoEnrolledTeacherOf` | `.data.active` | `.data.get('active', false)` |

**What it means, stated precisely rather than alarmingly:** all four are
defensive-read variants. They produce the **same allow/deny outcome whenever the
field is present**, and differ only when a field is **absent** — where production
errors (and therefore denies) and the extract denies cleanly. No case flips from
deny to allow. But "same outcome by a different route" is not "unchanged", and a
suite whose `no()` helper asserts *"the deciding evaluation was a clean false"*
is asserting something about the extract that is not true of production.

**Why nobody caught it:** every existing check about `firestore.rules` asserts
what it does **not** contain — no evidence block, no note collections, unchanged
since main. Nothing compared the extracts' duplicated helpers against the real
ones. P6-B added a check that the two extracts' helper blocks match **each
other**, which is exactly the check that cannot see this.

---

## 2. What was built

### The assembled deployment candidate

`docs/governance/phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` — production
plus all three phases: **625 lines added, 0 removed.**

Two things had to be resolved, and they are why this is an assembly rather than a
concatenation:

1. **The extracts both declare the same shared helpers at top level.** Together
   they would be duplicate definitions at one scope, which does not compile. The
   block is taken **once**.
2. **The candidate uses production's own helpers.** The extract copies are
   *dropped*, not merged — so what would be deployed is the deployed security
   model, not a second one wearing its names. `memberUidRef()` is absent for the
   same reason: it existed only to serve the extracts' own two helpers, and
   production's `tenantMemberRef()` already addresses the identical document.

Phase 4's block-scoped `d()` and `personInTenant()` sit inside its `match` block
at six spaces; Phase 5's are top-level at four. No collision, and the emulator
compiling the file is what proves it rather than my reading of the scoping rules.

### The proof that mattered — the suites re-run against the deployable text

All three suites now take a `RULES_FILE` override, so the same assertions can run
against either the extract or the assembled file:

| Suite | vs its extract | **vs the assembled deployment candidate** |
|---|---|---|
| Phase 4 evidence | 53 assertions, 0 failures | **53 assertions, 0 failures** |
| Phase 5 Note Foundation | 60 assertions, 0 failures | **60 assertions, 0 failures** |
| Phase 6 Journey Map | 50 assertions, 0 failures | **50 assertions, 0 failures** |

That identical result is the evidence that F3's four divergences change no
outcome — established by running them, not by reasoning about them.

### One case had to be inverted, and the inversion is the point

`REG-01` asserts the legacy `ayahNotes` surface is untouched. Against the
**extract**, `ayahNotes` is unruled, so the write must be **denied** — that is
what proves the extract has not grown a rule for the legacy surface. Against the
**deployment candidate**, production's own `ayahNotes` rule is present, so the
Owner's write must **succeed** exactly as it does today — that is what proves the
Note Foundation has not disturbed the live surface holding real Owner data.

It failed on the first run against the assembled file, which is exactly what the
run was for. Asserting the denial there would have been asserting that
deployment **breaks the quick note**.

### The Owner-facing package

`docs/governance/phase4-6-production-deployment-package-2026-09-17.md` — written
for someone who does not read code: which file to paste and which two files must
**never** be pasted, the three indexes field by field, **indexes before rules**
and why, a copy-your-current-rules-out-first step as the undo button, and a
six-line click-through check whose most important line is *open a note, type,
save* — because that is what proves the existing data is unaffected.

`CLAUDE.md`'s dead pointer now points here.

---

## 3. The durable guard

`tools/i18n-verify/rules-deployment-candidate.mjs` — 9 checks, including a
**positive control** so a broken function-body parser cannot make every
comparison pass vacuously.

It asserts the candidate drops no production line, defines no top-level helper
twice, **never carries a different implementation of a production helper**,
governs all five note collections plus the evidence subcollection, that each
extract still declares itself undeployable, that the divergence set is **exactly
the audited four** (a new one must be looked at deliberately), that nothing is
deployed — and that **every `docs/governance/` path the brief names exists**, so
a dead pointer fails a check instead of wasting the Owner's time.

### Mutation testing — 8 of 8 caught

| # | Mutation | Caught by |
|---|---|---|
| D1 | A production line dropped from the candidate | drops-no-production-line |
| D2 | A top-level helper defined twice | no-duplicate-definition |
| D3 | A production helper quietly reimplemented | **both** drops-a-line **and** REDEFINES, the latter naming `hasRoleIn` |
| D3′ | The candidate assembled the naive way, from the extract's helper block | no-duplicate-definition |
| D4 | An extract loses its do-not-deploy warning | extracts-declare-themselves-undeployable |
| D5 | A new divergence introduced in an extract | divergence-set-is-exactly-four |
| D6 | The brief points at a non-existent file | brief-points-at-a-file-that-exists |
| D7 | A match block missing from the candidate | governs-every-collection |

**One methodology note worth keeping.** D3's first attempt silently did nothing:
the replacement string was written on one line and `isSelfPerson` is multi-line
in production, so it matched nothing and the check "passed". A mutation that does
not apply proves nothing — the same trap Phase 5's harness hit. Every mutation
above now asserts its own occurrence count before running.

---

## 4. Verified, not asserted

| Claim | Evidence |
|---|---|
| No application change | `git diff origin/main -- app/` is **empty** |
| Nothing deployed | `firestore.rules`, `firebase.json`, `version.js` byte-identical |
| The candidate is additive | 625 added, **0 removed**, asserted automatically |
| The candidate compiles and behaves | 163 emulator assertions against it |
| Existing quick notes survive deployment | asserted against the candidate: the owner's `ayahNotes` write succeeds |
| Nothing else regressed | 13 pure suites green |

---

## 5. What this does not do

- **It does not deploy anything.** Deployment remains an Owner Control Gate and
  needs Console access this sandbox does not have.
- **It does not change the extracts' helpers.** They stay as they are — the
  deployment candidate uses production's, which is the half that matters. The
  extracts' headers now carry the correction rather than the false claim.
- **It does not unblock the surfaces.** P5-D (the Note editor) is still held by
  ADR-004's deferral, and Mapping My Journey's shape by ADR-010 §3.

---

## 6. Pending-dependency ledger

| # | Item | Blocked on | Now ready? |
|---|---|---|---|
| 1 | Phase 4 Rules | Console access | **Yes — in the one assembled file** |
| 2 | Phase 5 Rules | Console access | **Yes — same file** |
| 3 | Phase 5 indexes | Console access | **Yes — three indexes, field by field** |
| 4 | Phase 6 Rules | Console access | **Yes — same file** |
| 5 | Merging `claude/phase4-wiring` (`c4fca4a`) | items 1–3 deployed | after deployment |
| 6 | P5-D, the Note editor | ADR-004's deferral | Owner decision |
| 7 | Server-side folder-cycle prevention | costs the ability to move a folder | Owner decision |

Items 1–4 were four separate unanswered questions this morning. They are now one
paste and three index forms.
