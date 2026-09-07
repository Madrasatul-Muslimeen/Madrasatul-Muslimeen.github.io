# Should the READ and NOTE views be merged into one "Study" view?

A question put to a third-party AI architect for review.

| | |
|---|---|
| **App** | QuranRevival — a multi-tenant Madrasah study platform |
| **App version** | **v08.02** (the v08 line is open; this work would be a round within it) |
| **Prepared** | 7 September 2026 |
| **Repository** | `Madrasatul-Muslimeen/Madrasatul-Muslimeen.github.io` |
| **Live app** | `https://madrasatul-muslimeen.github.io/app/` |
| **Nature of this document** | **Analysis only.** No application code was changed to produce it. Every factual claim below was re-verified against the v08.02 source on 7 Sep 2026. |
| **Companion package** | `AI_APP_REVIEW_PACKAGE/` in the same repository — a fuller architectural audit prepared at v08.00, covering the Qur'an data model. Useful background, not required reading for this question. |

---

## What is being asked

The QuranRevival module (the Qur'an study screen) has two of its five screens
devoted to one āyah: **READ** and **NOTE**. To the owner they look like near
duplicates — the same picker bar, the same navigation, the same buttons — and
the question is whether they should become one screen called **Study**.

**We want an outside opinion before committing.** Specifically: is merging them
the right call, and if so, in what shape? Four decisions are listed at the end
that we cannot settle from the code alone.

---

## 1. The project, in the space it needs

- **Vanilla ES modules, no build step, no framework.** Firebase/Firestore
  backend (modular SDK), static hosting on GitHub Pages. There is no bundler:
  what is in the repository is what the browser runs.
- **The whole Qur'an study module is ONE file** — `app/quranrevival.html`,
  **12,051 lines**, markup + CSS + one inline `<script type="module">`. The
  shared renderers it calls live in `app/js/` (`ayah-renderer.js` 230 lines,
  `ayah-note-renderer.js` 924, `note-popup.js` 374).
- **The owner is a non-coder.** They cannot read or verify code. This is the
  binding constraint on how work is done here: verification has to be
  mechanical, and "please test this" is a step that may never happen.
- **The app is live and in daily real use** by its owner. Every round is driven
  by friction they hit themselves.
- **Bilingual throughout** — English and Bangla, 1,732 translated strings,
  including all interface chrome. Any new control is a translation job too.
- **Seventeen binding invariants.** The ones that bear on this question:
  - **I2** — modules never call each other; renderers are shared, pure
    components that never touch Firebase.
  - **I4** — nothing is ever deleted; archive, revoke, return.
  - **I5** — units are keyed by permanent ID, never by name.
  - **I9** — nothing joins the startup path without being flagged.
  - **I11** — every user-visible name is language-keyed.
- **A non-negotiable load-speed contract.** The Quran Study page currently
  costs **6 sequential Firestore round trips / 9 calls** to become usable, and
  that number is re-measured every round by a checked-in tool
  (`tools/perf/measure.mjs`). Any design that adds a blocking read has to
  justify itself.

---

## 2. The five stage views, as they are at v08.02

`app/quranrevival.html` has one `#stage` element that shows exactly one of five
views, switched by `setStageView()`. Five dock tabs at the bottom of the screen
select them:

| Tab | View | What it is for |
|---|---|---|
| **Options** | `#panelStudyOptions` | A drawer of settings — which surah, which unit, reading and listening choices |
| **Read** | `#readView` | Reading the Qur'an |
| **Note** | `#noteView` | Writing notes on, and **claiming**, what is being studied |
| **Approach** | `#wheelPopupView` | The Mastery Wheel — 30 Approaches, coloured by claim status |
| **Explore** | `#exploreView` | Browsing the Qur'an's structure, and named āyah collections |

### The one structural fact that dominates the question

**On a desktop (≥900px), three of those views float as draggable, resizable
windows over the fourth.** `initPopupWindow()` (`app/js/note-popup.js`) is
called for `#wheelPopupView`, `#exploreView` and `#noteView` — and
**deliberately not for `#readView`**, which is the background canvas they float
over.

```
app/quranrevival.html:7223   initPopupWindow(wheelPopupViewEl, …)
app/quranrevival.html:7229   initPopupWindow(exploreView, …)
app/quranrevival.html:10815  initPopupWindow(noteView, …)
                             — no such call for readView
```

So "merge Read into Note" is not only a UI question. **Fold the canvas into one
of the windows and there is no canvas left for the other two to float over.**

---

## 3. What each screen actually does — verified at v08.02

The premise "they do almost the same things" is **half true, and the half that
is false is the important half.**

### Genuinely shared

Surah/āyah/unit pickers · Previous/Next · Copy · Share · Word-by-Word · Root ·
Derivatives · text size · bookmark · Play · attach-to-Asma · the āyah text
itself.

Several are already *literally the same code*, not merely similar — the
copy/share language picker (`langCheckboxRows()`), the text-size control
(`renderTextSizeButtonHtml()`), and the Word-by-Word/Root/Derivatives toggles,
which flip the same canonical checkboxes in Study options from either screen.

**This is the overlap the owner sees, and it is real.** It is also the part
that is already deduplicated.

### READ only

- **Mushaf view** — a real printed page with the rest greyed out.
- **The sideways, right-to-left paged strip** (`#pageViewContainer`,
  `body.read-sideways`) — each āyah or Mushaf page is a full-screen page you
  move *across*, in Arabic reading order.
- **The flow view** — a whole surah or range drawn at once.
- **Real recitation** — the whole unit, several reciters in sequence, with
  Repeat/Mode/Loop and Stop, and a gold band that follows the recitation from
  āyah to āyah and scrolls the strip to keep it in view
  (`playCurrentSelection()`, `markPlayingAyah()`).
- **A three-state full screen** — normal → reading-only → bare — cycled by
  tapping the text, with five independent `fs-hide-*` switches for what "bare"
  means.
- **The moving tagline strip.**

### NOTE only

- **The saved rich-text Notes editor** and its formatting palette, writing to
  the `ayahNotes` collection.
- **Collapsible Arabic / English / Bangla / Notes fields**, and a
  by-language vs by-āyah layout switch.
- **"Also noted at:" pills** — which wider units covering this āyah already
  carry a note.
- **The Track / Guide / Breakdown / Coverage card** — where a claim is made.
- **The collections drawer** (🗂) — filing an āyah into named collections
  (QCR) and Asma ul Husna groups.
- **"◂ List & wheel"** — back to whichever collection this āyah was opened from.
- **On a desktop: the whole floating-window treatment** — drag, resize on eight
  edges, maximize, plus a **side pane** listing the other āyāt in the current
  group with its own List/Card view and Prev/Next.

**Neither screen is a subset of the other.** Each carries substantial machinery
the other has no equivalent of.

---

## 4. **What changed last week, and why it may change the answer**

This is the most important section for a reviewer, because the previous
analysis of this question (made at v07.132) is now partly out of date.

**v07.139 (6 Sep 2026) redefined what the NOTE view is.** Before it:

- The Mastery Wheel always showed one āyah, whatever unit was selected.
- The Note view's Track card was gated on `noteScope.unitType === "ayah"` — it
  could only claim a single āyah.
- Every wider unit (Range, Whole Surah, Ruku', Juz, Hizb, Page) could only be
  claimed through a *different* control — a floating overlay in Study options.

After it:

- `renderWheel()` reads `currentUnitInfo()` — the wheel reflects whichever
  Study Unit is selected.
- Clicking a wheel slice calls `openNoteView(unitInfo.unitKey)`
  (`app/quranrevival.html:5758`).
- **`showApproach` is now unconditionally `true`**
  (`app/quranrevival.html:10263`), and the Track card claims whatever unit the
  Note view is scoped to. Its heading takes an `approachLabel` because it can
  no longer say "āyah".

**So the app's own division of labour has moved AWAY from "two screens that do
the same thing" and TOWARD three distinct roles:**

| Screen | Role |
|---|---|
| **Read** | reading — the text, the recitation, the page |
| **Approach** | assessment overview — 30 Approaches × the selected unit, coloured by claim status |
| **Note** | the working surface — write about, file, and **claim** the selected unit |

The owner described the same split in their own words a round earlier: *"the
Ayah screen and all its functions is for study, and the Approach card is for
assessment of the status of the study."*

**A reviewer should weigh this carefully.** The merge was proposed when Read and
Note looked like duplicates. One round later, Note has become the app's claiming
surface for every unit type, which is a job Read has never done. The honest
question may no longer be *"are these two the same screen?"* but *"is the
boundary between them drawn in the right place?"*

---

## 5. The concrete obstacles to a merge, each verified

**(a) The PC window model.** As above — Read is the canvas the other three float
over. Verified at v08.02.

**(b) Two independent positions, and the second is now load-bearing.**
`noteScope` (`app/quranrevival.html:4261`) is deliberately independent of the
canonical reading position (`currentUnitType` / `currentSurahNum` /
`currentAyahNum`), so that opening a note on one āyah of a Juz does not move the
reading out from under the reader. Since v07.139 `noteScope` is also **what gets
claimed**. Merging to one position removes that separation unless it is rebuilt
under another name.

There is an existing asymmetry worth a reviewer's eye: a wheel-slice click opens
Note on the *canonical* unit (so the two agree at that instant), but
`openNoteView()` for a wider unit sets `noteScope.ayahNum = currentAyahNum` and
never loads a different surah (`app/quranrevival.html:11219`). The two positions
are neither fully independent nor fully synced.

**(c) Two layouts for the same text.** Read draws a sideways paged strip or a
Mushaf page; Note draws labelled collapsible fields. Both are wanted.

**(d) Bar overflow is a live risk, not a theoretical one.** Note's second bar
has already overflowed on a phone once and had to move Copy and Text size into
an overflow menu. Two rounds since have been spent on pill widths running off
phone edges. Any merged bar has to be measured at 320–1920px in both languages
before it ships.

**(e) Two incompatible full-screen models.** Read: three states, five switches,
tap-to-cycle. Note: two states, no tap. One must win.

**(f) A load-speed consequence.** `ensureQcrDataLoaded()` currently fires only
from `openNoteView()` and Explore's own QCR panel — two call sites
(`app/quranrevival.html:7355, 11191`). Merging would put it on every Study open
unless made lazy. (Āyah notes and bookmarks already load on Read, so that half
costs nothing.)

**(g) Bookmarks and "reopen where I was".** Two capture functions exist
(`captureQuranBookmarkSettings`, `captureNoteBookmarkSettings`) and stored
bookmarks carry a `stageView` of `"read"` or `"note"`. Existing saved bookmarks
must keep opening.

**(h) The recitation highlight** targets `.page-flow-ayah[data-ayah]`, which the
Note layout has no equivalent of.

**(i) Test cost.** **168 references** in `tools/i18n-verify/behaviour.mjs` and 2
in `reading.mjs` touch these two screens. The suite also carries a **known
pre-existing crash at line 4084** (a stale `[data-note-master-toggle]`
visibility assumption from an earlier bar reorganisation), so most of the Note
sections never run in the checked-in suite today and are covered by focused,
un-checked-in scripts instead. A merge would mean rewriting those *and* finally
fixing that crash.

---

## 6. A real pre-existing defect the merge would erase

Worth confirming independently; it is small to check and it bears on the
decision.

An Approach can declare that its study screen shows a **Notes box**, a
**Reflection box**, a **Writing box** or a **"Done" tick** — the `panels` list
on each entry in `app/js/catalogue-data.js`. The app draws them
(`app/js/ayah-renderer.js:216–219`, `PANEL_RENDERERS`).

**Nothing reads, saves or reloads any of them.** At v08.02, `panel-notes`,
`panel-reflection`, `panel-writing` and `panel-checklist` appear in **exactly
six places in the whole application**: the four lines that draw them, and two
lines of CSS that style them. Whatever is typed into one is destroyed on the
next re-render — an āyah change, a tick, a claim.

**Measured at v08.02: 28 of the 32 Approaches declare at least one.** "Reading
(with Meaning)" and "Language Learning" both put up a dead Notes box; "Hifz /
Memorising" puts up a dead "Done" tick; and **"Arabic Writing" declares
`panels: ["writing"]` and nothing else**, so that Approach's entire working
surface saves nothing.

Meanwhile the notes that *do* save live one tab away in the Note view. **There
are two things called "Notes" on the same pair of screens and only one of them
works.**

Note also that v08.01–08.02 made the 30 Approaches fully editable by the owner
— names, guides, order, sections — but **`panels` is not exposed in that
editor**. The owner cannot even switch these boxes off.

---

## 7. The in-house recommendation, offered for critique

This is one option, not a decision. We would value it being argued against.

**Merge to one screen, but as one view with switchable LAYOUTS, rather than
folding Read into Note.**

Concretely: "Study" takes Read's place as the background canvas. It keeps one
position, one bar, one full-screen model — and *how the text is laid out*
becomes a choice on that bar (Reading strip / Mushaf / Notes-and-fields), in
exactly the way Mushaf is already a tick rather than a view of its own.

The appeal is that it delivers the owner's actual complaint — one screen, one
bar, one set of rules — **without having to answer the PC window question at
all**, because the wheel and Explore keep floating over a canvas that still
exists. The side pane is the one piece that would need a new home.

The obvious counter-argument, which we would like tested: **§4 suggests the two
screens are diverging into genuinely different jobs, not converging.** A
reviewer may reasonably conclude that the right answer is to sharpen the
boundary rather than remove it — for example by moving the remaining duplicated
chrome out of one of them, or by making the Note view a panel over Read rather
than a sibling of it.

---

## 8. The four questions we cannot answer from the code

1. **On a desktop, should the merged Study screen be the background canvas
   (like Read today) or a floating window (like Note today)?** If canvas, where
   does the Note side pane go?
2. **While reading a whole Juz, should a note and a claim be attachable to one
   āyah inside it, or only to the Juz as a whole?** Since v07.139 the Note view
   claims any unit, so the code has half-answered this; what is open is whether
   the reading position and the noting position must stay independent.
3. **Should the Notes editor sit permanently below the āyah, or stay a
   collapsible field?**
4. **Does Mushaf still replace everything on screen, or may notes show beside
   it?**

---

## 9. What would be most useful back

- Whether merging is right at all, given §4 — or whether the boundary should be
  redrawn instead.
- If merging: which shape, and specifically an answer to the canvas-vs-window
  problem in §5(a).
- Anything in §5 we have underweighted, or any risk we have missed.
- Whether the dead panels in §6 should be deleted, wired up, or exposed in the
  Approach editor — and whether that belongs in this work or its own round.

**Anything asserted here can be checked against the repository at v08.02.** File
paths and line numbers are given throughout and were read on 7 Sep 2026; line
numbers will drift as the file changes, so treat function and identifier names
as the durable references.
