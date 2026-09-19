# Hadith — Owner Control Gate contracts pinned (safe tranche)

**Date:** 2026-09-19 · **Type:** Hadith-owned test work, resumed independently of the Quran stream.
**No reachable application behaviour changed. No shared file changed. No version allocated.**

---

## 1. Current position

| | |
|---|---|
| Branch | `feature/hadith-study` |
| **SHA at delivery** | **`a03081a`** |
| Branch before this work | `c1a4f19` — fully merged into `main`, 11 behind |
| `origin/main` | `db6cb24b807d77630914e076d413bec6982cc3d7` |
| `main` application version | **v08.30** (MAP Phase 4, the Quran stream) |
| This branch's version | **v08.30 — main's own.** Not bumped, not stamped |
| `nextUnallocated` (ledger) | **v08.31** |

The branch was **fast-forwarded onto current `main`** before any work, so everything below
was measured against the guards that actually exist rather than the ones that existed when
v08.29 merged. It had nothing of its own ahead: the Hadith v08.29 integration is in `main`.

**One correction to the instruction, stated because a version number must never be guessed:**
the instruction says *"v08.32 has not been allocated"*. The ledger records **`nextUnallocated:
08.31`** — v08.31 is also free. Either way **nothing was allocated or consumed here**, and
`app/js/version.js` is byte-identical to `main`.

---

## 2. The roadmap's next tranche, and why it is not buildable

**There is no `H2-C` or `H3` defined anywhere** — a grep across every Hadith report and
governance file returns nothing. The roadmap's own statement of what comes next is
**H1 §9, "What H2 needs before it can start"**, plus the H2-B registry proposal's §4. Read
against today's repository, every remaining item is gated:

| Roadmap item | Original source | Gate |
|---|---|---|
| Real corpus / edition approval | H1 §9.2; Source Register | **Owner decision + rights.** Zero editions cleared |
| Permanent Hadith unit key | H1 §5; H0 contradiction **C2** | **Owner Control Gate** + a live read of production `hadith:` records, which this environment cannot perform |
| Hadith Approach registry | H2-B proposal §4 | **Owner decision.** No id may be minted first |
| Durable Track | H0 §5 / C4 | **Firestore Rules deployment**, which Hadith cannot clear |
| Notes / MMJ surfaces | H0 §5 / C4 | Same deployment gate |
| Rules / index activation | H1 §8 | Same |

**So the roadmap authorises no feature tranche today, and none was invented.** What it does
authorise — and what the instruction names — is *documentation, source-rights verification
and tests*. This tranche is the third.

---

## 3. What was done: the two gates made checkable

Both Hadith decisions held behind Owner Control Gates are **proposals that rest on facts
about code the Hadith stream does not own**. Every one of those facts lived only in prose.
The Quran side could tighten a regex, renumber the Approaches, or tidy the key builder, and
the recorded proposals would quietly become wrong with **nothing failing anywhere**.

`tools/i18n-verify/hadith-gate-contracts.mjs` — **11 checks, one new Hadith-owned file.**
It asserts what *is*, so that changing any of it becomes a deliberate decision.

### 3.1 Gate C2 — the permanent Hadith unit key

- `buildUnitKey.hadith` still produces the **name-keyed** `hadith:<collectionName>:<number>`,
  which is H0's recorded contradiction with **I5** (*units are keyed by permanent ID, never
  by name*). Built through `buildUnitKey`, not typed as a literal.
- The **accepted regex** in `study-note-binding.js` still admits the **proposed**
  `hadith:<editionId>:<ordinal>` form — without which H1 §5 is unimplementable.
- …and still admits the **legacy** name-keyed form, so applying the proposal would orphan
  no existing record (**I4 / I16**).
- The **6-digit bound is exact**: `999999` accepted, `1000000` rejected, empty edition and
  empty ordinal both rejected.
- The regex is **read out of the app**, not retyped, with a positive control — a retyped
  copy would agree with itself while the app disagreed.

### 3.2 Gate APPROACH — the Hadith Approach registry

- The 30 Quran Approaches intact, `approach_01`…`approach_30`, no duplicates.
- **No Hadith Approach id exists** anywhere in the catalogue.
- `studied_hadith` is still a **generic module row** — `moduleId: "hadith"`, `subjectId:
  null`, named `"Studied"` — and not describing itself as an Approach.
- The seed still hardcodes `moduleId: "quranrevival"` and `subjectId: "quran"`, **which is
  the registry proposal's own stated reason** for refusing to reuse `approach_NN`.
- No `app/js/hadith-*.js` names `approach_`, `studied_hadith`, `trackableId` or
  `APPROACH_TEMPLATES`.

---

## 4. The finding — C2 is LIVE, not latent, and my own check is what found it

The check first asserted that **nothing** builds a Hadith unit key. **It failed**, and the
failure is the most useful thing in this tranche:

> `app/records.html` carries a generic unit-key switch covering every unit type, `hadith`
> included (`case "hadith": … buildUnitKey.hadith(c, n)`), and it **predates the Hadith
> stream entirely**.

So the C2 contradiction is not a latent conflict waiting on a decision — **a permanent Study
Unit key built from a collection *name* is reachable in the live Records surface today.**
Anyone recording a Hadith claim there creates a name-keyed permanent key, against I5.

**My assertion was wrong, not the application**, and the check was corrected to pin reality
rather than the assumption: the one pre-existing **platform** caller is recorded by name, and
the check now fails if **any Hadith-owned file** starts applying the undecided key — which
would be this stream pre-empting an Owner Control Gate.

**This materially strengthens the case for deciding C2**, and it is reported rather than
acted on: `unit-keys.js`, `study-note-binding.js` and `records.html` are all untouched.

---

## 5. Test results

**The new suite: 11 passed, 0 failed.** Mutation-proven **six ways**, each caught by the
intended check:

| Mutation | Caught by |
|---|---|
| The builder made edition-keyed | *the LIVE builder is still NAME-keyed* |
| Regex tightened to the proposal alone | *…still admits the LEGACY form* (+ the positive control) |
| Bound widened to 7 digits | *the 6-digit bound is EXACT* |
| A Hadith Approach id allocated | *NO Hadith Approach id has been allocated* |
| `studied_hadith` given a `subjectId` | *studied_hadith is still a GENERIC module row* |
| Seed stops hardcoding the Quran subject | *the seed still binds every Approach to Quran* |

**Two of those mutations silently failed to apply on the first attempt** and were redone
against the real shape — the trackable templates come from a `studiedTemplate()` factory,
not a literal, so the `sed` matched nothing. Read naively that would have said two checks
were blind; the checks were fine and **the mutations were the defect**. Recorded because a
partial mutation proves nothing.

**Regression — 12 suites, all exit 0:**

| Suite | Result |
|---|---|
| `hadith-gate-contracts` (new) | **11 / 0** |
| `hadith-source-rights` · `hadith-corpus` · `hadith-commentary-binding` | 14 / 33 / 14, **61 / 0** |
| `programme-ledger` | **7 passed, 20 noted, 0 failed** |
| `programme-ledger-mutations` | **37 / 0** |
| `brief-integrity` | **8 / 0** |
| `stub-parity` · `quran-boundary` | 3 / 0 · 30 / 0 |
| `study-event-wiring` (the Quran stream's new v08.30 guard) | **39 / 0** |
| `d14-timezone-boundary` · `d14-timezone-contract` | 10 / 0 · 21 / 0 |

**Blast radius: BR-0.** `git status` shows exactly one added file. `app/` is untouched, so
no rendered or `behaviour.mjs` run is warranted — there is nothing reachable to re-measure.

---

## 6. Dependencies

| Dependency | Status |
|---|---|
| **MMSA / Quran contracts** | **None consumed, none needed.** This tranche only *observes* `unit-keys.js`, `study-note-binding.js` and `catalogue*.js`; it changes none of them. The new file sits under `tools/i18n-verify/hadith-*.mjs`, already the Hadith stream's owned path in the ledger, so it is **not** a shared touch — the ledger guard confirms 0 undeclared |
| **Version allocation** | **None required.** No reachable behaviour changed, so no bump is owed. v08.31 stays `nextUnallocated` |
| **Source rights** | **Unchanged and still fail-closed.** Zero editions cleared; nothing fetched, cached or embedded in this session; `hadith-source-rights` 14 / 0 |
| **Owner decision** | **Two are now better evidenced but still open** — C2 (the permanent key, §4) and the Approach registry. Neither was pre-empted |
| **Firestore Rules deployment** | Untouched and still **UNVERIFIED**; `firestore.rules` and `firebase.json` byte-identical to `main` |

---

## 7. Scope ready for Master Architect authorisation

Presented as scope, **not started**. Each is Hadith-owned and needs one decision.

**S1 — Apply the C2 permanent unit key.** Needs: the Owner's decision on
`hadith:<editionId>:<occurrenceOrdinal>`, **and** a live read-only inventory of existing
`hadith:` records in production. §4 changes the weighting: the name-keyed form is already
reachable, so records may already exist. Touches `unit-keys.js` — a shared file and a
permanent Study Unit key. **BR-4.**

**S2 — Allocate the Hadith Approach registry.** Needs: the Owner to answer the four
questions in the registry proposal §4 (whether Hadith gets its own set at all; the id
scheme; which candidates survive; whether an Approach may exist before a cleared edition).
Touches `catalogue-data.js` and `catalogue.js`. **BR-3**, plus a version.

**S3 — Real corpus import.** Needs: a rights-cleared edition. Nothing else unblocks it.

**S4 — Hadith Note / MMJ / durable Track.** Needs: the Firestore Rules deployment gate,
which Hadith cannot clear.

**S5 (no new authority needed, and the natural next safe tranche)** — extend the same
"pin the accepted decision" treatment to the **commentary display contract** and the
**H1 rights vocabulary**, both of which are today asserted only within the Hadith suites'
own fixtures rather than against the governing documents. It changes no behaviour, needs no
version, and crosses no gate.

---

## 8. Gates — all remain CLOSED

No real corpus, translation or commentary embedding · no permanent Hadith semantic key
applied · no Approach ID allocated · no durable Track · no Notes/MMJ persistence · no Rules
or index activation · no migration · **no deployment** · no version consumed · no shared
file changed · no next feature tranche started.

## 9. Firestore Rules — the two facts, separately

**REPOSITORY:** `firestore.rules` and `firebase.json` are **byte-identical to `origin/main`**;
**0** `hadith` collections; no `firestore.indexes.json`. Repository content only.

**DEPLOYMENT: UNVERIFIED.** Not inspected and not inspectable from this environment.

---

## HADITH_SAFE_TRANCHE

One `KEY=value` per line, blank-separated so each survives as its own line in the HTML.

STATUS=COMPLETE_AWAITING_MASTER_ARCHITECT

BRANCH=feature/hadith-study

HEAD=a03081a

BASE_MAIN_SHA=db6cb24b807d77630914e076d413bec6982cc3d7

MAIN_VERSION=v08.30

BRANCH_VERSION=v08.30 (main's own; NOT bumped)

VERSION_ALLOCATED=NONE -- ledger nextUnallocated is v08.31; the instruction said v08.32, and neither was taken

ROADMAP_NEXT_TRANCHE=No H2-C or H3 is defined anywhere. The roadmap's own next statement is H1 section 9 plus the H2-B registry proposal section 4, and every item there is gated on rights, an Owner decision, a live production read, or Rules deployment

WORK_DONE=tools/i18n-verify/hadith-gate-contracts.mjs -- 11 checks pinning the two Owner Control Gates (C2 permanent unit key; Hadith Approach registry) to the code facts their proposals rest on

FINDING=C2 is LIVE, not latent. app/records.html builds name-keyed hadith unit keys today via a generic switch that predates this stream, so a permanent Study Unit key from a collection NAME is reachable in the Records surface. Found because my own check asserted the opposite and failed. Reported, not acted on

TEST_RESULT=PASS -- new suite 11/0, mutation-proven 6 ways; 12 regression suites all exit 0 (hadith 61/0, programme-ledger 7/0/0, its mutations 37/0, brief-integrity 8/0, study-event-wiring 39/0)

BLAST_RADIUS=BR-0 -- one added file, zero app/ change, zero shared-file change

SHARED_FILES_CHANGED=NONE

DEPENDENCIES=No MMSA contract consumed; no version needed; source rights unchanged and fail-closed; two Owner decisions (C2, Approach registry) better evidenced but still open; Rules deployment still UNVERIFIED

READY_FOR_AUTHORIZATION=S1 apply the C2 key (Owner decision + live inventory, BR-4); S2 allocate the Approach registry (Owner decision, BR-3 + a version); S3 real corpus (rights); S4 Note/MMJ/durable Track (Rules deployment); S5 pin the commentary display contract and H1 rights vocabulary the same way (no new authority, no version, no gate)

NEXT_ACTION=RETURN_TO_MASTER_ARCHITECT
