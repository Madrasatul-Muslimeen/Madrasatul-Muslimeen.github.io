# Hadith: PR 122 audit, a governance-suite drift finding, and Topics-tab navigation (H2)

**Date:** 20 September 2026 (UTC). **Status: draft PR, not merged.** No Rules,
index, deployment, or version change. `v08.32` remains unallocated.

Resolves the MMSA task bridge instruction on issue #114 (comment
5752938712): audit draft PR #122's exact diff and its 22 browser
assertions, confirm its seven untranslated English literals are correctly
handed to MMSA issue #123, then evaluate the existing synthetic
book/topic chapter navigation for a genuine user-visible gap and either
build it (if independent of shared keys, version, Rules/index, and any
conflict with #122) or deliver the plan and stop.

---

## 1. Audit of PR #122

PR #122 (`claude/laughing-goodall-qubb6e`, head `dc10448`, base `main`
`2cb405e`, v08.31) was audited by diffing its branch directly against
`main` rather than trusting its own description.

**Diff scope — confirmed Hadith-owned, no protected path touched:**

```
app/js/hadith-browser.js                                    |  73 ++-
app/js/hadith-corpus.js                                     |  89 +++
tools/i18n-verify/hadith-corpus.mjs                          | 184 ++++-
docs/reports/2026-09-20-*.md / .html (6 dated report pairs)  | ...
13 files changed, 1783 insertions(+), 4 deletions(-)
```

No change to `bn.js`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`, `nav.js`,
`unit-keys.js`, `records.js`, `activity.js`, `catalogue-data.js`,
`firestore.rules`, `firebase.json`, `docs/governance/`, or `.github/workflows/`.

**The seven English `t()` literals PR #122's own body lists were read
against the actual diff, verbatim, and all seven match exactly** —
`"Translation coverage"`, its description sentence, its two count
sentences (the overall one carries an `"Overall: "` prefix the per-edition
one does not, which is why the pair is four keys not three), `"Topic
coverage"`, its description sentence, and its per-edition sentence. No
eighth literal exists and none of the seven is missing.

**22 browser assertions — 16 of them independently re-run here, not just
re-read.** A focused Playwright script (this project's own harness,
`newContext`/`openPage`) opened `/app/hadith-collections.html` at
390×844 in English and Bangla via a `git worktree` checkout of PR #122's
branch, clicked the Explore tab, and asserted: no page errors; both new
`<h3>` headings render; the overall translation line carries real
numbers; **the old shared `data-hadith-coverage-edition` attribute
resolves to 0 elements** (proving PR #122's own naming-collision fix
holds in the live DOM); and both features' own new per-edition
attributes (`data-hadith-translation-coverage-edition` /
`data-hadith-topic-coverage-edition`) each resolve to exactly 2 rows —
in both languages. **16 of 16 passed.** The remaining 6 of the claimed 22
(the `synthetic-beta-ar-v1` per-edition figure match) were read from the
report rather than independently re-asserted, since the underlying
`translationCoverage()`/`topicCoverage()` pure functions were already
re-verified by the governance-suite re-run below.

**Seven Hadith suites re-run on PR #122's own branch, matching its
claimed table exactly:** `hadith-corpus.mjs` 46/0,
`hadith-commentary-binding.mjs` 14/0, `hadith-source-rights.mjs` 14/0,
`hadith-governing-contracts.mjs` 14/0, `hadith-gate-contracts.mjs` 11/0.

**A real drift was found in the seven governance suites, and it does not
belong to PR #122.** `programme-ledger-mutations.mjs` reported
**48 passed, 1 failed** on PR #122's branch, against the 49/0 its own PR
body claims:

```
FAIL  MUTATION [E] a stream's shared-file touch loses its declaration
      fixture drift: no stream both declares app/js/version.js and still
      shows it changed on a branch
```

**Confirmed NOT a PR #122 defect**: the identical failure reproduces on a
clean, unmodified `origin/main` checkout (`2cb405e`), in its own isolated
worktree, with no PR #122 code present at all. This is the same class of
finding PR #122's own report already named once ("a false-failure trap...
reproduces identically on plain `origin/main`") — the mutation's
precondition depends on which branches currently exist on `origin` and
what they currently declare, and several other MMSA task-bridge sessions
pushed and merged branches in the minutes around this audit, so the
programme's live branch state moved under the mutation between when PR
#122's suite ran and when this audit's did. `programme-ledger-mutations.mjs`
is protected shared tooling (on this instruction's own off-limits list)
and was **not modified** — this is recorded, not fixed, exactly as this
programme's own prior findings about `tools/md2report.py`'s hang have
been recorded rather than fixed by sessions that do not own the tool.

**Handoff to MMSA issue #123**: issue #123 already exists and already
carries its own dedicated MMSA task-bridge instruction (comment
5752935162) whose own declared Gate A/B budget item 1 is *"seven verbatim
Hadith English-to-Bangla mappings in protected `bn.js`"* — i.e. the exact
seven keys audited above. A confirmation comment naming the seven keys
verbatim (unchanged from PR #122's own body) is posted to issue #123 as
part of this round's reporting (§5), so the handoff is not left implicit
in a cross-issue reference alone. `bn.js` itself was not touched by this
session.

---

## 2. The next tranche: evaluating book/topic chapter navigation

**The declared budget, written before any code changed** (per this
round's own instruction):

**Gap identified.** `app/js/hadith-browser.js`'s `renderTopic()` hardcoded
`topicIndex("synthetic-topic-salah")` — the one and only topic the
fixture has ever carried. The Topics tab was therefore not really
*navigation*: a reader opens it and is dropped straight into one fixed
topic, with no list, no picker, and no way back to "all topics", even
though the data layer (`listTopics()`, `topicIndex(topicId)`) already
supports more than one topic and `exploreAggregate()` already iterates
`listTopics()` to build its own per-topic Explore cards. This is the same
class of gap the Collections tab does NOT have — Collections already
lists every edition and lets a reader choose one; Topics never did.

**Acceptance criteria (declared before building):**
1. With ≥2 topics in the fixture, the Topics tab shows a topic list first
   (label in the reader's UI language, topic id, the existing `Synthetic`
   marker) — no topic auto-selected.
2. Choosing a topic shows exactly that topic's index (unchanged
   `topicIndex()` rendering) with a breadcrumb back to the list.
3. Going back returns to the list without a page reload, mirroring the
   Collections tab's own breadcrumb pattern.
4. The pre-existing single-topic case (Salah) renders identically in
   substance to before this round — same counts, same entries.
5. No permanent id, no real corpus text, no Rules/index/version change.
6. Every existing Hadith and governance suite continues to pass.
7. Any new English `t()` literal is enumerated verbatim for MMSA and
   `bn.js` stays untouched — or, ideally, none is introduced at all.

**File budget (Hadith-owned only, no shared/protected path):**
`app/js/hadith-browser.js` (rewrite `renderTopic()`, add `state.topicId`),
`app/js/hadith-fixture-data.js` (one new synthetic topic + one new
mapping, to make a second topic exist to navigate to at all — otherwise
the picker could never be proven to switch anything), and
`tools/i18n-verify/hadith-corpus.mjs` (new NAVIGATION checks). A dated
report pair. Nothing else.

**Data/security boundaries:** the new topic and its mapping sit entirely
inside the enforced synthetic namespace (`synthetic-topic-wudu`,
`syn-map-0004`), reuse only existing occurrence/book/chapter ids, add no
new permanent id family, and are swept automatically by the three
existing namespace GATE checks in `hadith-corpus.mjs` — no new gate code
was needed for that; the fixture addition alone is what the gates check.
No durable write, no Rules/index touch; the Hadith collections remain
unruled and denied by default, unchanged.

**Rollback:** a single additive commit across three Hadith-owned files;
`git revert` cleanly undoes it, no data migration, no persisted state
(Track remains a page-lifetime `Map`, unchanged).

**Independence from PR #122, confirmed before building:** PR #122 touches
`renderExplore()` and appends two new functions to the end of
`hadith-corpus.js`. This round touches `renderTopic()` — a different
function in the same file, untouched by #122 — and inserts its fixture
addition into the existing `TOPICS`/`TOPIC_MAPPINGS` arrays, a different
region from #122's own two new exported functions. Built directly on
`main` (`2cb405e`), as an independent sibling of #122's own base commit,
not stacked on #122's branch, so the two remain mergeable in either
order. **No shared-key edit was required** (see below) and no version
bump was made — so every one of this round's own "build only if
independent" preconditions held, and the feature was built.

**A better outcome than declared going in: zero new English literals.**
The topic-list heading reuses the existing `t("Topics")` tab-label key,
and the per-topic-row `Synthetic` marker reuses the existing
`t("Synthetic")` key already used by the Collections tab's own edition
rows — both already present in `bn.js` (`"Topics": "বিষয়সমূহ"`,
`"Synthetic": "কৃত্রিম"`). **No MMSA translation handoff is needed for
this feature at all.**

---

## 3. What was built

`app/js/hadith-fixture-data.js` — a second synthetic topic,
`synthetic-topic-wudu` (label "Wuḍūʼ" / "ওজু" / "الوضوء"), and its own
mapping `syn-map-0004` onto the existing `synthetic-alpha-b2-c1` chapter
("Chapter on Ablution before Prayer"), which already exists in the
fixture and was previously reachable only through the source browser, not
through any topic. Nine lines added; nothing removed, nothing renumbered.

`app/js/hadith-browser.js` — `renderTopic()` now renders a topic **list**
(`listTopics()`, imported alongside the existing `topicIndex`) when
`state.topicId` is unset: one row per topic, `data-hadith-topic-row`
carrying the topic id. Choosing a row sets `state.topicId` and renders
the existing detail view, now driven by `topicIndex(state.topicId)`
instead of the hardcoded literal, with a new breadcrumb
(`data-hadith-topic-back`) that clears `state.topicId` and returns to the
list. The detail rendering itself (`#hadithTopicMeta`, the per-collection
groups, the occurrence cards) is byte-identical to before this round —
only what selects the topic id changed.

`tools/i18n-verify/hadith-corpus.mjs` — four new `NAVIGATION` checks
(33 → 37 passing): `listTopics()` must offer at least two topics or a
picker proves nothing; every topic it offers must independently resolve
through `topicIndex()`; the two topics must be genuinely distinct in what
they reach (mutation-proven — see below); and the new topic's own id and
mapping id must carry the enforced synthetic prefixes.

**Mutation-proven, not merely asserted.** Reverting the fixture addition
(removing `synthetic-topic-wudu` and `syn-map-0004` while keeping the
rest of this round's code) makes exactly the two checks that depend on it
fail, by name, with no other check affected:

```
FAIL  NAVIGATION -- listTopics() offers more than one topic, or there is
      nothing to navigate
FAIL  NAVIGATION -- the two topics are genuinely distinct in what they
      reach, not a copy-paste pair
```

Restoring the fixture returns the suite to 37/0. This is the same
measure-the-guard-can-fail discipline this project's own standing lessons
require (`CLAUDE.md`: *"A check that has never run has earned nothing"*).

---

## 4. Verification

**Seven governance suites**, run from the repository root on this
session's own branch:

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 48 passed, 1 failed — the §1 drift finding, reproduces identically on unmodified `main`, not caused by this round |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

**Five Hadith suites:**

| Suite | Result |
|---|---|
| `hadith-corpus.mjs` | 37 passed, 0 failed (33 baseline + 4 new NAVIGATION checks) |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |

**Browser English/Bangla evidence, obtained, not just described.**
Playwright (`playwright@1.56.1`, global install, pre-installed Chromium)
via a local `node_modules/playwright` symlink (not committed,
`.gitignore`-covered — `node_modules/` was already listed). `node
serve.js` served the repository at `http://localhost:8080`. A focused,
un-checked-in Playwright script opened `/app/hadith-collections.html` at
390×844 in English and Bangla, clicked `[data-hadith-tab="topic"]`, and
asserted on the rendered DOM:

**22 of 22 checks passed, both languages** — no page errors; the topic
list shows exactly 2 rows on open, with no back control and no detail
view rendered yet; the second row is `synthetic-topic-wudu`; clicking it
renders the detail view with its own real count (1 distinct narration);
the back control appears only once a topic is chosen and returns to the
2-row list with the detail view gone; and opening the **first**, pre-
existing topic (Salah) still shows its documented 5-distinct/3-mapping
counts, unchanged from every prior Hadith report.

**Both `bn.js` keys this feature relies on were confirmed present**
(`"Topics"`, `"Synthetic"`) rather than assumed, so the "zero new
literals" claim in §2 rests on a grep, not a belief.

---

## 5. `tools/md2report.py` — not touched

Not exercised or re-diagnosed this round; this report continues the
prior sessions' practice of avoiding any line beginning with `#`
immediately followed by a digit, so its own hang (root-caused by PR #118,
independently reproduced by PR #122) is simply not triggered here. Not
fixed, since the tool is shared and not Hadith-owned.

---

## 6. Owner app test required

**NO.** Everything in this report exists only on this session's own draft
branch/PR — not on `main`, not served by GitHub Pages. There is nothing
for the Owner to open yet.

---

## 7. What was deliberately not done

- `bn.js` was not touched — and, unlike every prior Hadith round this
  week, this feature needed no new key to hand off at all.
- The `programme-ledger-mutations.mjs` drift found in §1 was recorded,
  not fixed — it is protected shared tooling, and the finding is that the
  guard's own precondition is sensitive to concurrent branch activity on
  `origin`, not that this round's code is wrong.
- No third topic, no re-ordering of the topic list, no search-within-
  topics, no synonym-based topic lookup — all real possible extensions,
  none asked for and none needed to close the specific navigation gap
  this round targeted.
- No merge, no deploy, no Rules/index change, no version bump. `v08.32`
  remains unallocated.
- PR #122 (and #103, #116, #118) were not touched, closed, or force-
  pushed.
