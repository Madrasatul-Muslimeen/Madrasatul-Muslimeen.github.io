# Hadith: independent re-verification of PR #149's `aria-current` crumb, and a genuine live keyboard-focus gap found and fixed on every tab switch

**Date:** 2026-09-21 (UTC) **Trigger:** issue #114, comment `5762929828` (`/mmsa-task`, author id `293311955`) **Branch:** `claude/laughing-goodall-rjhnzm`, built directly on PR #149's own head (`84e2c46d`), itself stacked on PR #147's head (`fa9444a6`) → PR #144's head (`466dc313`) → PR #143's head (`34c3fcd5`) **Base:** `main` at `16cfb0b3` (v08.32)

## 0. Scope of this task

The verified comment asked, in order: (1) verify current `main`, the Hadith rights/contracts, issue #123's own ledger, the real heads of the stack, and PR #149's own diff; (2) independently check PR #149's current-crumb `aria-current` on Books and Topics, in English and Bangla, including real keyboard focus, and that no *clickable* ancestor is falsely marked current; (3) investigate ONE next independently reproducible reader-usability item in Books/chapters, or Search→source return if Books checks all pass, implementing only if a committed real-browser regression fails on old code and passes on new, with no invented defect; (4) treat the multi-edition same-collection breadcrumb ambiguity as a recorded future schema case, not a live failure, and not build a fictitious corpus or an unapproved product choice for it; (5) rerun five Hadith suites, English/Bangla browser checks, and seven governance suites, after a genuine full-history and ledger-named-ref preflight, independently re-verifying PR #149's own claimed 49/49 `programme-ledger-mutations` result; (6) re-derive the eight shared Bangla `t()` keys and preserve the synthetic source-rights boundary, never editing `bn.js` or presenting the English fallback as a translation; (7) no new persistent ids/writes, no Rules/index, no `version.js`, no shared/protected path; (8) Hadith-owned files/tests plus this matching report, exact stack order, CI status, the version gate, and Owner app-test guidance before/after merge.

## 1. Verification: state, contracts, and the stack's real heads

`origin/main` is `16cfb0b3` at v08.32 (`app/js/version.js`), matching the ledger and PR #149's own report. The stack, confirmed live via `mcp__github__pull_request_read`:

| PR | Base | Base head | Own head | State |
|---|---|---|---|---|
| #143 | `main` | `16cfb0b3` | `34c3fcd5` | draft, open, mergeable |
| #144 | `claude/laughing-goodall-4dhs97` (#143) | `34c3fcd5` | `466dc313` | draft, open, mergeable |
| #147 | `claude/laughing-goodall-iacemr` (#144) | `466dc313` | `fa9444a6` | draft, open, mergeable |
| #149 | `claude/laughing-goodall-k8z5yh` (#147) | `fa9444a6` | `84e2c46d` | draft, open, mergeable |

This round's own base, `origin/claude/laughing-goodall-te0yu5`, matches PR #149's head exactly (`84e2c46d`). Issue #123 (the separate MMSA-wide integration-readiness thread) exists and was read; nothing in it changes this thread's own bounded scope or has fired an independent trigger overlapping this one.

## 2. Independent check of PR #149's `aria-current` crumb — Books and Topics, English and Bangla, real keyboard focus

Ran `tools/i18n-verify/hadith-source-navigation-browser.mjs` **unmodified**, against PR #149's own head, in a fresh `git worktree`, against a locally served copy — not trusting the PR body's own numbers:

- English: **42 passed, 0 failed**
- Bangla: **42 passed, 0 failed**

Both match PR #149's own report exactly, including: the Collections-tab crumb carrying `aria-current="page"` at edition, book and chapter level; the separate Topic-tab breadcrumb's own current crumb carrying it too; **no clickable `.hadith-crumb` button ever carries the attribute** (checked directly, not inferred); real keyboard `Tab` continuing at the first book row after an edition pick; and the pre-existing (PR #147) edition-crumb announcement and no-chapter-level (Beta) path all still correct. **No deficiency found in PR #149's own change.** This is an independent re-run from a clean checkout, not a re-read of the prior report.

## 3. The multi-edition breadcrumb ambiguity — left exactly as PR #149 recorded it

Re-read PR #149's own §3-equivalent finding (the reproduced, discarded probe showing two editions of one collection would render a byte-identical crumb). The committed corpus (`app/js/hadith-fixture-data.js`) is unmodified by this round and still carries exactly one edition per collection, so this stays a recorded future schema case rather than a live failure. **No fixture was added, no product choice was made** — inventing a second edition to force a failure would itself be the "invented defect" this round's own instruction forbids.

## 4. The next independently reproducible reader-usability item — every tab switch drops keyboard focus to `<body>`

Books/chapters checks all passed (§2), so the task's own fallback applies: **Search→source return**. Reproducing that specific round trip by hand (query → "View in source" → click back to the Search tab) surfaced a real, live, currently-reproducible gap — and, checking whether it was Search-specific or general, it is **not**: it reproduces on *every* tab switch (Collections, Topics, Search, Explore, Commentary alike), not only the Search-return case the task named.

`render()` (`app/js/hadith-browser.js`) tears down and rebuilds the **whole** subtree — tab bar included — on every single click, exactly as it already does for an in-tab Collections step. Two existing mechanisms already handle focus for narrower cases: `focusCollectionsLanding()` (a step within the Collections tab: edition/book/chapter picked, or a breadcrumb step back) and `focusPendingOccurrence()` (the one-shot highlight after a Topics/Search "View in source" jump, which scrolls and highlights but never calls `.focus()`). **Neither runs on a plain tab-bar click.** Confirmed live, before any fix, with a throwaway probe against PR #149's own head:

| Action | `document.activeElement` before fix |
|---|---|
| Click the Search tab | `<body>` |
| Search "the" → click "View in source" → click the Search tab again | `<body>` (query and results both persist — `state.query` lives on `state`, not on the destroyed input — only *focus* was lost) |
| Click the Collections tab | `<body>` |
| Click the Topics tab | `<body>` |

So a keyboard-only or screen-reader user loses their place to the very top of the page on **every** tab switch, including the exact "return to Search after visiting a narration's source" round trip the task named — the data survives, the reader's position does not.

### Fix

`app/js/hadith-browser.js` — one new helper, `focusActiveTab()`, called from the tab button's own click handler right after `render()` (the same call-after-render shape `focusCollectionsLanding()` already uses at every other call site):

```js
function focusActiveTab() {
  const btn = document.querySelector(".hadith-tab.active");
  if (btn) btn.focus({ preventScroll: true });
}
```

Focus lands on the newly-active tab button itself — the standard ARIA-tabs pattern (focus stays on the tab list; the button is already a real, always-focusable control, so this needs no `tabindex` hack, unlike the landing elements `focusCollectionsLanding()` has to stamp one onto). **Zero new translatable strings.**

### Tests

`tools/i18n-verify/hadith-source-navigation-browser.mjs`, 4 new checks: switching to the Search tab lands focus on the Search tab button; returning to Search after a "View in source" jump does too, **and** the query/results are still the same (proving the data was never the problem, only focus); switching to the Collections tab lands focus on its own button; switching to the Explore tab does too (Topics and Commentary use the identical code path — every tab shares one click-handler loop — so these four already exercise every branch of it).

- English: **47 passed, 0 failed** (43 pre-existing + 4 new)
- Bangla: **47 passed, 0 failed**

**Mutation-proven, per this round's own instruction ("implement only if a committed real-browser regression fails old code and passes new")**: `git stash` on `app/js/hadith-browser.js` alone, suite re-run, `git stash pop` to restore (file confirmed identical to the fixed version afterward) fails **exactly** the 4 new checks — **43 passed, 4 failed** — the fifth ("keeps the same query and results") stays green even reverted, correctly, since that one asserts state persistence, not focus, and the fix touches only focus. Nothing else regresses either direction.

## 5. The `programme-ledger-mutations` 49/49 claim — independently reproduced, not re-quoted

The main working checkout was `git fetch --unshallow`d before any suite ran (full-history preflight). Both ledger-declared HELD/standing-instruction commits confirmed present as real objects, not assumed from the ledger's own text: `7e2931f795af1cd97efc1167660cea93aa22b9ab` (the held `claude/phase4-wiring` tip) and `43dd96f58eeee5ad33dc82bb4e260660e3c290c9` (the Hadith stream's own recorded `branchTip`).

Ran `programme-ledger-mutations.mjs` against the final state: **49 passed, 0 failed**, matching PR #149's own claim exactly. PR #149's own root-cause finding (a shallow clone has no merge-base with the held `claude/phase4-wiring` branch, so one mutation's precondition silently fails to hold, producing 48/1) is consistent with what full-history resolves here too. `programme-ledger-mutations.mjs` — protected shared tooling — was not edited.

## 6. All twelve suites, final state (PR #149's head + this round's two-file diff), full-history checkout

| Governance suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | **49 passed, 0 failed** (full-history; see §5) |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

| Hadith suite | Result |
|---|---|
| `hadith-corpus` | 60 passed, 0 failed |
| `hadith-commentary-binding` | 14 passed, 0 failed |
| `hadith-source-rights` | 14 passed, 0 failed |
| `hadith-governing-contracts` | 14 passed, 0 failed |
| `hadith-gate-contracts` | 11 passed, 0 failed |
| `hadith-source-navigation-browser` (en/bn) | **47/47 passed, 0 failed** (43 pre-existing + 4 new, §4) |

## 7. Eight-key Bangla handoff — independently re-derived, unchanged

Extracted all 60 distinct `t()` literal keys directly from `app/js/hadith-browser.js` by source scan (not read off any prior report — the fix in §4 adds two new call sites but zero new user-facing strings, `aria-current` and the focus call being invisible to a reader) and diffed each against `app/js/i18n/bn.js`. **Exactly eight** came back missing, character-for-character identical to every prior round on this thread:

1. `"View in source"`
2. `"Translation coverage"`
3. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
4. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
5. `"{en} of {n} have English, {bn} of {n} have Bangla."`
6. `"Topic coverage"`
7. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
8. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

This round's own fix introduces **zero** new English literals (confirmed by the identical count before and after). `bn.js` was not opened for editing. The Bangla browser run in §4 confirms the honest-fallback behaviour for these eight is unaffected — they still print verbatim in Bangla mode rather than going blank or inventing a translation.

## 8. Boundaries preserved

No new id, collection, `t()` string requiring `bn.js`, Rules/index, permanent unit key, or write. Fully reversible (two files, +57/−1). Independent of PR #130/#141/#143/#144/#147/#149's own diffs — neither touched file's *diff against #149's own head* is touched by any of them (verified by `git diff --stat` against #149's head showing exactly this round's own two files).

## Ownership boundary

`git diff --stat` against PR #149's own head (`84e2c46d`) shows exactly two files: `app/js/hadith-browser.js`, `tools/i18n-verify/hadith-source-navigation-browser.mjs`. Both are Hadith-owned. Every entry in the bridge's protected/shared table confirmed empty for *this round's own diff*: `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, the six protected tooling files, `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/`. (The wider stack — PRs #143/#144/#147/#149 — does touch `CLAUDE.md`, `CHANGELOG.md`, `app/js/version.js` and the ledger relative to `main`; confirmed identical before and after this round's own commit, i.e. none of it is this round's doing.)

## Dependency / integration order

1. Draft PR #130, PR #141 (unchanged; still open).
2. Draft PR #143 (unchanged by this round).
3. Draft PR #144 (unchanged by this round).
4. Draft PR #147 (unchanged by this round).
5. Draft PR #149 (unchanged by this round).
6. This PR, stacked on #149's head — no further rebase needed at integration time.

## CI status

No CI run is recorded against this round's own head at report time (mirrors PR #149's own "none recorded for #149 head" note — no workflow triggers in this environment for a freshly-pushed branch before a pull request exists).

## Central version gate

**No version bump.** `app/js/version.js` untouched by this round. `v08.32` remains the current `main` milestone; version allocation is the Master Architect's — this round needs none.

## Owner app test required

**NO.** Exists only on this branch, stacked on five unmerged PRs (#130/#141/#143/#144/#147/#149). When the whole stack lands: sign in at `https://madrasatul-muslimeen.github.io/app/hadith-collections.html` (and the `?mount=quranrevival` route), open the Hadith browser, and — **using the keyboard only (Tab / Shift+Tab / Enter, no mouse)** — click through Collections → Topics → Search → Explore in sequence. Expected: after each tab switch, the next `Tab` press continues from that tab button (visible focus ring on the tab just pressed), never jumping back to the very top of the page. Then: Search for a word that matches a narration, press "View in source", and click back to the Search tab — the same query and results should still be there, and focus should be back on the Search tab button rather than at the top of the page. No visible layout change anywhere; this round changes only keyboard focus behaviour, invisible to a mouse-only or sighted-only check.

## Deliberately not done

- The multi-edition breadcrumb ambiguity (§3) — recorded by PR #149, re-read and left exactly as recorded; not a live defect in the committed corpus, and inventing one would be the forbidden invented defect.
- `<nav class="hadith-crumbs">`'s missing `aria-label` — noted in PR #149's own "deliberately not done"; still not touched here, for the same reason (a new translated string would widen the eight-key handoff §7 keeps unchanged).
- `bn.js` not touched — no new English literal to hand off (§7 stays at eight, unchanged).
- No merge, deploy, Rules/index change, or version bump.
- `programme-ledger-mutations.mjs` (protected shared tooling) not edited.
- PRs #103, #116, #118, #122, #125, #130, #141 left open and untouched.
- Full ARIA `role="tablist"`/`role="tab"`/`role="tabpanel"` semantics for the tab bar — noticed while fixing the focus gap (the tab buttons carry no ARIA tab roles at all today), but a materially larger change than the one reproducible defect this round set out to fix; flagged for a future round or an explicit Owner/MMSA steer on scope.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01CwgmgtoBFhwqLd5SiZKtCp
