# Hadith issue #114 — Books-path Gate A/B: "View in source" navigation (2026-09-21)

Session date/time: 2026-09-21, read off the sandbox clock in UTC (`date -u`),
per this round's own instruction not to use PC local time.

## 0. Scope of this round

Triggering comment: issue #114, comment `5759213612` (`/mmsa-task HADITH
CONTINUATION`). It asked, in order: a full-history plus both ledger-declared
HELD remote-ref preflight; a Gate A search for the next genuinely unfinished,
independently buildable Hadith-owned slice in the **Books** (collection →
book → chapter → occurrence) reader path that does not overlap draft PR
#130's Topics navigation; and, if such a slice exists, a Gate B bounded
implementation stacked cleanly on #130, with browser evidence and all twelve
suites (five Hadith, seven governance).

## 1. Preflight

- `git fetch origin --prune` (no `--depth`, so this is the repository's full
  history, not a shallow one) brought in all **97** remote branches.
- The two ledger-declared HELD/standing-instruction commits both resolve
  locally as real commits:
  - `claude/phase4-wiring` at `7e2931f795af1cd97efc1167660cea93aa22b9ab`
    (`quran-phase4-wiring`'s `branchTip` in the Programme Integration Ledger).
  - The Hadith stream's own recorded `branchTip`,
    `43dd96f58eeee5ad33dc82bb4e260660e3c290c9` (the commit at which Hadith
    reached `main`, per the ledger's `hadith` entry).
- `main` is at `16cfb0b` (v08.32, the QuranRevival Word Card lemma-occurrence
  release plus Health Atlas tranche 5, per `app/js/version.js` and
  `CLAUDE.md`'s own current-milestone line).
- Draft PR #130's own head, `d926e80cb0660cdb68f8935374f719817ba15772`,
  resolves and is a real commit, confirmed by `git branch -a --contains
  d926e80` naming exactly the one branch that carries it
  (`claude/laughing-goodall-timq4k`).
- `git merge-base origin/main d926e80` is `7abc277877eeb71a3042f963610c79496b379238`.
  `main` has 16 commits past that point (the v08.32 Word Card allocation and
  the Health Atlas tranche-5 combined candidate); `git diff` of that range
  against every Hadith-owned path (`app/hadith-*.html`, `app/css/hadith.css`,
  `app/js/hadith-*.js`, `tools/i18n-verify/hadith-*.mjs`,
  `docs/governance/hadith-*`, `docs/reports/*-hadith-*`) is **empty** — main's
  advance since #130 branched touches no Hadith path at all, so building
  stacked directly on #130's head, as instructed, carries no hidden conflict
  risk against current `main`.
- This session's designated branch was reset to `d926e80` (PR #130's own
  head) rather than to `main`, precisely to be "stacked cleanly on #130" as
  asked, rather than merged with it later.

## 2. Gate A — what is genuinely unfinished in the Books path

Read `app/js/hadith-corpus.js`, `app/js/hadith-browser.js` and
`app/js/hadith-fixture-data.js` in full, and the topic-navigation report
(`docs/reports/2026-09-20-hadith-topic-navigation.md`) #130 itself carries.

**The Books reader — Collections tab: edition → book → chapter → occurrence —
is already fully built and tested** (`renderCollections()`,
`booksOf()`/`chaptersOf()`/`occurrencesIn()`, the "no chapter level" shape for
Collection Beta, the breadcrumb). Re-building any part of "select a book, see
its chapters, open a synthetic record" would duplicate existing, already
`GATE`/`NAVIGATION`-checked work — not a genuine gap.

**The real gap is a one-way street.** A narration reached through the
**Topics** index (`renderTopic()`) or **Search** (`renderSearch()`) renders
the identical `occurrenceCard()` component the Books tab uses — same Arabic
text, same id, same external references — but nothing on that card lets a
reader go see it *in its actual book and chapter*. The Topic view's own copy
already says "This is an index across collections. It does not change any
book" (`hadith-topic-meta`), which is correct, but there is no way to act on
that sentence: an index that describes a book you cannot reach is half a
bridge. The same asymmetry applies to a **repeat occurrence**: the card names
its original (`t("Repeat occurrence of {id}")`) as inert text with no way to
go look at it.

Grepped to confirm nothing already covers this
(`tools/i18n-verify/hadith-*.mjs`, `app/js/hadith-browser.js`): no
`viewInSource`/`jumpTo`/`hadithViewSource`-shaped identifier existed anywhere
before this round.

### Declared acceptance criteria, budget and boundaries (before writing code)

- **Acceptance.** Any occurrence card rendered *outside* its own book/chapter
  context (Topic view, Search results) gains a "View in source" control that
  switches to the Collections tab, opens the occurrence's real
  edition/book/chapter, and visibly marks which card is the one just jumped
  to. A repeat badge becomes the same kind of control, targeting the
  *original* occurrence. The Collections tab itself never grows a
  self-referential copy of the control (the occurrence is already in its own
  context there).
- **Data identity.** Only already-existing internal fixture ids
  (`occurrenceId`, `bookChapterId`, `editionId`, all already used throughout
  `hadith-browser.js`/`hadith-corpus.js`) are read, via the existing
  `sourcePathOf()` export. **No new id, no permanent Hadith unit key, no
  `hadith:` key literal, is built anywhere** — verified by both the
  pre-existing `GATE` checks (which scan the whole module for
  `buildUnitKey`/`hadith:` and already re-ran clean against this change) and
  a new check that isolates `jumpToSource()`'s own body.
- **Provenance/rights.** Nothing here touches which editions/topics exist or
  what they say; it is pure client-side navigation over the already-synthetic
  fixture. No real corpus, no rights claim, is introduced or implied.
- **Ownership boundary.** Every changed file
  (`app/js/hadith-browser.js`, `app/css/hadith.css`,
  `tools/i18n-verify/hadith-corpus.mjs`) is inside the ledger's own
  `hadith.ownedPaths`. Nothing shared or protected is touched: `bn.js`,
  `nav.js`, `version.js`, the ledger, `firestore.rules`/indexes, and
  `CLAUDE.md`/`CHANGELOG.md` are all untouched (confirmed by `git status`
  below).
- **Security.** No Firestore, no write path, no new persistence of any kind
  — this is a rendering-only change, and the pre-existing "GATE -- no Hadith
  module can reach Firestore or a write path" check re-ran clean.
- **Rollback.** A pure revert of the three changed files removes the feature
  completely; nothing else references the new function or CSS classes.
- **Independence from #130.** #130's own diff is Topics-tab *navigation
  between topics* (`state.topicId`, the topic list/detail flow) and the two
  Explore coverage sections. This round's diff is a *bridge out of* the topic
  detail view (and out of Search) *into* the Books view — a different
  surface, touching different functions in the same file, with no shared
  identifiers. Confirmed structurally: this round adds two new private
  functions (`jumpToSource`, `focusPendingOccurrence`), extends
  `occurrenceCard()`'s signature with a new, backward-compatible optional
  4th parameter, and changes three call sites in `renderTopic`/`renderSearch`
  /`renderOccurrenceList` — none of which #130 itself touches.

## 3. Gate B — what was built

**`app/js/hadith-browser.js`**
- `jumpToSource(state, render, occurrenceId)` — resolves the destination via
  `sourcePathOf()` (already imported), sets `state.view = "collections"` and
  the edition/book/chapter, records `state.focusOccurrenceId`, and re-renders.
- `focusPendingOccurrence(body, state)` — called once at the end of every
  `render()`; when the just-rendered view is Collections and a focus target
  is pending, it adds a `.hadith-card-focused` class and a
  `data-hadith-focused="true"` marker to that exact card, scrolls it into
  view, and clears the pending marker — a one-shot landing highlight, not a
  sticky selection state (proven by the browser evidence below: a later,
  unrelated render drops the highlight).
- `occurrenceCard()` gained one new, optional, default-`false` parameter,
  `{ showSourceLink }`. Only `renderTopic()` and `renderSearch()` pass
  `{ showSourceLink: true }`; the Collections tab's own
  `renderOccurrenceList()` does not, so it never renders a self-referential
  control.
- The repeat badge (`.hadith-card-repeat`) changed from an inert `<span>` to
  a `<button>` wired to `jumpToSource(state, render,
  occurrence.repeatOfOccurrenceId)` — it now takes a reader to the *original*
  occurrence, not the repeat itself.

**`app/css/hadith.css`** — `.hadith-view-source` (styled as an inline text
link, matching the existing `.hadith-crumb`/`.hadith-commentary-link`
convention already used elsewhere in this exact component, not a new chrome
button) and `.hadith-card-focused` (a 3px outline marking the landing card).

**`tools/i18n-verify/hadith-corpus.mjs`** — six new, mutation-proven checks
under a new "SOURCE NAVIGATION" section (50 → 56 passing in that suite):
resolving only through `sourcePathOf()` and reaching no persistence/unit-key
token; the Collections tab never receiving `showSourceLink: true`; both
Topic and Search requesting it; the repeat badge targeting the *original*
id, not its own; "View in source" targeting the card's *own* occurrence, not
a hardcoded one; and exactly one new English literal, going through `t()`.
Each of the six checks was mutation-tested by hand (temporarily breaking the
exact fact it asserts, confirming the check fails, then restoring the file)
before being counted as proven — see the transcript; all four attempted
mutations were caught, none passed silently.

### One new English literal, verbatim handoff for MMSA/`bn.js`

`bn.js` is untouched (protected path). The single new string, for whenever
MMSA next does a coordinated `bn.js` addition:

| English | Used as |
|---|---|
| `"View in source"` | The Topic/Search "jump to the Books view" control's own label |

(`"Repeat occurrence of {id}"` already existed and needed no new key — the
repeat badge is a new *button*, not new *text*.)

Confirmed by Playwright: in Bangla mode the control reads the honest English
fallback verbatim, `"View in source"` — not blank, not a broken key, not
invented Bangla.

## 4. Governance suites

All seven, from the repository root, after the preflight above:

| Suite | Result |
|---|---|
| `programme-ledger` | 7 passed, 23 noted, **1 failed** (see below) |
| `programme-ledger-mutations` | 48 passed, **1 failed** (same root cause) |
| `brief-integrity` | 7 passed, **1 failed** (same root cause) |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

**The three failures are one and the same finding, and it is a baseline
artefact of stacking on #130 as instructed — not a defect in this round's
Hadith-owned diff, and not fixable from here.** All three say the same
thing in different words: `docs/governance/programme-integration-ledger.json`
and `CLAUDE.md`, as they exist **on PR #130's own branch** (which this round
is built directly on top of, per this round's own instruction to stack
cleanly on #130), still record `main` at v08.31 — because #130 was branched
before the separate, Quran-side v08.32 Word Card release landed on `main`.
`app/js/version.js` on real `origin/main` now reads `08.32`. Confirmed with a
throwaway `git worktree` against a **clean, unmodified `origin/main`**
checkout: all three suites pass there with **0 failures** (8/23/0, 49/0,
8/0) — proving the failure is purely "this branch's copy of two shared,
protected files is one Quran release behind `main`", not anything this
round touched. Neither file is in this round's diff, and neither is one this
routine is permitted to edit (`CLAUDE.md` and
`docs/governance/programme-integration-ledger.json` are both on the
protected/shared list). This will clear itself the normal way: when #130
(and this round's PR, stacked on it) are eventually rebased onto `main` for
integration, both files come from `main`'s own current copies. **This is the
same class of coordination point comment `5754208941` on this issue already
named** ("rebase and merge only after v08.32 is on main").

Five Hadith suites, same preflight:

| Suite | Result |
|---|---|
| `hadith-corpus.mjs` | **56 passed, 0 failed** (50 baseline + 6 new SOURCE NAV checks) |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |

## 5. Browser evidence — obtained, not recipe-given

Playwright (global install, `/opt/pw-browsers` Chromium) against
`serve.js` on `localhost:8080`, `app/hadith-collections.html`, in **both**
English and Bangla (`localStorage.mm_app_lang` set before load, the same key
`prefs.js` itself reads). **44 of 44 checks passed, 22 per language**:

- Topics → "View in source" on a chapter-mapped occurrence (`syn-occ-0003`,
  reached only via `synthetic-topic-salah`'s chapter mapping) really
  switches the active tab to Collections, the breadcrumb reflects the real
  book/chapter, and the destination card is highlighted and marked —
  confirmed by reading the live DOM's class list and dataset, not by
  assuming the click succeeded.
- The highlight is proven **one-shot**: after a later, unrelated render
  (changing a Track select on a different card), the same card's class list
  no longer carries `hadith-card-focused`.
- The repeat badge for `syn-occ-0006` is a real `<button>` (tag name read
  from the live DOM); clicking it highlights `syn-occ-0005` (the original)
  and leaves `syn-occ-0006` itself unhighlighted.
- Search for "prayer" produces hits carrying the same control, and clicking
  one performs the identical jump.
- The Collections tab itself never renders the control at all (count == 0).
- Regression: Explore's topic-coverage and translation-coverage sections
  (PR #130's own features) still render, under their own already-split
  dataset attributes.
- Zero page errors in either language.

## 6. Owner app test

**NO.** This candidate exists only on this session's own branch — not on
`main`, not served by GitHub Pages. When it is eventually integrated (after
#130, per the dependency order below), the exact test would be:

- URL: `https://madrasatul-muslimeen.github.io/app/hadith-study.html` (the
  live-linked entry point; `hadith-collections.html` also works standalone).
- Role/sign-in: none needed — the corpus section needs no sign-in and writes
  nothing.
- Steps: open Hadith → Topics tab → open "Ṣalāh" → press "View in source" on
  any narration → confirm the Collections tab opens on the correct
  book/chapter with that narration outlined; separately, find a narration
  marked "Repeat occurrence of syn-occ-0005" and press it → confirm it jumps
  to and outlines the original.
- Expected result: the app never shows a raw "hadithViewSource" or
  navigates nowhere; the outlined narration's Arabic text should read
  identically to the one just left.

## 7. Dependency / integration order

1. Draft PR #130 (`translationCoverage()` + `topicCoverage()` + Topics-tab
   navigation) — unmerged, unchanged by this round.
2. This round's PR — stacked directly on #130's head (`d926e80`), so it
   rebases forward with #130 rather than needing its own separate merge
   base.
3. MMSA `bn.js` coordination for the combined key set (#130's seven keys
   plus this round's one, eight total) — a Master Architect / MMSA decision,
   not performed here.
4. Rebase onto `main` once `main` is v08.32 or later (it already is) —
   this is what will also clear the three baseline-staleness governance
   findings in §4, since the rebase picks up `main`'s own current
   `CLAUDE.md`/ledger copies.

## 8. An aside, investigated but out of this round's scope

Comment `5754208941` on this issue asked, among other things, for an audit
of a previously-claimed `tools/md2report.py` "hang" on a line starting with
`#` immediately followed by a digit (e.g. a wrapped `PR #103` reference), a
finding three different prior sessions on this issue (`5752491463`,
`5752593637`, `5752773563`) each said they had independently reproduced.
While preparing this report, a minimal two-line reproduction of exactly that
shape (`"Follow up draft PR\n#103."`) was run against the tool with a 5-second
timeout: **it exits 0 in well under a second, no hang.** Reading the tool's
own history shows why the current code cannot loop on this input — an
earlier, unrelated infinite-loop fix (`7dbdf9b`, "fix an infinite loop in
md2report.py") already added the paragraph scanner's "the index must always
advance" fallback, which independently also covers a bare `#`-prefixed
line with no following space. This is recorded here as a correction, not
chased further (`tools/md2report.py` is shared tooling, and re-litigating a
different session's finding is not this round's Gate A/B task) — a repeated
claim across several session reports is still worth one direct test before
being carried forward again.

## 9. Deliberately not done

- `bn.js` not extended (one-key handoff given above instead).
- No merge, no deploy, no Rules/index change, no version bump
  (`v08.32` stays the allocated version; nothing here needed a new one).
- `docs/governance/programme-integration-ledger.json` and `CLAUDE.md` not
  touched, despite both showing a stale `main` version on this branch — that
  staleness is inherited from #130's own base and is not this round's to fix
  (protected paths; will clear at the rebase in §7).
- PRs #103, #116, #118, #122, #125 and #130 left open and untouched.
- The `tools/md2report.py` "hang" was tested, not fixed and not re-reported
  as confirmed (§8) — the shared tool itself was not touched.
