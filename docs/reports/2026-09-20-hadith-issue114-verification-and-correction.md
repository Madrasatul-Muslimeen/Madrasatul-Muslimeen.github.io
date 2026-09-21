# Hadith — MMSA task bridge issue #114: verification, report correction, next-tranche candidate

**Date:** 2026-09-20 · **Type:** Verification and documentation correction,
Hadith-owned. No application behaviour, `bn.js`, version, Rules or shared
path changed.

---

## 1. Task and branch constraint

This round was picked up via the MMSA task bridge, issue #114, comment
5752402500, whose text after the trigger phrase asked to: verify current
`main` and draft PR #103; enumerate exactly four distinct English `t()` keys
for Explore's new "Translation coverage" section; correct all dated
Markdown/HTML reports that got the count wrong; verify the browser
English/Bangla evidence and the full-history seven-suite results; then do
the next independent, bounded, read-only synthetic-corpus improvement if one
exists that does not overlap the draft, or give a precise candidate and stop.

**This session's designated branch is `claude/laughing-goodall-7snfrb`, and
push access is restricted to it** — PR #103's own branch
(`claude/laughing-goodall-gdrbdj`) could not be pushed to from here, so its
two commits (`168e416`, `bb29e76`) were reproduced byte-for-byte via `git
apply` onto this branch (previous commit) before the correction below was
made, so the reports being corrected actually exist on a branch this session
can push.

---

## 2. What was verified against `main` and PR #103

- `origin/main` is `2cb405e388bb069c11c6e62a9f53854c91995e0b`, `v08.31` —
  matches both of PR #103's own reports' recorded base.
- PR #103 is open, draft, `mergeable_state: clean`, 2 commits, touching
  exactly `app/js/hadith-corpus.js`, `app/js/hadith-browser.js`,
  `tools/i18n-verify/hadith-corpus.mjs`, and the two dated report pairs — no
  shared/protected path.
- A full checkout preflight was run (`git remote set-branches origin '*'` +
  `git fetch --depth=2147483647 origin`) before re-running the suites, per
  this project's own established convention — without it, `brief-integrity`
  and `programme-ledger` both report false failures naming branches this
  shallow clone had not fetched (`origin/claude/pensive-knuth-2pu3jj`, the
  held Phase 4 wiring branch). This is environmental, not a defect in either
  guard or in `main`.
- All seven governance suites, and all five Hadith suites, reproduce PR
  #103's and its browser-verification follow-up's own reported clean
  numbers exactly (§4).

## 3. The defect found and corrected: four `t()` keys, not three

`app/js/hadith-browser.js`'s new "Translation coverage" section (added by PR #103)
calls `t(key, vars)` — `app/js/i18n.js:61`, which looks a `bn.js`
catalogue entry up by the **exact literal string** passed as `key` — with
**four** distinct English literals:

1. `"Translation coverage"` (the `<h3>`)
2. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."` (the caveat paragraph)
3. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."` (the one overall line)
4. `"{en} of {n} have English, {bn} of {n} have Bangla."` (one per edition)

Both of PR #103's own dated reports said **three**, and both gave the same
wrong reason: that the per-edition line "reuses the same template" or "is
already covered by the same catalogue key" as the overall line, "since `t()`
keys on the English literal and this template's own placeholder text is
identical between the two call sites." That reasoning does not survive
reading the two call sites side by side — literal #3 carries an `"Overall:
"` prefix literal #4 does not, so `table[key]` resolves them to two
different (and, until `bn.js` is extended, two identically-falling-back)
entries. The feature report's §6/§7 and the browser-verification report's §5
have each been corrected in place, with a dated correction note at the site
of the error rather than a silent rewrite, per this project's own rule that
a corrected check (or, here, a corrected claim) is updated in place and
never quietly deleted. Neither report's **code or test results** were
wrong — `translationCoverage()`'s own numbers, and the 14/14 Playwright
run, are unaffected; only the count and reasoning about how many `bn.js`
entries close the gap were wrong.

No application file was touched to make this correction — only the four
report files (two `.md`, regenerated to their `.html` twins via the house
generator, `tools/md2report.py`, never hand-edited). `bn.js` itself remains
untouched and on this bridge's protected-path list; it still needs new
catalogue entries, now correctly counted at four.

## 4. Suite results (run from repository root, after the full-history preflight)

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

Hadith suites, unaffected: `hadith-corpus.mjs` 38/0,
`hadith-commentary-binding.mjs` 14/0, `hadith-source-rights.mjs` 14/0,
`hadith-governing-contracts.mjs` 14/0, `hadith-gate-contracts.mjs` 11/0.

All eleven match PR #103's and its browser-verification follow-up's own
tables exactly — no drift on `main` since PR #103 was cut.

## 5. Browser English/Bangla evidence

The 14/14 Playwright run already documented in
`docs/reports/2026-09-20-hadith-translation-coverage-browser-verification.md`
is unaffected by this correction: it asserted the **rendered** heading, the
**rendered** overall line and the **rendered** per-edition lines, in both
languages, all of which are unchanged by fixing a report's prose about how
many `bn.js` keys they need. No application code changed here, so that
render evidence was not re-run — it was re-read instead, against the
corrected §5, to confirm nothing else in it depended on the "three keys"
miscount. It did not.

## 6. Next independent tranche: a precise candidate, not built here

The task instruction asks for the next independent, bounded, read-only
synthetic-corpus improvement **only if its change budget does not overlap
PR #103**, and otherwise asks for a precise candidate rather than a build.

**Candidate: `topicCoverage()`, the topic-taxonomy counterpart of
`translationCoverage()`.** `exploreAggregate()` already reports, per topic,
how many distinct occurrences and mappings reach it
(`app/js/hadith-corpus.js:314`, the `topics` array) — but nowhere does
Explore report the **corpus-wide** complement: how many of the corpus's
occurrences are reached by **no** topic mapping at all. That is the same
"content completeness, not structure count" axis PR #103's own §1 named as
the reason `translationCoverage()` was worth building, applied to topic
indexing instead of language coverage. Shape: read `listTopics()` +
`topicIndex()` (both already pure, already read-only, already swept by the
existing persistence-reachability GATE checks) to build the union of every
topic's `distinctOccurrences`, and report `{ mapped, unmapped, total }`
against `OCCURRENCES.length` overall and per collection.

**Why it is not built in this round.** It is genuinely independent in
*feature* scope from `translationCoverage()` — a different axis, a
different question — but it would land in the *same two files*
(`app/js/hadith-corpus.js`, `app/js/hadith-browser.js`) this branch already
carries PR #103's reproduced, uncorrected-by-me-in-substance code in, and
would, like `translationCoverage()` did, need its own new `bn.js` keys
(another shared-file flag) and its own dated report and mutation-proof —
a second bounded task by this project's own governance rule ("One bounded
task at a time... report the result, and perform a separate Master
Architect audit"), not a rider on a report-correction task. Building it now
would mean this single PR silently grew from "verify and correct PR #103"
into "verify, correct, and also ship an unrelated new feature," with no
separate audit point between the two. It is recorded here, precisely
enough to build from, rather than built.

## 7. A real defect found while writing this report: `tools/md2report.py` hangs forever on a very common line shape

While regenerating this report's own HTML, `python3 tools/md2report.py`
did not return — it ran at ~99% CPU, growing past 1.7GB of resident memory
before being killed after two minutes.

**Root cause, isolated by bisection and confirmed with a two-line
reproduction.** The parser's paragraph loop
(`while ... and not lines[i].startswith(("|", "#", "- ", "---")) and ...:
para.append(lines[i]); i += 1`) refuses to consume a continuation line that
starts with `#`, on the assumption that such a line is an ATX header and
belongs to the *next* block. But the outer dispatch only treats a line as a
header when `re.match(r'^(#{1,6})\s+(.*)', l)` matches — `#` followed by
**whitespace**. A line that starts with `#` followed directly by a **digit**
(no space) — exactly the shape of a hard line-wrap landing on a GitHub issue
or PR reference like `#103`, mid-sentence — matches **neither** rule: the
paragraph loop refuses it, and the header dispatch also refuses it. Nothing
else claims it either (not a table row, not a list item, not blank). The
outer `while i < len(lines):` loop re-reads the *same* line on every pass
because `i` is never advanced on this path, appending an empty `<p></p>` to
`out` each time — an unbounded loop that only a process kill or an OOM stops.

**Minimal reproduction** (hangs on unmodified `main`, confirmed with
`timeout 5 python3 tools/md2report.py`): a two-line input file whose first
line is any ordinary sentence and whose second line is the four characters
`#`, `1`, `0`, `3` immediately followed by `)` and more text — i.e. a PR
reference that has wrapped onto its own line without a leading space before
the `#`. This report avoids writing that exact shape literally, since
writing it would reproduce the hang the next time this very file is run
through the generator.

**Why this is a live hazard, not a one-off.** Referring to a GitHub issue or
PR as `#NNN` mid-sentence is this project's own house style — it appears
dozens of times across the `docs/reports/` directory this tool renders,
including in PR #103's own two reports and in this one. The only thing that
has kept it from firing before is luck of the wrap: it fires exactly when a
`#NNN` reference happens to fall at the very start of an authored line, which
this report's own first draft did (§3, "…section (added by PR\n#103) calls
…") until reworded here to avoid it (moving `#103` back onto the previous
line). No file in `docs/reports/` was found with this exact shape on `main`
today (`grep -n '^#[0-9]'` returns nothing there), but the next report to
wrap a reference this way — by any module, not only Hadith — will hang the
same generator run PR #103's own history already used it for ("Resolve the
report HTML to the house generator, and correct it forward").

**Not fixed here.** `tools/md2report.py` is not a Hadith-owned file — every
module's dated reports go through it, so a fix is a shared-tooling change
and belongs to whoever owns it, on the same "declare, don't just fix"
footing this bridge's own protected-path rule uses for the files it names
explicitly, even though this exact path is not on that list. The likely
one-line fix, for whoever picks it up: widen the paragraph loop's exclusion
(and the header dispatch's own precondition) so a line is only treated as
"not paragraph text" when it actually matches the header regex, e.g.
`not re.match(r'^#{1,6}(\s|$)', lines[i])` in place of the bare
`lines[i].startswith("#")`. Reproduced against the two-line case above
before writing this section; not applied.

---

## Machine-readable status

BRANCH=claude/laughing-goodall-7snfrb

BASE_MAIN_SHA=2cb405e388bb069c11c6e62a9f53854c91995e0b

MAIN_VERSION=v08.31 (unchanged)

REPRODUCED_PR=103 (branch claude/laughing-goodall-gdrbdj, commits 168e416 + bb29e76, reproduced via git apply -- see §1)

CORRECTION=4 distinct t() keys, not 3, in Explore's "Translation coverage" section -- both dated PR #103 reports corrected in place

WORK=docs/reports/2026-09-20-hadith-translation-coverage.md+.html (corrected), docs/reports/2026-09-20-hadith-translation-coverage-browser-verification.md+.html (corrected), this report (new)

TEST_RESULT=all seven governance suites clean; all five Hadith suites clean; no application file changed by the correction

REGRESSION_SUITES=programme-ledger 8/23/0; programme-ledger-mutations 49/0; brief-integrity 8/0; study-activity-evidence-boundary 27/0; study-activity-evidence-boundary-mutations 11/0; study-event-wiring 41/0; rules-authorisation-executable 38/0

BLAST_RADIUS=BR-0 -- documentation only, zero shared/protected file touched

SHARED_FILES_CHANGED=NONE (bn.js still needs 4 new keys, not added, flagged in the corrected report)

VERSION=unchanged, v08.32 still unallocated

DEPLOYMENT=NONE

OWNER_CONTROL_GATES=ALL CLOSED, none approached

NEXT_TRANCHE_CANDIDATE=topicCoverage() in app/js/hadith-corpus.js -- corpus-wide unmapped/mapped occurrence counts, the topic-taxonomy counterpart of translationCoverage() -- NOT built this round, see §6

TOOLING_DEFECT_FOUND=tools/md2report.py hangs forever (unbounded loop, no exit) on any authored line starting with "#" directly followed by a digit, e.g. a wrapped "#103)" reference -- reproduced, not fixed (shared tooling, not Hadith-owned), see §7

NEXT_ACTION=Master Architect / Quran-side review of PR #103's correction; bn.js catalogue entries (4, not 3); separate bounded-task authorisation for topicCoverage() if wanted; shared-tooling owner to fix tools/md2report.py's header/paragraph dispatch (§7)
