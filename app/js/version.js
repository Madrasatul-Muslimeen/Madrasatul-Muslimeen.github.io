// QuranRevival's own version number (confirmed with the owner 9 Aug 2026;
// the v08 line opened 6 Sep 2026): first two digits bump on a big overhaul
// -- 08 = this overhaul, opened after the v07 line was closed and frozen at
// `legacy-v07/` (07 was the cutover to production, 9 Aug 2026) -- and the
// last two digits bump on every new feature within it.
// Single source of truth -- every place that shows the version imports
// this, never retypes the string.
// 08.28, and the jump past 08.27 is a COLLISION RESOLVED rather than a gap.
// This branch reserved 08.27 while `main` was on 08.25; `main` has since
// merged 08.26 (the nav fit) and shipped 08.27 (the number pickers), so for
// a while two different builds carried 08.27 -- exactly the thing a version
// number exists to prevent. Read off `main` and every other branch at the
// time of the bump, not assumed: 08.28 was free.
export const APP_VERSION = "08.28";
