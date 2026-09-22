# MMSA Gate A/B integration preparation — dependency sequence, three change budgets, E1 review

- **Date:** 2026-09-20
- **Dispatched via:** issue 123, comment `/mmsa-task` instruction (MMSA task bridge)
- **Session branch:** `claude/laughing-goodall-04sjyq`
- **Status:** analysis and reporting only. No protected/shared path edited, no
  application behaviour changed, no version bumped, nothing merged, nothing
  deployed.

---

## 0. Checkout preflight and current `main`

`git remote set-branches origin '*' && git fetch --depth=2147483647 origin`
was run first, per the lesson every draft PR reviewed below independently
re-derived: several governance suites read facts about every branch the
Programme Integration Ledger declares, including the two HELD branches
(`claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`), and a narrow or
shallow fetch reports false failures that are checkout artefacts, not
defects. `git rev-parse --is-shallow-repository` confirmed `false` after the
fetch.

`origin/main` tip: `2cb405e388bb069c11c6e62a9f53854c91995e0b` ("Merge MMSA
task bridge candidate, PR 92"), `app/js/version.js` exports
`APP_VERSION = "08.31"` — matching `CLAUDE.md`'s own current-milestone line.
101 commits on `main`, 82 remote branches total.

---

## 1. PR inventory (all fetched fresh, not assumed)

All fourteen PRs named in the dispatching comment exist and were read in
full (`get`, `get_status`, `get_check_runs`). All are authored by the same
account as this issue's owner. Every one carries `mergeable_state: clean` —
**no merge conflicts anywhere in this set today.**

| PR | Title (short) | Base | Draft | CI (`verify.yml`) | +/− | Files |
|---|---|---|---|---|---|---|
| 91 | md2report.py infinite-loop fix + automation-pilot evidence | main | No | success | +2779 | 17 |
| 98 | Task-bridge prompt: checkout preflight + report-generator fence fix | main | Yes | success | +851/−7 | 4 |
| 103 | Hadith `translationCoverage()` | main | Yes | (no run recorded) | +654/−4 | 7 |
| 104 | Fix `retirePermanentNote()` denial under Phase 5 Rules candidate | main | Yes | success | +1280/−23 | 11 |
| 105 | Health Atlas foundation tranche 1 (Body Systems browser) | main | Yes | success | +6986 | 12 |
| 110 | Note Foundation retirement: emulator-evidence gap + MAP candidate list | main | Yes | (no run recorded) | +212 | 2 |
| 111 | Health Atlas claim-provenance tranche 1 | **PR 105's branch** | Yes | (no run recorded) | +1189/−1 | 9 |
| 112 | Word Card: expandable lemma-occurrences line | main | Yes | success | +716/−12 | 5 |
| 116 | Hadith: correct PR 103's report (4 keys, not 3) + md2report.py finding | main | Yes | (no run recorded) | +1005/−4 | 9 |
| 118 | Hadith `topicCoverage()` (independent of the 103/116 stack) | main | Yes | (no run recorded) | +350/−2 | 5 |
| 119 | Health Atlas tranche 3 (Foods/Diseases/Age Groups) | **PR 111's branch** | Yes | (no run recorded) | +1338 | 10 |
| 120 | MAP P5-G: `createNoteSource()` re-binding | main | Yes | success | +518/−1 | 4 |
| 121 | Health Atlas tranche 4 (Master Categories) | **PR 105's branch** | Yes | (no run recorded) | +901 | 9 |
| 122 | Hadith combined candidate (translation + topic coverage) | main | Yes | success | +1783/−4 | 13 |

"(no run recorded)" means `get_check_runs` returned zero check runs for that
head SHA at the time of this audit — not a failure, simply no CI run has
executed against that exact commit yet. Every PR whose CI **has** run
(91, 98, 104, 105, 112, 120, 122) shows `Deterministic governance suites:
success`.

**Branch stacking (not flagged as conflicts, because they are not — this is
deliberate sequencing by the authoring sessions):**

- `105 → 111 → 119` (Health Atlas: foundation → claim-provenance → foods/diseases/ages)
- `105 → 121` (Health Atlas: foundation → master categories, a sibling of the 111/119 line, **not** stacked on either)
- `103`/`116`/`118` are three independent app-code-or-report PRs against `main`, and `122` is a hand-merged combination of `118`+`103`+`116`'s corrections — see §2.

---

## 2. Hadith stack: report-only duplicates vs. the combined candidate

The dispatching comment asked to separate "report-only duplicates 103/116/118"
from combined 122. Reading all four bodies together, the actual relationship
is more precise than "duplicates":

- **118** (`topicCoverage()`) and **103** (`translationCoverage()`) are two
  genuinely **independent** features, each built from the same `main` tip
  with no knowledge of the other.
- **116** is not a third feature. Its own body states its app-code diff
  against `main` is byte-identical to 103's — it exists because that
  session's designated branch could not push to 103's branch, so it
  reproduced 103's two commits via `git apply` **in order to correct** two
  of 103's dated reports (3 Bangla keys claimed, 4 actually needed) and add
  a `topicCoverage()` scoping note. So 116 is 103's own commits plus a
  documentation correction, not a duplicate feature.
- **122** is a real, hand-merged integration: `118` first, then `103`, then
  116's corrected reports, with two genuine `hadith-browser.js` conflicts
  resolved (a shared import line; both features calling their render
  function at the same point in `renderExplore()`) and one collision `git
  merge` could not see on its own — both PRs independently used
  `dataset.hadithCoverageEdition` for differently-shaped elements, renamed at
  merge to `hadithTranslationCoverageEdition` / `hadithTopicCoverageEdition`.
  122's own report backs this with a live-DOM Playwright run (22/22, both
  languages) proving the old shared selector now resolves to zero elements.

**Recommended sequencing once Master Architect review clears any one of
these:** merge **122 alone**. It is a strict superset of 118's and 103's
(and, transitively, 116's corrected) work, built and CI-green
(`verify.yml`: success) on top of current `main`. Merging 118, then 103,
then 116 individually and separately would re-litigate the exact conflict
122 already resolved and verified in the live DOM. **103, 116 and 118
should stay open as the audit trail for that resolution** (per this
project's own standing rule to keep, not delete, superseded work) but are
not independently mergeable once 122 lands — merging both would reintroduce
the `dataset.hadithCoverageEdition` collision 122 fixed.

**The seven-key Bangla handoff is exact, not approximate**, and matches the
"seven verbatim Hadith English-to-Bangla mappings" the dispatching comment
named:

1. `"Translation coverage"`
2. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
3. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
4. `"{en} of {n} have English, {bn} of {n} have Bangla."` (a distinct literal — no `"Overall: "` prefix, confirmed at `app/js/i18n.js:61`, which keys on the exact string)
5. `"Topic coverage"`
6. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
7. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

None of these seven exists in `bn.js` today (confirmed by grep). `bn.js` is
on this bridge's protected-path table, so this PR does not add them — see
§4, budget 1.

---

## 3. Note Foundation stack: 104, 110, 120

- **104** fixes a real, mechanically-provable defect: `retirePermanentNote()`
  did a status-only update that the accepted Phase 5 Rules candidate's
  `committedRevisionMatches()` would deny outright, because the revision
  chain never advances. Round 2 of 104 added a genuine emulator-backed proof
  (real Firestore emulator, real candidate Rules text, the pre-fix function
  loaded verbatim via `git show` from 104's own base commit) — 4/4, including
  the pre-fix function failing against the real Rules and the fixed one
  succeeding.
- **110** was dispatched to do the same kind of emulator proof independently
  and concluded it was **not** deliverable, because the only genuine
  Firestore-emulator harness in the repo lives entirely inside two
  whole-directory protected paths (`tools/firestore-emulator/`,
  `tests/firestore/`), and separately, no `node_modules`/`firebase` package
  was installed in that session's sandbox.
- **Reconciling the two**: both are correct about their own sandbox, and
  neither is wrong about the protected-path rule. 104's round 2 route — a
  **new** file under `tools/i18n-verify/` (a directory that is only
  protected for six explicitly named files, none of which is this one) that
  starts a real Firestore emulator itself, entirely independent of
  `tools/firestore-emulator/` — is a legitimate way to get real Rules-engine
  evidence without touching a protected directory. 110's report is still
  useful: its equivalence-gap analysis and its MAP-candidate enumeration
  (12 candidates, each tagged with its exact E1/DDR/shared-path dependency)
  stand on their own regardless of which PR supplies the emulator proof.
  **Recommendation: merge 104 (it is the actual fix, CI green), and treat
  110 as a superseded-but-kept research artefact**, the same treatment
  recommended for 103/116/118 above.
- **120** adds `createNoteSource()` — a further active `noteSources` binding
  on an already-created Note. Read against 104's diff before being written:
  disjoint region of `note-foundation.js` (120 inserts between
  `retireNoteSource()` and `reorderNotePlacement()`; 104 edits inside
  `retirePermanentNote()`), zero shared lines, no call relationship. **104
  and 120 can merge in either order with no conflict.** 120 flags one design
  call made without prior authority (a retired Note refuses a new source
  binding, stricter than the accepted Rules candidate's own `allow create`)
  for Master Architect confirmation — a one-line, already mutation-proofed
  reversal if the intent differs.

**Recommended sequence:** 104, then 120 (or the reverse — genuinely
order-independent). 110 kept open as research, not merged as code (it adds
no code).

---

## 4. Three Gate A/B change budgets

### Budget 1 — seven Hadith Bangla mappings in `bn.js`

- **Path:** `app/js/i18n/bn.js` only. Protected (platform-shared).
- **Size:** 7 key/value pairs, additive only (no existing key touched).
- **Content:** the seven English literals in §2 above, each needing a
  Bangla translation.
- **Risk:** low — `t()` keys on the exact literal and falls back to English
  on a miss, so a delay in adding these keys degrades gracefully (English
  shown on a Bangla page) rather than breaking anything. No other file
  depends on their presence.
- **Who must act:** the Master Architect (or whoever holds `bn.js`
  authorship) adds the seven entries; no code change is required alongside
  them, since 122's app code already calls `t()` with these exact literals.
- **This bridge does not do this** — `bn.js` is on the protected-path table.

### Budget 2 — checkout preflight + `md2report.py` fix (PR 91's review)

- **Paths:** `docs/automation/mmsa-task-bridge-routine-prompt.md`,
  `tools/md2report.py`, two dated report files (PR 98); `tools/md2report.py`
  alone (PR 91's fix). Neither `tools/md2report.py` nor
  `docs/automation/` is on this bridge's protected-path table.
- **Size:** PR 91 — one functional fix (index-advancement guarantee in the
  paragraph scanner) plus 72 regenerated reports proven byte-identical to
  the un-patched generator's own output (2 pre-existing drift cases,
  independently confirmed against the original script as a control). PR 98
  — a documentation-only amendment to the bridge's own saved-prompt
  reference copy, plus a second, independently-found `md2report.py` defect
  (no fenced-code-block handling, flattening a report's own nested-fence
  section) fixed in the same PR.
- **Safe-CI implications:** both PRs' own CI runs are green
  (`Deterministic governance suites: success`). `verify.yml` itself already
  carries `fetch-depth: 0` (confirmed by reading the workflow file directly
  in this session) — the root cause PR 98 diagnosed for a *local sandbox's*
  narrow/shallow clone does not affect CI, which already fetches full
  history. PR 98's own preflight text is for the **task-bridge Routine's**
  saved prompt (a different, Owner-controlled document on claude.ai), not
  for `verify.yml`.
- **Independently reproduced defect, still open:** three separate PRs
  (116, 118, 119) hit the *same* `md2report.py` infinite loop
  (`#<digit>` with no following whitespace, e.g. a wrapped "PR 103"
  reference at the start of a line) that PR 91 already fixes. **91 is the
  fix; merging it removes a hazard that has now cost at least three
  sessions worked-around time.**
- **Recommendation:** merge PR 91 first (non-draft, CI green, no protected
  path, fixes a reproducing defect three other sessions independently hit).
  PR 98 can follow; it touches no application code and its only "shared"
  surface (the bridge's own saved Instructions on claude.ai) is explicitly
  **not** edited by the PR itself — it only prepares the paste text for an
  Owner-performed step.

### Budget 3 — Health ledger/nav link + branch merge order

- **Paths needed for a future *integration* (not requested here, and not
  done here):** `docs/governance/programme-integration-ledger.json`'s
  `streams.health` entry (currently `EXTERNAL_PENDING_ACQUISITION`, `null`
  branch — stale the moment 105/111/119/121 exist, as three of those PRs'
  own bodies already flag) and one line in `app/js/nav.js`'s existing
  Home ▾ dropdown (matching the `/legacy/`/`/legacy-v07/` link shape). Both
  are protected (governance; platform-shared respectively). **Not touched
  by this report or any PR reviewed** — every Health PR states this
  explicitly and none edits either file.
- **Branch merge order** for the four Health PRs, respecting their real
  stacking (§1): **105 → 111 → 119** is one line (foundation, then
  claim-provenance, then foods/diseases/ages); **105 → 121** is a second,
  independent line (foundation, then master categories) that does not
  depend on 111 or 119. Both lines share only 105 as a common ancestor.
  Recommended integration order: **105, then 111, then 121, then 119**
  (119 last because it is stacked on 111 and also re-verifies 105's and
  111's own governance-suite claims — merging it last means its
  re-verification runs against the most code, catching any drift the
  earlier three introduced).
- **A real, load-bearing finding surfaced independently by 105, 111, 119
  and 121, and confirmed in this session's own local run (§6):** two
  "pre-existing governance-suite failures" all four Health PRs originally
  reported (`programme-ledger-mutations.mjs`, `brief-integrity.mjs`) do
  **not** reproduce once the two HELD branches the ledger declares
  (`claude/pensive-knuth-2pu3jj`, `claude/phase4-wiring`) are actually
  fetched, and once the checkout is unshallowed. This is a checkout-shape
  artefact, not an application or tooling defect — both guards are correct
  as written. All seven suites ran 0-failed in this session (§6) after the
  same preflight.
- **Owner test:** not applicable to any of the four Health PRs individually
  — none is linked from shared nav, none is wired into any tenant/Firebase
  surface, all are isolated draft pages reachable only via local
  `node serve.js`. See §7.

---

## 5. E1 deployment package review (read-only — nothing deployed, nothing edited)

Read `docs/governance/phase4-6-production-deployment-package-2026-09-17.md`
in full.

- **Exact operator access required:** the Owner, signed into the Firebase
  Console, on the `study-monitoring` project (D1 — there is only one). The
  package is explicitly written for Console-only operation — "No coding, no
  command line." This sandbox has no path to that access: no `firebase` CLI
  on `PATH`, no `node_modules/firebase`, and every prior session that tried
  reports `Failed to authenticate` / 403 from the Rules API. **E1 remains
  CLOSED** per the ledger's own `deployment` block, checked directly in
  this session (§6's programme-ledger run reports `firestoreRules: NOT_DONE`
  and `blockedOn: "E1"`).
- **Index-before-Rules order:** the package is explicit and unambiguous —
  four composite indexes (on `notes`, `noteRevisions`, `noteSources`,
  `notePlacements`) must be created and read **Enabled** in the Console
  *before* the Rules are published, because publishing the Rules first
  would let new Note screens ask questions the database cannot yet answer.
  Publishing indexes first is safe because the collections stay locked
  (no Rule authorises them) regardless of index state.
- **Pre-deployment emulator proof already exists for the package as a
  whole:** the package's own §6 cites Phase 4 (53 assertions), Phase 5
  (60), Phase 6 (50), and the existing `ayahNotes` quick-note write, all
  run against the exact candidate file
  (`phase4-6-DEPLOYMENT-candidate-2026-09-17.rules`), plus 625 added / 0
  removed lines verified automatically and every helper shared with
  production checked byte-identical.
- **104's additional, narrower emulator proof** (§3 above) is a second,
  independent proof specific to the one function it fixes
  (`retirePermanentNote()`) — it supplements, does not replace, the
  package's own broader evidence, since `retirePermanentNote()`'s fixed
  shape post-dates the package's own 2026-09-17 date.
- **Rollback:** the package's own §3 step 1 — copy the current live rules
  into a local backup file before pasting the candidate, restore that file
  if step 4's owner-test checklist finds a regression.
- **Owner test (from the package itself, §4):** open Quran Study and a
  surah; open Note & more on an āyah, type and save (the important one —
  proves existing notes are unaffected); reload and reopen that note;
  open Records and Monitor; confirm all four indexes read Enabled and
  Rules show a new published version. **Nothing new should appear on
  screen** — the package deliberately only opens server-side authorisation;
  no client screen reads through it yet.
- **This report does not deploy or edit any Rule or index candidate**, per
  the bridge's own constraint. Both files reviewed above are unchanged by
  this PR.

---

## 6. Governance suite results (this session, full-history preflight, repository root)

```
1) node tools/i18n-verify/programme-ledger.mjs
==== Programme integration ledger: 8 passed, 23 noted, 0 failed ====

2) node tools/i18n-verify/programme-ledger-mutations.mjs
==== Programme ledger guard mutations: 49 passed, 0 failed ====

3) node tools/i18n-verify/brief-integrity.mjs
==== Standing brief integrity: 8 passed, 0 failed ====

4) node tools/i18n-verify/study-activity-evidence-boundary.mjs
==== Study Activity evidence boundary: 27 passed, 0 failed ====

5) node tools/i18n-verify/study-activity-evidence-boundary-mutations.mjs
==== Evidence boundary guard mutations: 11 passed, 0 failed ====

6) node tools/i18n-verify/study-event-wiring.mjs
==== Study event wiring (P4-D1 Reading, D2 Listening, D4 WbW): 41 passed, 0 failed ====

7) node tools/i18n-verify/rules-authorisation-executable.mjs
==== Rules authorisation executable: 38 passed, 0 failed ====
```

All seven exit 0. Numbers match every draft PR's own reported table exactly
— no drift on `main` since any of the fourteen PRs was cut. The
`programme-ledger.mjs` run's 23 "NOTE [E]" lines are the ledger's own
disclosed shared-file touches (13 AUTHORIZED, 7 DECLARED awaiting decision,
none undeclared) — an honest accounting, not a failure signal.

The ledger's `streams.health` entry still reads `integrationState:
EXTERNAL_PENDING_ACQUISITION`, `activeBranch: null` — confirmed directly in
this session, corroborating the staleness all four Health PRs already flag
in their own bodies (§4, budget 3). Not corrected here; `docs/governance/`
is protected.

---

## 7. Version allocation — proposed, held for Master Architect audit

Per `docs/governance/programme-integration-ledger.json`, `nextUnallocated`
is `08.32`, and its own note is explicit: this field is the unallocated
boundary, not a reservation, and no stream may stamp it without Master
Architect authorisation. **Nothing in this report or in any of the
fourteen PRs reviewed bumps `app/js/version.js`.**

Proposed allocation, **for Master Architect decision only — not applied
anywhere:**

- **`v08.32`** — the Word Card lemma-occurrences toggle (PR 112). This is
  the one PR in the whole set that changes live, reachable, on-`main`
  behaviour (`app/quranrevival.html`, `app/js/quran-word-card.js`) with no
  Firestore write, no Rule/index dependency, and CI green. Every other
  PR in this set is either report-only, an unwired/unreachable pure module,
  or an isolated unlinked Health Atlas surface — none of them changes what
  a signed-in reader on `main` can currently do, so none needs a version of
  its own by this repository's own "version bumps on a feature round"
  convention.
- Everything else reviewed here (91, 98, 103/116/118/122, 104/110/120,
  105/111/119/121) is either documentation, an unreachable pure module, or
  an unwired standalone page — **no version allocation is proposed for
  any of them**, matching what each PR's own body already states.

---

## 8. Owner app test required: **NO**

None of the fourteen PRs reviewed is merged to `main`, and `main` itself is
unchanged by this task. Concretely, for the Owner's own live app at the
GitHub Pages URL: nothing to click, because nothing here is being asked to
be clicked yet. If and when the Master Architect authorises an integration
sequence from §2–§4, the exact owner-test steps already exist and do not
need to be re-derived:

- **Word Card (PR 112, if allocated `v08.32` per §7):** open any word with
  word-by-word on, switch to the Basic Arabic tab, press the lemma-occurrence
  count line, confirm it expands to a jump-list and each entry navigates.
- **Hadith Explore (PR 122, if merged):** open the Hadith module's Explore
  tab, confirm "Translation coverage" and "Topic coverage" sections both
  render (English until `bn.js`'s seven keys are added, per budget 1).
- **Note Foundation (PRs 104/120, if merged):** no owner-visible surface —
  both are unreachable pure data-layer functions today (confirmed by each
  PR's own boundary-guard reachability walk); nothing to test until a Note
  editor surface is built and E1 opens.
- **Health Atlas (PRs 105/111/119/121, if merged):** no owner-visible
  surface — none is linked from shared nav; each needs local
  `node serve.js` to view at all.
- **Firestore Rules/index deployment (§5):** the package's own six-step
  checklist, reproduced in full above.

---

## 9. What was deliberately not done, and why

- **No shared/protected path edited.** `app/js/version.js`, `CLAUDE.md`,
  `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`, the six named
  `tools/i18n-verify/` tooling files, everything under
  `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, and `.github/workflows/`
  — none modified by this PR. Budgets 1 and 3 (§4) both name a
  protected-path edit a future round will need; neither is made here.
- **No merge performed.** All fourteen PRs were read, not touched, closed,
  or force-pushed.
- **No version allocated or bumped.** §7 is a proposal for Master Architect
  decision, not an application to `app/js/version.js`.
- **Nothing deployed.** §5 reviews the E1 package; it does not paste
  anything into the Firebase Console, and no Rule or index candidate file
  was edited.
- **`tools/md2report.py`'s reproducing infinite-loop defect was not fixed
  a second time** — PR 91 already fixes it; this report's own prose was
  written to avoid triggering it (no line begins with `#` immediately
  followed by a digit).
- **PR 91's fix was not re-verified by re-running its own 72-report
  regeneration** — its CI is already green and its own report documents
  that check; re-doing it would duplicate evidence without adding any.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
