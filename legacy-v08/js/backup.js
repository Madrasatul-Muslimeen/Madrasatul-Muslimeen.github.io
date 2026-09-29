// Backup — reads everything this login can see in one tenant and hands it
// back as one plain object.
//
// Why this exists: the CODE has been backed up all along (git, full history,
// on GitHub), but the tenant's own DATA has never had an export of any kind.
// Records, āyah notes, bookmarks, QCR/Asma collections and activity live only
// in Firestore. This is the one place that copies them out.
//
// Two rules shape every read below.
//
//   (1) REUSE THE APP'S OWN READ HELPERS. Every collection here is fetched
//       through the same function the app's own screens already use against
//       the deployed rules -- listAllRecordsForPerson, getBookmarks,
//       getAyahNotes, listClasses and so on. A backup that invented its own
//       query shapes would be exactly the shape v07.18 found: a read that
//       looks right and 403s the moment the rules see it, discovered by the
//       owner rather than here. Where no helper exists (the roster, the
//       tenant document, memberships, invites) the query is copied verbatim
//       from the screen that already runs it.
//
//   (2) NEVER FAIL THE WHOLE BACKUP FOR ONE COLLECTION. A guardian cannot
//       read `memberships`; a non-admin cannot read `tenantInvites`. Those
//       are correct refusals, not faults -- so every read is wrapped and a
//       refusal is RECORDED in the file ("not included, and why") rather
//       than thrown. A partial backup that says what it is beats no backup.
//
// Read-only from end to end: this module imports nothing that writes, and
// `envelope.js` (the only writer in the codebase) is deliberately absent.
// Nothing here joins any startup path -- it runs on an explicit button press
// (I9, and the load-speed contract's "on first use" tier).

import {
  collection, doc, getDoc, getDocs, query, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { listAllRecordsForPerson } from "./records.js";
import { weekKeyFor, getWeekActivity } from "./activity.js";
import { getBookmarks } from "./bookmarks.js";
import { getAyahNotes } from "./ayah-notes.js";
import { getSubjectTree, getTrackables, listLadders, listLevels } from "./catalogue.js";
import { listModules } from "./modules.js";
import { listDomains } from "./domains.js";
import { listResources } from "./resources.js";
import { listClasses } from "./classes.js";
import { listCourseOffers, listEnrollmentsForPerson } from "./course-offers.js";
import { listCurriculumUnits, listCurriculumPlanForContext } from "./curriculum.js";
import { getCurrentPersonLevels } from "./grades.js";
import { listAssignmentsForTenant, listAssignmentsForReader, listSubmissionsForAssignment, listMyTeachingNotes } from "./homework.js";
import { listInvitesForTenant } from "./invites.js";
import { getQcrDoc } from "./qcr.js";
import { getAsmaCollectionsDoc } from "./asma-collections.js";

/**
 * Firestore hands back Timestamp objects, DocumentReferences and nested
 * maps. JSON.stringify turns a Timestamp into `{"seconds":…,"nanoseconds":…}`,
 * which is readable by nothing and restorable by nobody -- so every value is
 * walked once and reduced to plain JSON: a Timestamp becomes its own ISO
 * string, which is what every other date in this app is already stored as
 * (activity entries, personLevels.fromDate, bookmark dates), so the whole
 * file speaks one date format.
 *
 * Cycles are impossible in Firestore data, but the depth guard costs nothing
 * and means a surprise can never hang the browser mid-export.
 */
export function toPlain(value, depth = 0) {
  if (value === null || value === undefined) return null;
  if (depth > 24) return "[too deeply nested to record]";
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") return value;
  if (Array.isArray(value)) return value.map((v) => toPlain(v, depth + 1));
  if (type === "object") {
    // Firestore Timestamp (toDate) and plain Date both become ISO strings.
    if (typeof value.toDate === "function") {
      try { return value.toDate().toISOString(); } catch { return null; }
    }
    if (value instanceof Date) return value.toISOString();
    // A DocumentReference: keep the path, which is the only part that means
    // anything outside a live SDK.
    if (typeof value.path === "string" && typeof value.id === "string") return `ref:${value.path}`;
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = toPlain(v, depth + 1);
    return out;
  }
  return String(value);
}

/** Every Monday (or whichever day this tenant starts its week on) from `fromIso` to today, oldest first. Activity is stored one document per week and is only ever read by explicit id -- there is no list query for it anywhere in this app (see activity.js) -- so a full export has to name each week it wants. */
export function weekKeysBetween(fromIso, weekStartsOn, today = new Date()) {
  const keys = [];
  const start = new Date(`${String(fromIso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return keys;
  const cursor = new Date(start);
  // Walk day by day but only keep distinct week keys -- weekKeyFor() already
  // does the snapping, and this way a weekStartsOn of any value works with no
  // second calendar calculation to get wrong.
  let guard = 0;
  while (cursor <= today && guard < 4000) {
    const wk = weekKeyFor(cursor, weekStartsOn);
    if (!keys.includes(wk)) keys.push(wk);
    cursor.setUTCDate(cursor.getUTCDate() + 7);
    guard += 1;
  }
  const todayKey = weekKeyFor(today, weekStartsOn);
  if (!keys.includes(todayKey)) keys.push(todayKey);
  return keys;
}

/** Runs one read, and on refusal records WHY rather than throwing. `label` is what the backup file will print beside the gap. */
async function attempt(notes, label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    const reason = err?.code === "permission-denied"
      ? "your account is not allowed to read this"
      : (err?.message ?? String(err));
    notes.push({ label, reason });
    return fallback;
  }
}

/**
 * The whole backup, as one plain object.
 *
 * `people` is the roster this login can actually record for -- the caller
 * works it out the same way every study screen already does (scopedRoster()),
 * because that is exactly the set `canRecordFor()` will allow per-person
 * reads for. Handing in a wider list does no harm: each person's reads are
 * attempted independently and a refusal is recorded, not thrown.
 *
 * `onProgress(done, total, label)` is called as it goes -- an export of a
 * real tenant is dozens of round trips, and a button that looks frozen for
 * twenty seconds reads as broken (I15's spirit: the person must be told
 * what is happening).
 */
export async function collectBackup(db, {
  tenantId, uid, userEmail, people = [], myPersonId = null, canAdmin = false, appVersion = "",
  onProgress = () => {},
} = {}) {
  const notes = [];      // what could not be read, and why
  const steps = [];      // label per unit of work, for the progress readout
  let done = 0;
  // Roughly: 14 tenant-wide reads, then 4 per person, then homework.
  const total = 16 + people.length * 4 + 2;
  const step = (label) => { done += 1; steps.push(label); onProgress(done, total, label); };

  const exportedAt = new Date();

  // ---- Layer 0: the tenant itself -------------------------------------
  const tenantDoc = await attempt(notes, "The tenant's own settings", async () => {
    const snap = await getDoc(doc(db, TENANT.TENANTS, tenantId));
    return snap.exists() ? { id: snap.id, ...toPlain(snap.data()) } : null;
  }, null);
  step("Tenant settings");

  const weekStartsOn = Number.isInteger(tenantDoc?.weekStartsOn) ? tenantDoc.weekStartsOn : 1;

  // The roster, read exactly the way every study screen reads it.
  const roster = await attempt(notes, "The list of people", async () => {
    const snap = await getDocs(query(collection(db, TENANT.TENANT_PEOPLE), where("tenantId", "==", tenantId)));
    return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
  }, []);
  step("People");

  // Memberships and invites are admin-only by rule. Attempted for everyone;
  // a guardian simply gets the recorded note instead.
  const memberships = await attempt(notes, "Who holds which role", async () => {
    const snap = await getDocs(query(collection(db, TENANT.MEMBERSHIPS), where("tenantId", "==", tenantId)));
    return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
  }, []);
  step("Roles");

  const invites = canAdmin
    ? await attempt(notes, "Pending invitations", () => listInvitesForTenant(db, tenantId).then(toPlain), [])
    : [];
  step("Invitations");

  // ---- Layer 1: catalogue and org --------------------------------------
  const modules = await attempt(notes, "Modules", () => listModules(db).then(toPlain), []);
  step("Modules");
  const subjects = await attempt(notes, "The subject tree", () => getSubjectTree(db, tenantId).then(toPlain), []);
  step("Subjects");
  const trackables = await attempt(notes, "The Approaches", () => getTrackables(db, tenantId).then(toPlain), []);
  step("Approaches");
  const domains = await attempt(notes, "Domains", () => listDomains(db, tenantId).then(toPlain), []);
  step("Domains");
  const resources = await attempt(notes, "Resources", () => listResources(db, tenantId).then(toPlain), []);
  step("Resources");

  const ladders = await attempt(notes, "Grade ladders", () => listLadders(db, tenantId).then(toPlain), []);
  const levels = [];
  for (const ladder of ladders) {
    const rows = await attempt(notes, `Levels in "${ladder.name?.en ?? ladder.id}"`, () => listLevels(db, tenantId, ladder.id).then(toPlain), []);
    levels.push(...rows);
  }
  step("Grades");

  const classes = await attempt(notes, "Classes", () => listClasses(db, tenantId).then(toPlain), []);
  step("Classes");
  const courseOffers = await attempt(notes, "Course offers", () => listCourseOffers(db, tenantId).then(toPlain), []);
  step("Course offers");
  const curriculumUnits = await attempt(notes, "Curriculum units", () => listCurriculumUnits(db, tenantId).then(toPlain), []);
  step("Curriculum units");

  // The plan is stored per CONTEXT (a class or a person), and there is no
  // "everything" query for it -- listCurriculumPlanForContext() is what the
  // Curriculum screen itself calls, once per context it shows. So the export
  // asks for every context that exists: each class, each course offer, and
  // each person on the roster.
  // Only "class" and "person" are real contextTypes -- those are the two
  // options curriculum.html's own picker offers, and nothing else has ever
  // been written. Asking for a "courseOffer" context would spend a read per
  // offer to fetch nothing.
  const curriculumPlan = [];
  for (const ctx of [
    ...classes.map((c) => ["class", c.id]),
    ...roster.map((p) => ["person", p.id]),
  ]) {
    const rows = await attempt(notes, `Curriculum plan for ${ctx[0]} ${ctx[1]}`, () => listCurriculumPlanForContext(db, tenantId, ctx[0], ctx[1]).then(toPlain), []);
    curriculumPlan.push(...rows);
  }
  step("Curriculum plan");

  const ayahCollections = await attempt(notes, "Āyah collections (QCR)", () => getQcrDoc(db, tenantId).then(toPlain), null);
  step("Āyah collections");
  const asmaCollections = await attempt(notes, "Asma ul Husna collections", () => getAsmaCollectionsDoc(db, tenantId).then(toPlain), null);
  step("Asma collections");

  // ---- Layer 2: the per-person study data ------------------------------
  // The reason this export exists. Everything above can be rebuilt from the
  // catalogue seed; none of this can be rebuilt from anything.
  const createdAtIso = typeof tenantDoc?.createdAt === "string" ? tenantDoc.createdAt : null;
  const weekKeys = weekKeysBetween(createdAtIso ?? "2026-07-01", weekStartsOn, exportedAt);

  const perPerson = [];
  for (const person of people) {
    const pid = person.id;
    const name = person.name?.en ?? person.name ?? pid;

    const records = await attempt(notes, `Records for ${name}`, () => listAllRecordsForPerson(db, tenantId, pid).then(toPlain), []);
    step(`Records — ${name}`);

    const bookmarks = await attempt(notes, `Bookmarks for ${name}`, () => getBookmarks(db, tenantId, pid).then(toPlain), null);
    const ayahNotes = await attempt(notes, `Āyah notes for ${name}`, () => getAyahNotes(db, tenantId, pid).then(toPlain), null);
    step(`Notes & bookmarks — ${name}`);

    // One getDoc per week, because that is the only way activity can be read
    // (see weekKeysBetween above). Fired together per person rather than one
    // after another -- a two-month-old tenant is ~10 weeks, so this is one
    // wait per person, not ten.
    const weeks = await attempt(notes, `Activity for ${name}`, async () => {
      const docs = await Promise.all(weekKeys.map((wk) => getWeekActivity(db, tenantId, pid, wk)));
      return docs.filter(Boolean).map(toPlain);
    }, []);
    step(`Activity — ${name}`);

    const levelsNow = await attempt(notes, `Grade levels for ${name}`, () => getCurrentPersonLevels(db, tenantId, pid).then(toPlain), []);
    const enrolments = await attempt(notes, `Enrolments for ${name}`, () => listEnrollmentsForPerson(db, tenantId, pid).then(toPlain), []);
    step(`Enrolments — ${name}`);

    perPerson.push({ personId: pid, name, records, bookmarks, ayahNotes, activityWeeks: weeks, levels: levelsNow, enrolments });
  }

  // ---- Layer 3: homework ------------------------------------------------
  // listAssignmentsForTenant() is only read-provable for an admin actor;
  // everyone else must go through extraReadersPersonIds. With no person
  // record of their own there is no reader id to ask with, so the section is
  // recorded as skipped rather than queried with `undefined`.
  const assignments = !canAdmin && !myPersonId
    ? (notes.push({ label: "Homework", reason: "this account has no person record in this tenant to read homework against" }), [])
    : await attempt(notes, "Homework", () => (
        canAdmin ? listAssignmentsForTenant(db, tenantId) : listAssignmentsForReader(db, tenantId, myPersonId)
      ).then(toPlain), []);
  const submissions = [];
  for (const a of assignments) {
    // Both list helpers strip the `${tenantId}__` prefix off the id they
    // return, but listSubmissionsForAssignment() matches on the FULL document
    // id (that is what createAssignment() stores in submissions.assignmentId)
    // -- so it has to be put back, or every assignment reports zero
    // submissions and the backup silently loses them.
    const rows = await attempt(notes, `Submissions for "${a.title ?? a.id}"`, () => listSubmissionsForAssignment(db, tenantId, `${tenantId}__${a.id}`).then(toPlain), []);
    submissions.push(...rows);
  }
  step("Homework");

  const teachingNotes = await attempt(notes, "Your own teaching notes", () => listMyTeachingNotes(db, tenantId, uid).then(toPlain), []);
  step("Teaching notes");

  return {
    format: "quranrevival-backup",
    formatVersion: 1,
    appVersion,
    tenantId,
    exportedAt: exportedAt.toISOString(),
    exportedBy: { uid, email: userEmail ?? null, personId: myPersonId },
    // A stable ID, not a sentence -- the words a reader sees are chosen (and
    // translated) by backup-file.js, while the DATA block keeps something a
    // future restore can branch on without parsing English.
    scope: canAdmin ? "tenant" : "account",
    tenant: tenantDoc,
    people: roster,
    memberships,
    invites,
    catalogue: { modules, subjects, trackables, domains, resources, ladders, levels },
    org: { classes, courseOffers, curriculumUnits, curriculumPlan },
    collections: { ayah: ayahCollections, asma: asmaCollections },
    study: perPerson,
    homework: { assignments, submissions, teachingNotes },
    couldNotRead: notes,
  };
}
