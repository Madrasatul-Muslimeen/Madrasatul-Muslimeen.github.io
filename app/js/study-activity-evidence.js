// MAP Phase 4 — pure candidate evidence for the existing weekly Activity log.
// This module never persists evidence and never calls Records/claimStatus.

import { studyEventApproachId, studyEventDedupeKey, studyEventPolicy, qualifiesListeningCompletion } from "./study-approach-contract.js";
import { parseQuranWordOccurrenceId } from "./quran-word-identity.js";

const AUTOMATIC_ACTIVITY_EVENTS = new Set([
  "reading.completed", "listening.completed", "journal.note-created", "journal.note-revised", "wbw.engaged",
]);

function quranUnitScope(unitKey) {
  if (typeof unitKey !== "string") throw new TypeError("A permanent Quran Study Unit key is required for Activity evidence.");
  let match = /^ayah:(\d+):(\d+)$/.exec(unitKey);
  if (match) return { kind: "ayah", surah: Number(match[1]), from: Number(match[2]), to: Number(match[2]) };
  match = /^range:(\d+):(\d+)-(\d+)$/.exec(unitKey);
  if (match) return { kind: "range", surah: Number(match[1]), from: Number(match[2]), to: Number(match[3]) };
  match = /^surah:(\d+)$/.exec(unitKey);
  if (match) return { kind: "surah", surah: Number(match[1]) };
  throw new TypeError("Activity evidence requires an explicit ayah, range or surah Study Unit key.");
}

export function projectStudyActivityEvidence({ eventType, tenantId, personId, unitKey, occurrenceId, noteId, dateIso, mode, playedSeconds, selectedUnitSeconds } = {}) {
  if (!AUTOMATIC_ACTIVITY_EVENTS.has(eventType)) return null;
  if (eventType === "listening.completed" && !qualifiesListeningCompletion({ playedSeconds, selectedUnitSeconds })) return null;
  const scope = quranUnitScope(unitKey);
  if (!Number.isInteger(scope.surah) || scope.surah < 1 || scope.surah > 114 ||
      (scope.kind !== "surah" && (!Number.isInteger(scope.from) || !Number.isInteger(scope.to) || scope.from < 1 || scope.to > 286 || scope.from > scope.to))) {
    throw new TypeError("Invalid Quran Study Unit coordinates.");
  }
  if (eventType === "wbw.engaged") {
    const ref = parseQuranWordOccurrenceId(occurrenceId);
    if (ref.surah !== scope.surah || (scope.kind !== "surah" && (ref.ayah < scope.from || ref.ayah > scope.to))) {
      throw new TypeError("WbW occurrence must belong to the selected Study Unit.");
    }
  }
  const policy = studyEventPolicy(eventType);
  return Object.freeze({
    contractVersion: "study-approach-contract:v1",
    eventType,
    eventKey: studyEventDedupeKey({ eventType, tenantId, personId, unitKey, occurrenceId, noteId, dateIso, mode }),
    occurrenceId: occurrenceId ?? null,
    noteId: noteId ?? null,
    mode: mode ?? null,
    playedSeconds: eventType === "listening.completed" ? playedSeconds : null,
    selectedUnitSeconds: eventType === "listening.completed" ? selectedUnitSeconds : null,
    dateIso: dateIso.slice(0, 10),
    tenantId,
    personId,
    subjectId: "quran",
    unitKey,
    trackableId: studyEventApproachId(eventType, mode),
    action: policy.action,
    masteryEffect: "none",
  });
}
