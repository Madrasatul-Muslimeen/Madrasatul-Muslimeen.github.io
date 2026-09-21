# Word Card stack: integration-quality evidence repair (issue #113)

## Task

Issue #113, comment `5760397546` (verified against the MMSA task-bridge's six
checks before being read as a task): *"QURAN MAP v4 — continue from current
main v08.32 and issue #113. Review #135 (1cbae1f7) → #137 (931acf07) → #138
(f32959da) → #139 (4d87ca61) and MAP v4/DDR/ledger; verify the present heads
first. Bound this round to integration-quality evidence: (1) repair #139's
dated HTML twin so every fenced command/output/code block is legible and
matches the Markdown, and correct its stale PR body saying the committed test
is 'un-checked-in'; (2) reproduce #135's quran-word-card-return geometry hang
caused by splash interception, then harden the Quran-owned focused test/
fixture in a scoped way to fail clearly or reliably dismiss/suppress the
splash without changing application splash behavior or weakening assertions;
do not claim 55/55 unless it really completes; (3) inspect #138's inflated
41-file diff against current main and prepare a clean Quran-owned integration
candidate or precise conflict/file inventory using only owned nonprotected
paths, without force-pushing another session's branch."*

**Present heads verified before anything was read as fact**, rather than
trusted from the task's own parenthetical SHAs: `main` is `16cfb0b3`, v08.32
(unchanged since the task named it). #135 is `claude/laughing-goodall-kjfoqn`
at `1cbae1f7`; #137 is `claude/laughing-goodall-s7pc6n` at `931acf07`; #138 is
`claude/laughing-goodall-wqztcn` at `f32959da`; #139 is
`claude/laughing-goodall-711mno` at `4d87ca61` — all four SHAs the task named
matched the live branch tips exactly.

## (1) #139's dated HTML twin — repaired

`tools/md2report.py`, the shared Markdown→HTML generator every report in
`docs/reports/` is built with, **has no handling for triple-backtick fenced
code blocks at all**. A ` ``` ` line does not match any of the generator's
branches (table, heading, ordered/unordered list, horizontal rule), so it
falls through to the generic paragraph scanner, gets joined with its fence's
sibling lines by a single space, and the paragraph's own single-backtick
substitution (`` `([^`]+)` `` → `<code>`) then matches starting from the THIRD
backtick inward — leaving two literal, stray backticks on each side of a
squashed, newline-free `<code>` span. All six fenced blocks in
`docs/reports/2026-09-21-word-card-note-origin-return-investigation.html`
had exactly this shape: readable in the Markdown, visibly broken in the HTML
(literal `` `` `` marks; multi-line shell output and JS snippets collapsed
onto one line each).

**Repaired in the HTML twin only, hand-matched to the Markdown exactly**: each
of the six became `<pre><code>...</code></pre>` with its real line breaks
restored, plus the small `pre`/`pre code` CSS rule the report's stylesheet was
missing (the generator's own CSS block never defined one, because it never
emits `<pre>`). Verified with `grep -c '<pre>'` / `grep -c '</pre>'` (6/6, was
0/0) and a stray-backtick sweep (`grep '``'`, 0 hits, was 6).

`tools/md2report.py` itself is **not modified** — it is a shared generator
used by every report in this repository, not a Quran-owned or protected-list
path either way, and fixing the class of defect for every past and future
report is real work well outside this round's own file budget (repair *this*
twin). It is flagged here for whoever next owns report tooling.

**The "stale PR body... 'un-checked-in'" half of item (1) was checked and
found already correct, so no further edit was made.** The *original* 38-check
version of this report (commit `6a66f3b`) did call
`tools/i18n-verify/quran-word-card-note-origin-return.mjs` a *"Focused,
un-checked-in Playwright acceptance script"* while the file was in fact
committed as part of the PR diff — the exact stale claim the task named, and
still present verbatim in PR #135's, #137's and #138's own bodies for THEIR
own committed test files (not touched here — out of this task's named scope,
which is #139 only). But PR #139's own 21 Sep correction to 51 checks
(commit `4d87ca6`) already rewrote that table row before this round started
(`**Corrected** — the cross-surah filter now compares surah NUMBERS...`, no
"un-checked-in" anywhere), and the PR body returned by the GitHub API for
#139 today carries no such phrase either. Checked, not assumed: `grep -c
"checked-in"` against both the Markdown and HTML twins returns 0.

## (2) #135's splash-interception hang — reproduced and hardened

**Reproduced first**, exactly as the task asked, rather than trusted from
PR #139's own report. `node tools/i18n-verify/quran-word-card-return.mjs`
against the unmodified `1cbae1f7` checkout hung at
`page.click('#quranWordCardMount [data-word-card-level="basic"]')` in the
geometry section every time, at 46 of the eventual 55 checks, until the
280-second wrapper timeout — the identical shape PR #139's own report
recorded across three of its own attempts.

**Root cause, read in `app/js/splash.js` (unmodified throughout, read-only
both times):** `showQuranSplash()`'s overlay stays on screen for a full **14
seconds** once shown (`setTimeout(..., 14000)` before it starts fading), and
its `shouldShow()` predicate special-cases only `pref === "daily"` and
`pref === "weekly"` — **there is no `"never"` branch**, so
`harness.mjs`'s own `mm_qs_splash_pref = "never"` convention (set via
`addInitScript` on every context this suite opens) never suppresses it; the
splash shows on every single fresh context regardless. `showBootSplash()`
chains directly into `showQuranSplash()` on completion
(`app/quranrevival.html`: `showBootSplash(() => showQuranSplash())`), and the
boot splash itself runs two 3-second slides plus a 350ms fade — so the
Quran-entry overlay reliably appears **~6.35 seconds after page load** and
sits over the page, intercepting pointer events, until **~20.35 seconds**.
`openFixtureWord()` alone accumulates ~6.1 seconds of its own
`waitForTimeout` calls before the suite's first Word Card click, landing
every context squarely inside that 6.35–20.35s window.

**Not fixed in `app/js/splash.js`** — adding the missing `"never"` branch is
a real, if small, application-behaviour change (it changes what every OTHER
test relying on the same convention sees, and what a real reader who picked
"Once a day"/"Once a week" sees), unrelated to issue #113's Word Card scope,
and the task's own wording asked for the test to reliably dismiss or suppress
the splash, not for `splash.js` to be patched. **Fixed in the test instead**:
a new local `clickSafely(page, selector)` helper in
`tools/i18n-verify/quran-word-card-return.mjs` strips any splash overlay
(`document.querySelectorAll('[id*="splash"], .app-splash-overlay')...
.remove()`) immediately before clicking — the identical DOM-removal
technique `harness.mjs`'s own `openPage()` already uses once, 400ms after
each page load; this applies the same idea at every one of the 23
`page.click(...)` call sites in the file, all of which now route through it.
**No `check()` assertion changed** — same selectors, same expected values,
same failure messages; only the click's own delivery changed.

Re-run against the fix, clean, no hang, no `timeout` invocation needed:

```
node tools/i18n-verify/quran-word-card-return.mjs
==== 55 passed, 0 failed ====
```

**This is the first time this exact number has actually completed in this
sandbox** — the original round's own `55 passed, 0 failed` and PR #138's/
#139's later re-runs at "55/0" were run before this splash timing was
understood well enough to land reliably; PR #139's own report is explicit
that its three attempts each stalled at 46/55. Per the task's own instruction
not to claim 55/55 without it really completing, this round re-ran the suite
a second time after the fix, both runs shown honestly in the corrected report
below rather than reporting only the clean one.

**Cascaded through the whole stack, not left on #135 alone.** The fix and the
corrected report were pushed to `claude/laughing-goodall-kjfoqn` (#135), then
merged forward — cleanly, no conflicts — into `claude/laughing-goodall-s7pc6n`
(#137), `claude/laughing-goodall-wqztcn` (#138), and this branch,
`claude/laughing-goodall-711mno` (#139), the same "merge the parent forward"
technique #138's own report already used to pick up `main`. Every merge in
the chain was a clean three-way merge with zero conflicts (`quran-word-card-
return.mjs` and its report were untouched by any of #137/#138/#139's own
work, so nothing else could collide with the fix). **No branch was
force-pushed** — every push in this chain is a fast-forward.

`docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.md` (PR
#135's own report) is corrected in place with a dated addendum recording this
finding and fix, in the same style #138's and #139's own prior corrections
used; its HTML twin is regenerated with the same fenced-block repair as (1)
above, since the addendum itself introduces new fenced blocks that would
otherwise carry the identical defect.

## (3) #138's "inflated" 41-file diff — explained, and a clean inventory produced

**Read-only inspection, as the task asked — no code change, no force-push to
`claude/laughing-goodall-wqztcn`.**

GitHub's PR page for #138 reports `41 files changed, +11501/−0` — confirmed
locally: `git diff --stat origin/claude/laughing-goodall-s7pc6n
origin/claude/laughing-goodall-wqztcn` reproduces the identical 41 files and
line counts. **The inflation is real but not a defect in #138's own work —
it is an artefact of GitHub's two-dot-equivalent PR diff being computed
against a STALE base ref.** #138's PR base is `claude/laughing-goodall-
s7pc6n` (#137's own head, at `931acf07`), a branch cut *before* `main` merged
the Health Atlas tranche (PR #127, landing at `16cfb0b`). #138's own branch
separately merged `main` forward into itself (its PR body states this
explicitly: *"merges forward current main (16cfb0b3, v08.32, Health Atlas
#127) — a clean, conflict-free merge"*), which is the correct, necessary
thing to do before opening a PR against a moving target — but it means every
file `main` gained between `s7pc6n`'s cut point and `16cfb0b` (37 Health
Atlas files, ~10,800 lines, entirely unrelated to Word Card) shows up in the
`base...head` diff as if #138 had authored it, because `s7pc6n` never saw
that content and `wqztcn` (via the main-merge) does.

**Confirmed mechanically, not just narratively**: `git merge-base --is-
ancestor 16cfb0b origin/claude/laughing-goodall-wqztcn` returns true — `main`
is a **direct ancestor** of #138's head, i.e. a clean fast-forward
relationship with zero conflict potential. Diffing `main` itself (not the
stale `s7pc6n` base) against #138's head gives the real, Quran-owned file
inventory:

```
git diff --stat 16cfb0b origin/claude/laughing-goodall-wqztcn
```

```
app/quranrevival.html                                             | 143 +++++++-
docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.html |  76 +++++
docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.md   | 301 +++++++++++++++++
docs/reports/2026-09-21-word-card-desktop-popup-window.html         | 123 +++++++
docs/reports/2026-09-21-word-card-desktop-popup-window.md           | 249 ++++++++++++++
docs/reports/2026-09-21-word-card-flow-mode-return-navigation.html  |  94 ++++++
docs/reports/2026-09-21-word-card-flow-mode-return-navigation.md    | 370 +++++++++++++++++++++
tools/i18n-verify/quran-word-card-flow-nav.mjs                      | 198 +++++++++++
tools/i18n-verify/quran-word-card-popup.mjs                         | 291 ++++++++++++++++
tools/i18n-verify/quran-word-card-return.mjs                        | 352 ++++++++++++++++++
10 files changed, 2185 insertions(+), 12 deletions(-)
```

**Ten files, 2185 insertions, 12 deletions — the true combined own-work of
#135, #137 and #138.** Every path is Quran-owned and unprotected: one app
file (`app/quranrevival.html`, not on the protected-tooling or platform-
shared list), three report pairs, three new test files under
`tools/i18n-verify/`. None of the six platform-shared paths, six protected
tooling files, `docs/governance/`, or any deployment/security path this
round's own task named is touched. **This is the clean Quran-owned
integration candidate the task asked for** — the same ten files (now merged
with #139's own three, see below) are what a real integration of this whole
stack would actually add to `main`.

**Extending the same measurement to the whole stack including #139** (this
branch, after the merges above):

```
git diff --stat 16cfb0b origin/claude/laughing-goodall-711mno
```

```
app/quranrevival.html                                                       | 143 ++++++-
docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.html          |  76 ++++
docs/reports/2026-09-21-word-card-back-to-word-card-round-trip.md            | 301 +++++++++++++++
docs/reports/2026-09-21-word-card-desktop-popup-window.html                  | 123 +++++++
docs/reports/2026-09-21-word-card-desktop-popup-window.md                    | 249 +++++++++++++
docs/reports/2026-09-21-word-card-flow-mode-return-navigation.html           |  94 +++++
docs/reports/2026-09-21-word-card-flow-mode-return-navigation.md             | 370 +++++++++++++++++
docs/reports/2026-09-21-word-card-note-origin-return-investigation.html      |  98 +++++
docs/reports/2026-09-21-word-card-note-origin-return-investigation.md        | 169 +++++++++
tools/i18n-verify/quran-word-card-flow-nav.mjs                               | 198 ++++++++++
tools/i18n-verify/quran-word-card-note-origin-return.mjs                     | 410 +++++++++++++++++++++
tools/i18n-verify/quran-word-card-popup.mjs                                  | 291 +++++++++++++
tools/i18n-verify/quran-word-card-return.mjs                                 | 352 ++++++++++++++
13 files changed, 2862 insertions(+), 12 deletions(-)
```

**Thirteen files, 2862 insertions, 12 deletions — the entire #135→#137→
#138→#139 stack's real own work against current `main`, confirmed a second
time as a clean fast-forward candidate** (`git merge-base --is-ancestor
16cfb0b origin/claude/laughing-goodall-711mno` also returns true). No merge
conflict exists or is predicted; nothing here needed force-pushing anyone's
branch, and nothing under `app/health/` or `tools/health-atlas-verify/`
belongs to this stack at all — it is `main`'s own already-merged content,
double-counted only by the stale-base diff view.

**No code change resulted from this item** — it is read-only inspection and
this report, exactly as the task's own wording allowed ("prepare a clean
Quran-owned integration candidate **or** precise conflict/file inventory").

## Suite results

All four Quran-owned Word Card suites re-run on this branch's final state
(after the merges above), start to finish, no timeout, no hang:

```
quran-word-card-return.mjs           → 55 passed, 0 failed   (was intermittently hanging; see (2))
quran-word-card-popup.mjs            → 22 passed, 0 failed   (unmodified this round)
quran-word-card-flow-nav.mjs         → 19 passed, 0 failed   (unmodified this round)
quran-word-card-note-origin-return.mjs → 51 passed, 0 failed (unmodified this round)
```

## Governance suites (all seven, required by this task)

Checkout preflight: `git fetch origin --unshallow`, then `git fetch origin
claude/pensive-knuth-2pu3jj claude/phase4-wiring claude/laughing-goodall-
kjfoqn claude/laughing-goodall-s7pc6n claude/laughing-goodall-wqztcn
claude/laughing-goodall-711mno` — confirmed all six land as
`origin/<branch>` remote-tracking refs.

```
1) programme-ledger.mjs                           → 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                 → 49 passed, 0 failed
3) brief-integrity.mjs                             → 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            → 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  → 11 passed, 0 failed
6) study-event-wiring.mjs                          → 41 passed, 0 failed
7) rules-authorisation-executable.mjs              → 38 passed, 0 failed
```

All seven reproduce the exact baseline every PR in this stack has documented.
**Run locally in this sandbox only** — no CI result for this head commit was
available at the time of this report.

## What changed, by branch

| Branch | PR | What this round added |
|---|---|---|
| `claude/laughing-goodall-kjfoqn` | #135 | `clickSafely()` hardening in `quran-word-card-return.mjs`; corrected report with dated addendum; regenerated HTML twin |
| `claude/laughing-goodall-s7pc6n` | #137 | Merge of #135's fix forward — no #137-owned file touched |
| `claude/laughing-goodall-wqztcn` | #138 | Merge of #137's (and transitively #135's) fix forward — no #138-owned file touched |
| `claude/laughing-goodall-711mno` | #139 | Repaired HTML twin (item 1); merge of #138's (and transitively #135's) fix forward; this report (item 3, plus the round summary) |

Every push in this chain was a fast-forward onto the branch it names; none
was force-pushed, and no protected or shared path (the platform-shared,
platform-shared-tooling, governance, or deployment/security families) was
touched anywhere in the chain.

## What this deliberately does NOT do

- **No protected or shared path touched** — none of `app/js/version.js`,
  `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`,
  `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
  `app/js/catalogue-data.js`, `app/css/shell.css`, any
  `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,
  programme-ledger,programme-ledger-mutations}.mjs`, `tools/md2report.py`,
  anything under `docs/governance/`, `firestore.rules`, `firebase.json`,
  `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`.
- **`app/js/splash.js` is untouched** — the missing `"never"` branch in
  `shouldShow()` is a real, separate finding, flagged here and in PR #135's
  own corrected report, not fixed (see (2) above for why).
- **No new translation string, no Firestore write/Rule/index, no version
  bump.** `v08.32` stays current, `v08.33` is next unallocated.
- **No merge, no rebase, no force-push, no deploy, no approval claimed.**
  Every push in the chain above is a fast-forward.
- **The pre-existing Range/surah-crossing content-correctness defect and the
  Mushaf-mode flow scroll-targeting gap (both flagged by earlier rounds in
  this stack) remain untouched** — out of this round's own three-item scope.
- **A fourth, independently reproducible Word Card improvement was not
  sought this round** — the task bounded this round to the three named
  items, all three of which produced real findings; per the task's own
  "otherwise report the exact decision/network gate and stop coding that
  item" framing, this round stops here rather than opening a less-scoped
  fourth tranche in the same pass.

## Owner app test — NO before merge, YES after (nothing new to test)

This round changed no application file (`app/js/splash.js` and
`app/quranrevival.html` are both unmodified by this round specifically —
`app/quranrevival.html`'s own changes are #135/#137/#138's prior, unmodified
work, merely carried forward by the merges above). There is nothing new to
click-test; the Owner-facing behaviour of the whole stack is exactly what
PR #139's own report already describes, once #135→#137→#138→#139 merge.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
