// F-035..F-041 — Records: chunking, claim, confirm, return, bulk confirm
// (Phase 3, Tracking core)
//
// records/{tenantId}__{personId}__{chunkKey}
//   entries{ "<unitKey>::<trackableId>": {
//     unitType, subjectId, trackableId, claimedStatus, claimedByPersonId,
//     confirmedStatus, confirmState pending|confirmed|returned,
//     confirmedByPersonId, confirmedAt, returnNote, domainIds[], notes,
//     updatedAt } }
//
// I6: confirmation state is frozen when marked, never recalculated -- a
// later claim never rewrites confirmedStatus/confirmedAt/confirmedByPersonId
// on its own; only confirmEntry() ever touches those four fields. A fresh
// claim after a confirmation only resets confirmState back to "pending" so
// the NEW claimedStatus gets its own review -- the frozen confirmedStatus
// value is left exactly as it was until the next real confirm.
//
// I3: viaProgramId/viaSessionId live on activity, never here -- nothing in
// this file writes them. Programs (Phase 7) and sessions (Phase 14) don't
// exist yet; activity.js passes null for both until they do.

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { parseUnitKey, isValidStatus } from "./unit-keys.js";

// ---------------------------------------------------------------------------
// Chunking -- "one doc per surah or subject" (Architecture, Layer 2).
//
// Unit types that carry a surah number as their own first field (ayah,
// range, surah, ruku) chunk together per surah -- a natural, bounded-size
// grouping matching how a student actually works through the Quran.
// Everything else (juz/hizb/rub/manzil/page -- Quran-wide divisions with no
// single surah -- plus hadith/topic/name, which aren't Quran at all) chunks
// per subject instead. This exact split isn't spelled out further in the
// Architecture doc beyond "one doc per surah/subject"; flagged in
// PHASE-3-STATUS.md for the owner to correct if a different grouping was
// intended -- re-chunking later is a data migration, not an architecture
// change (I5 only pins the unit key itself, never the chunk it lands in).
// ---------------------------------------------------------------------------

const SURAH_CHUNKED_TYPES = new Set(["ayah", "range", "surah", "ruku"]);

export function chunkKeyFor(unitKey, subjectId) {
  const { unitType, parts } = parseUnitKey(unitKey);
  if (SURAH_CHUNKED_TYPES.has(unitType)) {
    const surahNum = Number(parts[0]);
    if (Number.isFinite(surahNum)) return `surah_${surahNum}`;
  }
  return `subject_${subjectId}`;
}

function recordsDocId(tenantId, personId, chunkKey) {
  return `${tenantId}__${personId}__${chunkKey}`;
}

export async function getRecordsChunk(db, tenantId, personId, chunkKey) {
  const snap = await getDoc(doc(db, TENANT.RECORDS, recordsDocId(tenantId, personId, chunkKey)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ---------------------------------------------------------------------------
// Who confirms -- computed, never configured (Architecture s6).
//   "Does this person have a teacher, guardian or prime? YES -> wait for
//   confirmation. NO -> counts straight away." A teacher's/guardian's own
//   study is self-confirmed -- nobody stands over them in this tenant.
//   Confirmation can be switched on/off per subject (subjectOverride,
//   subjects.confirmationRequired -- true/false forces it, null/undefined
//   defers to the computed rule below).
//
// Deliberately built on deterministic get()s, never a `where(...)` query
// against memberships/tenantPeople: a Firestore security rule can only
// allow a LIST (query) request if it can prove, from the query's own
// filters alone, that every possible result satisfies the rule -- the same
// limitation D9 already worked around for tenantMemberUids. memberships/
// tenantPeople weren't built with that list-safety in mind (only
// tenantMemberUids was), so this reads each known, addressable document
// directly instead.
// ---------------------------------------------------------------------------

const MEMBERSHIP_ROLES = ["owner", "prime", "teacher", "guardian", "student", "self"];

/** Every role this person holds in this tenant, via one get() per possible role (deterministic ids, no query). */
async function getPersonRoles(db, tenantId, personId) {
  const snaps = await Promise.all(
    MEMBERSHIP_ROLES.map((role) => getDoc(doc(db, TENANT.MEMBERSHIPS, `${tenantId}__${personId}__${role}`)))
  );
  return MEMBERSHIP_ROLES.filter((_, i) => snaps[i].exists());
}

/**
 * tenantPeople.managedByPersonId is the actually-populated signal for "this
 * person is a managed child with a guardian" -- memberships.guardianOf[]
 * exists in the schema but nothing in the codebase writes to it yet, so
 * checking it here would silently never fire. One get(), same collection/
 * rule already exercised successfully elsewhere (own record, rosters).
 */
async function personIsManaged(db, personId) {
  const snap = await getDoc(doc(db, TENANT.TENANT_PEOPLE, personId));
  return !!snap.data()?.managedByPersonId;
}

/** subjects/{tenantId}__{subjectId}.confirmationRequired -- true/false override, null/missing = defer to the computed rule. */
export async function getSubjectConfirmationOverride(db, tenantId, subjectId) {
  const snap = await getDoc(doc(db, TENANT.SUBJECTS, `${tenantId}__${subjectId}`));
  if (!snap.exists()) return null;
  const v = snap.data().confirmationRequired;
  return v === true || v === false ? v : null;
}

/**
 * true = this person's marks on this subject wait for confirmation.
 * false = they count straight away (self-confirmed).
 */
export async function computeConfirmationRequired(db, tenantId, personId, subjectOverride) {
  if (subjectOverride === true) return true;
  if (subjectOverride === false) return false;

  const roles = await getPersonRoles(db, tenantId, personId);
  // Owner/prime administer the tenant; nothing stands over them here.
  if (roles.includes("owner") || roles.includes("prime")) return false;
  // "A teacher's own study is self-confirmed" -- a guardian studying (not as
  // someone else's declared student) stands at the same level.
  if (roles.includes("teacher") || roles.includes("guardian")) return false;

  if (await personIsManaged(db, personId)) return true;
  if (roles.includes("student")) return true;

  // 'self' role (or no role rows at all) with no guardian on file.
  return false;
}

// ---------------------------------------------------------------------------
// Claim / confirm / return.
// ---------------------------------------------------------------------------

/**
 * Records (or updates) a claimed status. Computes whether it needs
 * confirmation and sets confirmState accordingly. If self-confirmed, the
 * claim IS the confirmation -- confirmedStatus/confirmedAt/confirmedByPersonId
 * are stamped immediately. If confirmation is needed, those three fields are
 * left exactly as they were (I6 -- frozen until a real confirmEntry() call);
 * only confirmState resets to "pending" so the new claim gets reviewed.
 */
export async function claimStatus(db, {
  tenantId, personId, subjectId, unitKey, trackableId,
  statusId, notes, domainIds, claimedByPersonId, claimedByUid,
}) {
  if (!isValidStatus(statusId)) {
    throw new Error(`claimStatus: "${statusId}" is not one of the six recognised statuses.`);
  }

  const chunkKey = chunkKeyFor(unitKey, subjectId);
  const docId = recordsDocId(tenantId, personId, chunkKey);
  const entryKey = `${unitKey}::${trackableId}`;
  const { unitType } = parseUnitKey(unitKey);

  const subjectOverride = await getSubjectConfirmationOverride(db, tenantId, subjectId);
  const needsConfirmation = await computeConfirmationRequired(db, tenantId, personId, subjectOverride);

  const existingSnap = await getDoc(doc(db, TENANT.RECORDS, docId));
  const prevEntry = existingSnap.exists() ? (existingSnap.data().entries?.[entryKey] ?? {}) : {};
  const nowIso = new Date().toISOString();

  const entry = {
    unitType,
    subjectId,
    trackableId,
    claimedStatus: statusId,
    claimedByPersonId,
    confirmedStatus: needsConfirmation ? (prevEntry.confirmedStatus ?? null) : statusId,
    confirmState: needsConfirmation ? "pending" : "confirmed",
    confirmedByPersonId: needsConfirmation ? (prevEntry.confirmedByPersonId ?? null) : claimedByPersonId,
    confirmedAt: needsConfirmation ? (prevEntry.confirmedAt ?? null) : nowIso,
    returnNote: needsConfirmation ? (prevEntry.returnNote ?? null) : null,
    domainIds: domainIds ?? [],
    notes: notes ?? "",
    updatedAt: nowIso,
  };

  if (existingSnap.exists()) {
    // Dot-path update: touches only this one entry, never the rest of the map.
    await updateDocument(db, TENANT.RECORDS, docId, { [`entries.${entryKey}`]: entry, tenantId, personId });
  } else {
    await createDocument(db, TENANT.RECORDS, docId, { tenantId, personId, entries: { [entryKey]: entry } }, claimedByUid);
  }

  return { chunkKey, entryKey, needsConfirmation };
}

/** Explicit confirm by a teacher/guardian/prime/owner (or self). Freezes confirmedStatus at whatever claimedStatus is right now (I6). */
export async function confirmEntry(db, { tenantId, personId, chunkKey, entryKey, confirmedByPersonId }) {
  const docId = recordsDocId(tenantId, personId, chunkKey);
  const snap = await getDoc(doc(db, TENANT.RECORDS, docId));
  if (!snap.exists()) throw new Error(`confirmEntry: no records chunk at ${docId}.`);
  const entry = snap.data().entries?.[entryKey];
  if (!entry) throw new Error(`confirmEntry: no entry "${entryKey}" in ${docId}.`);

  const nowIso = new Date().toISOString();
  await updateDocument(db, TENANT.RECORDS, docId, {
    [`entries.${entryKey}.confirmedStatus`]: entry.claimedStatus,
    [`entries.${entryKey}.confirmState`]: "confirmed",
    [`entries.${entryKey}.confirmedByPersonId`]: confirmedByPersonId,
    [`entries.${entryKey}.confirmedAt`]: nowIso,
    [`entries.${entryKey}.returnNote`]: null,
  });
}

/** "This doesn't look right, please redo." confirmedStatus/confirmedAt stay frozen (I6) -- only confirmState and returnNote change. */
export async function returnEntry(db, { tenantId, personId, chunkKey, entryKey, note }) {
  const docId = recordsDocId(tenantId, personId, chunkKey);
  const snap = await getDoc(doc(db, TENANT.RECORDS, docId));
  if (!snap.exists()) throw new Error(`returnEntry: no records chunk at ${docId}.`);
  if (!snap.data().entries?.[entryKey]) throw new Error(`returnEntry: no entry "${entryKey}" in ${docId}.`);

  await updateDocument(db, TENANT.RECORDS, docId, {
    [`entries.${entryKey}.confirmState`]: "returned",
    [`entries.${entryKey}.returnNote`]: note ?? "Please redo and resubmit.",
  });
}

// ---------------------------------------------------------------------------
// Bulk confirm -- "a surah, a week, a class -- required from the first
// version" (Architecture s6). Class-scope needs classes/enrolments, which
// don't exist until Phase 10; the other two are built here.
// ---------------------------------------------------------------------------

/** Confirms a specific set of entryKeys within one chunk, in one commit. Entries not currently "pending" are left untouched. */
async function bulkConfirmEntries(db, { tenantId, personId, chunkKey, entryKeys, confirmedByPersonId }) {
  const docId = recordsDocId(tenantId, personId, chunkKey);
  const snap = await getDoc(doc(db, TENANT.RECORDS, docId));
  if (!snap.exists()) return { confirmedCount: 0 };
  const entries = snap.data().entries ?? {};
  const nowIso = new Date().toISOString();

  const patch = {};
  let confirmedCount = 0;
  for (const entryKey of entryKeys) {
    const entry = entries[entryKey];
    if (!entry || entry.confirmState !== "pending") continue;
    patch[`entries.${entryKey}.confirmedStatus`] = entry.claimedStatus;
    patch[`entries.${entryKey}.confirmState`] = "confirmed";
    patch[`entries.${entryKey}.confirmedByPersonId`] = confirmedByPersonId;
    patch[`entries.${entryKey}.confirmedAt`] = nowIso;
    patch[`entries.${entryKey}.returnNote`] = null;
    confirmedCount++;
  }
  if (confirmedCount > 0) await updateDocument(db, TENANT.RECORDS, docId, patch);
  return { confirmedCount };
}

/** Bulk confirm -- a surah (or subject) scope: every pending entry in one records chunk. */
export async function bulkConfirmChunk(db, { tenantId, personId, chunkKey, confirmedByPersonId }) {
  const chunk = await getRecordsChunk(db, tenantId, personId, chunkKey);
  if (!chunk) return { confirmedCount: 0 };
  const pendingKeys = Object.keys(chunk.entries ?? {}).filter((k) => chunk.entries[k].confirmState === "pending");
  return bulkConfirmEntries(db, { tenantId, personId, chunkKey, entryKeys: pendingKeys, confirmedByPersonId });
}

/**
 * Bulk confirm -- a week scope: every pending entry touched by activity in
 * that person's activity/{tenantId}__{personId}__{weekKey} doc, across
 * however many records chunks those entries actually live in.
 */
export async function bulkConfirmWeek(db, { tenantId, personId, weekKey, confirmedByPersonId }) {
  const activitySnap = await getDoc(doc(db, TENANT.ACTIVITY, `${tenantId}__${personId}__${weekKey}`));
  if (!activitySnap.exists()) return { confirmedCount: 0 };

  const byChunk = new Map(); // chunkKey -> Set(entryKey)
  for (const e of activitySnap.data().entries ?? []) {
    const chunkKey = chunkKeyFor(e.unitKey, e.subjectId);
    const entryKey = `${e.unitKey}::${e.trackableId}`;
    if (!byChunk.has(chunkKey)) byChunk.set(chunkKey, new Set());
    byChunk.get(chunkKey).add(entryKey);
  }

  let confirmedCount = 0;
  for (const [chunkKey, entryKeySet] of byChunk) {
    const result = await bulkConfirmEntries(db, {
      tenantId, personId, chunkKey, entryKeys: [...entryKeySet], confirmedByPersonId,
    });
    confirmedCount += result.confirmedCount;
  }
  return { confirmedCount };
}

// ---------------------------------------------------------------------------
// Pending review -- for a teacher/guardian/prime looking across a person's
// whole record. Scans every chunk for the person (load-speed note: fine for
// this phase's review screen; not a startup-path read, and a person's total
// chunk count is bounded by "surahs they've touched" + "subjects they've
// touched", not by raw entry count).
// ---------------------------------------------------------------------------

export async function listPendingForPerson(db, tenantId, personId) {
  const q = query(
    collection(db, TENANT.RECORDS),
    where("tenantId", "==", tenantId),
    where("personId", "==", personId)
  );
  const snap = await getDocs(q);
  const pending = [];
  for (const d of snap.docs) {
    const chunkKey = d.id.replace(`${tenantId}__${personId}__`, "");
    const entries = d.data().entries ?? {};
    for (const [entryKey, entry] of Object.entries(entries)) {
      if (entry.confirmState === "pending") pending.push({ chunkKey, entryKey, ...entry });
    }
  }
  return pending;
}
