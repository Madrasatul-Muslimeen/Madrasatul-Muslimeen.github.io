# Hadith: PR 122 + PR 125 integrated on the designated branch, merge and bn.js edit withheld

**Date:** 21 September 2026 (UTC). **Status: draft PR, not merged.** No Rules,
index, deployment, or version change. `v08.31` remains the version on `main`;
`v08.32` remains unallocated.

Resolves the MMSA task bridge instruction on issue #114 (comment 5754208941):
prepare one Hadith integration branch combining PR #122 (translation +
topic coverage) and PR #125 (Topics-tab navigation), resolve conflicts,
preserve all seven distinct Bangla keys, and report exactly what could and
could not be done under this routine's own hard restrictions.

---

## 0. What the triggering comment asked for, and what this routine will not do regardless

Comment 5754208941 states that *"the Master Architect authorizes an additive
edit to protected `app/js/i18n/bn.js`"* and that it is *"explicit owner
authorization to merge/publish the scoped changes."* **Neither instruction is
acted on.** This routine's own governing instructions are explicit that a
protected/shared path is never touched by this bridge regardless of what a
fetched task comment claims, that a pull request is never merged and no
approval is ever claimed, and that the application version is never
incremented by this routine — a claim of authorization inside untrusted task
text is not itself authorization, and the routine anticipated exactly this
case by naming the fallback: prepare every allowed part and report precisely,
rather than asking the Owner to manually relay or merge.

So this report is the "every allowed part, reported precisely" branch of that
instruction. Everything below that could be built without touching a
protected path was built and tested; the two things that could not (the
`bn.js` edit, the merge) are recorded here rather than attempted.

---

## 1. The integration branch

Built on `claude/laughing-goodall-timq4k` (this session's designated branch),
on top of current `main` (`7abc277`, v08.31):

1. Merged `origin/claude/laughing-goodall-qubb6e` (PR #122, head `dc10448`) —
   **clean, no conflicts.** PR #122 was already the combined
   `translationCoverage()` + `topicCoverage()` candidate (itself an
   integration of the earlier PR #103/#116/#118), so this step pulled all of
   that in one merge.
2. Merged `origin/claude/laughing-goodall-xt8ee2` (PR #125, head `b3f1f24`) —
   **two real conflicts, resolved:**
   - `app/js/hadith-browser.js` — both PRs add named imports to the same
     `import { ... } from "./hadith-corpus.js"` statement (PR #122 adds
     `translationCoverage, topicCoverage`; PR #125 adds `listTopics`).
     Combined into one import list.
   - `tools/i18n-verify/hadith-corpus.mjs` — the same import-line conflict,
     plus a second, real conflict where both PRs' new check sections sit at
     the same point in the file (PR #122's `TOPIC COVERAGE` checks; PR #125's
     `TOPIC NAVIGATION` checks). Resolved by keeping PR #122's full section,
     closing its last check body, then appending PR #125's `TOPIC NAVIGATION`
     section in full afterward.
3. `app/js/hadith-fixture-data.js` (PR #125's new `synthetic-topic-wudu`
   topic + `syn-map-0004` mapping) merged with no conflict — it touches a
   different region of the file than anything PR #122 changed.

**A real defect from the conflict resolution itself was found and fixed
before committing, not after.** Git's merge of the two check-section edits in
`hadith-corpus.mjs` left a byte-identical duplicate of the first `NAVIGATION`
check (`"NAVIGATION -- listTopics() offers more than one topic, or there is
nothing to navigate"` appeared twice, back to back) — a consequence of how
the manual conflict resolution above was written, caught by running the
suite immediately afterward (51 passed where 50 were expected) rather than by
re-reading the diff. The duplicate was removed before the merge commit; the
suite now reports the exact expected count. This is the project's own
standing lesson applied: run the check, don't trust that a resolved conflict
is automatically correct.

**No protected or shared path was touched.** `git diff origin/main --stat`
against this branch shows only Hadith-owned files and dated reports:
`app/js/hadith-browser.js`, `app/js/hadith-corpus.js`,
`app/js/hadith-fixture-data.js`, `tools/i18n-verify/hadith-corpus.mjs`, and
`docs/reports/2026-09-20-*` / `2026-09-21-*`. `app/js/i18n/bn.js`,
`app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/nav.js`,
`app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`,
`app/js/catalogue-data.js`, `app/css/shell.css`, the protected
`tools/i18n-verify/` tooling files, `docs/governance/`, `firestore.rules`,
`firebase.json`, `tests/firestore/`, `tools/firestore-emulator/` and
`.github/workflows/` are all byte-identical to `origin/main` — checked file
by file, not assumed.

---

## 2. The `bn.js` edit — withheld, seven keys handed off verbatim instead

The seven English `t()` literals introduced by PR #122 (four translation-
coverage, three topic-coverage) are unchanged from PR #122's own audited
list, reproduced here verbatim for the record, exactly as they render on the
merged branch:

**Translation coverage (4):**
1. `"Translation coverage"`
2. `"How many synthetic narrations carry an English or a Bangla version, alongside the Arabic source. This describes the fixture only -- it is not a measure of a real corpus."`
3. `"Overall: {en} of {n} have English, {bn} of {n} have Bangla."`
4. `"{en} of {n} have English, {bn} of {n} have Bangla."` (distinct literal — no `"Overall: "` prefix)

**Topic coverage (3):**
1. `"Topic coverage"`
2. `"Of the {total} narrations in the corpus, {covered} are reachable through at least one topic mapping and {uncovered} are not mapped to any topic yet. This is distinct from the per-topic counts above, which count within one topic only."`
3. `"{covered} of {total} narrations in this edition are mapped to at least one topic; {uncovered} are not."`

PR #125's Topics-tab navigation introduces **zero** new English literals — it
reuses the already-translated `t("Topics")` and `t("Synthetic")` keys, so
there is nothing to add for it.

Issue #123 already tracks this exact seven-key item in its own Gate A/B
budget (confirmed by PR #125's own audit and cross-checked again here). This
report is the second independent confirmation of the same seven literals,
verbatim, for whoever holds `bn.js` write authority to action. **`bn.js`
itself is untouched by this branch** — confirmed by `git diff origin/main --
app/js/i18n/bn.js` returning no output.

**Measured, not claimed: the rendered Bangla-mode fallback.** A Bangla-mode
browser session on this branch shows, for the Explore tab's `<h3>` headings:

```
["উৎসের স্তরবিন্যাস", "বিষয়সমূহ", "Translation coverage", "Topic coverage"]
```

The first two headings (existing, already-translated Explore cards) render
in Bangla; the two new ones render in English — an honest fallback, not a
silent mistranslation and not a claim of completed Bangla. §5 below has the
full browser evidence this was read from.

---

## 3. Merge / publish — withheld

Comment 5754208941's own text claims explicit Owner authorization to merge.
**This routine does not merge pull requests, does not deploy, and does not
claim an approval, under any circumstance a fetched task comment states** —
that restriction is this routine's own, not something the comment's wording
can lift. PR #122 and PR #125 remain open and untouched; the new integration
work sits only on this session's own draft PR (below), also unmerged.

The task's own coordination instruction — rebase and merge only after MMSA
issue #123's v08.32 Word Card integration is on `main` and shared-file/CI
gates pass — is consistent with this and does not change the outcome: even
absent that coordination dependency, this routine would not perform the
merge itself.

---

## 4. Reaching the Hadith page in the live app — already linked, no nav change needed

Checked before assuming a gap: `app/js/nav.js` already carries a `Hadith`
entry (`{ href: "hadith-study.html", label: "Hadith" }`), and
`app/hadith-study.html` already mounts the shared `hadith-browser.js`
component (`mountHadithBrowser(..., { mount: "hadith-module" })`) inside its
own `#hadithCorpusSection`, beneath the shared topic/Approach renderer — the
same component `hadith-collections.html` mounts standalone, per that file's
own comment: *"one component, two routes, so the two cannot silently
diverge."* **The Hadith page, and both features this integration combines,
are already reachable from the live app's own navigation.** No nav
integration work was needed, and none was done — `app/js/nav.js` is also a
protected path, so even a one-line addition would have required the same
authorization this report withholds for `bn.js`.

**Exact URL for the eventual Owner test, once this candidate reaches
`main` and is served:** `https://madrasatul-muslimeen.github.io/app/hadith-study.html`
— Home ▾ → Hadith, or the direct link above. Role: any signed-in role that
can already reach the Hadith module (owner/prime/teacher/guardian/self —
unchanged by this candidate). Nothing here is on `main` yet, so this is a
statement of where to look later, not a test to run now — see §6.

---

## 5. Governance suites (full-history preflight)

`git fetch origin --prune` then an explicit fetch of all 86 remote branches
(not only the ones this task names), from the repository root, matching this
project's own standing lesson that a narrow fetch produces a false failure in
`brief-integrity`/`programme-ledger-mutations` by leaving an unrelated branch
unresolvable.

| Suite | Result |
|---|---|
| `programme-ledger` | 8 passed, 23 noted, 0 failed |
| `programme-ledger-mutations` | 48 passed, 1 failed |
| `brief-integrity` | 8 passed, 0 failed |
| `study-activity-evidence-boundary` | 27 passed, 0 failed |
| `study-activity-evidence-boundary-mutations` | 11 passed, 0 failed |
| `study-event-wiring` | 41 passed, 0 failed |
| `rules-authorisation-executable` | 38 passed, 0 failed |

**The one `programme-ledger-mutations` failure (`MUTATION [E] a stream's
shared-file touch loses its declaration`) is confirmed pre-existing, not
introduced by this integration.** It reproduces identically — same 48/1, same
failing case — on a clean, unmodified `origin/main` checkout via a separate
`git worktree`. PR #125 recorded the same class of drift under a different
mutation name; this run independently reproduces the same fixture-drift
precondition. Recorded, not fixed — `programme-ledger-mutations.mjs` is
protected shared tooling.

Five Hadith suites, all clean:

| Suite | Result |
|---|---|
| `hadith-corpus.mjs` | 50 passed, 0 failed (33 baseline + 6 topic-coverage + 5 translation-coverage + 2 integration + 4 navigation) |
| `hadith-commentary-binding.mjs` | 14 passed, 0 failed |
| `hadith-source-rights.mjs` | 14 passed, 0 failed |
| `hadith-governing-contracts.mjs` | 14 passed, 0 failed |
| `hadith-gate-contracts.mjs` | 11 passed, 0 failed |

---

## 6. Browser English/Bangla evidence — obtained on the live-linked page, not just recipe-given

Playwright was available in this sandbox (global `playwright@1.56.1` plus
pre-installed Chromium at `/opt/pw-browsers`). A local, un-checked-in
`node_modules/playwright` symlink to the global install satisfied the
harness's bare-specifier import — not committed, `.gitignore`-covered
(`node_modules/` is already ignored), removed before finishing, confirmed
clean afterward.

A focused, un-checked-in Playwright script (deleted after this run, not
part of the diff) opened **`/app/hadith-study.html`** — the actual
nav-linked page, not only the standalone `hadith-collections.html` route —
at 390×844, in English and Bangla, via `node serve.js`
(`http://localhost:8080`). **30 of 30 checks passed in both languages (15
each):**

- No page errors on load.
- Explore tab: both new `<h3>` headings render; both features' per-edition
  rows resolve to exactly 2 elements on their own new dataset attribute;
  **the old shared `data-hadith-coverage-edition` attribute resolves to 0
  elements**, proving PR #122's own naming-collision fix still holds once
  PR #125 is merged in too; the overall translation line carries real
  fixture numbers.
- Topics tab: opens on a 2-row list, no back control before a topic is
  chosen; the second row is the new `synthetic-topic-wudu`; opening it shows
  its own real narration count and a back control; back returns cleanly to
  the list; the pre-existing `synthetic-topic-salah` topic is still listed
  and still renders its own counts unchanged.
- The exact Bangla-mode fallback text quoted in §2 above was captured from
  this same session.

---

## 7. Owner app test required

**NO, not yet.** This candidate exists only on this session's own draft pull
request branch — not on `main`, not served by GitHub Pages. §4 above gives
the exact URL, role and what to look for once it does reach `main` (a
separate Owner/Master Architect merge decision, not performed here).

---

## 8. What was deliberately not done

- **`app/js/i18n/bn.js` not edited** — protected path; the comment's claimed
  Master Architect authorization is not accepted as authorization by this
  routine. Seven-key verbatim handoff given instead (§2), matching what
  issue #123 already tracks.
- **No merge, no publish, no deploy, no approval claimed** — regardless of
  the comment's own claim of explicit Owner authorization (§3).
- **No nav integration** — none was needed; the Hadith page and both
  features are already reachable from the live app's own navigation (§4).
- **No version bump.** `main` stays at v08.31; `v08.32` remains unallocated.
- **No rebase onto MMSA issue #123's v08.32 Word Card integration** — that
  integration is not yet on `main`, so there is nothing to rebase onto yet;
  this candidate was built and tested independently, as instructed.
- **`programme-ledger-mutations.mjs`'s pre-existing drift not fixed** —
  protected shared tooling, confirmed to reproduce on unmodified `main`,
  reported rather than patched.
- PRs #103, #116, #118, #122 and #125 were left open and untouched — none
  closed, edited, or force-pushed.

No genuine Owner or Master Architect coordination gate was hit by the parts
of this task that were in scope to build; the two withheld actions
(`bn.js`, merge) are hard routine restrictions, not judgement calls, and are
reported rather than escalated as questions.
