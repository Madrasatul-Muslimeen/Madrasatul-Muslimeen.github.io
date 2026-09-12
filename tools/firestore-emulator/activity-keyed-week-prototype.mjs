// MAP Task 50: offline shape exploration only; no Firestore or client writer.
import { createHash } from "node:crypto";

export const MAX_V1_EVENTS_PER_WEEK = 500;
export const PROTOTYPE_JSON_BUDGET_BYTES = 750_000;

export function keyedStudyEventId(eventKey) {
  if (typeof eventKey !== "string" || !eventKey || eventKey.length > 1024) throw new TypeError("Bounded event key required.");
  return createHash("sha256").update(eventKey, "utf8").digest("hex");
}

/** Models a transaction's state transition, including a historical legacy list. */
export function prototypeKeyedWeek(existing, evidence) {
  if (!evidence || evidence.contractVersion !== "study-approach-contract:v1" ||
      evidence.action !== "practised" || evidence.masteryEffect !== "none" ||
      !evidence.eventKey || !evidence.date || !evidence.unitKey) throw new TypeError("Versioned Activity evidence required.");
  const entries = existing?.entries ?? [];
  const v1Events = existing?.v1Events ?? {};
  if (!Array.isArray(entries) || v1Events === null || typeof v1Events !== "object" || Array.isArray(v1Events)) throw new TypeError("Invalid weekly document shape.");
  const id = keyedStudyEventId(evidence.eventKey);
  if (Object.hasOwn(v1Events, id)) {
    if (v1Events[id].eventKey !== evidence.eventKey) throw new Error("Event-key hash collision or mismatched stored key.");
    return { appended: false, id, document: existing };
  }
  if (Object.keys(v1Events).length >= MAX_V1_EVENTS_PER_WEEK) throw new RangeError("Weekly Study event limit reached.");
  const value = {
    eventKey: evidence.eventKey, contractVersion: evidence.contractVersion,
    date: evidence.date, unitKey: evidence.unitKey, subjectId: "quran",
    trackableId: evidence.trackableId, action: "practised",
  };
  const document = { ...existing, entries, v1Events: { ...v1Events, [id]: value } };
  if (Buffer.byteLength(JSON.stringify(document), "utf8") > PROTOTYPE_JSON_BUDGET_BYTES) throw new RangeError("Prototype byte budget exceeded.");
  return { appended: true, id, document };
}
