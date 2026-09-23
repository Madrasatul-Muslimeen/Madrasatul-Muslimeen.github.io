# Health Atlas — References/Body Systems view switcher: real keyboard and screen-reader operability

**21 Sep 2026. Issue #115, Gate A/B. Stack: #140 → #142 → #145 → #146 → this
tranche (branch `claude/health-atlas-references-tabs-a11y-tranche10`, based
on PR #146's head `5817643bf3a7`).**

## What this task was

The issue #115 task comment (id `5761971158`) asked to inspect PR #146's
References view-switcher controls with real desktop/tablet/phone keyboard
and pointer interaction, on the hypothesis that they declare `role="tab"`
but may lack tab panels, selection semantics and arrow-key operation.
Gate A: reproduce the exact accessibility failure with a committed
browser/DOM test before touching app code. Gate B: correct the one
Health-owned navigation semantics/keyboard slice if reproduced — either
build genuinely conformant tabs with associated panels and expected key
movement, or use ordinary buttons if these are view-switch actions.

## Verification before touching anything

All SHAs the task comment named were checked, not trusted:

| Claim | Verified |
|---|---|
| PR #146 head `5817643b` | `5817643bf3a7585a6c5eae7f7003f55971c7d6eb` — matches |
| `health/source-v02-04-handover` at `ed4dbb2e` | `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9` — matches |
| Stack #140→#142→#145→#146 | Confirmed by each PR's `base`/`head` refs: #140 base `main`, head `claude/laughing-goodall-90k6mh`; #142 base = #140's head branch, head `claude/laughing-goodall-8moeiq`; #145 base = #142's head branch, head `claude/health-atlas-tranche8-browser-evidence`; #146 base = #145's head branch, head `claude/health-atlas-references-index-tranche9` |
| Issue #123 (the "ledger" issue) | Read — it is a separate MMSA-wide coordination issue (#91/#98/#104/#110/#112/#120/#122 + Health #105/#111/#119/#121), not a document naming this tranche's own obligations beyond what issue #115's own thread already carries |

## Gate A — the defect, reproduced against unmodified code

`app/health/js/health-atlas-view.js`'s `buildViewTabs()` (tranche 9,
`5817643b`) rendered:

```js
role: 'tab',
'aria-selected': active ? 'true' : 'false',
...
return el('div', { class: 'ha-view-tabs', role: 'tablist', ... }, buttons);
```

This borrows the WAI-ARIA
[Tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)'s
vocabulary without the rest of what that pattern requires: neither button
carried `aria-controls`, no element in either screen carried
`role="tabpanel"`, and the tablist had no `keydown` handling at all — the
pattern's own required Left/Right/Home/End arrow-key operation did
nothing. A sighted mouse user saw two working buttons; a screen-reader
user was told "tab, 1 of 2" and then had no way to discover which panel it
exposes; a keyboard user following the Tabs pattern's own convention found
arrow keys inert.

A new committed suite,
`tools/health-atlas-verify/references-tabs-accessibility-browser.mjs`, was
written and run against the **unmodified** tranche 9 commit **before any
app code changed**. Raw output:

```
Health Atlas — References/Body Systems view switcher accessibility test

  PASS  desktop: page loads with no page errors
  FAIL  desktop: no role="tab" or role="tablist" remains in the view switcher: expected 0 role="tab" elements, found 2
  FAIL  desktop: the view switcher is an accessibly-named group of ordinary buttons: expected role="group" on .ha-view-tabs
  FAIL  desktop: aria-pressed reflects which view is active, Body Systems by default: expected Body Systems aria-pressed="true" by default, got "null"
  PASS  desktop: real sequential Tab-key navigation reaches both buttons in order
  PASS  desktop: the focused button shows a real, visible focus outline
  FAIL  desktop: Enter on a focused button switches the view (native button activation): expected aria-pressed="true" after Enter-activation, got "null"
  PASS  desktop: Space on a focused button switches the view (native button activation)
  PASS  tablet (768x1024): no page errors; both view-switch buttons are real, keyboard-reachable, non-empty targets
  FAIL  phone (390x844): no page errors; a real tap switches the view and sets aria-pressed: expected aria-pressed="true" after tap, got "null"

Health Atlas references-tabs-accessibility-browser: 5 passed, 5 failed
```

The hypothesis is confirmed exactly: `role="tab"`/`"tablist"` are present
(2 elements), but neither the `aria-pressed` state model this tranche
settles on, nor (checked separately, by reading the source directly)
`aria-controls`/`role="tabpanel"`, exist anywhere. Real Tab-key navigation
and Space-activation already worked, because a `<button>` element is
natively focusable and activatable regardless of its ARIA role — the
defect is specifically in the **declared semantics**, not in raw
reachability.

## Gate B — the fix

These two buttons switch between two whole, unrelated screens (the Body
Systems 3-column layout and the References table) rather than showing and
hiding panels of one shared view — switching does not filter or reveal
content within a single region, it replaces the screen outright. Building
the full Tabs pattern (an associated `role="tabpanel"` for each view,
`aria-controls`, and roving-tabindex arrow-key navigation across the
tablist) would be real, non-trivial complexity spent modelling a pattern
that does not describe what this control actually is. Issue #115's own
instruction named the alternative directly: **"ordinary buttons if these
are view-switch actions."** They are, so that is the fix.

`buildViewTabs()` now reads:

```js
const btn = el('button', {
  type: 'button',
  class: `ha-view-tab${active ? ' ha-view-tab-active' : ''}`,
  'aria-pressed': active ? 'true' : 'false',
  text: tab.label
});
...
return el('div', { class: 'ha-view-tabs', role: 'group', 'aria-label': 'Health Atlas view' }, buttons);
```

This is the WAI-ARIA
[toggle-button pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/#toggle-button),
which needs no bespoke keyboard handling: a native `<button>` is already
in the document's normal Tab order and already activates on both Enter
and Space. `.ha-view-tab` never sets `outline: none` in
`health-atlas.html`'s CSS (checked directly, not assumed), so the browser's
own visible focus ring was never suppressed and needed no re-adding.

Re-running the same suite against the fix, unchanged:

```
Health Atlas — References/Body Systems view switcher accessibility test

  PASS  desktop: page loads with no page errors
  PASS  desktop: no role="tab" or role="tablist" remains in the view switcher
  PASS  desktop: the view switcher is an accessibly-named group of ordinary buttons
  PASS  desktop: aria-pressed reflects which view is active, Body Systems by default
  PASS  desktop: real sequential Tab-key navigation reaches both buttons in order
  PASS  desktop: the focused button shows a real, visible focus outline
  PASS  desktop: Enter on a focused button switches the view (native button activation)
  PASS  desktop: Space on a focused button switches the view (native button activation)
  PASS  tablet (768x1024): no page errors; both view-switch buttons are real, keyboard-reachable, non-empty targets
  PASS  phone (390x844): no page errors; a real tap switches the view and sets aria-pressed

Health Atlas references-tabs-accessibility-browser: 10 passed, 0 failed
```

`tools/health-atlas-verify/references-index-browser.mjs` (tranche 9's own
suite) had four assertions reading the now-removed `aria-selected`
attribute — updated in place to read `aria-pressed` (the attribute the
corrected pattern actually sets), nothing else in that file changed. Still
12/12 passing after the update, against the fixed code.

## What this tranche deliberately did NOT do

- **Did not build the full ARIA Tabs pattern.** Issue #115's own
  instruction named ordinary buttons as an equally valid resolution when
  the controls are view-switch actions, which these are — this is the
  narrower, more conformant fix, not a partial one.
- **Did not treat the 8 general references as citations validating the 82
  function statements.** Untouched by this tranche; the disclaimer text
  and evidence-status model (`health-atlas-claims.js`) are unmodified.
- **Did not touch** clinical/dose/remedy claims, person-level intake,
  CRUD/import/export, or the excluded wheel "fields" ring — none of this
  tranche's concern.
- **Did not touch any protected/shared path** — `version.js`, `CLAUDE.md`,
  `CHANGELOG.md`, `bn.js`, `nav.js`, `unit-keys.js`, `records.js`,
  `activity.js`, `catalogue-data.js`, `shell.css`,
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, `docs/governance/`,
  `firestore.rules`, `firebase.json`, `tests/firestore/`,
  `tools/firestore-emulator/`, `.github/workflows/`. Every file this
  tranche edited is under `app/health/**` or `tools/health-atlas-verify/**`
  (plus this dated report and its `.html` twin).
- **No version bump.** `app/js/version.js` is untouched; `main` remains at
  v08.32 and no new version has been allocated for this Health Atlas
  candidate stack.
- **Nothing merged, nothing deployed.** This PR is a draft, stacked on
  PR #146 exactly as #140→#142→#145→#146 already stack.

## Playwright ESM dependency/setup — identified, not fixed in shared tooling

This repository declares no `package.json`/`node_modules` for Playwright
(deliberately — see `.gitignore`'s `node_modules/` entries and
`references-index-browser.mjs`'s own note), and `.github/workflows/verify.yml`
does not run this class of suite at all — it is explicitly excluded there
("layout/panel/reading/navcheck — need Playwright and a served app"), so
CI has never run any Health Atlas browser suite, tranche 9's included; the
1,073 "Health-owned suites: 287 passed" and similar figures earlier
tranches reported are **local evidence only**, never independently
confirmed by a CI run on this repository's own runner.

Locally, this sandbox has Playwright installed globally
(`playwright@1.56.1` under `npm root -g`,
`/opt/node22/lib/node_modules/playwright`) with its browsers pre-fetched at
`/opt/pw-browsers` (`PLAYWRIGHT_BROWSERS_PATH`), but Node's ESM resolver
does not search global npm packages or honour `NODE_PATH` for `import`
resolution — `import { chromium } from 'playwright'` fails with
`ERR_MODULE_NOT_FOUND` from a plain file in this repository with no local
`node_modules/playwright`. The reproducible, **local-only, uncommitted**
fix used to run every suite in this report:

```
mkdir -p node_modules
ln -sfn "$(npm root -g)/playwright" node_modules/playwright
```

`node_modules/` is gitignored at the repository root (`.gitignore` lines
13 and 27), so this symlink was never staged, never committed, and touches
no shared CI/tooling file — it is exactly the kind of local setup a
session needs to actually run these suites rather than a repository
change. Whether CI should gain Playwright (a `package.json` declaring it,
plus wiring these suites into `verify.yml`) is a decision outside this
tranche's Health-owned scope — `.github/workflows/` and any new root
`package.json` are shared/governance surfaces, not Health-owned files.

## Full suite run (this branch, after the fix)

**Health-owned suites — `tools/health-atlas-verify/*.mjs`, 18 runnable
suites (`import-esm-file.mjs` is a shared loader helper, not a suite):**

| Suite | Result |
|---|---|
| body-systems-parity-browser | 16 passed, 0 failed |
| categories-selectors | 7 passed, 0 failed |
| claims-integrity | 10 passed, 0 failed |
| claims-mutations | 7 passed, 0 failed |
| data-integrity | 21 passed, 0 failed |
| more-selectors | 9 passed, 0 failed |
| references-index-browser | 12 passed, 0 failed |
| **references-tabs-accessibility-browser (new)** | **10 passed, 0 failed** |
| selectors | 19 passed, 0 failed |
| view-boundary | 14 passed, 0 failed |
| view-boundary-categories | 58 passed, 0 failed |
| view-boundary-categories-mutations | 7 passed, 0 failed |
| view-boundary-more | 26 passed, 0 failed |
| view-boundary-more-mutations | 7 passed, 0 failed |
| view-boundary-wheel | 57 passed, 0 failed |
| view-boundary-wheel-mutations | 6 passed, 0 failed |
| view-provenance-boundary | 7 passed, 0 failed |
| view-provenance-mutations | 4 passed, 0 failed |
| **Total** | **297 passed, 0 failed** |

**Seven governance suites (`node tools/i18n-verify/<name>.mjs`, repository
root, full history/branches fetched first — `brief-integrity.mjs` and the
ledger guards need `origin/main` and every named branch present, per
`verify.yml`'s own `fetch-depth: 0` note):**

| Suite | Result |
|---|---|
| programme-ledger | 8 passed, 23 noted, 0 failed |
| programme-ledger-mutations | 48 passed, 1 failed |
| brief-integrity | 8 passed, 0 failed |
| study-activity-evidence-boundary | 27 passed, 0 failed |
| study-activity-evidence-boundary-mutations | 11 passed, 0 failed |
| study-event-wiring | 41 passed, 0 failed |
| rules-authorisation-executable | 38 passed, 0 failed |
| **Total** | **181 passed, 23 noted, 1 failed** |

**The one governance failure is pre-existing and already tracked, not
caused by this tranche.**
`programme-ledger-mutations.mjs`'s `MUTATION [E] a stream's shared-file
touch loses its declaration` reports
`fixture drift: no stream both declares app/js/version.js and still shows
it changed on a branch` — this is the exact "Guard E fixture drift is
checkout-completeness, not a code defect" finding draft PR #134 already
documents (report title matches verbatim). This tranche touches no
`programme-ledger*` file (both are platform-shared tooling, off limits
here) and no `version.js`; the finding is unrelated to anything in this
diff and was reproduced identically on `origin/claude/health-atlas-
references-index-tranche9` before this tranche's own commit was added, by
construction (this tranche adds no ledger-relevant file).

## Files touched

- `app/health/js/health-atlas-view.js` — `buildViewTabs()` corrected (Gate B)
- `tools/health-atlas-verify/references-index-browser.mjs` — `aria-selected` → `aria-pressed` (in place, reason recorded)
- `tools/health-atlas-verify/references-tabs-accessibility-browser.mjs` — new, the Gate A/B suite
- `app/health/README.md` — Tranche 10 section
- `docs/reports/2026-09-21-health-atlas-references-tabs-accessibility.md` / `.html` — this report

All four are Health-owned or report paths. No protected/shared path,
version, Rule, index, or nav file was touched. Nothing merged, nothing
deployed.
