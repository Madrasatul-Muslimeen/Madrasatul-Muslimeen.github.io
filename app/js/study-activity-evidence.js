// MAP Phase 4 — pure candidate evidence for the existing weekly Activity log.
// This module never persists evidence and never calls Records/claimStatus.

import { studyEventApproachId, studyEventDedupeKey, studyEventPolicy, qualifiesListeningCompletion } from "./study-approach-contract.js";
import { parseQuranWordOccurrenceId } from "./quran-word-identity.js";

const AUTOMATIC_ACTIVITY_EVENTS = new Set([
  "reading.completed", "listening.completed", "journal.note-created", "journal.note-revised", "wbw.engaged",
]);

export function projectStudyActivityEvidence({ eventType, tenantId, personId, unitKey, occurrenceId, noteId, dateIso, mode, playedSeconds, selectedUnitSeconds } = {}) {
  if (!AUTOMATIC_ACTIVITY_EVENTS.has(eventType)) return null;
  if (eventType === "listening.completed" && !qualifiesListeningCompletion({ playedSeconds, selectedUnitSeconds })) return null;
  if (typeof unitKey !== "string" || !unitKey.trim()) throw new TypeError("A permanent Study Unit key is required for Activity evidence.");
  if (eventType === "wbw.engaged") {
    const ref = parseQuranWordOccurrenceId(occurrenceId);
    if (unitKey.startsWith("ayah:") && unitKey !== `ayah:${ref.surah}:${ref.ayah}`) {
      throw new TypeError("WbW occurrence must belong to the selected ayah.");
    }
  }
  const policy = studyEventPolicy(eventType);
  return Object.freeze({
    contractVersion: "study-approach-contract:v1",
    eventType,
    eventKey: studyEventDedupeKey({ eventType, tenantId, personId, unitKey, occurrenceId, noteId, dateIso, mode }),
    tenantId,
    personId,
    subjectId: "quran",
    unitKey,
    trackableId: studyEventApproachId(eventType, mode),
    action: policy.action,
    masteryEffect: "none",
  });
}
