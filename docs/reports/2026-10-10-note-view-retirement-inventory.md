# Note view retirement — inventory (issue #738)

Result: **the removal is NOT clean. Stopped after step 1 (inventory); no code removed.**

Counts: `app/quranrevival.html` has 145 lines naming `noteView`/`NoteView`/`__dormantOpenNoteView`, 143 uses of `noteScope`; `app/js/ayah-note-renderer.js` has 12; about 25 suites in `tools/i18n-verify` name the Note view.

## Reached only by the Note view and the seam (removable in principle)

| Item | Where | Callers |
|---|---|---|
| `window.__dormantOpenNoteView` | quranrevival.html ~10609 | tests only |
| `openNoteView()` | ~22498 | seam, `jumpToApproach`/goToAyah comments; only setter of `stageView = "note"` |
| `#noteView` markup, `#noteViewMount`, resize handles, splitter, `initPopupWindow(noteView…)` | ~5377–5450, 22027–22078 | openNoteView |
| `renderNoteViewNow()` | ~21392 | openNoteView, `stageView === "note"` branches (~9965, 15064, 18482, 18856, 20715, 23651), nav handlers (~21013–21114) |
| `renderNoteView()`, `attachNoteViewHandlers()` | ayah-note-renderer.js 311, 670 | renderNoteViewNow only |
| Note-view CSS (`#noteView…`, 2158, 2165, 4123, 4479…) | quranrevival.html | markup above |

## SHARED — must stay, and are entangled with the Note view

| Item | Shared with | Entanglement |
|---|---|---|
| `refreshQcrDrawerSummaries(unitKey, root = noteView)` | QCR pop-up | default parameter is `noteView`; also called from renderNoteViewNow wiring |
| `wireApproachEmbed(info, root = noteView, rerender = renderNoteViewNow)` | Approach card (`paintPaneApproachCard`, ~23078) | defaults and a `root === noteView` branch (~22167) |
| `wireAsmaTrackEmbed(number, root = noteView, rerender = renderNoteViewNow)` | QCR pop-up | same |
| `wireAsmaXNoteFields(unitKey, root = noteView, rerender = renderNoteViewNow, ayahNum = noteScope.ayahNum, …)` | QCR pop-up (~22484) | default reads `noteScope`; `root !== noteView` test (~22362) |
| `attachQcrDrawerHandlers`, `renderQcrDrawerHtml` | QCR pop-up | exported from the same module as attachNoteViewHandlers, which calls it (line 837) |
| `noteScope`, `noteScopeCurrentUnitKey()`, `noteScopeUnitInfo()` | QCR pop-up, Read Notes pane (143 uses) | state shared with the Note view |
| shared listeners `["readView","noteView"]` (~16193, 16314, 17706) | Read view | iterate both ids |
| `fitNoteWriting` / MutationObserver on `noteView` (~10799) | Writing sheet? needs tracing | observes `noteView` |
| `openAyahNoteViewPopup` (~19930) | ayah action sheet | unrelated name; stays |

## Why stopped

Removing the Note view needs rewriting default parameters and `noteScope` reads in four shared helpers used by the QCR pop-up and Approach card, re-pointing the shared listeners, and updating ~25 browser suites. That is a larger, riskier edit than a "remove what nothing else reaches" cleanup, and each shared-helper change touches live surfaces. Suggested split for the Architect: (a) decouple the shared helpers from `noteView` defaults (behaviour-neutral, checked by qcr-popup / pane-approach-card suites); (b) then delete the dead Note view code and update the suites in place.

No checks were run (no code changed).
