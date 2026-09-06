# QuranRevival — Project Memory

Read this first, every session. It is the standing brief.


**Current milestone: v08.00 — the v08 line is OPEN.** `app/js/version.js`
reads `08.00` and the badge beside the app name says so on screen. The v07
line is closed behind it: its final build, **v07.139**, is frozen at
`legacy-v07/` and reachable, exactly the way v06 had a line drawn under it at
the cutover. The owner drew this one on 6 Sep 2026; v08.00 opened it the same
day. **Nothing about how the app WORKS changed** in either the closing round
or the opening one — no feature, no schema, no rule; see the "v07 closed and
archived" entry below and the v08.00 entry in `CHANGELOG.md`.

**Version numbering from here: `08` is this overhaul, and the last two digits
bump on every new feature within it** — so the next feature round is v08.01.
`app/js/version.js` is the single source of truth; nothing else hardcodes the
string. Bump it and this line together, every round.

**The app has been live and real, not a beta, since the 9 August 2026 cutover
(v07.00)** — we are in real-use iteration, driven by what the owner hits using
it. See "Post-cutover rollout order" (D13) below for whose real use comes
first.

**Three lines of this app now exist, all reachable, and only ONE is edited:**

| URL | What | Rule |
|---|---|---|
| `/legacy/index.html` | v06.30, the single-file pre-cutover app (10,146 lines) | **Reference only — never edit** |
| `/legacy-v07/` | v07.139, the multi-page Firebase rebuild, frozen 6 Sep 2026 | **Reference only — never edit** |
| `/app/` | v08.00 onward | The live app. All work happens here |

**Both archives are reachable from inside the app** — Home ▾ carries "Legacy
App - v06 ↗" and "Legacy App - v07 ↗", static markup in all 22 nav-bearing
pages (not `nav.js`). Both sign in to the same `study-monitoring` Firebase
project and **write real data** — they are runnable history, not screenshots.
The version badge beside the app name is what tells them apart on screen, and
since v08.00 it really does: `/app/` reads **v08.00**, `/legacy-v07/` reads
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

v07.137 (5 Sep 2026, same day) is **Explore in Bangla end to end, and the Surah
view promoted to the default** -- the owner having used v07.136: *"Subhanallah!
The Surah view, It looks actually good! So, make the Surah view as the default
view on Explore, rather than Juzz."*

**(1) Trail, wheel hubs, sidebar labels and tooltips are all translated**,
closing the item v07.134 and v07.135 both flagged -- and the flag was right
about the cost: **"Whole Quran", "Juz {juz}", "Page {page}" and "Surah {surah}"
were already in `bn.js`, translated, and simply never called.** Only three keys
were new. Every number goes through `num()`, so a Bangla reader sees "জুয ১",
"পৃষ্ঠা ৫৮২", "আয়াত ৭" rather than Bengali words wrapped around Latin digits --
the half that is easy to get wrong and invisible in a coverage report. **Two
compositions are deliberate and safe:** parentheses around a translated phrase,
and " · " joining a surah name to its ruku. Both are PUNCTUATION rather than
grammar, so neither reverses in Bangla -- unlike the possessives phases 4 and 5
had to rebuild as whole sentences.

**(2) A defect fixed in passing, in seven places: the wheels printed a raw
status id.** Every segment tooltip read `statusId.replace(/_/g, " ")` --
"not_started" as "not started" -- a storage value, meaningless in either
language and untranslated in Bangla. A one-line `segTitle()` routes them all
through `statusLabelsById()`, the helper the legend and the sidebar chips
already use. Six are Explore's; **the seventh is the landing page's own Mastery
Wheel**, identical bug, fixed with them.

**(3) Surah is the default whole-Quran view** -- one word in `prefs.js`. **A
reader who has already chosen keeps their choice**, since a stored value always
wins; this only changes what someone who never touched the switch sees. Proven
both ways.

**Verified: a focused, un-checked-in Playwright script, 25 checks, all
passing**, screenshotted -- because a coverage number has never once proved a
screen is translated on this project. In Bangla, read off the rendered page:
the trail's "Whole Quran", the hub, all 114 surah names, the Juz list ("জুয ১",
Bangla word AND Bengali digits, no Latin character or digit anywhere), the Juz
tooltip end to end, the trail's Juz crumb, the page list, the ruku list, the
ruku tooltip, the Ruku' crumb, the ayah list, a short surah's ayah list, and
the hub naming surah and ruku together -- plus the Mastery Wheel's own tooltip
proven free of raw status ids and reading in Bangla.

**Coverage 1,566 -> 1,567 scanned, and missing 47 -> 46 -- one FEWER, which is
the interesting number.** Diffed string by string against a clean `HEAD`
worktree: the one that left is **`"Ruku' {ruku}"`, already called somewhere in
the app and with no Bangla at all** -- a real pre-existing gap closed as a side
effect of needing the same key. The other areas' missing lists are
byte-identical to `HEAD`, so nothing new went untranslated.

**Four focused scripts re-run, and SIX checks UPDATED rather than deleted**,
each because this round deliberately changed what it asserted (three assumed
the Quran level opens on Juz; one waited on an English breadcrumb; one asserted
Juz was the default; one expected a stored pair the new default reorders).
**One was a wrong assertion of mine rather than a stale one** -- it expected
`["surah","surah"]` where the real sequence leaves `["juz","surah"]`, which
proves the "two levels remember separately" claim better than matching values
would. Totals: **34 + 29 + 27 + 25, all passing.**

**`layout.mjs`: landing page byte-for-byte identical**, zero changed metrics;
`getElementById` 240 -> 240, missing list the same 22. No `firestore.rules`,
schema or Firestore data changes.

**Flagged, not changed:** the Explore hint under the legend still describes the
drill as "Quran → Juz → Surah → Ruku'", which is now the non-default path.
Rewording it is an English-copy decision and a new translation key, so it is
raised rather than decided here.


v07.138 (6 Sep 2026, on Claude Code on the web) is **a real backup, in two
halves** -- the owner asked for "an html file of QuranRevival for storing as a
backup file with all its data", which reads three ways, so it was **put to them
before anything was built** and they chose both of the real ones: a Backup page
inside the app for their DATA, and a runnable offline archive of the app
itself.

**The diagnosis that shaped it: the code has been backed up all along and the
data never has.** Git carries every version of every file with full history;
reverting a bad round is one command. But `records`, `activity`, `ayahNotes`,
`bookmarks`, `ayahCollections` and `asmaCollections` live only in Firestore,
and until this round there was no way to get a copy of any of them out --
Monitor's CSV export covers activity and nothing else. So the single-file
"snapshot of the app" reading, which is the one the question sounds like, is
the one worth the least: it would add nothing git does not already give, and
it could not carry the Qur'an text or the Mushaf pages anyway (~130MB of
separate files). Said to the owner with the sizes attached rather than built
and explained afterwards.

**(1) `backup.html` + `js/backup.js` + `js/backup-file.js`.** One button;
everything the signed-in account can read comes back as ONE self-contained
HTML file saved to their own device. It opens in any browser with **no
network at all** -- no stylesheet link, no script src, no font download,
proven by loading it with every non-`file://` request treated as a failure.
Human-readable throughout (tables per person: claims, notes with their
formatting intact, bookmarks, the week-by-week activity log, plus the
catalogue, collections, classes, curriculum, grades, homework and the
tenant's own settings), with a filter box, open/close-all and Print -- and
**the complete raw JSON embedded in a `<script type="application/json">`
block**, which is what makes it a backup rather than a printout. The tables
are for a person; the block is for a machine, and a restore later reads the
block.

**Two rules shape every read, and both are the reason this did not become a
403 the owner discovered.** Every collection is fetched through **the app's
own existing helper** -- `listAllRecordsForPerson`, `getBookmarks`,
`getAyahNotes`, `listClasses`, `getQcrDoc` and the rest -- because those query
shapes are already proven against the deployed rules; inventing new ones is
exactly the shape v07.18 found (a read that looks right and fails only once
the rules see it). And **a refusal is recorded, never thrown**: a guardian
cannot read `memberships`, a non-admin cannot read `tenantInvites`, and those
are correct refusals, so they are listed in the file ("not included, and
why") and on screen. A partial backup that says what it is beats no backup.
Activity has no list query anywhere in this app (one document per week, read
by id -- see `activity.js`), so the export walks week keys from the tenant's
own `createdAt` to today, fired together per person: one wait each, not one
per week.

**No `firestore.rules` change, no schema change, no new collection, and
nothing on any startup path** -- it is all reads of documents that already
exist, on an explicit button press. `tools/perf/measure.mjs` re-run to prove
it: Quran Study still **6 sequential round trips / 9 Firestore calls**,
unchanged; `new-tenant.mjs` 10/10.

**(2) The offline archive.** `zip -r` of the whole site: **7.0 MB** for the
app plus all 114 surahs, the translations, the word-by-word data, the
juz/hizb/page tables, the three search indexes and the bundled Arabic fonts
(36MB raw -- JSON compresses hard); **101 MB** with the Mushaf's own 604 page
fonts added, which barely compress at all. **Proven to run, not assumed:**
the core archive was extracted to a clean folder, served on its own port, and
the app booted from it with the same Firebase stub the checked-in harness uses
-- real Qur'an text rendered, all 114 surahs in the picker, a bundled Arabic
face really `loaded` rather than falling back, and a real English search
returning real hits off the 900KB index, with **zero failed local requests**.
A `README-FIRST.txt` rides with it saying plainly that double-clicking
`quranrevival.html` will NOT work (browsers refuse to load a page's module
scripts off the disk), what one line to run instead, and that sign-in still
needs the internet because sign-in and the data both live on Google's servers.

**The backup FILE is translated, and that was a reversal made mid-build.**
The first draft wrote it in English on the reasoning that a backup might be
read years later by someone helping. That is a real argument and it is not
mine to make: I11 says every user-visible name is language-keyed, and the
person who reads a backup is the person who was using the app. `t()` runs at
BUILD time, so the finished file is still one static self-contained document
with no i18n machinery inside it -- only the builder needs the catalogue.
**`js/backup-file.js` imports nothing that touches Firebase**, which is what
keeps it testable without a browser: 32 checks run against it in plain node.

**`activityActionLabel` MOVED from `js/activity.js` to `js/labels.js` and is
re-exported there, not copied** -- the same move, for the same reason, that
created `labels.js` in the first place (v07.34) and that v07.36 made for
`confirmStateLabel`: a pure renderer has to print one and must never gain a
Firebase dependency, which `activity.js` has. Both existing call sites
(`monitor.html`, `records.html`) import it from `activity.js` and needed no
change at all -- that is what the re-export is for. `activity.js`'s own now-
unused `t` import went with it.

**Five real defects were found, every one of them by LOOKING at a rendered
page rather than by a passing check, and two of them were mine.**

- **The Save button was navy text on a navy background.** `#result a` (an ID
  rule) beat `.download-link` (a class) outright, so the finished button was
  an unreadable block -- while every assertion passed, because the element and
  its `download` attribute were both perfectly correct. **A passing check
  carrying the same blind spot as the code it guards**, exactly the standing
  lesson. There is one colour rule now, so there is no specificity contest
  left to lose, and the check measures the rendered text colour against its
  own background rather than the element's existence.
- **The tenant's own name came out English on a Bangla page.** `nameOf()`
  read `.en` directly instead of going through `langText()` -- the identical
  I11 bug v07.35 found in `classes.html`.
- **A Bangla export was called `quranrevival-backup-tenant-<date>.html`.**
  Stripping a Bangla tenant name to `[a-z0-9]` leaves nothing. The filename
  reads the tenant's ENGLISH name now, deliberately: a file name should not
  change meaning because someone switched interface language between one
  backup and the next.
- **"২ people" on a fully-Bangla page, with the coverage report reading
  100%.** The pill labels reached `t()` as a *variable* inside a loop --
  phase 4's own documented blind spot, in a new place. Written out as literal
  `t("…")` calls now, which is what makes them countable.
- **Raw stored ids where the app shows words** -- "pending", "practised",
  "active", "owner, prime". The file goes through `statusLabel()`,
  `confirmStateLabel()`, `entityStatusLabel()`, `activityActionLabel()` and
  `roleListLabel()` now, so a backup reads the way the app reads, while the
  canonical ids stay untouched in the data block. `weekStartsOn` prints a day
  name rather than the bare `6` it used to.

**One failing check was investigated and proved a WRONG ASSERTION, not a
defect** -- it expected the raw ids `owner, prime` where the app correctly
renders "Owner, Prime". The app was right.

**Notes are sanitised on the way into the file** -- a note is the one thing
here that is HTML rather than text, it has never been through a sanitiser
anywhere in this app, and a backup is a local file opened by double-clicking,
so it runs with `file://` privileges. Formatting is preserved and stripped to
the tag list the Notes palette can actually produce, with **every attribute
dropped** -- no `href`, no `style`, no `onclick`, no `src`. Preserving what a
note SAID never requires preserving what it could DO. The raw note is kept
byte-exact in the data block, which does not execute.

**Verified: 32 checks on the pure file-builder in plain node** (the sanitiser
against a deliberately hostile note: script elements and their bodies, event
handlers, `javascript:` URLs, an `<img onerror>` and an `<iframe>` all proven
gone while the real formatting and the stripped tags' own words survive; the
document proven complete, network-free and parseable back out of its own JSON
block) **plus 53 checks against the real page in a browser** (the file
captured from the page's own blob and read for real: both people, real claims,
the records chunk, all three confirm states, the subject tree, this week's
activity, the version stamp; the Save link proven readable and pressable; and
the whole thing again in Bangla, where the FILE itself is proven Bangla --
headings, intro, toolbar, the People section, Bengali digits, `lang="bn"` --
while the data block is proven to keep canonical English ids and real numbers)
**plus 7 checks proving the offline archive really runs.**

**Merged onto v07.137 and re-verified there, not on the base it was written
against.** `main` moved four rounds (v07.134-137, Explore's Approach capsule
and its Juz/Surah layers) while this branch was open, so the branch was merged
forward first and every number below is from the MERGED tree. Four files
conflicted -- `CHANGELOG.md`, `CLAUDE.md`, `version.js` and `bn.js` -- and only
`bn.js` auto-merged; it was checked rather than trusted, with **both sides'
strings proven present and the duplicate-key count proven unchanged at 15**
(all pre-existing on both sides, none introduced by the merge; a duplicate key
in an object literal means the later one silently wins, so it is worth a tidy
some round soon). This round was renumbered 07.133 -> **07.138**: `main` had
already used 07.133 for its own Juz/Surah round.

**`behaviour.mjs`: 800 pass, 3 fail**, stopping at the same pre-existing
line-4084 crash carried since v07.69. The three are section 22g, the
environmental archive.org poster block this project has recorded since v07.44
-- same 803 total as every recent run. **`layout.mjs`: every measured
landing-page metric byte-for-byte identical to `origin/main`** at all eight
viewports in both banner states (heading 148/103px, wheel
377/399/280/220/320/360px, Approach rows, 9px dock gap, no overflow), with
`getElementById` targets **240 -> 240** -- this round adds no id to that page
at all -- and the same 22-entry "missing" list on both sides. **`reading.mjs`
READING SCREEN OK**, **`panel.mjs` no truncated label and no wrapped bar**,
**`navcheck.mjs` unchanged** (still only the pre-existing 320px English
truncation of "Operation"/"Bookmark"). **Coverage 1,567 -> 1,705 scanned, 46
missing UNCHANGED** -- measured against `origin/main` in its own clean
worktree rather than assumed, since that baseline moved from 47 to 46 in
main's own rounds -- with `backup.html`/`js/backup.js`/`js/backup-file.js`
registered in the `admin` area; `tracking` drops 2 and `shell` gains 2, which
is exactly `activityActionLabel` moving files. **`tools/perf/measure.mjs`
identical** (Quran Study 6 sequential round trips / 9 Firestore calls) and
**`new-tenant.mjs` 10/10**.

**Two more wrong assertions were found while re-verifying, both in this
round's own new checks, and both fixed as checks rather than as code.** One
banned the substring "http" anywhere in the rendered file and failed on the
stub's own Resource row -- a tenant's own content may legitimately contain a
URL, and the file prints it as plain escaped text; what matters is that the
page makes no REQUEST, so it now looks for `href=`/`src=`/`url(` instead
(proven: zero `href`s to that address). The other expected "Owner, Prime"
where the harness seeds `memberships: []`, so the column is correctly an em
dash; `roleListLabel()`'s real output stays proven in the node-side test,
whose fixture has real membership rows.

**Flagged, not changed.** The backup is one-way: this round WRITES the file
and nothing reads it back. Restoring is a genuinely different and riskier job
(it writes to Firestore, and D6/I4 mean it can only ever add or revive, never
overwrite), so it is the owner's own call as its own round -- the file already
carries everything a restore would need, which is why the JSON block is in
there. The count pills read "1 bookmarks" in English for a count of one;
Bangla is unaffected (its nouns take no plural after a number), and inventing
eight singular strings for a stat row was not worth it. And **`nav.js`'s
Backup link is deliberately NOT owner/prime-only**, unlike Taglines beside it:
the page exports exactly what the account may already read, so a guardian
backing up their own children's notes is reading nothing new.

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
| `legacy-v07/` | **The v07 app, frozen at v07.139** (6 Sep 2026) — a `cp -a` of `app/`, reachable at `https://madrasatul-muslimeen.github.io/legacy-v07/`. **REFERENCE ONLY — NEVER EDIT**, same rule as `legacy/index.html`; a fix belongs in `app/`. Its own `README-ARCHIVE.txt` records the two things it shares with the live app (the `/tools/quran-data-pull/output` Qur'an data, and the real Firestore) and what would break it. |
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
- **Measure a content-sized control with content the length a REAL tenant
  has.** v07.134's Approach capsule was measured at seven widths in two
  languages and reported clean; the owner's own screenshot then showed it
  running off both edges of a phone. The harness's fixture has SHORT Approach
  names and their live tenant has "Reading (with Tajweed)" -- and the pill wore
  a `<select>`, whose intrinsic width is its LONGEST OPTION, which then travels
  up the flex chain because `min-width` defaults to `auto`. The measurement was
  right and the data was wrong. Seed a real-length name before believing a
  width, and set `min-width: 0` down any chain holding a `<select>`.
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
- **A control can be perfectly correct and still unreadable.** v07.138's
  Save button was navy text on a navy background -- `#result a` (an ID rule)
  beat `.download-link` (a class), and every assertion passed because the
  element and its `download` attribute were both exactly right. Assert the
  rendered COLOUR against its own background, not the element's existence,
  and never leave two rules competing to colour the same thing.
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
