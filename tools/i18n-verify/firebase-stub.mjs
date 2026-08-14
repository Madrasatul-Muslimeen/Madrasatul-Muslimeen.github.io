// Firebase stub served AT THE NETWORK LAYER (LAYOUT-BACKLOG.md's own method).
// The point is that the page's real module script runs — an earlier round
// found that merely *blocking* the imports silently tested nothing, because
// the module script never executed at all.
export const STUB = `
const TENANT_ID = "t1";
const UID = "test-uid";

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
    { _id: "p1", tenantId: TENANT_ID, personId: "p1", name: lang("Ahsan", "আহসান") },
    { _id: "p2", tenantId: TENANT_ID, personId: "p2", name: lang("Maryam", "মারইয়াম"), managedByPersonId: "p1" },
  ],
  trackables: APPROACHES.map((a, i) => ({
    _id: TENANT_ID + "__" + a[0], tenantId: TENANT_ID, subjectId: "quran", order: i, status: "active",
    name: lang(a[1], a[2]), groupName: lang(a[3], a[4]),
    guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") },
    panels: ["text", "audio", "loop", "tajweed", "wordByWord"],
  })),
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
  bookmarks: [],
  classes: [], resources: [],
  ladders: [], levels: [], personLevels: [], curriculumUnits: [], curriculumPlan: [],
  modules: [], userIndex: [], memberships: [], teacherStudentLinks: [],
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
  const rows = (DATA[q.__col] || []).filter((d) => (q.__clauses || []).every((c) => matches(d, c)));
  return { docs: rows.map(snapDoc), empty: rows.length === 0, size: rows.length, forEach(f) { this.docs.forEach(f); } };
}
export async function getDoc(ref) {
  const row = (DATA[ref.__col] || []).find((d) => d._id === ref.__id);
  return row ? snapDoc(row) : { id: ref.__id, exists: () => false, data: () => undefined };
}
export async function setDoc() {}
export async function updateDoc() {}
export async function getCountFromServer() { return { data: () => ({ count: 0 }) }; }
export async function waitForPendingWrites() {}
export function serverTimestamp() { return new Date(); }
export function arrayUnion(...v) { return v; }
export function writeBatch() { return { set() {}, update() {}, async commit() {} }; }
`;

export function stubFor({ banner }) {
  const bannerFields = banner
    ? 'bannerTitle: { en: "QuranRevival" }, bannerSub: { en: "Reviving the Quran, abandoned." }'
    : "";
  return STUB.replace("__BANNER__", bannerFields);
}
