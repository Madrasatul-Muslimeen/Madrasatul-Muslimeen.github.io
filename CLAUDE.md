# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.


**Current milestone: QuranRevival v07.126.** The app has been live and real,
not a beta, since the 9 August 2026 cutover (v07.00) — we are in real-use
iteration, driven by what the owner hits using it. See "Post-cutover rollout
order" (D13) below for whose real use comes first.

**The full round-by-round build log lives in `CHANGELOG.md`** — every version
from v07.01 onward, with what each round measured, decided and deliberately
left undone. **Read it only when you need the background of one specific
feature.** The five most recent rounds are kept below, because recent context
is usually what a new round actually needs; everything older is one file away.
The lessons those rounds taught that still bind are in "Standing lessons"
below, not left buried in the history.

**Check this milestone's version number every session** — it is updated by hand
alongside `app/js/version.js` (first two digits = big overhaul, last two = each
new feature) and will drift if a round forgets to bump it here too.

### The five most recent rounds

v07.122 (3 Sep 2026, on Claude Code on the web) is **shell round -- the
Asma ul Husna wheel's own text gets a real, user-adjustable resize
control, for both the Names wheel's Arabic and the Groups wheel's own
wrapped text.** The owner's own ask, taken literally rather than as a
one-off hardcode: *"Make the Arabic Names on the wheel of 'Asma' 50%
bigger in size. (actually enable me to resize the names myself). Enable
me to resize and wrapping the texts on the wheel for groups as well."*

**Two independent scales, not one.** `.wheel-seg-label` (every wrapped,
non-Arabic line -- a Group's own title, and a Name's own display-language
name underneath its Arabic) and a new `.wheel-seg-label-ar` (the Arabic
Name only, drawn on the Names-level wheel's first slice line) are now two
separately-sized CSS classes, each reading its own `var()` --
`--asmax-wheel-ar-scale` (defaults to **1.5**, the owner's own literal
"50% bigger") and `--asmax-wheel-label-scale` (defaults to 1, since only
the CONTROL was asked for there, not a bigger starting size). Neither
touches the plain outer ring number, `.wheel-seg-num`, or any OTHER wheel
in the app -- QCR, the plain Explore Quran-structure wheel and the main
Approach wheel never set `sliceLines` at all, so they're all unaffected.

**New `js/asma-wheel-text.js`**, the same localStorage-only, `document`-
delegated button+popover shape `text-size.js` already established for the
Quran reading screens (an "All"/"Reset" pair plus one slider per scale,
reusing that file's own `.text-size-*` CSS verbatim rather than styling a
second look) -- no new startup read, no collection, no `firestore.rules`
change (I9 untouched), since it only does anything once the Explore ->
Asma ul Husna panel is actually opened. The button ("A±") sits in
`#asmaXLevelBar`, always visible next to Manage rather than gated behind
it -- resizing text is a personal display preference, not an editing
action.

**Resize and wrapping are the SAME ask, and had to be built together, not
separately**: `mastery-wheel.js`'s `renderScopedWheel()` gained
`entry.sliceArabicLines` (a leading-line count, default 0, so every other
caller renders byte-for-byte as before) to mark which of its
already-wrapped `sliceLines` get the Arabic class -- a tspan's own
`dy="…em"` resolves against ITS OWN font-size, not the line before it, so
the Arabic line growing never throws off the spacing around it.
`wheelLabelMaxLen()` in `quranrevival.html` (the function that decides how
many characters fit per wrapped line, derived from the slice's own real
arc length) now reads `getAsmaWheelLabelScale()` instead of assuming the
old fixed 9.1px baseline, so a bigger label scale genuinely re-wraps
tighter and a smaller one can fit more per line -- changing either slider
re-renders whichever Asma level is currently on screen (via a new
`onAsmaWheelTextScaleChange()` subscription), since a font-size change
alone would have left stale, already-wrapped tspans on screen.

**Verified with a focused, un-checked-in Playwright script** -- 19 checks,
all passing: the Groups wheel's own label defaulting to 9.1px; the Names
wheel's first line carrying real Arabic text at 13.65px (9.1 × 1.5, the
default "50% bigger") while its own name line stays at 9.1px; the
popover's sliders starting at the right stored values; dragging the
Arabic slider to 200% really growing the Arabic line to 18.2px, updating
the popover's own percentage readout, and persisting to localStorage;
dragging the Wheel-labels slider on the Groups level really growing a
Group's own title text and re-wrapping rather than silently keeping the
old wrap; Reset bringing both back to 1.5/1; QCR's own wheel confirmed to
still carry zero slice-label elements (unaffected); and the whole control
again in Bangla, with the toggle's own title and the new "Wheel labels"
row label both translated. `tools/i18n-verify/layout.mjs` reports the
landing page's own measured metrics (heading position, wheel width,
Approach rows, dock gap, overflow) byte-for-byte IDENTICAL at all eight
viewports in both banner states against a real `HEAD` shim -- the
`getElementById` "missing after" list is the exact same 18 pre-existing,
already-disclosed Manage-mode-only Asma/QCR false positives this project
has carried since v07.86, confirmed by running the unmodified `HEAD`
copy through the identical check and getting the identical list; target
count 221 → 222, exactly the one new `asmaXWheelTextSlot` lookup, which
resolves fine. **`tools/i18n-coverage.mjs`: one new string ("Wheel
labels"), translated** (marked `// ?` for the owner's own eye) -- "Text
size", "Arabic", "All" and "Reset" are all reused verbatim from their
existing entries; `js/asma-wheel-text.js` joined the `quran` area
alongside `js/mastery-wheel.js`/`js/text-size.js`, which already lived
there. No `firestore.rules`, schema or Firestore data changes -- nothing
to deploy but the static files.

v07.123 (3 Sep 2026, on Claude Code on the web) is **four owner-reported
fixes from a Whole-Surah reading screenshot** -- one of them a real,
week-old navigation bug that had been sending readers a whole surah at a
time, and two of them reversals of decisions this project made itself.

**(1) A slide-up in a Whole Surah brought the NEXT SURAH.** The owner's own
report, and it reproduced first time: on surah 67 with "Page by page" on,
one vertical slide moved to surah 68. **Root cause, found by reading the
gesture handler rather than the CSS:** `advance()` decides what a gesture
means by asking whether the āyah-level Next button is available -- and a
flow view (Whole Surah/Range/Mushaf) hides that pair ON PURPOSE, because
every āyah is already drawn at once, not because there is nothing smaller
to step. So the gesture fell straight through to the UNIT-level pair, i.e.
the next surah, from anywhere in the surah. New `stepFlowAyah(dir)` gives a
flow view its own within-the-flow step: scroll the next (or previous) page
into view, in whichever direction that mode actually moves -- sideways when
"Page by page" is on, vertically when it is off. It reads
`#pageViewContainer`'s own CHILDREN rather than `.page-flow-ayah`, so a
Mushaf page turns the same way (a slide there should turn the page, not the
surah, for exactly the same reason). **Deliberately does NOT touch
`currentAyahNum`:** that would re-render the whole flow and throw the
reader's own scroll position away, and this view has never moved
`#ayahSelect` as it scrolls. **And it deliberately does NOT roll into the
next surah at the last āyah** -- stepping the unit is what the ⏭ button is
for, explicitly, which is the whole point of the complaint; a gesture at
the end now slides back instead. Worth knowing for anyone testing this by
hand: with both translations on, an āyah's own page genuinely scrolls, so a
slide-up reads THROUGH it first and only steps at its end -- which is the
right behaviour and is what the round's own checks drive.

**(2) The āyah slid to was not highlighted, and the mechanism for it was
broken in two independent ways.** `wireFlowInViewHighlight()` was an
`IntersectionObserver`, and neither failure would ever show in a
screenshot. An observer callback carries only the entries that CHANGED, so
picking "the most visible row" out of that batch alone is right only when
every row happens to report at once; and its thresholds fire only when a
ratio CROSSES one, so an āyah taller than the viewport -- whose ratio never
reaches 0.25 -- never fired at all, which is most āyahs in the vertical
reading. **Replaced with a plain measurement:** on every scroll of whichever
element is really scrolling, compare each row's own rect against the
viewport's and mark whichever OVERLAPS it most, in both axes at once so the
same arithmetic is right for sideways paging and ordinary scrolling without
branching. Deterministic, no thresholds, correct at any row height.
`flowScrollRoot()` is now the ONE answer to "what is actually scrolling
here", shared by the highlight and by `stepFlowAyah()`, so the two can
never disagree about what is moving.

**One thing fixed alongside it, because it was competing with the answer:**
`markPlayingAyah(currentAyahNum)` ran unconditionally on every flow render,
so a fresh Whole Surah always painted the GOLD "now playing" band on āyah 1
with nothing playing. With the reader's own position now carrying its own
(blue) highlight, that put two colours for two different ideas on screen at
once and gave the first āyah the wrong one. It is conditional on
`isPlaying() || isPaused()` now, so gold means what its own CSS comment has
always said -- the āyah being recited. The playback callbacks that drive it
during a real recitation are untouched.

**(3) The whole-screen tap no longer toggles full screen, in the reading
screen OR the Note view.** The owner: *"disable a single tapping for
full-screen view (in both read n note view, makes too much quick movement,
the button should be enough for full screen view)."* This reverses shell
round 21's own rule and round 30's matching one for the Note view -- both
were the owner's asks at the time, both overruled by their own use.
**A real trap had to be closed for this to be safe, and it is the reason
the round touches CSS at all:** `#readBar` -- which holds the ⤢ button --
was hidden OUTRIGHT in the BARE state (the default, all five switches on),
so until now the tap was the ONLY way back out of it. Removing the tap
without this would have stranded the reader with no control on screen.
`#readBar > *:not(#hideChromeBtn)` is what goes now; the button stays,
faint and out of the way, exactly the rule the Note view's own full-screen
button has followed since round 30. `reading.mjs` measures that directly
(the button reachable in the bare state) rather than taking it on trust.
The two on-screen hints told the reader to TAP and are reworded to name the
button; the two old keys stay in `bn.js`, unused, per this project's own
rule for a string that stops being called.

**(4) The Arabic block's āyah number is in Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩),
globally.** This needed no new mechanism -- `digitsForLang()` already
encoded exactly the right rule for the two translation blocks ("a block's
number belongs to that block's own script, not the app's current display
language"), and the Arabic block was the one that had been left following
`num()`. So `"ar"` joins that helper and both call sites use it:
`renderArabicPanel()` in `ayah-renderer.js`, which reaches every reading
screen in the app, and the Note view's own locally-built Arabic. Measured
in both app languages: the Arabic reads ١, the English 1 and the Bangla ১,
side by side, in either. The per-āyah divider above the Word by
Word/Root/Derivatives panels is left following the app language on purpose
-- it labels a section, it is not the Arabic āyah text.

**Verified with a focused, un-checked-in Playwright script** (this
project's own established practice for anything past `behaviour.mjs`'s own
disclosed section-42 crash point) -- **35 checks, all passing**: the 30-row
flow rendering and marking an in-view āyah on first render; a slide-up
proven NOT to change surah, proven to move the strip, and the āyah it
lands on proven to be the one highlighted; a second slide-up stepping one
more; a slide-down stepping back; a slide-up at the LAST āyah proven still
not to change surah while ⏭ still does; the same again with "Page by page"
OFF, where a vertical scroll is proven to move the highlight; a tap on the
reading and a tap on the Note view each proven to change nothing while
both buttons still work; the BARE state proven to hide the dock AND to
keep the ⤢ button on screen with nothing else in the bar; and the badge
trio proven ١/1/১ in both app languages, on the Read screen and in the
Note view. **Two of its own early failures were WRONG ASSERTIONS, not
defects, and both are worth recording**: the test drove the gesture from
the FIRST flow row rather than the one on screen, so `nearestScroller()`
correctly read a different row's scroll position; and it asserted a Bangla
badge with the Bangla translation switched off.

**Nine checked-in assertions were UPDATED, not worked around**, and they
split into two kinds. **Six describe behaviour this round deliberately
removed** -- `reading.mjs`'s own tap-walks-the-cycle check (which alone
reported 16 problems), `behaviour.mjs`'s 29d, 33g and 34e, and the two
HELPERS that leaned on the tap to get back out of full screen
(`openMushaf()`, which opens immersive by design, and 33f's own retick
step). All now press the ⤢ button, and the tap is asserted to change
NOTHING; `reading.mjs` also measures directly that the button is reachable
in the bare state. **The other three were already failing at `HEAD`, on
their own, and are unrelated to this round** -- 30j/30l/33a/37a hardcode
the read bar's contents and had gone stale twice over (`#readTextSizeSlot`
joined that row in v07.92, `#readAttachAsmaBtn` in v07.107, and neither
round updated them), and 29b read `#wheelSection`'s own computed display,
which stopped being the answer in v07.115 when `#wheelPopupView` became
what carries `hidden` (that round fixed `reading.mjs`'s copy of the same
check and missed this one). Fixed rather than left permanently red: a red
check in the very row this round edits would mask a real regression.
**`reading.mjs`: READING SCREEN OK at all eight viewports.**
**`behaviour.mjs`: 789 checks pass, 3 fail** -- all three the known
environmental archive.org poster block (recorded since v07.44) -- and the
run reaches the same pre-existing `[data-note-master-toggle]` crash point
this project has carried since v07.69, unchanged. **`layout.mjs`: every measured landing-page metric
byte-for-byte identical** against a real `HEAD` shim at all eight viewports
in both banner states -- same heading top, wheel width, Approach rows and
9px dock gap, `getElementById` targets unchanged at 222 -- the only flagged
line is the same pre-existing false positive this project has carried since
v07.86 (Manage-mode-only Asma/QCR ids that do not exist until Manage is
toggled on), confirmed identical on the unmodified `HEAD` copy.
**`panel.mjs` clean**, **`navcheck.mjs` unchanged** (still only the
pre-existing 320px English truncation of "Operation"/"Bookmark"),
**coverage byte-identical at 1,547 scanned / 48 missing, same in every
area** -- the two reworded hints are a clean 1-for-1 swap, both translated
and read back off a real rendered page in Bangla rather than trusted from
the report -- and **`tools/perf/measure.mjs` identical to `HEAD` on every
page measured** (Quran Study 6 sequential round trips / 9 calls; Deen
Study, Health and Asma 7; Records 5), confirming no Firestore read joined
or left any startup path. **One environmental failure, pre-existing and
unrelated:** this sandbox's proxy resets the fetch of
`gtaf_bangla_timestamps.json` from `raw.githubusercontent.com` -- the
Bangla reciter's timing map that v07.39 warms when the reading screen
opens. Confirmed present at `HEAD` too, and intermittent (it passes when
that host is reachable). No `firestore.rules`, schema or Firestore data
changes -- nothing to deploy but the static files.

v07.124 (3 Sep 2026, on Claude Code on the web) is **the Mushaf page fixes --
a Page unit is now a WHOLE page, and it turns.** Two owner reports from a
tablet screenshot of v07.123 (Read view, Mushaf and "Page by page" both on,
Unit = Page, Surah 36, page 441): *"The entire page should be highlighted, but
only one Ayah is highlighted. Why? (is it because there is Ayah selector? If
that's the case then, we won't need Ayah selector in the page unit selection.
FIX."* and *"this page doesn't slide right nor down. Need right ways slide to
work. Enable right slide to appear the next page in a way as if a page is
turning right to left."* Both reproduced by measurement before anything was
touched: 144 words on the page, **142 of them dimmed**, and the strip's own
`scrollWidth` exactly equal to its `clientWidth` -- nothing to scroll to.

**(1) The highlight bug was one wrong word in one condition, and the code's own
comment already said what the rule should be.** `renderStudyScreen()` read
`const from = isMushaf && !isPageUnit ? currentAyahNum : unitFrom` -- but
`isPageUnit` names only Whole Surah and Range, so **Ruku'/Juz/Hizb/PAGE all
took the single-ayah branch**: Mushaf drew that one ayah's page with the whole
rest of it dimmed. The comment above it already stated the intent ("Mushaf over
a single ayah means THAT ayah's page ... every other unit hands over its own
bounds"), and `currentUnitAyahBounds()` already returns
`[currentAyahNum, currentAyahNum]` for the Single Ayah unit -- so the special
case was not only wrong, **it was never needed**. It is gone; the bounds are
passed unconditionally.

**Two smaller decisions ride with it.** The dim exists to mark "your unit,
inside a page it only partly fills" -- when the unit IS the page there is
nothing to mark off, so **nothing dims for a Page unit** (the owner's "the
entire page should be highlighted", literally). And a Page unit now names its
own page outright (`currentUnitNumber()`) rather than deriving pages from ayah
keys: an ayah that straddles a page boundary would otherwise pull the NEXT page
in alongside it, and a Page unit should be exactly one page.

**The Ayah picker: hidden where it does nothing, kept where it does.** The
owner's own follow-on was conditional ("**is it because** there is Ayah
selector? **If that's the case then**, we won't need Ayah selector in the page
unit selection") -- and it was not the cause, only implicated, since
`currentAyahNum` is what the broken branch read. One new `unitRendersWhole()`
is now the single rule both the Study-options picker and its reading-screen
mirror read, so the two can never disagree: **the picker goes whenever the
whole unit is drawn at once AND that unit is more than one ayah** -- Range and
Whole Surah as before, plus Mushaf over a Page/Ruku'/Juz/Hizb. It **stays** for
an ordinary (non-Mushaf) Page/Ruku'/Juz/Hizb, which still reads ayah by ayah
and where it is the only way to move within the unit, and for Mushaf over a
Single Ayah, where it chooses which ayah is marked on the page. Said plainly
rather than applied more widely than it earns.

**(2) The slide needed a real distinction, not a blanket fall-through.**
v07.123 made a flow-view gesture step WITHIN the flow, on purpose: a slide
inside a Whole Surah must never jump to the next surah (that is what the ⏭
button is for), and that rule has its own check. But `stepFlowAyah()` returns
false for two different reasons -- **at the end of a multi-page strip**, and
**there is only one page, so the strip cannot move at all** -- and a Mushaf
Page unit is the second. New `flowStripPages()` tells them apart: two or more
and v07.123's rule stands unchanged; **exactly one and the gesture means the
UNIT** -- the next printed page. The same one-page test is what now lets a
sideways swipe through `touchend`'s `#pageViewContainer` guard, which had been
deferring unconditionally to a native scroll-snap that has nothing to snap to.

**(3) A real page turn, not a cut.** `turnFlowPage()` hinges the leaf at its
**right** edge -- the spine side of an Arabic book -- so going forward swings
the current page away about that hinge and lays the next one down from the far
side (`perspective(1400px) rotateY(±72deg)`, 170ms out / 200ms in). Direction
follows this page's own standing rule (v07.56/v07.114): the next unit sits to
the LEFT, so a RIGHT swipe brings it in. Deliberately **fire-and-forget** from
`advance()` -- `stepUnit()` is async for Juz/Hizb/Page (it fetches that unit's
boundary table and may open a different surah) and a gesture must not wait on a
network read -- and every style it sets is cleared in a `finally`, so a failed
fetch can never leave the page mid-turn and invisible. One in-flight guard, for
the same reason: `stepUnit()` can outlast `advance()`'s own 550ms cooldown on a
slow connection, and two turns fighting over one element's transform is a real
glitch rather than a theoretical one. **Screenshotted at both ends and
mid-turn** rather than trusted from the assertions alone.

**Verified: 800 behaviour checks pass** (was 789 -- 11 new; the 3 failures are
the same pre-existing, environmental archive.org poster block this project has
recorded since v07.44, and the run ends at the same pre-existing section-42
crash carried since v07.69, both unrelated). **Sections 40d and 40e are new and
checked in** (not
a throwaway script -- section 40 sits before the pre-existing section-42 crash
this project has carried since v07.69, so these are reachable): the Page unit
proven to draw exactly its own page with **zero** dimmed words and no Ayah
picker in either place; a right swipe proven to start a real `rotateY` turn and
land on page 51 with the transform cleared; a left swipe proven to turn back; a
slide up at the foot of the page proven to turn it too; and 40e proving Mushaf
over a Single Ayah is untouched -- still one ayah marked, rest dimmed, picker
still there. The suite gained a `swipe()` helper (synthetic
touchstart/touchmove/touchend on the real document listeners) -- the gesture
path had no checked-in coverage at all before this round, which is part of why
a one-page strip was never exercised. `openMushaf()` takes a unit NUMBER now,
waiting for the boundary table to land before selecting it.
**`layout.mjs`: every measured landing metric byte-for-byte identical** at all
eight viewports in both banner states against a real `HEAD` shim -- same
heading top, wheel width, Approach rows and dock gap, `getElementById` targets
unchanged at 222; the only flagged line is the same pre-existing false positive
this project has disclosed since v07.86 (Manage-mode-only Asma/QCR ids that do
not exist until Manage is toggled on). **`reading.mjs` READING SCREEN OK** at
all eight viewports, **`panel.mjs` no wrapped bar and no truncated label**,
**`navcheck.mjs` unchanged** (still only the pre-existing 320px English
truncation of "Operation"/"Bookmark"), **coverage byte-identical at 1,547
scanned / 48 missing, same in every area** -- this round adds no user-visible
strings. No `firestore.rules`, schema or Firestore data changes -- nothing to
deploy but the static files.

v07.125 (4 Sep 2026, on Claude Code on the web) is **three owner asks from a
marked-up landing-screen screenshot: the app reopens where it was left, a
capsule above the wheel, and the corner resize handles lose their discs.**

**(1) "Enable the app opens in the last settings/options in all view."**
**Half of this was narrowed the same day by v07.126, on the owner's own call
once the cost below was measured -- the app ALWAYS opens on the wheel now, and
only the SETTINGS come back. Read v07.126 for what actually ships.** As built
here: the Quran module remembers, per browser, which stage view it was left on
(Approach wheel / Read / Note / Explore) and the study state that view was
showing -- surah, ayah, Study Unit and its range, the chosen Approach, and the
Reading-view ticks -- and restores both on the next open. **Nothing here
describes that state itself, and that is the point:** it stores and replays the
exact object `captureQuranBookmarkSettings()`/`captureNoteBookmarkSettings()`
already build for a bookmark's own "reopen where I was" (v07.66), read back
through the same `applyQuranBookmarkSettings()`. One shape, two readers -- a
field added to a bookmark's settings is picked up here for free, and the two
can never drift into disagreeing about what "where I was" means.
`getQuranLastSession()`/`setQuranLastSession()` in `prefs.js`, localStorage,
the same additive shape every reading preference since round 18 has used: **no
new collection and no `firestore.rules` change.** Two guards do the real work:
`lastSessionReady` stays false until the boot sequence has finished restoring,
so the restore -- which moves the surah, the ayah and the stage view on its way
in -- can never overwrite the very thing it is reading; and the write is
debounced (250ms), because one gesture calls `renderStudyScreen()` several
times over, so a settled state costs one write rather than one per render.
**An explicit deep link outranks a remembered place:** `?bookmark=`, `?goto=`
and `?resume=` are all checked first and win outright -- someone following a
link into a specific āyah must land there.

**This DOES add to the startup path, conditionally, and is flagged per I9
rather than slipped in.** Measured: a fresh browser, or one last left on the
wheel, is **unchanged at 9 Firestore calls / 6 sequential round trips** on Quran
Study, byte-identical to v07.124. A browser restoring into **Read or Note**
pays **2 more calls (11)** -- the notes and bookmarks documents that
`ensureAyahNoteDataLoaded()` fetches, i.e. exactly the two reads that same
reader would have paid one tap later anyway, fired together as one wait, and
fire-and-forget on the Read branch. If the owner would rather keep boot
untouched in every case, the narrower version of this feature (restore the
settings, always open on the wheel) is a one-line change to
`restoreLastSession()`. **Deliberately NOT stored:** any full-screen state
(`immersive-read` / `note-immersive` / `explore-immersive`) -- reopening the app
already stripped of its banner, menu and dock would read as a broken page
rather than a restored one. And **Explore restores as the SCREEN, not a
position inside it**: `openExplore()` resets its own drill-down on every open
by its own long-standing rule, and reversing that is its own decision, not one
to slip in here. Scoped to the Quran module, which is where the owner was
looking; the other nine study pages still restore by `?resume=`/the Continue
strip only.

**(2) The capsule above the wheel.** The owner's own wording: *"in the marked-up
space, above the wheel, let appear a capsule like text 'Approach the Quran in
30 ways' (as it is in the middle of the circle, 'Study ...'), push the wheel
below."* No new element was needed -- `#wheelIntroSettled` already stood in
exactly that slot and already said very nearly this ("Approach an Ayah in 30
ways", v07.61). It is a gold pill now rather than an italic caption,
deliberately the SAME gradient, radius and weight as the hub's own "Study
Quran" button one size down, so the two read as one family; and it is **visible
from first paint** instead of only after the intro button is tapped, because
the state the owner's screenshot shows is the veiled, not-yet-tapped one.
**Measured: it costs exactly one Approach row on phones** (390x844 6 -> 5,
412x915 8 -> 7, 390x700 and 360x640 5 -> 4) **and nothing on tablet or desktop**
(10 -> 10). That cost was named by the owner up front -- "it might show only 4
ways (currently 5 ways showing)" -- so the row is the intended result, not a
regression. Everything else on the landing page is byte-identical: same
wheel-heading top (103px), same wheel width at every viewport, same 9px dock
gap, no overflow. The old string stays in `bn.js`, unused, per this project's
own rule for a string that stops being called.

**(3) "Those marked-up little circles doesn't look good, make only the arrow
appear, not the circle."** `.wheel-resize-handle-corner` was a 26px filled gold
disc with a dark ring and a drop shadow, carrying the `⤡` glyph on the
bottom-right corner only -- the other three were empty divs that showed purely
because the disc did. The disc, ring and shadow are gone; **each corner now
carries its own correctly-angled arrow** (`⤡` on the NW-SE diagonal, `⤢` on
the NE-SW one) rather than three of them vanishing with the disc. **The 26px
BOX is deliberately unchanged** -- it is the finger target, and shrinking it to
the glyph's own ink would have made a phone-sized handle harder to grab while
nobody asked for that. A text-shadow either side keeps the glyph legible over
both the landing wheel's dark ground and `asma-study.html`'s pale pane, without
painting a box back in. Applied to all four wheels that share this class family
(the Mastery Wheel, Explore's Quran-structure wheel, QCR's and Asma ul Husna's).

**Verified with a focused, un-checked-in Playwright script** (this project's own
established practice) -- **26 checks, all passing**: the capsule's exact wording,
its pill styling by computed style, its position proven above the wheel, and
its presence before the intro is tapped; all four handles proven to carry an
arrow with a transparent background, no border, no shadow and a 26px box, each
glyph proven to match its own corner; a real Read session proven written to
localStorage carrying the surah/ayah/unit actually on screen, and a reload
proven to reopen on the Read view with the same surah, ayah, unit and reading
ticks; a Note session proven to store its own `position` and reopen on the exact
āyah it was noting; a browser that has never been here proven to still open on
the wheel; and `?goto=2:255` proven to outrank the remembered place. **Two of
its own first-run failures were WRONG ASSERTIONS, not defects** -- opening Read
on a Ruku' lands on that ruku's own first āyah (round 17's rule), so an ayah
picker moving 5 -> 1 is the app behaving; the check compares the stored value
against what is actually on screen now. Also confirmed by real screenshot in
both the veiled and tapped states, and in Bangla (the capsule reads
"কুরআনকে ৩০ উপায়ে অধ্যয়ন করুন"), rather than trusting the coverage report -- which
has been wrong about what it counts nine separate times on this project.

**`layout.mjs` reports exactly the one intended change and nothing else** (the
Approach row above; heading top, wheel width, dock gap and overflow all
identical at all eight viewports in both banner states; `getElementById`
targets 222 -> 221, exactly the retired `wheelIntroSettledEl` lookup, and the
"missing" list is the same 18 pre-existing Manage-mode-only Asma/QCR ids this
project has disclosed since v07.86). **`reading.mjs` READING SCREEN OK** at all
eight viewports, **`panel.mjs` no wrapped bar and no truncated label**,
**`navcheck.mjs` unchanged** (still only the pre-existing 320px English
truncation of "Operation"/"Bookmark"), **coverage byte-identical at 1,547
scanned / 48 missing in every area** -- the capsule is a clean 1-for-1 swap of
the string it replaces -- and **`tools/perf/measure.mjs` identical to v07.124
on every page measured**. **Two checked-in behaviour checks (43a, 43b) were
UPDATED rather than worked around**, because this round deliberately changed
what they asserted: the capsule is no longer hidden until the intro is tapped.
No `firestore.rules`, schema or Firestore data changes -- nothing to deploy but
the static files.


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
- **The translation coverage number is a to-do list, never evidence.** It has
  been wrong about what it counts **nine separate times** — over- and
  under-counting both. Only reading a really-rendered page proves a screen is
  translated. Check Bangla by opening the page in Bangla.
- **`layout.mjs` proves "nothing changed since last time", never "this is
  right".** When a round is a CORRECTION, compare against the last KNOWN-GOOD
  commit (`git show <sha>:app/quranrevival.html`), not just `HEAD` — otherwise
  you are comparing against the broken build.
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
  This has bitten at least four times (`#wheelSection`, `#studyScreen`,
  `#explorePanel`, `#asmaXPanel`).
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
