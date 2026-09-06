// F-117..F-130 (slice) — Grades: dated level history (Phase 11, Stage C)
//
// personLevels/{tenantId}__{personId}__{ladderId}__{fromDate}
//   levelId, fromDate, toDate     dated rows, never overwritten
//
// The doc id itself embeds fromDate, so every assignment is its own
// immutable row -- firestore.rules (deployed ahead of time in Phase 2/10,
// see the personLevels match block's own comment) allows create but not
// update or delete on this collection: a correction is a NEW row with a
// new fromDate, never an edit to an old one. That means toDate is written
// null and stays null forever -- there is no later step that goes back and
// closes the previous row. "Where a person's level stood on some date" is
// answered by sorting a ladder's rows by fromDate and treating each row's
// effective end as the NEXT row's fromDate (computed here at read time,
// never stored) -- current level is just the row with the latest
// fromDate that isn't in the future.

import { collection, doc, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { TENANT } from "./collections.js";
import { createDocument } from "./envelope.js";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** fromDate defaults to today (YYYY-MM-DD). A second assignment on the same ladder for the same person on the same date is refused by firestore.rules (the doc already exists, so it's evaluated as an update, which this collection never allows) -- surfaces as a normal write failure (I15), not a silent overwrite. */
export async function assignPersonLevel(db, tenantId, personId, ladderId, levelId, uid, fromDate) {
  const effectiveFromDate = fromDate ?? todayIso();
  const docId = `${tenantId}__${personId}__${ladderId}__${effectiveFromDate}`;
  await createDocument(db, TENANT.PERSON_LEVELS, docId, {
    tenantId,
    personId,
    ladderId,
    levelId,
    fromDate: effectiveFromDate,
    toDate: null,
  }, uid);
  return docId;
}

/** Every dated row for one person, across every ladder unless ladderId narrows it -- sorted newest first, with each row's effective "until" derived from the next-older row's fromDate (never read off the stored, always-null toDate field). */
export async function listPersonLevelHistory(db, tenantId, personId, ladderId) {
  const clauses = [where("tenantId", "==", tenantId), where("personId", "==", personId)];
  if (ladderId) clauses.push(where("ladderId", "==", ladderId));
  const q = query(collection(db, TENANT.PERSON_LEVELS), ...clauses);
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const byLadder = new Map();
  for (const row of rows) {
    if (!byLadder.has(row.ladderId)) byLadder.set(row.ladderId, []);
    byLadder.get(row.ladderId).push(row);
  }
  const out = [];
  for (const ladderRows of byLadder.values()) {
    ladderRows.sort((a, b) => (a.fromDate < b.fromDate ? 1 : -1)); // newest first
    ladderRows.forEach((row, i) => {
      out.push({ ...row, effectiveToDate: i === 0 ? null : ladderRows[i - 1].fromDate });
    });
  }
  return out.sort((a, b) => (a.fromDate < b.fromDate ? 1 : -1));
}

/** The one row per ladder that's current as of today -- the latest fromDate not in the future. */
export async function getCurrentPersonLevels(db, tenantId, personId) {
  const today = todayIso();
  const history = await listPersonLevelHistory(db, tenantId, personId);
  const current = new Map();
  for (const row of history) {
    if (row.fromDate > today) continue;
    const existing = current.get(row.ladderId);
    if (!existing || row.fromDate > existing.fromDate) current.set(row.ladderId, row);
  }
  return current;
}
