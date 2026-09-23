# Health Atlas — report-twin repair, ledger reproduction, Lifestyle Gate A/B, and a Foods/Conditions search slice

**21 Sep 2026. Issue #115, `/mmsa-task` comment id `5762935014`. Stack: #140 → #142 → #145 → #146 → #148 → this tranche (branch `claude/health-atlas-more-search-tranche11`, based on PR #148's head `c9bc93fe83fa`).**

## What this task was

The issue #115 follow-up comment asked for four things, in order: (1) repair a
reported flattening defect in PR #148's own HTML report twin and check its
changed-file inventory claim; (2) reproduce a reported `programme-ledger-mutations`
48/1 failure on a full checkout and report the exact cause, without editing
shared tooling; (3) investigate the still-missing Lifestyle tab against the
v02.04 source handover under Gate A/B, building it only if safe; (4) build one
substantial, safe, read-only, source-faithful v02.04 parity slice, pivoting to
something else if Lifestyle does not clear Gate B.

## Verification before touching anything

All SHAs and stack claims from the task comment were checked, not trusted:

| Claim | Verified |
|---|---|
| PR #148 head `c9bc93fe`, base (PR #146 head) `5817643b` | `c9bc93fe83faeb0c9392269c245f33c1a3cc62b2` / `5817643bf3a7585a6c5eae7f7003f55971c7d6eb` — match `mcp__github__pull_request_read` |
| `health/source-v02-04-handover` at `ed4dbb2e` | `ed4dbb2e535ba6b95ea286a5f3b29a32122ea4b9` — matches |
| Stack #140→#142→#145→#146→#148 | Confirmed by `mcp__github__pull_request_read` on #148 (base/head refs), consistent with #148's own report table |
| Issue #123 (the "ledger" issue) | Read — MMSA-wide coordination issue, not a document naming this tranche's own obligations |
| `main` at v08.32 | `programme-ledger.mjs`'s own header line: `main 16cfb0b351 at v08.32` |

## Part 1 — The report HTML twin: broken repository-wide, repaired for the one report this task named

`tools/md2report.py` has no fenced-code-block (` ``` `) handling and no
Markdown-link handling. A ` ``` ` line does not match any of its branches
(heading, table row, list item, rule), so it falls into the generic paragraph
scanner, which joins every line inside the fence onto one line with spaces and
runs it through the same inline `` `text` ``-to-`<code>` regex ordinary prose
uses — a regex that cannot represent a multi-line fence, so the backtick
fences themselves leak into the rendered output as literal `` `` `` marks
and every internal newline is lost. `[text](url)` links render as literal
bracket/paren text for the same reason: nothing converts them.

**This is not specific to Health.** Regenerating every `.md` in `docs/reports/`
with a corrected, uncommitted local script and diffing against its committed
`.html` twin: **all 82 of this repository's report pairs are affected** — Quran,
MAP, Hadith and Health reports alike, because they all go through the same
shared generator. `tools/md2report.py` is platform-shared tooling, off limits
to a Health-owned task without Master Architect authorisation — **not edited
here**, and no other module's already-committed report `.html` was
regenerated or touched. What tranche 11 did, within scope: hand-corrected
`docs/reports/2026-09-21-health-atlas-references-tabs-accessibility.html`
(PR #148's own report, the one file this task named) so its two fenced code
blocks and two WAI-ARIA pattern links render correctly. Its `.md` source was
already correct and needed no change — only the derived `.html` was wrong.
This report's own `.html` twin was generated with the same corrected local
converter, so it does not add another broken instance to the pile.

**PR #148's "6 files changed" claim was checked, not assumed**: `git show
--stat c9bc93fe83faeb0c9392269c245f33c1a3cc62b2` lists exactly 6 changed
files (`app/health/README.md`, `app/health/js/health-atlas-view.js`, the
report `.md`/`.html` pair, and the two `tools/health-atlas-verify/references-*`
files). The claim was accurate; no correction was needed.

## Part 2 — The reported `programme-ledger-mutations` 48/1 failure: does not reproduce on a full checkout

Run twice, from a full `git fetch --unshallow` with every branch fetched
(763 commits, vs. 121 on the shallow clone this session started from):

| Checkout | Result |
|---|---|
| `origin/main` (`16cfb0b`, v08.32) | **49 passed, 0 failed** |
| PR #148 head (`c9bc93fe`), detached worktree | **49 passed, 0 failed** |

Both genuinely obtained — not asserted from memory of PR #148's own claim.
The 48/1 result PR #148 reported is exactly the "Guard E fixture drift is
checkout-completeness, not a code defect" finding draft PR #134 already
documents: the guard's own fixture-completeness check (which stream both
declares `app/js/version.js` and shows it changed on a branch) depends on
having every named branch and full history present to evaluate; a session
missing some of that sees the mutation come back unproven and reports it as
a failure, a session with the full checkout does not. **No shared-tooling
file (`programme-ledger.mjs`/`programme-ledger-mutations.mjs`) was touched
or needed changing** — this is a checkout-completeness artefact of a prior
session, not a code defect in either file.

## Part 3 — Gate A/B on the Lifestyle tab: investigated fresh, existing deferral holds

The v02.04 source (`docs/health-source/health-atlas-v02.04-standalone.html`
on `health/source-v02-04-handover`, commit `ed4dbb2e`) has a `lifestyles[]`
array of 10 habits, each `{ id, name, activities[], food[], avoid[], refs[] }`.
`HEALTH_ATLAS_LIFESTYLES` is already ported into `health-atlas-data.js`
(tranche 1) but read by nothing — `health-atlas-more-selectors.js`'s own
header comment already investigated this in tranche 3 and recorded why:
unlike Foods/Diseases/Age Groups, which each have a real structural field
(`.category`, `.cause`/`.symptoms`/`.organAffected`, `.name`) separate from
their excluded content, Lifestyles has no such remainder — `.activities`,
`.food` and `.avoid` ARE the recommendation, end to end
(`"150 min/week moderate aerobic activity"`, `"avoid screens immediately
before bed"`). Even the bare `.name` values ("Regular Physical Activity",
"Quality Sleep", "Stress Management") are themselves habit endorsements,
unlike a neutral label such as "Coronary Artery Disease" or "Avocado" —
showing the list of names alone would still be presenting the app's own
opinion of what a reader's lifestyle habits should be, with nothing
structural underneath it.

**This tranche re-investigated rather than trusted the prior conclusion**,
re-reading the full `lifestyles[]` array and re-checking each field against
the same test tranche 3 applied to Foods/Diseases/Ages. No new field-level
split was found that the original investigation missed. Per the task's own
instruction ("Gate B only implement a narrowly scoped safe view if
provenance and privacy boundaries allow, otherwise pivot"), this tranche
**concurs with the existing deferral rather than overriding it without new
grounds**, and builds nothing under the Lifestyle tab.

**Gap matrix — all six of the source app's own nav tabs:**

| Source tab | Status | Notes |
|---|---|---|
| Body Systems | Built (tranches 1, 6, 7) | Wheel/diagram + organ search built; the wheel's third "fields" ring deliberately deferred — navigation convenience only, the same information is already in the safe detail pane |
| Foods | Built (tranche 3); search added (tranche 11) | `.nutrition`, `.servingQty`, raw `.organs` (dose-embedded) excluded |
| Diseases | Built (tranche 3); search added (tranche 11) | `.remedies`, `.homeRemedies`, `.naturalRemedies` excluded |
| Age Groups | Built (tranche 3) | `.notes` excluded; no search box — the source has none there either |
| **Lifestyle** | **Deferred (tranche 3), reconfirmed (tranche 11)** | Whole dataset withheld — no safe structural subset exists |
| References | Built (tranche 9); accessible view switcher (tranche 10) | — |

(Master Categories — a food sub-grouping the source itself does not expose as
its own nav tab — was built separately, tranche 4.)

CRUD, import/export and the header reset button are out of scope by the
task's own instruction and untouched. The wheel's third "fields" ring stays
deferred, unchanged from tranches 6/7.

## Part 4 — The pivot slice: Foods/Conditions search, narrower than the source for safety

Since Lifestyle does not clear Gate B, this tranche built the "clearly
independent safe parity slice" the task's own instruction asks for in that
case: the source app's per-tab text filter, which tranche 3's own
Foods/Conditions/Age-Groups port never carried (tranche 6 already ported it
for Body Systems' organ list). This is genuinely independent of the
Lifestyle question — no clinical content, no new field exposure, and no
overlap with the wheel/ring deferral.

**The source's own search is NOT safe to replicate literally, and this is
the tranche's own real finding.** The source's generic `matches(item, term)`
is `JSON.stringify(item).toLowerCase().includes(term)` — it searches the
entire serialized item. Ported as-is on Diseases, searching for a drug name
that appears only in `.remedies` would still surface that disease in the
results: a hit is itself a disclosure of the hidden field's content, even
though the field is never rendered — the same class of indirect leak
`organNamesFor()`'s own dose-stripping (tranche 3) already guards against
for a different field. `matchesFoodSearch`/`matchesDiseaseSearch`
(`health-atlas-more-selectors.js`) are scoped instead to exactly the fields
this view already renders: `name`+`category` for foods, `name`+`cause`+
`symptoms`+`organAffected` for diseases — never the excluded fields. No
search box was added for Age Groups, matching the source (its own
`SEARCH_TERM` object carries no `age` key).

**UX details, matching this codebase's own established discipline for a
full-redraw screen:** the typed term is preserved across opening a detail
card and pressing "back" (kept in the mount closure's own state, not reset
by view code), and the input re-focuses itself with the caret restored to
the end after each keystroke's full redraw — the exact pattern
`health-atlas-view.js`'s own organ search (tranche 6) already uses, for the
same reason (a full `container.textContent = ''` redraw on every keystroke
would otherwise steal focus after the first character).

**Gate A (reproduced before touching app code).** The new committed browser
suite, `tools/health-atlas-verify/more-search-browser.mjs`, was run against
the unmodified PR #148 head (`c9bc93fe`, a detached worktree with the new
test file copied in, nothing else changed) first. Every check that depends
on a search box existing times out waiting for `.ha-search-input`
(`locator.click: Timeout 30000ms exceeded`), because the feature does not
exist on that commit. Raw tail of that run:

```
FAIL: desktop: clearing the search box restores the full food list: locator.click: Timeout 30000ms exceeded.
FAIL: desktop: the search term survives opening a detail card and pressing back: locator.click: Timeout 30000ms exceeded.
FAIL: desktop: switching to Conditions shows its own search box, and it filters by name/cause/symptom/organ: expected exactly 1 search box on the Conditions tab
FAIL: desktop: a term that exists ONLY in an excluded field (disease .remedies) shows the empty state, not a false hit: locator.click: Timeout 30000ms exceeded.
FAIL: tablet (768x1024): no page errors; the Foods search box is visible and real keyboard typing filters the list: expected the search box visible at tablet width
FAIL: phone (390x844): no page errors; a real tap into the search box plus typing filters the list: locator.tap: Timeout 30000ms exceeded.
```

**Gate B (the build).** Re-run against this tranche's own commit:

```
Health Atlas — Foods/Conditions search test

  PASS  desktop: page loads with no page errors
  PASS  desktop: Foods tab shows a real, typeable search box
  PASS  desktop: typing a name term filters the food list to matching entries
  PASS  desktop: a term that exists ONLY in an excluded field (food .nutrition) shows the empty state, not a false hit
  PASS  desktop: typing does not steal keyboard focus across the redraw
  PASS  desktop: clearing the search box restores the full food list
  PASS  desktop: the search term survives opening a detail card and pressing back
  PASS  desktop: switching to Conditions shows its own search box, and it filters by name/cause/symptom/organ
  PASS  desktop: a term that exists ONLY in an excluded field (disease .remedies) shows the empty state, not a false hit
  PASS  desktop: switching to Age Groups shows NO search box, matching the source app
  PASS  tablet (768x1024): no page errors; the Foods search box is visible and real keyboard typing filters the list
  PASS  phone (390x844): no page errors; a real tap into the search box plus typing filters the list

Health Atlas more-search-browser: 12 passed, 0 failed
```

The two "excluded field" checks type `Potassium` (present only in
avocado's real `.nutrition` array) and `Statin` (present only in Coronary
Artery Disease's real `.remedies` array) and assert the page's own "No
matches" empty state, not a false hit — proving the scoped-search boundary
against the REAL rendered page, not just the pure selector functions in
isolation.

`tools/health-atlas-verify/more-selectors.mjs` gained 7 pure-function
checks (empty-term, name/category/cause/symptom/organ matches, and the same
two excluded-field non-matches, plus a no-throw check on a minimal fixture
object). `view-boundary-more.mjs` gained 2 checks: a positive control that
the view really calls `matchesFoodSearch`/`matchesDiseaseSearch` and renders
both search boxes, and that `renderAgeGroupList` calls no `searchBox(...)`.
Both mutation-proven: removing the Foods `searchBox(...)` call from the view
makes the positive control fail by name (`27 passed, 1 failed` /
`expected a Foods search box`); restoring it returns to green.

## Suite results

**Health-owned suites (`tools/health-atlas-verify/`, 20 runnable suites —
`import-esm-file.mjs` is a shared loader helper, not a suite):**

| Suite | Result |
|---|---|
| body-systems-parity-browser | 16 passed, 0 failed |
| categories-selectors | 7 passed, 0 failed |
| claims-integrity | 10 passed, 0 failed |
| claims-mutations | 7 passed, 0 failed |
| data-integrity | 21 passed, 0 failed |
| **more-search-browser (new)** | **12 passed, 0 failed** |
| more-selectors | 16 passed, 0 failed |
| references-index-browser | 12 passed, 0 failed |
| references-tabs-accessibility-browser | 10 passed, 0 failed |
| selectors | 19 passed, 0 failed |
| view-boundary | 14 passed, 0 failed |
| view-boundary-categories | 58 passed, 0 failed |
| view-boundary-categories-mutations | 7 passed, 0 failed |
| view-boundary-more | 28 passed, 0 failed |
| view-boundary-more-mutations | 7 passed, 0 failed |
| view-boundary-wheel | 57 passed, 0 failed |
| view-boundary-wheel-mutations | 6 passed, 0 failed |
| view-provenance-boundary | 7 passed, 0 failed |
| view-provenance-mutations | 4 passed, 0 failed |
| **Total** | **318 passed, 0 failed** |

**Seven governance suites (`node tools/i18n-verify/<name>.mjs`, repository
root, full history/branches fetched first):**

| Suite | Result |
|---|---|
| programme-ledger | 8 passed, 23 noted, 0 failed |
| programme-ledger-mutations | 49 passed, 0 failed |
| brief-integrity | 8 passed, 0 failed |
| study-activity-evidence-boundary | 27 passed, 0 failed |
| study-activity-evidence-boundary-mutations | 11 passed, 0 failed |
| study-event-wiring | 41 passed, 0 failed |
| rules-authorisation-executable | 38 passed, 0 failed |
| **Total** | **182 passed, 23 noted, 0 failed** |

Playwright was resolved the same local, uncommitted way #148 documents:
`mkdir -p node_modules && ln -sfn "$(npm root -g)/playwright" node_modules/playwright`
— gitignored, nothing committed, no shared CI/tooling change.
`.github/workflows/verify.yml` still does not run this suite class.

## Files touched

- `docs/reports/2026-09-21-health-atlas-references-tabs-accessibility.html` — repaired (Part 1); its `.md` is untouched
- `docs/reports/2026-09-21-health-atlas-more-search-tranche11.md` / `.html` — this report
- `app/health/js/health-atlas-more-selectors.js` — `matchesFoodSearch`/`matchesDiseaseSearch` (Part 4)
- `app/health/js/health-atlas-more-view.js` — search boxes wired into Foods/Conditions
- `app/health/health-atlas-more.html` — `.ha-search-box`/`.ha-search-input` CSS (copied verbatim from `health-atlas.html`), footer note
- `app/health/README.md` — Tranche 11 section
- `tools/health-atlas-verify/more-selectors.mjs` — 7 new pure-function checks
- `tools/health-atlas-verify/view-boundary-more.mjs` — 2 new boundary checks
- `tools/health-atlas-verify/more-search-browser.mjs` — new, the Gate A/B browser suite

All under `app/health/**`, `tools/health-atlas-verify/**`, or `docs/reports/`.
No protected/shared path touched: not `app/js/version.js`, `CLAUDE.md`,
`CHANGELOG.md`, `bn.js`, `nav.js`, `unit-keys.js`, `records.js`,
`activity.js`, `catalogue-data.js`, `shell.css`, the platform-shared
`tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
programme-ledger,programme-ledger-mutations}.mjs`, `docs/governance/`,
`firestore.rules`, `firebase.json`, `tests/firestore/`,
`tools/firestore-emulator/`, `tools/md2report.py`, or `.github/workflows/`.

## What this deliberately did NOT do

- Did not edit `tools/md2report.py`, and did not regenerate or touch any
  other module's already-committed report `.html` — even though the same
  defect affects all 82 pairs repository-wide. That fix, and the decision
  to make it, is a shared-file change needing Master Architect
  authorisation; it is flagged here, not made.
- Did not build the Lifestyle tab — Gate B did not clear, on the same
  grounds tranche 3 already established, re-checked rather than assumed.
- Did not add a search box to Age Groups (the source app has none there).
- Did not build the wheel's third "fields" ring, CRUD, import/export, or
  the header reset button — all out of this task's own stated scope.
- Did not touch any protected/shared path, version number, Firestore
  Rule/index, or `.github/workflows/`.
- Did not allocate or bump any version — `app/js/version.js` is untouched;
  this candidate needs a version allocated by the Master Architect before
  any future integration, and none has been.
- Did not merge, deploy, or claim approval. Draft PR, stacked on #148
  exactly as #140→#142→#145→#146→#148 already stack.

## Owner app test

**Required: NO before merge** — nothing here is linked from shared nav or
deployed.

**YES after merge**, direct URL only, no sign-in/tenant: open
`app/health/health-atlas-more.html` (served over `http://`, not `file://`).

1. On the Foods tab, type a food name (e.g. "avocado") into the new search
   box — confirm the list narrows to matching foods only.
2. Clear the box — confirm the full food list returns.
3. Open a food's detail card, press "← All foods" — confirm your search
   term is still in the box.
4. Switch to the Conditions tab — confirm it has its own, empty search box,
   and typing a condition name filters that list.
5. Switch to Age Groups — confirm there is no search box there (by design,
   matching the source app).
6. Open `docs/reports/2026-09-21-health-atlas-references-tabs-accessibility.html`
   in a browser — confirm the two code excerpts render as proper multi-line
   code blocks (not run-on text with stray backticks) and the two
   "Tabs pattern"/"toggle-button pattern" references are real clickable
   links.
