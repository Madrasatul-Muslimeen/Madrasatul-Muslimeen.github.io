# Phase 4 — QuranRevival module — Status

Last updated: 2026-08-05
Read alongside `CLAUDE.md`.

---

## Position

**Phase 4 was already built (found already committed in the repo, not built
in this session) — 5 features (F-047, F-049, F-050, F-051, F-060). Verified
by automated headless-browser testing against real pulled data with zero
errors. NOT YET owner-verified** — the authenticated, real-Firestore
end-to-end path (sign in -> claim a status -> wheel updates -> real audio
plays) needs a real browser + real Firebase session, which this pass could
not reach (see "What could not be tested" below).

`feature-registry.js` had this phase marked `status: "planned"` even though
the code existed — that was a tracking gap, not a build gap. Corrected in
this pass.

## What was built

- **QuranRevival core** (F-047) — `quran-data.js` (static per-surah JSON,
  never Firestore, per Architecture s5/I8), `ayah-renderer.js` (Arabic/
  translation panels), `mastery-wheel.js` (SVG ring, one segment per ayah,
  colour-by-status, click-to-open), `way-modal.js` (Track/Guide/Breakdown/
  Coverage tabs), and `quranrevival.html` wiring all of it to the real,
  already-verified Phase 3 `records.js`/`activity.js` functions. All **114
  surahs already pulled** (`tools/quran-data-pull/`): 6,236 ayahs, 77,429
  words, 49,971 with root/lemma/part-of-speech morphology.
- **Tajweed toggle** (F-049) — the Arabic panel switches between plain
  Uthmani text and quran.com's tajweed-tagged markup, sanitised through an
  explicit tag whitelist (`tajweedRawToSafeHtml`) rather than trusting raw
  HTML.
- **Word-by-word + root/derivative** (F-050) — two separate panels over the
  same word list, per Architecture's "two panels, not one": per-word
  Arabic/transliteration/gloss, then root/lemma/part-of-speech with a
  pre-computed root-occurrence count (from the Quranic Arabic Corpus,
  merged in at data-pull time so nothing loads the corpus client-side).
- **Audio + loop** (F-051) — 3 reciters wired: Basfar (Arabic, per-ayah --
  swapped this session to the complete `abdullah-ali-basfar.ayahbyayah`
  item), Ibraheem Walk (English, per-ayah), Kevan Brighting (English,
  whole-surah only), Shareef Bayezid Mahmud (Bangla, whole-surah with
  timestamp-based ayah seeking). Loop toggle on any of them.
- **Bangla translation** (F-060) — a checkbox switches the translation and
  word-by-word gloss panels between English-only and English+Bangla.

## Verified this session (automated, headless)

Ran two checks with a headless browser against the real pulled data (not
mocked):

1. `quranrevival-render-test.html` (no auth needed) — loaded Ayat al-Kursi
   (2:255), toggled tajweed and Bangla on, rendered the Mastery Wheel with
   fake statuses. **Zero console errors, zero failed requests.** Tajweed
   spans and Bangla glosses both appeared correctly after toggling.
2. `quranrevival.html` pre-auth load — confirmed it loads cleanly, shows
   "Not signed in" and the sign-in button, keeps the app UI hidden until
   auth resolves. The only failures logged were `ERR_CONNECTION_RESET` on
   `gstatic.com` (Firebase SDK CDN) — **this sandbox has no network route to
   Firebase**, not a bug in the app. Phases 0-3 already proved this same
   loading pattern works in a real browser.

## What could not be tested here, and needs the owner's click-through

Same reason every prior phase needed a real click-through (CLAUDE.md: the
owner can only verify by clicking, and this environment has no path to a
real Firebase session):

1. **Sign-in -> real claim -> wheel/Way-modal round trip.** `openWayModal()`'s
   claim button calls the real `claimStatus()`/`logActivity()` -- correct by
   inspection and matches the already-verified Phase 3 functions exactly,
   but has not been exercised against live Firestore in this pass.
2. **Real audio playback**, especially the Basfar swap made this session --
   the URL pattern was verified against archive.org's own file listing
   (metadata, not a browser play), not by actually pressing play.
3. **The Mastery Wheel updating after a claim**, and the Way modal's
   Breakdown/Coverage tabs reflecting a real chunk once entries exist.

## Suggested owner check (5 minutes)

1. Open `quranrevival.html`, sign in, pick a person, pick Surah 1
   (Al-Fatihah) and an Approach (e.g. "Reading (with Tajweed)").
2. Click an ayah segment on the wheel -> Way modal opens -> Guide tab shows
   real text -> claim a status on the Track tab -> modal refreshes, wheel
   segment changes colour.
3. Toggle tajweed colours and Bangla translation on the study screen.
4. Try Play on the Arabic (Basfar) reciter for a couple of different
   surahs, including a long one (e.g. Surah 2) near the end -- this is the
   exact case that used to 404 before this session's fix.

## Open item — not a bug, a hosting decision

`quran-data.js`'s `BASE_URL` still points at the local dev server's copy of
the pulled surah files (`/tools/quran-data-pull/output`), per its own
comment: "swap this one constant to the real archive.org URL once the owner
has uploaded the packaged files there." That upload hasn't happened yet.
Doesn't block any of the above -- `serve.js` serves the whole project root,
so the pulled files are reachable exactly as they are during local
testing -- but it does mean the current build isn't yet deployable as a
static site without either uploading `tools/quran-data-pull/output/` to
archive.org (per the code's own plan) or another static host. Flagging
rather than deciding -- this is a "where does this live in production"
question, not an architecture change.

## Minor note, not acted on

`activity.js`'s own header comment cites itself as "F-042"; `feature-registry.js`
recorded the same feature as F-039 back in Phase 3. A harmless numbering
mismatch in comments only (Phase 3 is closed and owner-verified, so this
wasn't reopened) -- noted here in case it's ever worth reconciling.

## Next

Waiting on the owner's click-through above. Once confirmed, this phase can
be marked owner-verified in `CLAUDE.md`'s "Current position" line, same as
Phases 0-3.
