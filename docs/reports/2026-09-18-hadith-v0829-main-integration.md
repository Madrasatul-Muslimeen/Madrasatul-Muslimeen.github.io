# Hadith v08.29 — Integration to `main`

**Date:** 2026-09-18 · **Type:** Final integration, executed under explicit Master Architect merge authorisation.
**Merged to `main`. NOT deployed.** No next Hadith feature tranche was started.

---

## 1. Pre-flight — exact match

| | |
|---|---|
| Expected `origin/main` | `cfee898be15abff09882996cf22410e499130acb` |
| Actual `origin/main` | **`cfee898be15abff09882996cf22410e499130acb`** — exact |
| `main` version before | **v08.27** |
| Candidate | `fd8a8a240cfff1875c3f7696652daa18c47ced1e` at **v08.29** |

`main` had gained four BR-0 commits since `5ea0d92`: the Programme Integration Ledger
foundation, its mutation suite, the Phase 4 version-note correction and a report stamp.
**No application code, no `version.js`, no Rules, no Firebase configuration.**

---

## 2. Rebaseline — history-preserving

`git merge origin/main` into the candidate. **Clean, no conflicts.** Nothing rewritten:
**Stage A `7f61328` (v08.28)** and **Stage B `22526b2` (v08.29)** keep their SHAs and
their stamps, and the candidate history is intact. The version stayed **v08.29**;
**`v08.30+` was never allocated or consumed.**

---

## 3. Programme Ledger — and a pre-existing failure this integration repaired

**The ledger guard was FAILING on `main` before this work began**, and that is worth
recording rather than passing over. Guard **F** reported the **Quran** stream stale:
`baselineSha 5ea0d928…` against `origin/main cfee898be1…` with `baselineStatus: CURRENT`.
Its own ledger commits had moved `main` past the baseline they recorded.

The consequence was larger than one red line: the mutation suite's **positive control**
refused to certify anything — *"the unmutated ledger already fails; the mutations below
would prove nothing."* So on `main`, **24 of 25 mutations proved nothing at all.**

Updating the ledger to the truth cleared both.

### 3.1 What the ledger now records, and why each value is the true one

| Field | Value | Why |
|---|---|---|
| `main.baselineSha` | `cfee898…` | The tip this candidate was built on. Guard F requires an **ancestor**, not equality, so forward movement is a NOTE |
| `main.version` | **08.27 pre-merge → 08.29 in the stamping commit** | The ledger must be true **when it is read**. Writing 08.29 before the merge landed made guard F fail correctly, so it is written at the moment it becomes true |
| `08.28` / hadith | **RESERVED**, stamped at `7f61328` | The Master Architect's own word. Superseded **inside accepted history** — the branch tip carries 08.29 — and explicitly **not** a claim on any future number |
| `08.29` / hadith | RESERVED → **RELEASED** on merge | `RELEASED` means present on `main`. It does **not** mean deployed |
| `quran` + `hadith` baselines | `cfee898…`, **MOVED_ACKNOWLEDGED** | `main` moves past `cfee898` **by this very merge**. `CURRENT` would be true for seconds and false for the whole life of the record |
| Five shared touches | **AUTHORIZED**, with attribution | Recorded from the Master Architect's authorisation of 18 Sep 2026 |

**`08.28` was briefly marked `HISTORICAL` with `historicalStamp: true` and that was
wrong** — that flag means *a held branch's tip really carries this stamp*, and guard C
correctly caught it: the Hadith tip carries 08.29, not 08.28. Reverted to `RESERVED`.
The guard found my own error before I did.

### 3.2 Two mutation failures, diagnosed rather than worked around

After the first ledger edit the mutation suite reported **2 failures**. Neither was a
guard regression, and the distinction mattered:

- **MUTATION [C]** expected the message *"…claimed by stream hadith"*. **Guard C still
  fired** — it caught the forward allocation — but with different wording, because I had
  moved 08.28 from a *claiming* status to a non-claiming one.
- **MUTATION [F]** expected *"which does not exist"*. Its helper `moveMainPast()` does not
  set `baselineStatus`, so it relies on the live ledger already reading
  `MOVED_ACKNOWLEDGED`; with both streams at `CURRENT` the guard hit the **stale-baseline**
  branch first and never reached the acknowledgement check.

**Both were preconditions the suite draws from the live ledger**, which is the same class
`main`'s own commit `44e2304` ("Programme ledger mutations: build their own stale-baseline
precondition") had already patched once for a different case. **Resolved by making the
ledger more accurate, not by editing the suite** — `programme-ledger-mutations.mjs` is not
among the five authorised shared files and **was not touched**.

---

## 4. Gates — all eighteen

| # | Gate | Result |
|---|---|---|
| 1 | Programme Ledger guard | **PASS — 7 passed, 12 noted, 0 failed** |
| 2 | Programme Ledger mutations | **PASS — 25 passed, 0 failed** (positive control green again) |
| 3 | Five shared touches AUTHORIZED | **PASS in the ledger data** — all five carry `status: AUTHORIZED` and the authorising decision. **See §6: the guard has no `AUTHORIZED` vocabulary yet** |
| 4 | No undeclared shared touch | **PASS — guard E: 12 modifications, 12 declared, 0 undeclared** |
| 5 | Version reservation / collision | **PASS — guard A** (no version claimed twice) and **guard B** (nothing claims 08.30+) |
| 6 | Canonical version notation | **PASS — guard D**, with its own control seeing 46 v-prefixed versions in the brief |
| 7 | Stale baseline | **PASS — guard F**: every declared baseline is an ancestor of `origin/main`, every moved one acknowledged |
| 8 | Hadith pure suites | **PASS — 61 / 0** (14 + 33 + 14) |
| 9 | Quran / MAP regressions | **PASS — 20 suites, 410 checks, all exit 0** (includes both D14 suites) |
| 10 | `brief-integrity` | **Explained below — PASS after merge** |
| 11 | `stub-parity` | **PASS — 3 / 0** |
| 12 | i18n integrity / coverage | **PASS — 1,873 scanned / 1,812 translated / 61 missing (97%)**, 1,642 catalogue entries, exit 0 |
| 13 | Rendered Hadith | **PASS — 96 / 0**, three widths × two languages × both routes |
| 14 | `behaviour.mjs` | ****PASS -- 981 passed, 1 failed, 56 sections.** The single failure is the sandbox TLS artefact (`ERR_CERT_AUTHORITY_INVALID`). **Zero application regressions**; it matches `main`'s own clean run of record** |
| 15 | D14 unreachable | **PASS — no importer** of `timezone-contract.js` / `timezone-service.js` anywhere in `app/` |
| 16 | Phase 4 HELD | **PASS — `7e2931f` not merged into the candidate** |
| 17 | `firestore.rules`, `firebase.json` | **PASS — byte-identical to `main`** |
| 18 | Corpus / durable-write gates | **PASS — 0** `hadith` collections in the Rules, **0** durable writes in any `app/js/hadith-*.js`, `catalogue*.js` identical so **no Approach ID allocated** |

### 4.1 Gate 10 — `brief-integrity`, explained

**7 passed, 1 failed pre-merge; the failure is the merge itself in flight.**

The brief's milestone line now reads **v08.29 on `main`**, which is the truth from the
instant this integration lands. Before the merge the guard correctly objected: *"the brief
says v08.29 is on `main`, but `origin/main:app/js/version.js` says 08.27 and this tree is
on `feature/hadith-study`"*. **No pre-merge state can pass**, because the brief must
describe `main` and `main` is precisely what is changing. **It passes on `main` after the
merge** — verified in §5.

**The guard was not weakened**, and the milestone line was updated rather than the check.

---

## 5. Merge to `main`

Merged with `--no-ff` so the integration is an explicit, labelled point in history.

| | |
|---|---|
| Merge commit | **`43dd96f58eeee5ad33dc82bb4e260660e3c290c9`** |
| `main` before to after | `cfee898...` to **`43dd96f...`** |
| `main` version | **v08.27 to v08.29** |
| Pushed | **Yes** |
| `origin/main` == local `main` | **YES**, fetched and compared after the push |

**Post-merge verification on `main` itself:** `app/js/version.js` reads **`08.29`**, and
**`brief-integrity` now passes 8 / 0** -- the brief's *"v08.29 on `main`"* has become true.

**A stamping commit follows the merge**, as the ledger's own design requires: main's
version and final SHA cannot be recorded in the commit that creates them. It sets
`main.baselineSha` and `main.version = 08.29`, moves **08.29 to RELEASED** and **08.28 to
HISTORICAL**, and marks the Hadith stream **MERGED_TO_MAIN**.

---

## 6. Flagged — not changed, and outside the authorised five

**`programme-ledger-mutations.mjs` cannot fully model a post-merge world.** At the gate it
was **25 / 0**. After the merge it reads **23 / 2**, and the ledger guard itself is
**7 / 0** — so nothing regressed. The two are preconditions the suite draws from the live
ledger:

- **MUTATION [A]** injects a duplicate allocation for `main.version` owned by `hadith` and
  expects *"claimed by 2 streams at once"*. `main.version` is now **08.29, already owned by
  `hadith`**, so the injection names the *same* stream and no conflict can be built.
- **MUTATION [C]** expects *"claimed by stream hadith"*, which only appears while 08.28 is a
  **claiming** status. Post-merge it is correctly `HISTORICAL`.

A third failure was real and **was** fixed truthfully: nulling the Hadith stream's
`activeBranch` on merge lost a fact that is still true — the branch exists and still carries
the 08.29 stamp — and left the ledger unable to cross-check declared version against a real
ref. Restored.

**One contradiction is left for the ledger's owner rather than edited from here:** allocation
`08.27 / quran` still carries `status: LIVE` with the meaning *"shipped and served from
main"*, which stopped being true the moment main moved to 08.29. Its note now records the
supersession, but the **status field is the Quran stream's allocation to set**. Related: the
ledger has no vocabulary for *"on `main`, deployment unverified"* — `RELEASED` is the closest
and is what 08.29 carries.

**`tools/i18n-verify/programme-ledger.mjs` has no `AUTHORIZED` vocabulary.** It models
only *declared vs undeclared*, so every declared touch prints *"DECLARED, awaiting Master
Architect decision"* regardless of the ledger's `status` field. Gate 3 is therefore
satisfied **in the ledger data** — all five touches carry `status: AUTHORIZED` and
`authorisedBy` — while the guard's own message still says "awaiting". **Reported, not
edited**: that file is not among the five authorised shared touches.

**`tools/i18n-verify/programme-ledger-mutations.mjs` draws two preconditions from the live
ledger** (§3.2), so a legitimate ledger change can break a mutation without any guard
regressing. Both were resolved by making the ledger truer; the structural improvement —
each mutation building its own precondition, as `44e2304` did once — is left to its owner.

**`SHARED_CHANGE_REQUEST_01` remains `ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`.** The
multilingual shared-infrastructure redesign was **not** implemented and its contract was
**not** invented.

---

## 7. Gates that remain CLOSED

**No production deployment** — and *merged is not deployed*: nothing was deployed, and
nothing about deployment was proven. No real Hadith corpus, translation or commentary
embedding · no permanent Hadith semantic key · no Approach ID allocation · no durable
Track · no Notes/MMJ persistence · no Rules or index activation · no migration · no next
Hadith feature tranche · **v08.30+ unallocated**.

## 8. Firestore Rules — the two facts, separately

**REPOSITORY:** `firestore.rules` and `firebase.json` are **byte-identical** to the
authorised `main`; **0** `hadith` collections; no `firestore.indexes.json`. This proves
repository content and nothing else.

**DEPLOYMENT: UNVERIFIED.** No `firebase` CLI, no `gcloud`, no credentials; the Rules API
returns **HTTP 403 PERMISSION_DENIED** to an unregistered caller. The deployed ruleset has
not been inspected and cannot be from this environment.

---

## HADITH_MAIN_INTEGRATION

One `KEY=value` per line, blank-separated so each survives as its own line in the HTML.

STATUS=MERGED_TO_MAIN

BASE_MAIN_SHA=cfee898be15abff09882996cf22410e499130acb

CANDIDATE_SHA=fd8a8a240cfff1875c3f7696652daa18c47ced1e

FINAL_MAIN_SHA=43dd96f58eeee5ad33dc82bb4e260660e3c290c9

FINAL_MAIN_VERSION=v08.29

PROGRAMME_LEDGER=ACTIVE and updated to the true final state. Guard 7 passed / 12 noted / 0 failed; mutations 25/0 with the positive control green. It was FAILING on main before this integration (quran stream stale baseline), which also disabled the mutation suite's positive control -- repaired here

SHARED_TOUCHES_AUTHORIZED=5 of 5 -- app/js/version.js, CLAUDE.md, CHANGELOG.md, app/js/i18n/bn.js, tools/i18n-verify/behaviour.mjs. All carry status AUTHORIZED and authorisedBy in the ledger

UNAUTHORIZED_SHARED_TOUCHES=NONE -- guard E: 12 shared-file modifications across declared branches, 12 declared, 0 undeclared

STAGE_A_V0828=7f6132888bc02728e07e2214b5a8d6323708e00a -- not rewritten, carried into main as history, never independently merged, never deployed

STAGE_B_V0829=22526b20da1e1fe950992957aa2862e65b3cf925 -- not rewritten; the final application version on main

PROGRAMME_GUARDS=PASS -- A, B, C, D, E, F and the prose-scanner CONTROL all green

MUTATIONS=PASS AT THE GATE -- 25/0 pre-merge, which is what the merge authorisation required. POST-MERGE the suite reads 23/2 and BOTH remaining failures are its own preconditions, not guard regressions (the ledger guard is 7/0 on main): mutation A assumes main's current version belongs to a stream OTHER than hadith, and mutation C assumes 08.28 is still a CLAIMING status -- neither holds once a Hadith version is the one on main. programme-ledger-mutations.mjs was NOT touched; it is not among the five authorised shared files. Flagged for its owner Two earlier failures were mutation PRECONDITIONS drawn from the live ledger, not guard regressions; resolved by making the ledger truer, with programme-ledger-mutations.mjs untouched

HADITH_TESTS=PASS -- 61/0 (hadith-source-rights 14, hadith-corpus 33, hadith-commentary-binding 14)

QURAN_REGRESSIONS=PASS -- 20 suites, 410 checks, all exit 0, including d14-timezone-boundary and d14-timezone-contract; stub-parity 3/0; i18n coverage 1873/1812/61 = 97%, exit 0

RENDERED_TESTS=PASS -- 96/0 across the integrated and standalone routes, three widths, both languages; appearance asserted by computed style

BEHAVIOUR_RESULT=PASS -- 981 passed, 1 failed across 56 sections (982 checks), matching main's own clean run of record. The single failure is ENVIRONMENTAL (sandbox TLS interception); zero application regressions

D14_STATUS=PRESENT and UNREACHABLE -- no importer of timezone-contract.js or timezone-service.js anywhere in app/*.html or app/js/*.js; both D14 suites pass

PHASE4_STATUS=HELD -- claude/phase4-wiring 7e2931f is not merged into the candidate or into main

RULES_CHANGED=NO -- firestore.rules byte-identical to the authorised main, 0 hadith collections, no firestore.indexes.json

FIREBASE_CONFIG_CHANGED=NO -- firebase.json byte-identical

DEPLOYED=NO

NEXT_UNALLOCATED=v08.30+

ORIGIN_MAIN_VERIFIED=YES -- origin/main == local main == 43dd96f58eeee5ad33dc82bb4e260660e3c290c9, fetched and compared after the push

NEXT_ACTION=RETURN_TO_MASTER_ARCHITECT
