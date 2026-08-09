# Phase 5 — Migration & Parity — Audit & Build

Last updated: 8 August 2026 (round 9 — splash screens ported)
Read alongside `CLAUDE.md`.

---

## Position

**Round 1 was the audit below (unchanged, kept for the record).** The
owner reviewed it and said: B2 is closed (the local-only roster was test
data only, confirmed disregardable), and gave the go-ahead to build
everything the audit recommended, deferring the open design calls to
Claude's judgement rather than answering each one individually.

**Round 2 built the real Quran-parity gaps plus the migration tool.**
See "What was built this round" below, before the original audit text.

**Round 3 (6 Aug 2026): the owner's first real click-through, same
"real bugs found, fixed" discipline every prior phase has gone through.**
Five findings, four fixed, one genuinely open:

1. **Fixed, pre-existing Phase 4 bug, found while investigating**: the
   surah dropdown read `s.surahNameEnglish`, but the real field pulled
   into `surah-index.json` is `s.nameEnglish` — the dropdown has likely
   never shown a real surah name, just "1. undefined" etc., since Phase 4.
   Unrelated to Phase 5's own changes.
2. **Fixed** — "on a whole Surah choice, only first Ayah appears" / "Text
   shows something different, not the Ayah playing": whole-surah/range/
   drill playback was auto-advancing the *audio* correctly the whole
   time (Phase 4's 18/18 mocked-sequencing tests were right), but nothing
   ever told the page which ayah was actually sounding, so the visible
   text stayed frozen. New `setAyahChangeHandler()` in `audio-player.js`
   keeps the panels in sync with whatever's actually playing.
3. **Fixed** — "finished a few approaches in one Surah, checked Explore
   in that Surah, doesn't reflect": a real scoping mistake in round 2
   (Explore only showed direct Juz-level claims), not a misunderstanding
   on the owner's side. Rebuilt to pool real ayah-level progress per Juz
   ("weakest link" — a Juz only shows fully mastered once every ayah in
   it is), falling back to a direct Juz claim only when no ayah data
   exists yet.
4. **Fixed** — "we have to enable Arabic should be playing first":
   reciter now resets to Arabic on every actual surah change, without
   reintroducing the Phase 4 round-2 "reciter silently reverts" bug
   (the reset is scoped to `loadSurah()` only, not ayah nav/toggles).
5. **Left open, asked the owner rather than guess again**: whether Study
   Unit "Whole Surah"/"Range" should switch the *reading view* to show
   all those ayahs combined on one page, instead of one ayah at a time —
   this is a real, possibly sizeable feature (a genuinely different
   reading mode), not a bug fix, and Explore's scope was already wrong
   once this round. Also asked what exactly triggered the Bangla-plays-
   first report (had the owner picked Bangla earlier and it just stayed
   selected — working as designed — or did Arabic stay selected while
   Bangla audio played anyway, which would be a different, real bug).
   The reciter-default fix (#4) was shipped anyway as a safe default
   either way; the display-mode question was not, since it isn't a safe
   default to guess.

None of round 3's fixes touched `index.html` or wrote to an old
Firestore collection.

`index.html` was not touched anywhere in this process — read-only, as
always. No old Firestore collection was ever written to.

---

## Round 4 (8 Aug 2026) — beta published for real click-through; one bug found and fixed

Since round 3 the beta build (`app/`) has been mirrored to a `/beta/`
subfolder on the public `madrasatul-muslimeen.github.io` site (a separate,
additive path — `index.html`, `mushaf/`, and the Bangla timestamps file at
the site root are untouched) so the owner can click-through from any
device without needing Node/a dev server. Live at
`https://madrasatul-muslimeen.github.io/beta/app/quranrevival.html`. The
data folder (`tools/quran-data-pull/output/`) had to be published at the
site *root*, not under `/beta/`, because `quran-data.js`'s `BASE_URL` is a
domain-root-relative path (`/tools/quran-data-pull/output`) — kept
identical between the local dev server and this deployment rather than
special-cased.

Owner ran the 5-item checklist from round 3. Results:

1. Study Unit picker — OK.
2. Explore — OK.
3. Drill playback — Arabic and English reciters OK. **Bangla reciter
   failed**: "Couldn't play this audio: the audio source isn't available."
   **Real bug, fixed.** Traced against the archive.org item's own file
   listing (`archive.org/metadata/ShareefBayezidMahmud`), not assumed:
   surahs 1–100 live under the
   `Quran Bangla mp3 - Shareef Bayezid Mahmud/` subfolder as
   `001.mp3`…`100.mp3`, but surahs 101–114 were uploaded later straight at
   the item's *root*, no subfolder — `101.mp3`…`114.mp3`. The code
   (`app/js/audio-player.js`, `RECITERS.bn.surahUrl`) always prepended the
   subfolder, so every surah from 101 (Al-Kafirun) to 114 (An-Nas) 404'd —
   likely how the owner hit it, testing a short surah near the end.
   Surahs 1–100 were unaffected. Fixed with a surah-number branch, each
   path verified live against the real archive.org URLs before shipping.
4. Global banner — OK.
5. `app/migrate.html` — owner got a GitHub "page not found" for
   `.../beta/app/migrate.html`. **Not a real bug** — that error text
   (`The claude/phase-5-audit-parity-fwmt2f branch of
   QuranRevival---ClaudeCode does not contain the path...`) is GitHub's
   own 404 page, meaning the link opened was a `github.com` source-browsing
   URL against the private dev repo, not the live site. The file is live
   and returns 200 at the correct address:
   `https://madrasatul-muslimeen.github.io/beta/app/migrate.html`.

None of round 4's changes touched `index.html`, wrote to an old Firestore
collection, or touched anything outside `/beta/` and `/tools/` on the
public site.

---

## Round 5 (8 Aug 2026) — drill-sequencer bugs fixed; migration deprioritized

Owner re-tested items 3 and 5 from the round-3/4 checklist.

### Item 3 — multi-reciter drill, retested: two more real bugs, both fixed

Single-Ayah drill, all three reciters selected. Reported: "Arabic and Eng
play once (in repeat) but Bangla plays the entire Surah. Second time,
Arabic played once, Eng played twice, Bangla didn't play at all." Two
separate, genuine bugs in `app/js/audio-player.js`, not one:

1. **`playOneAndWait()`'s segmented (Bangla) branch never paused on
   reaching the ayah boundary** — it only resolved the promise, so the
   drill logically moved on to the next step while the shared `<audio>`
   element kept physically playing straight into the rest of the surah
   file. This alone explains "Bangla plays the entire Surah" on the first
   run. Fixed: `el.pause()` now runs before resolving.
2. **`seekTo()` tracked "did the source change" with a hand-set
   `el.dataset.segUrl` flag that only the segmented path ever wrote.**
   Every direct reciter (Arabic, English) sets `el.src` straight, without
   touching that flag — so after a drill stepped Arabic → English → Bangla,
   the flag still named the Bangla file from the *previous* run while the
   element's actual source was whatever direct reciter played last. The
   next Bangla turn saw a "match", skipped reloading, and just set
   `currentTime` on the wrong loaded file — audibly, nothing. This is the
   round's most likely explanation for "Bangla didn't play at all" on the
   second run. Fixed: checks the element's own `currentSrc` instead of a
   flag that can go stale.
3. **Found while tracing the above, fixed defensively**: `handleEnded()` —
   the *permanent* listener attached once when the shared `<audio>`
   element is first created — fires on every 'ended' event with no
   awareness that a drill step (`playOneAndWait`) might be the one that
   scheduled it. If the persistent Loop toggle was left on from earlier,
   unrelated testing, a direct reciter's clip finishing mid-drill would
   get replayed *in addition to* the drill's own step resolving — a
   plausible cause of "Eng played twice" specifically (English was
   immediately followed by Bangla's async `getTimestamps()` lookup, giving
   a stray replay just enough time to become audible; Arabic was
   immediately followed by English's synchronous `el.src = …`, which cut
   any stray replay off before it could be heard). Fixed: a new
   `oneShotActive` flag makes `handleEnded()` a no-op for the whole time
   `playOneAndWait()` owns the element, regardless of Loop's state.

All three fixes verified by reading the corrected control flow end to end
against the reported sequence, not just patched and assumed. Owner
re-test still needed — this class of bug (event-listener interaction
under a specific reciter order and timing) is exactly the kind that's
easy to half-fix; a real click-through is what actually closes it.

### Item 4 — `migrate.html` "loading forever": deprioritized, not investigated

Owner's decision: **the old app's data doesn't matter — it was all demo
data, nothing worth preserving.** Migration (the whole "additive import
from the old collections" job B2 was built for) is no longer something
this phase needs. Per instruction, no further engineering time is going
into `app/migrate.html`'s loading-state bug — it's left as-is,
unmaintained, not on the round-6 list unless asked for again. This also
formally closes the "migration data map" section of the round-1 audit
above: nothing in it blocks Phase 5 sign-off any more.

None of round 5's changes touched `index.html` or wrote to an old
Firestore collection.

---

## Round 6 (8 Aug 2026) — both round-3 open questions answered

### Bangla text auto-display — answered and built

**Owner's answer**: whenever the Bangla reciter is playing, Bangla text
should show automatically. Built in `app/quranrevival.html`: selecting the
Bangla reciter now sets the Language control to "English + বাংলা"
automatically (one-way — switching to a different reciter afterwards does
not take Bangla back off; matches F-060's existing additive design,
English always stays visible alongside Bangla, never replaced by it).
Deliberately scoped to the reciter *dropdown*, not to the drill sequencer
— the drill can cycle through several reciters every few seconds in "Each
Ayah" mode, and flipping the whole translation panel on every step would
be a worse experience than just leaving it alone. Owner re-test needed.

### Whole Surah / Range reading view — answered, not yet built

**Owner's answer, in full:**
- **Whole Surah**: page-by-page, styled like a standard Mushaf page. Toggle
  between Tajweed view, Word-by-Word view, and Translation view while in
  this page layout.
- **Range**: the same page-by-page Mushaf view, with the selected range
  highlighted and the rest of the page shown de-emphasized (not hidden).
  Same three toggles.

This is real, substantial new scope — it's the previously-flagged "Hifz
Mode" gap from the round-1 parity audit ("real Madani Mushaf page
rendering... not built anywhere in `app/`"), now with an actual spec
instead of a placeholder line in a gap table. It needs its own diagnosis
before any code gets written, not a quick patch:
- A real Mushaf page-layout data source — line-by-line, page-accurate
  ayah placement (QCF-style), not just the flat per-ayah text this build
  already has from `tools/quran-data-pull/`.
- How the existing Tajweed/Word-by-Word/Translation renderers (built for
  one ayah at a time in `ayah-renderer.js`) extend to a full justified
  page without a rewrite of that renderer.
- How "highlight the range, de-emphasize the rest of the page" actually
  reads at ayah-inside-a-line granularity, since Mushaf lines don't
  reliably start/end on ayah boundaries.

**Decision**: not built this round. Deliberately handed to the next
session (fresh window, same repo) as its first real build task, once the
Phase 5 loose ends above are confirmed closed — this is exactly the kind
of "diagnose before changing anything, state the blast radius before
writing code" item CLAUDE.md asks for, and it deserves a clean context
rather than being squeezed in at the end of this one.

### Non-Quran subject progress-tracking — deferred, owner's call

Raised last round as a Phase-6 blocker (Approaches only exist for Quran
today). **Owner's decision**: this needs a long discussion and real
resourcing, and should wait until every other phase that doesn't depend on
it is finished first. Not to be raised again proactively each session —
noted here once, for the record, and left alone until the owner opens it.

None of round 6's changes touched `index.html` or wrote to an old
Firestore collection.

---

## Round 7 (8 Aug 2026) — Mushaf page view built

Owner's answer on fidelity: a **true page-for-page replica** of the printed
604-page Madani Mushaf, not just Mushaf-styled flowing text.

**Correction made mid-diagnosis, worth recording**: the first pass proposed
registering for a new external API (Quran Foundation) to source page/line
layout data, on the assumption this didn't exist anywhere in this build yet.
The owner asked directly whether this was already working in `index.html`
before accepting that — it was. `index.html` already has a complete, real
Hifz Mushaf mode (`renderHifzView` and around 300 lines near it), using a
604-page layout + word-glyph JSON (`mushaf-madani-v2.json`, sourced from QUL —
qul.tarteel.ai) plus 604 QCF V2 per-page glyph fonts, both already hosted,
live, no auth needed, in the public `madrasatul-muslimeen.github.io` repo at
`/mushaf/`. No signup, no new hosting, no licence question — this data is
already in production use. The Quran Foundation path was dropped entirely.

**What was built**, reusing that same already-hosted data (`index.html`
itself untouched, reference only, logic rewritten fresh against this build's
own data shapes):

- **`app/js/hifz-renderer.js` (new file)** — the true page-for-page glyph
  renderer: fetches `mushaf-madani-v2.json` once per session, builds a
  reverse ayah→page index, loads each page's own QCF V2 font on demand,
  justifies each line to the page width (glyph fonts don't self-justify), and
  dims any word whose ayah key falls outside the requested highlight set —
  the mechanism behind Range's "highlight the selection, de-emphasize the
  rest of the page." Also exposes `setActiveAyah()`, a cheap DOM class toggle
  (no re-fetch, no re-render) so the currently-sounding ayah can highlight
  live during drill/reciter playback without the jank a full page re-render
  would cause on every ayah tick.
- **`app/quranrevival.html`** — when Study Unit is **Whole Surah** or
  **Range**, a new toggle appears: **Mushaf (real page) / Tajweed / Word by
  Word / Translation**, default Mushaf. Owner's clarification, 8 Aug 2026:
  this is **not** a panel layered on top of the glyph page — switching the
  toggle replaces the whole view. The three non-Mushaf modes reuse the
  existing, already-verified single-ayah panels from `ayah-renderer.js`
  (`renderArabicPanel`, `renderWordByWordPanel`, `renderRootDerivativePanel`,
  `renderTranslationPanel`), looped over every ayah in the selected Surah/
  Range — nothing new written there. Every other Study Unit (Ayah/Ruku'/Juz/
  Page) is completely unchanged, same code path as before. Audio and the
  multi-reciter drill (round 5) keep working in all four modes; per the
  owner's answer on audio interaction, Mushaf mode highlights whichever ayah
  is currently sounding via `setActiveAyah()`.

**Known, disclosed scope limit — not a bug**: QCF glyph fonts render each
word as one pre-drawn ligature, not letter-by-letter, so true per-letter
Tajweed coloring isn't possible on the glyph page itself. That's exactly why
Tajweed is its own separate full-page mode (ordinary Unicode text, coloured
by rule, same mechanism the single-ayah view already uses) rather than a
recoloring of the Mushaf glyphs — matches how `index.html` itself treats
Hifz and Tajweed as mutually exclusive modes, for the same underlying reason.

**Tested this round, without the owner's own sign-in** (Google sign-in needs
a real account Claude doesn't have — same limitation every phase has had):
extended `app/quranrevival-render-test.html` (the existing no-auth-needed
harness from Phase 4) with a live check against the real hosted data —
confirmed in a real browser, not assumed:
- `mushaf-madani-v2.json` fetched and parsed; Surah 1 ayahs 1–5 correctly
  resolved to Mushaf page 1.
- Page 1's real QCF V2 font and the surah-header COLOR font both reported
  `status: "loaded"` (via `document.fonts`), and the header rendered the
  correct glyph for Al-Fatiha.
- 36 words rendered across 8 lines; 14 correctly dimmed (content on page 1
  outside ayahs 1:1–1:5 — the boundary-page case Range highlighting exists
  for).
- `setActiveAyah("1:3")` correctly added the "playing" class to just that
  ayah's words, without disturbing the existing dim state and without
  re-rendering anything — confirms the live-playback hook is a cheap DOM
  update, not a refetch.
- No exceptions surfaced in the test harness's own error reporting. Three
  browser console "404" messages appeared against the same three hosted
  URLs (the JSON + two fonts) despite all three demonstrably loading
  correctly (fonts confirmed `loaded`, JSON confirmed parsed and rendered) —
  read as harmless console noise (likely a speculative/preflight request
  Chrome logs before the real fetch succeeds), not a real failure, but
  flagged rather than silently ignored.

None of round 7's changes touched `index.html` or wrote to any old Firestore
collection.

## What still needs your click-through (round 7)

1. Open a Surah, set Study Unit to **Whole Surah**, confirm the Mushaf page
   toggle appears and shows a real, readable printed-style page.
2. Switch the toggle through Tajweed / Word by Word / Translation, confirm
   each replaces the view cleanly (no leftover glyph page underneath).
3. Set Study Unit to **Range**, pick a few ayahs, confirm the Mushaf page
   highlights just those and dims the rest of the page.
4. Start a drill/reciter playback while in Mushaf mode, confirm the
   currently-sounding ayah highlights on the page as it plays.
5. Confirm Ayah/Ruku'/Juz/Page Study Units still look and behave exactly as
   before (no regression from this round's changes).

---

## Round 8 (8 Aug 2026) — shell gap, option A built

Not part of the original Phase 5 parity checklist — a separate gap surfaced
while discussing when cutover to `https://madrasatul-muslimeen.github.io/`
(the real site) can actually happen. Diagnosis, checked directly in the
code rather than assumed:

- `app/index.html` was still the Phase 0 F-001 connection-test stub,
  explicitly marked "not part of the live app."
- `catalogue.html`, `people.html`, `records.html` and `quranrevival.html`
  each independently re-run the same sign-in + tenant/role bootstrap —
  nothing shared.
- Zero `<a href="...">` links existed anywhere between the 8 pages under
  `app/` — no way to get from one to another without already knowing the
  exact URL.
- The Architecture doc's own "landing rule" ("one module → open straight
  into it; two or more → card grid") has no code anywhere implementing it.

Three options were laid out (A: small shared nav strip + entry redirect,
low risk; B: a real unified shell now, higher risk/rebuild; C: defer
entirely, ship as separate bookmarked pages). **Owner picked A.** Also
noted at this point: **no real users exist yet** — everything in the system
so far is the owner's own test data — which lowers the cost of getting this
wrong and was factored into not over-building (Option B) prematurely.

**Built:**

- **`app/js/nav.js` (new file)** — a renderer (I2: data in, HTML out, no
  Firebase calls of its own) building a small nav strip from whatever roles
  the caller already computed: Study + Records for everyone, People +
  Catalogue additionally for owner/prime. Verified with the render-test
  harness for both cases — `["self"]` gets 2 links, `["owner"]` gets 4.
- **A nav mount point added to `catalogue.html`, `people.html`,
  `records.html`, `quranrevival.html`** — purely additive: a
  `<div id="navBar">` plus two calls to `renderNavBar()` per page (once
  after sign-in, once on tenant switch, since roles can differ per tenant).
  Nothing inside any of these pages' existing logic was touched or
  restructured.
- **`app/index.html` rewritten as the real entry point**, replacing the old
  F-001 stub. Signs in, runs the same tenant/role bootstrap every other page
  already runs, then redirects straight to `quranrevival.html` — the
  landing rule's own "one module" case, since QuranRevival is still the only
  module that exists. Written so Phase 7 can add the multi-module card-grid
  branch later without a rewrite, not so it does that work now (nothing to
  branch on yet). No account found yet → links to `onboarding.html` instead
  of failing silently (I15).

**Tested this round** (pre-sign-in only — Google sign-in needs a real
account, same limitation as always): all 5 touched pages load cleanly with
no new console errors, `nav.js` verified correct for both role cases via the
render-test harness, all edited files pass a Node syntax check. **The
actual behind-sign-in behaviour — nav links appearing per role, the entry
page's redirect firing — still needs your own click-through**, same as
every round before it.

None of round 8's changes touched `index.html` (the old app) or wrote to
any Firestore collection — this is display/navigation only.

## What still needs your click-through (round 8)

1. Sign in at `quranrevival.html` (or wherever you land) and confirm the
   Study/Records/People/Catalogue nav strip appears at the top, and that
   People/Catalogue only show if you're owner or prime in that tenant.
2. Click between Study/Records/People/Catalogue and confirm each link
   actually goes to the right page.
3. Open `app/index.html` directly and confirm it signs you in and lands you
   on the Study screen automatically, without an extra click.
4. If you belong to more than one tenant, switch tenants and confirm the
   nav updates if your role differs there.

---

## Round 9 (8 Aug 2026) — the three leftover audit items, decided

Owner's answers: **Print Report — drop.** **Appearance/Theme modal — drop.**
**Splash screens — build, faithfully as they are in `index.html`**, including
the "show this opener: Every time / Once a day / Once a week" preference.

**Built**, ported (rewritten fresh, not imported — `index.html` stays
reference-only) from `index.html`'s `mm-splash-overlay` (boot) and
`mm-quran-splash-overlay` (Quran-tab entry):

- **`app/js/splash.js` (new file)** — `showBootSplash()`: Ta'awwudh then
  Basmala, 3s each, ~6.5s total. `showQuranSplash()`: the "Quran Revival"
  brand card, staggered fade-in lines over ~14s. Both identical in content
  and timing to the old app. The old app duplicated its daily/weekly
  preference logic once per splash under different key prefixes
  (`mm_splash_*` / `mm_qs_splash_*`); this shares one implementation
  parameterized by key instead — same behaviour, same localStorage keys, no
  content or timing difference from what's on record.
- **`app/index.html`** — fires the boot splash unconditionally on load,
  independent of sign-in state, same as the old app (it was the first thing
  in `<body>` there too).
- **`app/quranrevival.html`** — fires the Quran-brand splash on every real
  page load. The old app triggered this on an SPA tab-switch into Quran;
  since this build is separate pages rather than one SPA, every load of
  this page already **is** that same "entering the Quran module" moment —
  no extra wrapper needed.

**Known, disclosed consequence of building both, faithfully, as asked**:
today, since `app/index.html` immediately redirects into `quranrevival.html`
(the shell's landing rule — QuranRevival is still the only module), a fresh
sign-in shows both splashes back-to-back — roughly 20 seconds combined
before the Study screen is actually usable, on a day neither has been
dismissed yet. Not a bug — this matches exactly what the old app also did
when opening the app and immediately switching to the Quran tab. The
"Once a day"/"Once a week" preference (owner-requested, built) is what
keeps this from repeating on every visit.

**Tested this round**, via the render-test harness (trigger buttons +
`localStorage` inspection, since these fire on a timer independent of
sign-in): both splashes render their correct real content; the gear icon
opens the preference panel and selecting "Once a day" persists to
`localStorage` immediately; triggering the boot splash again after it
already ran once "today" correctly skips showing it and fires its
completion callback immediately, confirmed by inspecting `localStorage`
directly rather than assumed; `app/index.html` confirmed to show the boot
splash on a real page load, `#who` ("Not signed in.") visible underneath
exactly as the old app behaved. No new console errors introduced.

None of round 9's changes touched `index.html` or wrote to any Firestore
collection — this is client-side, `localStorage`-only display behaviour,
same as the old app's own splash preference (not synced, not tenant-scoped).

## What still needs your click-through (round 9)

1. Sign in fresh (clear the site's local storage first, or use a
   fresh/incognito profile, to see the "first ever" behaviour) and confirm
   both splashes play in order before you reach the Study screen.
2. Click the gear icon on each and set "Once a day," then reload — confirm
   it doesn't replay.
3. Confirm the "Once a week" option behaves the same way across a longer
   gap (or trust the logic, since it's the same code path as "daily," just
   a different day-count threshold).

---

## What was built this round (F-048, F-052, F-053, F-061, F-062)

1. **Study Unit picker** (`app/quranrevival.html`, `app/js/unit-keys.js`) —
   the single biggest gap from round 1: only single-ayah tracking existed
   before. Added a Study Unit selector (Ayah/Range/Whole Surah/Ruku'/Juz/
   Page), each building the correct unit key and landing in the correct
   records chunk (surah-chunked vs. subject-chunked, matching
   `records.js`'s own `chunkKeyFor` exactly). A new "Track this unit"
   button opens the Way modal scoped to whatever's selected, via a new
   `openUnitWayModal()` function kept entirely separate from the existing,
   owner-verified `openWayModal()` (wheel-click path) — zero risk of
   regressing what Phase 4 already shipped. Ruku' numbering required a
   real fix: the pulled data's `ruku` field is a *global* sequential index
   across the whole Quran, but the unit-key format needs a *per-surah*
   index — `rukuIndexInSurah()` converts one to the other, verified
   against the actual pulled data (Surah 1 = ruku 1, Surah 2 starts at
   ruku 2 and runs to 41, etc.).
2. **Explore navigator** (`app/js/mastery-wheel.js`, `app/js/quran-data.js`,
   `tools/quran-data-pull/build-juz-index.js`) — a whole-Quran "Quran-wheel"
   of 30 Juz segments, click-to-jump. Deliberately built on **direct
   Juz-level claims** (Study Unit = Juz, from the picker above) rather than
   pooling from ayah-level data live the way the legacy app had to — the
   legacy app had no direct Juz-claim concept, so pooling was its only
   option; this build does have one, so Explore just visualises those
   claims. One clean source of truth per unit key (I2/I5), no derived
   aggregate collection to keep in sync, no N-chunk-read cost on open. The
   30 Juz start/end boundaries are **computed, not remembered** — a new
   `build-juz-index.js` script scans the real pulled per-ayah `juz` field
   across all 114 surahs and writes `juz-index.json`, so the boundaries
   are verified against actual data rather than a typed-from-memory table.
   Scope cut, disclosed: only the Juz level was built (not the legacy
   app's full Quran→Juz→Surah→Ruku' nested wheel-of-wheels) — Ruku'-level
   browsing already works via the Study Unit picker's own ayah navigation,
   so a second, separate wheel for it seemed like duplication rather than
   a real gap.
3. **Multi-reciter drill/repeat playback** (`app/js/audio-player.js`) —
   the legacy app's "Each Ayah" (cycle every selected reciter N times per
   ayah before advancing) and "Whole Unit" (each reciter plays the whole
   range once, that pass repeats N times) modes, with a 1/2/3/5/10× repeat
   count. Built as a genuinely new, additive primitive
   (`playOneAndWait()` — "play this one ayah and resolve when it's
   actually finished") layered on top of the existing playback code
   without changing a single line of it — the simple Play/Play-whole-surah/
   Loop buttons Phase 4 already shipped are untouched.
4. **Global banner** (`app/quranrevival.html`) — tenant-scoped (not
   platform-wide like the legacy app's single shared banner, since D2's
   tenant isolation means there's no one shared banner to begin with).
   Reads/writes `tenants/{tenantId}.bannerTitle`/`.bannerSub` (language-
   keyed, I11), owner/prime-editable. No rules change was needed —
   `tenants/{tenantId}` was already owner/prime/platformAdmin-writable.
5. **Additive migration tool** (`app/migrate.html`) — the actual "read old,
   write new, touch nothing old" import. Preview-before-commit (nothing
   writes until you review counts and click Run), idempotent (safe to
   re-run — anything already migrated is skipped, never overwritten).
   Exact old-format conversion verified directly against `index.html`'s
   own code, not assumed:
   - Old unit-key shapes (`buildUnitKey`/`parseUnitKey`, index.html:3711)
     — `"S:A"` (ayah), `"S:start-end"` (range), `"S:surah"` (whole surah),
     `"S:rukuN"` (ruku, already surah-local/1-based — same convention the
     new schema uses), `"page:P"`, `"juz:J"` — all converted exactly.
   - Old status numbers (`STATUS_LABELS`, index.html:3495) map by meaning,
     not position, onto the new six-status set (`0 Not Started→not_started`
     … `4 Not Applicable→not_applicable`); the new build's extra
     in-between "Achieved" status is simply never produced by migrated
     data, which is correct — it didn't exist in the source.
   - Old way IDs 1–30 (`WAYS_DEFAULT`, index.html:3447) map onto
     `approach_01`…`approach_30` — verified by comparing every name, not
     assumed from matching array position alone.
   - **I16 honoured literally, not just in spirit**: every legacy
     `personId` is reused unchanged as the new `tenantPeople` document ID.
     No ID-translation table exists anywhere in the tool.
   - **Role mapping** (a design call the owner delegated): old
     `admin`→`owner`+`prime`+`self`, old `teacher`→`teacher`+`self`, old
     `student`→`self` only. Every migrated person gets `self` because
     every one of them has their own `studyProgress` history under their
     own personId.
   - **Historical data imports pre-confirmed** (another delegated call):
     migrated progress is stamped `confirmState: "confirmed"` directly
     rather than run through the live `claimStatus()` confirmation
     workflow — it's already-done, years-old study, not a new claim that
     should queue a review request for a teacher today.
   - Ruku'/Juz/Page *summary* collections (`rukuSummaries`, `juzSummaries`,
     `juzSummariesPage`) are **deliberately not migrated** — they were
     pooled aggregates the legacy app derived from ayah-level saves, not a
     separate source of truth; the new build can recompute the same
     picture live from `records`, the same way the old app pooled them.
   - **A real rules bug found and worked around while building this**:
     `tenantPeople`, `tenantInvites` and `tenantMemberUids` reads on a
     *nonexistent* document throw a permission error rather than
     returning `exists()===false` — the exact "S8-class" issue
     `firestore.rules` already patched for `records`/`subjects`/
     `trackables`/`memberships`, just never extended to these three. Not
     patched in the rules this round (out of scope for an audit-driven
     build without a rules-change conversation first) — instead the
     migration tool works around it: existence checks catch the error and
     treat it as "not migrated yet" (safe, because the create/update rules
     underneath still correctly refuse a genuine collision), and the
     `tenantMemberUids` merge step uses `arrayUnion` via a blind update
     that only falls back to create on Firestore's distinct "no document
     to update" error — a merge that can never drop a role a previous run
     already added, and needs no read at all. **Flagging the underlying
     rules gap for the owner**: worth a real S8-style fix in
     `firestore.rules` at some point, same shape as the existing patches,
     just not bundled into this round.

**Who can actually run `app/migrate.html`**: whoever is signed in as the
account holding the *old app's* `admin` role in `users/{uid}` (that's
`smahk9@gmail.com` — confirmed in `PHASE-0-STATUS.md`) — the old
`people`/`invites`/`studyProgress` collections are only readable in bulk
by that old-schema role, not by the new schema's owner/prime, and the
tool will fail closed (a clear error in the preview box) for anyone else.

## What still needs your click-through

Same reason every prior phase has needed one: nothing here has touched a
real Firebase session in this sandbox.

1. Study Unit picker — pick Range/Whole Surah/Ruku'/Juz/Page, claim a
   status, confirm it lands and the Way modal's tabs show the right thing.
2. Explore — open it, click a Juz, confirm it jumps to the right surah/ayah
   and sets Study Unit to Juz.
3. Drill playback — pick 2 reciters, try both Each Ayah and Whole Unit
   modes, confirm Stop actually stops mid-drill.
4. Global banner — edit it as owner, confirm it shows for a non-owner
   viewer too (or at least doesn't error).
5. `app/migrate.html` — run the preview first (it writes nothing), check
   the counts look sane, *then* click Run. Nothing in the old app is
   touched either way, so this is safe to try.

---

## Original audit (round 1, 5 August 2026) — unchanged below

---

## Headline finding: three of Phase 5's five listed jobs are already done

Phase 5 was reserved (`app/js/feature-registry.js`) to deliver: additive
import, old collections untouched, **B1 traced**, **backfill of stranded
summaries (B2)**, and a parity checklist. Re-reading `PHASE-0-STATUS.md`
against the live `firestore.rules` and `index.html` shows **B1 and four of
the five Step-4 security items (C1–C3, C5) were already fixed on 30–31
July**, before Phase 5 was ever opened. The Parked Items Register
(dated 5 Aug, "43 items open") was never updated to reflect this — it's
stale on six items.

| # | Register says | What's actually true (verified this session) |
|---|---|---|
| **B1** | Ruku'/Juz write path — "Step 5, traced in code, medium severity" | **Already fixed, 30 Jul.** Traced in `PHASE-0-STATUS.md`: the admin's `users/` doc had the field spelled `PersonId` instead of `personId`. The app read `undefined`, `state.activePersonId` became `undefined`, and every save went to a random Firestore document name. **Not a code bug** — re-read `index.html` lines 3897–3909 myself and the trace holds: `mmCurrentRole.personId` (the value that ends up in `state.activePersonId`) comes straight from that Firestore field. Fixed by adding the correctly-spelled field to the one affected account. Code is sound. |
| **C1** (S4) | "Deferred to Step 4" | **Live since 30 Jul.** `firestore.rules` line ~168: teacher invite reads scoped to `invitedBy == myUid()`, no teacher delete at all. |
| **C2** (S5) | "Deferred to Step 4" | **Live since 30 Jul.** `firestore.rules` line ~195: a person's `teacherId` must be the caller's own uid or match their invite. |
| **C3** (S6) | "Deferred to Step 4" | **Live since 30 Jul.** `firestore.rules` `myEmailLower()` fixes the capital-letter email bug for both invites and registration. |
| **C4** | "New field, Step 4" | **Built in Phase 1**, for the new tenant schema: `tenants.maxInvites` + quota check in `app/js/invites.js` (throws `quota-exceeded`, surfaced via `errors.js`). Doesn't apply to the old app's `invites` collection, which has no quota concept and never will (superseded by the new tenant model, per D2). |
| **C5** | "Hard requirement, Step 4" | **Built in Phase 1** (I10): `firestore.rules` `userIndex` rule — `platformAdmin` can only ever be `false` on client create/update; only the Firebase console can flip it. |

This rules file is the **merged** one (F-003, "both generations") — the
S4/S5/S6 fixes are live against the actual collections `index.html` reads
and writes today, not just the new schema. **Recommendation:** update the
Parked Items Register to move B1 and C1–C5 into a "resolved" note, the
same way S1–S3 already are. I'll do this as part of closing out this
audit unless you'd rather review the register yourself first.

### B3, B4, B5 — the other two bugs and the untested item

- **B3** (guard clause) and **B4** (parallel loading) both target
  `index.html`'s boot sequence directly — and `index.html` is never
  edited. They're moot for the live file. They're also irrelevant to the
  new build: Phase 0 already parallelizes SDK load and the new app isn't
  built with four serial round-trips to begin with, so there's nothing to
  port. **Recommend closing both as "won't do"** unless you specifically
  want the live file patched (which would mean setting aside the
  never-edit rule) — flagging that choice, not making it.
- **B5** (student-invite flow untested since the S1/S2 rules change) is
  still genuinely open — nobody has clicked through it for real since
  those fixes. Low priority; only matters if a real student reports
  trouble accepting an invite. Not blocking this phase.

---

## The real remaining job: B2, and the live parity audit

### B2 — stranded summaries — needs your input, not guessable

The four-shape legacy roster (`p1`…`p4`) exists **only in browser
localStorage**, seeded from `DEFAULT_PEOPLE` — it has never been in
Firestore (confirmed in `PHASE-0-STATUS.md`). All Firestore data observed
so far is demo/test and you've confirmed it can be recreated, which
lightens this considerably. But that observation was made against the
Firebase console, not your own browser's `localStorage`.

**Question only you can answer:** does your own browser (or any other
device that's been used for real study tracking) hold `p1`–`p4` progress
that was never synced to Firestore — i.e. real data that only exists
locally and would be lost if that browser's storage were ever cleared? If
yes, B2 needs an actual export/import tool before cutover. If no (all real
use has gone through signed-in accounts, which do sync), B2 is a
non-issue and can be closed.

### Parity checklist — old app features vs. what Phases 0–4 built

Full inventory of `index.html` (10,146 lines) cross-checked against the
actual code in `app/` — not just the phase status docs' own summaries.

**✅ Covered, built and owner-verified:**

| Old app feature | New build equivalent |
|---|---|
| Sign-in, roles, invites, roster | Phase 1 — richer role model (owner/prime/teacher/guardian/self vs. old admin/teacher/student) |
| 30 Ways / 7 sections taxonomy | Phase 2 — Trackables, tenant copy-on-write |
| Guide & Resources tab per Way | Phase 2/4 — Way modal's Guide tab (`way-modal.js`) |
| Per-ayah progress, 5-state (old) → 6-state + Not Applicable (new, I7) | Phase 3 — `records.js`, chunked storage, confirm/claim |
| Ayah text, translation (Ar/En), audio, Tajweed, word-by-word + root/derivative | Phase 4 — and now **static, pre-pulled data** (all 114 surahs) instead of live quran.com API calls + a CORS-proxy fallback the old app needed. This is a real robustness improvement, not just parity. |
| Bangla translation | Phase 4 (F-060) — old app had this too (translation id 161) |
| Reciters | Phase 4 has **4** (Basfar, Ibraheem Walk, Kevan Brighting, Bayezid Mahmud) vs. old app's **3** (Basfar, Ibrahim Walk, Sharif Bayzid) — one new reciter added, none dropped |

**⚠️ Gaps — confirmed by reading the actual new-build code, not assumed:**

| Old app feature | Status in new build | Notes |
|---|---|---|
| **Monitor / "Weekly Study Monitor"** — the entire React `StudyTracker`: weekly subject×day grid for **any** subject (not just Quran), Week/Month reports, CSV export, print, Domains tags, roster/subject setup UI | **Not built at all yet.** Correctly scoped to Phase 8 ("Monitor & reports") per the roadmap — but this is the *only* place non-Quran subjects get tracked in the old app, and it's exactly the gap CLAUDE.md's open item A26 already flags ("Approaches only exist for Quran... every other subject has no defined progress system"). Worth naming explicitly here since Phase 5 is the parity gate. |
| **5 of 6 study-unit granularities** — old app lets you study/track by Single Ayah, Range, Whole Surah, Page, Ruku', or Juz. Checked `app/quranrevival.html` directly: only Surah-select + ayah prev/next exists. No unit-type picker. | **Data layer ready, UI not built.** `unit-keys.js` already defines all 12 unit-type namespaces (ayah/range/surah/page/ruku/juz/hizb/rub/manzil/hadith/topic/name) and `records.js`'s chunking (D12) was explicitly designed around surah- vs. subject-level chunks in anticipation of this. The UI to actually *use* Range/Page/Ruku'/Juz was never wired up. |
| **Explore drill-navigator** — Quran-wheel (30 Juz) → Juz-wheel → Surah-wheel → Ruku'-wheel, letting you see progress across the *whole Quran or a whole Juz*, not just the currently-open surah | **Not built.** The new Way modal's Coverage tab is hardcoded to "this surah" only (read `way-modal.js` directly — `renderCoverageTab` takes ayahStatuses for one surah, no scope selector). Breakdown tab has no scope picker either, unlike the old app's Surah/Juz/whole-Quran choice. This is a real behavioural narrowing, not just a missing screen. |
| **Hifz Mode** — real Madani Mushaf page rendering (QCF v2 glyph fonts, line-justified) | **Not built.** No mention anywhere in `app/`. |
| **Multi-reciter drill playback** — select several reciters, sequenced; Repeat count (1/2/3/5/10×) and Repeat mode (Each Ayah vs. Whole Unit) | **Not built.** New build has per-reciter Play + a simple Loop toggle only (checked `audio-player.js`). No queueing across multiple reciters, no repeat-count/mode controls. |
| **Print Report** (per-student mastery certificate) | Not built. |
| **Appearance/Theme modal** (per-user colour customization) | Not built. |
| **Global banner** (admin-editable eyebrow/H1/sub, shown to everyone) | Not built — small, low effort when it's time. |
| **Splash screens** (boot + Quran-tab entry) | Not built — cosmetic. |
| **"Edit Bar" inline text/colour/size editing** of ~20 static labels | Not built — likely superseded by the new build's catalogue-admin screens + language-keying (I11), which solve the same underlying need ("owner can correct wording") differently and arguably better. Flagging as an architecture decision already effectively made, not a gap to port literally. |
| **Export Snapshot** (bake all data into a downloadable standalone HTML file) | Not built. This was a browser-storage-era safety net; now that data lives in Firestore with offline persistence (D5), its original purpose is largely moot. Recommend treating as intentionally dropped rather than ported. |

**Nothing found that's silently missing without a home** — every gap
above either has a named future phase already, or is called out here as a
decision to make. That's the actual point of this audit.

---

## Migration data map (the "additive import" itself)

| Old collection | Maps to (new) | Notes |
|---|---|---|
| `users`, `people` | `userIndex`, `tenantPeople`, `memberships` | Needs a role-mapping decision (below) — admin/teacher/student don't line up 1:1 with owner/prime/teacher/guardian/self |
| `invites` | `tenantInvites` | Old `invites` has no quota/token layer; new one does. One-way: old invite docs get read, never written back to |
| `teachers/{id}` (`ways[]`, `ayahs{}`, `textStyles{}`) | `trackables`, `subjects` (tenant copies) | Only matters if a teacher's copy actually diverges from the default 30 Ways — needs a real-data check, not assumed identical |
| `studyProgress`, `rukuSummaries`, `juzSummaries`, `juzSummariesPage` | `records` (chunked) | Straightforward — this is exactly the per-unit-status shape `records.js` already models. Ruku'/Juz *summaries* don't need migrating separately; they're derived aggregates the new build can recompute from `records` the same way the old app pooled them from ayah-level saves |
| `monitorWeeks` | *(no target yet — Phase 8)* | Import waits for Phase 8 to exist |
| `appSettings/global` | *(no target yet)* | Small; can land whenever the global-banner feature is built |
| `userPrefs` (theme colours) | *(no target yet)* | Same — waits for Appearance modal, if you want it rebuilt |

Every arrow above is a **read from old, write to new** script — old
collections are never written to or deleted (I4, and the standing
instruction that `index.html`'s data stays untouched).

---

## Open design questions needing your actual input

These are the kind of decisions CLAUDE.md reserves for you — not
permission-asking, genuine "which approach" calls:

1. **Role mapping.** Old `admin` → new `owner` + `prime`, both? Old
   `teacher` → new `teacher`, straightforward. Old `student` → new
   `self` or `guardian`-managed child, depending on whether they had a
   real login. I can propose a default mapping, but the *admin → owner
   vs. owner+prime* split is your call (A2 already confirmed Prime as
   "held by you, alongside owner" — so at minimum your own admin account
   becomes both).
2. **B2** — see above: is there real data trapped in a browser's
   `localStorage` that needs recovering, or is all real use already
   Firestore-synced?
3. **The five study-unit granularities + Explore navigator** — build
   these now (there's room under Phase 4's still-unused feature IDs,
   F-048/F-052–F-059) so Quran tracking has full parity before cutover,
   or defer to a later phase and cut over Quran-ayah-tracking only at
   first? This is the single largest real gap on the list.
4. **Monitor (non-Quran tracking)** — confirmed already as Phase 8's job
   and tied to the still-open A26 question. Just flagging that Phase 5
   parity, strictly read, can't fully close until that exists — unless
   you're fine with "Quran parity now, everything-else parity at Phase
   8," which is what the phase roadmap already implies.
5. **Hifz Mode, multi-reciter drill/repeat, Print Report, Appearance
   theming, Global banner, splash screens** — keep, rebuild differently,
   or drop? None of these block a Quran-only cutover; I'd suggest
   deciding per-item rather than as a block.

---

## Proposed build order, once you've reviewed the above

1. Update the Parked Items Register to close out B1, C1–C5 (resolved).
2. Build the additive import script for the migration map above
   (users/people/invites/teachers/studyProgress/rukuSummaries/
   juzSummaries/juzSummariesPage → new schema), gated behind your answers
   to questions 1–2.
3. Decide + build (or explicitly defer) the study-unit-granularity /
   Explore-navigator gap (question 3) — this is the one piece that
   affects whether "cutover" means full parity or Quran-ayah-only parity.
4. Re-verify B5 (student invite) with a real click-through.
5. Present the finished parity checklist for sign-off — the actual gate
   CLAUDE.md describes.

## Blast radius

Nothing above touches `index.html` or writes to any old Firestore
collection. The import script (step 2) only ever reads old collections
and writes new ones. Firestore rules already merge both generations, so
nothing needs to change there for this phase. No cutover happens until
you sign off on the final checklist — the live app stays exactly as it
is, unaffected, throughout.
