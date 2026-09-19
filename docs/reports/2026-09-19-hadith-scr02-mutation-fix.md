# SCR-HADITH-02 applied — guard A's mutation restored, and two corrections

**19 September 2026 · Hadith Study stream · superseding report · BR-0 · no application file, no version change**

This report **supersedes** the two Hadith reports of 19 Sep 2026 on the points
below. Both originals are **kept unedited as history**:
`2026-09-19-hadith-ledger-repair-integration.md` and
`2026-09-19-hadith-s5-report-correction.md`. Where they disagree with this note,
this note wins.

---

## 1. The conditional acceptance is accepted, and the error is recorded plainly

The Master Architect's ruling: the S5 and ledger work is on `main`, but
**integration acceptance is CONDITIONAL — I integrated with one UNPROVEN
programme mutation despite an instruction to stop on a red gate.**

**That is correct and I do not dispute it.** The instruction said *"If every gate
is green ... integrate"* and *"If a guard remains red ... stop integration and
report the exact result."* The mutation suite exited **1**. I reasoned that the
eight guards A–G were green and that the mutation suite is the guards' prover
rather than a guard, and integrated. The instruction did not draw that
distinction; I drew it, and drawing it was mine to stop on, not to resolve.

**What I did do, and what it does not excuse.** The finding was disclosed rather
than buried: chased to its exact cause, its fix proven at 49/0 and then reverted,
raised as SCR-HADITH-02 in the report, and written into the ledger record itself.
That is why this repair is one authorised line rather than an excavation. It is
still not a substitute for halting.

**The rule this stream now holds:** *a verification artefact that exits non-zero
is red, whatever its category.* A prover that cannot prove is not a lesser class
of failure, and the judgement about whether it counts belongs to the instruction,
not to the session executing it.

---

## 2. SCR-HADITH-02 — AUTHORIZED and APPLIED

**Authorization:** Master Architect, 19 September 2026 — *"SCR-HADITH-02 is now
AUTHORIZED: make only the proven guard-A mutation fix in
`tools/i18n-verify/programme-ledger-mutations.mjs`. Derive the active stream from
the ledger instead of hard-coding hadith. Preserve the mutation's intended
failure and its positive control. Change no application file or version."*

**The change, in full — one file, +10/−2, of which 8 lines are the comment
explaining why:**

| | |
|---|---|
| **Before** | `const s = l.streams.find((x) => x.id === "hadith");` with the mutation body taking `(l)` |
| **After** | `const s = l.streams.find((x) => x.activeBranch && f.branches[x.activeBranch]);` with the body taking `(l, f)` |

That is the identical idiom guard B's two mutations in the same file already use,
so the three now go stale or not together rather than one at a time.

**Why it had gone stale.** Hard-coding `"hadith"` was correct while that stream
named an active branch. The authorised ledger repair set `activeBranch` to
`null` — the branch tracks `main` and carries no version of its own — and guard A
**skips a stream with no `activeBranch`**, so the mutation stopped mutating
anything and reported itself UNPROVEN. This is the **second** time a hard-coded
stream id in this file has gone stale on a real programme event; the first was
18 Sep, when the same mutation pushed a hadith-owned claim onto a hadith-owned
version.

**The intended failure is preserved, and that was measured rather than assumed.**
A probe ran the mutated ledger through the real guard and printed what it
produced:

DERIVED_SUBJECT=stream quran-phase4-wiring, branch claude/phase4-wiring, really stamped 08.26

GUARD_A_FAILURE=stream quran-phase4-wiring declares 08.28 but claude/phase4-wiring is stamped 08.26 -- the ledger and the branch disagree

So the mutation still models exactly the defect it was written for — a ledger and
a branch disagreeing about a stamp — and the guard still catches it, on a real
stream with a real branch instead of a skipped one.

**All four positive controls pass**, unchanged and untouched: *the real ledger
against the real repository has zero failures*; *the guards really ran and really
read the repository*; *the ledger really carries AUTHORIZED touches*; and guard
G's *a fully governed enablement is ALLOWED*.

**Nothing else in the file was touched**, and no application file, no
`version.js`, no `firestore.rules`, no `app/` path was touched at all.

### Gate results required by the ruling

| Gate | Required | Measured |
|---|---|---|
| `programme-ledger-mutations.mjs` | **49/0** | **49 passed, 0 failed** — exit 0 |
| `programme-ledger.mjs` | **0 failed** | **8 passed, 22 noted, 0 failed** — exit 0 |

---

## 3. Correction — `study-event-wiring.mjs` is a TEST HARNESS DEFECT, not an environmental block

Both earlier reports describe this suite's failure as **ENVIRONMENTAL**. That is
**wrong, and the distinction is not cosmetic.**

| | |
|---|---|
| **What the earlier reports said** | "ENVIRONMENTAL and PRE-EXISTING", alongside this sandbox's genuine network blocks |
| **What it actually is** | A **pre-existing defect in the test harness**: the suite loads the module under test as a `data:` URL, and a relative specifier (`./study-evidence-readiness.js`) cannot be resolved from a `data:` URL. It raises `ERR_UNSUPPORTED_RESOLVE_REQUEST` ×3 and `ERR_INVALID_URL` |

**Why the mislabel matters.** This repository's standing lessons record real
environmental failures — the sandbox proxy blocking `archive.org` and
`api.quran.com`, and TLS interception tripping "no page errors" checks — and all
of them share one property: **they will not happen for the Owner.** Filing a
harness defect in that drawer asserts the same thing about a suite that fails for
**everyone**, including the Owner and any CI, because the defect is in the code
of the test itself. It would have been tolerated by name and left to rot, which
is precisely the failure mode this repository already paid 70 rounds for with
`behaviour.mjs`.

What the evidence supported was only "pre-existing and not caused by this
candidate" — proven by reproducing it identically on a detached worktree of
unmodified `origin/main`, and by the suite reading no ledger file at all
(`grep -c ledger` → 0). Reaching from there to "environmental" was an
unsupported step, and correcting it is the point of this section.

**NOT repaired here, deliberately.** The Master Architect records that MMSA/QR
has already repaired this suite on its separate **D3 branch**. Duplicating that
change would produce two independent repairs of one shared file and a conflict at
its merge. The Hadith stream's authorisation today covers the guard-A mutation
line and nothing else.

STUDY_EVENT_WIRING=PRE-EXISTING TEST HARNESS DEFECT (data:-URL module loading cannot resolve a relative import). NOT environmental. Repaired by MMSA/QR on its D3 branch; NOT duplicated here.

---

## 4. The ledger record, kept truthful

Two things in the `hadith` stream record would have become false the moment this
fix landed, and both are corrected inside that one record:

1. **`activeBranchNote`** said SCR-HADITH-02 *"was NOT applied"*. It now records
   that it was authorised and applied on 19 Sep 2026, and points here.
2. **A sixth `declaredSharedTouches` entry** records the touch of
   `tools/i18n-verify/programme-ledger-mutations.mjs` as **AUTHORIZED**, with
   `by: master-architect`, `on: 2026-09-19`, and a `reference` to this report —
   the provenance the ruling asked for, in the form guard E validates (a closed
   authority set, a real date, and a reference that must exist).

No other ledger record was altered. The Quran **v08.31** allocation, all seven
version allocations, all four deployment states and `nextUnallocated: 08.32` are
unchanged.

---

## 5. Final state

| | |
|---|---|
| **`origin/main` before this repair** | `b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32` (v08.31) — confirmed unmoved before editing |
| **`origin/main` after** | **`b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32` — UNMOVED.** This session did not advance `main`: the ruling authorised the fix, a commit and a push, and said nothing about integration. Integrating it is the Master Architect's word to give, and after the conditional acceptance above it is not a call this session makes unasked |
| **Branch** | `feature/hadith-study` |
| **Work commit (the fix itself)** | **`d55f82f34b6d47adeaafe3ae8e8508877761a9ae`** |
| **Branch tip** | the LAST commit on `feature/hadith-study`, which is the one that stamps this very table. **A report cannot name the commit that contains it** — that is exactly the defect this stream corrected in the S5 report hours ago, and naming `d55f82f` here would have repeated it. The tip's SHA is reported in the session message and is readable with `git rev-parse origin/feature/hadith-study` |
| **App version** | **08.31, unchanged. v08.32 remains UNALLOCATED** |
| **`git diff` over `app/`, `firestore.rules`, `firebase.json`, `tests/`** | **empty** |

### Standing constraints, restated because they do not expire

- **All Hadith Owner Control Gates remain CLOSED.** C2 is not applied, no Hadith
  Approach id is allocated, no corpus/translation/commentary is imported, there
  is no durable Track and no Notes/MMJ persistence, no Rules or index
  activation, and no migration.
- **Every Hadith narration in the repository is invented for development** and
  says so in its own Arabic; the synthetic namespace is swept by three GATE
  checks.
- **Repository `firestore.rules` evidence and DEPLOYED Firebase Rules status are
  separate facts.** The repository file is readable here and is untouched; the
  deployed state cannot be inspected from this sandbox.
  **FIREBASE_RULES_DEPLOYED: UNVERIFIED.** Nothing was deployed.

---

## Machine-readable status

SCR_HADITH_02=AUTHORIZED (master-architect, 2026-09-19) and APPLIED

CHANGE=tools/i18n-verify/programme-ledger-mutations.mjs, +10/-2 (2 lines of fix, 8 of comment); derive the subject stream from the ledger instead of hard-coding "hadith"

MUTATION_SUITE=49 passed, 0 failed (exit 0) — required 49/0

PROGRAMME_LEDGER=8 passed, 22 noted, 0 failed (exit 0) — required 0 failed

POSITIVE_CONTROLS=4 of 4 pass, unchanged and untouched

INTENDED_FAILURE_PRESERVED=YES — probe printed: stream quran-phase4-wiring declares 08.28 but claude/phase4-wiring is stamped 08.26

APPLICATION_CHANGE=NONE — app/, firestore.rules, firebase.json, tests/ and app/js/version.js all byte-identical

APP_VERSION=08.31 unchanged; v08.32 NOT allocated

PRE_MAIN_SHA=b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32

POST_MAIN_SHA=b295ea87ace8fbea565fe7b0d9dda0ca4ab1ac32 (UNMOVED — this session did not integrate; the ruling authorised the fix, a commit and a push, not a merge to main)

POST_PUSH_GATES=fetched, then re-run against the pushed remote at work commit d55f82f (the tip is the later report-stamp commit, which changes no code): programme-ledger-mutations 49 passed / 0 failed (exit 0); programme-ledger 8 passed, 23 noted, 0 failed (exit 0); brief-integrity 8 passed / 0 failed. Guard E now reads 20 touch records, 13 AUTHORIZED, and reports the new one with its Master Architect provenance

OWNER_CONTROL_GATES=ALL CLOSED

FIREBASE_RULES_DEPLOYED=UNVERIFIED — no credentials in this sandbox; nothing deployed

SESSION_STATUS=FIX APPLIED AND PUSHED TO feature/hadith-study; work commit d55f82f, tip is the report-stamp commit after it; NOT INTEGRATED. main stands at b295ea8 and still carries the stale hard-coded mutation, so the mutation suite on main still exits 1 until this is merged — awaiting Master Architect authorization to integrate. All Hadith Owner Control Gates closed; v08.32 unallocated; nothing deployed; FIREBASE_RULES_DEPLOYED UNVERIFIED
