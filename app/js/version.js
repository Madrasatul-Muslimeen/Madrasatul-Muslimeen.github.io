// QuranRevival's own version number (confirmed with the owner 9 Aug 2026;
// the v08 line opened 6 Sep 2026): first two digits bump on a big overhaul
// -- 08 = this overhaul, opened after the v07 line was closed and frozen at
// `legacy-v07/` (07 was the cutover to production, 9 Aug 2026) -- and the
// last two digits bump on every new feature within it.
// Single source of truth -- every place that shows the version imports
// this, never retypes the string.
// v08.29 on the unmerged Hadith branch `feature/hadith-study`; `main` is on
// v08.27. NEITHER v08.28 NOR v08.29 HAS EVER BEEN DEPLOYED -- both are
// development milestones: v08.28 is Hadith Stage A, v08.29 is Hadith Stage B
// and the final integration-candidate version.
//
// The jump past v08.27 is a COLLISION RESOLVED rather than a gap. This branch
// reserved v08.27 while `main` was on v08.25; `main` then merged v08.26 (the
// nav fit) and shipped its own v08.27 (the number pickers), so for a while two
// different builds carried one number -- exactly the thing a version number
// exists to prevent. Resolved by moving to v08.28 and then v08.29, each read
// off `main` and every other branch at the time of the bump rather than
// assumed. This comment led with "08.28" after Stage B had already moved the
// constant to 08.29: a stale comment on the single source of truth is how the
// next reader is misled, so read the constant, and read the next free number
// off `main` at the time of a bump.
// 08.30, allocated by the Master Architect for the QuranRevival MAP Phase 4
// tranche (D1 Reading, D2 Listening, D4 WbW). Read off `main` at the time of
// the bump, not assumed, and allocated centrally rather than chosen here --
// two independent builds carried 08.27 on 18 Sep 2026, which is exactly what a
// version number exists to prevent.
//
// BUILT, NOT SHIPPED. The Activity evidence Rules are not deployed (E1), so the
// subcollection is closed to every client and the tranche must not be released.
// 08.32: Basic Arabic lemma occurrence navigation, allocated by the MMSA Master Architect on 21 Sep 2026.
// 08.33: three Study-options-panel truncations fixed at phone width --
// tenantSelect (own row below 580px, since its content is free text of any
// length and cannot safely be shortened), Study Unit/Surah (wrap to two
// lines below 480px, a genuine shortage of space per Owner Control Gate item
// O3b), and the Bangla-only drillModeSelect (same wrap, same breakpoint).
// Allocated by the MMSA Architect on 22 Sep 2026, under the Owner's own
// standing authorisation for fix-list work (issue "the fix list").
// 08.34: MAP Phase 4 Activity evidence persistence ENABLED -- the governed
// decision in app/js/study-evidence-readiness.js flipped ready:false to
// ready:true, now that the Phase 3-6 Rules are deployed (confirmed by the
// Owner in the Firebase Console) and Phase 3 word-by-word progress was
// proven to save and reload on a real phone the same day ("It worked,
// switch on Phase 4."). The ✓ on #readBar, the Listening gate and the
// Word-by-Word gate all start persisting real Activity evidence from this
// version onward. Allocated by the MMSA Architect on 22 Sep 2026; see
// docs/reports/2026-09-22-map-phase4-evidence-persistence-enabled.md.
// 08.35: tap a word on the Mushaf-page Read view to open its Word Card
// (issue #188, PR #190). hifz-renderer.js's per-word glyph spans already
// carried real word identity (w.loc); this attaches the same
// data-word-occurrence id the rest of the app's word-tap already uses, so
// the existing shared click listener opens the card with no new wiring.
// Word-position parity verified across all 6,236 ayahs (3 real
// divergences found and corrected). Allocated by the MMSA Architect.
// 08.36: the same tap-to-open-Word-Card treatment for the normal, everyday
// Arabic text -- Read view and Note view both (issue #189, PR #191). The
// flowing Arabic becomes word-tappable when Tajweed display is off;
// Tajweed-on stays exactly as it was (tajweed assimilation colours across
// a word boundary on ~65% of ayahs, measured, so it cannot be safely
// split per word without data that doesn't exist here). Allocated by the
// MMSA Architect.
// 08.37: MAP Phase 6 (P6-F) Mapping My Journey round 1 -- a real, reachable
// screen (app/journey-map.html) over the already-accepted Phase 6 data
// layer, which had sat built and unreached since P6-A/P6-E. All three
// screen options the Owner asked for ("don't wait for my design, build all
// three with a toggle") in one switchable shell over one shared data load:
// Folders (system folders first, then the person's own; create/file/move),
// Timeline (newest-first, grouped by day, filter chips) and Path (an
// honest first pass -- a straight date-ordered track; the region/
// side-trail metaphor is explicitly not built, reason recorded in code and
// CHANGELOG.md, since a Note filed in two folders at once cannot honestly
// occupy two places on one line). Nav entry under Home, alongside Records/
// Monitor/About. Read-only for everyone but the Note owner, mirroring
// firestore.rules; every write gated on isSelfSelected(); Note bodies only
// ever rendered through sanitizeNoteHtml(). Full Bangla translation from
// the first commit (33 keys, verified programmatically). No new exported
// function on journey-map-service.js or note-foundation.js; no Rules,
// index or schema change. Independently re-verified by the Architect
// before merging (fresh full-history checkout, all 10 relevant suites --
// the 8 governance suites plus journey-map-boundary.mjs and the new
// journey-map-screen.mjs -- re-run clean, diff read by hand). Layout was
// NOT measured in a real browser -- this sandbox had no Playwright package
// installed at all, a harder form of the same environment gap v08.35/
// v08.36 recorded; a real-phone check at 320/360/390/412px in both
// languages, across all three views, is the recommended substitute.
// Allocated by the MMSA Architect.
// 08.38: Asma ul Husna -- Groups/Dual Names generalized into an open,
// owner-defined set of classifications (issue #202, PR #203). The Owner's
// own ask, after approving an interactive demo: "a name card should show
// the names of all LISTS it belongs to... enable me to edit/add/move/
// delete these lists." `kind` on a collection is any non-empty string now
// (was a closed "group"/"dual" set), defaulting to "group" so every
// existing tenant's data reads unchanged; a new classifications registry
// on the same asmaCollections/{tenantId} document (no new collection, no
// new read, no Rules change -- the deployed rule carries no hasOnly()
// restriction, confirmed by reading firestore.rules directly) is seeded
// with exactly "Group" and "Dual Names", so nothing changes for an
// existing tenant until the owner adds a third. A Name card gains a
// "Belongs to" section (every list, any classification, it is filed
// under) and a Names-level list row gains an "also in..." chip for a Name
// filed elsewhere too, both navigating straight to the other list. Manage
// mode gains "+ New classification". Deliberately NOT seeded: any real
// theological assignment ("Unique to Allah"/"Shared"/"By Act"/"By
// Essence") -- the issue's own explicit instruction was that curatorial
// work is the Owner's, not this round's, and the seed carries only the
// two mechanism entries every tenant already implicitly used. The
// reference-adding mechanism, poster view, Track-my-progress, extra-Name
// editing, drag-reposition and asma-study.html's own separate panel are
// all untouched, read and proven rather than assumed. New
// asma-classifications-boundary.mjs suite (26 checks) covers open `kind`,
// classifications CRUD, membershipsOfName() correctness across 3+ lists,
// I4 (archiving a classification never drops a membership), and a
// positive control on a freshly-added THIRD classification being
// reachable exactly like the seeded two. Independently re-verified by the
// Architect (fresh checkout, all 8 governance suites plus the new suite
// re-run clean, full diff read by hand, no protected path touched;
// behaviour.mjs re-run against both this branch and main under an
// available substitute Chromium build -- 785/787 identical either side,
// the 2 differences (27i, 31e) and the section-40 Mushaf crash point all
// pre-existing and environmental, none introduced by this round). This
// PR was opened by the Architect from the Builder's already-pushed,
// already-checked branch (its own PR-opening step did not execute), then
// merged by the unattended Architect workflow once `verify` reported
// green -- confirmed sound by this independent review after the fact.
// Allocated by the MMSA Architect.
export const APP_VERSION = "08.38";
