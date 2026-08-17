# Layout backlog — what's still to organise

Opened 13 August 2026, after shell round 11 (v07.28). This is the pick-up
list for the layout work still outstanding, written so a **new session can
start from this file** without reading the whole shell-round history in
`CLAUDE.md`.

**Read `CLAUDE.md` first, always.** This file is a backlog, not a
replacement for the standing brief. In particular: the owner is a non-coder,
verification has to be mechanical, and layout rounds on `quranrevival.html`
are measured in headless Chromium before and after (see "How these rounds are
verified" at the bottom).

Items are in the order the owner wants them picked up. Item 1 is **built**
(13 Aug 2026, v07.30); item 2 is agreed in principle with the shape worked
out; items 3–5 are parked with the owner's own reasons recorded; item 6 was
opened by item 1's own build and flagged to the owner at the time.

---

## 1. One global Language preference — BUILT, 13 Aug 2026 (v07.30)

**Done.** Shell round 13. The owner's three decisions, asked before any code
was written, exactly as this item required:

- **(a) Storage: localStorage now, Firestore sync layered on later.** No
  startup read, no new collection, no `firestore.rules` change (I9 /
  load-speed contract intact). `js/prefs.js` is deliberately shaped so the
  sync can be added behind the same `getAppLang()` getter without touching
  a single call site.
- **(b) Two settings, not one.** App language (which NAMES appear in) lives
  under Home → Settings and applies to every module. The Quran ayah
  TRANSLATION language is its own control in the Reading view card. The
  8 Aug 2026 Bangla-reciter auto-switch now flips the translation setting
  only — it no longer renames every person and Approach app-wide as a side
  effect of choosing a reciter.
- **(c) All modules at once**, not module by module — the owner's call, on
  the grounds that a Settings control that silently fails to translate most
  of the app reads as a bug.

`currentLang` is gone. 100 hardcoded `"en"` call sites across 15 files now
read `getAppLang()`; all 13 pages/modules that render the nav mount the
control. Verified with 151 behaviour checks plus the layout regression run
described at the bottom of this file (landing page byte-for-byte unchanged
at all five viewports in both banner states).

**What it deliberately did NOT do — see item 6 below:** the nav bar's own
words are still English.

<details>
<summary>The original specification, kept for the record</summary>

### (original) 1. One global Language preference — AGREED, READY TO BUILD

**Owner's ask, 13 Aug 2026:** *"about taking the Language button to the app's
home button under settings … because that doesn't belong here."* They are
right, and this was already half-answered in v07.28 — Language is not a
Quran-module choice, it just has nowhere else to live yet.

Do this one **in its own session**, not as part of a `quranrevival.html`
layout round: it touches shared `js/nav.js` and potentially every page, which
is a different blast radius from "move things inside one panel."

### The real state of the code (checked, not assumed)

- `currentLang` exists in **`app/quranrevival.html` and nowhere else.**
  `grep -rn "currentLang" app/` returns 21 hits, all in that one file.
- Every other page and module passes the **literal `"en"`** into
  `langText()` — see `js/topic-study.js`, `js/routine-study.js`,
  `js/asma-study.js`, `catalogue.html`, `records.html`, `homework.html`,
  `curriculum.html`, `classes.html`, `course-offers.html`, `people.html`,
  `monitor.html`, `js/monitor.js`, `js/way-modal.js`, `js/topic-renderer.js`.
- So **Bangla currently works in the Quran module alone.** Everywhere else it
  is unreachable no matter what the tenant has stored, even though the data
  is language-keyed (I11) and often has `bn` filled in.
- **No user-preference store exists in the new build.** `TENANT` in
  `js/collections.js` has no prefs collection; `LEGACY.USER_PREFS`
  (`"userPrefs"`) is the *old* app's, referenced only by `js/self-check.js`
  as a legacy probe. The only client-side preferences in the new build are
  `js/splash.js` (localStorage, `mm_splash_pref` / `mm_qs_splash_pref`) and
  `js/session-context.js`.
- `js/nav.js` renders the Settings placeholders from
  `SETTINGS_PLACEHOLDERS = ["Language", "Appearance"]`, emitted by
  `renderHomeExtras(roles)` into the Home `<details>` once roles resolve.

### Two decisions the owner has to make first — ASK, DO NOT GUESS

**(a) Where does the preference live?**

| | Follows the account across devices | Startup cost | Rules change |
|---|---|---|---|
| **localStorage** (recommended first step) | No — per browser | None | None |
| **Firestore doc keyed by uid** | Yes | A new startup read | Yes, a new collection |

localStorage matches the precedent already in the codebase (`splash.js` keeps
its own preferences exactly this way) and costs nothing at startup. The
Firestore version is a real improvement but **adds a read to the startup
path, which the load-speed contract says must be flagged to the owner before
it happens (I9)** — so it cannot be slipped in quietly. Recommend shipping
localStorage first and offering the sync as its own later round.

> **RESOLVED, and the table's second row turned out to be wrong** (v07.30
> shipped localStorage; v07.37 added the sync, which the owner asked for as
> soon as phase 6 landed). The sync needed **neither a new startup read nor a
> new collection**: the language is one field on `userIndex/{uid}`, which
> every signed-in page's auth bootstrap *already* fetches to find the default
> tenant. It did need one `firestore.rules` change — `'appLang'` added to that
> document's `hasOnly()` allowlist. localStorage remains what decides the
> first paint, because the language must be known synchronously or a Bangla
> reader sees an English page appear and change under them. See
> `TRANSLATION-PLAN.md` → "The account sync". **The lesson worth carrying:
> before proposing a new collection for a preference, check what the startup
> path already reads.**

**(b) Does "language" mean one thing or two?** This is the sharper question,
and it is easy to miss. In `quranrevival.html`, `currentLang` does **two
different jobs**:

1. **Which language user-visible names appear in** — person names, Approach
   names, section names, tenant banner. This is the I11 concern, and it is
   genuinely global: it should apply to every module identically.
2. **Whether the Bangla ayah translation is shown next to the English one** —
   `translationLangs()` returns `["en", "bn"]` when `currentLang === "bn"`,
   and `wbwLangs()` follows it unless overridden.

Job 2 is arguably a *Quran reading* choice, not an app-language choice — it
belongs in the Reading view card next to the Translation picker, not in
Settings. Splitting them is the cleaner design, but it means the owner will
have two controls where they have one today, so **ask them** rather than
deciding on their behalf. There is also a wired behaviour that depends on the
current merged meaning: picking the Bangla reciter auto-switches the text to
Bangla (owner request, 8 Aug 2026 — see `renderAudioControls()`); whatever is
decided must keep that working or be raised explicitly.

### Scope boundary worth stating up front

`renderNavBar()`'s own link labels ("Quran Study", "Operation", "Homework" …)
are hardcoded English strings. A global language setting that does not
translate the nav bar is a partial feature, and translating it is a separate
I11 job across `js/nav.js`. Say so to the owner when the round is scoped —
do not let it be discovered afterwards.

### What "done" looks like

- A real, stored language preference with a shared reader (a small
  `js/prefs.js` or an addition to an existing shared module).
- The control lives under **Home → Settings**, replacing the disabled
  "Language" placeholder in `js/nav.js`. Note `nav.js` is deliberately a
  **pure renderer** with no click handlers (I2, shell round 3 — the
  categories are native `<details>`); adding a live `<select>` means either
  the renderer emits it and the caller wires it, or that purity is given up
  on purpose. Decide deliberately.
- Every page that currently hardcodes `"en"` reads the preference instead.
- `quranrevival.html`'s own Language cell leaves bar 1, and bar 1 becomes
  three cells — or gains a fourth from item 2 below. **Check the bars still
  hold one line each afterwards.**

</details>

---

## 2. The rest of the Study options organising — LARGELY DONE, 15 Aug 2026 (v07.40)

**Shell round 14 built the owner's own four-tabline brief.** Five bars now
(WHO / WHAT / FIND IT / CLAIM IT / reading-and-listening), "Tenant" and
"Person" renamed to **User Role** and **Student** at their request, Approach
moved down beside *Track this unit*, the summary strip removed, and a real
whole-Qur'an word/phrase search added on bar 3. See v07.40's paragraph in
`CLAUDE.md`. Two items from the list below are now closed and one is not:

- ~~The summary strip stays as it is.~~ **Removed at the owner's ask.** It is
  worth recording *why* the earlier "do not re-open this" no longer applied:
  round 11 offered trim / remove / keep and they chose keep, on the stated
  grounds that a 77px cell cut the tenant and Approach names and the strip was
  the only place they read in full. Round 14's two-cells-to-a-line bars fix
  that at source (160px at 390px), so the strip's remaining argument had gone.
  **Do not re-add it unprompted.**
- ~~Bars leave a dead column on a PC.~~ Fixed — a bar declares its own column
  count now. But **the panel still stops growing at 928px on any screen**
  (the page's own 60rem cap), so a 1920px monitor is half empty. Measured, put
  to the owner, and deliberately left: a real PC layout is a design change.
  **This is the live PC item.**
- **"Edit banner" still has no home** — see item 7 below, which the owner
  asked to have written down properly (15 Aug 2026). Short version: it is
  **doable and small**, it just needs somewhere to live that is not the study
  panel.
- **The "current study" readout** the owner asked to keep a note about is
  item 8 below. It is NOT the old summary strip coming back. **Note round 17
  has partly answered it**: the reading screen's own bar now names what is
  being read (`#readRef`, from `currentUnitInfo().label`), so a Range or a
  Ruku' names itself while you read it. What item 8 asks for beyond that is a
  fuller readout including the person and the Approach.
- ~~The Study screen underneath the bars has not been organised at all.~~
  **BUILT — shell round 17 (v07.43): it is no longer under the bars at all.**
  See item 9 below for what that round deliberately left.

<details>
<summary>The original item, kept for the record</summary>

### (original) 2. The rest of the Study options organising — OWNER CONTINUING

The owner's words, 13 Aug 2026: *"There's more layout organising needed …
Then I can do the rest of the layout organising."* Not yet specified — this
is a conversation to have with them, the same way shell rounds 4–11 were.
What is already known to be odd, so it does not have to be rediscovered:

- ~~The banner-admin block is the one genuinely unrelated thing in the
  panel.~~ **Removed in v07.29 (shell round 12)** at the owner's request,
  after they cleared their tenant's banner text themselves. **But it left a
  real gap: the "Edit banner" control now has no home anywhere in the app.**
  A tenant banner can currently only be set from the Firebase console.
  Nothing was destroyed — `tenants.bannerTitle`/`bannerSub` are untouched
  and `renderBanner()` still displays them (I4) — but **whoever builds the
  Settings surface in item 1 should give "Edit banner" a place in it**, and
  it is owner/prime-gated (`canAdminCatalogueClientSide()`). The old markup,
  handler and CSS are recoverable from the v07.29 commit.
- **The Study screen underneath the bars has not been organised at all.**
  Only the *controls* were grouped in round 11. Below them sit
  `#singleAyahNavRow` (Previous / position / Next), `#ayahPanels` and
  `#pageViewContainer`, in the shape they have had since Phase 5.
- **The summary strip stays as it is** — Person / Unit / Approach / Reading /
  Listening. The owner asked whether it duplicated the buttons; the answer
  was "half," they were offered trim / remove / keep and **chose keep**.
  *Do not re-open this unprompted.* If Language leaves bar 1 (item 1), the
  strip's Person and Approach chips become slightly more valuable, not less,
  since those are the two truncating selects.

</details>

---

## 3. Make the Mastery Wheel reflect the selected Study Unit — PARKED

Fully described in `CLAUDE.md` (search "Parked, owner-approved 13 Aug 2026").
Summary so it is findable from here: `renderWheel()` is hardcoded to the
**current ayah** on both axes, so for Range / Whole Surah / Ruku' / Juz /
Page the wheel shows one ayah while "Track this unit" claims something else.
v07.26's fix — keeping the dock's "Tracking:" line alive for exactly those
five units — is a correct stopgap, not the fix.

Two things make this bigger than a rendering change:

- **Juz and Page chunk to `subject_quran`**, a different records document
  from the `surah_${n}` chunk already loaded, so those two need a second
  read **on the landing page's startup path** — an I9 / load-speed-contract
  conversation, not just CSS.
- **The owner's steer:** what the wheel's centre shows for a multi-ayah unit
  is **six separate decisions, one per unit type** (`ayah` / `range` /
  `surah` / `ruku` / `juz` / `page`), not one global rule. Ask them for all
  six when the round is picked up. **Do not infer them.**

---

## 4. Choosing a translation by the translator's name — PARKED

Owner asked for it and parked it in the same message (13 Aug 2026): *"that
build we can do later … we now concentrate on organising the layout only."*

The Reading view card already carries a **disabled** `#translationChoiceSelect`
and a plain note, so the place it will live is visible and honest.

**Round 18 update (16 Aug 2026):** the two translations that ARE packaged can
now both be shown at once (independent ticks in Reading view, replacing the
one-of-two picker), and the disabled Translator control now says in plain
words why choosing by name is not possible yet. **The remaining work is
entirely the data job below** — nothing in the interface is blocking it.

**The data question comes first, and it is the whole job.**
`tools/quran-data-pull` packages one English and one Bangla translation per
ayah into the per-surah JSON files. More translators means re-pulling and
re-packaging every surah file (and re-uploading them wherever they are
served from), not adding a dropdown. Scope that before promising a picker.

---

## 5. The owner's own tenant banner — DONE, 13 Aug 2026

Their tenant's banner text used to repeat the app's own title and tagline
("QuranRevival" / "Reviving the Quran, abandoned."), so the landing page
printed it twice and it cost a visible Approach row. Carried as an open item
from v07.23 onwards, because every session since ran without Firebase
credentials and could not do it.

**The owner cleared it themselves, 13 Aug 2026.** `renderBanner()` hides the
whole strip once it is empty, so the landing page now starts ~45px higher —
worth one more Approach row on a phone. Nothing further to do. Kept here so
nobody re-opens it, and as the reason item 2's Edit-banner note exists.

---

## 6. Translating the app's own words — IN PROGRESS, see `TRANSLATION-PLAN.md`

**The owner asked for this directly, 13 Aug 2026, immediately after v07.30
shipped:** *"when we change the language, the entire app (except the Banner)
should turn into that language … A person only reads Bangla, nothing in
English. He must find things in Bangla otherwise he won't use the app."*

So this is no longer a flagged limitation — it is a six-phase build with its
own plan document. **Read `TRANSLATION-PLAN.md`**, not the description below,
which is kept only as the record of how the item was first written.

**Phase 1 (the shell) is DONE in v07.31.** Progress is measurable at any
time with `node tools/i18n-coverage.mjs`.

<details>
<summary>The original description, kept for the record</summary>

### (original) 6. Translating the app's own words — NOT BUILT, FLAGGED UP FRONT

Opened 13 Aug 2026 by shell round 13, and **stated to the owner before that
round was built rather than discovered afterwards**, exactly as item 1's own
"scope boundary" section required.

Item 1 translates **tenant-authored NAMES** — people, subjects, Approaches,
topics, ladders, levels, course offers, the tenant banner — everywhere in the
app. It does **not** translate the app's own chrome:

- `js/nav.js`'s link and category labels ("Modules", "Operation", "Quran
  Study", "Homework", "Bookmark", "Settings", "Appearance"…) are hardcoded
  English strings.
- So is every page's own heading, button, table header and helper text.

Setting the app to Bangla today gives Bangla names inside an English frame.
That is a real, honest partial — the names are the part that is
language-keyed in the data (I11); the chrome has never had a second language
anywhere to draw from.

**Why it is its own item, not a loose end of item 1:** doing it properly
means an English/Bangla string table for every user-visible literal in 19
pages plus the shared JS modules, and a lookup helper threaded through all of
them. That is a translation project, not a preference. It also needs the
owner to actually supply (or approve) the Bangla wording — nothing in the
repo can be guessed at for this.

**One measurement caution if it is ever built:** `.nav-cat > summary` is
`white-space: nowrap` + `text-overflow: ellipsis`, so a longer translated
category label fails **silently** by truncating. v07.29 already hit this with
an English rename ("Study Module" → "Modules"). Re-measure with the
`navcheck` method below any time a category label changes length.

</details>

---

## 7. "Edit banner" needs a home — DOABLE, SMALL, JUST HOMELESS

**The owner asked for this to be written down properly (15 Aug 2026), so:
this is not hard, and nothing is lost while it waits.**

**What is true right now.** A tenant's banner (`tenants.bannerTitle` /
`bannerSub`) still displays perfectly — `renderBanner()` reads it on every
load, and it is verified by a behaviour check. What is missing is only the
*editing* UI, removed from the Study options panel in v07.29 at the owner's
own request ("it is only showing 'edit banner' and taking space"). Nothing
was destroyed (I4): the fields are untouched in Firestore, and the markup,
handler and CSS are all recoverable from the v07.29 commit.

**So the only real cost of the gap** is that a banner can currently be set
only from the Firebase console. The owner has no banner set today, so nothing
is broken for them; it would bite the first *other* tenant who wants one.

**Why round 14 did not just put it back**, having been asked to raise it if a
natural place appeared: the rebuilt panel is now tightly about studying —
five bars that are all "what am I studying, how, and claiming it". A
tenant-admin control in the middle of that would undo exactly what v07.29 was
for. It does not belong there; it belongs in a Settings surface.

**Shape of the work when it is picked up** (roughly half an hour, no schema
change, no `firestore.rules` change):

- It is owner/prime-only — gate it with `canAdminCatalogueClientSide()`, the
  same check the old block used.
- Two text inputs and a Save, writing the two existing fields through
  `safeWrite()` so a failure reaches the user (I15).
- Both fields are language-keyed (I11), so the form should edit the reader's
  current language, not blindly overwrite `en`.
- Natural home: **Home → Settings**, beside the app-language control that
  item 1 built. That menu already exists and is already role-aware.

---

## 8. A "current study" readout, under a toggle — OWNER'S ASK, NOT BUILT

**Owner, 15 Aug 2026:** bring the choice-status writing back "as a display of
'current study/content' under a toggle button."

**This is NOT the old summary strip returning, and the difference matters** —
whoever builds it should not simply revert v07.41. The old strip was
*always on* and repeated what the controls beside it already said, which is
why it was removed. What is being asked for now is:

- **A reading of what is currently being studied**, not an echo of the five
  pickers — person, the unit in words ("Ayah 2:255", "Ruku' 3 of Surah 2"),
  the Approach, and whatever else names the *content* rather than the widget.
- **Behind a toggle**, so it costs nothing until it is asked for — the same
  disclosure idiom the page already uses three times over (dock tabs, Reading
  view / Listening cards, nav categories). Do not invent a fourth.
- Off by default, since the panel it lives in is itself already closed.

**What can be reused:** `renderOptionsSummary()` in the v07.41 commit is a
working, translated, `textContent`-safe builder for exactly this kind of
readout, and `currentUnitInfo().label` already produces the unit sentence in
both languages. Take the guts, not the placement.

**Ask the owner one thing before building it:** whether this readout belongs
*inside* Study options (where the old strip was) or on the landing screen
near the dock, where it would be visible without opening a panel at all. The
second is closer to "current study" as a phrase, but it costs landing height,
which rounds 9-12 spent themselves reclaiming — so it is their call, with the
pixel cost measured and put in front of them first.

---

## 9. What shell round 17 left behind — SMALL, NOT URGENT

The reading screen is built (v07.43). Four things were noticed while building
it and deliberately not done, so they are written down rather than lost:

- **The reading screen's own contents have never been organised**, only
  relocated. `#singleAyahNavRow`, `#ayahPanels` and `#pageViewContainer` are in
  the shape Phase 5 gave them. Now that they have a whole screen instead of a
  drawer, that shape is worth a look with the owner — the same conversation
  rounds 11 and 14 had about the controls. **Ask before rearranging**; nothing
  about it is broken.
- **`#readRef` and the dock's `#unitLabel` now both name the unit.** The dock
  line (v07.26) exists because the wheel's centre cannot show a multi-ayah
  unit, and it is on the *wheel* screen, so they are never both visible at
  once. Not a duplication today — but if item 3 ever makes the wheel show the
  unit, re-check both.
- **Full screen has one way out: a tap on the reading.** That is the owner's
  own design ("tapping on screen should show it again") and it is verified. If
  it ever confuses a real user, the fix is a small always-visible affordance,
  not a change of gesture.
- **A search result opens the reading underneath the still-open panel.** That
  was deliberate — clicking a second result has to keep working — so the
  reading is there the moment the panel is closed. If the owner would rather
  the panel closed on a result click, it is one line.

---

## 10. What shell round 18 left behind

- **Ruku' numbering is per-surah**, which is what `buildUnitKey.ruku` has
  always recorded (I5). So the Ruku' picker lists *this surah's* rukus, and
  changing surah changes the list. That is correct and deliberate, but it
  means there is no "Ruku' 240 of the whole Qur'an" anywhere — say so if the
  owner ever asks for one.
- **Juz/Hizb/Page pickers move the surah; the surah picker does not move
  them.** Picking Juz 5 loads Surah 4 and lands on 4:24. Picking Surah 4
  directly leaves the juz number wherever the landed ayah puts it, which is
  usually right but is not a deliberate "jump to this surah's first juz".
  The owner chose "also pickable" for both, and this is as far as that goes
  without a second, guessier rule.
- **The transport follows the APPROACH, not a reading tick.** Ticking
  Word-by-Word cannot conjure an audio panel: `renderAudioControls()` is
  still handed the Approach's own panel list. Deliberate — an Approach with
  no listening panel should not sprout a Play button.
- **Pause has no visible "paused" state beyond the button being enabled.**
  Play resumes it. If the owner reports confusion, the fix is a label swap
  (Play ⇄ Resume), not a new control.

---

## 11. Ordering: which translation above which, which reciter first — DATA READY, UI NOT BUILT

**Owner's ask, 16 Aug 2026** (raised in the same message as shell round 19, and
explicitly parked by them if it did not fit): *"Enabling choices of a
translation should show above another, a recitation to play before another."*

**Round 19 made this a UI job rather than a data one, at no cost:**

- `setQuranTranslationLangs()` (`js/prefs.js`) keeps **the caller's order**
  rather than forcing its own, so `["bn","en"]` really means Bangla first.
  `translationLangs()` hands that order straight to `renderTranslationPanel()`,
  which already renders in the order it is given.
- `drillSelectedReciterIds` records reciters **in the order they were ticked**,
  not the order they are listed, and `playDrill()` already plays them in array
  order. So "play this one before that one" is already true — it is just not
  visible or re-orderable yet.

**What is left is the control**: some way to see and change the order — drag
handles, or small up/down arrows beside each ticked item (the Catalogue page's
Modules/Subjects tables already use move-up/move-down arrows, v07.08, so that
idiom exists in this codebase and should be reused rather than a new one
invented). Two ticked things do not need a UI at all; this becomes worth
building when there are several translations (item 4) or several reciters.

**Do not "fix" the order-preserving code as if it were a bug.** It looks
redundant today because there are only two translations and the list order
usually matches. It is deliberate.

---

## 12. The moving tagline strip — BUILT, 17 Aug 2026 (v07.46)

**Shell round 20.** The owner's ask: a single line under the app banner that
cycles through short taglines, some carrying a link — some opening a page
inside the app, some an outside site in a new tab — with them as the only
person who can add or edit them. A demo artifact was shown first (the movement
options, side by side, with the pixel cost attached), the same way rounds 4–14
were agreed, and **five decisions were taken before any code was written:**

- **It stands where the tagline stood** — not an extra line. Their own call,
  and also the cheap one. **Measured: the strip is 19px against the
  paragraph's 23–24px**, so the landing page starts 3–6px HIGHER on every
  phone and **gains an Approach row at 390×844** (6 → 7 with the banner
  cleared). An extra line would have cost one row on three of the four
  phones. Desktop is 1px lower, which changes no row count anywhere.
- **Quran Study page only, for now.** Module-tagging a line is round 2 —
  nothing in `js/taglines.js` is Quran-specific except the ayah targeting.
- **Flip, Fade and Slide up all ship**, and the owner picks which is used
  ("so i can choose often, gives a variation"). Ticker was dropped.
- **It changes ONCE PER VISIT**, not every few seconds. Their words: "No
  change will be frequent. A few might stay for days, a few once a day.
  maximum 1 change per session could be." So a line has a **hold measured in
  days** and the strip is mostly a still line with one noticeable movement.
- **The lines live on the tenant document**, edited from the new
  `taglines.html` (Home → Settings, owner/prime only). **No extra read, no
  new collection, no `firestore.rules` change** — `loadContextData()` already
  fetches that document, and `canAdminIdentity()` already lets owner/prime
  write it.

**What it left for a later round, all of it deliberate:**

- **Links on four of the six shipped lines are empty**, because the owner said
  they would set them later ("I will set the links later, add/edit/delete
  later"). Two carry a real one so both kinds are demonstrably working on day
  one: `asma-study.html` (inside the app) and the archive.org poster page (new
  tab).
- **A line can be attached to ONE ayah** (`ayahRef`, written `2:255`) and shows
  the moment that ayah is open — the owner's "an article about the Ayah". A
  RANGE of ayahs, a surah, or a module is not expressible yet.
- **Per-module lines** are the round-2 half of the owner's original "which one
  to appear with which module". The field to hang it on does not exist yet;
  add `moduleIds[]` alongside `ayahRef` when the strip reaches the other pages.
- **The editing screen saves the whole list in one write.** Fine at six lines
  or sixty; if it ever grows past that, the array on the tenant document is
  the thing to reconsider, not the screen.
- **Two real defects were found by measuring, and both are worth knowing about
  if this code is touched:** asked again during the same visit (which happens
  on every ayah change, because an ayah-attached line has to be able to
  appear), a line whose hold is "every visit" advanced EVERY time — paging
  through five ayahs walked five lines, i.e. the carousel the owner did not
  want. `pickTagline()`'s `lockedId` is the fix. And the outgoing line kept
  the `tagline-in-*` class it arrived with, so the out animation never ran and
  the old line sat on top of its replacement for ~800ms until a safety
  timeout swept it up. Both have their own checks now (section 32).

---

## How these rounds are verified

Every `quranrevival.html` layout round since v07.22 has been measured, not
eyeballed, and the next one should be too. The method that works:

- Headless Chromium (Playwright) against the local server (`node serve.js`,
  port 8080).
- **Stub Firebase at the network layer** — intercept
  `https://www.gstatic.com/firebasejs/**` and `**/js/firebase-init.js` and
  serve a stub module. This matters: an earlier attempt that merely *blocked*
  the imports silently tested nothing, because the page's module script never
  ran at all. The point is to have the page's own handlers really execute.
- Real Quran data is already on disk at `tools/quran-data-pull/output`, so
  surah loading, Prev/Next and the typing field all work for real.
- Measure **before and after** by serving the previous commit's copy of the
  page alongside the new one (`git show HEAD:app/quranrevival.html`).
- **Eight** viewports, both banner states: 390×844, 412×915, 390×700, 360×640,
  768×1024, **1280×800, 1440×900, 1920×1080**, with the tenant banner set and
  cleared. The three desktop rows were added by shell round 14 and are
  permanent: before it, nothing had ever measured this page above 768px, and
  `quranrevival.html` has exactly one media query (`max-width: 720px`) — so
  every PC size took a single path no test covered.
- **The landing page is not the whole page, and neither is the panel.**
  `reading.mjs` (shell round 17) measures the reading screen — the height it
  really gets, how much ayah content that shows, and the same with Full screen
  on. It exists because **nothing measured the reading for ten layout rounds**,
  which is exactly how it ended up with 42px of Qur'an on a 360×640 phone
  while every round reported itself green. If a round touches `#readView`,
  `#stage` or the dock, run it.
- **The landing page is not the whole page.** `panel.mjs` (shell round 14)
  measures what is inside the Study options panel — bar heights, whether cells
  really share one line, and which labels and `<select>`s are being silently
  ellipsised. A round that only changes what is inside a closed panel will
  show as byte-for-byte identical in `layout.mjs`, which is the right answer
  but is not evidence that the panel itself is right.
- What to assert every time: wheel-heading top, wheel width, visible
  Approach-row count, the 9px gap above the dock, dock fully visible, no
  horizontal overflow, every `getElementById` target still resolving, and no
  page errors.

### Two practical notes added by shell round 13

- **Controls inside the nav's Home menu, and inside the dock panels, are not
  clickable until their container is opened.** Both are native `<details>` /
  hidden panels that start closed (shell rounds 4/7/12). A Playwright
  `click`/`selectOption` on `#navAppLangSelect` or `#readingViewBtn` will
  simply time out on "element is not visible" — open `.nav-cat-home` and
  press `#tabStudyOptionsBtn` first. That is the real user flow anyway.
- **The Firebase stub needs `panels: [...]` on its trackables**, or the
  Listening settings button correctly disables itself (v07.28 behaviour) and
  any audio test times out against a disabled button.
- `navcheck`: measure a nav category label by comparing the `<summary>`'s
  `scrollWidth` against its `clientWidth` at 320/360/390/412px — ellipsis
  truncation is silent otherwise.
