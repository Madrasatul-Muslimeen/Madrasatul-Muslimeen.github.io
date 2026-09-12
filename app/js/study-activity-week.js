// Pure weekly Activity transition for ADR-008. Legacy entries remain untouched.
import { projectStudyActivityEvidence } from "./study-activity-evidence.js";
export const MAX_STUDY_WEEK_ENTRIES = 500;

function validActivityId(value) {
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
  return Object.freeze({ appended: true, weekKey, entries: [...entries, entry] });
}
