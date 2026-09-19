# MMSA governance-automation pilot — read-only PREFLIGHT

**Date:** 19 September 2026
**Scope:** read-only reconnaissance of `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`, to establish what exists today before any automation of the **Master Architect → Claude builder → auditor → Owner decision** workflow, with a small **22g test-defect pilot** as the first subject.
**Nothing was installed, added, enabled, configured, edited or deployed.** No app, no secret, no setting, no workflow, no rule, no code. The 22g fix was **not** started.
**Deliverable:** this file and its `.html` twin.

---

## 0. The one-sentence finding

> **Today there is no gate of any kind between a commit and the live site.** `main` is unprotected, no ruleset applies to it, there are no pull-request checks, no CI workflow exists, and GitHub Pages rebuilds and redeploys `main` automatically on every push — so on this repository **merging *is* deploying**, and both happen with a single unreviewed `git push`. The Claude GitHub App **is already installed** but is inert, because there is no workflow for it to run.

The consequence for the pilot's design is direct: *"cannot merge or deploy without Owner approval"* is, on this repository, **one control, not two** — protect `main` and you have protected production. But it must be protected with **no bypass actors**, because the identity this automation runs as reports `admin: true`.

---

## 1. VERIFIED — measured in this session

Everything in this section was read back from the live GitHub API or from `origin/main` itself. Where an endpoint answered, the answer is quoted.

### 1.1 Repository identity and current state

| | |
|---|---|
| Repository | `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io` (id `1297404783`) |
| Owner type | **Organization** — `Madrasatul-Muslimeen` |
| Visibility | **public** (`private: false`) |
| Default branch | `main` |
| Archived | `false` · Issues enabled: `true` · Forking allowed: `true` |
| **`origin/main`** | **`b700e3f4b0a8004d4fe2701013e053a3c7a25770`** — fetched, not quoted |
| `main` tip subject | *Stamp the continuation's own main SHA* |
| **Application version on `main`** | **`08.31`** — `app/js/version.js` reads `export const APP_VERSION = "08.31";` |
| Signed-off commits required | `false` |

**This confirms the continuation package's own state block, one commit forward.** The continuation records `MAIN_SHA=972596d…`; `b700e3f` is the stamping commit that sits one ahead of it, exactly as this repository's convention describes. `git diff 972596d b700e3f` is documentation only.

> **Note on the local checkout.** The working copy's `main` was stale at `4b6bd60` (v08.27-era) until fetched; `git fetch` reported `+ 4b6bd60...b700e3f main -> origin/main (forced update)`. **A session that read `app/js/version.js` from the local tree without fetching would have reported v08.27 and been four versions wrong.** Fetch before reading state.

### 1.2 GitHub Actions — one workflow, and it is not ours

`GET /actions/workflows` returns **`total_count: 1`**:

| Field | Value |
|---|---|
| Name | `pages-build-deployment` |
| **Path** | **`dynamic/pages/pages-build-deployment`** |
| State | `active` |
| Runs to date | **348** |

The `dynamic/` path prefix is the signature of **GitHub's own auto-generated Pages builder**, not a workflow authored in this repository.

**There is no `.github/` directory at all on `origin/main`.** `git ls-tree -r origin/main --name-only | grep '^\.github'` returns nothing. Therefore, verified absent:

- ❌ No `.github/workflows/` — **zero repository-authored CI**
- ❌ No `CODEOWNERS` (searched the whole tree)
- ❌ No pull-request template, no issue template
- ❌ No Dependabot or Renovate configuration

### 1.3 Branch protection on `main` — NONE

`GET /repos/…/branches/main`:

```json
"protected": false,
"protection": {
  "enabled": false,
  "required_status_checks": { "enforcement_level": "off", "contexts": [], "checks": [] }
}
```

`GET /branches/main/protection` itself returned **403 `Resource not accessible by integration`** — the session token lacks that scope. **So the detailed protection object is not directly readable by me.** The `protected: false` / `enabled: false` fields above are, however, returned by an endpoint that *did* answer, and they are consistent across two independent calls (`list_branches` and `get branch`).

### 1.4 Rulesets — NONE APPLY TO `main`

Two endpoints, both answered `200`:

| Call | Result |
|---|---|
| `GET /repos/…/rulesets` | **`[]`** — no repository ruleset exists |
| **`GET /repos/…/rules/branches/main`** | **`[]`** — **no rule of any origin is in force on `main`** |

**The second call is the decisive one.** `/rules/branches/{branch}` returns the *effective* rules for a branch, aggregating **repository *and* organization** rulesets. The organization endpoint `GET /orgs/…/rulesets` was refused by the session proxy (*"sessions are bound to their configured repositories"*), so I could not enumerate org rulesets directly — **but an empty effective-rules array for `main` establishes that none of them reaches `main`.** That is the fact the pilot actually depends on.

### 1.5 Pull-request checks — NONE

`GET /commits/b700e3f…/check-runs` → `total_count: 3`, and every one belongs to the `github-actions` app as part of the Pages build:

| Check run | Conclusion | App |
|---|---|---|
| `build` | success | `github-actions` |
| `deploy` | success | `github-actions` |
| `report-build-status` | success | `github-actions` |

**None of these tests the application.** They report whether Jekyll/Pages built the site. There are **no required status checks** (`contexts: []`, `enforcement_level: "off"`), so even these could not block anything.

### 1.6 Claude integration — INSTALLED BUT INERT

`GET /commits/b700e3f…/check-suites` → `total_count: 3`, across three apps:

| App slug | App id | Suite conclusion |
|---|---|---|
| `github-actions` | 15368 | `success` |
| `github-pages` | 34598 | `null` |
| **`claude`** | **1236702** | **`null`** |

**This is a significant and encouraging finding.** GitHub creates a check suite for an installed App that subscribes to check-suite events. The `claude` App therefore **is installed on this repository already** — but its suite has **no check runs and a `null` conclusion**, which is exactly what an installed App looks like when **there is no workflow for it to be invoked by**. Consistent with §1.2: no `.github/workflows/` exists.

**So the App does not need installing. It needs wiring.** That materially shortens the setup.

> Separately, and not to be confused with the above: the commits on `main` are authored `Claude <noreply@anthropic.com>` by **Claude Code sessions pushing over git**, which is a different mechanism from the GitHub App. Both are in play.

### 1.7 Does pushing to `main` currently bypass review? — YES, COMPLETELY

Three independent lines of evidence, all measured:

1. **Nothing forbids it.** `protected: false`, effective rules `[]`, required checks `[]` (§1.3, §1.4).
2. **It is the established practice.** The most recent pull request is **#87, dated 11 September 2026**. Since that date `main` has received **84 commits**, none of them through a pull request. The v08.28 → v08.31 milestones, the Hadith v08.29 integration and the D3 integration all reached `main` by direct push or local merge-then-push.
3. **Even the historic PRs were not reviewed.** Sampling the ten most recent: every one was opened by `AAAsapp` and closed **20–30 seconds later** by the same account (#87 created `05:06:49Z`, resolved `05:07:15Z` — 26 seconds). No reviewer, no approval, no check.

> **One measurement caveat, stated rather than glossed.** The PR-list endpoint does not return the `merged` field, so the `"merged": false` in those rows is the tool's default, not evidence that the branches went in unmerged. The `merged_at` timestamps are real. The 20–30 second interval is the finding; the merge mechanism is not established and does not need to be.

### 1.8 GitHub Pages — deploying `main` automatically, and this UPGRADES the continuation's record

The continuation package records `GITHUB_PAGES_SERVING = PRESUMED_FROM_MAIN (verified: false)`. **That can now be partly upgraded from presumption to measurement**, though not all the way.

Workflow run **#348** of `pages-build-deployment`:

| Field | Value |
|---|---|
| `head_branch` | **`main`** |
| `head_sha` | **`b700e3f4b0a8004d4fe2701013e053a3c7a25770`** |
| `event` | `dynamic` |
| `status` / `conclusion` | `completed` / **`success`** |
| Finished | **2026-09-19T08:26:36Z** |
| Triggering actor | `AAAsapp` |

And its `deploy` check run concluded **`success`** (§1.5).

**What this proves:** GitHub Pages **built and deployed the exact current `main` commit**, successfully, automatically, within roughly a minute of the push. Run #347 on the preceding commit `972596d` shows `cancelled` — the signature of a superseding push, i.e. continuous auto-deployment of `main`.

**What it still does not prove:** that the site *serves* that build over HTTPS. I confirmed first-hand that this sandbox cannot check — `curl https://madrasatul-muslimeen.github.io/app/` returns `curl: (56) CONNECT tunnel failed, response 403`. And `GET /repos/…/pages`, which would name the configured Pages source, is **blocked by the session proxy**.

**Bottom line for the pilot: a push to `main` triggers an automatic production deployment.** This is the single most important fact in this preflight, and it means the merge gate and the deploy gate are the same gate.

### 1.9 Authentication available to this session

| Mechanism | State |
|---|---|
| `GITHUB_TOKEN` / `GH_TOKEN` | Present, **proxy-mediated** (values begin `proxy-`), not raw PATs |
| Identity | **`AAAsapp`** (id `293311955`, account created 13 Jun 2026) |
| Reported repo permissions | `admin: true`, `maintain: true`, `push: true`, `triage: true`, `pull: true` |
| `gh` CLI | **Not installed** |
| `firebase` CLI | **Not installed** |
| `git` over HTTPS to origin | Working (fetch verified) |
| `node` / `npm` | Present (`node22`) |

**Endpoints the Anthropic session proxy refuses**, so they are unavailable to any Claude session here regardless of token scope:

- `GET /repos/…/pages` — *"Access to this GitHub API path is not permitted through this proxy"*
- `GET /repos/…/environments`
- `GET /repos/…/collaborators`
- `GET /repos/…/actions/permissions`
- `GET /orgs/…/*` — *"sessions are bound to their configured repositories"*

**And one refused by GitHub itself:** `GET /branches/main/protection` → 403 `Resource not accessible by integration`.

> **This asymmetry is itself a design input.** The automation will be able to *read* rulesets and effective branch rules (both answered `200`), but will **never** be able to read or alter Environments, collaborators or Actions permissions. Those are permanently the Owner's, which is a good property for a governance gate — but it also means **the automation cannot verify its own cage**, and the Owner must confirm §2 by eye.

### 1.10 A governance finding in the repository itself — `.claude/settings.json`

Checked into the repository at `.claude/settings.json`, and therefore applied to **any** Claude Code session that opens this repository:

```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "allow": [
      "Bash(node --check *)", "Bash(node serve.js)",
      "Bash(git add *)", "Bash(git commit *)",
      "Bash(git status *)", "Bash(git log *)", "Bash(git diff *)",
      "Bash(firebase deploy *)",
      "mcp__Claude_Browser__navigate", "mcp__Claude_Browser__get_page_text",
      "mcp__Claude_Browser__read_console_messages", "mcp__Claude_Browser__read_page"
    ]
  }
}
```

Two entries deserve the Owner's attention before any automation is enabled:

1. **`"defaultMode": "bypassPermissions"`** — every tool call is pre-approved by default. The allowlist below it is then largely decorative.
2. **`"Bash(firebase deploy *)"`** — **a Firestore Rules deployment is pre-authorised at the harness level.** This directly contradicts the standing brief, which makes Rules deployment an **Owner Control Gate**, and the continuation package, which records `FIREBASE_RULES_DEPLOYED = NO` and E1 as closed.

**This has not caused harm, and the reason is luck rather than design:** E1 is closed, so no session has held `study-monitoring` credentials, and the `firebase` CLI is not even installed in this sandbox. **The moment E1 opens, that line becomes live.** It is recorded here, not changed — changing it is a repository edit and outside a read-only preflight.

### 1.11 The 22g pilot subject — confirmed in the code, and correctly diagnosed

The continuation package's §5.1 diagnosis is **accurate**, and I verified both halves independently.

**The trigger** — `app/js/asma-study.js`, `openScreensaver()`:

```js
screensaverDeck = buildScreensaverDeck();
screensaverIndex = Math.floor(Math.random() * screensaverDeck.length);
showScreensaverSlide();
```

**The assertion** — `tools/i18n-verify/behaviour.mjs`, lines **994–996**, reading a shape that is only *sometimes* rendered:

```js
const saver = await page.evaluate(() => ({
  caption: document.querySelector(".asma-screensaver-caption")?.textContent?.trim(),
  alt:     document.querySelector(".asma-screensaver-img")?.getAttribute("alt"),
  src:     document.querySelector(".asma-screensaver-img")?.getAttribute("src"),
}));
check("22g the screensaver caption is Bangla", BANGLA.test(saver.caption || ""), saver.caption);
check("22g its alt text is translated too (a Bangla screen reader)", BANGLA.test(saver.alt || ""), saver.alt);
check("22g the poster URL is untouched", (saver.src || "").startsWith("https://archive.org/download/"), saver.src);
```

A Name-poster slide renders `.asma-poster`, **not** `.asma-screensaver-img`. On such a slide both `?.getAttribute(...)` calls yield `null`, `(null || "")` is `""`, and all three assertions fail — **with no network request having been made at all.** The label *"the environmental archive.org poster block"* is therefore wrong, exactly as the continuation states, and the failure is a **harness defect**, deterministically reproducible by controlling the seed.

**Ownership is confirmed from the ledger**, which is what makes this the right pilot: `docs/governance/programme-integration-ledger.json` lists `tools/i18n-verify/behaviour.mjs` under **`platformSharedPaths`**. So the fix is:

- **small** — bounded to three assertions in one file;
- **genuinely blocked** on authority, not on difficulty;
- **already mechanically policed** — ledger **guard E** fails an *undeclared* shared-file touch, and requires an `AUTHORIZED` record to carry `{ by, on, reference }` with `by` drawn from a **closed authority set** and `reference` pointing at a record that **exists**.

**That last point is the most valuable thing in this preflight.** The Owner-decision half of the workflow is **already built and already enforced in CI-able code**. The pilot does not need to invent an approval record format; it needs to connect GitHub's approval to the one the ledger already demands.

---

## 2. REQUIRES THE OWNER — must be checked in GitHub's web settings

I could not read any of the following. Each is blocked either by the Anthropic session proxy or by token scope (§1.9). **Please confirm each before the pilot is enabled.** Nothing here is a suspicion of a problem; these are simply facts the automation is structurally unable to establish about itself.

| # | What to check | Where | Why it matters |
|---|---|---|---|
| **W1** | **Pages source** — is it *Deploy from a branch* (`main`) or *GitHub Actions*? | Settings → Pages | Decides whether the deploy gate is a branch rule (§1.8) or an Environment. If it is Actions-sourced, a `github-pages` Environment already exists and is the natural place for the Owner-approval gate. |
| **W2** | **Environments and their protection rules** — do any exist? any required reviewers? | Settings → Environments | This is the **only** GitHub primitive that can pause a deployment for a named human. It is the intended home of the Owner deploy gate. |
| **W3** | **Collaborators and org roles** — who holds `admin` besides `AAAsapp`? Is the Owner a distinct GitHub account? | Settings → Collaborators; Org → People | **A one-account repository cannot have a real review gate.** GitHub forbids approving your own PR, so if Owner and builder are the same login, "requires 1 approval" is unsatisfiable. See **R3** — this is the pilot's biggest open risk. |
| **W4** | **Organization rulesets** — any targeting this repo? | Org → Rules → Rulesets | Effective rules on `main` are `[]` (§1.4), so none currently *reaches* `main`. Worth confirming none is in *Evaluate* mode about to be enforced. |
| **W5** | **Actions permissions** — allowed actions; default `GITHUB_TOKEN` permissions (read vs write); **"Allow GitHub Actions to create and approve pull requests"** | Settings → Actions → General | If that last box is **ticked, the automation can approve its own pull requests** and the entire gate is void. It must be **unticked**. |
| **W6** | **Claude App installation scope** — which repositories; what permissions was it granted? | Settings → GitHub Apps → Claude → Configure | App id `1236702` is installed (§1.6). Confirm it covers this repo and note whether it holds `contents: write`. |
| **W7** | **Existing repository / org secrets and variables** | Settings → Secrets and variables → Actions | Determines whether `ANTHROPIC_API_KEY` (or an OAuth token) already exists, or must be added, before any Claude workflow can run. |
| **W8** | **Firebase Console access to `study-monitoring`** — E1 | Firebase Console | Still recorded **CLOSED**. Unchanged by this preflight, and **not required for the 22g pilot**, which is why 22g is the right first subject. |

---

## 3. The minimum setup for a pilot that cannot merge or deploy without Owner approval

### 3.1 The two escape routes that must both close

Any gate that does not close **both** of these is decorative.

| # | Route | Status today | What closes it |
|---|---|---|---|
| **E-a** | **Direct push to `main`** | **Wide open** — unprotected, no rules, and 84 consecutive commits arrived this way | A ruleset on `main` requiring a pull request, **with no bypass actors** |
| **E-b** | **Automatic Pages deploy of `main`** | **Wide open** — proven by run #348 deploying `b700e3f` within a minute | Closing **E-a** closes this too, *because Pages deploys `main`*. Belt-and-braces: an Environment with a required reviewer (**W1/W2**) |

**There is also a third, quieter route: `.claude/settings.json` pre-approves `Bash(firebase deploy *)` (§1.10).** It is dormant only because E1 is closed. It must be closed **before** E1 opens, not after.

### 3.2 The minimum control set

Six items. Anything less leaves a hole; anything more is not needed for a pilot.

**M1 — A repository ruleset on `main`.** Target `main`; enforcement **Active**:
- Require a pull request before merging — **1 required approval**
- **Dismiss stale approvals when new commits are pushed**
- Require review of the most recent push
- Block force pushes; restrict deletions
- **Required status checks:** the CI check from **M3** — *but only after **M4***
- **🔴 Bypass list: EMPTY.** This is the item that decides whether the pilot is real. The automation identity reports `admin: true` (§1.9), so **any** "admins can bypass" allowance hands it the key to its own cage.

**M2 — A `CODEOWNERS` file** naming the Owner's GitHub account for `/docs/governance/`, `/firestore.rules`, `/app/js/version.js`, `CLAUDE.md`, and the platform-shared paths the ledger already enumerates — plus **"Require review from Code Owners"** in M1. This is what makes the approval *the Owner's specifically*, rather than anyone's.

**M3 — One CI workflow** (`.github/workflows/verify.yml`) running the deterministic `tools/i18n-verify` suites from the **repository root** and publishing one status check. Start with the suites that are pure and already green — `programme-ledger` (A–G), `programme-ledger-mutations` (49/0), `brief-integrity` (8/0), `study-activity-evidence-boundary` (27/0), `study-event-wiring` (41/0), `rules-authorisation-executable` (38/0). **Leave `behaviour.mjs` out of the required check at first** — see **R1**.

**M4 — Establish the CI baseline before requiring anything.** Merge M3 as a **non-required** check and let it run on several pull requests first. Only once its green/red behaviour is understood should it be added to M1's required list. Requiring a check whose baseline nobody has measured is how a pilot deadlocks on day one.

**M5 — Wire the already-installed Claude App** (`.github/workflows/claude.yml`, plus the secret from **W7**) so the *auditor* stage runs as a PR review rather than as a human reading a report. **Its permissions must be `contents: read`, `pull-requests: write` — never `contents: write`**, so the auditor can speak but cannot merge.

**M6 — Move the Firebase deploy behind an Environment** with the Owner as required reviewer (**W2**), and **remove `Bash(firebase deploy *)` and `"defaultMode": "bypassPermissions"` from `.claude/settings.json`** (§1.10). Not needed to *start* the 22g pilot; needed before E1 opens.

### 3.3 How the four roles map onto these controls

| Workflow stage | GitHub mechanism | Depends on |
|---|---|---|
| **Master Architect** issues a bounded task | An Issue, labelled; or the ledger's authorisation record | Issues already enabled (§1.1) |
| **Claude builder** implements | A session pushing to a `claude/…` branch and opening a PR — **never to `main`** | **M1** |
| **Auditor** verifies | **M3** status check (mechanical) + **M5** Claude review (judgement) | **M3**, **M4**, **M5** |
| **Owner decision** | The **required approving review** on the PR, recorded afterwards as the ledger's `AUTHORIZED { by, on, reference }` | **M1**, **M2**, **W3** |

**The ledger is the asset here.** Guard E already refuses an undeclared shared-file touch and already validates the authorisation record's shape against a closed authority set. The pilot does not design an approval record — it makes GitHub's approval *produce* the one the repository already insists on.

### 3.4 Why 22g is the right pilot, stated plainly

It exercises **every stage** and **risks nothing**: it touches a **platform-shared** file (so it genuinely needs Master Architect authorisation and genuinely trips guard E), it is **three assertions in one file**, it **cannot affect application behaviour** — `behaviour.mjs` is test tooling, not shipped code — and it is **independent of E1**. A pilot that fails teaches you about the gate, not about the Qur'an app.

---

## 4. Risks and cautions to settle before starting

| # | Risk | Note |
|---|---|---|
| **R1** | **`behaviour.mjs` cannot exit 0 in this sandbox.** `31e` fails unconditionally on TLS interception (`net::ERR_CERT_AUTHORITY_INVALID`) on every commit. | **Do not make it a required status check until it has been run inside GitHub Actions**, where there may be no TLS interception and the result may differ. If it still cannot reach 0, the required check must encode the repository's own standard — *no **new** failure against clean `main`* — not a bare exit code. **Unmeasured either way: I did not run it, and the runner's TLS behaviour is not knowable from here.** |
| **R2** | **`22g` is random.** It flips on identical code — the continuation measured 4 photo / 10 Name over 14 opens, and clean `main` scored 978/4 while the D3 candidate scored 980/2. | A randomly-failing check in a **required** list will block merges arbitrarily. Either fix 22g **first** (the pilot) or keep `behaviour.mjs` advisory until it is fixed. These two risks point the same way. |
| **R3** | **A single-account repository cannot have a review gate.** | Every recent PR was opened and closed by `AAAsapp` within ~26 seconds. GitHub will not let an account approve its own pull request, so if the Owner and the builder are the same login, **"1 required approval" is unsatisfiable and the pilot cannot start.** **This is the highest-priority item to resolve — it is `W3`, and it is a prerequisite, not a detail.** |
| **R4** | **Admin bypass voids everything.** The automation identity reports `admin: true`. | M1's bypass list must be **empty**. |
| **R5** | **Actions approving PRs.** If **W5**'s setting is on, automation can self-approve. | Must be off. |
| **R6** | **Turning on protection changes how every existing session works.** 84 consecutive commits reached `main` directly; that stops working the moment M1 is Active. | Expect the habit, and the standing brief's own *"Push it always, don't need permission"* instruction, to need restating. **That is a governance change and the Owner's call, not Claude's.** |
| **R7** | **The automation cannot audit its own cage.** Environments, collaborators and Actions permissions are proxy-blocked (§1.9). | §2 must be re-checked by the Owner by eye, and after any change. |

---

## 5. Exact next setup steps, in order

**Do these in this order. Steps 1–2 are the Owner's alone and gate everything after them.**

**Step 1 — Owner answers `W1`–`W7` in the web UI (§2).** Fifteen minutes of reading settings pages. Nothing is changed yet.

**Step 2 — Owner resolves `R3` / `W3`: confirm there are two distinct GitHub accounts**, one that approves and one that builds. If there is only one, decide which of these to adopt *before* anything else, because the pilot's shape depends on it:
- add a second account as the Owner-approver (**recommended** — it is the only option that makes "Owner approval" a real GitHub object); or
- run the pilot with approval recorded in the **ledger** only, with GitHub enforcing *"a PR must exist and CI must be green"* but not *"a human approved"*; or
- have the Owner approve from their own account and the automation build from `AAAsapp`.

**Step 3 — Add the CI workflow (`M3`), NOT required.** One PR from a `claude/…` branch adding `.github/workflows/verify.yml`. Deterministic pure suites only, run from the repository root. `permissions: contents: read`.

**Step 4 — Measure the baseline (`M4`).** Let it run on two or three PRs. Record what green looks like. **Separately, run `behaviour.mjs` once in Actions** to settle `R1` with a measurement instead of an assumption.

**Step 5 — Add `CODEOWNERS` (`M2`)**, naming the Owner account confirmed in Step 2.

**Step 6 — Wire the Claude App (`M5`).** Add the secret from `W7` and `.github/workflows/claude.yml`. **`contents: read`, `pull-requests: write`.** Confirm the App posts a review on a throwaway PR.

**Step 7 — Enable the ruleset (`M1`).** Only now. Target `main`, Active, require PR + 1 approval + Code Owner review, dismiss stale approvals, block force push, required check = Step 3's, **bypass list empty**. Confirm `GET /repos/…/rules/branches/main` **no longer returns `[]`** — that single call is the proof the gate is live, and it is one the automation *can* make.

**Step 8 — Run the 22g pilot end to end.** Master Architect authorises the shared-file touch → builder branches and fixes `behaviour.mjs:994–996` to accept **both** slide shapes (or to seed the index deterministically under test) → CI runs → Claude audits → **Owner approves** → merge. Then record the `AUTHORIZED { by, on, reference }` entry in the ledger and confirm **guard E** passes.

**Step 9 — Only after the pilot: close the Firebase route (`M6`)** — Environment with required reviewer, and clean `.claude/settings.json`. **Must precede E1 opening.**

---

## 6. State block

```
MMSA_AUTOMATION_PILOT_PREFLIGHT
ISSUED=2026-09-19
MODE=READ_ONLY -- nothing installed, added, enabled, configured, edited or deployed
MAIN_SHA=b700e3f4b0a8004d4fe2701013e053a3c7a25770
MAIN_VERSION=08.31
REPO_VISIBILITY=public
REPO_OWNER_TYPE=Organization
GITHUB_ACTIONS_WORKFLOWS=1 (pages-build-deployment, path dynamic/pages -- GitHub-generated, not repo-authored)
DOT_GITHUB_DIRECTORY=ABSENT (no workflows, no CODEOWNERS, no PR/issue templates)
BRANCH_PROTECTION_MAIN=NONE (protected:false, enabled:false, required_status_checks enforcement_level:off)
REPO_RULESETS=[] (empty)
EFFECTIVE_RULES_ON_MAIN=[] (empty -- covers repo AND org rulesets)
REQUIRED_STATUS_CHECKS=NONE
PR_CHECKS=3, all github-actions Pages build/deploy; none tests the application
CLAUDE_APP=INSTALLED (app id 1236702, slug `claude`) but INERT -- empty check suite, no workflow to invoke it
PUSH_TO_MAIN_BYPASSES_REVIEW=YES -- 84 commits since last PR (#87, 11 Sep); historic PRs self-closed in 20-30s
PAGES_AUTO_DEPLOY=YES -- run #348 built AND deployed head_sha b700e3f from main, success, 2026-09-19T08:26:36Z
PAGES_SERVING_VERIFIED=NO -- sandbox proxy refuses github.io (CONNECT 403); /repos/../pages blocked by proxy
MERGE_EQUALS_DEPLOY=TRUE -- protecting main protects production
AUTH_AVAILABLE=proxy-mediated GITHUB_TOKEN as AAAsapp (admin:true reported); no gh CLI; no firebase CLI
PROXY_BLOCKED=/pages /environments /collaborators /actions/permissions /orgs/*
TOKEN_BLOCKED=/branches/main/protection (403 Resource not accessible by integration)
REPO_SETTINGS_FINDING=.claude/settings.json has defaultMode bypassPermissions AND pre-approves Bash(firebase deploy *)
FIREBASE_DEPLOY_PREAPPROVED=YES in .claude/settings.json -- dormant only because E1 is closed and firebase CLI absent
E1_STATUS=CLOSED (unchanged; NOT required for the 22g pilot)
PILOT_22g_CONFIRMED=behaviour.mjs:994-996 read .asma-screensaver-img unconditionally; asma-study.js openScreensaver() starts at Math.random()
PILOT_22g_OWNERSHIP=tools/i18n-verify/behaviour.mjs is in ledger platformSharedPaths -- needs Master Architect authorisation
LEDGER_GUARD_E=already enforces declared shared touches + AUTHORIZED {by,on,reference} from a closed authority set
MINIMUM_CONTROLS=M1 ruleset(no bypass) M2 CODEOWNERS M3 CI M4 baseline-first M5 Claude App wiring M6 Firebase Environment
TOP_RISK=R3 -- a single GitHub account cannot satisfy a required approving review; resolve BEFORE anything else
BLOCKING_PREREQUISITES=W3 (two distinct accounts), W5 (Actions must not be allowed to approve PRs)
NEXT_STEP=Owner answers W1-W7, then resolves R3; no repository change until both are done
NOTHING_CHANGED=TRUE
22g_FIX_STARTED=NO
```
