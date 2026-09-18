# Hadith Stage A/B — Integration Candidate

**Date:** 2026-09-18 · **Type:** Integration preparation, executed under Master Architect re-authorisation.
**A candidate now exists.** It is **NOT merged**, **NOT deployed**, and **no further tranche was started**.

---

## 1. Baseline gate — EXACT MATCH, no movement

Fetched immediately before execution, as instructed.

| | |
|---|---|
| Authorised `origin/main` | `5ea0d928b8f326e0164c988ef79e4d1d1c168eeb` |
| Actual `origin/main` | **`5ea0d928b8f326e0164c988ef79e4d1d1c168eeb`** |
| Movement class | **NONE — exact match.** The benign-movement clause was not needed and was not used |
| `main` version | **v08.27** |

---

## 2. Integration — merge, not rebase; no accepted commit rewritten

`git merge origin/main` into `feature/hadith-study`, the same history-preserving method
used at `aef6cf3` and `85c35cf`. **The Hadith branch was never merged into `main`.**

| Check | Result |
|---|---|
| Merge outcome | **Clean, exit 0.** No conflicts, no manual resolution |
| Stage A `7f61328` | **present and unrewritten**, still stamping **v08.28** |
| Stage B `22526b2` | **present and unrewritten**, still stamping **v08.29** |
| Candidate HEAD | `2a308c5826feac1d051160ce7ae2862e9309d974` |
| Merge base | `5ea0d928…` — **the candidate now contains `main` in full** |
| Relationship | **0 behind, 15 ahead** |

### 2.1 No loss on either stream — verified file by file

**D14 foundation, from the current baseline:** `app/js/timezone-contract.js`,
`app/js/timezone-service.js`,
`docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules`,
`tools/i18n-verify/d14-timezone-boundary.mjs`,
`tools/i18n-verify/d14-timezone-contract.mjs` — **all present**.

**Hadith Stage A and Stage B:** `app/js/hadith-fixture-data.js`,
`app/js/hadith-corpus.js`, `app/js/hadith-browser.js`, `app/css/hadith.css`,
`app/hadith-study.html`, `tools/i18n-verify/hadith-corpus.mjs` — **all present**.

**Application version preserved at `v08.29`.** `main` is on v08.27 and does not touch
`app/js/version.js`, so no version conflict arose. **`v08.30` is not allocated and not
consumed.**

---

## 3. Governance corrections — three defects, all closed

### 3.1 The wrong version claim

`CLAUDE.md`'s Hadith block said *"This branch carries app version `08.28`"* while
`app/js/version.js` read **08.29** — true when Stage A landed, stale the moment Stage B
bumped. The block now states **v08.29** as the branch's final application version **while
keeping the history**: **v08.28 = Stage A (`7f61328`)**, **v08.29 = Stage B (`22526b2`)**.
It states in terms that **neither has ever been deployed or served to anyone**.

**The same defect was found in `app/js/version.js` itself**, and it is the worse of the
two because that file is the single source of truth: its comment **led with "08.28"**
above a constant reading **08.29**. Corrected, with the reason recorded in place. **The
constant itself is untouched.**

### 3.2 Canonical notation — and why it was the substantive half

`brief-integrity.mjs` scans the brief with `/\bv(0[78]\.\d{2})\b/` — **the `v` prefix is
required**. The Hadith block wrote bare `08.28` four times and no `v08.xx`, so **the
scanner could not see either Hadith version**, and its check *"every version the brief
names is also in `CHANGELOG.md`"* **passed vacuously** for both. It was not detecting
compliance; it was failing to look.

The block now uses canonical `v08.xx` throughout, which makes the guard **see** the
versions — and it then correctly demands the changelog entries §3.3 supplies.

**Proven non-vacuous, and the first attempt at proving it was itself wrong.** Removing
only the `## v08.29` **heading** left the check **passing**, because the check scans the
whole file and the entry body also names the version — a **partial mutation proving
nothing**, which is this project's own recorded lesson. Removing **every** occurrence
makes it fail, naming `08.29` exactly; the same again for `08.28`. **The guard was not
weakened anywhere.**

### 3.3 CHANGELOG entries for both milestones

`CHANGELOG.md` had **zero** entries for either version. Both are now appended, each
opening by stating plainly that it is **a development milestone on the unmerged branch
`feature/hadith-study`, never merged to `main`, never deployed, never served to anyone**,
and that `main` was on v08.27 throughout.

- **`## v08.28 — Hadith Stage A: the synthetic namespace, enforced`** — the `topic-salah`
  finding, the rename, the three GATE checks, the failing-then-passing evidence and the
  four mutations, and the collision that made v08.28 necessary.
- **`## v08.29 — Hadith Stage B: the corpus in the module, and Explore`** — the
  integration, the two defects found by probing and by looking, the registry proposal
  that allocates nothing, the Explore model this round got wrong first and corrected by
  measurement, and the `behaviour.mjs` regression with its narrow fix.

---

## 4. `behaviour.mjs`

**The accepted Stage-B exclusion is kept unchanged for this candidate. The proposed
multilingual shared-infrastructure redesign was NOT implemented.**

**`SHARED_CHANGE_REQUEST_01 = ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`**, recorded in the
Hadith block of `CLAUDE.md` alongside the constraint that the future platform solution
must distinguish **intentionally multi-language/multi-script content** from
`[data-i18n-skip]`, which means *"do not translate"* and is a different contract. **That
contract is not invented here.**

**The comment-only formatting defect was corrected, and the zero-behaviour condition was
proven rather than asserted:**

| Proof | Result |
|---|---|
| Comments stripped from both versions, compared byte for byte | **IDENTICAL — 228,004 bytes each** |
| Non-comment changed lines in the diff | **0** |

---

## 5. Programme Integration Ledger — NOT on `main`

**Reported, not recreated and not merged**, as instructed. The ledger foundation is on
the Quran stream's branch **`origin/claude/charming-rubin-xzxbk1`**, which is **not
merged into `main`**:

`docs/governance/programme-integration-ledger.json` ·
`tools/i18n-verify/programme-ledger.mjs` ·
`tools/i18n-verify/programme-ledger-mutations.mjs` · plus its two report files.

**This stream did not independently recreate any part of it**, and did not consume it.
Because it is absent from the authorised baseline, this candidate is not built against it
and complies with nothing from it. **When it lands on `main`, this candidate should be
re-verified against it before merge review concludes.**

---

## 6. Verification

### 6.1 Pure suites — 23 suites, 471 checks, **0 failures**, every one exit 0

| Group | Suites | Result |
|---|---|---|
| **Hadith** | `hadith-source-rights` 14 · `hadith-corpus` 33 · `hadith-commentary-binding` 14 | **61 / 0** |
| **D14 (from the new baseline)** | `d14-timezone-boundary` 10 · `d14-timezone-contract` 21 | **31 / 0** |
| **Quran / MAP regression** | `quran-boundary` 30 · `study-approach-contract` 13 · `…-boundary` 16 · `study-activity-evidence` 11 · `…-id` 29 · `…-store` 26 · `…-boundary` 17 · `note-foundation-boundary` 30 · `note-journal-evidence` 18 · `study-note-boundary` 17 · `journey-map-boundary` 13 · `firestore-index-requirements` 8 · `rules-authorisation-executable` 38 · `rules-deployment-candidate` 10 · `quran-word-identity-contract` 6 · `quran-word-progress-model` 57 · `quran-word-progress-data` 37 · `stub-parity` 3 | **379 / 0** |

### 6.2 `brief-integrity` — 7 passed, 1 failed (the known branch-scoped item)

The single failure is the milestone line's version against the working tree's, which is
right on `main` and wrong on any feature branch carrying a bump. **The milestone line is
the Quran/`main` side's to write**, so it is recorded and not patched, and **the guard is
not weakened**. Its CHANGELOG-coverage check now **passes non-vacuously** (§3.2).

### 6.3 i18n coverage — **1,873 scanned / 1,812 translated / 61 missing (97%)**, 1,642 catalogue entries, exit 0

### 6.4 Rendered Hadith verification — **96 passed, 0 failed**

Integrated route at phone, tablet and desktop in English and Bangla, plus the standalone
route and the Explore tab's content in both languages. Asserted by **computed style**
where appearance matters: the synthetic banner's `border-top-width` is `2px` and
`.hadith-row`'s background is `rgb(255, 255, 255)`, so the extracted stylesheet is proven
to travel rather than assumed. Screenshots captured and **read**.

**One assertion of mine failed six times and was WRONG, not the code — established, not
waved away.** *"ZERO Firestore requests"* on the **integrated** page matched
`firebase-firestore.js`, the SDK **script** URL, because the pattern `/firestore/` matches
the filename. Proven to be the pre-existing shared renderer rather than the corpus: the
identical request appears on **`deen-study.html`**, a sibling topic-study page with **no
Hadith corpus at all**. The assertion was corrected to measure Firestore **data** traffic.

**The decisive measurement — the corpus alone, on the standalone route:**

| Metric | Result |
|---|---|
| Firebase SDK loads | **0** |
| Firestore data requests | **0** |
| Stub document operations (`__fsLog`) | **0** |

### 6.5 `behaviour.mjs`

**981 passed, 1 failed, 56 sections — 982 checks.** This **matches `main`'s own clean run
of record exactly** (the brief records *"981 pass / 1 fail, 982 checks, the one failure
31e's TLS artefact — and the 22g trio PASSED it"*).

| Failure | Class |
|---|---|
| `31e` no page errors — `net::ERR_CERT_AUTHORITY_INVALID` | **Environmental** — the sandbox's TLS interception. It will not occur for the Owner |

**Zero application failures.** The archive.org trio (`22g` ×3) **passed this run**, which
is consistent with the brief's recorded finding that those three are **intermittent, not
permanent** — so their passing is not evidence of a changed baseline any more than their
failing was.

### 6.6 Structural gates — proven, not asserted

| Check | Result |
|---|---|
| **D14 remains unreachable** | **No importer** of `timezone-contract.js` or `timezone-service.js` anywhere in `app/*.html` or `app/js/*.js`; `d14-timezone-boundary` asserts it and passes |
| `firestore.rules` vs authorised `main` | **IDENTICAL** (sha256 begins `8fd7f52b2a7c9097`); **0** `hadith` collections |
| `firebase.json` vs authorised `main` | **IDENTICAL** |
| `firestore.indexes.json` | **ABSENT** |
| `app/js/catalogue.js`, `catalogue-data.js` | **IDENTICAL — no Approach ID allocated** |
| `app/js/topic-study.js` (shared renderer) | **IDENTICAL** |

---

## 7. Merge prediction against `5ea0d928…`

**Read-only.** `git merge-tree --write-tree` writes no ref and touches no worktree.

| | |
|---|---|
| **Textual conflicts** | **ZERO** — exit 0, result tree `cd801d9a92c53b7ce6ff58375f5967138b7b0dc0` |
| Relationship | **0 behind, 15 ahead** — the candidate contains `main` in full |
| **Predicted merge** | **FAST-FORWARD.** `origin/main` is an ancestor of the candidate |
| **Exact candidate diff** | **33 files changed, 6,256 insertions, 6 deletions** |
| **Resulting `version.js`** | **`export const APP_VERSION = "08.29";`** — the constant untouched by this tranche; only its comment corrected |

### 7.1 Semantic / shared-file changes — the complete set

| File | Class | Change vs authorised `main` | Authorised by |
|---|---|---|---|
| `app/js/version.js` | platform | **+16 / −1** — constant v08.27→v08.29 (from Stage A/B), comment corrected here | tasks 2, 3 |
| `CLAUDE.md` | brief | **+65 / −0** — Hadith-owned block only | task 3 |
| `CHANGELOG.md` | log | **+127 / −0** — the two milestone entries | task 3 |
| `app/js/i18n/bn.js` | platform | **+68 / −0** — purely additive, **0 deletions** | accepted in Stage A/B |
| `tools/i18n-verify/behaviour.mjs` | shared verification | **+27 / −5** — the accepted Stage-B exclusion, plus a comment-only reformat | accepted in Stage B; task 4 |

**Only 6 deleted lines exist in the entire candidate**: 1 in `version.js` (the old
constant line) and 5 in `behaviour.mjs` (the replaced `querySelectorAll` line and the
reflowed comment). **Nothing else anywhere is removed.**

### 7.2 Resulting governance and CHANGELOG state

**Governance:** the brief's Hadith block states **v08.29** as the branch's final version,
records **v08.28 = Stage A** and **v08.29 = Stage B**, says neither was ever deployed,
uses canonical `v08.xx` throughout, and carries
`SHARED_CHANGE_REQUEST_01 = ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`. The Quran-owned
milestone line is **untouched**.

**CHANGELOG:** both milestones present as `## v08.28 …` and `## v08.29 …`, each stating
it is an unmerged development milestone. `brief-integrity`'s coverage check sees both and
**fails if either is removed** — proven.

---

## 8. Flagged for the Quran / shared-file owner — NOT changed from here

**`CLAUDE.md`'s Quran-owned VERSION NUMBERING NOTE is now stale**, and this stream caused
it. It reads *"At merge its `version.js` conflicts and resolves to the next free number —
**08.28** as of this line"* about the held Phase 4 wiring; **Stage A consumed v08.28 and
Stage B consumed v08.29**, so the next free number is now v08.30.

**Not edited** — it is Quran-owned text about a Quran-owned branch, and editing it from
here is exactly the silent shared-file edit the discipline forbids. It also
**self-mitigates**: its own last sentence says *"Read the number off `main` at the time of
the merge rather than trusting this sentence's own arithmetic."*

**Also standing:** `brief-integrity`'s milestone-line failure (§6.2), which only the
Quran side can clear.

---

## 9. Gates — all CLOSED

No real corpus, translation or commentary embedding · no permanent Hadith semantic key ·
**no Approach ID allocation** (`catalogue*.js` byte-identical) · no durable Track · no
Notes/MMJ persistence · no Rules or index activation · no migration · **no merge into
`main`** · no deployment · **no next feature tranche started** · **v08.30+ unallocated**.

## 10. Firestore Rules — the two facts, separately

**REPOSITORY:** `firestore.rules` and `firebase.json` are **byte-identical to the
authorised `main`**; `firestore.rules` contains **0** `hadith` collections; no
`firestore.indexes.json` exists. This proves repository content and nothing else.

**DEPLOYMENT: UNVERIFIED.** No `firebase` CLI, no `gcloud`, no credentials; the Firebase
Rules API returns **HTTP 403 PERMISSION_DENIED** to an unregistered caller. The deployed
ruleset has not been inspected and cannot be inspected from this environment. **No
inference — of success or failure — may be drawn about any production write from
repository content.**

---

## HADITH_INTEGRATION_CANDIDATE

The block below is one `KEY=value` per line, blank-separated so each key survives as its
own line in the HTML rendering as well as the Markdown.

STATUS=CANDIDATE_READY_FOR_MASTER_ARCHITECT_MERGE_REVIEW

AUTHORIZED_MAIN_SHA=5ea0d928b8f326e0164c988ef79e4d1d1c168eeb

ACTUAL_MAIN_SHA=5ea0d928b8f326e0164c988ef79e4d1d1c168eeb

MAIN_MOVEMENT_CLASS=NONE — exact match at the gate; the benign-movement clause was not needed and not used

MAIN_VERSION=v08.27

BRANCH=feature/hadith-study

HEAD=2a308c5826feac1d051160ce7ae2862e9309d974

MERGE_BASE=5ea0d928b8f326e0164c988ef79e4d1d1c168eeb (the candidate contains main in full; 0 behind, 15 ahead)

STAGE_A_SHA=7f6132888bc02728e07e2214b5a8d6323708e00a

STAGE_A_VERSION=v08.28

STAGE_B_VERSION=v08.29

CANDIDATE_VERSION=v08.29 (v08.30+ NOT allocated, NOT consumed)

D14_PRESENT=YES — timezone-contract.js, timezone-service.js, the tenantPeople Rules candidate and both d14 suites all present; d14-timezone-boundary 10/0 and d14-timezone-contract 21/0; UNREACHABLE confirmed, no importer in app/*.html or app/js/*.js

GOVERNANCE_DRIFT_FIXED=YES — three defects closed: CLAUDE.md said 08.28 while version.js said 08.29; version.js's OWN comment carried the same defect in the single source of truth; CHANGELOG.md had no entry for either. Stage A = v08.28 and Stage B = v08.29 history preserved; neither claimed deployed or live

CANONICAL_VERSION_NOTATION=YES — brief and version.js use v08.xx throughout. brief-integrity.mjs scans /\bv(0[78]\.\d{2})\b/ so bare "08.28" was INVISIBLE and its CHANGELOG check passed VACUOUSLY. Proven non-vacuous by COMPLETE mutation: removing every occurrence of v08.29 fails the check naming 08.29, same for 08.28. A first partial mutation (heading only) still passed and proved nothing. Guard NOT weakened

CHANGELOG_0828=PRESENT — "## v08.28 — Hadith Stage A: the synthetic namespace, enforced (18 Sep 2026)", explicitly an unmerged development milestone, never merged, never deployed, never served

CHANGELOG_0829=PRESENT — "## v08.29 — Hadith Stage B: the corpus in the module, and Explore (18 Sep 2026)", same explicit framing; final candidate version

SHARED_FILES_CHANGED=app/js/version.js +16/-1 (constant from Stage A/B; comment corrected here); CLAUDE.md +65/-0 (Hadith-owned block only; Quran milestone line untouched); CHANGELOG.md +127/-0 (the two entries); app/js/i18n/bn.js +68/-0 (additive, zero deletions, accepted in Stage A/B); tools/i18n-verify/behaviour.mjs +27/-5 (accepted Stage-B exclusion plus a comment-only reformat). NO deployment/security file changed

BEHAVIOUR_DEFERRED_DEBT=SHARED_CHANGE_REQUEST_01=ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED. Stage-B exclusion kept; redesign NOT implemented; the future platform contract must distinguish intentionally multi-language/multi-script content from data-i18n-skip and is NOT invented here. Comment-only reformat proven zero-behaviour: comment-stripped files byte-identical at 228,004 bytes, 0 non-comment changed lines

PROGRAMME_LEDGER_ON_MAIN=NO — the foundation is on origin/claude/charming-rubin-xzxbk1 (5 files) and is NOT merged into main. Not recreated, not merged, not consumed by this stream. Re-verify this candidate against it once it lands

TEST_RESULT=PASS — 23 pure suites, 471 checks, 0 failures, all exit 0 (Hadith 61, D14 31, Quran/MAP 379). brief-integrity 7/1 (the known branch-scoped milestone item, recorded not patched). i18n coverage 1873/1812/61 = 97%, exit 0. Rendered Hadith 96/0. behaviour.mjs 981 passed / 1 failed across 56 sections (982 checks), matching main's own clean run of record. Structural gates all hold: firestore.rules and firebase.json identical to main, catalogue*.js identical (no Approach ID), topic-study.js identical, D14 unreachable

ENVIRONMENTAL_FAILURES=1, all environmental and none application: archive.org screensaver caption / alt text / poster URL (recorded as INTERMITTENT) and the sandbox TLS ERR_CERT_AUTHORITY_INVALID. Separately, one rendered assertion of mine failed six times and was a WRONG ASSERTION, not a defect: it matched the firebase-firestore.js SDK script URL; the identical request appears on deen-study.html which has no corpus. Corrected. The corpus alone on the standalone route makes 0 SDK loads, 0 Firestore data requests and 0 document operations

MERGE_PREDICTION=ZERO textual conflicts. git merge-tree --write-tree exits 0, result tree cd801d9a92c53b7ce6ff58375f5967138b7b0dc0, no conflicts; read-only, HEAD and worktree unchanged. origin/main is an ancestor, so a merge would FAST-FORWARD. Candidate diff 33 files, +6256/-6; only 6 deleted lines in total (1 in version.js, 5 in behaviour.mjs). Resulting version.js: APP_VERSION = "08.29"

RULES_REPOSITORY_STATUS=UNCHANGED — firestore.rules and firebase.json byte-identical to the authorised main; 0 hadith collections; no firestore.indexes.json

RULES_DEPLOYMENT_STATUS=UNVERIFIED — no firebase CLI, no gcloud, no credentials; Rules API returns HTTP 403 PERMISSION_DENIED (unregistered caller). Deployed ruleset not inspected and not inspectable from this environment

READY_FOR_MASTER_ARCHITECT_MERGE_REVIEW=YES — candidate exists at 2a308c5826feac1d051160ce7ae2862e9309d974, clean against the authorised baseline, fast-forward predicted, all gates closed. NOT merged, NOT deployed, no next tranche started. One item flagged for the Quran/shared-file owner: the stale Quran-owned VERSION NUMBERING NOTE, whose "next free number 08.28" this stream consumed; not edited from here
