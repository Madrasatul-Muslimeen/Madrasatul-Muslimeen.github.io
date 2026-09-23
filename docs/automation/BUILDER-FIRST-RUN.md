# Builder first run — measured record

This file exists to prove, with measured fact rather than assertion, that the
Architect/Builder loop ran end to end for the first time on this repository.
It is documentation only. No application code, schema, rule or version
changed to produce it.

## 1. Date and commit built from

- **Date of this run:** 2026-09-22
- **Commit SHA of `main` this round built from:** `d5cb7518d2cf0afced8a122c43f0c3c5a5a29899`
  (`Merge pull request #132 — MMSA read-only post-release audit of v08.32 on
  main`, 2026-09-22 10:09:18 +1000) — this is the commit the workflow checked
  out (`GITHUB_SHA`) and the commit this branch is based on.
- **Note on drift during the run:** by the time the seven suites below were
  run, `origin/main` on GitHub had already moved forward to `f90c791fd4`
  (still `v08.32`) — visible only because `programme-ledger.mjs` reads
  `origin/main` directly rather than the local checkout, and prints
  `main f90c791fd4 at v08.32`. That is forward movement on a shared branch
  during a run, not a defect in this round, and this branch is still based on
  `d5cb7518d2cf0afced8a122c43f0c3c5a5a29899` as instructed.

## 2. The seven governance suites — exact output and exit code

Each run as `node tools/i18n-verify/<name>.mjs` from the repository root, one
run each, no retries.

### `programme-ledger`

Exit code: `0`

```
==== Programme integration ledger: 8 passed, 23 noted, 0 failed ====
     main f90c791fd4 at v08.32 | ledger docs/governance/programme-integration-ledger.json
```

### `programme-ledger-mutations`

Exit code: `0`

```
==== Programme ledger guard mutations: 49 passed, 0 failed ====
```

### `brief-integrity`

Exit code: `0`

```
==== Standing brief integrity: 8 passed, 0 failed ====
```

### `study-activity-evidence-boundary`

Exit code: `0`

```
==== Study Activity evidence boundary: 27 passed, 0 failed ====
```

### `study-activity-evidence-boundary-mutations`

Exit code: `0`

```
==== Evidence boundary guard mutations: 11 passed, 0 failed ====
```

### `study-event-wiring`

Exit code: `0`

```
==== Study event wiring (P4-D1 Reading, D2 Listening, D4 WbW): 41 passed, 0 failed ====
```

### `rules-authorisation-executable`

Exit code: `0`

```
==== Rules authorisation executable: 40 passed, 0 failed ====
```

**All seven suites: exit 0, 0 failed.**

## 3. Checkout depth

`git rev-parse --is-shallow-repository` reported **`false`** — the checkout is
full history, not shallow, matching the workflow's `fetch-depth: 0`.

This matters because on a shallow clone `brief-integrity` is known to report
6/2 and `programme-ledger-mutations` 42/7 on an unmodified tree — a clone
artefact, not a defect. On this full-history checkout the two figures that
class of artefact would distort are **`brief-integrity`: 8 passed, 0 failed**
and **`programme-ledger-mutations`: 49 passed, 0 failed** — the expected
non-shallow result, observed directly rather than assumed.

## 4. Node and Playwright/Chromium

- **Node**: `v22.23.2` — available and used to run all seven suites above.
- **Playwright CLI**: `npx playwright --version` reports `Version 1.63.0`.
- **Chromium binary**: present on disk at
  `/home/runner/.cache/ms-playwright/chromium-1243` (and
  `chromium_headless_shell-1243`), i.e. `npx playwright install --with-deps
  chromium` did place a real browser on this runner.
- **Measured gap, reported as observed rather than smoothed over**: the
  `playwright` npm package itself is installed only globally (`npm install
  -g playwright`, confirmed present under `npm root -g`), and Node's ESM
  loader does not search the global npm folder for a bare `import ... from
  "playwright"` (unlike `NODE_PATH`, which ESM does not consult either). So
  while the CLI and the Chromium binary are genuinely present, running any of
  this repository's own browser-dependent suites directly
  (`tools/i18n-verify/harness.mjs`, and everything that imports it — layout,
  behaviour, panel, reading, navcheck) fails at `import` with
  `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`, reproduced during
  this run against `navcheck.mjs`. **None of the seven governance suites this
  round required import `playwright` at all** — confirmed by their clean
  exits above — so this gap did not block this round, but it would block any
  round that needs to measure a UI change here, and is recorded rather than
  left to be rediscovered.
