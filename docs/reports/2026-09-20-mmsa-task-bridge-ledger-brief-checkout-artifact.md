# MMSA task bridge — the two baseline suite failures are a checkout artifact, not a defect

**Date:** 20 September 2026
**Task record:** issue #95. **Trigger:** issue #95 comment
[issuecomment-5749252511](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/95#issuecomment-5749252511).
**Status: DIAGNOSIS COMPLETE. No code, ledger, or brief defect found. No protected
or shared path touched or needing a change.** `main` is untouched; nothing was
deployed, merged, or version-bumped.

## 0. The question this task was asked

Smoke PR #94 reported `programme-ledger-mutations` at 7 failures and
`brief-integrity` at 2 failures, on `main` at or after `2cb405e`, "also
reproduced on its clean base." This task's job was to find the exact cause of
each and the smallest safe fix, without touching a protected path or bumping
the version.

## 1. Reproduced exactly, on the same base

On this session's checkout of `main` at `2cb405e` (identical to the SHA the
issue names), before touching anything:

| Suite | Result |
|---|---|
| `programme-ledger-mutations.mjs` | **42 passed, 7 failed** |
| `brief-integrity.mjs` | **6 passed, 2 failed** |

These are the exact numbers issue #95 reports. Both are reproduced with **zero
working-tree changes** — `git status` was clean before and after.

## 2. The cause: a shallow, narrow-branch checkout, not a repository defect

This session's own checkout, like PR #94's smoke run, is a **shallow clone with
only two local branch refs** (`main` and the session's own working branch):

```
$ git rev-parse --is-shallow-repository
true
$ git for-each-ref refs/remotes/origin --format='%(refname)' | wc -l
2
```

Both failing suites read git state that a checkout like this does not carry:

- `brief-integrity.mjs` runs `git rev-parse origin/<branch>` for every branch
  `CLAUDE.md` names as holding something (`claude/pensive-knuth-2pu3jj`,
  `claude/phase4-wiring`). Neither ref exists locally in this checkout, so both
  lookups fail with `fatal: invalid object name` / `fatal: ambiguous argument`,
  and the suite reports the content as missing.
- `programme-ledger-mutations.mjs` (via `programme-ledger.mjs`'s `measure()`)
  builds `facts.branches` from `git rev-parse origin/<activeBranch>` and
  `git merge-base <branch> origin/main` for every ledger stream with an
  `activeBranch`. With the branch unreachable, `facts.branches` comes back
  empty; several mutations then crash outright (`Cannot read/set properties of
  undefined (reading/setting 'activeBranch'/'declaredVersion')`) because they
  assume at least one stream's branch is resolvable, which none is.

**Neither referenced branch is actually missing, and neither referenced file
is actually absent — verified independently of the guard scripts:**

```
$ git ls-remote --heads origin | grep -E "pensive-knuth|phase4-wiring"
b0221ce4a4d1291e5392f50ffb11949be07a1b39  refs/heads/claude/pensive-knuth-2pu3jj
7e2931f795af1cd97efc1167660cea93aa22b9ab  refs/heads/claude/phase4-wiring
```

`origin/claude/phase4-wiring` is exactly `7e2931f`, the commit `CLAUDE.md`
names. `tests/firestore/activity-v1.proposed.rules` genuinely exists in
`origin/claude/pensive-knuth-2pu3jj`. Both are real, current, and correctly
described by the brief.

## 3. Fetching the missing branches resolved 6 of the 7 mutation failures immediately

Fetching only the one ledger-referenced branch with a live `activeBranch`
(`claude/phase4-wiring`) — no code, ledger, or brief edit —
took `programme-ledger-mutations.mjs` from 42/7 to **48 passed, 1 failed**.
The one remaining failure (`a stream's shared-file touch loses its
declaration`) needed one more thing: **full history**, not just the branch tip.

```
$ git merge-base origin/claude/phase4-wiring origin/main
(exit 1, no output)
```

A shallow fetch of a single branch tip carries no shared ancestry with `main`,
so `git merge-base` cannot find a common commit and `measure()`'s diff
(`git diff --name-only <merge-base> <branch>`) silently computes as empty —
which is why the mutation that depends on that diff (`quran-phase4-wiring`
genuinely does declare `app/js/version.js` AND genuinely does change it on its
branch, confirmed by hand with `git diff`) still failed to see it.

## 4. Full history removes both failures entirely, with no code changed

```
$ git fetch --unshallow origin
$ git rev-parse --is-shallow-repository
false
$ node tools/i18n-verify/programme-ledger-mutations.mjs | tail -1
==== Programme ledger guard mutations: 49 passed, 0 failed ====
$ node tools/i18n-verify/brief-integrity.mjs | tail -1
==== Standing brief integrity: 8 passed, 0 failed ====
```

**49/0 and 8/0 — every prior failure gone — reached purely by giving the
checkout the git history it needs. Zero files in the repository were changed
to get there.** This rules out code, ledger content, and brief content as the
cause. The category, in the terms this task asked for, is **environment**, not
code and not a genuinely missing ref.

## 5. This exact artifact is already known, already measured, and already fixed for the real CI gate

`verify.yml` — the workflow that actually gates every pull request against
`main` — already documents this precise failure mode, by name, with the
**identical numbers**, in its own header comment above the checkout step:

> `fetch-depth: 0` IS LOAD-BEARING, NOT A PRECAUTION.
> brief-integrity.mjs reads `origin/main:app/js/version.js`, and the
> ledger guards resolve the commits and version stamps of the branches
> the ledger names. Under checkout's default shallow single-branch
> fetch, brief-integrity reports 6/2 and programme-ledger-mutations
> reports 42/7 — measured, on an unmodified tree. Those failures say
> nothing about the pull request; they are an artefact of the clone.

`verify.yml` uses `actions/checkout@v4` with `fetch-depth: 0`. **The actual
PR-gating check for #94, and for every future pull request, already runs
against full history and is unaffected by this.** This was independently
re-derived in §§1–4 before this section was found, then cross-checked against
it; the numbers match exactly.

## 6. Where the false signal actually came from

`claude.yml` — the workflow a Routine session (including this one, and
presumably PR #94's own session) runs inside — checks out with
`actions/checkout@v6` and **`fetch-depth: 1`**, deliberately: that workflow's
own header explains the seven suites are intentionally *not* run there,
because `verify.yml` already runs them "on a clean checkout Claude never
touches." A session that nonetheless runs `brief-integrity` and
`programme-ledger-mutations` locally — as the MMSA task-bridge routine's own
Step 3 instructs, to put suite results in the pull request body — is running
them against exactly the shallow, narrow-branch checkout `verify.yml`'s own
comment warns about, and will report 6/2 and 42/7 regardless of what the
branch actually contains, every time, until the checkout is given full
history.

**This task's own PR body (below) reports the seven suites run after fetching
full history** (`git fetch --unshallow origin`), so its numbers reflect what
`verify.yml`'s real CI check will show on this branch, not the false-failure
artifact.

## 7. What is NOT being done, and why

- **No file was edited to "fix" `brief-integrity.mjs` or
  `programme-ledger-mutations.mjs`.** They have no defect; running them
  correctly is what needed a genuine fix, applied locally to this session's
  own checkout (git fetch), and no repository file needed to change to prove
  that.
- **`.github/workflows/claude.yml` and `.github/workflows/verify.yml` were not
  touched.** Both are correct for the job each does — `verify.yml`'s
  `fetch-depth: 0` already avoids this artifact for the real gate, and
  `claude.yml`'s `fetch-depth: 1` is a deliberate, documented choice for a
  workflow that does not run these suites itself. Both files are inside the
  Deployment/security and "the gate itself" protected families this task must
  not modify regardless.
- **The one process gap worth the Master Architect's attention, recorded but
  not acted on here:** the MMSA task-bridge routine's own saved instruction
  (outside this repository, not a file this task can edit) tells every Routine
  session to run these seven suites and report their results before pushing.
  For these two suites specifically, that instruction will produce a false
  6/2 and 42/7 on *every* Routine run unless the session first gives its own
  checkout full history (`git fetch --unshallow origin`, or targeted fetches of
  every branch the ledger and brief name). This report recommends the routine
  prompt be amended to say so explicitly; that amendment is outside this task's
  authority to make.

## 8. Verification performed

- Reproduced the exact reported numbers (42/7, 6/2) on `main` at `2cb405e`,
  before any change.
- Confirmed by `git ls-remote` that both branches `CLAUDE.md` names
  (`claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`) exist on `origin` and
  that `claude/phase4-wiring`'s tip matches the commit the brief names
  (`7e2931f`).
- Confirmed by direct `git cat-file`/`git diff` that the file and the change
  the brief/ledger describe genuinely exist on those branches — independent of
  the guard scripts' own verdict.
- Isolated the two distinct git operations each guard depends on
  (`rev-parse origin/<branch>`, `merge-base <branch> origin/main`) and showed
  each fails under a shallow/narrow checkout and succeeds under a full one.
- Re-ran both suites at each stage (narrow shallow → branch fetched, still
  shallow → fully unshallowed) to show the failure count fall in step with the
  git state, not with any file edit.
- Ran all seven governance suites the task-bridge instruction names, on the
  fully-fetched checkout, with results in the accompanying pull request.
- `git status` clean throughout; no application file, version, Firestore Rule,
  ledger entry, or brief line was modified.
