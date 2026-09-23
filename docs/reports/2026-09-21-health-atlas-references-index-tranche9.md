# Health Atlas — References index, tranche 9 (2026-09-21)

Authoritative timestamp: **2026-09-21, UTC**.

Dispatched via the MMSA task bridge (issue #115, comment `5761149699`). Developed as
`claude/health-atlas-references-index-tranche9`, **stacked on PR #145's own head `665eac92`**
(itself stacked on PR #142's head `3d6be395`, itself stacked on PR #140's head `0c6fc05c`, itself
based on `main` at `16cfb0b` where PR #127 is already merged) — review in that order: **#140, then
#142, then #145, then this PR.**

## 0. What was verified before changing anything

Read, not assumed, before any edit:

- **`main`**: `origin/main` at `16cfb0b3512609313a68d487dca28945a31855b8`, `app/js/version.js`
  reads `v08.32`. PR #127 (Health Atlas combined candidate) is merged into it.
- **The source**: `health/source-v02-04-handover`, commit `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9`
  ("Stage exact Health Atlas v02.04 standalone source for isolated integration review") — present on
  the remote, matches the comment's own reference exactly. `docs/health-source/
  health-atlas-v02.04-standalone.html` on that commit SHA-256s to
  `f7cb56980ae125bb387118c9282bf50c92b5fe414ca3480fa92547e9af9685a1`, the same hash
  `health-atlas-data.js`'s own `sourceSha256` field already records — confirmed, not re-trusted.
- **The exact PR heads the comment names**: #145 head `665eac9293848e8ff9163f45e1db8c9f34c93e97`
  (fetched from `claude/health-atlas-tranche8-browser-evidence`), stacked on #142's `3d6be395`
  (base `claude/laughing-goodall-8moeiq`), stacked on #140's `0c6fc05c` (base
  `claude/laughing-goodall-90k6mh`, itself based on `main`) — **all three match the comment's own
  claim exactly**, read from the PRs themselves rather than trusted from the comment text.
- **Issue #115's own parity matrix** (tranche 8's report, §2): 3 built pages, Lifestyle deferred
  (no clean structural/organizational subset), and **"References" listed as "Not built as its own
  browser — the 8 references are shown inline, per organ … no standalone list-all-references view
  exists."** This tranche is exactly that item.

## 1. Independent review of PR #145's committed browser test

**Reproducibility, checked by actually running it, not by reading its report.**
`tools/health-atlas-verify/body-systems-parity-browser.mjs` imports `chromium` from the bare
specifier `'playwright'`. In this sandbox that import fails by default — `playwright` is installed
globally (`$(npm root -g)/playwright`) but Node's ESM resolver, unlike `require()`, does not consult
`NODE_PATH`, so a bare `import 'playwright'` cannot see it. This is **not a defect in the suite**:
its own header comment already states the precondition plainly — *"whoever runs this suite provides
the same working `playwright` import every other Playwright-based suite in this repository already
assumes"* — the same precondition every suite under `tools/i18n-verify/` sharing `harness.mjs`
already carries, and this repository deliberately ships no `package.json` that could declare it (PR
#105's own report). What actually made it reproducible here: a `node_modules/playwright` symlink to
the global install, created locally (`node_modules/` is already `.gitignore`d — confirmed before
creating it) and removed again once verification finished. Recorded here because "committed and
reproducible" is a claim worth being precise about, not because anything needs fixing.

**Server reuse**, read from source and confirmed by running it twice concurrently in the same
session (once for this file, once moments later for this tranche's own new suite, §3): `ensureServer()`
pings `GET /app/health/health-atlas.html` on port 8080 first and only spawns `serve.js` if that
fails, so a session with its own server already up is reused rather than fought — confirmed: the
second suite's run in this session reused the first's server (`pingServer()` returned `true`
immediately, no second `serve.js` process spawned).

**Independently run, raw results**:

- `body-systems-parity-browser.mjs`: **16 passed, 0 failed** — re-run against the checked-out stack
  before any edit in this tranche, then re-run again after every edit below to confirm nothing
  regressed (§4).
- All 15 pre-existing Health-owned suites: **249 passed, 0 failed**, byte-identical to PR #145's own
  claimed count.
- All 7 governance suites, after `git fetch --unshallow` and fetching the one HELD ref the ledger
  currently declares (`docs/governance/programme-integration-ledger.json`'s
  `quran-phase4-wiring.activeBranch`, `claude/phase4-wiring` — the ledger no longer names
  `claude/pensive-knuth-2pu3jj` at all, confirmed by grep before assuming it still needed fetching):
  **182 passed, 0 failed.**

## 2. Gate A — the References index, specified before building

**Exact source fields.** The source's own References tab (`renderRefsTab()`, source lines
2625–2636) is a flat table over `REFERENCES = {r1..r8}`, each `{name, url}` — id, name, a plain
`<a>` to the url. **No per-reference organ list, no organ links of any kind** — confirmed by reading
the function body directly, not inferred. Already ported into this codebase unchanged, as
`HEALTH_ATLAS_REFERENCES` in `health-atlas-data.js` (8 entries, same ids/names/urls, SHA-verified
against the source above), and already read once — every organ's own `.refs[]` array names a subset
of these ids, resolved by the existing `referencesFor()` selector and rendered as the detail
column's "General references" block (foundation tranche 1, unchanged since).

**The comment's own instruction goes beyond the source**: *"links into existing organ detail where
supported"* — the source has no such links at all. Investigated what "where supported" can mean
mechanically: an organ "supports" a reference exactly when that reference's id appears in the
organ's own `.refs[]` — the reverse of the read `referencesFor()` already performs. Measured, not
assumed: of the 8 references, `r1` (MedlinePlus) is named by all 46 organs, `r2` (Mayo Clinic) by
41, down to `r5` (USDA FoodData Central) by **zero** — a real, not hypothetical, "no organ" case
(USDA FoodData Central backs food-nutrition figures this view has never rendered, per the existing
deferral boundary — see `view-boundary.mjs`).

**Ownership.** Every file this tranche touches is Health-owned: `app/health/health-atlas.html`,
`app/health/js/health-atlas-selectors.js`, `app/health/js/health-atlas-view.js`,
`tools/health-atlas-verify/selectors.mjs`, `tools/health-atlas-verify/view-boundary-wheel.mjs`, plus
one new file, `tools/health-atlas-verify/references-index-browser.mjs`. Checked by name against
every protected-path family the task names (version, platform-shared files, platform-shared
tooling, governance, deployment/security, the gate itself): **zero matches** (§5).

**Browser acceptance, decided before building.** The app has **no URL-addressable per-organ route**
— `health-atlas.html` takes no query parameter, and organ selection lives entirely in
`mountHealthAtlas()`'s own closure state (`state.selectedOrganId`), set by `draw()` calls, not by
navigation. So a real `<a href="...">` from a References row into "the Heart page" cannot be built —
there is no such page. The mechanism actually available, and the one this tranche uses: a button
wired to the same `onSelectOrgan()` callback path the sections column and the wheel legend already
call, which is a real link into the SAME detail column those two already open, not a
separate/duplicate view. Verified by browser test, not assumed (§3): clicking an organ pill under a
reference switches back to the Body Systems tab and opens that exact organ, with its own evidence
badges rendering exactly as if it had been opened any other way.

**Privacy/clinical boundary.** No new field is read: `organsForReference()` reads only `.refs`, the
field `referencesFor()` already reads. Nothing in `nutritionNeeds`/`foodSources`/`.activity`/
`deterioration`/`remedies`/`homeRemedies`/`naturalRemedies` or the `HEALTH_ATLAS_FOODS`/
`HEALTH_ATLAS_DISEASES`/`HEALTH_ATLAS_LIFESTYLES`/`HEALTH_ATLAS_AGES` datasets is touched — asserted
mechanically by the unmodified `view-boundary.mjs`/`view-boundary-wheel.mjs` forbidden-identifier
sweeps, which now also cover this tranche's added code (both suites re-read the same files this
tranche edited). **The evidence-provenance boundary is the one most at risk of a "helpful" but
false claim, so it gets its own explicit check**: the index's own note text disclaims that a
reference listed for an organ backs that organ's material *in general*, never any one function
statement individually, and never itself decides a statement is `cited-evidence` (that stays
`health-atlas-claims.js`'s job alone, unchanged and unread by this tranche's new code beyond the
existing badge renderer). Both a static positive control (`view-boundary-wheel.mjs`) and a browser
check (`references-index-browser.mjs`) assert this, and both were proven able to fail by the same
two mutations (§4).

**Parity delta, exact.** Source: References is a flat table, no organ links, part of a six-tab
single-page app. Built here: References is a second top-level view mode (a two-tab bar) inside the
existing single Body Systems page, same 8 rows, **plus** a reverse index (reference → citing
organs) the source never had, **plus** real links into the existing organ detail column the source
also never had (the source has no separate "organ detail" concept to link into — its own detail
pane is driven by the same in-page wheel/legend selection this app's Body Systems screen already
mirrors). Net: this tranche is source-faithful in DATA (the same 8 references, same names/urls, no
invented reference) and deliberately non-faithful in ONE interaction (organ links), on the
comment's own explicit instruction and because the app's existing architecture makes that the
correct-shaped addition rather than a new page.

## 3. Gate B — built (Gate A found no blocker)

- **`organsForReference(organs, referenceId)`** in `health-atlas-selectors.js` — the reverse of the
  existing `referencesFor()`. Pure, no DOM, reads only `.refs`.
- **`buildViewTabs()` / `buildReferencesScreen()` / `buildScreen()`** in `health-atlas-view.js` — a
  small `state.viewMode` (`'bodysystems' | 'references'`), a two-tab bar rendered above whichever
  screen is active, and the References table itself (id / linked source name / organ pills, or a
  "no organ in this dataset names this reference directly" sentence when empty). Organ-selection
  logic was factored into one `selectOrgan()` helper so `onSelectOrgan` (existing) and
  `onOpenOrganFromReferences` (new) share the exact same state mutation — no second, divergent
  "open an organ" code path.
- **CSS** for the tab bar and the references table in `health-atlas.html`, following the existing
  file's own variable/class naming (`--gold`, `.ha-*` prefixes).
- **`node tools/health-atlas-verify/references-index-browser.mjs` (new, committed)** — 12 checks,
  desktop (1280×900) / tablet (768×1024) / phone (390×844), mouse click, keyboard `Enter` on a
  focused tab, and a real touch `tap()`. Follows the exact precedent tranche 8 set with
  `body-systems-parity-browser.mjs` (same `check()`/`ensureServer()`/`pingServer()` shape, same
  "committed, not wired into `.github/workflows/verify.yml`" posture — that workflow already
  excludes this whole class, and widening it would touch the protected `.github/workflows/` family,
  outside this task's scope).

## 4. Verification

**All 17 Health-owned suites, run from the repository root, 0 failed** (15 pre-existing + tranche
8's browser suite + this tranche's new browser suite):

| Suite | Result |
|---|---|
| `data-integrity.mjs` | 21 passed |
| `selectors.mjs` | **19 passed** (13 + 6 new: `organsForReference`) |
| `claims-integrity.mjs` | 10 passed |
| `claims-mutations.mjs` | 7 passed |
| `view-boundary.mjs` | 14 passed |
| `view-provenance-boundary.mjs` | 7 passed |
| `view-provenance-mutations.mjs` | 4 passed |
| `more-selectors.mjs` | 9 passed |
| `view-boundary-more.mjs` | 26 passed |
| `view-boundary-more-mutations.mjs` | 7 passed |
| `categories-selectors.mjs` | 7 passed |
| `view-boundary-categories.mjs` | 58 passed |
| `view-boundary-categories-mutations.mjs` | 7 passed |
| `view-boundary-wheel.mjs` | **57 passed** (53 + 4 new: References index positive controls) |
| `view-boundary-wheel-mutations.mjs` | 6 passed |
| `body-systems-parity-browser.mjs` | 16 passed (unmodified; re-run to confirm no regression) |
| `references-index-browser.mjs` (new) | **12 passed** |

**287 passed, 0 failed.** The 15 files this tranche did not touch reproduce PR #145's own counts
exactly (249); the +10 in `selectors.mjs`/`view-boundary-wheel.mjs` and the +12 new browser suite
are this tranche's own additions.

**All 7 governance suites, after the same full-history + required-ref preflight as §1: 182 passed,
0 failed.** Neither guard script was read, edited or weakened; none of this tranche's files are
anything either guard reads.

**Mutation-proven, not just asserted able to fail** — two independent mutations, each caught by
more than one guard, then reverted (`git diff --stat app/health/js/health-atlas-view.js` confirmed
empty before proceeding each time):

1. **Removed the return-to-Body-Systems switch** (`state.viewMode = 'bodysystems'` in
   `onOpenOrganFromReferences`). Caught by `references-index-browser.mjs` (2 of 12 checks failed:
   the desktop click assertion, and the phone tap — the latter as a genuine timeout, since the
   detail column literally does not appear while `viewMode` stays `'references'`).
2. **Weakened the disclaimer text** (`'not any one function statement individually'` →
   `'EVERY function statement individually verified'`, simulating exactly the false claim Gate A
   said this tranche must never make). Caught **independently by two different guards**: the new
   browser suite (1 of 12 failed, quoting the corrupted sentence back) AND the static
   `view-boundary-wheel.mjs` positive control (1 of 57 failed) — confirming the disclaimer is
   enforced both in the rendered page and in the source text, not only one or the other.

**Not applicable: browser English/Bangla.** No i18n on any Health Atlas page (unchanged from every
prior tranche's own finding).

**Not applicable: head-specific CI.** `.github/workflows/verify.yml` runs only the seven governance
suites; none of `tools/health-atlas-verify/` is wired into it. Run directly, as every prior tranche
has.

## 5. Diff budget

`app/health/health-atlas.html` (CSS + header/footer copy for the tab bar and index), `app/health/js/
health-atlas-selectors.js` (+`organsForReference`), `app/health/js/health-atlas-view.js` (view tabs
+ References screen + the `selectOrgan()` refactor), `app/health/README.md` (+Tranche 9 section),
`tools/health-atlas-verify/selectors.mjs` (+6 checks), `tools/health-atlas-verify/
view-boundary-wheel.mjs` (+4 checks), `tools/health-atlas-verify/references-index-browser.mjs`
(new), and this report's own `.md`/`.html`. Checked by name against every protected-path family
named in the task — version (`app/js/version.js`), platform-shared files (`CLAUDE.md`,
`CHANGELOG.md`, `bn.js`, `nav.js`, `unit-keys.js`, `records.js`, `activity.js`,
`catalogue-data.js`, `shell.css`), platform-shared tooling (`tools/i18n-verify/*`), governance
(`docs/governance/**`), deployment/security (`firestore.rules`, `firebase.json`, `tests/firestore/`,
`tools/firestore-emulator/`), the gate itself (`.github/workflows/`): **zero matches.**

## 6. What this deliberately does not do

- No version allocated or bumped — `app/js/version.js` untouched, v08.32 stands. This is a real
  reader-visible behaviour change (a new tab, a new screen), so per the task's own instruction it
  needs a version allocated by the Master Architect before it could ever be considered released;
  none is claimed here.
- No protected/shared path touched.
- Nothing merged or deployed; no approval claimed.
- Does not build the Lifestyle tab — still out of scope for the reason on record (tranche 8's §2:
  every substantive Lifestyle field is unverified guidance end to end).
- Does not add per-statement (as opposed to per-organ) reference citations — that would require
  actually tracing each of the 82 function statements to a specific source, which
  `health-atlas-claims.js`'s own header comment already says has never been attempted and remains
  `general-reference-only` for all 82.
- Does not add the new browser suite to `.github/workflows/verify.yml` — outside this task's scope,
  and that path is protected.
- Does not decide any future References/Lifestyle product shape — Owner/product calls, not test- or
  view-authoring ones.

## 7. Owner app test

**Required: NO before merge** — nothing here is linked from shared nav or deployed, same posture as
every prior tranche on this issue.

**YES after merge** (and after #140, #142 and #145, since this is stacked on all three), direct URL
only, no sign-in/tenant, served over `http://` (not `file://`, `serve.js`):

1. Open `app/health/health-atlas.html`. Confirm a "Body Systems / References" tab bar appears above
   the existing three-column layout, with "Body Systems" active by default and the layout unchanged.
2. Click "References". Confirm a table of 8 rows appears (Ref / Source / Organs in this dataset
   that cite it), each source name a real link that opens in a new tab.
3. Find the row for "USDA FoodData Central" — confirm it says no organ in this dataset names it,
   rather than showing an empty cell.
4. Find the row for "World Health Organization" — confirm it shows one organ pill, "Lungs". Click
   it. Confirm the screen switches back to "Body Systems" (tab now active) and the detail column
   shows Lungs, with its own evidence badges, exactly as opening it from the system list would.
5. Narrow the browser window to phone width and repeat step 2–4 with taps; confirm nothing scrolls
   the whole page sideways.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01UsWaWXVy5JbJttGKEcqm7c

---
_Generated by [Claude Code](https://claude.ai/code/session_01UsWaWXVy5JbJttGKEcqm7c)_
