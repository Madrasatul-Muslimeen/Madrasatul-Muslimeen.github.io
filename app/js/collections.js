// F-002 — Collection map (Phase 0, Foundation)
//
// Every Firestore collection name, in one place, as a constant. New code
// must import from here and never type a collection name as a bare string
// (this is the whole point: a single typo here breaks a test write
// immediately, instead of silently inventing the wrong address the way
// bug B1 did).
//
// Two generations coexist on purpose (D1 — one Firebase project, shared
// users and history):
//   - LEGACY:  what index.html reads and writes today. Untouched.
//   - TENANT:  the new schema this rebuild is creating. Named tenantPeople /
//              tenantInvites instead of people / invites so the two
//              generations can never collide (D2, approved deviation).
//
// Deliberately NOT listed: Operations, Finance, Medical records, or
// Facilities collections (Architecture layers 3.5, 4, 5, 6). CLAUDE.md is
// explicit that those are not to be built unless asked — so there are no
// names to reserve for them yet.

export const LEGACY = Object.freeze({
  APP_SETTINGS: "appSettings",
  INVITES: "invites",
  JUZ_SUMMARIES: "juzSummaries",
  JUZ_SUMMARIES_PAGE: "juzSummariesPage", // O1 — presence unconfirmed
  MONITOR_WEEKS: "monitorWeeks", // O1 — presence unconfirmed
  PEOPLE: "people",
  ROOMS: "rooms", // O2 — origin unknown, deliberately locked, do not write
  RUKU_SUMMARIES: "rukuSummaries",
  STUDY_PROGRESS: "studyProgress",
  TEACHERS: "teachers",
  USER_PREFS: "userPrefs",
  USERS: "users",
});

export const TENANT = Object.freeze({
  // Layer 0 — identity
  TENANTS: "tenants",
  TENANT_PEOPLE: "tenantPeople", // D2: was "people" in the Architecture doc
  MEMBERSHIPS: "memberships",
  USER_INDEX: "userIndex",
  TENANT_INVITES: "tenantInvites", // D2: was "invites" in the Architecture doc
  TENANT_MEMBER_UIDS: "tenantMemberUids", // Phase 1 addition (D9): rules-support mirror, keyed by uid so security rules can look up role membership without a query. Never shown in any UI.
  INVITE_TOKENS: "inviteTokens", // Phase 1 addition (D9): opaque link codes, so invite links never carry a raw email in the URL

  // Layer 1 — catalogue and org
  MODULES: "modules",
  SUBJECTS: "subjects",
  SUBJECT_TEMPLATES: "subjectTemplates",
  LADDERS: "ladders",
  LEVELS: "levels",
  PERSON_LEVELS: "personLevels",
  CLASSES: "classes",
  COURSE_OFFERS: "courseOffers",
  ENROLLMENTS: "enrollments",
  CURRICULUM_UNITS: "curriculumUnits",
  CURRICULUM_PLAN: "curriculumPlan",
  RESOURCES: "resources",

  // Layer 2 — tracking core
  TRACKABLES: "trackables",
  RECORDS: "records",
  ACTIVITY: "activity",
  BOOKMARKS: "bookmarks",

  // Layer 2.5 — communication
  THREADS: "threads",
  MESSAGES: "messages", // subcollection: threads/{threadId}/messages/{messageId}
  TEACHING_NOTES: "teachingNotes",

  // Layer 3 — homework
  ASSIGNMENTS: "assignments",
  SUBMISSIONS: "submissions",
});
