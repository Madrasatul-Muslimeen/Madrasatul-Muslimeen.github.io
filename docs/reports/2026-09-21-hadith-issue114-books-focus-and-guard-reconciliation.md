# Hadith: Books/chapters keyboard-focus fix, and the programme-ledger-mutations 48/49 reconciliation

**Date:** 2026-09-21 (UTC)
**Trigger:** issue #114, comment `5760404627` (`/mmsa-task`, author id `293311955`)
**Branch:** `claude/laughing-goodall-iacemr`, built on PR #143's head (`34c3fcd5`)
**Base:** `main` at `16cfb0b3` (v08.32)

## 0. Scope of this comment

This round of the standing issue #114 asked for four things: (1) reconcile
the `programme-ledger-mutations` "48 passed, 1 failed" figure PR #143 (and
#141, #130) reported against issue #123's own "49 passed, 0 failed" full-ref
result; (2) verify the seven governance suites, the five Hadith suites, and
head-specific CI on PR #143; (3) independently enumerate the eight distinct
missing Bangla `t()` keys PR #143 already declared; (4) reproduce one real,
independent Books/chapters usability defect (navigation/focus/identity) and,
only if confirmed and Hadith-owned, fix it with focused tests, without
overlapping PR #143's breadcrumb fix or PR #141's "View in source" jump.

Everything below was verified directly in this session — nothing here is
copied from a prior PR's own claim without being re-run.

## 1. The 48/1 vs 49/0 reconciliation

**Reproduced from a completely fresh, single-branch clone** (`git clone
--branch main --single-branch`, no other refs at all):
`programme-ledger-mutations.mjs` fails **7** checks, all four under guards
A/B/C plus three under guard E — not one. Every failing case traces to the
same root cause: the `quran-phase4-wiring` stream's held branch
(`claude/phase4-wiring`, the ledger's only `activeBranch` entry) was never
fetched, so the mutation fixtures' `facts.branches[...]` lookups came back
empty.

**Isolated the exact dependency**: fetching every one of the other 100+
remote branches *except* `claude/phase4-wiring` still leaves the same 7
failures. Fetching `claude/phase4-wiring` alone, with nothing else fetched
beyond `main`'s own full history, brings the suite to **49 passed, 0
failed**. This matches issue #123's own comment `5754544986` finding exactly
("all seven traced to the same root cause ... the suite is unmodified and
passes 49/0").

**Could not reproduce the specific "48 passed, 1 failed" figure** PR
#130/#141/#143 each reported under any combination of missing refs tried
(full single-branch clone: 7 failed; every branch but `phase4-wiring`: 7
failed; everything fetched: 0 failed). Ran the suite three more times on
fully-preflighted checkouts to be sure the result is stable, not
intermittent:

| Checkout | Result |
|---|---|
| This session's own branch, at PR #143's head, full history + `claude/phase4-wiring` fetched | 49 passed, 0 failed |
| A throwaway `git worktree` of PR #143's exact head (`34c3fcd5`), same refs | 49 passed, 0 failed |
| A fresh `git clone --single-branch main`, then every remote branch fetched | 49 passed, 0 failed |

**Conclusion, consistent with issue #123's own prior finding**: under a
complete preflight (full history + the one ledger-declared HELD branch),
`programme-ledger-mutations.mjs` reliably reports 49/0 on both `main` and PR
#143's own head. The "1 failure" three PRs on this thread reported does not
reproduce here and was not chased further to its exact partial-fetch recipe
— what matters for the guard's own integrity is that a *complete* preflight
gives a stable, reproducible 49/0, which this session confirms three ways.
**The protected suite (`programme-ledger-mutations.mjs`) was not edited.**

## 2. Seven governance suites + five Hadith suites, PR #143 head (worktree)

Run against a throwaway `git worktree` of `34c3fcd5` (PR #143's exact head,
untouched by anything in this round):

| Governance suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
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

All twelve suites are clean on PR #143's own head under a full preflight —
PR #143's reported figures for the eleven suites other than
`programme-ledger-mutations` are confirmed exactly; the twelfth is corrected
per §1 above.

**Head-specific CI**: PR #143's "Deterministic governance suites" check run
(`106314620371`) is `completed` / `success` against head `34c3fcd5`.

## 3. Eight-key Bangla handoff — independently re-derived

Extracted every literal `t("...")` call in `app/js/hadith-browser.js` on PR
#143's own head (57 distinct literals, by grep + dedup, not by reading PR
#143's own list), then checked each one for a verbatim match in
`app/js/i18n/bn.js`. **Exactly eight came back missing**, and they are
character-for-character the same eight PR #143 already declared:

1. `"Translation coverage"`
2. `"Topic coverage"`
3. `"View in source"`
4. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
5. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
6. `"{en} of {n} have English, {bn} of {n} have Bangla."`
7. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
8. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

`app/js/i18n/bn.js` was not opened for editing at any point in this session.
This round's own fix (§4) introduces **zero** new English literals — it
manipulates DOM focus only, calling no `t()` of its own.

## 4. Gate A — the defect found by reproduction

**Live-walked the Collections tab** (`hadith-collections.html`) with a
Playwright probe reading `document.activeElement` after every navigation
click, in both edition shapes the fixture carries (Alpha, which has a
chapter level; Beta, which does not).

**Found**: `render()` (in `mountHadithBrowser()`, `app/js/hadith-browser.js`)
does `root.textContent = ""` and rebuilds the whole Collections subtree on
**every** navigation step — picking an edition, a book, a chapter, or
stepping back via any breadcrumb crumb. The button a keyboard user just
pressed is destroyed in that rebuild, and with nothing to receive focus
afterward, the browser drops it to `<body>`. Reproduced four separate ways,
confirmed with `document.activeElement === document.body`:

| Step | `document.activeElement` before fix |
|---|---|
| Pick an edition | `<body>` |
| Pick a book | `<body>` |
| Pick a chapter | `<body>` |
| Step back via a breadcrumb crumb | `<body>` |

**Why this is a real usability defect, not a cosmetic one**: a keyboard-only
or screen-reader user navigating this reader has their tab position reset to
the top of the document on every single step through
collection → book → chapter, and on every step back — they must re-Tab from
the page's very top each time rather than continuing from where they were.
This is a general property of `render()`'s full-rebuild strategy, which
`CLAUDE.md`'s own standing lesson already names for a different symptom
("Re-render wipes UI state ... anything a reader opened by hand needs a
session flag threaded back in") — this is the same mechanism, applied to
keyboard focus rather than open/closed UI state.

**Independent of both open PRs on this thread**: PR #141's
`focusPendingOccurrence()` covers a different, narrower case — the one-shot
highlight after a Topics/Search "View in source" jump — and calls no
`.focus()` at all (only `.scrollIntoView()`), so it never addressed ordinary
Collections-tab navigation. PR #143's breadcrumb fix changes what text a
crumb shows, not where focus goes. Neither touches this.

## 5. Gate B — the bounded fix

**`app/js/hadith-browser.js`**: one new function, `focusCollectionsLanding()`,
called from the five Collections-tab navigation click handlers (edition row,
book row, chapter row, the "Collections" breadcrumb reset, and the
one-level-back book-crumb click) right after each one's own `render()` call.
It reads the freshly rendered `#hadithBody` (a stable id `render()` already
gives the body element), and focuses the breadcrumb's own last crumb — the
non-clickable current-location span where one exists (a book or chapter is
chosen), or the still-clickable "Collections" crumb itself (an edition was
just picked, nothing deeper chosen yet) — or, at the very top level where no
breadcrumb exists at all, the "Collections" `<h2>`. A `tabindex="-1"` is
added only if the landing element does not already carry one, so a real
button's own tab order is never touched.

**Why this lands, not just "doesn't crash"**: the breadcrumb already names
exactly where a click just landed, in the reader's own language — reusing it
means no new string, no new UI element, and a screen-reader user is told
their new location by the very act of receiving focus there.

**Deliberately NOT touched**: `jumpToSource()` and `focusPendingOccurrence()`
(PR #141's own mechanism) are untouched; Topics-tab and Search-tab navigation
are untouched (out of this round's named scope, "Books/chapters reader"); no
CSS change (the existing native focus outline renders correctly on both a
`<span>`/`<button>` crumb and the `<h2>`, confirmed visually — no rule in
`app/css/hadith.css` suppresses `outline` on either).

**`app/css/hadith.css`**: unchanged.

## 6. Focused tests, mutation-proven

Extended the existing, already-committed
`tools/i18n-verify/hadith-source-navigation-browser.mjs` (PR #143's own
file, Hadith-owned, not a protected path) with six new checks covering: an
edition pick, a book pick, a chapter pick, and a one-level-back crumb click
all landing focus off `<body>`; the top-level "Collections" reset landing on
the `<h2>`; and the no-chapter-level edition (Beta) path landing correctly
too, on its shorter book → occurrence route.

**33 passed, 0 failed in English; 33 passed, 0 failed in Bangla** (27
pre-existing + 6 new, both languages).

**Mutation-proven**: reverted `app/js/hadith-browser.js` to PR #143's
original (`git stash` isolating only that file) and re-ran the English pass
— **exactly the 6 new checks fail** (27 passed, 6 failed), every other
pre-existing check in the file stays green, confirming the new checks
isolate this fix specifically and nothing else. The fix was then restored
and both languages re-confirmed clean (§8).

## 7. Boundaries preserved

- No new id, collection, Rules/index change, permanent unit key, or write.
- No new English literal (§3) — the fix calls no `t()`.
- `app/css/hadith.css` untouched.
- Fully reversible: two files, `app/js/hadith-browser.js` (+44/−5) and
  `tools/i18n-verify/hadith-source-navigation-browser.mjs` (+48).
- Independent of PR #130/#141/#143's own diffs — none of the three touches
  focus management; this round does not touch breadcrumb text or the
  "View in source" jump.

## 8. Final state, all suites re-run

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |
| `hadith-corpus` | 60 passed, 0 failed |
| `hadith-commentary-binding` | 14 passed, 0 failed |
| `hadith-source-rights` | 14 passed, 0 failed |
| `hadith-governing-contracts` | 14 passed, 0 failed |
| `hadith-gate-contracts` | 11 passed, 0 failed |
| `hadith-source-navigation-browser` (en) | 33 passed, 0 failed |
| `hadith-source-navigation-browser` (bn) | 33 passed, 0 failed |

## Ownership boundary

Every changed path is Hadith-owned application/tooling, confirmed empty
against `origin/main` for each protected/shared path in the bridge's own
table (`app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`,
`app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`,
`app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`,
`app/css/shell.css`, the six protected tooling files, `docs/governance/`,
`firestore.rules`, `firebase.json`, `tests/firestore/`,
`tools/firestore-emulator/`, `.github/workflows/`).

## Dependency / integration order

1. Draft PR #130, PR #141 (unchanged; still open).
2. Draft PR #143 (unchanged by this round; this round's branch is built
   directly on its head).
3. This round's PR — a follow-on to #143, touching only
   `app/js/hadith-browser.js` (the focus fix) and
   `tools/i18n-verify/hadith-source-navigation-browser.mjs` (the new tests).
   No further rebase needed at integration time — already built on current
   `main` via #143's own head.

## Central version gate

**No version bump.** `app/js/version.js` untouched. `v08.32` remains the
current `main` milestone; version allocation is the Master Architect's.

## Owner app test required

**NO.** Exists only on this branch, stacked on unmerged PR #143. When both
land: `https://madrasatul-muslimeen.github.io/app/hadith-collections.html`
→ Collections tab → pick any edition, then a book, then (if the edition has
one) a chapter, using Tab + Enter only, never the mouse. Expected: after
each step, the next Tab press continues from the breadcrumb's current
location — never from the top of the page.

## Deliberately not done

- `bn.js` not extended (eight-key handoff given in §3, matching PR #143's
  own list exactly).
- No merge, deploy, Rules/index change, or version bump.
- `programme-ledger-mutations.mjs`'s exact "48/1" partial-fetch recipe was
  not chased down to its precise cause (§1) — the guard itself was not
  edited, and a complete preflight is confirmed stable at 49/0 three ways.
- Topics-tab and Search-tab focus management not touched (out of this
  round's named scope).
- PRs #103, #116, #118, #122, #125, #130, #141 left open and untouched.
