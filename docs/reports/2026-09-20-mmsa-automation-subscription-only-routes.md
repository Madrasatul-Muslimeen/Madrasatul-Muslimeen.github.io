# MMSA governance automation — subscription-only routes for the ChatGPT to Claude handoff

**Date:** 20 September 2026
**Method:** read-only investigation. **Nothing was changed** — no workflow, no secret, no routine, no repository setting. No credential was created, requested or displayed.

**Headline, stated plainly: there is NO online-only way to produce the credential the GitHub Action needs. But there IS a supported, subscription-funded, browser-only route to the handoff, and it does not use the GitHub Action at all.**

---

## 1. The direct answer on `CLAUDE_CODE_OAUTH_TOKEN`

**It cannot be generated without a terminal.** From Anthropic's authentication documentation, quoted:

> *"For CI pipelines, scripts, or other environments where interactive browser login isn't available, generate a one-year OAuth token with `claude setup-token` … The command opens the same browser authorization flow as `/login`, and the token prints to the terminal after you approve access in the browser. It does not save the token anywhere; copy it and set it as the `CLAUDE_CODE_OAUTH_TOKEN` environment variable."*

And the GitHub Actions page says the same:

> *"`CLAUDE_CODE_OAUTH_TOKEN`: an OAuth token that authenticates with your Claude subscription, available on Pro, Max, Team, and Enterprise plans. **Generate one by running `claude setup-token` locally.**"*

**There is no claude.ai web page that mints this token.** I looked for one and found none: the only documented routes are `claude setup-token` and `/install-github-app`, and both run inside the Claude Code CLI on a machine.

### Could I generate it from this cloud session?

**No, and I did not attempt it.** Two independent blockers, either of which is fatal:

1. **It prints the token to the terminal.** This session's terminal output is its transcript. Generating the token here would put the secret value into the conversation and the logs — exactly what the instruction forbids.
2. **I could not save it anyway.** Writing a GitHub Actions secret is a repository-settings write, and this environment refuses those: `POST /repos/.../rulesets → 403 "Write access to this GitHub API path is not permitted through this proxy."` The same boundary covers the secrets API.

A third point makes it moot regardless: the command needs an interactive browser authorization, which a headless container does not have.

**One useful fact for later:** the token, once made, *is* subscription-funded. The docs are explicit — *"If you authenticate with an OAuth token, runs use your Claude subscription instead of API billing."* So the Action is not an API-billing product; **it is blocked only on the act of generating the token, which needs a terminal once.**

---

## 2. The route that does work, browser-only: Routines

**Routines are the supported, subscription-funded, online-only automation surface.** From the routines documentation:

> *"A routine is a saved Claude Code configuration: a prompt, one or more repositories, and a set of connectors… Routines execute on Anthropic-managed cloud infrastructure… Routines are available on Pro, Max, Team, and Enterprise plans. Create and manage them at claude.ai/code/routines"*

Three things matter here, and all three are verified from the documentation:

- **Created entirely in a browser.** No CLI, no PC install.
- **Funded by the subscription.** *"Routines draw down subscription usage the same way interactive sessions do."* And of cloud sessions generally: *"There is no separate compute charge for the cloud VM."*
- **Three trigger types**, and two of them are exactly what this programme has been trying to build.

### The triggers

| Trigger | What fires it | Relevance here |
|---|---|---|
| **Schedule** | hourly / daily / weekdays / weekly, or one-off | Nightly governance sweeps |
| **API** | `POST` to a per-routine `/fire` endpoint with a bearer token, carrying an optional `text` payload | **This is the ChatGPT → Claude bridge** |
| **GitHub** | repository events | **Pull request and Release ONLY** — see §4 |

### The API trigger is the handoff the Master Architect asked for

> *"An API trigger gives a routine a dedicated HTTP endpoint. POSTing to the endpoint with the routine's bearer token starts a new session and returns a session URL. Use this to wire Claude Code into alerting systems, deploy pipelines, internal tools, or anywhere you can make an authenticated HTTP request."*

The request is a plain `POST` with `Authorization: Bearer …` and a JSON body whose `text` field carries the task. The response returns the new session's id and URL.

**A security property worth knowing, and it is good design:** the `text` does **not** arrive as instructions.

> *"It arrives wrapped in a `<routine-fire-payload>` block that labels it as untrusted data and tells Claude not to follow instructions inside it unless the routine's own prompt says to… Anyone holding the bearer token can send `text`, so the wrapper makes fire text from a leaked token arrive labeled as untrusted data rather than as direct instructions to your routine."*

So the routine's **saved prompt** is the authority, and the fired text is evidence. That is the same separation this repository's governance already relies on, and it means a leaked trigger token cannot redirect Claude — it can only waste a run.

---

## 3. The routes, with the exact Owner-only step for each

| # | Route | Exact Owner-only step | Extra charge | Dependency | What it actually automates |
|---|---|---|---|---|---|
| **R1** | **Routine + API trigger** | claude.ai/code/routines → **New routine** → name, prompt, select repo, environment → **Select a trigger → API** → Save → reopen → **Add another trigger → API → Generate token** (shown **once**) → give that token to the ChatGPT side | **None** on the subscription. See the overage warning in §6 | A ChatGPT-side mechanism able to make an authenticated HTTP `POST` | Master Architect writes a task → fires the endpoint → a Claude cloud session starts, works the repo, pushes a `claude/` branch. **Removes the paste entirely** |
| **R2** | **Routine + GitHub trigger** | Same form → **Add another trigger → GitHub event** → pick repo, pick `pull_request.*` or `release.*`, optional filters | **None** | Claude GitHub App installed — **already installed here** | Automatic run on every PR opened/merged/labelled. Good for review, backport, doc drift. **Cannot see issue comments** (§4) |
| **R3** | **Auto-fix pull requests** | Open the PR's session at claude.ai/code → CI status bar → **Auto-fix**; or tell Claude in the mobile app *"watch this PR and fix CI failures or review comments"* | **None** | Claude GitHub App — already installed | Claude watches a PR and responds to CI failures and review comments by pushing fixes |
| **R4** | **Code Review** | Enable the Code Review product (separate from the Action) | **None** stated | Claude GitHub App | Automatic review on every PR **without maintaining a workflow file** |
| **R5** | **GitHub Action** (`@claude` on an issue) | **Run `claude setup-token` once on any machine with a terminal**, paste the token into the existing `CLAUDE_CODE_OAUTH_TOKEN` secret | **None** once the token exists | **A terminal, once.** No online-only substitute exists | The `@claude` comment flow already wired and merged on `main`, including `claude[bot]` authorship |

**R5 is not dead — it is one terminal command away.** Everything else about it is built, merged and verified. If the Owner ever has access to any machine with a terminal (their own, a colleague's, a borrowed laptop), a single `claude setup-token` unblocks it permanently for a year.

---

## 4. Two limitations that must not be glossed over

### GitHub triggers do not cover issue comments

The supported events are, quoted in full:

| Event | Triggers when |
|---|---|
| Pull request | A PR is opened, closed, assigned, labeled, synchronized, or otherwise updated |
| Release | A release is created, published, edited, or deleted |

**That is the entire list.** There is no `issues` event and no `issue_comment` event. So the model this pilot has been building — *comment `@claude` on an issue and Claude picks it up* — **is not available through Routines.** It is available only through the GitHub Action (R5), which needs the token.

### A Routine acts as the Owner, not as `claude[bot]`

> *"Anything a routine does through your connected GitHub identity or connectors appears as you: commits and pull requests carry your GitHub user."*

**This directly contradicts the pilot's Gate 2.** The whole point of the Action route was that `claude[bot]` authors the PR so that `AAAsapp` can review and approve it. A Routine's PR would be authored by `AAAsapp`, and GitHub forbids approving your own pull request — the same deadlock already documented.

**So R1/R2 buy automation but not separation of duties.** The `main` branch rule still forces every change through a pull request, which remains the real protection; but the reviewer would be the same person as the author. That is a governance decision for the Master Architect, not a technical gap I can close.

Two smaller constraints, recorded rather than buried: routines *"belong to your individual claude.ai account… not shared with teammates"*, and during the research preview *"GitHub webhook events are subject to per-routine and per-account hourly caps. Events beyond the limit are dropped."*

---

## 5. What this session's own capabilities confirm

Read-only checks against this session, not inference:

| Fact | Value |
|---|---|
| Environment kind | **`anthropic_cloud`** — an Anthropic-managed cloud session |
| Model | `claude-opus-5`, effort `high` |
| Billing signal | `rate_limit_info: { rateLimitType: "five_hour", isUsingOverage: **false** }` — a **subscription rate-limit window**, not metered API billing |
| Routines currently on the account | **0** — queried read-only; none created |
| Repositories attached | both MMSA repositories |

**This session is itself the existence proof** that a subscription-funded Claude cloud session can hold GitHub credentials, read and write the repositories, open pull requests and run CI — all without an API key. Everything achieved in this pilot so far was done this way.

---

## 6. One real cost risk, and how to keep it at zero

Routines have a **daily run cap** on top of normal subscription limits. The documentation then says:

> *"When a routine hits the daily cap or your subscription usage limit, organizations with usage credits turned on can keep running routines on metered overage. Without usage credits, additional runs are rejected until the window resets."*

**Recommendation, given the Owner's instruction that there is to be no separate billing: leave usage credits OFF** at claude.ai/settings/usage. With them off, an over-cap run is **rejected**, not billed. That is the difference between a hard stop and a surprise invoice, and it is a one-toggle decision.

---

## 7. Verified facts vs untested predictions

**Verified — quoted from current Anthropic documentation or read from this session:**

- `CLAUDE_CODE_OAUTH_TOKEN` is generated only by `claude setup-token`, which needs a terminal and a browser; no web route exists.
- An OAuth token makes Action runs draw on the subscription, not API billing.
- Routines are created in the browser, run as cloud sessions, draw on subscription usage, and exist on Pro/Max/Team/Enterprise.
- Routine triggers are schedule, API (`POST /fire` + bearer token + `text`), and GitHub.
- GitHub triggers cover **pull request and release events only**.
- Routine output carries the Owner's GitHub identity.
- Fired `text` arrives wrapped as untrusted data.
- This session runs on `anthropic_cloud` under a five-hour subscription rate limit, with overage off, and the account currently has zero routines.

**Untested — predicted, and it should not be reported as working until observed:**

- That the ChatGPT side can actually make the authenticated `POST` (that is an OpenAI-side capability question I cannot test from here).
- That a Routine fired this way performs MMSA governance work correctly end to end.
- That a `pull_request` GitHub trigger fires reliably for this repository within the preview's hourly caps.
- Anything about the GitHub Action working. **It has never run successfully in this repository**, and the Stage A failure is unexplained beyond the credential being the likely cause.

---

## 8. The shortest interim workflow, without claiming the Action works

**Until either a terminal becomes available (R5) or a Routine is set up (R1), the honest interim is the one already in use, with one improvement.**

Today: the Master Architect writes a task → the Owner pastes it into a Claude cloud session → Claude works the repository, pushes a branch, opens a PR, and reports back → the Owner relays the report.

The improvement that costs nothing and removes half the relay:

1. **Keep the `main` pull-request rule as the gate.** It is set, verified, and it is what actually protects the repository — regardless of which automation route is chosen.
2. **Let Claude report in the repository rather than in chat.** Dated `.md`/`.html` reports are already committed to a branch and carried on a PR; the Master Architect can read them from GitHub directly instead of having them relayed. **That half of the loop is already automated and is being under-used.**
3. **Turn on Auto-fix (R3) for open PRs.** One toggle, no credential, no extra charge: Claude then responds to CI failures and review comments on a PR without the Owner relaying anything.

That leaves exactly one manual step — starting the task — which is precisely what R1's API trigger or R5's token would remove.

---

## 9. Recommendation

**Two moves, in this order.**

**First, and it is cheap: set up R1** (Routine + API trigger) at claude.ai/code/routines. It is browser-only, subscription-funded, and it is the only route that removes the ChatGPT → Claude paste. Even if the ChatGPT side turns out not to be able to fire it, the routine is still usable by **Run now** and by schedule, and costs nothing to have.

**Second, keep R5 alive as the preferred end state.** The Action is built, merged, hardened through three review findings, and gated behind a verified branch rule. It is the only route that gives `claude[bot]` authorship and therefore real separation of duties. It needs **one command on any terminal, once**. That is worth doing opportunistically rather than abandoning.

**Do not** enable usage credits; **do not** add an API key; **do not** treat the Action as working.

---

## 10. State block

```
MMSA_AUTOMATION_SUBSCRIPTION_ONLY_ROUTES
ISSUED=2026-09-20
INVESTIGATION=READ-ONLY -- no workflow, secret, routine or repository setting changed
CREDENTIAL_HANDLED=NO -- none created, requested or displayed
OAUTH_TOKEN_WEB_ROUTE=DOES NOT EXIST -- claude setup-token requires a terminal AND a browser authorization
OAUTH_TOKEN_FROM_THIS_SESSION=NOT ATTEMPTED -- would print the secret into the transcript; and secrets cannot be written (proxy 403 on repo-settings writes); and no browser
OAUTH_TOKEN_FUNDING=SUBSCRIPTION, not API billing -- the Action is blocked on token GENERATION only
ROUTINES=the supported browser-only, subscription-funded route; claude.ai/code/routines; Pro/Max/Team/Enterprise
ROUTINE_TRIGGERS=schedule | API (POST /fire + bearer + text) | GitHub
ROUTINE_GITHUB_EVENTS=PULL REQUEST and RELEASE ONLY -- NO issues, NO issue_comment
ROUTINE_IDENTITY=acts as the OWNER's GitHub user -- NOT claude[bot]; defeats Gate 2 separation of duties
ROUTINE_FIRE_TEXT=wrapped as untrusted data; the saved prompt is the authority
ROUTINE_SCOPE=individual account, not shared with teammates; webhook events have preview hourly caps
R1=Routine + API trigger -- the ChatGPT to Claude bridge; Owner creates it in the browser
R2=Routine + GitHub PR/release trigger -- automatic PR work; Claude App already installed
R3=Auto-fix pull requests -- one toggle, no credential, responds to CI failures and review comments
R4=Code Review product -- automatic PR review with no workflow file
R5=GitHub Action -- BUILT, MERGED, HARDENED, GATED; needs ONE `claude setup-token` on ANY terminal, once
COST_RISK=routines have a daily run cap; with usage credits ON, over-cap runs go to METERED OVERAGE
COST_MITIGATION=leave usage credits OFF at claude.ai/settings/usage -- over-cap runs are then REJECTED, not billed
THIS_SESSION=anthropic_cloud, five_hour subscription rate limit, isUsingOverage false, 0 routines on the account
ACTION_STATUS=HAS NEVER RUN SUCCESSFULLY -- not claimed to work
INTERIM=keep the main PR rule; read Claude's committed reports from GitHub instead of relaying; enable Auto-fix on open PRs
RECOMMENDATION=set up R1 now (cheap, browser-only); keep R5 as the preferred end state for claude[bot] authorship
DO_NOT=enable usage credits; add an API key; claim the Action works
```
