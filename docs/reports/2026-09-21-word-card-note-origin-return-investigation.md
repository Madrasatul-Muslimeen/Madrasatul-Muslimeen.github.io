# Word Card: Note-view-origin return — investigated, no defect found (issue #113)

## Summary

Issue #113, comment `5758971532` (verified against the MMSA task-bridge's six checks): *"Continue MAP v4 immediately with the next bounded Quran-owned Word Card tranche: Note-view-origin return navigation, flagged by draft #135 but not yet investigated. Treat the prior claim of a decision gate as unproven: first reproduce the path on the actual app with English and Bangla in desktop and mobile, identify the Note view scroll container and focus/selection/word-card state, and determine whether a genuine defect exists."*

**This branch is stacked on #138** (`claude/laughing-goodall-wqztcn`), which already merges forward current `main` (`16cfb0b`, v08.32) — confirmed by `git merge-base --is-ancestor origin/main origin/claude/laughing-goodall-wqztcn`. It depends on **#135, #137 and #138 merging first**.

**Gate A (reproduce) was run, and the flagged gap does not reproduce as a defect.** PR #135 left the Note view's own scroll surface exactly the way it left flow mode — "a materially different restore this task does not reach... flagged rather than silently left broken." PR #138 later found the flow-mode half of that flag *was* a real defect. This round investigated the Note-view half on its own terms and found the opposite: **scroll position, the active Word Card tab, the lemma list's expanded/collapsed state, and keyboard focus are all already correct** across a genuine cross-surah round trip started from inside the Note view's own word-by-word panel, in both languages, at mobile and desktop widths.

## Why it is already correct — the mechanism, not a guess

`.note-body` is the Note view's real scroll surface (`overflow-y: auto`) — the same role `#ayahPanels` plays for the Read view, and already used for exactly this purpose by `swipeDragEl()`'s own pre-existing selector (`app/quranrevival.html`).

The Word Card round trip is driven by four functions: `goToWordOccurrence()`, `navigateToAyah()`, `openWordOccurrenceAt()`, `returnToWordCardOrigin()`. **None of them calls `renderNoteViewNow()`** — confirmed by reading every one of `renderNoteViewNow()`'s own call sites (there are ~30, none inside these four functions) and by a source-level check in the new suite that greps the four functions' own bodies for a call to it. The only thing the round trip does to `#noteView` is toggle its `hidden` attribute via `setStageView()`. Because `.note-body`'s own DOM is never destroyed or rebuilt while the reader is away on the destination āyah's Read screen, there is nothing for a scroll-restore mechanism to do — the browser never had a reason to reset the scroll position in the first place.

This is a structurally different situation from the flow-mode case PR #138 fixed, where `renderFlowView()` genuinely replaces `#pageViewContainer`'s `innerHTML` on every surah change, which *does* discard the previous scroll position. The Note-view round trip performs no equivalent rebuild.

## What was actually exercised, in a real browser

Reproduced with Playwright against a local server (`node serve.js`), not merely read from source:

1. Landed on the Note view for surah 2, āyah 71 (word-by-word on) — the Note view's own WbW panel renders `[data-word-occurrence]` spans directly (`app/js/ayah-renderer.js`'s `renderWordByWordPanel()`, shared with the Read screen), reachable because `noteScopeShowAyatText()` is true for a single-āyah scope.
2. Tapped a word from *inside* `#noteView` — the persistent Word Card correctly mounts into `#quranWordCardMountNote`, not `#quranWordCardMount`.
3. Opened the Basic tab, expanded the lemma list, and picked an occurrence link landing on a **different surah** (4:92, not 2:71) — proving this is a genuine cross-surah trip, not a same-content coincidence.
4. Scrolled `.note-body` to a distinctive, non-zero position before leaving.
5. Followed the link — confirmed the app really does navigate to surah 4, āyah 92, and that the Note view is genuinely left (hidden) while away.
6. Pressed "← Back to Word Card" — confirmed: original surah/āyah restored (2:71, not 4:92), the original word reopens, the Basic tab is restored, the lemma list is restored expanded, keyboard focus lands on the reopened card's own close button inside the Note mount, and **the Note view's scroll position is exactly where it was left** (not approximately — exactly, because the element was never touched).
7. Repeated in Bangla, and again at a desktop width (≥900px), where the Note view is PR #137's own movable/resizable popup rather than the mobile fixed layout — same result in both.

A `window.__fsLog` write-kind check confirmed the round trip itself writes nothing to Firestore, once correctly scoped past one unrelated fact investigated below.

## One thing found and correctly scoped out, not a defect either

The first draft of the write-count check reported `writes=1` for the Note-origin trip (the Read-origin equivalent, PR #135's own suite, reports `writes=0`). Investigated rather than dismissed: the single write is an `updateDoc` on the `ayahNotes` collection, produced by `ensureAyahNotesWritable()` in `app/js/ayah-notes.js` — a one-time "confirm this person's notes document is writable" touch that `openNoteView()` calls on every **first** visit to the Note view in a session, gated by its own `writabilityChecked` cache so it never repeats. It fires the moment the Note view is opened at all, independent of whether a Word Card round trip happens afterward, and is unrelated to issue #113's scope. The suite's write-count check is now baselined *after* this one-time touch, so it measures what the round trip itself contributes (zero), not what opening the Note view once already cost.

## What changed

| File | What |
|---|---|
| `tools/i18n-verify/quran-word-card-note-origin-return.mjs` *(new)* | Focused, un-checked-in Playwright acceptance script — 38 checks: the full round trip opened from inside the Note view (both languages), a genuine cross-surah hop, scroll/tab/lemma/focus/write assertions, a desktop-popup-chrome variant, and a source-level check pinning the actual mechanism (no `renderNoteViewNow()` call in the round-trip path) as a regression guard. |
| `docs/reports/2026-09-21-word-card-note-origin-return-investigation.md` / `.html` *(new)* | This report. |

**No application file was touched.** `app/quranrevival.html`, `app/js/quran-word-card.js`, `app/js/ayah-notes.js` and `app/js/ayah-renderer.js` were all read but not modified — there is no defect here to fix.

## Suite results

```
node tools/i18n-verify/quran-word-card-note-origin-return.mjs
==== 38 passed, 0 failed ====
```

Re-run, unmodified by this round, all at their own established baseline (no application code changed, so no regression is expected or found):

- `quran-word-card-return.mjs` (PR #135's own 55-check suite) → **55 passed, 0 failed**
- `quran-word-card-popup.mjs` (PR #137's own 22-check suite) → **22 passed, 0 failed**
- `quran-word-card-flow-nav.mjs` (PR #138's own 19-check suite) → **19 passed, 0 failed**

## Governance suites (all seven, required by this task)

Checkout preflight: `git fetch origin --unshallow`, then `git fetch origin claude/pensive-knuth-2pu3jj claude/phase4-wiring claude/laughing-goodall-kjfoqn claude/laughing-goodall-s7pc6n claude/laughing-goodall-wqztcn` — confirmed all five land as `origin/<branch>` remote-tracking refs (`git branch -r`), which is what `programme-ledger-mutations.mjs` and `brief-integrity.mjs` read by name.

```
1) programme-ledger.mjs                           → 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                 → 49 passed, 0 failed
3) brief-integrity.mjs                             → 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            → 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  → 11 passed, 0 failed
6) study-event-wiring.mjs                          → 41 passed, 0 failed
7) rules-authorisation-executable.mjs              → 38 passed, 0 failed
```

All seven reproduce the exact baseline PR #135, #137 and #138 each documented independently — matching main's own recorded state (v08.32 LIVE, four deployment states unchanged, 20 shared-file touch records: 13 AUTHORIZED / 7 DECLARED, 0 undeclared).

## What this deliberately does NOT do

- **No protected or shared path touched** — none of `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, any `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`, anything under `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`.
- **No new translation string** — nothing rendered changed; this round added only a test file and a report.
- **No Firestore write, Rule, or index** — confirmed by the suite's own write-count check, correctly scoped.
- **No version bump.** `app/js/version.js` is untouched; `v08.32` stays current, `v08.33` is next unallocated. There is no behaviour change here to allocate a version for.
- **No merge, no deploy, no approval claimed.**
- **The pre-existing Range/surah-crossing content-correctness defect PR #138 flagged is untouched** — not investigated this round; the task's own comment named only the Note-view-origin gap.
- **Mushaf-mode flow scroll targeting remains flagged, not built** (PR #138's own note) — out of scope for this round too.

## Owner app test — NO before merge, YES after (informational only; nothing to fix)

There is no behaviour to test, because there is no behaviour change. For completeness, on the live app once #135/#137/#138 are merged, at any width, in either language:

1. Open Quran Study, turn on word-by-word, open the **Note** view on an āyah that carries word-by-word data (e.g. surah 2, āyah 71).
2. Tap an Arabic word inside the Note view itself. Switch to **Basic Arabic**, expand the lemma-linked occurrences line, scroll the Note view down a little.
3. Tap an occurrence landing on a different surah. **Expected** (unchanged, already correct): you land on that surah's own page.
4. Tap "← Back to Word Card". **Expected** (unchanged, already correct): you return to the Note view, scrolled to exactly where you left it, with the same word, tab and lemma list open.
5. Repeat in Bangla.

No Firestore write happens anywhere in this flow beyond the Note view's own one-time "ensure writable" touch on first open, which is pre-existing, documented behaviour unrelated to this investigation.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
