# MMSA pilot — can the Claude App open a PR that AAAsapp can approve?

**Date:** 19 September 2026
**Question put by the Owner:** `AAAsapp` is the only human GitHub login; `Madrasatul-Muslimeen` and `Siyagah` are organizations. Can the installed **Claude GitHub App** open a pull request under a **bot identity distinct from `AAAsapp`**, and could **`AAAsapp` approve** that PR?
**Mode:** read-only. No PR created, no setting changed, nothing installed, no repository edit.
**Relation to the preflight:** this resolves **R3 / W3** of `2026-09-19-mmsa-automation-pilot-preflight.md`, which named a single-account repository as the pilot's highest risk.

---

## 0. The answer in two lines

> **Q1 — Almost certainly yes, and the capability is verified.** The App is installed and holds **`pull_requests: write`** and **`contents: write`**, which is exactly what opening a PR requires. A GitHub App acting on its own installation token authors PRs as its **bot user**, not as the person who triggered it. **But the App has never executed anything in this repository, so the resulting login is not yet an observed fact.**
>
> **Q2 — Yes, on the evidence available, and one caveat matters.** `AAAsapp` holds `admin` on the repository and would **not** be the PR author, so GitHub's "you cannot approve your own pull request" rule would not bite. **However: no review has ever been submitted in this repository by anyone**, so this has literally never been exercised here.

**R3 is therefore resolved in principle but not in practice.** The pilot is *not* blocked on acquiring a second human account — which was the worry — but it **is** blocked on one throwaway test PR (§4).

---

## 1. VERIFIED — measured this session

### 1.1 The App is real, installed, and permitted to open PRs

Read from the `app` object GitHub returns on this repository's check suites:

| Field | Value |
|---|---|
| App id | **`1236702`** |
| Slug | **`claude`** |
| Name | `Claude` |
| Owner | **`anthropics`** (Organization) |
| Listing | `https://github.com/apps/claude` |
| Installed here | **Yes** — a `claude` check suite exists on every commit inspected |

**Declared permissions:**

```
actions: write        checks: write         contents: write
discussions: write    issues: write         members: read
metadata: read        pull_requests: write  repository_hooks: write
statuses: read        workflows: write
```

**`contents: write` + `pull_requests: write` is precisely the pair needed to create a branch and open a pull request.** The capability is not in doubt.

### 1.2 The App has never actually run here

| Commit | `claude` check suite |
|---|---|
| `b700e3f` (main tip) | `latest_check_runs_count: 0`, `status: queued`, `conclusion: null` |
| `22777fc` (D3 integration) | `latest_check_runs_count: 0`, `status: queued`, `conclusion: null` |
| `43dd96f` (Hadith v08.29) | `latest_check_runs_count: 0`, `status: queued`, `conclusion: null` |

**Zero check runs on every commit, perpetually `queued`.** This is the signature of an App that is installed and subscribed but has **no workflow to invoke it** — consistent with the preflight's finding that no `.github/` directory exists. Searching `is:pr author:app/claude` returns **`total_count: 0`**: the App has never opened a pull request here.

### 1.3 Commit authorship is ALREADY distinct from AAAsapp — but this is a decoy

This is the finding most likely to be misread, so it is stated precisely.

| | git metadata | GitHub-resolved account |
|---|---|---|
| Author of `b700e3f` | `Claude <noreply@anthropic.com>` | login **`claude`**, type **`User`**, id **`81847`** |
| Committer | `Claude <noreply@anthropic.com>` | login **`claude`**, type **`User`**, id **`81847`** |
| Signature | — | **`verified: true`, reason `valid`** |
| **Pusher** (Actions `actor`) on the last four pushes | — | **`AAAsapp`**, id **`293311955`** |

So every commit on `main` is *authored* by an identity (`claude`, id `81847`) that is **already distinct from `AAAsapp`** (id `293311955`), and the commits are **signed and verified**.

**This does not help, and must not be mistaken for a solution. Three reasons:**

1. **Commit authorship is not PR authorship.** GitHub's self-approval restriction keys on **who opened the pull request**, not who wrote the commits. Every PR in this repository's history was opened by `AAAsapp` (§1.4).
2. **`claude` id `81847` is `type: User`, not a bot, and is not the App.** It is whatever account has registered `noreply@anthropic.com` — an *email-based attribution* produced by this session's local `git config user.email`. It is **not** the App's bot user, and it is not an account this automation can authenticate as or open a PR from.
3. **It is cosmetic, not authoritative.** Any git client can set that author string. The push identity — `AAAsapp` — is the one GitHub actually authenticated.

### 1.4 No precedent exists in this repository, in either direction

| Search | Result |
|---|---|
| `is:pr -author:AAAsapp` | **`total_count: 0`** — **every** PR ever opened here was authored by `AAAsapp` |
| `is:pr reviewed-by:AAAsapp` | **`total_count: 0`** — **`AAAsapp` has never submitted a review on any PR** |
| `is:pr author:app/claude` | **`total_count: 0`** |

**No pull request in this repository has ever received a review from anyone.** That is why §2 cannot be closed by inspection.

### 1.5 AAAsapp's standing

`AAAsapp` (id `293311955`) reports repository permissions **`admin: true`, `maintain: true`, `push: true`, `triage: true`, `pull: true`** — comfortably enough to submit an approving review.

---

## 2. REQUIRES A TEST PR — cannot be established by inspection

| # | Unknown | Why inspection cannot settle it |
|---|---|---|
| **U1** | **The exact login that opens the PR.** Expected `claude[bot]`, by GitHub's documented convention that an App's bot user is `<slug>[bot]` — and the slug **is** verified as `claude`. | The App has never opened a PR here (§1.2), so the login has never been observed. The `/users/...` endpoint is refused by the session proxy, so the account cannot be resolved directly either. |
| **U2** | **Whether the PR author is the App at all.** It depends entirely on which token the workflow authenticates with: the **App installation token** → `claude[bot]`; the default **`GITHUB_TOKEN`** → `github-actions[bot]`. | No workflow exists yet, so there is nothing to read. **Both are distinct from `AAAsapp` and both would be approvable — but only one of them works (see T1).** |
| **U3** | **Whether `AAAsapp`'s Approve button is actually live** on such a PR. | Never exercised — zero reviews in repository history (§1.4). |
| **U4** | **Whether CI triggers** on a PR opened by that identity. | Decides whether required status checks can ever report. This is the failure mode that would silently deadlock the pilot (T1). |
| **U5** | **What the installation actually granted.** §1.1 lists the App's **declared** permissions. | `GET /repos/.../installation` requires a JWT and returned **401** here. The per-installation grant is visible only to the Owner — preflight item **W6**. |

---

## 3. Traps to settle before the pilot, in priority order

**T1 — The `GITHUB_TOKEN` route is a dead end, and it fails silently.**
If the PR is opened using the workflow's default `GITHUB_TOKEN`, the author is `github-actions[bot]` — distinct from `AAAsapp`, so *approvable*. **But GitHub deliberately does not trigger workflows from events raised by `GITHUB_TOKEN`** (its loop-prevention rule). Required status checks would therefore **never run**, and the PR would sit permanently unmergeable with no error message explaining why. **The PR must be opened with the Claude App's installation token**, which is a separate App and does trigger workflows. This single choice decides whether the pilot functions.

**T2 — "Allow GitHub Actions to create and approve pull requests" must stay OFF.**
Preflight **W5**. If it is on, automation can approve its own work and the entire gate is void.

**T3 — Keep `AAAsapp` off the PR branch.**
If the ruleset enables *"Require approval of the most recent reviewable push"*, then whoever pushed last cannot supply the approval. If `AAAsapp` pushes even a one-line fixup to the bot's branch, **`AAAsapp` can no longer approve that PR.** Fixes must be asked of the App, not pushed by hand.

**T4 — The App holds `workflows: write`.**
It can modify the CI that gates it. Consider having `CODEOWNERS` cover `.github/workflows/` so changes to the cage need the Owner's approval like anything else.

**T5 — Organization scope.** This session is bound to the two configured repositories; all `/orgs/...` endpoints are refused. **Nothing about `Siyagah` was checked and nothing is claimed about it.**

---

## 4. THE EXACT NEXT STEP

**One throwaway test pull request, opened by the App, before any ruleset is enabled.**

Ordering matters: this slots into the preflight's plan as **a new step between Step 6 (wire the App) and Step 7 (enable the ruleset)**. Running it *before* protection means a surprise costs a closed PR rather than a locked repository.

1. Complete preflight **Step 3** (CI workflow, **not** required) and **Step 6** (wire the App, secret from **W7**).
2. Ask the App — via an issue comment or `workflow_dispatch` — to open a PR making one trivial, reversible change on a throwaway branch (a line in a scratch file under `docs/reports/`). **Nothing under `app/`, `tools/`, `firestore.rules` or `docs/governance/`.**
3. **Configure it to authenticate with the App installation token, not `GITHUB_TOKEN`** (T1).
4. Then read four things off the resulting PR:
   - **U1/U2** — the author login shown on the PR. Expect `claude[bot]`. If it reads `github-actions[bot]`, the token wiring is wrong; fix it before going further.
   - **U4** — did the CI check from Step 3 actually run? **If no check appears, T1 has occurred.**
   - **U3** — open the PR as `AAAsapp` and confirm **Approve** is selectable and submits. *Do not merge.*
   - Confirm the App's commits on the branch are attributed to the bot, not to `AAAsapp`.
5. **Close the PR without merging** and delete the branch.
6. Record the observed author login in the ledger, then proceed to preflight **Step 7** (enable the ruleset, **bypass list empty**).

**If U3 fails** — if `AAAsapp` cannot approve a `claude[bot]` PR — then, and only then, a second GitHub account becomes a genuine prerequisite, and the Owner should decide between adding one and running the pilot with the ledger as the approval record while GitHub enforces only *"a PR exists and CI is green"*.

---

## 5. State block

```
MMSA_BOT_IDENTITY_AND_APPROVAL_CHECK
ISSUED=2026-09-19
MODE=READ_ONLY -- no PR created, no setting changed, nothing installed, no repository edit
RESOLVES=R3/W3 of 2026-09-19-mmsa-automation-pilot-preflight
CLAUDE_APP=id 1236702, slug `claude`, owner anthropics (Org), INSTALLED on this repo
APP_DECLARED_PERMISSIONS=contents:write pull_requests:write workflows:write actions:write checks:write issues:write discussions:write repository_hooks:write members:read metadata:read statuses:read
CAN_APP_OPEN_PR=YES by permission (contents:write + pull_requests:write); NEVER EXERCISED here
APP_EXECUTION_HISTORY=NONE -- every claude check suite has 0 runs, status queued, on every commit inspected
APP_PR_HISTORY=0 (is:pr author:app/claude -> total_count 0)
COMMIT_AUTHOR_ALREADY_DISTINCT=YES but DECOY -- git author Claude <noreply@anthropic.com> resolves to login `claude`, type User, id 81847; AAAsapp is id 293311955
COMMITS_SIGNED=YES (verified:true, reason valid)
PUSH_ACTOR=AAAsapp (id 293311955) on all four most recent main pushes
WHY_DECOY=commit authorship is not PR authorship; id 81847 is type User not the App bot, is email-derived, and is not an account this automation can authenticate as
PR_HISTORY=100% authored by AAAsapp (is:pr -author:AAAsapp -> total_count 0)
REVIEW_HISTORY=ZERO reviews ever submitted in this repository (is:pr reviewed-by:AAAsapp -> total_count 0)
AAASAPP_REPO_PERMISSIONS=admin,maintain,push,triage,pull all true
CAN_AAASAPP_APPROVE=YES on available evidence -- admin, and would not be the PR author; UNPROVEN, never exercised
EXPECTED_BOT_LOGIN=claude[bot] -- GitHub convention <slug>[bot], slug verified as `claude`; login itself NOT observed
UNVERIFIABLE_HERE=/users/* and /orgs/* refused by session proxy; /repos/../installation needs JWT (401)
SIYAGAH=OUT OF SESSION SCOPE -- not checked, nothing claimed
TOP_TRAP=T1 -- a PR opened with GITHUB_TOKEN does not trigger workflows, so required checks never report and the PR deadlocks silently; use the App installation token
OTHER_TRAPS=T2 Actions must not be allowed to approve PRs; T3 if AAAsapp pushes to the branch it may forfeit its own approval; T4 App holds workflows:write so CODEOWNERS should cover .github/workflows/
NEXT_STEP=one throwaway App-opened test PR, using the installation token, BEFORE enabling the ruleset; read author login, CI trigger, and AAAsapp Approve; close without merging
R3_STATUS=RESOLVED IN PRINCIPLE, UNPROVEN IN PRACTICE -- a second human account is probably NOT required
NOTHING_CHANGED=TRUE
```
