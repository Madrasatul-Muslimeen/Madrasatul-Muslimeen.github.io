# MAP Phase 4 — Rules deployment: BLOCKED at a genuine access gate

**Date:** 14 September 2026
**Authority:** Master Architect continuation directive of 2026-09-14, §2 — Rules
deployment authorised, subject to a deterministic parity/change check.
**Result:** **P4-C INTEGRATED.** **RULES DEPLOYMENT BLOCKED — NOT PERFORMED.**
**`main`:** `05ba016b1eb66d42ed39a4ed6fb09ca0e11978c8`, app version **08.25**.
**Production `firestore.rules`: byte-for-byte UNCHANGED. Nothing was deployed.**

The directive said: *"If parity differs or the exact tested amendment cannot be
safely isolated, STOP at that genuine security gate and report the exact
difference. Do not improvise around a Rules mismatch."* The blocker is adjacent
to but not identical to that: **parity cannot be established at all**, because
the production baseline cannot be read from this environment.

---

## 1. P4-C integration — COMPLETE

| Item | Value |
|---|---|
| Pre-merge `main` | `925a9c2ca94fdffcfc0563d498681dfe902ab700` (v08.24) |
| Accepted tranche | `f8be1142f53686fc70287482f0b43c74203e630f` |
| **Merge commit — new `main`** | **`05ba016b1eb66d42ed39a4ed6fb09ca0e11978c8`** |
| App version | **08.25** |
| Rollback point | `925a9c2ca94fdffcfc0563d498681dfe902ab700` |

`main` had not moved; `--no-ff`, matching the accepted precedent, so the
integration reverts as one unit. **16 files, the accepted scope exactly.**

### All six required verifications

| # | Check | Result |
|---|---|---|
| 1 | expected P4-C files on `main` | **PASS** — all six present; `version.js` = `08.25` |
| 2 | ADR-008 contains the accepted amendments | **PASS** — status line, amended `wbw.engaged` row, and the "Master Architect amendments" section |
| 3 | production `firestore.rules` not altered as a merge side-effect | **PASS** — byte-for-byte identical to pre-merge `main` |
| 4 | writer uninvoked at the integration point | **PASS** — boundary suite, plus an independent `grep -rl` over `app/` returning only the module itself |
| 5 | `activity.js` / `records.js` behaviour unchanged | **PASS** — both byte-for-byte identical to pre-merge `main` |
| 6 | P4-A / P4-C and Phase 2/3 suites green | **PASS** — see §4 |

Pushed: `925a9c2..05ba016`. Read back from the remote: `origin/main` =
`05ba016`, `version.js` = `08.25`, writer present.

---

## 2. THE BLOCKER — no credentials for `study-monitoring`

**This environment cannot authenticate to the production Firebase project, so it
can neither read the deployed Rules baseline nor deploy.** Established, not
assumed:

| Probe | Result |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` / `FIREBASE_TOKEN` / any `FIREBASE_*` env var | **none set** |
| `~/.config/configstore/firebase-tools.json` | present but **empty** — `keys: []`, no tokens, no user |
| service-account or admin-SDK key files on disk | **none found** |
| `firebase projects:list` | **FAILS** at `requireAuth` → `GoogleAuth.getAccessToken` |
| `firebase --project study-monitoring firestore:databases:list` | **FAILS** at `requireAuth` → `requirePermissions` |

`.firebaserc` names `study-monitoring` and `firebase.json` points at
`firestore.rules`, so the *configuration* is right — what is missing is
**authorisation**, and that is not something to work around.

### Why this is a hard stop rather than a judgement call

The directive requires beginning from **"the actual current production/deployment
Rules baseline"** and forbids overwriting, removing, weakening or silently
modifying unrelated Rules. From here I can see only the **repository copy**.
`CLAUDE.md` records an Owner-performed parity verification of 2026-09-10
(content-identical; the repository copy carries one extra terminal newline), but
that is **four days stale and was not performed by me**.

Deploying a file derived from a possibly-stale baseline would silently revert any
unrelated Rules change made in the Firebase Console since 10 September — exactly
the prohibited outcome, and irreversible in effect for whatever it reverted.
**Stop conditions 3 (security/production-risk conflict) and 5 (inability to
continue safely) both apply.**

---

## 3. Everything up to the gate has been done

Deployment is one command away the moment access exists. Prepared and verified:

### 3.1 The deployment candidate is ADDITION-ONLY, proven mechanically

`docs/governance/phase4-activity-evidence-DEPLOYMENT-candidate-2026-09-14.rules`
= the repository `firestore.rules` **plus** the accepted evidence block, inserted
immediately after the existing `activity` block.

| Proof | Result |
|---|---|
| lines **removed** vs. the baseline | **0** |
| lines added | 208 |
| deleting the inserted region reproduces the baseline **exactly** | **TRUE** |
| the evidence block is byte-identical to the emulator-tested candidate | **TRUE** |
| the existing `activity/{activityKey}` rule | **unchanged** |
| any other rule in the file | **unchanged** |

The insertion carries its own header recording that it is an addition made under
explicit Master Architect authority and alters nothing above or below it.

### 3.2 The full suite was re-run against the **exact deployment candidate**

Not against the isolated extract — against the merged file that would be
deployed, in an isolated emulator on project
`demo-quranrevival-activity-deploy-v1`:

| | Isolated candidate | **Deployment candidate** |
|---|---|---|
| Assertions | 53 passed, 0 failed | **53 passed, 0 failed** |
| Expression-budget denials | 0 | **0** |

**Semantic parity between the two is therefore demonstrated behaviourally**, not
merely by diff. What remains unverified is parity between the repository baseline
and *production*, which is the blocker.

### 3.3 An evidentiary finding in evidence that was already accepted

Re-reading the emulator logs closely, **7 of the 53 denials are reported as
`evaluation error` rather than as a clean `false`.** This is present in **both**
runs, including the isolated 53-assertion run the Master Architect has already
accepted — so it is a pre-existing caveat in accepted evidence, surfaced here
rather than carried silently. It is the shape the accepted Phase 3 candidate
explicitly warns about: a denial the rules *tripped over* rather than *decided*.

What I did establish:

- **Every one of the 7 also carries a clean decision in the same log line.** The
  four deduplication cases (exact retry, MA-2, MA-4, MA-W2) show
  `false for 'update'` — and that is the **operative** clause, because the
  document already exists, so the write is an update and `allow update: if false`
  is what denies it. The three authorisation cases additionally show
  `false for 'create'`.
- **No denial in the suite rests solely on an exception**, which is the
  distinction that sank the earlier Activity candidate (whose denials were *only*
  budget exhaustion).
- Bisecting the three `allow create` conjuncts removed only one or two errors
  each, so no single conjunct is the sole cause; the four dedup errors are
  consistent with the `create` clause being evaluated against an
  already-existing document.

**I could not fully root-cause it within this task, and I am not claiming to
have.** It is fail-closed and does not weaken the rule, but it makes part of the
denial log less trustworthy than it should be. **Recommendation: close this
before deploying**, so that every denial is demonstrably a decision. It is a
small, contained piece of work and I will take it as the next bounded task if the
Master Architect agrees.

---

## 4. Regression on merged `main`

| Suite | Result |
|---|---|
| `study-activity-evidence-id` / `-store` / `-boundary` | **29 / 19 / 13**, 0 failed |
| `study-approach-contract` / `-evidence` / `-boundary` (P4-A) | **13 / 11 / 16**, 0 failed |
| `quran-word-card` / `-integration` | 36 / 10, 0 failed |
| `quran-word-progress-model` / `-data` | 57 / 37, 0 failed |
| `quran-word-coverage` / `-arabic` | 10 / 29, 0 failed |
| `quran-word-identity-contract` / `-indexes` / `-index-loader` | 6 / 9 / 8, 0 failed |
| `quran-boundary` / `stub-parity` | 30 / 3, 0 failed |

Every figure matches its recorded baseline. `app/quranrevival.html` is
byte-for-byte identical to pre-merge `main`, so the rendered-layout measurements
carried over from the P4-C report still hold without re-running.

---

## 5. Why Phase 4 wiring has NOT continued

The directive sequences P4-D1…D4 *after* "successful P4-C integration **and Rules
deployment verification**". Integration succeeded; deployment verification cannot
happen. Beyond that ordering, there is a substantive reason not to proceed, and
it is a product-risk judgement the Master Architect should make rather than me:

**With no rule for the subcollection, production denies every evidence write.**
Confirmed: `firestore.rules` contains no `evidence` match block and no catch-all,
so the path is denied by default. The P4-C writer **rethrows genuine denials** —
deliberately, so real failures reach the user (I15). Wiring `reading.completed`
into the live app in that state would therefore surface a permission error to the
Owner **on every āyah they complete**, in an app they use daily (D13 puts the
Owner's own real use first).

That raises a design question ADR-008 does not settle: **should ADR-008 evidence
writes be user-visible failures (I15) or silent best-effort?** The codebase has
both patterns — `safeWrite()` for user-facing writes, and explicitly best-effort
calls such as `touchResume()`. Choosing between them for evidence is a **material
architecture decision not already governed by MAP or an ADR** — stop condition 2.

**I have not decided it, and I have not wired anything.** Three routes, for the
Master Architect to pick:

| Route | What happens |
|---|---|
| **A — deploy first** (recommended) | An Owner with Console access deploys the prepared candidate, or grants this session credentials; then P4-D1…D4 proceed with no user-visible breakage |
| **B — build P4-D on the branch, do not merge** | Tranches are implemented and fully tested but never reach `main` until Rules are deployed. Progress continues; nothing reaches the live app |
| **C — best-effort evidence writes** | Evidence failures are swallowed rather than surfaced. **Needs an explicit ADR-008 amendment**, because it trades away I15 for this write path |

---

## 6. Exactly what is needed to unblock

**One of:**

1. **Deploy the prepared candidate from a credentialed environment.** The file is
   `docs/governance/phase4-activity-evidence-DEPLOYMENT-candidate-2026-09-14.rules`
   on `main` — but it must first be re-derived from the **live** baseline, not
   from the repository copy, unless production parity is re-verified at that
   moment. Via the Firebase Console (the route this project has used before), the
   step is: open Firestore → Rules, confirm the live text still matches the
   repository copy, paste the evidence block in immediately after the existing
   `match /activity/{activityKey}` block, publish.
2. **Or grant this session credentials** (a `FIREBASE_TOKEN`, or a service account
   with `firebaserules.admin`), and I will re-derive the candidate from the live
   baseline, re-run the full suite against that exact file, deploy, and verify.

**And, before either:** a decision on the 7 evaluation-error denials (§3.3) —
whether to close them first, which I recommend.

---

## 7. Position

**Done:** P4-C integrated into `main` at `05ba016`, v08.25, all six verifications
passing, regression green, pushed.

**Blocked:** Rules deployment — no credentials; production baseline unreadable.

**Not started, deliberately:** P4-D1 Reading, P4-D2 Listening, P4-D3 Journaling,
P4-D4 WbW. Nothing wired, nothing merged toward them.

**Untouched:** production `firestore.rules`, `activity.js`, `records.js`, every
`app/*.html`, `monitor.js`, `backup.js`, `backup-file.js`. No index, no
migration, no backfill, no production write. DDR-001–004 untouched. No scope
expanded — no Phase 5, MMJ, Dawah, Share/Media or historical branch material.

**STATUS: AWAITING MASTER ARCHITECT DECISION ON THE DEPLOYMENT GATE AND ON
ROUTE A / B / C.**
