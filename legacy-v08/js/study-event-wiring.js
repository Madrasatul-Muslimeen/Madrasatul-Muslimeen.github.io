// MAP Phase 4 (P4-D) — the bridge from a real Study interaction to one ADR-008
// Activity evidence event.
//
// This module holds the PURE decisions — is this interaction a completion at
// all, and which Approach does it credit — separately from the writing, so the
// rules can be tested without a database and the writing can be tested without
// a browser. It grows one tranche at a time: D1 Reading, D2 Listening,
// D3 Journaling, D4 WbW.
//
// ACTIVITY IS NOT MASTERY. Nothing here may reach records.js, claimStatus(),
// confirmEntry(), `achieved` or `mastered`, and nothing here may touch the
// legacy activity.entries[] array — evidence goes to its own subcollection and
// nowhere else. A structural suite asserts all of that by reading this source.

import { weekKeyFor } from "./activity.js";
import { writeStudyActivityEvidence } from "./study-activity-evidence-store.js";
import { isStudyEvidencePersistenceReady, studyEvidenceUnavailableReason } from "./study-evidence-readiness.js";

/** The unit types ADR-008's evidence contract accepts (I5). A juz, ruku, hizb or page reading is real study, but v1 has no evidence shape for it, so it records nothing rather than guessing. */
export const EVIDENCE_UNIT_TYPES = Object.freeze(["ayah", "range", "surah"]);

export function unitTypeRecordsEvidence(unitType) {
  return EVIDENCE_UNIT_TYPES.includes(unitType);
}

/** UTC calendar day for an instant. The evidence contract's day boundary is UTC, deliberately: a tenant-local day would make the same event's identity depend on where it was recorded. */
export function utcDay(date) {
  return new Date(date.getTime()).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// P4-D1 — reading.completed
// ---------------------------------------------------------------------------

/**
 * The Approach an explicit Reading completion credits.
 *
 * ADR-008 maps Reading to approach_01 "Reading (with Tajweed)" or approach_03
 * "Reading (with Meaning)" "by the active Study mode". This app has no separate
 * mode switch: what a reader actually has on screen is the translation, driven
 * by the two translation toggles. So "with meaning" is read off the reader's own
 * state — at least one translation displayed — rather than from a mode they
 * would have to remember to set.
 */
export function readingApproachId(translationLangs) {
  const shown = Array.isArray(translationLangs) ? translationLangs.filter(Boolean) : [];
  return shown.length > 0 ? "approach_03" : "approach_01";
}

/**
 * The evidence arguments for one explicit Reading completion, or `null` when
 * this unit type records nothing.
 *
 * `null` is a deliberate, quiet outcome rather than a throw: a reader pressing
 * "mark as read" on a Juz has done nothing wrong, and v1 simply has no evidence
 * shape for that unit. The caller is expected to say so on screen.
 */
export function readingCompletionArgs({
  tenantId, personId, unitKey, unitType, translationLangs, at = new Date(), weekStartsOn = 0,
} = {}) {
  if (!unitTypeRecordsEvidence(unitType)) return null;
  const dateIso = utcDay(at);
  return {
    eventType: "reading.completed",
    tenantId,
    personId,
    weekKey: weekKeyFor(at, weekStartsOn),
    dateIso,
    unitKey,
    trackableId: readingApproachId(translationLangs),
  };
}

// ---------------------------------------------------------------------------
// P4-D2 — listening.completed
// ---------------------------------------------------------------------------

/** ADR-008's threshold. A change to it needs a new contract version, so it is named once and read from here. */
export const LISTENING_COMPLETION_RATIO = 0.8;

/**
 * The Approach a Listening completion credits: Arabic-only (approach_07) or
 * with meaning (approach_08). Same signal as Reading — what the listener
 * actually has on screen — which also covers the meaning reciters, since
 * choosing one turns its translation on.
 */
export function listeningApproachId(translationLangs) {
  const shown = Array.isArray(translationLangs) ? translationLangs.filter(Boolean) : [];
  return shown.length > 0 ? "approach_08" : "approach_07";
}

/**
 * Tracks one playback session and decides whether it completed Listening.
 *
 * ADR-008: "Seeking, looping, buffering, failed playback and background preload
 * do not complete Listening. The 80% threshold is calculated over the selected
 * bounded unit." Each of those is handled by construction rather than by a
 * special case:
 *
 *   preload  — a session only exists when the caller says a PERSON started
 *              playback; nothing else can create one.
 *   buffering— it does not advance the āyah, so it cannot add coverage.
 *   looping  — heard āyahs are a SET, so a repeat adds nothing the second time.
 *   seeking  — an āyah is only credited when playback moves FORWARD off it. A
 *              backward jump credits nothing, and a forward jump credits only
 *              the āyah actually left behind, never the ones skipped over.
 *   failure  — `failed()` ends the session permanently; a failed playback can
 *              never qualify, however much was heard first.
 *
 * Coverage is measured in ĀYAHS of the selected unit, because that is the grain
 * the player reports and the unit is a bounded set of them. A whole surah
 * listened to in pieces across one session accumulates; across two sessions it
 * does not, which is the conservative reading of "a session completed it".
 */
export function createListeningSession({ ayahsInUnit, startedByUser = false } = {}) {
  const total = Number.isInteger(ayahsInUnit) && ayahsInUnit > 0 ? ayahsInUnit : 0;
  const heard = new Set();
  let current = null;
  let failed = false;
  let finished = false;

  return Object.freeze({
    /** One āyah began playing. Credits the PREVIOUS āyah only on forward motion. */
    ayahStarted(ayahNum) {
      if (failed || finished || !startedByUser) return;
      if (current !== null && Number.isInteger(ayahNum) && ayahNum > current) heard.add(current);
      current = Number.isInteger(ayahNum) ? ayahNum : current;
    },
    /** Playback reached its natural end: the āyah in progress was heard through. */
    ended() {
      if (failed || finished || !startedByUser) return;
      if (current !== null) heard.add(current);
      finished = true;
    },
    /** Playback failed. The session can never qualify afterwards. */
    failed() { failed = true; },
    /** Stopped by hand. What was heard still counts — stopping is not failing. */
    stopped() { finished = true; },
    ayahsHeard() { return heard.size; },
    completionRatio() { return total === 0 ? 0 : heard.size / total; },
    qualifies() {
      return startedByUser && !failed && total > 0
          && heard.size / total >= LISTENING_COMPLETION_RATIO;
    },
  });
}

/** The evidence arguments for a qualifying Listening completion, or `null`. */
export function listeningCompletionArgs({
  tenantId, personId, unitKey, unitType, translationLangs, session,
  at = new Date(), weekStartsOn = 0,
} = {}) {
  if (!unitTypeRecordsEvidence(unitType)) return null;
  if (!session || !session.qualifies()) return null;
  return {
    eventType: "listening.completed",
    tenantId,
    personId,
    weekKey: weekKeyFor(at, weekStartsOn),
    dateIso: utcDay(at),
    unitKey,
    trackableId: listeningApproachId(translationLangs),
  };
}

// ---------------------------------------------------------------------------
// P4-D4 — wbw.engaged
// ---------------------------------------------------------------------------

/**
 * Evidence arguments for word-by-word study of one āyah on one day, or `null`.
 *
 * THE GRAIN IS ĀYAH + DAY, per the Master Architect's amendment of 14 Sep 2026,
 * and that is enforced by what this function does NOT take: it accepts a surah
 * and an āyah, never an occurrence. A hundred words tapped in one āyah on one
 * day therefore produce one identical set of arguments, one identical event id,
 * and one document — the second and later attempts are refused by the database
 * itself as duplicates.
 *
 * `occurrenceId` is deliberately absent. Occurrence-level learning state is
 * `quranWordProgress`'s and stays there; storing one occurrence here would let
 * whichever word happened to be tapped first that day win the field while the
 * rest went unrepresented — the appearance of precision this grain does not
 * have.
 *
 * ACTIVITY ONLY. Marking a word learned is a `quranWordProgress` state and a
 * possible supervisor approval; this records that word-by-word study HAPPENED,
 * and nothing about mastery. The two never meet.
 */
export function wbwEngagementArgs({
  tenantId, personId, surah, ayah, at = new Date(), weekStartsOn = 0,
} = {}) {
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;
  if (!Number.isInteger(ayah) || ayah < 1) return null;
  return {
    eventType: "wbw.engaged",
    tenantId,
    personId,
    weekKey: weekKeyFor(at, weekStartsOn),
    dateIso: utcDay(at),
    unitKey: `ayah:${surah}:${ayah}`,
    trackableId: "approach_04",
  };
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * Persists one evidence event. Returns the store's own
 * `{ eventId, written }`, or `null` when there was nothing to record.
 *
 * DELIBERATELY NOT WRAPPED IN safeWrite() HERE. I15 requires a failed write to
 * reach the user, and it is the CALLER that knows which surface the person is
 * looking at and can say so there. Swallowing the error in this module would
 * make every caller silently best-effort, which is exactly what ADR-008's
 * amendment forbids.
 */
export async function recordStudyEvidence(db, args, { uid } = {}) {
  if (!args) return null;
  // v08.31 -- THE ONE CHOKEPOINT. Every D1/D2/D4 evidence write in the app goes
  // through this function, so gating it here makes "no evidence write may be
  // attempted while persistence is not ready" a fact provable by reading ONE
  // function, rather than a promise about three call sites. It returns before
  // the store is called at all: nothing is built, nothing is sent, no
  // permission-denied is generated and no error surface fires.
  //
  // `blocked: true` is a DISTINCT shape from the store's own `written: false`,
  // which means "already recorded today" and is a success. Conflating the two
  // would make a gated press report itself as done.
  //
  // The store's own rethrow stays exactly as it is underneath -- defence in
  // depth. If this gate were ever wrong, the write still fails closed and
  // safeWrite() still reaches the user (I15).
  if (!isStudyEvidencePersistenceReady()) {
    return { written: false, blocked: true, reason: studyEvidenceUnavailableReason() };
  }
  return writeStudyActivityEvidence(db, { ...args, uid });
}

/** Whether Study evidence can be persisted at all right now. Re-exported so a surface can ask one question of one module instead of importing the declaration itself. */
export function studyEvidencePersistenceReady() {
  return isStudyEvidencePersistenceReady();
}

/** The stable reason key when it cannot, or null when it can. */
export function studyEvidencePersistenceReason() {
  return studyEvidenceUnavailableReason();
}
