# MMSA — the brief's history (moved out of CLAUDE.md, 29 Sep 2026)

This is the part of `CLAUDE.md` that recorded every earlier milestone and the
long standing notes around them, v08.111 back to v07.139. It moved here because
`CLAUDE.md` is loaded into every Claude session **and every Builder run** before
any work starts, and at 321 KB it had become the largest single thing the
Builder carried (runs 575/576 ended after 5 turns without building anything).
Nothing here was rewritten: it is the text exactly as it stood. Each version's
full account is also in `CHANGELOG.md`.

**How to use it:** open it when a round needs the background of one earlier
decision. The standing rules that still bind are kept in `CLAUDE.md` itself
("Standing lessons", "The invariants", "Recorded decisions").

---

**Previous milestone: v09.93 on `main`** (6 Oct 2026 — **Al-Fatiha on the Writing sheet follows your counting; the Bismillah's title is "Bismillah"**).
- **What** (the Owner, 6 Oct 2026: "Bismillah is here as well as the first Ayah. pls fix in other places too"; decision 76):
  - `writing-sheet.js`: with the reader's count on (decision 55), page 1 is drawn through `fatihaPageLines`, the Read view's own function: the Bismillah unnumbered, the numbers one lower, ⑥ before غَيْرِ. The pop-out's Ayah view of a word in stored 1:7 shows only its half (Ayah 6 or 7). Count off: the stored text, as before.
  - `quranrevival.html`: the unnumbered Bismillah's title is "Bismillah" alone (was "Bismillah — Surah Al-Faatiha").
  - Not yet: displayed Ayat 6 and 7 as two separate records (decision 76, part 3) is its own round, because it changes a permanent unit key.
- **Checks:**
  - writing-sheet-fatiha-count-browser 30/0 (new; mutations no-count 16 fail, no-half 8 fail), bismillah-label-browser 34/0 (title updated in place; mutation old-title 2 fail), writing-sheet-popout-browser 222/0 (runs with the count off, recorded), writing-sheet-browser 206/0, writing-sheet-unit-toolbar 54/0, fatiha-count-browser 136/0, fatiha-count 35/0, wheel-writing-slice 25/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1003/4 (sandbox baseline)
- **With the Owner:** open Al-Fatiha, tap Writing: the Bismillah has no number and Alhamdulillah is ①. Tap 🔍 Pop out, tap a word of غَيْرِ... and choose Ayah: only Ayah 7 shows.

**Previous milestone: v09.92 on `main`** (6 Oct 2026 — **Writing sheet: pop out a word or an Ayah, enlargeable, with every writing tool over it**).
- **What** (the Owner, 6 Oct 2026: "enable word and an Ayah pop out and making it enlargeable while remaining all writing functions enabled for practise writing over it"):
  - `writing-sheet.js`: 🔍 Pop out on row 2; pick mode ("Tap a word to pop it out") finds the tapped word from the page's own layout (`wordAt`), never from pixels, and draws nothing; `ayahWordsOf` gathers the Ayah across pages, each word with its own page font.
  - `writing-popout.js` (new): Word | Ayah, A−/A+ (six sizes, letters re-drawn, never stretched), ⤢ bigger window and a resizable corner, Pen / Eraser / Undo / Clear / ✋ Move and the letter style; strokes kept in the letters' own units so they grow with A+; each view keeps its own writing; ✕ asks first; nothing stored.
  - Architect review: a word wider than the window opens showing its START (the right-hand end of the Arabic), centred vertically.
- **Checks:**
  - writing-sheet-popout-browser 222/0 (the review's start-in-view check fails without the fix: 216/6), writing-sheet-browser 206/0, writing-sheet-unit-toolbar 54/0, wheel-writing-slice 25/0, wheel-unit-go 254/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1003/4 (sandbox baseline)
- **With the Owner:** on the Writing sheet tap 🔍 Pop out, tap a word; A+ a few times; write over it; tap Ayah.

**Previous milestone: v09.91 on `main`** (6 Oct 2026 — **Writing sheet: choose the Ayah / Range / Surah / Page on the sheet (it changes the Study Unit everywhere), and the toolbar in two rows with Save + Print under ⋯**).
- **What** (the Owner, 6 Oct 2026, a phone photo of the sheet opened from the Arabic Writing slice: "I should have buttons handy here for that", "Fit in 2 rows. Save, print … can hide under one button"; decision 75: "one change of selection should change everywhere"):
  - `writing-sheet.js`: a 📖 unit control and panel (Type / Surah / Ayah / From / To / Page, Show, Cancel); Show asks first when there is writing; `onChooseUnit` hands the choice to the caller. The toolbar is two rows at every width (row 1 the tools, then Close and Hide; row 2 📖, letter style, ⋯ with Save picture and Print A4), icons with names in both languages below 600px.
  - `quranrevival.html`: `applyWritingSheetChoice()` sets the Study Unit through the unit pickers' own handlers, then re-opens the sheet for it. Architect review: the 📖 label names the Surah ("Al-Faatiha", "Yaseen 1–12", "Page 50"), and the panel's hidden fields really hide (`label[hidden]`; the check now reads the rendered box).
- **Checks:**
  - writing-sheet-unit-toolbar-browser 54/0 (the tightened panel check fails without the fix: 52/2), writing-sheet-browser 206/0 (toolbar checks updated in place), wheel-writing-slice 25/0, wheel-unit-go 254/0, wheel-centre 645/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1003/4 (sandbox baseline)
- **With the Owner:** open the Writing sheet, tap 📖, choose Surah 36 or a Range, Show; the sheet and the rest of the app move there.

**Previous milestone: v09.90 on `main`** (6 Oct 2026 — **Achieved marks every place of a word with no dictionary word (فَهُمْ, لَهُمْ, هُمْ…), and the Word Card shows a place known through its word as Achieved**).
- **What** (the Owner, 6 Oct 2026, with a screenshot of Yaseen 36:6 and 36:8: "Fahum is in two Ayat. Achieved in one place should mark both places"):
  - **3,307 of the 77,429 words have an empty lemma** in the Quranic Arabic Corpus data (particle + pronoun words, and the opening letters), so the WbW mirror had nothing to share. Each now has a **stand-in** at WbW only: `"form:"` + its letters with marks and tatweel removed (`app/js/quran-word-form-key.js`, one rule used by the app and the build tool), in its own `form-index.json` (88 groups; never in `lemmas-index.json`). `wbwClaimKey()` feeds the claim key, the occurrence refs, the known-word overlay and the counters. Basic and Depth stay Not applicable (decision 68). **No Rules change**: `lemmaId` takes any string of 1–400 characters (emulator, real data-layer functions, `form:فهم`: 1/0).
  - **Architect review**: the Word Card showed a place's OWN record, so an untouched place of an already-known word read "Not started" while the totals counted it known — for every word, not only stand-ins. It now shows **Achieved** with "Known: marked Achieved at another place of this word" (Bangla in `bn.js`).
  - Existing claims made before this mirror on the next press; no data migration. Decision 74 recorded.
- **Checks:**
  - quran-word-form-key 25/0; quran-word-form-mirror-browser 91/0 (mutations: WbW key back to lemma-only, 30 failed; card ignoring knownElsewhere, caught)
  - quran-lemma-progress-rendered 77/0 (cross-occurrence check updated in place: no own write, card shows Achieved), quran-word-card-achieved-mirror 73/0, quran-word-card-return 55/0 (Last read save excluded), every other quran-word-*/quran-lemma-* green except the sandbox certificate checks and two pure checks red on main too (quran-lemma-progress-model 33/1, quran-word-card-form-meaning), claim-for-family-word-hadith 158/0, phone-width-overflow 217/0, stub-parity 4/0, rules-authorisation-executable 63/0, behaviour 1003/4 (sandbox baseline)
- **With the Owner:** Yaseen: tap فَهُمْ in ayah 6, press Achieved; tap فَهُمْ in ayah 8 — it shows Achieved too.

**Previous milestone: v09.89 on `main`** (6 Oct 2026 — **the wheel's centre reads "Take an Approach"; the Arabic Writing slice opens the Writing sheet**).
- **What** (the Owner, 6 Oct 2026, with a screenshot of the landing wheel):
  - "Write in the circle, 'Take an Approach' (showing the unit is okay. Keep it as it as the last act)": `#wheelCtaBtn`'s first line; its second line (the unit) is unchanged. The pill is 80% of the circle (85% below a 140px hub), and `layoutWheelHub()` shrinks only the first line, never below 8px, when the words still do not fit on one line.
  - "If that is clicked, the writing page must open for writing practice": `jumpToApproach()` sends the Arabic Writing slice (or list row) to `openWritingSheetForCurrentUnit()`, matched by `approach_05` or a copy's `sourceTemplateId` (`isWritingApproach`); every other slice opens its Track card as before.
  - Tests: the four Word Card "writes nothing" checks leave out v09.80's deliberate Last read save (they were red on `main`). Decision 73 recorded.
- **Checks:**
  - wheel-writing-slice-browser 25/0 (mutations no-route, all-slices each caught; approach_05 bound to "Arabic Writing")
  - wheel-centre-browser 645/0 (checks updated in place: 80%/85% wide, the new words on one line, whole), wheel-slice-opens-track 96/0, wheel-unit-go 254/0, landing-drawers 274/0, landing-sections-collapse 152/0, writing-sheet-browser 180/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1003/4 (22g×3 archive.org, 31e certificate: the sandbox baseline)
- **With the Owner:** the landing wheel's centre says "Take an Approach"; tap the Arabic Writing slice and the Writing sheet opens.

**Previous milestone: v09.88 on `main`** (6 Oct 2026 — **👥 record for family members on the Word Card levels and on Hadith "Studied"**).
- **What** (the Owner, 5 Oct 2026, decision 71: progress for family members "wherever progress is recorded"):
  - **Word Card** (WbW, Basic, Depth): the same 👥 picker as the other Record cards (shared `claimForIds`). A state press writes for each ticked person, others first and the Student last; each person's progress and confirmation rule are loaded before their "before" snapshot, so their own whole-Qur'an total moves correctly. Approve / Return applies only to ticked people whose own claim waits; the note is asked once.
  - **Hadith "Studied"**: the 👥 picker beside it (`getHadeethEncRoster`, first use only); `claimHadeethEncStudied` claims for each ticked person, claimant = the actor.
  - Architect review fixes: the picker's white list carried no ink of its own, so on the dark Word Card the names read cream on white; and `hadith-collections.html` had no picker styles at all (an always-open, unstyled list). Both fixed, each with a rendered-contrast check proven by mutation.
- **Checks:**
  - claim-for-family-word-hadith-browser 158/0 (mutations no-load, decide-all, no-ink, hadith-css each caught)
  - claim-for-family-browser 56/0, hadeethenc/hadith suites all green, quran-word-* green except the known "writes nothing" and certificate baselines (identical on main), phone-width-overflow 217/0, stub-parity 4/0, rules-authorisation-executable 63/0, behaviour 1006/1 (31e certificate)
- **With the Owner:** with two family members, open a word, tick 👥, press Achieved; open a Hadith, tick 👥, set Studied.

**Previous milestone: v09.87 on `main`** (5 Oct 2026 — **family members with year of birth at sign-up, and an Age column on People**).
- **What** (the Owner: "When a user new sign in, he is asked to put family members with age, to attach with his account ... If not, we have to make that rule and feature"; demo `docs/reference/2026-10-05-family-members-signup-demo.html`):
  - "Create your account" for **My family** opens **step 2, "Who is in your family?"**: a name and a **year of birth** per person (the age is worked out, never stored), "A child I look after" ticked by itself under 18, + Add another, Save and continue, Skip for now. Each is added with `addPersonToTenant()` as a Student, a child managed by the new owner.
  - **People**: an **Age** column; Add a person and Edit take a year of birth (`birthYear` on tenantPeople, `validBirthYear` / `ageFromBirthYear` in `people.js`). The owner's and a guardian's tenantPeople Rules carry no field list, so **no Rules change**.
- **Checks:**
  - family-signup-browser 68/0 (3 mutations, each caught)
  - rules-authorisation-executable 63/0 (birthYear on tenantPeople: the owner's and a guardian's Rules carry no field list), stub-parity 4/0, phone-width-overflow 217/0, behaviour 1003/4 (22g×3 archive.org, 31e certificate: the sandbox baseline)
- **With the Owner:** the next new family account sees step 2; on People, Edit a person and give a year of birth.

**Previous milestone: v09.86 on `main`** (5 Oct 2026 — **round 4 of the Siyagah note-pane port: Part B finished**; decision 70).
- **What** (list items 28–33, `docs/reference/2026-10-05-siyagah-note-pane-port-list.md`; `app/js/note-window.js`):
  - On a Note narrower than 600px the toolbar shows **five labelled groups** (Aa Text · H Headings · ≡ Paragraph · + Insert · ↺ Undo) and the chosen group's tools: nothing scrolls sideways (`TOOL_GROUPS`, `fitToolbar`). A wide Note keeps one row.
  - **⊘** after the colour and highlight swatches takes them off (`removeSwatch`).
  - **Paste**: a web address asks "a link, or plain text?"; text with formatting asks "keep it, or plain text?"; nothing is pasted until the choice (`onEditPaste`, `finishPaste`).
  - **@** while typing lists your Notes; Enter puts "@Title" in the text and adds a Link (the same Links as ⋯ → 🔗).
  - A table's **Σ** adds or updates a total row for the caret's column; **↑ / ↓** sort by it (numbers by value), headings first and Σ last (`tableMath`).
  - **Part B (14–33) is done.** Part C (34–45) waits for the Owner, one question each.
- **Checks:**
  - journey-editor-input-browser 112/0 (5 mutations, each caught)
  - updated in place: journey-editor 577/0, journey-editor-siyagah 98/0, journey-note-edit 208/0 (a grouped toolbar shows a tool once its group is open; ⊘ follows the six swatches; a formatted paste asks first). Green: journey-note-folds-windows 82/0, journey-window-tabs 166/0, journey-note-actions 184/0, journey-note-pane 327/0, notes-note-windows 218/0, journey-note-windows 254/0, journey-reading-tools 488/0, journey-finish 64/0, journey-flags-links 306/0, journey-folder-window 144/0, journey-pane-resize 40/0, journey-three-panel 368/0, journey-s9 280/0, journey-tray 227/0, journey-tags 363/0, palette-contrast 20/0, phone-width-overflow 217/0, note-sanitize-boundary 12/0, stub-parity 4/0
- **With the Owner:**
  - edit a Note on a phone: the five groups; select coloured words and press ⊘; paste a web address; type @ and a Note's name; in a table, Σ and ↑ ↓;
  - answer the Part C questions (34–45).

**Previous milestone: v09.85 on `main`** (5 Oct 2026 — **round 3 of the Siyagah note-pane port**; decision 70).
- **What** (list items 21–27, `docs/reference/2026-10-05-siyagah-note-pane-port-list.md`; all in `app/js/note-window.js`):
  - ⇅ folds or opens every section **while editing** too (`foldAllEditing`, view only); a folded heading shows a grey **preview line** of what it hides (`.note-sec-peek`).
  - **⧉ on the pane's bar** (the first thing to fold into ⋯, so it never costs 🔍 its place); **⇲** on a window's bar puts its Note back into the pane (`dockWindow`).
  - **✕ Close all (n)** first in the window strip when two or more are open; **Ctrl+Shift+X** closes them, **Ctrl+Shift+P** pops the pane's Note out.
  - A window's **Details** stays open or closed as last left, per device; a **wide window** (760px+) lists a Note's headings beside the text when it has three or more (`paintToc`).
- **Checks:**
  - journey-note-folds-windows-browser 82/0 (5 mutations, each caught)
  - updated in place: journey-window-tabs-browser 166/0 ("✕ Close all" leads the strip; tabs counted among tabs). Green: journey-note-actions 184/0, journey-editor-siyagah 98/0, journey-editor 577/0, journey-note-edit 208/0, journey-note-pane 327/0, notes-note-windows 218/0, journey-note-windows 254/0, journey-reading-tools 488/0 (Find skips the preview lines), journey-finish 64/0, journey-flags-links 306/0, journey-folder-window 144/0, journey-pane-resize 40/0, journey-three-panel 368/0, journey-s9 280/0, journey-tray 227/0, journey-tags 363/0, palette-contrast 20/0, phone-width-overflow 217/0, note-sanitize-boundary 12/0, stub-parity 4/0
- **With the Owner:**
  - in Mapping My Journey: Edit a Note with headings and press ⇅; fold a heading and see its first line; ⧉, then ⇲ in the window; open two windows and ✕ Close all;
  - strike out note-pane items by number.

**Previous milestone: v09.84 on `main`** (5 Oct 2026 — **bookmark marks and ← Back; the Bismillah never named as an āyah; 👥 family members on every Record card**).
- **What** (the Owner, 5 Oct 2026, four messages):
  - **Bookmarks** ("a distinctive mark … the date and time of the last act … an option to show/hide timing"; "a back button to go where bookmark is clicked from"): 🔖 on every bookmark in the menu and on Manage bookmarks; after the name the latest of opened / changed / made (`lastActOf`; opening stamps `usedAt.<id>` with one field write, `markBookmarkUsed`, no Rules change); 🕘 Show / Hide times per device; "← Back to <page>" floats bottom-left above every window and the tab bar, once, on the page a bookmark opened (sessionStorage).
  - **Bismillah** ("still showing as Ayah"): `ayahNameFor` / `ayahShortRefFor` in `quranrevival.html` — the wheel centre, the Note window's title and list, explore labels and both āyah pickers say "Bismillah", never "Ayah Bismillah" or "1:Bismillah" (decision 55's display count; stored 1:1 unchanged).
  - **👥 family members** ("wherever progress is recorded, should include the claim for family members"): the Ayah, This page and Unit cards and the end-of-unit prompt carry the Track card's 👥 beside "✅ Record Your Progress"; ticks are shared while the page is open and reset with the Student; `claimApproachStatus` writes for every ticked person; the cards keep showing the Student's own progress.
  - Demo for the next ask (family members with year of birth at sign-up): `docs/reference/2026-10-05-family-members-signup-demo.html`.
- **Checks:**
  - new: bookmark-marks-back-browser 84/0, bismillah-label-browser 34/0, claim-for-family-browser 56/0 (8 mutations, each caught)
  - updated in place: wheel-centre-browser 633/0 ("Ayah Bismillah" was the old wording), behaviour.mjs 44a/44d/44e/49b/49c/49f/50f/50g (a bookmark row now carries 🔖 and a time) — behaviour 1006/1 (31e, the sandbox certificate baseline)
  - global-approach-card 109/0, quran-ayah-action-sheet 144/0, unit-card 116/0, approach-record-status-bar 431/0, bookmark-last-place 68/0, bookmark-sheet 176/0, bookmark-open 77/0, bookmark-folder-edit 68/0, fatiha-count 136/0, read-window 65/0, palette-contrast 20/0, phone-width-overflow 217/0, stub-parity 4/0, rules-authorisation-executable 63/0
- **With the Owner:**
  - open the Bookmark menu: 🔖, the times, 🕘; open a bookmark, then ← Back;
  - choose Al-Fātiḥah's first āyah: it reads "Bismillah";
  - on the Ayah / Page / Unit card, tap 👥 and tick a family member before a stage.

**Previous milestone: v09.83 on `main`** (5 Oct 2026 — **round 2 of the Siyagah note-pane port**; decision 70).
- **What** (list items 14–20, `docs/reference/2026-10-05-siyagah-note-pane-port-list.md`), all in `app/js/note-window.js` unless named:
  - **⋯ ✏️ Rename** (a revision through the page's own `host.revise`, text unchanged) and **⋯ 🗐 Make a copy** (`host.copyNote`; Mapping My Journey's `copyWholeNote`: a new Note "(copy)", filed in every folder the original is in, its tags carried; flags and links not copied).
  - **Right-click or long-press the title** to edit (a window's title is on its bar); **right-click or long-press a heading** for 📋 Copy section, with or without its heading (HTML and plain text to the clipboard).
  - **Tag chips are buttons**: a list of every Note with that tag, opened in the same view with ‹ › walking that list.
  - **Delete asks first** in Mapping My Journey (`deleteNoteFromPane` → `retireNoteFromPane`); **Esc ends editing** like ✓ Done (in a window a second Esc closes it, as before).
- **Checks:**
  - journey-note-actions-browser 184/0 (6 mutations, each caught)
  - journey-note-pane-browser and journey-flags-links-browser updated in place (Delete confirms; ⋯ carries ✏️ Rename)
  - journey-note-pane 327/0, journey-flags-links 306/0, journey-editor-siyagah 98/0, journey-editor 577/0, journey-note-edit 208/0, notes-note-windows 218/0, journey-note-windows 254/0, journey-reading-tools 488/0, journey-finish 64/0, journey-folder-window 144/0, journey-pane-resize 40/0, journey-three-panel 368/0, journey-window-tabs 166/0, journey-s9 280/0, journey-tray 227/0, journey-tags 363/0, palette-contrast 20/0, phone-width-overflow 217/0, note-sanitize-boundary 12/0, stub-parity 4/0, rules-authorisation-executable 63/0
- **With the Owner:**
  - in Mapping My Journey: ⋯ → Rename, ⋯ → Make a copy, right-click a Note's title, right-click a heading → Copy section, tap a tag chip, Delete (it asks), Esc while editing;
  - strike out note-pane items by number.

**Previous milestone: v09.82 on `main`** (5 Oct 2026 — **resizable panels, and round 1 of the Siyagah note-pane port**; decision 70).
- **What** (the Owner: "Make all the panes resizeable and add all functions of the notepane of Siyagah in the notepane"):
  - **Resizable panels** in Mapping My Journey at 1200px and up (`layoutPaneSplits` in `journey-map.html`): tree | list | Note and list | Note; drag, arrow keys, double-click resets; minimums 240/260/300px; fractions per device. The pinned panel in a Note window resizes too.
  - **Editor tools** (list items 3–13): H4, ¶, ▲H ▼H and Ctrl+[ / ], A+ / A−, ✓ Mark done (`data-done`), ▢ Box (`data-box`), ─ Divider, Justify, ↕ Spacing, Enter above the first heading, 🔍 Find while editing. The cleaner keeps exactly these (h4, hr, the two marks as 1, font-size / line-height / margin-bottom values).
  - **The numbered list** `docs/reference/2026-10-05-siyagah-note-pane-port-list.md`: Part B (14–33) is built next without asking; Part C (34–45) waits for the Owner.
- **Checks:**
  - journey-pane-resize-browser 40/0 (4 mutations caught), journey-editor-siyagah-browser 98/0 (4 mutations caught), note-sanitize-boundary 12/0 (updated in place)
  - journey-editor 577/0, journey-note-edit 208/0, journey-note-pane 327/0, notes-note-windows 218/0, journey-note-windows 254/0, journey-reading-tools 488/0, journey-flags-links 306/0, journey-folder-window 144/0, journey-three-panel 368/0, journey-s9 280/0, journey-tray 227/0, journey-window-tabs 166/0, journey-finish 64/0, palette-contrast 20/0, phone-width-overflow 217/0
- **With the Owner:**
  - on a PC, drag the lines between the Mapping My Journey panels; in a Note, Edit and try A+, ✓, ▢, ─, ↕;
  - strike out note-pane items by number.

**Previous milestone: v09.81 on `main`** (5 Oct 2026 — **the stem marked on the Word card, a folder in its own window, the pinned Notes panel, and the Ayah window**; decision 69).
- **What** (the Owner, on three demos):
  - **Word card stem** ("mix highlight n glow together but on the top word only glow"): while *Colour word parts* is on, the stem glows in the big word at the top; the meaning, legend, Stem box and Dictionary word box get glow + highlighter. Both card looks.
  - **Folder window** ("For Folder, build it"): folder ⋯ → 🗔 Open in its own window (subfolders, path and ⬆, its Notes, ✚ New note, quick title, ➕ New folder), the Note windows' frame and switcher (`openFolderWindow`, `host.folders`).
  - **Pinned panel**: 📌 Pinned in a Note window opens the pinned Notes beside the Note (over it when narrow); a pinned Note opens in the same window. Replaces round 14's strip.
  - **Ayah window** ("So go it"): 🗗 in the read bar floats the Read view as a window on a PC (`js/read-window.js`): move, resize, ⛶, ⧉, ⊡ back in the page, ✕. **Opt-in per device; never below 900px.** The Owner's "what I really wanted" for the Ayah is still to come.
- **Checks:**
  - word-card-stem-mark-browser 144/0 (2 mutations caught); word-card-segments 40/0, wbw-rebuild 136/0, pc-boxes 296/0, quran-word-card 37/0
  - journey-folder-window-browser 144/0 (4 mutations caught); 16 journey/notes suites green (flags-links 306/0 updated in place for the panel)
  - read-window-browser 65/0 (4 mutations caught, incl. Night contrast); 16 Read-view suites green
  - layout.mjs: no geometry change (only the known `bmNotFound`)
  - behaviour 1003/4 (sandbox: 22g×3 archive.org, 31e TLS); 30j/30l/33a/37a updated in place for 🗗
- **With the Owner:**
  - open a word with Colour word parts on; on a PC, a folder's ⋯ → Open in its own window; a Note window's 📌 Pinned; in Read, 🗗.

**Previous milestone: v09.80 on `main`** (5 Oct 2026 — **📖 Last read and ▶ Last played in the Bookmark menu**).
- **What** (the Owner: "Add a last read and last play button in bookmark"):
  - Two buttons at the top of the Bookmark menu, each naming its place ("Yaseen 36:7", in Bangla with Bangla digits).
  - **Last read** is noted while reading in the Read view (in the flowing view, the āyah scrolled to). **Last played** is the āyah sounding during recitation. The two are kept apart.
  - Both live on the person's bookmarks document (`lastPlaces.read` / `.play`, `setLastPlace()` in `bookmarks.js`; no Rules change), so they follow the reader across devices. They are written at most every 10 s and on leaving the page.
  - On the Qur'an page a tap acts in place, and Last played plays on FROM its āyah (`playCurrentSelection({ startAyah })`). On other pages they are links (`?last=read` / `?last=play`).
  - With nothing saved, each is shown disabled, with words.
- **Checks:**
  - bookmark-last-place-browser 68/0, en/bn, 390/1280 (--mutate-no-record fails 32, --mutate-no-start fails 4)
  - bookmark-sheet 176/0, bookmark-folder-edit 68/0, bookmark-open 77/0 (its 4 mutations caught), study-presets 84/0
  - study-options-play-read 73/0, study-options-go-track 104/0, wheel-unit-go 254/0
  - rules-authorisation-executable 63/0, stub-parity 4/0, phone-width-overflow 217/0, palette-contrast 20/0, navcheck green
  - layout.mjs: no geometry change (only the known `bmNotFound`)
  - behaviour 1006/1 (sandbox: 31e TLS)
- **With the Owner:**
  - read a little and play a little, then open Bookmark and tap each;
  - two demos waiting (the Ayah window; the folder window and pinned panel).

**Previous milestone: v09.79 on `main`** (5 Oct 2026 — **the Siyagah plan's partly-built items finished; the folder window and pinned panel demo**).
- **Asked:** the Owner asked "Did you finish all the folder and note building as we planned from Siyagah file?" An audit of all 24 S8–S14 plan items against the code found one item NOT built (a folder opened in its own window) and three PARTLY built. Their answer: "Yes, fix the small ones and demo the others."
- **Fixed:**
  - **Tags while editing** are held until Done, like folder ticks, in both the 📎 sheet and ⋯ → 🏷 Tags…, which say so in words (`stagedTags`, `holdTagTick`, `applyStagedTags` in `note-window.js`).
  - **"Version n of m"** shows in the inline pane too, not only pop-up windows (the button moved into the shared template).
  - **✚ New note** is in pop-up windows too; a window's new Note goes in its folder and opens in a window of its own.
- **Demo, not in the app:** `docs/reference/2026-10-05-folder-window-and-pinned-demo.html`.
  - (1) A folder's ⋯ → Open in its own window: browse its subfolders and Notes.
  - (2) A 📌 Pinned side panel in a Note window, beside the Note on a computer, over it on a phone.
- **Checks:**
  - journey-finish-browser 64/0, en/bn, 390/1280 (MUTATE tags-at-once fails 8, no-pane-version 12, no-window-new 4)
  - every Mapping My Journey suite green: tags 363, note-windows 254, window-tabs 166, reading-tools 488, three-panel 368, folder-picker 294, editor 577, note-edit 208, note-pane 327, flags-links 306, s9 280, notes-note-windows 218, folder-menus 148
  - demo: a scratch browser test, 37/0 (windows stay inside the screen, the corner resizes without selecting text, every part reachable)
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3 archive.org intermittent, 31e TLS)
- **With the Owner:** two demos waiting (the Ayah window; the folder window and pinned panel); try "Version n of m" in a Note, ✚ in a Note window, and a tag ticked while editing.

**Previous milestone: v09.78 on `main`** (5 Oct 2026 — **Not applicable at Basic and Depth; move and rename folders in the Bookmark menu; the Ayah window demo**).
- **N/A** (the Owner, on 36:8:9 فَهُم in Basic: "Since this conjugation is not applicable in Basic, should have a n/a button there. All words of these types should have n/a button." Asked; answered "Automatic", "Basic and Depth": decision 68). 3,307 of 77,429 words have no dictionary word (lemma). At Basic and Depth such a word shows "Not applicable" in place of the four buttons, the save path refuses a claim on it, and the Basic/Depth totals are **74,122** (`QURAN_LEMMA_WORD_COUNT`, `levelWordTotal()`; I7: excluded, never zero). The stored totals document keeps 77,429 (the Rules fix it), so the reader's denominator is applied where the figure is shown. An earlier mark is not silently changed: the card offers "Clear the earlier mark". WbW is unchanged.
- **Folders** (the Owner: "Enable a quick folder edit n handler to move folders here"): every folder row in the Bookmark menu has a ⠿ handle (drag, or ArrowUp/Down) and a ✎ pencil, always on. The handle reorders a folder among those sharing its parent (`reorderSiblingFolders`/`saveFolderOrder` in `bookmarks.js`); the pencil renames in place. A refused save is said in words (I15) and the move snaps back. Nesting stays on Manage bookmarks.
- **Demo, not in the app** (the Owner: "enable the entire Ayah popout … resizeable, fitting within the screen … Demo me first"): `docs/reference/2026-10-05-ayah-window-demo.html`. The Read view in a window you can drag, resize from any edge or the gold corner, make smaller (⧉), fill the screen (⛶ or double-tap the title) and close; it is clamped inside the screen on every move, resize and rotation; a phone opens it full screen.
- **Checks:**
  - word-na-browser 48/0 (--mutate-na fails 24, --mutate-total fails 8); quran-word-total-boundary 33/0 binds 74,122 to lemmas-index, the identity manifest and a fresh count; lemma-levels 240/0 and word-card-pc-boxes 296/0 updated in place for the new percentages; every other word-card suite green (word-progress-rendered 80/3, sandbox TLS)
  - bookmark-folder-edit-browser 68/0, real-length names (--mutate-nosave fails 20, --mutate-rename fails 4); bookmark-sheet 176/0, study-presets 84/0, navcheck green
  - demo: a scratch browser test, 29/0 at 390 and 1280 (inside the screen after drag, corner resize, edge resize and rotation; every function inside works)
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0; layout.mjs: no geometry change (only the known `bmNotFound`)
  - behaviour 1006/1 (sandbox: 31e TLS)
- **With the Owner:** look at the Ayah window demo and say build, change or drop; open a pronoun word (e.g. 36:8:9) at Basic; drag a folder in the Bookmark menu. A folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).

**Previous milestone: v09.77 on `main`** (5 Oct 2026 — **Study options: a Go button, and Track's card on top**).
- **Go** (the Owner, phone screenshot of Range 1–9 of Surah 36: "How about adding a 'go' button here, to straight away go to the page selected?"): a Go button ends the Study Unit row, beside From/To or the Ayah / number picker. It opens the reading view at the chosen unit's first ayah and closes Study options (`openReadingScreen()`, the same as Read under Listening). The row keeps its line count at every width (panel.mjs: 2 lines ≤480px, 1 above; nothing cut).
- **Track** (the Owner: "I pressed track, the screen appeared but the option screen didn't move"): the Track card was on z-index 50, under the dock (60, which holds Study options) and, on a computer, under the Mastery Wheel window, where it was completely hidden. Track now closes Study options first, and the card sits on the 900 tier the other full-screen cards use (only Track opens it).
- **Checks:**
  - study-options-go-track-browser 104/0, en/bn, 360/390/768/1280 (--mutate-go fails 24, --mutate-track fails 16, --mutate-layer fails 2)
  - panel.mjs OK (no truncation, same line counts); study-options-play-read 73/0; wheel-unit-go 254/0; select-layout-options green
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0; layout.mjs: no geometry change (only the known `bmNotFound`)
  - behaviour 1006/1 (sandbox: 31e TLS); 27b/27i updated in place for the Go cell
- **With the Owner:** press Go in Study options; press Track and see the card alone. A folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).

**Previous milestone: v09.76 on `main`** (5 Oct 2026 — **Search by sound, a word press that shows at once, and a full-screen Bookmark menu**).
- **Search by sound** (the Owner: "Enable searching with Transliteration like the example", "Inni fi khalqi samawate"): a Latin search also matches each ayah's word-by-word transliteration by its consonant skeleton, with a small tolerance (new `search-tr.json`, 215KB gzipped, fetched only for a Latin search). Results come under "By sound (transliteration)", after the English matches.
- **Word progress** (the Owner: "It takes hours to marked achieved from not started", then a `permission-denied` toast on the lemma total): one press is ~14 round trips and showed nothing until the last, so it was pressed again; two concurrent creates of the same counter/total document made the second an overwrite, which the Rules refuse (reproduced in the emulator). Now the press shows at once with "Saving…", the buttons lock, and a press during a save starts nothing; the evidence write runs alongside the counters.
- **Bookmark menu** (the Owner: "Enlarge bookmark to take the entire screen"): open, it is a full-screen opaque sheet at every width (list in one column, at most 40rem), the page behind still; ✕ Close (40px) or Escape closes it. Other categories keep the dropdown.
- **Checks:**
  - quran-search-transliteration 48/0 (--mutate-strict fails 2, --mutate-no-sound fails 20)
  - word-progress-saving-browser 32/0 (--mutate-no-lock fails 8, --mutate-no-instant fails 20); every word-card suite green (achieved-mirror 73, lemma-progress 76, practising 458, known-word-marks 122, lemma-levels 240, pc-boxes 296, word-levels 41, meaning-groups 66; word-progress-rendered 80/3, sandbox TLS)
  - bookmark-sheet-browser 176/0, 2 pages, en/bn, 320–1280 (--mutate-off fails 76); study-presets 84/0; navcheck green
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0; layout.mjs: no geometry change (only the known `bmNotFound`)
  - behaviour 1006/1 (sandbox: 31e TLS); 49/50 now close the menu with Close, since the sheet covers its tab
- **With the Owner:** try "Inni fi khalqi samawate"; press Achieved once on a word; open Bookmark on the phone. A folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).

**Previous milestone: v09.75 on `main`** (4 Oct 2026 — **Explore: no overhang on desktop and tablet either** (the Owner: "fix the Explore overhang on desktop too")).
- **What was wrong:** above 720px the Explore card was sized to the window, so on a short window the wheel column (wheel, legend, ring key, words-known line, hint) ran 40–140px past the card's bottom edge (820×700: 140px; 1280×800: 58px). v09.74 had fixed the phone half and recorded this one.
- **The fix:** above 720px the card never shrinks below the wheel column (`#exploreScroll` scrolls it), and `contain: size` keeps the surah list out of that sum, so the list still fills the card and scrolls inside it. Measured: the wheel and list never wrap above 720px, which this relies on.
- **Checks:**
  - explore-phone-card-browser 146/0 at 13 sizes, en/bn (--mutate-desk fails 20, --mutate-shrink fails 40); it now measures what is VISIBLE (a half-shown list row counts only to the list's edge)
  - every Explore suite green (Hizb, WbW tab, My Status, unit rings, Asma, Arabic coverage, word total); card-look-browser 96/0 (one intermittent miss, then 3/3)
  - layout.mjs: no geometry change (only the known `bmNotFound`); phone-width-overflow 217/0, palette-contrast 20/0, text-size-wbw 88/0, stub-parity 4/0
  - behaviour 1006/1 (sandbox: 31e TLS)
  - quran-boundary was red on `main` (30/1, "feature registry retains the locked 30 Approaches"): **fixed after this release, test only** (the Owner: "fix the quran-boundary test too"). The check grepped prose v08.113 had reworded on purpose once tenants could add Approaches; it now reads `APPROACH_TEMPLATES` (30, `approach_01`..`approach_30` in order, 7 sections). 33/0; an order mutation and a section mutation each fail it
- **With the Owner:** check Explore on a computer with a short window; a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.74 on `main`** (4 Oct 2026 — **Word-by-Word boxes enlargeable in Read and Note view; Explore readable on a phone** (the Owner's two reports, 4 Oct 2026).
- **Text size (A±) gains a "Word by Word" slider** (`--qr-wbw-scale`, 80–160%, remembered on the device). It scales every Word-by-Word box (Arabic, transliteration, meaning) in the Read view, the Note view and the pop-up pane; **All** and **Reset** include it. The ayah's own Arabic/English/Bangla keep their sliders. The Owner: "Can you enable these words enlargeable, both in Read and Note view?"
- **Explore → Quran on a phone** (the Owner: "unreadable", "card overlapping"): `#explorePanel` shrank to the scroll box, its dark background ended under the ring key, and the Whole Quran card, the words-known line, the hint and every surah row ran on as pale text on the white page. At 720px and below the panel no longer shrinks below its content and the stacked list sizes to its rows. 820px and wider unchanged.
- **Known, not fixed here:** on a short desktop window (1280×800) the Explore wheel column overhangs its card by 26–58px (pre-existing); `explore-phone-card-browser` prints it as a NOTE.
- **Checks:**
  - text-size-wbw-browser 88/0 (Read and Note view, en/bn, 390/1280; --mutate-no-css fails the size checks)
  - explore-phone-card-browser 58/0 (7 widths, en/bn; --mutate-shrink fails 40)
  - layout.mjs: no geometry change (only the known `bmNotFound` dangling-id report, on `main` too)
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0; word-card, known-word, mark-words, study-options, journey-note-pane suites green
  - behaviour 1006/1 (sandbox: 31e TLS)
- **With the Owner:** try the Word by Word slider and Explore on the phone; a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.73 on `main`** (4 Oct 2026 — **Mapping My Journey: Pin, Favourite, Archive, Finalise and links between Notes SWITCHED ON (Siyagah round S14, decision 66, #566).**
- **The Owner published the round 14 Rules** ("Round 14 rules are live Al Hamdulillah"). `firestore.rules` is synced to `docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules` (`[already-deployed-manually]`; 111 lines added, none removed).
- **`app/js/siyagah-flags-readiness.js` is open** (`ready: true`, master-architect, 2026-10-04, reference `docs/reports/2026-10-04-siyagah-round14-enabled.md`). Every S14 control built in v09.72 now writes.
- **What works now:** 📌 Pin (pinned Notes first), ⭐ Favourite, 📦 Archive (leaves the folder list), 🔒 Finalise (Edit and Trash refused until un-finalised), Link to a Note… and Linked from, and the pinned Notes in a pop-up window.
- **Also: a settings Play always starts the settings** (the Owner: "The Read/play button at the settings should be enough to start the desired read/play act"). Study options' Play and Choose a Unit's Play stop whatever is sounding or paused (counted as heard, like Stop) and start the current settings; before, a recitation still sounding made that Play a pause. The reading screen's own ▶/⏸ keeps its toggle. study-options-play-read-browser 73/0 (--mutate-no-fresh fails 4); wheel-unit-go-browser 254/0.
- **The Siyagah folder plan S8–S14 is complete.**
- **Checks:**
  - emulator against the published file: siyagah-round14 60/0, siyagah-flags-links-real-function 30/0; journey-map, sections and tags real-function green
  - journey-flags-links-browser 306/0 (its gate-off cases now route a closed copy; mutation e still fails); every journey suite green
  - rules-authorisation-executable 63/0; note-foundation-data-layer, journey-map-boundary, stub-parity green
  - phone-width-overflow, palette-contrast green
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **With the Owner:** try Pin, Finalise and a link; a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.72 on `main`** (4 Oct 2026 — **Mapping My Journey: Pin, Favourite, Archive, Finalise and links between Notes — built, SWITCHED OFF until the Owner publishes the round 14 Rules (Siyagah round S14, decision 66, #566).**
- **On a Note's ⋯ menu:** 📌 Pin, ⭐ Favourite, 📦 Archive, 🔒 Finalise, and **Link to a Note…** (a search picker). Pinned Notes lead the folder list with 📌; archived Notes leave it; ⭐ Favourites and 📦 Archived lists from the tree's ⋯ menu; a finalised Note refuses Edit and Trash in words; a Note shows its links and a **Linked from** list; a pop-up window shows the pinned Notes.
- **Switched off:** `app/js/siyagah-flags-readiness.js` is `ready: false`. Until the Owner publishes `docs/governance/2026-10-04-siyagah-round14-DEPLOYMENT-candidate.rules`, every control explains itself in words and writes nothing.
- **Rules candidate (PR #567, not published):** four optional booleans on a Note, a flag-only update path with no revision, the content path closed while finalised, a new `noteLinks` collection. ADR-010 Amendment 2. `firestore.rules` is unchanged.
- **Built by:** the Architect (Rules, emulator suites) and the Builder (app, PR #568). Architect review: a real-function emulator suite for the new writers.
- **Checks:**
  - emulator: siyagah-round14 60/0 (16 mutations, each caught); siyagah-flags-links-real-function 30/0
  - journey-flags-links-browser 306/0 (mutations a–e each fail); every journey suite green
  - rules-authorisation-executable 63/0 (ROUND 14 block); note-foundation-data-layer, journey-map-boundary, stub-parity green
  - phone-width-overflow 217/0, palette-contrast 20/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** the Owner publishes the round 14 Rules; then the Architect syncs `firestore.rules` and switches the gate on.
- **With the Owner:** publish the Rules (guide: `docs/governance/2026-10-04-siyagah-round14-owner-publish-guide.md`); a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.71 on `main`** (4 Oct 2026 — **Mapping My Journey: pop-up windows finished — tabs and the version line (Siyagah round S13, decision 66, #564).**
- **A tab strip (640px and up)** when several Notes are open in windows: one tab per window with its title and ✕; a tab brings its window to the front; the active tab is marked; a long title is shortened with the full title in its tooltip; the strip scrolls inside itself.
- **On a phone** the bottom switcher gains a ✕ per item, and each title is shown in full on up to two lines (it was cut to "Note …" for every Note), with the strip scrolling sideways.
- **The Details line shows "Version n of m · saved <time>"** (oldest = 1); tapping it opens the Versions list. Bangla digits in Bangla.
- **Not in this round:** the side panel of pinned Notes, which needs S14's Pin flag.
- **No Rules change.** **Built by:** the Builder (PR #565). Architect review: phone titles shown in full, with a check and its mutation.
- **Checks:**
  - journey-window-tabs-browser 166/0 (mutations: tab-tap-noop 22, version-off-by-one 12, no-title-tooltip 6, sheet-titles-cut 2, close-all fails)
  - every journey suite green; note-sanitize-boundary, note-foundation-data-layer green
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** S14 — pin, favourite, archive, finalise and links between Notes; needs new Rules the Owner publishes.
- **With the Owner:** a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.70 on `main`** (4 Oct 2026 — **Mapping My Journey: the editor (Siyagah round S12, decision 66, #562).**
- **New toolbar buttons** (pane and pop-up windows alike): underline, strikethrough, checklist (tickable, saved), quote, link (http/https/mailto), a simple table, text colour and highlight from a fixed palette, alignment, redo, clear formatting. On a phone the toolbar scrolls inside itself; the page never scrolls sideways.
- **Headings while editing:** a ▾ to fold a section (view only, nothing saved) and a ⠿ grip to move the whole section.
- **The Note cleaner** (`note-sanitize.js`) now admits links, quotes, tables, checklists, `dir` and three style properties (colour, background colour, text-align) with checked values; `on*` handlers, `class`, `javascript:` links and any other style stay out. Images still load only from http(s).
- **Bangla times** on Versions and the Note's Created / Last changed line use Bangla digits and no English AM/PM.
- **No Rules change.** **Built by:** the Builder (branch `builder/issue-562-run-857`). **Architect review found a real defect:** the window resize handler still called the removed `fitEditToolbar`, so every resize threw and note windows stopped laying out (caught by journey-note-windows-browser); fixed.
- **Checks:**
  - journey-editor-browser 577/0 (mutations: js-link-ok 22, style-through 44, move-leaves-body 11, redo-noop 11)
  - note-sanitize-boundary 12/0; journey-note-windows-browser 254/0 after the fix; every other journey suite green
  - note-foundation-data-layer, rules-authorisation-executable green; phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** S13 (pop-up windows: tabs, Details with version, pinned side panel), S14 (flags and Note links, needs Rules).
- **With the Owner:** a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.69 on `main`** (4 Oct 2026 — **Mapping My Journey: reading tools (Siyagah round S11, decision 66, #559).**
- **🔍 Find in this Note:** every match highlighted, "n of m", ▲ ▼ and Enter / Shift+Enter to step, Esc to close; Bangla words too; a hit inside a folded heading opens it on screen. Writes nothing.
- **⇅ Open / close all headings** with the pane's existing folding (per device, no Firestore write).
- **☰ Contents on every width** and for any Note with a heading (it was hidden at the wide tier and needed 3+ headings).
- **🕘 Versions** (⋯ menu): earlier revisions newest first, read-only; **Bring this version back** saves it as a NEW revision through `updatePermanentNoteContent` (reason `version-restore`); old revisions untouched.
- **📎 Folders and tags** in one sheet/popover (the S10 tick list plus tags). It replaced nothing: the ⋯ menu's Folders… and Tags… stay.
- **The bar stays one line:** at narrow widths 🔍, ⇅ and then 📎 fold into ⋯.
- **No Rules change.** **Built by:** the Builder (PR #561); Architect review by measurement, no changes needed.
- **Checks:**
  - journey-reading-tools-browser 488/0 (mutations: restore-overwrites 8, find-first-only 48, contents-hidden-phone 4, foldall-noop 8, no-tags fails)
  - every journey suite green; note-foundation-data-layer and rules-authorisation-executable green
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Leftover:** the version times in Bangla still print "AM" (goes with S12).
- **Next:** S12 (the editor), S13 (pop-up windows), S14 (flags and Note links, needs Rules).
- **With the Owner:** a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.68 on `main`** (4 Oct 2026 — **Mapping My Journey: one folder picker with tick boxes (Siyagah round S10, decision 66, #557).**
- **Tick the folders a Note belongs in:** while reading, a tick files the Note there at once and an untick retires that one filing (a status change, never a delete). The last folder cannot be unticked; the picker says why in words. While editing, the ticks are saved with the edit on Done, and Cancel leaves the filings as they were.
- **Inside the picker:** search folders and Notes, ＋ New folder (inside the highlighted folder, or at the top), rename, and **Move to Trash** (`trashFolder`; nothing is erased).
- **Where it opens:** the Note's Copy to… (ticks), Move to… (move), "+ File a Note here…" (choose Notes for a folder), and the editor (staged ticks).
- **Widths:** a sheet from the bottom on a phone and tablet, a popover beside the Note on a desktop. Long folder names wrap.
- **No Rules change.** New service call `retireNoteFiling` wraps the existing `retireNotePlacement`.
- **Built by:** the Builder (branch `builder/issue-557-run-852`); Architect review by measurement, no changes needed.
- **Checks:**
  - journey-folder-picker-browser 294/0 (mutations: untick-deletes 28, edit-writes-early 32, no-trash 8, no-last-guard fails)
  - every journey suite green; note-foundation-data-layer and rules-authorisation-executable green
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** Siyagah rounds S11 (reading tools) to S14.
- **With the Owner:** a folder's own window (needs a demo); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.67 on `main`** (4 Oct 2026 — **Mapping My Journey: menus everywhere, drag a Note onto a folder, deep nesting (Siyagah round S9, decision 66, #555).**
- **Menus:** right-click (PC) or a long-press (phone, tablet) on a folder opens its ⋯ menu, and on a Note card its actions. A short tap or a scroll never does.
- **The folder menu gains:** Add subfolder, Move to top level, Turn into a section (top-level folders). **Open in its own window was NOT built:** a window listing a folder's Notes is a new kind of window (note windows hold one Note), so it waits for its own demo.
- **Drag a Note onto a folder** to add it there; it stays in its other folders, and a folder that already holds it refuses it in words. Only at the three-column width (1200px and up), where the tree and the list are on screen together; folders can be dragged by touch at every width.
- **Closing a folder closes its subfolders.** **Search finds tags too.**
- **Nesting:** the depth guard is 64 instead of 8 (decision 66's "without a limit"; ADR-010 updated, the cycle refusal unchanged).
- **From S8:** card dates show the date only ("1 Sep 2026", Bangla month and digits), and the ▾ stays on the title's line on a phone.
- **No Rules change.** **Built by:** the Builder (branch `builder/issue-555-run-849`). Architect review: ADR-010's wording, and the depth mutation now fails a check instead of crashing.
- **Checks:**
  - journey-s9-browser 280/0 (mutations: drop-replaces 3, longpress-short 32, depth-back 8, no-recursive, no-tagsearch 8)
  - every journey suite green (three-panel 368, folder-menus 148, note-pane 327, tags 363, sections 349, tray 227 and the rest); note-foundation-data-layer green
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** Siyagah rounds S10 (the folder picker) to S14.
- **With the Owner:** the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.66 on `main`** (4 Oct 2026 — **First screen B, and the light comes from the Qur'an (decisions 65 and 67, #549).**
- **First screen:** the Owner's calligraphy and the open Qur'an show from the start. A smaller **Study Quran** pill sits where the unit's name goes and names the unit (e.g. "Page 257 · Ibrahim"). Tapping it gives the centre as in decision 63.
- **The light (decision 67, "6, build it"):** beams rise from along both pages' top edges, the pages glow, at Bright, with the seven stars of decision 65. Demo v14 is the reference.
- **The pill's name is never cut:** it wraps to a second line. On a hub under 140px (a 320px phone) the pill is 80% wide so "Study Quran" keeps one line, and when even two lines would crowd out the Qur'an the unit alone shows, with the full name in the button's title.
- **Built by:** the Builder (PR #550). Architect review: the light from the pages, and the never-cut pill name.
- **Checks:**
  - wheel-centre-browser 633/0 (`--mutate-sunrise` fails 12, `--mutate-cut-pill` 6, `--mutate-six-stars` 12, `--mutate-big-button` 98)
  - wheel-unit-go 254/0, tablet-wheel 74/0, approach-short-names 70/0, read-contents 248/0
  - palette-contrast 20/0, phone-width-overflow 217/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** S9 (#555) in review; Siyagah rounds S10–S14.
- **With the Owner:** the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.65 on `main`** (4 Oct 2026 — **Mapping My Journey in three panels, the first Siyagah folder round S8 (decision 66, #551).**
- **The panels:** the folder tree (folders only; Notes leave the tree, as in Siyagah); the chosen folder's Note list; the Note. Phone and tablet show one panel at a time with a back control; from 1200px the three sit side by side. The tray does the same in its own width. One function picks the tier.
- **The Note list:** ✚ New note, Compact / Preview, ⬆ to the parent, subfolder chips with counts, ➕ New folder inside this one, a quick-title bar that creates a Note filed in this folder (`createPermanentNote` + `createNotePlacement`), and "in N folders" on a card filed more than once. A tap anywhere on a card opens its Note.
- **The Note:** ✚ New note in its bar; a folder's ⋯ menu gains Add note here.
- **No Rules change.** Every new text in Bangla.
- **Built by:** the Builder (branch `builder/issue-551-run-846`). Architect review: a tap anywhere on a card opens the Note, with a check.
- **Checks:**
  - journey-three-panel-browser 368/0 (mutations: `no-placement`, `three-narrow`, `no-infolders` fails 8, `no-cardtap` fails 8)
  - journey suites all green (folder-menus 148, note-pane 327, note-windows 254, sections 349, tags 363, tray 227 and the rest)
  - phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
- **Next:** first screen B with the Qur'an's light (#549, waiting on the Owner's light choice); Siyagah rounds S9–S14.
- **With the Owner:** the light from the Qur'an (demo v14); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.64 on `main`** (4 Oct 2026 — **Choose a Unit ends with Read and Play (decision 64, #547).**
- **The buttons:** after choosing a unit, **Read** opens the Read view at that unit. **Play** opens it and starts the recitation there. They are two solid gold buttons at least 40px tall at the foot of the Choose a Unit list.
- **The list stays open while choosing:** the unit type, the number, the surah and the āyah(s). It closes on Read, on Play, or on a tap outside it. Before, it closed on each choice, which would hide the very buttons it offers.
- **Built by:** the Builder (#547, branch `builder/issue-547-run-840`). The Architect's review removed the close-on-choice rule and added a check that the list stays open through every choice.
- **Checks:**
  - wheel-unit-go-browser 254/0 (`--mutate-no-play` fails 24, `--mutate-read-plays` 12; the old close-on-choice rule restored fails 24)
  - wheel-centre-browser 266/0
  - tablet-wheel 74/0
  - read-contents 248/0
  - palette-contrast 20/0
  - phone-width-overflow 217/0
  - stub-parity 4/0
  - behaviour 1006/1 (sandbox: 31e TLS)
- **Next:** first screen B with the Qur'an's light (decision 65, #549); S8, the three-panel Mapping My Journey (#551).
- **With the Owner:** the light from the Qur'an (demo v14); the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.63 on `main`** (4 Oct 2026 — **The wheel's centre is the Owner's own calligraphy (decision 63, #542).**
- **The centre:** it is now a display. The Owner's gold Audhubillah arc and Bismillah are one image, `app/img/wheel-hub-calligraphy.webp` (50 KB, cut from their own picture). It is placed as their circle places it: x 6.94–94.86%, y 7.03–46.13% of the measured gold ring.
- **Under the calligraphy:** the chosen unit in two small lines, for every unit including a single āyah (e.g. "Page 257 / from Surah 14 · Ibrahim"). The second line wraps rather than being cut at 320px.
- **At the bottom:** the demo's open Qur'an giving light.
- **The pickers move:** the Surah and Āyah pickers leave the hub. **Choose a Unit** gets the full unit choice in the approved demo's order: Study Unit, the unit's number, Surah, then Āyah or From–To.
- **The wheel's size and rings are unchanged,** measured against `main` at 5 widths.
- **Built by:** the Builder (PR #543). Architect review put Choose a Unit in the demo's order and stopped the label being cut. Each fix comes with a new check, mutation-proven. A review bot's four findings on the demo (#541) were all real and are fixed in #544, which also corrected decision 63's example: Page 257 starts at Ibrahim, not Al-Hijr.
- **Checks:**
  - wheel-centre-browser 266/0 (`--mutate-image-shift` fails 20, `--mutate-select` 10, old row order 6)
  - approach-short-names 70/0
  - phone-width-overflow 217/0
  - palette-contrast 20/0
  - panel OK
  - behaviour 1003/4 (sandbox: 22g×3, 31e)
  - on `main` merged in: word-card-bangla-dictionary 200/0
- **The image** is the one new landing-page load (no preload; I9 flagged to the Owner).
- **With the Owner:** the Asmaul Husna poster (on hold, decision 50).
)

**Previous milestone: v09.62 on `main`** (4 Oct 2026 — **The Word card shows the Bangla dictionary meaning (decision 62, #539).** In Bangla, the Depth tab's Dictionary box leads with the meaning from the AQS *Quraniyo Obhidhan* (কুরআনীয় অভিধান, Abu Hena / Yahya, 2nd ed. 2015): the first meaning in large type, the English meaning smaller under it, and any further entries under the same unvowelled spelling in a closed "এই বানানের অন্য ভুক্তি (n)", each with its PDF page. The credit names the book and links its page (`archive.org/download/mujammufahras/qab.pdf#page=N`). A word with no matched entry says so and never guesses. The data (`lemma-dictionary-bn.json`, 2,761 of 4,832 lemmas, 57.4% of word occurrences; PR #538) is fetched only when a Bangla reader first opens Depth (I9); English readers never fetch it. Built by the Builder (PR #540); Architect review updated two stale load checks in place in word-card-dictionary-browser (English WbW loads the English file on purpose since #504; mutation-proven). Checks: word-card-bangla-dictionary-browser 200/0 (`--mutate-no-lang-gate` fails 56), word-card-dictionary-browser 277/0, bangla-dictionary-data 35/0, quran-word-card 37/0, behaviour 1006/2 (sandbox TLS: 22h, 31e). Next: the wheel centre with the Owner's calligraphy (decision 63, PR #543). With the Owner: the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.61 on `main`** (3 Oct 2026 — **The Word card's three "Needs a source" lines are filled (decision 61, #533).** Arabic in Depth: **Grammar in This Āyah** shows what the word does in its sentence from the Quranic Arabic Corpus treebank (GPL v3; surahs 1–8, part of 9, 59–114; elsewhere the line stays "needs a source"), each relation by the Corpus's own Arabic name with an English or Bangla gloss; **Word Choice** shows al-ʿAskarī's *al-Furūq al-Lughawiyya* entries for the Dictionary word (first three, then "Show N more"); **Classical Arabic Usage** shows al-Rāghib's *al-Mufradāt* entry for the root. Both books CC BY-NC-SA 4.0 via OpenITI, credited with page numbers; no translations (a generated quotation is ruled out). A fourth source tag, **From a book**. Each data file is fetched only when its section opens (I9). Built by the Builder (PR #537); Architect review fixed four things: piece Arabic from the data's `seg`, Arabic names isolated in Bangla text, general Bangla names for `subjx`/`predx`, and the 3-entry limit. Checks: word-card-needs-source-browser 93/0 (`--mutate-closed-fetch` fails 8+), needs-a-source-data 35/0, word-card-depth-rebuild 231/0, conjugation 213/0, search 252/0, pc-boxes 296/0, palette-contrast 20/0, phone-width-overflow 217/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Next: the wheel centre (demo with the Owner) and the Bangla dictionary from the AQS *Quraniyo Obhidhan* PDF (the Owner, 3 Oct: build without waiting for permission). With the Owner: the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.60 on `main`** (3 Oct 2026 — **Two small fixes, and three suites green again.** (1) **Know Your Status's wheel prints the Approach names again.** Its default All-units view (#425) came after the Names rule (#385, "every wheel that draws Approach slices") and was drawn without them; `myStatusWheelBoxHtml()` in `app/quranrevival.html` now passes the same `names` line as the landing ring wheel, honouring the Names switch. approach-short-names-browser 69/1 → 70/0. (2) **The āyah picker no longer cuts "Bismillah".** With Al-Fātiḥah's count on (decision 55) its first option is a word in a number-sized cell (24px usable, 53px needed, at every width); `fillAyahSelect()` now marks `#ayahSelectControl.opt-cell-word` for that case only and the cell takes 6rem, so every other surah keeps today's cell to the pixel. panel.mjs 32 problems → 0 in English, 0 in Bangla; the row's line count is unchanged. (3) **quran-word-card.mjs** (stops at its first failure, so a stale /سمو/ had hidden six more stale checks about round 3's Basic rebuild) 37/0, **ayah-action-sheet-boundary** 54/0: each check updated in place with its reason, each mutation-proven. Also on `main` since v09.59, with no version: the Needs-a-source data (PR #532, decision 61). Next: the Builder's Needs-a-source screen round (#533). With the Owner: the permission letters (later); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.59 on `main`** (3 Oct 2026 — **Tablet wheel: the corner buttons sit on the screen's edges.** The Owner, with a tablet photo: "Place them on edges". On their tablet the four corner holders followed the wheel's box, which stood in from the screen, so the buttons sat about 40px in and Choose a Unit covered a number on the wheel. `tabletWheelLayout()` in `app/quranrevival.html` now measures the box's distance from each side of the screen into `--tw-l` / `--tw-r` (on every apply, window resize and box resize; cleared outside the 581–720px band) and the corner CSS subtracts it, so every button stands 4px from the screen's edge whatever padding sits around the wheel. Checks: tablet-wheel-browser 74/0 (edge checks tightened to 8px, plus a case with the box pushed 40px in from both sides, which reproduced the Owner's overlap at −8px before the fix; `--mutate-edges` fails 26), read-contents 248/0, landing-drawers 274/0, phone-width-overflow 217/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Next: the Needs-a-source lines (decision 61; `docs/reports/2026-10-03-needs-a-source-candidates.md`); to fix separately: approach-short-names 69/1, quran-word-card.mjs, ayah-action-sheet-boundary 52/2, the āyah picker's Bismillah at desktop. With the Owner: the permission letters (later); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.58 on `main`** (3 Oct 2026 — **Word card rebuild, round 7: the PC boxes (decision 59, issue #525). The seven-round Word card rebuild is complete.** On a wide card the body becomes two columns: the tab content on the left, and on the right **Record your Progress** (the level · āyah · word line and the four stage buttons in their stage colours, 2 × 2) and **Know Your Status** (a **percentage ring** of the Qur'an's words known at the OPEN tab's level, the same known/total as that level's "You know …" line, "—" and no arc while unknown, never 0%; then the coverage line, the "You know" box, "Appears …" and "If you learn this word …"). The breakpoint is a container query on the card itself (it is a resizable window), measured: two columns from a 62rem card, where the left column keeps the 640px Depth's three conjugation tables need side by side; the Word card window's first size may be up to 1120px (`initPopupWindow` `defaultMaxWidth`; 1101px at a 1280 screen; other windows keep 920; a remembered size is kept); at 1024 (an 881px card) and on phones the layout is today's. No new reads, no write-path change. Built by the Builder (run 787, which lost its second commit and its PR to a 401); the Architect's review applied its described progress-box fix (`display: flex`, not `contents`) and moved the breakpoint from 52rem to 62rem with the wider first size, so Depth's tables do not stack at 1280. Checks: word-card-pc-boxes-browser 148/0 en and 148/0 bn (new; `--mutate-ring` fails), word-card-conjugation 213/0 (three across at 1280), quran-word-levels 41/0, quran-word-progress-rendered 80/3 (sandbox TLS), word-progress-practising 230/0 en and 228/0 bn, search 252/0, depth 231/0, basic 138/0, wbw 136/0, lemma-progress 76/0, phone-width-overflow 217/0, palette-contrast 20/0, behaviour 1007/1 (31e sandbox TLS). Next: the Needs-a-source lines (decision 61; `docs/reports/2026-10-03-needs-a-source-candidates.md`); to fix separately: approach-short-names 69/1, quran-word-card.mjs, ayah-action-sheet-boundary 52/2, the āyah picker's Bismillah at desktop. With the Owner: the permission letters (later); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.57 on `main`** (3 Oct 2026 — **Practising on the Word card, and every pressed stage button in its stage colour (#520, PR #522).** The Owner: "Add Practising to the Word Card in all levels." and "enable everywhere in the app the progress record button gets their respective color when selected." The Word card's progress row (WbW, Basic, Depth) has four stages: Not started · Learning · **Practising** · Achieved, a 2 × 2 grid below 400px. `WBW_WORD_STATES` gained `practising`, stored code `p` (an older copy reads an unknown code as Not started and never throws). Practising is never known: it counts with Learning in the coverage line, the "You know" totals, Mark words (amber), the lemma-wide claim and the If-you-learn line; review and approval stay on Achieved only. No Rules change: `quranWordProgress` checks no state values. A pressed stage button takes its stage's wheel colour through `stageColourStyle()` (imported from `ayah-action-sheet.js`, never copied); the Builder's audit of `app/` found the Word card row and the Approach stage row are the only stage buttons (elsewhere a stage is chosen from a `<select>` or shown as an already-coloured chip). Built by the Builder; the Architect's review updated `quran-word-progress-rendered` in place for the three level totals Read has read since v09.51 (Mark words), back to 80/3 (sandbox TLS). Checks: word-progress-practising-browser 458/0 (new; `--mutate-known` fails 5), quran-word-progress-model 62/0, -data 43/0, -levels-rendered 41/0, lemma-progress 76/0, known-word-marks 122/0, mark-words 48/0, word-card wbw 136/0, basic 138/0, depth 231/0, search 252/0, approach-list-dots 66/0, tablet-wheel 56/0, rules-authorisation-executable 56/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Next: round 7, the PC boxes; the Needs-a-source lines (`docs/reports/2026-10-03-needs-a-source-candidates.md`); to fix separately: approach-short-names 69/1, quran-word-card.mjs, ayah-action-sheet-boundary 52/2. With the Owner: the permission letters (later); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.56 on `main`** (3 Oct 2026 — **Tablet landing: a bigger wheel, its buttons in the corners.** The Owner, with tablet photos marking the corners: "let the wheel fit to the entire screen well n then, you place those buttons in the gaps. So, build it." (demo https://claude.ai/artifact/EMZKfW6LKkxhFyoLpgE8Dh, "Make the bottom two buttons text in one line"). From 581 to 720px only (phones and the two-column layout untouched), `tabletWheelLayout()` in `app/quranrevival.html` MOVES, never copies, Wheel / Legend / Unit with their drawers to the top-left corner (the drawers open downward, over the wheel), Read to the top right, Choose a Unit to the bottom left (its list opens upward) and Know Your Status to the bottom right, each on one line, and puts each back in its own row outside the band; `body.tablet-wheel` lifts the wheel's height cap so it takes the screen's width, and one gold resize grip under the wheel replaces the corner arrows; `fitLandingFirstScreen()` measures the wheel's own box on a tablet so it still ends above the dock. Measured at 600px: the wheel goes from 533 to 587px, every button clear of the ring (39px nearest, English). Checks: tablet-wheel-browser 56/0 (new; `--mutate-off` fails 28), read-contents 248/0 (its 600px row checks updated in place to the corners), landing-drawers 274/0, quran-my-status 248/0, read-quick-buttons 204/0, unit-rings 106/0, explore-hizb 80/0, fatiha-count 136/0, read-list-button 72/0, read-list-home 30/0, writing-sheet 180/0, phone-width-overflow 217/0, palette-contrast 20/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Found red on `main` before today, to fix separately: approach-short-names 69/1 ("My Status's wheel prints the 10 names"), quran-word-card.mjs (a /سمو/ expectation), ayah-action-sheet-boundary 52/2. Next: #522 Practising and stage colours (under review); round 7, PC boxes; the Needs-a-source lines (`docs/reports/2026-10-03-needs-a-source-candidates.md`). With the Owner: the permission letters (later); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.55 on `main`** (3 Oct 2026 — **The Approach list marks progress by colour (the Owner, 3 Oct: "this approach list should mark those which are already had some progress done ... make it with the color of the progress").** A phone's own pick-list cannot colour its dots, so a tap on the Approach pull-down of the Ayah card and the This page card (one shared wiring, `wireApproachStagePicker()`) opens the app's own list (`openApproachList()` in `app/js/ayah-action-sheet.js`): the tenant's sections, every Approach, a solid dot in its stage's colour from `STATUS_COLORS` (the same colours as the stage buttons and the wheel: Learning brown, Practising gold, Achieved blue, Mastered green), the chosen one checked, and a colour key. The `<select>` underneath keeps the value and the keyboard; a choice is a plain change on it and writes nothing. Each option carries `data-approach-status`, and `withSelectedOption()` now finds an option whatever attributes follow its value (the literal match broke the chosen Approach while this was built, and global-approach-card caught it). Demo: https://claude.ai/artifact/5EebZvH59XThuJjuqYxALJ (its colours were changed to the stage buttons'). Checks: approach-list-dots-browser 66/0 (new; `--mutate-plain` fails), global-approach-card 109/0, quran-ayah-action-sheet 144/0, mushaf-approach-cards 114/0, unit-card 116/0, fatiha-count 136/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (sandbox: 22g×3, 31e); ayah-action-sheet-boundary 52/2, the same on `main`, to fix separately. Also recorded: Owner decision 61 (part names accepted, Basic order kept, build the Needs-a-source lines, letters later). Next: #520 Practising and stage colours (Builder); the tablet wheel layout (Owner: "build it"); round 7, PC boxes; the Needs-a-source lines from the sources in `docs/reports/2026-10-03-needs-a-source-candidates.md`. With the Owner: the permission letters (later); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.54 on `main`** (3 Oct 2026 — **Word card rebuild, round 6: Search 🔍 in the card header (decision 59, issue #518, PR #519).** A gold-ringed 🔍 tile sits between ‹ and the word. It opens a search row inside the card: type a word in Arabic (vowel marks optional, ٱ read as ا), a meaning (the reader's language first, then the other), or a place like 2:42:8 (Bangla digits too). Results are the exact written forms, at most 30, most frequent first, each with its Qur'an count; tap a form for its places, tap a place to open that word. The row stays open over ‹ › with what was typed. The data `tools/quran-data-pull/output/word-forms-index.json` (19,492 forms, from the local surah files by `build-word-forms-index.mjs`; pause marks and ۞ stripped, so تَعْلَمُونَ is 54 and يَعْلَمُونَ 81, the demo's 53/80 being one short) loads only when Search is pressed (I9); matching is pure in `app/js/word-card-search.js`. The Architect's review compares an exact typed form in NFC, so marks typed in another order still put it first. Checks: word-card-search-browser 252/0 (new; `--mutate-strip` fails), word-forms-index-data 13/0 (new; comparing without NFC fails 1), word-card-conjugation 213/0, depth 231/0, basic 138/0, wbw 136/0 (header now 5 children), phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Next: Practising on the Word card at all levels, with every stage button coloured when pressed (Owner, 3 Oct); the Approach list's coloured dots (built, on its own branch); round 7, the PC boxes. With the Owner: the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.53 on `main`** (3 Oct 2026 — **Word card rebuild, round 5: Verb Conjugation in the Depth tab (decision 59, issue #515).** A closed section "Verb Conjugation · تَصْرِيفُ الْفِعْل" sits between Morphology and Naḥw, for verbs only: Past, Present and Command for all 14 persons from `app/js/verb-conjugation.js` (the engine merged in PR #512 and checked against every active verb in the Qur'an), the present prefix and the endings in colour, ✕ where there is no command, the row of this word's tense and person in gold (with "In this āyah: …" naming the mood when the word is subjunctive or jussive), and ✦ "in the Qur'an: N times" on every form the Corpus counts. A root the engine cannot do safely (weak, hamzated, doubled, not three letters), a verb missing from the data, or an unknown Form I vowel gets one plain line instead of a table: a form is never guessed. The data `tools/quran-data-pull/output/verb-forms.json` loads only when a verb's Depth tab opens (I9). The tables stack on a phone. Built by the Builder (run 778; it could not open the pull request, so the Architect did); the Architect's review added the Arabic title, set off a meaning that already has brackets with a dot, and dropped the pause mark from the In-this-āyah form. Checks: word-card-conjugation-browser 213/0 (new; `--mutate-gold` fails 4), word-card-depth-rebuild-browser 231/0, word-card-depth-grammar 8/0, verb-conjugation-quran 12/0, word-card-basic 138/0, word-card-wbw 136/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Next: round 6, Search 🔍; then round 7, the PC boxes. With the Owner: the Approach-list colours demo (https://claude.ai/artifact/5EebZvH59XThuJjuqYxALJ); the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.52 on `main`** (3 Oct 2026 — **Word card rebuild, round 4: the Arabic in Depth tab (decision 59, issue #511, PR #513).** Depth now opens with the three source tags (From the data / Grammar rule / Needs a source) and five light accordions, only Root & Word Family open at first, each keeping its open state over ‹ › and re-renders: **Root & Word Family** (the family line, the root's Wiktionary meaning with credit, uses and forms, chips for the other words of this root in the āyah that open that word, the Corpus and Lane · Hans Wehr links, and everything the old Depth tab had); **Morphology (Ṣarf)** (pieces, Form, tense, person, voice, mood, and the verb's family in its Form for a sound root); **Grammar in This Āyah (Naḥw)** (particle roles, the verb's mood and sign, the ending's role, a same-āyah comparison, and iʿrāb marked Needs a source); **Word Choice & Distinctions**; **Classical Arabic Usage** in the Owner's wording. Built by the Builder in `app/js/word-card-depth.js`; the Architect's review corrected four Naḥw lines (a present verb with the feminine-plural nūn is built on sukūn, one with the emphatic nūn on fatḥa, a passive verb's ending is نَائِبُ فَاعِل, on kāna and its sisters the ending is their اسم) and one English wording. Checks: word-card-depth-rebuild-browser 231/0 (new), word-card-depth-grammar 8/0 (new, pure, Arabic written by hand; removing the passive branch fails 2), word-card-basic 138/0, word-card-wbw 136/0, quran-word-card-rendered 125/2 (sandbox TLS), phone-width-overflow 217/0, palette-contrast 20/0, mark-words 48/0, known-word-marks 122/0, behaviour 1004/4 (sandbox: 22g×3, 31e). Next: round 5, the Verb Conjugation section (issue #515), on the merged engine. With the Owner: the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.51 on `main`** (3 Oct 2026 — **Mark known or unknown words (decision 60).** The Owner: "Enable a switch between known/unknown word marking (whatever user chooses). Marked words should be always less." Study options → Reading view has a new **Mark words** row (its own class `mark-words-row`, not `.reading-ticks`): **Fewer (auto)** · **Known** · **Unknown**. Known words keep the light green tint; words still to learn get a light amber one (`.is-unknown-word`). Fewer (auto), the default and the Architect's recommendation shown in the demo (https://claude.ai/artifact/N6iuWKx4Rg5uNNy1RAr5kD), marks known words while under half of the Qur'an is known and the words still to learn once half or more is, from the best of the WbW/Basic/Depth "You know" totals (cached single-document reads, only with a Read or Note view on screen). The choice is per device (`getMarkWordsMode()`/`setMarkWordsMode()`/`markWordsShows()` in `app/js/prefs.js`); nothing is written; āyah-end markers are never marked. Checks: mark-words-mode-browser 48/0 (new; mutation making Fewer always "known" fails 2), known-word-marks-browser 122/0, phone-width-overflow 217/0, palette-contrast 20/0, behaviour 1004/4 (sandbox: 22g×3, 31e), stub-parity, brief-integrity green; panel.mjs 32 problems, identical on `main` without this change (the āyah picker's "Bismillah" option is cut at desktop widths since v09.40, to fix separately). The Word card rebuild continues: round 4 (Depth) with the Builder, round 5's engine merged (PR #512). With the Owner: the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.50 on `main`** (3 Oct 2026 — **Word card rebuild, round 3 of 7: the Basic tab (decision 59, #508, PR #510).** Basic opens with round 2's Root / Dictionary word / Form row (`wordFactsHtml()`), then the root's derived forms as light cards (`derivedCardsSection()` in `app/js/quran-word-card.js`): group tag, part of speech (+1 when more than one; verbs "Verb · V"), the Arabic large, meaning and count, this word's own card in gold (`data-word-card-form-current`), right to left, 7 per row on a PC, 4 at ≤1000px, 3 on a phone. The order comes only from `orderDerivedForms()` over `DERIVED_GROUP_ORDER` in `app/js/word-grammar-tables.js`, the one place the Owner's order replaces; `lemma-forms.json` loads on first use of Basic (I9), and until it arrives the cards show without group tags. Below the cards everything is as before; Depth keeps its list until round 4. Checks: word-card-basic-rebuild-browser 138/0 (new; the 14 forms of ع ل م in the demo's order; the Architect's mutation swapping two groups failed 12), word-card-wbw-rebuild-browser 136/0, quran-word-card-rendered 125/2 (TLS; Basic row checks updated in place to cards), quran-word-card-form-meaning-browser 288/0 (selectors updated in place), quran-word-levels 41/0, quran-lemma-progress 76/0, phone-width-overflow 217/0, palette-contrast 20/0, word-features-data 27/0, behaviour 1007/1 (TLS), governance suites green. **Next: round 4, the Depth tab** (brief `docs/reference/2026-10-03-word-card-build-spec.md`, target `docs/reference/2026-10-03-word-card-demo.html`). With the Owner: the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.49 on `main`** (3 Oct 2026 — **Word card rebuild, round 2 of 7: the WbW tab and header (decision 59, #504, PR #507).** The header reads ‹ · word and reference · ROOT box · › · ✕ on every tab (the ROOT box absent for a word with no root; 36px buttons, compact box, 1.55rem word on a phone; the 🔍 slot is left for round 6). WbW now shows, under the tabs: the Root / Dictionary word / Form row right to left (`wordFactsHtml()`, reused by Basic in round 3), the English, Bangla and transliteration on one bar, and one box per word part right to left (kind, coloured Arabic piece, Arabic name, name in the reader's language, meaning; `wordPartsHtml()`), from round 1's data in `app/js/quran-word-features.js` and `app/js/word-grammar-tables.js`. The Architect's review set the facts and part boxes to the demo's light cards and strong part colours. I9: the features file loads when a card opens (+1 request per surah), the English dictionary on first English WbW use. Checks: word-card-wbw-rebuild-browser 136/0 (new; ROOT-box mutation caught; I9 measured in the browser), word-features-data 27/0 (I9 importer check updated in place), quran-word-card-rendered 134/2 (TLS), word-card-segments 40/0, quran-word-levels 41/0, quran-lemma-progress 76/0, phone-width-overflow 217/0, palette-contrast 20/0, behaviour 1007/1 (TLS), governance suites green. The previously red quran-word-progress-rendered is fixed (PR #505, stale check; 80/3 TLS). **Next: round 3, the Basic tab** (brief `docs/reference/2026-10-03-word-card-build-spec.md`, target `docs/reference/2026-10-03-word-card-demo.html`). With the Owner: the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.48 on `main`** (3 Oct 2026 — **Word card rebuild, round 1 of 7: the data (decision 59, #501).** Built by the Architect in the session, because it needs the Quranic Arabic Corpus file and Wiktionary, which the Builder cannot reach. `tools/quran-data-pull/build-word-features.mjs` keeps what the pull dropped, in on-demand files only (I9): `output/word-features/surah_NNN.json` (per word, one part id per colouring segment, plus Form, tense, person, mood, voice, participle/verbal noun; 99.64% of words, 4.5 MB in 114 files, largest 358 KB) and `output/lemma-forms.json` (Basic's group, Form and source for all 4,832 Dictionary words: Corpus tags, the reviewed verbal-noun list `tools/quran-data-pull/derived-forms-reviewed.json`, or a fixed grammar pattern minus reviewed exclusions). `app/js/word-grammar-tables.js` holds the Arabic part names, the one sentence per verb Form (I–XII) and `DERIVED_GROUP_ORDER`, the one place the Owner's order replaces; `app/js/quran-word-features.js` is the loader, imported by nothing yet. Nothing on screen changes. Checks: word-features-data 26/0 (new; two mutations caught), the eight governance suites and stub-parity green. **Red on `main` before this and still red:** quran-word-progress-rendered "opening a word reads both lanes and no more" (en/bn), being investigated. **Next: round 2, the WbW tab and header** (brief `docs/reference/2026-10-03-word-card-build-spec.md`, target `docs/reference/2026-10-03-word-card-demo.html`). With the Owner: the part names and Form sentences for review; the Basic order; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.47 on `main`** (2 Oct 2026 — **Basic and Depth word progress SWITCHED ON (decision 58).** The Owner published `docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules` and confirmed it ("Basic and Depth rules are live"); `firestore.rules` is synced to it (tag `[already-deployed-manually]`) and `app/js/study-lemma-levels-readiness.js` declares `ready: true` (master-architect, 2026-10-02, `docs/reports/2026-10-02-lemma-levels-enabled.md`). WbW Achieved marks the same word; Basic Achieved every word of the same root with the same meaning (claim keyed by the meaning group, e.g. `رحم:2`); Depth Achieved every word of the root; the Word card's bold box shows one pair of lines per level on every tab. The groups file is fetched on first Read use, never on the landing page. Checks: rules-authorisation-executable 56/0, emulator lemma-levels and lemma-progress-real-function pass against `firestore.rules` (the latter's loader repaired: it had stopped loading since #492), lemma-levels 240/0 (gate-off case now routes a CLOSED copy), known-meaning-groups 66/0, known-word-marks 122/0, quran-lemma-progress-rendered 76/0, quran-word-levels-rendered 41/0 (these three updated in place), lemma-progress boundary/model/numbers green, quran-word-total-boundary 31/0, quran-ayah-action-sheet 144/0, phone-width-overflow 217/0, quran-word-card-rendered 134/2 (TLS), behaviour 1004/4 (sandbox); shipped-gate probe: Basic Achieved on 1:1:3 shows 327 words at Basic. **Red on `main` before this and still red:** quran-word-progress-rendered "opening a word reads both lanes and no more" (en/bn), to investigate. **Next: the Word card rebuild, all three tabs** (decision 59; brief `docs/reference/2026-10-03-word-card-build-spec.md`, target `docs/reference/2026-10-03-word-card-demo.html`). With the Owner: the Word card list; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.46 on `main`** (2 Oct 2026 — **A bookmark reopens with its exact settings (Owner: "With exact settings i meant").** A bookmark now records `settings.reading` — the Saved settings capture (`capturePresetSettings()`, issue #410) minus the unit: translations, WbW language, Arabic font, page by page, what Full screen hides, end-of-unit prompt, reciters, repeat, mode, loop — and `settings.readChrome` (0 menus shown, 1 full screen, 2 hide everything). Opening a bookmark applies them through `applyPresetSettings()` and then restores the menus state after `openReadingScreen()`. Only a real bookmark open applies them (a `position` is given); the boot last-session restore passes none, so startup is unchanged. Older bookmarks without these fields open as before. v09.45 before it: a bookmark the Note view cannot show opens the Read view (`bookmarkNeedsReadView()`). Checks: bookmark-open-browser 77/0 (exact-settings cases at 390/1280 × en/bn; mutation (d) fails; Architect mutation: no readChrome restore fails 4), study-presets 84/0, boot-status 24/0, behaviour 1004/4 (22g×3, 31e: sandbox). **Word card changes are being collected, not built** (Owner: "wait until I finish all"): 🔍 exact-word search (demo https://claude.ai/artifact/JLpC4nuj4NRzqK7e63XA7x), the root box "ROOT ع ل م" left of ›. **Basic/Depth (v09.44) still switched OFF**, pending the Owner's explicit "Basic and Depth rules are live". With the Owner: that; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.45 on `main`** (2 Oct 2026 — **A bookmark opens where its text is (Owner: "Bookmark must open to the exact screen … where it was bookmarked").** `applyQuranBookmarkSettings()` now asks `bookmarkNeedsReadView(settings, position)`: a bookmark with no `view` (made before #468) or a Note-view one, on a unit the Note view cannot show the text of — Page, Juz, Hizb, Ruku', or a surah spanning more than one Mushaf page (`noteScopeShowAyatText()`'s own rule) — opens the Read view at its place instead of the "read it on the Read screen" stand-in. Ayah, Range and one-page-surah bookmarks are unchanged. Checks: bookmark-open-browser 59/0 (updated in place: old Page 257 → Read view on page 257 at 14:11, Note-view Page 257 → Read view, Surah 14 → Read view, Surah 112 → Note view; new mutation (c) fails), behaviour 1007/1 (31e TLS), read-list-home 30/0, boot-status 24/0, stub-parity 4/0; screenshot: Mushaf page 257 (Ibrahim 11–18). **Basic/Depth (v09.44) is still switched OFF**: the Owner wrote "published" on 2 Oct; switching on (sync `firestore.rules` to `docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules`, gate `ready: true`) waits for their explicit confirmation that it was the Basic/Depth Rules. With the Owner: that confirmation; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.44 on `main`** (2 Oct 2026 — **Basic and Depth word progress by level, built and SWITCHED OFF until the Owner publishes the Rules (decision 58; #490 → PR #492, Builder).** WbW Achieved counts the same word; Basic Achieved the same root with the same meaning; Depth Achieved the whole root; one "You know" line per level. New gate `app/js/study-lemma-levels-readiness.js` (`ready: false`); with it closed the app is exactly v09.42/43 (nothing read or written at basic/depth, no groups fetch). `app/js/quran-lemma-levels.js` `claimKeyFor()`: one lemma-wide claim per (person, level, key) — WbW = the lemma, Basic = the meaning-group id (e.g. `رحم:2`) or the lemma if ungrouped, Depth = the root — so one write covers the spread and nothing is written for mates. `requireImplementedLevel(level, { wide })` admits basic/depth only when the data layer passes the gate. Known = any level (`lemmaViewWithGroup()` checks WbW, then the Basic group claim, then the Depth root claim); the Word card's bold box shows one pair of lines per level, and "Known through its meaning group (Basic: same meaning)" / "Known through the root رحم (Depth: same root)". Per-level totals in `quranWordTotals` (`${tenant}__${person}` kept for WbW; `…__basic` / `…__depth` with a `level` field), which the deployed Rules already allow; the lemma/approval/counter documents at basic/depth need `docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules` published (guide: `docs/governance/2026-10-02-lemma-levels-owner-publish-guide.md`). **To switch on** after the Owner says the Rules are live: sync `firestore.rules`, set the gate `ready: true` with a dated decision. Checks: lemma-levels-browser 240/0 (gate forced open by route; hand-written counts 57 / 327 / 339 words; Builder mutations basicroot, depthgroup, wbwgroup, sharedtotal each fail; Architect mutation: Depth keyed by the lemma fails 24), known-meaning-groups 66/0, known-word-marks 122/0, quran-lemma-progress-rendered 76/0, quran-word-levels 41/0, quran-ayah-action-sheet 144/0, quran-lemma-progress-model 34/0, -boundary 8/0, fatiha-count 136/0, read-list-home 30/0, boot-status 24/0, palette-contrast 20/0, phone-width-overflow 217/0, stub-parity 4/0, quran-word-card-rendered 134/2 (TLS), behaviour 1004/4 (22g×3, 31e); **quran-word-total-boundary 30/1 is red on `main` too** ("renderExploreQuranLevel()'s Approach-mode wedge … NO Word-by-Word overlay branch" — pre-existing, to investigate). With the Owner: publishing the Basic/Depth Rules; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.43 on `main`** (2 Oct 2026 — **Al-Fātiḥah count part 2 (My Status totals, Explore badges, search chips), and a ⌂ Home button on the Surah list.** (1) #488 → PR #489 (Builder), the follow-up to the Owner's *"Make sure the affect of this change occurs where it should be"* (decision 55): with the setting on, `summarizeApproachAyahCoverage()` counts surah 1 through `displayCount()` (internal 1:1 excluded, internal 1:7 twice; the whole-Qur'an total stays 6,236; the My Status cache key carries the setting); Explore's numbered sidebar badges read none for the Bismillah, 1–5, "6–7" (the ring keeps one segment per internal āyah, both halves sharing 1:7's one status); search chips read "1:6–7" and "Bismillah". Left as recorded in the PR: `summarizeStatuses`, `monitor.html`'s report. (2) Owner, a phone photo of Read → Surah list: *"Enable a way to move to home ( page landing) from here."* `#readContentsHomeBtn` ("⌂ Home", bn হোম, 40px) sits beside the ✕ in the list's header; it closes the list and calls `openApproachWheel()`. The Owner's guide for publishing the Basic/Depth Rules is `docs/governance/2026-10-02-lemma-levels-owner-publish-guide.md`. Checks: read-list-home-browser 30/0 (new; 320/390/1280 × en/bn; from the Read view via ☰; a Home that only closes the list fails 6), fatiha-count-browser 136/0 (Builder mutations 1:7 counted once fails 4, Bismillah numbered fails 8; Architect mutation: search chip back to internal fails 4), quran-my-status 248/0, unit-rings 106/0, approach-sections 59/0, read-list-button 72/0, read-contents 250/0, read-quick-buttons 204/0, boot-status 24/0, landing-drawers 274/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS). In progress: #490 Basic/Depth counting per level behind a readiness gate (Builder). With the Owner: publishing the Basic/Depth Rules (guide above); the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.42 on `main`** (2 Oct 2026 — **Never a blank landing page; WbW Achieved counts the same word only again (decision 58).** (1) Owner, a phone photo of the landing page showing only the header and "Home": *"This is the landing page, just blank."* Reproduced in the harness with a slow database (latencyMs 6000: header + Home only for ~8 s; the same in v09.32, so not a regression) and found two more ways to the same picture: signed out (the Sign in button lives inside the Home menu) and a failed start-up step (its error was written only inside the Home menu, an I15 gap). New `#bootStatus` under the menu, driven by `setBootStatus()`: "Loading your study…" from first paint; after 12 s "Still loading… The internet connection is slow, or the database is not answering yet." with Reload; signed out → "You are signed out." with Sign in on the page; no membership → its own line; a failed step → "The app could not finish loading: <step> — <error>" with Reload; hidden the moment `#app` shows (bn throughout). (2) Owner: *"We have 3 level of Language Learnig from WbW … Level 1, WbW … count only similar words/ form … Level 2, Basic … same root with same meaning … Level 3, Depth … all words originated from that root irrespective of its meaning"*; asked, they chose **one "You know" line per level** and **"Yes, prepare them"** for the Rules. Decision 58 corrects 56: `lemmaViewWithGroup()` now spreads only from a BASIC lemma-wide claim (`MEANING_GROUP_LEVEL = "basic"`, `meaningGroupsLive()` false while `IMPLEMENTED_ARABIC_LEVELS` is `["wbw"]`), so WbW marks the same lemma only and the groups file is not fetched. The Rules candidate for Basic/Depth lemma-wide claims and counters is on `main`, **not published**: `docs/governance/2026-10-02-lemma-levels-DEPLOYMENT-candidate.rules` (live Rules with the two `level == 'wbw'` lines widened to `in ['wbw','basic','depth']`), proven by `npm run lemma-levels` in `tools/firestore-emulator` (each denial paired with an allow one fact apart; against the live Rules the new levels are refused; a mutant accepting any level fails). Checks: boot-status-browser 24/0 (new: normal start at 320/390/1280, slow, signed out, failed step, en/bn; removing the three calls fails 14), known-meaning-groups 66/0 and known-word-marks 122/0 (updated in place for decision 58; a WbW spread fails 16 and 4), landing-drawers 274/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, quran-lemma-progress-rendered 76/0, quran-word-levels 41/0, quran-ayah-action-sheet 144/0, fatiha-count 112/0, word-card-dictionary 277/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS). In progress: PR #489 Al-Fātiḥah count part 2 (review); #490 Basic/Depth counting per level, behind a readiness gate (next Builder round). With the Owner: publishing the Basic/Depth Rules; the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.41 on `main`** (2 Oct 2026 — **A word of the same root AND the same meaning now counts as known: ar-Raḥmān marks ar-Raḥīm.** Owner: *"When Ar-Rahman is achieved, that should mark 'Raheem as well, because of same root"*, then *"As long as words gets same meaning even though they are in different forms, they should count as known. Any words got different meaning, even though from same root, won't be counted"* (decision 56, replacing decision 52's lemma-only rule; #484 → PR #487, Builder). `app/js/lemma-meaning-groups.js` (new) fetches `tools/quran-data-pull/output/lemma-meaning-groups.json` (869 hand-reviewed groups, 2,715 lemmas) on first use only, never on the landing page; `lemmaViewWithGroup()` in `quranrevival.html` makes a lemma count as known when any lemma in its group does, through the same `countsAsKnown` (a claim awaiting a teacher spreads to nobody) — used by the Mushaf/WbW known marks, the Word card's "N of M known in this āyah", Explore and the Āyah card chips. The Word card adds "Known through ٱلرَّحْمَٰن (same meaning)" (bn). Nothing is written for group-mates; no Rules change. **The stored whole-Qur'an total (`quranWordTotals`) still counts own-lemma words only** — including group-mates exactly needs a one-off recount of each person's stored total, put to the Owner. Checks: known-meaning-groups-browser 66/0 (Builder mutations: no group 50/16, whole root 62/4, pending spreads 64/2; Architect mutation: `sameMeaningLemmas()` returning only the lemma fails 16 here and 4 in known-word-marks), known-word-marks 122/0 (two checks updated in place for decision 56: ar-Raḥmān now also marks 1:1:4 and 1:3:2; 5 → 7 marks), fatiha-count-browser 112/0, quran-lemma-progress-rendered 76/0, quran-word-levels-rendered 41/0, quran-ayah-action-sheet 144/0, word-card-dictionary 277/0, global-approach-card 109/0, palette-contrast 20/0, phone-width-overflow 217/0, stub-parity 4/0, quran-word-card-rendered 134/2 (TLS), behaviour 1007/1 (31e TLS). In progress: #488 Al-Fātiḥah count part 2 (Builder). With the Owner: whether to recount the stored total once (A) or leave it (B); the two permission letters; the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.40 on `main`** (2 Oct 2026 — **Al-Fātiḥah's optional count: the Bismillah unnumbered, ٱلْحَمْدُ as āyah 1, āyah 7 starting at غَيْرِ — display only, on by default.** Owner: *"make Al Hamdulillah Ayah as Ayah no. 1, Ayah no. 7 should be from 'Gairul…'"*, then *"A, If user can switch the setting … Keep that option"* and *"split is right, default on, go"* (decision 55, #482 → PR #486, Builder). `app/js/fatiha-count.js` (new, pure, imports nothing) maps internal 1:1 → unnumbered, 1:2–1:6 → 1–5, 1:7 words 1–4 → 6 and 5–9 → 7, word references, Go to and the totals (1:1 excluded, 1:7 counting for 6 and 7, total 7); a per-device setting (`mm_fatiha_bismillah_unnumbered`, default on) in Study options re-renders live. Mushaf page 1 (`hifz-renderer.js`): the marker after 1:1 hidden, ①–⑤ reassigned, a new ⑥ after word 1:7:4 (read from `FATIHA_SPLIT_AFTER_WORD` since Architect review, which made the page and the Read view one decision), ⑦ kept. Read/Note views split internal 1:7 in two with the Owner's translation halves; picker labels Bismillah, 1–5, "6–7" over internal values. **No stored key changes** (records, notes, bookmarks, occurrence ids, audio, Rules). Checks: fatiha-count 35/0, fatiha-count-browser 112/0 (Architect mutation: moving the split one word fails 16, 4 of them on the Mushaf page), read-contents 250/0, read-quick-buttons 204/0, mushaf-no-sideways-overflow 648/0, known-word-marks 122/0, word-card-dictionary 277/0, global-approach-card 109/0, unit-card 116/0, bookmark-open 38/0, read-list-button 72/0, quran-ayah-action-sheet 144/0, quran-lemma-progress-rendered 76/0, quran-word-card-rendered 134/2 (TLS), phone-width-overflow 217/0, stub-parity 4/0, behaviour 1007/1 (31e TLS). Not yet following the count: My Status roll-up totals, the Explore wheel's per-āyah numbers, search-result chips (follow-up). In progress: #484 same-meaning known words (Builder). With the Owner: the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.39 on `main`** (2 Oct 2026 — **A long tagline scrolls sideways, with an on/off switch and a speed setting.** Owner: *"Enable the individual tag line scrolling, with on and off setting and allow me to set the speed change"* (#479 → PR #480, Builder). `app/js/tagline-scroll.js` (new, shared by the landing strip and the taglines.html preview): a line wider than the strip shows its start for 1.5 s, slides left at `15 + speed × 12` px/s until its end is in view, holds 1.5 s and repeats (Web Animations transform on an inner `.tagline-track`; a line that fits is untouched). `taglineSettingsFrom()` reads `scroll` (missing/junk = on) and `scrollSpeed` (1–10, else 4) off the tenant's `taglineSettings` (the tenant `allow update` has no field list, so no Rules change). A pending line change waits for the end of the first pass; Pause while held pauses the slide (Architect probe: transform frozen while held, moving again on release, en and bn); reduced motion keeps today's ellipsis with the full text in `title`. taglines.html (owner/prime, from the menu): "Scroll long lines" and a "Scroll speed" 1–10 slider (Slow / Medium / Fast · n), the preview following the slider live. Checks: tagline-scroll-browser 67/0 (Architect mutation: removing the wait-for-the-pass fails 2; the Builder's two mutations fail 1 and 5), landing-drawers 274/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS). In progress: PR #486 the optional Al-Fātiḥah count (review); #484 same-meaning known words (Builder). With the Owner: the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.38 on `main`** (2 Oct 2026 — **The Word card says "You know …" in a bold, eye-catching box; the Āyah card opens on Status of this āyah; the same-meaning root groups are in the repository.** Owner, two phone photos. (1) *"Make these eye-catching, bold, make the wordings, 'You know ... of .... words of the Quran'"* (decision 57): `wholeQuranKnownLines()` in `quran-word-card.js` wraps the two lines in `.word-progress-whole-quran-box` (gold/navy left edge, inset background, bold 700), the three numbers in `.word-progress-whole-quran-num` (1.22rem, 800, the card's accent colour); "You know 21,467 of 77,429 words of the Qur'an" / "You know 27.72% of the words of the Qur'an" (bn আপনি কুরআনের … জানেন); a supervisor viewing someone else reads "Knows …". (2) *"Take this to the top"*: `renderAyahActionSheetHtml()` puts `[data-ayah-sheet-status]` straight under the header, before the actions; the dividing line moves below it. (3) Decision 56 (same root AND same meaning counts as known, replacing decision 52's lemma-only rule): `tools/dictionary-pull/meaning-groups-reviewed.json` (930 roots, every one reviewed by hand, kept apart when unsure) builds `tools/quran-data-pull/output/lemma-meaning-groups.json` (869 groups, 2,715 lemmas) with `build_meaning_groups.py`; **not yet wired** — that is #484. Checks: quran-lemma-progress-rendered 76/0 (four new checks × 4: the wording hand-written in en and bn, both lines bold and the numbers bigger/heavier in a different colour; the old wording and plain numbers fail 12), quran-ayah-action-sheet-browser 144/0 (three new checks × 8: under the header, above Play, the heading in view on opening; the old order fails 24), quran-word-levels-rendered 41/0, quran-word-card-rendered 134/2 (TLS), ayah-action-sheet-boundary 54/0, global-approach-card 109/0, palette-contrast 20/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1007/1 (31e TLS). In progress: #482 the optional Al-Fātiḥah count (Builder); #484 same-meaning known words (next); PR #480 tagline scrolling (review). With the Owner: the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.37 on `main`** (2 Oct 2026 — **On a PC the capsule bar no longer cuts the wheel's bottom numbers, at any wheel size.** Owner, PC screenshot: *"In pc, the numbers gets cut. Fix it."* The wheel's outer numbers overhang its SVG by about 3.2% of the wheel's width, so a fixed gap that cleared them on a 360px wheel cut them once the wheel was maximised and resized large (reproduced: -7.5px at 760px). From 721px up `#wheelContainer` takes `padding-bottom: max(0px, calc(3.2% - 2px))` — a percentage of the wheel's own width, so the gap scales with it: 14.4–14.8px between the lowest number and the bar at 360, 560 and 760px. The phone rule (v09.32) is untouched. Checks: landing-drawers-browser 274/0 (new PC maximised checks at 360/560/760; removing the rule fails 3, reproducing the cut), phone-width-overflow 217/0, unit-rings 106/0, approach-sections 59/0, quran-my-status 248/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS). In progress: #479 tagline scrolling (Builder, PR #480, in review); #482 the optional Al-Fātiḥah count (Builder). With the Owner: the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.36 on `main`** (2 Oct 2026 — **A ☰ Surah list button takes the Read view back to the list it was opened from.** Owner: *"Read>Surah List>Surah>Read View. What's the way from read view to Surah list? Make one."*; demo approved: *"the ☰ Surah list button at the top left. go"*. `#readListBtn` leads `#readBar` (`order:-1; margin-right:auto`), shown only on the Read → list route (`body.read-from-contents`, set in `openReadContentsRow()`), full screen or not (exempted from the bare-state hide rule); same face as the ⤢ button (36px, gold border); "☰ Surah list" / bn "সূরার তালিকা", the ☰ alone below 360px with the words kept as its aria-label. Pressing it calls `openReadContents()`, which reopens on the tab last used. New suite read-list-button-browser 72/0 (320/390/1280 × en/bn: absent on another route; top left of the bar; 36px; clear of ⤢ and the page reference; reopens on Surah then on Juz after a juz; picking Al-Mulk opens surah 67; a press that opens nothing fails by name — removing the wiring fails 6). behaviour 1007/1 (31e TLS; the Read-bar inventory checks 30j, 30l, 33a, 37a updated in place to name the button), read-quick-buttons 204/0, read-contents 250/0, mushaf-no-sideways-overflow 648/0, phone-width-overflow 217/0, global-approach-card 109/0, stub-parity 4/0. In progress: #479 tagline scrolling (Builder); the PC wheel's bottom numbers under the capsule bar when the wheel is resized large (Architect). With the Owner: the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.35 on `main`** (2 Oct 2026 — **Record Your Progress wears the wheel's legend colours; the Approach pull-down drops "· Not started"; the Read quick-row Track button is named Record.** Owner, two phone photos. (1) *"Make the color of selected progress as the color of legend in wheel."* The pressed stage button takes its colour from `STATUS_COLORS` in `mastery-wheel.js` — the table the wheel and its legend paint from, so they cannot drift — through `stageColourStyle()` in `ayah-action-sheet.js` (`--stage-bg/--stage-edge/--stage-fg`), with the text that reads on it: white on Not started (10.5:1), Learning (5.0:1) and N/A (the legend's stripe); dark on Practising (7.4:1), Achieved (4.7:1), Mastered (6.4:1). (2) *"written 'Not Started' with approaches names, why? Fix."* `buildCardApproachOptionsHtml()` writes only real progress after a name. (3) *"Track (pls name it as Record)"*: `#readQuickTrackBtn` reads Record (bn লিপিবদ্ধ করুন). Checks: global-approach-card 109/0 (new section 6 — each stage's legend colour hand-written and its contrast; the option text before and after each stage; removing the colour rule fails 5, writing "Not started" again fails 5), read-quick-buttons 204/0 (updated in place), ayah-action-sheet-boundary 54/0, mushaf-approach-cards 114/0, quran-ayah-action-sheet 120/0, unit-card 116/0, palette-contrast 20/0, phone-width-overflow 217/0, read-contents 250/0, stub-parity 4/0, behaviour 1007/1 (31e TLS). With the Owner: the ☰ Surah list button demo (top left of the Read view), the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.34 on `main`** (2 Oct 2026 — **The Word card's Arabic in Depth tab opens with a 📖 Dictionary box.** Decision 54 (Owner, 1–2 Oct: "yes to all three, demo me", then "go, and change God/Lord to Allah/Rabb always"). Built by the Builder (#476, run 743, PR #477) on the data the Architect put on `main` in PR #475 (`tools/quran-data-pull/output/lemma-dictionary-en.json`: 3,520 lemmas — 2,909 sure and 608 likely Wiktionary matches, CC BY-SA 4.0 adapted, plus 3 fixed meanings ٱللَّه → Allah, رَبّ → Rabb (Sustainer, Master), إِلَٰه → god (deity); every "God" → Allah and "Lord" → Rabb, lower-case false "gods" kept). The box: the dictionary meaning (`lang="en"`, with a "likely match" or "fixed by us" pill), the word's own word-by-word meaning, on a Bangla page a line that the Bangla dictionary meaning waits on permission, two ≥40px links — Quranic Corpus (`qurandictionary.jsp?q=<Buckwalter root>`, new pure `app/js/buckwalter.js`) and Lane · Hans Wehr (`ejtaal.net/aa/#q=<root>`), none for a rootless word — and the credit line. `app/js/lemma-dictionary.js` fetches the file on first Depth draw only (I9) and matches keys in Unicode NFC with a fixed entry winning a collision: **the Qur'an data orders ٱللَّه's shadda and fatha the other way round from the dictionary key, so an exact lookup would have shown "likely match" for لِلَّهِ** — found by the Builder. The old semantic-range / dictionary-URL wiring was removed (grep'd first). Architect review: word-card-dictionary 277/0 (hand-written expectations; no request before Depth, exactly one after; the Builder's two mutations; the Architect's own — dropping the fixed-entry precedence — fails 16), quran-word-card 37/0, known-word-marks 122/0, achieved-mirror 73/0, read-contents 250/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, quran-word-card-rendered 134/2 (TLS), behaviour 1004/4 (22g×3 archive.org, 31e TLS); screenshots looked at in Light, Night and Bangla. With the Owner: the two permission letters (Bangla dictionary meanings stay off until AQS agrees), the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.33 on `main`** (2 Oct 2026 — **Known words carry a very light background mark on the Mushaf page and in Word by Word.** Owner: *"Can you mark the words known by placing a background mark on a word, very light … Knowing one word would make all the words and derivates of it known."* Decision 52: **"A, on both Mushaf page and WbW"** — the same dictionary word (lemma), never the root family. Built by the Builder (#472, run 738, PR #473): after Read/Note render, every on-screen `.hifz-word`, `.wbw-word-clickable` and `.ayah-word-clickable` whose occurrence counts as known (known itself, or its lemma known — the existing `effectiveViewsForScope()` / `countsAsKnown`) gets `is-known-word`, a background-only tint (`rgba(46,125,50,.13)`, Night `rgba(129,199,132,.16)`); a claim still awaiting a teacher's confirmation is not marked; a request counter stops a slow read painting after the reader moves on; marks refresh after a Word-card claim and after a person switch; "known" joins the accessible name. **A real latent bug fixed on the way**: `setWordState`/`decideWordApproval` in `quran-word-progress-data.js` patched a throwaway Map when the āyah had no lane document yet, so a first claim after a surah-wide read never showed on the Word card. Architect review: known-word-marks 122/0 (hand-written expected ids; the Builder's two mutations fail 52 and 44; the Architect's own — treating a pending claim as known — fails the p2 check in both languages), quran-word-card-achieved-mirror 73/0, quran-lemma-progress-rendered 60/0, read-contents 250/0, landing-drawers 271/0, phone-width-overflow 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS), quran-word-card-rendered 134/2 (TLS), quran-word-progress-rendered 76/5 (3 TLS + "opening a word reads both lanes and no more" en/bn, **identical on `main`**, pre-existing: an extra quranWordTotals read and the lanes read twice). With the Owner: three dictionary choices, the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.32 on `main`** (2 Oct 2026 — **A more elegant landing page on a phone, from an Owner photo and an approved demo.** *"Make the landing page look more elegant …"* — the heading line is larger with more air, "Mastery Wheel" at weight 500 and the Approach title bold (700); the wheel's top numbers sit well inside the dark card (20–50px on phones, from ~5px) and the Read · Choose a Unit · Know Your Status bar 18–28px below the lowest number (from ~12px); Wheel and Unit sit at the extreme edges (6px). **The first screen ends at the dock**, so the Approach list and its Open all button start just below the fold: `fitLandingFirstScreen()` sets the wheel column's `--landing-col-min` from measured positions (the group centred in it) and, when a tall header leaves too little room, caps the wheel with `--landing-wheel-max` so the drawer row stays above the dock — judged with the drawers closed and recomputed from scratch, observed on `border-box` so header growth is seen. Owner approved the demo ("go"). Checks updated in place: landing-drawers 271/0 (new: first screen ends at the dock; the squeeze case; removing the fill fails 10, removing the shrink fails the squeeze check), phone-width-overflow 217/0, read-contents 250/0, unit-rings 106/0, approach-sections 59/0, quran-my-status 248/0, palette-contrast 20/0, study-presets 84/0, stub-parity 4/0, account-card 1235/0, behaviour 1007/1 (31e TLS). Also: dictionary source coverage measured (`docs/reports/2026-10-02-dictionary-source-coverage.md`, scripts in `tools/dictionary-pull/`), letters file gains contact routes. In review: #472 known-word marks (PR #473). With the Owner: three dictionary choices, the two permission letters, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.31 on `main`** (1 Oct 2026 — **Record Your Progress gains N/A and, for anyone who is not a student account, Mastered; the landing capsule bar no longer cuts the wheel's bottom numbers.** Owner, two phone photos. (1) Read view → Track: *"Record has N/A tab missing. Fix. Also 'Mastered' should appear for the user, the note about Mastered availability criteria should only appear to a student account."* `approachStageIdsFor(canConfirm)` in `app/js/ayah-action-sheet.js`: the four stages, then Mastered (only when `canConfirm`), then Not Applicable (always; I7 keeps it out of totals); "Mastered is confirmed by a teacher." only when not `canConfirm`. `viewerCanConfirmProgress()` in quranrevival.html reads `currentPreview().effRoles` (owner/prime/teacher/guardian, or no student role), so "View as Student" shows the student card; threaded into the Page, Ayah and Unit cards. Markup only: `claimStatus()` already accepts all six statuses and decides confirmation itself. (2) Landing: *"The capsule cut the numbers at the bottom. Fix. Keep a elegantly looking distance."* The bottom numbers overhung the bar by 6.7–10.4px at 320–720; `#wheelContainer` gains a phone-only `padding-bottom` of ~3.2% of the wheel plus 9px, measured 12.2–12.6px clear at every phone width (768/1280 unchanged). The Wheel · Legend · Unit drawer buttons now sit at the left and right edges with Legend centred (*"Place those wheel buttons as marked up"*). Checks updated in place: global-approach-card 97/0 (a new student section; forcing `viewerCanConfirmProgress()` true fails all 6), ayah-action-sheet-boundary 54/0, mushaf-approach-cards 114/0, quran-ayah-action-sheet 120/0, landing-drawers 264/0 (bottom gap and edge placement; removing the fix fails 12), unit-card 116/0, study-presets 84/0, palette-contrast 20/0, approach-sections 59/0, quran-my-status 248/0, unit-rings 106/0, read-contents 250/0, stub-parity 4/0, phone-width-overflow 217/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS). With the Owner: the two permission letters, known-word highlighting (same lemma vs whole root; where), the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.30 on `main`** (1 Oct 2026 — **A bookmark opens straight where it was made.** Owner: *"When I click on a bookmark to open, it shows a few screen … A bookmark should open straight where the bookmark was originally created."* Built by the Builder (#468, run 731; PR #470 opened by the Architect). A classic script before first paint puts `html.bm-opening` on any `?bookmark=` / `?goto=` / `?resume=` link: `#app`, `#topNav` and the tagline are `visibility: hidden` (still laid out, so the wheel measuring code works) under a plain "Opening your bookmark…" cover, removed in one step once the target is open, with a 10-second safety net and a translated "That bookmark could not be found." on the landing page when it cannot open. `captureQuranBookmarkSettings()` now records `settings.view` (read / note / landing / study) and `applyQuranBookmarkSettings()` honours it; an older bookmark with no `view` opens the Note view exactly as before. Architect review: a 150ms filmstrip at `latencyMs: 250` was looked at frame by frame (cover → Read view at 3:10, nothing between). bookmark-open-browser 38/0 (every animation frame sampled; two mutations each fail their check), landing-drawers 252/0, study-presets 84/0, read-contents 250/0, phone-width-overflow 217/0, stub-parity 4/0, behaviour 1007/1 (31e TLS; 22g passed this run, intermittent). Next: the Owner's Read-view Track panel (N/A missing; Mastered for anyone who is not a student account) and the landing capsule bar cutting the wheel's bottom numbers, with the drawer buttons spread to the edges.)

**Previous milestone: v09.29 on `main`** (1 Oct 2026 — **Landing drawers (decision 51), and the phone wheel's top numbers are no longer cut.** Owner, from a phone: three drawer buttons above the Approach bar — **Wheel** (left: the Dark/Light/… look switch), **Legend** (middle: the status key, Not applicable …) and **Unit** (right: what the wheel shows) — one open at a time, the Read bar above them. Built by the Builder (#465, PR #467): `#wheelDrawerRow` buttons `[data-wheel-drawer]`, `#wheelDrawerPanels` holding the moved `#wheelLookSwitch`, `#wheelLegendContainer` and `#wheelShowSwitch`, bn "Legend" = "সংকেত". **Architect's review fix:** with the REAL 30-Approach catalogue (a 40-number wheel) the top numbers overhung the dark card by 2–6px at phone widths, and the Builder's check had passed because the default fixture has only 10 Approaches and measured against the heading. The phone wheel now moves down just enough (`padding-top` ≈ 3.2% of the wheel width, ≤720px only; 768 and 1280 unchanged): measured 4.5–5.1px clearance at 320–720. `landing-drawers-browser` now seeds the real catalogue (positive control: 40 numbers) and measures against the card's top; removing the padding fails 6 of 6. landing-drawers 252/0, read-contents 250/0, unit-rings 106/0, approach-sections 59/0, quran-my-status 248/0, palette-contrast 20/0, phone-width-overflow 217/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS), approach-short-names 69/1 (pre-existing on `main`). In progress: #468 bookmarks opening straight where they were made (PR #470, in review). With the Owner: known-word highlighting (same lemma vs whole root; where the light mark goes), the dictionary-source decisions, the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.28 on `main`** (1 Oct 2026 — **The save-failed notice can be closed and names the save that failed.** Owner, from a phone: *"What's this shows up at the bottom?"* — the pink write-failure banner (`app/js/errors.js`, I15) had no way to close it and did not say which save failed. It now carries a 44px ✕ and a short `Ref:` line (the save's `what`, or `collection/action`, plus the error code), left untranslated on purpose as a diagnostic, like the code; the translated sentence is unchanged. Investigation of the Owner's report (a refused save after pressing Achieved on the Word card): the round 7 publish removed nothing (`firestore.rules` contains every line of the previously published file plus round 7), and a one-off emulator probe running the real `setWordState`, `recordStudyEvidence(wbwEngagementArgs)` and `recordWordTotalDelta` against the live file accepted all of them (lemma mirroring is already covered by `lemma-progress-real-function`); not reproduced, so the Ref line is what will name it next time. study-presets 84/0 (three new checks; removing the close listener fails "pressing ✕ closes the banner"), behaviour 1004/4 (22g×3 archive.org, 31e TLS; 16a/16b pass). In progress with the Builder: #465 landing drawers (decision 51) and #468 bookmarks opening straight where they were made (no landing flashes; `settings.view` recorded and honoured). With the Owner: the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.27 on `main`** (1 Oct 2026 — **Sections, folder colour and bold, and Tags are SWITCHED ON**: the Owner published the round 7 Rules (*"Round 7 rules are live."*). `firestore.rules` synced to `docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules` (commit tag `[already-deployed-manually]`); `app/js/siyagah-sections-readiness.js` declares `ready: true` (master-architect, 2026-10-01, reference `docs/reports/2026-10-01-siyagah-round7-enabled.md`). One gate serves round 7a (sections, folder colour/bold, v09.25) and round 7b (Tags, v09.26). Updated in place: `journey-sections-browser` and `journey-tags-browser` gate-off cases now route a closed copy of the readiness module (so "shows, explains itself, writes nothing" stays tested); `siyagah-round7.rules.test.mjs`'s live-lines check accepts the published state (candidate identical to `firestore.rules`). Checks against the live file: rules-authorisation-executable 56/0, journey-sections 349/0, journey-tags 363/0, every journey-* suite and notes-note-windows green, account-card 1235/0, phone-width 217/0, palette-contrast 20/0, stub-parity 4/0, brief-integrity 9/0; emulator with RULES_FILE=firestore.rules: siyagah-round7 75/75, siyagah-sections-real-function 21/0, siyagah-tags-real-function 25/0, journey-map-real-function and note-foundation-real-function green. Pending with the Owner: the landing-page drawers demo (https://claude.ai/artifact/1dXrKwibEP1TUGARu892Fn: wheel moved down, Read bar, then Wheel · Legend · Unit drawer buttons above the Approach bar); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.26 on `main`** (1 Oct 2026 — **Tags on Notes, built and SWITCHED OFF until the Owner publishes the round 7 Rules** (Siyagah port round 7b; Owner decision 42.5, Tags only, never Note Types; #461 → PR #462, Builder run 723, PR opened by the Architect). Behind the same gate as round 7a, `app/js/siyagah-sections-readiness.js` (`ready: false`): every Tag control shows and says *"Tags switch on once the new Firebase Rules are published."* and writes nothing. When on: the Note view (`note-window.js`, so the pane and every pop-up window on Mapping My Journey AND the Notes page) shows tag chips (colour dot + 🏷 name) on the Details line, and ⋯ → 🏷 Tags… opens a picker (tick boxes, search, ＋ New tag); the tray gets a Tags block below the folders (counts; tap a tag to list its Notes; ⋯ Rename · 🎨 Colour · Delete → Trash) and Trash lists retired tags with Restore. Writers in `note-foundation.js`: `createNoteTag` (case-insensitive duplicate refused), `renameNoteTag`, `setNoteTagLook`, `setNoteTagStatus`, `tagNote` (restores the existing retired link for that Note+tag, never a second link), `untagNote` (retires), equality-only `listNoteTagsForOwnerPage`/`listNoteTagLinksForOwnerPage`. Tagging never touches the Note document and never makes a revision, so no Journaling evidence. Architect review: mutation "re-tag creates a new link" fails 12 checks (restore + still-active-after-trash, every width, both languages); screenshots at 390 bn and 1280 en looked at. journey-tags 363/0, journey-sections 349/0, rules-authorisation-executable 56/0 (tags cross-checked both ways), every journey-* suite green, notes-note-windows 218/0, account-card 1235/0, phone-width 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS); emulator siyagah-round7 75/75, siyagah-sections-real-function 21/0, siyagah-tags-real-function 25/0, journey-map-real-function and note-foundation-real-function green against the candidate. The Siyagah seven-round port is complete in code; sections, colours and Tags switch on when the Owner publishes `docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules` and the Architect syncs `firestore.rules` and flips the gate. With the Owner: publish the round 7 Rules; the Wheel drawer (standby); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.25 on `main`** (1 Oct 2026 — **Sections and folder colour + bold in the Mapping My Journey tray, built and SWITCHED OFF until the Owner publishes the round 7 Rules** (Siyagah port round 7a; Owner decisions M2, M3; #458 → PR #460, Builder run 719, PR opened by the Architect). Behind `app/js/siyagah-sections-readiness.js` (`ready: false`, imports nothing, authorities `["master-architect"]`): every control shows and says *"Sections and folder colours switch on once the new Firebase Rules are published."* and writes nothing. When on: ＋ Section; collapsible section headers (expand state per device); section ⋯ (Rename, 🎨 Colour and bold, Move up/down, Delete → Trash, which returns its folders to the unnamed block in the same commit); folder ⋯ gains 🎨 Colour and bold (swatches ≥40px + None + Bold) and Move to section ▶ (root user folders only); rows show a colour dot and bold; Trash lists retired sections with Restore; dropping a root folder on a section header files it. Nesting a folder clears its `sectionId` in the same write; lifting one to the top gives it its root's section. New writers in `note-foundation.js` (`createNoteSection`, `renameNoteSection`, `reorderNoteSection`, `setNoteSectionLook`, `setNoteSectionStatus`, `commitSectionBatch`, `setNoteFolderLook`, `setNoteFolderSection`, equality-only `listNoteSectionsForOwnerPage`) and wrappers in `journey-map-service.js`. The Rules candidate is `docs/governance/2026-10-01-siyagah-round7-DEPLOYMENT-candidate.rules` (PR #457, NOT published); when the Owner says it is live: sync `firestore.rules`, flip the gate with a dated reference. Architect review: (1) **Bold was invisible** — plain names were weight 600, which most fonts already draw bold (measured 600 == 800 in the test browser); plain names are 500 now, and a new check draws the bold name at the plain weight and requires a visible width difference (mutant 600 fails 6/6). (2) New emulator suite `siyagah-sections-real-function` drives the real writers against the candidate: 21/0, and refused at the first write by today's live Rules, which is why the gate stays off. journey-sections 349/0, rules-authorisation-executable 49/0 (round 7 candidate cross-checked both ways), every journey-* suite green, notes-note-windows 218/0, account-card 1235/0, phone-width 217/0, palette-contrast 20/0, stub-parity 4/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS), emulator siyagah-round7 75/75 and journey-map-real-function + note-foundation-real-function green against the candidate. Next: round 7b, Tags. With the Owner: publish the round 7 Rules; the Wheel drawer (standby); the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.24 on `main`** (1 Oct 2026 — **Single and Multi pop-up windows for a Note on the Notes page** (Siyagah port round 6b; Owner decisions 42.4, M3; #454 → PR #456, Builder run 715). The Note view and its windows moved out of `journey-map.html` into ONE shared module, `app/js/note-window.js` (`createNoteViews`), used by Mapping My Journey and `notes.html` alike; it imports no Firebase and no data layer, and each page supplies how a revision is written (`revise`): Mapping My Journey through `updatePermanentNoteContent`, the Notes page through `reviseStudyNote`, so Journaling evidence is still recorded and the page says so in words. Notes page: every active Note card has ⧉ Open in window (and Ctrl/⌘-click its title); the inline edit form has ⧉ Pop out (writes a typed change first, one revision only if something changed); Edit on a Note open in a window focuses the window and the reverse (never two editors); ⋯ in a window offers 🗑 Delete, which retires through `retireStudyNote` after flushing a pending edit. Same tiers, sheet, switcher, drag, handles and autosave as 6a; geometry key `mmsa-notes-note-window`. Shared CSS `app/css/note-window.css`. Architect review: a mutation removing the Journaling evidence call fails 12 checks (evidence document and the page's words, every width in both languages). notes-note-windows 218/0, journey-note-windows 254/0, journey-note-edit 208/0, journey-note-pane 321/0, journey-tray 227/0, journey-folder-menus 144/0, every journey-map suite green (journey-map-screen 46/0, its sanitize-pairing check updated in place to scan the shared module), study-note-service 35/0, note-journal-evidence 18/0, account-card 1235/0, phone-width 217/0, palette-contrast 20/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS), emulator journey-map-real-function and note-foundation-real-function green. Next: Siyagah round 7 (sections, folder colour and bold, Tags only), which needs a Rules change the Owner publishes. With the Owner: the Wheel drawer (standby), the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.23 on `main`** (1 Oct 2026 — **Single and Multi pop-up windows for a Note in Mapping My Journey** (Siyagah port round 6a; Owner decisions 42.4, M3; #452 → PR #453, Builder run 711). The Note pane's code is now one view implementation (`makeView`: each view owns its element, Note, ‹ › order and edit session), so the pane and every window share edit/autosave/menus/folding/Contents/chips. **Single**: ⋯ → ⧉ Pop out (flushes a pending edit first, closes the pane, opens the window). **Multi**: a Note row's ▾ → ⧉ Open in window, or Ctrl/⌘-click a title; several windows, each offset 28px; a click raises one; opening an already-open Note focuses it (never two editors); ‹ › skips Notes open elsewhere. **By width** (`windowTier`, the document's width): below 640px a near-full-screen sheet with a bottom switcher (40px targets) when two or more are open; from 640px a draggable window with eight handles, min 320×360, the title bar never leaves the screen, geometry per device in `localStorage` (`mmsa-journey-note-window`). New shared helper `app/js/float-window.js` (drag/resize/clamp/handle CSS) used by the tray too (tray behaviour unchanged). Header: title bar (title, ✕ 44px), the pane's header row, one Details line (date + folder chips, closed to one line), the formatting row while editing; ⋯ sits on the header row (recorded deviation). Architect review: the closed Details line no longer shows half a folder chip; one check added, mutation-proven. journey-note-windows 254/0 (Builder's mutations: no already-open guard; no flush on pop-out), journey-note-edit 208/0, journey-note-pane 321/0, journey-tray 227/0, every journey-map suite green, account-card 1235/0, phone-width 217/0, palette-contrast 20/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS), emulator journey-map-real-function and note-foundation-real-function green, governance 8/8. Next: round 6b (#454), the same windows on the Notes page, writing through `reviseStudyNote`. With the Owner: the Wheel drawer (standby), the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.22 on `main`** (1 Oct 2026 — **Explore's Approach list readable in the Night card look** (Owner report; built by the Architect). In the Night look the "Track the Status of Approaches" palette is dark, but its rows kept the light card's `#222` (measured **1.1:1**), Choose a Unit's labels `#555` (2.35:1), and the section headings `#8a7b52` sat at 4.2:1 in both looks. `card-look.css` now gives the night palette's `.explore-approach-opt` (rows, hover, selected), `.explore-approach-group` and `.wheel-unit-row label` the card's own colours, and the headings are `#75683f` on the light card (4.5:1+). New permanent suite `palette-contrast-browser` (20/0): every landing and Explore palette, opened with its real toggle in BOTH card looks at 390 and 1280, every text at 4.5:1 or better, with a positive control that the palette holds text; the old styles fail 6. card-look 96/0, explore-hizb-view 80/0, global-approach-card 89/0, approach-sections 59/0, read-contents 250/0, phone-width 217/0, behaviour 1007/1 (31e TLS), governance 8/8. In review: Siyagah round 6a (PR #453, Single and Multi Note windows) as v09.23; round 6b (#454, the same windows on the Notes page) next. With the Owner: the Wheel drawer (standby), the Asmaul Husna poster (on hold, decision 50).)

**Previous milestone: v09.21 on `main`** (1 Oct 2026 — **Edit a Note in the pane, with autosave** (Siyagah port round 5 of 7; Owner decision 42.3; #450 → PR #451, Builder run 708). ✏️ Edit / ✓ Done on the Note pane's header (own Notes only; the last thing to fold, into ⋯ with its word): a title field and a `contenteditable` holding the sanitised `bodyHtml` as stored (no read-mode `.note-sec` wrappers or fold arrows), toolbar Bold · Italic · H1–H3 · bullets · numbers · Undo (40px, folds into ⋯). **Autosave exactly as decided**: a local draft in `localStorage` (`qr.journeyNoteDraft.<noteId>`) ~1 s after typing; a revision through the existing `updatePermanentNoteContent` after 30 s idle and on every way out (Done, ← Back, ‹ ›, another Note, a folder chip, Delete — flushed first so the retire chains — `pagehide`, `visibilitychange`→hidden, and the tray's close, which posts a flush to its hidden page); only when title or body really changed; never before the Notes have loaded. A stale revision writes nothing, keeps the draft and says so; any other failure keeps the draft, says "Not saved yet — will try again" and retries. A newer local draft is offered back (Restore my unsaved text / Discard it). Status line: Saved on this device / Saved / Not saved yet. No new Firestore code, no Rules. Architect review: while editing, the header row (Done) and the toolbar stay pinned on screen (measured before: 48–67px and 200–245px above the screen); one check added, mutation-proven. Known edge, recorded: an emptied title cannot be saved (the data layer requires one) and shows "Not saved yet" until a title is typed. journey-note-edit 208/0 (Builder's mutations: no pagehide/visibility flush; no "only if changed"), journey-note-pane 321/0, journey-folder-menus 144/0, journey-tray 227/0, journey-map-screen 46/0 (one check updated in place), every journey-map suite green, account-card 1235/0, phone-width 217/0, behaviour 1007/1 (31e TLS), emulator journey-map-real-function and note-foundation-real-function green, governance 8/8. Owner decisions 48–50 recorded (poster on hold; Bukhari 6410 for now; Lord/God → Rabb/Allah always). Next: Siyagah round 6a (#452), Single and Multi pop-up windows; the Wheel drawer demo is with the Owner (https://claude.ai/artifact/EQAEavsgP1TFprRf8ZKQs4).)

**Previous milestone: v09.20 on `main`** (1 Oct 2026 — **A Note opens in read mode inside Mapping My Journey** (Siyagah port round 4 of 7; Owner decisions 41, 42.1, 42.4; #446 → PR #448, Builder run 705). A Note's title in Folders, Timeline or Path opens the **Note pane** in the same document (tray and full page): below 1200px it replaces the list and ← Back on its own toolbar row restores the list's scroll; from 1200px list and pane sit side by side. **One width function**, `noteLayoutTier()`, reads the DOCUMENT's width (the tray is an iframe). Header: one row, measure-then-fold (‹ › fold into ⋯ with words), ☰ Contents with 3+ headings below 1200px, ⋯ holds Copy to… / Move to… / **Delete** (→ `retirePermanentNote`, Trash, Restore works) and Open full page in the tray. Body: title, created / last-changed dates, folder chips (tap = that folder in the tree), sanitised body with H1–H4 as nested collapsible sections, collapsed state in `localStorage` (never Firestore). The old in-place preview is gone. Architect review: dates follow the reader's language (`dateLocale()`, Bangla digits in the pane, Timeline and Path), one check added (fails on the Builder's version), one Builder check updated in place. journey-note-pane 321/0 (Builder's mutations: preview-only title click, tier read from `screen.width`), journey-folder-menus 144/0, journey-tray 227/0, journey-map-screen 46/0, journey-map-path 32/0 (updated in place), journey-map-back 38/0, journey-map-boundary 19/0, the other journey-map suites green, account-card 1235/0, phone-width 217/0, behaviour 1007/1 (31e TLS), emulator journey-map-real-function and note-foundation-real-function green, governance 8/8. "Revision n" left out (not cheaply on the Note). Next: Siyagah round 5 (#450), edit with autosave (decision 42.3). The Asmaul Husna poster template demo is with the Owner (https://claude.ai/artifact/ToBqsf4h2f7ssYVgs5qzte).)

**Previous milestone: v09.19 on `main`** (1 Oct 2026 — **Mastery Wheel titles on one row, its action buttons on another; Record Your Progress always on the Āyah Card** (Owner decisions 46–47; built by the Architect). Decision 46 (option C of a real-screenshot demo, https://claude.ai/artifact/MtMQwq6mdR5xmP8fVtfyib): the heading line reads **Mastery Wheel | <the Approach list's title>** as plain title text (`#approachListCapsule` moved there, `data-approach-list-title`), one line, its size stepped down by `fitWheelHeading()` (never below 13px; two lines without the separator only if it still cannot fit); from 900px the same two titles are the wheel window's title bar. **Read · Choose a Unit ▾ · Know Your Status** (`#readContentsBtn`, `#wheelUnitBtn`, `#myStatusWideBtn`) are one row of 36px gold buttons under the wheel, above its colour key, at every width (`#wheelIntroSettled`); the heading's `#readHeadBtn`/`#myStatusBtn` and `placeWheelIntroRow()`/`#wheelIntroBand` are gone; Choose a Unit opens upward. Decision 36's random line-or-dot is the one separator. Measured 320–1280 en/bn with the real title "Approach the Quran in 40 Ways": one line (16px at 390 en, 13.5px at 320 en, full size in Bangla), nothing cut, no sideways scroll; the wheel starts ~46px higher on a phone. Decision 47: ✅ Record Your Progress and the four stages always show under Take an Approach (Āyah Card and Page card, `renderApproachStagePickerHtml`); with no Approach chosen the stages are disabled with "Choose an Approach above first, then tap your stage."; the empty-select guard still stops any write. Checks: read-contents 250/0 (`main`'s page fails 124), ayah-action-sheet-boundary 53/0 (old renderer fails 2; removing the guard fails 1), approach-sections 59/0, quran-my-status 248/0, quran-ayah-action-sheet 120/0, mushaf-approach-cards 114/0, unit-card 116/0, approach-record-status-bar 431/0, read-quick-buttons 204/0, writing-sheet 180/0, explore-hizb-view 80/0, head-search 86/0, landing-sections-collapse 152/0, wheel-slice-opens-track 96/0, global-approach-card 89/0, phone-width 217/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS) (22g×3 archive.org, 31e TLS; 43a updated in place), governance 8/8. Pre-existing on `main`, recorded: approach-short-names "My Status's wheel prints the 10 names" 69/1. Next: Siyagah round 4 (PR #448) as v09.20; the Asmaul Husna poster template (Owner's design, banner الأَسْمَاءُ الْحُسْنَى, Classification box). Waiting on the Owner: the 29 Approach short names.)

**Previous milestone: v09.18 on `main`** (1 Oct 2026 — **Folder menus: Copy to… / Move to… / Delete to Trash, and a Trash with Restore** (Siyagah port round 3 of 7; Owner decisions 41, 42.1, M4–M6; #443 → PR #447, Builder run 699, PR opened and finished by the Architect). In Mapping My Journey (full page and tray) the folder ⋯ menu offers **Copy to…** (`copyFolder`; notes linked, not duplicated), **Move to…** (`moveFolder`) and **Delete** (`trashFolder`), which replaces the old *Remove* (retire with an in-page confirmation). A folder whose subtree holds notes is refused before any write with *"This folder still holds {n} notes. Move or delete them first."*. Each note row offers Copy to… (`copyNoteToFolder`) and Move to… (`moveNote`), replacing the typed-name prompts. **One destination picker** (`openFolderPicker`): tree with derived numbers, search, refused rows saying why, Cancel/Esc, a fixed overlay topmost at its centre, full screen below 600px. **🗑 Trash** from the ⋯ beside the tabs: trashed folders and notes with their old place, **Restore** only, no erase (decision 42.1). No new Firestore code, no Rules. The Architect's review found, by looking at 390px Bangla, that the picker's search box was ~245px tall (the toolbar's `flex: 1 1 12rem` inside a column) and that an undated Trash row ended in " · "; both were fixed, with two checks that fail on the old code. Cleanup (handover 2c) done: note-foundation-boundary 30/0, dawah-boundary 21/0, study-note-service 35/0, wordpress-import-real-function and evernote-import-real-function green, each stale part updated in place with its reason. journey-folder-menus 144/0 (Delete without the notes check fails 2), journey-tray 227/0, journey-map-screen 45/0, journey-map-back 38/0, account-card 1235/0, phone-width 217/0, behaviour 1007/1 (31e TLS), emulator journey-map-real-function and note-foundation-real-function green, governance 8/8. Next: Siyagah round 4 (#446), a note opening in read mode inside the tray. Waiting on the Owner: the Asma poster demo (https://claude.ai/artifact/1ozA3sdfGYdgB3zUZCdihK).)

**Previous milestone: v09.17 on `main`** (1 Oct 2026 — **Mapping My Journey opens as a pop-up folder tray** (Siyagah port round 2 of 7; Owner decisions 41, 42.7; #440 → PR #442, Builder). `app/js/journey-tray.js` opens `journey-map.html?embed=1#folders` in a floating window over the current screen: title bar *Mapping My Journey* with a 44px ✕; drag by the title bar (pointer events, mouse and touch); **eight resize handles**; minimum 320×360; the title bar can never leave the screen; position and size kept per device in `localStorage` `mmsa-journey-tray` (UI state, never Firestore); Esc/✕ close; **below 600px a full-screen sheet**. Folders | Timeline | Path are its tabs (embed mode hides the page's header, nav and Back). Opened by the Quran dock's Mapping My Journey button and every plain `journey-map.html` link (one delegated listener, imported by `account-card.js` on all 25 pages); a new tab, a modified click or a failed module still opens the full page. A note or Import Notes opened inside the tray opens as a full page (round 4 changes note opening). No Firestore writes. journey-tray 227/0 (the Architect's mutation — the old navigation put back — fails 8; the Builder's two more), journey-map-screen 48/0, journey-map-back 38/0, account-card 1235/0, phone-width 217/0, behaviour 1004/4 (22g×3 archive.org, 31e TLS), governance green; drag measured by real pointer moves (−100,+50 moved exactly; the corner resize shrank exactly 100×50) and the ✕ is topmost at 390/820/1280. Next: Siyagah round 3 (#443), Copy/Move/Trash/Restore in the folder menus. Waiting on the Owner: the Asma poster demo (https://claude.ai/artifact/1ozA3sdfGYdgB3zUZCdihK).)

**Previous milestone: v09.16 on `main`** (1 Oct 2026 — **👤 My account on every page, Study options with Save on top and Search below it, and a two-row Writing sheet that moves sideways when zoomed** (Owner decisions 40, 44, 45). (1) **My account, round 2 of 2** (#437 → PR #439, Builder): `mountPageAccountCard()` in `app/js/account-card.js` MOVES each page's Tenant picker into the Home → 👤 My account card on the other 23 pages (same elements, every listener kept); Person moves too on notes, records, monitor, bookmarks, homework and course-offers; the Student/Person picker on the 11 study pages and in Quran Study options stays (D10). `hadith-collections` and `migrate` gained a minimal Home menu. account-card 1235/0 (mutations `quran-role` 8 fail, `study-student` 2 fail). (2) **Study options** (decision 44, the Architect): *☆ Save these settings* sits on the sticky title line beside ×; **Search** is first in the body, then Student, the unit pickers, Approach. Below 390px the Save label wraps to two short lines (needs 169px, 131px at 320px). study-presets 81/0 (its placement checks fail on the old layout). (3) **Writing sheet on a phone** (decision 45, the Architect): the title line (Writing sheet · ✕ Close · ▴ Hide), then ✏ Write · Pen · Eraser · Undo · Clear, then letter style · Save picture · Print A4. **Light · Lighter · Like the book are one pick-list** (the buttons plus Save and Print need ~430px); a PC keeps one line. The ink layer's `touch-action` gains `pan-x`, so a zoomed sheet moves left-right (proven by mutation). writing-sheet 180/0. behaviour 1007/1 (31e: sandbox TLS), phone-width 217/0, head-search 86/0, journey-map-screen 48/0, panel OK, governance green. Next: Siyagah round 2, the Mapping My Journey folder tray (#440). Waiting on the Owner: the Asma poster demo (https://claude.ai/artifact/1ozA3sdfGYdgB3zUZCdihK).)

**Previous milestone: v09.15 on `main`** (1 Oct 2026 — **Home → 👤 My account, Back on the view row, the Siyagah data layer, Asma Explore's poster, and a real folder bug fixed** (Owner decisions 40, 42, 43). (1) **👤 My account** is the first Home entry and opens a card (full screen on a phone, floating from 900px) holding name, email, tenant and roles and the page's own Tenant/Person pickers, MOVED not rebuilt (`app/js/account-card.js`, #432 → PR #433, Builder); Mapping My Journey and Import Notes only (round 2 = the other 23 pages). **Back is an "←" on the Folders | Timeline | Path row** (Import Notes: on the title line), never a line of its own (*"Can't allow back button takes a bar space"*). account-card 315/0. (2) **Siyagah port round 1 of 6 — data layer only** (#434 → PR #435, Builder): `trashFolder` (refuses *"This folder still holds {n} notes. Move or delete them first."*; retires an empty subtree deepest first), `restoreFolder`/`restoreNote` (chained revision), `loadOwnerTrash`, `copyNoteToFolder`, `moveNote`, `copyFolder` (notes linked, never duplicated). journey-map-trash-copy 29/0; **the Architect ran the emulator for the first time on this code: journey-map-real-function 46/46** against the real deployed Rules. (3) **A live defect that emulator run exposed, fixed:** `createNoteFolder` (with a parent), `reparentNoteFolder` and `retireNoteFolder` judged a folder change against `listNoteFoldersForOwner()`, capped at 100 by the Rules — with the Owner's ~1,464 imported folders a real parent read as `parent-missing`, a real folder as missing, and a retire could miss active children past 100. They now read EVERY active folder in pages (`listAllActiveFoldersForOwner()`, which refuses rather than judge a partial list); `noteFilings()` likewise. (4) **Asma ul Husna in Explore** (decision 43): Names sits right after Group, and a chosen Name's poster fills the wheel's space (asma-explore-name-poster 36/0). The Owner's Siyagah handover is stored at `docs/reference/2026-09-30-siyagah-folder-and-note-pane-handover-v2.md`; the 93 archive.org poster descriptions at `docs/reference/2026-10-01-asma-poster-descriptions.json`. Recorded, not this round's: four suites already red on `main` (note-foundation-boundary #286 import list, dawah-boundary and the wordpress/evernote emulator suites' deployment-file comparison, study-note-service's loader). behaviour 1005/2 (22h, 31e: sandbox TLS), phone-width 217/0, journey-map-screen 48/0, 8 governance suites green. Waiting on the Owner: the Asma poster template's colours (demo https://claude.ai/artifact/1ozA3sdfGYdgB3zUZCdihK).)

**Previous milestone: v09.14 on `main`** (30 Sep 2026 — **Take an Approach | Record Your Progress | Know Your Status, a Search button, and a title for the stage buttons** (Owner decisions 37–39). (1) **One gold bar of three buttons** in the Read view (text and Mushaf, the last line of `#readBar`, replacing the #370 "Choose an Approach" capsule, whose text survives as the Record button's title) and under the Note view's button bar (navy palette): Take an Approach opens the Approaches wheel, Record Your Progress the page card (Mushaf) / the chosen unit's card (text) / the Note view's Track card, Know Your Status opens it (*"I choose 'Take an Approach' … And 'Record Your Progress' … Yes, show in both views"*). Built by the Builder (#428, PR #430); the Architect's review restored the Read bar's dividers (an id rule's `border: 0` outranked them; a new check fails 28 without the fix). (2) **🔍 Search, top right of the banner** (option A of four mocked in the real page, *"A, go ahead"*): opens Study options with the cursor in the existing "2:255 or a word" box; the magnifier alone below 360px, tighter below 400px (measured). (3) **✅ Record Your Progress titles the stage buttons** on every card that has them, in the 🎯 Take an Approach title's face (23px clear above, 6px to its buttons). approach-record-status-bar 431/0, head-search 86/0 (unwiring fails 9), global-approach-card 89/0, ayah-action-sheet-boundary 53/0, read-contents 396/0, read-quick-buttons 204/0, writing-sheet 148/0, wheel-slice-opens-track 96/0, landing-sections-collapse 152/0, quran-my-status 248/0, phone-width 217/0, behaviour 1003/4 (baseline 22g×3, 31e), 8 governance suites green. Next: the Owner's Mapping My Journey report — Tenant/Person into a Home → My account card, Back never taking a line of its own, and a Siyagah folder tray (waiting on the Owner's Siyagah references).)

**Previous milestone: v09.13 on `main`** (30 Sep 2026 — **four Owner requests from one afternoon, built by the Architect** (Owner decisions 33–36). (1) **The Read list's tabs show their counts** — Surah 114 · Juz 30 · Hizb 60 · Page 604 · Ruku' 556 on a second line under each name, read off the same lists as the rows, in the reader's digits (*"Mention the numbers count in each unit"*). (2) **The full-screen ⤢ is prominent everywhere** (Read, Note, Explore): a 36px square, 2px gold border, 1.3rem glyph; solid gold and never faded while full screen is on (*"Make this button (everywhere) prominent, noticeable, bigger"*); measured cost: the Read and Note bars ~9–11px taller, no bar gains a line. (3) **The Writing sheet's Hide sits at the right-hand end of the title's line** (`placeToggle()`, measured at runtime; *"Move the hide button to the upper line"*). (4) **The phone heading carries a mark on both sides of Read, a line or a dot picked at random per page load** (`html[data-head-sep]`), the three words on one baseline (*"both dot/ line looks good to me. enable both appears randomly"*). read-contents 396/0, writing-sheet 148/0 (each change's mutation fails 10), read-quick-buttons 204/0, wheel-slice-opens-track 96/0, landing-sections-collapse 152/0, quran-my-status 248/0, phone-width 217/0, behaviour 1003/4 (baseline 22g×3, 31e), 8 governance suites green. Next: #428, Take an Approach | Record Your Progress | Know Your Status (decision 37), with the Builder; the landing Search placement waits on the Owner (A/B/C/D).)

**Previous milestone: v09.12 on `main`** (30 Sep 2026 — **Know Your Status in every unit** (#425, Owner decision 31; the Owner: *"My instructed for status was in terms of all units"* and *"The wheel should show all units together"*). `app/quranrevival.html`: each Approach row carries six tiles — Juz /30 · Surah /114 · Hizb /60 · Ruku' /556 · Page /604 · Āyah /6236 — counted by the same `summarizeUnitCoverage()`/`poolStatus()` path as the card (3 per row below 620px, 6 from 620px); the card's By unit gains Page; the wheel has a switch **All units · Juz · Surah · Hizb · Ruku' · Page · Āyah** (`kysWheelUnit`, default All units), All units drawing six rings per slice (Juz in the middle, Āyah outside) with a key line. `page-index.json` is read only when the card opens (I9). Built by the Builder (PR #426), reviewed by the Architect. quran-my-status 248/0 (hand-written figures for a Juz 30 claim: Juz 1 · Surah 37 · Hizb 2 · Ruku' 39 · Page 23 · Āyah 564; dropping the last page fails 12+), approach-coverage 55/0, explore-wbw-tab 91/0, unit-rings 106/0, landing-sections-collapse 152/0, phone-width 217/0, behaviour 1006/1 (baseline 31e), 8 governance suites green. Heading-line separators wait on the Owner's A/B.)

**Previous milestone: v09.11 on `main`** (30 Sep 2026 — **the Writing sheet's toolbar hides and comes back, and stays usable when the page is zoomed** (the Owner: *"Can you enable the button plate to hide n appear. Also enable them to be accessible when zoom in."*). `app/js/writing-sheet.js`: a **▴ Hide** button folds the toolbar to one **▾ Tools** button in the top corner (remembered per browser, `writingSheetTools` — a view choice; the writing itself is still never stored); toolbar and close-confirm now sit in one `.ws-chrome` block which, while the page is pinch-zoomed (`visualViewport.scale > 1.01`), is pinned to the VISUAL viewport and scaled by `1/scale`, so every button stays on screen and finger-sized. Four Bangla strings. Built by the Architect. writing-sheet 136/0 (+12 checks: hide/show, remembered, 2.5x zoom inside the visible area and buttons 39-48px on screen; disabling the zoom placement fails 4 — toolbar off screen, buttons 100px), phone-width 217/0, behaviour 1003/4 (baseline 22g×3, 31e), 8 governance suites green. Know Your Status in every unit (#425) is with the Builder.)

**Previous milestone: v09.10 on `main`** (30 Sep 2026 — **the Writing sheet: the Mushaf page as an A4 tracing sheet for the Arabic Writing practice** (the Owner, with a photo of a tracing Mushaf: *"when I study an Ayah and choose writing approach, the read or note view should have option to display that type of text in all types of unit"*; seven demo versions, decisions 30 and 32). New lazy renderer `app/js/writing-sheet.js` (loaded on first press, I9) reusing `hifz-renderer.js`'s layout data and QCF page fonts (four read-only exports): every Mushaf page of the current Study Unit (āyah/range/Ruku'/page/Surah/Juz/Hizb; āyāt outside the unit dimmed), one A4-shaped (210:297) canvas each, **the printed 15 lines and words per line never re-flowed** (justified by horizontal scale; size scales the page), three letter styles **Light** (hollow, #b4ab96) · **Lighter** (#d6cfbf) · **Like the book** (pale solid #dcd8cd), dark āyah markers, ruled lines, remembered per browser (`writingSheetShade`, the only thing stored). ✏ Write (finger or stylus; Pen, Eraser, Undo, Clear), **Save picture** (PNG to the phone via share or download; nothing stored by the app), **Print A4** (one Mushaf page per A4 sheet). **Placement (decision 32, "Both")**: ✍ Writing sheet in the Study menu for everyone, and on the Read/Note bars only where it costs the bar no extra line (`fitBarButton()`, measured at runtime; the Note view re-fits after each rebuild and on appearing). Built by the Builder (issue #421, branch `builder/issue-421-run-663`; its token failed with 401 before it could push two items or open a PR); the Architect finished both items (drawn-layout line counts; behaviour 30j/30l/33a/37a updated in place), built the Study-menu item and the fit rule, and updated the suite in place to decision 32. writing-sheet 124/0 (Builder's 5 mutations; the Architect re-proved "Like the book drawn as outline": 2 fail), read-quick-buttons 204/0, read-contents 269/0, mushaf-no-sideways-overflow 648/0, phone-width 217/0, navcheck fits, panel OK, behaviour 1006/1 (31e TLS baseline), 8 governance suites green. Also carries Owner decision 31 (Know Your Status in every unit, next round).)

**Previous milestone: v09.09 on `main`** (30 Sep 2026 — **a fix-list fix: the Mushaf page number now reads in the reader's language, "পৃষ্ঠা ৫৬২" in Bangla instead of "Page 562".** Found by the Architect while looking at #419's Bangla screenshots (fix list #172). `app/js/hifz-renderer.js` wrote the literal `` `Page ${pageNum}` ``; it now uses the existing `"Page {page}"` string (already in `bn.js`) and `num()` for digits. English unchanged ("Page 50", which behaviour 40d asserts). read-contents 269/0 (new Bangla check, typed by hand; fails on the old code with "Page 562"), behaviour 1003/4 (baseline 22g×3, 31e), 8 governance suites green. Built by the Architect. The writing sheet (#421) is with the Builder.)

**Previous milestone: v09.08 on `main`** (30 Sep 2026 — **three buttons on the Read page, Note View · Track · Approach, for readers who open the Mushaf from the Read contents list** (the Owner: *"we will later make a few simple buttons for these readers to read view (like your demo)"* … *"reader will eventually come to original read and we want them to move from there to other choices through other buttons"*; placement shown in a demo and confirmed, *"Okay, placement is fine, go ahead"*, decision 27). `#readQuickRow`, shown only when the Read view was opened from the contents list (`body.read-from-contents`, set in `openReadContentsRow()`, cleared in `setStageView()` on leaving Read) AND in the bare full-screen state. **Below 600px** a slim row fixed to the bottom, three equal buttons, `#readScroll` padded so no Mushaf line is covered, `#readHint` above it, and above the dock when a reader's settings keep the dock (`--rq-bottom`); **from 600px** on the top line between the page reference and ⤢. Each button reuses one existing route through a named function shared with its old caller: Note View = the Study menu's Note (`openNoteForCurrentAyah()`), Track = the Read bar's unit chip (`openChosenUnitCard()`, the Unit Card, or the Ayah Card for one āyah), Approach = the dock's Approach tab (`openApproachWheel()`). No audio, no write of their own. MEASURED first by the Architect: three buttons need ~203px (en) / ~169px (bn) and the bare top line has 288-358px at 320-390 beside the page reference, so they fit on the top line only from ~600px. **Built by the Builder** (issue #419, PR #422), reviewed by the Architect on a merge with v09.07. read-quick-buttons 204/0 (new; Builder's 4 mutations, Architect re-proved the bottom-padding one: 14 fail), read-contents 268/0, wheel-slice-opens-track 96/0, study-options-play-read 62/0, study-presets 80/0, phone-width 217/0, mushaf-no-sideways-overflow 648/0, landing-sections-collapse 152/0, navcheck fits, panel OK, behaviour 1003/4 (baseline 22g×3, 31e; 33a and 37a updated in place for the new `#readBar` child), 8 governance suites green. Also carries Owner decision 30 (the writing sheet, issue #421, next round).)

**Previous milestone: v09.07 on `main`** (30 Sep 2026 — **two Owner fixes from the phone. (1) The phone heading line: Read sits exactly in the middle of the gap between *Mastery Wheel* and *Know Your Status*, with a thin | midway between Read and Know Your Status** (the Owner's screenshot with a red dot at each spot: *"Place Read button in the middle of the gap. It may look elegant if you put dot or a | like bar in between those buttons, whichever looks nicer"*; the Architect looked at both, and a 4px dot read as a stray speck). Built below 520px with two growing pseudo-element boxes either side of Read (`.wheel-heading::before`/`::after`, `order` 1-4), the `::after` drawing the bar at its own centre with a 6px minimum; gap 0.25rem, 0.1rem below 360px; the title keeps one line at 320px in English (it broke onto two lines on `main` too). Measured: the two gaps equal at 320-519px in both languages; 520px and up unchanged. **(2) A wheel slice or Approach-list row now opens the Note view with that Approach's Track card already unfolded, the tapped Approach chosen, and scrolled into view** (the Owner: *"Clicking on the approach slice at the landing wheel brings here, asking for another click. Why not straight to the view it is meant for?"*): `jumpToApproach()` sets `noteApproachCardOpen` and scrolls the card in after `openNoteView()`. Built by the Architect (Owner decisions 28-29; decision 27 records the Read-page buttons placement for #419). read-contents 268/0 (its "Know Your Status right after Read" check updated in place; the new centred/separator/one-line checks fail 37 on the old code), wheel-slice-opens-track 96/0 (new; 48 fail on the old code; allows only the Note view's documented writability probe), phone-width 217/0, landing-sections-collapse 152/0, quran-my-status 88/0, study-options-play-read 62/0, navcheck fits, behaviour 1003/4 (baseline 22g×3, 31e), 8 governance suites green.)

**Previous milestone: v09.06 on `main`** (30 Sep 2026 — **a Read button beside the Mastery Wheel opens a plain contents list (Surah · Juz · Hizb · Page · Ruku') that opens the existing Read view as a Mushaf page**, the Owner's *"How about making it simple for a regular user? … choose a Surah, page, Juzz, Hijb, Ruku, it brings the Mushaf view. They just read it as traditional reading. Nothing fancy."*, shown as a demo first and answered *"Go for A. Keep it read in both places"* (A: no second reader) and *"do Bangla as well whenever it's easy"*. **Built by the Builder** (issue #415, PR #416), **placed by the Owner's follow-up** *"put Read beside Know Your Status on mobile"*: below 900px Read is a heading-line link (`#readHeadBtn`) in the heading's own face, beside *Know Your Status* on a phone and at the right edge on a tablet, where the capsule row keeps its approved three; from 900px (where the wheel window's title bar replaces the heading) it is the fourth capsule (`#readContentsBtn`), with the band text at 0.7rem at 900-999px so all four keep one 36px line. **Tablet wrap fixed** (the Owner: *"fix the tablet wrap too"*): the phone breakpoint moves 479px -> 519px, because in English Know Your Status wrapped to a second row at 480-505px even with three capsules (pre-existing on `main`); a new check asserts the capsule row is one 36px line at 17 widths in both languages. MEASURED first: four capsules did not fit in English until ~1000px (the Builder's version wrapped Read to its own line at 390-412px, Know Your Status at 480-530px and the Approach caption at 721-980px). five tabs, the Surah tab with number, name, meaning, Arabic name and verses and a search box; picking a row sets the unit through the existing pickers, ticks Mushaf and calls `openReadingScreen()`, so the Read view itself is unchanged; no audio, no claim, no write; the Juz/Hizb/Page/Ruku' tables load on first press only (I9). The Study menu's own Read stays. **Part 2 by the Architect** (the Builder's run could not reach the API): `tools/quran-data-pull/build-surah-names-bn.js` adds `nameTranslationBn` to `surah-index.json` from api.quran.com (all 114 Bangla, refuses English stand-ins; every existing field identical, order kept; re-runnable); the suite's Bangla check now asserts the exact words (fails 2 on the old data). read-contents 232/0 (Builder's mutations: unit not set, audio started, a table loaded at startup; Architect's: the old data fails the Bangla words, the Builder's placement fails 74 placement checks by name), landing-sections-collapse 152/0, study-options-play-read 62/0, study-presets 80/0, quran-my-status 88/0, phone-width 217/0, navcheck fits, panel OK, behaviour 1003/4 (baseline 22g×3, 31e).)

**Previous milestone: v09.05 on `main`** (30 Sep 2026 — **Study options: save the current settings as named presets, restore with one tap**, the Owner's *"How about enabling bookmark button in the option (as a form of remember the setting user might want to reuse)"*, answered *"Named presets"*. **Built by the Builder** (issue #410, PR #413): **☆ Save these settings** at the top of Study options opens an inline form (name, default the unit label; *Keep this unit*, default on); presets show as chips there and as a *Saved settings* group in the Bookmark menu; one tap applies; ⋯ renames or removes (soft, `removed: true`, I4/D6). **Applying restores settings only; it never presses Play or Read.** Saved: Mushaf, page-by-page, Tajweed, Word by Word, Root, Derivatives, translation languages, WbW language, Arabic font, the full-screen hides, end-of-unit prompt, Study Unit and (optionally) the unit, reciters, Repeat, Mode, Loop; not the Approach. Stored as an additive `settingsPresets[]` on the person's existing bookmarks document (`bookmarks.js`, every write through `safeWrite`, I15); the bookmarks Rules need only `canRecordFor`, so no Rules change; no startup read (the document loads lazily when Options or the Bookmark menu opens). **Architect review**: merged v09.04 in cleanly; read the data layer against `firestore.rules` (create payload matches the three existing creates); looked at the form and chips with real-length names at 320px (bn), 390 and 1280px (en). study-presets 80/0 (new; Builder's mutations: a setting not saved, apply skips the font, remove hard-deletes), study-options-play-read 62/0, rules-authorisation-executable 40/0, phone-width 217/0, panel OK, navcheck fits, behaviour 1003/4 (baseline 22g×3, 31e).)

**Previous milestone: v09.04 on `main`** (30 Sep 2026 — **Study options: Play opens the chosen view, and a new Read button opens it without sound**, the Owner's *"In the option, when play button is pressed, the selected view should appear, which is not happening now. Fix. … Should there be another button when user doesnt choose listening but reading, so that pressing that button would take user to the desired/ selected view?"* **Built by the Builder** (issue #409, PR #411): the Study menu's Read item, Study options' **▶ Play** and the new **📖 Read** all go through one `openReadingScreen()`, so they cannot drift; Play opens the view at the selected unit and starts the recitation in the same tap (nothing awaited before `unlockAudio()`); Read needs no reciter ticked and leaves audio already playing alone. Loop, Read and Play are one non-shrinking cluster; below 480px it takes its own line, the two buttons sharing it equally at 40px. **Architect review**: merged v09.03 in cleanly; looked at the row in Bangla at 320px and English at 1280px (tidy) and at the view Read opens (the selected āyah, Options closed). study-options-play-read 62/0 (new; Builder's mutations: Play leaves Options open, Read starts audio, Read ignores the unit), phone-width 217/0, panel OK, behaviour 1003/4 (baseline 22g×3, 31e; 30i, 38d and 38e updated in place).)

**Previous milestone: v09.03 on `main`** (30 Sep 2026 — **three Owner corrections from phone screenshots, made by the Architect**. (1) *"Either the S circles or the Approaches numbers circle should be distinctive in color, not the same."* The landing list's section badge (S1 …, Bangla বি১ …) is now a hollow gold RING with gold lettering, while the Approach number stays a filled gold disc; the Light look gives the ring the section gold. (2) *"In Mob. The status button should resemble the text of 'Mastery Wheel' … rename the 'My Status' to 'Know Your Status' in all platforms."* Below 480px the heading-line button (`#myStatusBtn`) wears the heading's own face, weight, size and colour, with no pill, and keeps its 36px tap height; every visible "My Status" (heading button, capsule, sheet title, wheel centre, close label, a Catalogue sentence) reads **Know Your Status**, Bangla *আপনার অবস্থা জানুন*. Ids and code names are unchanged. (3) *"Move the derivatives above n counts below. (Derivatives are for learning, occurrences are just info)"* The Word Card's Basic Arabic tab shows *Derived forms of this root* straight after the word's facts, with the three occurrence lines below it (`quran-word-card.js`). **Checked**: landing-sections-collapse 152/0 (new: ring not filled like the disc, lettering ≥4.5:1 in both looks; the old filled badge fails 8), quran-word-card 38/0 (new order check; the old order fails it), head-line probe at 320–479px in both languages and looks (same font, size, weight and colour as the heading, one line, inside the row, 36px), quran-my-status 88/0, approach-short-names 70/0, catalogue-tabs 56/0, card-look 96/0, phone-width 217/0, lemma-occurrences 50/0, word-card-segments 40/0, quran-word-card-rendered 134/2 (TLS). form-meaning 288/0. **Found, not caused here, and fixed**: `explore-hizb-view-browser` died identically on `main`, waiting for exactly 30 slices on Explore's Quran-level Juz view, which has drawn rings (30 + 114 = 144) since v08.105; it now counts the Juz ring itself and taps Juz 1 on it: 80/0.)

**Previous milestone: v09.02 on `main`** (29 Sep 2026 — **the landing Approach list's section headings read S1 … S8, with the count in a square box at the end and the name in gold**, the Owner's *"Write it as S1 (circle marked up, for Section 1) then at the end of the Section name write the approach numbers (6) in the square marked up box. And i think section text color should be distinctive with the approaches text color."* **Built by the Builder** (issue #407, PR #408): the round badge now holds the section's own label (*S1*, Bangla *বি১*), the Approach count sits in a small square-cornered box after the name's last word (labelled *6 Approaches* / *৬টি পদ্ধতি* for screen readers), and the section name is gold (`#ecd49a` Night, `#7a5410` Light) so it no longer matches the Approach names. **Architect review**: found the v08.117 *Open all / Close all* button still wearing the Night gold in the Light look, measured at 1.45:1 on white; a measured contrast check was added (failed 4 of 4 before the fix) and the Light look now gives it the section gold (≥4.5:1). `landing-sections-collapse-browser` 136/0, approach-sections 59/0, catalogue-sections 126/0, card-look 96/0, phone-width 217/0, behaviour 1006/1 (31e, TLS; 22g passed this run).)

**Previous milestone: v09.01 on `main`** (29 Sep 2026 — **the v09 line opens, and the Home menu links the third archive**. The Owner opened v09 for the 40-Approach era (decision 26 in `docs/governance/2026-09-27-owner-decisions.md`): `legacy-v08/` holds `app/` as released at v08.103, v09.00 is deliberately unused, and v08.104–v08.117 keep their numbers. Then, from a screenshot of the archive's own Home menu: *"The number is not showing in the list"* — the menu offered *Legacy App - v06* and *v07* but no v08. **Now**: every one of the 26 pages that carries the legacy links adds **Legacy App - v08 ↗** (`https://madrasatul-muslimeen.github.io/legacy-v08/index.html`, same markup and class, Bangla *পুরাতন অ্যাপ - v08 ↗* in `bn.js`), and `app/sw.js` keeps `/legacy-v08/` out of the live offline cache exactly as it does `/legacy/` and `/legacy-v07/`. The archive itself is unchanged (it is frozen, so its own menu still lists v06 and v07). **Checked**: rendered on the landing page, Catalogue and About at 390 and 1280px in English and Bangla, all three links shown at the same width with the right addresses, no page errors; navcheck NAV FITS at every width in both languages; phone-width 217/0; `brief-integrity` 9/0 (its archive guard checks `legacy-v08/` file by file against 54f93098).)

**Previous milestone: v08.117 on `main`** (29 Sep 2026 — **the landing Approach list's sections start closed, with the count in front**, the Owner's *"How about making the sections in Landing page load on collapsed by-default having expanding option. Then, approach numbers quantity is mention in front of the section names."* **Built by the Builder** (issue #400, PR #401). `renderWheelSidebar()` in `app/js/mastery-wheel.js` gains an opt-in `collapsible` mode (Explore's six sidebars pass nothing and are unchanged): each section heading is a ≥40px full-width button with `aria-expanded`, a caret, a round badge with the section's Approach count in the reader's digits, then the name; rows stay flat children hidden while closed (`.way-row[hidden]` made explicit). `landingOpenSections` in `quranrevival.html` lives outside `renderWheel()`, keyed by section number (or name for leftovers), so a section stays open across every redraw; session-only, closed on each load; `jumpToApproach` (a wheel-slice tap) opens the tapped Approach's section; one *Open all / Close all* button. **Architect review**: merged v08.116 in cleanly; `layout.mjs` against the `main` shim: heading and wheel unchanged at every width, every flag is the intended one (fewer visible Approach rows, more room above the dock); Light and Colour wheel looks screenshotted in both languages (the Builder had only Dark); #399's `catalogue-sections-browser` read the whole landing heading, which now holds the caret and count, so its check was updated in place to read the name (126/0). `landing-sections-collapse-browser` 84/0 (new; counts hand-written from an 8-section, 40-Approach seed with real-length names; Builder's mutations: start expanded, drop the state threading, badge counts everything), approach-sections 59/0 (updated in place), short-names 70/0, unit-rings 106/0, card-look 96/0, phone-width 217/0, behaviour 1003/4 (baseline 22g×3, 31e).)

**Previous milestone: v08.116 on `main`** (29 Sep 2026 — **Catalogue sections: a move reaches the wheel; collapsible, draggable sections**, the Owner's *"Make the Section heading expandible/ collapsible (collapsible by default) and also make sections draggable up and down. Moving the section does not reflect in the wheel."* **Built by the Builder** (issue #399, run 621; it opened no PR, so the Architect reviewed the branch). **The bug**: a section ▲▼ only reordered the screen until *Save sections* was pressed, with nothing saying so, so a move was lost on leaving the page; and `saveApproachSections()` moved Approaches by `group` NUMBER only, while the display matches by number then NAME, so an Approach with no or a wrong `group` was left behind. **Now**: a move (▲▼ or drag) saves the ORDER at once with the stored names, like an Approach move; a name typed but not saved is labelled *Name changes not saved yet*; the save resolves each Approach's section exactly as the display does; the page is patched from what was written rather than re-read. **Collapsible**: every Approach-list section heading is a ≥40px button with a caret and count, closed by default, session-only, kept open across edits, adds and moves; *Open all / Close all*; an Approach opened for Edit or moved to another section opens its section. **Drag**: a ⠿ handle (40px) in the Sections editor and on each list heading, Pointer Events so a finger works, a drop line, Escape or a no-op drop writes nothing; owners only. **Review**: expected wheel orders written by hand from an 8-section, 40-Approach seed including a no-group and a wrong-group Approach; screenshots looked at (EN/BN, 390/1280, collapsed and mid-drag); Architect's mutations: name fallback removed fails exactly the name-matched checks (124/2), a move that does not save fails 15 including "the landing wheel follows". `catalogue-sections-browser` 126/0 (new), catalogue-tabs 56/0, approach-sections 59/0, add-approach 30/0, short-names 70/0 (the last two updated in place: open all sections first), phone-width 217/0, behaviour 1003/4 (baseline 22g×3, 31e).)

**Previous milestone: v08.115 on `main`** (29 Sep 2026 — **each derived form's meaning on the Word Card**, the Owner's *"The different forms in Basic should mention meaning of those forms in respective language, then mention the occurances."* Owner decision the same day: **the app's own word-by-word translations now, a dictionary source later** (backlog in `ARCHITECT.md`). **Built by the Builder** (issue #396, PR #398). New `tools/quran-data-pull/output/lemma-meaning-index.json` (380,177 bytes, 4,832 lemmas), built by `build-word-identity-indexes.mjs`: per lemma and language the most frequent TIDIED gloss (brackets dropped keeping their words, quotes and trailing punctuation dropped, a leading and/so/then or এবং/আর/অতঃপর removed; ties shortest then alphabetical). Loaded lazily with the part-of-speech index when a Word Card opens, never at startup (I9); a failed load leaves the list working without meanings. Each row under *Derived forms of this root*, in Basic Arabic and Arabic in Depth, reads category → Arabic → meaning → count, in the reader's language with the other as a tagged fallback. **Architect review**: the index rebuilt byte-for-byte from the script; the six forms of root ش ك ر hand-counted from the surah files, ties included, all match; screenshots looked at in both languages at 320/360/1280px (a 50-character Bangla meaning wraps as one unit inside the card); known limit recorded for the Owner: a gloss is a token's meaning in its verse, so some read as phrases (كَاتِب, كَتَبَ). `quran-word-card-form-meaning` 21/0, `quran-word-card-form-meaning-browser` 288/0 (containment, clipping, order, contrast ≥ 4.5 against the gradient's worst stop, six widths, both tabs, both languages; Builder's mutations: dropped span, swapped languages, untidied index), `quran-word-card-rendered` 118/4 identical to `main` (2 TLS, 2 pre-existing "fully inside the viewport" bottom=865), explore-rendered 37/0, phone-width 217/0, behaviour 1003/4 (baseline 22g×3, 31e).)

**Previous milestone: v08.114 on `main`** (29 Sep 2026 — **Approach short names on the wheel**, the Owner's *"Make another column in the Catalogue for Approaches for Short name ... shown over the slides of the wheel everywhere (such as Approach 1 short name as Reading Tajweed) (we will keep a toggle option to show the Approach names on and off over the wheel slides.)"* **Built by the Builder** (issue #385, PR #388) — its first feature round since the fix. New `shortName: {en, bn}` on each tenant trackable (additive; the `trackables` rules have no `hasOnly`, so no Rules change); defaults for the 30 platform Approaches in `APPROACH_TEMPLATES` (Approach 1 "Reading Tajweed", the Owner's own; the other 29 proposed, for the Owner to review); fallback own → template → other language → full name (`app/js/approach-short-name.js`). **Catalogue**: a Short name column, a bilingual pair in Edit and in Add an Approach. **Wheel**: each name written along its slice, sized from the slice's arc width, cut with "…" to its depth and clipped to the slice, white with a dark halo — landing wheel (and its pop-up), All-units rings, My Status. **Names** toggle, on by default, remembered per browser (`getWheelNames()`). **Architect review found**: the Builder's own On/Off row (it could not run `layout.mjs`) cost phones 46px and an Approach row at 390/412px — now ONE Names toggle on the Wheel look row, `layout.mjs` NO LAYOUT REGRESSIONS, the row one line at 320/360px in both languages; Bangla names used a font with no Bangla letters and the Latin size — now the app's Bangla font stack and a little larger; behaviour 8c/9/43k counted slice names as centre text — updated in place. `approach-short-names-browser` 70/0 (its switch check updated in place; Builder's mutations: empty label fails 19, dropped save fails 2), catalogue-tabs 56/0, approach-sections 59/0, add-approach 30/0, unit-rings 106/0, My Status 88/0, card-look 96/0, phone-width 217/0, behaviour 984/9 (baseline).)

**Previous milestone: v08.113 on `main`** (29 Sep 2026 — **the Catalogue organised, and Approach numbers that close up**, the Owner's *"Organise the catalogue page ... (It's getting a long tail)"*, *"The up/ down move button of approaches inside a section doesn't work"*, *"Why these are taking spaces? ... instead of placing horizontally?"* and *"Deleting/ moving an approach should auto correct the Approach numbers ... wheel shows 42"*. **(1) Catalogue in tabs**: Modules · Subjects · Approaches · Ladders & levels, each with a count, one panel at a time, remembered per browser, `#approaches` etc. open a tab, a module row opens Subjects on it; page 48 → 64rem; every row's buttons on ONE line (the forced line breaks removed, `.row-actions` nowrap, tables scroll in their own box); the section editor is a card per section on phones. **(2) ▲▼ fixed**: the handlers passed an Approach's position among ALL Approaches where `moveTrackable()` takes its position in its own section — equal only in section 1, so in every later section the move was silently skipped. **(3) Numbers by position**: every screen (wheel, its list, All-units rings, My Status, Catalogue #) numbers Approaches 1..N in display order (tenant sections, then place) via `approachNo()` — never the stored `order`, which keeps gaps after a removal and jumps past the end after an add (the Owner's 40 slices numbered to 42); `quranTrackables` is now in that same order, so the wheel and the list agree. **(4) From the Builder's audit #384** (PR #386, merged by the unattended Architect): the Study-options/Note/My Status picker and Explore's Approach list group by the tenant's own sections (they printed the first Approach's copied `groupName`); the backup's Section column read a field Approaches never had (now `groupName`); removing one of the six auto-credited Approaches (01/03/04/07/08/10) now says so in its confirm; a duplicate Bangla "Approaches" key ("অ্যাপ্রোচসমূহ") removed so it reads পদ্ধতিসমূহ. New `catalogue-tabs-browser` 56/0 (hand-counted orders; mutations: old ▲▼ fails 3, a restored line break 4, stored-order numbers 4, the old picker 1); approach-sections 59/0 and catalogue-add-approach 30/0 updated in place (open the Approaches tab first); layout NO REGRESSIONS; behaviour 987/6 (baseline); phone-width 217/0; unit-rings 106/0, My Status 88/0, Global Approach Card 144/0, Ayah Card 120/0, Unit Card 116/0, Mushaf cards 114/0, approach-coverage 55/0. **Recorded, not built**: the Catalogue cannot remove a section, so the audit's orphaned-`group` hazard cannot occur today.)

**Previous milestone: v08.112 on `main`** (29 Sep 2026 — **"40 Ways" everywhere**, the Owner's *"40 ways should reflect Everywhere."* The landing capsule that read "Approach the Quran in 30 ways" now reads the SAME heading as the Catalogue's Approach list (v08.110's `approachListTitle` on the tenant document, already read — no new read): "Quran Approaches - 40 Ways" / "কুরআনের পদ্ধতি - ৪০টি উপায়" by default, the tenant's own wording once edited. The Catalogue intro says "the Quran Approaches"; the default tagline reads "Quran Approaches — one Ayah, forty ways" (a tenant that saved its own taglines keeps its own); Admin self-check no longer fails when the count is not 30 across 7 sections. `approach-sections-browser` 59/0 (capsule at 320/390/1100px, both languages, default and own heading; removing the render call fails 6), behaviour 43a updated in place (984/9, baseline), layout NO REGRESSIONS, phone-width 217/0, My Status 88/0, card-look 96/0, add-approach 30/0. **Not changed**: the wheel still draws one slice per Approach, so it shows 40 only once 40 Approaches exist.)

**Previous milestone: v08.111 on `main`** (29 Sep 2026 — **the Global Approach Card** (issue #370, the Owner's approved design: *"Approved."*). **Built by the Architect** — two dispatched Builder runs ended after 5 steps and pushed nothing. **(1) Full screen**: below 900px every card in the shared shell — the Ayah Card, the Unit Card and the "This page" card — fills the screen with its header pinned while the body scrolls; from 900px it stays the floating panel. **(2) One Approach pull-down on all three**: grouped by the tenant's OWN sections (v08.110's list), each Approach followed by its stage on the unit the card is about (name alone when that unit's records are not loaded — never a guessed "Not started"); the chosen Approach is named in full with its section above it (a phone's pull-down cuts long names), and "Mastered is confirmed by a teacher." sits under the four stages. **(3) The "Choose an Approach" capsule** on the Mushaf bar, in the space #mushafPageRef used to stretch into (the blank area the Owner marked): it names the chosen Approach and its stage on the page, and opens the page's card. From 700px it sits beside the reference; below, the bar is already two lines on `main` (85px) and the capsule starts the second line at the icons' own 26.8px height, so **#readBar's height is unchanged at every width in both languages** (a first try beside the reference got ~72px, "Cho…", and one at 34px tall added 7px — both measured and undone). Its text shows in full from 390px; at 320/360 English it may end in "…" (full text in title/aria-label). **Review of its own work found the Unit Card's count lines still on Light-only literals** (#1b1b16 on the Night card) — on the tokens now. New `global-approach-card-browser` 144/0 (bar height pinned to main's measured 85/51px, the claim read back as `page:madani:50::recite = learning`, the three cards full screen, a whole-card contrast sweep in both looks), seven mutations caught. Updated in place with reasons: behaviour 30j/30l/33a/37a (the capsule is a new #readBar child, Mushaf-only) and ayah-action-sheet-boundary (the word "Mastered" now appears; a Mastered button still must not). behaviour 986/7 (baseline: 27i, 31e, 22h TLS, 40g×4), phone-width 217/0, Ayah Card 120/0, Unit Card 116/0, Mushaf cards 114/0, page ref 129/0, card-look 96/0, layout NO REGRESSIONS, reading OK both languages. **Not built, recorded**: the Approach strip is not tappable (its 12px dots cannot carry a 40px target) and the cards keep their existing headers rather than the demo's kind/title/subtitle stack.)

**Previous milestone: v08.110 on `main`** (29 Sep 2026 — **the Approach list's heading is editable, and added or renamed sections reach every Approach list**, the Owner's *"'Quran Approaches - 40 Ways' (number could be changed, so make it editable). When a Section is renamed or added it should be added and edited to the Approach list as well."* **(1) Catalogue heading**: reads the Owner's wording by default (Bangla "কুরআনের পদ্ধতি - ৪০টি উপায়"); Owner/Prime edit it in both languages with ✎ Edit heading (stored as `approachListTitle` {en, bn} on the tenant document — no Rules change, the tenant update rule is unrestricted on fields). **(2) Catalogue's Approach table** shows every section — an empty one with "No Approaches in this section yet" — and follows section names as they are typed, moved or added (Save sections still writes them). **(3) The landing Approach list** takes its headings from the tenant's own section list, in its order (tenant document already read; no new read), and once the tenant owns its sections an added, empty section shows with its note (not a `.way-row`). New pure `app/js/approach-sections.js`. **Harness**: the stub's `writeBatch` now records its writes on commit, so a batched save is visible to a suite. New `approach-sections-browser` 35/0 in both languages, three mutations caught (6, 4, 4). layout NO REGRESSIONS, phone-width 217/0, catalogue-add-approach 30/0, card-look 96/0, My Status 88/0, behaviour 987/6 (baseline; 22g passed this run). **Flagged**: the landing capsule still reads "Approach the Quran in 30 ways".)

**Previous milestone: v08.109 on `main`** (29 Sep 2026 — **the three old readability shortfalls fixed**, the Owner's *"Fix those three old readability issues too"*: the Hadith commentary link in Light (#b8862f on white, 3.24:1 → #7a5a14, 6.4:1; Night keeps its own heading gold, since the darker gold measured 2.75:1 on the dark card), Dawah's empty-list line (#888 → #666, 3.54 → 5.74:1) and the Note side pane's pressed button (white on #B8862F, 3.24:1 → #8a6420). The wider sweep also found the Home menu's Legacy App links at #888 (3.54:1) → #666. `card-look-browser`'s whole-surface sweep now covers Dawah and the Note pop-up with an **empty baseline**: 96/0, and fails 10 with the three fixes stashed. The sweep's first Dawah run measured the closed site menu (in the DOM, not on screen) — rooted at `#app` now. Hadith navigation 50/0.)

**Previous milestone: v08.108 on `main`** (29 Sep 2026 — **Mark as read for a Ruku' or a Page is ON, and the Unit Card's Mark as read really saves.** The Owner published `docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules` (*"Ruku/Page rule published"*); `firestore.rules` is synced to it (commit tagged `[already-deployed-manually]`; only `unitIdentityOk()` widens to ruku/page) and `study-reading-units-readiness.js` reads `ready: true` with a governed decision, `docs/reports/2026-09-29-reading-ruku-page-enabled.md`. **A LIVE DEFECT found while proving it: the Unit Card's Mark as read had never saved anything since v08.103** — Surah and Range included. The card's buttons close the card first (`unit-card.js` `fire()`), closing set `unitCardCurrentInfo` to null, and `markUnitAsRead()` read that and returned silently; v08.103's suite checked only that the button was enabled. It now takes the card's own resolved unit. `unit-card-browser` 116/0 with a new check that presses it and finds the evidence write (fails 2 on the old code); the emulator suite `reading-units-real-function` 14 steps, its "refused before the publish" half pinned to the pre-publish rules (`27346eaa`) and the live file asserted equal to the published one; `study-event-wiring` 47/0 (the shipped-gate check updated in place: now asserts open). Ayah Card 120/0, Mushaf cards 114/0, evidence boundary 28/0 + 13 mutations.)

**Previous milestone: v08.107 on `main`** (28 Sep 2026 — **Card look, parts 3–4** (issue #354, Owner decision 25): the rest of the cards follow Home ▾ → Settings → **Card look**. The Note pop-up's frame and title bar (the writing area and side pane stay light in both looks, as the issue asks), the Wheel/Explore pop-up frames, Hadith cards and rows, the QCR and Asma ul Husna panels, the ⋯ bar palettes, and Dawah's page cards, status pills and notices. Pages stay light. **Built by the Builder (PR #369); review found Night defects its sampled checks could not see**: Commentary's scope line and Explore's "no progress is counted" line recoloured for a card while sitting on the white page (1.79:1, 2.02:1), hadith reference/meta lines (2.95:1), the commentary "link only" warning (1.74:1), QCR's level badge (3.34:1) and a "Not started" chip on a hovered row (3.48:1) — all fixed. `card-look-browser` gained a whole-surface sweep (every visible text element, gradients and translucent layers blended, worst case taken), 56 → 84/0; the Builder's CSS fails 10 of the new checks. Pre-existing, not the card look's, recorded: the Light commentary link (#b8862f on white, 3.24:1), Dawah's empty-list line (#888, 3.54:1) and the Note side pane's pressed ☰ (3.24:1). Regressions: layout NO REGRESSIONS, phone-width 217/0, unit-rings 106/0, My Status 88/0, explore-wbw-tab 91/0, Ayah Card 120/0, Mushaf cards 114/0, Hadith navigation 50/0, Asma rename 20/0, Unit Card 114/0, behaviour 984/9 (baseline).)

**Previous milestone: v08.106 on `main`** (28 Sep 2026 — **Card look: Night or Light, parts 1–2** (issue #354, Owner decision 25). Pages stay light; cards take a look the reader chooses in Home ▾ → Settings → **Card look** — **Night** (default) or **Light** — remembered per browser, applied before first paint, switched without a reload. `app/css/card-look.css` holds one set of tokens; the landing wheel card, Explore, the Ayah Card, the Word Card and My Status use them; the five status colours are unchanged. **Merged by the unattended Architect (PR #367) and reviewed after the fact**: the review found Light unreadable on the landing card and Explore (section names 1.45:1, chips 2.4–2.6:1, word-coverage line 1.63:1), Night's "Not started" chip at 4.33:1 and a known-word chip the Ayah Card suite measured at 1.83:1 — all fixed, every text element of the five surfaces ≥4.5:1 in both looks, both languages, 390/1100. Parts 3–4 (Note frame, Hadith, Asma/QCR, Dawah, info boxes, palettes; `card-look-browser.mjs`) are the next round. behaviour 984/9 (baseline), phone-width 217/0.)

**Previous milestone: v08.105 on `main`** (28 Sep 2026 — **every unit on the wheel** (issue #352, Owner decisions 21–24). The landing wheel gains a **Show** row: the chosen unit (default, today's wheel), **All units** (six rings per Approach, Juz in the middle out to the āyah, each pooled for a Yes Approach and read directly for a No one, marked ○), or one unit on its own ring; a ring key names the real units and tapping a slice opens a data box (Take this Approach / Open in Explore), beside the wheel from 721px, below it on phones. **Explore**: Whole Qur'an is Juz + Surah rings, a Juz is Hizb + Ruku' + Page ("(part)" at the edges), a Surah is Ruku' + Āyah, every ring **sized by text** (each printed page weighs the same) and every arc the colour Explore's own list shows. New pure `unit-rings.js` and `renderRingWheel()`. I9: the default wheel reads nothing new; All units reads subject_quran, the boundary tables and the Juz's surah records when shown (flagged: once per app open if left on). **Built by the Architect** — the Builder's two runs pushed nothing. `unit-rings-browser` 106/0 with hand-counted ring colours, five mutations caught; review fixed the Show row wrapping on phones (−90px → −45px) and the data box being cut off at 768px. Regressions clean: approach-coverage 55/0, explore-wbw-tab 91/0, My Status 88/0, Unit Card 114/0, Mushaf cards 114/0, Ayah Card 120/0, phone-width 217/0, panel/navcheck/reading OK both languages, behaviour 984/9 (baseline).)

**Previous milestone: v08.104 on `main`** (28 Sep 2026 — **three things.** **(1) A LIVE DEFECT FIXED: Study activity evidence had never been written in production.** `writeStudyActivityEvidence()` read an event's document before creating it; the deployed read rule evaluates `resource.data`, so a read of a document that does not exist is DENIED, and every new event threw permission-denied at that first read — since v08.34 no Mark-as-read (Surah/Range ✓), listening completion, Word-by-Word or Journaling evidence row can have been saved (Monitor's "Study activity this week" empty for the same reason). It now creates first and reads only after a refused create (a retry or race still reads back `written: false`; anything else rethrows, I15). No Rules change. Proven on the emulator against the LIVE `firestore.rules`: a Surah completion is refused by the old code and written by the new. The store's own suite never saw it because its fake answered "not there" to a missing read; the fake now models the deployed rules, four checks updated in place, and a new guard fails on the old code (27/0). **The v08.56 lesson, a third time: never read a document that may not exist.** **(2) #349's missing proof**: `tools/firestore-emulator/reading-units-real-function` (13/13) — the real chokepoint writes a Ruku' and a Page row under `docs/governance/2026-09-28-reading-ruku-page-DEPLOYMENT-candidate.rules`, refuses Juz and mismatched unit types, and the same Ruku'/Page writes are refused under the live rules. #349 itself (ADR-008 Amendment 3, gate `ready: false`) was merged by the unattended Architect as PR #364 without that suite; the candidate was diffed against `firestore.rules` and adds only the two `unitIdentityOk()` lines. **(3) Catalogue: add an Approach** (Owner: *"There's no option for adding new approach and assigning to a section"*): owner/prime get an Add-an-Approach form — English and/or Bangla name, Section, its own "counts for each āyah inside" rule; the new Approach is `approach_NN`, one past the highest id the tenant has (removed ones included, so an id and its claims are never reused), with no platform template so the name sync never overwrites it, placed at the end of its section; the wheel draws it as one more slice. No Rules change (`trackables` create is `canAdminCatalogue`). `catalogue-add-approach-browser` 30/0 both languages, four mutations caught. Unit Card 114/0, phone-width 217/0, behaviour 984/9 (baseline), governance clean.)

**Previous milestone: v08.103 on `main`** (28 Sep 2026 — **the Unit Card** (issue #348), Owner decisions 18 and 19: acting on and tracking a Ruku', Page, Hizb, Juz, Surah or Range from the Read view. One card in the Ayah Card's own overlay: a ladder (Āyah → Ruku' → Page → Hizb → Juz → Surah) that redraws in place, Take an Approach through the same `claimStatus()` path (unit key into `surah_N` or `subject_quran`), each Approach's Yes/No rule in words, Note/Bookmark/Play, Mark as read (live for Surah/Range; `aria-disabled` with the reason for Ruku'/Page "coming" and Hizb/Juz "later"), the 30-Approach strip, "Āyāt Achieved or Mastered: n of N", Word by Word known words, and Inside chips that jump there. It opens from boundary markers in the text ("Juz N begins", "Hizb N begins", "Ruku' N ends ع", "Page N ends", the Surah name), the tappable Mushaf surah banner, the Ayah Card's ladder, and a gold **Read-bar chip** naming the unit (decision 18). An **end-of-unit prompt** (decision 19), on by default with a Study-options switch, asks "End of Ruku' 3. How did it go?" at the unit's last āyah. **Review found and fixed**: the prompt needed an Approach chosen on a card first, so a new reader never saw it (now falls back to the Study-options Approach and names it); it showed at a Juz's last *drawn* āyah even when the Juz runs on into the next surah; Ruku'/Juz/Hizb/Page are read one āyah at a time, not as a flow, so neither markers nor prompt ever appeared for them; the count ignored wider claims (a Ruku' inside an Achieved Surah read 0 of 7 where Explore shows it green); the landing page fetched all four boundary tables (~120 KB) on every open (I9) — now on first Read; the card opened with no Approach and a "No Approaches yet" strip; the prompt switch sat in `.reading-ticks`, which Mushaf greys; three marker rows stacked above 1:1 (now one row). The Builder's suite crashed on its first real run and its count check passed on any line with a 2 and a 7; now 106/0 with hand-counted Yes-Approach Surah and Juz cases, five mutations each caught. **Cost, measured**: the chip takes the Read bar to two lines at 412px English only (+33px, reading area 617 → 584px), unchanged at every other width in both languages (`main` fitted with 0.3px to spare); a marker row adds ~47px above a unit's first āyah (two rows at 360px). Ayah Card 120/0, Mushaf cards 114/0, page ref 129/0, Tajweed word tap 68/0, My Status 88/0, Hizb view 80/0, phone-width 217/0, layout NO REGRESSIONS, panel/navcheck/reading OK in both languages; behaviour: four #readBar lists and 29d's tap point updated in place, reasons recorded.)

**Previous milestone: v08.102 on `main`** (28 Sep 2026 — **Explore gains a Hizb view** (issue #342), the Owner's *"Yes, add a Hizb view in Explore too"*. The Quran level's switch is now **Juz · Surahs · Hizb** (remembered): Hizb is a wheel of 60, each pooled with the same `poolCoverageStatus()` as Juz, falling back to a direct `hizb:N` claim for a No Approach. Tapping a Hizb opens its Surah portions, each pooled over only the āyāt inside it. My Status's Hizb row now opens it. `getHizbIndex()` loads only when the view opens (I9). **Review found two faults in the Builder's own new suite, not the app**: it assumed the fixture opens on Hifz (it opens on its own "memorise"), and its "Juz level keeps two options" check tapped Surah 1 in the default Surahs view. Both fixed (74/6 → 80/0); mutations fail 4 (no pooling) and 2 (no direct-claim fallback). `quran-my-status-browser` now also checks the card's Hizb count against Explore's own list (4 = 4), 88/0. The first dispatched run worked 186 turns and pushed nothing; the second was told to push early and did. Layout.mjs 0 changed, phone-width 217/0.)

**Previous milestone: v08.101 on `main`** (28 Sep 2026 — **the Approach list's section names are bright and bold**, the Owner's *"Make the section names bright and bold"*: `.ways-group` from the dim gold #a08a52 to the heading gold #ecd49a (about 10:1 on the card), weight 700 → 800, and 2px larger at every size (phones 8 → 10px, Bangla 11.5px; tablet/PC 11px, Bangla 12.5px). No name wraps or is cut at 320–1100px in either language. `layout.mjs`: tablet/PC unchanged; on phones the scrolling page is 11px taller and the first screen keeps every Approach row. **Found the same day: an Architect comment can never start the Builder** — `claude.yml`'s `if:` refuses any comment containing "Generated by [Claude Code]", which every Architect comment must carry, so the #342 start comment ran as SKIPPED and the round sat unbuilt for 90 minutes. Start a round with a `workflow_dispatch` run (issue number + note), as the unattended Architect already does.)

**Previous milestone: v08.100 on `main`** (28 Sep 2026 — **the first three-digit version** (Owner decision 17: the 08 line continues past v08.99). **A tablet held upright shows all three landing capsules on one row**, the Owner's screenshot of a ~600px tablet showing My Status still on the bar: the switch point moved from 721px to 480px — measured, the three at natural width need 459px (en) / 380px (bn) — so from 480px "Approach the Quran in 30 ways", "Choose a Unit" and "My Status" share one line in the wheel column, 36px each, and below 480px My Status stays on the Mastery Wheel bar. `quran-my-status-browser` 86/0, `layout.mjs` 0 changed, phone-width 217/0.)

**Previous milestone: v08.99 on `main`** (28 Sep 2026 — **My Status, the Owner's fixes** (issue #341): *"A click on an approach now takes to the bottom of the approaches. How about the info pops up on the screen? Then, other approaches can be selected from pull down button?"* Tapping an Approach row or an overview slice now opens **its own card on top** (sticky header, ✕ / Escape / tap outside; the list keeps its scroll) with a **pull-down of every Approach**; the card names the Approach in full below it, because a native pull-down cuts the longest real name on a phone (347px needed, 208–300px). **By unit**: Juz of 30, Surah of 114, Ruku' of 556, Hizb of 60 — Achieved + Mastered and Started — from the SAME `poolStatus()` Explore colours with (decision 7), falling back to a direct whole-unit claim for a No Approach. The **30-Juz wheel and the Juz/Surah/Ruku' rows open Explore** on that Approach. New `tools/quran-data-pull/output/ruku-index.json` (556 rows, rebuilt byte-for-byte, independently recounted), loaded only when My Status opens (I9). **Review found the suite's expected counts computed by the very function under test** (`summarizeUnitCoverage()`) — replaced by an independent set count pinned by hand (Juz 1; Surah 2 + 1 Started; Ruku' 37 + 1; Hizb 4), plus a new check that taps the card's rows and counts what **Explore's own list** marks; mutations fail 4 / 5 / time out. Also fixed the Hizb row's bar running ~10px wide. `quran-my-status-browser` 86/0, `approach-coverage` 55/0, `explore-wbw-tab` 91/0, `layout.mjs` 0 changed, phone-width 217/0, behaviour 984/9 (baseline).)

**Previous milestone: v08.98 on `main`** (28 Sep 2026 — **four of the Owner's asks.** **(1) Notes work offline**: DOMPurify was loaded from jsDelivr, which the service worker never keeps, so with no internet a Note's body refused to render (`sanitizeNoteHtml()` fails closed). `notes.html`, `dawah.html` and `journey-map.html` now load the app's own copy, `app/vendor/purify.min.js` (DOMPurify 3.4.16). New offline case in `app-offline-boot-browser` (15/0); pointing `notes.html` back at the CDN fails 3 — **and the case had to refuse the harness's own local stand-in for the CDN URL, or it passed for a reason the Owner's phone never has.** **(2) Capsules on one row on tablet/PC**: measured, the wheel column is 336–434px and three equal capsules need ~670px, so at ≥721px `placeWheelIntroRow()` moves the row (one node, listeners kept) into `#wheelIntroBand` across the top of the card — three equal columns, 36px tall. **On a phone** even natural widths do not fit (459 vs 377px at 390px), so My Status is the Mastery Wheel bar's right-edge button again (`#myStatusBtn`, bottom margin −9 → −2px: at −9 it sat 6px inside the card) and the other two share one line. `layout.mjs`: tablet/PC unchanged; phones show 1–2 more Approach rows on the first screen. **(3) Surah banner edge to edge**: 24cqw → 30cqw, glyph 321px of the 324px text width at 390px. **(4) The Quran Foundation credit is on About only**, now outside `#app` so it shows before sign-in, with one sentence on what it covers; the line under each Tajweed page is gone (QF's terms ask for a reasonably accessible place). Also fixed: `dawah-boundary`'s deployment list lacked the word-levels file since v08.95. behaviour 984/9 (baseline), phone-width 217/0, panel/navcheck/reading clean, my-status 46/0, tajweed-font 96/0.)

**Previous milestone: v08.97 on `main`** (28 Sep 2026 — **the landing page, four of the Owner's asks.** **(1) The page scrolls on a phone**: below 721px, and only while the Approach view is the stage (`body.landing-view`, set in `setStageView()`), the body is no longer fixed to the screen height, so the header, wheel and list move up together and every Approach can fill the screen; the dock stays pinned; leaving the view scrolls back to the top. **(2) Equal capsules**: "Approach the Quran in 30 ways", "Choose a Unit" and "My Status" are one stack, each as wide as the caption and 36px tall, at every width (a row of three that wide does not fit at 1100px, measured); the heading's own My Status button is gone. **(3) The chosen unit in the wheel's centre**: the Study Quran button's second line names it ("Juz 1", "Al-Faatiha · Ruku' 1"), and after it is tapped the hub shows the name where the Ayah picker was (and where the Surah picker was, for Juz/Hizb/Page). **(4) Wheel look**: Dark (the long-standing veil, default) · Light · Colour, under the legend, remembered per browser (`getWheelLook`/`setWheelLook`). `layout.mjs`: tablet/PC byte-identical; at phone sizes the first screen shows fewer Approach rows before scrolling (0–3, was 2–5) — the intended trade, every row now reachable by scrolling the page. `behaviour` 987/6 (baseline), `phone-width-overflow` 217/0, `quran-my-status-browser` 44/0 (updated in place for the removed heading button), reading/panel/navcheck clean.)

**Previous milestone: v08.96 on `main`** (28 Sep 2026 — **the app opens with no internet** (issue #339), the Owner's report: Mushaf Tajweed worked in flight mode with Wi-Fi on, but with no internet at all the app did not open. `app/sw.js` kept only same-origin files, and every page imports the Firebase SDK from `www.gstatic.com/firebasejs/10.12.2/`, so offline the imports threw and nothing booted. It now keeps **exactly** that pinned prefix (own cache `mm-ext-v1`, cache-first, no expiry since the URL is versioned) and the Mushaf's two `raw.githubusercontent.com` files (`mm-mushaf-v1`, refreshed at most daily); nothing else from another host. Auth keeps the signed-in user and Firestore persistence (D5) serves what was last read. Offline, display fonts fall back to serif and **a Note's body is refused** (DOMPurify is CDN-loaded and fails closed) — recorded as a follow-up. New `app-offline-boot-browser` 12/0, mutation-proven three ways (no SDK handler, no Mushaf handler, all of gstatic cached). **Review found two cannot-wait checks in `service-worker.mjs`** (async `waitForFunction` predicates): one failed 1 run in 3, the other — "the new version WAITS" — could not fail; both poll now, and a skipWaiting-at-install mutant fails 3. `service-worker` 16/0 ×3, QF font suites 29/0 and 94/0.)

**Previous milestone: v08.95 on `main`** (27 Sep 2026 — **Basic Arabic and Arabic in Depth word progress is SWITCHED ON.** The Owner published `docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules` (*"Word levels rules are live."*); `firestore.rules` is synced to it (commit tagged `[already-deployed-manually]`; one condition widened to `level in ['wbw','basic','depth']`, nothing removed) and `study-word-levels-readiness.js` reads `ready: true` with a governed decision, `docs/reports/2026-09-27-word-levels-enabled.md`. The Word Card's Basic and Arabic in Depth tabs now offer Not started / Learning / Achieved per word, each in its own lane, with supervisor confirm as for Word by Word (v08.88). Three checks updated in place with the reason recorded: `quran-word-levels-rendered` now proves the closed behaviour with a routed closed copy and asserts the committed gate is open (38 → 41/0); `word-levels-real-function` asserts the real committed gate now lets a basic claim land (11/0 on the emulator against the live rules); and `rules-deployment-candidate-phase3-6` pins its two helper comparisons to the Phase 3-6 sync commit, since the word-levels deployment legitimately widened `isWordLaneCreate` (11/0, mutation still caught). `lemma-progress-real-function` and `note-foundation-real-function` re-run green against the new live rules.)

**Previous milestone: v08.94 on `main`** (27 Sep 2026 — **the Mushaf page fonts are kept on the phone for offline reading** (issue #335), permitted by the Owner's Quran Foundation Developer Console account (`docs/reports/2026-09-27-tajweed-font-permission.md`, *Update*). `app/sw.js` keeps a page's plain or Tajweed font from `verses.quran.foundation` — **only those two font paths**, nothing else on that host — once that page has actually been opened in that style; nothing is pre-downloaded (I9). They live in their **own cache, `mm-qf-fonts-v1`**, separate from the app files, so an app update never throws them away; a kept copy answers at once, even offline, and one older than 7 days is re-fetched in the background (the Developer Terms' one-week limit). Worst case if every page is opened in both styles: roughly 100–200 MB. **Review found both browser suites unable to see the worker's own requests** — in Playwright 1.56 a context route ignores a service worker's fetch unless `PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS` is set, so the Builder's 'written, not run' suite failed every case against the real network; also a race read as 'no network', a page-51 font read before it was requested, and three `waitForFunction` predicates that returned a promise and so could never wait. `mushaf-font-offline-cache-browser` 29/0, mutation-proven three ways (no handler 9 fail; no weekly refresh 2; whole host cached 2); `mushaf-tajweed-font-browser` 94/0; `service-worker` 16/0 ('Updated — tap to reload' intact); Mushaf suites clean.)

**Previous milestone: v08.93 on `main`** (27 Sep 2026 — **Tajweed colours in Mushaf view, and the Mushaf fonts from Quran Foundation** (issue #332), Owner decision 9 and the permission check `docs/reports/2026-09-27-tajweed-font-permission.md`. **(1)** The plain page fonts now load from Quran Foundation's documented CDN (`verses.quran.foundation/.../hafs/v2/`) — byte-identical to the copies in `mushaf/fonts/`, which stay for `legacy-v07/`. **(2)** Each Mushaf page has a **Tajweed colours** toggle beside its "Page N" label (≥40px, no new bar): it redraws with the QPC V4 COLRv1 font from the same CDN, loaded only when switched on, one remembered preference, plain the default; a failed load keeps the plain page and says so; a browser without COLRv1 (`CSS.supports('font-tech(color-COLRv1)')`) sees the toggle disabled with the reason. Credit "Quran fonts provided by Quran Foundation" on About and while Tajweed is on; `sw.js` still stores neither font (offline caching is the next round — the Owner holds a QF developer account). **Review found, by looking at a real Tajweed page**, the label row and credit inheriting the glyph font whose space is zero-width ("Page1", "Tajweedcolours"), and toggling on a later page sending the reader back to the unit's first page (53 → 50); both fixed, both mutation-proven in `mushaf-tajweed-font-browser` 93/0. Seven re-routed Mushaf suites clean; behaviour 987/6 (baseline); phone-width 217/0.)

**Previous milestone: v08.92 on `main`** (27 Sep 2026 — **My Status, and each Approach's own rule for whole-unit claims** (issue #328), the Owner's decisions 6–8 of 27 Sep (`docs/governance/2026-09-27-owner-decisions.md`). **(1) A Yes/No setting per Approach**, *"A claim on a bigger unit counts for each āyah inside it"*, stored as `trackables.countsForEachAyah` (absent → default list in `app/js/approach-coverage.js`: Yes for 01, 02, 03, 04, 05, 07, 08, 11) and moved by Owner/Prime on `catalogue.html` with a plain `updateDoc` that never stamps `edited`; no Rules change (the `trackables` update rule has no `hasOnly`). **(2) Explore obeys it**: a No Approach's Surah/Juz/page claim no longer floors its āyāt, and each wider wedge shows its own direct claim. **(3) My Status**: a whole-Qur'an wheel of the Approaches, each slice filled by its Achieved + Mastered share of 6,236 āyāt (Word-by-Word in words of 77,429), per-Approach stage counts, a 30-Juz wheel from the SAME pooling core Explore uses, a "studied as a whole" line for No Approaches, and See in Explore. Records are read only when it is opened (I9). **Review found**: the third capsule wrapped the caption row and cost an Approach row at four phone sizes — on phones the button now sits on the Mastery Wheel heading line (`layout.mjs` NO LAYOUT REGRESSIONS); a flat colour ramp that showed 0% and 3% slices identically (now a radial fill); names squeezed to three lines; "1 Surahs"; and three suite faults, one a cannot-fail `|| text.length > 0`. `approach-coverage` 44/0, `quran-my-status-browser` 44/0, `explore-wbw-tab` 91/0, phone-width 217/0, behaviour 984/9 (baseline). **Pre-existing, not this round's:** `quran-word-explore-rendered` 25/10 on `main` too — its checks predate the v08.53 word counter going live.)

**Previous milestone: v08.91 on `main`** (27 Sep 2026 — **the Mushaf's Surah banner is readable.** The Owner's phone screenshot: the ornamental Surah-name banner at the start of each surah in Mushaf view was *"very tiny"* — measured, the banner glyph is 3.3em wide in its own font, so at 6cqw it drew at ~20% of the page (61px of 308 at 360px) and its name was unreadable. Now 24cqw with line-height 1.1: ~79% of the page (244px at 360px, 418px at 1100px), its name at about the Bismillah's size, costing ~44px of page height at 360px. One CSS rule. Mushaf suites re-run clean: page-ref 129/0, approach-cards 114/0, ayah-action-sheet 120/0, word-card-mushaf-scroll 59/0, audio-follow-scroll 25/0.)

**Previous milestone: v08.90 on `main`** (27 Sep 2026 — **taking an Approach from Mushaf view** (issue #325), the Owner's decisions of 27 Sep (`docs/governance/2026-09-27-owner-decisions.md`). Tapping an āyah-end marker opens the Ayah Card, whose **Take an Approach** now shows all four stages — Not started · Learning · Practising · Achieved — for the chosen Approach, saved through the same `claimStatus()` path as the Track tab and staying open after each press. Tapping the top-bar Surah/āyāt reference opens a **This page** card that claims the **page as one unit** (`page:madani:N`, `subject_quran`) and never writes an āyah claim — āyah study stays separate. Each marker carries a thin ring for its status on the Approach last chosen; both cards open on that Approach. No new bar, no Rules change. **Review fixed** the pressed stage and rings depending on a read-after-write (now carried into the in-memory chunk), two 'fits one line' checks measuring the 40px button instead of its text, and a suite red on `main` since v08.89's full-screen Word Card. **Found and recorded, not changed:** the app's own āyah→page numbers and the Mushaf layout disagree by one page for 56 edge āyāt (e.g. 5:77 app 121 / Mushaf 120) — two printings of the Madani Mushaf; page claims are by number so unaffected, pinned by `mushaf-page-numbering-parity.mjs`. `mushaf-approach-cards-browser` 114/0, `quran-ayah-action-sheet-browser` 120/0, behaviour 984/9 (baseline).)

**Previous milestone: v08.89 on `main`** (27 Sep 2026 — three things from the Owner's phone test (issue #322). **(1) Mushaf view names its page** on the top bar, full screen included: `Ar-Ra'd 43 · Ibrahim 1–5`, updating as pages turn, in the reader's language with Bangla digits, from the page data the Mushaf already loads (`mushafPageAyahGroups()`, checked on all 604 real pages: 1–3 surahs each, none empty); the last page's three surahs fit at 320px in both languages. **(2) "Achieved" marks the Dictionary Word known everywhere** — the separate "Mark this word known everywhere" row is gone; a teacher's confirm/return of that Achieved confirms both. **Review narrowed the mirror**: only Achieved, or undoing this same form's own Achieved, moves the Dictionary Word — as built, pressing Learning on any other, untouched form of an already-known word would have un-known the whole word (the Builder flagged it); new check mutation-proven. **(3) The Word Card opens full screen below 900px** (sticky header with ✕ and ◀ ▶, body scrolls); desktop keeps the movable window. `quran-word-progress-rendered` 70/11 → 76/5 — the six "controls out of reach on a phone" failures are gone. Review also fixed four suite faults (a card opened on an āyah not on screen, a sticky-header assertion, the suite's own font aborts counted as page errors, a stale 'not fixed' check) and updated behaviour 33a/37a in place.)

**Previous milestone: v08.88 on `main`** (26 Sep 2026 — **Basic Arabic and Arabic in Depth claimed per word, BUILT AND GATED** (issue #320), the Owner's decision *"Claiming for basic n Depth is per word. (Because It's in WbW)"*. The Word Card's Basic and Arabic in Depth tabs get the same Not started / Learning / Achieved controls and supervisor confirm as WbW, each level stored in its own lane of `quranWordProgress`/`quranWordApprovals`, independent of WbW and of each other; no coverage line, no whole-Qur'an counter, no Activity evidence for them. **Off until the Owner publishes** `docs/governance/2026-09-26-word-levels-DEPLOYMENT-candidate.rules` (the live rules with one line widened: `level in ['wbw','basic','depth']`) and the Architect flips `study-word-levels-readiness.js`; while closed the two tabs show no controls and read/write nothing. Emulator 11/0 against the candidate (fails against the live rules, as it should); `quran-word-levels-rendered` 38/0 after review fixed three checks that read an unawaited promise and could never pass. Builder also kept lemma-wide progress on its own wbw-only level list.)

**Previous milestone: v08.87 on `main`** (26 Sep 2026 — **Ayah Card, section C part 2: Connected āyāt** (issue #318), the Owner's decision: under Related, the āyāt the reader's **own** Notes and Mapping folders connect to this one — a Note anchored here and elsewhere, or a folder filing Notes on both — each marked **Studied**, **Not studied yet** or **Not checked** (another surah not already loaded; nothing extra is read to answer it). Loaded when the card opens (I9), existing data-layer reads only, no Rules change; 40px jump rows. **Review fixed** an āyah of the open surah with no claims showing 'Not checked' instead of 'Not studied yet' (a loaded-but-empty record and an unloaded one both read as null). `ayah-connected` 13/0, `ayah-connected-browser` 49/0. Also live since v08.86: the 11 OpenITI Arabic Hadith books in Hadith → Collections.)

**Previous milestone: v08.86 on `main`** (26 Sep 2026 — **the classical Hadith books, in Arabic, in the app** (issues #314/#316). Hadith → Collections → **OpenITI — Arabic Hadith collections**: al-Muwatta', Musnad Ahmad, Sunan al-Darimi, Sahih al-Bukhari, Sahih Muslim, Ibn Majah, Abu Dawud, al-Tirmidhi, al-Nasa'i, al-Nawawi's Forty and Riyad al-Salihin — 61,676 numbered hadith, 79,526 passages. Book → chapter (first 100, 'Show more', and 'Go to hadith number') → passages: each hadith with its own number; the book's own chapter words unnumbered; Muslim and the Forty, which carry no hadith numbers in this edition, as 'Passage N (position in this edition)'. 'Source: OpenITI (CC BY-NC-SA 4.0)' on every card; only the opened chapter's file loads. **Review found the splitter silently dropping** every paragraph before a chapter's first numbered hadith (9,090 in al-Muwatta', Malik's own rulings among them) behind a check that compared the parser with itself — fixed and now checked against the raw files independently; also stray brackets in 20 chapter titles, raw 'PageV01P001' markers, and keyboard focus landing in the wrong section.)

**Previous milestone: v08.85 on `main`** (26 Sep 2026 — **study a HadeethEnc hadith like an āyah** (issue #311). Each card has **Note** (opens My Notes on that hadith), **Bookmark** (★; a bookmark reopens the Hadith page on that hadith) and **Studied**, all keyed `hadith:hadeethenc:<id>` (Owner decision 7) through the existing shared Notes/bookmark/records functions — no new data layer, no Rules change. A person who may only view sees the three actions disabled with the reason in words. **Review fixed**: reopening a card showed the OLD bookmark/Studied state (now remembered after saving); a teacher's Studied claim was recorded as the student's own (now the acting person, as `topic-study.js` does); 16 Bangla test faults; and `study-note-binding.mjs`, red on main since v08.66 (`imported` provenance), now reads its names from ADR-009. Also on main since v08.84: **OpenITI**'s licence granted and 11 Hadith books pulled verbatim, Arabic, 41.5 MB, hash-pinned.)

**Previous milestone: v08.84 on `main`** (26 Sep 2026 — two things. **(1) Real hadith in the Hadith module** (issue #309): the Collections tab now opens on **HadeethEnc — Encyclopedia of Translated Hadiths**, browsed by topic (7 roots → sub-topics → hadiths); each card shows the Arabic, the reader's language (English when Bangla is missing, **labelled** as a fallback), grade, narrator, explanation and **Source: HadeethEnc.com**. Only the opened topic's file loads. The synthetic pilot stays below it under its own notice. **Review fixed** the suite (it never ran clean), moved the 'not real narrations' notice off the real text, and made the Source link readable (3.18 → 6.26:1) and tappable (24.6 → 49.6px). Notes/bookmark/Studied are the next round: the Owner chose `hadith:hadeethenc:<id>` as the permanent key (decision 7). **(2) Dictionary Word progress is ON**: the Owner published the rules; `firestore.rules` synced (`[already-deployed-manually]`), gate opened by governed decision, 'Lemma' renamed **Dictionary Word** on screen. **Review found opening a Word Card wrote a counter** — a viewer without record rights would have seen an error for looking; viewing never writes now.)

**Previous milestone: v08.83 on `main`** (26 Sep 2026 — **the Word Card's whole-Qur'an numbers**, issue #303: the card shows words known out of 77,429, the percentage, this word's own share and how much learning it would add. The Owner's rule *"knowing a word marks all its forms, confirmed once for all"* is **BUILT AND GATED** behind `study-lemma-progress-readiness.js` (`ready: false`) until the Owner publishes `docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules`. **Review caught four real defects**: a missing import that broke the card, a race that showed another word's forms, a cache that was thrown away after every tap, and a first-use seeding step that would have read 4,366 documents for a common word — now bounded (≤50 āyāt read directly, else one paged list of the person's own entries).)

**Previous milestone: v08.82 on `main`** (26 Sep 2026 — three things. **(1) Ayah Card, section C part 1: Related āyāt**, the Owner's own definition: āyāt sharing this āyah's rarer words (each shared lemma weighs log(total/frequency); lemmas above 250 occurrences ignored), plus āyāt in the same QCR collection or cited by the same Asma Name — for 2:255: 3:2 via QCR + Al-Qayyūm, 40:65 via Al-Ḥayy, then 20:110, 3:2… by shared words. Loaded when the card opens (I9), each row a 40px jump button. `ayah-related-browser.mjs` 43/0. **(2) Asma classification rename fix**, the Owner's report *"only works for 'Group' even after selecting from other drop-down"*: choosing a dropdown's own name line fires no change and an empty classification had nothing else to pick, so ✎C always renamed Group. Every dropdown now has "▸ Open this classification", the current one is marked and ✎C/🗄C name it; `asma-classification-rename-browser.mjs` 20/0, fails on the old build. **(3) Issue #301, lemma-level word progress, UNINVOKED**: `quran-lemma-progress.js`/`-data.js`, two new collections `quranLemmaProgress`/`quranLemmaApprovals`, and a one-paste DEPLOYMENT candidate (`docs/governance/2026-09-26-lemma-progress-DEPLOYMENT-candidate.rules`, live rules + additions only). **Review found the real-function emulator suite failing** — its confirm step omitted `isSupervisor`, so the module's own check refused it; the Builder could not run the emulator. Fixed; 8/8 against the real rules. Worst case to keep the running total exact: up to 4,366 reads once, for the most frequent lemma — to be addressed before wiring.)

**Previous milestone: v08.81 on `main`** (26 Sep 2026 — the Owner: *"Clicking on a word displays a WbW card; it only works in Mushaf view. Why not in read and study view too?"* Because with **Tajweed colours on** the flowing Arabic was one unsplit block: tajweed colour runs cross word boundaries (2:2's idgham "دًى ل") and nest. The markup is now read into letters, each with its stack of classes, split at spaces, and each word rebuilt — a run crossing a break is closed and reopened with the same class. **6,233 of 6,236 āyāt split with every letter's class identical** to the unsplit rendering (8:6, 32:3, 37:130 keep the block); 2:2's screenshot is **pixel-identical** before and after. The words are focusable inline spans with role=button (Enter/Space open them), **not** `<button>`s: a button lays out as an inline-block and pushed 2:2's āyah-end number to a second line in Bangla at 390px. `tajweed-word-split.mjs` 11/0, `tajweed-word-tap-browser.mjs` 68/0 — fails when the words are real buttons. Built by the Architect: the Builder's run for #294 was dropped from the one-deep queue, and a `workflow_dispatch` retry ran 5 minutes and produced nothing.)

**Previous milestone: v08.80 on `main`** (26 Sep 2026 — **the Ayah Card, part 1** (issue #295), the Owner's *"Clicking an Ayah in all views should bring a Ayah Card"*. It opens from the Mushaf āyah-end marker, the āyah number in regular Read and Note view (now a real button), and the Word Card's "This āyah ⋯". **A. Actions**: every v08.75 item plus **Take an Approach** (a pull-down claiming through the same path as the Note view's Track tab) and **Make a poster**. **B. Status**: the 30 Approach colours for this āyah with **See on the wheel**, **Word by Word — Known X of Y words** with the known words marked, and **Hifz** (Approach 2). **C. Info** is a marked placeholder; the Owner's Related/Connected decision is recorded on #295. **Review caught** the Word-by-Word chips printing white-on-cream (invisible — the app's button rule; now 9.9:1 with a committed contrast check), a 30px close button, and the Mushaf marker's tap area at 33px on a 320px phone — widened to ≥40px with words kept above it so the neighbouring word still wins its own taps, checked on the real Mushaf.)

**Previous milestone: v08.79 on `main`** (25 Sep 2026 — **the WordPress and Evernote importers are SWITCHED ON.** The Owner published `docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules` (*"Rules are published."*); `firestore.rules` is synced to that exact file (commit tagged `[already-deployed-manually]`, so no redundant approval) and `study-wordpress-import-readiness.js` reads `ready: true` with a governed decision, `docs/reports/2026-09-25-wordpress-import-enabled.md`. The Import button on `import-notes.html` is live for both .xml and .enex. Two "not yet deployed" checks updated in place with the reason recorded; every emulator suite that runs the live rules re-run green.)

**Previous milestone: v08.78 on `main`** (25 Sep 2026 — **no page scrolls sideways on a phone** (issue #293). A sweep of every page at 320/360/390/412px in both languages found five 411–747px wide: About, Catalogue, Monitor, Records and People. Below 600px a table now scrolls inside its own box (desktop untouched); People's Invite box lets go of min-content and only an over-long email breaks; the tenant picker and Records' domain-tag box fit the screen. New `phone-width-overflow.mjs` (27 pages × 4 widths × 2 languages): 39 failures before, 0 after. **The first fix tried broke every invite cell mid-word, "Copy link" one letter per line — found by LOOKING at the screenshot**, not by any number. The Architect built this round: the Builder's run was dropped from its one-deep queue when later issues were opened.)

**Previous milestone: v08.77 on `main`** (25 Sep 2026 — **speed part 7**, issue #291: the last five pages with their own startup code are now measured and cut — My Notes **3** database round trips in a row (5 before), Bookmarks **3** (5), People **3** (6), Classes **2** (6+), Dawah **3** (5). Every page `measure.mjs` covers now needs 2–4. No new query shape: Classes reuses v08.76's one-query enrolment read, and My Notes/Dawah take the tenant document from the membership load instead of reading it again. Review opened all five pages in a real browser in both languages: no errors, no stuck "Loading…". It also found People's Invite box 470px wide at phone width — **already on `main`**, not this round's, fixed separately.)

**Previous milestone: v08.76 on `main`** (25 Sep 2026 — **speed part 6b**, issue #288: Homework is usable after **3** database round trips in a row (9 before), Curriculum **3** (9), Course Offers **2** (8). Each assignment card used to read its own submission one at a time; one query per person now fetches them all, and Course Offers reads the tenant's enrolments once, so switching the person on that page costs **no reads at all**. Review ran the three pages in a real browser in both languages with a submitted and an unsubmitted assignment seeded — each card showed its own status — and checked the two new queries against the live Rules (`canRecordFor` on tenant+person, `anyMemberOf` on tenant): both allowed, no Rules change.)

**Previous milestone: v08.75 on `main`** (25 Sep 2026 — the Owner: *"While on mushaf view … click on a Ayah … attach this Ayah to a Asmaul Husna, a single/ multiple folder (mapping) a QCR, a bookmark, or take note"* (issue #286). Tapping an āyah's end marker in the Mushaf now opens a **This āyah** menu: Bookmark, Note & more, Asma ul Husna Name(s), QCR collection(s), **File in folder(s)** (ticks for several folders at once; files the reader's Note on that āyah, creating one if there is none; unticking retires the filing, nothing deleted), Play, Copy, Share. The Word Card gains a **This āyah ⋯** button to the same menu. No Rules change. **Review found the builder's synthetic 21-character marker running off the page** and failing its own hit-test for a reason the real one-glyph marker never has; a real-Mushaf probe confirmed every visible marker opens the right āyah at 360/390/1100px.)

**Previous milestone: v08.74 on `main`** (25 Sep 2026 — **speed part 6a**,
issue #285: **Monitor** 8 → 3 database round trips in a row (1.18s → 0.58s)
and **Catalogue** 11 → 2 (1.60s → 0.43s). Catalogue no longer runs its
seeding routine and three repair checks on every open — only when what it just
read shows something missing. **Review caught that check ignoring modules**, so
a platform module added later would never have been created;
`catalogue-startup-seed.mjs` pins all three cases.)

**Previous milestone: v08.73 on `main`** (25 Sep 2026 — **speed part 5**,
issue #282: Mapping My Journey at the Owner's real import size (1,464
folders, 1,083 Notes, 2,319 filings) is usable in **2.0s instead of 3.9s** on
a fast-4G phone (29 → 11 sequential round trips): the folder tree draws first,
Notes and filings follow over parallel id-range shards, with a fallback to the
old single cursor if production ever wants an index. **Review caught
backticks in the stub's template literal a second time** — `stub-parity.mjs`
now fails by name when the stub does not parse.)

**Previous milestone: v08.72 on `main`** (25 Sep 2026 — **speed part 4**,
issue #280: Deen Study, Health and Asma ul Husna now need **4** database
round trips in sequence before they are usable (6 before), Records **3** (5), and Quran
Study stays at 3. It is the same fix as v08.71: pick the tenant from roles alone,
and read tenant documents alongside the page's own reads.
`module-startup-reads.mjs` and `quranrevival-startup-reads.mjs` pin every
limit.)

**Previous milestone: v08.71 on `main`** (25 Sep 2026 — **speed part 3**,
issue #278: Quran Study is usable after **3 database round trips in a
row** (4 in v08.70, 7 this morning). The active tenant is picked from the
membership roles alone and the tenant documents are read alongside
`tenantPeople`/`trackables`; every other page keeps the old combined
`getMyMemberships()`. `session-context-two-tenant.mjs` guards tenant choice
and stale ids. **The Builder pushed first this time** — the instruction
added after #276's lost run worked.)

**Previous milestone: v08.70 on `main`** (25 Sep 2026 — **speed part 2**,
issue #276: Quran Study is usable after **4 database round trips in a row**
(5 in v08.69, 7 before it). The last one was the Approach-name sync reading
the whole `trackables` collection again straight after the startup wave had
read it; it now reuses those rows. `quranrevival-startup-reads.mjs` pins
both limits. The Import page's counts are in Bangla digits for Bangla readers.
**The Architect built this round**: the Builder's run did the work and ran
out of time before pushing, so all of it was lost — push first, test after.)

**Previous milestone: v08.69 on `main`** (25 Sep 2026 — **load speed,
issue #272**, on the Owner's *"max 3 seconds"*. The app now keeps its own
files on the phone (`app/sw.js`): **every open after the first is usable in
1.1s on fast 4G and 1.3s on slow 4G** at phone processor speed (it was 3.1s
and 12.4s), with 0 app files fetched. A new version waits for *"Updated —
tap to reload"* so a page never runs on two versions' files. Bangla loads
only for Bangla readers; `version.js` is one line (its history is in
`docs/governance/version-history.md`). **The first-ever open is still over
3s** — about 3.4s on fast 4G — and the remaining cut, a minified build,
needs the Owner to switch GitHub Pages to publish from an Action. **Review
caught the Builder's branch overwriting v08.68 again** (the import page, the
Bangla labels and `version.js`), plus a worker that took over mid-session
and only helped from the third open.)

**Previous milestone: v08.68 on `main`** (25 Sep 2026 — **the Evernote
importer is BUILT AND GATED** (issue #271). The Import page now takes a
WordPress export (.xml) or one or more Evernote notebooks (.enex): each
notebook becomes a folder, each note a Note with its original dates, linked
to its āyah where the title or opening names one. Pictures are not stored
yet, just named placeholders recorded for a later move. It is behind the
same gate as WordPress and **needs no new Rules** beyond the v08.66
DEPLOYMENT candidate the Owner has still to publish. The Builder applied
v08.66's lesson unprompted: existence is checked through paged owner lists,
never a read of a missing id.)

**Previous milestone: v08.67 on `main`** (25 Sep 2026 — the Owner's
decision *"Path view: branching with links"*, built (issue #267). Each
folder is a branch, its Notes stops along it by original date; a Note filed
in several folders shows on every branch with a 🔗 badge that highlights all
its places and draws the lines between them. Collapsed below two levels,
"+N more" past 20 stops; 1,500 folders / 1,100 Notes render in ~1.1s.
Review fixed the view toggle wrapping "Path" onto its own line at phone
width (v08.66's ⋯ menu), and **the harness now serves DOMPurify from a
vendored copy** — the sandbox proxy breaks the CDN's certificate, so every
test of a page that renders Note bodies had been failing for a reason the
Owner never meets.)

**Previous milestone: v08.66 on `main`** (25 Sep 2026 — **the
mappingmyjourney.com importer is BUILT AND GATED** (issue #265). New
`app/import-notes.html`, reached from Mapping My Journey's ⋯ menu: choose
the WordPress export, see a preview, press Import. **Import stays off until
the Owner publishes** `docs/governance/2026-09-25-wordpress-import-DEPLOYMENT-candidate.rules`
(one whole-file paste; the guide is beside it) and the Architect flips
`study-wordpress-import-readiness.js`. **Review caught a first-run-fatal
defect**: the importer checked "already there?" by reading each id, and
under the deployed rules a read of a missing document is DENIED — proven on
the emulator, fixed by paged owner lists. The Owner's real export through the
real importer on the real rules: 1,464 folders, 1,083 Notes, 550 āyah links,
2,319 filings, 0 refused, re-run creates nothing. **Lesson, third time:
the v08.56 rule — never `get` a document that may not exist — applies to
every new writer, and only a real-function emulator run catches it.**)

**Previous milestone: v08.65 on `main`** (25 Sep 2026 — the Owner: *"Look
at the coloring of each segment of a word. Make this."* The Word Card now
colours each part of an Arabic word (particle, person, stem…) from the
Quranic Arabic Corpus, and colours the matching words of the English
meaning. It has a legend and a **Colour word parts** switch, which is on by
default. The data is packaged per surah (99.64% of words aligned; the rest
show uncoloured) and loaded only when a Word Card opens (issue #263). Every
colour measures at least 4.5:1 against the card.)

**Previous milestone: v08.64 on `main`** (25 Sep 2026 — the Owner: *"Yes,
make WbW its own tab in Explore."* Explore gains a **Word by Word** tab
(issue #261): a Qur'an wheel of 30 Juz coloured by words known, a Juz list
with percentages, a Juz's Surahs, and a Surah's Ruku' breakdown. The Quran
tab's Approach | Word by Word toggle (#206), which the Owner could not find,
is gone; the gold ring stays. **Review caught the builder deleting other
rounds' work again**: 17 Bangla strings for the v08.63 folder tree and 127
lines of `CHANGELOG.md`, both restored. `explore-wbw-tab.mjs` 91/0.
**The v08.63 lesson still applies: check a builder's branch for deletions
against current `main`, especially in `bn.js` and `CHANGELOG.md`.**)

**Previous milestone: v08.63 on `main`** (25 Sep 2026 — Mapping My Journey's
Folders view becomes a Siyagah-style folder tree, issue #259: expand/collapse,
subtree Note counts, display-only `(01.02)` numbering, 📍 new-folder target,
inline rename, Remove (retire only), drag plus ▲▼/Move to…, Notes as leaves,
search, text size. **Paged reads lift the 100-Note cap** with no Rules change.
**Review caught the builder silently deleting v08.62's Back button and
CHANGELOG entry** — its branch was cut before v08.62 and the file rewritten
wholesale; both restored. Also fixed: a backtick inside the stub's template
literal that broke every browser suite, and a missing `startAfter` in the
emulator suite's import rewrite (30/30 against the live rules).
**Lesson: diff a builder's branch against CURRENT `main` for deletions, not
just the base it was cut from.**)

**Previous milestone: v08.62 on `main`** (25 Sep 2026 — the Owner: *"There's
no go back button to exit from Mapping view."* `journey-map.html` gains
`#backLink`: `history.back()` when the reader came from a page of this app,
otherwise its plain href to Quran Study. 40px, both languages, outside `#app`
so it shows before sign-in resolves. New `journey-map-back.mjs` 38/0 in a real
browser, fails with the change removed.)

**Previous milestone: v08.61 on `main`** (25 Sep 2026 — the Owner:
*"Folder should be built/accessible from the Mapping tab."* The dock's fourth
tab, **Mapping My Journey**, a disabled "Coming later" placeholder since
before Phase 6, now opens `journey-map.html#folders`; the Note view's ⋯ item
does the same (issue #257). `journey-map.html` reads only a plain
`#folders`/`#timeline`/`#path` hash. Three suites' "still disabled" checks
inverted in place, reasons recorded; `layout.mjs`/`navcheck.mjs` clean.
**Owner decisions recorded the same day:** the Path view is to be
**branching with links** (a Note filed in two folders appears on both
branches, linked); the folders are to gain the functions of Siyagah's
"My Notebooks" dialog, pending that app's own Architect's written answers.)

**Previous milestone: v08.60 on `main`** (24 Sep 2026 — the Owner asked,
before closing old draft PR #37, whether its "can't scroll" defect still
happens. **The severe form is gone** (with "Page by page" on, `#ayahPanels`
now does the scrolling), **but a residue was real and is fixed**:
`body.read-sideways #studyScreen { height: 100% }` on a content-box with 1rem
padding, a border and a 0.5rem margin was 42px taller than `#readScroll`
(overflow hidden in this mode), so the bottom ~10px of the last line of a long
āyah could never be scrolled into view — measured on 2:282 at five widths, both
languages. `box-sizing: border-box; height: calc(100% - 0.5rem)` (100% in
immersive) — the last line now clears the edge by ~32px everywhere. New
`read-sideways-last-line.mjs` 24/0, 12 failing with the old CSS. PR #37 closed
as superseded. **Lesson: `height: 100%` on a padded, margined content-box is
never 100% — measure the container's own scroll overflow, not the child's.**)

**Previous milestone: v08.59 on `main`** (24 Sep 2026 — MAP v4 Phase 7
**P7-B, the Dawah screens, BUILT AND SWITCHED ON** (issue #250).
`app/dawah.html`: My pages (Share for an adult / Send for approval for a child,
via `authorNeedsDawahApproval()`; Remove; Print; a returned page's reason),
Waiting for my approval (guardian/teacher/owner/prime; Approve/Return; a child
never approves their own page), Madrasah pages (shared, read-only). Print is a
clean `@media print` page, `bodyHtml` only through `sanitizeNoteHtml()`.
`notes.html` gains "Make a printable page"; Home ▾ gains Dawah. The Owner had
already published the Dawah Rules ("Dawah rules are live"; `firestore.rules`
synced in PR #253), so `app/js/dawah-readiness.js` is enabled in this same
release by governed decision (`docs/reports/2026-09-24-dawah-pages-enabled.md`).
Real browser, 360/1100px, both languages: closed = 0 `dawahPages` calls and the
explanation shown; open = 3 list queries, no errors, no overflow.
`dawah-boundary` 21/0 (its readiness check updated in place, reason recorded),
`dawah-screen` 23/0. **Lesson: the builder's CHANGELOG edit overwrote an
earlier entry rather than appending** — rebuilt as `main`'s log plus the new
entry only; check a shared log's diff for deletions, not just additions.)

**Previous milestone: v08.58 on `main`** (24 Sep 2026 — **a second live
defect, same class as v08.56: Mapping My Journey could not read folders.** The
deployed `listIsBounded()` refuses any Note-Foundation list above 100, and
`listNoteFoldersForOwner()` asked for **500** — so the folder tree on open, and
every create-with-parent/move/retire that reads it first, was denied — while
`journey-map-service.js` asked for `MAX_PLACEMENTS_PER_READ + 1` = **101** to
detect truncation, denying every folder's contents. Fixed in code, no Rules
publish (100 and 99). Found by the builder's
`journey-map-real-function.rules.test.mjs` (issue #247): 26/26 against the live
`firestore.rules`, 0 with the old code. **Lesson: a "fetch one more to detect
truncation" probe must stay inside the server's own cap — the cap is on the
number SENT, not the number shown.** Only the Note-Foundation collections carry
the cap; the evidence (201) and word-progress (300) reads are unaffected.)

**Previous milestone: v08.57 on `main`** (24 Sep 2026 — the Owner's report
"app takes years to open" MEASURED first: the page is usable in ~0.4s under
the harness, but **two opening splashes played back to back on every open by
default — about 21 seconds, with no way past them.** `app/js/splash.js`: an
unset preference now means "Once a day" (a chosen "Every time" is kept), a tap
anywhere skips an opener, and "never" — which `harness.mjs` has always
written, believing it switched them off — now really does. Root `index.html`
goes straight to `/app/quranrevival.html`. `splash-skip.mjs` 11/0,
mutation-proven. **Lesson: when someone says "slow", time what they actually
wait through before measuring bytes.**)

**Previous milestone: v08.56 on `main`** (24 Sep 2026 — **a live defect
fixed: the Notes screen (v08.47) could never save a Note.** Found by the
builder's new suite `tools/firestore-emulator/note-foundation-real-function.
rules.test.mjs` (issue #242), the first to run the REAL `note-foundation.js`
functions against the REAL Rules engine. Two causes in the data layer, fixed
in code with **no Rules publish needed**: (1) `createPermanentNote()` and
`createNoteSource()` pre-read the document they were about to create, and the
deployed `allow get` evaluates `resource.data.*` — on a document that does not
exist `resource` is null, an evaluation error that denies the whole
transaction; the pre-reads are gone (ids are random UUIDs). (2) The Note's
birth-time `noteSources` link was written in the same transaction as the Note,
but the deployed REL-01 check uses `exists()`/`get()`, which see the database
BEFORE the commit — so every Note born attached to a Study Unit, i.e. every
Note `notes.html` creates, was refused. The link is now a second commit after
the Note; if it fails the reader is told the Note itself was saved (I15).
Suite 5/5 against the Phase 5 candidate AND the live `firestore.rules`; fails
with the old code (stash proof). **Lesson worth keeping: a client `get` of a
document that may not exist is DENIED, not empty, under any rule reading
`resource.data` — and `exists()`/`get()` in a create rule cannot see a sibling
written in the same commit; only `existsAfter()`/`getAfter()` can.** A Rules
candidate switching REL-01 to `getAfter()` would restore the single-commit
shape; not needed and not drafted.)

**Previous milestone: v08.55 on `main`** (24 Sep 2026 — MAP v4 Phase 4
P4-F: Monitor's weekly view gains a read-only **"Study activity this week"**
section for the selected student (issues #230/#238), showing the ADR-008
evidence rows recorded since v08.34 — Reading, Listening, Journaling (both
Note events collapsed into one kind) and Word-by-Word — through P4-E's
`listStudyActivityEvidence()`, the first page ever to call it. Units print
through `unitKeyLabel()`, never a raw key; empty state and truncation note
included; month view and whole-roster mode do not read it. **ADR-003 kept by
construction**: plain text only, no link, button or claim/confirm
affordance, asserted on the rendered markup. `study-activity-evidence-
boundary.mjs` updated in place with the reason recorded (27 → 28, mutations
11 → 13): the WRITER invariant is exactly as strict as before; the store's
importer set widens by exactly `monitor.js`, and a dedicated check pins
`monitor.js` to the reader alone. New `monitor-study-activity.mjs`, 12/0.
No Rules/index change — the evidence read rule has been deployed since 22
Sep. Layout not measured in a real browser; a real-phone look is the
substitute.)

**Previous milestone: v08.54 on `main`** (24 Sep 2026 — MAP v4 Phase 6
P6-G: Mapping My Journey's Folders view can now rename, reorder, move and
remove a person's own folders and reorder the Notes filed in one (issues
#229 and #234), wired through the five `journey-map-service.js` wrappers
the deployed Rules already authorised. **The Architect's review caught a
real defect before merge**: every folder and filing is created at
`order: 0`, so the builder's first ▲▼ (swap the two neighbours' values)
wrote two documents and changed nothing; its own "two-value SWAP" check
passed against the no-op. Fixed with a pure `planReorder()` (renumber by
display position, write only what changed — v08.01's `reorderTrackables()`
shape) and `nextOrder()` at creation; the new checks run the OLD swap as a
mutation control. `journey-map-screen.mjs` 33/0, `journey-map-boundary.mjs`
17/0. **Lesson worth keeping: a reorder check must assert the DISPLAY ORDER
moved, not that writes happened.** Layout not measured in a real browser
(no Playwright in the builder sandbox); a real-phone look is the substitute.)

**Previous milestone: v08.53 on `main`** (24 Sep 2026 — the Word-by-Word
whole-Qur'an/Juz percentage counter (issue #206, built and gated in v08.42)
is SWITCHED ON. The Owner published its Rules the same day and, asked
"shall I switch it on now so you can see it and try it?", answered "Yes,
switch it on" — replacing the earlier plan to wait for an "it works"
message first, because the Owner had looked for the feature and correctly
seen nothing while it was gated invisible. `study-wbw-total-readiness.js`
reads `ready: true` with a governed decision; the ledger's
`wbwTotalPersistenceReadiness` block agrees; `quran-word-total-boundary.mjs`
updated in place, reason recorded (25/0). The running total starts at 0
for everyone — words already known before today count only once their
state next changes; no backfill was performed. See
`docs/reports/2026-09-24-wbw-total-counter-enabled.md`.

**Also 24 Sep 2026 — Owner decisions recorded by the MMSA Architect:**
Mapping My Journey keeps ALL THREE views permanently behind its toggle (no
choice pending). MAP v4 Phases 7–8 (Dawah, Share/Media) product answers:
a Dawah piece is visible **inside the Madrasah only**; its form is a
**printable page**; a **child's** piece needs a guardian/teacher's approval
before it is shared, an adult's does not. The MAP v4 source document is
still not in this repository, so these Owner answers ARE the Phase 7–8
definition until it is supplied.

**Previous milestone: v08.52 on `main`** (23 Sep 2026 — Word Card: Mushaf
audio-follow/word-card scroll fixes, a real race-condition fix, three
further cross-surah scroll-retarget sites, and the Note-view-origin path
investigated with no defect found, issue #113, PR #139, four consolidated
task-bridge rounds).

**(1) A genuine PRE-EXISTING race, found and fixed**:
`renderMushafPages()` was re-entrant-unsafe — `navigateToAyah()`'s own
surah-change branch can call `renderStudyScreen()` twice in quick
succession, and a stale first call's still-in-flight `renderPage()` (font
loads) could append into a container a second call had already reset,
doubling pages and corrupting `wordRegistry`. Fixed with a monotonic
generation token (`renderGeneration`), checked after every `await` inside
`renderPage()`, before either `wordRegistry` or the container is touched
— the same shape this codebase's own `quranWordCardRequest` counter
already uses.

**(2)** `setActiveAyah()` (the audio/drill "follow the recitation"
primitive) used `inline: "nearest"`, which this round's own
synthetic-fixture testing measured as **never actually scrolling
`#pageViewContainer` at all** (`scroll-snap-type: x mandatory` +
`direction: rtl`) — the same defect class PR #138 already fixed for the
word-card jump path. Fixed to `inline: "start"`, matching its sibling
exactly.

**(3)** `scrollFlowToCurrentAyah()` now covers Mushaf mode too
(previously a no-op there) via a new `scrollToAyahIfRendered()` primitive
and a stashed `flowRenderPromise` the caller awaits before targeting the
destination.

**(4)** Three further cross-surah trigger points (`stepUnit()`,
`goToUnitNumber()`, `surahSelect`) now call `scrollFlowToCurrentAyah()`
at their own tail, closing the same stale-`scrollLeft` defect PR #138
fixed for the word-card jump, reproduced via three independent triggers.
`ayahSelect` needs no matching call — structurally proven never
interactable while the flow strip is visible.

**(5)** The Note-view-origin return path was re-investigated and
confirmed structurally different from the flow-mode case: no defect
found.

**Five new suites**: `quran-flow-step-nav.mjs` (32),
`quran-mushaf-audio-follow-scroll.mjs` (25),
`quran-word-card-mushaf-scroll.mjs` (59),
`quran-word-card-note-origin-return.mjs` (51),
`quran-surah-select-scroll-retarget.mjs` (38) — 205 checks. Three
pre-existing regression suites re-run clean: `quran-word-card-return.mjs`
55, `quran-word-card-flow-nav.mjs` 19, `quran-word-card-popup.mjs` 22. A
real, unrelated Range/surah-crossing content-correctness gap remains
flagged, not fixed. No new translation string, no Firestore write/Rule/
index. **Independently re-verified by the Architect before merging**:
fresh full-history checkout, retargeted from its stale stacked base onto
`main` and merged current `main` in (one real import-list conflict,
resolved by combining both additive import sets — no logic conflict),
all 11 governance suites clean, all five new suites plus all three
regression suites re-run matching claimed counts exactly (301 checks
total). Allocated by the MMSA Architect.

**Previous milestone: v08.51 on `main`** (23 Sep 2026 — Health Atlas:
organ Type pill parity, issue #115, PR #152. The v02.04 source's own
organ "Type" pill (`organ.partType` — Organ/Vein/Artery/Nerve/Tissue/
Gland/Duct) was in the preserved dataset since foundation tranche 1 and
read by nothing. A closed-set anatomical classification, the same class
of field as the already-ported `role`/`system` — never a dose, nutrient
amount, activity recommendation or remedy. Ported faithfully as a small
pill next to each organ's name in the Body Systems list. **Measured with
the real longest name in the dataset** ("Vena Cava (Superior & Inferior)",
a Vein — CLAUDE.md's own standing lesson against measuring with short
fixture content) at desktop/tablet/phone before shipping — the name+pill
share one `flex-wrap` group rather than a `nowrap` line, so the worst case
wraps the pill onto its own line instead of truncating the name or
overflowing the row (the other standing lesson: `nowrap`+`ellipsis` fails
silently). Zero horizontal page overflow at any width. 4 new committed
browser checks (`body-systems-parity-browser.mjs` 16 → 20), a new
closed-set `data-integrity` assertion (21 → 22), a new `view-boundary`
positive control (14 → 15). **A repository-wide `tools/md2report.py`
fenced-code/link-flattening defect** (affecting all 82 report `.md`/
`.html` pairs) was independently confirmed cross-module, read-only, not
fixed — needs Master Architect authorisation. No protected path touched,
no Firestore write/Rule/index. **Independently re-verified by the
Architect before merging**: fresh full-history checkout, retargeted from
its stale stacked base onto `main` and merged current `main` in (clean),
all 11 governance suites clean, all 19 runnable Health-owned suites clean
matching the PR's own claimed numbers exactly. Allocated by the MMSA
Architect.

**Previous milestone: v08.50 on `main`** (23 Sep 2026 — Health Atlas:
Foods and Conditions each gain a text search box, issue #115, PR #151,
matching the source app's own per-tab filter. **Deliberately narrower
than the source's own `matches()`** (which does
`JSON.stringify(item).toLowerCase().includes(term)` — the whole
serialized item, excluded fields included) — `matchesFoodSearch`/
`matchesDiseaseSearch` are scoped to exactly the fields this view already
renders, so a search term present only in an excluded field (a real drug
name in a real disease's `.remedies`) cannot surface a false hit, proven
by two checks against the real rendered page. Age Groups gets no search
box, matching the source (it has none there either). **The still-missing
Lifestyle tab was re-investigated under Gate A/B and the existing
deferral reasoning re-confirmed, not overridden** — unlike Foods/
Diseases/Age Groups, the Lifestyle dataset has no safe structural
remainder once its activities/food/avoid recommendation content is
excluded, and no new field-level split was found. New
`more-search-browser.mjs` suite, 12 checks. **A repository-wide
report-generator defect was found and flagged, not fixed**:
`tools/md2report.py`'s fenced-code-block/link handling flattens every
report's `.html` twin, checked against all 82 `.md`/`.html` pairs and
confirmed repository-wide, not Health-specific — only the one report this
round's own task named was hand-corrected; the shared-tooling fix needs
Master Architect authorisation. No protected path touched, no Firestore
write/Rule/index. **Independently re-verified by the Architect before
merging**: fresh full-history checkout, retargeted from its stale stacked
base onto `main` and merged current `main` in (clean), all 11 governance
suites clean, all 19 runnable Health-owned suites clean including the new
suite 12/12. Allocated by the MMSA Architect.

**Previous milestone: v08.49 on `main`** (23 Sep 2026 — Hadith: book/
chapter row headings get a real `lang`/`dir` attribute, issue #114, PR
#153. Every book/chapter row's own native-script heading
(`.hadith-row-heading`, real Arabic text) rendered with **no `lang`/`dir`
attribute** — `getComputedStyle().direction` still read `"rtl"` (Unicode
Bidi auto-detects a run of Arabic characters), which is exactly why no
sighted or screenshot check ever caught it, but `lang` has no such
fallback: a screen reader read every book/chapter heading in the page's
UI-language voice (English/Bangla) instead of Arabic. Every other
Arabic-script surface this component renders (the occurrence card's
source paragraph, the commentary panel's Arabic title) already stamped
`lang`/`dir`; only these two call sites did not. **Fix**: one
`rawHeadingSpan()` helper stamping `lang = SOURCE_LANGUAGE` (the module's
own existing constant) and `dir = "rtl"`, covering both edition shapes
(with and without a chapter level) through one function. Zero new
translatable strings. 3 new checks in `hadith-source-navigation-
browser.mjs` (47 → 50). **Independently re-verified by the Architect
before merging**: fresh full-history checkout, retargeted from its stale
stacked base onto `main` and merged current `main` in (clean), all 11
governance suites clean, all 5 Hadith-owned data suites clean,
`hadith-source-navigation-browser.mjs` 50/50 in both languages, and
**mutation-proven**: reverting the fix fails exactly the 3 new checks
(47/50). No protected path touched. Allocated by the MMSA Architect.

**Previous milestone: v08.48 on `main`** (23 Sep 2026 — Word Card: the
flow-mode cross-surah navigation gap PR #135 flagged is fixed, issue
#113, PR #138. Following a lemma occurrence into a different surah in
Whole Surah flow mode left the reader on the arrival surah's own page at
the SAME scroll offset as the origin āyah — not the tapped word, which
could be measurably off-screen — because raw `scrollLeft` is a property
of the container, not of whichever surah's content it currently holds,
and a browser does not reset it when `renderFlowView()` rebuilds the
`innerHTML` for a different surah. Fixed with one new identity-based
function, `scrollFlowToCurrentAyah()`, called from `navigateToAyah()` —
the word-card mechanism's only navigation function, so the fix cannot
affect Prev/Next, the Ayah/Surah selects, or the flow strip's own swipe
navigation. New `quran-word-card-flow-nav.mjs` suite, 19 checks. **A
second, pre-existing, UNRELATED defect was found and NOT fixed**: Range
unit type carries no surah of its own, so crossing surahs while Range is
selected shows an arbitrary slice of the wrong surah — this predates
issue #113 and is not scoped to word-card navigation at all (the plain
`surahSelect` dropdown has the same gap); recorded as a product-decision
packet with four costed options, none chosen. Mushaf-mode flow scroll
targeting is also flagged, not built — `hifz-renderer.js`'s word spans
carry no ayah-identifying attribute to target. No new translation
string, no Firestore write/Rule/index. **Independently re-verified by
the Architect before merging**: fresh full-history checkout, retargeted
from its stale stacked base onto `main` and merged current `main` in
(clean), all 11 governance suites clean, the new suite 19/19 and the
unmodified `quran-word-card-return.mjs` regression suite 55/55.
Allocated by the MMSA Architect.

**Previous milestone: v08.47 on `main`** — **RETROACTIVE ALLOCATION, 23 Sep
2026, and read this whole paragraph before assuming D3 Journaling is
still unreachable anywhere else in this file.** This is MAP Phase 5
**P5-D, the Notes screen, round 1** (issue #195, PR #198), which merged
to `main` on **22 Sep 2026** as commit `530af1f` — the Owner's own top
priority that day (*"Notes screen (Phase 5): start it next, as the main
piece of visible work"*) — and shipped real, correctly-tested,
user-facing functionality, but the Architect loop's own
version-allocation follow-up was never done for it. It sat on `main`,
live, unnumbered, through v08.35 → v08.46 (a full day of other rounds),
found and closed during this session's routine sweep, the same sweep
that investigated whether D3 Journaling had become reachable per the
question below.

**A new real page, `app/notes.html`** (+ `app/js/note-sanitize.js`),
wired to the existing, previously-uninvoked data layer —
`app/js/study-note-service.js` (`createStudyNote`, `reviseStudyNote`,
`retireStudyNote`, `notesForStudyUnit`, `recordJournalEvidence`) and
`app/js/note-foundation.js` (`listNoteRevisions`). No new exported
function was added to either — the screen was buildable entirely on top
of what P5-B/P5-C/P5-E already shipped. For the current Study Unit: lists
existing Notes, creates a new one, revises an existing one (showing the
real `revisionId` a revision produces), shows a read-only revision
history, and retires one (worded "Remove", I4 — nothing destroyed).
Entry point: a new item in the Read screen's existing ⋯ menu, **"📔 My
Notes for this unit"**. Only a Note's own author may create/revise/retire
it (`isNoteOwner()` in the deployed Rules, deliberately distinct from
`canRecordFor()` — a Note is a person's own private writing). Every
render of a Note's `bodyHtml` goes through `sanitizeNoteHtml()`
(DOMPurify, CDN-vendored — this codebase's first vendored third-party
script), which fails closed if DOMPurify is absent.
`note-sanitize-boundary.mjs`, 7 checks, mutation-proven.

**D3 JOURNALING IS NOW LIVE, NOT MERELY REACHABLE — the answer to "is it
now reachable" is yes, and it is also already turned on.**
`study-evidence-readiness.js`'s gate has read `ready: true` since v08.34,
so saving a Note against an `ayah`/`range`/`surah` Study Unit records
real Journaling Activity evidence **right now**, for a real reader.
Verified directly: `notes.html`'s `afterCreateOrRevise()` calls
`recordJournalEvidence()` only after a real create/revise succeeds, which
itself calls `recordStudyEvidence()` — the ONE chokepoint, in
`study-event-wiring.js` — exactly the shape the 19 Sep 2026 D3-chokepoint
round enforced (see that entry below; it is not superseded, it is
fulfilled). **`study-activity-evidence-boundary.mjs` was already updated
in place for this transition, correctly, with the reason recorded, in
the same round that built this screen** — the importer set is asserted
to be exactly `[study-event-wiring.js]`, and the reachability invariant
requires every page-reachable path to the writer pass THROUGH the wiring
module — re-confirmed true today, 27/0. `study-note-boundary.mjs`
independently asserts the narrower claim: **exactly** `app/notes.html`
reaches `study-note-service.js` — 18/0. A Note filed against a unit type
ADR-008 §6 does not cover (`juz`/`topic`/etc.) records no Journaling
evidence and the screen says nothing about it — silence, not a false
claim, per `afterCreateOrRevise()`'s own `if (!evidence) return;`.

**Not built this round, per the issue's own scope**: folders, Mapping My
Journey filing (Phase 6, built later as v08.37), choosing a translator.
Layout not measured in a real browser (documented Playwright/
`chromium_headless_shell` environment gap); a real-phone check is the
recommended substitute. **Independently re-verified by the Architect at
this retroactive allocation**: fresh full-history checkout of current
`main` (which already carries this round), all 11 governance suites
clean, `note-sanitize-boundary.mjs` 7/0, `study-note-boundary.mjs` 18/0,
`study-activity-evidence-boundary.mjs` 27/0, the PR #198 diff read by
hand. Allocated by the MMSA Architect.

**Previous milestone: v08.46 on `main`** (23 Sep 2026 — Health Atlas: the
References view switcher gets a real keyboard/screen-reader fix, issue
#115 Gate A/B, PR #148. **Gate A (reproduced before touching app code)**:
tranche 9's `buildViewTabs()` declared `role="tab"`/`"tablist"` +
`aria-selected` on the Body Systems/References view switcher, but built
none of the rest the WAI-ARIA Tabs pattern requires — no
`aria-controls`, no `role="tabpanel"` anywhere, no arrow-key handling. A
new committed browser suite
(`tools/health-atlas-verify/references-tabs-accessibility-browser.mjs`)
run against the unmodified tranche 9 commit failed 5 of 10 checks,
reproducing exactly that. **Gate B (the fix)**: these two buttons replace
the whole screen (Body Systems vs. References), not panels of one shared
view — so per issue #115's own instruction, this uses **ordinary
buttons** (the WAI-ARIA toggle-button pattern: `aria-pressed`,
`role="group"` container) rather than building out full tab-panel
semantics for a control that isn't one. A native `<button>` needs no
bespoke keyboard handling — already in Tab order, already
Enter/Space-activatable — and the screen never suppressed its focus
outline. Same suite re-run against the fix: 10/10 pass.
`references-index-browser.mjs`'s own pre-existing `aria-selected`
assertions were updated in place to `aria-pressed` — still 12/12 passing,
nothing else in that file changed. **Independently re-verified by the
Architect before merging**: fresh full-history checkout, merged current
`main` in (clean, no conflicts), all 11 governance suites clean, all 18
Health-owned suites clean (297 checks), and **mutation-proven**:
reverting the fix to `origin/main`'s copy of `health-atlas-view.js` fails
exactly 5 of 10 checks, matching Gate A's own reproduction. No protected
path touched. Did not build the full ARIA Tabs pattern
(tabpanels/`aria-controls`/roving-tabindex arrow keys) — issue #115 named
ordinary buttons as an equally valid resolution for view-switch actions,
which these are. Allocated by the MMSA Architect.

**Previous milestone: v08.45 on `main`** (23 Sep 2026 — Word Card: desktop
drag/resize verified, one z-index defect fixed, issue #113, PR #137. The
movable/resizable Word Card window has existed since v08.20, via the
shared `initPopupWindow()` (`app/js/note-popup.js`) the Note/Wheel/Explore
popups also use, at the same 900px breakpoint. A real drag-then-resize
round trip — never driven by any suite before this one — found the Word
Card mounts' `z-index` was `60`, an accidental **tie** with `#dock`'s own
`z-index:60`, where `#noteView`/`#wheelPopupView`/`#exploreView` all
deliberately use `55`, one step below `#dock`, with their own comment
stating the policy outright ("the dock stays reachable even if the
popup's own geometry overlaps it"). Fixed to `55` to match. **Nothing
changes on screen** — DOM order already tie-broke the same way — but the
card now states the same dock-wins policy explicitly instead of relying
on a coincidence. New `quran-word-card-popup.mjs` suite, 22 checks:
desktop drag/resize/persistence round trip (both languages), mobile
layout untouched (below 900px no inline geometry is ever applied, so
v08.40's own 55-check return suite is untouched by construction),
independent per-mount geometry. **Two things recorded, not built** (both
need authority this round did not have): zero keyboard support anywhere
in the four-popup mechanism (no `keydown`, `tabindex`, or `aria-label` on
any drag handle or resize control), and `#dock` deliberately winning its
overlap with a popup's own south-edge resize handles once dragged low
enough — the same "dock always wins" policy this fix makes explicit,
shared by all four popups by design, and a real product trade-off (a
smaller maximum popup height on a short screen) rather than a one-line
fix. Pre-existing suites re-run unmodified and unaffected:
`quran-word-card.mjs` 36/0, `quran-word-card-integration.mjs` 10/0,
`quran-word-card-lemma-occurrences.mjs` 50/0,
`quran-word-card-return.mjs` (v08.40's own suite) 55/0. No new
translation string, no Firestore write/Rule/index. **Independently
re-verified by the Architect before merging**: fresh full-history
checkout, merged current `main` in (clean, no conflicts), all 11
governance suites clean, all five Word Card suites re-run matching the
round's own claims exactly. Allocated by the MMSA Architect.

**Previous milestone: v08.44 on `main`** (23 Sep 2026 — Hadith: keyboard
focus is restored to the newly-active tab button on every
Collections/Topics/Search/Explore/Commentary tab switch, issue #114 Gate
A/B, PR #150. `render()` tears down and rebuilds the whole subtree on
every tab click; unlike an in-tab Collections step
(`focusCollectionsLanding()`) or the one-shot "View in source" jump
(`focusPendingOccurrence()`), nothing restored focus on a plain tab
switch — so a keyboard user lost their place to `<body>` on every single
tab click, including returning to Search after visiting a narration's
source (the query and results persisted; focus did not). Fixed with one
new `focusActiveTab()` helper in `app/js/hadith-browser.js`, called from
the tab button's own click handler — the standard ARIA-tabs pattern of
leaving focus on the tab list. Zero new translatable strings. 4 new
checks in `hadith-source-navigation-browser.mjs` (43 → 47).
**Independently re-verified by the Architect before merging**: fresh
full-history checkout, merged current `main` in (clean, no conflicts),
all 11 governance suites clean, all 5 Hadith-owned data suites clean,
`hadith-source-navigation-browser.mjs` 47/47 in both languages, and
**mutation-proven**: reverting the fix to `origin/main`'s copy of
`hadith-browser.js` fails exactly the 4 new checks (43/47), restored and
re-confirmed clean. No protected path touched, no Firestore write/Rule/
index. The multi-edition breadcrumb ambiguity PR #149 found stays exactly
as recorded — the committed corpus still carries one edition per
collection, so it is not a live defect. Allocated by the MMSA Architect.

**Previous milestone: v08.43 on `main`** (23 Sep 2026 — Health Atlas: a
References index, one new top-level view mode alongside Body Systems,
issue #115 Gate A/B, PR #146 (tranche 9). Each of the 8
`HEALTH_ATLAS_REFERENCES` rows now lists which organs in this dataset cite
it (`organsForReference()`, the reverse of the existing `referencesFor()` —
reads only the existing `organ.refs[]` field, no new field). **What
actually changes for anyone opening this internal-review screen directly**
(it is not linked from shared nav or deployed to a real reader — still
100% read-only, same DRAFT status as every other Health Atlas surface): a
"Body Systems / References" tab bar above the existing layout; the
References tab lists all 8 references with which organs cite each one, and
an organ pill is a real link into the existing organ detail column (reuses
the same `onSelectOrgan()` path the sections list and the wheel already
use), not a fabricated link into a route that cannot resolve it — this app
has no URL-addressable per-organ route to link to instead. The source
app's own References tab is a flat id/name/url table with no organ links
at all, so this deliberately goes beyond source parity — investigated as
Gate A before building, not assumed safe. **What stays the same**: the
index's own note text explicitly disclaims that a listed reference backs
an organ's material in general, never any one function statement
individually, and the index never itself decides a statement is
`cited-evidence` — that distinction stays `health-atlas-claims.js`'s job
alone, asserted by a new static positive control. One reference (USDA
FoodData Central) genuinely cites zero organs in this dataset — a real
edge case exercised by both the static guard and the new browser suite,
not a hypothetical. New `references-index-browser.mjs` suite (12 checks,
desktop/tablet/phone, mouse + keyboard + real touch `tap()`),
mutation-proven two ways.

**This is the FIRST global version number ever allocated to the Health
stream, and it exposed a stale ledger record.** `docs/governance/programme-integration-ledger.json`'s
`health` stream had recorded `EXTERNAL_PENDING_ACQUISITION` / repository
`UNKNOWN` / "No Health implementation exists in this repository" — true on
18 Sep 2026 when first written, false by the time this allocation read it:
real Health Atlas code has existed under `app/health/` since 17 Sep 2026
across well over a dozen tranches, all merged directly to `main`, none
needing a global version number until this one. Corrected in this same
round, by reading the real repository state rather than trusting the
prior record.

**A real version-number collision happened and was correctly resolved,
the exact class this repository's own standing rule exists to prevent.**
This round was first drafted as v08.42, reading main's tip at the start of
review — but the concurrently-running issue #206 Builder round (dispatched
independently, watched by a different process) reached `main` first and
took v08.42 for itself. Caught by `programme-ledger.mjs`'s own guard A the
moment this round tried to allocate: read the next-free number off `main`
again rather than trusting the number chosen minutes earlier, and moved to
v08.43. **Independently re-verified by the Architect** before merging:
fresh checkout, clean merge with no conflicts against `main`, all 8
CI-gated governance suites clean, all 17 Health-owned suites clean (287+
checks across selectors, boundary guards and both browser suites),
`behaviour.mjs` run in full against `main` (which already carries this
round) — 986 pass/7 fail, every failure pre-existing and environmental and
none in Health-owned code (`22h` and `31e` are network/TLS sandbox
artefacts, `27i` a pre-existing Study-options layout measurement, `40g` ×4
a Mushaf word-tap hit-testing artefact of the substitute Chromium build,
confirmed byte-identical pixel coordinates across three separate runs this
session). No protected path touched, no Rules/index change from the
Builder's own round. Allocated by the MMSA Architect.

**Previous milestone: v08.42 on `main`** (23 Sep 2026 — Word-by-Word
whole-Qur'an/Juz percentage running counter, BUILT AND GATED — the Owner
reviewed an interactive demo and said "Go ahead, build it," issue #206,
PR #209. **What actually changes for a real reader today: nothing.** This
is the exact same shape as v08.30's Activity evidence before v08.34 turned
it on — a real, additive Firestore collection (`quranWordTotals`) and a
real UI (a gold ring around the Explore wheel showing the reader's own
whole-Qur'an known/total; a toggle at the Juz level switching wedge
colouring between "Approach" — today's real, unchanged pooled-status
colouring — and "Word by Word" — each Juz wedge recoloured by its own
known/total; the Word Card's own gate-free "Appears N times in the Qur'an
— X% of all words" line) are all BUILT, but the ring, the toggle and the
Juz/Quran-level coverage caption stay completely absent until two more
things happen, neither of which this round performs: **(1)** the Owner
publishes the Rules candidate
(`docs/governance/2026-09-23-wbw-total-counter-rules-candidate.rules`) in
the Firebase Console, the same kind of one-tap publish that turned on
Phase 3-6 on 22 Sep 2026, and **(2)** a separate, explicit governed
decision is then recorded (an authority, a real date, a reference to a
proof it was actually deployed) — the identical two-step shape v08.34 used
to turn on Activity evidence, never a bare code flip. **The gate,
`app/js/study-wbw-total-readiness.js`, copies
`study-evidence-readiness.js`'s shape exactly**: `ready: false` as a real
literal, and — independently confirmed by the Architect reading the file
itself, not merely trusting the PR's own claim — **it imports nothing at
all**, so it cannot even accidentally consult `firestore.rules`. **The
write-gate-blocking guarantee was verified directly, line by line, because
this is the one thing that could make the round unsafe to ship even while
gated**: the same write path that already changes one occurrence's real
stored state (`runWordProgressAction()` in `quranrevival.html`) snapshots
the counter's own "before" state through a helper that returns `null`
whenever the gate is closed, and the function that would move the running
counter (`applyWordTotalCounterDelta()`) returns immediately, before
fetching any index or calling the data layer at all, whenever that
snapshot is `null`. The data layer's own two exported functions
(`recordWordTotalDelta()`, `getWordTotals()` in
`quran-word-total-data.js`) *also* independently re-check the same gate at
their own top and return before touching Firestore, so even a future
caller that skipped the first check could not reach the database while
closed. **An ordinary Word-by-Word tap today can never throw an error over
this collection** — the exact defect class v08.31 had to fix for Activity
evidence was not reintroduced here for a different collection. The
counter only moves on a genuine `countsAsKnown` transition — the same
definition `computeArabicCoverage()` already uses for the existing
Surah/Ruku' coverage caption — never on "any write", proven by a
claim → teacher-confirm → return → re-claim → confirm sequence reconciled
against an independent recount of the final state. **The per-Juz
denominators (30 rows, summing to the real 77,429) are derived, not
hand-typed**: `tools/quran-data-pull/build-juz-word-totals.js` walks the
real packaged per-ayah word arrays — the Architect independently re-ran
this script against the real corpus and it reproduces the shipped
`juz-word-totals.json` byte-for-byte. `QURAN_TOTAL_WORD_COUNT` (77,429) is
exported once, from `app/js/quran-word-total.js`, and both the Word Card
line and the Juz-total validation import that same constant — no second
hardcoding anywhere. **The Approach wheel's own pooled-status colouring is
provably untouched**: `renderScopedWheel()`'s new `fill`/`ring` options are
strictly opt-in, defaulting to exactly the prior geometry and colouring
when absent, and `renderExploreQuranLevel()`'s Approach-mode wedge
computation runs unconditionally with the Word-by-Word overlay applied
only afterward, only in "wbw" mode. I9: the counter document and the
per-Juz totals load only when Explore's Juz/Quran level is actually
opened, the same lazy-load pattern `getJuzIndex()`/`getHizbIndex()`
already use — never on the startup path. I11: new strings translated in
Bangla (`bn.js`); the toggle's own "Approach"/"Word by Word" button labels
reuse existing translated keys rather than adding new ones. New
`tools/i18n-verify/quran-word-total-boundary.mjs`, 25 checks, including
an anchored regex proving the gate check is the literal first statement in
both exported data-layer functions (not merely "a return appears nearby"),
the correctness reconciliation above, and an independent re-derivation of
the Juz totals from the real surah files inside the check itself.
**`firestore.rules`/`firebase.json`/`app/js/version.js` genuinely
untouched by the Builder's own round** — confirmed by diff, not assumed.
**The Builder's own PR-opening step again did not run** (Actions run
35821824718, `conclusion: success`, branch pushed, no PR — the same,
recurring gap several other rounds this same day also recorded); the
Architect opened PR #209 itself from the already-pushed, already-checked
branch. **Independently re-verified by the Architect before merging**:
fresh worktree off `origin/main`, all 8 CI-gated governance suites plus
this round's own new suite re-run clean, full diffs read by hand, no
protected path touched, clean merge against `main` — **re-checked
immediately before each merge attempt**, since the version number this
follow-up round needed collided TWICE with other concurrently-landing
rounds while it was in flight (08.40 was taken by the Word Card fix,
08.41 by a Hadith breadcrumb fix, both mid-review) — read fresh off
`origin/main` each time rather than assumed, exactly the discipline this
file's own standing lessons already require. `behaviour.mjs` could not
run in this sandbox — `chromium_headless_shell-1243` missing, only
`-1194` present, the same documented Playwright build-version gap.
Allocated by the MMSA Architect.

**Previous milestone: v08.41 on `main`** (23 Sep 2026 — Hadith: the current
breadcrumb crumb carries `aria-current="page"`, issue #114 Gate A/B, PR
#149. Reproduced live: neither the current breadcrumb crumb nor its
containing `<nav>` carried any accessible signal for "this is where you
are" — confirmed `null` at every level, on both breadcrumb call sites
(Collections tab and Topic tab) — more load-bearing now the trail runs a
level deeper than it used to. **What actually changes for a real
reader**: nothing visible for sighted keyboard use; a screen reader now
correctly announces the current location in the breadcrumb trail. Zero
new translatable strings — `aria-current`'s value is a fixed ARIA token,
not user-facing text. A real, separate multi-edition breadcrumb-ambiguity
question was found and reproduced during the same investigation (two
editions of one collection would render byte-identical breadcrumb text)
but is deliberately **not fixed here** — today's committed corpus carries
exactly one edition per collection, so it is not a live defect, and
closing it would need a real product/data decision (does a Hadith
collection ever carry more than one edition?) this round has no authority
to make. 6 new mutation-proven checks in
`hadith-source-navigation-browser.mjs` (36 → 42), both languages.
**Independently re-verified by the Architect** before merging: fresh
checkout, clean merge with no conflicts against `main`, all 8 CI-gated
governance suites clean, the focused suite re-run clean at 42/42 under an
available substitute Chromium build, and the full `behaviour.mjs` suite
run against both the merged tree and a clean `origin/main` baseline (via
a disposable `git worktree`) — 987 pass/6 fail vs 984 pass/9 fail, every
failure on both sides pre-existing and environmental, zero introduced by
this diff, which touches only `app/js/hadith-browser.js`. Allocated by
the MMSA Architect.

**Previous milestone: v08.40 on `main`** (23 Sep 2026 — Word Card: the
"Back to Word Card" round trip actually works, issue #113, PR #135. Every
existing Word Card suite stopped the moment the return bar appeared on
screen and never pressed it — pressing it in a real browser found two
real, narrowly-scoped defects in the Basic Arabic lemma/root feature's own
return mechanism (built v08.20–v08.22). **What actually changes for a
real reader**: following a lemma-occurrence link away from a word, then
tapping "← Back to Word Card", now returns to the exact word, on the exact
tab, WITH the lemma list still expanded if it was before (it used to
silently collapse), and the screen scrolled back to roughly where the
reader was (it used to snap to the top, because `window.scrollY` is
always 0 in this app's shell and the original code read it anyway). The
first fix attempt for the scroll case targeted the wrong element — this
app's own default is sideways/Mushaf-style paging, where `#ayahPanels`
scrolls, not `#readScroll` — caught before shipping by testing against
the real fixture rather than assumed. **What stays the same**: sideways
flow mode (Whole Surah/Range) and a Note-view origin still fall back to
the pre-existing no-op scroll restore, flagged rather than silently
fixed; no new translation string (`backToWord`/`backToWordCard`/etc.
already existed since v08.20–22); no Firestore write, Rule or index. New
`quran-word-card-return.mjs` suite, 55 checks. **Independently
re-verified by the Architect** before merging: fresh checkout, clean
merge with no conflicts against current `main`, all 8 CI-gated governance
suites clean, the focused suite re-run clean at 55/0 under an available
substitute Chromium build (`chromium-1194`'s own `chrome` binary —
`chromium_headless_shell-1243` is missing from this sandbox, the same
documented gap as v08.35/v08.36/v08.39); `behaviour.mjs` run in full
against both this merge and a clean `origin/main` baseline under the same
substitute browser — **987 pass/6 fail vs 984 pass/9 fail**, every
failure on both sides pre-existing and environmental (27i a pre-existing
layout measurement, 31e the documented sandbox TLS artefact, 40g×4 an
identical-to-the-pixel substitute-browser hit-testing artefact confirmed
byte-identical on both sides, 22g×3 the documented intermittent
archive.org class — present on the `main` baseline run and simply not
triggered on this one, exactly the intermittency this file's own standing
lessons already record), **zero failures introduced by this round**.
Allocated by the MMSA Architect.

**Previous milestone: v08.39 on `main`** (23 Sep 2026 — Asma ul Husna's
classification rename/archive wired, and "file a new Name" generalized to
every classification, issue #205, PR #207 — the closing half of v08.38's
own round, issue #202. **What actually changes for a real reader**: in the
Explore panel's ⋯ Manage menu, an owner/prime user can now rename or
archive the classification TAB itself (not just a collection inside it) —
the data-layer functions were already built and tested in #202, only their
UI was missing. And when filing a brand-new Name (the Note view's own
"+ New Name"/"+ New Dual Name" buttons), the popover now offers a real
Classification field built from the live registry, so a Name can be filed
under any classification the owner has added, not only the two seeded
"Group"/"Dual Names" ones. **What stays the same**: archiving a
classification is I4 (archive, never delete) — its lists and every Name
filed in them stay in the data and keep resolving in "Belongs to"; the
existing "Show archived" toggle was extended to also reveal an archived
classification rather than adding a second toggle; `openAsmaXGroupsPopover()`
— the issue's own "likely" guess for where the second gap was — turned out
to already be fully generalized by #202 and was correctly left untouched.
No new Firestore read on any startup path (I9), no `firestore.rules`/
`firebase.json`/index change — both changes are UI wiring against the
already-authorized `asmaCollections` document. No new theological content.
`asma-classifications-boundary.mjs` extended 26 → 36 checks, two of them
mutation-tested. **Independently re-verified by the Architect** (fresh
checkout of the Builder's branch, all 8 CI-gated governance suites plus
the extended boundary suite re-run clean, full diff read by hand, no
protected path touched, clean fast-forward against `main`); `behaviour.mjs`
could not run in this sandbox — `chromium_headless_shell-1243` missing,
only `-1194` present, the identical, now three-times-documented Playwright
build-version gap from v08.35/v08.36 — a real-phone check of the Explore
panel's ⋯ menu, both languages, is the recommended substitute. **This PR
was opened by the Architect from the Builder's already-pushed branch** —
its own PR-opening step again did not execute, the same gap v08.35/v08.36/
v08.38 all recorded. Allocated by the MMSA Architect.

**Previous milestone: v08.38 on `main`** (23 Sep 2026 — Asma ul Husna's
Groups/Dual Names generalized into an open, owner-defined set of
classifications, issue #202, PR #203. The Owner reviewed an interactive
demo (a mockup, not real data or code) and said *"Al Hamdulillah! Build
it."*, then corrected the shape mid-review from two fixed toggle-style
axes to a real list mechanism: *"Enable me to edit/add/move/delete these
lists and those names in the lists... a name card should show the names
of all LISTS it belongs to."* `kind` on an Asma collection — hardcoded to
a closed `"group"`/`"dual"` pair since the feature shipped — is any
non-empty string now, defaulting to `"group"` so every existing tenant's
saved data reads exactly as it did before. A new **classifications
registry**, additive on the same `asmaCollections/{tenantId}` document (no
new collection, no new read — I9 — no Rules change: the deployed
`allow update` on that document carries no `hasOnly()` restriction,
confirmed by reading `firestore.rules` directly rather than assumed), is
seeded with exactly the two entries every tenant's data already
implicitly used — `"Group"`, `"Dual Names"` — so nothing visibly changes
until an owner adds a third. **A Name card now shows every list it
belongs to** (a new "Belongs to" section, any classification, each entry
a clickable chip jumping straight to that list), and a **Names-level list
row shows an "also in…" chip** for a Name filed somewhere else too — both
read from a new pure `membershipsOfName()` reverse index, O(collections ×
items), no new Firestore call. Manage mode (owner/prime only) gains
**"+ New classification"**; every existing collection control (rename,
archive, add, add Name, attach reference, drag-reorder) keeps working,
generalized to whichever classification tab is active instead of two
hardcoded kinds. **Deliberately NOT seeded**: any real theological
assignment — "Unique to Allah" vs "Shared", "By Act" vs "By Essence" were
the Owner's own two worked examples of what a classification IS, and the
issue's own explicit instruction was that assigning real Names to them is
the Owner's own curatorial work, not this round's — the seed carries only
the two mechanism entries, no application of them to a third axis.
**Read, proven, and left exactly as they were**: the reference-adding
mechanism (`renderAsmaXrefBlock()`, the 🔗 attach popover,
`asma-ref-parser.js`), the poster view, Track-my-progress, extra-Name
editing, drag-reposition, and `asma-study.html`'s own separate, older
panel — the same standing rule every prior Asma round has followed. New
`tools/i18n-verify/asma-classifications-boundary.mjs` (26 checks): open
`kind` genuinely not coerced back to two values; classifications CRUD
round-trips; `membershipsOfName()` correct on a Name in 3+ lists across
different classifications AND the same one; I4 (archiving a
classification never drops a membership record — the collections filed
under it, and everything in them, are untouched); and a **positive
control** proving a freshly-added THIRD classification's own collections
are reachable exactly like the seeded two, at both the data layer and (by
reading the real page source, since this sandbox has no Playwright
browser binary installed at all) the Explore panel's own wiring. **The
Builder's own PR-opening step did not run** (workflow run 35801162383,
conclusion `success`, branch pushed, no PR) — the Architect opened PR #203
itself from the already-pushed, already-checked branch, the same recovery
v08.35/v08.36 used. **The unattended Architect workflow merged PR #203 on
its own**, eight minutes after it opened, once `verify` reported green —
faster than the session Architect's own independent re-verification could
finish; that re-verification proceeded anyway, after the fact, against
the real merged commit, and confirms the merge was sound: all 8 CI-gated
governance suites plus the new suite re-run clean on a fresh full-history
checkout, no protected path touched, `firestore.rules`/`firebase.json`/
`app/js/version.js` genuinely untouched by the round itself, and
`behaviour.mjs` run in full against both this branch and `origin/main`
under an available substitute Chromium build (`chromium-1194`'s own
`chrome` binary, neither the documented `-1194`/`-1243` headless-shell
pair) — **785 pass / 2 fail either side, byte-identical**, both failures
(27i, a pre-existing layout measurement; 31e, the documented TLS
artefact) and the section-40 Mushaf crash point pre-existing on `main`
too, none introduced by this round. Allocated by the MMSA Architect. Full
account in `CHANGELOG.md`'s own entry.

**Previous milestone: v08.37 on `main`** (23 Sep 2026 — MAP Phase 6 (P6-F),
issue #199, PR #200 — Mapping My Journey gets a real, reachable screen. The
Owner's own instruction: *"Journey Map: don't wait for my design. Build all
three options now with a toggle to switch between them, so I can try each in
the real app and choose."* The Phase 6 data layer — `journey-map-service.js`,
the folder/placement functions in `note-foundation.js`, the pure
`journey-map-contract.js` — has been built and accepted since P6-A/P6-E and
sat completely unreached by any page until this round. New page
`app/journey-map.html`, one shared toggle over one load of the person's
folder tree and Notes: **Folders** (the two system folders — Personal Journey
Map, Reflection Archive — always first, then the person's own; create, file,
move), **Timeline** (newest-first, grouped by day, filter chips), and
**Path** — an honest first pass, exactly as the issue asked for rather than
skipped or over-built: a straight date-ordered track, with the full
region/side-trail metaphor explicitly not built and the reason recorded in
code and in `CHANGELOG.md` — a Note filed in two folders at once (ADR-010
§5's many-to-many) cannot honestly occupy two places on one continuous line,
and a real build of that needs a resolved design (one path per region with
cross-links, or a branching diagram) this round's honest-first-pass budget
did not cover. **The two system folders are represented as virtual nodes
before either has a Firestore document** — real enough to open and see the
correct empty state for, never a faked stored one — and the first write that
genuinely needs one to exist creates it for real, once. Nav entry under Home
▾, alongside Records/Monitor/About; `notes.html`'s own contextual entry
(Read screen's ⋯ menu) is untouched. Read-only for everyone but the Note
owner, mirroring `firestore.rules` exactly as `notes.html` already does;
every write-triggering control gated on `isSelfSelected()`; a Note's
`bodyHtml` is never rendered except through `sanitizeNoteHtml()`. Full
Bangla translation from the first commit, verified programmatically (33
keys). **No new exported function on `journey-map-service.js` or
`note-foundation.js`, no Rules, index or `version.js` change from the
Builder** — the version bump above is the Architect's own separate,
follow-up commit, per the Builder contract. `journey-map-boundary.mjs`
(the P5-D-era reachability guard) was **updated in place, reason
recorded, never weakened**: its old claim that `journey-map-service.js`
"remains completely unreachable by any page" was true only because nothing
had wired it in yet, and this round is exactly that wiring — narrowed to
name the one page that may now reach it (`app/journey-map.html`) and assert
which Phase 6 functions each wired page may call, including the five
folder-editing wrappers (`renameFolder`/`reorderFolder`/`moveFolder`/
`retireFolder`/`reorderFiling`) this screen deliberately does not wire in
this round. A new suite, `journey-map-screen.mjs` (16 checks), covers the
screen's own contract. **Independently re-verified by the Architect before
merging**: fresh full-history checkout of the PR branch, all ten relevant
suites re-run clean (the 8 CI-gated governance suites, `journey-map-
boundary.mjs` 17/17, `journey-map-screen.mjs` 16/16), no protected path
touched, base was already current `main`, diff read by hand. **Layout was
NOT measured in a real browser** — a harder form of the same environment
gap v08.35/v08.36 recorded: this sandbox had no Playwright package
installed at all, so none of the five browser-driven suites could run for
this or any other page; a real-phone open-and-tap-each-view check at
320/360/390/412px in both languages, across all three views, is the
recommended substitute. Full account in `CHANGELOG.md`'s own P6-F entry.

**Previous milestone: v08.36 on `main`** (22 Sep 2026 — tap-to-open-Word-Card
extended to every word a reader can see, in two rounds the same day.
**v08.35** (issue #188, PR #190) wired the Mushaf-page Read view — real
per-word glyph text that already carried its own word identity (`w.loc`
in `hifz-renderer.js`), simply never attached to the DOM. **v08.36**
(issue #189, PR #191) did the same for the normal, everyday flowing
Arabic text in both Read view and Note view, the more common case a
reader actually sees — split into per-word tappable spans when Tajweed
display is off; Tajweed-on stays exactly as it was, because tajweed
assimilation colours across a word boundary on measured ~65% of ayahs and
cannot be safely split without a per-word tajweed dataset that doesn't
exist. Both rounds reuse the one existing shared `readView`/`noteView`
click listener and the one Word Card component — no new UI, no new
wiring beyond attaching the right `data-word-occurrence` id, the same
format the Word-by-Word strip already used. Both were independently
re-verified by the Architect before merging (fresh checkouts, all 8
governance suites re-run clean, full diffs read by hand) — the Builder's
own PR-opening step failed to run on both, so the Architect opened both
PRs itself from the Builder's already-pushed, already-checked branches.
**Both hit the identical Playwright-browser-build environment gap**
(`chromium_headless_shell-1243` missing from this sandbox, only `-1194`
present) that neither the Builder's own run nor the Architect's own
re-check could close — recorded as a genuine, twice-confirmed environment
limitation, not a code defect; a real-phone tap-and-check is the
recommended substitute, the same style Phase 3 already used. Allocated by
the MMSA Architect. Full account in `CHANGELOG.md`'s own entries for both
issues.

**Previous milestone: v08.34 on `main`** (22 Sep 2026 — MAP Phase 4 Activity evidence
persistence ENABLED. The Owner's own words, after testing Phase 3
word-by-word progress on a real phone per the exact steps given: *"It
worked, switch on Phase 4."* Both preconditions `app/js/study-evidence-
readiness.js` itself requires are now met — `deployment.firebaseRulesDeployed`
is YES (see the dated correction above) and a real save-and-reload was
independently proven on the Owner's own device — so `EVIDENCE_PERSISTENCE_
DECLARATION` moved from `ready: false, decision: null` to `ready: true` with
a governed decision (`by: "master-architect", on: "2026-09-22"`), under the
exact ceremony the module's own header describes: not a bare flip, but a
decision from the closed authority set, a real date, and a reference to a
record that exists — `docs/reports/2026-09-22-map-phase4-evidence-
persistence-enabled.md`. **Guard G re-run clean**: the code's `ready`
literal, the ledger's `evidencePersistenceReadiness` block and
`deployment.firebaseRulesDeployed.state` all agree.

**What actually changes for a real reader, today, once this merges**: the ✓
on `#readBar` (D1 Reading) stops being `aria-disabled` and starts creating
one real, create-only, deduplicated document per completion. D2 Listening
(≥80% of the unit) and D4 Word-by-Word keep recording silently exactly as
v08.30/v08.31 built them — neither ever invited a press. **What does not
change**: the writer's own I15 rethrow underneath the gate; `bulkConfirmWeek()`
still reading only `entries[]` (the Activity-to-Mastery escalation guard);
D3 Journaling, still out of scope (no reachable producer — Notes, issue
#180, is a separate in-progress round); Notes and Mapping My Journey
screens, unaffected (issues #180, #182, still building).

**Nine checks across two suites updated in place, with the reason
recorded, the same discipline as the Rules-deployment round above** — a
literal check asserting `ready` reads `false`, and a mutation-style check
whose own first assertion asserted the SAME thing, both in
`study-activity-evidence-boundary.mjs`. Neither was weakened: every
malformed-shape refusal (a bare flip, an empty decision, a self-authorising
module, an unreal date) is asserted exactly as strictly as before — only the
assertion about the REAL file's CURRENT state changed, because that state
genuinely changed. `app/js/version.js` bumped to **08.34** — a real,
user-facing behaviour change (a control moves from non-actionable to
actionable), the same reasoning v08.31 itself used for why the *gate*
needed its own version, applied symmetrically to the gate's release.

**Previous milestone: v08.33 on `main`** (22 Sep 2026 — three real, measured
truncations fixed in the Study-options panel at phone width, the first work
done under the Owner's own standing fix-list authorisation (see
"THE FIX LIST IS A STANDING OWNER AUTHORISATION" in `ARCHITECT.md`).
**`tenantSelect`** (Bar 1, "User Role") never fit its own real content —
the owner's tenant name plus role list, `"Madrasatul Muslimeen (Owner,
Prime)"`, needs 224px and got 115–141px at every phone width tested
(360/390/412) — and MEASURED first before deciding the remedy: shortening
the wording, the fix originally proposed on the fix list, turns out to be
unsafe, because a tenant's own name is free text of any length a person
chose for themself, not a label this round can shorten. Below 580px (the
measured crossover — this bar's own cellW is `0.5×viewport − 35px`, a
select's chrome is a measured 30px, so 224px of usable text needs
`viewport ≥ 578px`) the two cells in that row stack instead of sharing one.
**Study Unit/Surah** (`.opt-bar-units`) were the Owner Control Gate item O3b
— *"the row is genuinely short of space… no redistribution reaches it"* —
confirmed by the same measurement method: below 480px (the worse of the two
unit-type cases, measured at 468px, plus a small margin) they wrap to their
own line instead of truncating, with the small number pickers
(unitNum/Ayah/From/To) flowing to a second line using their own existing
fixed width. **`drillModeSelect`** (the Listen bar's Mode picker) was cut in
**Bangla only**, at every phone width — found because `panel.mjs` had only
ever been run in English before this round; a suite that runs one language
measures one language. Same wrap, same 480px breakpoint; English was never
short and is unaffected. **Proven, not asserted**: `panel.mjs` re-run in
both languages, all 48 sections each, zero truncations remaining, one
`KNOWN_TRUNCATED_SELECTS` baseline entry now empty rather than silently
carried forward. MMSA Architect allocated v08.33. See
`docs/reports/2026-09-22-fix-list-panel-truncations.md`.

**22 Sep 2026 — APPROVAL-GATED FIRESTORE RULES AUTO-DEPLOY, BUILT, NOT
TRIGGERED. BR-0, no version bump — `app/` untouched.** The Owner's own
instruction: *"YES, build it — prepare the publish and wait for my one-tap
approval, never publish on its own. Free only, no API billing."*
`.github/workflows/deploy-firestore-rules.yml` fires on any future push to
`main` touching `firestore.rules`, prepares a diff, then pauses at a
`environment: firebase-production-deploy` job — a GitHub Environment the
Owner configures with themselves as a **required reviewer**, so GitHub
itself enforces the pause; nothing in this workflow can bypass it. Setup is
one-time and Owner-facing, all clicking:
`docs/governance/2026-09-22-auto-deploy-firestore-setup.md`.

**RULES ONLY, DELIBERATELY — indexes were NOT wired in, and that is a real
finding rather than a smaller version of the same job.** The first draft
also populated `firebase.json`'s `indexes` key and added
`firestore.indexes.json` at the live deploy path, to let one workflow
publish both. `tools/i18n-verify/firestore-index-requirements.mjs` — a
standing Phase 5 (P5-E) guard — asserts by name that neither may exist at
that path: putting an index declaration at the live spot is **its own
deployment-shaped change, the same tier as an Owner Control Gate**, proven
by that suite's own check ("the candidate is a CANDIDATE"). Building the
approval workflow is not authority to cross that gate on the Owner's
behalf, so both files were reverted and the workflow scoped to
`--only firestore:rules`. All 8 governance suites re-run clean afterward
(`programme-ledger`, `brief-integrity`, `firestore-index-requirements`,
`rules-deployment-candidate`, `rules-deployment-candidate-phase3-6`,
`rules-authorisation-executable`, `study-activity-evidence-boundary` (+
mutations), `study-event-wiring`, `workflow-expressions`), and
`firebase.json` is confirmed still byte-for-byte its pre-round content.

**A redundant-approval trap was designed around, not discovered afterward.**
The moment the Owner says "rules are live" (point 4, still pending — see
below), the Architect's own follow-up commit syncing `firestore.rules` to
match what was just published BY HAND would otherwise re-trigger this same
workflow and ask the Owner to approve something already live. That commit
must carry the exact trailer `[already-deployed-manually]` in its message —
the `prepare` job checks for it and skips the `deploy` job when present.
**This round did not touch `firestore.rules` itself and nothing was
deployed** — the Phase 3–6 candidate is still only at
`docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules`, unchanged,
and the Owner has not yet confirmed a Console publish.

> **THE OWNER PUBLISHED, 22 Sep 2026, SAME DAY — read this before believing
> anything above says Rules are still undeployed.** *"Rules are live. And
> index (see image)"* — confirmed by two screenshots: the Firestore Rules
> tab showing a fresh publish, and the Indexes tab showing all four Phase
> 5/6 indexes **Enabled**. This is the first time any of the four deployment
> states this file tracks has ever actually flipped to true.
>
> **`firestore.rules` and `firestore.indexes.json` were synced to match,
> immediately, in the same session.** `firestore.rules` is now
> byte-identical to `docs/governance/phase3-6-DEPLOYMENT-candidate-2026-09-22.rules`
> (proven by `rules-deployment-candidate-phase3-6.mjs`'s own check, not
> asserted); `firestore.indexes.json` declares exactly the four audited
> indexes and nothing else (`firestore-index-requirements.mjs`). `firebase.json`
> now points at both — the FIRST time this repository has ever declared a
> live index file, and it is correct to now, having been actually deployed;
> declaring one earlier would have been the repository claiming readiness
> nobody had proven, which is exactly why `firestore-index-requirements.mjs`
> used to assert the opposite.
>
> **A ROUND OF STALE "NOTHING IS DEPLOYED" CHECKS WAS FOUND AND FIXED THE
> SAME SESSION, NOT LEFT RED.** Nine separate suites across this repository
> had asserted, as their whole point, that `firestore.rules` carried none of
> this material — true for the entire life of each suite, and false the
> moment deployment happened. Each was **updated in place with the reason
> recorded, never deleted, never silently routed around** (this file's own
> standing rule): `firestore-index-requirements.mjs`, `rules-deployment-
> candidate.mjs`, `rules-deployment-candidate-phase3-6.mjs`,
> `study-activity-evidence-boundary.mjs`, `journey-map-boundary.mjs`,
> `note-foundation-boundary.mjs`, `study-approach-contract-boundary.mjs`,
> `study-note-boundary.mjs`, and two `programme-ledger-mutations.mjs`
> mutations that had been relying on the ledger's own ambient "not deployed"
> state instead of setting up their own precondition explicitly. **Two
> checks needed a FIXED historical baseline, not a live one**, and for the
> identical reason in both places: comparing against `firestore.rules` (now
> equal to the very thing being audited) or `origin/main` (which will equal
> it too, the moment this lands) would make the check pass vacuously
> forever after. `rules-deployment-candidate.mjs` (the superseded 17 Sep
> suite) and `study-note-boundary.mjs` (P5-C's own "changed nothing" claim)
> both now pin `PRE_DEPLOYMENT_REF` = the last commit before deployment
> (`35f9228e2d57c085795dc06c412b3a7191325ddd`) — a fact about the past does
> not move just because the live file later did, the same principle
> `rules-deployment-candidate-phase3-6.mjs` already applies to its own
> pre-Phase-3 helper-origin check. **All fifteen affected suites, plus the
> eight CI-gated ones, re-run clean.**
>
> **`programme-integration-ledger.json` updated, surgically, not
> re-serialized.** `deployment.firebaseRulesDeployed.state`: `NO` → `YES` —
> the first of the four tracked states ever to become true.
> `deployment.evidenceRecordingOperational.state` **stays `NO`, deliberately**
> — enabling Phase 4 is its own GOVERNED DECISION (`app/js/study-evidence-
> readiness.js`'s own design: an authority, a date, a record, never a bare
> flip), not something a Rules publish grants automatically, and that
> decision has not been made — it waits on Phase 3 verification succeeding
> on a real phone first, per the Owner's own explicit sequencing. Guard G
> re-run clean: `four deployment states recorded separately (code YES, Pages
> PRESUMED_FROM_MAIN, Rules YES, operational NO)`. **E1 is RESOLVED** — the
> access blocker is gone, proven by an actual publish, not merely credentials
> existing. **D14's own separate timezone Rules candidate was NOT part of
> this publish** and stays undeployed; D14-WIRING is still open, no longer
> on access, only on that specific candidate not yet being chosen.
>
> **What is still NOT true, and must not be assumed true from this entry:**
> Phase 4 Activity evidence is still not operational (see above). Phase 3
> word-by-word progress has not yet been verified to actually save and
> reload on a real phone — that is the very next task, blocking Phase 4's
> governed enablement. Nothing about Notes (Phase 5) or Mapping My Journey
> (Phase 6) screens changed — those are separate, in-progress Builder
> rounds (issues #180, #182) whose own writes will now succeed against the
> deployed Rules once built, but the screens themselves do not yet exist.

**Previous milestone: v08.32 on `main`** (21 Sep 2026 — QuranRevival Basic Arabic lemma-occurrence navigation, PR #112 merged at `f5b7c6c`. The Owner tested the app and confirmed all checks passed. The MMSA Master Architect allocated v08.32; `app/js/version.js` and the Programme Integration Ledger record it. This is read-only: no new Firestore write, Rule or index. E1 remains closed.)

**Earlier milestone: v08.31 on `main`** (19 Sep 2026 — the QuranRevival
Study-evidence persistence-readiness gate, fast-forwarded onto `main` from
`claude/charming-rubin-xzxbk1` under the Master Architect's guarded-integration
ruling. The accepted application change is unmodified: `git diff 65ef3c5
<main> -- app/` is empty. v08.30, the Phase 4 D1/D2/D4 evidence wiring, is the
previous version on `main` and is now RELEASED. **MERGED IS NOT DEPLOYED** —
E1 is still CLOSED, the evidence Rules are not deployed, evidence recording is
NOT operational, and nothing was deployed by this integration. What changed for
a real reader is that the ✓ on `#readBar` no longer invites a press that could
only error: it is not actionable, it says why in English and Bangla, and it
attempts no write at all. `main`'s own `app/js/version.js` is the single source
of truth. At that earlier milestone, v08.32 remained unallocated. See
`docs/reports/2026-09-19-quranrevival-v0831-main-integration.md`.)

**FOUR STATES, NOT ONE, AND THIS IS THE CORRECTION THAT PRODUCED v08.31.** The
v08.30 integration reported `APP_DEPLOYED=NO`, and the Master Architect ruled
that incomplete: **GitHub Pages serves `main`**, so code merged to main IS
served from the live URL even while the feature cannot function. One boolean
cannot carry both facts, and collapsing them recorded a control the Owner can
actually see and press as "not deployed". The four states are recorded
separately from now on, in `docs/governance/programme-integration-ledger.json`
and enforced by guard G:

| State | Value |
|---|---|
| `APPLICATION_CODE_INTEGRATED` | **YES** (v08.30 on `main`) |
| `GITHUB_PAGES_SERVING` | **PRESUMED_FROM_MAIN** — presumed, `verified: false`; the sandbox proxy refuses `github.io`, so this rests on this file's own record, not a measurement |
| `FIREBASE_RULES_DEPLOYED` | **NO** |
| `EVIDENCE_RECORDING_OPERATIONAL` | **NO** |
| `E1` | **CLOSED** |

**Merged is not deployed, served is not operational, and neither has been
proven for any v08.2x, v08.30 or v08.31 milestone.**

**19 Sep 2026 — D3 JOURNALING NOW GOES THROUGH THE EVIDENCE CHOKEPOINT.
DOCUMENTATION-ONLY ENTRY: no application behaviour changed, no version
changed, nothing was deployed.** `app/js/study-note-service.js` imported the
evidence store and called `writeStudyActivityEvidence()` **directly, around
v08.31's persistence-readiness gate**. It was never a live bypass — the module
is page-unreachable — but it meant *"`recordStudyEvidence()` is the ONE
chokepoint"* was a claim about REACHABILITY rather than about the code, and a
claim resting on unreachability expires silently the day somebody wires the
surface. **The direct caller is removed**: `recordJournalEvidence()` calls
`recordStudyEvidence()`, and the boundary suite's `KNOWN_UNREACHABLE_CALLER`
exception is **gone rather than widened** — the importer set is asserted to be
exactly `[study-event-wiring.js]`, and that module is the only one that calls
the store at all. **The service remains page-unreachable**: 0 of 29 pages
reach it, with `records.js` (16) and `study-event-wiring.js` (1) as the
positive controls that stop the walk passing vacuously, and 0 import cycles
across 96 modules. `app/js/version.js` is untouched and **v08.32 stays
UNALLOCATED.**

**THE ROUND'S REAL FIND WAS A SUITE THAT HAD BEEN DEAD SINCE v08.31's OWN
ACCEPTED COMMIT.** `tools/i18n-verify/study-event-wiring.mjs` loads the real
wiring module as a `data:` module with its app imports rewritten. `65ef3c5`
added a THIRD import — `./study-evidence-readiness.js` — and the suite rewrote
two, so the surviving relative specifier threw `ERR_INVALID_URL` **at module
load, before a single check ran**. It exited 1 with a stack trace and **no
`FAIL` line**, so a grep for failures saw nothing. **The chokepoint's own unit
suite therefore asserted NOTHING for the whole of its existence** — including
its cases *"an eligible completion reaches the store exactly once"* and *"this
module never swallows a failure"*. Repaired: **0 executing checks → 41**, plus
the **leftover assertion** that would have caught it the same day
(`study-note-service.mjs` has carried that assertion all along, which is
exactly why the same edit did not kill THAT suite silently). **A suite that
dies at import is not a failing suite, it is an absent one — assert that every
import was rewritten.**

**A MUTATION CAME BACK UNPROVEN AND FOUND A SECOND DEFECT, in the accepted
boundary guard.** It sliced the chokepoint's body as
`slice(indexOf(signature))` — **to end of file** — and two helpers BELOW
`recordStudyEvidence()` re-export the readiness predicate, so deleting the gate
left the symbol in the slice anyway and *"no longer consults readiness"*
**could not fail**. The suite refused the mutation only because a DIFFERENT
assertion fired, naming a fault nobody could act on. Bounded at the next
top-level `export` now, with a positive control. **An unproven mutation is a
finding about the guard, and chasing it is what found this.** See
`docs/reports/2026-09-19-quranrevival-d3-journaling-chokepoint.md`.

> **This line was WRONG for part of 18 Sep, and the episode is the lesson.** It
> read "**v08.26 on `main`**" the moment the nav round was committed to a
> BRANCH — the identical drift this paragraph has recorded twice before, made a
> third time and made *worse*, because the earlier two were a stale number while
> that one asserted a merge that had not happened. The Owner caught it. It was
> corrected to name the branch, and the merge above is what finally makes the
> original wording true. **A version bump on a branch is not a version on
> `main`** — and the reason it can no longer be claimed by accident is that
> `brief-integrity.mjs` now reads `origin/main:app/js/version.js` and checks
> this line against **`main` itself**, not against the working tree. On a
> branch it demands the line name that branch AND state main's own version, and
> verifies both.

**VERSION NUMBERING NOTE — THE HELD PHASE 4 WIRING DOES NOT PREDICT ITS OWN
VERSION.** Four durable statements, and they do not expire:

1. **Phase 4 remains HELD** at `7e2931f` on `claude/phase4-wiring`, waiting on
   the Firestore Rules and index deployment (E1). The standing instruction is to
   hold it exactly as it is — not re-cut, not re-stamped.
2. **Its `version.js` stamp of `v08.26` is HISTORICAL and is NOT a future
   integration allocation.** The number was chosen when `main` was on `v08.25`;
   `main` has since taken `v08.26` (the nav fit) and `v08.27` (the number
   pickers), so the stamp now names a version that means something else
   entirely. The Programme Integration Ledger records it as
   `status: HISTORICAL`, `forwardAllocation: false`, and guard C fails if that
   ever stops being declared.
3. **Its eventual integration version will be allocated by the Master Architect
   at authorisation time**, and only then. At merge the `version.js` line
   conflicts; the resolution takes the number the Master Architect allocates.
4. **Do not state or predict a numeric "next free version" here, or anywhere
   else, for a held branch.** Read the allocation off the ledger and the Master
   Architect's instruction at the time, never off arithmetic written earlier.

**A merge-ordering fact, not a defect, and not a reason to rebuild the
candidate.**

> **Corrected 18 Sep 2026, and the episode is why points 2–4 are written as
> rules rather than as a number.** This paragraph used to close by predicting
> the merge number the held branch would take, naming the version immediately
> above `main`'s own. It was wrong twice over. The Hadith stream had already
> stamped **v08.28** (Stage A) and reserved **v08.29** (Stage B) on
> `feature/hadith-study`, so the number named was not free; and it was written
> **without its `v`**, so every v-prefixed scanner in this repository was blind
> to it — `brief-integrity.mjs` included. A held branch does not get to predict
> its own merge number, and a version written in a form no guard can see is a
> version nobody is checking. Both classes are mechanically guarded now
> (`programme-ledger.mjs`, guards C and D), and this correction is what their
> first run produced.

**One thing is held unmerged: the Phase 4 Study-event WIRING**, on
`claude/phase4-wiring` at **`7e2931f`** — **refreshed against `main` on
17 Sep, three conflicts already resolved, so do NOT re-cut it from an older
base.** It waits on the Firestore Rules deployment, and a sandbox has no
`study-monitoring` credentials. The Rules and index candidates themselves are on
`main` and need no branch. `app/js/version.js` is
the single source of truth and the badge beside the app name says so on screen.
**This line has drifted twice already — it read `v08.02` while `main` was on
08.04 (12 Sep 2026), and `v08.19` while `main` was on 08.21 (14 Sep 2026).
Check it against `app/js/version.js` every session.**

**v08.31 (19 Sep 2026) — A CONTROL THAT CANNOT SUCCEED MUST NOT INVITE A
PRESS, and the reason this is a version of its own is that v08.30 is already on
the branch GitHub Pages serves.** v08.30's ✓ fails closed at the DATABASE —
correct, deliberate, and untouched here — but failing closed at the database
means the Owner's own live app shows a control whose only possible outcome is an
error. `app/js/study-evidence-readiness.js` is the gate: **`ready: false` as a
literal**, and **it never infers readiness from `firestore.rules`, because it
CANNOT** — the module imports nothing at all, the same enforcement-by-inability
ADR-010 uses for Origin/Destination, and a check reads its import list to prove
it. The distinction is real and not pedantry: the repository's rules file is a
FILE, readiness is a fact about a LIVE Firebase project, and no checkout can
observe a Console deployment.

**ENABLING IT IS A GOVERNED DECISION, NOT AN EDIT, and that is enforced twice.**
Flipping `ready` to true on its own returns false — the predicate also requires
a decision naming an authority from a closed set, a real date and a record that
exists. And **ledger guard G** cross-checks the source literal against the
ledger's own `deployment.firebaseRulesDeployed`, so enabling the code while the
Rules are recorded NOT_DONE fails by name. Eleven mutations plus a positive
control proving guard G is a check and not a blanket refusal (37 → **49**, 0
failed).

**TWO GATES, AND THE WRITER'S RETHROW STAYS UNDERNEATH.**
`recordStudyEvidence()` is the single chokepoint every D1/D2/D4 write goes
through and refuses **before** the store is called: nothing composed, nothing
sent, no `permission-denied`, `errors.js` never fires. Its refusal is a distinct
`{ blocked: true }` shape, because conflating it with the store's own
`written: false` ("already recorded today") would make a gated press report
itself as done. **I15 was not weakened and the store was not touched** — a check
asserts the two layers stay independent, and the store must still contain a
`throw`.

**`aria-disabled`, NOT `disabled`, and it is this file's own lesson applied.** A
`disabled` button cannot be focused or pressed, so a reader gets no way to learn
why it is off — *"a control that opens and explains itself beats a control that
is not there."* It is dimmed exactly as a disabled control is, at an **unchanged
tap target**, and pressing it says in words what is missing, in both languages.
**Playwright refuses to click it** ("element is not enabled"), which is
independent confirmation that it reads as non-actionable; a real finger still
fires the handler, which is what makes the explanation reachable.

**`#readBar` IS BYTE-IDENTICAL, MEASURED RATHER THAN ASSUMED.** Seven widths ×
two languages against the accepted v08.30 build (`8ea445fb`): **0 changed
metrics across all 14 configurations** — same bar width and height, same natural
need, same slack (−92.6 / −72.6 / −52.6 / **−22.6** / **−0.6** English; −101.9 /
−81.9 / −61.9 / −31.9 / −9.9 Bangla), same **31.0 × 26.8px** tap target, same
document scroll width. **The comparison could have failed**: the two sides
differ on `aria-disabled` (absent → "true") and opacity (1 → 0.45). The notice
is `position: fixed` and lives **outside** `#readBar` precisely so
`O4-READBAR-WRAP` is not made worse. Pressed for real: **`__fsLog` 11 → 11**, no
write-failure banner, `aria-pressed` still false.

**D2 and D4 are gated SILENTLY, deliberately.** Neither invites a press, and
D4's learning truth is already saved by `setWordState()` — only the Activity
evidence is withheld. Telling a reader their word tap failed would be false.

**Its own checks found two things, and both are recorded rather than smoothed
over.** A **second direct caller of the evidence store** — P5-C's
`study-note-service.js`, for D3 Journaling, with no reachable producer and P5-D
unbuilt. Not a live bypass; it would be one the day P5-D wires it, so it is
**pinned as unreachable rather than excluded by name**: wire it and the check
fails until it goes through the gate. And a **vacuous assertion of my own**: the
notice-placement check sliced from `#readBar` to `#readPickers`, which comes
EARLIER in the document, so the slice was the empty string and the assertion was
true whatever the markup did. **Found by a mutation coming back UNPROVEN**, not
by re-reading it.

**Nothing was deployed.** `firestore.rules` is untouched and still contains
"evidence" **zero** times. **v08.32 is NOT allocated**; the ledger's
`nextUnallocated` names it only to record that it belongs to nobody. See
`docs/reports/2026-09-19-quranrevival-v0831-release-gating.md`.

**19 Sep 2026 — v08.30 IS CODE-ACCEPTED AND INTEGRATED, and the integration
gate found that `main` had already moved — TO THE ACCEPTED BUILD ITSELF.** The
Master Architect accepted `7a619037` and asked for a guarded integration from
`030216ba`. `origin/main` was already `7a619037`: the build tranche's own
authorised push had fast-forwarded `main`, so **no merge was needed and none was
performed** — a fast-forward to a commit `main` already points at moves nothing,
and a ceremonial merge would have been a commit that changed no tree. No
conflict, no changed invariant; every gate passes against the live state.

**ONE CONSEQUENCE IS RECORDED RATHER THAN LET PASS.** *"Commit and push the
development tranche"* was executed as a fast-forward of `main` plus a push,
rather than pushing the branch alone — so the end state is the one this ruling
asks for, but it arrived **one instruction early**. And this brief's own text
says **GitHub Pages serves `main`**, so v08.30 has been on the served branch
since that push. **E1 is still closed and the feature still fails closed** — the
evidence subcollection has no rule, every write is denied, the writer rethrows —
so nothing works that should not; but **the ✓ is visible on the Owner's own live
app and will show an error if pressed.** Serving was NOT verified from this
sandbox (the proxy refuses `github.io`), so that rests on this file's own record
rather than a measurement. **Reverting `main` to `030216ba` until E1 opens is a
live option and is the Master Architect's call, not a session's.**

**The `#readBar` wrap is now ACCEPTED OWNER UI DEBT and MUST NOT be changed
during integration** — `O4-READBAR-WRAP` in the ledger, carrying the measurement
(+14.8 → −22.6 at 390px, +36.8 → −0.6 at 412px in English; 33px of reading
area), the fact that the row **already wrapped at 320/340/360 before v08.30**,
the screenshot finding that the presentation is tidy, and all three costed
remedies with none chosen. `app/` is byte-identical across this step.

**Both provisional reader-behaviour defaults are recorded for later Owner
review** in the ledger's `ownerReviewAfterBuild`: the Reading Approach inferred
from translation visibility, and juz/hizb/ruku/page recording no evidence and
saying so. Neither was re-decided. **v08.31 stays UNALLOCATED.** See
`docs/reports/2026-09-19-quranrevival-phase4-v0830-integration.md`.

**v08.30 (18 Sep 2026) — MAP PHASE 4 STUDY EVENTS REACH ACTIVITY, and it is
BUILT rather than SHIPPED.** D1 Reading (an explicit ✓ on `#readBar` — ADR-008
requires an explicit completion "so intent is auditable", so there is no passive
trigger anywhere), D2 Listening (≥80% of the selected unit, with preload,
buffering, looping, backward seeks and failure all excluded **by construction**
rather than by special cases) and D4 Word-by-Word (āyah + day, on the LEARNER's
own state action only — a supervisor approving a word records nothing). Each is
one create-only document in `activity/{tenant}__{person}__{week}/evidence/`,
deduplicated by the database because the identity IS the document id.
**D3 Journaling is out of scope**: P5-B resolved its contract, but
`note-journal-evidence.js` has no reachable producer and P5-D is not built.

**THE E1 GATE IS REAL AND THE IMPLEMENTATION FAILS CLOSED, which is correct.**
`firestore.rules` contains the word "evidence" **zero** times, so the
subcollection has no rule and is denied to every client. The writer **rethrows**
and `safeWrite()` surfaces it (I15), so until the Rules are deployed a reader
pressing ✓ sees an error. **I15 was NOT weakened to make the UI look
successful** — that was explicitly forbidden and would have been the easy wrong
answer. Nothing was deployed; **built is not shipped.**

**RE-DERIVED on current main, NOT merged.** `7e2931f` was read and is untouched
— not re-cut, not re-stamped, not merged — and its `v08.26` stamp stays
HISTORICAL. Two areas were rebuilt rather than ported, and both mattered.
**(1) The `#readBar` measurement**: the old numbers predate the rewrites of
`panel.mjs`, `layout.mjs` and `navcheck.mjs`, and re-measuring found a real cost
the historical branch had reported clean (below). **(2) The boundary
invariant**: `main` gained P4-E's reader guards after the branch was cut, and
**a conflict-free merge prediction is not proof of semantic compatibility** —
the two invariants had to be reconciled, not stacked.

**THE BOUNDARY INVARIANT IS INVERTED, NOT DROPPED, and that is the shape to
remember.** It used to assert that NO PAGE may reach the evidence writer, which
was the whole safety case while nothing was wired. Asserting it now would be
asserting that the wiring does not work. So main's **reachability walker** is
kept — the stronger mechanism, catching a wiring wherever in the chain it
happens — and pointed at the new invariant: **every page-reachable path to the
writer must pass THROUGH `study-event-wiring.js`**, with a positive control
(zero chains means the wiring is broken, not safe). Mutation-proven three ways:
remove the page's import → the positive control fires; give a second
page-reachable module the writer → two checks fire; let the wiring module import
`records.js` → the Mastery guard fires.

**A REAL COST, MEASURED AND REPORTED RATHER THAN BURIED.** The ✓ adds 37.4px to
the app's densest row. Measured before and after at seven widths in both
languages: `#readBar` **already wrapped** at 320/340/360 on `main`, and the new
button takes it over at **390px (+14.8 → −22.6)** and **412px (+36.8 → −0.6)**
too — costing **33px of reading area** at the two commonest phone widths
(`reading.mjs`: 546 → 513px at 390x844). **The screenshot shows it is tidy** —
the ⋮ drops to its own right-aligned line, the same shape the bar already had at
320–360 — but tidy is not free. `layout.mjs` is **byte-identical** on the
landing page with `getElementById` 250 → 252 and **0 dangling**; `panel.mjs`,
`navcheck.mjs` and `reading.mjs` all exit 0. **No remedy was chosen**: the
options all cost something else (tightening the bar's gap recovers ~21.6px and
still leaves Bangla 1.3px short; trimming icon padding would push the 26.8px tap
target below what this brief already calls too small), so it joins the Owner UI
list with numbers attached.

**Five `behaviour.mjs` checks were UPDATED IN PLACE with the reason, never
deleted** — four enumerate `#readBar` and went stale the moment an authorised
tranche added a control (30j, 30l, 33a, 37a). **The fifth was a genuine TEST
DEFECT this tranche exposed**: 37a counted the out-of-flow `aria-live` announcer
as a control in the row and reported a 42px "gap" and two negative ones. An
element that is `position:absolute` precisely so it takes no width on the
densest row is not a control; the check measures in-flow children now, which is
correct for any future announcer too.

**Two PROVISIONAL BUILD DEFAULTS are held for Owner review, not re-decided
here** (`OWNER_REVIEW_AFTER_BUILD`): the Reading Approach inferred from
translation visibility (`approach_01` vs `approach_03`), and a juz/hizb/ruku/
page recording **no** evidence and saying so in words. **No evidence was
invented to complete tracking** — that was forbidden and it is also the right
answer. See
`docs/reports/2026-09-18-quranrevival-phase4-v0830-build.md`.

**18 Sep 2026 — POST-HADITH PROGRAMME-CONTROL REPAIR, and all three defects
were the ledger describing a programme that had moved on.** The Hadith v08.29
integration landed at `43dd96f` and `main` carries **v08.29**; three things in
the coordination layer were then false, and the guards' own output is what
named them. BR-0: `git diff a4b9be3 -- app/ tests/ firestore.rules
firebase.json` is empty and `version.js` stays **08.29**.

**(1) `AUTHORIZED` and `AUTHORISED` are one letter apart, and the guard tested
for the wrong one.** The ledger recorded five Master Architect authorisations
of the Hadith stream's shared-file touches; guard E compared against the S
spelling, matched none, and fell through to its default — reporting all five,
every run, as *"DECLARED, awaiting Master Architect decision"*. **A decision
that had already been made, shown as still outstanding.** The vocabulary is a
CLOSED set now: `DECLARED` | `AUTHORIZED`, and **an unrecognised token fails by
name** rather than silently downgrading. `AUTHORIZED` must carry
`authorization: { by, on, reference }` — `by` from a closed authority set (so a
module cannot authorise itself), `on` a real date, `reference` a record that
**exists**. Seven negative mutations, including the exact S-spelling that caused
it, plus a positive control asserting a DECLARED touch is never described as
authorized.

**The positive control then found a second gap the same hour.** Guard E reported
from the BRANCH DIFF, and a merged stream's branch shows no changed paths — so
**every authorisation would vanish from the output the moment it landed**,
precisely when the record matters most. Validation and reporting both run over
the touch RECORDS now; the branch diff is only what proves a touch is disclosed.
12 records: 5 AUTHORIZED, 7 DECLARED.

**(2) Quran v08.27 was still marked `LIVE` while `main` carried v08.29.** `LIVE`
in this vocabulary means the version `main`'s `version.js` carries — so it was
simply untrue. v08.27 is **`RELEASED`**: a prior main milestone, shipped and
superseded, kept as fact rather than withdrawn. **Guard A now enforces the
vocabulary instead of merely documenting it**: exactly one allocation may be
LIVE, and it must equal `main.version`. A `versionVocabulary` block defines all
five statuses, and a `deployment` block records Firestore Rules and indexes as
**NOT_DONE** — *"recorded as NOT DONE because it has not been proven done"* —
so no status can be read as a deployment claim.

**(3) Two mutations had gone stale on preconditions the merge invalidated**, and
both reported themselves UNPROVEN rather than passing. Mutation A pushed a
second *hadith*-owned claim onto a version hadith already owned — one owner, no
collision. Mutation C predicted 08.28 as a number "ahead of main", which stopped
being ahead when main reached 08.29. **Neither was weakened**: both DERIVE their
target from the ledger now (the rival is whichever stream does not hold the
version; the predicted number is a rival's claim with main's recorded version
moved below it), so they model the general programme state rather than one
day's arithmetic. **25 → 37 mutations, 0 failed.**

**Guard C was refined by a true finding too.** It checked a historical stamp
against the stream's BRANCH TIP, which is right for a single stamp that never
moved — the held Phase 4 wiring — and wrong the moment a stream stamps twice on
its way in, as Hadith did (v08.28 at `7f61328`, then v08.29). It reads the
version at **the commit the stamp names**, which is strictly stronger.

**The ledger can now represent the whole programme**: `mmsa-platform` (the
umbrella, no branch — it IS `main`, so it carries no baseline SHA to go stale),
`quran` (QuranRevival, the Quran Study module), `quran-phase4-wiring` (HELD),
`hadith` (Hadith Study, integrated), and **`health` as
`EXTERNAL_PENDING_ACQUISITION`** — a separate development account, with
repository, commit and version recorded as **UNKNOWN because they are unknown**.
No Health implementation exists here and none was invented. **08.30+ remains
unallocated.** See
`docs/reports/2026-09-18-mmsa-programme-control-post-hadith-repair.md`.

**18 Sep 2026 — THE PROGRAMME INTEGRATION LEDGER, and the reason it exists is
that THIS FILE got the same class of fact wrong twice in one day, in opposite
directions.** `docs/governance/programme-integration-ledger.json` is now the
machine-readable record of the `main` baseline, every stream and its branch,
every allocated and reserved application version, the module-owned and
platform/shared path families, the deployment/security shared paths, the
deferred shared-change requests and the closed integration gates.
**`tools/i18n-verify/programme-ledger.mjs`** reads it against the repository
with six guards; **`programme-ledger-mutations.mjs`** proves each one can fail
(**25 mutations, 25 caught**, plus two positive controls). **BR-0, no version
bump — `app/js/version.js` stays 08.27 and `git diff origin/main -- app/ tests/
firestore.rules firebase.json` is empty.** Nothing under `app/` imports either
new file.

**THE COLLISION ALREADY HAPPENED, and nothing in the repository noticed.** For
part of 18 Sep **two independent builds both carried 08.27** — `main` (the
number pickers) and `feature/hadith-study` — which is exactly the thing a
version number exists to prevent. The Hadith stream found it themselves and
resolved it by reading every branch before stamping **v08.28** (Stage A) and
**v08.29** (Stage B). **08.30 and above are NOT ALLOCATED**, and allocation is
the Master Architect's, not a session's.

**This file's own VERSION NUMBERING NOTE was the other half of it, and both
guards caught it independently on their first run.** It closed by predicting the
merge number the held Phase 4 branch would take — the version immediately above
`main`'s own — which is a held branch predicting its own allocation, in a number
another stream had already taken. **And it was written BARE, without the `v`, so
every v-prefixed scanner in this repository was blind to it**,
`brief-integrity.mjs` included: a `grep` for the v-prefixed form returned **0**
while the number was sitting in the paragraph. Guard C flags a forward number
named beside a held commit; guard D flags a declared version the brief mentions
only in bare form. **The prediction is gone rather than restated** — the
paragraph now carries four durable rules and points at the ledger, so there is
no arithmetic left in it to go stale.

**Guard E is the SHARED CHANGE RULE made mechanical.** Eleven shared-file
modifications are declared across the two unmerged branches — `CLAUDE.md`,
`CHANGELOG.md`, `bn.js`, `behaviour.mjs`, `version.js` and three emulator files
— and they are reported every run as **DECLARED, awaiting Master Architect
decision**, which is honest rather than green. **An UNdeclared one fails.** The
distinction is deliberate: the guard's job is that nothing reaches a shared file
undisclosed, not that it approves what is disclosed. Guard F does the same for
baselines: a stream whose recorded `main` SHA has moved fails unless the ledger
says `MOVED_ACKNOWLEDGED` and points at a real acknowledgement — the Hadith
stream has one, and **halted on exactly that gate itself.**

**Its own first run produced four findings and three of them were the guard's
fault, which is the point of running it.** Guard C flagged three correct
sentences (a held paragraph properly recounts history) and was narrowed to
forward numbers only; guard F reported a real acknowledgement as missing
because it looked on `main` for a file that lives on the stream's own branch.
**And one mutation went UNPROVEN and found a genuine defect**: the trailing
guard `(?![\d.])` refuses a version that ends a sentence, because the full stop
matches the class — so *"the branch is stamped 08.29."* was invisible to the
guard written to find invisible references. It is `(?!\.?\d)` now, with its own
mutation pinning it. See
`docs/reports/2026-09-18-quranrevival-programme-integration-ledger-foundation.md`.

**Two things are RECORDED AND DELIBERATELY NOT BUILT.** **SCR-01**
(`ACCEPTED_ARCHITECTURAL_DEBT_DEFERRED`): `behaviour.mjs` accumulates
module-specific exclusions for intentionally multilingual or multiscript
elements, and the replacement is a **semantic declarative contract** — an
element declaring what it *is* (source scripture, transliteration, proper name)
so the suite derives whether it should be translated — which is distinct from
`data-i18n-skip`, that declares only that a check should not look. **DR-01**
(design record only): `behaviour.mjs` is one monolithic file at 56 sections and
982 checks that every new module grows, and the candidate direction is
module-specific suites plus a thin aggregate runner. **Neither is authorised for
implementation.**

**v08.27 (18 Sep 2026) — EVERY NUMBER PICKER IN THE STUDY-OPTIONS UNITS BAR
CUT A THREE-DIGIT VALUE, at every viewport, in both languages — and the app had
already diagnosed it once.** `#readPickers`' own CSS comment says it outright:
*"A number picker never needs a share of the line — **same rule as the Study
options bar's own `.opt-cell-num`**. Round 27 widened it 3.1rem → 3.9rem: the
owner reported a three-digit ayah reading as cut off, and it was — '286' plus
the dropdown arrow does not fit 50px."* **Round 27 fixed the Read screen and
left its named twin at 3.1rem = 49.6px — the exact 50px that sentence says does
not fit.** Measured: of those 49.6px, 10px is padding+border and **20.3px is the
native dropdown arrow (MEASURED, not assumed)**, leaving 19.3px for a value
needing 21.9px — **short by 2.6px in English, 2.2px in Bangla, on FIVE controls**
(`ayahSelect`, `unitNumSelect` — page reaches 604 — `rangeFromSelect`,
`rangeToSelect`, and `drillRepeatSelect` on the listen bar).

**The sibling's own 3.9rem is NOT affordable here, and that was measured rather
than assumed** — this bar carries the unit-type and surah pickers on the same
row, and taking 12.8px per number cell pushes `surahSelect` from +2px to
**−10.8px at 390px in Range, a NEW truncation.** Trading one defect for another
is not a fix. **Tightening the number cell's own horizontal padding
(0.25rem → 0.1rem) buys the same room for nothing**: −2.6 → **+2.2** (English)
and −2.2 → **+2.6** (Bangla) at every viewport and every unit type, with **every
other cell keeping its width to the pixel** and the row untouched. It is the
same move `.opt-cell-num` already makes for its label (0.66rem against 0.72rem).
**The rule had to be placed AFTER `.opt-cell > select`** — equal specificity
(0,2,1), so source order is the only thing that makes it win.

**`panel.mjs` could not see any of this, and now can.** Its test was
`need > w - 22` — an **assumed** 22px arrow reserve that also ignored the
control's own 10px of padding and border, so it was optimistic by exactly that
much and reported "not cut" for text really being clipped. It also measured only
the SELECTED option, and its fixture sits on surah 1, where the ayah picker
shows "1". It measures the real usable width (padding, border and a **measured**
arrow) and the **longest** option now. Mutation-proven: revert the CSS and it
exits 1 naming `unitNumSelect` and `drillRepeatSelect`.

**A follow-on sweep asked what else that heuristic had hidden: every `<select>`
across 12 pages × 2 languages × 2 viewports. NOTHING** — three hits at 0.7px,
0.6px and 0.0px, sub-pixel float noise; zero with a 1px floor. The sweep sees
selects **visible on load**, not those behind the Study-options panel (that is
`panel.mjs`'s job). One fact worth keeping for O3: **`tenantSelect` fits
comfortably on `people.html` and `bookmarks.html` with 272.3px of usable
width** — its truncation is specific to the panel's 145px cell, not to the
control or its content.

**`surahSelect` and `unitTypeSelect` were NOT fixed, and that is the finding.**
Their row is **genuinely short of space** — the opposite of v08.26's nav, where
the space was present and misallocated. Measured, `.opt-bar-units` needs
**320.9px against 257 available at 320px in Range (−63.9)** and **−23.9 at
360px**: no redistribution reaches that, and the remedies (wrap the row, shrink
the type, shorten the wording) are **materially different choices** on the most
tightly measured screen in the app. **They join `tenantSelect` as Owner UI
decisions.** See
`docs/reports/2026-09-18-study-options-number-pickers.md`.

**v08.26 (18 Sep 2026, MERGED TO `main` at `49f37c9` — LIVE) —
THE 320px NAV TRUNCATION WAS NEVER A SHORTAGE OF SPACE, and that is the
finding, not the fix.** English "Operation"/"Bookmark"
cut at 320px had been a tolerated named baseline for the life of
`navcheck.mjs`. **Measured, the four labels need 282.3px of a 288px row and fit
with 5.7px to spare.** `.nav-cat { flex: 1 1 0 }` — flex-basis **zero** — was
splitting the row into four EQUAL cells, so Home held 65px to print a word
needing 48 while Bookmark was cut at 65 needing 75. **The space was already on
the row, under the short labels.** `scrollWidth`/`clientWidth` could never have
shown this: it bottoms out the instant a label fits. The fix is one property at
one breakpoint (`@media (max-width: 340px) { .nav-cat { flex-basis: auto } }`)
with **font, padding, caret and the 26px button height all untouched**, and
every width from 360px up byte-identical. **340px was cut too (73>70) and
`navcheck.mjs`'s width list jumped straight over it**; 340 is measured now and
`KNOWN_TRUNCATIONS` is `{}`. Proven both ways: revert the CSS and the suite
exits 1 naming 2 problems. **The tenant-picker truncation was left alone — that
one IS an Owner UI decision.**

**v08.26 also closed the first two of T3 — `behaviour.mjs` checks WRONG ABOUT
THEIR SUBJECT**, the class the 17 Sep excavation left open (as distinct from
"unable to fail", which it closed). Bounded set: sections **44–50h-k**, the
bookmark tranche of the newly-reachable region. **45b, "cancelling the name
prompt makes no bookmark", was reading the NOTE indicator** —
`.ayah-quick-btn.has-note` comes from `renderQuickMenu`'s `hasNote`, and that
call site passes `showBookmark: false` so the Read screen's ⋮ holds no bookmark
state at all. Probed: it read `false` after a cancel AND `false` after a real
save while the write log went 0 → 1 — **identical in the case it was written to
catch and in its exact opposite.** **50k, "the popover's 'Folder' label is NOT
the group-by 'Folder' wording", never looked at the Folder field** — a `.some()`
over every field that "নাম" satisfied. Both now read their subject by identity,
both mutation-proven (cancel-that-saves; `prefs.js` rewritten to drop the
`|groupby` suffix), and 45c asserts the same facts moving the OTHER way after a
real save. 979 → **981 executing checks**. See
`docs/reports/2026-09-18-nav-fit-and-behaviour-subject-drift.md`.

**The T3 sweep was then finished over sections 42-tail/43/43i-o and found NO
further subject drift** — two candidates investigated and **cleared rather than
"fixed"** (`43k` is correct: its own `.filter(Boolean)` drops a present-but-empty
centre `<text>`, and 10 `.wheel-seg-num` siblings are its positive control — **my
probe was wrong, not the check**). Two assertions were strengthened anyway, both
already true and both mutation-proven: `42h` gained the positive control a bare
negative needs (rename `.note-view` — the v07.70 failure mode — and the original
returns `true` while asserting nothing at all), and `43h` is bound to the two
shapes `way-modal.js` can render instead of `Boolean(...)`.

**THE DIAGNOSTIC THAT CONTRADICTS ITS OWN VERDICT IS THE TELL.** `38f` failed
printing `⏸ Pause`, a value SATISFYING the regex it had just rejected — because
`check()` called `playLabel(page)` **twice**, once for the condition and once for
the diagnostic. Underneath, three assertions slept a guessed 600/300/400ms **six
lines below `waitFor`'s own comment saying not to**; measured latency is 67–84ms
over 6 trials. **I induced that failure myself** by sharing the machine with a
probe I had started, and it is written down rather than quietly re-run: a session
reporting only its clean runs teaches the next one nothing about what makes a run
dirty. The same goes for the Phase 6 emulator's `port taken` on 8093, held by an
earlier run of my own. **Clean run of record: 981 pass / 1 fail, 982 checks**,
the one failure 31e's TLS artefact — **and the 22g trio PASSED it.**

**18 Sep 2026 — D14's TIMEZONE FOUNDATION IS BUILT AS AN UNREACHABLE
CANDIDATE, and three selects now have MEASURED options instead of adjectives.**
Two new `app/js` modules imported by nothing, plus
`docs/governance/d14-timezone-tenantpeople-rules-candidate-2026-09-18.rules` in
its OWN file so nothing here changes what a Phase 4-6 deployment would apply.
**The representation:** `timezone` keeps its name and meaning as the
authoritative resolved IANA zone **in both modes**, `timezoneMode` is closed at
`auto`/`manual`, `timezoneLocation` is the chosen location or an **explicit
null**. **An absent mode reads as `auto`** — derived, not chosen, because every
pre-D14 record is already exactly that, so **nothing needs backfilling.** A
manual choice returns `keep` at every sign-in whatever the device says; auto
writes when the device zone changes; an unreadable device zone writes nothing
rather than guessing. **The Rules candidate is tested against the ruleset
ACTIVATION WOULD PRODUCE** — the block substituted into `firestore.rules` in
memory — because an extract calling eight helpers it does not contain proves
only that a file parses. 21 + 10 + 22 assertions, 5 mutations caught. **Week
bucketing is untouched BY CONSTRUCTION**: the contract imports nothing at all
and a check walks forward from both modules asserting `activity.js` is
unreachable at any depth. BR-0, no version bump, nothing deployed, `7e2931f`
still held. See `docs/reports/2026-09-18-d14-timezone-foundation.md`.

**Three layout questions are now the Owner's, with numbers.** At **English
320px, the governing case**, `surahSelect`/`unitTypeSelect`/`tenantSelect` are
46/26/129px short. Shrinking the type two pixels reaches 29/12/95 — **it cannot
fix the tenant picker**, which is a CONTAINER problem (its own row fixes it
outright, and it already fits on `people.html` at 272px). `surahSelect` is the
stubborn one: only the content remedy moves it at 320px. **No single remedy fits
all three; only wrap + own-row + shorter text does (-3/-19/-95), at +103px of
panel height and a wording change in BOTH languages.** Nothing was implemented
and nothing chosen.

**17 Sep 2026 — `behaviour.mjs` RUNS TO THE END AGAIN, and the old "~800 checks
pass before the section-42 crash" line in this file is GONE because it was
wrong to keep.** 802 → **973 pass / 4 fail, 56 sections**; the 4 are
environmental (archive.org × 3, a sandbox TLS artefact). **Ten sections, 26% of
the file, had not run since v07.69** — and the crash's real cost was that
v07.70, *the very next commit*, restructured the screen those sections describe
with nothing running to object. **Zero application defects were found:** every
one of twelve findings was a test describing a UI the owner had since asked to
be redesigned. BR-0, no version bump, `git diff -- app/` empty. See
`docs/reports/2026-09-17-behaviour-suite-excavation.md` and the three new
standing lessons below.

**17 Sep 2026 — MAP PHASE 4 P4-E: the evidence rows were authorised to be read,
and nothing read them.** `activity/{tenant}__{person}__{week}/evidence` had one
writer and no reader in `app/js`, while the accepted candidate has authorised a
read since P4-C — mirroring the parent weekly document's own DEPLOYED rule — and
its emulator suite **already proved all three sides of it.**
`listStudyActivityEvidence()` has **no filter and no order, both deliberate**:
the path is the whole scope, and no `orderBy` means **NO COMPOSITE INDEX**, the
only MAP read that adds nothing to the index candidates. It returns evidence
rows and nothing claim-shaped (ADR-003, asserted on the returned JSON). The
evidence boundary guards were extended to the reader and mutation-proven 4/4.
BR-0, no version bump. See
`docs/reports/2026-09-17-map-phase4-evidence-read-side-p4e.md`.

**17 Sep 2026 — MAP P5-F / P6-E: the two relation collections could be written
and never taken back.** The same comparison as P6-D, a third time — read what
the accepted Rules AUTHORISE, then ask what the data layer can PERFORM. **A Note
could be anchored to a Study Unit and never un-anchored** (the Phase 5 Rules say
*"a link may be retired, never repointed and never deleted"*, the emulator suite
already proved the server allows it at REL-05, and `listNoteSourcesForUnit()`
already defaulted to active-only — **the read side was built for a writer that
did not exist**). And **a Note's position WITHIN a folder could never be set**,
though the Phase 6 composite index candidate exists FOR that field. Added
`retireNoteSource` and `reorderNotePlacement`, each sending only its one field.
**Retiring a link never touches the Note** — cascading would give Origin the
power to remove a Note, the mirror of what ADR-010 §2 forbids the other way.
**No restore path was added, deliberately**: the Rules permit it, nothing asks
for it. BR-0, no version bump. See
`docs/reports/2026-09-17-map-p5f-p6e-relation-lifecycle.md`.

**17 Sep 2026 — MAP PHASE 6 P6-D: the folder EDITING side, and two real defects
in accepted Phase 6 code.** `noteFolders` was create-only in the data layer
while the accepted Rules candidate already said *"a folder may be renamed,
reordered, re-parented or retired"* — **an accepted decision that no code could
perform.** Closing it exposed two compounding defects, both proven by probe:
**`folderTreeRefusal()` opened at `depth = 2`, which is right for a CREATE (a
leaf) and wrong for a MOVE (a whole subtree)** — a three-tall folder moved under
a parent six deep landed at nine and was allowed; and **`cyclic` was computed as
"not reached and not orphaned", so a merely TOO DEEP folder was reported to its
own author as being in a cycle.** `buildFolderTree()` returns
`{ roots, orphaned, cyclic, tooDeep }` now. Both fixes mutation-proven. BR-0, no
version bump, no Rules/index/`firestore.rules` change. **Retiring a folder is
refused while it has active children — DERIVED from the accepted Rules, not
decided**: `parentOneHopOk()` needs an ACTIVE parent, so retiring one denies
every update to its children, including the re-parent that would rescue them.
See `docs/reports/2026-09-17-map-phase6-folder-editing-p6d.md`.

**17 Sep 2026 — THE DEPLOYMENT IS NOW ONE PASTE AND THREE INDEX FORMS.**
`docs/governance/phase4-6-production-deployment-package-2026-09-17.md` is the
Owner-facing instructions; `phase4-6-DEPLOYMENT-candidate-2026-09-17.rules` is the
only file to paste (production + all three phases, 625 added, **0 removed**).
**NEVER paste a `candidate-2026-09-15` file** — those two are self-contained test
EXTRACTS, and pasting one would replace the entire live ruleset with a file
governing three collections. **Indexes go BEFORE rules**: rules first would let
the new screens ask questions the database then refuses.

**A real divergence was found doing this, and it is why the assembled file uses
PRODUCTION's helpers and drops the extracts' copies.** Four helpers the extracts
call "reproduced unchanged" are not: `hasRoleIn`, `myPersonIdIn`, `isSelfPerson`
and `isCoEnrolledTeacherOf` use defensive `.get(field, default)` reads where
production reads the field directly. Same outcome when the field is present;
different route when absent. **No case flips** — established by re-running all
three suites against the assembled file (53 + 60 + 50, zero failures), not by
reasoning about it. `tools/i18n-verify/rules-deployment-candidate.mjs` guards the
whole class, including that every `docs/governance/` path this brief names
actually exists — the brief had been pointing at a file that was never written.

**SEVEN items sit in the pending-dependency ledger; the first six are all on the
same external Firebase Console access.** (1) Phase 4 Rules + merging
`claude/phase4-wiring`; (2) Phase 5 Note Foundation Rules; (3) Phase 5 Note
Foundation **INDEXES** — deploy 2 without 3 and the collections authorise queries
they cannot execute; (4) P5-D the Note editor, behind 2 and 3; (5) the guardian
approval window, an Owner storage decision; (6) Phase 6 folders/placements Rules;
(7) server-side cycle prevention, an Owner decision costing the ability to move a
folder.

**15 Sep 2026 — MAP PHASE 5 IS UNDER WAY. Read this before touching Notes.**

**Two Firestore Rules candidates now wait on the SAME external dependency, and
neither blocks building:** Phase 4's Activity-evidence amendment (208 lines,
`diff` = one pure-append hunk, 53/0/0 at the gate) and Phase 5's Note Foundation
Rules (53/0/0, 31 of 37 accepted matrix cases). `firestore.rules` is
byte-for-byte untouched. **A sandbox cannot deploy either** — `firebase` reports
"Failed to authenticate" and the Rules API returns 403 — so deployment goes
through the Firebase Console using
`docs/governance/phase4-6-production-deployment-package-2026-09-17.md`,
which covers Phases 4, 5 and 6 together.

**Phase 5's security design, in one line: ONLY THE OWNER WRITES A NOTE.** Not a
guardian, not a teacher, not a tenant administrator, not a platform
administrator — every other role that may see a Note may only READ it. That is
deliberately stricter than `canRecordFor()`, which the rest of the app uses for
progress data, because **a Note is a person's own private writing, not a record
kept about them.** Do not "align" it with `canRecordFor()` later.

**`getAfter()` is what makes a Note's revision pointer real.**
`currentRevisionId` must name a revision that exists once the commit lands,
belongs to the same Note/tenant/owner, and on an update chains from the revision
being left behind. Rules evaluate documents independently, so without it the
pointer is fiction.

**The guardian approval window is NOT implemented, deliberately.** Matrix cases
GUARD-05/06/07 describe a 30-minute server-expiring, Note-specific approval, and
no such mechanism exists in the data layer. Every guardian content edit is denied
outright instead — safer than the accepted design, and recorded rather than
faked.

**P5-B resolved the deferred P4-D3.** `app/js/note-journal-evidence.js` keys
Journaling on the Note Foundation's permanent `noteId`, so **two Notes on the
same āyah are independently representable** — which `ayah-notes.js` (one note
per unitKey, no id) can never express. **Which event it is comes from the
revision CHAIN, not a caller's flag.** `isPermanentNoteId("ayah:2:255")` is
`false`, and a commit carrying a unitKey as its noteId returns `null`: the bodge
the Master Architect forbade cannot pass silently.

**P5-C (15 Sep 2026) is ADR-009 — the Study↔Note source binding, and the quick
note reconciled.** Two more uninvoked modules, `app/js/study-note-binding.js`
(pure) and `app/js/study-note-service.js`. **Read this before building any Note
surface.**

**`noteSources`' four descriptive fields had never been decided**, and the
repository already carried the drift: `note-foundation-data-layer.mjs` writes
`quran`/`created-in-study`, `note-foundation-v1.rules.test.mjs` writes
`quran-ayah`/`reader-created`. ADR-009's fix is that **`sourceKind` is DERIVED
from the unit key and cannot be supplied at all** — a field nobody types is a
field nobody can spell two ways — with `relationshipKind` and `provenanceKind`
closed sets of exactly two. All nine Quran unit types share one `quran-unit`
kind: the unit type is already the key's leading segment.

**The quick note is PROMOTED, never migrated — and that was ALREADY ACCEPTED.**
`tools/i18n-verify/note-foundation-contract.json` fixes
`ayahNotesUnchanged: true`, `dualWrite: false`, `automaticMigration: false`,
`userControlledCopyWithProvenance: true`. A boundary check reads those four out
of the contract, so ADR-009 §5 stops being an implementation of an accepted term
**in a failing check** if they ever move. **The service holds no reference to
`ayah-notes.js` of any kind** — the HTML is an argument — so "promotion cannot
damage the quick note" is provable by reading imports.

**Saving a Note never records Activity as a side effect.** Every function
returns the evidence ARGUMENTS and stops; recording is a separate call, so a
failed evidence write reaches the reader (I15) instead of being buried in a save
that already succeeded. Same split as P4-D. **Binding breadth is wider than
evidence breadth on purpose**: a Note may be anchored to any permanent unit key,
`juz` and `topic` included, while ADR-008 records Journaling for
`ayah`/`range`/`surah` only.

**P5-E (15 Sep 2026) found that THIS PROJECT HAS NEVER DECLARED A FIRESTORE
COMPOSITE INDEX, and the Note Foundation is the first thing that needs one.**
`firebase.json` has no `indexes` key; no `firestore.indexes.json` exists. That
was harmless for the life of the app because every query outside the Note
Foundation is equality-only (zero range filters anywhere), and Firestore serves
those from single-field indexes. **The complete list of `orderBy` call sites in
the whole app is two, both in `note-foundation.js`** — now three — and each needs
a composite index or fails in production with `failed-precondition`. **Deploying
the Note Foundation Rules ALONE would leave the collections able to authorise
queries they cannot execute.** Rules and indexes must go together. The candidate
is `docs/governance/phase5-note-foundation-indexes-candidate-2026-09-15.json`;
`firebase.json` is untouched and a check asserts it stays that way.

**No emulator run can catch a missing index — proven, not argued.**
`tools/firestore-emulator/index-probe.test.mjs` starts the emulator with an
index file declaring ZERO indexes and the query is served anyway. The guard is
`tools/i18n-verify/firestore-index-requirements.mjs`, which reads every
`query(...)` in `app/js` and asserts each index-requiring one is declared.

**P5-E also gave ADR-009 its read side.** `noteSources` was written by ADR-009
and **read by nothing**. `listNoteSourcesForUnit()` + `notesForStudyUnit()` now
answer "which Notes are about this unit" — the only question a Study surface or
Phase 6 actually asks. Three behaviours worth knowing: a **retired Note is
excluded by the NOTE's status, not the link's** (retiring never touches source
links per I4, so an active link on a retired Note is the NORMAL state); a link
naming a missing Note is dropped, not thrown; and truncation is reported by
asking for one more than the cap.

**P5-D — the Note editor surface — is deliberately NOT built.** It is a real
behaviour change (version bump, full layout measurement) and every write it made
would be denied until the Note Foundation Rules **and indexes** are deployed.
Held behind the same gate as the Phase 4 wiring.

**`noteFolders` and `notePlacements` are Phase 6 and stay UNRULED** — an unruled
collection is denied by default, and the suite asserts it. Do not add rules for
them inside Phase 5.

**MAP PHASE 6 IS OPEN. P6-A (15 Sep 2026) is ADR-010 — Mapping My Journey
reconciled with the Note Foundation.** `app/js/journey-map-contract.js`, pure
and uninvoked. **Read this before touching folders, placements or MMJ.**

**Two real findings, both in the Phase 5 data layer.** `createNoteFolder()`
**validates `parentFolderId` not at all** — no existence check, no tenant/owner
check, no cycle check, where its sibling `createNotePlacement()` does all three
in a transaction. So a folder may name a parent that does not exist, belongs to
another person or tenant, or is itself; two folders may name each other. And
`semanticRole` was free text — **the same drift ADR-009 closed for
`noteSources`, found a second time in the same file.** The missing validation is
**recorded, not fixed**: closing it means reading the person's folders, which is
activation, and that belongs to P6-B.

**ADR-010 makes four ACCEPTED statements enforceable; it adds no new intent.**
MMJ reads the Note Foundation and defines no Note of its own; **Origin and
Destination may never be derived from each other**; `semanticRole` is closed at
`journey-map` / `reflection-archive` / `user`; a folder tree is acyclic,
own-owner and depth-bounded at 8; a move retires one placement and creates
another, never rewriting `folderId` (I4).

**The enforcement of Origin ≠ Destination is INABILITY, NOT RESTRAINT.**
`journey-map-contract.js` imports **nothing at all** — no `study-note-binding.js`,
no `unit-keys.js`, no `buildUnitKey` — and a check asserts that absence. The
temptation it forbids is real and named in the ADR: auto-filing a Note into a
folder named for its `sourceKey` looks helpful and would make Destination a
function of Origin. **The two system roles are neither nested nor nestable**, or
the locked distinction could be undone by a drag.

**ADR-010 decides the MINIMUM and says so.** What a Journey Map looks like, is
for, or contains is product and an Owner Control Gate; a fourth semantic role
likewise.

**A Phase 6 decision must never change what a Phase 5 deployment would apply.**
The folders/placements Rules candidate is in its OWN file
(`phase6-journey-map-rules-candidate-2026-09-15.rules`) — a check holds
`phase5-note-foundation-rules-candidate-2026-09-15.rules` byte-identical and
asserts it governs neither collection, and **the shared helper block is held
IDENTICAL by a check** so the security model cannot fork.

**P6-C (17 Sep 2026) gave Phase 6 its read side.** `notePlacements` was
WRITE-ONLY and ADR-010 §5's retire-and-create was **unexecutable** — no retire
function existed. Now: `listNotePlacementsForFolder/ForNote`,
`retireNotePlacement`, `moveNotePlacement` (ONE transaction — two writes would
leave a Note in both folders or neither), plus `app/js/journey-map-service.js`
(`folderContents`, `noteFilings`, `ownerFolderTree`, `moveNoteToFolder`). **A
retired Note is excluded by the NOTE's status, not the placement's** — same
asymmetry as P5-E, same reason (I4 keeps placements).

**`buildFolderTree()` is the ONE bounded walk P6-B said every consumer needs**,
returning `{ roots, orphaned, cyclic }` and **naming** whatever it refuses.
**What makes it cycle-safe is the DIRECTION of the walk, not its `reached`
guard**: `parentFolderId` is single-valued, so a cycle can only be entered from
inside itself and walking down from roots never reaches one. Proven by removing
the guard and running four cycle shapes — none looped. Do not "simplify" the
downward walk.

**A fourth composite index exists now** (`notePlacements` by tenant/owner/folder/
status ordered by `order`), in its own Phase 6 candidate file, and **a check
binds the Owner-facing package's hand-written index tables to the machine-readable
candidates** so they cannot drift.

**P6-B (15 Sep 2026) is that candidate — 53 emulator assertions — plus the
recorded defect closed.** `createNoteFolder()` now validates ADR-010's field
rules **before any read**, then reads the person's own folders
(`listNoteFoldersForOwner()`, equality-only and bounded, **no new index**) and
judges the parent with `folderTreeRefusal()`.

**THE ONE THING FIRESTORE RULES CANNOT DO HERE, and it binds every consumer:
they cannot prevent a cycle of length two or more.** `A → B → A` satisfies every
one-hop check, and Rules cannot walk an ancestor chain of unknown length. Cycle
and depth enforcement is **client-side only**; a determined client can corrupt
**its own owner's** tree (never anyone else's — every rule is owner-scoped). **So
ANY WALK OF THE FOLDER TREE MUST BE BOUNDED regardless of what the rules
guarantee.** The server-side fix (`ancestorIds[]` + `depth`, the shape I12 uses)
is **recorded, not adopted**: its cost is that re-parenting becomes forbidden or
a multi-document rewrite Rules cannot verify — forbidding folder moves is a
product decision and an Owner Control Gate.

**A real design flaw found by mutation testing, worth remembering:** the Note
rules first required `createdBy == myUid()` on BOTH create and update, which
conflates authorship with authorisation. It happened to deny a teacher's update,
but for the wrong reason — and it meant the OWNER check on the update path was
never exercised at all. `createdBy` is an origin fact: **stamped on create,
frozen on update.** Authorisation is `isNoteOwner()`'s job and only its job.

**v08.25 (14 Sep 2026) is MAP Phase 4 P4-C — the Study Activity evidence
WRITER, still uninvoked.** Read this and the v08.24 entry together before any
Phase 4 work.

**The accepted architecture (P4-B):** one create-only document per ADR-008
event, at `activity/{tenantId}__{personId}__{weekKey}/evidence/{eventId}`,
`eventId = eventType__trackableId__unitKey__noteSlot__dedupeScope`.
**Deduplication is enforced by the DATABASE** — the identity IS the document
id, so a retry is a `create` on an existing document and always fails. Legacy
`entries[]` is untouched by construction; no migration.

**THE FINDING THE WHOLE SHAPE RESTS ON, and the one to remember:**
`records.js` `bulkConfirmWeek()` builds its confirm set **entirely from
`activity.entries[]`**, so a `(unitKey, trackableId)` pair appearing there
causes the matching PENDING Mastery claim to be confirmed. Evidence in that
array would let merely reading an āyah enlarge what one supervisor click
confirms — **Activity granting Mastery, in client code where no Firestore Rule
can intervene.** That is why evidence lives in a subcollection, and why
`study-activity-evidence-boundary.mjs` asserts `bulkConfirmWeek()` still reads
only `entries[]`. **Do not "tidy" evidence into the weekly array.**

**ADR-008 was AMENDED (14 Sep 2026), twice.** (1) The Note's identity
participates in event identity — without it, two Notes on the same āyah on the
same day collapse into one event and the second is silently lost. All five
events use ONE five-slot form with `none` in the Note slot for the three
non-Note events, because a single arity keeps the Rules identity check a single
concatenation rather than a branch. (2) `wbw.engaged` is **āyah + day**, not
occurrence + day, and **`occurrenceId` is deliberately NOT stored** — no reader
of Activity needs it, and whichever word was tapped first would arbitrarily win
the field while the rest went unrepresented. `quranWordProgress` stays the
authoritative occurrence-level state.

**Retry is a successful no-op, and that is NOT swallowing errors.** A retry and
a genuine authorisation failure both arrive as `permission-denied`. The writer
reads first and, on a denial, reads AGAIN: present → no-op; still absent → a
real failure, rethrown so it reaches the user (I15).

**`doc(db, path, id)` takes a MULTI-SEGMENT collection path**, so
`activity/<week>/evidence` + eventId is a document reference in three
arguments. `envelope.js` stamps the I17 envelope unchanged, and the test
harness's own `doc()` needed no change — a subcollection costs this codebase
nothing new.

**Emulator 53 assertions, 0 failures, 0 expression-budget denials**; all four
important Rules checks proven active by mutation. Pure suites 29 + 19 + 13.
`layout.mjs` byte-identical at all 16 configurations, `getElementById`
250 → 250; coverage 1,803 / 47 unchanged. **Production `firestore.rules` is
byte-for-byte untouched, and until the candidate is deployed the subcollection
has no rule and is closed to every client** — so the feature cannot function
for anyone yet. Deployment is an Owner Control Gate.

**v08.24 (14 Sep 2026) is MAP Phase 4 task P4-A — the Study-to-Approach event
contract, landed as PURE, UNINVOKED policy.** Read this before picking up any
Phase 4 work.

**The reconciliation changed what the task was.** The two 12 September
governance records are historical checkpoints; their `main` is `4833b19c`, and
`main` is now well past it. Their "next bounded task" (extract a pure P2/P4
tranche onto current `main`) was **half-done**: the P2 half — word identity, the
generated indexes, the Word Card — is on `main`; **the P4 half was never
extracted.** `docs/governance/adr/` held ADR-001…**007** only, so ADR-008, the
*accepted* Study-event contract, existed only on `claude/pensive-knuth-2pu3jj`.
**An accepted decision that is not in the repository is not part of the accepted
baseline** — that was the conflict, and v08.24 closes it. Phase 4 had literally
nothing on `main`, proven rather than assumed: `activity.js` there is still the
original `arrayUnion` append path.

**What landed:** ADR-008, plus `app/js/study-approach-contract.js` (Reading →
`approach_01`/`approach_03` by mode; Listening → `approach_07`/`approach_08`
past **80%** of the selected unit; Journaling → `approach_10`; WbW →
`approach_04`; only `status.claimed`/`status.confirmed` may move mastery —
**ADR-003 untouched**) and `app/js/study-activity-evidence.js`, which projects
one candidate Activity row and persists nothing. **Both are imported by
nothing**, so no behaviour changed: BR-0, removable by deleting the files.

**The keyed Activity writer is deliberately still OUT, and it is a real gate.**
Its own Task 50 audit caveat is why: the prototype hashes the raw `eventKey`
with SHA-256 for a safe map field name, and **Firestore Rules cannot recompute
that hash from the payload** — so Rules can enforce create-only keys but cannot
prove two supplied hash keys do not carry the same raw event key. And the
branch's `activity.js` moves new general-activity writes off `entries[]` into a
`v1Events` map: a **BR-3 change to the write shape of a live collection holding
real owner data**, with deployed Rules that would not enforce the new
invariants. Integrating it needs all four of: the storage design approved; a
Rules candidate passing a full emulator allow/deny suite; an explicit deploy
decision; accepted compatibility/rollback analysis for existing `entries[]`.
**Until then Phase 4's remaining two tasks — the persisting writer, and the
Reading/Listening/Journaling/WbW event wiring — are blocked, and there is no
further Phase 4 task that needs no new authority.**

**A third suite was written because the two extracted ones could not see what
matters.** `study-approach-contract-boundary.mjs` (16 checks) asserts that no
`.js` or `.html` under `app/` imports either module; that neither can reach
`firebasejs`, `runTransaction`, `arrayUnion`, `activity.js`, `records.js`,
`claimStatus`, `achieved` or `mastered`; that `activity.js` still uses its own
`arrayUnion` path; that every hardcoded Approach id still carries the exact
English name it means, read out of `APPROACH_TEMPLATES`; and that the unit keys
accepted are the ones `buildUnitKey` produces, with `juz`/`ruku`/`page`/
`hizb`/`topic`/`name` failing closed (I5). **Proven able to fail on four
deliberate mutations.** `behaviour.mjs` 800/3 at the same section-42 stop;
`layout.mjs` byte-for-byte identical at all 16 configurations, `getElementById`
250 → 250; coverage 1,803 / 47 both unchanged.

**v08.20 → v08.23 are the Word Card rounds, all four now in `CHANGELOG.md`**
(v08.20 and v08.21 had been left out of it, found and appended 14 Sep 2026).
The one a later session most needs: **v08.22 corrected v08.21's own reading of
`morphology.pos`.** v08.21 measured that 2,067 of 4,832 lemmas carry more than
one `pos` value and concluded no grammatical category could be shown per form,
labelling rows `Form 1`, `Form 2` instead. The measurement was right and the
conclusion was wrong — `pos` is a `" + "` chain of proclitics + HEAD + pronoun
suffix, and taking the HEAD drops that figure to 416; **4,416 of 4,832 (91.4%)
have exactly one category.** The categories are shown now, `Form n` is gone
from the UI entirely, and a new on-demand packaged index
(`lemma-pos-index.json`) carries them. **Re-measure what a conclusion rests on,
not just the number it quotes.**

**v08.23 then corrected v08.22's own layout**, on the owner's screenshot: "the
count remains on the right" was built as right-EDGE alignment and left 645–768px
of empty card mid-row. The category, the Arabic and the count are ONE cluster
with equal small gaps now. Two standing lessons came out of it, both below:
**on an `align-items: center` row, compare vertical CENTRES not tops** (a
top-based check called every row wrapped when none was), and **attribute a page
overflow to the element that actually causes it** before blaming the round.

**MAP Phase 3 (Arabic Progress & Coverage) is BUILT, v08.14–v08.19, 13 Sep
2026** — six bounded tranches, full evidence in
`docs/reports/2026-09-13-map-phase3-arabic-progress.md`. What a later session
most needs to know:

- Word progress lives in **two** collections, `quranWordProgress` (the
  learner's own claims) and `quranWordApprovals` (a supervisor's decisions),
  one document per (person, level, ayah). **The split by actor role is the
  security design, not tidiness**: each document belongs to one (person, role)
  pair, so a rule authorises it at document level and never has to prove which
  key of a map a writer touched. It is also what keeps the candidate rule away
  from the expression budget that sank the Phase 4 Activity candidate.
- **It is not an Approach claim and must never become one.** Nothing in
  `quran-word-progress.js` or its data layer may name `records`, `activity`, a
  `chunkKey` or a `trackableId` — checks assert that by reading the source.
- **I6 is structural here.** A supervisor's decision is pinned to the exact
  claim instant it was given for; a claim never touches the supervisor lane.
  An earlier shape re-opened a review by writing over the stored decision,
  which really did edit a frozen confirmation and destroy the real one in
  history. Do not reintroduce a mutation-based re-open.
- **Basic Arabic and Arabic in Depth are refused, not merely unimplemented** —
  at the state model, the data layer and the candidate Rules. Their claim unit
  is an open DDR item.
- **`firestore.rules` is byte-for-byte unchanged.** The candidate is at
  `tests/firestore/word-progress-v1.proposed.rules` (42 emulator assertions
  passing) and **deployment is an Owner Control Gate**. Until it is deployed
  the two collections have no server-side rule, so the feature is the Owner's
  own to exercise and is not usable by a student or teacher account against
  production.
- **Cross-surah coverage (juz, hizb, rub, manzil, page) is deliberately not
  computed.** Covering only the loaded surah would understate every juz, so
  those levels say so in words and read zero documents to do it.

**The 12 Sep 2026 round is the one to read before touching the test harness**
(`CHANGELOG.md`, v08.05–v08.13): `behaviour.mjs` was scoring 20 pass / 180 fail
on `main` itself, and two whole classes of harness breakage were fixed. Two new
standing lessons came out of it, both now in "Standing lessons" below.

v08.00 opened the line; **v08.01 made
the 30 Approaches fully editable by the owner, and v08.02 did the same for the
7 sections they sit in** (see the round entries below). The v07
line is closed behind it: its final build, **v07.139**, is frozen at
`legacy-v07/` and reachable, exactly the way v06 had a line drawn under it at
the cutover. The owner drew this one on 6 Sep 2026; v08.00 opened it the same
day. **Nothing about how the app WORKS changed** in either the closing round
or the opening one — no feature, no schema, no rule; see the "v07 closed and
archived" entry below and the v08.00 entry in `CHANGELOG.md`.

**Version numbering from here: `08` is this overhaul, and the last two digits
bump on every new feature within it.** **Past v08.99 the line continues v08.100, v08.101, …
(Owner decision 17, 28 Sep 2026) until a substantial change to the app opens
v09.00; the version checks compare by number, not as text.** `app/js/version.js` is the single source
of truth; nothing else hardcodes the string. Bump it and the milestone line at
the top of this file together, every round.

> **Corrected 18 Sep 2026.** This paragraph read "so the next feature round is
> v08.03" — written at v08.02 and never updated while the version went to
> **08.25**, in a paragraph whose own last sentence says to keep it current.
> `tools/i18n-verify/brief-integrity.mjs` checks the milestone line against
> `app/js/version.js` now, so this particular drift cannot recur silently.

**The app has been live and real, not a beta, since the 9 August 2026 cutover
(v07.00)** — we are in real-use iteration, driven by what the owner hits using
it. See "Post-cutover rollout order" (D13) below for whose real use comes
first.

**Three lines of this app now exist, all reachable, and only ONE is edited:**

| URL | What | Rule |
|---|---|---|
| `/legacy/index.html` | v06.30, the single-file pre-cutover app (10,146 lines) | **Reference only — never edit** |
| `/legacy-v07/` | v07.139, the multi-page Firebase rebuild, frozen 6 Sep 2026 | **Reference only — never edit** |
| `/app/` | v08.02 onward | The live app. All work happens here |

**Both archives are reachable from inside the app** — Home ▾ carries "Legacy
App - v06 ↗" and "Legacy App - v07 ↗", static markup in all 22 nav-bearing
pages (not `nav.js`). Both sign in to the same `study-monitoring` Firebase
project and **write real data** — they are runnable history, not screenshots.
The version badge beside the app name is what tells them apart on screen, and
since v08.00 it really does: `/app/` reads **v08.02**, `/legacy-v07/` reads
**v07.139**, `/legacy/index.html` reads **v06.30**. A claim made in either
archive is a real claim, so the badge is the only thing that says which line
you are in.

**The full round-by-round build log lives in `CHANGELOG.md`** — every version
from v07.01 onward, with what each round measured, decided and deliberately
left undone. **A round leaving this brief is APPENDED there first** — v07.124
through v07.128 were found missing from it on 5 Sep 2026, having only ever
lived here, so the next round to trim the list would have destroyed one; they
are all in `CHANGELOG.md` now, and the rule is written down so it stops being
a thing anyone has to notice.

**Read `CHANGELOG.md` only when you need the background of one specific
feature.** The five most recent rounds are kept below, because recent context
is usually what a new round actually needs; everything older is one file away.
The lessons those rounds taught that still bind are in "Standing lessons"
below, not left buried in the history.

**Check this milestone's version number every session** — it is updated by hand
alongside `app/js/version.js` (first two digits = big overhaul, last two = each
new feature) and will drift if a round forgets to bump it here too.

### The five most recent rounds

v07.139 (6 Sep 2026, on Claude Code on the web) is **every Study Unit made
approachable from the Approach view, and the Note view made to claim it** --
the owner's own ask, with their own diagnosis attached: *"Currently, in the
APPROACH view, only approaching unit available is Ayah unit. Enable all units
to be approachable from the APPROACH ... A click on one of the slide (Ayah)
takes to the NOTE view and there the approach is recorded (claimed). So, when
you enable other units now, you should enable the NOTE view to be worked for
claiming the respective unit."*

**This is the long-parked item this brief has carried since 13 Aug 2026** --
"make the Mastery Wheel itself reflect the selected Study Unit", deferred by
the owner at the time with "do not build it unprompted, but do not lose it
either". They have now prompted it. **Two of the three things that round said
had to be settled first are simply moot**, which is why it fits one round now
rather than the six-answer design conversation it looked like then: the
centre's Arabic per unit type cannot be asked any more, because since v07.63
the wheel draws NO text of its own at all -- the hub overlay (Ta'awwudh,
Bismillah, Surah, Ayah) is the whole of what the centre shows -- and the "juz
and page need a second records read on the landing path" objection is answered
by not putting it on the landing path (below). What was left was real work,
not a decision.

**Measured before touching anything, because the split was the point:** the
wheel's segments have read `buildUnitKey.ayah(currentSurahNum, currentAyahNum)`
since Phase 5, and the Note view's own Track/Guide/Breakdown/Coverage card was
gated on `noteScope.unitType === "ayah"`. So a Range, a Whole Surah, a Ruku', a
Juz, a Hizb and a Page could only ever be claimed through a DIFFERENT control
("Track this unit", the floating overlay in Study options) -- which is exactly
the split the owner reported. Both halves are gone: `renderWheel()` reads
`currentUnitInfo()`, and a slice click opens the Note view on that same unit
key, where the card reads and claims it.

**One new control, and deliberately the app's own existing one.** A second
gold capsule sits beside the "Approach the Quran in 30 ways" caption, above
the wheel: **"Choose a Unit"**, opening a palette holding Study Unit, the
unit's own number (Ruku'/Juz/Hizb/Page), and From/To for a Range. Every
control in it is a **MIRROR** of the canonical one in Study options -- the
same shape `#readPickers` and the hub's own Surah/Ayah pair already use, and
they join that same mirror list, so picking here really is picking there and
`goToUnitNumber()` stays the only code that decides anything. It opens through
`js/bar-palette.js`, the one-delegated-listener popover Explore, QCR and Asma
already share, so outside-click, Escape and "only one at a time" come free
(I2). **The capsule's wording is FIXED** -- v07.135's own lesson: a unit label
can run to "Ruku' 1 of Surah 2 (ayahs 1-7)", and a pill sized by its content
is what ran off both edges of the owner's phone that round. What is in force
is named inside the palette and in the dock's own Tracking line instead.

**The wheel shows each Approach's OWN claim on that exact unit, deliberately
not a pooled roll-up** the way Explore colours a Juz from the ayahs inside it.
The card a slice opens claims THIS unit, so a green slice sitting over "Not
claimed yet" would be the screen contradicting itself. Explore's pooling is
unchanged and still does the other job.

**Juz, Hizb and Page claims live in `subject_quran`, a different document from
`surah_N`, and it is fetched ON FIRST USE and cached per person** -- the same
treatment the reciter timing map (v07.39), the search index (v07.40) and the
three boundary tables (v07.44) already get. Someone who never picks one of
those three units never fetches it, so **nothing joined the startup path (I9)
and the load-speed contract is untouched -- re-measured, Quran Study still 6
sequential round trips / 9 Firestore calls**. The cache is shared: "Track this
unit"'s own floating card and Explore's `exploreSubjectChunk` both read
through it now (Explore still forces one fresh read per open, exactly as
before), so **one document, one copy, and the wheel and the cards can never
disagree about what has been claimed**.

**Two real defects were found by measuring, both invisible in a screenshot,
and one of them was the fix silently losing.** The palette was anchored on the
little pill that opens it, and at 390px a 272px popover centred on a pill that
sits at the RIGHT end of the caption row ran **55px off the screen** -- the
shape v07.71 fixed on the Note bar, where a short bar let a right-anchored
popover run off the LEFT. Anchoring it on the ROW fixes it in both directions.
**But the first attempt at that did nothing at all**: `.wheel-unit-wrap {
position: static }` and `.bar-palette-wrap { position: relative }` are equal
specificity and the latter is declared later in the file, so source order won
-- this page's own most-repeated CSS trap, caught by re-measuring rather than
by re-reading. And the palette stayed open over the wheel after a choice was
made, so **choosing a unit that needs nothing more now closes it** (a unit
that still needs a number, or a From and a To, keeps it open, because the
control that finishes the job is inside it) -- Explore's own "choosing is
done" rule.

**Measured, English, both pills on one line: the pair needs 364px and gets
347px at 360px** (Bangla needs 286px and fits everywhere). Rather than let the
row wrap -- a whole Approach row, 42px, to save 17 -- both pills take one size
down below 380px, and one more below 340px; the tap target is untouched at
36px, only the type and the side padding shrink. The row is 9px taller for
carrying a real control, and that is paid back out of its own bottom margin
(0.3rem -> 0) and the wheel column's own three gaps (0.3rem -> 0.2rem), costed
against the real numbers: at 412x915 with the tenant banner set the sixth
row's bottom had landed 2px past the dock's top edge.

**`layout.mjs`: every measured landing-page metric byte-for-byte identical to
`HEAD`** at all eight viewports in both banner states -- same wheel-heading
top (148/103px), same wheel width (377/399/280/220/320/360px), **same Approach
row count everywhere**, same 9px dock gap, dock fully visible, no overflow --
with `getElementById` targets 240 -> 246 (exactly this round's six new
elements, none of them missing) and the same 22-entry pre-existing missing
list as `HEAD`. **`reading.mjs` READING SCREEN OK in both languages**,
**`panel.mjs` no truncated label and no wrapped bar** at any of the eight
viewports in either language, **`navcheck.mjs` unchanged** (still only the
pre-existing 320px ENGLISH truncation of "Operation"/"Bookmark").
**Coverage 1,705 -> 1,708 scanned, 46 missing UNCHANGED**, measured against a
clean `HEAD` worktree (and with `app/_prev-quranrevival.html` deleted first,
this file's own recorded trap): only the `quran` area moved, 338 -> 341, its
own missing count unchanged at 5. **`tools/perf/new-tenant.mjs` 10/10.** No
`firestore.rules`, schema or Firestore data changes -- every unit key and
every chunk key this round reads or writes is one records.js already
understood.

**Verified: a focused, un-checked-in Playwright script, 46 checks, all
passing**, screenshotted in both languages -- the capsule a real 999px pill,
>=36px, above the wheel and on screen; the palette opening, staying on screen
and offering all seven units with their VALUES proven still plain ids; and
then the substance, proven by COLOUR rather than by a dropdown's own value,
with a whole-surah claim, a range claim, a ruku' claim, a juz claim and a page
claim seeded for different Approaches: **Single Ayah reading the ayah's own
claim, Whole Surah reading the SURAH's, a Range reading the RANGE's, a Ruku'
reading the RUKU's, and Juz and Page reading theirs out of the second
document** -- with `subject_quran` proven NOT read on the landing path, read
exactly once the moment a Juz is picked, and not re-read for the Page after
it. Then the Note view: **a slice click opening it scoped to the whole surah
rather than the ayah, the card headed "Track this unit" and naming the surah,
its Track tab showing that surah's own claim, a real claim writing
`entries.surah:1::memorise` into `t1__p1__surah_1`, and the same again for a
Juz writing `entries.juz:1::memorise` into `t1__p1__subject_quran`** and the
card re-reading the fresh document afterwards -- while a single āyah still
reads "Track this āyah" and still names the āyah. All of it again in Bangla,
read off the rendered page, with Bengali digits in the tracking line.

**`behaviour.mjs`: 800 pass, 3 fail**, stopping at the same pre-existing
line-4084 crash carried since v07.69 -- the same 803 total, and the same
three, as every recent run (section 22g, the environmental archive.org
poster block this sandbox's proxy blocks). No check anywhere the suite
reaches needed updating: this round adds a control and widens what an
existing one covers, it does not change anything an existing check
describes.

**Two strings are new and both are translated**: "Choose a Unit", and the
Coverage tab's own "ayah-by-ayah coverage isn't available at this granularity"
sentence -- which was a bare English literal in "Track this unit"'s own card
since Phase 5, on a screen the rest of which is translated, and now goes
through `t()` at both sites.

**Flagged, not changed.** The wheel colours a unit by its own direct claim
(above), so a Juz whose every ayah is mastered still reads not started on this
wheel until the Juz itself is claimed -- Explore is where pooling lives, and
mixing the two here would make the card lie. The Note view's own unit-number
picker still offers only the numbers that appear WITHIN the loaded surah
(v07.69's own stated limit, unchanged) -- the capsule's palette, which mirrors
the canonical picker, is where the whole Qur'an's numbering is offered. And at
**320px in Bangla with the tenant banner set** the Approaches list shows one
row fewer (3 -> 2), which is the 9px the control costs landing on a row
boundary at the smallest phone this project measures; English at 320px, and
both languages at every other width, keep every row.

**v07 CLOSED AND ARCHIVED (6 Sep 2026, on Claude Code on the web)** is not a
feature round — the owner's instruction to draw a line under v07 exactly the
way v06 had one drawn under it: *"I want the current version app also to be
put as legacy v07. And then, we will start the next features and upgrade from
here and we call the versions onward v08.00 in a new session."*

**`app/` is byte-for-byte untouched** (`git diff app` empty), so **v07.139
stays the final v07 build and `version.js` was deliberately NOT bumped** — the
app did not change, only a copy of it was taken, and bumping the badge for an
archiving round would leave the archive reading one version while the "last
v07 build" was another.

**`legacy-v07/` is a `cp -a` of `app/`** — 105 files, 2.6MB, proven identical
by `diff -rq`. It sits BESIDE `/legacy/index.html` rather than inside it, so
the URL 22 pages already link to is untouched.

**A folder copy works because the app is genuinely self-contained, measured
rather than assumed:** every page, script, stylesheet and font is referenced
RELATIVELY, and a grep for absolute paths across all of `app/*.html` and
`app/js/*.js` returns exactly one — `/tools/quran-data-pull/output`. **Nothing
anywhere names `/app/` itself**, which is the fact the whole approach rests
on. The archive therefore carries its own `js/version.js`, and that is what
freezes its badge at v07.139 while `app/` moves on.

**Two things it deliberately SHARES with the live app**, both written into its
own `README-ARCHIVE.txt` rather than left to be discovered: the Qur'an data
(`/tools/quran-data-pull/output`, 31MB) and the Mushaf's 604 pages
(`/mushaf/`, 98MB, fetched via raw.githubusercontent) — **sharing them is what
keeps the archive at 2.6MB instead of ~130MB**, at the stated cost that a
future round which RESHAPES those files (rather than adding to them) breaks
it, the fix then being to copy the v07-era `output/` into the archive at that
point; and the same `study-monitoring` Firestore, so **the archive reads and
WRITES real data**, exactly as the v06 app does. A claim made in it is a real
claim; the version badge is what tells the two apart on screen.

**Verified: a focused, un-checked-in Playwright script, 10 checks, all
passing**, screenshotted at 390x844 — all 28 archive pages served; the landing
page booting with no page errors; the badge really reading **v07.139**; **real
Arabic really rendering**, which is what proves the shared `/tools/` path
still resolves from the new folder depth; the wheel really drawing its
segments; **zero requests out of `/app/`**, read off
`performance.getEntriesByType("resource")` rather than off the source; **zero
failed local requests**, which is how a broken relative path would have shown
up; a second, quite different page (`records.html`) booting clean; and on the
other side of the line, **the live `/app/` still booting at v07.139** and
**`/legacy/index.html` still served at v06.30**.

**The nav link was added in the same session, on the owner's own follow-up
("add the v07 nav link now"), and the ordering is the point: the archive was
snapshotted FIRST, so `app/` gained the link and the frozen copy did not.**
`legacy-v07/`'s own Home menu still offers exactly one legacy link (v06), and
a check asserts that, because a frozen build silently acquiring a link the
version it froze never had is the one way this could go quietly wrong. The
`app/` side is one identical line inserted after the v06 link in all **22**
nav-bearing pages -- it is static pre-JS markup (v07.08's anti-flash fix), so
it genuinely lives 22 times rather than in `nav.js`; the 6 pages that never
carried the v06 link (`accept-invite`, `admin-self-check`, `index`, `migrate`,
`onboarding`, `quranrevival-render-test`) correctly did not gain this one.

**The URL deliberately names `index.html`**, matching the v06 link's own
style, rather than ending at the folder. A bare `/legacy-v07/` relies on the
host serving a directory index -- GitHub Pages does, the project's own
`serve.js` does not, so the folder form 404'd in the harness. Naming the file
is provable locally AND cannot be affected by a host quirk; the check that
fetches it is only worth anything because of that.

**Measured before and after, the Home dropdown at six widths in both
languages: 436 -> 479px tall in English, 432 -> 461px in Bangla, width
unchanged at 169px.** At the shortest viewport this project measures (640px)
its bottom lands at 567px, so **73px of headroom remain** -- fully on screen,
neither link clipped in either language, no page overflow anywhere. The
dropdown is absolutely positioned (v07.57) and starts closed, which is why the
landing page itself cannot move: `layout.mjs` against `HEAD`'s own copy is
byte-for-byte identical at all eight viewports in both banner states,
`getElementById` 246 -> 246. **Coverage 1,708 -> 1,713 scanned, 46 missing
UNCHANGED** -- the +5 is one string counted once in each of the five areas
whose files carry it, and its Bangla ("পুরাতন অ্যাপ - v07 ↗") landed in every
one of them. `navcheck.mjs` unchanged (still only the pre-existing 320px
ENGLISH truncation of "Operation"/"Bookmark").

**`version.js` was still NOT bumped, deliberately: it stays 07.139 until the
v08.00 round opens**, which is the owner's own numbering plan. So for the
short window until then the link points at a build identical to the live one
-- the awkwardness this was originally deferred over, now accepted knowingly
rather than discovered. The moment `app/` reads v08.00 the two diverge and the
link means what it says.

**Verified: a focused, un-checked-in Playwright script, 12 checks, all
passing**, screenshotted in both languages -- the link present in the Home
menu, pointing at the archive, opening in a new tab with `rel="noopener"`,
reading "Legacy App - v07 ↗", sitting directly after the v06 link with exactly
two legacy links present, a real tap target, present on a second page too, the
archive it names really serving, the whole thing in Bangla with the URL proven
untouched, and **the frozen archive proven NOT to have gained it**.

**The retired `QuranRevival---ClaudeCode` repo now REDIRECTS here.** Its own
`CLAUDE.md` was still the full 362KB / 5,248-line standing brief, frozen at
v07.77 — so any session opening that repo would have read a brief that stopped
being true a hundred rounds ago and treated it as authoritative, while a fix
committed there reaches nobody (the live site is served from this repo's
`app/`). It is a 3KB redirect notice now, plus a new `README.md` so GitHub's
own repo page carries it too. **Its code was deliberately NOT touched** —
`app/`, `tools/`, `firestore.rules` and the `PHASE-*-STATUS.md` files are what
that repo's own commit history refers to, and rewriting them would make the
history unreadable for no gain; the notice says plainly that none of it is
current. Nothing is destroyed: the old brief is in that repo's git history,
and v07.78 merged all 233 of its commits into this one anyway.

**v08.00 (6 Sep 2026, on Claude Code on the web) OPENS the v08 line** — the
counterpart of the round above it, and the owner's own numbering plan. **One
line of code changed:** `app/js/version.js` reads **`08.00`**, and its header
comment now states the scheme — `08` is this overhaul, the last two digits bump
on each feature within it, so the next feature round is **v08.01**. That file
was re-proven to be the single source of truth rather than assumed: all four
references to the version across `app/` are `import`s of `APP_VERSION`
(`quranrevival.html`'s badge, `about.html`'s version line, `backup.html` and
`js/backup-file.js`, which stamp the exported backup), so **nothing retypes the
string** and one edit moved every surface. **This is what makes the v07 nav
link mean something** — `/app/` v08.00, `/legacy-v07/` v07.139,
`/legacy/index.html` v06.30, all three writing real data, the badge the only
thing on screen that says which line a claim was made in. `app/` is otherwise
byte-for-byte untouched, both archives untouched, no rules/schema/data change,
no new string, nothing on any startup path.

**Verified: a focused, un-checked-in Playwright script, 18 checks, all
passing**, screenshotted in both languages — the badge read off the RENDERED
page as `v08.00` with no `07.` anywhere, with a real box, really displayed and
fully on screen rather than merely in the DOM, and `#appTitleText` itself
ending in `v08.00`; the same again in Bangla; `about.html`'s own version line
as a second, quite different surface; and the other side of the line,
**`/legacy-v07/` still reading v07.139** and **`/legacy/index.html` still
served and still stamped 06.30**, which is what proves the archives were not
edited. **`layout.mjs`: every measured landing-page metric byte-for-byte
identical** at all eight viewports in both banner states, `getElementById`
246 → 246, same 22-entry pre-existing missing list — and **the comparison was
set up so it could actually fail**: the shim imports `HEAD`'s own `version.js`
as `js/_prev-version.js` (this project's documented technique), so "before"
really rendered v07.139 against "after" v08.00; without that both sides would
have read v08.00 and the run would have proven nothing. **Coverage 1,713
scanned / 46 missing, both UNCHANGED** (no new string; a version number is
never translated). Both shims deleted before any other number was read.

**v08.01 (7 Sep 2026, on Claude Code on the web) is the 30 Approaches made
FULLY EDITABLE by the owner** — their own ask: *"What is the main sources of 30
approaches in the app? Enable that be editable by me... my edit should reflect
everywhere an approach affects."* Then: *"yes, make it fully editable, add a
delete button for me as a owner."*

**The diagnosis reversed the question's own premise.** The owner believed the
Approach list on the landing page was NOT the source ("it doesn't show
sections, you built it later from other sources"). **It IS the source** —
`renderWheel()` builds that sidebar straight from the tenant's own Firestore
`trackables` documents, and all nine consumers across the app read through the
same `getTrackables()`. Nothing reads `APPROACH_TEMPLATES` at render time: that
constant is the SEED, copied into Firestore once by
`ensureTenantCatalogueSeeded()` and thereafter consulted only by
`syncUnneditedTrackableNames()`. So there was nothing to "promote" — the real
gap was that the source's only editor was one `prompt()` box. **The sections
were never invented later either**: `group` (1-7) and `groupName` have been on
all 30 documents since the first seed; the wheel's sidebar simply doesn't print
them.

**Delete was put to the owner as its own decision rather than built or
refused** — `firestore.rules` bans delete on `trackables` (I4/D6), and a real
one orphans data, since claims are keyed by `trackableId` (I5) and Records,
Monitor and every backup would print a bare `approach_07` forever. Three
options with those costs attached; **the owner chose the reversible one**. The
button says **"Remove"**, the confirm says in words that it can be restored,
and the STORED value stays the canonical `archived` every other screen already
reads. No rules change, no schema change, and `__fsLog` is asserted to carry
**zero delete calls**.

**Everything a reader ever sees is editable now** — both names, the section,
the position, and the Guide's What/How/Measure (live text, printed by the Note
view's own Guide tab via `renderGuideTab()`, not documentation) — each as a
real English/Bangla pair shown side by side. **That shape fixes a live I11
defect rather than patching it:** the old rename pre-filled with whichever
language you were reading in and then always wrote `name.en`, so renaming while
in Bangla silently overwrote the ENGLISH name and left the Bangla one
untouched. Both boxes are read on every save now.

**Two real hazards were found by MEASURING, neither visible in a screenshot.**
**(1) `getTrackables()` returns more than the 30** — every topic-based module
has its own "Studied" row, and this table has listed them all under a heading
saying "The 30 Approaches" since Phase 2. Harmless beside rename and archive;
NOT harmless beside a position picker, where renumbering one flat list would
rewrite the `order` of trackables in modules the owner was not even looking at.
Ordering is scoped to the Quran set now; the rest render below a labelled
separator, still fully editable, with no position control implying one they do
not have. **(2) A missing `group` would have silently re-sectioned an
Approach** — a `<select>` with no matching option defaults to its first, so
opening such a row and pressing Save would have moved it to Section 1 unseen. A
`sectionOf()` helper falls back to matching `groupName` and offers "(not set)"
rather than guessing; `group` and `groupName` are always written together.

**`reorderTrackables()` deliberately does NOT go through `editCatalogueNode()`**,
which stamps `edited: true` — re-ordering the wheel is not the tenant claiming
authorship of an Approach's WORDING, and a reorder that froze all 30 names
would mean a later platform translation fix could never reach this tenant
again. It also writes only the documents whose number actually changed: a
one-place nudge writes exactly 2, and "move to position 30" is one action
rather than 29 nudges.

**Verified: a focused, un-checked-in Playwright script, 84 checks, all passing
in both languages**, screenshotted — every write proven by its VALUES, not by
an element existing. **The harness itself needed patching to see any of it**:
its `writeBatch()` is a pure counter whose `update()` records nothing and whose
`commit()` touches no data, so a batched reorder left no trace and the page
re-rendered from stale rows. It was given the same treatment `updateDoc`
already gets. **Three failing checks were investigated and all three proved
WRONG ASSERTIONS** — one expected Bangla guide text the templates have never
carried; one counted rows with a hardcoded `slice(0, 30)` that made it unable
to fail (after a removal it counted 29 Approaches plus an "other" and reported
30); one expected 30 rows where the shared fixture adds 10 invented ones.

**`layout.mjs`: every measured landing-page metric byte-for-byte identical** at
all eight viewports in both banner states, `getElementById` 246 → 246, same
22-entry pre-existing missing list — `app/quranrevival.html` is byte-for-byte
untouched. **Page overflow byte-identical to `HEAD`** at 390/768/1100px
(439/61/0px, all pre-existing, from the subject table). **`navcheck.mjs`
unchanged.** **Coverage 1,713 → 1,724 scanned, 46 missing UNCHANGED** — the
+11 is exactly this round's eleven new strings, all translated.

**Flagged, not changed. Adding a 31st Approach is deliberately NOT built** — it
was raised before the round and the owner did not ask for it. The wheel is
drawn as 30 slices, the module is named "the 30 Approaches" throughout, and a
new Approach needs an id scheme, a section and a position decided rather than
inferred. A removed Approach's existing claims are kept and stay readable, but
no longer appear on the wheel — which is what "removed" means here.

**v08.02 (7 Sep 2026, on Claude Code on the web) makes the 7 SECTIONS the
tenant's own, groups the Approach list by them, and names them on the Mastery
Wheel's sidebar** — the owner's follow-up to v08.01: *"Where did the
'category/ sections' of the 30 approaches go? Who allowed you to remove
those?"*

**Nothing had been removed, and that was CHECKED before anything was said** —
`quranrevival.html` byte-for-byte identical to the round before, the Section
column character-for-character the same line, and a rendered `main` showing
all 7 sections split 6/7/2/4/4/3/4 with no empty cell. But the question was
pointing at something real: the sections were **the one part of the 30
Approaches nobody could change**, and they had no home on the Catalogue page.
Put back to the owner as three options; they chose all three.

**(1) Editable, and stored on the TENANT DOCUMENT.** A new collection would
have been the tidy answer and is the wrong one here: this sandbox has no
Firebase CLI, so a collection the deployed rules have never seen is a 403 for
the owner (v07.18's lesson). The list is an additive `approachSections` field
on `tenants/{tenantId}` — already read at startup, already owner/prime-
writable, **no new collection, no new read, no rules change.** `group` stays
the plain number every reader sorts by and `groupName` stays denormalized, so
the Study-options picker, Explore, Monitor and the backup all keep working
untouched. Renumbering on reorder is safe because **nothing keys off
`group`** — a claim is keyed by trackableId (I5).

**A trap that would have shipped silently.** `syncUnneditedTrackableNames()`
resets `groupName` from the platform template for every copy with
`edited !== true` — which is ALL of them, because renaming a SECTION is
deliberately not an edit to the Approach. A rename was reverted on the next
landing-page load, and **still looked correct on the load that did it** (the
sync is fire-and-forget, off the blocking path), so the damage only showed the
time after. A `keepSectionNames` guard reads the tenant doc already fetched in
the same wave. Proven both ways: with the guard removed the check really
fails, naming all 6 reverted Approaches.

**(2) The table is grouped by section** — one heading per group instead of the
same name repeated down a column, redundant column gone. **That grouping
created an invariant the flat list never had, and getting it wrong was caught
by a failing check rather than by reading the code:** if section and running
order disagree, the sidebar prints section 5's heading, then section 1's, then
section 5's again — the same section named three times down one list. So **a
section is now a CONTIGUOUS BLOCK of the running order**, every reorder
renumbers against display order, and ▲▼/Position step through an Approach's
OWN section (moving between sections is the Section dropdown's job).

**(3) The Mastery Wheel's sidebar names its sections**, off the trackable's
own denormalized `groupName`, so **it costs no read**. Opt-in per item, because
`renderWheelSidebar()` is shared with all six of Explore's own sidebars — and
deliberately NOT a `.way-row`, because `layout.mjs` counts that class and a
heading wearing it would have inflated every row measurement this project has
recorded.

**It costs real rows, reported rather than buried.** The first attempt cost
17.2px per heading against a 36px row and took TWO rows off a 412x915 phone;
tightened to 8.8px it costs **one row, at one viewport** (412x915, 6→5 with
the banner, 7→6 without). Every other viewport keeps every row; heading
position, wheel width, dock gap and overflow byte-for-byte identical at all
eight in both banner states. **Bangla needed its own size** — Bengali carries
matras above and below the line and has no capitals, so uppercasing does
nothing and 8px was cramped, read off the rendered page. At 10.5px it costs
one row at four phone configurations, never more. `layout.mjs` measures
English only, so the Bangla numbers were measured separately rather than
assumed from it.

**A translation defect found by reading what the coverage report NAMED**:
`translateStatic()` keys a text node on `raw.trim()`, which keeps INTERNAL
newlines — so the new intro paragraph, wrapped prettily across three lines in
the markup, looked up a key no catalogue could hold and would have stayed
English on a Bangla page. One line now, with a check reading the rendered
paragraph in both languages.

**Verified: three focused scripts, 90 + 40 + 18 checks, all passing in both
languages**, screenshotted. **Five v08.01 checks were UPDATED in place with
the reason, never deleted** — three read the now-removed Section cell or
counted full-width rows as separators (both kinds have real class names now);
one asserted Position offers all 30 slots where it now offers the section's
own; one was measuring the whole test's accumulated writes rather than the
nudge's. **`behaviour.mjs` 800 pass / 3 fail**, same 803 total and same
pre-existing section-42 stop as every recent run, the three being the
environmental archive.org block (section 22g). **Check 20e was a REAL
failure of this round's own, found there and fixed**: it reads the first row
of the Approach table, which is now a section heading, and every Approach was
landing under "(not set)" because the shared fixture's trackables carry a
`groupName` but no `group`. An Approach whose section number matches nothing
still KNOWS its own section name, so it is grouped under that rather than
swept into "(not set)" — better behaviour, not just a green check. **`navcheck.mjs`
unchanged.** **Coverage 1,724 → 1,732 scanned, 46 missing UNCHANGED.**

**Flagged, not changed.** Colouring the wheel's 30 slices by their 7 sections
was raised and deliberately NOT built: those slices are coloured by CLAIM
STATUS, which is the whole job of a Mastery Wheel, and a second meaning
competing for the same colour costs more than it gives. An arc around the
wheel is the shape worth considering instead, and it is a real layout change
on the most tightly measured screen in the app. **A 31st Approach is still not
built** — the owner said they would edit the list first and see.

