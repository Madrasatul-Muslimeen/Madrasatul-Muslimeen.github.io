# Hadith — issue 114, comment 5752546289: topic coverage, a gate-free independent tranche

**Date:** 2026-09-20 (UTC). **Type:** New pure computation plus its own tests, Hadith-owned only. No `bn.js`, no version, no Rules/index, no permanent unit key, no real corpus text, no durable write, no shared/protected path, no merge, no deploy.

---

## 1. Task, source, and the branch this was built on

This round was picked up via the MMSA task bridge, issue 114, comment 5752546289, whose text after the trigger phrase asked, among other things, to inspect `main` and draft pull requests 103 and 116 and the Hadith execution gates, assess `topicCoverage()` as a read-only synthetic-corpus feature, declare an exact file/data/security/test/rollback budget, and implement the slice if it can be built entirely within Hadith-owned files with English literals and an explicit Bangla-fallback statement pending MMSA shared-key coordination — and explicitly not to duplicate the pull request 103 / pull request 116 branch stack.

That last instruction decided the build strategy. Pull request 116 corrected pull request 103's reports and reproduced pull request 103's two commits onto its own branch because its own designated push target could not reach pull request 103's branch. Doing the same thing a third time here — stacking a third branch on the same commits — is exactly the duplication this task told me not to do, and it would also make this tranche depend on pull request 103 being merged first, when the task asked for something independent. So this work is built directly on `main` (`2cb405e388bb069c11c6e62a9f53854c91995e0b`, v08.31), with neither pull request 103's nor pull request 116's commits reproduced onto this branch. `app/js/hadith-corpus.js` and `app/js/hadith-browser.js` on this branch therefore do **not** carry pull request 103's `translationCoverage()` / "Translation coverage" section — only this round's own `topicCoverage()` / "Topic coverage" section. The two features are siblings, not stacked, and can be merged in either order without conflict beyond an ordinary two-hunk diff in the same files.

This session's designated branch is `claude/laughing-goodall-6cb0w9`.

## 2. Gate A/B — what was inspected before writing anything

- `main` is `2cb405e388bb069c11c6e62a9f53854c91995e0b`, v08.31 — matches both pull request 103's and pull request 116's own recorded base; no drift.
- Pull request 103 (`Hadith: translation coverage in Explore, the next gate-free tranche`) is open, draft, `mergeable_state: clean`, 2 commits, touching only `app/js/hadith-corpus.js`, `app/js/hadith-browser.js`, `tools/i18n-verify/hadith-corpus.mjs`, and its own two dated report pairs. No shared/protected path.
- Pull request 116 (`Hadith: correct draft PR 103's translation-coverage reports`) is open, draft, `mergeable_state: clean`, 3 commits, touching only dated report files under `docs/reports/`. No application code, no shared/protected path.
- Neither draft touches `app/js/hadith-fixture-data.js` or any of the five Hadith test files this round also reads.
- The Hadith execution gates read from `tools/i18n-verify/hadith-corpus.mjs`, `hadith-gate-contracts.mjs`, `hadith-source-rights.mjs`, `hadith-governing-contracts.mjs` and `hadith-commentary-binding.mjs`, and from the module's own doc comments in `hadith-corpus.js` / `hadith-fixture-data.js` / `hadith-browser.js`: no `hadith:` permanent unit key may be built anywhere in Hadith code; no Hadith module may reach Firestore, `records.js`, `activity.js` or any write path; every fixture record and id stays inside the two-prefix synthetic namespace (`synthetic-` for the hierarchy and taxonomy, `syn-occ-`/`syn-map-` for the two row-level families); the Arabic source text itself must deny being a hadith; no fixture may carry a grade, a real narrator or a source URL; zero editions are rights-cleared, so Search/Explore describe fixtures only. `topicCoverage()` was designed to cross none of these — see the budget below and the boundary check in section 5.
- All seven required governance suites and all five Hadith suites were re-run against `main` before writing any new code, to confirm the baseline this tranche is measured against: they match pull request 103's and pull request 116's own reported clean numbers exactly (see section 6).

## 3. Assessing `topicCoverage()`, and the exact budget declared before building it

Pull request 116's own report identified `topicCoverage()` as "the topic-taxonomy counterpart of `translationCoverage()`, reporting corpus-wide mapped/unmapped occurrence counts" and deliberately did not build it. Reading `hadith-corpus.js`'s existing `topicIndex()` and `exploreAggregate()` first: both already report, **per topic**, how many distinct occurrences that one topic's mappings reach (`distinctOccurrences`) and how many mappings produced that (`mappingCount`). Neither answers a different, genuinely useful question: of every occurrence in the whole corpus, how many are reachable by **any** topic mapping at all, and how many are reached by **none** — corpus-wide and per edition. With exactly one topic in the fixture the two questions currently look similar; they are not the same question, and they diverge the moment a second topic exists, because an occurrence topic A already lists is "covered" corpus-wide regardless of what topic A's own count says about it. That is a real, independent, gate-free metric, not a restatement of what already exists — the assessment therefore was **it can be built entirely within Hadith-owned files**, and the budget below is what was declared before writing the first line.

**File budget** — three files, all Hadith-owned, none shared or protected: `app/js/hadith-corpus.js` (the new pure export), `app/js/hadith-browser.js` (wiring it into the existing Explore tab as an additive section), `tools/i18n-verify/hadith-corpus.mjs` (its own tests). Plus this report's own `.md`/`.html` pair under `docs/reports/`.

**Data budget** — zero. No new fixture row, no new topic, no new mapping, no new id of any kind. `topicCoverage()` reads only `TOPICS`, `TOPIC_MAPPINGS`, `EDITIONS`, `OCCURRENCES` and `TAXONOMY_REVISION`, all already exported by `hadith-fixture-data.js`, and resolves coverage by calling the module's own `topicIndex()` rather than re-deriving it — so a covered occurrence here can never disagree with what `topicIndex()` itself lists.

**Security budget** — zero. Pure computation over in-memory arrays; no Firestore import, no `records`/`activity`/`chunkKey`/`trackableId`/`approach_`/`claimStatus` reference, no `buildUnitKey`, no `hadith:` key literal. Verified by a boundary check (section 5) reading the function's own source, the same discipline `exploreAggregate()`'s own boundary check already uses.

**Test budget** — six new checks in `tools/i18n-verify/hadith-corpus.mjs`, all mutation-proven (section 5): 33 to 39 passing.

**Rollback budget** — trivial. `topicCoverage()` is a new export nothing else calls; `renderTopicCoverage()` is a new function called once, additively, at the end of the existing `renderExplore()`. Deleting the new export, the new render function and its one call site, and the six new checks, returns both files to their exact pre-round state. No migration, no data to unwind, because nothing durable was ever written.

**Bangla budget, declared rather than silently deferred** — three new English `t()` literals are introduced (enumerated exactly in section 4), and `bn.js` is on this bridge's protected-path list, so none of the three is added there. Until MMSA extends `bn.js` with these three entries, `t()`'s own designed fallback (`app/js/i18n.js:61`, "returns the English, which is readable" when a key has no catalogue entry) means a Bangla reader sees these three strings in English inside an otherwise-Bangla Explore tab — the same honest half-translated shape this codebase's own i18n design document says is expected and acceptable while a string is unhandled, never a broken key or a blank line.

## 4. What was built, its numbers, and the three-key handoff

`topicCoverage()` (`app/js/hadith-corpus.js`) computes, for every occurrence in the corpus: whether it is reachable by at least one topic mapping of any topic (`covered`), or by none (`uncovered`) — corpus-wide and broken down per edition — plus the taxonomy revision, so a count taken before a re-filing stays distinguishable from one taken after, matching the convention `topicIndex()` already uses.

Measured against the current fixture (8 occurrences, one topic, three mappings): corpus-wide, 5 occurrences are covered and 3 are uncovered. Per edition: the alpha edition (`synthetic-alpha-ar-v1`) carries 6 occurrences, 4 covered (occurrences 3, 4, 5 and 6, reached via the chapter mapping `syn-map-0001` and the book-level mapping `syn-map-0002` resolving through its own chapter) and 2 uncovered (occurrences 1 and 2). The beta edition (`synthetic-beta-ar-v1`) carries 2 occurrences, 1 covered (occurrence 7, via the single-occurrence mapping `syn-map-0003`) and 1 uncovered — occurrence 8, the same fixture row that has no Bangla translation, now also the fixture's only unmapped occurrence in its own edition, which is a coincidence of the fixture's own design rather than anything this feature relies on.

`renderTopicCoverage()` (`app/js/hadith-browser.js`) renders this additively at the end of the existing Explore tab, after the per-topic cards, changing nothing above it. It introduces exactly three new English `t()` literals — confirmed by grepping the diff for every `t(` call it adds, not by counting sentences, which is the exact mistake pull request 103's own reports made about a sibling feature:

1. `"Topic coverage"` — the section heading.
2. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."` — the corpus-wide explanatory paragraph, carrying the totals as `{total}`/`{covered}`/`{uncovered}`.
3. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."` — one line per edition, same three placeholder names, different literal text, so it is genuinely a fourth-and-fifth-shape-avoiding case rather than a reuse of literal 2 under a different name.

None of the three exists in `bn.js` today (checked by grep before writing this report) — all three fall back to English on a Bangla page until MMSA adds them. This is the precise handoff: three keys, listed verbatim above, nothing else needed to close the gap.

## 5. Tests and mutation proof

Six checks were added to `tools/i18n-verify/hadith-corpus.mjs`: that a covered occurrence is exactly one `topicIndex()` also lists (never re-derived independently); that covered and uncovered partition the whole corpus and every edition with no double-count or drop, and that the per-edition figures sum to the corpus totals; that the fixture's own known mapping shape (three mappings covering occurrences 3, 4, 5, 6 and 7) is measured exactly, so a future fixture edit that changes this is caught here rather than discovered later; that the taxonomy revision travels with the result; that an unreviewed mapping still makes its target count as covered today, stated rather than silently filtered, matching `allMappingsReviewed`'s own already-reported role; and a boundary check, in the same style as `exploreAggregate()`'s own, that `topicCoverage()`'s source reaches no progress store, no Approach id and no permanent unit key.

All six were mutation-proven before this report was written, following this project's own standing lesson that a check earns nothing until it is shown able to fail: (1) short-circuiting the topic loop to iterate over nothing — 4 of the 6 checks failed, as expected, since "covered" would silently become zero; (2) an off-by-one in the corpus-wide `uncovered` total — the partition-identity check failed, as expected; (3) re-deriving coverage directly from `TOPIC_MAPPINGS` instead of resolving through `topicIndex()` (which would silently stop counting chapter-level and book-level mappings, since single-occurrence mappings are the only kind the mutation reads) — the "exactly one `topicIndex()` also lists" check and the fixture-shape check both failed, as expected. All three mutations were reverted and the working tree was confirmed to match the real diff (56 insertions, nothing else) before continuing.

`tools/i18n-verify/hadith-corpus.mjs` now reports 39 passed, 0 failed (33 to 39). The other four Hadith suites are unaffected: `hadith-commentary-binding.mjs` 14/0, `hadith-source-rights.mjs` 14/0, `hadith-governing-contracts.mjs` 14/0, `hadith-gate-contracts.mjs` 11/0. Both edited application files pass `node --check`.

## 6. Governance suite results (run from the repository root, after full-history preflight)

`git remote set-branches origin '*' && git fetch --depth=2147483647 origin` was run first, per this project's own established convention — without it, `brief-integrity` and `programme-ledger` report false failures naming branches a shallow clone has not fetched.

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

All seven match pull request 103's and pull request 116's own reported tables exactly — no drift on `main` since either was cut.

## 7. `tools/md2report.py`'s hang — reproduced, not fixed, minimal fix identified for its owner

Pull request 116's report recorded that `tools/md2report.py` enters an unbounded loop on any line that starts with `#` immediately followed by a digit (for example a wrapped pull-request reference landing at the start of a line), and suggested a one-line fix without applying it, because the tool is shared across every module's reports and is not Hadith-owned.

That reproduction was independently confirmed in this sandbox rather than taken on trust: a two-line fixture (`# Heading`, blank line, `See PR`, `#103 for context.`) was fed to the tool under a five-second timeout, and the process was killed by the timeout with no output written — the same no-crash, no-exit hang pull request 116 described, now reproduced a second time. The tool itself was read and not edited.

The cause: the heading regex (`^(#{1,6})\s+(.*)`) requires whitespace after the `#` characters, so a line reading `#103 for context.` fails every branch that would advance the line pointer — it is not a table row, not a thematic break, not a numbered or bulleted list item, and the heading regex does not match it because there is content but no space is required before a digit follows directly. It then falls into the paragraph-collection loop, whose own guard (`not lines[i].startswith(("|", "#", "- ", "---"))`) rejects continuing precisely because the line already starts with `#` — so the paragraph loop appends nothing and never advances `i`, and the outer `while i < len(lines)` loop repeats forever on the same line. The minimal fix, for whoever owns this shared tool: tighten the heading match to also require that a bare `#`-prefixed line which is *not* a heading still advances `i` — for instance, changing the outer paragraph guard from `not lines[i].startswith(("|", "#", "- ", "---"))` to something that only rejects a line starting with `#` when it is followed by whitespace (mirroring the heading regex's own requirement), or, more directly, falling through to `i += 1` before re-looping whenever a line starts with `#` but the heading regex did not match it. This report does not modify `tools/md2report.py` — it is shared tooling, not Hadith-owned, and this bridge's own protected-path discipline applies to shared tools by the same reasoning it states for the files it names explicitly.

This report itself was written, and its `.html` twin generated, with that hang in mind: no line anywhere in this document starts with `#` immediately followed by a digit.

## 8. Owner app test required

**NO.** This change exists only on this draft pull request's own branch. It is not on `main`, GitHub Pages does not serve it, and the Hadith Explore tab it extends is demo-only over synthetic fixtures with no durable write path regardless. There is nothing on any live or reachable URL for the Owner to open yet. Once a maintainer decides to merge this alongside or after pull request 103, and once that lands on `main` and is confirmed served, the Owner (or any tester) can open the Hadith module's Explore tab and confirm the new "Topic coverage" section appears beneath the existing per-topic cards, showing five covered and three uncovered narrations corpus-wide with a per-edition breakdown, in both English and Bangla (Bangla will show these three lines in English until `bn.js` is extended, which is expected and stated above, not a defect to report).

## 9. Browser English/Bangla verification

**Not runnable in this sandbox** — no `node_modules` and no Playwright are installed here at all, the identical limitation pull request 103 and pull request 116 both recorded, and one this sandbox cannot resolve regardless of which module is being changed. The new render code is a direct structural extension of the existing, already-verified per-topic Explore cards immediately above it in the same function, using the same `el()` helper, the same `t()` calling convention, and the same dataset-attribute-for-testability pattern (`data-hadith-topic-coverage`, `data-hadith-coverage-edition`) the rest of this component already uses — minimizing risk in the absence of a runnable check, but full-page confirmation in both languages is outstanding wherever Playwright is available, exactly as pull request 103's own report stated for its sibling feature.

## 10. What was deliberately not done

- **No shared/protected path was touched.** `bn.js`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`, every governance and deployment path, and `tools/md2report.py` are all untouched.
- **`bn.js` was not extended** — the three keys are handed off above, exactly as declared, not guessed at or padded to round out a number.
- **`tools/md2report.py`'s hang was not fixed** — reproduced independently, root-caused, and a minimal fix suggested for its owner, per the task's own instruction to audit without changing the shared tool.
- **No version increment.** Version allocation is central; `v08.32` remains unallocated.
- **No merge, no deploy, no Firestore Rules/index change, no migration, no permanent Hadith unit key, no real corpus text.**
- **Pull request 103's and pull request 116's own branch stack was not duplicated or built upon** — this tranche is independent by construction, per the task's own instruction, and can be merged before, after, or independently of either.
