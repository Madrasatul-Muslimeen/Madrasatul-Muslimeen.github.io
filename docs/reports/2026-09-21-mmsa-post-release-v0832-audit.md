# MMSA read-only post-release audit — v08.32 on `main` — 21 Sep 2026

**Bridge task**: issue #123, comment `5754399917` (the third `/mmsa-task` fired
on this issue). Explicitly a **read-only** audit: no protected/shared path
edited, no version allocated, no merge performed, nothing deployed. This
report is the deliverable the comment asked for.

## What was verified, and how

All checks below were run against `origin/main` at commit **`af2c510518`**
("Mark v08.31 released after owner-tested v08.32"), fetched with full history
and the two ledger-declared refs (`claude/pensive-knuth-2pu3jj`,
`claude/phase4-wiring`), in a detached worktree separate from this session's
own working branch — nothing here touched `claude/laughing-goodall-90sq78`
until this report was added.

| Claim in the task | Verified | Evidence |
|---|---|---|
| PR #112 merged | **YES** | `pull_request_read` on #112: `state: closed`, `merged: true`, `merged_by: AAAsapp`, `merged_at: 2026-09-21T01:29:05Z`, base `main`@`2cb405e388`, head `c9b57fe04e` |
| `APP_VERSION` reads `08.32` | **YES** | `app/js/version.js` on `origin/main`: `export const APP_VERSION = "08.32";` |
| Ledger has exactly one `LIVE` allocation, and it is `08.32` | **YES** | `versionAllocations` on `origin/main`: `08.27 RELEASED`, `08.26 RELEASED`, `08.26 HISTORICAL` (phase4-wiring), `08.28 HISTORICAL` (hadith), `08.29 RELEASED` (hadith), `08.30 RELEASED`, `08.31 RELEASED`, `08.32 LIVE` — one `LIVE` entry, matching `main.version` |
| `08.31` is `RELEASED` | **YES** | Same table, `08.31 RELEASED quran` |
| `nextUnallocated` is `08.33` | **YES** | `docs/governance/programme-integration-ledger.json`: `"nextUnallocated": "08.33"` |
| `CLAUDE.md` Current milestone names `v08.32` | **YES** | Line 143 on `origin/main`: `**Current milestone: v08.32 on `main`** (21 Sep 2026 — QuranRevival Basic Arabic lemma-occurrence navigation, PR #112 merged at `f5b7c6c`. …)`. **This corrects the prior comment on this issue (`5754263564`), which claimed this edit "was rejected" by review as broad risk — it was not rejected; it is present on `main` now.** |
| `CHANGELOG.md` carries a v08.32 entry | **YES** | `## v08.32 — 21 Sep 2026 — Basic Arabic lemma occurrences`, full paragraph present, names PR #112, the Master Architect allocation, and the Owner test report |
| Owner app-test acceptance reported | **RECORDED IN THE REPOSITORY, NOT INDEPENDENTLY VERIFIABLE FROM HERE** | Both `CLAUDE.md` and `CHANGELOG.md` state "The Owner tested the app and confirmed all checks passed." This session has no channel to the Owner and cannot itself confirm a real person tested a real device; it can only confirm the repository's own record says so, consistently, in both files. Per the task's own instruction, the Owner is **not** being asked to repeat this test — no concrete new risk was found that would call for it. |

**Baseline ancestry** (ledger guard F territory): `main.baselineSha`
(`a20892f1e4`) is a real ancestor of current `origin/main` (`af2c510518`, 61
commits ahead) — confirmed with `git merge-base --is-ancestor`, not assumed.

**Live GitHub Pages serving**: **not verified from this sandbox**, as every
prior session on this repository has recorded — the sandbox's outbound proxy
refuses the `CONNECT` tunnel to `github.io` (`curl` returns `403` on the
tunnel itself, no HTTP response reaches the app). The ledger's own
`deployment.githubPagesServing` block is unchanged by this audit:
`state: PRESUMED_FROM_MAIN`, `verified: false`. Nothing in this session moves
that to verified, and nothing should — a presumption recorded as verified
with nothing actually measured is exactly the class of drift ledger guard G
(mutation `a presumption is recorded without saying it is one`) exists to
catch.

## Seven governance suites — full history, both named refs, current `main`

Run from a detached worktree at `af2c510518` (playwright symlinked in from
the sandbox's global install; `node serve.js` on `:8080` for the two
Playwright-driven Word Card suites below):

| Suite | Result | Exit |
|---|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed | 0 |
| `programme-ledger-mutations` | 49 passed, 0 failed | 0 |
| `brief-integrity` | 8 passed, 0 failed | 0 |
| `study-activity-evidence-boundary` | 27 passed, 0 failed | 0 |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed | 0 |
| `study-event-wiring` | 41 passed, 0 failed | 0 |
| `rules-authorisation-executable` | 38 passed, 0 failed | 0 |

All seven exit 0. The `programme-ledger` NOTE lines are the expected
DECLARED/AUTHORIZED shared-file touch and baseline-movement records this
guard always prints (guards E and F) — none is a failure, and the guard's own
`PASS` line for each lettered check confirms it read them correctly,
including `[A] 08.32 is LIVE and matches main` and `[G] four deployment
states recorded separately … the readiness declaration agrees with them`.

## Word Card suites relevant to PR #112

| Suite | Result | Notes |
|---|---|---|
| `quran-word-card` | 36 passed, 0 failed | Pure renderer suite, no browser |
| `quran-word-card-integration` | 10 passed, 0 failed | Pure integration suite, no browser |
| `quran-word-card-rendered` | 120 passed, **2 failed** | The 2 are `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID`, reproduced character-for-character — this sandbox's own documented TLS-interception artifact (see `CLAUDE.md` "On the test harness" lessons), not an application defect. Identical failure count and identical failure text to PR #112's own last reported run. |
| `quran-word-card-lemma-occurrences` (PR #112's own new suite) | **50 passed, 0 failed** | Clean, matching the PR's own report exactly |

**No new failure exists anywhere in this set relative to what PR #112 itself
already reported and explained.** There is nothing here to fix, so no fix
budget is proposed.

## What this audit deliberately did not do

- No edit to any protected or shared path (`app/js/version.js`, `CLAUDE.md`,
  `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `docs/governance/**`, `firestore.rules`, `firebase.json`,
  `tests/firestore/**`, `tools/firestore-emulator/**`,
  `.github/workflows/**`, or any of the six locked
  `tools/i18n-verify/*.mjs` guard files) — only this report file and its HTML
  twin were added, under `docs/reports/`, which is not a protected path.
- No version allocated or bumped. `08.33` remains unallocated; this audit
  does not propose changing that.
- No merge, no deploy, no approval claimed, no Firestore Rule or index
  touched.
- Did not re-run the full Hadith/Health/Note suites — out of this task's
  stated scope, which named the seven governance suites plus "relevant Word
  Card suites."
- Did not attempt to reach the Owner or the live site to independently
  confirm the recorded Owner test — no channel exists from this session to
  do either; both are stated plainly above rather than silently assumed.

## Owner app test

**Not required as a result of this audit.** The task itself instructed:
*"the Owner already tested v08.32 and reported all passed, so do not ask them
to repeat it without a concrete new risk."* This audit found no concrete new
risk — every suite this audit could run reproduces exactly the pass/fail
counts PR #112 itself already reported, and every ledger/brief/changelog
field the task asked to verify matches. **Owner app test: NO** (none newly
needed).

---
Bridge session: `session_011QvGGVBvwsxK8d7ggFw27s`
