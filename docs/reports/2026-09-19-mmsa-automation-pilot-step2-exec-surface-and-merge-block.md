# MMSA governance automation — the execution surface closed, and why the merge is blocked

**Date:** 19 September 2026
**Instruction executed:** *"Remove that extra Bash execution permission entirely… Check the Action's actual default tools for any remaining arbitrary command route. Update PR #89, resolve the review finding, and verify its check. Then configure and verify a main rule requiring a pull request, with 0 required approvals, no required status check yet, and no Claude App bypass… If you cannot set or verify that rule with your access, stop and give exact screen instructions; do not merge."*

**Result: the finding is closed and the check is green — but the `main` rule CANNOT be set from this environment, so the merge authorisation did not activate. PR #89 is NOT merged.**

`app/` is untouched. `app/js/version.js` stays **`08.31`**, **`08.32` stays UNALLOCATED**, `firestore.rules` and `firebase.json` are untouched, E1 stays closed. **No Anthropic credential was added, no required approvals enabled, no Firebase Rules deployed, and no Claude bot task started.**

| | |
|---|---|
| **PR** | <https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/89> |
| **Final PR head** | **`e73d1dea39d47b86ac531f9db475beec16f00cf1`** |
| **`origin/main`** | **`b87133461680d3c2837f7bd75fc5c824e10090d3`** — unchanged, read back after all work |
| **Merged?** | **NO** |
| **Rule on `main`** | **NONE** — verified, see §4 |

---

## 1. The new P1 finding was correct, and it is the right escalation

> *"When Claude edits any of these seven allowlisted `.mjs` files … the subsequent exact `node …` command executes the modified JavaScript, which can invoke arbitrary child processes."*

Exactly so. Naming the seven suites as exact `node tools/i18n-verify/<suite>.mjs` commands narrowed **which file runs**, not **what is in it**. File editing is deliberately still enabled, so Claude could edit an allowlisted `.mjs` and the next exact invocation would execute the edited JavaScript.

**An allowlist of paths is not an allowlist of behaviour while those paths are model-editable.** That sentence is the whole finding, and it is worth keeping.

**Fixed by deleting the permission, not by narrowing it a third time.** There is no `--allowedTools` line any more:

```yaml
claude_args: |
  --model "claude-opus-5"
```

**Nothing is lost.** `verify.yml` already runs all seven suites against every pull request, on a clean checkout Claude never touches. **Verification belongs to CI, not to the thing being verified** — narrowing the allowlist again would have been the same mistake in a smaller box.

---

## 2. The Action's default tools — audited from source

Removing our own allowlist only matters if the defaults are not worse. `src/modes/tag/index.ts` was read, not assumed.

**Base tools, unconditional:**

```
Glob, Grep, LS, Read,
mcp__github_comment__update_claude_comment,
mcp__github_ci__get_ci_status,
mcp__github_ci__get_workflow_run_details,
mcp__github_ci__download_job_log
```

**None of those can execute a command. There is no generic `Bash` tool, so the answer to "is there a remaining arbitrary-command route" is NO.**

**But the defaults are not empty of shell.** Without commit signing the mode appends four Bash entries:

```
Bash(git add:*)   Bash(git commit:*)   Bash(git rm:*)
Bash(${GITHUB_ACTION_PATH}/scripts/git-push.sh:*)
```

**The push wrapper is genuinely defensive, and it is worth being precise about what it does and does not do.** `scripts/git-push.sh` requires exactly two positional arguments, requires the first to be `origin`, validates the second with `git check-ref-format --branch`, and **refuses every argument beginning with a hyphen** — so `--force`, `--force-with-lease` and `--receive-pack` are all impossible. Its own comments name RCE and exfiltration as the threats it is built against.

**What it does not do is block a branch name.** A well-formed ref is accepted whatever it is called, so **a default configuration can fast-forward `main`** — non-forced, but direct, and past both review and the gate.

### The line that closes it

With `use_commit_signing: true`, the mode appends instead:

```
mcp__github_file_ops__commit_files
mcp__github_file_ops__delete_files
```

API calls, not shell. **The allowlist is then left with zero Bash tools of any kind.** That is why it is set — **the reason is the tool list, not signing.**

**`persist-credentials` on checkout is left alone deliberately.** The finding rightly notes that `actions/checkout` persists a credential into `.git/config`. But with **no Bash tool**, nothing can read it: changing the setting would add an untested variable and no protection. Recorded as available further hardening, not done.

**Stated honestly: none of this is testable from here.** Nothing about Claude running can execute until the workflow is on the default branch *and* a credential exists. `use_commit_signing: true` is one line, and reverting it restores the documented default.

---

## 3. Verification of the change

### Structural assertions, from the parsed YAML

| Assertion | Result |
|---|---|
| YAML parses | **OK** |
| `--allowedTools` present | **NO — deleted** |
| Any `Bash(` in `claude_args` | **NONE** |
| Any `node` in `claude_args` | **NONE** |
| Any git verb in `claude_args` | **NONE** |
| `claude_args` is exactly `--model "claude-opus-5"` | **PASS** |
| `use_commit_signing` | **true** |
| `github_token` | **still omitted** (identity stays `claude[bot]`) |
| `permissions` | unchanged — `contents`/`pull-requests`/`issues`/`id-token: write` |
| `author_association` gate | unchanged |
| `verify.yml` | **byte-untouched; gate stays at SEVEN suites** |

### Preflight re-run after the edit

`none` → `mode=none` exit 0 · `api_key` → exit 0 · `oauth` → exit 0 · `federation 3/3` → exit 0 · `federation 2/3` → **exit 1**, named. Sentinel **clean** in stdout, `GITHUB_OUTPUT` and `GITHUB_STEP_SUMMARY` in every case.

### The check, on the final head

Run [`35471648100`](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/actions/runs/35471648100), job `105973553348`, head **`e73d1de`**, conclusion **success**:

```
programme-ledger                           exit 0   8 passed, 23 noted, 0 failed
programme-ledger-mutations                 exit 0  49 passed, 0 failed
brief-integrity                            exit 0   8 passed, 0 failed
study-activity-evidence-boundary           exit 0  27 passed, 0 failed
study-activity-evidence-boundary-mutations exit 0  11 passed, 0 failed
study-event-wiring                         exit 0  41 passed, 0 failed
rules-authorisation-executable             exit 0  38 passed, 0 failed
```

The review thread is **replied to and resolved**.

---

## 4. THE BLOCKER — the `main` rule cannot be set from here

**This is why the merge authorisation did not activate.**

### What was attempted, and what came back

There is **no GitHub MCP tool for branch protection or rulesets** — checked, twice, by tool search. The API was therefore attempted directly. It authenticates correctly as `AAAsapp`, and **reads succeed**:

```
GET  /repos/.../rulesets             -> 200  []
GET  /repos/.../rules/branches/main  -> 200  []
```

**The write is refused by this environment, not by GitHub:**

```
POST /repos/.../rulesets -> 403
{"message":"Write access to this GitHub API path is not permitted through this proxy."}
```

A separate admin-only read confirms the same boundary from the other side:

```
GET /repos/.../branches/main/protection -> 403
{"message":"Resource not accessible by integration"}
```

**So: I can verify the rule state, and I cannot set it.** Per the instruction, I stopped and did not merge.

### Verified current state — read back, not assumed

| | |
|---|---|
| Rulesets on the repository | **0** |
| Rules applying to `main` | **0** |
| **`main` is protected?** | **NO** |
| Nothing was half-created | Confirmed — state re-read after each attempt, still `[]` |

---

## 5. Exact screen instructions for the Owner

**Route A — Rulesets (preferred).**

1. Go to `https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
2. Click **Settings** (top row of tabs)
3. Left sidebar → **Rules** → **Rulesets**
4. Click **New ruleset** → **New branch ruleset**
5. **Ruleset Name:** `main: require a pull request`
6. **Enforcement status:** switch to **Active**
7. **Bypass list** → **+ Add bypass** → tick **Repository admin** → set its mode to **Always**
   - **This is the Owner recovery route. Add nothing else — in particular do NOT add Claude or any GitHub App.**
8. **Target branches** → **Add target** → **Include default branch**
9. Under **Branch rules**, tick **Require a pull request before merging**. Then, in the options that appear:
   - **Required approvals: `0`** ← must be zero
   - Leave **unticked**: *Dismiss stale pull request approvals*, *Require review from Code Owners*, *Require approval of the most recent reviewable push*, *Require conversation resolution before merging*
10. **Do NOT tick "Require status checks to pass".** That comes only after the first bot test.
11. Click **Create**

**Route B — classic Branch protection**, if your Settings shows **Branches** rather than **Rules**:

1. **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern:** `main`
3. Tick **Require a pull request before merging**; set **Required approvals** to **`0`**
4. Leave **"Do not allow bypassing the above settings" UNTICKED** — that unticked box *is* the Owner admin recovery
5. Do **not** tick *Require status checks to pass before merging*
6. **Create**

### Why each of those is specified

| Setting | Reason |
|---|---|
| Require a pull request | The only thing that makes `main` **unreachable** by a direct push rather than merely hard to reach — §2's push wrapper allows a branch name |
| **0** required approvals | `AAAsapp` authors every PR and GitHub forbids approving your own. **Any non-zero value deadlocks the repository**, including the PR that would undo it |
| No required status check yet | Requiring a check nobody has watched work on a **bot** PR is how a pilot deadlocks on day one |
| Repository admin bypass **on** | Owner recovery. Without it a misconfiguration cannot be undone from the UI |
| No Claude App bypass | The whole point: the bot must go through a pull request like anything else |

### Then

Tell me it is done and **I will verify it by reading it back** (`GET /rules/branches/main` — that read works). If it verifies, PR #89 can be merged — by you, or by me under a fresh instruction, since the authorisation in this round was conditional on the rule being verified and it was not.

---

## 6. A correction I owe

In my first reply on the review thread I closed with *"the server-side backstop is now in place"*. **It was not, and that sentence should not have been written in the present tense before the result was known.** I posted a correction on the same thread with the verified `[]` readings and the 403. Recording it here too, because a claim made on a pull request is part of the record whether or not anyone reads the correction.

---

## 7. State block

```
MMSA_AUTOMATION_PILOT_EXEC_SURFACE_AND_MERGE_BLOCK
ISSUED=2026-09-19
PR=89 OPEN, NOT MERGED
PR_HEAD_FINAL=e73d1dea39d47b86ac531f9db475beec16f00cf1
ORIGIN_MAIN=b87133461680d3c2837f7bd75fc5c824e10090d3 (UNCHANGED; read back)
NEW_P1=CLOSED -- --allowedTools deleted entirely; claude_args is the model only
NEW_P1_PRINCIPLE=an allowlist of paths is not an allowlist of behaviour while those paths are model-editable
SUITES_MOVED_TO=verify.yml only -- clean checkout Claude never touches
DEFAULTS_AUDIT=Glob/Grep/LS/Read + 4 read-only MCP tools; NO generic Bash; NO arbitrary-command route
DEFAULTS_CAVEAT=without signing it adds Bash(git add|commit|rm:*) + scripts/git-push.sh wrapper
PUSH_WRAPPER=refuses ALL flags (no --force/--receive-pack); requires origin <ref>; DOES NOT BLOCK A BRANCH NAME -- can fast-forward main
MITIGATION=use_commit_signing: true -> swaps those four for mcp__github_file_ops__{commit,delete}_files -> ZERO Bash tools
PERSIST_CREDENTIALS=left alone deliberately -- no Bash tool can read .git/config; changing it adds risk, not protection
COMMIT_SIGNING_TESTED=NO -- untestable before merge + credential; one line, reversible
VERIFY_YML=BYTE-UNTOUCHED; SEVEN suites
CI_RUN=35471648100 job=105973553348 head=e73d1de conclusion=success
CI_RECAP=8/23/0 | 49/0 | 8/0 | 27/0 | 11/0 | 41/0 | 38/0
REVIEW_THREAD=replied and RESOLVED (all three now resolved)
MAIN_RULE_SET=NO -- BLOCKED
MAIN_RULE_BLOCK_REASON=no MCP tool for rulesets; direct API write refused: "Write access to this GitHub API path is not permitted through this proxy" (403)
MAIN_RULE_READ_ACCESS=YES -- GET /rulesets and /rules/branches/main both 200
MAIN_RULE_VERIFIED_STATE=0 rulesets, 0 rules applying to main -- main is UNPROTECTED
NOTHING_HALF_CREATED=confirmed, state re-read after each attempt
MERGE_AUTHORISATION=DID NOT ACTIVATE -- it was conditional on the rule being verified
MERGED=NO
CREDENTIAL_ADDED=NO
REQUIRED_APPROVALS_ENABLED=NO
FIREBASE_RULES_DEPLOYED=NO
CLAUDE_BOT_TASK_STARTED=NO
APP_CODE_CHANGED=NO
VERSION=08.31 UNCHANGED
V0832_STATUS=UNALLOCATED
SELF_CORRECTION=an earlier review reply claimed the backstop was "now in place"; it was not; corrected on the thread and here
```
