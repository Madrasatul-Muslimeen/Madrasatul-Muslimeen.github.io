// F-006 — Feature registry (Phase 0, Foundation)
//
// The single list the (future) About screen reads to tell the owner, in
// plain language, what is actually built versus only planned. A feature is
// never "done" in words only -- if it isn't in here as built, the app will
// say so.
//
// Phase 0 features are listed individually below, with real status, because
// QuranRevival_Complete_Architecture.html and CLAUDE.md name each one.
// Phases 1-14 are reserved at the ID-range level only: the source document
// describes what each of those phases delivers as a whole, not a per-ID
// breakdown yet. Inventing individual F-009...F-175 descriptions now would
// be guessing, not reading the architecture -- each phase gets broken down
// into real, individually named features when that phase is actually
// planned (CLAUDE.md: "one phase at a time").

export const FEATURES = Object.freeze([
  { id: "F-001", phase: 0, name: "Firebase bootstrap", status: "built" },
  { id: "F-002", phase: 0, name: "Collection map", status: "built" },
  { id: "F-003", phase: 0, name: "Merged security rules (both generations)", status: "planned" },
  { id: "F-004", phase: 0, name: "Document envelope", status: "built" },
  { id: "F-005", phase: 0, name: "Language-key helpers", status: "built" },
  { id: "F-006", phase: 0, name: "Feature registry", status: "built" },
  { id: "F-007", phase: 0, name: "Write-failure surface", status: "built" },
  { id: "F-008", phase: 0, name: "Admin self-check screen", status: "built" },
]);

// Phase-level reservations for everything not yet broken down individually.
// idRange is inclusive. "delivers" is copied verbatim from the Architecture
// doc's Build Phases table (section s7) -- not summarized or reinterpreted.
export const PHASE_RESERVATIONS = Object.freeze([
  { phase: 1, name: "Identity & access", idRange: [9, 20], status: "planned",
    delivers: "tenants, people, memberships, userIndex, invites with quota, role switching, tenant switcher, View as, managed accounts, Study Mode handover lock" },
  { phase: 2, name: "Catalogue", idRange: [21, 32], status: "planned",
    delivers: "Module registry, subject tree with ancestors, templates + copy-on-write, 30 approaches as trackables in 7 sections, Guide tab fields, ladders and levels" },
  { phase: 3, name: "Tracking core", idRange: [33, 46], status: "planned",
    delivers: "records (chunked), activity (weekly), 6 statuses, Not-Applicable exclusion, unit keys incl. hizb/rub/manzil, domainIds, confirmation + bulk confirm + return" },
  { phase: 4, name: "QuranRevival module", idRange: [47, 60], status: "planned",
    delivers: "Ayah renderer, Mastery Wheel, Way modal (Track/Guide/Breakdown/Coverage), panels per approach, approach dropdown, tajweed toggle, word-by-word, audio + loop, Bangla Quran translation" },
  { phase: 5, name: "Migration & parity", idRange: [61, 66], status: "planned",
    delivers: "Additive import from the old file; old collections untouched; B1 write-path bug traced; backfill of stranded summaries; parity checklist -- owner sign-off" },
  { phase: 6, name: "Deen Study & topic renderer", idRange: [67, 72], status: "planned",
    delivers: "Topic renderer, Deen subjects, Monitor data migrated onto Layer 2, old sync bridge deleted" },
  { phase: 7, name: "Bookmarks, programs, routines", idRange: [73, 84], status: "planned",
    delivers: "Bookmarks (auto-resume + named, grouped by program), Continue strip, course offers with routines, LDOG module, routine renderer, in-app reminders" },
  { phase: 8, name: "Monitor & reports", idRange: [85, 96], status: "planned",
    delivers: "Two report shapes -- levels for subjects, streaks for programs. Adaptive tabs, filters computed from data, CSV, print, editable labels, export-everything" },
  { phase: 9, name: "Homework & feedback", idRange: [97, 106], status: "planned",
    delivers: "Assignments to person or class, numeric scores, confirm-with-comment, parent copy, Admin copy, teaching notes" },
  { phase: 10, name: "Classes & provider", idRange: [107, 116], status: "planned",
    delivers: "Classes, enrolments, prime role, teacher assignment, class-wide bulk confirm, safeguarding rules at scale" },
  { phase: 11, name: "Curriculum, grades & resources", idRange: [117, 130], status: "planned",
    delivers: "Curriculum units (cross-subject), plan separate from content, 4 terms x 10 weeks, grades per ladder, dated level history, resources as links and text" },
  { phase: 12, name: "Remaining modules", idRange: [131, 140], status: "planned",
    delivers: "Arabic, General Study, Health, Nature-Life, Hadith -- all as data on existing renderers" },
  { phase: 13, name: "Full messaging & extras", idRange: [141, 152], status: "planned",
    delivers: "Threads, per-person inbox, unread counts, resolved/open, Asma ul Husna screensaver + study units, About screen reading the feature registry" },
  { phase: 14, name: "Operations", idRange: [153, 175], status: "planned",
    delivers: "4A calendar, 4B timetable, 4C sessions (classId optional), 4D attendance (students and teachers), 4E availability and cover, 4F notices, 4G admissions, 4H staff records" },
]);

/** Everything the About screen needs: named Phase 0 features plus reserved ranges for the rest. */
export function getFullRegistry() {
  return { features: FEATURES, phaseReservations: PHASE_RESERVATIONS };
}

export function countBuilt() {
  return FEATURES.filter((f) => f.status === "built").length;
}
