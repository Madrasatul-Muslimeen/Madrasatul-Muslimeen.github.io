# Phase 13 — Full messaging & extras — Build Log (round 1)

Read alongside `CLAUDE.md`. Built 11 August 2026, v07.15, on Claude Code on
the web (branch `claude/project-assessment-gtnghy`).

---

## Position

**Round 1 covers two of Phase 13's three deliverables: Asma ul Husna
(screensaver + study units) and the About screen. Messaging (threads,
per-person inbox) is deliberately deferred to a later round** — see
"What was deferred, and why" below. No `firestore.rules` change this round
(both new pieces ride entirely on collections/rules that already exist:
`records`/`activity` for Asma claims, `modules`/`subjects`/`trackables` for
its registration, nothing at all for About) — nothing to deploy via the
Firebase Console this time.

The feature registry's own Phase 13 row (`feature-registry.js`) is left at
`status: "planned"` on purpose, not flipped to `"built"` — messaging is the
larger of the three deliverables and isn't done. Its `delivers` text is
kept verbatim from the Architecture doc, per that file's own stated policy
("copied verbatim ... not summarized or reinterpreted" -- applies while a
phase is still `"planned"`; entries get a real custom summary once they
flip to `"built"`, see Phases 10-12's own rows). This file carries the
granular story instead.

Preceded by fixing a real stale-flag bug found while scoping this round:
**Phase 12 ("Remaining modules") was already fully built** — Arabic,
Hadith, General Study, and Nature-Life got the topic renderer in Phase 6
round 2, and Health got its own module + routine renderer in Phase 7
round 1 — but its `feature-registry.js` row was still marked `"planned"`,
same kind of drift Phase 10's own build log already flagged for Phases
6-9's rows. Flipped to `"built"` with a note pointing back to
`PHASE-6-STATUS.md`/`PHASE-7-STATUS.md`. No code changed for Phase 12
itself — it really was already done.

---

## What was built

### Asma ul Husna — study units (`app/js/asma-data.js`, new)

The 99 Names of Allah, in the standard Jami' at-Tirmidhi enumeration —
number, Arabic script, transliteration, English meaning. Pulled from a
sourced reference table (cross-checked, not reconstructed from memory --
accuracy matters for content like this) rather than typed from memory.
`meaning` is language-keyed per I11 (English filled, Bangla `null` for
now, same "first draft, correctable" status the 30 Approaches' own Guide
text already carries).

Registered the same way Quran's own static content anchors into the
catalogue (`app/js/catalogue-data.js`):
- **`MODULE_TEMPLATES`** — new module `asma` ("Asma ul Husna", 📿), its own
  renderer type (`"asma"`, not `"topic"` — its content isn't
  tenant-authored, so the topic renderer's browse/resource-attach flow
  doesn't fit).
- **`SUBJECT_TEMPLATES`** — one new anchor node, `asma_ul_husna`. Not a
  99-node tree — the 99 Names are fixed platform data, not tenant-authored
  topics, so there's nothing to browse. The node exists only so
  `records.js`'s `chunkKeyFor()` has a `subjectId` to chunk the 99 claims
  under (falls back to `subject_${subjectId}` for any unit type outside
  Quran's surah-chunked set, same as every other non-Quran module).
- **`TOPIC_TRACKABLE_TEMPLATES`** — `studied_asma`, reusing the existing
  generic `studiedTemplate()` helper (same "Studied" wording six other
  modules already use) rather than inventing a fourth trackable-name
  convention for one module.

`unit-keys.js` already reserved `name:${number}` for exactly this back in
Phase 3 (F-033) — `buildUnitKey.name(n)` was sitting there unused until now.

**`app/js/asma-renderer.js`** (new) — pure renderer (I2: HTML in/out, never
touches Firebase), a flat grid of 99 cards (Arabic, transliteration,
meaning, status chip) plus a detail view, reusing `way-modal.js`'s
Track/Guide/Breakdown tabs for claim/confirm exactly like every
topic-renderer module already does.

**`app/js/asma-study.js`** (new) — the page controller, modeled on
`topic-study.js`'s shared shape (auth bootstrap, tenant/person context,
records chunk, Way modal claim/confirm, Continue strip) but flattened —
no breadcrumb/branch browsing, since there's nothing to browse into.

**`app/asma-study.html`** (new) — same sign-in-gate/nav-bar/tenant shell
every other module page uses.

### Asma ul Husna — screensaver (`app/js/asma-posters.js`, new)

The owner supplied a poster source mid-build:
`https://archive.org/details/NamesAndAttributesOfAllah` ("Names of Allah -
POSTERS", creator Creative-Motivations.com). Checked before using it: 93
real poster images (JPG/PNG, ~55KB-900KB each), collection tags
`opensource_image`/`community`, no restrictive license on the item's own
metadata, and its own description links to
`learndeenonthego.wordpress.com` — the same "Learn Deen On-the-Go" name
already used elsewhere in this app, so this is the owner's own known,
affiliated source, not a stranger's copyrighted work picked at random.

**Deliberately not copied into this repo.** 93 images at up to ~900KB each
would be the first binary media this codebase has ever embedded — Quran
audio is streamed from reciter CDNs, never bundled (Phase 4). Instead,
`asma-posters.js` is a small list of `{ label, url }` pointing at
archive.org's own stable per-file download URLs — verified these
302-redirect to a CDN host and serve with
`access-control-allow-origin: *`, so an `<img>` tag loads one with no
proxy needed. This is the load-speed contract's own "Screensaver -- on
first use, never at startup" rule for free: nothing here is fetched until
the screensaver is actually opened.

**This poster set is a WIDER list of traditional Names than the 99-item
Tirmidhi enumeration in `asma-data.js`** (includes Ar-Rabb, Al-Ilaah,
As-Sayyid, Al-Witr, Al-Khallaq and others outside the specific 99) — kept
as its own separate list on purpose, not force-trimmed to only the
overlapping subset, and not cross-matched to `asma-data.js`'s entries
(different transliteration conventions, no reliable 1:1 mapping attempted).
The screensaver is purely decorative — cycling images with a caption, no
claim/confirm involved — while the 99-item study list stays exactly the
well-known "99 Names" the study/tracking side is meant to be.

Screensaver UI lives in `asma-study.js`/`asma-study.html` — a button opens
a full-screen overlay that cycles a poster (falling back to a text-only
slide built from `asma-data.js` for symmetry) every 6 seconds, closes on
click or the close button. Never auto-opens.

### About screen (`app/about.html`, new)

Reads `feature-registry.js`'s existing `getFullRegistry()` (built back in
Phase 0 as F-006, never actually consumed by a real screen until now) and
renders two tables: the individually-tracked Phase 0/1 features, and every
build phase's own built/planned status with its `delivers` text — plus the
current version badge (`version.js`). No Firebase writes, no new
collection; the only Firestore read is the same nav-bar role lookup every
other page already does. Linked from the nav bar's Settings category
(a real link now, sitting alongside the Language/Appearance placeholders,
not a sixth category for one link).

### Nav, version

**`app/js/nav.js`** — added "Asma ul Husna" to Study Module, "About" to
Settings (real link, not a placeholder).
**`app/js/version.js`** — bumped to `07.15`.
**`app/js/feature-registry.js`** — Phase 12's row flipped `"planned"` →
`"built"` (see "Position" above); Phase 13's row left `"planned"` — see
"Position" above for why.

---

## What was deferred, and why

**Messaging (threads, per-person inbox, unread counts, resolved/open) was
not built this round.** Two reasons, stated plainly rather than silently
skipped:

1. **Safeguarding weight.** The Architecture doc already resolves the hard
   design question (`threads.kind`, `participantPersonIds[]`,
   append-only, "Minor: guardian sees every thread, no private
   adult<->child thread" / "Adult: private teacher<->student thread
   allowed, still append-only", no group chat -- conversations stay
   student<->teacher) -- so this isn't an open design question the way
   Phase 10/11's own scope calls were. But it's still new surface area
   involving direct communication with children, and per D13's own
   spirit (lower-risk, immediately-useful work first, proven pieces before
   safety-critical ones), it's better sequenced after there's a real
   second `teacher`-only account to test against -- the same gap Phase 10
   itself is still waiting on (see `PHASE-10-STATUS.md`'s "Still open"
   section). Building a safeguarding-gated feature that can only ever be
   verified from the owner's own admin login, which bypasses every gate
   by design, isn't a real verification.
2. **Sequencing choice, not a blocker.** Asma ul Husna and About are
   smaller, don't touch safeguarding, and are useful immediately for the
   owner's own real use (D13's actual first priority) -- building them
   first isn't hiding from messaging, it's doing the lower-risk,
   real-use-now work first and leaving the safety-sensitive piece for a
   round where it can actually be proven.

Messaging's own schema (`threads/{tenantId}__{threadId}`,
`messages/{threadId}/{messageId}`) is unchanged from the Architecture
doc's own s5 table -- nothing here narrows or reinterprets it, it's simply
not built yet.

---

## Verification status

Mechanically verified during the build (no real Google account or
authenticated Firebase CLI available in this environment):

- `node --check` on every new/changed `.js` file (`asma-data.js`,
  `asma-posters.js`, `asma-renderer.js`, `asma-study.js`, `catalogue-data.js`,
  `nav.js`, `feature-registry.js`, `version.js`) -- parses cleanly.
- Both new pages' inline `<script type="module">` blocks
  (`asma-study.html`, `about.html`) extracted and `node --check`ed -- parse
  cleanly.
- One archive.org poster URL spot-checked with `curl -I` -- 302-redirects
  to a CDN host, 200s from there, `access-control-allow-origin: *` present.
- No `firestore.rules` change this round -- nothing to verify there.

**Not yet owner-verified** (needs a real signed-in browser session):

1. `asma-study.html` loads from the nav bar (Study Module category),
   version badge shows `07.15`.
2. The 99-name grid renders, each card shows Arabic + transliteration +
   meaning.
3. Claim a status on a Name, confirm it (or auto-confirms per this
   tenant's confirmation rule), confirm the card's status chip updates.
4. Open the Screensaver button -- posters cycle with captions; close button
   and click-outside both close it.
5. `about.html` loads from the nav bar (Settings category), shows the
   version badge and both tables, Phase 10/11/12 show `built`, Phase 13
   still shows `planned`.

---

## Explicitly not attempted this round (flagged, not a silent gap)

- **Messaging** -- see "What was deferred, and why" above. Real follow-up,
  not abandoned scope.
- **No Bangla for Asma ul Husna's meanings** -- English filled per I11,
  Bangla left for a later pass, same status the 30 Approaches' Guide text
  already carries.
- **No audio for the 99 Names** -- QuranRevival's own ayah audio is a much
  larger build (3 reciters, per-ayah playback/loop); out of scope for this
  round, not attempted, not promised.
- **Screensaver posters aren't cross-matched to the 99-name study list** --
  see "Asma ul Husna — screensaver" above for why that's a deliberate
  choice, not an oversight.
