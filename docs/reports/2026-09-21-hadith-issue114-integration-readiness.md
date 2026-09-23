# Hadith: independent Gate A correction of PR #153's version-gate claim, a combined-stack integration inventory, and a Gate B investigation that found no further gate-free defect (issue #114)

**Date:** 2026-09-21 (UTC)
**Trigger:** MMSA bridge task following up issue #114 (previous task `5763798251`, completed in draft PR #153, head `18ecef56`)
**Branch:** `claude/hadith-integration-readiness-01`, built directly on PR #153's own head (`18ecef56c4c8cfbcb166d8294d731d7b09b394a6`), itself stacked on PR #150's head (`00713f18`) → PR #149's head (`84e2c46d`) → PR #147's head (`fa9444a6`) → PR #144's head (`466dc313`) → PR #143's head (`34c3fcd5`)
**Base:** `main` at `16cfb0b3` (v08.32, re-verified live via `git ls-remote origin main` at the start and end of this task, unchanged throughout)

## 0. What this round was asked to do

Verify current `main`, issue #114's own task text, the Hadith source-rights contracts, issue #123's platform ledger, and the actual PR heads/base/diff/CI for the stack, independently rather than trusting any prior round's account. **Gate A**: correct PR #153's claim that its Arabic `lang`/`dir` reader-facing accessibility fix "needs no central version" — it is a real, stacked, reader-facing behaviour change and does need an MMSA version allocated by the Master Architect before integration, even though building it needed no version bump. Independently re-run PR #153's committed 50-check English/Bangla browser suite, its negative control, and the five Hadith suites; inspect its dated Markdown/HTML report twin for fenced-output parity; and record explicitly that a DOM `lang`/`dir` attribute check proves the attribute is present, not that a screen reader actually pronounces the text correctly — that is a manual-acceptance fact, not automated evidence. **Gate B**: produce a concrete combined-stack integration inventory against current `main`, and investigate one further independently reproducible Books/chapters or Search→source gap, implementing it only if a committed real-browser test reproduces an actual failure on old code and passes on new. Run the seven governance suites. Report Owner app-test readiness explicitly.

## 1. Independent verification, before touching anything

`origin/main` is `16cfb0b3512609313a68d487dca28945a31855b8` at **v08.32** (`app/js/version.js` → `APP_VERSION = "08.32"`, re-read directly, not quoted from a prior report). Unmoved at the end of this task too.

**The stack, read live via `pull_request_read`/`list_pull_requests`, not assumed from the task text:**

| PR | Base | Base SHA | Head SHA | State |
|---|---|---|---|---|
| #143 | `main` | `16cfb0b3` | `34c3fcd5` | draft, open |
| #144 | `claude/laughing-goodall-4dhs97` (#143) | `34c3fcd5` | `466dc313` | draft, open |
| #147 | `claude/laughing-goodall-iacemr` (#144) | `466dc313` | `fa9444a6` | draft, open |
| #149 | `claude/laughing-goodall-k8z5yh` (#147) | `fa9444a6` | `84e2c46d` | draft, open |
| #150 | `claude/laughing-goodall-te0yu5` (#149) | `84e2c46d` | `00713f18` | draft, open |
| #153 | `claude/laughing-goodall-rjhnzm` (#150) | `00713f18` | `18ecef56` | draft, open |

`#130` (base `main`, head `claude/laughing-goodall-timq4k`) and `#141` (base `#130`'s own branch, head `claude/laughing-goodall-v1u18w`) are both still open drafts, unchanged, exactly as every round on this thread has recorded — confirmed by direct listing, not re-quoted.

**PR #153's own CI**, read via `pull_request_read → get_status` against head `18ecef56`: **`state: "pending"`, `total_count: 0`, zero statuses** — no CI has run against this head, an absence rather than a pass or fail, the same shape as every PR in this stack in this environment.

The Hadith source-rights and synthetic-namespace contracts (`docs/reports/2026-09-18-hadith-h0-*`, `...-h1-*`, `CLAUDE.md`'s own Hadith section) and issue #123's own platform-ledger coordination task were re-read; neither is touched by this round, and `programme-ledger.mjs` (§6) independently confirms the ledger's own guards still pass against current `main`.

## 2. Gate A — the version-gate claim, corrected

PR #153's report (`docs/reports/2026-09-21-hadith-issue114-books-row-heading-lang.md`, "Central version gate") states: *"No version bump. `app/js/version.js` untouched; `v08.32` remains the current `main` milestone; version allocation is the Master Architect's, and this round needs none."*

**The first two clauses are true and stay true** — `app/js/version.js` is untouched by PR #153's diff (confirmed: `git diff origin/claude/laughing-goodall-rjhnzm origin/claude/hadith-books-next-01 -- app/js/version.js` is empty), and building/testing the fix needed no bump, per this project's own standing rule that a session never self-allocates a version.

**The fourth clause — "this round needs none" — overstates it, and this is the correction.** PR #153's own fix is a real, reader-facing behaviour change (a screen reader now pronounces Books/chapters headings in Arabic instead of the page's UI-language voice) stacked for eventual integration onto `main`. `CLAUDE.md`'s own standing rule is explicit: *"NEVER increment the application version, even for a behaviour change... state plainly in the body that the change needs a version and none has been allocated."* "This round needs none" reads as though the change will never need a version at all, which is not what is true — what is true is narrower: **no version bump was needed to build or test this round, and none is being claimed or requested; a version will still need to be allocated by the Master Architect before this change (as part of the combined stack) is integrated onto `main`.** PR #153's own text is left exactly as it was written — it is not edited, per this project's own "historical reports are deliberately NOT rewritten" rule — and this correction is recorded here instead, on the stacked branch that follows it, the same way PR #153 itself corrected PR #150's report by adding a fix on top rather than rewriting PR #150.

**`app/js/version.js` is confirmed untouched by this round too**: `git status --short` at the end of this task (§7) shows no change to it.

## 3. Gate A — independent re-run of PR #153's own evidence

Checked out `claude/hadith-books-next-01` at `18ecef56` (PR #153's real head), served locally, ran the five Hadith suites unmodified:

| Suite | Result |
|---|---|
| `hadith-corpus` | 60 passed, 0 failed |
| `hadith-commentary-binding` | 14 passed, 0 failed |
| `hadith-source-rights` | 14 passed, 0 failed |
| `hadith-governing-contracts` | 14 passed, 0 failed |
| `hadith-gate-contracts` | 11 passed, 0 failed |

Then `hadith-source-navigation-browser.mjs` (English + Bangla): **50 passed, 0 failed**, matching PR #153's claim exactly — including the three new `lang="ar"`/`dir="rtl"` checks on the book row, the chapter row, and the no-chapter-level edition's book row.

**Negative control, independently repeated**: swapped `app/js/hadith-browser.js` for its exact content at PR #150's own head (`00713f18`, i.e. immediately before PR #153's fix), re-ran the suite: **47 passed, 3 failed** — exactly the three new checks named above and nothing else, confirming the suite is not vacuous. Restored the fixed file (`git status --short` showed zero residual change afterward) and reconfirmed **50/50 in both languages**.

## 4. Fenced-output parity, and the DOM-versus-pronunciation clarification

Inspected `docs/reports/2026-09-21-hadith-issue114-books-row-heading-lang.md` and its `.html` twin as a pair. The report's only quoted fenced/raw block is the *illustrative* garbled snippet from **PR #150's** report (shown as evidence of that earlier defect, not this report's own live test output); the Markdown's fenced block (lines 53–55) and the HTML's `<pre><code>` block (line 68) carry the identical literal text. **No fenced-output mismatch found in PR #153's own report** — the repair it made to PR #150's HTML twin is a separate file and was not re-broken.

**On DOM `lang`/`dir` checks versus screen-reader pronunciation, recorded explicitly, as asked:** the three new automated checks assert `getAttribute("lang") === "ar"` and `getAttribute("dir") === "rtl"` on the rendered heading elements. That is real, mutation-proven evidence that the *attributes* are present and correctly valued — it is **not** evidence that any particular screen reader's Arabic voice/pronunciation engine actually activates correctly on them, which depends on the reader's own OS, browser, and installed voice packs and cannot be observed by a DOM assertion. PR #153's own report already states the mechanism correctly (`lang` has no CSS-direction-style fallback, unlike `dir`) but its Owner-app-test section invites the Owner to confirm this "with a screen reader... expected: it is announced in Arabic" **as if that were the remaining acceptance step**, without separately flagging that the automated suite cannot itself close that step. **This is now recorded as its own line item**, not folded into the automated pass/fail count: the 50/50 result is evidence the markup contract is met; a screen-reader pronunciation confirmation is a distinct, manual, Owner-side acceptance step, listed again in §8.

## 5. Gate B — combined-stack integration inventory against current `main`

**Dependency order** (unchanged from PR #153's own report, independently re-verified in §1): `main` → #143 → #144 → #147 → #149 → #150 → #153 → *(this round, no new commit against app code — see §6)*. #130 and #141 are a separate, still-independent pair not yet folded into this chain (base `main`, not based on #143). Integrating the six-PR Hadith-books chain needs no rebase at this time — every base/head pair in §1's table is exactly consecutive.

**Source rights**: the synthetic-namespace enforcement (`synthetic-`/`syn-occ-`/`syn-map-`) and the three-state rights model are unchanged across the whole stack — `hadith-corpus.mjs` and `hadith-source-rights.mjs` pass unmodified at PR #153's head (§3), and no PR in the chain touches `docs/governance/` or any rights-classification field.

**Eight untranslated Bangla `t()` keys**, independently re-derived by a fresh regex scan of `app/js/hadith-browser.js` against `app/js/i18n/bn.js` (56 distinct literal keys found; the same fixed set of eight missing, unchanged from every prior round on this thread):

1. `"View in source"`
2. `"Translation coverage"`
3. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
4. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
5. `"{en} of {n} have English, {bn} of {n} have Bangla."`
6. `"Topic coverage"`
7. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
8. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

`app/js/i18n/bn.js` is protected/shared and was not opened for editing. The translation handoff for the whole combined stack is these same eight keys — no PR in the chain adds or removes any.

**Protected/shared translation handoff**: none of #143/#144/#147/#149/#150/#153 touches `bn.js`, `nav.js`, `unit-keys.js`, `records.js`, `activity.js`, `catalogue-data.js`, `shell.css`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`, the six protected tooling files, `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/` — confirmed by `git diff --stat origin/main..origin/claude/hadith-books-next-01` (the chain's combined diff), which lists only `app/js/hadith-browser.js`, `tools/i18n-verify/hadith-source-navigation-browser.mjs`, and the chain's own `docs/reports/2026-09-21-hadith-issue114-*.{md,html}` files.

**Remaining acceptance gaps carried forward, unchanged and re-confirmed rather than re-discovered:**
- Full ARIA `role="tablist"`/`role="tab"`/`role="tabpanel"` semantics for the top tab bar — still materially larger than any one round's own reproducible finding.
- `<nav class="hadith-crumbs">`'s missing `aria-label` — still not touched (a new string would widen the eight-key handoff above §5).
- The multi-edition same-collection breadcrumb ambiguity PR #149 first recorded — still a documented future schema case, no fixture invented.
- The screen-reader pronunciation confirmation named in §4 — a manual Owner-side step, not something an automated suite can close.

**A candidate investigated this round and NOT implemented, recorded rather than acted on speculatively**: the Search tab's result-count line (`t("{n} results", …)`, `renderSearch()` in `app/js/hadith-browser.js`) is a plain `<p class="hadith-note">` rebuilt inside the results container on every keystroke, with no `role="status"`/`aria-live` region anywhere in the Search view — unlike the `role="status"` pattern this app already uses elsewhere for dynamic status text (e.g. `app/js/quran-word-card.js`'s "forms/occurrences unavailable" messages). A screen reader user typing a query is not told the result count changed unless they separately navigate into the results. This is a real usability gap, not invented, but it is **an enhancement to a working feature, not a broken one** — nothing is lost, mis-stated, or mis-pronounced, unlike the lang/dir defect PR #153 fixed — and closing it properly means introducing a live region without over-announcing the result cards' own interactive content, which is a materially larger and more failure-prone change than this round's own committed-test bar calls for lightly. **Not implemented this round**, for the same reason PR #150/#153 deferred full tablist semantics: it is real, but it is a design decision about how much to announce and when, not a one-function reproducible-failure fix. Flagged here for whoever picks the next Books/chapters round up.

No other reproducible Books/chapters or Search→source gap was found: real `Tab`+`Enter` keyboard navigation at every level, the `:focus-visible` mouse-vs-keyboard distinction, the breadcrumb reset paths, and the Search→source round trip were all re-probed live and confirmed correct (same findings PR #153 already recorded, re-checked rather than re-assumed).

## 6. Seven governance suites (full-history preflight, this round's own run)

`git fetch --unshallow` had already been run earlier in this task; `git rev-parse --is-shallow-repository` → `false`. Both ledger-named commits (`7e2931f…`, the held `claude/phase4-wiring` tip; `43dd96f…`, the Hadith stream's own recorded branch tip) confirmed present as real objects.

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 49 passed, 0 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

All seven match PR #153's own reported numbers exactly, re-run independently on this round's own checkout rather than re-quoted. `programme-ledger`'s own "20 shared-file touch record(s): 13 AUTHORIZED, 7 DECLARED" reflects the ledger's current state on `main`, read live.

## 7. Boundaries preserved

This round's own diff against PR #153's head (`git status --short` on this branch): **only this report's own two new files** (`docs/reports/2026-09-21-hadith-issue114-integration-readiness.{md,html}`). No application code, test file, or existing report was edited — Gate A's correction (§2) and Gate B's inventory (§5) are both new content, not a rewrite of PR #153's own files, matching this project's "historical reports are deliberately NOT rewritten" rule.

Every path in the bridge's protected/shared table was confirmed untouched: `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, the six protected tooling files, `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, `.github/workflows/`.

No new persistent id, no Rules/index candidate, no Firestore write, no merge, no deploy, no repository setting change, no review approval claimed or requested.

## 8. Central version gate

**No version bump — and, per §2, no version bump is being claimed as unnecessary either.** `app/js/version.js` untouched; `v08.32` remains the current `main` milestone; version allocation is the Master Architect's. **The combined six-PR stack (#143→#144→#147→#149→#150→#153) is a real, reader-facing behaviour change and will need a version allocated before it is integrated onto `main`** — this round does not request or predict one, per this project's own rule that a held/stacked stream never predicts its own merge number.

## 9. Owner app test required

**NO — not yet, and not from this round alone.** Nothing in this seven-PR chain is reachable from the served app until the whole stack is integrated and a version is allocated. When it is, two separate things need the Owner's own confirmation, not one:
1. **Automated-equivalent check** (already proven by §3's suite): sign in at `https://madrasatul-muslimeen.github.io/app/hadith-collections.html`, open Collections, pick any edition, inspect a book/chapter row's Arabic heading in the browser's accessibility tree (or DevTools Elements panel) — expect `lang="ar"` and `dir="rtl"` present on `.hadith-row-heading`.
2. **Manual-only confirmation** (§4 — cannot be automated): with a screen reader actually turned on, read the same heading — expect it announced with Arabic pronunciation, not read letter-by-letter or in an English/Bangla accent. This second step is the one no suite in this repository can close by itself.

No visible layout change anywhere in this round's own diff (it adds no application code at all — only this report).

## 10. Deliberately not done

- The Search result-count `aria-live`/`role="status"` gap (§5) — investigated, real, but an enhancement rather than a broken behaviour, and larger in scope than this round's one-function bar; flagged for a future round.
- Full ARIA tablist/tab/tabpanel semantics — still deferred, unchanged reasoning.
- `<nav class="hadith-crumbs">`'s `aria-label` — still deferred, would widen the eight-key handoff.
- The multi-edition breadcrumb ambiguity — still a recorded future schema case, no fixture invented.
- PR #153's own report text — not edited; this round's correction is new content, per §2 and §7.
- `bn.js`, `version.js`, `CLAUDE.md`, `CHANGELOG.md`, `nav.js`, and every other protected/shared path — untouched.
- No merge, deploy, Rules/index change, or version allocation.
- Protected shared tooling — not edited.
- PRs #103, #116, #118, #122, #125, #130, #141 — left open and untouched.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Qp2KqE9C6SyzSaGZPpLUSM

---
_Generated by [Claude Code](https://claude.ai/code/session_01Qp2KqE9C6SyzSaGZPpLUSM)_
