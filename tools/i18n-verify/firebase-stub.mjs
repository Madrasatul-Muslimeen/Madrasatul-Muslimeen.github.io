// Firebase stub served AT THE NETWORK LAYER (LAYOUT-BACKLOG.md's own method).
// The point is that the page's real module script runs — an earlier round
// found that merely *blocking* the imports silently tested nothing, because
// the module script never executed at all.
export const STUB = `
const TENANT_ID = "t1";
const UID = "test-uid";

function lang(en, bn) { return bn ? { en, bn } : { en }; }

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
  tenantPeople: [
    { _id: TENANT_ID + "__p1", tenantId: TENANT_ID, personId: "p1", name: lang("Ahsan", "আহসান") },
    { _id: TENANT_ID + "__p2", tenantId: TENANT_ID, personId: "p2", name: lang("Maryam", "মারইয়াম"), managedByPersonId: "p1" },
  ],
  trackables: APPROACHES.map((a, i) => ({
    _id: TENANT_ID + "__" + a[0], tenantId: TENANT_ID, subjectId: "quran", order: i, status: "active",
    name: lang(a[1], a[2]), groupName: lang(a[3], a[4]),
    guide: { what: lang("What it is", "এটি কী"), how: lang("How to do it", "কীভাবে করবেন"), measure: lang("How to measure", "কীভাবে মাপবেন") },
    panels: ["text", "audio", "loop", "tajweed", "wordByWord"],
  })),
  subjects: [
    { _id: TENANT_ID + "__quran", tenantId: TENANT_ID, subjectId: "quran", parentId: null,
      name: lang("Quran", "কুরআন"), moduleIds: ["quranrevival"], ancestorIds: [], status: "active" },
    // ENGLISH-ONLY on purpose: this is the shape real seeded tenant data has.
    // If these render in Bangla, the langText() catalogue fallback works and
    // no data migration was needed.
    { _id: TENANT_ID + "__deen_study", tenantId: TENANT_ID, subjectId: "deen_study", parentId: null,
      name: lang("Deen Study"), moduleIds: ["deen"], ancestorIds: [], status: "active", order: 1 },
    { _id: TENANT_ID + "__deen_ethics", tenantId: TENANT_ID, subjectId: "deen_ethics", parentId: "deen_study",
      name: lang("Ethics"), gloss: lang("Social conduct"), moduleIds: ["deen"], ancestorIds: ["deen_study"], status: "active", order: 1 },
    { _id: TENANT_ID + "__deen_akhlaq", tenantId: TENANT_ID, subjectId: "deen_akhlaq", parentId: "deen_study",
      name: lang("Akhlaq"), gloss: lang("Behaviour — personal character"), moduleIds: ["deen"], ancestorIds: ["deen_study"], status: "active", order: 2 },
  ],
  records: [], activity: [], bookmarks: [], enrollments: [], courseOffers: [],
  classes: [], domains: [], resources: [], assignments: [], submissions: [],
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
