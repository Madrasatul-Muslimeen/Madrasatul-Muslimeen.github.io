# MMSA governance automation — audit of pilot step 2, the Claude GitHub Action wiring

**Date:** 19 September 2026
**Instruction audited:** *"On a new branch, prepare the Claude GitHub Action wiring and open a PR, but do not merge it. Establish from the real configuration how a Claude-created PR is authored by a bot distinct from `AAAsapp` and triggers `Deterministic governance suites`. … Do not call an empty check suite or a declared permission a successful pilot."*

**Result: the build already existed. This is its audit, not a second copy of it.**

`app/` is untouched. `app/js/version.js` stays **`08.31`**, **`08.32` stays UNALLOCATED**, `firestore.rules` is untouched, E1 stays closed, no repository setting was changed, **no credential was created and no secret was printed.**

---

## 1. The reported SHA was correct — for the first time in three handovers

| | |
|---|---|
| Reported `origin/main` | `b87133461680d3c2837f7bd75fc5c824e10090d3` |
| **Actual `origin/main`, fetched and read back** | **`b87133461680d3c2837f7bd75fc5c824e10090d3`** — identical |
| `main` tip subject | *Repoint the brief's handover pointer, and stamp the continuation's main SHA* |
| Application version on the remote | **`08.31`** |
| PR #88 (pilot step 1) | **MERGED** at `fa06217` |

The continuation's lesson 11 says *"verify a reported SHA before using it."* It was verified. It had **not** moved. That is recorded as plainly as a drift would have been — a check that passes is evidence, not a formality.

---

## 2. The instruction had already been carried out

[PR #89](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/89) — *"Pilot step 2: wire the Claude GitHub Action as a reviewable, inert configuration"* — was opened on 19 September at 09:37 UTC by an earlier Claude session, and is **open, not merged, `mergeable_state: clean`**, one file, +125 lines, `.github/workflows/claude.yml`.

| What the instruction asked for | Where it is |
|---|---|
| New branch, wiring prepared, PR opened, **not merged** | **Done** — `claude/pilot-claude-app-wiring`, PR #89, open |
| Identity mechanism established from real configuration | **Done** — and independently re-verified below |
| No assumption that the App token is ambient | **Done** — and correct; see §3 |
| No credential created, no secret printed | **Done** — verified by reading the workflow |
| Narrow permissions | **Done** — four, each justified inline |
| No app / version / Rules / settings change | **Done** — one file, `.github/` only |
| **Dated `.md` and `.html` reports** | **NOT DELIVERED.** PR #89 changed exactly one file, and no automation report exists under `docs/reports/` |

**So one thing was genuinely missing, and it is the thing the Master Architect asked for twice. This file and its `.html` twin are that deliverable.**

**I did not open a duplicate PR.** A second PR adding the same workflow would have put two competing copies of `claude.yml` in front of the Owner and split the review. Where a bounded instruction has already been executed, the useful work is auditing it.

---

## 3. The identity mechanism — verified from the Action's own source

The warning *"do not assume the installed App's token is available inside a workflow"* was the right one to give. **It is not ambient**, and the way it is obtained is specific.

Read from `anthropics/claude-code-action` at `main`:

**`src/github/token.ts`** — when `github_token` is **not** supplied:

1. `core.getIDToken("claude-code-github-action")` mints a GitHub Actions OIDC token. **This is why `id-token: write` is load-bearing rather than boilerplate — without it there is no OIDC token, no App token, and no bot identity.**
2. It `POST`s that token to `https://api.anthropic.com/api/github/github-app-token-exchange`.
3. It receives back `{ token | app_token }` — a short-lived **installation token for the Claude GitHub App already installed on this repository**.

**`src/github/constants.ts`** — the bot identity is a declared constant, not an inference:

```
export const CLAUDE_APP_BOT_ID = 41898282;
export const CLAUDE_BOT_LOGIN  = "claude[bot]";
```

**Two credentials are in play and they are easy to conflate. The audit turns on keeping them apart:**

| | Authenticates to | Supplied by |
|---|---|---|
| **GitHub identity** (`claude[bot]`) | GitHub | The installed Claude App, via the OIDC exchange above. **Not a stored secret.** |
| **Claude API identity** | `api.anthropic.com` | **The Owner.** `ANTHROPIC_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`, or Workload Identity Federation |

`docs/setup.md` in the same repository confirms the second: the App installation does **not** supply the Anthropic credential. That is the blocker, and it is not the one the phrase "the App is installed" suggests.

**Minor item recorded as unverified:** I could not resolve the numeric id `41898282` to an account from this sandbox — the egress proxy refuses `api.github.com` user lookups. The constant is quoted as the source declares it. It governs the **git committer string**, not PR authorship, which is determined by the token; so it does not affect the conclusions below.

---

## 4. Four identity routes, and only one satisfies all three requirements at once

The instruction asks for a PR that is **(a)** authored by a bot distinct from `AAAsapp`, **(b)** able to trigger `Deterministic governance suites`, and **(c)** approvable by `AAAsapp`. Those three are in tension, and that tension is the whole finding.

| Route | Author ≠ `AAAsapp`? | Triggers `verify`? | `AAAsapp` can approve? | Needs an Owner credential? |
|---|---|---|---|---|
| **A Claude Code session** (this one, and the one that opened #89) | **NO — it *is* `AAAsapp`** | Yes | **No** — self-approval is blocked | Already present |
| Workflow `GITHUB_TOKEN` → `github-actions[bot]` | Yes | **NO** — GitHub's loop-prevention rule | Yes | No, but needs a repo setting |
| PAT on a machine account | Yes | Yes | Yes | **Yes** — new account + PAT |
| Custom GitHub App token | Yes (`<app>[bot]`) | Yes | Yes | **Yes** — App id + private key |
| **Claude App token via OIDC exchange** (what PR #89 selects) | **Yes — `claude[bot]`** | **Expected yes**, never observed | **Yes** | **Yes** — the Anthropic credential |

On the second row, `peter-evans/create-pull-request`'s concepts guide states the rule plainly: *"When you use the repository's `GITHUB_TOKEN` to perform tasks, events triggered by the `GITHUB_TOKEN` will not create a new workflow run"*, and pull requests created with it *"cannot trigger other workflows. If you have `on: pull_request` … workflows acting as checks on pull requests, they will not run."* It lists a GitHub App token as a documented way round it. **PR #89's decision to omit `github_token` is therefore correct, and its stated reasoning holds.**

---

## 5. THE CENTRAL FINDING — PR #89 cannot demonstrate Gate 2, because `AAAsapp` authored it

`PR #89.user.login` is **`AAAsapp`** (id `293311955`). So is PR #88's. So is every workflow run's `triggering_actor`.

**This session authenticates the same way.** `get_me` returns `AAAsapp`. That is not incidental — **a Claude Code session in this environment acts as the Owner's own account, so no session can produce a bot-authored PR from the sandbox at all.** The `claude[bot]` identity exists only *inside a GitHub Actions run of `claude.yml`*, which cannot happen until that file is on the default branch.

The consequences, stated separately because they are different facts:

- PR #89 **does** prove the gate runs on a pull request. (§6.)
- PR #89 proves **nothing** about a bot-authored PR — no such PR has ever existed in this repository.
- **`AAAsapp` cannot approve PR #89.** GitHub does not let a pull request's author submit an approving review on it. The Owner's approval path is therefore *also* untested.

**A warning that follows directly, and it matters for the ordering of Gate 3.** If branch protection is enabled requiring one approving review **while `AAAsapp` is both the only human and the author of every PR, the repository deadlocks** — no PR could ever be merged, including the one that would fix it. The Master Architect's instruction *"do not enable branch protection until a bot-created test PR and Owner approval path are observed"* is not caution; it is the only order that works. This audit supplies the mechanism behind it.

---

## 6. Observed check execution — read from the job log, not from a report

The instruction says not to call an empty check suite a successful pilot. So the log was read.

Run `35435223928`, job `105876627516`, on PR #89's head `a1b676b`, conclusion **success**. Its closing recap:

| Suite | Exit | Result |
|---|---|---|
| `programme-ledger` | 0 | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 0 | **49 passed, 0 failed** |
| `brief-integrity` | 0 | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 0 | 27 passed, 0 failed |
| `study-event-wiring` | 0 | **41 passed, 0 failed** |
| `rules-authorisation-executable` | 0 | 38 passed, 0 failed |

The log carries real per-check `PASS` lines above the recap, and **every figure matches the continuation's §9 baseline exactly.** The check is genuinely executing. It is not an empty green.

**A near-miss worth recording, because it is the house lesson in miniature.** The job's step timings show *"Run the six deterministic governance suites"* starting and completing **in the same second**, and I drafted that as a finding — six Node suites, including a 49-mutation harness, cannot run in under a second. **Reading the log disproved it.** The suites are pure static analysis and genuinely are sub-second; the step boundary simply rounds. *A grep of timings is not a reading of the log*, and had this been reported it would have been a false finding of exactly the kind this project keeps catching.

---

## 7. The shallow-clone false red, reproduced and cured independently

Before writing anything I ran the six suites in this sandbox and got:

```
programme-ledger-mutations   exit 1   42 passed, 7 failed
brief-integrity              exit 1    6 passed, 2 failed
```

Those are **the exact figures PR #88's commit message records** as the artefact it was built to prevent. After `git fetch --unshallow` and fetching all heads (64 remote branches), the same six returned to **8/23/0 · 49/0 · 8/0 · 27/0 · 41/0 · 38/0** — the documented baseline, to the number.

So PR #88's diagnosis and its remedy are **independently confirmed on a second machine**: the failures name branches, they are an artefact of the clone, and `fetch-depth: 0` plus the ref-assertion step is the correct fix rather than a weakened suite.

---

## 8. A gate-coverage gap that is still open

`tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs` exists, passes **11/0** (confirmed locally, matching the baseline), and is **not among the six suites the gate runs.**

It is the harness that proves the evidence-boundary guard *can fail*. Its absence means the gate runs a guard without running the check that the guard is alive — the precise shape of the `study-event-wiring.mjs` defect that sat dead for a whole version. The earlier session flagged it; **it remains unaddressed, and it is a one-word change to the suite list.**

---

## 9. What merging PR #89 would, and would not, buy

`claude.yml` triggers on **`issue_comment` only**, gated on the body containing `@claude`.

So even with a credential added and the file on `main`, the loop is:

> Master Architect writes a task → **a human pastes it as a GitHub comment** → `claude[bot]` builds → opens a PR → `verify` runs → Owner approves.

That removes the relay of *results* back to the Owner, and it gives a bot author that `AAAsapp` can approve. **It does not connect this ChatGPT conversation to Claude, and it does not remove the paste.** Gate 4 in the automation-status table stands exactly where it stood. Nothing in PR #89 should be read as narrowing it.

---

## 10. A ChatGPT-side bot already has access to this repository

`chatgpt-codex-connector[bot]` (id `199175422`) submitted a review on PR #89 at 09:43 UTC. Its state is **`COMMENTED`, not `APPROVED`**, and it carried **no findings** — only its own explanatory boilerplate.

Two things follow. **It is not an approval** and must not be counted as one toward Gate 2. And a Codex review of a workflow file is a weak signal: it is the reviewer least able to judge a claim about GitHub token exchange, which is why this audit reads the Action's source instead.

Recorded because it is materially relevant to the Master Architect's Gate 4 thinking: an OpenAI-side integration with repository access **already exists here** and may be a shorter path to chat-to-builder handoff than a new orchestration service. **No recommendation is made — that is an Owner decision with its own cost and security review.**

---

## 11. Proven, inferred, untested — kept separate

| Claim | Status |
|---|---|
| The six-suite gate executes on a real PR and matches the baseline | **PROVEN** — job log read, and reproduced locally |
| The Claude App token is obtained by OIDC exchange, not ambient | **PROVEN from source** — `token.ts`, `constants.ts` |
| `id-token: write` is required for that exchange | **PROVEN from source** |
| Omitting `github_token` is what selects the bot identity | **PROVEN from source** |
| The Anthropic credential is the Owner's to add | **PROVEN** — `docs/setup.md` |
| PR #89 is inert without a credential | **PROVEN by reading the workflow** — the preflight gates every later step |
| A `claude[bot]` PR **would** trigger `verify` | **INFERRED.** Well-supported (App tokens are the documented way round the `GITHUB_TOKEN` rule) but **never observed here** |
| `AAAsapp` can approve a `claude[bot]` PR | **INFERRED** from the authorship rule; **never observed** |
| The exchange is refused with `workflow_not_found_on_default_branch` before merge | **REPORTED by the earlier session, not re-verified here** — it cannot be, without merging |
| The Claude path end-to-end | **UNTESTED. No Claude run has ever occurred in this repository.** |

---

## 12. Exact Owner setup, click by click

**Nothing here has been done for you, and none of it should be done before the Master Architect rules on §5.**

**Step 1 — choose the Claude API credential.** Exactly one:

| | What to add | Stores a secret? |
|---|---|---|
| **(a)** | Repository secret `ANTHROPIC_API_KEY` | Yes |
| **(b)** | Repository secret `CLAUDE_CODE_OAUTH_TOKEN`, and swap the input in `claude.yml` | Yes |
| **(c)** | Workload Identity Federation — three identifiers, no stored credential | **No** |

Option (c) needs an Anthropic Console admin to register a GitHub Actions issuer, a service account and a federation rule. It is the only option that puts no long-lived secret in GitHub.

**To add a secret (a or b):** repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** → name it exactly as above → paste the value → **Add secret**. Paste it **only** into that box. Never into a comment, a file, or a chat message.

**Step 2 — merge PR #89.** It is inert until step 1 is done, so the order is safe either way. Merging is what puts `claude.yml` on the default branch, which the token exchange requires before it will ever succeed.

**Step 3 — the first real test.** Comment `@claude` plus a small, throwaway task on any issue or PR. Then check three things and report them separately:
1. Does a PR appear, and is its author **`claude[bot]`** rather than `AAAsapp`?
2. Does **`Deterministic governance suites`** appear and run on it?
3. On that PR, is **Approve** available to `AAAsapp`?

**Those three answers are Gate 2. Until all three are observed, do not enable branch protection** — see the deadlock in §5.

**Do not** tick *"Allow GitHub Actions to create and approve pull requests"* for this. It governs the `GITHUB_TOKEN` route, which PR #89 deliberately does not use, and the approval half of it is a control worth leaving off.

---

## 13. Recommendation

1. **Do not re-do step 2.** PR #89 is the deliverable; it is sound, its central claim is verified from source, and its reasoning for omitting `github_token` is correct.
2. **Read §5 before merging.** PR #89 cannot prove Gate 2, and the Owner-approval path is untested. Merging is still the right next move — it is the only way to reach the test — but it should be merged knowing what it does and does not establish.
3. **Add `study-activity-evidence-boundary-mutations` to the gate** (§8). One word, and it closes a real hole.
4. **Nothing here touches E1**, the Firestore Rules, the indexes, evidence readiness, or `v08.32`. The automation pilot and the deployment gate remain entirely separate, and this work moved neither.

---

## 14. State block

```
MMSA_AUTOMATION_PILOT_STEP2_AUDIT
ISSUED=2026-09-19
MAIN_SHA_VERIFIED=b87133461680d3c2837f7bd75fc5c824e10090d3 (reported SHA was CORRECT)
MAIN_VERSION=08.31
V0832_STATUS=UNALLOCATED
STEP2_PR=#89 OPEN, NOT MERGED, mergeable_state=clean, 1 file, +125
STEP2_ALREADY_DONE=YES -- no duplicate PR was opened
MISSING_DELIVERABLE_NOW_CLOSED=dated .md and .html reports
IDENTITY_MECHANISM=OIDC (aud claude-code-github-action) -> api.anthropic.com/api/github/github-app-token-exchange -> Claude App installation token
APP_TOKEN_AMBIENT=NO -- requires id-token: write AND github_token unset
CLAUDE_BOT_LOGIN=claude[bot] (CLAUDE_APP_BOT_ID=41898282, numeric id NOT independently resolved here)
ANTHROPIC_CREDENTIAL=OWNER'S TO ADD -- not supplied by the App installation
PR89_AUTHOR=AAAsapp (293311955) -- SO PR #89 CANNOT DEMONSTRATE GATE 2
SESSION_IDENTITY=AAAsapp -- a Claude Code session here cannot produce a bot-authored PR at all
SELF_APPROVAL=BLOCKED BY GITHUB -- AAAsapp cannot approve PR #89
BRANCH_PROTECTION_WARNING=requiring an approval while AAAsapp authors every PR DEADLOCKS the repository
CHECK_EXECUTION=PROVEN from job log 105876627516; six suites, baseline figures exactly
GATE_COVERAGE_GAP=study-activity-evidence-boundary-mutations (11/0) exists and is NOT in the six
SHALLOW_CLONE_ARTEFACT=REPRODUCED (6/2, 42/7) and CURED (8/0, 49/0) independently
CLAUDE_YML_TRIGGER=issue_comment only -- a human paste is still required; GATE 4 NOT CLOSED
CODEX_BOT=chatgpt-codex-connector[bot] reviewed PR #89, state COMMENTED, no findings, NOT an approval
BOT_PR_TRIGGERS_CI=INFERRED, NEVER OBSERVED
OWNER_CAN_APPROVE_BOT_PR=INFERRED, NEVER OBSERVED
CLAUDE_RUN_EVER_EXECUTED=NO
E1_STATUS=CLOSED -- untouched by this work
FIREBASE_RULES_DEPLOYED=NO -- untouched by this work
APP_CODE_CHANGED=NO
CREDENTIAL_CREATED=NO
SECRET_PRINTED=NO
```
