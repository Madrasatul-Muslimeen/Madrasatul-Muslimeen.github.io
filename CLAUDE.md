# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.


**Current milestone: QuranRevival v07.134.** The app has been live and real,
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
probably follow. **(Done the same day, in v07.131 below, on the owner's own
"Do the same for QCR".)**


v07.131 (5 Sep 2026, same day) is **the owner's own "Do the same for QCR" --
the second half of v07.130, applied to the screen it deliberately left alone.**
That round flagged QCR as carrying the identical two-tap complaint one screen
over and said it should probably follow; the owner said so directly, so it
follows.

**The change is the same change, and saying that plainly is the point: this is
not a second design.** `qcrManageOn`, a session-only `let` behind its own
Manage button, becomes `qcrCanManage()` -- a function returning
`canAdminCatalogueClientSide()`, mirroring `asmaXCanManage()` line for line.
The button is deleted from the palette markup, its `getElementById` lookup and
its click handler go with it, and everything it used to gate now shows on the
one condition that was ever meaningful: **✎ 🗄 + and "Show archived" in the ⋯
palette, each āyah's own "Move to…" select and its × Remove, and the "+ Add
āyah" form.** One tap on ⋯ and the controls are there. Nothing else about QCR
moved -- no ids, no handlers, no layout.

**A reader who cannot manage is unchanged from v07.128's own rule, which is the
half worth not breaking**: the ⋯ button is never hidden, the palette opens, and
it carries the note saying why management is off (naming the previewed role
where a "View as" preview is the cause). So the palette still opens and
explains itself rather than opening blank -- proven by COMPUTED display, not by
the `hidden` property.

**`.qcr-manage-toggle` is retired outright.** With both bars' Manage buttons
gone, nothing carries that class, so its four rules are deleted rather than
left as dead weight -- the same treatment v07.29 gave the banner-edit block's
own orphaned rules. **The `"Manage"` STRING stays in `bn.js`, unused**, per this
project's own standing rule for a string that stops being called; the coverage
total falling by exactly one is that string leaving the extracted set, and it
was confirmed by grepping for `t("Manage")` rather than inferred from the
number.

**Verified with a focused, un-checked-in Playwright script -- 32 checks, all
passing**, and screenshotted rather than trusted from the assertions: the
Manage button proven gone from the page entirely at 320/390/768/1280px; the QCR
bar proven to still hold ONE line with no page overflow at each of those widths
(the 36px/40px buttons v07.130 introduced were already costed there, and this
round re-measures rather than assuming); one tap on ⋯ proven to reveal all
three actions as a single row of 40px buttons, with the palette proven inside
the viewport; each āyah's own Move-to/Remove row and the "+ Add āyah" form
proven present **with no Manage tap anywhere in the journey**; a reader
previewing as Guardian proven to get the ⋯ button still drawn, the actions
really hidden by computed display, the explanatory note in words, and no
Move-to rows or add form; **Asma proven untouched** by this round (still no
Manage, still five actions); and QCR's own action labels proven Bangla in
Bangla. **One test bug of its own was found and fixed rather than worked
around:** the non-admin check asked for `#qcrPaletteWrap`, an id that does not
exist -- the wrap is addressed by its `data-bar-palette-wrap` attribute, like
every other bar palette. The app was right and the check was wrong.

**`behaviour.mjs`: 800 checks pass, 3 fail** -- the three are section 22g, the
environmental archive.org poster block this project has recorded since v07.44,
and the run stops at the same pre-existing line-4084 crash carried since
v07.69. Same 803 total as every recent run, and no checked-in check needed
updating: QCR's Explore bar sits past that crash point and has never had
checked-in coverage.

**`layout.mjs`: every measured landing-page metric byte-for-byte identical** to
`HEAD` at all eight viewports in both banner states (heading 148/103px, wheel
377/399/280/220/320/360px, Approach rows, 9px dock gap, no overflow);
`getElementById` targets 234 -> 233, exactly the retired `qcrManageToggleBtn`
lookup, and the "missing" list is the same 22 as `HEAD`. **`reading.mjs`
READING SCREEN OK**, **`panel.mjs` byte-identical** (this round never touches
the Study options panel), **`navcheck.mjs` unchanged** (still only the
pre-existing 320px English truncation of "Operation"/"Bookmark"). **Coverage
1,560 -> 1,559 scanned, 47 missing UNCHANGED** -- only `quran` moves, 331 ->
330, the one retired string. **`tools/perf/measure.mjs` identical** (Quran
Study 6 sequential round trips / 9 calls) and **`new-tenant.mjs` 10/10** -- I9
untouched, as expected for markup and a state variable becoming a function. No
`firestore.rules`, schema or Firestore data changes.

**What this closes:** both Explore bars now work the same way, and the
"Flagged, not changed" note v07.130 left against QCR is resolved rather than
carried. Manage mode no longer exists anywhere in this app.


v07.132 (5 Sep 2026, same day) is **the owner's own "Enable attaching to Dual
Name as well in Asma in Note, Read, In Explore."** -- and the useful part of
the round is that measuring first changed what the fix had to be.

**A Dual Name was ALREADY in the attach list, and that is not the same as
being attachable.** Measured before touching anything, from the Note view with
a Dual Name freshly made: the list held **133 rows and the Dual Name was row
133 of 133**, at the bottom of a flat scroller, carrying **nothing that said it
was a Dual Name**, with no way to narrow to one and only a "+ Create a new
Name" button beside it. That follows from v07.130's own model -- a Dual Name is
a real Name filed into a `kind: "dual"` collection -- so nothing was broken;
what was missing is everything that makes a thing findable. **The same
distinction v07.129 recorded (unreachable is not broken) with a different
answer: there the fix was removing a gate, here it is giving the list a way to
be read.**

**Three things, and because this is ONE shared popover they reach all three
places the owner named at once** -- the Note drawer's own 🔗 tile, the Read
bar's 🔗, and Explore's (both the ⋯ palette's 🔗 and a Name's own). Proven at
each of the four entry points rather than assumed from the fact that they share
code.

**(1) A Show picker -- All / Names / Dual Names.** Choosing Dual Names takes the
list from 133 rows to just the Dual ones. **A Name already TICKED is never
filtered away**, whichever slice is showing: narrowing would otherwise silently
drop what the reader had already chosen and Save would write less than the list
had led them to expect. Reset to "All" on every open, like the filter box beside
it -- it narrows a search, it is not a preference.

**(2) A DUAL chip on the row**, so a Dual Name is identifiable even in "All".
The chip says only "Dual" and is `flex-shrink: 0` + `nowrap`; **the dual list's
own title rides in the row's `title` rather than on screen**, because a long
collection name in a narrow row is exactly this project's most-repeated layout
trap, and a one-word tag ellipsised to nothing would leave the row simply lying
about what it is.

**(3) "+ Create a new Dual Name"**, beside the existing create button as an
equal pair (a two-column grid that stacks below 460px -- never two widths left
to wrap, v07.129's own lesson). It **must** carry a destination
(`fileInto: {kind:"dual"}`, v07.129's file-under row) where the plain create
button deliberately still does not: a Name in no Dual Names list is not a Dual
Name, so a create with nowhere to file it would make something the reader could
never find again under that heading. With no dual list yet, the narrowed list
says so and points at that button rather than reading as empty.

**Two things the round got wrong first, both caught by measuring, and both
worth recording because they are the same two mistakes in opposite directions.**

**A check was wrong and the app was right.** The first fit probe reported the
Show picker cut -- 109px box against 116px needed -- so a `min-width:
max-content` went in "to fix" it. It changed nothing, which is the tell: the
probe had cloned the select **without carrying its computed font, padding and
border**, so it was measuring a bigger control than the real one. Measured
honestly, "Dual Names" needs exactly the 109px it has, with `scrollWidth ===
clientWidth`. The rule is KEPT -- it pins the column to the longest option, so a
longer word in a future translation widens the field instead of being cut --
but **its comment now says it is a guard rather than a fix for something
observed**, because a false rationale left in the code is worse than no comment
at all. That is the third wrong assertion this session; the standing lesson
holds.

**And the coverage report was right where I was sloppy.** Missing went 47 → 48,
and the instinct ("the number has been wrong nine times") was the wrong one
here: the extra was **`"Show"`, hardcoded as `aria-label="Show"` in the new
picker's markup**. A screen reader's only name for a control is user-visible
text and gets translated like any other. Set from `t("Show")` when the popover
opens, and translated. **Back to 47 missing**, the baseline. The rule survives
intact -- the number is never *evidence* -- but it is still a to-do list worth
reading, and this time it found a real gap the rendered page would not have
shown to a sighted reader at all.

**Verified with a focused, un-checked-in Playwright script -- 26 checks, all
passing** -- and screenshotted: the popover proven to carry the picker, both
create buttons and a DUAL chip **from all four entry points** (Note, Read,
Explore's palette, a Name's own); the picker proven to offer All/Names/Dual
Names; Dual Names proven to narrow 133 rows to 1, Names proven to exclude it,
and the row's own tooltip proven to name its list; **a ticked Name proven to
survive narrowing**; the filter box proven to still work alongside; the āyah
proven already the reference text; attaching to a Dual Name proven to write to
`asmaCollections` for real, with that Dual Name's own card then proven on
screen carrying the āyah; the empty-state hint proven to appear and point at
the button; "+ Create a new Dual Name" proven to open the Dual form with the
āyah prefilled and a file-under row; a reader who cannot manage proven offered
neither; and all of it in Bangla -- picker options, button, chip, **the
picker's own screen-reader name**, and the empty-state hint read off a really
rendered page, with the option VALUES proven still plain ids. **Measured at
320/390/768/1280px in both languages: the create pair equal-width and one line
from 460px up, the picker and filter on one line, nothing truncated, no
overflow, the card always on screen.** One reported page error was chased to
its host rather than waved away: `raw.githubusercontent.com` resetting -- the
Bangla reciter timing map v07.39 warms when the Read screen opens, the
intermittent environmental block this project already records, and the check
now separates app errors from outside-host network failures instead of
failing on both.

**`behaviour.mjs`: 800 checks pass, 3 fail** -- section 22g, the environmental
archive.org poster block recorded since v07.44 -- stopping at the same
pre-existing line-4084 crash carried since v07.69. Same 803 total.
**`layout.mjs`: every measured landing-page metric byte-for-byte identical** to
`HEAD` at all eight viewports in both banner states; `getElementById` targets
233 → 235, exactly this round's two new lookups, and the "missing" list is the
same 22 as `HEAD` -- neither new id joins it, since both live in markup that
always exists. **`reading.mjs` READING SCREEN OK**, **`panel.mjs`
byte-identical**, **`navcheck.mjs` unchanged**. **Coverage 1,559 → 1,563
scanned, 47 missing UNCHANGED** once the `aria-label` above was fixed -- only
`quran` moves, 330 → 334, all four new strings translated.
**`tools/perf/measure.mjs` identical** (Quran Study 6 sequential round trips)
and **`new-tenant.mjs` 10/10**. No `firestore.rules`, schema or Firestore data
changes.

**Flagged, not changed:** "+ Create a new Name" still files nowhere when it is
used from the Note or Read view (there is no current group there), so a plain
Name made that way is reachable only through the flat Names list. That is
pre-existing, it is not what was asked, and the fix is the same file-under row
the dual button already uses -- say the word and it is one line.


v07.133 (5 Sep 2026, same day) is **the owner's own ask for a second reading of
a Juz in Explore: "As clicking on Juzz 30 brings page wheel, may be enable a
toggle view to move to Surah views (36 slides for Juzz 30) ... so user can see
the pages belong to a buzz as well as Surat belong to a juzz in the wheel."**

**Half the ask was already true, and that decided how small this round is.**
Their second sentence -- clicking a Surah slide should bring its ayahs -- is
the Surah level Explore has had since Phase 5. So a Surah segment did not need
a new destination; it needed to exist. **Both readings of a Juz land on exactly
the same place when clicked** (`exploreLevel = "surah"`), which is why nothing
below the Juz level learned a second route in.

**Nothing was fetched or derived to know which surahs a Juz holds --
`ayahCoverage()` already said it exactly**, and `poolCoverageStatus()` has been
calling it to COLOUR the Juz segments since Phase 5. The Surahs view is the
same call kept per-surah instead of pooled, so the list and the colour of the
Juz it came from can never disagree. **Measured, not assumed: Juz 30 is 37
surahs (78 An-Naba .. 114 An-Naas), not the 36 the owner quoted** -- said
plainly rather than shipped quietly.

**The one real design question was a surah only PARTLY in the Juz, and its two
halves are answered differently on purpose.** Juz 1 holds Al-Faatiha whole and
Al-Baqara 1-141. The segment's **colour pools only the ayahs really in this
Juz**; the **click opens the WHOLE surah**, which is what the Surah level has
always meant and what the page view's own click already did. Both are on
screen rather than guessed: the row reads "Al-Baqara ১–১৪১", the tooltip
"(ayahs ১–১৪১ in this Juz)".

**The switch is remembered, which is the standing lesson applied.**
`openExplore()` resets the drill-down POSITION on every open; which READING of
a Juz you want is a habit, not a position, so it is a `prefs.js` localStorage
pair (`mm_explore_juz_view`) of the same additive shape every reading
preference since round 18 has used -- **no new startup read, no collection, no
`firestore.rules` change (I9 untouched)**, re-measured to prove it. Shown at
the Juz level ONLY, the one level where the same scope splits two ways. Pages
stays the default, so a reader who never touches it sees v07.132 exactly.

**Two things caught by measuring, in a round that could have skipped it.** The
new control got v07.129's full treatment: at 320/360/390/412/768/1280/1920px in
both languages it is **36px on ONE line**, nothing truncated, no overflow --
and that sweep, not any assertion, showed the partial-surah row reading
**"আল-বাকারা 1–141": Latin digits in a Bangla label**, where every other number
drawn in a sentence here goes through `num()`. Fixed, with its own check. The
`[hidden]` trap was headed off rather than hit -- `#exploreJuzViewToggle` sets
`display: flex`, so it carries the explicit `#id[hidden]` override, and the
test reads **computed display**.

**One real pre-existing defect, found by reading a rendered Bangla page and
fixed with it:** Explore's hint printed **"&mdash;" and "&rarr;" as literal
text in Bangla** -- `translateStatic()` swaps a TEXT NODE, so an HTML entity
written into a `bn.js` VALUE is never decoded, while the English side is real
markup and decodes. Real characters now. **The general rule, worth keeping:
never write an HTML entity into a translation value; the English key decodes
and the Bangla value does not.**

**Verified with a focused, un-checked-in Playwright script -- 33 checks, all
passing** -- plus a separate 14-point layout sweep, screenshotted and read: the
switch absent at the Quran level and present at the Juz level by computed
display; both buttons >=36px; Pages still the default and still showing pages
582-604; Surahs showing all 37 surahs named rather than numbered; a Surah click
opening that surah's own four ayahs (Al-Ikhlaas); the switch put away below the
Juz level and still Surahs on the way back up; Juz 1's partial surah naming its
ayahs in row and tooltip and still opening WHOLE (Al-Baqara's Ruku' groups);
the choice stored, surviving a reload and switchable back; and all of it in
Bangla with the stored values proven still plain ids. **Two test bugs of its
own were found and fixed rather than worked around:** it asserted
"An-Nas"/"Al-Ikhlas" where the data says "An-Naas"/"Al-Ikhlaas" (the app was
right), and it read the wheel straight after the breadcrumb changed -- but
`renderExploreSurahLevel()` `await`s `getSurah()`, so the crumb is rewritten a
tick BEFORE the wheel, and the check was measuring the Juz wheel it had left.

**`behaviour.mjs`: 802 pass, 1 fail** -- section 22g/h, the environmental
archive.org block recorded since v07.44 -- stopping at the same pre-existing
line-4084 crash carried since v07.69. Same 803 total. **`layout.mjs`: every
measured landing-page metric byte-for-byte identical** to `HEAD` at all eight
viewports in both banner states; `getElementById` targets 235 -> 238, exactly
this round's three new lookups, and the "missing" list is **the same 22 as
`HEAD`, checked through an identical scan rather than assumed**. **`reading.mjs`
OK**, **`panel.mjs` no truncation and no wrapped bar**, **`navcheck.mjs`
unchanged**. **Coverage 1,563 -> 1,565 scanned, 47 missing UNCHANGED**, compared
against a clean `HEAD` worktree: only `quran` moves, 334 -> 336, both new
strings translated. **`tools/perf/measure.mjs` identical** (Quran Study 6
sequential round trips / 9 calls) and **`new-tenant.mjs` 10/10**. No
`firestore.rules`, schema or Firestore data changes.

**Flagged, not changed:** the hint under the wheel still reads "Quran → Juz →
Surah → Ruku'" and has never mentioned Pages -- already inaccurate for the
default view before this round, now accurate for exactly one of the two.
Rewording it is an English-copy decision and a new translation key, so it is
raised rather than decided here.


v07.134 (5 Sep 2026, same day) is **the owner's own "there's no approach
selector there to check the status of an approach across the wheel (entire
Quran) ... place the approach selector over the wheel ... place it like a
capsule."**

**"Unreachable, not broken" for the third time in this file.** Explore's Quran
wheel has ALWAYS coloured itself for exactly one Approach -- it reads
`currentTrackable()`, pools every ayah of each Juz against it, and prints its
name in the hub. The function was there and correct; what was missing was a
way to say WHICH from inside Explore, since the only picker was Study options
bar 4, behind a different dock tab. Measured before touching anything, so this
round adds a control, not a mechanism.

**One control, deliberately not a new idea.** `#exploreApproachSelect` is a
MIRROR of the canonical picker -- the fifth reader of `currentTrackableId`
alongside Study options, the Ayah Note screen, QCR's bar and the landing wheel.
It writes through the same `changeCurrentTrackable()` and takes its options
from the same `buildTrackableOptionsHtml()`, so one source of truth for what is
offered and one for what is chosen; picking here moves the landing wheel and
Study options exactly as picking there moves this. That function gained one
branch, beside the QCR branch it was modelled on.

**"Like a capsule" already had an answer in this app, and using it was the
point.** `.wheel-intro-capsule` -- the gold pill above the landing wheel -- was
added on this owner's own ask, 4 Sep 2026, in this exact slot. So Explore's
picker is that same pill rather than a second one invented for the same job:
same gradient, same 999px radius, same weight. The difference is that this one
is a CONTROL -- the `<select>` is stripped of its native chrome, wears the
pill, and carries a caret. The whole pill is the tap target at **36px**. It
shows at EVERY Explore level, since Juz/Surah/Ruku' colours all mean the same
Approach.

**Two decisions that went the other way from this project's usual instinct.**
The hub's own `centerSub` -- the Approach name inside the wheel -- is **KEPT**
even though the capsule says the same thing 40px above it. That looks like the
duplication v07.52 and shell round 22 removed, and it nearly went for the same
reason. It stays because the wheel is resizable and `#exploreScroll` scrolls:
on a tall wheel the capsule can scroll off the top while the wheel is still on
screen, and then the hub label is the only thing naming the Approach. One is
the control; the other travels with the thing it labels. And the capsule was
NOT given its own remembered state -- the Approach is already shared app-wide
state, and a second memory of it is how two pickers start disagreeing.

**The round's real testing lesson is that the harness had to be fixed before
the feature could be proved.** The stub's tenant has no progress worth pooling,
so the whole-Quran wheel is not_started for EVERY Approach -- a naive "did the
colours change?" check passes or fails for reasons unrelated to the feature.
`poolCoverageStatus()` is weakest-link, so a Juz only leaves not_started when
EVERY ayah in it is claimed (148 for Juz 1). The test seeds Juz 1 as really
mastered for `memorise` alone, via v07.76's `extraSeedJs` hook, and then proves
**Juz 1 green for that Approach while the other 29 are not, switching Approach
really re-colouring the whole-Quran wheel, and Juz 1 specifically ceasing to
read mastered** -- the owner's feature proven by colour, not by a dropdown's
own value.

**Verified: a focused, un-checked-in Playwright script, 23 checks, all
passing** -- the capsule a real 999px pill, >=36px, above the wheel, offering
the canonical list and opening on the Approach really in force; the canonical
picker moving with it AND it moving with the canonical picker; the hub naming
the new Approach; present at the Juz and Surah levels; and all of it in Bangla
including its **screen-reader name**, read off the rendered page (v07.132's
lesson), with option VALUES proven still plain ids. **Measured, because a NEW
control is a layout change:** at 320-1920px in both languages the capsule is
**258x36 in English, 169x36 in Bangla**, always on screen, always above the
wheel, nothing clipped, no overflow -- **NO PROBLEMS** across all fourteen
rows, with v07.133's Pages/Surahs switch still one line beside it, and that
round's own 33-check script re-run unchanged and still green. **One test bug of
its own was found and fixed rather than worked around:** both scripts opened
Explore by reading `aria-expanded` on `#tabExploreBtn`, but Explore is a STAGE
VIEW carrying `aria-pressed` -- so "open it only if closed" always clicked,
which TOGGLES it shut when it was already open. v07.128's own recorded trap,
hit by a test rather than the app.

**`layout.mjs`: every measured landing-page metric byte-for-byte identical** to
`HEAD` at all eight viewports in both banner states; `getElementById` 238 ->
239, exactly the one new lookup, missing list the same 22 as `HEAD`.
**Coverage 1,565 / 47 missing -- UNCHANGED, and that is the right answer, not a
miss:** this round adds no new strings, because "Approach" and "Choose an
Approach" were already in `bn.js`, translated. No `firestore.rules`, schema or
Firestore data changes, and no new Firestore read -- switching Approach
re-pools `exploreChunksBySurah`, already in memory from `openExplore()` (I9
untouched).

**Flagged, not changed -- and cheaper than it looks.** Explore's breadcrumb and
sidebar labels are hardcoded English even in Bangla ("Whole Quran", "Juz 1",
"Page 582"), visible in this round's own Bangla screenshot beside a fully
Bangla capsule. **The translations already exist and are simply never called**
-- `"Whole Quran"`, `"Juz {juz}"`, `"Page {page}"`, `"Surah {surah}"` are all
in `bn.js` today. The fix is wrapping six or seven template literals in `t()`
with `num()` on the number, not a translation job. Out of scope here, and it
would have broken the English assertions in both focused scripts.


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
- **The coverage number is never evidence, but it IS a to-do list worth
  reading.** v07.132's own extra "missing" was real: an `aria-label="Show"`
  hardcoded in English on a new picker. A screen reader's only name for a
  control is user-visible text and gets translated like any other -- and a
  rendered page would never have shown that gap to a sighted reader. So
  neither trust the number nor dismiss it: read what it names, then check the
  rendered page.
- **The translation coverage number is a to-do list, never evidence.** It has
  been wrong about what it counts **nine separate times** — over- and
  under-counting both. Only reading a really-rendered page proves a screen is
  translated. Check Bangla by opening the page in Bangla.
- **Never write an HTML entity into a translation VALUE.** `translateStatic()`
  swaps a text NODE, so `&mdash;` in a `bn.js` value is printed literally
  while the English side -- real markup -- decodes to an em dash. Explore's own
  hint read "কুরআন &rarr; জুয" to every Bangla reader from the translation
  phases until v07.133 found it by LOOKING at the rendered page; no report
  could have. Use the real character on both sides.
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
  asked again, then forgot the answer on every load. v07.130 deleted it and
  v07.131 did the same for QCR, so **"Manage mode" no longer exists anywhere
  in this app**: being able to manage IS the condition
  (`asmaXCanManage()`/`qcrCanManage()`, both just
  `canAdminCatalogueClientSide()`). If a gate is a capability, make it a
  function of the capability, not a piece of state someone has to re-set. What
  must survive the deletion is v07.128's rule: the ⋯ button is still never
  hidden from a non-admin, and the palette still says in words why management
  is off rather than opening blank.
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

- **A measurement probe must carry the real element's computed style.**
  v07.132 cloned a `<select>` to size its longest option but left the clone
  with page-default font and padding -- it reported a truncation that did not
  exist, and a CSS "fix" that changed nothing was the tell. Copy `font`,
  `padding`, `border` and `box-sizing` from `getComputedStyle` onto any probe,
  or it is measuring a different control.
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
