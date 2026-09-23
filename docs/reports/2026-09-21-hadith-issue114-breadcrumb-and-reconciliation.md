# Hadith issue #114 — baseline reconciliation and a Books-reader breadcrumb fix (2026-09-21)

Session date/time: 2026-09-21, read off the sandbox clock in UTC (`date -u`),
2026-09-21 11:23 UTC, per this round's own instruction not to use PC local
time.

## 0. Scope of this round

Triggering comment: issue #114, comment `5759520213` (`/mmsa-task HADITH
CONTINUATION`). It asked, in order: review PR #141 (head `0fac99f`, stacked
on PR #130's head `d926e80`) against current `main`; reconcile the three
governance failures PR #141 itself reported (inherited from #130's stale
pre-v08.32 baseline) with a safe rebase or a clean integration-candidate
branch touching Hadith-owned paths only; run all twelve suites with full
history and both ledger-declared HELD remote refs; obtain rendered
English/Bangla browser evidence for the Topics/Search → source bridge, the
repeat badge, the one-shot focus and a #130 regression check; commit a
reproducible focused browser test rather than an ephemeral one; check the
eight distinct Bangla `t()` keys across the combined stack as an exact
handoff; and, if that evidence is sound, proceed to one bounded independent
Hadith-owned Books reader improvement **found by reproduction first**.

## 1. Preflight

- `git fetch origin '+refs/heads/*:refs/remotes/origin/*' --prune` brought in
  all **100** remote branches (no `--depth`, so this is full history).
- Both ledger-declared HELD/standing-instruction commits resolve locally as
  real commits: `claude/phase4-wiring` at `7e2931f795af1cd97efc1167660cea93aa22b9ab`
  (`quran-phase4-wiring`'s `branchTip` in the Programme Integration Ledger),
  and the Hadith stream's own recorded `branchTip`,
  `43dd96f58eeee5ad33dc82bb4e260660e3c290c9`.
- `main` is at `16cfb0b` (v08.32, the QuranRevival Word Card lemma-occurrence
  release plus Health Atlas tranche 5, per `app/js/version.js` and
  `CLAUDE.md`'s own current-milestone line).
- PR #130's head (`d926e80cb0660cdb68f8935374f719817ba15772`, branch
  `claude/laughing-goodall-timq4k`) and PR #141's head
  (`0fac99fffed88262935cad8a4628300dcf4df7b8`, branch
  `claude/laughing-goodall-v1u18w`, based on #130's own branch) were both
  fetched and confirmed by reading each PR directly via the GitHub API
  (`pull_request_read`), not assumed from the triggering comment's own text.
- `git diff f5b7b53180d4f98c6f5f60550c572896854e6ee8..origin/main` (PR #130's
  own base commit → current `main`) touches **44 files**, all of them
  `app/health/*`, `docs/governance/programme-integration-ledger.json`,
  `CLAUDE.md`, `CHANGELOG.md`, `tools/health-atlas-verify/*`,
  `app/note-editor-prototype-demo.html` and `tools/md2report.py` — **zero**
  overlap with any Hadith-owned path. So a merge of the combined PR #130 +
  #141 diff onto current `main` carries no conflict risk, confirmed rather
  than assumed.

## 2. Part 1 — reconciling the three governance failures

**What the failures were.** PR #141's own report recorded `programme-ledger`
(7 passed / 1 failed), `programme-ledger-mutations` and `brief-integrity`
(7 passed / 1 failed) failing on its branch, because `CLAUDE.md` and the
Programme Integration Ledger **as they exist on #130's branch** still record
`main` at v08.31, while real `main` had already moved to v08.32 (an
unrelated Quran-side release, Word Card lemma-occurrence navigation). Neither
file is touched by the Hadith diff — confirmed again this round, see §1 —
so this was never a defect in the Hadith work itself.

**What was done.** Rather than a literal `git rebase` (which would rewrite
commit identity on branches this session does not own), this session's own
designated branch (`claude/laughing-goodall-4dhs97`, reset to current `main`,
`16cfb0b`) received a single merge commit
(`git merge --no-ff origin/claude/laughing-goodall-v1u18w`) — PR #141's head,
which already carries PR #130's own commits since #141 is stacked on it.
This is the "clean integration-candidate branch that touches Hadith-owned
paths only" the triggering comment asked for as the alternative to a rebase.

**Verified before committing**, not assumed: `git diff --cached --stat
origin/main` after the merge showed exactly 21 changed files, all under
`app/css/hadith.css`, `app/js/hadith-*.js`, `docs/reports/*hadith*`, and
`tools/i18n-verify/hadith-corpus.mjs` — no protected or shared path in the
list (checked file-by-file against the ownership table in §7).

**Result: the reconciliation held.** `brief-integrity` went from 7/1 to
**8 passed, 0 failed**; `programme-ledger` from 7/1 to **8 passed, 23 noted,
0 failed**. Both now read `main`'s real, current version directly, because
`CLAUDE.md` and the ledger are simply `main`'s own copies again — nothing
in the merge touched them.

## 3. Part 2 — twelve suites, full account

Run from the repository root, on the merge commit plus this round's own
work (§5), full-history preflight as in §1.

| Governance suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 48 passed, 1 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

**The one remaining failure is pre-existing and unrelated, confirmed by
direct reproduction rather than trusted from an earlier report.**
`programme-ledger-mutations.mjs` was run a second time inside a throwaway
`git worktree` checked out from a clean, unmodified `origin/main` (no Hadith
diff at all): it reports the identical **48 passed, 1 failed**. This is
shared, protected tooling (`tools/i18n-verify/programme-ledger-mutations.mjs`
is on the platform-shared-tooling list) and not a path this routine may
edit; recorded, not fixed, exactly as the three prior Hadith rounds on this
issue also found and recorded it.

| Hadith suite | Result |
|---|---|
| `hadith-corpus` | 60 passed, 0 failed (56 inherited from #130/#141 + 4 new, §5) |
| `hadith-commentary-binding` | 14 passed, 0 failed |
| `hadith-source-rights` | 14 passed, 0 failed |
| `hadith-governing-contracts` | 14 passed, 0 failed |
| `hadith-gate-contracts` | 11 passed, 0 failed |

## 4. Part 3 — rendered English/Bangla browser evidence, committed not ephemeral

**New file:** `tools/i18n-verify/hadith-source-navigation-browser.mjs`
(185 lines), following this directory's existing Playwright-harness pattern
(`import { chromium, newContext, openPage } from "./harness.mjs"`, the same
shape `probe.mjs`/`reading.mjs`/`panel.mjs` already use). It is committed to
the repository, not run-and-discarded, and exits 1 on any failed check (the
"meaningful exit code" standing lesson) — run it with:

```
node tools/i18n-verify/hadith-source-navigation-browser.mjs en
node tools/i18n-verify/hadith-source-navigation-browser.mjs bn
```

It requires Playwright and a local static server (`node serve.js` at the
repository root, port 8080) — both already documented tooling in this
repository, neither a new dependency.

**What it checks, against the real rendered DOM of `app/hadith-collections.html`:**
the book/chapter breadcrumb shows a translated title, not a raw id (§5); the
Collections tab never shows a self-referential "View in source" control; the
repeat badge names and jumps to the *original* occurrence, with a one-shot
focus highlight that does not survive an unrelated re-render; the Topics tab
opens on a list (not one hardcoded topic), its own back-crumb returns to
that list, and a second topic opens correctly; a Search hit also carries
"View in source" and jumps correctly; both of #130's own Explore coverage
sections (`translationCoverage`/`topicCoverage`) still render, the old
shared `hadithCoverageEdition` attribute is gone, and each coverage section
uses its own renamed attribute (the naming-collision fix from the #122/#125
integration still holds); and the un-keyed English literals render verbatim
in *either* language rather than going blank or inventing a translation.

**Results — obtained, not recipe-given:**

| Language | Result |
|---|---|
| English | 27 passed, 0 failed |
| Bangla | 27 passed, 0 failed |

**Mutation-proven, not merely run once.** Two of this suite's assertions
were deliberately broken and confirmed to fail before being trusted:
(1) commenting out `jumpToSource()`'s `state.focusOccurrenceId = occurrenceId;`
assignment dropped the suite to 22 passed / 3 failed (the three "jump lands
on..." checks, correctly); (2) reverting the breadcrumb fix in §5 to its
original form dropped `hadith-corpus.mjs`'s new static check to 59/1 (below).
Both mutations were reverted and the suites re-confirmed clean before this
report was written.

## 5. Part 4 — eight distinct Bangla `t()` keys, exact handoff

The combined PR #130 + #141 stack introduces exactly eight new English
literals with no `bn.js` entry (protected path, still untouched — confirmed
`git diff origin/main -- app/js/i18n/bn.js` is empty, and each string below
still occurs **zero** times in `bn.js`). Verbatim, in `t()`-call order:

1. `"View in source"`
2. `"Translation coverage"`
3. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
4. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
5. `"{en} of {n} have English, {bn} of {n} have Bangla."`
6. `"Topic coverage"`
7. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
8. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

This round's own fix (§6) introduces **zero new English literals** — it
corrects which existing, already-`t()`-wrapped title is shown in the
breadcrumb, not a new string.

## 6. Part 5 — Gate A/B: one bounded independent Books reader improvement

**Found by reproduction, not by reading source first.** A focused Playwright
script (not the committed suite — an ad-hoc walk, in the style of
`probe.mjs`) drove the actual Collections tab through both editions: Alpha
(has a chapter level) and Beta (does not). Beta's own book list, and its
single book's occurrence list, rendered correctly throughout. **Alpha's
breadcrumb did not.** At the chapter-list level — inside a book, before a
chapter is chosen — the breadcrumb printed the raw internal id
`synthetic-alpha-b1` instead of "Book of the Beginning". The same defect
reproduces for `synthetic-alpha-b2` ("Book of Prayer"), in **both** English
and Bangla.

**Root cause, read from source once the symptom was reproduced.**
`breadcrumb()` derived a book's title indirectly:
`sourcePathOf(occurrencesIn(state.chapterId ?? state.bookId)[0]?.occurrenceId)`.
At the chapter-list level `state.chapterId` is `null`, so this calls
`occurrencesIn(state.bookId)` — and in this fixture, **no occurrence is ever
attached directly to a book that has a chapter level**: every occurrence
under Alpha's `b1`/`b2` sits under one of their *chapters*
(`b1-c1`/`b1-c2`/`b2-c1`), never under the book id itself. So
`occurrencesIn(state.bookId)` returns an empty array, `[0]?.occurrenceId` is
`undefined`, `sourcePathOf(undefined)` returns `null`, and the label
silently fell through to the `|| state.bookId` fallback. Beta was
unaffected only because it has **no chapter level at all** — there,
occurrences attach straight to the book, so the same expression was never
empty.

**Independence from PR #130/#141's own diff, checked before writing any
code.** Both PRs work exclusively in the Topics/Search/Explore views and the
new source-bridge control; neither touches `breadcrumb()` or the Collections
tab's own rendering path. `git log -p --all -- app/js/hadith-browser.js |
grep -n "function breadcrumb"` shows the function's body unchanged since it
was first written (Hadith H2's initial commit) — this is a pre-existing
defect this round found, not a regression either PR introduced.

**The fix.** `chapterById()` was already exported from `app/js/hadith-corpus.js`
for exactly this — a book/chapter's own record, no occurrence detour — but
had never been imported into `hadith-browser.js`. `breadcrumb()` now reads
`chapterById(state.bookId)` and `chapterById(state.chapterId)` directly:

```diff
-  const path = state.bookId ? sourcePathOf(occurrencesIn(state.chapterId ?? state.bookId)[0]?.occurrenceId) : null;
-  const book = path?.book;
-  if (state.bookId) add(langText(book?.title, uiLang) || state.bookId, ...);
-  if (state.chapterId) add(langText(path?.chapter?.title, uiLang) || state.chapterId, null);
+  if (state.bookId) add(langText(chapterById(state.bookId)?.title, uiLang) || state.bookId, ...);
+  if (state.chapterId) add(langText(chapterById(state.chapterId)?.title, uiLang) || state.chapterId, null);
```

(`chapterById` added to the existing import from `./hadith-corpus.js`;
`sourcePathOf`/`occurrencesIn` remain imported and used elsewhere in the
file, so nothing is left dead by this change.)

**Verified fixed, live, in both languages** — re-running the reproduction
script after the fix shows the breadcrumb reading "Book of the Beginning" /
"Book of Prayer" in English and "নামাজের অধ্যায়" (Book of Prayer's own
Bangla title) in Bangla, at exactly the point it previously showed the raw
id.

**Data/security/rollback boundaries, declared before building.** File
budget: `app/js/hadith-browser.js` (the fix), `tools/i18n-verify/hadith-corpus.mjs`
(four new checks, below), this report. No new id, no new collection, no new
`t()` string, no Rules/index change, no permanent unit key, no write. Fully
reversible — a one-file, four-line revert.

**Four new mutation-proven checks**, `tools/i18n-verify/hadith-corpus.mjs`
(56 → 60 passing): `chapterById()` resolves both books' own titles directly;
both books genuinely hold zero occurrences attached to the book id itself
(the precondition the bug depended on — a positive control, so a future
fixture change that adds one would flag this section for re-review rather
than silently stop testing anything); `breadcrumb()`'s own source reads
`chapterById(state.bookId)`/`chapterById(state.chapterId)` and no longer
calls `occurrencesIn(...)` at all; and the no-chapter-level edition
(`synthetic-beta`) is confirmed unaffected either way. Reverting the fix
drops this section to 3/4 passing (§4) — the static check catches it by
name.

**Preserves every named boundary.** Books-intact vs Topics-across-books: the
fix only changes how the Books tab labels *its own* breadcrumb; it adds no
cross-reference to Topics. Synthetic-only corpus: no id, real or synthetic,
was added or renamed. Source-rights: no text, translation or attribution
field was touched.

## 7. Ownership boundary — every path this round changed

| Path | Family | Touched? |
|---|---|---|
| `app/js/hadith-browser.js` | Hadith-owned | Yes (§2 merge, §6 fix) |
| `tools/i18n-verify/hadith-corpus.mjs` | Hadith-owned test | Yes (§2 merge, §6 new checks) |
| `tools/i18n-verify/hadith-source-navigation-browser.mjs` | New, Hadith-owned test | Yes, new file |
| `app/css/hadith.css`, `app/js/hadith-corpus.js`, `app/js/hadith-fixture-data.js` | Hadith-owned | Yes, via the §2 merge only (PR #130/#141's own content, unmodified by this round) |
| `docs/reports/*hadith*` | Reports | Yes, via the §2 merge (PR #130/#141's own reports) plus this report |
| `app/js/version.js` | Version | **No** |
| `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css` | Platform-shared | **No** |
| `tools/i18n-verify/behaviour.mjs`, `harness.mjs`, `firebase-stub.mjs`, `brief-integrity.mjs`, `programme-ledger.mjs`, `programme-ledger-mutations.mjs` | Platform-shared tooling | **No** |
| `docs/governance/` | Governance | **No** |
| `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/` | Deployment/security | **No** |
| `.github/workflows/` | Gate | **No** |

Confirmed with `git diff --stat origin/main -- <each shared path>` returning
empty for every row marked "No", not assumed from the file list above.

## 8. Dependency / integration order

1. Draft PR #130 and PR #141 (unchanged by this round; still open).
2. This round's branch, `claude/laughing-goodall-4dhs97`, carries their
   combined content plus the reconciliation merge (§2) and the breadcrumb
   fix (§6) — pushed as this round's own draft PR/update, per the bridge
   instructions never to touch another session's branch.
3. MMSA `bn.js` coordination for the eight-key set (§5) — unchanged from
   what PR #130/#141 already declared; this round adds no new key.
4. When MMSA integrates: this branch is already built directly on current
   `main` (v08.32), so no further rebase is needed at that point — the
   entire reason for doing the reconciliation as a merge onto current `main`
   rather than leaving it stacked on #130's stale base.

## 9. Central version gate

**No version bump.** `app/js/version.js` is untouched; `git diff origin/main
-- app/js/version.js` is empty. Version allocation is the Master Architect's,
not this routine's, per the bridge's own standing instruction. `v08.32`
remains the current `main` milestone; nothing in this round claims a new one.

## 10. CI status

No `.github/workflows/` change was made or is needed by this round (touching
that path is itself off-limits to this routine). This round's own evidence
is the twelve suites in §3 plus the browser evidence in §4, run locally in
this sandbox exactly as they would run in CI.

## 11. Owner app test required

**NO.** This candidate exists only on this session's own branch — not on
`main`, not served by GitHub Pages. When it lands (after the MMSA
coordination in §8):

- **URL:** `https://madrasatul-muslimeen.github.io/app/hadith-study.html`
  (already linked from the nav, per PR #130's own finding) or
  `https://madrasatul-muslimeen.github.io/app/hadith-collections.html`
  (standalone).
- **Sign-in / role:** any signed-in account; the Hadith browser applies no
  role restriction of its own.
- **Steps:** open the Hadith page → Collections tab → pick "Sample
  Collection Alpha" → pick either book ("Book of the Beginning" or "Book of
  Prayer") → **before** picking a chapter, read the breadcrumb.
- **Expected result:** the breadcrumb reads "Collections › Book of the
  Beginning" (or "Book of Prayer"), never "Collections ›
  synthetic-alpha-b1"/"synthetic-alpha-b2". The same in Bangla, reading the
  book's own Bangla title.
- **Evidence to return:** a screenshot of the breadcrumb at that exact step,
  in both languages.

## 12. Deliberately not done

- `app/js/i18n/bn.js` not extended — eight-key verbatim handoff (§5) given
  instead, matching what PR #130/#141 already declared.
- No merge, deploy, Rules/index change, or version bump.
- `programme-ledger-mutations.mjs`'s pre-existing drift (§3) not fixed —
  protected shared tooling, reproduced on a clean `origin/main` worktree and
  recorded only, exactly as three prior rounds on this issue also found.
- The dead `occurrenceById` import in `app/js/hadith-browser.js` (imported,
  never called) was noticed while reading the file for §6 but left alone —
  out of this round's own bounded scope, and not the defect this round set
  out to fix.
- PRs #103, #116, #118, #122, #125, #130, #141 left open and untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01FrUBUQqDozzR1XHT57pwzy
