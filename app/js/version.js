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
export const APP_VERSION = "08.36";
