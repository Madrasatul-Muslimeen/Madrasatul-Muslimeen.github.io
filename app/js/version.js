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
export const APP_VERSION = "08.30";
