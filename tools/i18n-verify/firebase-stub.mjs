// Firebase stub served AT THE NETWORK LAYER (LAYOUT-BACKLOG.md's own method).
// The point is that the page's real module script runs — an earlier round
// found that merely *blocking* the imports silently tested nothing, because
// the module script never executed at all.
export const STUB = `
const TENANT_ID = "t1";
const UID = "test-uid";

// ---------------------------------------------------------------------------
// Round-trip instrumentation (added by the load-speed round, Aug 2026).
//
// A stub answers instantly, so on its own it can never show real latency --
// it would report every page as taking ~0ms no matter how many reads it
// makes. So every function here that is a real NETWORK call in production
// goes through __trip(): it records the call (name, collection, start, end)
// on window.__fsLog, and waits __LATENCY__ ms before resolving. With the
// latency set to a realistic mobile round trip, wall-clock time becomes
// meaningful again, and the log shows which calls waited on which.
//
// Default latency is 0, so the translation suites behave exactly as before.
// ---------------------------------------------------------------------------
const LATENCY = __LATENCY__;
try { window.__fsLog = []; } catch (e) {}
let __seq = 0;
async function __trip(kind, col, id, produce) {
  const rec = { n: ++__seq, kind: kind, col: col, id: id || null, t0: performance.now(), t1: null };
  try { window.__fsLog.push(rec); } catch (e) {}
  if (LATENCY > 0) await new Promise(function (r) { setTimeout(r, LATENCY); });
  rec.t1 = performance.now();
  return produce();
}

function lang(en, bn) { return bn ? { en, bn } : { en }; }

// activity documents are fetched by an EXACT id containing the week key, so
// the seeded week has to be whichever week the suite is being run in.
// Mirrors activity.js's own weekKeyFor(date, weekStartsOn: 6).
const TODAY = new Date().toISOString().slice(0, 10);
const THIS_WEEK = (() => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() - 6 + 7) % 7));
  return d.toISOString().slice(0, 10);
})();

const APPROACHES = [
  ["memorise", "Memorise (Hifz)", "মুখস্থ করা", "Preservation", "সংরক্ষণ"],
  ["recite", "Recite correctly", "সঠিকভাবে তিলাওয়াত", "Preservation", "সংরক্ষণ"],
  ["tajweed", "Tajweed rules", "তাজবীদের নিয়ম", "Preservation", "সংরক্ষণ"],
  ["listen", "Listen attentively", "মনোযোগ দিয়ে শোনা", "Engagement", "সম্পৃক্ততা"],
  ["read_daily", "Read daily", "প্রতিদিন পড়া", "Engagement", "সম্পৃক্ততা"],
  ["translate", "Understand translation", "অনুবাদ বোঝা", "Understanding", "উপলব্ধি"],
  ["tafsir", "Study tafsir", "তাফসীর অধ্যয়ন", "Understanding", "উপলব্ধি"],
  ["word_by_word", "Word by word", "শব্দে শব্দে", "Understanding", "উপলব্ধি"],
  ["reflect", "Reflect (Tadabbur)", "তাদাব্বুর", "Reflection", "প্রতিফলন"],
  ["act", "Act upon it", "আমল করা", "Action", "আমল"],
];

const DATA = {
  tenantMemberUids: [
    { _id: TENANT_ID + "__" + UID, tenantId: TENANT_ID, uid: UID, personId: "p1", roles: ["owner", "prime"] },
  ],
  tenants: [
    { _id: TENANT_ID, name: lang("Madrasatul Muslimeen", "মাদরাসাতুল মুসলিমীন"), weekStartsOn: 6, __BANNER__ },
  ],
  // The doc id is the BARE personId, not tenantId-prefixed -- people.js
  // writes it that way (docId: personId), and every screen uses the snapshot
  // id as the personId when building a records/activity/submission doc id.
  tenantPeople: [
    { _id: "p1", tenantId: TENANT_ID, personId: "p1", name: lang("Ahsan", "আহসান"), roles: ["owner", "prime"] },
    { _id: "p2", tenantId: TENANT_ID, personId: "p2", name: lang("Maryam", "মারইয়াম"), managedByPersonId: "p1", isMinor: true, roles: ["student"] },
  ],
  trackables: APPROACHES.map((a, i) => ({
    _id: TENANT_ID + "__" + a[0], tenantId: TENANT_ID, subjectId: "quran", order: i, status: "active",
    name: lang(a[1], a[2]), groupName: lang(a[3], a[4]),
    guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") },
    panels: ["text", "audio", "loop", "tajweed", "wordByWord"],
  })).concat([
    // PHASE 6. asma-study.js bails out of the way modal entirely when its
    // one trackable is missing, so without this row the modal title -- the
    // one place the Name is drawn outside the grid -- could never be
    // proved translated. (No backticks anywhere in this file: the whole
    // stub is one template literal, and a stray one would end it early.)
    { _id: TENANT_ID + "__studied_asma", tenantId: TENANT_ID, subjectId: "asma_ul_husna",
      order: 0, status: "active", name: lang("Studied", "অধ্যয়ন করা হয়েছে"),
      groupName: lang("Understanding", "অনুধাবন"),
      guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") },
      panels: ["text"] },
  ]),
  subjects: [
    { _id: TENANT_ID + "__quran", tenantId: TENANT_ID, subjectId: "quran", parentId: null,
      name: lang("Quran", "কুরআন"), moduleIds: ["quranrevival"], ancestorIds: [], status: "active", isTrackable: true },
    // ENGLISH-ONLY on purpose: this is the shape real seeded tenant data has.
    // If these render in Bangla, the langText() catalogue fallback works and
    // no data migration was needed.
    { _id: TENANT_ID + "__deen_study", tenantId: TENANT_ID, subjectId: "deen_study", parentId: null,
      name: lang("Deen Study"), moduleIds: ["deen"], ancestorIds: [], status: "active", order: 1 },
    { _id: TENANT_ID + "__deen_ethics", tenantId: TENANT_ID, subjectId: "deen_ethics", parentId: "deen_study",
      name: lang("Ethics"), gloss: lang("Social conduct"), moduleIds: ["deen"], ancestorIds: ["deen_study"], status: "active", order: 1, isTrackable: true },
    { _id: TENANT_ID + "__deen_akhlaq", tenantId: TENANT_ID, subjectId: "deen_akhlaq", parentId: "deen_study",
      name: lang("Akhlaq"), gloss: lang("Behaviour — personal character"), moduleIds: ["deen"], ancestorIds: ["deen_study"], status: "active", order: 2, isTrackable: true },
  ],
  // PHASE 4 (tracking & feedback) needs real ROWS, not empty collections --
  // a status pill, an activity action or a submission state can only be
  // proved translated if something actually renders it. Everything below is
  // the smallest set that makes records/monitor/homework/course-offers draw
  // at least one row of each kind.
  records: [
    { _id: TENANT_ID + "__p1__surah_1", tenantId: TENANT_ID, personId: "p1", chunkKey: "surah_1",
      entries: {
        "ayah:1:1::memorise": { unitType: "ayah", subjectId: "quran", trackableId: "memorise",
          claimedStatus: "learning", claimedByPersonId: "p1", confirmedStatus: null,
          confirmState: "pending", domainIds: ["d1"], notes: "" },
        "ayah:1:2::recite": { unitType: "ayah", subjectId: "quran", trackableId: "recite",
          claimedStatus: "achieved", claimedByPersonId: "p1", confirmedStatus: "achieved",
          confirmState: "confirmed", domainIds: [], notes: "" },
        "ayah:1:3::tajweed": { unitType: "ayah", subjectId: "quran", trackableId: "tajweed",
          claimedStatus: "practising", claimedByPersonId: "p1", confirmedStatus: null,
          confirmState: "returned", returnNote: "Try again", domainIds: [], notes: "" },
      } },
    // PHASE 6. The Asma detail panel prints "Not started yet." unless a
    // claim exists, so the status line -- which used to render a raw
    // claimedStatus with its underscores swapped for spaces, and a raw
    // confirmState id -- needs one real entry to be provable. D12: a
    // name: unit key chunks by SUBJECT, not by surah.
    { _id: TENANT_ID + "__p1__subject_asma_ul_husna", tenantId: TENANT_ID, personId: "p1",
      chunkKey: "subject_asma_ul_husna",
      entries: {
        "name:1::studied_asma": { unitType: "name", subjectId: "asma_ul_husna", trackableId: "studied_asma",
          claimedStatus: "practising", claimedByPersonId: "p1", confirmedStatus: null,
          confirmState: "pending", domainIds: [], notes: "" },
      } },
  ],
  activity: [
    // The doc id carries THIS week's key, computed the same way activity.js
    // does it (weekStartsOn 6), or a fixed date would fall out of range the
    // moment the suite is run on another day.
    { _id: TENANT_ID + "__p1__" + THIS_WEEK, tenantId: TENANT_ID, personId: "p1", weekKey: THIS_WEEK,
      entries: [
        { date: TODAY, subjectId: "quran", unitKey: "ayah:1:1", unitType: "ayah", trackableId: "memorise", action: "claimed" },
        { date: TODAY, subjectId: "deen_ethics", unitKey: "topic:t42", unitType: "topic", trackableId: "reflect", action: "practised" },
      ] },
  ],
  domains: [
    { _id: TENANT_ID + "__d1", tenantId: TENANT_ID, name: lang("Tajweed"), status: "active" },
  ],
  courseOffers: [
    { _id: TENANT_ID + "__o1", tenantId: TENANT_ID, name: lang("Evening Quran"), moduleIds: [],
      subjectIds: ["quran"], status: "active",
      routine: { daysOfWeek: [0, 2, 4], startDate: "2026-08-01", endDate: null, notes: null } },
  ],
  enrollments: [
    { _id: TENANT_ID + "__o1__p2", tenantId: TENANT_ID, contextType: "courseOffer", contextId: "o1",
      personId: "p2", roleInClass: "student", subjectIds: [], status: "active" },
  ],
  assignments: [
    { _id: TENANT_ID + "__a1", tenantId: TENANT_ID, createdByPersonId: "p1",
      assignedToPersonIds: ["p1"], extraReadersPersonIds: [], contextId: null, moduleId: null,
      subjectId: "quran", unitKeys: [], dueDate: "2026-08-20",
      instructions: lang("Memorise Surah Al-Fatiha"), maxScore: 10, status: "active" },
  ],
  submissions: [
    { _id: TENANT_ID + "__a1__p1", tenantId: TENANT_ID, assignmentId: TENANT_ID + "__a1",
      personId: "p1", status: "not_submitted", submittedAt: null, submittedNote: null,
      score: null, maxScoreAtMark: null, comment: null, markedByPersonId: null, markedAt: null },
  ],
  teachingNotes: [
    { _id: TENANT_ID + "__n1", tenantId: TENANT_ID, authorPersonId: "p1", authorUid: UID,
      aboutPersonId: "p2", body: "Doing well on tajweed.", status: "active" },
  ],
  // Seeded (not []) so a save/toggle in a test takes the updateDoc path,
  // which __stubWrites actually records -- setDoc (the create path) is a
  // pure no-op in this stub and leaves no trace, same reasoning as every
  // other "seed one real row" collection below.
  //
  // Enhancement round -- one real saved[] bookmark (Quran, with a full
  // settings snapshot -- surah 2, a DIFFERENT surah from every other
  // test's own default of surah 1, so a restore that silently stayed on
  // surah 1 would be caught) so bookmarks.html has something real to
  // render/rename/move/retire, and quranrevival.html's own ?bookmark= jump
  // has something real to restore. folders is empty on purpose (adding a
  // folder is itself part of the test, not pre-seeded).
  bookmarks: [{
    _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", resume: {}, folders: [],
    saved: [{
      id: "bm1", programId: "none", moduleId: "quranrevival", subjectId: "quran",
      name: "Ayat al-Kursi", position: "ayah:2:255", folderId: null, removed: false,
      settings: { unitType: "ayah", surahNum: 2, ayahNum: 255, trackableId: "tafsir", tajweedOn: true, wbwOn: false, rootsOn: false, mushafOn: false },
      createdAt: "2026-01-01T00:00:00.000Z",
    }],
  }],
  ayahNotes: [{ _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", notes: {} }],
  // PHASE 5 (admin) needs the same treatment: an entity status, a renderer
  // name or an invite state can only be proved translated if a row renders.
  classes: [
    { _id: TENANT_ID + "__c1", tenantId: TENANT_ID, name: lang("Morning Class"),
      gloss: lang("Before Fajr group", "ফজরের আগের দল"), subjectIds: ["quran"], levelId: null, status: "active" },
  ],
  resources: [
    { _id: TENANT_ID + "__r1", tenantId: TENANT_ID, type: "link", url: "https://example.org/lesson",
      body: null, addedByPersonId: "p1", status: "active" },
  ],
  ladders: [
    { _id: TENANT_ID + "__l1", tenantId: TENANT_ID, name: lang("General Grades"), status: "active" },
  ],
  levels: [
    { _id: TENANT_ID + "__lv1", tenantId: TENANT_ID, ladderId: "l1", name: lang("Year 1"), order: 1, status: "active" },
    { _id: TENANT_ID + "__lv2", tenantId: TENANT_ID, ladderId: "l1", name: lang("Year 2"), order: 2, status: "active" },
  ],
  personLevels: [
    { _id: TENANT_ID + "__p1__l1__2026-08-01", tenantId: TENANT_ID, personId: "p1", ladderId: "l1",
      levelId: "lv1", fromDate: "2026-08-01", effectiveToDate: null, status: "active" },
  ],
  curriculumUnits: [
    { _id: TENANT_ID + "__u1", tenantId: TENANT_ID, name: lang("Surah Al-Fatiha"), subjectIds: ["quran"],
      levelId: "lv1", resourceIds: ["r1"], order: 1, status: "active" },
  ],
  curriculumPlan: [
    { _id: TENANT_ID + "__pl1", tenantId: TENANT_ID, contextType: "class", contextId: "c1",
      curriculumUnitId: "u1", term: 1, week: 2, order: 0, status: "active" },
  ],
  // Platform-wide (Architecture Layer 1) -- not tenantId-scoped, and the doc
  // id IS the moduleId. One per renderer, so every Renderer cell is covered.
  modules: [
    { _id: "quranrevival", name: lang("QuranRevival"), icon: "📖", renderer: "ayah", order: 1, status: "active" },
    { _id: "deen", name: lang("Deen Study"), icon: "🕌", renderer: "topic", order: 2, status: "active" },
    { _id: "health", name: lang("Health"), icon: "🩺", renderer: "routine", order: 3, status: "active" },
    { _id: "asma", name: lang("Asma ul Husna"), icon: "🕋", renderer: "asma", order: 4, status: "planned" },
  ],
  tenantInvites: [
    { _id: TENANT_ID + "__invited@example.com", tenantId: TENANT_ID, email: "invited@example.com",
      role: "teacher", status: "pending" },
    { _id: TENANT_ID + "__gone@example.com", tenantId: TENANT_ID, email: "gone@example.com",
      role: "student", status: "consumed" },
  ],
  subjectTemplates: [],
  // v07.37 (the app language synced to the account). Seeded ONLY when a
  // test asks for it via newContext({ accountLang }) -- an appLang here by
  // default would make every English page adopt Bangla and reload, and the
  // ~200 "English is untouched" checks would all fail. Deliberately carries
  // no defaultTenantId, so the bootstrap behaves exactly as it does with no
  // userIndex document at all and this row changes nothing else.
  userIndex: [__USER_INDEX__], memberships: [], teacherStudentLinks: [],
};

function snapDoc(d) {
  const { _id, ...rest } = d;
  return { id: _id, exists: () => true, data: () => rest, ref: { id: _id } };
}

export function initializeApp() { return { name: "stub" }; }
export function getAuth() { return { currentUser: { uid: UID, email: "smahk9@gmail.com", displayName: "Owner" } }; }
export function GoogleAuthProvider() {}
export function signInWithPopup() { return Promise.resolve(); }
export function signOut() { return Promise.resolve(); }
export function onAuthStateChanged(auth, cb) { setTimeout(() => cb({ uid: UID, email: "smahk9@gmail.com", displayName: "Owner" }), 0); return () => {}; }

export function initializeFirestore() { return { _stub: true }; }
export function persistentLocalCache() { return {}; }
export function persistentMultipleTabManager() { return {}; }

export function collection(db, name) { return { __col: name }; }
export function doc(db, name, id) {
  if (typeof db === "object" && db && db.__col) return { __col: db.__col, __id: name };
  return { __col: name, __id: id };
}
export function where(field, op, value) { return { field, op, value }; }
export function query(col, ...clauses) { return { __col: col.__col, __clauses: clauses.filter(Boolean) }; }

function matches(d, c) {
  const v = c.field === "__name__" ? d._id : d[c.field];
  if (c.op === "==") return v === c.value;
  if (c.op === "in") return Array.isArray(c.value) && c.value.includes(v);
  if (c.op === "array-contains") return Array.isArray(v) && v.includes(c.value);
  if (c.op === "array-contains-any") return Array.isArray(v) && c.value.some((x) => v.includes(x));
  if (c.op === ">=") return v >= c.value;
  if (c.op === "<=") return v <= c.value;
  return true;
}

export async function getDocs(q) {
  return __trip("getDocs", q.__col, null, function () {
    const rows = (DATA[q.__col] || []).filter((d) => (q.__clauses || []).every((c) => matches(d, c)));
    return { docs: rows.map(snapDoc), empty: rows.length === 0, size: rows.length, forEach(f) { this.docs.forEach(f); } };
  });
}
export async function getDoc(ref) {
  return __trip("getDoc", ref.__col, ref.__id, function () {
    const row = (DATA[ref.__col] || []).find((d) => d._id === ref.__id);
    return row ? snapDoc(row) : { id: ref.__id, exists: () => false, data: () => undefined };
  });
}
export async function setDoc(ref) {
  return __trip("setDoc", ref && ref.__col, ref && ref.__id, function () {});
}
// Records what was written so a test can prove the save really happened and
// carried the right field. A no-op before v07.37; the language sync is the
// first thing here whose whole point IS the write.
// Kept in sessionStorage, not on window: the language sync RELOADS the page
// on success, which would wipe an in-memory array before a test could read
// it -- the write would look as though it never happened.
export async function updateDoc(ref, data) {
  return __trip("updateDoc", ref && ref.__col, ref && ref.__id, function () {
    try {
      const prior = JSON.parse(sessionStorage.getItem("__stubWrites") || "[]");
      prior.push({ col: ref && ref.__col, id: ref && ref.__id, data: Object.keys(data).sort(), appLang: data.appLang });
      sessionStorage.setItem("__stubWrites", JSON.stringify(prior));
    } catch (e) {}
  });
}
export async function getCountFromServer(q) {
  return __trip("getCount", q && q.__col, null, function () { return { data: () => ({ count: 0 }) }; });
}
export async function waitForPendingWrites() {}
export function serverTimestamp() { return new Date(); }
export function arrayUnion(...v) { return v; }
export function writeBatch() {
  let n = 0;
  return { set() { n++; }, update() { n++; }, async commit() { return __trip("batchCommit", "(batch of " + n + ")", null, function () {}); } };
}
`;

// A tenant seeded weeks ago -- the owner's real situation, and the one the
// load-speed round is about. The default stub deliberately carries only a
// handful of subjects/modules (enough to prove translation), which makes the
// seeding paths think they have work to do and write on every load. That is
// the shape of a HALF-seeded tenant, not a live one, so measuring against it
// would flatter or damn the wrong thing. This fills DATA out from the same
// catalogue-data.js the app seeds from, so ensure*Seeded() finds nothing
// missing and returns without writing -- exactly what happens for the owner.
function fullySeededAppendix(SUBJECT_TEMPLATES, MODULE_TEMPLATES, APPROACH_TEMPLATES, TOPIC_TRACKABLE_TEMPLATES) {
  const subjects = SUBJECT_TEMPLATES.map((n) => ({
    _id: `t1__${n.id}`, tenantId: "t1", subjectId: n.id, parentId: n.parentId,
    name: n.name, gloss: n.gloss ?? null, moduleIds: n.moduleIds, ancestorIds: [],
    status: "active", order: n.order, isTrackable: !SUBJECT_TEMPLATES.some((c) => c.parentId === n.id),
    sourceTemplateId: n.id, edited: false,
  }));
  const templates = SUBJECT_TEMPLATES.map((n) => ({
    _id: n.id, name: n.name, gloss: n.gloss ?? null, parentId: n.parentId,
    ancestorIds: [], moduleIds: n.moduleIds, order: n.order,
  }));
  const modules = MODULE_TEMPLATES.map((m) => ({
    _id: m.id, name: m.name, icon: m.icon, renderer: m.renderer, order: m.order, status: "active",
  }));
  const trackables = APPROACH_TEMPLATES.map((t, i) => ({
    _id: `t1__${t.id}`, tenantId: "t1", moduleId: "quranrevival", subjectId: "quran",
    name: t.name, groupName: t.sectionName, guide: t.guide ?? null, panels: t.panels ?? ["text"],
    order: t.order ?? i, status: "active", sourceTemplateId: t.id, edited: false,
  })).concat(TOPIC_TRACKABLE_TEMPLATES.map((t, i) => ({
    _id: `t1__${t.id}`, tenantId: "t1", moduleId: t.moduleId, subjectId: t.subjectId,
    name: t.name, groupName: t.groupName ?? null, guide: t.guide ?? null, panels: ["text"],
    order: t.order ?? i, status: "active", sourceTemplateId: t.id, edited: false,
  })));
  // Merged, not replaced: the default rows the translation suites rely on
  // (the Asma trackable, the deliberately English-only Deen subjects) stay.
  return `
(function () {
  const add = (name, rows) => {
    const have = new Set((DATA[name] || []).map((d) => d._id));
    DATA[name] = (DATA[name] || []).concat(rows.filter((r) => !have.has(r._id)));
  };
  add("subjects", ${JSON.stringify(subjects)});
  add("subjectTemplates", ${JSON.stringify(templates)});
  add("modules", ${JSON.stringify(modules)});
  add("trackables", ${JSON.stringify(trackables)});
})();
`;
}

// latencyMs simulates one Firestore round trip. 0 (the default) keeps the
// translation suites exactly as they were; the load-speed measurement passes
// a real number so wall-clock time means something.
export function stubFor({ banner, accountLang = null, latencyMs = 0, emptyTenant = false, seedTemplates = null, taglines = null }) {
  const userIndexRow = accountLang
    ? `{ _id: UID, appLang: ${JSON.stringify(accountLang)} }`
    : "";
  const bannerFields = banner
    ? 'bannerTitle: { en: "QuranRevival" }, bannerSub: { en: "Reviving the Quran, abandoned." }'
    : "";
  let out = STUB
    .replace("__BANNER__", bannerFields)
    .replace("__USER_INDEX__", userIndexRow)
    // replaceAll, not replace: the placeholder is named in the comment above
    // it as well, and replacing only the first occurrence patches the comment
    // and leaves the real one undefined.
    .replaceAll("__LATENCY__", String(Number(latencyMs) || 0));
  if (seedTemplates) {
    out += fullySeededAppendix(
      seedTemplates.SUBJECT_TEMPLATES, seedTemplates.MODULE_TEMPLATES,
      seedTemplates.APPROACH_TEMPLATES, seedTemplates.TOPIC_TRACKABLE_TEMPLATES
    );
  }
  if (taglines) {
    // Shell round 20: a tenant that has authored its OWN tagline list, which
    // is what the strip really reads in production -- the six shipped
    // defaults are only what a tenant sees before it ever opens the editor.
    // Appended rather than baked in so every earlier suite still measures the
    // tenant it always measured.
    out += `
DATA.tenants[0].taglines = ${JSON.stringify(taglines.lines ?? [])};
DATA.tenants[0].taglineSettings = ${JSON.stringify(taglines.settings ?? {})};
`;
  }
  if (emptyTenant) {
    // A genuinely NEW tenant: signed in, a membership, but no catalogue
    // seeded yet. Proves the seeding path still runs and still writes.
    out += `
DATA.subjects = []; DATA.trackables = []; DATA.modules = []; DATA.subjectTemplates = [];
DATA.records = []; DATA.activity = [];
`;
  }
  return out;
}
