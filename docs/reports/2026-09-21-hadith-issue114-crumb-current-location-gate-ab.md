# Hadith: Books breadcrumb Gate A/B — independent re-verification of PR #147's crumb, the multi-edition ambiguity it would expose, and a genuine live accessibility gap fixed

**Date:** 2026-09-21 (UTC) **Trigger:** issue #114, comment `5761973722` (`/mmsa-task`, author id `293311955`) **Branch:** `claude/laughing-goodall-te0yu5`, built directly on PR #147's own head (`fa9444a6`), itself stacked on PR #144's head (`466dc313`) → PR #143's head (`34c3fcd5`) **Base:** `main` at `16cfb0b3` (v08.32)

## 0. Scope of this task

The verified comment asked, in order: (1) verify current `main`, the contracts/source-rights record, issue #123's own ledger, the real heads of #130/#141/#143/#144/#147, and PR #147's diff; (2) independently reproduce PR #147's own edition-breadcrumb accessible-name/focus/Tab result in **both** English and Bangla, using keyboard-only browser checks, and review whether the second crumb PR #147 added can produce a duplicate or confusing breadcrumb hierarchy; (3) Gate A — check Books/chapters reader and breadcrumb focus continuity (Tab/Shift+Tab, escape/return); (4) Gate B — one bounded Hadith-owned fix with a committed, mutation-proven regression test **only for a proven deficiency**, else another independently reproducible slice; (5) re-investigate the `programme-ledger-mutations` 48/49 discrepancy the thread has reported three times, under a genuine full-history/named-ref preflight, at PR #147's own head rather than assuming the earlier explanation still holds; (6) rerun five Hadith suites, the English/Bangla browser suite, and all seven governance suites, reporting raw outcomes; (7) re-derive the eight-key Bangla handoff independently; (8) preserve every stated boundary (no new id/collection/Rules/index/version bump/shared-file touch); (9) state dependency order, the version gate, and Owner-test guidance.

## 1. Verification: state, contracts, and the stack's real heads

`origin/main` is `16cfb0b3` at v08.32 (`app/js/version.js`), matching what PR #147's own report claims. The stack, confirmed live via `mcp__github__pull_request_read` rather than assumed from the comment text:

| PR | Base | Base head | Own head | State |
|---|---|---|---|---|
| #143 | `main` | `16cfb0b3` | `34c3fcd5` | draft, open, mergeable |
| #144 | `claude/laughing-goodall-4dhs97` (#143) | `34c3fcd5` | `466dc313` | draft, open, mergeable |
| #147 | `claude/laughing-goodall-iacemr` (#144) | `466dc313` | `fa9444a6` | draft, open, mergeable |

`fa9444a6` (this session's build base) matches `origin/claude/laughing-goodall-k8z5yh`'s tip exactly. Issue #123 (the separate MMSA-wide integration-readiness thread) was read; nothing in it changes this thread's own bounded scope, and its own task trigger has not fired independently of this one.

## 2. Gate A — independent reproduction of PR #147's own result

Ran `tools/i18n-verify/hadith-source-navigation-browser.mjs` unmodified, against PR #147's own head, in both languages, against a locally served copy (`serve.js`) rather than trusting the PR body's own numbers:

- English: **36 passed, 0 failed**
- Bangla: **36 passed, 0 failed**

Both match PR #147's own report exactly, including the edition-crumb announcement checks, the "next real Tab reaches the first book row" check, and the "Collections crumb is not tab-index-stripped" check. **Gate A: no deficiency in focus continuity.** Tab/Shift+Tab, back-navigation via the breadcrumb, and the no-chapter-level (Beta) path were all re-confirmed independently correct.

## 3. The "duplicate/confusing hierarchy" question — a real structural finding, not a live defect

PR #147's own crumb is built by `collectionOf(state.editionId)` (`app/js/hadith-corpus.js`), which reads the **collection** an edition belongs to — never anything specific to the edition itself (`language`, `revision`, `editionId`). The top-level picker (`renderCollections()`, `app/js/hadith-browser.js`) has the identical shape: `for (const c of listCollections()) { for (const e of c.editions) { ... row-name = c.name ... } }` — the row's *primary* label is always the collection's name; the edition is distinguished only by a small, untranslated meta line (`${e.editionId} · ${t("Synthetic")}`) that never reappears once an edition is picked.

**Reproduced live** (a throwaway, uncommitted probe — not part of this branch): temporarily adding a second synthetic edition to the `synthetic-alpha` collection (a legitimate shape under the data model — `EDITIONS` rows carry `collectionId` as a genuine foreign key, and `renderCollections()` already loops `c.editions` expecting more than one is possible) produces two picker rows and two post-pick breadcrumbs that are **byte-identical** ("Sample Collection Alpha" in both cases): a keyboard or screen-reader user could not tell which edition they picked or are browsing from either surface.

**This is a real, reproduced structural gap — and also not a live defect**, because the committed, real Hadith corpus (`app/js/hadith-fixture-data.js`, unmodified by this round) has exactly one edition per collection today (`synthetic-alpha` → `synthetic-alpha-ar-v1`; `synthetic-beta` → `synthetic-beta-ar-v1`), so the crumb is currently always unambiguous. Per Gate B's own instruction — "only for a proven deficiency … if no defect, choose another independently reproducible … slice, without inventing evidence" — inventing a second edition to manufacture a live failure would be exactly the evidence-inventing the task forbids, so no fixture change was made and the probe was discarded rather than committed. **Flagged, not built**: the moment a real second edition of one collection is ever added (a live product decision, not a Hadith-owned code choice), the crumb and the picker row both need a disambiguating detail — the edition's own `language`/`revision` are the two closed-set fields already on every `EDITIONS` row and need no new translated vocabulary to show.

## 4. Gate B — the fix actually made: `aria-current` on the current breadcrumb crumb

Reproducing the question above by hand (reading the rendered DOM, not just the accessible name PR #147's own checks already cover) surfaced a second, **live**, currently-reproducible gap, independent of the collection-ambiguity question: the current-location crumb (`<span class="hadith-crumb-current">`) and its containing `<nav class="hadith-crumbs">` carry **no ARIA signal at all** for "this is where you are in the trail" — confirmed by reading `document.activeElement.getAttribute("aria-current")` live at edition, book and chapter level, and on the separate Topic-tab breadcrumb: `null` in every case, on both PR #147's own head and on `main`. The WAI-ARIA Authoring Practices breadcrumb pattern calls for `aria-current="page"` on exactly the current, non-clickable crumb; this component never set it, and it was PR #147's own two-crumb depth increase that raised how much a screen-reader user needs that signal to follow the trail.

**Fix**, `app/js/hadith-browser.js` (two call sites — the Collections breadcrumb's `add()` closure, and the Topic tab's own separate breadcrumb builder): the current-crumb `<span>` now carries `aria-current="page"`. **Zero new translatable strings** — `aria-current`'s value is a fixed ARIA token, not user-facing text, so it needs no `bn.js` key and does not change the eight-key handoff (§6). Exclusivity confirmed: no clickable `.hadith-crumb` button ever carries the attribute.

**Tests**, `tools/i18n-verify/hadith-source-navigation-browser.mjs`, 6 new checks: the edition-level, book-level, chapter-level and no-chapter-level landing crumbs each carry `aria-current="page"`; no clickable crumb carries it; the separate Topic-tab breadcrumb's current crumb carries it too.

- English: **42 passed, 0 failed** (36 pre-existing + 6 new)
- Bangla: **42 passed, 0 failed**

**Mutation-proven**: reverting `app/js/hadith-browser.js` alone (via `git stash`, suite re-run, `git stash pop` to restore — file confirmed byte-identical to the fixed version afterward) fails **exactly** the 5 checks that assert the attribute is present (the "not on a clickable crumb" check stays green, correctly, since reverting the fix means *nothing* carries the attribute) — **37 passed, 5 failed** — nothing else regresses.

## 5. The `programme-ledger-mutations` 48/49 discrepancy — root cause found, not merely re-reported

Reproduced the **exact** failure PR #147 itself reported (48 passed, 1 failed, `MUTATION [E] a stream's shared-file touch loses its declaration` — "fixture drift: no stream both declares app/js/version.js and still shows it changed on a branch") on a **fresh worktree of PR #147's own head**, using the harness's default shallow clone. Root cause, found by reading the failing mutation's own precondition (`tools/i18n-verify/programme-ledger-mutations.mjs:223-229`): it needs a ledger stream (`QuranRevival MAP Phase 4 Study-event wiring (held)`, `activeBranch: claude/phase4-wiring`) whose **real, live-computed** git diff against `main` actually shows `app/js/version.js` changed. On a shallow clone, `git merge-base origin/main origin/claude/phase4-wiring` returns **no merge base at all** (confirmed directly: `fatal: no merge base`), so the suite's own fact-gatherer cannot compute that branch's real diff and the precondition silently fails to hold.

**`git fetch --unshallow`** resolves it completely: merge-base then resolves (`8a305c30…`), `git diff origin/main...origin/claude/phase4-wiring -- app/js/version.js` shows the real one-line change, and the suite reports **49 passed, 0 failed** — reproduced identically to PR #144's own finding of the same root cause. **This is not "inherited drift" and never was**: it is a shallow-clone artifact of whatever checkout ran the suite, not a property of the ledger, the mutation guard, or any branch's real content. `programme-ledger-mutations.mjs` (protected shared tooling) was not edited — the fix is in how the checkout is prepared, not in the suite.

## 6. All twelve suites, PR #147's head + this round's two-file diff, full-history checkout

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
| `hadith-source-navigation-browser` (en/bn) | **42/42 passed, 0 failed** (36 pre-existing + 6 new, §4) |

## 7. Eight-key Bangla handoff — independently re-derived, unchanged

Extracted all 56 distinct `t()` literal keys directly from `app/js/hadith-browser.js` by source scan (not read off any prior report) and diffed each against `app/js/i18n/bn.js`. **Exactly eight** came back missing, character-for-character identical to every prior round on this thread:

1. `"View in source"`
2. `"Translation coverage"`
3. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
4. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
5. `"{en} of {n} have English, {bn} of {n} have Bangla."`
6. `"Topic coverage"`
7. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
8. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

This round's own fix (§4) introduces **zero** new English literals — confirmed by the identical count (56 keys, 8 missing) before and after the change. `bn.js` was not opened for editing.

## 8. Boundaries preserved

No new id, collection, `t()` string requiring `bn.js`, Rules/index, permanent unit key, or write. Fully reversible (two files, +34/−2 across both). Independent of PR #130/#141/#143/#144's own diffs — neither touched file is touched by any of them.

## Ownership boundary

`git diff --stat` against PR #147's own head (`fa9444a6`) shows exactly two files: `app/js/hadith-browser.js`, `tools/i18n-verify/hadith-source-navigation-browser.mjs`. Both are Hadith-owned. Every entry in the bridge's protected/shared table confirmed empty: `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, the six protected tooling files, `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/`.

## Dependency / integration order

1. Draft PR #130, PR #141 (unchanged; still open).
2. Draft PR #143 (unchanged by this round).
3. Draft PR #144 (unchanged by this round).
4. Draft PR #147 (unchanged by this round).
5. This PR, stacked on #147's head — no further rebase needed at integration time.

## Central version gate

**No version bump.** `app/js/version.js` untouched. `v08.32` remains the current `main` milestone; version allocation is the Master Architect's.

## Owner app test required

**NO.** Exists only on this branch, stacked on unmerged #143/#144/#147. When all four land: `https://madrasatul-muslimeen.github.io/app/hadith-collections.html` (and the `?mount=quranrevival` route) → Collections tab → navigate edition → book → chapter, and separately the Topics tab → a topic detail, using a screen reader (or the accessibility inspector's "Accessibility" tree) at each step. Expected: the current breadcrumb crumb now reports as `aria-current: page` — no visible change to sighted keyboard use, since this round changes only an ARIA attribute, not layout, focus order or text.

## Deliberately not done

- The multi-edition breadcrumb ambiguity (§3) — real, reproduced by a discarded probe, but not a live defect in the committed corpus and not fixed, to avoid inventing evidence or unilaterally deciding a real product/data shape (whether/when a Hadith collection ever carries more than one edition) that belongs to Owner/Master Architect judgement, not this round's bounded scope.
- `<nav class="hadith-crumbs">` still carries no `aria-label` (e.g. "Breadcrumb") — a related, smaller accessibility gap noticed while fixing `aria-current`, left alone because it would need a new translated string, which risks widening the eight-key handoff this round deliberately kept unchanged; flagged for a future round or an explicit Owner/MMSA steer on whether a `t()`-backed ARIA label is in scope for this thread.
- `bn.js` not touched — no new English literal to hand off (§7 stays at eight, unchanged).
- No merge, deploy, Rules/index change, or version bump.
- `programme-ledger-mutations.mjs` (protected shared tooling) not edited — the 48/49 discrepancy was a checkout artifact (§5), not a defect in the suite.
- PRs #103, #116, #118, #122, #125, #130, #141 left open and untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01826Th9miaEEMbedBo7a7eZ
