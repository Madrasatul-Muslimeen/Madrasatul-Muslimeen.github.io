# MMSA governance automation — Stage A smoke test: four passes, one hard failure

**Date:** 20 September 2026
**Test:** issue [#90](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/issues/90), comment `5746298072`, workflow run [`35477941634`](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/actions/runs/35477941634), job `105990350802`.

**Headline: the automation plumbing works end to end up to the Anthropic API, and then Claude's execution fails immediately. No branch was created, no commit was made, and `main` is untouched.**

**Nothing about PR authorship or PR-triggered CI is claimed from this test** — the Action does not open pull requests by default, so those were out of scope by design.

`origin/main` is still **`ee3ca08dbcc40950d56e141685b7b5a1c068225c`**. No application code, version, Rules or repository setting changed. **The secret value was never requested, read or displayed.**

---

## 1. Results, reported separately

| # | Item | Result | Basis |
|---|---|---|---|
| 1 | **Workflow trigger** | **PASS** | Run `35477941634`, event `issue_comment`, `head_sha` `ee3ca08`, triggering actor `AAAsapp` |
| 2 | **Preflight resolving `oauth`** | **PASS — by construction, not by direct log sighting** (see §2) | Step 2 succeeded **and** checkout ran, which happens only when `ready == 'true'` |
| 3 | **App token exchange** | **PASS — directly observed** | `claude[bot]` posted and then updated a comment; the *Revoke app token* step issued `DELETE /installation/token` |
| 4 | **Actual Claude execution** | **FAIL** | `is_error: true`, `duration_ms: 132`, `total_cost_usd: 0`, `modelUsage: {}` |
| 5 | **Whether the hardened tools can commit** | **NOT PROVEN** — never attempted. But the *resolved tool list* is confirmed (§4) | Claude never ran |
| 6 | **Resulting branch and author identity** | **NO BRANCH, NO COMMIT** | `claude/issue-90-20260920-0007` does not exist; verified independently |
| 7 | PR authorship / PR-triggered CI | **NOT TESTED, NOT CLAIMED** | Out of Stage A scope by design |

---

## 2. Trigger and preflight

**The trigger worked, and it validated a design decision that could easily have gone the other way.**

The Owner's comment carries **`"author_association": "MEMBER"`** — *not* `OWNER`. The job gate accepts `OWNER`, `MEMBER` or `COLLABORATOR`. **Had it been written to accept `OWNER` alone, this comment would have produced no workflow run at all, silently**, with nothing to inspect. That breadth was chosen deliberately because the repository is organisation-owned and no sample association was available at the time; the choice is now confirmed by measurement.

**On the preflight, a limit on my evidence, stated plainly.** I could not read the literal `mode=oauth` line. Job logs in this repository are served from blob storage that this sandbox's proxy refuses (`curl: (56) CONNECT tunnel failed, response 403`), leaving only a tail-limited API read that cannot reach step 2. What is directly observed is that **step 2 completed successfully and checkout then ran** — and checkout is guarded by `if: steps.auth.outputs.ready == 'true'`.

That it was specifically `oauth` follows deterministically from the code path, given the Owner configured `CLAUDE_CODE_OAUTH_TOKEN` and explicitly declined federation:

- `api_key` would require `ANTHROPIC_API_KEY`, which is not set;
- `federation` requires all three variables, which the Owner did not configure;
- a partial federation would have **exited 1**, and the job did not;
- `none` would have set `ready=false` and **skipped checkout**, which did not happen.

**So: `oauth`, deduced with certainty from the branch logic — not read off the log.** The distinction is kept because it is the honest one.

---

## 3. The App token exchange worked — this is the strongest positive result

`claude[bot]` (**user id `209825114`**, app `https://github.com/apps/claude`) posted comment `5746299287` on issue #90 at 00:07:53 and updated it at 00:08:07. Posting as that identity requires the Claude App installation token. The log also shows the Action's *Revoke app token* step calling `DELETE /installation/token`, which only makes sense if an installation token had been minted.

**The OIDC → `github-app-token-exchange` → installation-token mechanism is therefore no longer inferred. It is observed.** That was the central unverified assumption of the whole pilot design, and it holds.

### A correction to my earlier report

My previous report quoted `CLAUDE_APP_BOT_ID = 41898282` from the Action's source as `claude[bot]`'s identity. **The real `claude[bot]` user id is `209825114`.** `41898282` is the Action's default `bot_id` *input* value, not the app user's id — and `41898282` is the id long associated with `github-actions[bot]`.

This matters practically: **a future check that verified commit authorship against `41898282` would have been checking the wrong number.** Verification criteria should use `claude[bot]` / `209825114`.

---

## 4. The failure — Claude's execution, and it is not a tools problem

From the job log:

```
"model": "claude-opus-5"
{
  "type": "result",
  "subtype": "success",
  "is_error": true,
  "duration_ms": 132,
  "num_turns": 1,
  "total_cost_usd": 0,
  "permission_denials_count": 0,
  "modelUsage": {}
}
##[error]Claude result reported subtype success with is_error:true (run did not complete successfully)
##[error]Action failed with error: Claude execution failed: result is_error:true
```

**Facts, separated from interpretation.**

*Facts:* the run lasted **132 milliseconds**; `total_cost_usd` is **0**; `modelUsage` is **empty `{}`**; `permission_denials_count` is **0**; one turn; the Action then exited 1.

*What those facts rule out:*

- **Not a tool or permission problem.** `permission_denials_count: 0` — nothing was refused. The P1 hardening is **not** implicated.
- **Not the task.** 132 ms is far too short for any work, and `num_turns: 1` with empty `modelUsage` means no assistant turn was produced.
- **Not the App token.** That demonstrably worked (§3). Two different credentials are in play, and it is the *Anthropic* one that is in question.

*What they point to:* zero cost together with an empty `modelUsage` means **no model was ever successfully invoked** — the request failed before any inference was billed. The two candidate causes, in order of likelihood:

1. **The `CLAUDE_CODE_OAUTH_TOKEN` was rejected** — invalid, expired, or not the kind of token this expects (it is the token produced by `claude setup-token` for subscription authentication, which is distinct from an API key).
2. **The pinned model is not available to that credential's plan.** `claude.yml` passes `--model "claude-opus-5"`. If that account cannot use it, the call could fail immediately.

**I cannot distinguish these two from here**, and I will not guess between them in the report. §6 sets out how to separate them.

**Downstream noise, so it is not mistaken for a second defect.** The log then shows `Branch claude/issue-90-20260920-0007 does not exist remotely` and a 404 stack trace from `compare/main...claude/issue-90-…`. Both are consequences of Claude never having run. They are not independent failures.

---

## 5. What the run *did* confirm about the hardened configuration

Even though Claude never executed, the log printed the **resolved** tool list — which is the first empirical confirmation of the source audit:

```
ALLOWED_TOOLS: Glob,Grep,LS,Read,mcp__github_comment__update_claude_comment,
               mcp__github_file_ops__commit_files,mcp__github_file_ops__delete_files
DISALLOWED_TOOLS: WebSearch,WebFetch
```

- **Zero Bash tools.** The P1 fix holds in the live runtime, not only in the file.
- **`use_commit_signing: true` did what the source said it would**: the four default `Bash(git …)` entries are absent and the two MCP file-operation tools are present in their place.

**So the configuration is proven correct; the capability is still untested.** Item 5 — whether this tool set is *sufficient* to commit — remains open, and it can only be answered once Claude actually runs.

---

## 6. What is needed next — one Owner check, and one experiment I can run

**Owner-only, and the more likely cause:** confirm the `CLAUDE_CODE_OAUTH_TOKEN` secret is a current, valid Claude Code OAuth token. Regenerating and re-entering it is the direct test. **Do not send me the value** — I cannot read repository secrets and do not need to; re-running the smoke test will show whether it resolved.

**Mine to run, and it isolates the other cause:** remove the `--model "claude-opus-5"` pin so the Action uses its own default model. If the next run still fails at ~132 ms with zero cost, the credential is confirmed as the cause and the model is exonerated. If it gets further, the pin was the problem.

**A constraint that shapes the order of these:** `issue_comment` workflows always run from the **default branch**, so **a `claude.yml` change cannot be tested without merging it to `main` first.** The model experiment therefore costs a merge; the credential check costs nothing. **The credential check should go first.**

I can re-post the `@claude` comment myself, so re-running the test needs nothing from the Owner beyond the credential.

**The follow-up PR permitting `mcp__github__create_pull_request` is prepared in design but NOT opened**, because the instruction conditions it on Stage A succeeding, and Stage A did not. It remains a one-entry change that adds a typed API capability and no execution surface.

---

## 7. Test state and rollback

| | |
|---|---|
| Issue #90 | **open** — kept for the retry |
| Bot branch | **none created** |
| `docs/automation-pilot/` | **not created** on `main` or anywhere |
| `origin/main` | **`ee3ca08…`** — unchanged |
| Cost of rollback | close issue #90; nothing else to undo |

---

## 8. State block

```
MMSA_AUTOMATION_PILOT_STAGE_A_RESULT
ISSUED=2026-09-20
ORIGIN_MAIN=ee3ca08dbcc40950d56e141685b7b5a1c068225c (UNCHANGED)
ISSUE=90  COMMENT=5746298072  RUN=35477941634  JOB=105990350802
TRIGGER=PASS -- event issue_comment, actor AAAsapp
AUTHOR_ASSOCIATION_OBSERVED=MEMBER (not OWNER) -- gating on OWNER alone would have SILENTLY blocked the Owner
PREFLIGHT_MODE=oauth -- PASS BY CONSTRUCTION, not read off the log (blob-storage logs are proxy-blocked; step 2 succeeded AND checkout ran, which requires ready=true)
APP_TOKEN_EXCHANGE=PASS -- DIRECTLY OBSERVED: claude[bot] posted and updated a comment; DELETE /installation/token ran
CLAUDE_EXECUTION=FAIL -- is_error true, duration_ms 132, total_cost_usd 0, modelUsage {}, permission_denials_count 0
FAILURE_NOT_TOOLS=permission_denials_count 0 -- the P1 hardening is NOT implicated
FAILURE_NOT_APP_TOKEN=that demonstrably worked; the ANTHROPIC credential is what is in question
FAILURE_CAUSE_CANDIDATES=1) CLAUDE_CODE_OAUTH_TOKEN rejected/expired/wrong kind; 2) pinned model claude-opus-5 unavailable to that plan
FAILURE_CAUSE_DISTINGUISHED=NO -- cannot be separated from here
RESOLVED_TOOLS_OBSERVED=Glob,Grep,LS,Read,mcp__github_comment__update_claude_comment,mcp__github_file_ops__commit_files,mcp__github_file_ops__delete_files
ZERO_BASH_TOOLS_CONFIRMED_AT_RUNTIME=YES -- first empirical confirmation of the source audit
COMMIT_SIGNING_EFFECT_CONFIRMED=YES -- four default Bash(git ...) entries absent, two MCP file-ops present
A5_TOOLS_SUFFICIENT_TO_COMMIT=UNPROVEN -- never attempted
BRANCH_CREATED=NO -- claude/issue-90-20260920-0007 does not exist; verified independently
COMMIT_AUTHOR_IDENTITY=UNTESTED
PR_AUTHORSHIP=NOT TESTED, NOT CLAIMED
PR_TRIGGERED_CI=NOT TESTED, NOT CLAIMED
CORRECTION=claude[bot] real user id is 209825114, NOT 41898282; 41898282 is the Action's default bot_id input (the id associated with github-actions[bot])
NEXT_OWNER_ACTION=verify/regenerate CLAUDE_CODE_OAUTH_TOKEN (value never requested or displayed)
NEXT_CLAUDE_EXPERIMENT=drop the --model pin to isolate; REQUIRES A MERGE because issue_comment workflows run from the default branch
FOLLOWUP_PR_MCP_CREATE_PR=DESIGNED, NOT OPENED -- conditioned on Stage A success
SECRET_HANDLED=NO -- never requested, read or displayed
APP_CODE_CHANGED=NO
VERSION=08.31 UNCHANGED
```
