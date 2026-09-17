# MAP — excavating `behaviour.mjs`: ten sections that had not run since v07.69

- **Date:** 2026-09-17
- **Task:** reach, classify and reconcile the part of `tools/i18n-verify/behaviour.mjs` that a crash carried since v07.69 had made unreachable
- **Blast radius:** **BR-0.** No application file changed. `git diff -- app/` is empty; `firestore.rules`, `firebase.json` and `app/js/version.js` byte-identical. Nothing deployed.
- **Application version:** **08.25, unchanged** — no behaviour changed, so the badge must not move.
- **Result:** ACCEPT. **802 → 973 checks, and the suite runs to completion for the first time since v07.69.** Zero application defects found. The only 4 remaining failures are environmental, recorded and not worked around.

---

## 1. What was actually broken

`CLAUDE.md`'s own standing lessons said this:

> `behaviour.mjs` has a pre-existing crash in section 42 (a stale
> `[data-note-master-toggle]` visibility assumption), carried since v07.69,
> and 3 environmental failures … **~800 checks pass before it.** Anything
> past that point needs a focused, un-checked-in script.

That was true, and it had been treated as a known limit rather than as a debt. The cost was not the one crash. It was that **everything after it had stopped running**: 1,465 lines and **ten whole sections**, 26% of the file.

| Section | Subject |
|---|---|
| 42 (tail) | the Note view's two bars, Approach, Root, Derivatives, full screen |
| 43 | the wheel's intro, the in-hub Surah/Ayah pickers |
| 43i-o | the hub's own content |
| 44 | the Bookmark Manager |
| 45 | Quran bookmarks — naming, settings capture/restore, the Read screen's star |
| 46 | the `?bookmark=` deep link |
| 47 | every other module's Bookmark star |
| 48 | the bookmark popover's folder picker |
| 49 | the nav bar's live Bookmark dropdown |
| 50 / 50h-k | the expanded/collapsed option, the person tag, and both in Bangla |

## 2. The finding that matters most: the crash hid the rot it created

`git log -S` pins `.note-ayahbar`, `.note-ref` and `.note-journey-btn` — three selectors the unreachable checks depend on — to **v07.70**, whose own commit subject is *"fix Note view bar regressions from v07.69"*.

So the sequence is: v07.69 introduced the crash; v07.70, **the very next commit**, restructured the Note view's bars. By then nothing downstream was running, so no check objected. Every later round inherited a suite that looked healthy at ~800 and was quietly accumulating assertions about a screen that no longer existed.

None of the three selectors is present in `app/` **or** in `legacy-v07/`, which is frozen at v07.139 — so they have not described any shipped build since v07.70.

## 3. A worse class than "went stale": assertions that were never true

Two of the selectors reached this round appear in **no commit that ever touched `app/`**:

- `data-bm-nav-expanded` — the bookmark dropdown's expand control
- `.note-approach-desktop` / `.note-approach-mobile` — the Approach picker's phone/desktop split

`git log -S'data-bm-nav-expanded' -- app/` returns **nothing**, while the same search over `tools/` returns the merge that added the check. These were written against a design that changed inside the same round, and because the crash sat upstream of them they were never once executed against real markup.

**The lesson is not "check your selectors".** It is that a check written in the same round as the feature, in a region the suite does not reach, has no first run to fail in — so it never earns the right to be believed. A region the suite cannot reach must be treated as *unverified*, not as *passing silently*.

## 4. Every issue, classified

The mandated taxonomy is: application defect / stale-superseded test / test-harness defect / environmental / genuine Owner decision.

| # | Issue | Class | Resolution |
|---|---|---|---|
| 1 | `[data-note-master-toggle]` not visible (the original crash) | stale | Collapse moved into the `⋮` menu. New `clickInNoteTools()` helper opens the menu, **asserts a rendered box**, then clicks |
| 2 | `.note-ref` used to blur the editor | stale | blur `[data-note-editor]` directly via `page.evaluate` |
| 3 | `.note-ayahbar` null | stale | renamed `.note-pickerbar` in v07.70 — 3 sites |
| 4 | 42m's bar-1 assertions | stale | rewritten to the current contract: bar 1 is the picker bar, bar 2 carries the nav cluster, Copy and Collapse are in `⋮` |
| 5 | `[data-note-next]` | **test-harness defect of my own** | my first correction guessed a selector. `renderNoteNavHtml()` omits the inner āyah pair **deliberately** for Single Ayah ("the two would be identical"), so the unit mover *is* the āyah mover there |
| 6 | Copy / Share sub-toggles not visible | stale | routed through `clickInNoteTools()` |
| 7 | `.active` on the Word-by-word / Root toggles | stale | the renderer writes `class="qm-item${isOn ? " is-on" : ""}"`. `aria-pressed` was correct all along; the check also carried no diagnostic, so it "failed telling us nothing" |
| 8 | `data-bm-nav-expanded` (a `<select>`) | stale — **accepted Owner decision** | v07.120 replaced it with a one-tap toggle button on the owner's own words: *"we don't need double tap to change from collapse to expand and vice versa"* |
| 9 | `.note-approach-desktop` / `-mobile` | stale | the Approach picker left `⋯` for the Track card's own header ("change the approach from inside the card straight away") |
| 10 | 42t's ordering indices | stale | the three toggles are no longer direct children of `.note-bar2`; the order now lives inside the `⋮` menu, so that is where it is read |
| 11 | 22g × 3 — the Asma poster | **environmental** | this sandbox's proxy blocks `archive.org`. **Intermittent**, not permanent — passed in runs 1/3/5, failed in 2/4/6/7 |
| 12 | 31e — `ERR_CERT_AUTHORITY_INVALID` | **environmental** | sandbox TLS artefact. Recorded, not fixed |

**Zero application defects.** Ten sections of never-executed tests, and every single finding was a test describing a UI that had since been redesigned — twice over, in v07.70 and v07.120, both owner-driven.

## 5. Coverage was preserved, and in four places increased

The instruction was explicit: *do not rewrite tests merely to obtain green results.* Each reconciliation asserts the contract that **replaced** the old one, and four are strictly stronger than what they replaced:

- **42p** now holds at *every* viewport instead of branching on width: one `⋯` menu, Mapping My Journey inside it as the disabled placeholder, the Approach picker in the Track card's header, **exactly one** of it.
- **42r** asserts the move it depends on actually happened — the āyah number really advances by one — before asserting what survived it. A nav button that silently did nothing would previously have read as a pass.
- **50c** adds the contract v07.120's `e.stopPropagation()` exists for: the dropdown **must not close on its own tap**. That was the owner's real defect report, and nothing was guarding it.
- **50j** taps the toggle so that **both** of its Bangla labels are read. A control whose label changes carries two strings and shows one at a time; strip the `▸`/`▾` glyph first, or a leading arrow satisfies the regex while untranslated English hides behind it.

## 6. A check of mine that could not fail

My own first pass at 42p wrote:

```js
approachInMore: !!view.querySelector('[data-note-menu="more"] [data-note-approach-select]')
                || !!view.querySelector("[data-note-approach-select]"),
```

The fallback is true whenever the picker exists anywhere, so the clause could never fail — and it was green while asserting the opposite of the truth. Reading the renderer settled it: the picker is **not** in `⋯`; it is in the card. Corrected to three separable facts (not in `⋯`, in the card, exactly one copy).

This is the same family as the `async`-body runner and the `slice(0, 30)` row count already in the standing lessons: **a guard that cannot fail is worse than no guard, because it is believed.**

## 7. Measured progression

| Run | What changed | Pass | Fail | Stopped at |
|---|---|---|---|---|
| 1 | baseline | 802 | 1 | 4123 — master toggle not visible |
| 2 | menu-click helper | 804 | 4 | 4194 — `.note-ref` |
| 3 | + editor blur | 820 | 1 | 4305 — `.note-ayahbar` null |
| 4 | + first reconciliation | 826 | 9 | 4440 |
| 5 | + corrections to my own checks | 836 | 1 | 4465 — Copy sub-toggle |
| 6 | + Copy/Share via the menu | 841 | 5 | 4545 |
| 7 | + `is-on`, `-next-ayah` | 842 | 4 | 4553 — `[data-note-next-ayah]` absent in Single Ayah scope |
| 8 | + sections 42s/42t/50 reconciled | 899 | 10 | 5170 — the retired bookmark's own row |
| 9 | + 42s/42k/43f/44 reconciled | 918 | 2 | 5312 — `[data-qm-bookmark]` gone from the Read menu |
| 10 | + section 45's Bookmark control | 971 | 3 | 5312 → 5848 — `#tabReadBtn` outside its menu |
| **11** | **+ 50j bound to `prefs.js`, `clickStudyPillarItem`** | **973** | **4** | **nothing — the file ran to the end** |

Every failure in every run is accounted for in §4. **Run 11 reached the end of the file**: 56 sections, 977 checks in total, and the only 4 failures are the environmental pair (22g × 3, 31e). The baseline was 802 passing and a hard stop in section 42; **+171 checks are now executing that had not run for 70 rounds.**

The 22g trio is the proof of its own intermittency inside this tranche alone: it **passed** in runs 1, 3, 5, 9 and 10 and **failed** in 2, 4, 6, 7, 8 and 11, on identical code. Anything that treats it as a permanent property of the sandbox is wrong; anything that treats a green 22g as evidence is also wrong.

## 8. What was deliberately NOT done

- **No application file was touched.** Not one finding justified it.
- **The bookmark's own `.active` at line 4183 was left alone** — that control really does use `.active`. Only the `⋮` menu items were changed.
- **The two environmental failures are recorded, not worked around.** No retry loop, no skip, no proxy fix. `archive.org` and the sandbox's TLS interception are not this project's to fix, and hiding them would remove the one signal that says the run was made in a sandbox.
- **No Rules, indexes, migration or production data were touched.** All seven pending-dependency items are unchanged.

## 9. Verification

**Run 11 is the run of record.** 973 pass / 4 fail, no crash, 56 sections, ending on `50j-k no page errors` — the last check in the file. `node --check` clean before every run. `git diff -- app/` empty throughout, so nothing here can have changed what the owner sees.

Two further issues were found and fixed in runs 9–11, both of the same class as the rest:

- **Section 45's Bookmark control.** The Read screen's ⋮ menu carried a Bookmark item; a later *Multi-student round* put a direct, always-visible button on `#readBar` and dropped the menu copy — `showBookmark: false`, with the reason in the call site's own comment: *"one mechanism, not two ways to do the same thing on the same screen."* Eight call sites moved to `#readBookmarkBtn`, and 45a now asserts **both** sides: the bar has the button, and the menu deliberately does not duplicate it.
- **`50j` had drifted in my own reconciliation.** I wrote `grpValues.join(",") === "folder,person"`; the Bookmark-issues round had added a third mode, `module`. The check now reads `BOOKMARK_GROUP_BYS` **out of `app/js/prefs.js`** and throws if it cannot parse it, so the next mode added is covered the day it lands. This is the standing lesson about hardcoded ids, caught applying to a check I had just written.
- **`#tabReadBtn` clicked bare** in the Bangla half of section 50 — Read moved inside `#studyPillarMenu`, so the click resolves and then times out on a 0×0 box. Every other site already used `clickStudyPillarItem()`; this one had never been reached.

---

*Master Architect audit: the tranche is BR-0, additive to the harness only, and changes no accepted decision. It closes a standing lesson that had hardened into an accepted limit, and it replaces that lesson with a sharper one: a region a suite cannot reach is unverified, not passing.*
