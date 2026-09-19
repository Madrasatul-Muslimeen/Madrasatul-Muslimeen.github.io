# MMSA governance automation — the main rule verified, and PR #89 merged

**Date:** 19 September 2026 (UTC; the ruleset's own timestamp reads `2026-09-20T09:46:47+10:00`, which is `2026-09-19T23:46:47Z` — the same moment in the Owner's local time)

**Result: every stated condition was met, so PR #89 was merged under the standing conditional instruction. `main` is now `ee3ca08dbcc40950d56e141685b7b5a1c068225c`.**

No application code changed. `app/js/version.js` stays **`08.31`**, **`08.32` stays UNALLOCATED**, `firestore.rules`, `firebase.json`, `docs/governance/`, `CLAUDE.md`, `CHANGELOG.md` and `tests/` are **all untouched by the merge**. **No credential was added, no required status check enabled, no Firebase Rules deployed, and no Claude bot task started.**

---

## 1. The `main` rule — read back, condition by condition

Ruleset **`23712251`**, *"main: require a pull request"*. Read from three endpoints so that "it applies to `main`" is observed rather than inferred from the target expression alone.

| Condition required | Verified value | Verdict |
|---|---|---|
| Rule exists and is **active** | `"enforcement": "active"` | **PASS** |
| Targets `main` | `target: "branch"`, `conditions.ref_name.include = ["~DEFAULT_BRANCH"]` — **and** `GET /rules/branches/main` returns it, so it demonstrably applies to `main` | **PASS** |
| Requires a pull request | `rules[0].type = "pull_request"` | **PASS** |
| **0** required approvals | `required_approving_review_count: 0` | **PASS** |
| Owner admin recovery available | `bypass_actors: [{ actor_id: 5, actor_type: "RepositoryRole", bypass_mode: "always" }]`, **and** `"current_user_can_bypass": "always"` | **PASS** |
| **No Claude App bypass** | Exactly **one** bypass actor, and it is a `RepositoryRole`. **No `Integration` actor of any kind** | **PASS** |
| **No required status check yet** | `rules[]` contains **only** `pull_request`; no `required_status_checks` rule | **PASS** |

**On the bypass actor, stated precisely.** I did **not** independently resolve the numeric `actor_id: 5` to a role name — that mapping is not something I verified. What I did verify is the API's own answer for the authenticated admin: **`current_user_can_bypass: "always"`**. That is direct evidence that Owner recovery works, and it is better evidence than a guessed identifier.

**And the bot is not covered by it.** The bypass is granted to a *repository role*. `claude[bot]` acts through an App installation token holding `contents: write` — **it is not a repository admin and there is no `Integration` bypass actor**, so it cannot bypass this rule. That is the protection the rule exists to provide.

**No write was attempted.** Every call in this section was a `GET`. The documented `403` on ruleset writes stands as established and was not retried.

---

## 2. Pre-merge re-verification

| Check | Result |
|---|---|
| PR #89 head | **`e73d1dea39d47b86ac531f9db475beec16f00cf1`** — matches the instruction exactly |
| Diff vs base `fa06217` | **2 files**: `claude.yml` (new, +326), `verify.yml` (+22/−7) |
| `mergeable_state` | **`clean`** |
| Check `Deterministic governance suites` | **success** — run `35471648100`, job `105973553348` |
| Recap in that run | `8/23/0 · 49/0 · 8/0 · 27/0 · 11/0 · 41/0 · 38/0` — **seven suites** |
| **P1 fix still valid on the head** | `claude_args` is exactly `--model "claude-opus-5"`; **no `allowedTools`, no `Bash(`, no `node`**; `use_commit_signing: true`; `github_token` omitted |

Every condition held, so the conditional instruction activated.

---

## 3. The merge

| | |
|---|---|
| Method | **merge commit** (history preserved — the four commits and their reasoning survive) |
| Guard used | `expectedHeadSha = e73d1de…` — the merge would have been refused had the head moved |
| Merge commit | **`ee3ca08dbcc40950d56e141685b7b5a1c068225c`** |
| `main` before → after | `b871334…` → **`ee3ca08…`** |

---

## 4. Post-merge verification of `main`

| Check | Result |
|---|---|
| `origin/main` | **`ee3ca08dbcc40950d56e141685b7b5a1c068225c`** — re-fetched and read back |
| Total change to `main` | **2 files, +341 / −7 — both under `.github/workflows/`** |
| `app/`, `tools/`, `firestore.rules`, `firebase.json`, `docs/governance/`, `CLAUDE.md`, `CHANGELOG.md`, `tests/` | **byte-untouched** — `git diff` over those paths is empty |
| `app/js/version.js` on `main` | **`08.31`** — unchanged |
| Workflow files on `main` | `.github/workflows/claude.yml`, `.github/workflows/verify.yml` |
| `claude.yml` on `main` — trigger | `issue_comment: [created]` |
| `claude.yml` on `main` — gate | `contains(body,'@claude') && author_association ∈ {OWNER, MEMBER, COLLABORATOR}` |
| `claude.yml` on `main` — permissions | `contents`/`pull-requests`/`issues`/`id-token: write` |
| **`claude.yml` on `main` — P1 fix** | **INTACT.** `claude_args` = `--model "claude-opus-5"`; zero Bash tools; `use_commit_signing: true`; `github_token` omitted |
| `verify.yml` on `main` — suites | **7**, in order: `programme-ledger`, `programme-ledger-mutations`, `brief-integrity`, `study-activity-evidence-boundary`, `study-activity-evidence-boundary-mutations`, `study-event-wiring`, `rules-authorisation-executable` |
| Rule after the merge | still **1 rule, `pull_request`, approvals `0`** |

**A note so nothing is misread: `verify.yml` did not run on this merge, and that is correct.** It triggers on `pull_request` only. The merge is a push to `main`, so no gate run appears — the gate already ran on the head that was merged.

**What changed in practice:** `claude.yml` is now on the default branch, which is what the App token exchange validates against. The workflow is therefore *reachable* for the first time — and **still inert**, because no Claude authentication is configured, so the preflight stops the job before checkout.

---

## 5. Owner Gate 2 — the credential (now unlocked)

PR #89 is verified on `main`, so per the instruction the location and name are released. **Add exactly one.** Simplest is (a).

| | Where | Exact name |
|---|---|---|
| **(a)** | **Settings → Secrets and variables → Actions → Secrets** tab → **New repository secret** | `ANTHROPIC_API_KEY` |
| **(b)** | same place | `CLAUDE_CODE_OAUTH_TOKEN` |
| **(c)** | **Settings → Secrets and variables → Actions → Variables** tab | all three of `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` |

**No edit to any workflow file is needed for any of them** — that was the point of the P2 fix.

Paste the value **only** into that box. **I will never ask for it, never handle it, and never display it.** I cannot read repository secrets and do not want to; when you have added it, simply say so — the preflight will report which mode it resolved, by name, without ever printing a value.

**Option (c) stores no credential at all** and is worth considering if an Anthropic Console admin is available to register the issuer, service account and federation rule.

---

## 6. Verified facts vs what remains unproven

**Verified in this round:** the rule's enforcement, target, rule type, approval count, bypass list and absence of a required check; PR #89's head, diff, check and P1 fix before merging; the merge commit; and `main`'s resulting SHA, workflow contents and untouched application tree.

**Still unproven, and unchanged by this merge:**

1. **No Claude Action run has ever executed in this repository.**
2. **The Action does not open pull requests by default** — it pushes a branch and posts a link. So `claude[bot]` *PR* authorship needs one further entry, `--allowedTools "mcp__github__create_pull_request"`, which is **proposed on a follow-up PR and not included here**. Mechanism verified from source; outcome unobserved.
3. **Whether an App installation token triggers `pull_request` workflows here** — the pilot's single most load-bearing unknown. Inferred only.
4. **Whether the hardened tool set is still *sufficient* to commit** — safe has been shown; capable has not. This is Stage A's check A5.
5. **Gate 4 (ChatGPT → Claude) is untouched.** A human still pastes the task.

---

## 7. State block

```
MMSA_AUTOMATION_PILOT_RULE_VERIFIED_AND_PR89_MERGED
ISSUED=2026-09-19 (UTC)
MAIN_BEFORE=b87133461680d3c2837f7bd75fc5c824e10090d3
MAIN_AFTER=ee3ca08dbcc40950d56e141685b7b5a1c068225c
MERGE_METHOD=merge commit; expectedHeadSha guard = e73d1dea39d47b86ac531f9db475beec16f00cf1
PR89=MERGED
RULESET_ID=23712251 name="main: require a pull request"
RULE_ENFORCEMENT=active
RULE_TARGET=branch; ref_name.include=["~DEFAULT_BRANCH"]; confirmed via GET /rules/branches/main
RULE_TYPE=pull_request
RULE_APPROVALS=0
RULE_BYPASS=1 actor, RepositoryRole/always; current_user_can_bypass=always (Owner recovery CONFIRMED empirically)
RULE_APP_BYPASS=NONE -- no Integration actor; claude[bot] holds contents:write, not admin, so it CANNOT bypass
RULE_REQUIRED_STATUS_CHECK=NONE
RULESET_WRITE_ATTEMPTED=NO -- all GETs; the documented 403 was not retried
MAIN_DIFF=2 files, +341/-7, both under .github/workflows/
APP_TREE_UNTOUCHED=YES (app/ tools/ firestore.rules firebase.json docs/governance/ CLAUDE.md CHANGELOG.md tests/)
VERSION=08.31 UNCHANGED; V0832 UNALLOCATED
CLAUDE_YML_ON_MAIN=P1 FIX INTACT -- claude_args = --model only, zero Bash tools, use_commit_signing true, github_token omitted
VERIFY_YML_ON_MAIN=7 suites
VERIFY_DID_NOT_RUN_ON_MERGE=CORRECT -- it is pull_request-only; the gate ran on the merged head
CLAUDE_YML_NOW_REACHABLE=YES (on default branch) BUT STILL INERT (no credential)
OWNER_GATE_1=CLOSED -- rule created and verified
OWNER_GATE_2=OPEN -- credential; name and location released in section 5
CREDENTIAL_HANDLED=NO -- never requested, never displayed, cannot be read
CLAUDE_BOT_RUN_EVER=NO
BOT_PR_AUTHORSHIP=needs mcp__github__create_pull_request -- PROPOSED on a follow-up PR, NOT in this merge
B2_UNKNOWN=whether an App installation token triggers pull_request workflows -- INFERRED, UNOBSERVED
A5_UNKNOWN=whether the hardened tool set is still sufficient to commit -- UNTESTED
REQUIRED_STATUS_CHECK_ENABLED=NO -- deliberately, until a bot PR proves the check triggers
FIREBASE_RULES_DEPLOYED=NO
```
