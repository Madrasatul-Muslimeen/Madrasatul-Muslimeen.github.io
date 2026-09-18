// QuranRevival's own version number (confirmed with the owner 9 Aug 2026;
// the v08 line opened 6 Sep 2026): first two digits bump on a big overhaul
// -- 08 = this overhaul, opened after the v07 line was closed and frozen at
// `legacy-v07/` (07 was the cutover to production, 9 Aug 2026) -- and the
// last two digits bump on every new feature within it.
// Single source of truth -- every place that shows the version imports
// this, never retypes the string.
// 08.26 is NOT skipped by accident: it is already claimed by the unmerged
// Phase 4 Study-event wiring branch (`claude/phase4-wiring` at 7e2931f),
// verified by reading that branch rather than by trusting the brief. Two
// different builds carrying one version number is the kind of collision
// nobody notices until a bug report names a version that means two things.
export const APP_VERSION = "08.27";
