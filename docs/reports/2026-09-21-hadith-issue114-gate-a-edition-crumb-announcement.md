# Hadith: Gate A independent re-check — the edition crumb never announced the edition, and a related tab-order defect it caused

**Date:** 2026-09-21 (UTC)
**Trigger:** issue #114, comment `5761151633` (`/mmsa-task`, author id `293311955`)
**Branch:** `claude/laughing-goodall-k8z5yh`, built on PR #144's head (`466dc313`), itself stacked on PR #143's head (`34c3fcd5`)
**Base:** `main` at `16cfb0b3` (v08.32)

## 0. Scope of this comment

The verified task asked one narrow question about PR #144's own keyboard-focus
fix: `focusCollectionsLanding()` lands focus on the clickable "Collections"
crumb after an edition is picked — does that landing **announce the edition
just picked**, and does the **next real Tab key press** still land on the
expected book? If deficient, fix it with one focused, Hadith-owned change and
a regression test that fails before/passes after; if correct, find the next
independent slice by reproduction.

Both questions were answered by live reproduction, not by reading the code
first. One was genuinely deficient; the other was already correct.

## 1. Reproduction

A Playwright probe against PR #144's own head (`466dc313`, unmodified), driven
through the real DOM rather than the app's own read model:

| Question | Finding |
|---|---|
| Does the landing crumb announce the edition just picked? | **No.** `document.activeElement` after picking "Sample Collection Alpha" was a `<button class="hadith-crumb">` reading `"Collections"` — the exact same text the top-level heading already showed *before* any edition was picked. |
| Does the next real `Tab` key press land on the expected book? | **Yes**, already. `page.keyboard.press("Tab")` from that landing moved to `<button data-hadith-book="synthetic-alpha-b1">`, the first book row. |

**Root cause**: `breadcrumb()` (`app/js/hadith-browser.js`) never named the
edition at all. It builds exactly one crumb, `t("Collections")`, until
`state.bookId` is set — so at edition level the bar has a single child, and
`focusCollectionsLanding()`'s `.hadith-crumbs > :last-child` selector lands
on that same "Collections" crumb, whose text never changes with which edition
was picked. The edition list row a reader had just clicked showed the
collection's own translated name (`c.name`) as its primary label
(`renderCollections()`'s `hadith-row-name` span) — that identity was simply
never carried forward into the breadcrumb.

**A second, related defect this also causes**: `focusCollectionsLanding()`
sets `tabindex="-1"` on whatever it lands on, unless one is already present:

```js
if (!landing.hasAttribute("tabindex")) landing.setAttribute("tabindex", "-1");
```

At edition level, the landing element is the "Collections" `<button>` itself
— an already-interactive, naturally tabbable control. Stamping `tabindex="-1"`
onto it strips it from the ordinary sequential Tab/Shift+Tab order for the
rest of that render: a keyboard user who tabs forward into the book list and
then presses Shift+Tab to go back up skips straight past the one control that
returns them to the edition list, because it no longer participates in
sequential navigation. Confirmed live: `document.querySelector(".hadith-crumb")
.getAttribute("tabindex")` reads `"-1"` immediately after picking an edition.

This is the same defect as the announcement gap, from the same cause: the
crumb bar has too few crumbs at edition level, so its `:last-child` is a
control that was never meant to double as a landing spot.

## 2. The fix

**`app/js/hadith-corpus.js`**: one new exported pure function,
`collectionOf(editionId)`, reading a collection directly off an edition's own
`collectionId` — the same fact `sourcePathOf()` already computes internally,
now exposed so a renderer can use it without going through an occurrence.

**`app/js/hadith-browser.js`**: `breadcrumb()` now adds a second crumb naming
the edition's own collection, via `collectionOf()` + `langText()`, between the
"Collections" crumb and the book crumb — clickable (back to the book list of
this edition) once a book is chosen, non-clickable current-location text
otherwise. No new English literal: the string is the same translated
`collection.name` the edition-picker row already showed.

This single change fixes both findings from §1 together: the edition is now
named on landing, and the "Collections" button is never the bar's last child
while sitting at edition level, so it never receives the `tabindex="-1"` that
was silently pulling it out of the keyboard tab order.

**Deliberately unchanged**: `focusCollectionsLanding()` itself, the five
click-handler call sites, `app/css/hadith.css`, and every other crumb level's
existing logic (book/chapter naming via `chapterById()`, from PR #143).

## 3. Regression tests, mutation-proven

Extended the existing, already-committed
`tools/i18n-verify/hadith-source-navigation-browser.mjs` (Hadith-owned, not a
protected path) with three new checks, placed directly after PR #144's own
"picking an edition does NOT drop keyboard focus to `<body>`" check:

1. Picking an edition lands focus on a crumb whose text is the edition's own
   translated collection name — read per-language (`"Sample Collection Alpha"`
   in English, `"নমুনা সংকলন আলফা"` in Bangla), asserted against `t()`'s own
   fixture data rather than hardcoded once for both languages.
2. A real `page.keyboard.press("Tab")` from that landing still reaches the
   first book row (`data-hadith-book="synthetic-alpha-b1"`) — the accessible
   Tab-order half of Gate A, confirmed still correct after the fix.
3. The "Collections" crumb is not left with `tabindex="-1"`.

One pre-existing check needed a small, unrelated-to-behaviour update: the
"stepping back one level (book crumb)" step picked
`page.$$(".hadith-crumbs .hadith-crumb")[1]` — a fixed index that meant "the
book crumb" only because the bar had exactly two clickable crumbs before this
round. With the new edition crumb, index `[1]` is now the *edition* crumb, so
that line was changed to `[...].at(-1)` (the immediate-parent crumb is always
the last clickable one, regardless of how many levels precede it) — the same
semantics, now robust to the added level.

**36 passed, 0 failed in English; 36 passed, 0 failed in Bangla**
(33 pre-existing + 3 new, both languages).

**Mutation-proven**: reverted `app/js/hadith-browser.js` and
`app/js/hadith-corpus.js` to PR #144's original (`git stash`, isolating only
the two application files) and re-ran the English pass — **exactly the 2
announcement/tab-order checks fail** (34 passed, 2 failed; the Tab-destination
check, already correct before this round, stays green as expected), every
other pre-existing check in the file stays green. The fix was then restored
and both languages re-confirmed clean.

## 4. Twelve suites + the browser suite, this branch

| Governance suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 48 passed, 1 failed |
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
| `hadith-source-navigation-browser` (en) | 36 passed, 0 failed |
| `hadith-source-navigation-browser` (bn) | 36 passed, 0 failed |

**The one `programme-ledger-mutations` failure is the same pre-existing,
unrelated shared-tooling drift three prior rounds on this thread have already
recorded** — `MUTATION [E] a stream's shared-file touch loses its declaration`,
reporting itself as "fixture drift: no stream both declares
`app/js/version.js` and still shows it changed on a branch." Confirmed to
reproduce identically (48 passed, 1 failed) on a clean, unmodified
`origin/main` (`16cfb0b`) via a throwaway `git worktree`, with
`origin/claude/phase4-wiring` (the ledger's only `activeBranch`) fetched.
**`programme-ledger-mutations.mjs` is protected shared tooling and was not
edited.**

## 5. Boundaries preserved

- No new id, collection, Rules/index change, permanent unit key, or write.
- No new English literal — the fix reuses the collection's own already-shown
  translated name; the new tests print it back, they do not invent one.
- `app/css/hadith.css` untouched.
- Fully reversible: three files —
  `app/js/hadith-browser.js` (+19/−1), `app/js/hadith-corpus.js` (+7),
  `tools/i18n-verify/hadith-source-navigation-browser.mjs` (+30/−1).
- Independent of PR #130/#141/#143/#144's own diffs: none of the four touches
  `breadcrumb()`'s edition-level crumb, and this round does not touch the
  book/chapter crumb text (#143) or the "View in source" jump (#141) or
  `focusCollectionsLanding()` itself (#144).

## Ownership boundary

Every changed path is Hadith-owned application code or a Hadith-owned test
suite. Confirmed empty against `origin/main`, and against PR #144's own head,
for each protected/shared path in the bridge's own table: `app/js/version.js`,
`CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
`app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
`app/js/catalogue-data.js`, `app/css/shell.css`, the six protected tooling
files (`behaviour.mjs`, `harness.mjs`, `firebase-stub.mjs`,
`brief-integrity.mjs`, `programme-ledger.mjs`,
`programme-ledger-mutations.mjs`), `docs/governance/`, `firestore.rules`,
`firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`,
`.github/workflows/`. `git diff --stat` against PR #144's head shows exactly
three files touched, none of them on this list.

## Dependency / integration order

1. Draft PR #130, PR #141 (unchanged; still open).
2. Draft PR #143 (unchanged by this round).
3. Draft PR #144 (unchanged by this round; this round's branch is built
   directly on its head).
4. This round's PR — a follow-on to #144, touching only
   `app/js/hadith-browser.js`, `app/js/hadith-corpus.js` (the fix), and
   `tools/i18n-verify/hadith-source-navigation-browser.mjs` (the new tests).
   No further rebase needed at integration time — already built on current
   `main` via #144's own stack.

## Central version gate

**No version bump.** `app/js/version.js` untouched. `v08.32` remains the
current `main` milestone; version allocation is the Master Architect's.

## Owner app test required

**NO.** Exists only on this branch, stacked on unmerged PR #143 and #144.
When all three land:
`https://madrasatul-muslimeen.github.io/app/hadith-collections.html` →
Collections tab → pick any edition using Tab + Enter only, never the mouse.
Expected: the crumb that receives focus reads the edition's own name (for
example "Sample Collection Alpha"), not just "Collections" again; the next
Tab press continues at the first book row.

## Deliberately not done

- No further Bangla `bn.js` extension — this fix introduces no new English
  literal, so there is nothing new to hand off.
- No merge, deploy, Rules/index change, or version bump.
- `programme-ledger-mutations.mjs`'s pre-existing drift not fixed (protected
  shared tooling, reproduced and reported only, per §4).
- Topics-tab and Search-tab breadcrumb/focus management not touched (out of
  this round's named scope, "Books/chapters reader").
- PRs #103, #116, #118, #122, #125, #130, #141 left open and untouched.
