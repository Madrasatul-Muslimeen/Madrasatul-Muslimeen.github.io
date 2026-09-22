# MMSA governance automation — resolving the two review findings, and the safe merge sequence

**Date:** 19 September 2026
**Instruction executed:** *"Before merging PR #89, resolve the two Codex review findings on claude.yml: the preflight must accurately match the chosen Anthropic authentication method, and Claude must not have unrestricted git push commands that could update main directly. Add the early author_association filter while retaining the Action's actual write-permission check. Keep the seven-suite check unchanged. Test the resulting workflow, update PR #89, and return matching dated .md and .html evidence. Do not merge or add a credential yet. Give the Master Architect the exact safe merge and first bot-test sequence."*

**Result: both findings resolved, the early gate added, tested, PR updated. Not merged. No credential added.**

`app/` is untouched. `app/js/version.js` stays **`08.31`**, **`08.32` stays UNALLOCATED**, `firestore.rules` and `firebase.json` are untouched, E1 stays closed, **no repository setting was changed, no credential was created and no secret was printed.**

**PR:** <https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/89> — head **`c7a4c14`**, open, **not merged**, check green.

---

## 1. Both findings were correct

Neither was a false positive. Both are P-rated real, and both are fixed in `c7a4c14` — one file, `.github/workflows/claude.yml`. **`verify.yml` is byte-untouched and the gate stays at seven suites**, confirmed by `git diff --stat -- .github/workflows/verify.yml` being empty.

### [P2] The preflight matched only one of the three advertised modes

The preflight tested `ANTHROPIC_API_KEY` alone, while the setup notes offered three modes and instructed the Owner to *"swap the input"*. An Owner choosing OAuth or Workload Identity Federation would have got `present=false` **for ever**: both checkout and the Claude step skipped, the workflow permanently inert, and **nothing on screen saying why.**

**Fixed at the root, not by widening one test.** All three modes are now passed to the Action unconditionally. That is safe rather than sloppy, and it was checked rather than assumed: `action.yml` resolves each input as `inputs.x || env.X`, so **an empty input is treated as unset**.

The consequence is the part worth keeping: **there is no input left to swap.** The instruction that caused the defect is gone, not merely corrected. Federation identifiers come from repository **variables** (`vars.`) because they are identifiers, not credentials — so no mode requires editing the workflow file at all.

**A half-configured federation now fails by name.** Two of three variables set used to be indistinguishable from no setup whatsoever. It exits 1 and names the missing variable.

### [P1] Claude could have pushed straight to `main`

`--allowedTools` carried `Bash(git push:*)`, which pre-approves **every** form of push — `git push --force origin HEAD:main` included. The job holds `contents: write` and a real App token, and `verify.yml` runs **only** on `pull_request`. So that one pattern bypassed **both** pull-request review and the seven-suite gate. The review's reasoning was exactly right.

**Every git write verb is removed** — no `push`, `commit`, `add` or `checkout`. **Nothing is lost by removing them**, and that was verified rather than hoped: the Action's own documentation states Claude has *"file operations (reading, committing, editing files, read-only git commands)"* by default and *"does **not** have access to execute arbitrary Bash commands by default"*. Committing and branch management are the Action's, not Bash's.

### The glob went too — which the finding did not ask for, and which mattered more

`Bash(node tools/i18n-verify/*)` re-opened the same hole by another door. **Claude can write files by default.** So it could author a new script *into* that directory and execute it, and that script could push anywhere. A wildcard over an interpreter is arbitrary code execution wearing a narrow-looking name.

The seven suites are now **seven exact commands with no wildcard**, and a check asserts they match the gate's own suite list **exactly**, so the two cannot drift apart:

```
gate suites  (7): brief-integrity, programme-ledger, programme-ledger-mutations,
                  rules-authorisation-executable, study-activity-evidence-boundary,
                  study-activity-evidence-boundary-mutations, study-event-wiring
claude tools (7): (identical)
MATCH: Claude may run exactly the suites the gate runs -- no more, no less
```

### Residual risk, stated rather than implied away

**Any job holding a `contents: write` token can in principle reach `main`.** Narrowing tools makes that hard; **only a server-side rule makes it impossible.**

The backstop is a branch rule on `main`: **Require a pull request before merging, with Required approvals = 0.** That blocks direct pushes outright **without** demanding an approval — which matters specifically here, because `AAAsapp` authors every pull request and GitHub forbids approving your own, so requiring an approval today would **deadlock the repository**. It is in §4 below. It is a repository setting and therefore the Owner's, and this round changed none.

---

## 2. The early invocation gate — added, with the Action's own check kept

```yaml
if: >-
  contains(github.event.comment.body, '@claude') &&
  contains(fromJSON('["OWNER","MEMBER","COLLABORATOR"]'), github.event.comment.author_association)
```

**The Action's own check is retained and nothing here replaces or weakens it.** `src/github/validation/permissions.ts` calls `getCollaboratorPermissionLevel()` and accepts only `admin` or `write`; `src/entrypoints/prepare.ts` runs that **before** the trigger check and calls `core.setFailed()` otherwise. That gate is authoritative.

The problem it does not solve is *timing*. It runs **inside** the Action, so a stranger's comment on this **public** repository would still start a runner and check out the repository before being refused — billable minutes available to anyone, on demand. The association test moves the refusal to **before the job starts at all**. Coarse outer gate, authoritative inner gate.

**All three associations are listed deliberately.** On an organisation-owned repository an administrator may present as `OWNER`, `MEMBER` or `COLLABORATOR` depending on how access is granted. Checked rather than guessed: `AAAsapp` is the **sole collaborator, `role_name: admin`**, and the repository is owned by the `Madrasatul-Muslimeen` **organisation**. There were no existing comments anywhere in the repository to sample a real `author_association` from, so **listing only one would have risked silently locking out the only human who can drive this.** All three cover every possible case for a repo admin.

**One diagnostic, because this failure mode is silent.** A job-level `if:` that evaluates false produces **no workflow run at all** — nothing to open, no log, no red X. So: *if an authorised `@claude` comment produces no run whatsoever, this condition is the first place to look, not the Action.* That sentence is in the workflow file itself, not only here.

---

## 3. Testing

### Structural assertions, from the parsed YAML

| Assertion | Result |
|---|---|
| YAML parses | **OK** |
| No `git push` / `commit` / `add` / `checkout` / `merge` / `reset` / `tag` anywhere in `claude_args` | **PASS** |
| No wildcard in `--allowedTools` | **PASS** |
| Exactly 7 tools, each an exact `Bash(node tools/i18n-verify/<suite>.mjs)` | **PASS** |
| `github_token` still omitted (so the identity stays `claude[bot]`) | **PASS** |
| Tool list matches `verify.yml`'s suite list exactly | **PASS** |
| All seven suite files exist on disk | **PASS** |
| `permissions` still the same four | `contents/pull-requests/issues/id-token: write` |
| `verify.yml` modified | **No — byte-untouched** |

### The preflight, executed across every mode

Extracted from the **parsed** YAML and run with a sentinel value (`SENTINEL-s3cr3t-…`) standing in for every secret:

| Scenario | exit | `mode` | `ready` | sentinel leaked? |
|---|---|---|---|---|
| none configured | 0 | `none` | false | **clean** |
| `ANTHROPIC_API_KEY` | 0 | `api_key` | **true** | **clean** |
| `CLAUDE_CODE_OAUTH_TOKEN` | 0 | `oauth` | **true** | **clean** |
| federation, 3 of 3 | 0 | `federation` | **true** | **clean** |
| federation, 2 of 3 | **1** | `federation_incomplete` | false | **clean** |
| federation, 1 of 3 | **1** | `federation_incomplete` | false | **clean** |
| both secrets set | 0 | `api_key` + warning | true | **clean** |

The leak check covers **stdout, `GITHUB_OUTPUT` and `GITHUB_STEP_SUMMARY`** — all three, because a secret reaching a step output or a job summary is as exposed as one printed to the log. Every secret arrives through `env:` and is tested with `[ -n … ]`; none is interpolated into the script text.

The 2-of-3 case emits `::error::Workload Identity Federation is partially configured (2 of 3). Missing: ANTHROPIC_SERVICE_ACCOUNT_ID`, and writes the same list to the job summary.

**A shell trap avoided deliberately:** the flag assignments use explicit `if … fi` rather than `[ … ] && x=1`, because under `set -euo pipefail` a trailing failed test terminates the step. That is why `none configured` exits **0** rather than dying — inert is not an error.

### The gate itself, in CI

Run [`35471038345`](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/actions/runs/35471038345), job `105971932851`, head `c7a4c14`, conclusion **success**:

```
===== RECAP: all seven suites =====
programme-ledger                           exit 0  8 passed, 23 noted, 0 failed
programme-ledger-mutations                 exit 0  49 passed, 0 failed
brief-integrity                            exit 0  8 passed, 0 failed
study-activity-evidence-boundary           exit 0  27 passed, 0 failed
study-activity-evidence-boundary-mutations exit 0  11 passed, 0 failed
study-event-wiring                         exit 0  41 passed, 0 failed
rules-authorisation-executable             exit 0  38 passed, 0 failed
```

**What could NOT be tested here, and why:** the Claude path itself has still never executed. `issue_comment` workflows always run from the **default branch**, and the App token exchange separately validates that the workflow exists there. Both mean the same thing — **nothing about Claude actually running can be observed until this merges.** That is the Action's design, not a gap in the testing.

---

## 4. THE EXACT SAFE MERGE AND FIRST BOT-TEST SEQUENCE

Seven steps. **Do them in this order** — the ordering is what keeps the repository from deadlocking.

### Phase 0 — protect `main` BEFORE merging (Owner, ~2 minutes)

**Step 1.** Repository → **Settings → Rules → Rulesets → New branch ruleset** (or Settings → Branches). Target `main`. Enable **"Require a pull request before merging"** and set **Required approvals to `0`**.

- **Why now and not later:** it is the only server-side thing that makes "Claude pushes to `main`" impossible rather than merely difficult (§1).
- **Why `0` approvals:** `AAAsapp` authors every pull request and GitHub forbids approving your own. **Requiring an approval today locks the repository — including the pull request that would unlock it.**
- **Leave repository-admin bypass enabled** for now, so the Owner can never be locked out while this is being established.
- **Do NOT** add `Deterministic governance suites` as a *required* check yet. It becomes required at step 7, after it has been seen working on a bot pull request.

**Step 2. Merge PR #89.** Squash or merge commit, either is fine.

- It is **inert** — no credential exists, so the Claude step cannot run.
- Merging is not optional-but-nice: `claude.yml` has **no effect whatsoever** until it is on the default branch, so this is the only way to reach the test.

### Phase 1 — add exactly one credential (Owner)

**Step 3.** Choose one. Simplest is **(a)**:

| | Where | What |
|---|---|---|
| **(a)** | Settings → Secrets and variables → Actions → **Secrets** → New repository secret | `ANTHROPIC_API_KEY` |
| **(b)** | same place | `CLAUDE_CODE_OAUTH_TOKEN` |
| **(c)** | Settings → Secrets and variables → Actions → **Variables** | all three of `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` — no stored credential |

**No edit to `claude.yml` is needed for any of them.** Paste the value only into that box — never into a comment, a file, or a chat message.

### Phase 2 — the first bot test, which IS Gate 2

**Step 4.** Open a throwaway issue, e.g. *"Bot identity smoke test"*.

**Step 5.** Comment on it with a deliberately tiny, reversible task that touches nothing governed:

> `@claude Create a new file docs/reports/BOT-SMOKE-TEST.md containing today's date and the words "bot identity test", and open a pull request. Change nothing else — no app/ file, no version.js, no firestore.rules.`

**Step 6. Record these five observations separately.** They are different facts and collapsing them is the mistake this programme has already corrected once:

| # | Observation | What it proves | If it fails |
|---|---|---|---|
| i | A workflow run appears at all | The `author_association` gate let the Owner through | **No run at all** → it is the `if:` condition, not the Action. Check the Owner's `author_association` on that comment |
| ii | The `Claude Code` job succeeds | Credential and App token exchange both work | Read the preflight step: it names the mode, or names what is missing |
| iii | **The new PR's author is `claude[bot]`, not `AAAsapp`** | **The bot identity** — the thing the whole pilot exists to establish | If it is `github-actions[bot]`, a `github_token` has been added somewhere. Remove it |
| iv | **`Deterministic governance suites` runs on that PR** | **A bot PR triggers CI** — never yet observed | If absent, the App-token route is not doing what the source says |
| v | **`Approve` is available to `AAAsapp`** on it | **The Owner approval path** — never yet observed | Only fails if the author is somehow `AAAsapp` |

**Step 7.** When all five hold, **Gate 2 is met.** Close the smoke-test PR and issue, delete the branch.

### Phase 3 — only after Gate 2 is observed

**Step 8.** Add **`Deterministic governance suites`** as a **required status check** on the `main` ruleset. Only now — requiring a check nobody has watched work on a bot pull request is how a pilot deadlocks on day one.

**Step 9.** Raising **Required approvals to 1** becomes *possible* at this point, because bot-authored pull requests exist that `AAAsapp` can approve. **It is still not automatically wise:** every pull request `AAAsapp` authors by hand would then need a second human. Recommendation is to **leave it at `0`** until there is a second reviewer, and revisit then.

### A cheap negative test, recommended

From any account that is not a collaborator, comment `@claude hello` on a public issue. **Expect no workflow run at all.** That is the early gate working; it is the only direct proof of it, and it costs nothing.

### Things NOT to do, each for a stated reason

- **Do not tick *"Allow GitHub Actions to create and approve pull requests"*.** It governs the `GITHUB_TOKEN` route, which this workflow deliberately does not use, and its approval half is a control worth leaving off.
- **Do not add `github_token:`** to `claude.yml`. It would make the author `github-actions[bot]` **and** stop the resulting PR triggering `verify` — defeating both halves of the pilot at once.
- **Do not require an approval before step 8.** Deadlock, per §1 and step 1.
- **Do not deploy Firebase Rules as part of this.** E1 is a separate dependency and is untouched by the automation pilot.

---

## 5. What remains untested after all of this

Unchanged by this round, and still true:

1. **No Claude run has ever executed in this repository.** Steps 4–6 are the first.
2. **No bot-authored PR has ever existed here**, so "a bot PR triggers CI" and "`AAAsapp` can approve it" both remain **inferred**, never observed.
3. **PR #89 itself is authored by `AAAsapp`** and therefore still cannot demonstrate either.
4. The `chatgpt-codex-connector[bot]` review is state `COMMENTED`. **Not an approval.**
5. **Gate 4 is not closed.** `claude.yml` triggers on `issue_comment` only, so a human still pastes the task. Nothing here connects the Master Architect's conversation to Claude.

---

## 6. State block

```
MMSA_AUTOMATION_PILOT_STEP2_HARDENING
ISSUED=2026-09-19
PR=89 OPEN, NOT MERGED
PR_HEAD_BEFORE=7de680209505d1002cfbda54b214693eafa7b601
PR_HEAD_AFTER=c7a4c1447bd40dc2addf17c50dbe9d2ac2988331
COMMIT_FILES=1 -- .github/workflows/claude.yml only
VERIFY_YML=BYTE-UNTOUCHED; gate stays at SEVEN suites
FINDING_P2=RESOLVED -- all three auth modes passed unconditionally; empty input == unset (action.yml inputs.x || env.X)
FINDING_P2_ROOT_FIX=the "swap the input" instruction is GONE; federation via repository VARIABLES
FINDING_P2_EXTRA=half-configured federation now EXITS 1 and names the missing variable
FINDING_P1=RESOLVED -- every git write verb removed (push, commit, add, checkout)
FINDING_P1_NOT_LOST=Action defaults already cover file ops, committing, read-only git
FINDING_P1_EXTRA=the GLOB removed too -- Bash(node tools/i18n-verify/*) + default file-write == arbitrary code execution == push by another door
ALLOWED_TOOLS=7 EXACT suite commands, no wildcard, asserted identical to verify.yml's suite list
RESIDUAL_RISK=any contents:write token can in principle reach main; only a server-side branch rule makes it impossible
BACKSTOP=branch rule "Require a pull request" with REQUIRED APPROVALS = 0 -- blocks direct push WITHOUT deadlocking
EARLY_GATE=author_association in OWNER|MEMBER|COLLABORATOR, job-level if:
ACTION_CHECK_RETAINED=YES -- getCollaboratorPermissionLevel admin|write, run before the trigger check
ASSOCIATION_TRIO_REASON=org-owned repo; AAAsapp is sole collaborator role_name=admin; no existing comment to sample; listing one risked locking out the only human
SILENT_FAILURE_DIAGNOSTIC=a false job-level if produces NO run at all; documented in the workflow itself
PREFLIGHT_SCENARIOS=7 tested: none/api_key/oauth/federation/2-of-3/1-of-3/both
SECRET_LEAK=NONE in stdout, GITHUB_OUTPUT or GITHUB_STEP_SUMMARY (sentinel)
CI_RUN=35471038345 job=105971932851 conclusion=success; seven suites 8/23/0|49/0|8/0|27/0|11/0|41/0|38/0
CODEX_THREADS=both replied to and RESOLVED
CLAUDE_PATH_TESTED=NO -- impossible before merge (issue_comment runs from default branch; token exchange validates default branch)
MERGE_SEQUENCE=9 steps, Phase 0 protect -> merge -> credential -> smoke test -> only then required check
GATE2_PROOF=five separate observations: run starts / job succeeds / author is claude[bot] / verify runs on it / Approve available to AAAsapp
APP_CODE_CHANGED=NO
VERSION=08.31 UNCHANGED
V0832_STATUS=UNALLOCATED
FIREBASE_FILES_CHANGED=NO
REPO_SETTINGS_CHANGED=NO
CREDENTIAL_CREATED=NO
SECRET_PRINTED=NO
MERGED=NO
```
