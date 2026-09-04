# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.


**Current milestone: QuranRevival v07.130.** The app has been live and real,
not a beta, since the 9 August 2026 cutover (v07.00) — we are in real-use
iteration, driven by what the owner hits using it. See "Post-cutover rollout
order" (D13) below for whose real use comes first.

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

v07.126 (4 Sep 2026, same day) is **the owner's own narrowing of v07.125's
restore, plus splitting this file's build log out into `CHANGELOG.md`.**

**(1) The app always opens on the wheel; only the SETTINGS come back.** v07.125
restored the stage view too, and flagged the cost honestly rather than burying
it: reopening straight into Read or Note fired `ensureAyahNoteDataLoaded()`
during boot, **2 more Firestore reads on the startup path (9 calls -> 11)**.
Offered as a choice; the owner took the narrower version. `restoreLastSession()`
now applies the study state and nothing else. **Measured: 9 calls in EVERY
case** -- fresh browser, wheel session, Read session, Note session alike --
so the load-speed contract is untouched in fact and not merely in the common
case. `stageView`/`position` are still WRITTEN by `rememberLastSession()`,
deliberately: they cost nothing to store, they are what would be needed if the
screen is ever wanted back, and dropping them would silently invalidate every
session already saved on a real device. They are simply not acted on.

**A second read had to be removed to reach 9, and it was NOT obvious.** With
the view restore gone, a restored load still measured 10 calls, not 9 -- the
records chunk was being read TWICE: surah 1's, because `loadContextData()`
opens surah 1 before anything else runs, and then the remembered surah's, when
`applyQuranBookmarkSettings()` called `loadSurah()` a moment later. Fixed by
seeding the remembered surah INTO `loadContextData()` itself, before its first
`loadSurah()` -- boot then reads exactly one chunk either way, just the right
one, and the restore finds the surah already correct and skips its own load.
Guarded twice: only on the FIRST load (`lastSessionReady` is false only then,
so a tenant switch keeps its own existing reset-to-surah-1 behaviour), and only
when no `?bookmark=`/`?goto=`/`?resume=` deep link is present, since those
still win outright. **Found by reading the call log, not by assuming the
narrowing was enough** -- the honest first measurement said 10.

**(2) The build log is now `CHANGELOG.md`.** The owner's own instruction, from
a direct question about session cost. **Measured: `CLAUDE.md` was 689 KB,
roughly 172,000 tokens, read in full at the start of every session before a
word of the actual task** -- and ~95% of it was the v07.01-onward changelog,
which is valuable history but almost never what the round in hand needs. Split
byte-for-byte (nothing was edited on the way across): the standing brief plus
**the five most recent rounds** stay here, everything older moves. **Result:
689 KB -> 75 KB, about 172,000 tokens -> 18,700, a ~89% cut**, with the whole
history one file away and pointed at from the top of this file and from the
Source-of-truth table.

**The split's own real risk was handled rather than accepted: a lot of what
made that file worth its size was LESSONS, not history** -- the coverage tool
being wrong nine times, `[hidden]` losing to a class rule, the stub never
mutating its own data, "measure before and after", "update a stale check, don't
work around it". Those were buried in the prose of individual rounds and would
have left the always-read brief entirely. They are lifted into a new
**"Standing lessons"** section here, grouped by measuring / this codebase's own
traps / the test harness / reporting. That section is the point of the exercise
as much as the size is: the history is now optional reading, and nothing that
still binds depends on anyone choosing to read it.

**Verified:** a focused Playwright script, **13 checks, all passing** -- the app
proven to open on the wheel from a Read session AND from a Note session, with
the surah, ayah, unit and reading ticks all proven to come back; **boot proven
to cost exactly what a fresh browser costs (9 calls) in both cases**; a
never-visited browser proven to still open on surah 1 at 9 calls; and `?goto=`
proven to still outrank the remembered surah. **`layout.mjs`: every measured
number byte-identical** to v07.125 at all eight viewports in both banner states
(the only flagged lines are the same pre-existing Manage-mode-only missing-id
false positives disclosed since v07.86). **`tools/perf/measure.mjs` unchanged**
at 6 sequential round trips / 9 calls on Quran Study. No `firestore.rules`,
schema or Firestore data changes -- nothing to deploy but the static files.


v07.127 (4 Sep 2026, on Claude Code on the web) is **the one-bar round -- the
QCR and Asma ul Husna level bars each fold onto a single line, and an Asma Name
can now be moved between groups, or put in several at once.** Three owner asks
from two marked-up screenshots of the live app. Their own framing set the shape:
*"QCR. Make it one bar... 2 pull-down n one combined button for all those
button, all In one bar. (Only one stuff drops down at a time, they can take
entire space, but the button don't need that much space, got it?)"* and, for
Asma, *"Field names change to Group, Names, Dual Names and then all buttons
combined in a pallette under in one button. all In one bar. Saves 3 bar-space
in mob, 2 bar space in Tab."*

**The mechanism is one small new module, `js/bar-palette.js`, and it is
deliberately NOT a renderer.** It owns only open/close -- one delegated
`document` listener wired at module load, the same "one listener, no per-render
rewiring" shape `nav.js`'s outside-click-closes, `text-size.js` and
`asma-wheel-text.js` already use -- while each palette's own BODY is static
markup in the page. That is the load-bearing half, and it is what the first
sketch of this round would have got wrong: pressing **Manage** from inside the
palette re-renders the bar, so a palette whose contents were rebuilt on every
render would have slammed shut under the reader's own finger at the exact
moment it was meant to reveal ✎/🗄/+. Because nothing rebuilds it, the buttons
also kept their ids and their once-wired handlers -- **this is a MOVE, not a
rewrite**, which is why no click handler in either bar was re-attached. I2
holds: the module touches no Firebase and knows nothing about QCR or Asma.

**(1) QCR is two dropdowns and one ⋯ button.** The Approach picker
(`#qcrApproachSelect`) came UP out of `#qcrWheelPane`, where it had been a
stacked row of its own since 28 Aug 2026, and now sits beside the collection
picker; Manage and its four actions went behind the palette. Two rows become
one. **Everything QCR's palette holds is a Manage-mode control**, so for a reader
who cannot manage it would have opened EMPTY -- a button that does nothing --
and the whole wrap is hidden for them instead. Asma's is deliberately NOT gated
that way: it also carries the wheel text-size sliders, which are a personal
display preference every reader gets. Proved by reading COMPUTED display rather
than trusting the `hidden` property, since `[hidden]` loses to any class rule
that sets `display` and this project has been caught by that four times.

One real consequence had to be handled rather than discovered later:
`renderQcrCollectionView()`, which used to fill that picker, **returns early
when no collection is selected at all** -- fine while the picker lived under
the wheel, wrong the moment it lives on a bar that is always drawn, so it would
have shown an empty second dropdown. A new `syncQcrApproachSelect()` is called
from `renderQcrLevelBar()` instead, and from `changeCurrentTrackable()`'s own
QCR branch, whose `&& qcrCurrentId` guard is now scoped to the list+wheel below
rather than to the mirror itself.

**(2) Asma is three dropdowns and one ⋯ button**, where it was three stacked
rows on a phone. The five Manage icons, Show archived, Manage itself **and the
wheel text-size sliders** all fold in -- the A± button v07.122 put on that bar
is gone, its sliders now rendered straight into the palette by a new
`renderAsmaWheelTextRowsHtml()`. Two small changes inside `asma-wheel-text.js`
make that honest rather than a copy: its slider sync now queries the whole
document instead of `[data-awtext-popover].open`, since the rows live in a
container that module deliberately knows nothing about, and its click listener
is down to the one thing it still owns (Reset) now that opening and closing
belong to `bar-palette.js`. The sliders, "All" and Reset were all re-proved
working from their new home rather than assumed. The three field names are the
owner's own shortening -- "All Groups"/"All Names"/"All dual Names" become
**Group / Names / Dual Names** -- and cost nothing in translation: all three
keys already existed in `bn.js`. The three they replace stay there, unused, per
this project's own rule for a string that stops being called.

**What the two bars actually cost before and after, measured against a real
`HEAD` shim rather than counted off the markup** (the owner's own prediction
was "Saves 3 bar-space in mob, 2 bar space in Tab"): on a **390px phone** the
QCR bar goes **89px -> 50px** and the whole distance from the top of the bar to
the top of the wheel **150px -> 70px**, while the Asma bar goes **161px -> 47px**
and its own bar-to-wheel distance **180px -> 67px** -- so roughly two reclaimed
rows on QCR and three on Asma, which is the owner's phone figure. On a **768px
tablet** each screen reclaims **one** row, not two (QCR 111px -> 70px, Asma
108px -> 69px): both bars already fitted on one line at that width, so the only
thing left to reclaim there was QCR's own Approach row and Asma's second row of
icons. Said plainly rather than rounded up to the prediction.

**A real trap was caught by measuring, and it is the standing lesson in its
usual form: a `<select>` ellipsises its own label silently.** Three fields
sharing one phone row is tight, so the fit was measured rather than eyed --
and measured HONESTLY, by cloning each real select, giving it only the option
in question and sizing it to `max-content`, so the number is what that option
needs **in this browser, chrome and all**, not a guessed arrow allowance. It
found "Dual Names" needing 101px against a 96px third at 390px: cut, with
nothing on screen saying so. Two candidate fixes were measured before either
was kept. **Sizing the fields by content (`flex: 1 1 auto`) was tried and
rejected on the numbers** -- it hands each select its own longest option as a
starting width, so the Names field (100+ long options) swallowed the row while
the Dual field, which holds one short placeholder until a dual collection
exists, was squeezed to **90px even on a 1280px screen**. An equal share plus
a smaller label on phones is what actually works. **Result, measured at
320/360/390/412/768/1280px in both languages, on both bars: no truncation, no
wrap and no page overflow anywhere** -- including 320px, which is below every
viewport the harness runs and needed one more notch in this page's existing
`@media (max-width: 340px)` block.

**(3) The Asma Name screen gets the button the owner drew a box around**
(📂, beside ✎ and 🔗, Manage-mode only like its neighbours): *"Enable a button
at the markup space, to move the Name under a different group or place in
multiple group."* **Both halves are one question asked once -- which
collections hold this Name? -- so it is a tick list over every live Group and
Dual-Name collection, not a "move to…" picker plus a separate "add to…" one.**
Untick one and tick another and the Name has moved; tick several and it is in
several. Built on `addItem`/`removeItem` rather than `moveItem` for exactly
that reason: a move is just the pair, and expressing it as the pair is what
makes multiple membership possible at all. No schema change -- `items[]` on a
collection already held name unit keys, and `asmaCollections/{tenantId}`'s own
rule gates by tenant, not by field, so **no `firestore.rules` change either**.
Three decisions worth not undoing: an **archived** collection is offered only
when the Name is actually in it, so it can be taken OUT but never filed into
(I4 says archive rather than destroy; it does not say keep filing into the
archive); the browsing position **falls back** to a collection that really does
hold the Name if the reader has just removed it from the one on screen, rather
than leaving a dead-end list; and the per-row "Move to…" select on the Names
list is untouched -- that one acts on a Name in the context of the group being
browsed, this one acts on the Name itself.

**Verified with three focused, un-checked-in Playwright scripts** (this
project's own established practice for anything past `behaviour.mjs`'s
disclosed section-42 crash point) -- **75 + 23 + 1 checks, all passing**: each bar proven to
hold exactly its dropdowns plus one palette wrap and to sit on ONE line at
390/768/1280px, before and after Manage; the Approach picker proven present in
the bar and absent from the wheel pane, and proven to still drive the canonical
`#trackableSelect`; the palette proven to start closed, to open on ⋯, to stay
open when Manage is pressed inside it, to close on an outside click, and to
stay within the viewport at every width; the A± button proven gone with its
three sliders proven inside the palette, really moving `--asmax-wheel-ar-scale`,
really writing to localStorage, and Reset proven to move the slider back with
it; the 📂 button proven ABSENT while Manage is off and present after it, in
the owner's own marked-up slot after ✎ and 🔗; the picker proven to open with
the groups the Name is already in ticked, to put it in BOTH on save (multiple
membership), to MOVE it when one is unticked, to write for real to
`asmaCollections`, and the destination group proven to really list the Name
afterwards; plus the whole thing in Bangla with the collection ids behind the
ticks proven still plain ids; and, separately, a palette proven **never to come
back open** -- left open, then the reader switches Explore mode, or leaves
Explore for the Read screen and returns, and it is closed both times (an
absolutely-positioned popover goes off screen when its panel is hidden but
would otherwise stay marked open, so `setExplorePalette()` and
`closeAllPanels()` both close it). **Screenshotted at 390x844 in both languages** --
each bar, each palette open with Manage on, the Name screen and the picker --
rather than trusting the assertions alone.

**`behaviour.mjs`: 803 checks pass, 0 fail**, stopping at the exact
pre-existing crash this project has carried since v07.69 (a stale
`[data-note-master-toggle]` visibility assumption from before the round-31 bar
reorg, at that file's own line 4084 -- confirmed unrelated, since nothing in
this round is reachable from any section the suite runs). Worth knowing when
comparing that number with v07.124's "800 pass, 3 fail": the three were the
environmental archive.org poster block this project has recorded since v07.44,
and archive.org happened to be reachable from this sandbox on these runs -- the
total is the same 803 either way, and no checked-in check needed updating,
because the QCR and Asma Explore surfaces this round rebuilds sit past that
crash point and have never had checked-in coverage.

**`tools/perf/measure.mjs` unchanged**: Quran Study **6 sequential round trips /
9 Firestore calls**, Deen Study, Health and Asma 7, Records 5 -- byte-identical
to the v07.126 baseline, which is the check that proves this round joined
nothing to the startup path (I9). Expected, since it is client-side UI
throughout: one new pure module, some markup moved between containers, and CSS.

**`layout.mjs`: every measured landing-page metric byte-for-byte identical** to
`HEAD` at all eight viewports in both banner states (heading 103px, wheel
280/399px, Approach rows, 9px dock gap, no overflow). **One harness note worth
keeping, and it cost a wrong reading first:** the shim `layout.mjs` compares
against is HEAD's copy of `quranrevival.html` running against the CURRENT
`js/` modules -- so a round that renames an export that page imports (this one
retired `renderAsmaWheelTextButtonHtml`) makes the whole "before" side fail to
boot and score null everywhere, which looks like a catastrophic regression and
is not. The honest fix is to drop HEAD's copy of the changed module beside it
and point the shim at that. `getElementById` targets 221 → 230, exactly this
round's nine new lookups; the "missing" list is 19, and **the unmodified `HEAD`
copy was run through the identical check and reports the same 18** -- the
pre-existing Manage-mode-only Asma/QCR false positives disclosed since v07.86 --
so this round adds exactly one, `asmaXGroupsThisNameBtn`, which is Manage-mode-
only in the same way. **`reading.mjs` READING SCREEN OK** at all eight
viewports, **`panel.mjs` no wrapped bar and no truncated label** (this round
never touches the Study options panel), **`navcheck.mjs` unchanged** (still only
the pre-existing 320px English truncation of "Operation"/"Bookmark").
**Coverage 1,547 → 1,548 scanned, 48 → 47 missing**, both movements accounted
for line by line against a clean `HEAD` checkout rather than trusted from the
total: four new strings, three that stop being called, and -- incidentally --
the pre-existing untranslated `"More"` in the quran area now has its Bangla,
because this round needed the same word. No `firestore.rules`, schema or
Firestore data changes -- nothing to deploy but the static files.


v07.128 (4 Sep 2026, same day) is **two owner reports against v07.127, one
cause between them -- and a THIRD bug, pre-existing and older, found while
reproducing it.** Their words: *"In Tab, QCR, the button group is missing. FIX"*
and *"In Asma, name movement field is no where, FIX"*.

**Reproduced before anything was touched, and the two reports turned out to be
one thing.** `canAdminCatalogueClientSide()` reads `currentPreview().effRoles`
-- so a **"View as" preview left switched on** makes an OWNER read as a
student. That preference has lived in **localStorage since v07.75**, so it
survives every reload on that device and can sit there for weeks unnoticed.
With a preview on: **QCR's ⋯ vanished outright** (report 1), and **Asma's
Manage button was hidden**, so Manage could never be turned on, so ✎/🔗/📂
never rendered -- which is exactly *"name movement field is no where"*
(report 2). Asma's own ⋯ stayed visible throughout, which is why the owner
reported the missing BUTTON GROUP for QCR only and the missing FIELD for Asma.
Measured with the preview seeded into localStorage, at 768px and 1280px, before
a line was changed.

**(1) The QCR half was v07.127's own regression, and it is reverted.** That
round's follow-up commit hid the whole palette wrap when `canManage` was
false, reasoning that it would otherwise open empty. That reasoning was wrong
in the way that matters: it made the only control on that bar disappear, with
nothing on screen to say why and no way back to it. **The button is never
hidden now.** The general lesson, worth keeping: *a control that opens and
explains itself beats a control that is not there* -- an empty dropdown is a
small ugliness, a missing one is a dead end.

**(2) The gate itself is correct, so it now says so in words.** An owner
previewing as a student really is not an admin; what was wrong was that the
app said nothing. Both palettes carry a note when management is unavailable,
from one shared `manageUnavailableNote()` rather than two copies: with a
preview on it names the role and points at where to turn it off ("You're
previewing as Student, so managing is switched off. Turn the preview off on
the People page to manage again."), and otherwise it says plainly that this is
owner/prime only. Two new strings, both translated.

**(3) The third bug, PRE-EXISTING and not introduced by v07.127 -- this
codebase's own most-repeated trap, in a fifth place.** While screenshotting the
fix, the ✎ 🗄 + and "Show archived" row was on screen **with Manage switched
off**. `#qcrLevelManageActions` and `#asmaXLevelManageActions` are ID rules
setting `display: flex`, which outranks the UA's `[hidden] { display: none }` --
so `qcrLevelManageActions.hidden = true` **has never actually hidden anything**.
Rename/Archive/Add and Show archived have been on screen for every reader all
along, whether or not Manage was on and **whether or not they can manage at
all**. It is visible in the owner's own screenshot of the round before this
one, once you know to look. Fixed with the explicit `#id[hidden] { display:
none }` override the standing lesson prescribes (`#id[hidden]` outranks `#id`),
on both bars.

**And the reason it survived v07.127's own verification is worth recording
against that round's name:** its check read `element.hidden` -- the PROPERTY --
and passed, while the icons were really on screen. That is precisely the
mistake the standing lesson names ("Check COMPUTED display"), made by the test
rather than the app. The check reads `getComputedStyle(...).display` now. **A
test can carry the same blind spot as the code it guards; assert the rendered
result, not the intent.**

**Verified: 145 focused checks across four un-checked-in Playwright scripts,
all passing** -- v07.127's own 75 + 23 re-run green, plus 47 new ones for this
round: the QCR ⋯ proven on screen and openable while previewing as a student,
at 768px and 390px, in English and Bangla; the note proven to appear, to name
the previewed role, and to be Bangla in Bangla; the Manage button proven
correctly still off; Asma's palette proven to carry the same explanation while
its wheel text-size sliders stay available to every reader either way; no note
at all for an owner who can manage; and **the whole path to 📂 proven to work
on a tablet** for an owner who is not previewing -- Manage on, open a Name, the
button present and on screen. The `[hidden]` fix is proven by COMPUTED display,
not by the property. **One test bug of its own was found and fixed rather than
worked around:** the helper pressed `#tabExploreBtn` a second time, which
TOGGLES Explore shut, so the second half of each case was measuring a closed
panel.

**`behaviour.mjs`: 800 checks pass, 3 fail** -- the three are the known
environmental archive.org poster block this project has recorded since v07.44
(section 22g; they passed earlier the same day, when that host happened to be
reachable, which is the giveaway), and the run stops at the same pre-existing
line-4084 crash carried since v07.69. Same 803 total as v07.127's own run. No
checked-in check needed updating: what this round fixes is Manage-mode surface
on the QCR/Asma Explore bars, which sits past that crash point and has never
had checked-in coverage -- which is exactly why the `[hidden]` bug lived so
long.

**`layout.mjs`: every measured landing-page metric byte-for-byte identical** to
`HEAD` at all eight viewports in both banner states (heading 148/103px, wheel
377/399/280/220/320/360px, Approach rows, 9px dock gap, no overflow);
`getElementById` targets 230 → 232, exactly the two new note elements, and the
"missing" list is the same 19 disclosed in v07.127. **Coverage 1,548 → 1,550
scanned, 47 missing unchanged** -- the two new strings, both translated and
read back off a really-rendered Bangla page rather than trusted from the
report. No `firestore.rules`, schema or Firestore data changes -- nothing to
deploy but the static files.

**Flagged, not changed:** the `[hidden]` fix means a reader who cannot manage
no longer sees Rename/Archive/Add at all on either bar. That is the intended
behaviour those `hidden` attributes have always described, but it IS a visible
change for anyone who had grown used to seeing them -- said here rather than
left to be noticed.


v07.129 (5 Sep 2026, on Claude Code on the web) is **two owner asks about the
Asma ul Husna Names -- the movement button they could not find, and creating a
Name (or a Dual Name) straight from the āyah being read.** Their words: *"there's
supposed to be a button for moving a name from one group to another group and
placing a name in multiple groups but there's nowhere movement button is shown
in TAB, even after I set my role as 'Prime'. FIX this."* and, from the Note
view, *"I want a button to add a new name here, attach that Ayah as reference to
that new name, add a field where I can Create a DUAL name and attach the Ayah as
ref to that new name."*

**(1) The movement button was never broken -- it was unreachable, and the
difference matters.** Reproduced in a real browser before anything was touched,
at 768x1024, 1200x1920 and 390x844, as an owner AND as an owner previewing as
Prime: `canAdminCatalogueClientSide()` returns true for a Prime preview
(`effectiveRoles` collapses to `["prime"]`), the ⋯ palette opens fully inside
the viewport at every width, Manage is offered, and 📂 renders and writes
correctly once Manage is on. So the role was never the problem, which is why
changing it changed nothing. **What was wrong is that the only route to it was
three taps deep and forgot itself:** open the ⋯ palette, press Manage, then
drill into a Name -- and `asmaXManageOn` is a session-only variable that falls
back to off on **every single load**, with nothing on screen ever saying the
button existed. The owner's own screenshot shows exactly that state: the Name's
bar carrying a back arrow, a title, and a wide empty space.

**Fixed by gating 📂 on being able to manage AT ALL, not on Manage MODE.**
`renderAsmaXRefsLevel()` reads a new `canFileIntoGroups` (`canAdminCatalogueClientSide()`)
for that one button; ✎ and 🔗 keep `asmaXManageOn && …`, unchanged. The line
that decides it: **filing a Name into groups is the one action on that bar with
no other route, and it only ever splices a membership array** (`asmaCollections`'
own `items[]`, which I5 already keeps free of anything a claim, bookmark or note
is keyed against) -- whereas ✎ rewrites the Name's own content and 🔗 appends
references to many Names at once. Those two are genuine authoring and stay
behind Manage. This is the standing lesson in its usual form: *a control that
opens and explains itself beats a control that is not there* -- and one that is
there only after three taps you have to repeat every visit is, in practice, not
there. A reader who cannot manage still sees no 📂, proven by computed display
rather than the `hidden` property.

**(2) A Name, or a Dual Name, created from the āyah in front of you.** The Note
view's Asma drawer gains **"➕ New Name from this āyah"** and **"➕ New Dual Name
from this āyah"** beside the "🔗 Attach this āyah" button it already had
(owner/prime only, same gate). Both open the SAME create-Name overlay Explore's
own +N uses -- one form, one Save, one write -- with the āyah **already in its
Reference field**, so it is that Name's own reference the moment it is saved,
with no separate attach step. That reuses the exact `prefillRef` path the
30 Aug 2026 round built for "attaching an Ayah… and creating New Name"; nothing
about the create/save code was duplicated.

**What is new is one row on that form: "file it under".** A `<select>` of the
live collections of the right kind, plus a "+ New…" option that reveals its own
title field in place rather than opening a second overlay. The two buttons
differ by exactly one value -- that row's `kind`. **And that is what makes a
Dual Name work at all, which is worth stating plainly rather than leaving to be
rediscovered: a collection has no `ref` field and never has; a Name does.** So a
"Dual Name" here is a real Name, carrying the āyah as its own reference like any
other, filed into a Dual Names collection -- which is precisely how this app has
distinguished Group from Dual since 30 Aug 2026 (`kind` on the collection, its
own dropdown on the Asma bar). Building it as a collection instead would have
produced something with nowhere to put the reference the owner asked to attach.
**No schema change and no `firestore.rules` change** -- `asmaCollections/{tenantId}`
is gated by tenant, not by field, and both `addExtraName` and `addCollection`
already existed as pure helpers; this round only calls them from a second place.

**Three smaller decisions ride with it.** A brand-new list takes the Name's own
transliteration as its title when nothing was typed -- almost always what a dual
Name's list is called, and it beats a second error message for a field the
reader has effectively already filled. The create path's own re-render now
follows the attach popover's guard (`if (!asmaXPanelEl.hidden) renderAsmaXPanel()`
plus `if (stageView === "note" && noteScope) renderNoteViewNow()`), because this
is the first time that form can be opened while the Explore panel is hidden --
without it a successful save would have redrawn a panel nobody was looking at
and left the drawer stale. And Explore's own +N is deliberately **untouched**:
it gets no destination row and keeps its existing "adds to the current group if
you are inside one" behaviour, so this round's blast radius stops at the two new
buttons.

**One trap caught by measuring, and it is this codebase's most-repeated one in a
sixth place.** The "+ New…" title field is a `<label>`, and `#asmaXEditBody label`
carries `display: flex` -- which beats the UA's own `[hidden] { display: none }`,
so `hidden` on it would have done nothing and the field would have sat there
permanently. An explicit `#asmaXEditBody label[hidden]` override is in with it.
The same rule block also grew a `select` (it had none, so the new picker would
have rendered as the browser's default control on a dark card) with
`box-sizing: border-box`, so a long collection title cannot push the card wider
than the field holding it.

**Verified with a focused, un-checked-in Playwright script -- 50 checks, all
passing** (this project's own practice for anything past `behaviour.mjs`'s
disclosed section-42 crash point): 📂 proven **on screen with Manage mode OFF**
at 768/1200/390px, as an owner and as an owner previewing as Prime, with ✎ and 🔗
proven still absent in that state; proven **still absent entirely** for a reader
previewing as Guardian; the picker proven to open with the group the Name is
already in ticked, and a real move proven to write to `asmaCollections`; both new
buttons proven present, drawn and beside Attach on tablet and phone; "+ New Dual
Name" proven to open a form titled for a Dual Name with the āyah **already** its
Reference and a file-under row that, with no dual list yet in the tenant,
correctly defaults to "+ New…" with its title field showing; saving proven to
write, and the new Dual Name then proven to appear in the Asma bar's own **Dual
Names dropdown**, to be really DRAWN in that list, and to carry the āyah on its
own reference card; "+ New Name" proven to offer the real Group list with the
title field hidden, to file into the group actually chosen, and to reveal that
field on "+ New…"; and all of it in Bangla, with the option VALUES proven still
plain collection ids. **One test bug of its own was found and fixed rather than
worked around:** the helper pressed `#tabExploreBtn` unconditionally, which
TOGGLES Explore shut -- v07.128's own recorded trap -- so two assertions were
reading `textContent` out of a closed panel; the helper now opens only when
Explore is really closed and throws if the Asma panel is not actually drawn, and
both assertions measure a rendered rect rather than text.

**`behaviour.mjs`: 803 checks pass, 0 fail**, stopping at the exact
pre-existing crash this project has carried since v07.69 -- line 4084's
`[data-note-master-toggle]`, a stale visibility assumption from before the
round-31 bar reorg, which now sits inside the ⋮ dropdown and so is never
visible when that click fires. Same 803 total as v07.127's own run, and no
checked-in check needed updating: what this round changes is the Asma Names
surface in Explore and the Note view's Asma drawer, both of which sit past
that crash point and have never had checked-in coverage -- which is part of
why a button nobody could reach went unnoticed. **`tools/perf/new-tenant.mjs`
10/10.**

**`layout.mjs`: every measured landing-page metric byte-for-byte identical** to
`HEAD` at all eight viewports in both banner states (heading 148/103px, wheel
377/399/280/220/320/360px, Approach rows, 9px dock gap, no overflow).
`getElementById` targets 232 → 235 -- exactly this round's three new lookups --
and the "missing" list reads 22, **which was checked against the unmodified
`HEAD` copy through the identical scan rather than assumed: it reports 19**, the
pre-existing Manage-mode-and-overlay-only false positives this project has
disclosed since v07.86. So this round adds exactly three, all of them fields
inside the create-Name overlay body, which does not exist until that overlay is
opened -- sitting alongside `asmaXEditTranslit`/`asmaXEditRef`, already on that
list for the same reason. **`reading.mjs` READING SCREEN OK** at all eight
viewports, **`panel.mjs` no wrapped bar and no truncated label** (this round
never touches the Study options panel), **`navcheck.mjs` unchanged** (still only
the pre-existing 320px English truncation of "Operation"/"Bookmark").
**Coverage 1,550 → 1,559 scanned, 47 missing UNCHANGED**, compared area by area
against a clean checkout: only `quran` moves, 321 → 330, +9 translated -- exactly
this round's nine new strings, every other area byte-identical.
**`tools/perf/measure.mjs` identical**: Quran Study 6 sequential round trips /
9 Firestore calls, Deen Study, Health and Asma 7, Records 5 -- the check that
proves this round joined nothing to the startup path (I9). Expected, since it is
client-side UI throughout. No `firestore.rules`, schema or Firestore data
changes -- nothing to deploy but the static files.

**Flagged, not changed:** Manage mode is still session-only everywhere else, so
✎, 🔗, the per-row "Move to…" select and the QCR bar's own icons all still need
the ⋯ → Manage trip on every visit. Remembering that choice per browser is a
one-line `prefs.js` addition of the same additive shape every reading preference
since round 18 has used, and it would make the rest of Manage as findable as 📂
now is -- but it also means edit icons appearing unbidden on a later visit, so it
is the owner's call rather than something to slip in here.


v07.130 (5 Sep 2026, on Claude Code on the web) is **the round v07.129 should
have been on its own: the Asma surfaces laid out properly, Manage discarded,
and every button given a size a finger can actually hit.** The owner opened
with *"Man, do things eloquently, not haphazardly! ... Why do I have to spend
time to fix your work?"* -- and they were right. v07.129 dropped three
differently-sized text buttons into the Note drawer and let them wrap where
they fell; it was never measured or looked at, only asserted. **The standing
lesson that failed was already written down and was simply not followed: a
screenshot is not a measurement, and neither is a passing assertion.** Every
number below was measured before and after, at seven widths in both languages,
and every screen was screenshotted and read.

**(1) The Note drawer's Asma fields, to the owner's own layout.** *"Put the
Group field in one row; 2nd row Names, Dual, Ref in the 2nd row and put three
buttons as three icons side by side after ref."* Built exactly so: `.note-asmax-row1`
is Group alone at full width -- it carries the longest titles in the whole
feature ("The Most Glorious, Most High, Exalted, Uppermost"), so a third of a
row was always the wrong share -- and `.note-asmax-row2` is a four-column grid,
`minmax(0,1fr)` three times plus **`auto`**. That last column is the design:
the three fields shrink and the control cluster never does, which is the exact
opposite of three text buttons free to wrap against each other.

**DUAL is new here and is not a second idea** -- it is the split the Explore
bar has used since 30 Aug 2026, brought over: Group lists `kind: "group"`,
Dual lists `kind: "dual"`, both write the same `noteOriginAsmaGroupId`, and
picking in one clears the other because a Name is browsed through exactly one
list at a time. Before this, one "Group" field listed both kinds mixed
together. A tenant with no dual list yet gets a line saying so and pointing at
the ✚² button, rather than a dropdown that opens empty (v07.128's own rule).

**The three actions are one tile group**: 🔗 attach this āyah, ✚ new Name, ✚²
new Dual Name -- equal 40px squares, words in `title`/`aria-label`, the same
icon-with-its-name-in-the-title convention bar 2 has used since round 31.
**Measured at every width, both languages: 768px and up they sit after
References on one line with nothing truncated; below 560px they take one tidy
right-aligned line of their own.** That breakpoint is a measurement, not a
feel: at 390px the three fields need ~95px each and the tiles 132px, which is
417px inside a 356px card. Squeezing the fields to ~78px to force one line
would have cut their labels silently, which is this project's own
most-repeated layout trap.

**(2) "In TAB you can wide the palette to the entire screen"** -- and the care
here is which width. The drawer is `width: 100%`, **not `94vw`**: it is
anchored `right: 0` off `.note-bar2`, so a viewport-sized width hangs off the
BAR's right edge and runs however much wider it is straight off the LEFT of the
screen. **Measured on the first attempt: at 1280px a 94vw card started at
x=-46, and worse at 1920px.** 100% of the bar is the full width of the reading
screen -- which IS the whole screen on a tablet (736px of 768px) -- and cannot
overflow either edge at any width by construction.

**(3) Manage is gone from Asma.** *"Why do I have to click twice (manage button
again) to bring the edit buttons? Discard the 'manage' button. those edit
button should be open under the 3 dots."* It was a mode toggle sitting in front
of a menu that is already a mode: opening ⋯ IS the reader saying "show me the
controls", and asking again bought nothing and forgot itself on every load --
which is precisely what made 📂 unfindable in v07.129. `asmaXManageOn`, a
session-only `let`, is now `asmaXCanManage()`, a function returning
`canAdminCatalogueClientSide()`: there is nothing left to remember and nothing
left to forget. One tap on ⋯ and all five actions are there; open a Name and
✎ 🔗 📂 arrive with it. **A reader who cannot manage still sees none of them**,
and still gets the note saying why (v07.128's rule holds).

**(4) The buttons are bigger, because they were genuinely too small.**
`.qcr-icon-btn` was **26x26px with a 12px glyph** -- well under the ~44px a
finger wants, and small enough that the emoji inside read as specks. Now
**36x36 with a 17px glyph** on the dark bars and **40x40 with 19px** inside the
⋯ palette, where the room is. Costed rather than assumed: the Asma bar goes
**47px -> 56px** and still holds ONE line at 320/360/390/768/1280px in both
languages, with no page overflow; the landing page is untouched. The palette
went 15rem -> 16.5rem for one reason, found by screenshot: at 15rem the fifth
tile wrapped to a line of its own, so the palette read as four-and-a-stray
rather than one group.

**Two real defects were caught by measuring, and one of them was mine, made
while fixing this.** The new palette rule was first written as a bare
`.bar-palette #asmaXLevelManageActions { display: flex }` -- **identical
specificity to `#asmaXLevelManageActions[hidden]`, and written below it**, so
it would have won on source order and put every Manage icon back on screen for
every reader: the exact bug v07.128 spent a whole round finding, re-introduced
within a day. `:not([hidden])` removes the tie rather than betting on where two
rules sit in a file. And a **pre-existing** one, surfaced because the drawer is
now a workspace: `ayah-note-renderer.js`'s outside-click closer treated a modal
opened FROM the drawer as an outside click, so pressing Save in the form the
drawer had just opened closed the drawer underneath it. Fixed generically with
a `[data-keep-note-popovers]` opt-out marker the three Asma overlays carry --
that file stays a pure renderer that knows nothing about what those overlays
are (I2).

**Verified with a focused, un-checked-in Playwright script -- 53 checks, all
passing**, and every screen screenshotted and read rather than trusted from the
assertions: row 1 proven Group alone and row 2 proven Names/Dual/References
with three equal tiles proven to sit AFTER References on the same line at 768
and 1280px, and proven to fall to one right-aligned line at 390px with the
fields still on one line of their own; the tiles proven >=38px; the drawer
proven to fill the screen AND to stay on it at every width; the Dual field
proven to say so when empty, to be filled by the ✚² tile's own new list, to
clear Group when picked and to open the Names field against it; **the drawer
proven still open after saving from a form it opened** -- the defect above;
the Manage button proven gone from the page entirely at 390/768/1280px; one tap
on ⋯ proven to reveal all five actions as one 40px row; ✎ 🔗 📂 proven present
on a Name with no Manage tap anywhere in the journey; a reader previewing as
Guardian proven to get no tiles in either place **by COMPUTED display**, with
the note still explaining why and the text-size sliders still theirs; **QCR
proven unbroken** by the shared style change (its bar still one line, its own
Manage button deliberately untouched); and all four labels, all three tile
titles and the empty-Dual hint proven Bangla in Bangla.

**`behaviour.mjs`: 800 checks pass, 3 fail** -- the three are section 22g, the
environmental archive.org poster block this project has recorded since v07.44
(the sandbox's proxy blocks that host; they pass when it is reachable), and the
run stops at the same pre-existing line-4084 crash carried since v07.69. Same
803 total. **`layout.mjs`: every measured landing-page metric byte-for-byte
identical** to `HEAD` at all eight viewports in both banner states (heading
148/103px, wheel 377/399/280/220/320/360px, Approach rows, 9px dock gap, no
overflow); `getElementById` targets 235 -> 234, exactly the retired
`asmaXManageToggleBtn` lookup, and the "missing" list is the same 22 as `HEAD`
-- no new entries. **`reading.mjs` READING SCREEN OK** at all eight viewports,
**`panel.mjs` byte-identical to `HEAD`** (this round never touches the Study
options panel), **`navcheck.mjs` unchanged** (still only the pre-existing 320px
English truncation of "Operation"/"Bookmark"). **Coverage 1,559 -> 1,560
scanned, 47 missing UNCHANGED**, compared area by area: only `quran` moves,
330 -> 331, the one new string, translated. **`tools/perf/measure.mjs`
identical** (Quran Study 6 sequential round trips / 9 calls) and
**`new-tenant.mjs` 10/10** -- I9 untouched, as expected for markup and CSS. No
`firestore.rules`, schema or Firestore data changes.

**Flagged, not changed: QCR still has its Manage button**, and it is the same
two-tap complaint one screen over. It was left alone only because the owner
named Asma; the change there is the same handful of lines, and it should
probably follow.


## What this is

A multi-tenant Madrasah platform, being rebuilt from a single-file HTML app
(`index.html`, ~10,150 lines) into a Firebase/Firestore application.

**The owner is a non-coder.** They cannot read code, cannot verify code, and can
only perform checks when guided click by click. This is a hard constraint on how
work is done, not a preference. Anything that ends with "please test this" is a
step that may never actually get verified — so verification must be mechanical
wherever possible.

Communication: plain language, one-line gloss on any jargon. Direct and
decision-oriented. Corrections come promptly when framing drifts.

---

## Source of truth

| File | Role |
|---|---|
| `QuranRevival_Complete_Architecture.html` | **THE source of truth.** Schema, invariants, roles, renderers, unit keys, 15 build phases, load-speed budget. Confirmed by the owner. |
| `QuranRevival_Subject_Catalogue_v3.md` | 31 subjects, 30 Approaches in 7 sections. **Approved as-is (D11).** Phase 2 input. |
| `QuranRevival_Parked_Items_Register.html` | 36 deferred items. **Do not build these.** |
| `legacy/index.html` | The pre-cutover production app. **REFERENCE ONLY — NEVER EDIT.** No longer live at the production URL as of 9 Aug 2026 (cutover) — archived here, reachable at `https://madrasatul-muslimeen.github.io/legacy/index.html`. (Since v07.78's repo fold, this repo's root `index.html` is a DIFFERENT file — the live redirect stub into `/app/index.html` — not this one; don't confuse the two.) |
| `CHANGELOG.md` | **The full round-by-round build log**, v07.01 onward, split out of this file 4 Sep 2026. History, not brief — open it for the background of one specific feature, never as routine reading. |
| `LAYOUT-BACKLOG.md` | **The pick-up list for outstanding layout work** (opened 13 Aug 2026, after shell round 11), ordered as the owner wants it taken. Item 1 (one global Language preference) is agreed and ready to build in its own session. Read it before starting any layout round — it also records the measure-before-and-after method every round since v07.22 has used. |

Do not re-derive or re-propose the architecture. If a request appears to
conflict with it, **ask** — do not assume.

`QuranRevival_Master_Plan_Final.md` and `QuranRevival_System_Blueprint.md` are
referenced in older instructions but were never supplied and do not exist.

---

## How to work

- **Master Software Architect.** Diagnose before changing anything.
- **One phase at a time.** Present the plan and its blast radius; get explicit
  sign-off; then build.
- **Read only what the current task needs.** Do not re-survey the whole file.
  Do not restate the architecture.
- **Verify, do not guess.** Before claiming anything works: check syntax,
  confirm every referenced function actually exists, confirm no existing
  behaviour or data was removed. Never report something as done without
  having checked it.
- **Additive only.** Never delete or destructively reshape data. Archive,
  revoke, return, mark consumed — never destroy.
- **State the blast radius before writing code.**
- **If a plan proves wrong mid-build, STOP and say so.** Do not build something
  known to be poor.
- **No permission-asking for routine building/fixing work.** The owner has
  said this repeatedly and explicitly: do not pause to ask before file
  edits, git operations (add/commit/status/log/diff/init), running or
  stopping the local test server, or any Firebase CLI action on the
  `study-monitoring` project — including deploying `firestore.rules`. This
  covers everything in this project's folder and everything on that
  Firebase project. Just do it and report what was done afterward. The
  only things that still need the owner's actual input are genuine
  design/scope decisions — an architecture deviation, an ambiguous spec, a
  real "which approach" choice — the kind of thing that needs their
  opinion, not their permission.
- **On Claude Code on the web: merge your own PRs, every time, without being
  asked.** This project has been worked on both via the Claude Code CLI
  (local files, no GitHub layer, changes are just immediately there) and via
  Claude Code on the web (each session gets its own working branch on
  `Madrasatul-Muslimeen/QuranRevival---ClaudeCode`; nothing reaches `main` —
  what the owner actually tests — until a PR merges it in). The owner's own
  click-through always happens against `main`. A session that finishes work
  and leaves it sitting on an unmerged branch has, from the owner's side,
  done nothing yet — this already caused real confusion once (Phase 4
  round 2: real fixes, pushed, but invisible until merged two rounds later).
  So: open the PR and merge it yourself as the last step of finishing any
  chunk of work on this repo, same as the other git operations above — no
  permission needed, don't leave it pending "for the owner to merge" unless
  they've explicitly said they want to review first.
- **Be proactive.** Flag anything adjacent that is broken or risky rather than
  working around it silently.
- **Report every time:** what was done, what is pending, what the owner should
  check. Keep checks short — long click-throughs will not happen.
- **Must work on desktop, tablet and phone.**
- **Do not build** Finance, Operations, medical records, or distribution unless
  explicitly asked.

---

## Standing lessons — earned the hard way, do not relearn them

These are not invariants (those are below, and they are about the architecture).
These are the practical rules ~120 rounds of real building produced. Each one
cost a shipped defect or a wasted round at least once. They used to live only
inside `CHANGELOG.md`'s prose; they are here because they still bind.

**On measuring**

- **Measure before AND after, never trim by feel.** Every layout round since
  v07.22 works this way: measure the thing complained about, cost each
  candidate change, then measure the result. A screenshot is not a measurement.
- **A NEW control is a layout change and gets the same measurement as one that
  moved.** v07.129 added three text buttons to a card and asserted only that
  they existed and were clickable -- both true, while they wrapped into a
  ragged stack of three different widths that the owner had to send a photo
  of. Anything added to a row costs that row width: measure the row at every
  viewport in both languages BEFORE shipping, and LOOK at the screenshot. The
  fix shape, when a row genuinely cannot hold everything: a fixed `auto`
  column for the controls so the FIELDS shrink and the control cluster never
  does, and one deliberate breakpoint where the cluster takes a tidy line of
  its own -- never leaving buttons to wrap wherever they land.
- **A 26px button is too small.** This codebase drifted to 26x26 icon buttons
  with 12px glyphs on the QCR/Asma bars and the owner eventually said so
  outright. ~40px is the target for anything a finger presses; a square,
  fixed, `flex-shrink: 0` tile is what keeps a row of them looking like one
  group instead of several sizes.
- **The translation coverage number is a to-do list, never evidence.** It has
  been wrong about what it counts **nine separate times** — over- and
  under-counting both. Only reading a really-rendered page proves a screen is
  translated. Check Bangla by opening the page in Bangla.
- **`layout.mjs` proves "nothing changed since last time", never "this is
  right".** When a round is a CORRECTION, compare against the last KNOWN-GOOD
  commit (`git show <sha>:app/quranrevival.html`), not just `HEAD` — otherwise
  you are comparing against the broken build.
- **The `_prev-quranrevival.html` shim is OLD markup running against NEW
  modules.** So a round that renames or retires an export that page imports
  makes the whole "before" side fail to boot and score null/0 at every
  viewport — which reads as a catastrophic regression and is nothing of the
  kind. Drop `HEAD`'s copy of the changed module beside it and point the shim
  at that (`git show HEAD:app/js/x.js > app/js/_prev-x.js`, then `sed` the
  shim's own import). v07.35 hit the file-renamed version of this; v07.127
  the renamed-export one.
- **Delete `app/_prev-quranrevival.html` before reading a coverage total.** It
  is a `.html` file in `app/`, so the old page gets counted a second time. This
  trap has produced a wrong number in this file's own history more than once.
- **A label with `white-space: nowrap` + `text-overflow: ellipsis` fails
  SILENTLY.** Nav categories, `#readRef`, picker labels. Re-measure whenever
  one is renamed; it will not look broken, it will just be cut.

**On this codebase's own traps**

- **`[hidden]` is beaten by any class or ID rule that sets `display`.** Several
  containers here carry `display:flex` from a class, which outranks the UA's
  `[hidden]{display:none}`. Toggling `.hidden` from JS then silently does
  nothing. Check COMPUTED display, and add an explicit `[hidden]` override.
  This has bitten at least six times (`#wheelSection`, `#studyScreen`,
  `#explorePanel`, `#asmaXPanel`, and — found in v07.128, after living
  undetected for months — `#qcrLevelManageActions`/`#asmaXLevelManageActions`,
  where it meant Manage-mode buttons were on screen for every reader all
  along). **`#id[hidden]` outranks `#id`**, which is the fix for an id rule.
- **A mode toggle in front of a menu is one tap too many.** Asma's Manage
  button was a session-only `let` gating controls that already sat inside a
  ⋯ palette -- so opening the palette said "show me the controls" and the app
  asked again, then forgot the answer on every load. v07.130 deleted it: being
  able to manage IS the condition. If a gate is a capability, make it a
  function of the capability, not a piece of state someone has to re-set.
- **"Unreachable" and "broken" are different bugs, and the fix is different.**
  v07.129's own report ("the movement button is nowhere, even after I set my
  role to Prime") reproduced as: the button rendered correctly, for an owner
  AND for an owner previewing as Prime, at every viewport -- but only after
  ⋯ → Manage → drill into a Name, and Manage mode is a session-only variable
  that resets on every load. So reproduce the reported STATE before hunting a
  gate; a role the user changed and nothing improved is a hint the gate was
  never the problem. Where a Manage-mode action is the ONLY route to something
  and cannot damage content, gate it on being able to manage at all, not on
  the mode.
- **A control that opens and explains itself beats a control that is not
  there.** v07.127 hid a whole palette because it would otherwise open empty
  for a non-admin; v07.128 reverted it the same day, on the owner's report,
  because "empty" is a small ugliness while "missing" is a dead end with
  nothing on screen to say why. When a gate is correct, say so in words where
  the control would have been.
- **`canAdminCatalogueClientSide()` is false while a "View as" preview is on**,
  because it reads `currentPreview().effRoles` — and that preview lives in
  localStorage (v07.75), so it survives every reload and can sit forgotten on
  one device for weeks. When an owner reports admin controls "missing",
  check for a stale preview before hunting the layout.
- **Two CSS rules of equal specificity: source order wins.** An unconditional
  `display:none` placed after a media-query rule silently beats it. Put BOTH
  states behind mutually exclusive conditions instead.
- **`.reading-ticks` is a name with MEANING, not styling** — checks read it as
  a count. Anything new near it needs its own class. Same for `.fs-ticks`.
- **Re-render wipes UI state.** `renderNoteViewNow()` rebuilds its whole body,
  so anything a reader opened by hand needs a session flag threaded back in
  (or, better, read live off the DOM one line before it is replaced — that is
  self-correcting where a flag can go stale).
- **`surahName()` needs the English name handed to it** — it has no lookup
  table. Calling it with one argument renders a blank name in every language.

**On the test harness (`tools/i18n-verify`)**

- **The Firebase stub never mutates its own `DATA`.** A handler that writes and
  then re-fetches sees STALE data here even when it is correct against real
  Firestore. Patch the in-memory copy after a successful write and re-render
  from that — which is also the better production behaviour. Prove a write via
  `window.__fsLog` (which document) or `__stubWrites` (which fields).
- **The stub answers INSTANTLY.** Any timing measurement needs
  `latencyMs`; without it every page looks a few milliseconds fast and the
  number is a comforting lie.
- **Wait for a STATE, never a guessed number of milliseconds.** Browsers
  throttle `timeupdate`; a re-render may leave the previous render's options in
  the DOM, so "wait until options exist" resolves instantly against stale ones.
- **`behaviour.mjs` has a pre-existing crash in section 42** (a stale
  `[data-note-master-toggle]` visibility assumption), carried since v07.69, and
  **3 environmental failures** where this sandbox's proxy blocks archive.org.
  ~800 checks pass before it. Anything past that point needs a focused,
  un-checked-in script — this project's established practice.
- **This sandbox cannot reach `archive.org` or `api.quran.com`.** Recitation
  audio and Asma posters will fail here and work for the owner.
- **A check that describes what a round deliberately changed gets UPDATED in
  place, with the reason recorded — never deleted, never worked around.**

**On reporting**

- **A failing check is a wrong assertion surprisingly often.** Investigate
  before "fixing" the app; several rounds here have proved the test wrong.
- **A PASSING check can carry the same blind spot as the code it guards.**
  v07.127 asserted `element.hidden` — the property — and passed green while
  the buttons were really on screen, because `[hidden]` was being overruled.
  Assert the RENDERED result (computed display, a measured rect, real text),
  never the intent the code just expressed.
- **Say what was NOT done, and why.** Every round in the log that flagged a gap
  rather than silently working around it is why later rounds could pick it up.

## The invariants (Architecture Part 4) — binding

Seventeen, not fourteen. Some older notes say fourteen; I14 is printed out of
order in the source, after I17, which is where the miscount came from.

| # | Rule |
|---|---|
| I1 | Nothing in Layer 2 or 3 ever requires a `classId` |
| I2 | Modules never call each other. Renderers are shared components |
| I3 | `viaProgramId` / `viaSessionId` live on activity, never in a record key |
| I4 | Nothing is ever deleted — archive, revoke, return, mark consumed |
| I5 | Units are keyed by permanent ID, never by name |
| I6 | Confirmation state is frozen when marked, never recalculated |
| I7 | Not Applicable is excluded from totals, not counted as zero |
| I8 | Curriculum content is separate from schedule |
| I9 | Nothing joins the startup path without being flagged |
| I10 | `platformAdmin` cannot be self-granted |
| I11 | Every user-visible name is language-keyed from day one |
| I12 | Roll-ups count through `ancestorIds` — counted once, never twice |
| I13 | Tenant isolation is enforced in security rules, not only in queries |
| I14 | Sessions are fetched by date range only, never as a set |
| I15 | A failed write must reach the user. Never `console.error` alone |
| I16 | Every existing `personId` is preserved unchanged at migration |
| I17 | Every document carries `schemaVersion`, `createdAt`, `updatedAt`, `createdBy` |

**I11 is the expensive one to retrofit.** Language-key every user-visible name
from the first document written. English filled, Bangla later.

**I15 is how bug B1 hid for months.** Four collections failed silently while the
app looked healthy.

---

## Load-speed contract (Architecture Part 8) — non-negotiable

| Moment | Allowed | Never |
|---|---|---|
| Startup, before first paint | Local cache only — paint immediately | Any network wait |
| Startup, after first paint | 3 reads: `userIndex`, `enrolments`, `bookmarks` | Any module's study data |
| Landing page | Card information only | Records, curriculum, sessions |
| Module registry | Bundled, refreshed in background | A blocking read |
| Records | One chunk per surah or subject | All records for a person |
| Activity | One document per week | A year at once |
| Sessions | Date range only | The full set |
| Screensaver, About, resources | On first use | At startup |

**Nothing joins the startup path without flagging it to the owner first.**

Baseline: the current app makes four failing, blocking round-trips at every
startup. Removing those alone makes the new build faster than the old.

---

## Terminology — precise, non-negotiable

| Correct | Never |
|---|---|
| **QuranRevival** = the module name | not the subject |
| **Quran** = the subject name | not the module |
| **Deen Study** | not "Islamic Studies" |
| **30 Approaches** | not "30 Ways" |

Ethics (social) and Akhlaq (personal) are **distinct** nodes. Confirmed.

---

## Approved decisions (D1–D13)

| # | Decision |
|---|---|
| D1 | **One** Firebase project — `study-monitoring`. Separate projects would give users different uids and orphan all history |
| D2 | New-generation collections are named **`tenantPeople`** and **`tenantInvites`** to avoid colliding with the live `people` / `invites`. *Deviation from Architecture naming — approved* |
| D3 | 7-digit `personId` applies to **new people only**. Legacy IDs are grandfathered forever (I16 wins). *Deviation from Architecture — approved* |
| D4 | New build uses the **modular (ESM) Firebase SDK**. The live file stays on compat 10.12.2, untouched |
| D5 | **Offline persistence on** — `persistentLocalCache` with multi-tab support |
| D6 | **No client-side delete anywhere**, from day one. Erasure, if ever needed, is an admin-side operation |
| D7 | `weekStartsOn` added to the tenant document in Phase 0, used from Phase 8 |
| D8 | **Admin self-check screen built in Phase 0 as F-008**, before other UI. It is what makes every later phase self-verifying, given the owner cannot check code |
| D9 | Two small Phase 1 lookup collections not in the original Architecture doc: **`tenantMemberUids`** (uid→role mirror, lets security rules check "does this login hold role X in tenant Y" without a query) and **`inviteTokens`** (opaque link codes, so invite links never carry a raw email in the URL). Neither is ever shown in any screen. *Approved deviation* |
| D10 | **The Study Mode handover lock (F-016) only ever engages for an explicit "hand this device to a child to study independently" action — never for a guardian/teacher's own recording.** Confirmed by the owner: teaching the same Ayah/Hadith to multiple children (and themselves) in one sitting, then logging each person's progress in turn from a dropdown, is the normal fast workflow and must never be blocked or require "ending a session." Signed-in owner/teacher picking a person from a roster/records dropdown to log something for them is not a device handover and must never touch the lock, no matter how many people are recorded in sequence. Binding on Phase 3 (records/activity) and Phase 4 (the QuranRevival module's actual study screens) when they're built. |
| D11 | **`QuranRevival_Subject_Catalogue_v3.md` approved as-is**, at the start of Phase 2 (2026-07-31): 6 top-level subject-tree nodes (Quran, Hadith, Arabic Language, Deen Study, General Study, Nature-Life), 31 studiable subjects, 30 Approaches in 7 sections, Hadith kept top-level and mandatory in its own right, Ethics/Akhlaq distinct. One resolved ambiguity: the doc tags Hadith `[QuranRevival / Deen]`, but Part 5 also states no node uses `moduleIds[]` for more than one module, and the Architecture doc's Phase 12 list names Hadith as its own fifth remaining module (alongside Arabic, General Study, Health, Nature-Life). Built as: **Hadith is its own module** (`moduleIds: ["hadith"]`), its bracket tag read as descriptive text about its role, not a literal dual-module assignment. Flagged for the owner to correct if the intent was actually a shared/dual-module node. |
| D12 | **New Phase 3 collection `domains`** (`domains/{tenantId}__{domainId}`), not in the original Architecture doc, added to back the `records.entries.domainIds[]` field the doc names but never defines a collection for. Same shape as D9 (a small supporting collection the doc's own named fields required). Tenant-authored, no platform seed, mirrors `ladders`/`levels` — matches the legacy app's free-text, user-defined "Domains" tag on subjects, promoted to a permanent-ID registry (I5) since `domainIds` is now a plural array on each record entry. *Approved-by-precedent deviation, flagged for the owner to correct if a different shape was intended.* Also Phase 3: **records chunking** ("one doc per surah/subject") is implemented as *surah* for unit types that carry their own surah number (`ayah`/`range`/`surah`/`ruku`) and *subject* for everything else (`juz`/`hizb`/`rub`/`manzil`/`page`/`hadith`/`topic`/`name` — Quran-wide divisions or non-Quran, with no single surah to group by). Re-chunking later is a data migration, not an architecture change (I5 only pins the unit key itself). And **`subjects.confirmationRequired`** (`true`/`false`/`null`) was added as a new, additive field so "confirmation can be switched on or off per subject" (Architecture s6) has somewhere to live — editable from `catalogue.html`'s existing subject edit form. |
| D13 | **Post-cutover rollout order** (confirmed 9 Aug 2026, QuranRevival v07.00): make it work for the **owner's own real use first** — before family, before external students, before the rest of the role/tenant model the Architecture doc already plans for. Then family. Then external students. Then everyone/everything else, as originally planned. **This reorders priority, not scope** — nothing here changes what gets built, only what gets fixed/polished first when something's wrong. Concretely: if the owner hits real friction using the app themselves, that outranks a family- or student-facing gap, which outranks a general multi-tenant/other-role gap, regardless of build-phase numbering. Don't re-derive this from the Architecture doc's own phase order — this is a use-rollout sequence layered on top of it, not a replacement for Phase 6–15's own scope. |
| D14 | **The owner's own account (uid `3ff4BoGFLeV6FYBoTiJkMr7sFuV2`, `smahk9@gmail.com`) holds `platformAdmin: true`**, granted directly 10 Aug 2026 (v07.08) via a one-time administrative Firestore write, not through any app-side flow. I10 ("`platformAdmin` cannot be self-granted") is about closing the S1 self-service escalation hole in the app's own code paths — it was never meant to block a legitimate one-time grant to someone who is, in every real sense, already the platform's sole administrator (Firebase project owner, GitHub repo owner, the one real tenant's owner). Concretely needed because `modules/{moduleId}` is platform-wide (Architecture Layer 1) and `firestore.rules` restricts writing it to `isPlatformAdmin()` only — the Catalogue page's new module-reorder buttons (v07.08) would 403 for the owner otherwise. *Approved by the owner, asked directly before granting.* |

---

## Legacy personId formats — four shapes, all must keep working

| Shape | Origin |
|---|---|
| `p1` … `p4` | Seeded defaults. **Browser localStorage only — not in Firestore** |
| `p` + 13-digit timestamp | Created by the app's Add Person |
| `person_` + first 8 chars of uid | Created by invite acceptance |
| `person_admin1` | Created by hand in the console |

Any new ID scheme must coexist with all four (I16, D3).

---

## Build phases

Phase 0 Foundation · 1 Identity & access · 2 Catalogue · 3 Tracking core ·
4 QuranRevival module · 5 Migration & parity · 6 Deen Study & topic renderer ·
7 Bookmarks, programs, routines · 8 Monitor & reports · 9 Homework & feedback ·
10 Classes & provider · 11 Curriculum, grades & resources · 12 Remaining
modules · 13 Full messaging & extras · 14 Operations · 15+ Reserved.

**Phase 5 is the gate.** No cutover from the old app until the parity checklist
is derived from a live audit of `index.html` and signed by the owner — not by
Claude. *(9 Aug 2026: the owner exercised this as their own call, not
Claude's — chose to cut over before the checklist was fully signed, given no
other real users existed. The rule stands as the reason a checklist exists
and gets read seriously; it wasn't overridden by Claude.)*

**Current position: Phase 0, Phase 1 (Identity & access), Phase 2
(Catalogue), Phase 3 (Tracking core), Phase 4 (QuranRevival module), and
Phase 6 (Deen Study & topic renderer) all complete and owner-verified.
Phase 7 (Bookmarks, programs, routines) round 1 is built, not yet
owner-verified** — see `PHASE-7-STATUS.md` for exactly what's in round 1
(bookmarks, Continue strip, the routine renderer, Health's real study
screen, Learn Deen On-the-Go pulled out as its own module) **and round 2**
(course offers + enrolments, Stage B1 — built after the owner confirmed
external-student use is now actually on the horizon, reversing round 1's
own deferral on purpose) **and round 3** (11 Aug 2026, v07.16 — wires
`bookmarks.resume.programId`/`activity.viaProgramId` into `topic-study.js`/
`routine-study.js` for real, closing part of the gap round 2 flagged;
QuranRevival/Asma ul Husna not wired yet at the time) **and round 4**
(12 Aug 2026, v07.19 — wires QuranRevival and Asma ul Husna too, closing
that gap for real; also surfaces that `quranrevival.html` never calls
`touchResume()` at all, a separate pre-existing gap, see
`PHASE-7-STATUS.md`).
**Phase 8
(Monitor & reports) round 1 is also built, not yet owner-verified** — see
`PHASE-8-STATUS.md`. **Phase 9 (Homework & feedback) round 1 is also
built, not yet owner-verified** — see `PHASE-9-STATUS.md`, including a
real guardian-access bug found and fixed in `firestore.rules` (already
deployed) that predates this phase, **and round 2** (11 Aug 2026, v07.18 —
closes both the Homework teacher-scoping gap round 1 itself flagged AND the
matching guardian one, via a denormalized `extraReadersPersonIds[]` field
rather than a get()-dependent read rule (v07.17's first attempt at the
teacher half had a real list-query flaw, found and fixed same-day before
ever being deployed — see that version's own CLAUDE.md paragraph);
`firestore.rules` for this round NOT yet deployed). **Phase 10 (Classes &
provider,
Stage B2) round 1 is built, `firestore.rules` deployed and partially
owner-verified 11 Aug 2026** (deployed via the Firebase Console, not the
CLI — see that phase's own paragraph above for why; version badge,
`classes.html`, and a real class + enrolment all confirmed working; the
actual teacher-scoping enforcement itself still needs a second real
`teacher`-only account to prove, since owner/prime's own login bypasses
it) **and round 2** (12 Aug 2026, v07.19 — the SUBJECT half of the same
long-parked access-control question, client-side only, no rules change;
see that round's own note on `enrolPerson()`'s dead `subjectIds[]` param)
— see `PHASE-10-STATUS.md` for the full build log, the remaining
verification checklist, and a real gap found and fixed in the same
sitting, before it ever shipped. **Phase 11 (Curriculum, grades &
resources, Stage C) round 1 is built, `firestore.rules` deployed via the
Firebase Console and owner-checked okay (11 Aug 2026)** — see
`PHASE-11-STATUS.md` for the full build log and an 8-item verification
checklist. **Phase 12 (Remaining modules) is built** — it turned out to
already be fully delivered inside Phase 6 round 2 (Arabic, Hadith, General
Study, Nature-Life) and Phase 7 round 1 (Health); only its own
`feature-registry.js` status flag was stale, corrected 11 Aug 2026 — no
new code was needed. **Phase 13 (Full messaging & extras) round 1 is
built** — Asma ul Husna (99-Name study module + owner-supplied poster
screensaver) and `about.html` reading the feature registry; messaging
itself (threads, per-person inbox) is deliberately deferred to a later
round, pending a real second `teacher`-only account to verify its
safeguarding rules against — see `PHASE-13-STATUS.md`. See also
`PHASE-0-STATUS.md`, `PHASE-1-STATUS.md`, `PHASE-2-STATUS.md`,
`PHASE-3-STATUS.md`, `PHASE-4-STATUS.md`, and `PHASE-6-STATUS.md`. Phase 5
(Migration & parity) is separately covered below — cutover already
happened; two small follow-up items remain open, not gating anything.

**Phase 8 (Monitor & reports) — built 10 Aug 2026 (v07.09), round 1, not yet
owner-verified.** Scope, confirmed with the owner before building: **one
universal report**, not Quran-only — reads from `records` + `activity`,
which are already the same shape for every module (ayah, topic, or
routine), so it reports on whatever's actually been claimed/logged
regardless of how built-out any given module is. New page `monitor.html` +
new `js/monitor.js` for the aggregation (plus one small additive read added
to `records.js`, `listAllRecordsForPerson`), weekly and monthly views,
per-student and per-subject summaries, CSV export, print — the same shapes
the *old* app's own Monitor module had (`exportWeekCSV`/`exportMonthCSV`/
`doPrint` in `index.html`, read directly to confirm this scope before
building it). Scoped to whoever can already see this data today (owner/
prime/teacher/guardian/self per existing rules) — no new permission model.
**Quran gets one extra section on top**: the 30-Approach status breakdown
for one student at a time (reusing `summarizeStatuses`, already built) —
richer because Quran has real structured trackable data nothing else does
yet. Read-only throughout; no schema or security-rule changes made. See
`PHASE-8-STATUS.md` for the full build log and what's flagged for the
owner to weigh in on.

**Cutover happened 9 August 2026 — QuranRevival v07.00.**
`https://madrasatul-muslimeen.github.io/` now redirects into the new app
(`/app/index.html`); the old app is archived, not deleted, at
`/legacy/index.html`. The owner made an explicit, informed call to cut over
before B5 and a real signed-in click-through of rounds 12–14 were resolved
— both are now post-cutover follow-up, tracked in
`PHASE-5-PARITY-CHECKLIST.md`, not blockers. Migration itself was closed
earlier (the owner decided the old app's data is all demo data, not worth
preserving). **We are now in real-use iteration, not pre-cutover build
mode — see D13 for whose real use gets priority (owner, then family, then
external students, then everyone else).** This paragraph was stale for six
rounds before a 9 Aug note — **check `PHASE-5-STATUS.md` first, every
session, for what's actually current**; don't rely on this file's own
"current position" line alone.

**Retired 25 Aug 2026 (v07.78) — there is only one repo now, this one; see
that version's own entry above.** The paragraph below describes how
deployment worked from the 9 Aug cutover until then, kept as the
historical record rather than rewritten out from under itself.

**Post-cutover deployment shape (9 Aug 2026), replacing the old beta-mirror
setup**: `madrasatul-muslimeen.github.io` is the real production site.
`https://madrasatul-muslimeen.github.io/app/…` is the live app — any fix
to this repo's `app/` has to also ship there (that path used to be
`/beta/app/`; the cutover promoted it to `/app/` directly, so **don't ship
to a `/beta/app/` path anymore — it no longer exists on that repo**).
`/beta/` itself is free again for the *next* phase's testing cycle, same
pattern this project used throughout Phase 5 — check what, if anything,
currently lives there before assuming it's empty. The old app lives on,
untouched, at `https://madrasatul-muslimeen.github.io/legacy/index.html` —
**by direct URL only; no button or link exists in either app pointing to
the other** (asked and confirmed 9 Aug 2026 — this was a deliberate
minimal-risk choice at cutover, not an oversight left unfinished. Add one
only if the owner actually asks for it).
Same GitHub access that reaches this repo also reaches
`madrasatul-muslimeen.github.io` (confirmed 9 Aug 2026). **Push there every
time, without asking — the owner made this standing on 17 Aug 2026
(v07.48), in their own words: "Push it always, don't need permission."**
This supersedes the old "it's a live public site, so ask first" rule that
this file carried from the cutover until then, and it is now the same tier
as the routine git operations below: finish a chunk of work, merge the PR
on the dev repo, mirror it, done. The owner's reasoning is the obvious one
— they test against the live site, so work that stops at `main` has, from
their side, not shipped. **Diff the whole of `app/` before copying**
(`diff -rq app /workspace/madrasatul-muslimeen.github.io/app`) rather than
copying only the files you think you touched: that is what proves the
mirror had no unrelated drift, and it has caught a stale mirror before.

**Retired 25 Aug 2026 (v07.78) — folded into this one repo; see that
version's own entry above.** The paragraph below is the historical record
of how the dev-repo/mirror-repo split worked before then.

**On the CLI (this tool), "the local repo" and "the GitHub repo" are the
same repo — there is no other way to edit code with it.** The CLI always
works on a local checkout; that's the tool, not a choice made per session.
What went wrong once (10 Aug 2026) was a *process* gap, not a *tool* one:
commits were made locally but never pushed, so GitHub sat 7 commits stale
for a full session until the owner noticed. Fixed going forward — push to
`origin/main` is now the automatic last step after every commit here, same
tier as add/commit, no different from the production-mirror push above
except this one never needs asking first (see
[[feedback_push_dev_repo_to_origin]]). Practical effect: GitHub is
essentially always current within moments of any change, so anyone
watching the repo (owner on a tablet, a Claude Code *Web* session, anyone
else) sees real state. **A genuinely GitHub-only, no-local-checkout
workflow means Claude Code on the web (claude.ai/code) instead of this
CLI** — a different product entry point, browser-based, each session
gets its own working branch merged via PR. Confirmed working on a tablet
browser for *monitoring* (GitHub.com's own UI and the deployed site at
`madrasatul-muslimeen.github.io` are both standard responsive web — no
different from any other site on a tablet); *driving* a session from a
tablet via Claude Code on the web hasn't been tested by anyone on this
project and shouldn't be assumed smooth without trying it first.

**`PHASE-5-PARITY-CHECKLIST.md` is the actual cutover-gate document** —
built 9 Aug 2026, consolidating all 14 rounds into the single sign-off
CLAUDE.md's own "Phase 5 is the gate" rule requires. Read that file, not
`PHASE-5-STATUS.md`'s full round-by-round history, for "are we ready to
cut over" — `PHASE-5-STATUS.md` stays the detailed log underneath it.

**Note for future sessions on this owner's test setup:** the owner's actual
click-through machine is a non-persistent office VDI with no admin rights
and no Node/Python normally available — `git clone` targets and installed
software don't survive between logins. If local testing is needed again,
use Node's portable ZIP distribution (no install/admin needed — see
`PHASE-4-STATUS.md` round 4 for the exact steps), not the `.msi` installer.

**Open design question, raised during Phase 3 verification, not yet
resolved:** claiming/confirming only works for the Quran subject today,
because Approaches (`trackables`) only exist for Quran — every other
subject (Deen Study, Arabic, General Study, Hadith, Nature-Life, Health)
has no defined "what does progress look like here" system at all. This
predates this rebuild; it is not a Phase 3 defect. It doesn't block Phase 4
(QuranRevival module — Quran-only by definition), but likely needs a design
conversation, possibly back at the architecture stage, before Phase 6
(Deen Study & topic renderer) can be planned. See `PHASE-3-STATUS.md`.

**Owner's decision on this, round 6 of Phase 5 (see `PHASE-5-STATUS.md`):**
needs a long discussion and real resourcing, and should wait until every
other phase that doesn't depend on it is finished first. **Do not raise this
proactively again each session** — it's on record here once; leave it alone
until the owner reopens it themselves.

**Second open access-control question, raised by the owner 2026-07-31 —
the STUDENT half resolved 11 Aug 2026 (Phase 10 round 1, v07.12), the
SUBJECT half still open.** The owner's original scenario: a guardian (in a
Family/Individual tenant, not a Tuition Provider) wants to bring in an
outside teacher for a few subjects only — that teacher should record/
confirm progress **only for the specific children they teach** (now real
and enforced) **and only on the subjects they're actually assigned to
teach** (still not enforced). Phase 10 was asked directly, before
building, whether the new class-scoped teacher-assignment mechanism should
sit alongside today's blanket tenant-wide access or replace it — the owner
chose replace. `canRecordFor()`/`tenantPeople` roster reads now require
`isCoEnrolledTeacherOf()`, driven by `enrollments` + the new
`teacherStudentLinks` mirror. Crucially, this works through **either** a
`classes.html` class **or** a `course-offers.html` course offer — I1
("nothing in Layer 2/3 ever requires a `classId`") already meant a
Family/Individual tenant could use a course offer as the lightweight
enrolment vehicle without needing a full "class" concept, so the owner's
original scenario doesn't need its own separate primitive after all — a
course offer with one teacher and one child enrolled is exactly that.
**What's still open:** the rule scopes by STUDENT only, not by subject — a
co-enrolled teacher currently gets full record/confirm authority over that
student across every subject, not just the ones listed on their
enrolment's own `subjectIds[]`. Same "Firestore rules can't safely inspect
one key of an arbitrarily-keyed map" limitation this codebase already
accepts elsewhere (subjects/trackables/records entries) — enforcing it for
real needs client-side filtering in the study screens/records.js keyed off
`subjectIds`, not attempted this round. See `PHASE-10-STATUS.md`.

**Parked, owner-approved 13 Aug 2026 (shell round 9/10): make the Mastery
Wheel itself reflect the selected Study Unit.** Surfaced while removing the
duplicated "Tracking:" line from the dock. Today `renderWheel()` is
hardcoded to the CURRENT AYAH on both axes — its segments come from
`approachStatusesForCurrentAyah()` (which builds `buildUnitKey.ayah(...)`
directly) and its centre disc from a literal `SURAH n · AYAH n`. So when
the Study Unit is Range, Whole Surah, Ruku', Juz or Page, the wheel keeps
showing the single ayah while "Track this unit" claims against something
else entirely. v07.26 handled this by keeping the dock's Tracking line
alive for exactly those five units (hidden only for `ayah`), which is a
correct stopgap, not the fix. The owner asked for the real thing "later",
explicitly deferring it — **do not build it unprompted, but do not lose
it either.** The shape of the fix, worked out at the time: drive the wheel
off `currentUnitInfo().unitKey` instead of the hardcoded ayah key, and
label the centre from `currentUnitInfo().label`. **Three of the five are
free** — range/surah/ruku already chunk to `surah_${n}`, which
`refreshChunkAndWheel()` has loaded anyway — **but juz and page chunk to
`subject_quran`**, a different document, so those two need a second
records read. That lands on the landing page's own startup path, so it is
an I9 / load-speed-contract conversation (Architecture Part 8: "Landing
page — card information only"), not just a rendering change. Also
undecided: what the centre's Arabic text should be when a unit spans many
ayahs (today it is that one ayah's `uthmaniText`). **Owner's steer, 13 Aug 2026: that
last part is not one decision but six — treat the centre as configurable
per unit type, deciding for EACH of `ayah` / `range` / `surah` / `ruku` /
`juz` / `page` separately what it should show and how it should be
written.** So the fix is a small per-unit table (what Arabic, if any; what
reference text), not one global rule bolted onto `renderWheel()`. Ask the
owner for their six answers when the round is actually picked up — do not
infer them.

**Done in v07.28 (shell round 11): organise the inside of
`#panelStudyOptions`.** This was CLAUDE.md's own "next round already
agreed" item from v07.24 onwards; it is built, to the owner's drawn
three-bar mockup. See v07.28's paragraph above. What it left behind, all
of it the owner's own explicit deferral rather than anything discovered
mid-build:

- ~~**One global language preference, read by every module.**~~ **BUILT in
  v07.30 (shell round 13)** — see that version's own paragraph above. Both
  decisions this item said had to be put to the owner were put to them and
  answered (localStorage now with a Firestore sync later; and two settings,
  not one). What it left open is `LAYOUT-BACKLOG.md` item 6: the app's own
  chrome (nav labels, page headings, buttons) is still hardcoded English.
- **Choosing a translation by the translator's name.** Asked for, and
  explicitly parked by the owner in the same message ("that build we can do
  later ... we now concentrate on organising the layout only"). The
  Reading view card carries a DISABLED `#translationChoiceSelect` and a
  plain note so the place it will live is visible and honest. The data
  question comes first: `tools/quran-data-pull` currently packages one
  English and one Bangla translation per ayah, so more translators means
  re-pulling and re-packaging the surah files, not just a picker.
- **The banner-admin block is still the one unrelated thing in the panel.**
  It sits between the summary strip and `<h2>Study</h2>` only because shell
  round 5 moved it off the landing page to save height. Not worth its own
  round; worth remembering if a real Settings surface ever lands.
