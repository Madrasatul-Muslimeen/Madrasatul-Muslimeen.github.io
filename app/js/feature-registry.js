// F-006 — Feature registry (Phase 0, Foundation)
//
// The single list the (future) About screen reads to tell the owner, in
// plain language, what is actually built versus only planned. A feature is
// never "done" in words only -- if it isn't in here as built, the app will
// say so.
//
// Phase 0 and Phase 1 features are listed individually below, with real
// status, since both have actually been planned and built. Phases 2-14 are
// still reserved at the ID-range level only: the source document describes
// what each of those phases delivers as a whole, not a per-ID breakdown
// yet. Inventing individual feature descriptions now would be guessing,
// not reading the architecture -- each phase gets broken down into real,
// individually named features when that phase is actually planned
// (CLAUDE.md: "one phase at a time").

export const FEATURES = Object.freeze([
  { id: "F-001", phase: 0, name: "Firebase bootstrap", status: "built" },
  { id: "F-002", phase: 0, name: "Collection map", status: "built" },
  { id: "F-003", phase: 0, name: "Merged security rules (both generations)", status: "built" },
  { id: "F-004", phase: 0, name: "Document envelope", status: "built" },
  { id: "F-005", phase: 0, name: "Language-key helpers", status: "built" },
  { id: "F-006", phase: 0, name: "Feature registry", status: "built" },
  { id: "F-007", phase: 0, name: "Write-failure surface", status: "built" },
  { id: "F-008", phase: 0, name: "Admin self-check screen", status: "built" },

  // Phase 1 — Identity & access. Originally estimated as a 12-ID range
  // (F-009..F-020) before this phase was actually planned in detail; it
  // turned out to need 9 concrete features, not 12 ("managed accounts"
  // folded into F-012 rather than needing its own). F-018..F-020 are
  // simply unused, not a gap -- a phase consuming fewer IDs than first
  // guessed isn't a discrepancy to fix.
  { id: "F-009", phase: 1, name: "Batched envelope writes", status: "built" },
  { id: "F-010", phase: 1, name: "Identity module (tenant + owner bootstrap)", status: "built" },
  { id: "F-011", phase: 1, name: "Onboarding screen + Layer-0 security rules", status: "built" },
  { id: "F-012", phase: 1, name: "Owner adds people (incl. managed/child accounts)", status: "built" },
  { id: "F-013", phase: 1, name: "Invites with quota", status: "built" },
  { id: "F-014", phase: 1, name: "Invite acceptance", status: "built" },
  { id: "F-015", phase: 1, name: "Tenant/role switcher + View as", status: "built" },
  { id: "F-016", phase: 1, name: "Study Mode handover lock", status: "built" },
  { id: "F-017", phase: 1, name: "Self-check extended for Layer 0", status: "built" },

  // Phase 2 — Catalogue. Reserved as a 12-ID range (F-021..F-032) before
  // planning; turned out to need 9 concrete features -- 7 from the initial
  // build plus 2 the owner asked for while verifying it (re-parenting and
  // archive). F-030..F-032 are simply unused, same as F-018..F-020 in
  // Phase 1 -- not a gap.
  { id: "F-021", phase: 2, name: "Module registry (platform-wide, 7 modules)", status: "built" },
  { id: "F-022", phase: 2, name: "Subject tree + ancestorIds + subjectTemplates (platform master list)", status: "built" },
  { id: "F-023", phase: 2, name: "Subject copy-on-write (tenant seeding from templates, edited flag)", status: "built" },
  { id: "F-024", phase: 2, name: "Trackables — the 30 Approaches in 7 sections, incl. Guide tab + panels", status: "built" },
  { id: "F-025", phase: 2, name: "Ladders + levels (schema + tenant-authored CRUD)", status: "built" },
  { id: "F-026", phase: 2, name: "Catalogue admin screen (catalogue.html) + Layer 1 security rules", status: "built" },
  { id: "F-027", phase: 2, name: "Self-check extended for Layer 1", status: "built" },
  { id: "F-028", phase: 2, name: "Subject re-parenting (move a node's level, cascades ancestorIds)", status: "built" },
  { id: "F-029", phase: 2, name: "Archive/Restore for subjects, trackables, ladders, levels (I4/D6 stand-in for delete)", status: "built" },

  // Phase 3 — Tracking core. Reserved as a 14-ID range (F-033..F-046)
  // before planning; needed 8 concrete features plus one small addition to
  // Phase 2's catalogue screen (the confirmationRequired toggle) that
  // doesn't warrant its own id. F-041..F-046 are simply unused, same
  // "consumed fewer IDs than first guessed" shape as Phases 1 and 2.
  { id: "F-033", phase: 3, name: "Unit keys (all 12 namespaces) + the 6 progress statuses + I7 Not-Applicable exclusion helper", status: "built" },
  { id: "F-034", phase: 3, name: "Domain tags (domains collection, D12 — supports records.entries.domainIds[])", status: "built" },
  { id: "F-035", phase: 3, name: "Records: chunked storage (one doc per surah/subject) + claim a status", status: "built" },
  { id: "F-036", phase: 3, name: "Confirmation rule — computed per person, per-subject override", status: "built" },
  { id: "F-037", phase: 3, name: "Confirm / return an entry (I6 — confirmation state frozen when marked)", status: "built" },
  { id: "F-038", phase: 3, name: "Bulk confirm — a surah/subject chunk, or a week", status: "built" },
  { id: "F-039", phase: 3, name: "Activity — one document per week, append-only, viaProgramId/viaSessionId (I3)", status: "built" },
  { id: "F-040", phase: 3, name: "Records/activity/domains screen (records.html) + Layer 2 security rules", status: "built" },

  // Phase 4 — QuranRevival module. Reserved as a 14-ID range (F-047..F-060);
  // needed 5 concrete features. F-048, F-052..F-059 are simply unused, same
  // "consumed fewer IDs than first guessed" shape as Phases 1-3. Built and
  // automated-render-tested (quranrevival-render-test.html, headless, zero
  // errors); NOT YET owner-verified end-to-end (sign-in -> claim -> wheel
  // update -> real audio needs a real browser + Firebase session, which this
  // testing pass couldn't reach -- see PHASE-4-STATUS.md).
  { id: "F-047", phase: 4, name: "QuranRevival core -- Quran static data layer (all 114 surahs pulled), ayah renderer, Mastery Wheel, Way modal, quranrevival.html wiring", status: "built" },
  { id: "F-049", phase: 4, name: "Tajweed colour toggle on the Arabic text panel", status: "built" },
  { id: "F-050", phase: 4, name: "Word-by-word panel + root/derivative panel (two panels, per Architecture)", status: "built" },
  { id: "F-051", phase: 4, name: "Audio playback + loop -- 3 reciters (Basfar Arabic per-ayah, Ibraheem Walk English per-ayah, Kevan Brighting English whole-surah, Shareef Bayezid Mahmud Bangla segmented)", status: "built" },
  { id: "F-060", phase: 4, name: "Bangla Quran translation, alongside English, across text + word-by-word panels", status: "built" },

  // Phase 5 round 1 -- closing the parity gaps the Phase 5 audit found
  // (PHASE-5-STATUS.md). F-048/F-052/F-053 use IDs already reserved for
  // Phase 4 that went unused when that phase shipped with fewer concrete
  // features than first guessed -- same "consumed fewer IDs" shape noted
  // above, filled in now that the gap they cover is real. NOT YET
  // owner-verified end-to-end -- built and syntax-checked this session,
  // needs the same real-browser click-through every prior phase has.
  { id: "F-048", phase: 4, name: "Study Unit picker -- Range/Whole Surah/Ruku'/Juz/Page tracking (previously ayah-only), correct per-type chunking and claim/confirm via the existing Way modal shell", status: "built" },
  { id: "F-052", phase: 4, name: "Explore navigator -- whole-Quran Quran-wheel (30 Juz segments) built on direct Juz-level claims, click-to-jump", status: "built" },
  { id: "F-053", phase: 4, name: "Multi-reciter drill/repeat playback -- select several reciters, Repeat count (1/2/3/5/10x), Repeat mode (Each Ayah / Whole Unit)", status: "built" },
  { id: "F-061", phase: 5, name: "Tenant-scoped global banner (legacy appSettings/global parity), owner/prime-editable", status: "built" },
  { id: "F-062", phase: 5, name: "Additive migration tool (app/migrate.html) -- old people/invites/studyProgress -> new schema, preview-before-commit, idempotent re-run, old collections never written to", status: "built" },
]);

// Phase-level reservations for everything not yet broken down individually.
// idRange is inclusive. "delivers" is copied verbatim from the Architecture
// doc's Build Phases table (section s7) -- not summarized or reinterpreted.
export const PHASE_RESERVATIONS = Object.freeze([
  { phase: 5, name: "Migration & parity", idRange: [63, 66], status: "planned",
    delivers: "B1 traced (found already resolved, Phase 0); backfill of stranded summaries (B2 -- closed, owner confirmed no real data at risk); parity checklist -- delivered, see PHASE-5-STATUS.md. Remaining: owner click-through verification of F-048/F-052/F-053/F-061/F-062" },
  { phase: 6, name: "Deen Study & topic renderer", idRange: [67, 72], status: "planned",
    delivers: "Topic renderer, Deen subjects, Monitor data migrated onto Layer 2, old sync bridge deleted" },
  { phase: 7, name: "Bookmarks, programs, routines", idRange: [73, 84], status: "planned",
    delivers: "Bookmarks (auto-resume + named, grouped by program), Continue strip, course offers with routines, LDOG module, routine renderer, in-app reminders" },
  { phase: 8, name: "Monitor & reports", idRange: [85, 96], status: "planned",
    delivers: "Two report shapes -- levels for subjects, streaks for programs. Adaptive tabs, filters computed from data, CSV, print, editable labels, export-everything" },
  { phase: 9, name: "Homework & feedback", idRange: [97, 106], status: "planned",
    delivers: "Assignments to person or class, numeric scores, confirm-with-comment, parent copy, Admin copy, teaching notes" },
  { phase: 10, name: "Classes & provider", idRange: [107, 116], status: "built",
    delivers: "Classes, enrolments, prime role (already wired since Phase 1/7/9, audited not rebuilt), real per-student teacher scoping via classes + teacherStudentLinks (replacing blanket tenant-wide teacher access), class-wide bulk confirm. See PHASE-10-STATUS.md -- homework/assignments is a flagged, deliberate exception still tenant-wide for teachers, not full 'safeguarding at scale' yet." },
  { phase: 11, name: "Curriculum, grades & resources", idRange: [117, 130], status: "built",
    delivers: "Curriculum units (cross-subject, curriculum.js) + curriculum plan (4 terms x 10 weeks, class or person context, I8 content/schedule separation), grades as dated personLevels history per ladder (never overwritten -- a correction is a new dated row, grades.js), resources browse/create screen wired to curriculum units (resources.js listResources/setResourceStatus, new). New page curriculum.html, owner/prime only. See PHASE-11-STATUS.md." },
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
