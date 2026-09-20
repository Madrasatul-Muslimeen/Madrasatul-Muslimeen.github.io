# Hadith — browser verification of Explore translation coverage (English and Bangla)

**Date:** 2026-09-20 · **Type:** Verification only, Hadith-owned. No application
file, `bn.js`, version, Rules, or shared path changed.

---

## 1. What this closes

PR #103's own report (`docs/reports/2026-09-20-hadith-translation-coverage.md`,
§"What was deliberately not done") recorded: *"No DOM/Playwright verification was
possible in this sandbox — no `node_modules`/`playwright` installed at all... full-page
confirmation is outstanding wherever Playwright is available."* This is that
confirmation, run from issue #108's own instruction, in a sandbox where
`playwright@1.56.1` is installed globally (`/opt/node22/lib/node_modules`) and
Chromium is pre-installed at `/opt/pw-browsers/chromium`.

**Checkout preflight (PR #98's own proposed shape) run first:** `git remote
set-branches origin '*'` then `git fetch --depth=2147483647 origin`; confirmed
`origin/main` and the Programme Integration Ledger's one active stream
(`origin/claude/phase4-wiring`) both resolve. No `CHECKOUT PREFLIGHT FAILED`.

**All seven governance suites re-run clean on `main` (v08.31, `2cb405e`)
before touching this branch:**

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

(PR #103's own governance table, reproduced against `main` at the same commit
it was built from, matches — no drift.)

## 2. How Playwright was made reachable

The repository deliberately carries no `package.json`/`node_modules` (D4 — the
app itself has no dependencies); `tools/i18n-verify/harness.mjs` imports the bare
specifier `"playwright"`, which is only resolvable when a `node_modules/playwright`
exists somewhere Node's ESM resolver walks up to, or is installed at the repo
root. Node's `NODE_PATH` is **not** honoured by the ESM resolver (only by
CommonJS `require`), so a plain `NODE_PATH=$(npm root -g)` — which is enough for
CJS `require('playwright')` — is not enough for `harness.mjs`'s `import`.
**A local `node_modules/playwright` symlink to the sandbox's global install was
created for this run and is not committed** (`node_modules/` is in
`.gitignore`, confirmed before creating it, and nothing under it was staged).
This is sandbox plumbing, not an application or house-tooling change — no file
under `tools/`, `app/`, or the repository root's tracked tree was touched to make
it work.

`node serve.js` was started to serve the repository at `http://localhost:8080`,
the base URL `harness.mjs` itself hardcodes.

## 3. The verification script and what it checked

A focused, un-checked-in Playwright script (this project's own convention for a
verification pass that is not a permanent regression suite), using
`tools/i18n-verify/harness.mjs`'s own `newContext`/`openPage` helpers so it
exercises the same stubbed Firebase, splash-suppression and language-seeding
path every other suite in this repository does — not a bespoke boot sequence.
For each of English and Bangla (`appLang` seeded via the harness's own
`localStorage` mechanism, at 390×844): open `/app/hadith-collections.html`,
click the `[data-hadith-tab="explore"]` tab (the same selector the component's
own markup carries), and assert on the **rendered** DOM — never on source code
or on the function's return value directly, per this project's own standing
lesson that a passing check must read the rendered result.

**14 of 14 checks passed, both languages:**

- page boots with zero page errors
- the Explore tab exists and is clickable
- the `<h3>` reads exactly `"Translation coverage"` (English literal, since
  `bn.js` carries no entry yet — see §4)
- the overall line renders with real, non-placeholder numbers:
  `Overall: 8 of 8 have English, 7 of 8 have Bangla.` — matching
  `translationCoverage()`'s own fixture totals exactly (PR #103's report §5:
  "all 8 carry English, 7 of 8 carry Bangla")
- two per-edition rows render (`[data-hadith-coverage-edition]`), each with a
  real count line (`synthetic-alpha-ar-v1`: `6 of 6 have English, 6 of 6 have
  Bangla.`; `synthetic-beta-ar-v1`: `2 of 2 have English, 1 of 2 have Bangla.`
  — the latter is the fixture's own documented gap, `syn-occ-0008`, landing
  exactly where PR #103's report said it would)
- the fixture-only caveat sentence renders

Full-page screenshots were captured for both languages (390×844, the phone
width this project measures at) and are attached as evidence to this task's
pull request rather than checked into the repository, per the project's own
convention that a screenshot is evidence for a round, not a permanent asset.

## 4. What the screenshots confirm, that the numbers alone could not

Reading the two screenshots side by side (not just the pass/fail count, per
this project's own standing lesson that a screenshot must be looked at, not
just measured): the Bangla page is genuinely translated everywhere else on
the Explore tab — "উৎসের ভরবিন্যাস" (Source hierarchy), "বিষয়সমূহ" (Topics),
"ধ্রুপদী ব্যাখ্যা" (Classical Explanations) tab label, the language picker
itself reading "বাংলা" — and the **new** "Translation coverage" section is the
one heading and two paragraphs of body text on the whole page still in plain
English. This is the exact, precise shape of the gap PR #103's report already
named (§"What was deliberately not done": *"on a Bangla page this section
reads in English until the Bangla catalogue is extended"*) — now shown as a
real rendered page rather than inferred from `i18n.js`'s fallback behaviour,
and confirming nothing else on the page regressed.

## 5. The three Bangla strings, reconfirmed against the running page

PR #103's report §7 already lists the exact three `bn.js` keys needed. Reading
them against the live English render in the screenshot confirms all three are
verbatim, with no fourth string introduced since:

1. `"Translation coverage"` (the `<h3>`)
2. `"How many synthetic narrations carry an English or a Bangla version,
   alongside the Arabic source. This describes the fixture only -- it is not a
   measure of a real corpus."` (the caveat paragraph)
3. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."` (the overall
   line; the per-edition rows reuse the same template without the `"Overall:
   "` prefix — `"{en} of {n} have English, {bn} of {n} have Bangla."` is
   already covered by the same catalogue key once added, since `t()` keys on
   the English literal and this template's own placeholder text is identical
   between the two call sites)

`bn.js` remains untouched by this round — it is on this bridge's protected-path
table, exactly as PR #103 already flagged. This verification changes nothing
about that; it only proves, from the rendered page rather than from reading
`i18n.js`, that the gap is real and is exactly these three strings.

## 6. What this deliberately does not do

- No `bn.js`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`, Rules, or any other
  shared/protected path touched.
- No merge, no deploy, no version bump. `v08.32` remains unallocated.
- No change to `app/js/hadith-corpus.js`, `app/js/hadith-browser.js`, or
  `tools/i18n-verify/hadith-corpus.mjs` — this round is read-only verification
  of what PR #103 already built.
- The verification script itself is not checked in, matching this project's
  own established convention for a focused, un-checked-in Playwright pass.
- The local `node_modules/playwright` symlink used to run it is not committed
  (`.gitignore`-covered, `git status` confirmed clean of it before this
  report was written).

## 7. Governance suites, re-run on this branch after adding this report

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

All seven exit 0, unchanged from PR #103's own table — this round adds one
documentation file and no application code.

---
