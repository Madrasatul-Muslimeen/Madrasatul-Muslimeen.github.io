# v08.27 — every number picker on the Study-options units bar cut a three-digit value

- **Date:** 2026-09-18
- **Repository:** `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io`
- **Base:** `main` at `e2e2af5` (v08.26, merged earlier the same day)
- **Task:** investigate the remaining `surahSelect` and `unitTypeSelect` truncations by measuring the actual controls and their layout; correct a proven defect **if the existing design determines the remedy**; leave `tenantSelect` alone as Owner decision **O3**
- **Blast radius:** **BR-1.** One CSS declaration in `app/quranrevival.html`, plus the version bump. No JS, no markup, no schema, no Rules, no indexes, no data.
- **Application version:** **08.26 → 08.27**, same tranche — the change is reachable.
- **Result:** ACCEPT. The investigation found a **different and larger defect than the one it was sent for**: all five number pickers cut a three-digit value at every viewport in both languages. Fixed, with the remedy the app itself had already established. `surahSelect` and `unitTypeSelect` are **not** fixed and that is the finding — their row is genuinely short of space, so they join `tenantSelect` as Owner UI decisions.

---

## 1. Part one: the merge

`claude/charming-rubin-xzxbk1` at `49f37c9` was verified and merged to `main` before any new work.

| Check | Result |
|---|---|
| ahead / behind `main` | **4 / 0** |
| `main` an ancestor of the branch | **yes** — clean fast-forward, no divergence |
| files under `app/` | exactly **two**: `app/css/shell.css`, `app/js/version.js` |
| the whole reachable change | `@media (max-width: 340px) { .nav-cat { flex-basis: auto; } }` + `08.25 → 08.26` |
| `firestore.rules`, `firebase.json`, `docs/governance/`, `tests/`, `firestore.indexes.json` | **0 files touched** |
| `legacy/`, `legacy-v07/` | untouched |
| `7e2931f` an ancestor of the merge | **NO** — the held Phase 4 wiring is neither included nor activated |

**Merge SHA: `e2e2af5454a738bc07189cb992488e696af43fb4`** (fast-forward to `49f37c9`, then one commit recording the merge in the brief and the log).

### 1.1 Live-version verification

| Level | Result |
|---|---|
| `origin/main:app/js/version.js` | **08.26** |
| rendered badge, merged `main` | **`v08.26`**, really on screen, `#appTitleText` = "QuranRevival v08.26", **no `08.25` anywhere on the page** |
| the nav fix actually live | at 320px English, **zero truncations**; cells content-sized **49.6 / 66.2 / 76.3 / 76.8** instead of four equal 67.2 |
| GitHub Pages itself | **not verifiable from here** — the sandbox proxy refuses the connection (`curl: (56) CONNECT tunnel failed, response 403`). Environmental, the same class as `archive.org`. **This is the Owner's one-click check: open the app and read the badge.** |

### 1.2 One thing the merge made stale, and the guard caught it

`brief-integrity.mjs` passed immediately after the merge **only because it reads `origin/main`**, which was still 08.25 until the push. That is the right thing for it to measure — but it means the milestone line had to be corrected as part of the merge, not after it. It was: the line now reads "v08.26 on `main`", the round entry is marked merged, and the nav baseline is marked paid off and live. The correction note from earlier in the day is **kept**, because the episode is the lesson.

---

## 2. Part two: what the measurement found

### 2.1 The row is genuinely short — the opposite of v08.26's nav

v08.26's nav truncation turned out to be space that was present and misallocated. The first question here was whether this row is the same shape. **It is not.** Letting the cells shrink-wrap and measuring the row's natural width against what it has:

| | available | needed | slack |
|---|---|---|---|
| 320px, Single Ayah | 257 | 253.6 | **+3.4** |
| 320px, **Range** | 257 | 320.9 | **−63.9** |
| 360px, Single Ayah | 297 | 253.6 | +43.4 |
| 360px, **Range** | 297 | 320.9 | **−23.9** |
| 390px, Range | 327 | 320.9 | +6.1 |
| 412px, Range | 349 | 320.9 | +28.1 |

At 320px and 360px in Range the row needs **64px and 24px more than exists**. No redistribution reaches that.

**And the nav's own remedy would make it worse here, which is worth stating because the pattern looked identical.** `.opt-bar-units > .opt-cell` uses the same `flex: 1 1 0` the nav did — but a `<select>`'s intrinsic width is its **longest option**, and `surahSelect` holds 114 surahs whose longest renders at **113px** against the 97.4px it currently gets. Content-sizing this row makes it need *more*, not less.

### 2.2 The defect the task was not sent for

Measuring the controls properly meant measuring the **dropdown arrow** rather than assuming it. A `<select>` sized to `max-content` is text + padding + border + arrow, so subtracting a span of the same text in the same computed font leaves the arrow: **20.3px**.

That, plus 10px of padding and border, leaves a 49.6px number cell with **19.3px of usable text width** — against a three-digit value needing **21.9px**.

| picker | longest real value | baseline slack (en) | baseline slack (bn) |
|---|---|---|---|
| `ayahSelect` | 286 (Al-Baqara) | **−2.6** | **−2.2** |
| `unitNumSelect` | 604 (page) | **−2.6** | **−2.2** |
| `rangeFromSelect` | 286 | **−2.6** | **−2.2** |
| `rangeToSelect` | 286 | **−2.6** | **−2.2** |
| `drillRepeatSelect` | 10× | cut | cut |

**At every viewport measured — 320, 360, 390, 412 — and in both languages.** Not one width escapes. Any surah with 100 or more ayahs shows it, which is most of the long ones the Owner reads.

### 2.3 The app had already diagnosed this, once, and fixed only half of it

`#readPickers`' own CSS comment, verbatim:

> *"A number picker never needs a share of the line — **same rule as the Study options bar's own `.opt-cell-num`**. Round 27 widened it 3.1rem → 3.9rem: **the owner reported a three-digit ayah reading as cut off, and it was — '286' plus the dropdown arrow does not fit 50px.**"*

Round 27 fixed the Read screen's pickers and **left the twin its own comment names** at `3.1rem` = **49.6px** — the exact 50px that sentence says does not fit. This is the project's recorded shape: an accepted decision that reached one surface and not its sibling.

So the remedy is determined **in kind** — a number picker must fit three digits — and the Owner has already reported this very symptom once.

### 2.4 The sibling's number is not affordable here, and that was measured too

Copying `3.9rem` costs 12.8px per number cell, taken from the flexible cells on the same row. Measured across every viewport and both unit modes:

| candidate | number cell | `unitTypeSelect` | `surahSelect` |
|---|---|---|---|
| baseline | **−2.6** | −1.9 … −53.2 | −5 … +13 |
| **C1 — padding 0.25rem → 0.1rem** | **+2.2** | **unchanged, every row** | **unchanged, every row** |
| C2 — the sibling's 3.9rem | +10.2 | −8.3 … −66 | **+2 → −10.8 at 390/Range, a NEW cut** |
| C3 — padding + 3.4rem | +7 | −4.3 … −58 | **+2 → −2.8 at 390/Range, a NEW cut** |

**C2 and C3 trade one defect for another.** C1 buys the same room from inside the cell and **moves no other control by a single pixel**.

C1 is also the move `.opt-cell-num` already makes for itself: it already carries its own smaller label type (`0.66rem` against `0.72rem`) precisely because a narrow number cell needs tightening the others do not.

### 2.5 The fix

```css
.opt-cell-num > select { padding-left: 0.1rem; padding-right: 0.1rem; }
```

**It must sit AFTER `.opt-cell > select`.** The two are equal specificity (0,2,1), so source order is the only thing that makes this one win — this page's own most-repeated CSS trap, checked rather than assumed (the rule lands at line 340, the one it overrides at line 311).

Verified on the real page, not through an injected stylesheet:

| | en | bn |
|---|---|---|
| `ayahSelect` / `unitNumSelect` / `rangeFromSelect` / `rangeToSelect` | **+2.2** | **+2.6** |
| at 320 / 360 / 390 / 412, unit = ayah / page / hizb / juz / range | **all ok** | **all ok** |

**Stated honestly: +2.2px is thin.** More headroom is available and was deliberately not taken, because every way of buying it costs `surahSelect` a new truncation (§2.4).

---

## 3. What was NOT fixed, and why it is an Owner decision

`surahSelect` and `unitTypeSelect` are still cut — at 320px in both modes, and in Range up to 412px for `unitTypeSelect`. **This is not an oversight.**

Their row is short by **63.9px at 320px in Range** and 23.9px at 360px. Nothing redistributive closes that. The available remedies are **materially different products**:

- **wrap the row** onto two lines at narrow widths — costs vertical space on a screen already measured to the pixel;
- **shrink the type** — v08.02 already established that Bengali matras make small type cramped in a way English does not;
- **shorten the option text** ("Range of Ayahs" → "Range") — a wording change, user-visible, and I11 means both languages.

Each is a different answer to "what should this screen show when it cannot show everything". **That is the Owner's call, exactly as `tenantSelect` is.** `tenantSelect` was not touched.

**All three now sit together as Owner UI decisions**, which is a cleaner statement of the backlog than "3 select truncations" was.

---

## 4. The guard could not see this, and now can

`panel.mjs` tested `need > w - 22`:

- the **22px arrow was assumed**, not measured (it is 20.3px here);
- it **ignored the control's own 10px of padding and border**, so the test was optimistic by exactly that much and returned "not cut" for text genuinely clipped;
- it measured only the **selected** option, and its fixture sits on surah 1 where the ayah picker reads "1".

Three reasons the live defect was invisible to it. It now measures the arrow, subtracts padding and border, and judges against the **longest** option as well as the selected one.

**Mutation-proven:** revert the CSS and `panel.mjs` exits **1** with `48 PROBLEM(S)`, naming `unitNumSelect` and `drillRepeatSelect` as newly truncated; restore, and it exits **0** with `app/quranrevival.html` byte-identical.

`drillRepeatSelect` was **not predicted** — it is an `.opt-cell-num` on the listen bar, and the fix reaches it too. Found by the mutation, not by reading the code.

---

## 5. Verification

| Suite | Result |
|---|---|
| `behaviour.mjs` | **978 pass / 4 fail**, 982 checks — the 4 environmental (22g × 3 archive.org, intermittent; 31e TLS). Same 982 total as v08.26's clean run |
| `layout.mjs` | **EXIT 0**, `NO LAYOUT REGRESSIONS`, **`CHANGED: 0`**, 16 configurations; targets 250 → 250, deferred 22, **dangling 0** |
| `panel.mjs` | **EXIT 0**, `PANEL OK`; number pickers gone from the truncation list; 64 tolerated baseline hits across the three Owner-decision ids |
| `panel.mjs`, mutated | **EXIT 1**, 48 problems, names the regression |
| `navcheck` / `reading` | EXIT 0 each |
| `brief-integrity` | 8 / 0 |
| `rules-authorisation-executable` | 38 / 0 |
| `firestore-index-requirements` / `rules-deployment-candidate` / `stub-parity` | 8 / 10 / 3, all 0 fail |
| Translation coverage | **1,803 / 47**, unchanged — no new string |
| `git diff -- app/` | exactly `app/js/version.js` and `app/quranrevival.html` |

The `layout.mjs` shim was built from `HEAD` and **deleted before the coverage total was read** — this project's own recorded trap.

## 6. What this tranche did NOT do

- **No Rules or indexes deployed**, and none changed. `firestore.rules` and `firebase.json` byte-identical.
- **`7e2931f` untouched** — not merged, not activated, not re-cut, not re-stamped. Its own 08.26 stamp is now two versions behind `main`; at merge it resolves to the next free number.
- **`tenantSelect` untouched** — Owner decision **O3**.
- **`surahSelect` / `unitTypeSelect` untouched** — now Owner decisions alongside it, with the measurement that makes them decidable (§3).
- All seven pending-dependency ledger items unchanged. The blocker is still **E1 — authenticated Firebase access** — and it is access, not design.

## 7. Follow-on sweep: was the old heuristic hiding anything else?

`panel.mjs`'s `need > w - 22` hid a live defect, and it only ever measured **one bar on one page**. With the corrected method proven, it was cheap to ask what else it might have hidden: every `<select>` across **12 pages × 2 languages × 2 viewports (320px and 390px)**, judged on measured arrow + real padding and border.

**Result: nothing.** Three hits came back at **0.7px, 0.6px and 0.0px** — sub-pixel float noise from canvas text measurement, not truncation. Re-run with a 1px floor: **zero**.

**Scope, stated rather than implied:** this sweep sees selects that are **visible on page load**. It does not open the Study-options panel, whose controls measure 0 until it is opened — those are `panel.mjs`'s job, and there `tenantSelect`, `surahSelect` and `unitTypeSelect` remain cut as §3 describes. One incidental fact worth keeping: `tenantSelect` on `people.html` and `bookmarks.html` gets **272.3px** of usable width and fits comfortably. **Its truncation is specific to the Study-options panel's 145px cell**, not to the control or its content — which is useful to the Owner when they come to decide O3.

**So the number-picker class was the only thing the heuristic was hiding**, and it is closed.

## 8. The lesson

**Measure the control, not the assumption inside the tool that measures it.** The task was sent about `surahSelect` and `unitTypeSelect`. Measuring properly — a real arrow width instead of a guessed 22px, real padding, and the longest option instead of whichever the fixture had selected — showed those two were *not* fixable and that five other controls were quietly broken at every width in both languages, with the Owner's own earlier bug report already written into the CSS next door. **The suite's own heuristic was the reason nobody had seen it.**
