# Hadith: integrating PR 103 / 116 / 118 into one combined candidate (issue 114)

## 1. Summary

Resolves the MMSA task bridge instruction on issue 114 (comment 5752677478):
audit PR 103, PR 116 and PR 118 as independent or stacked diffs, produce one
integration-ready sequence with exact conflict resolution for
`hadith-browser.js` and `hadith-corpus.js`, ensure both `translationCoverage()`
and `topicCoverage()` coexist in the eventual combined branch without
duplicating commits or losing tests, and build/test a combined candidate in a
new draft pull request if safe.

**Verdict: the three are two independent siblings plus one correction, and
they integrate safely with hand resolution at exactly two points.** PR 103
(`translationCoverage()`) and PR 118 (`topicCoverage()`) were built
independently from the same `main` commit (`2cb405e`, v08.31) and touch the
same two application files without knowing about each other. PR 116 is not a
third independent feature — it reproduces PR 103's own two commits
byte-for-byte on a different branch (this session's designated-branch
restriction meant PR 103's own branch could not be pushed to) and then
corrects PR 103's dated reports (three `t()` keys was wrong; the real count
is four). For integration purposes PR 116 supersedes PR 103's reports and
contributes no independent application code.

## 2. The audit

| PR | Base | App files touched | Independent of the others? |
|---|---|---|---|
| 103 | `main` `2cb405e` | `hadith-corpus.js` (+`translationCoverage()`), `hadith-browser.js`, `hadith-corpus.mjs` | Yes — built without knowledge of 118 |
| 116 | `main` `2cb405e` | Same three files, **byte-identical diff to PR 103** (reproduced, not re-derived) | No — same code as 103, plus report corrections only |
| 118 | `main` `2cb405e` | `hadith-corpus.js` (+`topicCoverage()`), `hadith-browser.js`, `hadith-corpus.mjs` | Yes — built without knowledge of 103, deliberately not built on 103/116's branch stack |

Confirmed by diffing each branch against `main` directly
(`git diff --stat main origin/<branch>`) rather than trusting the PR
descriptions: PR 116's `hadith-browser.js`/`hadith-corpus.js`/
`hadith-corpus.mjs` diff stats against `main` are line-for-line identical to
PR 103's own (21/33/80), confirming the reproduction claim in PR 116's own
body rather than assuming it.

## 3. Integration sequence used

1. Start from `main` (`2cb405e`, v08.31).
2. Merge PR 118 (`topicCoverage()`) — clean, no conflicts against `main`.
3. Merge PR 103 (`translationCoverage()`) — two real conflicts, resolved by
   hand (§4).
4. Merge PR 116 (report corrections) — four more conflicts, all
   keep-the-already-merged-side because PR 116's own code is a subset of
   what step 3 already carries; the four `docs/reports/` add/add conflicts
   are resolved by taking PR 116's corrected version over PR 103's original
   (§5).

This order was chosen, not arbitrary: topicCoverage() first because its
insertion point in `hadith-corpus.js` (before `exploreAggregate()`) is
independent of where `translationCoverage()` lands (after it), so starting
there lets `git merge` prove the corpus-side placement needs no human
judgement before any human judgement is spent on the browser side.

## 4. Exact conflict resolution

### 4.1 `app/js/hadith-corpus.js` — no real conflict

`topicCoverage()` (PR 118) is inserted immediately before
`export function exploreAggregate()`; `translationCoverage()` (PR 103) is
appended after it, at end of file. Different insertion points, so
`git merge` resolved this file with **zero** conflict markers on every merge
step. Verified by `node --check` and by the governance suites' own function
count (`hadith-corpus.mjs`'s own `POSITIVE CONTROL` and the `EXPLORE`/
`COVERAGE`/`TOPIC COVERAGE` checks all read the real merged file).

### 4.2 `app/js/hadith-browser.js` — two real conflicts

**Import line.** Both PRs added a new named import to the same
`import { ... } from "./hadith-corpus.js"` statement, at the same position.
Resolved by including both: `translationCoverage, topicCoverage,`.

**`renderExplore()`'s own tail.** Both PRs append their new section's
rendering at the exact same point — immediately after the per-topic cards
loop, before `renderExplore()`'s closing brace. PR 103 wrote its rendering
inline; PR 118 extracted a `renderTopicCoverage(body)` function. Resolved by:

- Extracting PR 103's inline code into its own `renderTranslationCoverage(body)`
  function, matching PR 118's shape (two independently-built features should
  not look structurally different for no reason once combined).
- Calling both from `renderExplore()`: `renderTranslationCoverage(body);` then
  `renderTopicCoverage(body);` — Translation coverage first, because PR 103
  was opened first; this is a documented, arbitrary tie-break, not a
  significance judgement about either feature.

**A third thing was found here, not a git conflict but a real naming
collision `git merge` cannot see:** both PRs independently gave their
per-edition rows the identical dataset attribute, `dataset.hadithCoverageEdition
= ed.editionId`. Once both features render on the same page, a selector like
`[data-hadith-coverage-edition="synthetic-alpha-ar-v1"]` matches **two**
differently-shaped elements for the same edition — the translation-coverage
`<div class="hadith-card">` row and the topic-coverage
`<p class="hadith-topic-coverage-edition">` row. PR 103's own
browser-verification report (`docs/reports/2026-09-20-hadith-translation-coverage-browser-verification.md`,
section 3) already relies on `[data-hadith-coverage-edition]` as a
Playwright selector; that selector would become ambiguous the moment both
land. **Renamed at merge**: `hadithTranslationCoverageEdition` and
`hadithTopicCoverageEdition`. Two new checks in `hadith-corpus.mjs`
(`INTEGRATION -- ...`) assert the split by reading the rendered source, and
the focused Playwright run in section 7 below proves it by querying the
live DOM.

### 4.3 `tools/i18n-verify/hadith-corpus.mjs` — one import-line conflict, one placement (not logical) conflict

Same import-line conflict as `hadith-browser.js`, resolved the same way.

Both PRs append their own `check(...)` blocks after the shared
`"EXPLORE -- the aggregate reaches no progress store of any kind"` check
(which PR 103 also improved in place — see 4.4). No logical conflict: the
two blocks were concatenated, Translation coverage checks first to match the
render order chosen in 4.2, Topic coverage checks second. Two further
`INTEGRATION` checks were added guarding the 4.2 rename (§6).

### 4.4 A real correctness fix carried forward, not re-litigated

PR 103 bounded `exportedFunctionBody()`'s slice at the next top-level
`export function`, replacing an earlier end-of-file slice that broke the
moment a second export landed after `exploreAggregate()` (exactly what
happened once PR 118's `topicCoverage()` also exists). This fix is kept
as-is in the merge; PR 118's own analogous check for `topicCoverage()`
(bounded by the next `export`, not reusing the shared helper) is also kept
as-is rather than refactored to share the helper — out of scope for an
integration pass, no behavioural difference, flagged here rather than
silently changed.

## 5. `docs/reports/` — PR 116's corrected reports used, not PR 103's originals

PR 103's own two dated reports said the Explore section needs **three**
`t()` keys; PR 116 found and corrected this in place to **four** (the
per-edition line's literal lacks the overall line's `"Overall: "` prefix, so
`t()`'s exact-literal lookup needs a separate catalogue entry for each). The
four add/add conflicts on these report files were resolved by taking PR
116's corrected version (`git checkout --theirs`) rather than PR 103's
original, so the combined candidate never reintroduces a defect one of its
own inputs already fixed. PR 116's own new report
(`2026-09-20-hadith-issue114-verification-and-correction.md`/`.html`) is
included unmodified.

## 6. Bangla key handoff — verbatim, for MMSA shared ownership

`bn.js` remains untouched (protected path). Seven new English literals fall
back to English on a Bangla page until MMSA extends the catalogue — four
from `translationCoverage()`'s render, three from `topicCoverage()`'s:

**Translation coverage (4):**
1. `"Translation coverage"`
2. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
3. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
4. `"{en} of {n} have English, {bn} of {n} have Bangla."` (distinct literal from #3 — no shared `"Overall: "` prefix)

**Topic coverage (3):**
1. `"Topic coverage"`
2. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
3. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

Confirmed against the merged file by grep (§7 below shows the exact source
lines) and confirmed against the rendered page by the Playwright run in
section 8 — both English screenshots show all seven rendering correctly in
English, both Bangla screenshots show the surrounding page fully translated
with exactly these seven left in English, matching the fallback design.

## 7. Full-history preflight and governance suites

`git remote set-branches origin '*' && git fetch --depth=2147483647 origin`
run first. **This preflight step itself surfaced a false-failure trap worth
recording**: the first run of this preflight fetched only the four branches
this task named explicitly, which left `origin/claude/phase4-wiring`
unresolvable and produced `brief-integrity` (6 passed, 2 failed) and
`programme-ledger-mutations` (42 passed, 7 failed) — both misleading, both
gone (8/0 and 49/0) the moment the fetch covered every branch. Confirmed the
same two-suite false failure reproduces identically on plain `origin/main`
under the narrow fetch and clears the same way, so it was a preflight
artifact, not anything this integration touched.

All seven suites, run from the repository root on the final combined
candidate, after the full fetch:

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

All seven match PR 103's, PR 116's and PR 118's own reported tables exactly.

Hadith suites:

| Suite | Result |
|---|---|
| `hadith-corpus.mjs` | 46 passed, 0 failed (33 baseline + 6 topic-coverage (118) + 5 translation-coverage (103) + 2 new `INTEGRATION` checks) |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |

## 8. Browser English/Bangla evidence — obtained, not just recipe-given

Unlike PR 103/116/118, **Playwright was available in this sandbox**:
`playwright@1.63.0` is installed globally (`/opt/node22/lib/node_modules`)
and Chromium is pre-installed at `/opt/pw-browsers/chromium`
(`PLAYWRIGHT_BROWSERS_PATH`). A local `node_modules/playwright` symlink to
the global install was created to satisfy `harness.mjs`'s bare-specifier
`import` (the ESM resolver does not honour `NODE_PATH`, only `require()`
does) — not committed, `.gitignore`-covered, confirmed clean before and
after. `node serve.js` served the repository at `http://localhost:8080`.

A focused, un-checked-in Playwright script (this project's own convention),
using `harness.mjs`'s own `newContext`/`openPage`, opened
`/app/hadith-collections.html` at 390x844 in English and Bangla, clicked
`[data-hadith-tab="explore"]`, and asserted on the **rendered DOM**:

**22 of 22 checks passed, both languages** — page boots with zero page
errors; both new `<h3>` headings render; both overall lines carry real
fixture numbers (`Overall: 8 of 8 have English, 7 of 8 have Bangla.` /
`5 are reachable through at least one topic mapping and 3 are not mapped`);
both features' per-edition rows resolve to exactly 2 elements each on their
own new attribute; **the old shared attribute now resolves to 0 elements**,
proving the collision from section 4.2 is really fixed in the live DOM, not
just in source; and the `synthetic-beta-ar-v1` row's numbers match both
functions' own documented fixture gap in both languages.

Full-page screenshots (390x844) were captured for both languages and
inspected directly in this session (per this project's own standing lesson
that a screenshot must be looked at, not just measured), rather than checked
into the repository. **Correction**: this report's own body originally said
these were "attached as evidence" to the pull request; the tools available
to this session have no mechanism to upload a binary image to a GitHub pull
request or comment, so they were not attached anywhere and exist only inside
this session's own working environment, which does not persist. What
follows is that direct visual inspection, described rather than shown; the
Playwright assertions above are reproducible evidence, the description below
is not. Read side by side: the rest of
each Bangla page is genuinely translated (headings, tab labels, the language
picker itself), and the two new sections are the only English text on an
otherwise-Bangla page — the exact, precise shape of the seven-key gap
declared in section 6, now shown on a real rendered page rather than
inferred.

## 9. `tools/md2report.py` — reproduced independently, not fixed

Independently reproduced the hang both PR 116 and PR 118 already found and
root-caused (the heading regex `^(#{1,6})\s+(.*)` requires whitespace after
`#`, so a line beginning with `#` immediately followed by a digit matches no
parser branch and the paragraph loop cannot advance past it). This report
was written with that constraint in mind throughout — no line anywhere
above begins with `#` followed directly by a digit. Not fixed here: the tool
is shared across every module's reports, not Hadith-owned, and two prior
reports already carry the same minimal-fix suggestion for its owner.

## 10. What was deliberately not done

- **`bn.js` was not extended** — seven-key handoff given in section 6
  instead; still on the protected-path list.
- **`tools/md2report.py`'s hang was not fixed** — reproduced a third time,
  not applied; shared tooling, not Hadith-owned.
- **No permanent Hadith unit key, no Approach id, no real corpus text, no
  durable write, no Rules/index change, no migration, no deployment, no
  version bump.** `v08.32` remains unallocated.
- **No shared/protected path touched** in the application tree — only
  `app/js/hadith-browser.js`, `app/js/hadith-corpus.js`,
  `tools/i18n-verify/hadith-corpus.mjs`, and dated `docs/reports/` files.
- **The four separate PR branches (103, 116, 118) were left open, untouched,
  and unmerged** — this integration lives on its own new branch and pull
  request; none of the three source PRs was closed, edited or force-pushed.
- **No merge to `main`, no deploy, no claimed approval.**

## 11. Owner app test required

**NO.** This combined candidate exists only on its own draft pull request's
branch — not on `main`, not served by GitHub Pages. Nothing exists yet for
the Owner to open. Once an eventual merge and deployment happen, the
Hadith module's Explore tab will show both "Translation coverage" and
"Topic coverage" sections together, in that order, in both languages —
Bangla will show the seven strings listed in section 6 in English until
`bn.js` is extended, which is expected per the handoff, not a defect to
report.
