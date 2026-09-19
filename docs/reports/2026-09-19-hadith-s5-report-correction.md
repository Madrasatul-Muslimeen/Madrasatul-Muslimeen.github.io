# Hadith S5 report — dated superseding correction

**19 September 2026 · Hadith Study stream · corrections only, no new work**

This note corrects three statements in
`docs/reports/2026-09-19-hadith-s5-governing-contracts.md`. **That report is kept
exactly as written and is not edited** — it is the record of what the S5 session
said at the time, and rewriting it would destroy the evidence that it said
something else. Where the two disagree, this note wins.

The substance of S5 is **unaffected**: the two guards it added, the contracts
they bind, and the C2 live-records documentation all stand and all still pass.
What was wrong was the report's own bookkeeping about itself.

---

## Correction 1 — the branch tip named is the WORK commit, not the tip

The S5 report states, in its header table and again in its machine-readable
block:

| Where | What it says |
|---|---|
| Header table | **Branch tip (pushed)** — `873af4078c1641f5da33f7c87acaccdec34742da` |
| Status block | `BRANCH_TIP=873af4078c1641f5da33f7c87acaccdec34742da (S5 work commit; this report is the commit after it)` |

**`873af40` was never the tip of the pushed branch.** It is the S5 work commit.
The report itself was then committed on top of it as
**`b7e0dab` — "Hadith S5 report: contracts bound, C2 documented, three red
guards diagnosed"** — and `b7e0dab` is what `origin/feature/hadith-study`
actually pointed at.

The parenthesis shows the session knew the report would become a later commit
and recorded the earlier SHA anyway, so a reader taking `BRANCH_TIP` at its word
would fetch a branch state that does not contain the report naming it. Verified
here by `git log --oneline -3 origin/feature/hadith-study`, which reads
`b7e0dab`, then `873af40`, then `22e946a`.

**Correct values:**

BRANCH_TIP_AT_S5=b7e0dab (the S5 report commit, and the pushed tip)

S5_WORK_COMMIT=873af4078c1641f5da33f7c87acaccdec34742da (the guard itself)

---

## Correction 2 — "75/0 across four" contradicts its own list

The S5 status block reads:

`TEST_RESULT=Hadith suites 75/0 across four (governing-contracts 14,
gate-contracts 11, source-rights 14, corpus 33, commentary-binding 14 = 86 total
checks, 0 failures)`

It says **four** suites and lists **five**; it says **75** and its own arithmetic
gives **86**. Neither figure was ever right for the set named. Re-run today on
the current candidate, every one of the five passes:

| Suite | Checks | Failed |
|---|---|---|
| `hadith-governing-contracts.mjs` | 14 | 0 |
| `hadith-gate-contracts.mjs` | 11 | 0 |
| `hadith-source-rights.mjs` | 14 | 0 |
| `hadith-corpus.mjs` | 33 | 0 |
| `hadith-commentary-binding.mjs` | 14 | 0 |
| **Five suites** | **86** | **0** |

**Correct value:**

HADITH_SUITES=86/0 across FIVE suites (governing-contracts 14, gate-contracts 11, source-rights 14, corpus 33, commentary-binding 14)

---

## Correction 3 — `study-event-wiring` does not pass here, and does not pass on `main` either

The S5 block records `study-event-wiring 39/0`. Re-run today it **exits 1**,
raising `ERR_UNSUPPORTED_RESOLVE_REQUEST` (×3) and `ERR_INVALID_URL`: the suite
loads the module under test as a `data:` URL, and a relative import
(`./study-evidence-readiness.js`) cannot be resolved from a `data:` URL on this
Node.

**It is not this stream's doing, and that was proven rather than assumed.** A
detached worktree was created at unmodified `origin/main`
(`a64e2a1c97f397aba26bdfa281fdf4f2b5486547`) and the same suite run there
produced the **identical** error set and the identical exit code. The suite also
reads no ledger file at all (`grep -c ledger` → 0), so the ledger repair in this
candidate cannot have touched it.

**Correct value:**

STUDY_EVENT_WIRING=exit 1, ERR_UNSUPPORTED_RESOLVE_REQUEST x3 + ERR_INVALID_URL — ENVIRONMENTAL, reproduced identically on unmodified origin/main. Belongs to the Quran stream's own file; recorded, not fixed here.

---

## What is NOT corrected, because it was right

- The two new guards and their 14 + 11 checks, and everything they assert.
- The C2 live-records documentation
  (`docs/governance/hadith-c2-live-records-path-2026-09-19.md`).
- The diagnosis of the three red guards. Two of them (ledger A and B) are what
  the Master Architect then authorised the repair for, and that repair is in
  `docs/reports/2026-09-19-hadith-ledger-repair-integration.md`.
- Every Owner Control Gate the S5 report lists as closed is still closed.

## The standing lesson this earned

**A report that names its own commit is naming a commit that does not exist
yet.** The S5 session recorded the work commit as the branch tip because, at the
moment of writing, the report was not committed. The honest forms are either to
name the work commit AS the work commit and leave the tip to be stamped after
the fact, or to amend the SHA in a follow-up commit — never to print a tip that
the very next commit falsifies. The same applies to a check total copied from
memory rather than from the run: `75/0 across four` beside a list of five suites
summing to 86 is a line nobody re-read against its own contents.
