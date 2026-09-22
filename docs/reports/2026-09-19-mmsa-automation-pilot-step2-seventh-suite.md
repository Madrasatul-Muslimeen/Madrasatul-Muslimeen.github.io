# MMSA governance automation — the seventh gate suite, and who can invoke @claude

**Date:** 19 September 2026
**Instruction executed:** *"On the existing PR #89, add `study-activity-evidence-boundary-mutations.mjs` to the deterministic governance check. Do not open another wiring PR. Verify the updated check actually runs all seven suites, and inspect the `@claude` comment trigger and permissions for who can invoke it. Keep application code, version, Firebase files, credentials, and repository settings untouched. Do not merge."*

**Result: done, observed in CI, and not merged.**

`app/` is untouched. `app/js/version.js` stays **`08.31`**, **`08.32` stays UNALLOCATED**, `firestore.rules` and `firebase.json` are untouched, E1 stays closed, no repository setting was changed, **no credential was created and no secret was printed.**

**PR:** <https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/89> — **open, not merged.**

---

## 1. What changed, exactly

| | |
|---|---|
| Branch | `claude/pilot-claude-app-wiring` |
| Commit added | **`7de6802`** — *"verify.yml: gate the evidence-boundary MUTATION harness too (six suites -> seven)"* |
| PR head before → after | `a1b676b` → **`7de6802`** |
| Files in the commit | **One:** `.github/workflows/verify.yml` (+15 / −7) |
| PR total | 2 commits, 2 files — `claude.yml` (new) and `verify.yml` (modified) |

`git status` over `app/ tools/ firestore.rules firebase.json docs/ CLAUDE.md CHANGELOG.md tests/` **and `.github/workflows/claude.yml`** was empty at commit time. The reports in this round are on the separate branch named in §7 so that PR #89 stays two workflow files and nothing else.

### The check name is deliberately unchanged

The job is still named **`Deterministic governance suites`**. That string is what a future branch ruleset would name as a *required* check, so renaming it while making it stricter would silently detach any protection later built on it. The gate got stricter; its name did not move.

---

## 2. Why the seventh suite

`study-activity-evidence-boundary.mjs` was gated from pilot step 1. **`study-activity-evidence-boundary-mutations.mjs` was not** — so the gate ran a guard without running the check that the guard is *alive*.

That is precisely the `study-event-wiring.mjs` failure mode this programme has already paid for once: a suite that asserted **nothing** for the whole of its existence while exiting in a way no grep caught. A guard whose mutation harness is ungated is a guard nobody has proven can fail.

The harness is now gated beside the guard it proves, and `verify.yml`'s own header comment records that reason rather than leaving the next reader to infer it.

---

## 3. Observed in CI — the job-log evidence

**Run [`35470400173`](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/actions/runs/35470400173), job `105970184964`, head `7de6802`, conclusion `success`.** Step 5 is now named *"Run the seven deterministic governance suites"*. Its closing recap, read from the log rather than from a summary:

| # | Suite | Exit | Result |
|---|---|---|---|
| 1 | `programme-ledger` | 0 | 8 passed, 23 noted, 0 failed |
| 2 | `programme-ledger-mutations` | 0 | **49 passed, 0 failed** |
| 3 | `brief-integrity` | 0 | 8 passed, 0 failed |
| 4 | `study-activity-evidence-boundary` | 0 | 27 passed, 0 failed |
| 5 | **`study-activity-evidence-boundary-mutations`** | 0 | **11 passed, 0 failed — THE NEW ONE** |
| 6 | `study-event-wiring` | 0 | 41 passed, 0 failed |
| 7 | `rules-authorisation-executable` | 0 | 38 passed, 0 failed |

Every figure matches the continuation's §9 baseline. **The seventh suite carries its own positive controls** — *"the guard passes on the real, unmutated repository"*, *"the harness restored every file it touched"*, a **negative** control proving a comment naming the store does not trip the guard, and a closing *"every mutated file is byte-identical to how it started"* — which the clean working tree independently confirmed.

**A mechanism worth recording:** for a `pull_request` event GitHub uses the workflow file from the *pull request's own* merge state, not from `main`. That is why editing `verify.yml` on this branch takes effect for this branch's own run, and it is not an assumption — PR #88 demonstrated it when the very PR that *added* `verify.yml` was checked by it.

---

## 4. The failure path was re-proven — and the first attempt at proving it was WRONG

Recorded rather than quietly re-run, because a control that silently tests nothing is worse than no control.

The control prepends an unrunnable suite to the list and asserts the job fails. **The first attempt anchored its `sed` to ten spaces of indentation that the YAML block scalar strips**, so it matched nothing, ran the seven real suites unmodified, and **exited 0**. Reported as written, that would have read as *"the positive control passes"* while having proven nothing whatsoever.

It was caught because **the exit code disagreed with the intent** — a control that is supposed to force a failure must not come back green. Re-run correctly:

```
this-suite-cannot-exist                exit 1  (no summary line emitted)
programme-ledger                       exit 0  ==== Programme integration ledger: 8 passed, 23 noted, 0 failed ====
...
rules-authorisation-executable         exit 0  ==== Rules authorisation executable: 38 passed, 0 failed ====
POSITIVE CONTROL EXIT CODE: 1
```

**Exit 1, the failing suite named, and all seven real suites still executed after it** — one failure neither masks the rest nor is masked by them.

**This is the same family as the near-miss in the previous round's audit**, where a step's start and end falling in the same second nearly became an "empty check suite" finding. Both times the tell was the same: *a number that disagreed with what the evidence should have looked like.*

### How the step was verified before pushing

The step's `run` script was **extracted from the PARSED YAML and executed verbatim**, not re-typed. That matters here specifically: an earlier attempt at editing this same file broke the block scalar by putting a closing quote at column 1, and a re-typed approximation would not have caught it. The file parses, the trigger is `pull_request` into `main`, and `permissions` on `verify.yml` remain **`contents: read`**.

---

## 5. Who can invoke `@claude` — inspected, and the finding is about TIMING

### The authorisation gate is real

Read from the Action's own source, not assumed:

- **`src/github/validation/permissions.ts`** calls `octokit.repos.getCollaboratorPermissionLevel()` and accepts **only `admin` or `write`**; anything else logs *"Actor has insufficient permissions"* and denies.
- **`src/entrypoints/prepare.ts`** runs that check **before** the trigger check, and on failure calls `core.setFailed()` and `process.exit(1)`.
- **`checkHumanActor()`** separately refuses any actor whose type is not `User` unless it is listed in `allowed_bots`, **whose default is empty** — so `chatgpt-codex-connector[bot]`, which already reviews on this repository, cannot invoke Claude.

**So a stranger cannot make Claude act.** I set out to test the opposite: `checkHumanActor` alone only proves the actor is human, and I had drafted that as a contradiction of PR #89's claim. Reading `permissions.ts` and `prepare.ts` disproved it. **The claim in PR #89 is correct**, and reporting the contradiction would have been a false finding.

### The finding: the gate is LATE, not absent

| Fact | Basis |
|---|---|
| This repository is **public** | GitHub API: `"private": false`, `"visibility": "public"`, `has_issues: true`, `allow_forking: true` |
| So **any GitHub user can comment** on an issue or PR | Follows from the above |
| The job condition is `contains(github.event.comment.body, '@claude')` | A plain **substring** match anywhere in the body |
| A comment merely **quoting** `@claude` satisfies it | Including PR #89's own description, and this report |
| `issue_comment` fires on **issues *and* pull requests** | GitHub event semantics |
| The permission check runs **inside the Action**, after the runner starts | §5 above |

**Consequence, stated plainly and without inflation: any GitHub user can cause a workflow run at will.** They cannot make Claude do anything, and **no secret is exposed** — the preflight passes the key via `env:` and prints only a boolean, which I confirmed by reading the workflow. But once a credential exists, the sequence for a stranger's comment is *start runner → check out the repository → be refused*, which is **billable Actions minutes on demand from anyone**.

Today it stops even earlier, at the credential preflight, because the workflow is inert.

### Recommended, and deliberately NOT built

Move the gate **earlier**, so an unauthorised comment never starts a runner: add `github.event.comment.author_association` being `OWNER`, `MEMBER` or `COLLABORATOR` to the job's `if:`.

**Not implemented here**, and the reason is the instruction's own boundary: it changes what `claude.yml` *does*, which is an Owner / Master Architect decision, not the housekeeping edit this round was authorised to make. The instruction was to add a suite to the gate and to *inspect* the trigger. It is flagged with its remedy attached rather than built or ignored.

### One more, independent

`issue_comment` workflows always run from the **default branch**. So `claude.yml` has no effect at all until it is on `main` — a second, separate reason the Claude path cannot be exercised on this PR, alongside the `workflow_not_found_on_default_branch` refusal PR #89 already documents.

---

## 6. What this PR still cannot prove

Unchanged from the previous audit, and it still governs the ordering of the pilot:

1. **PR #89 is authored by `AAAsapp`** (`293311955`), not a bot — every workflow run on it shows `triggering_actor: AAAsapp`. It therefore proves the gate runs on *a* PR, and **nothing about a bot-authored PR**.
2. **`AAAsapp` cannot approve it.** GitHub blocks a pull request's author from approving their own.
3. **Do not enable branch protection requiring an approval yet.** While `AAAsapp` authors every PR, such a rule would **deadlock the repository** — including the PR that would fix it.
4. `chatgpt-codex-connector[bot]`'s review on this PR is state `COMMENTED` with no findings. **Not an approval.**

---

## 7. Where things are

| | |
|---|---|
| PR #89 head | **`7de6802`** — open, **not merged** |
| PR #89 files | `.github/workflows/claude.yml` (new), `.github/workflows/verify.yml` (modified) |
| PR description | **Updated.** It said *"`verify.yml` is untouched"*, which the second commit made false; corrected rather than left to contradict its own diff |
| This report | `claude/exciting-goodall-rqn1pm`, alongside the previous round's audit |
| `main` | **`b871334`**, untouched by this round |

`.github/workflows/` is **not** a declared shared path in `docs/governance/programme-integration-ledger.json`, so ledger guard E requires no declaration for this edit — checked rather than assumed. Guard E still reports 20 touch records, 13 AUTHORIZED / 7 DECLARED, 0 undeclared.

---

## 8. State block

```
MMSA_AUTOMATION_PILOT_SEVENTH_SUITE
ISSUED=2026-09-19
PR=89 OPEN, NOT MERGED
PR_HEAD_BEFORE=a1b676b084d6747da469a05a8f450759f61cbd53
PR_HEAD_AFTER=7de680209505d1002cfbda54b214693eafa7b601
COMMIT_FILES=1 -- .github/workflows/verify.yml only
PR_TOTAL_FILES=2 -- claude.yml (new), verify.yml (modified)
SUITES=6 -> 7 (study-activity-evidence-boundary-mutations added)
CHECK_NAME=UNCHANGED "Deterministic governance suites" -- it is what a ruleset would require
CI_RUN=35470400173 job=105970184964 conclusion=success
CI_RECAP=8/23/0 | 49/0 | 8/0 | 27/0 | 11/0 | 41/0 | 38/0 -- all seven, exit 0, read from the job log
FAILURE_CONTROL=exit 1, failing suite named, all seven still ran
FAILURE_CONTROL_FIRST_ATTEMPT=WRONG -- sed anchored to stripped YAML indentation, exited 0, proved nothing; recorded
VERIFY_METHOD=run script extracted from PARSED YAML and executed verbatim
VERIFY_YML_PERMISSIONS=contents: read (unchanged)
INVOKE_GATE=REAL -- permissions.ts getCollaboratorPermissionLevel, admin|write only; prepare.ts fails before trigger check
INVOKE_BOTS=refused -- checkHumanActor, allowed_bots default empty
INVOKE_FINDING=gate is LATE not absent; repo is PUBLIC so anyone can START a run; contains() matches a mere quotation
INVOKE_SECRET_EXPOSURE=NONE -- key passed via env, only a boolean printed
INVOKE_REMEDY=author_association OWNER|MEMBER|COLLABORATOR in the job if: -- RECOMMENDED, NOT BUILT (Owner/MA decision)
CLAUDE_YML_DEFAULT_BRANCH=issue_comment workflows run from the default branch, so claude.yml is inert until merged
PR89_AUTHOR=AAAsapp -- still cannot demonstrate a bot PR, and self-approval is blocked
BRANCH_PROTECTION_WARNING=an approval requirement would DEADLOCK while AAAsapp authors every PR
APP_CODE_CHANGED=NO
VERSION=08.31 UNCHANGED
V0832_STATUS=UNALLOCATED
FIREBASE_FILES_CHANGED=NO
REPO_SETTINGS_CHANGED=NO
CREDENTIAL_CREATED=NO
SECRET_PRINTED=NO
MERGED=NO
```
