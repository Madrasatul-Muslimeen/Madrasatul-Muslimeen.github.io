# Word Card: Note-view-origin return — investigated, no defect found; acceptance test corrected (issue #113)

## Summary

Issue #113, comment `5758971532` (original investigation): *"Continue MAP v4 immediately with the next bounded Quran-owned Word Card tranche: Note-view-origin return navigation, flagged by draft #135 but not yet investigated. Treat the prior claim of a decision gate as unproven: first reproduce the path on the actual app with English and Bangla in desktop and mobile, identify the Note view scroll container and focus/selection/word-card state, and determine whether a genuine defect exists."*

**This report was itself amended, 21 Sep 2026, under a follow-up task-bridge round** ("QURAN MAP v4 CONTINUATION"): independently review the draft #135→#137→#138→#139 stack and **correct the acceptance test in #139**, not the app. That correction is what this version of the report records; the original Gate A finding (no defect) is unchanged and was re-verified against the corrected test.

**This branch is stacked on #138** (`claude/laughing-goodall-wqztcn`), which already merges forward current `main` (`16cfb0b`, v08.32) — confirmed by `git merge-base --is-ancestor origin/main origin/claude/laughing-goodall-wqztcn`. It depends on **#135, #137 and #138 merging first**.

**Gate A (reproduce) was run, and the flagged gap does not reproduce as a defect.** PR #135 left the Note view's own scroll surface exactly the way it left flow mode — "a materially different restore this task does not reach... flagged rather than silently left broken." PR #138 later found the flow-mode half of that flag *was* a real defect. This round investigated the Note-view half on its own terms and found the opposite: **scroll position, the active Word Card tab, the lemma list's expanded/collapsed state, and keyboard focus are all already correct** across a genuine cross-surah round trip started from inside the Note view's own word-by-word panel, in both languages, at mobile and desktop widths.

## Why it is already correct — the mechanism, not a guess

`.note-body` is the Note view's real scroll surface (`overflow-y: auto`) — the same role `#ayahPanels` plays for the Read view, and already used for exactly this purpose by `swipeDragEl()`'s own pre-existing selector (`app/quranrevival.html`).

The Word Card round trip is driven by four functions: `goToWordOccurrence()`, `navigateToAyah()`, `openWordOccurrenceAt()`, `returnToWordCardOrigin()`. **None of them calls `renderNoteViewNow()`** — confirmed by reading every one of `renderNoteViewNow()`'s own call sites (there are ~30, none inside these four functions) and by a source-level check in the suite that greps the four functions' own bodies for a call to it. The only thing the round trip does to `#noteView` is toggle its `hidden` attribute via `setStageView()`. Because `.note-body`'s own DOM is never destroyed or rebuilt while the reader is away on the destination āyah's Read screen, there is nothing for a scroll-restore mechanism to do — the browser never had a reason to reset the scroll position in the first place.

This is a structurally different situation from the flow-mode case PR #138 fixed, where `renderFlowView()` genuinely replaces `#pageViewContainer`'s `innerHTML` on every surah change, which *does* discard the previous scroll position. The Note-view round trip performs no equivalent rebuild.

## The acceptance-test correction (21 Sep 2026) — three defects in THE TEST, none in the app

Re-review found the original 38-check suite proved less than it claimed to. All three defects were in `tools/i18n-verify/quran-word-card-note-origin-return.mjs` itself; **`app/quranrevival.html`, `app/js/quran-word-card.js`, `app/js/ayah-notes.js` and `app/js/ayah-renderer.js` were read again and remain unmodified.**

**(1) The "cross-surah" target filter compared the wrong thing.** The original code was:

```js
const crossSurahTarget = allTargets.find((t) => !t.startsWith("2:71:"));
```

`"2:71:"` is the origin's own exact `surah:ayah:` prefix. A target such as `"2:100:3"` — **surah 2, a different āyah** — does not start with `"2:71:"` and would have wrongly passed the filter as a "cross-surah" candidate while landing on the *same* surah as the origin. The task's own framing named this precisely: *"require target surah != origin surah (not merely a different occurrence/ayah)."* Fixed to compare the target's own leading segment, parsed as a number, against a declared `ORIGIN_SURAH` constant:

```js
function findCrossSurahTarget(targets) {
  return targets.find((t) => Number(t.split(":")[0]) !== ORIGIN_SURAH);
}
```

**Measured, not assumed, whether this defect ever actually fired against the real fixture**: a standalone debug run against the live fixture (surah 2, āyah 71, word 13) printed `allTargets: ["2:71:13","4:92:17","4:92:42"]` — every non-origin target already happened to be surah 4, so the OLD buggy filter and the NEW correct filter picked the identical target (`4:92:17`) this time. **The bug was real and is now closed, but this particular fixture never exposed it as a false pass** — worth recording plainly rather than overclaiming a defect the old 38-check run actually caught.

**(2) The only check that the destination was "really" a different surah trusted the app's own link, not the rendered page in isolation.** The original assertion compared the rendered `surahSelect`/`ayahSelect` values against a `wantedSurah`/`wantedAyah` **parsed from the same `data-word-occurrence-goto` href just clicked** — a self-consistency check on the app's own navigation (did it go where its own link said?), not independent proof of a genuine cross-surah trip. A new, separate check now compares the rendered `surahSelect` value directly against the declared `ORIGIN_SURAH` constant:

```js
check(`${lang} the destination actually reached is a GENUINELY DIFFERENT surah than the origin (${ORIGIN_SURAH}), read off the rendered page state`,
      away.surahSelect !== ORIGIN_SURAH, ...);
```

This is present in both the mobile round trip and the desktop-popup-chrome variant.

**(3) Several essential preconditions were silent `console.log("SKIP...")` + `continue` with no `check()` call recorded at all.** A missing lemma list, a fixture with no cross-surah occurrence, a Note body too short to scroll at a given viewport, and — in the desktop section only — the fixture failing to open in the Note popup's own mount in the first place, all fell through to a bare console line and a `continue`/early-return, with **zero effect on the pass/fail totals**. A run hitting any of these would still print `"38 passed, 0 failed"` while having silently tested nothing for that case — precisely the shape the task named: *"turn missing essential fixture/lemma/scroll conditions into named test failures rather than a successful SKIP."* Every one of these is a named, failing `check()` now, e.g.:

```js
check(`${lang} the fixture's Basic tab carries a lemma list to expand (essential precondition)`, hasLemmaToggle, hasLemmaToggle);
if (!hasLemmaToggle) { console.log("  fixture carries no lemma list this run -- recorded as a failure above, not a skip"); await ctx.close(); continue; }
```

The desktop section's `landed` check was the most serious of these: it previously had **no check() at all**, so the entire desktop-chrome variant of this suite could pass with zero assertions if the fixture failed to open there.

All pre-existing focus/tab/scroll/write assertions are unchanged in substance — only strengthened by the new checks above and by making a genuine failure visible where one was previously silent.

## What was actually exercised, in a real browser (re-verified against the corrected test)

Reproduced with Playwright against a local server (`node serve.js`):

1. Landed on the Note view for surah 2, āyah 71 (word-by-word on) — the Note view's own WbW panel renders `[data-word-occurrence]` spans directly (`app/js/ayah-renderer.js`'s `renderWordByWordPanel()`, shared with the Read screen).
2. Tapped a word from *inside* `#noteView` — the persistent Word Card correctly mounts into `#quranWordCardMountNote`, not `#quranWordCardMount`.
3. Opened the Basic tab, expanded the lemma list, and picked an occurrence link landing on a **different surah** (4:92, not 2:71) — the corrected filter now independently confirms `targetSurah !== ORIGIN_SURAH` before following it, rather than relying on a string-prefix mismatch.
4. Scrolled `.note-body` to a distinctive, non-zero position before leaving — now asserted as its own named precondition.
5. Followed the link — confirmed the app really does navigate to surah 4, āyah 92, that this is read off the RENDERED `surahSelect` value directly against the origin surah (not merely the link's own href), and that the Note view is genuinely left (hidden) while away.
6. Pressed "← Back to Word Card" — confirmed: original surah/āyah restored (2:71, not 4:92), the original word reopens, the Basic tab is restored, the lemma list is restored expanded, keyboard focus lands on the reopened card's own close button inside the Note mount, and **the Note view's scroll position is exactly where it was left**.
7. Repeated in Bangla, and again at a desktop width (≥900px), where the Note view is PR #137's own movable/resizable popup rather than the mobile fixed layout — same result in both, with the same strengthened preconditions and cross-surah assertions applied to the desktop variant too (which previously had none of them).

A `window.__fsLog` write-kind check confirmed the round trip itself writes nothing to Firestore, once correctly scoped past one unrelated fact investigated below.

## One thing found and correctly scoped out, not a defect either

The write-count check reports `writes=1` for the Note-origin trip's baseline (the Read-origin equivalent, PR #135's own suite, reports `writes=0`). Investigated rather than dismissed: the single write is an `updateDoc` on the `ayahNotes` collection, produced by `ensureAyahNotesWritable()` in `app/js/ayah-notes.js` — a one-time "confirm this person's notes document is writable" touch that `openNoteView()` calls on every **first** visit to the Note view in a session, gated by its own `writabilityChecked` cache so it never repeats. It fires the moment the Note view is opened at all, independent of whether a Word Card round trip happens afterward, and is unrelated to issue #113's scope. The write-count check is baselined *after* this one-time touch, so it measures what the round trip itself contributes (zero), not what opening the Note view once already cost.

## What changed (this round, 21 Sep 2026)

| File | What |
|---|---|
| `tools/i18n-verify/quran-word-card-note-origin-return.mjs` | **Corrected** — the cross-surah filter now compares surah NUMBERS rather than a `surah:ayah:` string prefix; an independent "destination is genuinely a different surah, read off rendered state" check was added (mobile and desktop); four previously-silent SKIP sites (lemma-missing, no-cross-surah-target ×2, Note-body-too-short-to-scroll, desktop fixture-did-not-land) are now named, failing `check()` calls instead of bare `console.log` + `continue`. 51 checks now (38 → 51), all passing. No existing assertion was weakened or removed. |
| `docs/reports/2026-09-21-word-card-note-origin-return-investigation.md` / `.html` | This report, corrected to describe the test fix, the re-verified result, and an accurate changed-file inventory. |

**No application file was touched, this round or the original one.** `app/quranrevival.html`, `app/js/quran-word-card.js`, `app/js/ayah-notes.js` and `app/js/ayah-renderer.js` were read but not modified — the corrected, more rigorous test still finds no defect on the Note-view-origin path, so per this round's own instruction no app fix was invented.

## Suite results

```
node tools/i18n-verify/quran-word-card-note-origin-return.mjs
==== 51 passed, 0 failed ====
```

Re-run, unmodified by this round, all at their own established baseline (no application code changed, so no regression is expected or found):

- `quran-word-card-popup.mjs` (PR #137's own 22-check suite) → **22 passed, 0 failed**
- `quran-word-card-flow-nav.mjs` (PR #138's own 19-check suite) → **19 passed, 0 failed**
- `quran-word-card-return.mjs` (PR #135's own 55-check suite) → **NOT reproduced clean in this sandbox session, honestly reported rather than forced.** Three separate attempts each produced **46 passed, 0 failed**, then hung until the 280s timeout at the identical line (`page.click('#quranWordCardMount [data-word-card-level="basic"]')`, the geometry section's viewport loop) with the identical cause printed by Playwright's own retry log: `<div class="splash-qs-item ...">... from <div id="quran-splash-overlay" ...> subtree intercepts pointer events`. This is the **exact pre-existing gap PR #137's own report already names**: `app/js/splash.js`'s `shouldShow()` (read and confirmed in this round, unmodified) has no `"never"` branch, so `harness.mjs`'s documented `mm_qs_splash_pref = "never"` convention does not suppress the Quran-entry splash for a raw-pointer-driven test — it shows on every fresh context, and a context created deep in this suite's own geometry loop can race it. **Not a real check failure at any point** (0 FAIL across all three attempts, only a hang after the last check that ran), **not caused by this round's changes** (`quran-word-card-return.mjs`, `app/js/splash.js` and `app/js/quran-word-card.js` are all untouched — read only, in this and the original round), and **not fixed here** — fixing `app/js/splash.js`'s missing `"never"` branch is an application-behaviour change unrelated to issue #113's Note-view-origin scope, and this task authorises correcting the *test in #139*, not shipping an unrelated app fix discovered while re-running someone else's suite. Recorded honestly rather than claiming a completed run this sandbox could not reproduce.

## Governance suites (all seven, required by this task)

Checkout preflight: `git fetch origin --unshallow`, then `git fetch origin claude/pensive-knuth-2pu3jj claude/phase4-wiring claude/laughing-goodall-kjfoqn claude/laughing-goodall-s7pc6n claude/laughing-goodall-wqztcn claude/laughing-goodall-711mno` — confirmed all six land as `origin/<branch>` remote-tracking refs (`git branch -r`), which is what `programme-ledger-mutations.mjs` and `brief-integrity.mjs` read by name.

```
1) programme-ledger.mjs                           → 8 passed, 23 noted, 0 failed
2) programme-ledger-mutations.mjs                 → 49 passed, 0 failed
3) brief-integrity.mjs                             → 8 passed, 0 failed
4) study-activity-evidence-boundary.mjs            → 27 passed, 0 failed
5) study-activity-evidence-boundary-mutations.mjs  → 11 passed, 0 failed
6) study-event-wiring.mjs                          → 41 passed, 0 failed
7) rules-authorisation-executable.mjs              → 38 passed, 0 failed
```

All seven reproduce the exact baseline PR #135, #137 and #138 each documented independently — matching main's own recorded state (v08.32 LIVE, four deployment states unchanged, 20 shared-file touch records: 13 AUTHORIZED / 7 DECLARED, 0 undeclared). **Run locally in this sandbox only** — no CI result for this head commit was available at the time of this report; a CI run, if the repository has one configured for this branch, is a separate signal not observed here.

## Next MAP Word Card candidate investigated: Mushaf-mode cross-surah scroll targeting — decision packet, not built

Per this round's own instruction, one further independent Quran-owned MAP Word Card candidate was investigated after the test correction above: the Mushaf-mode flow scroll-targeting gap PR #138 flagged and could not itself verify (*"a debug run with the Mushaf toggle on rendered zero `.hifz-page` elements... this sandbox's network policy does not reach `raw.githubusercontent.com`"*).

**Reproduced, not assumed — and the diagnosis is sharper than PR #138's own.** A focused debug run (surah 2 → cross-surah lemma jump, Mushaf toggle on, Whole Surah unit) found:

- The browser genuinely attempts the fetch (`GET https://raw.githubusercontent.com/.../mushaf-madani-v2.json`), and it fails with **`net::ERR_CERT_AUTHORITY_INVALID`** — not a routing block. `curl`, using this sandbox's own CA bundle (`/root/.ccr/ca-bundle.crt`), reaches the same URL and gets `HTTP 200`. The gap is specific to the **browser's** trust store under this sandbox's TLS-intercepting proxy, not an absence of network path. `.hifz-page` count after enabling Mushaf: **0**, and `#pageViewContainer` renders the app's own honest failure message, `"Couldn't load Mushaf page data (Failed to fetch)."` — confirmed the app fails closed and visibly, not silently.
- **This project's own standing lesson forbids the obvious workaround**: *"Never reach for `--ignore-certificate-errors` — it would also hide a real certificate problem."* The Playwright-level equivalent (`ignoreHTTPSErrors: true`) is the same class of bypass and was not used, for the same reason. **This sandbox therefore cannot verify any Mushaf-mode fix in a real browser, full stop** — the same conclusion PR #138 reached, confirmed independently and with a more precise root cause.

**Reading the code path (not just the network gap) found a SECOND, independent reason a naive fix would not work, which the network block alone would never have surfaced.** PR #138's own comment on `scrollFlowToCurrentAyah()` says Mushaf mode is left untouched because *"hifz-renderer.js keeps no per-ayah row to target (its word spans carry no ayah-identifying attribute)."* That is true of the DOM (no `data-ayah` attribute on a `.hifz-word` span) but **incomplete**: `hifz-renderer.js` already keeps a private `wordRegistry` (`Map<"surah:ayah", HTMLSpanElement[]>`), and already exports `setActiveAyah(ayahKey)`, which looks an ayah up in that registry and calls `scrollIntoView({ block: "nearest", ... })` on its first span — built for, and already used by, audio/drill playback highlighting. In principle this is exactly the primitive a Mushaf-mode `scrollFlowToCurrentAyah()` would need.

**But it cannot simply be called from there, because of an ordering defect independent of the network gap.** `navigateToAyah()` calls `renderStudyScreen()` synchronously and then calls `scrollFlowToCurrentAyah()` immediately after, on the very next line. `renderStudyScreen()` is not `async`, and its own Mushaf branch calls `renderFlowView(...)` (which is `async`, and does `await ensureMushafData()` plus font loads) **without awaiting it** — a genuine fire-and-forget. So even with real Mushaf data reachable, `wordRegistry` for the destination surah's pages would not yet be populated at the moment `scrollFlowToCurrentAyah()` runs; calling `setActiveAyah()` there would either no-op (ayah key not yet registered) or, worse, scroll/highlight a still-visible **previous** page. Closing this gap needs `navigateToAyah()`'s Mushaf branch restructured so the scroll call is genuinely awaited after the render completes — a real, if small, control-flow change to `renderStudyScreen()`/`renderFlowView()`'s call shape, not a one-line reuse of `setActiveAyah()`.

**Decision: not implemented this round.** Two independent reasons, either alone sufficient:

1. **Unverifiable here.** No fix to a rendering path this sandbox cannot exercise (real Mushaf glyph data over a browser this proxy's cert breaks) can be checked against a real screenshot or a real DOM state, and "Verify, do not guess" (this repository's own standing instruction) forbids shipping that blind.
2. **Not a one-line fix.** The real closing move needs `renderStudyScreen()`'s fire-and-forget call to `renderFlowView()` restructured so `scrollFlowToCurrentAyah()` can await it — a genuine, if small, behaviour change to a shared rendering function, deserving its own measurement and its own round, not a drive-by inside a test-correction task.

**Costed options for a future round, none chosen here:**

| Option | Cost |
|---|---|
| A. Restructure `renderStudyScreen()`'s Mushaf branch to expose an awaitable promise, await it in `navigateToAyah()`, then call `setActiveAyah()` | The real fix. Touches a shared rendering function (`renderStudyScreen()`/`renderFlowView()`), not just the word-card controller — needs its own round with layout/timing measurement, and cannot be verified in this sandbox at all (network/TLS gap above) |
| B. Build option A but verify it against a Playwright-level `page.route()` interception serving a small synthetic Mushaf JSON fixture, bypassing the real network fetch entirely | Avoids the TLS gap without touching any protected file (a new test-local `route()` call, not `harness.mjs`) — but is new test-infrastructure work in its own right and was judged out of this round's scope (a test-correction task, not a new-fixture-building one) |
| C. Leave the no-op exactly as PR #138 left it, re-flag with the sharper diagnosis above | Zero cost, zero regression risk. What this round does |

**Option C is what this round does.** Nothing under `app/` was touched for this investigation. **This item — restructure `scrollFlowToCurrentAyah()`'s Mushaf branch to await the real render, verified via Option B's synthetic-fixture route interception — is the named next eligible bounded item** for a future round: Quran-owned (`app/quranrevival.html`'s own function plus a new, unprotected `tools/i18n-verify/*.mjs` test file), no protected or shared path, no Owner decision required to attempt it, and testable in this same sandbox once built with Option B's approach.

## What this deliberately does NOT do

- **No protected or shared path touched** — none of `app/js/version.js`, `CLAUDE.md`, `CHANGELOG.md`, `app/js/i18n/bn.js`, `app/js/nav.js`, `app/js/unit-keys.js`, `app/js/records.js`, `app/js/activity.js`, `app/js/catalogue-data.js`, `app/css/shell.css`, any `tools/i18n-verify/{behaviour,harness,firebase-stub,brief-integrity,programme-ledger,programme-ledger-mutations}.mjs`, anything under `docs/governance/`, `firestore.rules`, `firebase.json`, `tests/firestore/`, `tools/firestore-emulator/`, or `.github/workflows/`.
- **No new translation string** — nothing rendered changed; this round only corrected a test file and its report.
- **No Firestore write, Rule, or index** — confirmed by the suite's own write-count check, correctly scoped.
- **No version bump.** `app/js/version.js` is untouched; `v08.32` stays current, `v08.33` is next unallocated. There is no behaviour change here to allocate a version for.
- **No merge, no rebase, no force-push, no deploy, no approval claimed.** Only fast-forward commits were added to `claude/laughing-goodall-711mno`.
- **The pre-existing Range/surah-crossing content-correctness defect PR #138 flagged is untouched** — out of scope for this round too.
- **The Mushaf-mode flow scroll-targeting gap remains flagged, not built** — see the decision packet above; a sharper diagnosis was produced, nothing under `app/` was changed.

## Owner app test — NO before merge, YES after (informational only; nothing to fix)

There is no behaviour to test, because there is no behaviour change — this round corrected a test file only. For completeness, on the live app once #135/#137/#138/#139 are merged, at `https://madrasatul-muslimeen.github.io/app/quranrevival.html`, signed in as owner/prime, at any width, in either language:

1. Open Quran Study, turn on word-by-word, open the **Note** view on an āyah that carries word-by-word data (e.g. surah 2, āyah 71).
2. Tap an Arabic word inside the Note view itself. Switch to **Basic Arabic**, expand the lemma-linked occurrences line, scroll the Note view down a little.
3. Tap an occurrence landing on a different surah. **Expected** (unchanged, already correct): you land on that surah's own page.
4. Tap "← Back to Word Card". **Expected** (unchanged, already correct): you return to the Note view, scrolled to exactly where you left it, with the same word, tab and lemma list open.
5. Repeat in Bangla.

No Firestore write happens anywhere in this flow beyond the Note view's own one-time "ensure writable" touch on first open, which is pre-existing, documented behaviour unrelated to this investigation.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
