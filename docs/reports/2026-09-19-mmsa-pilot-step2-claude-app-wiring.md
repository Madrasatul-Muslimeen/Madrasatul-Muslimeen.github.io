# MMSA automation pilot — STEP 2: wiring the Claude GitHub Action

**Date:** 19 September 2026
**Branch:** `claude/pilot-claude-app-wiring`
**Pull request:** **[#89](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/89)** — **OPEN, NOT MERGED**
**Base:** `main` at **`fa0621794cb970f4e7e31696410ad2c8686fdd3e`** — verified by fetch, **unchanged by this work**
**Result:** **Stopped at a reviewable configuration, as instructed.** The identity mechanism is verified from the Action's own source; the wiring is inert until the Owner adds a Claude API credential.

**Scope held:** one file added, `.github/workflows/claude.yml` (125 lines). `verify.yml` untouched. No app code, no version change (`version.js` still `08.31`), no Firestore Rules, no repository settings, **no credential added, no secret printed.**

---

## 1. The new remote tip, verified

| | |
|---|---|
| `origin/main` | **`fa0621794cb970f4e7e31696410ad2c8686fdd3e`** |
| Tip subject | *Merge pull request #88 from …/claude/pilot-ci-verify-workflow* |
| Merge shape | **A real merge commit** — `fa06217` has `2661a52` and `b700e3f` as parents; not a fast-forward or squash |
| `.github/workflows/verify.yml` | **Now present on `main`** (it was absent at `b700e3f`) |
| Application version | **`08.31`** — unchanged |

**PR #88's merge is confirmed at the SHA the Owner reported.**

---

## 2. THE VERIFIED IDENTITY MECHANISM

Read from `anthropics/claude-code-action` at commit **`cfc3eb22bfed5c26ef66e3223c982af27e4524de`**, cloned and read directly — **not recalled, and not inferred from the README.**

> **The instruction not to assume the installed App's token is available inside a workflow was the right one to give. It is NOT ambient.** A workflow does not automatically hold the installed App's credentials; there is no implicit App token in the runner environment. It has to be *fetched*, and fetching it has preconditions that are easy to break by accident.

### 2.1 How the App token is actually obtained — `src/github/token.ts`

`setupGitHubToken()` does this, in order:

1. **If `github_token` is supplied, it is used verbatim and nothing else happens** (`OVERRIDE_GITHUB_TOKEN`).
2. Otherwise it mints a **GitHub Actions OIDC token** with audience `claude-code-github-action` via `core.getIDToken(...)`. The error text is explicit about the precondition:
   > *"Could not fetch an OIDC token. Did you remember to add `id-token: write` to your workflow permissions?"*
3. It `POST`s that token to **`https://api.anthropic.com/api/github/github-app-token-exchange`**.
4. The response carries an **installation token for the Claude GitHub App** — the App already installed on this repository, id `1236702`. It is masked with `core.setSecret(appToken)`.

Default permissions requested in the exchange (`DEFAULT_PERMISSIONS`): `contents: write`, `pull_requests: write`, `issues: write`.

**So the answer is: the App's token IS obtainable inside a workflow, but only via this exchange, and only when two conditions both hold — `id-token: write` is granted, AND `github_token` is left unset.** The permission is load-bearing, not boilerplate.

### 2.2 The bot identity is a declared constant — `src/github/constants.ts`

```ts
export const CLAUDE_APP_BOT_ID = 41898282;
export const CLAUDE_BOT_LOGIN = "claude[bot]";
```

Confirmed as the defaults of the `bot_id` / `bot_name` inputs in `action.yml`, and used for git identity in `src/github/context.ts`.

| Identity | id | Type |
|---|---|---|
| **`claude[bot]`** | **41898282** | App bot |
| `AAAsapp` | 293311955 | User |

**Distinct.** A PR authored by `claude[bot]` is a PR `AAAsapp` did not author, so GitHub's self-approval block would not apply to it.

### 2.3 Why `github_token` is deliberately omitted — it would break BOTH goals

Passing `github_token: ${{ secrets.GITHUB_TOKEN }}` is the single most tempting mistake here, and it fails twice:

1. **Identity** — the author becomes `github-actions[bot]`, not `claude[bot]`.
2. **Triggering** — the Action's own FAQ states the rule plainly:
   > *"The `github-actions` user cannot trigger subsequent GitHub Actions workflows. This is a GitHub security feature to prevent infinite loops. To make this work, you need to use a Personal Access Token (PAT) instead, which will act as a regular user, **or use a separate app token of your own**."*

   The Claude App installation token **is** a separate app token, so a PR opened with it is expected to trigger `verify`. **Expected — see §5, U2. This is the one link in the chain that is reasoned rather than observed.**

The workflow file carries this reasoning in its own header, so the next reader does not have to rediscover it.

---

## 3. WHY THIS STOPS AT A CONFIGURATION

Two independent reasons. The second is not a choice.

### 3.1 The Claude API credential is the Owner's

The App token authenticates to **GitHub**. It does **not** authenticate to the **Claude API** — that is a separate credential the App does not supply. Nothing here creates, stores or prints one.

### 3.2 The token exchange refuses a workflow that is not on the default branch

`src/github/token.ts` carries the error code `workflow_not_found_on_default_branch`, and the Action's own message is unambiguous:

> *"Action skipped due to workflow validation error. This is expected when adding Claude Code workflows to new repositories or on PRs with workflow changes. If you're seeing this, your workflow will begin working once you merge your PR."*

`src/entrypoints/run.ts` catches it, sets the output `skipped_due_to_workflow_validation_mismatch`, and **returns cleanly** — so such a run is **green-but-skipped, not red**.

**Therefore the Claude path cannot be exercised on the PR that introduces it.** This is the Action's design, not a gap in this PR, and it is why "open a PR, do not merge" is the correct stopping point rather than a cautious one.

---

## 4. What the workflow contains

| | |
|---|---|
| File | `.github/workflows/claude.yml` — the only file in the PR |
| Trigger | `issue_comment` (created), gated on the body containing `@claude` |
| Permissions | `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write` |
| Deliberately absent | **`workflows`**, `actions`, `checks`, `packages`, `deployments`, `security-events` |
| `github_token` | **Not set** — this is what selects the bot identity (§2.3) |
| Model | `claude-opus-5` |
| Tools | Restricted via `--allowedTools` to the `tools/i18n-verify` suites and ordinary git |

**No `workflows: write`** is the deliberate one: **this job must not be able to rewrite the gate that checks it.** The Claude App *declares* `workflows: write` at the App level, so withholding it at the workflow level is the meaningful restriction.

Two access controls come from the Action itself and were not weakened: it refuses any actor **without write access** to the repository, and its `allowed_bots` default is **empty**, so no bot can invoke it.

### Inert by construction, and tested

A preflight step establishes only **whether** a credential exists. It prints a boolean, never a value, and the secret is passed via `env:` rather than interpolated into the script so it cannot be echoed by accident. With no credential the job stops there with an explanatory step summary and never reaches Claude.

**Both paths were executed locally**, including a sentinel check confirming the value appears in **neither** stdout, **nor** the step output, **nor** the step summary.

### Observed on PR #89

| Check | Result |
|---|---|
| **`Deterministic governance suites`** | **success** |
| `Claude Code` workflow | **did not fire** — correct: it triggers on `issue_comment` only, and is not yet on `main` |

**That green check is itself a result worth recording:** it is the gate merged in #88 running on a second, unrelated pull request, unprompted.

---

## 5. WHAT REMAINS UNTESTED

Stated as unknowns rather than glossed, because none of them can be settled from this side.

| # | Unknown | Why it cannot be settled yet |
|---|---|---|
| **U1** | **That the OIDC exchange actually returns a token for this repository.** | Needs the workflow on `main` (§3.2) **and** a Claude API credential. The mechanism is verified in source; *this installation's* exchange succeeding is not. |
| **U2** | **That a `claude[bot]` PR triggers the `verify` workflow.** | The strongest remaining inference. `GITHUB_TOKEN` does not trigger workflows; an App installation token is not `GITHUB_TOKEN`, and the Action's FAQ says a separate app token is the fix. **Expected, not observed.** This was **T1** in the preflight and remains open. |
| **U3** | **That `AAAsapp` can approve a `claude[bot]` PR.** | Requires a real bot-authored PR. Unchanged since the identity report: zero reviews have ever been submitted in this repository. |
| **U4** | **The bot login as it actually renders.** | `claude[bot]` is the Action's own constant, so this is near-certain — but it has still never been observed in this repository. |
| **U5** | **Whether the four permissions are truly minimal.** | Since the App token carries its own permissions, the workflow's `GITHUB_TOKEN` grants may be narrowable. **Not narrowed speculatively** — the documented configuration was followed because no run can be observed to confirm a narrower one. Revisit after the first successful run. |
| **U6** | **Which Claude API auth option the Owner wants.** | A decision, not a test. §6. |
| **U7** | **Whether the `--allowedTools` allowlist is sufficient** for the 22g fix. | Too narrow blocks legitimate work; too wide defeats the point. Observable only on the first real run. |

---

## 6. EXACT SETUP INSTRUCTIONS — the Owner's part

**Step A — choose one Claude API auth route.**

| Option | What to add | Stored secret? | Notes |
|---|---|---|---|
| **(a)** `ANTHROPIC_API_KEY` | Settings → Secrets and variables → Actions → New repository secret | **Yes** | Simplest. The workflow already references it; nothing in the file changes. |
| **(b)** `CLAUDE_CODE_OAUTH_TOKEN` | Same place; generate with `claude setup-token` locally (Pro/Max) | **Yes** | Swap the `anthropic_api_key:` input for `claude_code_oauth_token:`. |
| **(c)** **Workload Identity Federation** | Three identifiers, **in the workflow file** | **No** | **No static credential is stored anywhere.** Needs an Anthropic Console admin: register issuer `https://token.actions.githubusercontent.com` (JWKS `discovery`), create a service account, create a federation rule matched to `repo:Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io:`. Then replace the `anthropic_api_key` line with `anthropic_federation_rule_id`, `anthropic_organization_id` and `anthropic_service_account_id`. |

**For a governance pilot, (c) is the strongest posture** — nothing static to leak or rotate, and the three values are identifiers rather than credentials, so they can live in the file in plain sight. It costs one-time Anthropic Console setup. **(a) is the fastest.** This is a judgement for the Owner; the workflow is written so either is a small edit.

**Step B — confirm the App installation still grants what the exchange needs.** Settings → GitHub Apps → Claude → Configure: the repository is in scope, with `contents`, `pull requests` and `issues` write. (This was preflight item **W6**; it has still not been read from this side — `/repos/.../installation` requires a JWT and returns 401 here.)

**Step C — merge #89.** Nothing works before this, by §3.2.

**Step D — the real test.** Open an issue and comment `@claude` asking for the **22g harness fix**, which is the pilot's actual subject. Then read, in order:
1. Does the `Claude Code` workflow run at all?
2. Does the log show *"App token successfully obtained"*?
3. **Who authored the resulting PR?** Expect `claude[bot]`. *(settles U1, U4)*
4. **Did `Deterministic governance suites` run on that PR?** *(settles **U2** — the one that matters most)*
5. **Is Approve selectable for `AAAsapp`?** *(settles **U3**)*

**Step E — only after Step D passes**, enable the ruleset (preflight Step 7): required context **`Deterministic governance suites`**, require a pull request, 1 approval, **bypass list empty**.

> **If Step D item 4 fails** — the PR appears but no `verify` check runs — **do not weaken the gate to get past it.** That would be T1 materialising, and the remedy is a different token (a custom GitHub App via `actions/create-github-app-token`, which needs an App id and private key the Owner creates), not a relaxed check.

---

## 7. State block

```
MMSA_PILOT_STEP2_CLAUDE_APP_WIRING
ISSUED=2026-09-19
BRANCH=claude/pilot-claude-app-wiring
PR=89 OPEN NOT MERGED https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/89
PR_HEAD=a1b676b | PR_AUTHOR=AAAsapp | mergeable_state=clean | changed_files=1 (+125/-0)
MAIN=fa0621794cb970f4e7e31696410ad2c8686fdd3e (PR #88 merged as a real merge commit; verify.yml now ON main)
MAIN_VERSION=08.31 UNCHANGED | verify.yml UNTOUCHED by this PR
FILE_ADDED=.github/workflows/claude.yml (125 lines) -- the only file
ACTION_SOURCE_READ=anthropics/claude-code-action @ cfc3eb22bfed5c26ef66e3223c982af27e4524de (cloned and read, not recalled)
APP_TOKEN_IS_NOT_AMBIENT=TRUE -- no implicit App credential exists in a workflow; it must be fetched
IDENTITY_MECHANISM=src/github/token.ts: GitHub OIDC (audience claude-code-github-action) -> POST api.anthropic.com/api/github/github-app-token-exchange -> Claude App INSTALLATION TOKEN, core.setSecret masked
PRECONDITIONS=id-token: write granted AND github_token left unset (both required)
EXCHANGE_DEFAULT_PERMISSIONS=contents:write pull_requests:write issues:write
BOT_IDENTITY=claude[bot] id 41898282 (src/github/constants.ts) vs AAAsapp id 293311955 -- DISTINCT
GITHUB_TOKEN_OMITTED=DELIBERATE -- it would make the author github-actions[bot] AND stop the PR triggering verify
WORKFLOW_PERMISSIONS=contents:write pull-requests:write issues:write id-token:write; NO workflows/actions/checks/packages/deployments/security-events
NO_WORKFLOWS_WRITE=deliberate -- the job must not be able to rewrite the gate that checks it
INERT=TRUE -- preflight step prints a boolean only; secret passed via env, never interpolated; sentinel-tested for leakage in stdout, step output and step summary
CREDENTIAL_ADDED=NO | SECRET_PRINTED=NO
BLOCKER_1=Claude API credential is the Owner's to add (options a/b/c)
BLOCKER_2=token exchange refuses workflow_not_found_on_default_branch, so the Claude path CANNOT be exercised before merge; run.ts returns cleanly so such a run is GREEN-BUT-SKIPPED, not red
OBSERVED_ON_PR89=Deterministic governance suites SUCCESS (the #88 gate running on a second, unrelated PR); Claude Code workflow correctly did NOT fire
UNTESTED=U1 exchange succeeds for this install | U2 claude[bot] PR triggers verify (the old T1, EXPECTED NOT OBSERVED) | U3 AAAsapp can approve it | U4 bot login as rendered | U5 whether 4 permissions are minimal | U6 which auth route | U7 allowedTools sufficiency
NEXT=Owner picks auth route, confirms App install scope, merges 89, then comments @claude on a 22g issue and reads author + verify trigger + Approve
DO_NOT=weaken the gate if verify fails to trigger -- that is T1 and the remedy is a different token, not a relaxed check
RULESET=still NOT enabled; required context will be "Deterministic governance suites", bypass list EMPTY
```
