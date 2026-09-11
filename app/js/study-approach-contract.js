// ADR-008 — Study-to-Approach event contract v1.
// Pure policy only. The caller remains responsible for the existing Activity
// and Records adapters and for enforcing tenant/person authorization.

export const STUDY_APPROACH_CONTRACT_VERSION = "study-approach-contract:v1";

export const STUDY_EVENT_POLICY = Object.freeze({
  "reading.completed": Object.freeze({ approachIds: Object.freeze(["approach_01", "approach_03"]), action: "practised", dedupe: "unit-day", mastery: "none", explicitCompletion: true }),
  "listening.completed": Object.freeze({ approachIds: Object.freeze(["approach_07", "approach_08"]), action: "practised", dedupe: "unit-day", mastery: "none", minimumCompletionRatio: 0.8 }),
  "journal.note-created": Object.freeze({ approachId: "approach_10", action: "practised", dedupe: "note-create", mastery: "none" }),
  "journal.note-revised": Object.freeze({ approachId: "approach_10", action: "practised", dedupe: "note-day", mastery: "none" }),
  "wbw.engaged": Object.freeze({ approachId: "approach_04", action: "practised", dedupe: "occurrence-day", mastery: "dedicated-wbw-state-only" }),
  "status.claimed": Object.freeze({ approachId: null, action: "claimed", dedupe: "existing-record-contract", mastery: "explicit-claim" }),
  "status.confirmed": Object.freeze({ approachId: null, action: null, dedupe: "existing-record-contract", mastery: "explicit-confirmation" }),
});

export function studyEventPolicy(eventType) {
  return STUDY_EVENT_POLICY[eventType] ?? null;
}

/** Resolves only catalogue-approved variants; callers cannot inject an arbitrary Approach. */
export function studyEventApproachId(eventType, mode) {
  const policy = studyEventPolicy(eventType);
  if (!policy) return null;
  if (policy.approachId) return policy.approachId;
  if (eventType === "reading.completed") return mode === "with-meaning" ? "approach_03" : "approach_01";
  if (eventType === "listening.completed") return mode === "with-meaning" ? "approach_08" : "approach_07";
  return null;
}

export function qualifiesListeningCompletion({ playedSeconds, selectedUnitSeconds } = {}) {
  if (!Number.isFinite(playedSeconds) || !Number.isFinite(selectedUnitSeconds) || selectedUnitSeconds <= 0) return false;
  const ratio = Math.max(0, playedSeconds) / selectedUnitSeconds;
  return ratio >= STUDY_EVENT_POLICY["listening.completed"].minimumCompletionRatio;
}

/** Stable retry key for bounded v1 Activity effects. */
export function studyEventDedupeKey({ eventType, personId, unitKey, occurrenceId, noteId, dateIso } = {}) {
  const policy = studyEventPolicy(eventType);
  if (!policy) throw new TypeError(`Unknown Study event: ${eventType}.`);
  if (!personId || !dateIso) throw new TypeError("personId and dateIso are required.");
  const day = String(dateIso).slice(0, 10);
  let target;
  switch (policy.dedupe) {
    case "unit-day": target = unitKey; break;
    case "occurrence-day": target = occurrenceId; break;
    case "note-create": target = noteId; break;
    case "note-day": target = `${noteId}:${day}`; break;
    default: target = unitKey || occurrenceId || noteId || "record";
  }
  if (!target) throw new TypeError(`A target is required for ${eventType}.`);
  return `${STUDY_APPROACH_CONTRACT_VERSION}:${eventType}:${personId}:${target}:${policy.dedupe === "note-create" ? "once" : day}`;
}

export function eventMayGrantMastery(eventType) {
  const policy = studyEventPolicy(eventType);
  return policy?.mastery === "explicit-claim" || policy?.mastery === "explicit-confirmation";
}
