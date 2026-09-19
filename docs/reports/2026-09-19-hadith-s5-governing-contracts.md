# Hadith S5 — governing contracts pinned, and the live C2 Records path documented

**Date:** 2026-09-19 · **Type:** Hadith-owned, test and documentation only.
**No reachable application behaviour, shared platform file, Rules, corpus content or version changed.**

---

## 1. Exact position

| | |
|---|---|
| Branch | `feature/hadith-study` |
| **Branch tip (pushed)** | **`873af4078c1641f5da33f7c87acaccdec34742da`** |
| S5 work commit | `873af40` (this report is the commit after it) |
| Branch base | `db6cb24` — `main` as it stood when this tranche began |
| **`origin/main` now** | **`a64e2a1c97f397aba26bdfa281fdf4f2b5486547`, v08.31** |
| Branch vs current main | **10 behind, 4 ahead** |
| Branch `version.js` | **08.30** — adopted from the base, **not stamped by this stream** |
| `nextUnallocated` | **08.32** |

**`main` moved from v08.30 to v08.31 during this tranche** — the QuranRevival integration the
ruling described as pending has landed. The Hadith branch was **not merged into `main`**, per
the ruling, and `main` was **not merged into the branch** either: doing so mid-delivery would
have changed the tip and the version under the numbers reported here without resolving
anything in §6. It is the first action of the next tranche.

**A correction to my previous report.** It recorded `nextUnallocated: 08.31`, true when
written. `main` has since taken v08.31 and the ledger now reads **08.32** — which is what the
authorising instruction said. **Nothing was allocated by this tranche either way.**

---

## 2. Changed files — the complete set

Measured against the branch's own base, `db6cb24`. Measuring against *current* `main` would
be misleading: `main` is 10 commits ahead, so its own work shows up as differences.

| File | Kind |
|---|---|
| `tools/i18n-verify/hadith-governing-contracts.mjs` | **added** — the S5 guard, 14 checks |
| `tools/i18n-verify/hadith-gate-contracts.mjs` | added — the accepted `a03081a` guard |
| `docs/governance/hadith-c2-live-records-path-2026-09-19.md` | **added** — the C2 documentation |
| `docs/reports/2026-09-19-hadith-gate-contract-guard.{md,html}` | added — the previous report |

**Five added files. Nothing modified, nothing deleted.** Verified untouched against that base:
`app/` entirely, `firestore.rules`, `firebase.json`, `CLAUDE.md`, `CHANGELOG.md`,
`app/js/version.js`, `app/js/i18n/bn.js`, `tools/i18n-verify/behaviour.mjs` and
`docs/governance/programme-integration-ledger.json`. **BR-0.**

---

## 3. S5 — the two contracts bound to their documents

Both were already asserted — **against literals retyped into the suites.**
`hadith-commentary-binding.mjs` retypes the Arabic panel title and four *lowercase fragments*
of the prohibitions; `hadith-source-rights.mjs` retypes the three rights states. A retyped
copy agrees with itself while the document moves underneath it — the drift ADR-009 closed for
`noteSources` by reading the vocabulary out of its document at both ends.

Three parts of the governing documents were bound to **nothing at all**: the commentary
manifest's `displayContract`, the source manifest's `rightsStateMeanings`, and
`vocabularyReconciliation`.

`tools/i18n-verify/hadith-governing-contracts.mjs` — **14 checks, 14 passed, 0 failed.**

**Display contract** — panel titles read from `displayContract` rather than retyped; every
prohibition carried **verbatim**, not by fragment, because a fragment match accepts a rule
softened around the words it happens to contain; the six `perEntryFields` present and
non-empty on every verified entry; the document's prose rules asserted against
`renderPermission()`'s real output for `link-only` and `embed-cleared`; and the claimed
"about twice the English size" Arabic scale checked against the Hadith-owned stylesheet.

**The direction of divergence is what is asserted, not equality.** The module carries one
prohibition the register does not — *attaching a verified match to a synthetic narration*,
added by H2. Stricter is allowed and must be traceable; **looser or replaced is not.**

**Rights vocabulary** — the three states read from `rightsStateMeanings` rather than retyped;
`blocked` proven to refuse **even the outbound link**, with a legible reason (I15); `link-only`
proven to grant link and citation while refusing text; an **unknown or missing** `rights_status`
proven to fail closed exactly as `blocked` does; and the **retired term `licensed`** proven
absent from every Hadith module.

### 3.1 Mutation results — six, each caught by the intended check

| Mutation | Caught by |
|---|---|
| **The register revises its Arabic panel title** *(mutates the GOVERNING DOCUMENT)* | *the panel titles are the document's own* |
| A prohibition softened in code | *every prohibition … carried VERBATIM* (+ the direction check) |
| `renderPermission` leaks text at `link-only` | *'while link-only: render NO commentary text'* (+ the rights check) |
| `blocked` gains an outbound link | *'blocked' means every permission is false* (+ fail-closed) |
| The retired term `licensed` returns | *the RETIRED term never reappears* (+ fail-closed) |
| The Arabic scale dropped to body size | *the Arabic type scale … is real in the stylesheet* |

**The first mutation is the one that matters**: changing the *document* breaks the binding.
That is the whole purpose of reading the contract from there rather than retyping it.

---

## 4. The live C2 Records path — documented, nothing changed

`docs/governance/hadith-c2-live-records-path-2026-09-19.md`.

| Question | Answer |
|---|---|
| **Entry point** | `app/records.html` — the **platform** Records surface. `#unitTypeSelect` is populated from `UNIT_TYPES`, which contains `hadith`, so **"Hadith" is offered in the picker**. `#unitRef` is free text. `buildUnitKeyFromInput()` ≈ line 262; the `case "hadith"` branch ≈ line 279; the save path ≈ line 529 into `claimStatus()` |
| **Key produced** | `hadith:${collectionName}:${number}` — e.g. **`hadith:bukhari:5678`**. The reference is split on `:` and **neither segment is validated against any registry**. `hadith:bukhari:1`, `hadith:Bukhari:1` and `hadith:al-bukhari:1` are three different permanent keys for one narration. That is C2, live |
| **Where it may persist** | `hadith` is not in `SURAH_CHUNKED_TYPES`, so `chunkKeyFor` returns `subject_${subjectId}`. Document **`records/{tenantId}__{personId}__subject_{subjectId}`**, field **`entries.{unitKey}::{trackableId}`** — e.g. `entries.hadith:bukhari:5678::studied_hadith` |
| **Inventory needed** | A **read-only** scan of **every** `records` document for entry keys beginning `hadith:`, collecting the distinct collection-name spellings and counts, the numeric range against the 6-digit bound, and whether any entry is **confirmed** (I6) |

**The subtlety that decides the inventory's shape:** `chunkKeyFor` takes the **selected
subject**, not the unit type. A `hadith:` key lands in whatever subject chunk was open, so
**an inventory querying only `subject_hadith` can miss real records.** It must scan every chunk.

**One brake exists and is not a guarantee:** the form refuses to save without a `trackableId`,
and the only Hadith-side trackable is the generic `studied_hadith` row. That limits volume; it
does not prevent the key.

**Nothing was changed.** No key generation altered, no record migrated, no unit key applied.
`unit-keys.js`, `study-note-binding.js` and `records.html` are untouched.

---

## 5. Test results

| Suite | Result |
|---|---|
| **`hadith-governing-contracts` (new)** | **14 / 0**, mutation-proven 6 ways |
| `hadith-gate-contracts` | 11 / 0 |
| `hadith-source-rights` · `hadith-corpus` · `hadith-commentary-binding` | 14 / 33 / 14 — **61 / 0** |
| `stub-parity` · `quran-boundary` | 3 / 0 · 30 / 0 |
| `study-event-wiring` · `rules-authorisation-executable` | 39 / 0 · 38 / 0 |
| `brief-integrity` | **7 / 1** — §6 |
| `programme-ledger` · its mutations | **4 / 20 / 3** and **36 / 1** — §6 |

`app/` is byte-identical to the base, so no rendered or `behaviour.mjs` run is warranted —
there is nothing reachable to re-measure.

---

## 6. The red guards — diagnosed, and one is mine

**All three failures are about versions and baselines. None is caused by this tranche's five
added files**, proven by removing them: the ledger still failed identically.

### 6.1 Two are staleness — the branch is 10 behind a `main` that moved mid-tranche

- **`brief-integrity`**: the brief in my tree says *"v08.30 on `main`"*; `main` now reads
  **08.31**. My copy of `CLAUDE.md` is simply the one from `db6cb24`.
- **`programme-ledger` [F]**: my tree's ledger records `main` at 08.30; `main` reads 08.31.
  **`main`'s own ledger already says 08.31** — only my stale copy disagrees.

**Both resolve by merging current `main` into the branch**, and neither is a defect in
anything this tranche produced.

### 6.2 One is a real drift this stream caused — and a lesson worth keeping

**`programme-ledger` [A] and [B]:** the ledger records the Hadith stream's
`declaredVersion: 08.29` and `branchTip: c1a4f19`, while `origin/feature/hadith-study` is now
stamped **08.30**. Guard A calls it a disagreement; guard B calls 08.30 "an invented version"
under stream `hadith`, because 08.30 belongs to `quran`.

**The cause is mine.** The previous tranche fast-forwarded the branch onto `main`, so it
adopted `main`'s stamp; its own v08.29 is merged and it carries no version of its own any
more. **`main`'s current ledger still has the stale record** — `declaredVersion: 08.29`,
`branchTip: c1a4f19`.

> **THE LESSON: `programme-ledger.mjs` reads `origin/<activeBranch>`, so it validates the
> REMOTE, not the working tree.** In the previous tranche I ran it **before pushing** — it
> read `c1a4f19` (stamped 08.29), agreed, and passed. The push then made the remote something
> the guard had never seen. **A guard that reads the remote must be re-run after the push.**
> This tranche did exactly that, which is how all three failures surfaced at all.

**Not repaired here.** The fix is a field on the Hadith stream's record inside
`docs/governance/programme-integration-ledger.json` — a **shared platform file** this
tranche is forbidden to change, and the ruling says to pause at a shared integration boundary.

**The exact minimal repair, for whoever owns the ledger:** the Hadith stream's branch tracks
`main` and no longer carries a version of its own, so `declaredVersion: "08.29"` and a
main-tracking `activeBranch` cannot both be true. Either **`declaredVersion: null`** (the
stream carries no independent stamp) **or `activeBranch: null`** (accepting that it stops
cross-checking the branch) resolves A and B. `branchTip` should also move from `c1a4f19` to
the current tip. **The first option is the truer one** and keeps the branch cross-check alive.

---

## 7. Dependencies and remaining gates

| Dependency | Status |
|---|---|
| **MMSA / Quran contracts** | **None consumed.** This tranche only observes `hadith-commentary.js`, the two manifests and `app/css/hadith.css`, all Hadith-owned |
| **Version allocation** | **None required, none taken.** `nextUnallocated` is **08.32** |
| **Source rights** | Unchanged, still fail-closed. Zero editions cleared, nothing fetched. The `embed-cleared` branch of the display contract is **unreachable today**, and the suite says so rather than implying it has been proven |
| **Owner decisions** | **C2** (the permanent key) — better evidenced by §4, still open. **The Approach registry** — still open |
| **Shared integration boundary** | **§6.2 — reached and paused at**, as the ruling directs |

**Gates all remain CLOSED:** no real corpus, translation or commentary embedding · no
permanent Hadith semantic key applied · no Approach ID allocated · no durable Track · no
Notes/MMJ persistence · no Rules or index activation · no migration · **no deployment** ·
**no merge into `main`** · no version consumed.

**Firestore Rules — REPOSITORY:** `firestore.rules` and `firebase.json` untouched; 0 `hadith`
collections. **DEPLOYMENT: UNVERIFIED** — not inspectable from this environment.

---

## 8. Session-change assessment

| Question | Assessment |
|---|---|
| Reachable application behaviour | **None changed.** `app/` byte-identical to the branch base |
| Shared platform files | **None changed.** All nine checked individually |
| Rules / Firebase config | **Untouched** |
| Corpus content | **Untouched.** No source fetched, cached or embedded in this session |
| Version | **Not changed and not allocated.** Branch carries the base's 08.30, which this stream did not stamp |
| Risk introduced | **None reachable.** Two new test files and one governance document. Deleting all five returns the branch to its base exactly |
| Risk *discovered* | **Two, both reported not acted on:** C2 is live in the Records surface (§4), and the ledger's Hadith record is stale (§6.2) |
| Merge readiness | **Not proposed.** The branch is 10 behind `main` and the ruling forbids merging while the v08.31 integration settles |

---

## HADITH_S5

One `KEY=value` per line, blank-separated so each survives as its own line in the HTML.

STATUS=COMPLETE_AWAITING_MASTER_ARCHITECT

BRANCH=feature/hadith-study

BRANCH_TIP=873af4078c1641f5da33f7c87acaccdec34742da (S5 work commit; this report is the commit after it)

BRANCH_BASE=db6cb24b807d77630914e076d413bec6982cc3d7

ORIGIN_MAIN=a64e2a1c97f397aba26bdfa281fdf4f2b5486547 at v08.31 -- main moved from v08.30 during this tranche

BRANCH_VS_MAIN=10 behind, 4 ahead. NOT merged either way, per the ruling

BRANCH_VERSION=08.30 -- adopted from the base, not stamped by this stream

VERSION_ALLOCATED=NONE -- nextUnallocated is 08.32, which matches the instruction; my previous report said 08.31, true when written and since taken by main

CHANGED_FILES=5 ADDED, 0 modified, 0 deleted, measured against the branch base: hadith-governing-contracts.mjs, hadith-gate-contracts.mjs, hadith-c2-live-records-path-2026-09-19.md, and the previous report .md/.html

PLATFORM_FILES_CHANGED=NONE -- app/, firestore.rules, firebase.json, CLAUDE.md, CHANGELOG.md, version.js, i18n/bn.js, behaviour.mjs and the programme ledger all verified untouched against the base

S5_RESULT=PASS -- hadith-governing-contracts 14/0, mutation-proven 6 ways including one that mutates the GOVERNING DOCUMENT rather than the code

C2_DOCUMENTED=YES -- entry point (records.html unit-type picker offering Hadith from UNIT_TYPES, buildUnitKeyFromInput hadith branch), key (hadith:<collectionName>:<number>, both segments unvalidated free text), persistence (records/{tenant}__{person}__subject_{subjectId}, entries.<unitKey>::<trackableId>), and the read-only inventory. Key generation NOT changed, no record migrated

C2_INVENTORY_SUBTLETY=chunkKeyFor takes the SELECTED SUBJECT, not the unit type, so an inventory querying only subject_hadith can miss real records; it must scan every records chunk

TEST_RESULT=Hadith suites 75/0 across four (governing-contracts 14, gate-contracts 11, source-rights 14, corpus 33, commentary-binding 14 = 86 total checks, 0 failures); stub-parity 3/0; quran-boundary 30/0; study-event-wiring 39/0; rules-authorisation-executable 38/0

RED_GUARDS=3, none caused by this tranche's files (proven by removing them). brief-integrity 7/1 and programme-ledger [F] are STALENESS -- the branch is 10 behind a main that moved to v08.31 mid-tranche. programme-ledger [A][B] is a REAL drift this stream caused: the ledger records hadith declaredVersion 08.29 and branchTip c1a4f19 while the branch now carries main's 08.30

LESSON=programme-ledger.mjs reads origin/<activeBranch>, so it validates the REMOTE. The previous tranche ran it BEFORE pushing, so it agreed with a remote that the push then replaced. A guard reading the remote must be re-run AFTER the push -- done here, which is how all three failures surfaced

SHARED_BOUNDARY=REACHED AND PAUSED AT -- repairing [A][B] needs a field in docs/governance/programme-integration-ledger.json, a shared platform file this tranche may not change. Minimal repair: set the hadith stream's declaredVersion to null (truer, keeps the branch cross-check) or activeBranch to null, and move branchTip off c1a4f19

REMAINING_GATES=real corpus (rights); permanent Hadith key C2 (Owner + read-only production inventory); Approach registry (Owner); durable Track, Notes and MMJ (Rules deployment); no merge to main while v08.31 settles

RULES_REPOSITORY_STATUS=UNCHANGED -- firestore.rules and firebase.json untouched, 0 hadith collections

RULES_DEPLOYMENT_STATUS=UNVERIFIED -- not inspectable from this environment

SESSION_CHANGE_ASSESSMENT=BR-0. No reachable behaviour, no shared file, no Rules, no corpus, no version. Two new test files and one governance document; deleting all five returns the branch to its base exactly. Two risks DISCOVERED and reported rather than acted on: C2 live in Records, and the stale ledger record

NEXT_ACTION=RETURN_TO_MASTER_ARCHITECT
