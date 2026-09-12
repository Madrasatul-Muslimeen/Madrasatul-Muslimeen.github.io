// Pure weekly Activity transition for ADR-008. Legacy entries remain untouched.
import { projectStudyActivityEvidence } from "./study-activity-evidence.js";
export const MAX_STUDY_WEEK_ENTRIES = 500;
// Conservative preflight only; Firestore's encoded document size must still be measured.
export const MAX_STUDY_WEEK_JSON_BYTES = 750_000;

export function validActivityId(value) {
  return typeof value === "string" && value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value) && !value.includes("__");
}

export function studyActivityWeekKey(dateIso, weekStartsOn) {
  if (typeof dateIso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) throw new TypeError("UTC date is required.");
  const date = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateIso) throw new TypeError("Invalid UTC date.");
  if (!Number.isInteger(weekStartsOn) || weekStartsOn < 0 || weekStartsOn > 6) throw new TypeError("Invalid tenant week start.");
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() - weekStartsOn + 7) % 7);
  return date.toISOString().slice(0, 10);
}

export function planStudyActivityAppend(existing, evidence, weekStartsOn) {
  if (!evidence || evidence.contractVersion !== "study-approach-contract:v1" || evidence.masteryEffect !== "none" ||
      evidence.action !== "practised" || evidence.subjectId !== "quran" ||
      typeof evidence.eventKey !== "string" || !evidence.eventKey || evidence.eventKey.length > 1024 ||
      !validActivityId(evidence.tenantId) || !validActivityId(evidence.personId) ||
      typeof evidence.unitKey !== "string" || !evidence.unitKey || evidence.unitKey.length > 256 ||
      !/^approach_(01|03|04|07|08|10)$/.test(evidence.trackableId)) {
    throw new TypeError("Invalid versioned Study Activity evidence.");
  }
  // Reject caller-invented keys and mismatched Approach mappings before storage.
  const canonical = projectStudyActivityEvidence(evidence);
  if (!canonical || canonical.eventKey !== evidence.eventKey || canonical.trackableId !== evidence.trackableId) {
    throw new TypeError("Study Activity event key or Approach does not match its contract.");
  }
  const weekKey = studyActivityWeekKey(evidence.dateIso, weekStartsOn);
  const entries = existing?.entries ?? [];
  if (!Array.isArray(entries) || (existing &&
      (existing.tenantId !== evidence.tenantId || existing.personId !== evidence.personId || existing.weekKey !== weekKey))) {
    throw new TypeError("Existing weekly Activity document does not match the event scope.");
  }
  if (entries.some((entry) => entry?.eventKey === evidence.eventKey)) return Object.freeze({ appended: false, weekKey });
  if (entries.length >= MAX_STUDY_WEEK_ENTRIES) throw new RangeError("Weekly Activity entry limit reached.");
  const unitType = evidence.unitKey.split(":", 1)[0];
  const entry = Object.freeze({
    date: evidence.dateIso, subjectId: "quran", unitKey: evidence.unitKey, unitType,
    trackableId: evidence.trackableId, action: "practised", viaProgramId: null,
    viaSessionId: null, eventKey: evidence.eventKey, contractVersion: evidence.contractVersion,
  });
  const nextEntries = [...entries, entry];
  if (new TextEncoder().encode(JSON.stringify({ entries: nextEntries, tenantId: evidence.tenantId, personId: evidence.personId, weekKey })).length > MAX_STUDY_WEEK_JSON_BYTES) {
    throw new RangeError("Weekly Activity byte preflight exceeded.");
  }
  return Object.freeze({ appended: true, weekKey, entries: nextEntries });
}

/** Draft raw-keyed v1 shape. Keeps historical array entries byte-for-byte. */
export function planKeyedStudyActivityAppend(existing, evidence, weekStartsOn) {
  const validated = planStudyActivityAppend(existing, evidence, weekStartsOn);
  const key = evidence.eventKey;
  if (new TextEncoder().encode(key).length > 1200) throw new RangeError("Raw Study event field key exceeds byte budget.");
  const oldMap = existing?.v1Events ?? {};
  if (!oldMap || typeof oldMap !== "object" || Array.isArray(oldMap)) throw new TypeError("Invalid versioned Activity map.");
  if (!validated.appended) return Object.freeze({ appended: false, weekKey: validated.weekKey });
  if (Object.hasOwn(oldMap, key)) {
    if (oldMap[key]?.eventKey !== key) throw new TypeError("Stored Study event key mismatch.");
    return Object.freeze({ appended: false, weekKey: validated.weekKey });
  }
  if ((existing?.entries?.length ?? 0) + Object.keys(oldMap).length >= MAX_STUDY_WEEK_ENTRIES) throw new RangeError("Weekly mixed Activity entry limit reached.");
  const entry = validated.entries.at(-1);
  const v1Value = {
    eventKey: entry.eventKey, contractVersion: entry.contractVersion, date: entry.date,
    unitKey: entry.unitKey, subjectId: entry.subjectId, trackableId: entry.trackableId,
    action: entry.action,
  };
  const v1Events = { ...oldMap, [key]: v1Value };
  const entries = existing?.entries ?? [];
  if (new TextEncoder().encode(JSON.stringify({ tenantId: evidence.tenantId, personId: evidence.personId, weekKey: validated.weekKey, entries, v1Events })).length > MAX_STUDY_WEEK_JSON_BYTES) {
    throw new RangeError("Keyed weekly Activity byte preflight exceeded.");
  }
  return Object.freeze({ appended: true, weekKey: validated.weekKey, entries, v1Events, lastEventKey: key });
}

/** Mixed legacy/v1 read model; historical arrays are preserved even if they
 * predate the new 500-entry write ceiling. Firestore already bounds each doc. */
export function projectMixedWeekEntries(week) {
  const entries = week?.entries ?? [];
  const map = week?.v1Events ?? {};
  if (!Array.isArray(entries) || !map || typeof map !== "object" || Array.isArray(map)) {
    throw new TypeError("Invalid mixed Activity week.");
  }
  for (const [key, value] of Object.entries(map)) {
    if (value?.eventKey !== key || !["study-approach-contract:v1", "activity-entry:v1"].includes(value.contractVersion)) throw new TypeError("Invalid versioned Activity entry.");
  }
  return [...entries, ...Object.values(map).map((value) => ({
    ...value, unitType: value.unitType ?? value.unitKey.split(":", 1)[0],
    viaProgramId: value.viaProgramId ?? null, viaSessionId: value.viaSessionId ?? null,
  }))];
}

/** Option B: one keyed future Activity entry, with the old array frozen. */
export function planGeneralActivityAppend(existing, { tenantId, personId, weekKey, entry } = {}) {
  if (!validActivityId(tenantId) || !validActivityId(personId) ||
      typeof weekKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(weekKey) ||
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      !["claimed", "practised", "selfCheck"].includes(entry.action) ||
      !["subjectId", "trackableId"].every((key) => validActivityId(entry[key])) ||
      typeof entry.unitKey !== "string" || !/^[A-Za-z0-9:_-]{1,256}$/.test(entry.unitKey) ||
      typeof entry.unitType !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(entry.unitType) ||
      typeof entry.date !== "string" ||
      !["viaProgramId", "viaSessionId"].every((key) => entry[key] === null || validActivityId(entry[key])) ||
      Object.keys(entry).sort().join() !== ["action", "date", "subjectId", "trackableId", "unitKey", "unitType", "viaProgramId", "viaSessionId"].join() ||
      entry.unitType !== entry.unitKey.split(":", 1)[0] ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      !Number.isFinite(Date.parse(`${entry.date}T00:00:00Z`)) ||
      new Date(`${entry.date}T00:00:00Z`).toISOString().slice(0, 10) !== entry.date ||
      !Number.isFinite(Date.parse(`${weekKey}T00:00:00Z`)) ||
      new Date(`${weekKey}T00:00:00Z`).toISOString().slice(0, 10) !== weekKey ||
      (Date.parse(`${entry.date}T00:00:00Z`) - Date.parse(`${weekKey}T00:00:00Z`)) / 86_400_000 < -1 ||
      (Date.parse(`${entry.date}T00:00:00Z`) - Date.parse(`${weekKey}T00:00:00Z`)) / 86_400_000 > 7) {
    throw new TypeError("Invalid general Activity entry.");
  }
  if (existing && (existing.tenantId !== tenantId || existing.personId !== personId || existing.weekKey !== weekKey)) throw new TypeError("Weekly Activity scope mismatch.");
  const entries = existing?.entries ?? [];
  const oldMap = existing?.v1Events ?? {};
  if (!Array.isArray(entries) || !oldMap || typeof oldMap !== "object" || Array.isArray(oldMap)) throw new TypeError("Invalid weekly Activity shape.");
  // Identical source fields had identical arrayUnion values in the old writer.
  const key = ["activity-entry:v1", tenantId, personId, weekKey,
    entry.date, entry.subjectId, entry.unitKey, entry.trackableId, entry.action,
    entry.viaProgramId ?? "", entry.viaSessionId ?? ""].join("|");
  if (new TextEncoder().encode(key).length > 1200) throw new RangeError("Activity key exceeds byte budget.");
  if (Object.hasOwn(oldMap, key)) return Object.freeze({ appended: false, weekKey });
  if (entries.some((legacy) => ["date", "subjectId", "unitKey", "unitType", "trackableId", "action", "viaProgramId", "viaSessionId"].every((field) => legacy?.[field] === entry[field]))) return Object.freeze({ appended: false, weekKey });
  if (entries.length + Object.keys(oldMap).length >= MAX_STUDY_WEEK_ENTRIES) throw new RangeError("Weekly mixed Activity entry limit reached.");
  const v1Events = { ...oldMap, [key]: { ...entry, eventKey: key, contractVersion: "activity-entry:v1" } };
  if (new TextEncoder().encode(JSON.stringify({ tenantId, personId, weekKey, entries, v1Events })).length > MAX_STUDY_WEEK_JSON_BYTES) throw new RangeError("Weekly Activity byte preflight exceeded.");
  return Object.freeze({ appended: true, weekKey, entries, v1Events, lastEventKey: key });
}
