# MMSA automation pilot — STEP 1: non-required CI for the governance suites

**Date:** 19 September 2026
**Branch:** `claude/pilot-ci-verify-workflow`
**Pull request:** **[#88](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/88)** — **OPEN, NOT MERGED**
**Base:** `main` at `b700e3f4b0a8004d4fe2701013e053a3c7a25770`, v08.31 — **unchanged by this work**
**Result:** **CI ran and passed. All six suites green in GitHub Actions, matching the documented baseline exactly.**

**Scope held:** one file added, `.github/workflows/verify.yml` (136 lines). No app code, no version change, no Firestore Rules, no repository settings, no change to the 22g harness defect. `git diff origin/main...HEAD` is that one file.

---

## 1. What was added

| | |
|---|---|
| File | `.github/workflows/verify.yml` — **the only file in the PR** |
| Trigger | `pull_request` into `main` |
| Permissions | **`contents: read`** — the job never writes to the repository |
| Job name | **`Deterministic governance suites`** |
| Suites | `programme-ledger`, `programme-ledger-mutations`, `brief-integrity`, `study-activity-evidence-boundary`, `study-event-wiring`, `rules-authorisation-executable` |
| Required? | **No — non-required by design** |

**Non-required is the whole point of this step.** A check whose behaviour nobody has measured must not be made mandatory; that is how a pilot deadlocks on day one. Making it required is **Step 7**, after the Owner has watched it behave.

---

## 2. THE FINDING — two suites failed on pristine `main`, before any edit

This is what Step 1 exists to catch, and it appeared on the very first run.

On a **clean checkout of `origin/main` `b700e3f` with a clean working tree**, before a single file was written:

| Suite | Shallow clone | Full history | Continuation §9 baseline |
|---|---|---|---|
| `brief-integrity` | **6 passed / 2 failed** | **8 / 0** | 8 / 0 |
| `programme-ledger-mutations` | **42 passed / 7 failed** | **49 / 0** | 49 / 0 |

**All nine failures named BRANCHES:**

```
FAIL  ...and the ones the brief says are held on a branch really are on it
FAIL  the unmerged wiring candidate the brief names still exists at the commit it names
FAIL  MUTATION [A] the ledger and the branch disagree about what the branch is stamped
FAIL  MUTATION [C] the recorded historical stamp is not what the held branch carries
      guard C did NOT fail ... -- it is UNPROVEN and must not be trusted
FAIL  MUTATION [E] a stream's shared-file touch loses its declaration
      (+ 4 more, all branch-derived)
```

**Diagnosis, measured rather than guessed.** `git rev-parse --is-shallow-repository` returned **`true`**, and `git branch -r` showed **2** remote refs. Meanwhile `brief-integrity.mjs` reads `origin/main:app/js/version.js`, and the ledger guards resolve the commits and version stamps of the branches the ledger names — including `claude/phase4-wiring`, which was not fetched.

After `git fetch --unshallow` and fetching all heads (**61** refs), **both suites returned to the documented baseline**.

**So the failures were an artefact of the clone and said nothing about any change.** And `actions/checkout` defaults to exactly that shallow, single-branch fetch — this would have been the pilot's first false red, on a PR that changed nothing relevant.

### How it was fixed — and how it was NOT fixed

**Not fixed by dropping a suite, excluding a check, or tolerating a failure.** Fixed by giving CI what the suites legitimately need:

1. **`fetch-depth: 0`** on `actions/checkout`.
2. **A preflight assertion step** that refuses a shallow clone and asserts each required ref **by name**, failing with `::error::` rather than letting the absence surface as a suite failure.
3. **The branch list is DERIVED from the ledger, not hardcoded** — so a new stream is covered automatically and a renamed branch fails loudly. In CI it resolved `origin/claude/phase4-wiring -> 7e2931f`, exactly the held commit the standing brief names.

> **The lesson, in the repository's own idiom: a false red is worse than no check, because it teaches people to ignore the gate.** The preflight step exists so that a missing ref can never again be mistaken for a governance failure.

---

## 3. ACTUAL CI RESULTS — read from the GitHub Actions log

**Run #2**, [`35433943509`](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/actions/runs/35433943509), head `2661a52`, event `pull_request`, conclusion **`success`**.

Job **`Deterministic governance suites`** (`105873323545`) — every step succeeded:

| # | Step | Conclusion |
|---|---|---|
| 2 | Check out the full history and all branches | success |
| 3 | Set up Node | success |
| 4 | Assert the git refs the suites need are present | success |
| 5 | Run the six deterministic governance suites | success |

**The six results, quoted verbatim from the Actions log:**

```
===== RECAP: all six suites =====
programme-ledger                       exit 0  ==== Programme integration ledger: 8 passed, 23 noted, 0 failed ====
programme-ledger-mutations             exit 0  ==== Programme ledger guard mutations: 49 passed, 0 failed ====
brief-integrity                        exit 0  ==== Standing brief integrity: 8 passed, 0 failed ====
study-activity-evidence-boundary       exit 0  ==== Study Activity evidence boundary: 27 passed, 0 failed ====
study-event-wiring                     exit 0  ==== Study event wiring (P4-D1 Reading, D2 Listening, D4 WbW): 41 passed, 0 failed ====
rules-authorisation-executable         exit 0  ==== Rules authorisation executable: 38 passed, 0 failed ====
===== END RECAP (the job fails below if any exit was non-zero) =====
```

**These are identical to the local run and to the continuation package's §9 baseline.** CI and the sandbox agree exactly.

### The check on the PR

| | |
|---|---|
| Check run name — **this is the context string a required check would use** | **`Deterministic governance suites`** |
| Conclusion | `success` |
| App | `github-actions` |

> **Note for Step 7:** the required-check context is the **job** name, not the workflow name. Selecting `verify` would match nothing.

### Positive control — the gate can actually fail

A check that cannot fail is worse than no check. The step's script was extracted from the parsed YAML and **executed verbatim** with one unrunnable suite prepended: **exit `1`**, with the real suites after it still running. So a failure is neither masked nor softened, and one failure does not hide the other five.

---

## 4. Workflow limitations — recorded, not worked around

| # | Limitation | Status |
|---|---|---|
| **L1** | **`actions/checkout` defaults to a shallow, single-branch fetch**, which makes two suites fail for reasons unrelated to the PR. | **Handled** — `fetch-depth: 0` plus a named-ref assertion. Do not remove either; the suites will start lying if you do. |
| **L2** | **Raw job logs are served from blob storage a restricted network can refuse** — measured here as `curl: (56) CONNECT tunnel failed, response 403`, leaving only a tail-limited API read. Five of six per-suite lines sat too far up a 526-line log to reach. | **Handled** — a consolidated recap at the very end of the log. All six are now readable from a 29-line tail. |
| **L3** | **`actions/checkout@v4` and `actions/setup-node@v4` target Node.js 20**, which GitHub is deprecating; the runner forces them onto Node 24 and emits a warning each run. | **Not fixed** — cosmetic today. Moving to `@v5` is a separate, trivial change; it was **not** bundled into this PR. |
| **L4** | **Actions are pinned by major tag (`@v4`), not by commit SHA.** A tag can be repointed. | **Recorded.** SHA-pinning is the stricter posture for a governance gate and is the Owner's call. |
| **L5** | **`behaviour.mjs` is excluded**, and deliberately: it cannot exit 0 under TLS interception (`31e`), and `22g` flips on identical code. | **Out of scope by design.** It must be measured in Actions **on its own** before anyone considers gating with it. Nothing about it was weakened or changed. |
| **L6** | **Playwright suites** (`layout`, `panel`, `reading`, `navcheck`) and the **Firestore emulator suites** are excluded — they need a served app or the emulator. | Out of scope for Step 1. |
| **L7** | **`study-activity-evidence-boundary-mutations.mjs` exists but was not among the six named.** | **Flagged, not added.** The D3 work repaired it to 11/0 and the continuation lists it separately. **The Owner may want it in the set** — it is the mutation control for a suite that *is* included. |
| **L8** | The workflow triggers only on `pull_request` into `main`. There is no `push` or `workflow_dispatch` trigger. | Deliberate — narrow scope. A `workflow_dispatch` would help measure `behaviour.mjs` later without opening a PR. |

**One limitation resolved rather than assumed:** the earlier preflight flagged (as **T1**) that a PR opened with `GITHUB_TOKEN` would not trigger workflows. **That did not occur here** — this PR was opened by `AAAsapp` via git push plus the REST API, and the workflow fired normally (`event: pull_request`). **T1 remains untested for an App-opened PR**, which is still the next pilot step.

---

## 5. A note on process — an error I made and caught before pushing

The first attempt at the log recap (L2) accumulated results in a shell variable containing an embedded newline. That put a closing quote at **column 1**, which escaped the YAML block scalar: `could not find expected ':'`, line 127. **A broken workflow would have been pushed had the YAML not been parsed before committing.**

It was reverted and redone with a `mktemp` file, which keeps every line indented inside the scalar — then verified by **extracting the step's `run` script from the parsed YAML and executing it verbatim**, rather than re-typing an approximation of it. Both the green path and the failure path were re-proven on that exact script.

---

## 6. What the Owner should check, and the next step

**On [PR #88](https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/88) — do not merge yet:**

1. The check **`Deterministic governance suites`** is present and **green**. ✅ (verified above)
2. Open the run and read the job summary table — six rows, all ✅.
3. **Confirm whether the Approve button is selectable for you.** The PR was opened by `AAAsapp`, so GitHub will refuse self-approval — **that refusal is expected and is itself the confirmation that the self-approval block is real.** It is *not* a defect, and it is exactly why the next step matters.

**Next step, unchanged from the preflight plan:** wire the Claude App (preflight **Step 6**) and run the **App-opened test PR** — which settles the bot login, the `GITHUB_TOKEN` trigger question (T1) for an App-opened PR, and whether `AAAsapp` can approve a PR it did not open. **Only after that** should the ruleset be enabled (**Step 7**), with the required context `Deterministic governance suites` and **an empty bypass list**.

**Merging #88 is the Owner's call.** It changes no application behaviour and adds no required check; its only effect is that the verify check begins appearing on future pull requests.

---

## 7. State block

```
MMSA_PILOT_STEP1_CI_VERIFY
ISSUED=2026-09-19
BRANCH=claude/pilot-ci-verify-workflow
PR=88 OPEN NOT MERGED https://github.com/Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io/pull/88
PR_HEAD=2661a52 | PR_AUTHOR=AAAsapp | mergeable_state=clean | changed_files=1 (+136/-0)
BASE_MAIN=b700e3f4b0a8004d4fe2701013e053a3c7a25770 at v08.31 -- UNCHANGED; .github still absent on main
FILE_ADDED=.github/workflows/verify.yml (136 lines) -- the only file
TRIGGER=pull_request into main | PERMISSIONS=contents: read | REQUIRED=NO (by design)
JOB_NAME=Deterministic governance suites  <-- the context string for a future required check
CI_RUN=35433943509 run #2 event=pull_request conclusion=SUCCESS; all steps success
CI_RESULTS=ledger 8/23/0 | ledger-mutations 49/0 | brief-integrity 8/0 | evidence-boundary 27/0 | study-event-wiring 41/0 | rules-authorisation 38/0
CI_MATCHES_LOCAL=YES | CI_MATCHES_CONTINUATION_SECTION9=YES
FINDING=on pristine main, shallow clone gave brief-integrity 6/2 and ledger-mutations 42/7; all 9 failures branch-derived; full history restored 8/0 and 49/0
FIX=fetch-depth 0 + preflight ref assertion, branch list DERIVED from the ledger; resolved origin/claude/phase4-wiring -> 7e2931f
NO_GATE_WEAKENED=TRUE -- no suite dropped, excluded or tolerated; failure path proven to exit 1 on the verbatim YAML script
POSITIVE_CONTROL=PASS -- one unrunnable suite => exit 1, later suites still run
T1_GITHUB_TOKEN_TRIGGER=DID NOT OCCUR for this human-opened PR; still UNTESTED for an App-opened PR
LIMITATIONS=L1 shallow checkout (handled) L2 blob-storage logs (handled by end-of-log recap) L3 checkout/setup-node target deprecated Node 20 (not fixed) L4 actions pinned by tag not SHA L5 behaviour.mjs excluded by design L6 Playwright+emulator excluded L7 study-activity-evidence-boundary-mutations NOT among the six -- flagged for Owner L8 no workflow_dispatch
OUT_OF_SCOPE_UNTOUCHED=app/ tools/ firestore.rules firebase.json docs/governance/ CLAUDE.md CHANGELOG.md .claude/ version.js 22g
NEXT_STEP=wire the Claude App, then the App-opened test PR; enable the ruleset only after that, required context "Deterministic governance suites", bypass list EMPTY
MERGE_DECISION=OWNER'S -- not merged by this session
```
