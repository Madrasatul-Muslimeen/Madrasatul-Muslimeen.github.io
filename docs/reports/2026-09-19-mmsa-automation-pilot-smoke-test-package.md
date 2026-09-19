# MMSA governance automation — the prepared bot smoke test, and a blocking design finding

**Date:** 19 September 2026
**Status of this document:** **PREPARATORY. Nothing here has been executed.** No issue has been opened, no `@claude` comment has been posted, no credential exists, and **the bot has never run.** Nothing in this report claims the bot works.

**Scope:** step 1 of the Master Architect's instruction — prepare the smallest reversible smoke test and define its pass/fail evidence. Kept **entirely separate from PR #89**, which is untouched by this round.

> **One housekeeping correction.** The instruction cites my previous report as `2026-09-20-…`. Its actual path is **`docs/reports/2026-09-19-mmsa-automation-pilot-step2-exec-surface-and-merge-block.md`** — this sandbox's date is 19 September. Naming it by its real path matters because `brief-integrity.mjs` checks that every repository path the brief names exists.

---

## 1. Verified state — read back, not quoted

| | |
|---|---|
| `origin/main` | **`b87133461680d3c2837f7bd75fc5c824e10090d3`** |
| PR #89 head | **`e73d1dea39d47b86ac531f9db475beec16f00cf1`** — matches the instruction exactly |
| PR #89 | **open, not merged**; seven-suite check green; all three review threads resolved |
| Rules applying to `main` | **0** — `GET /rules/branches/main` → `200 []` |
| App version | `08.31`; `08.32` unallocated |

**No ruleset write was attempted this round.** The documented `403` stands as established; it was not retried.

---

## 2. THE BLOCKING FINDING — the current configuration cannot produce a bot-authored PR

**This is the most important thing in this report, and it is better found now than after the Owner has entered a credential and spent a test cycle.**

### What the Action actually does

From the Action's own FAQ, quoted rather than inferred:

> *"Claude doesn't create PRs by default. Instead, it pushes commits to a branch and provides a link to a pre-filled PR submission page."*

and on branches, for an issue trigger:

> *"Issues: Always creates a new branch with a timestamp."*

So on an `@claude` comment the Action will create a branch, commit to it as `claude[bot]`, and **post a link**. **It will not open a pull request.**

### Why that breaks the test as specified

If the Owner then clicks that link, **the Owner authors the pull request.** Its `user.login` would be `AAAsapp`, not `claude[bot]` — and GitHub would forbid `AAAsapp` approving it. Two of the four required proofs would fail, and they would fail for a reason that has nothing to do with whether the automation works.

| Required proof | Under the current configuration |
|---|---|
| (a) an actual Claude Action run | **Testable** |
| (b) `claude[bot]` authorship of a **PR** | **NOT ACHIEVABLE** — no PR is created by the Action |
| (c) seven-suite CI on that **bot PR** | **NOT ACHIEVABLE** — `verify.yml` is `pull_request`-only, and no bot PR exists |
| (d) Owner's ability to review it | **NOT ACHIEVABLE** — the only PR would be the Owner's own |

### The remedy, verified from source

The Action installs the official GitHub MCP server, but **conditionally**:

```ts
if (hasGitHubMcpTools) {
  baseMcpConfig.mcpServers.github = {
    command: "docker",
    args: ["run","-i","--rm","-e","GITHUB_PERSONAL_ACCESS_TOKEN","-e","GITHUB_HOST",
           "ghcr.io/github/github-mcp-server:sha-23fa0dd"],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: githubToken, GITHUB_HOST: GITHUB_SERVER_URL },
  };
}
```

Two facts follow, and both were read rather than assumed:

1. **The condition is the allowlist itself** — the server is installed when `allowedTools` contains `mcp__github` or any `mcp__github__*` entry. So naming one tool turns it on.
2. **Its token is `githubToken`** — the *resolved* token, which in our configuration is the **Claude App installation token**. A pull request opened through it is therefore authored by **`claude[bot]`**.

So the remedy is one entry:

```yaml
claude_args: |
  --model "claude-opus-5"
  --allowedTools "mcp__github__create_pull_request"
```

### Why this does NOT reintroduce the P1 finding

**An MCP tool is categorically different from a Bash tool, and the distinction is the whole point of the P1 fix.**

The P1 finding was about **execution**: `Bash(node …)` runs a file, and the file is editable, so the allowlist could not bound behaviour. `mcp__github__create_pull_request` is a **single typed API call**. It cannot spawn a process, cannot run a script, and cannot be redirected by editing a file in the repository. The execution surface stays **zero Bash tools**; only one narrowly-typed capability is added.

**This is a proposal, not a change.** `claude.yml` is untouched. It belongs on a **follow-up pull request after #89 merges**, which also keeps it under the seven-suite check, exactly as the instruction requires for corrections.

> **Master Architect decision needed:** amend #89 before merging (one line, saves an Owner cycle, but changes what was reviewed), **or** merge #89 as reviewed and add this on a follow-up PR. **My recommendation is the follow-up PR** — #89 has a clean review record and a green check on `e73d1de`, and the staged plan in §5 gets real evidence out of Stage A regardless.

---

## 3. The prepared issue

**Title**

```
Automation pilot: bot identity smoke test
```

**Body** — deliberately contains no `@claude` mention, so that opening the issue triggers nothing. Only the separate comment does.

```markdown
Throwaway issue for the governance-automation pilot. It exists to prove four
things and nothing else:

1. the Claude Action runs at all when invoked from a comment;
2. the commit it makes is authored by `claude[bot]`, not by a human;
3. the seven-suite `Deterministic governance suites` check runs on the result;
4. the Owner can review that result.

It changes no application code, no version, no Firestore Rules and no
repository settings. Close and delete the branch when the test is done.
```

---

## 4. The exact `@claude` comment

**Posted by the Owner, as a comment on that issue.** It must come from `AAAsapp` — the job's `if:` requires `author_association` of `OWNER`, `MEMBER` or `COLLABORATOR`.

```
@claude Create a single new file at docs/automation-pilot/bot-smoke-test.md
containing exactly this:

# Bot smoke test

bot identity test

Do not create, modify or delete any other file. Do not touch app/, tools/,
firestore.rules, firebase.json, CLAUDE.md, CHANGELOG.md, docs/governance/ or
app/js/version.js. When you are finished, reply in this thread with the exact
name of the branch you committed to.
```

**Why this wording:** it is the smallest possible change; the target path is referenced by nothing; the exclusion list names every shared path the Programme Integration Ledger governs, so the test cannot trip guard E; and asking for the branch name back gives one more piece of evidence that costs nothing.

### The payload is pre-validated — the test isolates the automation, not the content

The file was created locally and the full gate run against it, then removed. **All seven suites are byte-identical to the baseline:**

| Suite | Baseline | With payload |
|---|---|---|
| `programme-ledger` | 8 / 23 noted / 0 | **identical** |
| `programme-ledger-mutations` | 49 / 0 | **identical** |
| `brief-integrity` | 8 / 0 | **identical** |
| `study-activity-evidence-boundary` | 27 / 0 | **identical** |
| `study-activity-evidence-boundary-mutations` | 11 / 0 | **identical** |
| `study-event-wiring` | 41 / 0 | **identical** |
| `rules-authorisation-executable` | 38 / 0 | **identical** |

So **if CI fails on the bot's pull request, the cause is the automation, not the change.** The file was deleted locally afterwards — the bot must create it, or the test proves nothing.

---

## 5. Pass / fail evidence, in two stages

Splitting this is a consequence of §2, not a softening of the test.

### Stage A — runnable as soon as a credential exists, no config change

| # | Observation | PASS looks like | FAIL means |
|---|---|---|---|
| A1 | A workflow run appears | Actions tab shows a **`Claude Code`** run, event `issue_comment` | **No run at all** → the `author_association` gate. Check the Owner's association on that comment. **Run present but job skipped** → the `if:` was false |
| A2 | The preflight resolves a mode | Step *"Establish which Claude authentication mode is configured"* prints `api_key`, `oauth` or `federation` | `mode=none` → credential absent or wrongly named. `federation_incomplete` → it names the missing variable |
| A3 | The App-token exchange works | The Claude step proceeds past setup | `workflow_not_found_on_default_branch` → `claude.yml` is not on `main` yet |
| A4 | **A branch is created and committed as `claude[bot]`** | A new branch `claude/issue-<N>-<timestamp>` exists; its commit's author **and** committer are `claude[bot]` (id `41898282`), and — because `use_commit_signing: true` — the commit is **Verified** | Author `github-actions[bot]` → a `github_token` crept in. Author `AAAsapp` → the App-token route is not in use |
| A5 | **The hardened tool set is SUFFICIENT** | The file is committed using only `mcp__github_file_ops__commit_files` | A "no tool available" style failure would mean the P1 hardening went too far — this is the check that the lockdown did not break the Action |

**A5 is worth naming separately.** Removing every Bash tool made the configuration safe; it has never been shown to still be *capable*. Stage A is the first evidence either way.

### Stage B — needs the one-line `mcp__github__create_pull_request` addition from §2

| # | Observation | PASS looks like | FAIL means |
|---|---|---|---|
| B1 | **`claude[bot]` authorship of a PR** | The new PR's `user.login` is **`claude[bot]`**, not `AAAsapp`, not `github-actions[bot]` | The identity route is not what the source says |
| B2 | **The seven-suite check runs on that bot PR** | A check named **`Deterministic governance suites`** appears on the bot PR, conclusion **success**, and its log's closing recap lists **seven** suites | **Absent** → an App installation token does **not** trigger `pull_request` workflows here. That would be a genuine finding and the pilot's central assumption would need rework |
| B3 | **The Owner can review it** | On the bot PR, *Files changed → Review changes* offers **Approve** **enabled** for `AAAsapp` | Greyed with *"can't approve your own"* → the author is `AAAsapp`, so B1 failed |
| B4 | The `main` rule holds | The bot PR cannot be merged without going through the PR flow | The rule is absent or misconfigured |

**B2 is the single most load-bearing unknown in this whole pilot.** Everything else has been read from source; this one can only be observed.

---

## 6. Rollback — the whole test is reversible in three clicks

1. **Close** the bot pull request **without merging** (Stage B), or simply leave the branch unmerged (Stage A).
2. **Delete** the branch `claude/issue-<N>-<timestamp>`.
3. **Close** the smoke-test issue.

`main` is never written to. `docs/automation-pilot/` never reaches `main`. Nothing in `app/`, the Rules, the ledger or the version is touched at any point.

---

## 7. Verified facts vs proposed behaviour — kept apart deliberately

**Verified (read from source, the API, or a local run):**

- `origin/main`, PR #89 head, and the `0` rules on `main`.
- The Action does not open pull requests by default; on an issue it creates a timestamped branch.
- The `github` MCP server is installed only when `allowedTools` names an `mcp__github__*` tool, and it receives the **resolved** token.
- Default tools contain **no generic `Bash`**; with `use_commit_signing: true` the allowlist has **zero Bash tools**.
- The smoke-test payload passes all seven suites, identically to baseline.

**Proposed, and NOT yet true:**

- That adding `mcp__github__create_pull_request` yields a `claude[bot]`-authored PR. *Mechanism verified; outcome unobserved.*
- That a `claude[bot]` PR triggers `verify.yml`. **Inferred only** — B2.
- That `AAAsapp` can approve a bot PR. Inferred from the authorship rule.
- That the hardened tool set is sufficient to commit. **Never exercised** — A5.

**Never yet true, and stated plainly: no Claude Action run has ever occurred in this repository.**

---

## 8. The two Owner-only gates, in order

**Gate 1 — create the `main` rule.** The only action required now.

**Settings → Rules → Rulesets → New branch ruleset**
1. **Name** `main: require a pull request`; **Enforcement** **Active**
2. **Bypass list** → **+ Add bypass** → **Repository admin**, mode **Always** — *Owner recovery. Add nothing else; no GitHub App, no Claude.*
3. **Target branches** → **Add target** → **Include default branch**
4. Tick **Require a pull request before merging** → **Required approvals `0`**; leave *dismiss stale approvals*, *Code Owners*, *last-push approval* and *conversation resolution* **unticked**
5. **Do NOT** tick *Require status checks to pass*
6. **Create**

*(If Settings shows **Branches** instead of **Rules**: Add branch protection rule → pattern `main` → Require a pull request, Required approvals `0` → leave **"Do not allow bypassing the above settings" unticked** → Create.)*

Then tell me. **I will read the effective rule back** — target, enforcement and bypass — and, if it matches, re-verify PR #89's head, diff and check and **merge it myself** under the standing conditional instruction.

**Gate 2 — the credential.** **Not yet.** Its exact location and name are withheld until PR #89 is verified on `main`, as instructed. **I will never ask for, handle, or display the credential value.**

---

## 9. State block

```
MMSA_AUTOMATION_PILOT_SMOKE_TEST_PACKAGE
ISSUED=2026-09-19
DOCUMENT_STATUS=PREPARATORY -- nothing executed, bot has NEVER run
ORIGIN_MAIN=b87133461680d3c2837f7bd75fc5c824e10090d3
PR89_HEAD=e73d1dea39d47b86ac531f9db475beec16f00cf1 (matches instruction)
PR89_STATE=OPEN, NOT MERGED, check green, 3/3 review threads resolved
MAIN_RULES=0 -- verified read-only; NO ruleset write attempted this round
PR89_TOUCHED_THIS_ROUND=NO
BLOCKING_FINDING=the Action does NOT open PRs by default -- it pushes a branch and posts a link
BLOCKING_CONSEQUENCE=a human clicking that link authors the PR as AAAsapp, so criteria (b), (c) and (d) cannot pass as configured
REMEDY=add --allowedTools "mcp__github__create_pull_request"
REMEDY_BASIS=github MCP server installs iff allowedTools names mcp__github__*; its GITHUB_PERSONAL_ACCESS_TOKEN is the RESOLVED token (the Claude App installation token)
REMEDY_SAFETY=an MCP tool is a typed API call, NOT execution -- P1 is not reintroduced; Bash tool count stays ZERO
REMEDY_STATUS=PROPOSED ONLY -- claude.yml untouched; recommended as a FOLLOW-UP PR after #89 merges
PAYLOAD=docs/automation-pilot/bot-smoke-test.md
PAYLOAD_PREVALIDATED=YES -- all seven suites byte-identical to baseline; file then deleted locally
STAGE_A=runnable with no config change: run occurs, mode resolves, token exchange works, branch+commit authored by claude[bot], and the hardened toolset proven SUFFICIENT (A5)
STAGE_B=needs the one-line remedy: bot PR authorship, seven-suite check on the bot PR, Owner Approve enabled
MOST_LOAD_BEARING_UNKNOWN=B2 -- whether an App installation token triggers pull_request workflows here
ROLLBACK=close PR, delete branch, close issue; main never written
OWNER_GATE_1=create the main pull-request rule (0 approvals, repo-admin bypass, no App bypass, no required check)
OWNER_GATE_2=credential -- location and name WITHHELD until PR #89 is verified on main
CREDENTIAL_HANDLED=NO -- never requested, never displayed
CLAUDE_BOT_RUN_EVER=NO
APP_CODE_CHANGED=NO
VERSION=08.31 UNCHANGED
FIREBASE_RULES_DEPLOYED=NO
MERGED=NO
```
