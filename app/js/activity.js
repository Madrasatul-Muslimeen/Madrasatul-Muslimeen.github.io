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
import { t } from "./i18n.js";

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

// ---------------------------------------------------------------------------
// Phase 7 — routine renderer support: "logged today" + a streak count, both
// read from the same activity entries every other module already writes
// (action: "practised" for a routine's Log button, vs. "claimed" for a
// status claim) -- no new collection, no new write path.
// ---------------------------------------------------------------------------

/** Whether `subjectId` already has a "practised" entry for `dateIso` (YYYY-MM-DD) in this one already-loaded week doc. Cheap, load-speed-safe: reuses the current week's activity doc the caller already fetched, no extra read. */
export function hasLoggedOn(weekActivity, subjectId, dateIso) {
  return (weekActivity?.entries ?? []).some(
    (e) => e.subjectId === subjectId && e.action === "practised" && e.date === dateIso
  );
}

/**
 * Fetches the last `weeksBack` weekly activity docs for this person, oldest
 * first -- bounded, on-demand only (the way modal's Streak tab), never part
 * of the startup path. Missing weeks (nothing logged that week) are simply
 * absent from the result, not fetched as empty docs.
 */
export async function getRecentWeeksActivity(db, tenantId, personId, weekStartsOn, weeksBack = 8) {
  const today = new Date();
  const weekKeys = [];
  for (let i = 0; i < weeksBack; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const wk = weekKeyFor(d, weekStartsOn);
    if (!weekKeys.includes(wk)) weekKeys.push(wk);
  }
  const docs = await Promise.all(weekKeys.map((wk) => getWeekActivity(db, tenantId, personId, wk)));
  return docs.filter(Boolean);
}

/**
 * Consecutive-day streak for one routine (subjectId), counting back from
 * today: today counts if already logged, otherwise the streak starts
 * "yesterday" (today not being logged yet doesn't break a streak still in
 * progress). Stops at the first day with no "practised" entry.
 */
export function computeStreak(weekDocs, subjectId, todayDate = new Date()) {
  const loggedDates = new Set();
  for (const wd of weekDocs) {
    for (const e of wd.entries ?? []) {
      if (e.subjectId === subjectId && e.action === "practised") loggedDates.add(e.date);
    }
  }
  const toIso = (d) => d.toISOString().slice(0, 10);
  let cursor = new Date(Date.UTC(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()));
  if (!loggedDates.has(toIso(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (loggedDates.has(toIso(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// ---------------------------------------------------------------------------
// Reading an action out loud (full app translation, phase 4).
//
// `action` is a stored identifier -- "claimed" when a status is claimed
// against a unit, "practised" when a routine's Log button is pressed -- and
// both Records' week table and Monitor's raw-entry table printed it raw.
// Same split as statusLabel()/confirmStateLabel(): the identifier stays the
// canonical stored value and a CSV export carries it verbatim; this is the
// one place it becomes text a person reads.
// ---------------------------------------------------------------------------

const ACTION_LABELS = Object.freeze({
  claimed: "Claimed",
  practised: "Practised",
  confirmed: "Confirmed",
  returned: "Returned",
});

export function activityActionLabel(action) {
  const label = ACTION_LABELS[action];
  return label ? t(label) : (action ?? "");
}
