// F-042 — Activity: weekly, one document per week (Phase 3, Tracking core)
//
// activity/{tenantId}__{personId}__{weekKey}
//   entries[]{ date, subjectId, unitKey, unitType, trackableId, action,
//              viaProgramId, viaSessionId }
//
// I3: viaProgramId/viaSessionId live HERE, never as part of a record key --
// three entry paths (free study, a program, a class session) for the same
// ayah stay three distinct activity rows instead of overwriting one
// record's context. Both are null until programs (Phase 7) and sessions
// (Phase 14) exist.
//
// Load-speed budget: "Activity -- one document per week / never a year at
// once." weekKeyFor never looks past the single date it's given.

import { doc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument, updateDocument } from "./envelope.js";
import { parseUnitKey } from "./unit-keys.js";

/**
 * ISO date (YYYY-MM-DD) of the start of the week containing `date`, per the
 * tenant's own weekStartsOn (D7 -- 0=Sunday..6=Saturday, set at onboarding).
 * That date string IS the weekKey -- sortable, unambiguous, no separate
 * counter to keep in sync.
 */
export function weekKeyFor(date, weekStartsOn) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day - weekStartsOn + 7) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

function activityDocId(tenantId, personId, weekKey) {
  return `${tenantId}__${personId}__${weekKey}`;
}

export async function getWeekActivity(db, tenantId, personId, weekKey) {
  const snap = await getDoc(doc(db, TENANT.ACTIVITY, activityDocId(tenantId, personId, weekKey)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Appends one activity entry to the week containing `date`. Creates the
 * week's document on first use, otherwise arrayUnion-appends -- append-only,
 * matching I4 (nothing here is ever rewritten or removed, only added to).
 */
export async function logActivity(db, {
  tenantId, personId, date, weekStartsOn, subjectId, unitKey, trackableId,
  action, viaProgramId, viaSessionId, uid,
}) {
  const weekKey = weekKeyFor(date, weekStartsOn);
  const docId = activityDocId(tenantId, personId, weekKey);
  const { unitType } = parseUnitKey(unitKey);

  const entry = {
    date: date.toISOString().slice(0, 10),
    subjectId,
    unitKey,
    unitType,
    trackableId,
    action,
    viaProgramId: viaProgramId ?? null,
    viaSessionId: viaSessionId ?? null,
  };

  const existingSnap = await getDoc(doc(db, TENANT.ACTIVITY, docId));
  if (existingSnap.exists()) {
    await updateDocument(db, TENANT.ACTIVITY, docId, { entries: arrayUnion(entry), tenantId, personId, weekKey });
  } else {
    await createDocument(db, TENANT.ACTIVITY, docId, { tenantId, personId, weekKey, entries: [entry] }, uid);
  }

  return { weekKey };
}
