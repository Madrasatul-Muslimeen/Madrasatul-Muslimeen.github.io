# Hadith: independent Gate A repeat of PR #150, its report's own HTML/Markdown mismatch repaired, and a genuine Books/chapters accessibility defect found and fixed (row headings with no `lang`/`dir`)

**Date:** 2026-09-21 (UTC) **Trigger:** MMSA bridge task following up issue #114 (previous task `5762929828`, completed in draft PR #150, head `00713f18`) **Branch:** `claude/hadith-books-next-01`, built directly on PR #150's own head (`00713f18d81035016b9bb1e897f90bd55f6204c7`), itself stacked on PR #149's head (`84e2c46d`) → PR #147's head (`fa9444a6`) → PR #144's head (`466dc313`) → PR #143's head (`34c3fcd5`) **Base:** `main` at `16cfb0b3` (v08.32, re-verified live via `git ls-remote origin main` immediately before this report, unchanged since the task began)

## 0. Scope of this task

Four things, in order: (1) verify current `main`/version, the Hadith source-rights and synthetic-corpus contracts, issue #123's ledger, and PR #150's exact head/base/diff/CI, independently rather than trusting the task text's own account of them; (2) Gate A — independently re-run PR #150's own committed 47-check English/Bangla browser suite from its actual head, including real keyboard Tab focus and Search→source query/result continuity, and confirm reverting the fix fails the named checks; (3) repair PR #150's dated HTML report so its fenced/raw content faithfully matches the Markdown, inspecting the pair rather than the filenames; (4) Gate B — investigate ONE independent Books/chapters reader-usability issue, implementing a fix only behind a committed, mutation-proven, real-browser regression test in both languages, and derive the eight Bangla `t()` keys again without touching `bn.js`. Then run five Hadith suites and seven governance suites after a genuine full-history/ref preflight, and report PR #150's actual CI state separately from these local runs.

## 1. Verification: state, contracts, the stack's real heads, and PR #150's CI

`origin/main` is `16cfb0b3512609313a68d487dca28945a31855b8` at **v08.32** (`app/js/version.js` reads `APP_VERSION = "08.32"` — the file's own header comment is stale, per this repository's own documented drift class; the constant is the single source of truth, not the comment). Re-checked with `git ls-remote origin main` at the end of this task too: unmoved.

The stack, read live via `mcp__github__pull_request_read`, not assumed from the task text:

| PR | Base | Base head | Own head | State |
|---|---|---|---|---|
| #143 | `main` | `16cfb0b3` | `34c3fcd5` | draft, open |
| #144 | `claude/laughing-goodall-4dhs97` (#143) | `34c3fcd5` | `466dc313` | draft, open |
| #147 | `claude/laughing-goodall-iacemr` (#144) | `466dc313` | `fa9444a6` | draft, open |
| #149 | `claude/laughing-goodall-k8z5yh` (#147) | `fa9444a6` | `84e2c46d` | draft, open |
| #150 | `claude/laughing-goodall-te0yu5` (#149) | `84e2c46d` | `00713f18` | draft, open, **mergeable: clean** |

This matches the task's own account exactly, confirmed rather than re-quoted. PR #150's diff (`pull_request_read` → `get_diff`) is exactly the two files its own body describes: `app/js/hadith-browser.js` (+18/−1) and the new dated report pair (`docs/reports/2026-09-21-hadith-issue114-tab-switch-focus.{md,html}`), plus the 44-line addition to `tools/i18n-verify/hadith-source-navigation-browser.mjs` — 4 files, +321/−1, matching the PR summary's own numbers.

**PR #150's CI, read via `pull_request_read` → `get_check_runs` and `get_status` against head `00713f18`: zero check runs, status `pending` with zero individual statuses.** No CI has ever run against this head — not a failure, an absence, consistent with PR #150's own report ("no CI run is recorded against this round's own head at report time") and every other PR in this stack, none of which trigger a workflow run in this environment before a human interaction on GitHub.

Issue #123 ("MMSA shared integration readiness for MAP v4, Hadith and Health") is a separate, broader platform-coordination thread — its own scope (draft PRs #91/#98/#104/#110/#112/#120/#122, Health #105/#111/#119/#121, E1 Rules/index evidence) does not name or overlap this task's PR stack (#130/#141/#143/#144/#147/#149/#150), and nothing in it fires an independent trigger relevant here. Read, not acted on.

The Hadith source-rights and synthetic-namespace contracts (`docs/reports/2026-09-18-hadith-h0-*`, `...-h1-*`, and `CLAUDE.md`'s own Hadith section) were re-read: the two-prefix synthetic namespace (`synthetic-` on collection/edition/book/chapter/topic ids, `syn-occ-`/`syn-map-` on occurrence/mapping ids) and the three-state rights model (`blocked`/`link-only`/…) are unchanged by this round — verified below by re-running `hadith-corpus.mjs` and `hadith-source-rights.mjs` unmodified.

## 2. Gate A — independent re-run of PR #150's own 47-check suite, from its actual head

Checked out `claude/laughing-goodall-rjhnzm` at `00713f18` (PR #150's real head, not a re-read of its report), served locally, and ran `tools/i18n-verify/hadith-source-navigation-browser.mjs` **unmodified** in both languages:

- English: **47 passed, 0 failed**
- Bangla: **47 passed, 0 failed**

Both match PR #150's own claimed numbers exactly, independently reproduced rather than re-quoted — including the two focus-specific classes the task named by name:

- **Real keyboard Tab focus**: `page.keyboard.press("Tab")` (a genuine keyboard event, not a DOM property read) after picking an edition lands on the first book row; verified this is a *real* key event, not a click substitute, by reading the suite's own source rather than trusting its check name.
- **Search→source query/result continuity**: searching "Prayer", pressing "View in source", and clicking back to the Search tab keeps the identical query text and result count (`page.inputValue("#hadithSearchInput") === "Prayer"` and a non-zero result count), while focus lands on the Search tab button rather than `<body>` — proving the earlier gap was really about focus, not about data loss.

**Mutation-proven, per the task's own instruction — revert and confirm the named checks fail, then restore.** Swapped `app/js/hadith-browser.js` for its content at commit `84e2c46` (PR #150's own base, i.e. the file exactly as it stood before PR #150's fix), re-ran the suite:

- **43 passed, 4 failed** — and the 4 failures are *exactly* PR #150's own four new checks (Search tab switch, Search-after-jump, Collections tab switch, Explore tab switch); the fifth check PR #150 added ("keeps the same query and results") correctly stayed green even reverted, since that one asserts state persistence, which the reverted code never touched.

Restored the file to PR #150's own committed content (`diff` against the original showed no residual change) and re-confirmed **47/47 in both languages**.

## 3. Repair of PR #150's dated HTML report

Read the pair — `docs/reports/2026-09-21-hadith-issue114-tab-switch-focus.md` and its `.html` twin — and inspected them as a pair rather than trusting the filenames match. **Real mismatch found**: the Markdown's one fenced code block (§"Fix" — the `focusActiveTab()` function body) had been converted into a single garbled `<p>` element:

```
<p>``<code>js function focusActiveTab() {   const btn = document.querySelector(&quot;.hadith-tab.active&quot;);   if (btn) btn.focus({ preventScroll: true }); } </code>``</p>
```

Literal backticks were left as visible text, the ```js` fence-language marker was folded into the code itself as plain prose, and every newline/indentation in the four-line function body was collapsed to single spaces on one line — so the "raw source" the HTML purports to show a reader is not what the Markdown's own fence actually contains, byte-for-byte or even structurally. **The file's own `<style>` block confirmed why**: unlike this project's other dated HTML reports (e.g. `2026-09-21-hadith-issue114-gate-a-edition-crumb-announcement.html`, which defines `pre { background:var(--code); padding:.8em 1em; border-radius:.5em; overflow-x:auto }` and `pre code { padding:0 }`), this file's `<style>` block had **no `pre` rule at all** — the code-fence-to-HTML step for this one report both dropped the styling rule and mangled the content, rather than emitting a real `<pre><code>` block.

**Fixed**: added the same `pre`/`pre code` rules this project's other reports already carry (in the same relative position, after the inline `code` rule), and replaced the garbled paragraph with a real `<pre><code>` block containing the function body exactly as the Markdown fences it — same four lines, same two-space indentation, no literal backticks left as text. Sanity-checked the whole file afterward: heading counts (`<h2>`×15, `<h3>`×2) match the Markdown's `##`/`###` counts exactly, and every HTML tag family in the file (`p`/`table`/`tr`/`td`/`th`/`pre`/`code`/`ul`/`ol`/`li`/`div`) has matched open/close counts. No other fenced or raw-output block exists in that report to check — this was the only one.

**This is the report's own accidental defect, not a Hadith content or governance issue** — the Markdown itself was always correct; only its HTML twin's rendering of one code block was wrong, and it is corrected here as an edit to that Hadith-owned report file, not to any `docs/governance/` file.

## 4. Gate B — an independent Books/chapters reader-usability defect

**What was ruled out first, and how.** Before looking for something new, the Collections (Books/chapters) tab's existing focus/breadcrumb/current-location machinery — the subject of PRs #144/#147/#149/#150 — was independently re-probed rather than assumed correct because the suite says so:

- Real `Tab`+`Enter` keyboard navigation (not clicks) through edition → book → chapter, at every level, lands focus on the breadcrumb's own current-location crumb and the very next real `Tab` press continues at the next list's first row — reproduced live with throwaway probes at the book-pick and chapter-pick steps, neither of which PR #150's own suite exercises with a *second* real `Tab` press (it only exercises the first, at edition level); both came back correct.
- The programmatic `.focus()` calls in `focusCollectionsLanding()` do **not** trigger `:focus-visible` styling when the preceding interaction was a mouse click (`getComputedStyle(el).outlineWidth === "0px"`) but **do** trigger it correctly when the preceding interaction is real keyboard input (`Tab`+`Enter`) — this is correct, intentional browser behaviour (the `:focus-visible` heuristic tracks input modality, not focus origin), not a defect, confirmed by comparing both paths live rather than assuming either was wrong.
- Every breadcrumb reset path (Collections crumb full reset; one-level-back via the immediate-parent crumb, located by position rather than a fixed index) was re-walked and behaves exactly as PR #150's own suite already proves.

**What was found instead, live, in the rendered page rather than by reading the code first.** Every book and chapter row in the Collections list carries the source edition's own native-script heading (`rawHeading`, e.g. "كتاب البداية" — real Arabic text from the existing synthetic fixture, nothing invented) beside its translated title. Reading the *rendered* DOM:

| Surface | `lang` | `dir` | `getComputedStyle().direction` |
|---|---|---|---|
| A book row's native-script heading (`.hadith-row-heading`) | `null` | `null` | `"rtl"` |
| A chapter row's native-script heading | `null` | `null` | `"rtl"` |
| *Contrast* — the occurrence card's own Arabic source paragraph (`.hadith-arabic`) | `"ar"` | `"rtl"` | `"rtl"` |

**The computed direction was already correct before any fix**, because the Unicode Bidi Algorithm auto-detects a run of pure Arabic characters and renders it right-to-left regardless of the `dir` attribute — which is exactly why a sighted, mouse-only check (or a screenshot) would never catch this: the heading *looks* right. But `lang` has no such fallback. Every **other** native-script surface this same component renders — the occurrence card's Arabic source paragraph, the isnad when the reader's content language is Arabic, the commentary panel's Arabic work-title span, the commentary panel's own Arabic sub-heading — already stamps `lang`/`dir` explicitly; only the two Books/chapters row-heading call sites did not. A screen reader encountering an unmarked heading reads it using the page's UI-language voice and pronunciation rules (English or Bangla), mispronouncing every book and chapter heading in the list — on every edition, at both the book and chapter level, every single time a Books/chapters reader uses one.

**Fix**: one small helper, `rawHeadingSpan()`, replacing the two inline `el("span", "hadith-row-heading", …)` call sites (book list, chapter list) with a version that stamps `lang = SOURCE_LANGUAGE` (`"ar"`, the module's own already-imported constant — not a second hardcoded literal) and `dir = "rtl"`, matching this file's own established pattern for every other Arabic-script text node it renders. **Zero new translatable strings** — the fix touches only two DOM attributes on existing, already-rendered text; nothing about breadcrumb ancestry, current-location semantics (`aria-current`), or keyboard focus handling is touched.

**Tests**: 3 new checks added to `tools/i18n-verify/hadith-source-navigation-browser.mjs` — a book row's heading and a chapter row's heading (both on the chapter-level `synthetic-alpha-ar-v1` edition) and a book row's heading on the no-chapter-level `synthetic-beta-ar-v1` edition (proving the one shared helper function fixes both call sites and both edition shapes, rather than needing edition-specific handling).

- English: **50 passed, 0 failed** (47 pre-existing + 3 new)
- Bangla: **50 passed, 0 failed**

**Mutation-proven**: reverted `app/js/hadith-browser.js` to its exact content at PR #150's own head (`00713f18`, i.e. immediately before this round's fix — `diff` against that commit's own copy of the file showed only the fix's own hunk, nothing else), re-ran the suite: **47 passed, 3 failed** — exactly the three new checks, nothing else regressed in either direction. Restored the fix (`diff` against the fixed copy showed zero difference afterward) and re-confirmed **50/50 in both languages**.

**No multi-edition case was invented.** Both editions probed (`synthetic-alpha-ar-v1`, `synthetic-beta-ar-v1`) already exist in the committed fixture; nothing was added to `hadith-fixture-data.js`.

## 5. Eight-key Bangla handoff — independently re-derived

Extracted every distinct `t("…")` / `t(`…`)` literal in `app/js/hadith-browser.js` by a direct regex scan of the source (not read off any prior report) and diffed each against `app/js/i18n/bn.js`. **56 distinct literal keys found this way** (a prior round on this thread reported 60; the discrepancy was not chased further, since it does not change which keys are missing — this is recorded honestly rather than silently reconciled to match an earlier number). **Exactly eight** are absent from `bn.js`, character-for-character identical to every prior round on this thread and to this fix's own zero-new-string claim (§4):

1. `"View in source"`
2. `"Translation coverage"`
3. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
4. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
5. `"{en} of {n} have English, {bn} of {n} have Bangla."`
6. `"Topic coverage"`
7. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
8. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

`bn.js` (shared/protected) was not opened for editing. The Bangla browser run in §4 confirms all eight still print verbatim in Bangla mode — honest fallback, never blank, never presented as translated.

## 6. All twelve suites — full-history preflight, final state (this round's branch)

`git fetch --unshallow` run first (`git rev-parse --is-shallow-repository` → `false` afterward); both ledger-named commits confirmed present as real objects rather than assumed from the ledger's own text: `7e2931f795af1cd97efc1167660cea93aa22b9ab` (the held `claude/phase4-wiring` tip) and `43dd96f58eeee5ad33dc82bb4e260660e3c290c9` (the Hadith stream's own recorded branch tip).

| Hadith suite | Result |
|---|---|
| `hadith-corpus` | 60 passed, 0 failed |
| `hadith-commentary-binding` | 14 passed, 0 failed |
| `hadith-source-rights` | 14 passed, 0 failed |
| `hadith-governing-contracts` | 14 passed, 0 failed |
| `hadith-gate-contracts` | 11 passed, 0 failed |
| `hadith-source-navigation-browser` (en/bn) | **50/50 passed, 0 failed** (47 pre-existing + 3 new, §4) |

| Governance suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

**These are local suite runs on this branch's own checkout, not CI.** PR #150's actual GitHub CI state (§1) is reported separately and is not conflated with these numbers: zero check runs recorded against `00713f18`, status `pending` with no individual statuses — an absence of any run, not a pass or a fail.

`programme-ledger`'s own "20 shared-file touch record(s): 13 AUTHORIZED, 7 DECLARED" reflects the ledger's *current* state on `main` (it has grown since PR #150's own report, which read 12 records) — read live, not re-quoted from an earlier round.

## 7. Boundaries preserved

Changed files, `git status --short` on this branch: `app/js/hadith-browser.js` (Gate B fix), `tools/i18n-verify/hadith-source-navigation-browser.mjs` (Gate A/B tests), `docs/reports/2026-09-21-hadith-issue114-tab-switch-focus.html` (§3 repair) — all Hadith-owned. This report's own two files are new. Every path in the bridge's protected/shared table was confirmed untouched by this round's own diff: `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, the six protected tooling files, `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/`.

No new persistent id, no Rules/index candidate, no Firestore write, no version bump, no merge, no deploy, no repository setting change, no review approval claimed or requested. `firestore.rules` and `firebase.json` untouched — Hadith collections remain unruled by design (demo/preview only, per `renderTrack()`'s own on-screen notice).

## Dependency / integration order

1. Draft PR #130, PR #141 (unchanged; still open).
2. Draft PR #143 → #144 → #147 → #149 (unchanged by this round).
3. Draft PR #150 (unchanged by this round — this round's own report repair in §3 is a NEW commit on a NEW branch stacked on top of #150's head, not an edit to PR #150 itself).
4. This round's own PR, stacked on PR #150's head (`00713f18`) — no further rebase needed at integration time.

## Central version / translation gates

**No version bump.** `app/js/version.js` untouched; `v08.32` remains the current `main` milestone; version allocation is the Master Architect's, and this round needs none. **No shared translation file touched** — `bn.js` stays exactly as PR #150 left it; the eight-key handoff (§5) is unchanged in count and content from every prior round on this thread.

## Owner app test required

**NO — not yet, and not from this round alone.** This branch exists only stacked on six unmerged PRs (#130/#141/#143/#144/#147/#149/#150); nothing here is reachable from the served app until the whole stack is integrated. When it is, in addition to the keyboard-focus check PR #150's own report already describes, the Owner can independently confirm this round's own fix with a screen reader (or by inspecting the accessibility tree): sign in at `https://madrasatul-muslimeen.github.io/app/hadith-collections.html` (or the `?mount=quranrevival` route), open Collections, pick any edition, and read a book or chapter row's Arabic heading (e.g. "كتاب البداية") with a screen reader turned on — expected: it is announced in Arabic pronunciation, not read letter-by-letter or in an English/Bangla accent. No visible layout change anywhere; this round changes only an invisible `lang`/`dir` attribute pair and one HTML report's own markup.

## Deliberately not done

- Full ARIA `role="tablist"`/`role="tab"`/`role="tabpanel"` semantics for the top tab bar — noted by PR #150 as a materially larger change than its own one reproducible defect; still not touched here, for the same reason, and still not this round's own reproducible finding.
- `<nav class="hadith-crumbs">`'s missing `aria-label` — noted by PR #149, re-noted by PR #150, still not touched (a new translated string would widen the eight-key handoff §5 keeps unchanged at eight).
- The multi-edition same-collection breadcrumb ambiguity PR #149 recorded — re-read, still a recorded future schema case rather than a live failure in the committed corpus; no fixture invented.
- `bn.js` not touched — no new English literal from this round's own fix (§5 stays at eight).
- No merge, deploy, Rules/index change, or version bump.
- Protected shared tooling (`programme-ledger-mutations.mjs` and the rest of the six) not edited.
- PRs #103, #116, #118, #122, #125, #130, #141 left open and untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
