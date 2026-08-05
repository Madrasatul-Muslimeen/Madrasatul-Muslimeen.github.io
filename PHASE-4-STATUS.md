# Phase 4 — QuranRevival module — Status

Last updated: 2026-08-05 (round 2 -- owner click-through fixes)
Read alongside `CLAUDE.md`.

---

## Position

**Phase 4 was already built (found already committed in the repo, not built
in this session) — 5 features (F-047, F-049, F-050, F-051, F-060).** Items
1-3 of the owner's own click-through checklist (sign-in/claim/wheel round
trip, tajweed/Bangla toggle) passed. Item 4 (audio) surfaced 3 real
issues, plus 2 more the owner raised separately (Bangla word-by-word,
Approach/section names not language-aware) — all 5 addressed in round 2
(see below).

**Round 2's owner re-test (Edge) found it still hadn't reached `main`** --
the fixes existed on the feature branch but nothing had merged them, so
only round 1's Basfar swap was actually live; everything else in round 2
was, correctly, still missing. **Merged to `main` this round (PR #2,
`a556a86`).** As deep a verification pass as this sandboxed environment
allows was run against the merged code -- see "Round 3" below for exactly
what that covers and, importantly, what it still can't: this environment
has no browser network route to archive.org or Firebase (confirmed via a
proxy test against several other domains too -- a policy boundary, not a
misconfiguration), so the owner's own click-through is still the only way
to confirm real playback and the real sign-in/claim/wheel round trip on
the round-2 fixes specifically.

`feature-registry.js` had this phase marked `status: "planned"` even though
the code existed — that was a tracking gap, not a build gap. Corrected in
round 1.

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

## Suggested owner check, round 2 (hard-refresh first -- Ctrl+Shift+R /
Cmd+Shift+R -- in case round 1's issues were a stale-cache artifact)

1. Reciter dropdown: pick Kevan Brighting, then navigate to the next ayah
   or toggle tajweed -- the dropdown should still say Kevan, not silently
   jump back to Basfar.
2. Basfar (Arabic): Play on a few ayahs across different surahs, including
   near the end of a long one (e.g. Surah 2, ayah 280+). If it still
   doesn't play, an alert should now pop up explaining why (network error /
   file not found / etc.) -- please pass that message along, it'll pinpoint
   the real cause.
3. "Play whole surah" on Ibraheem Walk (English) and Bayezid Mahmud
   (Bangla) -- both should now continue automatically from one ayah to the
   next without stopping after the first. Try Loop too -- it should replay
   the whole surah, not just the first ayah.
4. Word-by-word: set Language to Bangla and confirm the word-by-word panel
   shows Bangla now. Also try the new "Word by Word" control next to it
   (only appears for an Approach with a word-by-word panel, e.g. "Reading —
   Word-by-Word Meaning") -- English only / Bangla only / both.
5. Set Language to Bangla and check the Approach dropdown -- names and
   section headers should show in Bangla. If they still show English only,
   that's expected for a tenant that seeded its catalogue before this
   session *and* isn't owner/prime (the sync only runs for owner/prime) --
   otherwise flag it.

## Round 2 — owner click-through findings (5 Aug 2026) and fixes

Same discipline as every prior phase: the owner ran it for real and found
real issues. Five items, all addressed:

1. **Basfar (Arabic) not playing.** Verified independently, twice: (a) the
   archive.org item's own file listing -- every real ayah file (6,236 of
   them) is present, byte-identical response shape (`200`, `audio/mpeg`,
   CORS `access-control-allow-origin: *`) to the Ibraheem Walk item that
   *does* play for the owner; (b) the coded URL-builder logic itself, unit-
   tested against a mocked `<audio>` element -- produces the right URL every
   time. Nothing found wrong in the data or the code. Could not reproduce
   the failure directly in this sandbox (no browser network route to
   archive.org here at all -- see Phase 4 round 1 notes on `gstatic.com`
   for the same limitation). Most likely explanation: a browser-cached copy
   of `audio-player.js` from before the round-1 fix merged to `main`.
   **What changed regardless:** `audio-player.js` never had an `error`
   listener on the shared `<audio>` element -- a real failure (network drop,
   404, corrupt file) had nowhere to go and just looked like "nothing
   happens." Added `setPlaybackErrorHandler()`, wired to an `alert()` in
   `quranrevival.html`, so any future failure -- this one included, if it
   recurs -- now surfaces exactly what went wrong (I15's "a failure must
   reach the user" applied to audio, not just writes).
2. **Kevan Brighting (English) "not there."** Verified the coded filename
   list (`ENGLISH_FILENAMES`) against the archive.org item's real file
   listing -- all 114 entries match byte-for-byte. The real bug: the reciter
   dropdown was rebuilt from scratch on every ayah navigation, tajweed
   toggle, and Bangla toggle (`renderAudioControls()` runs inside
   `renderStudyScreen()`, which runs on all of those) -- so picking Kevan
   and then doing almost anything else silently reverted the selection back
   to the first option (Arabic Basfar) without any visible sign it had
   happened. **Fixed:** the chosen reciter and Loop state are now held in
   page-level variables and re-applied every time the control is rebuilt.
3. **Ibraheem Walk and Bayezid Mahmud "played on click but not auto playing
   one to another."** Real, and two different causes:
   - For segmented (Bangla) playback, there was **no auto-advance
     mechanism of any kind** -- `playSegmentedAyah()` could only play one
     ayah and stop (or loop back onto itself). Not a regression, never
     built.
   - For direct per-ayah playback (Basfar, Ibraheem Walk), auto-advance via
     `playAyahRangeAsPlaylist()` existed but only for "Play whole surah,"
     and Loop on a range got stuck replaying the *first* ayah forever
     instead of looping the whole range.
   **Fixed:** rebuilt as one unified `playAyahRange()` used by both direct
   and segmented reciters, auto-advancing ayah-by-ayah either way, with
   Loop now wrapping the *whole range* rather than one ayah. Also fixed a
   real latent bug found while rebuilding this: `playSegmentedAyah()` never
   removed its previous `timeupdate` listener before adding a new one, so
   navigating ayahs quickly left multiple stale boundary-checks (each with
   its own stale end time) stacking up on the same `<audio>` element.
   Verified with a headless-browser test using a mocked `Audio` element and
   a mocked timestamp fetch (no real network needed) -- 18/18 checks pass,
   including "direct range visits N distinct ayah URLs in order," "loop
   wraps back to the first ayah," and "segmented range auto-advances across
   two ayah boundaries then stops."
4. **Bangla word-by-word "shows only English."** The data was not the
   problem -- checked all 114 pulled surah files: **100% of the 77,429
   words have a Bangla gloss.** The renderer was not the problem either --
   already verified in round 1 that toggling Bangla on shows both languages
   for a real ayah. Root cause not conclusively identified (same "couldn't
   reproduce with no external network in this sandbox" limitation as item
   1) -- most likely the same stale-cache explanation. Rather than leave it
   there, built what the owner explicitly asked for as the fallback: word-
   by-word now has its own language control (`wbwLangSelect` --
   auto/English-only/Bangla-only/English+Bangla), independent of the main
   translation toggle, via a new `opts.wbwLangs` override in
   `renderLayoutA()`. "Auto" (the default) still does the originally-
   intended thing -- follows whatever the main Language selector is set to.
5. **Approach and section names not language-aware.** New request, done
   now per the owner's explicit ask. Added Bangla text for all 30 Approach
   names and all 7 section names in `catalogue-data.js` (a `nameLang()`
   helper alongside the existing `en()` one; guide text and the subject
   tree stay English-only for now -- out of the stated scope). The
   Approach dropdown is now grouped by section (`<optgroup>`, labelled in
   the current language) -- a real usability improvement, and the only
   place section names actually appear in the UI. Person names now follow
   the same language selector too (`langText()` was already being called
   with a hardcoded `"en"` throughout `quranrevival.html`; now uses the
   live selection everywhere, with its existing English fallback for
   anything not yet translated). **Already-seeded tenants:** trackables are
   copy-on-write (Phase 2), so a tenant that seeded its catalogue before
   this session has its own frozen copy of the old English-only names.
   Added `syncUnneditedTrackableNames()` (`catalogue.js`) -- refreshes
   `name`/`groupName` on any trackable the tenant hasn't edited
   (`edited !== true`, the same "update-without-overwrite" rule Phase 2
   already uses for subjects), called automatically on page load for an
   owner/prime viewer, silently skipped for anyone else (write access is
   owner/prime/platformAdmin only per Layer 1 rules — matches
   `canAdminCatalogue()` client-side, same pattern already used in
   `catalogue.html`).

All of the above verified with headless-browser tests against real pulled
data (render/DOM checks) and a mocked-`Audio` unit test (playback-sequencing
logic) -- 18/18 checks passing. **Not yet verified live** -- items 1 and 4
in particular could not be reproduced or disproven in this sandbox (no
network route out to archive.org or Firebase from the headless browser
here), so the real test is the owner's next click-through.

## Round 3 — merged to main, deepest verification this environment allows (5 Aug 2026)

Owner asked for the merge and the confirmation to be done directly, not
handed back as another click-through request. Did both, as far as this
sandbox genuinely allows:

1. **Merged.** Opened and merged PR #2 (`claude/project-context-review-ff986j`
   -> `main`, commit `a556a86`). Confirmed `main` now contains the round-2
   commit (`git merge-base --is-ancestor` check, not just "the push
   succeeded"). Local working tree diffed against the merged `main` --
   identical, byte for byte.
2. **Re-ran every automated check against the merged code** (not the
   pre-merge branch): the render-test page, the full-page pre-auth load,
   and the 18-check mocked-`Audio` sequencing test. All still pass, 0
   failures.
3. **Tried to get real network access into the headless browser**, to
   actually press play against archive.org for real instead of only
   testing the logic with a mock. Configured Chromium to go through this
   session's own outbound proxy. Result: still blocked, and confirmed *why*
   -- tested several other unrelated domains (`example.com`,
   `raw.githubusercontent.com`, `archive.org`) through the same proxy
   config and every one of them was refused at the connection stage,
   distinct from a real TLS/cert failure (one domain, `api.github.com`, got
   *past* the connection stage and failed on a cert-trust issue instead --
   showing the block is a deliberate policy allowlist, not something to
   route around, and not a bug in this app). Real in-browser playback is
   only confirmable from a real browser outside this sandbox -- i.e. the
   owner's.
4. **What curl *can* reach, though, is real archive.org data** (this
   session's Bash tool has its own separate, allowed network path -- the
   metadata checks in rounds 1-2 already relied on this). Used it to go
   one level deeper than before: downloaded the actual audio bytes (not
   just HTTP headers) for one file from each of the four reciters,
   including Basfar surah 2 ayah 286 specifically -- the exact "near the
   end of a long surah" case that used to 404 before round 1's fix. Every
   download completed at exactly its declared `Content-Length` (no
   truncation), and every file parses as a structurally valid MP3 (correct
   frame sync bytes, sane bitrate/sample-rate fields) rather than an HTML
   error page or a corrupt/partial file:

   | File | Bytes | Valid MP3 frame | Bitrate / sample rate |
   |---|---|---|---|
   | Basfar 1:1 | 270,668 | yes | 192kbps / 44100Hz |
   | Basfar 2:286 (the previously-failing case) | 1,497,258 | yes | 192kbps / 44100Hz |
   | Ibraheem Walk 1:1 | 171,910 | yes | 192kbps / 44100Hz |
   | Kevan Brighting, Al-Fatihah | 651,375 | yes | 128kbps / 44100Hz |
   | Bayezid Mahmud, surah 1 | 654,957 | yes | 64kbps / 48000Hz |

**Net effect: every mechanically-checkable layer now checks out** -- the
files exist, are complete, are structurally valid audio, are named/URLed
exactly as the code expects, and the code's own playback-sequencing logic
(auto-advance, loop, language switching, dropdown persistence) is verified
correct against a simulated player. **What remains unconfirmed, and can only
be confirmed from a real browser:** whether audio actually produces sound
when played (needs a real audio pipeline, not just a valid file), and the
full authenticated round trip (real Google sign-in, real Firestore
claim/confirm, the wheel/Way-modal update, and the `syncUnneditedTrackableNames`
backfill actually running against a real tenant) -- none of that is
reachable from here at all, sandboxed or not, without real credentials this
session doesn't have and shouldn't try to obtain another way.

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
