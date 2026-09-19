# Hadith stream — authorised ledger repair, and the test/documentation-only integration

**19 September 2026 · Hadith Study stream · BR-0 · no reachable application change**

The Master Architect accepted S5 as test/documentation work and authorised
**one narrow shared change**: repair **only** the Hadith stream record in
`docs/governance/programme-integration-ledger.json` so that it truthfully
describes a branch that tracks `main` and carries no independently allocated
version — preserving the Quran **v08.31** allocation and all four deployment
states, and altering no other record.

That is what this is. **No Hadith Owner Control Gate was opened**: C2 is not
applied, no Approach is allocated, no corpus is imported, no Rules are deployed,
no records are migrated, and **v08.32 remains UNALLOCATED**.

---

## State, before and after

| | |
|---|---|
| **`origin/main` before** | `a64e2a1c97f397aba26bdfa281fdf4f2b5486547` (v08.31) |
| **`origin/main` after** | *stamped below* |
| **Branch** | `feature/hadith-study` |
| **Branch tip before** | `b7e0dab` (the S5 report commit — see the correction note) |
| **Candidate base** | `e207296` — `origin/main` merged into the branch, so it tracks `main` |
| **Branch tip after** | *stamped below* |
| **App version** | **08.31 throughout, unchanged** — the branch reads `main`'s own stamp |
| **`git diff` over `app/`** | **empty** |

---

## The repair, and why no gentler form of it exists

The two red guards on `main` were **A** (*"stream hadith declares 08.29 but
feature/hadith-study is stamped 08.30 — the ledger and the branch disagree"*) and
**B** (*"…which the ledger reserves for nobody under stream hadith — an invented
version"*). Both were artefacts of the RECORD, not of the branch: the branch had
stopped stamping versions of its own and started tracking `main`, so what the
guards were reading as a Hadith claim was `main`'s own number.

**The representation was chosen by positive and negative tests against the real
guard, not by reasoning about it.** Three candidate forms were measured:

| Candidate representation | Guard A | Guard B | Verdict |
|---|---|---|---|
| `declaredVersion: null`, `activeBranch` kept | **still FAILS** | **still FAILS** | The proposed null-version form alone is **NOT supported** |
| `declaredVersion` = `main`'s stamp, `activeBranch` kept | **still FAILS** | — | And it would falsely claim the Quran stream's version |
| **`activeBranch: null` (with `declaredVersion: null`)** | **clears** | **clears** | The only truthful representation the schema supports |

Guard A compares a declared version against the stamp on the named branch, and
guard B demands that the branch's stamp be an allocation this stream owns.
Neither can be satisfied by a branch that deliberately carries somebody else's
number. Naming no branch is the truthful answer, and it is what landed.

**`branchTip` was resolved without self-reference.** It now reads
`43dd96f58eeee5ad33dc82bb4e260660e3c290c9` — the commit at which this stream's
work reached `main`, which never moves. Re-stamping it with the branch's newest
commit would name the very commit that wrote the stamp, and would move again on
every merge of `main`. `branchTip` is read by guard C only for
`integrationState: HELD`; for a merged stream it is descriptive. The branch's
pre-repair tip (`c1a4f19a…`) is preserved in the record's own note, so no fact
was destroyed.

**Preserved, and verified field by field after the edit:** the Quran **08.31
LIVE** allocation; all seven version allocations including both Hadith ones
(08.28 HISTORICAL at `7f61328`, 08.29 RELEASED at `22526b2` — **nothing was
withdrawn**); all four deployment states; `deploymentSecuritySharedPaths`; every
other stream record; `nextUnallocated: 08.32`. The whole diff is **7 insertions,
4 deletions in one file**, and every changed line is inside the `hadith` stream
record.

---

## THE ONE THING THIS REPAIR COST, reported rather than discovered later

**`programme-ledger-mutations.mjs`'s guard-A mutation is now UNPROVEN, and the
suite exits 1.** The mutation *"the ledger and the branch disagree about what the
branch is stamped"* hard-codes the stream id `"hadith"`. With no `activeBranch`
on that record, guard A skips it, the mutation becomes a no-op, and the suite
reports it as **UNPROVEN and must not be trusted** — the repository's own
vocabulary, and the standing lesson that an unproven mutation is a finding about
the guard rather than something to delete.

It was **chased to its cause and its fix, and the fix was proven and then
reverted rather than kept**:

MUTATION_FIX=derive the subject from the ledger, exactly as guard B's two mutations already do — l.streams.find(x => x.activeBranch && f.branches[x.activeBranch]) — and take the facts argument

MUTATION_FIX_PROVEN=applied locally, suite ran 49 passed / 0 failed, then reverted with git checkout; the committed tree does NOT contain it

**It is NOT in this candidate, deliberately.** `programme-ledger-mutations.mjs`
is a platform/shared file, and the authorisation of 19 Sep 2026 covers this
ledger record **and nothing else**. Applying it unilaterally would have been a
second, undeclared shared change — and worse than usual here, because guard E's
live branch-diff sweep also skips a stream with no `activeBranch`, so it would
not have been caught.

**SHARED CHANGE REQUEST — SCR-HADITH-02.** One line in
`tools/i18n-verify/programme-ledger-mutations.mjs`, as above, to restore guard
A's fourth failure mode to proven. Guard A's other three failure modes are still
proven (49 → 48 of the suite's mutations pass). **Awaiting Master Architect
decision; not applied.**

The same skipping is recorded inside the ledger record itself, under
`activeBranchNote`, so the cost is legible to anyone reading the ledger rather
than only to a reader of this report: guards A, B and guard E's live sweep all
skip a stream with no `activeBranch`. It is mitigated, not ignored — this stream
is `MERGED_TO_MAIN` with nothing unmerged left to oversee, and guard E still
validates and reports all five of its authorisation RECORDS, which it reads from
the records themselves rather than from a branch diff.

---

## Gate results

| Gate | Result |
|---|---|
| `programme-ledger.mjs` (working tree) | **8 passed, 22 noted, 0 failed** — A, B, C, CONTROL, D, E, F, G all PASS |
| `programme-ledger.mjs` (**after push, against the remote**) | *stamped below* |
| `programme-ledger-mutations.mjs` | **48 passed, 1 failed** — the UNPROVEN guard-A mutation above. Fix proven at 49/0 and held for authorisation |
| `brief-integrity.mjs` | **8 passed, 0 failed** |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-corpus.mjs` | 33 passed, 0 failed |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| **Hadith suites total** | **86 checks, 0 failures, across five suites** |
| `quran-boundary.mjs` | 30 passed, 0 failed |
| `study-activity-evidence-boundary.mjs` | 26 passed, 0 failed |
| `study-approach-contract-boundary.mjs` | 16 passed, 0 failed |
| `stub-parity.mjs` | 3 passed, 0 failed |
| `study-event-wiring.mjs` | **exit 1 — ENVIRONMENTAL and PRE-EXISTING.** `ERR_UNSUPPORTED_RESOLVE_REQUEST` ×3 + `ERR_INVALID_URL`: a relative import cannot be resolved from a `data:` URL on this Node. **Reproduced identically on a detached worktree of unmodified `origin/main`**, and the suite reads no ledger file at all |

`main` itself was measured in that same detached worktree, and it is the
baseline this repair exists to fix: **6 passed, 22 noted, 2 failed** (guards A
and B). Not integrating would leave those two red on `main`.

---

## The three things the Master Architect asked for that are easy to skim past

1. **The remote, not the working tree.** `programme-ledger.mjs` reads
   `origin/<activeBranch>`, so running it before pushing validates a remote the
   push then replaces — this stream has been caught by that once already. The
   guards were therefore re-run **after** the push, and that run is the one
   stamped in the table above.
2. **The S5 report's own bookkeeping is corrected in a dated superseding note**,
   `docs/reports/2026-09-19-hadith-s5-report-correction.md` (+ `.html`), which
   fixes the branch-tip identity (`873af40` was the work commit; the pushed tip
   was `b7e0dab`), the self-contradicting check total (`75/0 across four` against
   a list of five summing to **86**), and the `study-event-wiring 39/0` claim.
   **The original S5 report is preserved unedited as history.**
3. **`main` was re-checked immediately before integrating**, and integration
   proceeded only because it had not moved.

---

## Standing constraints, restated because they do not expire

- **No real Hadith corpus, translation or commentary is embedded.** Every
  narration in the repository is invented for development and says so in its own
  Arabic; the synthetic namespace (`synthetic-`, `syn-occ-`, `syn-map-`) is
  swept by three GATE checks.
- **No permanent Hadith semantic key is adopted** (C2 stays closed), **no Hadith
  Approach id is allocated**, there is **no durable Track**, and **no Notes/MMJ
  persistence**.
- **No Rules or index activation, and no migration.** `firestore.rules` is
  untouched by this candidate.
- **Repository `firestore.rules` evidence and DEPLOYED Firebase Rules status are
  different facts.** The repository file is readable here; the deployed state is
  not. **DEPLOYMENT STATUS: UNVERIFIED** — this sandbox holds no
  `study-monitoring` credentials, and nothing in this candidate was deployed.
  The ledger's four deployment states are preserved exactly as they stood.

---

## Machine-readable status

HADITH_LEDGER_REPAIR=APPLIED (hadith stream record only; activeBranch null, declaredVersion null, branchTip 43dd96f, three explanatory notes)

LEDGER_RECORDS_ALTERED=1 (streams[hadith]) — Quran v08.31 allocation, all seven allocations, all four deployment states and every other record verified unchanged

DIFF=+7/-4 in docs/governance/programme-integration-ledger.json; app/ byte-identical

APP_VERSION=08.31 (unchanged; v08.32 NOT allocated)

PRE_MAIN_SHA=a64e2a1c97f397aba26bdfa281fdf4f2b5486547

PRE_BRANCH_TIP=b7e0dab (S5 report commit)

CANDIDATE_BASE=e207296 (origin/main merged into feature/hadith-study)

POST_BRANCH_TIP=STAMPED_BELOW

POST_MAIN_SHA=STAMPED_BELOW

REMOTE_GUARD_RESULT=STAMPED_BELOW

PROGRAMME_GUARDS=8 passed, 22 noted, 0 failed

MUTATION_SUITE=48 passed, 1 failed (guard-A mutation UNPROVEN; fix proven 49/0 and held as SCR-HADITH-02)

BRIEF_INTEGRITY=8 passed, 0 failed

HADITH_SUITES=86/0 across five

QURAN_BOUNDARY=30/0

OWNER_CONTROL_GATES=ALL CLOSED (C2 not applied, no Approach allocated, no corpus imported, no Rules deployed, no records migrated)

FIRESTORE_RULES_REPOSITORY=untouched by this candidate

FIREBASE_RULES_DEPLOYED=UNVERIFIED — no credentials in this sandbox; nothing deployed

SESSION_STATUS=STAMPED_BELOW
